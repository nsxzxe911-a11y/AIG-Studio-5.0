"""Source-only tests: no OpenAI requests, billable API or GLB upload."""
import json, sys, tempfile, threading, unittest
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from dialogue_ai import DialogueAI, validate_dialogue_request
from provider import MeshyClient
from server import make_server


def fixture():
    return {'story': '女主角走進教室，突然出拳，這是一場意料之外的邂逅！',
        'style': 'witty', 'beats': [{'index': 0, 'actionId': 'walk'}, {'index': 1, 'actionId': 'punch'}]}


def llm_response(lines):
    return {'status': 'completed',
        'output': [{'type': 'message', 'content': [{'type': 'output_text',
            'text': json.dumps({'lines': lines}, ensure_ascii=False)}]}]}


class DialogueAITest(unittest.TestCase):
    def test_unconfigured_provider_must_not_generate_or_claim_llm(self):
        ai=DialogueAI('')
        self.assertFalse(ai.configured)
        with self.assertRaisesRegex(ValueError,'AI_DIALOGUE_NOT_CONFIGURED'):
            ai.generate(fixture())
    def test_secure_exact_beats_structured_schema_no_glb_payload(self):
        calls=[]
        def fake(payload,key):
            calls.append((payload,key))
            return llm_response([
                {'beat':0,'text':'這走廊很長，可是本小姐的氣場比較長！'},
                {'beat':1,'text':'接招！我的拳頭可是買了意外險。'}
            ])
        ai=DialogueAI('CI_ONLY_FAKE', transport=fake)
        result=ai.generate(fixture())
        self.assertEqual(result['source'],'CLOUD_LLM_PROVIDER_OUTPUT')
        self.assertEqual(result['model'],'gpt-4.1-mini')
        self.assertEqual(len(result['lines']),2)
        self.assertFalse(result['newAnimationGenerated'])
        self.assertFalse(result['mediaGenerated'])
        self.assertEqual(len(calls),1,'no paid-request retry')
        payload,key=calls[0]
        self.assertEqual(key,'CI_ONLY_FAKE')
        self.assertIs(payload['store'],False)
        self.assertTrue(payload['text']['format']['strict'])
        self.assertEqual(payload['text']['format']['type'],'json_schema')
        self.assertNotIn('CI_ONLY_FAKE',json.dumps(payload))
        self.assertNotIn('glb',payload['input'].lower())
        self.assertNotIn('photo',payload['input'].lower())
    def test_invalid_input_does_not_reach_billable_model(self):
        def blocked(*_):self.fail('Model called on invalid input')
        ai=DialogueAI('CI_ONLY_FAKE',transport=blocked)
        for item in [
            {'story':'','style':'witty','beats':fixture()['beats']},
            {'story':'x'*3001,'style':'witty','beats':fixture()['beats']},
            {'story':'出拳','style':'untrusted','beats':fixture()['beats']},
            {'story':'出拳','style':'witty','beats':[{'index':1,'actionId':'punch'}]},
            {'story':'出拳','style':'witty','beats':[{'index':0,'actionId':'unknown'}]},
        ]:
            with self.assertRaises(ValueError):ai.generate(item)
    def test_wrong_order_or_nontext_response_fail_closed(self):
        bad=DialogueAI('x',transport=lambda *_:llm_response([{'beat':1,'text':'錯順序'}]))
        with self.assertRaisesRegex(RuntimeError,'AI_DIALOGUE_BEAT_COUNT_MISMATCH'):bad.generate(fixture())
        bad=DialogueAI('x',transport=lambda *_:llm_response([
            {'beat':1,'text':'順序錯'}, {'beat':0,'text':'錯順序'}]))
        with self.assertRaisesRegex(RuntimeError,'AI_DIALOGUE_BEAT_ORDER_MISMATCH'):bad.generate(fixture())
        bad=DialogueAI('x',transport=lambda *_:{'status':'incomplete','output':[]})
        with self.assertRaisesRegex(RuntimeError,'AI_DIALOGUE_RESPONSE_INCOMPLETE'):bad.generate(fixture())


class DialogueServerTest(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
        ai=DialogueAI('fake-test-key',transport=lambda *_:llm_response([
            {'beat':0,'text':'這條走廊很長，主角光環先幫我開燈！'},
            {'beat':1,'text':'這拳頭不打人，專打尷尬的空氣！'}]))
        self.server=make_server(Path(self.tmp.name)/'jobs',MeshyClient(''),port=0,dialogue_client=ai)
        self.addCleanup(self.server.server_close);self.addCleanup(self.server.shutdown)
        threading.Thread(target=self.server.serve_forever,daemon=True).start()
        self.base='http://127.0.0.1:'+str(self.server.server_port)
    def test_explicit_localhost_user_click_endpoint_returns_genuine_provider_label(self):
        state=json.load(urlopen(self.base+'/api/config'))
        self.assertTrue(state['dialogueAIConfigured'])
        self.assertNotIn('fake-test-key',json.dumps(state))
        raw=json.dumps(fixture(),ensure_ascii=False).encode('utf8')
        req=Request(self.base+'/api/story/dialogue',data=raw,
            headers={'Content-Type':'application/json','X-AIG-Request':'1'},method='POST')
        r=json.load(urlopen(req))
        self.assertEqual(r['provider'],'OpenAI')
        self.assertEqual(len(r['lines']),2)
        self.assertNotIn('fake-test-key',json.dumps(r))
    def test_reject_cross_origin_missing_click_header_and_oversized_body(self):
        raw=json.dumps(fixture(),ensure_ascii=False).encode('utf8')
        for headers in [
            {'Content-Type':'application/json','Origin':'https://malicious.example','X-AIG-Request':'1'},
            {'Content-Type':'application/json'},
        ]:
            req=Request(self.base+'/api/story/dialogue',data=raw,headers=headers,method='POST')
            with self.assertRaises(HTTPError) as err:urlopen(req)
            self.assertEqual(err.exception.code,403)
        req=Request(self.base+'/api/story/dialogue',data=b'x'*17000,
            headers={'Content-Type':'application/json','X-AIG-Request':'1'},method='POST')
        with self.assertRaises(HTTPError) as err:urlopen(req)
        self.assertEqual(err.exception.code,409)


if __name__=='__main__':
    unittest.main()
