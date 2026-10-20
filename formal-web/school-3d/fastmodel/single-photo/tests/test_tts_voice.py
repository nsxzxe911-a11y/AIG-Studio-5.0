"""Synthetic-only TTS tests: zero paid calls, validate actual WAV container."""
import io,json,sys,tempfile,threading,unittest,wave
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request,urlopen
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from tts_voice import SpeechAI,validate_tts_request,validate_wav
from server import make_server
from provider import MeshyClient

def wav_bytes():
    out=io.BytesIO()
    with wave.open(out,'wb') as f:
        f.setnchannels(1);f.setsampwidth(2);f.setframerate(16000)
        f.writeframes(b'\x00\x00'*1600)
    return out.getvalue()

class SpeechAITests(unittest.TestCase):
    def test_inactive_configuration_does_not_call_provider(self):
        ai=SpeechAI('')
        self.assertFalse(ai.configured)
        with self.assertRaisesRegex(ValueError,'TTS_NOT_CONFIGURED'):
            ai.generate({'beat':0,'text':'你好','voice':'coral'})
    def test_true_wav_bytes_and_approved_voice_go_to_provider_once(self):
        calls=[]
        def fake(payload,key):
            calls.append((payload,key));return wav_bytes()
        ai=SpeechAI('FAKE_KEY',transport=fake)
        out=ai.generate({'beat':0,'text':'櫻花都比我會準時！','voice':'coral'})
        self.assertEqual(out,wav_bytes());self.assertEqual(len(calls),1)
        self.assertEqual(calls[0][0]['response_format'],'wav')
        self.assertEqual(calls[0][0]['model'],'gpt-4o-mini-tts')
        self.assertNotIn('FAKE_KEY',json.dumps(calls[0][0]))
        self.assertNotIn('photo',json.dumps(calls[0][0]))
        self.assertNotIn('glb',json.dumps(calls[0][0]))
    def test_invalid_fields_and_malformed_sound_fail_closed(self):
        calls=[]
        ai=SpeechAI('X',transport=lambda *_:calls.append(1) or wav_bytes())
        base={'beat':0,'text':'說話','voice':'coral'}
        for b in [{**base,'beat':True},{**base,'beat':-1},{**base,'beat':20},
                  {**base,'voice':'custom_id'},{**base,'text':''},
                  {**base,'text':'x'*241},{**base,'text':'hi\nhello'},
                  {**base,'glb':'secret'},[]]:
            with self.assertRaises(ValueError):ai.generate(b)
        self.assertEqual(calls,[])
        with self.assertRaisesRegex(ValueError,'TTS_WAV_HEADER_INVALID'):validate_wav(b'0'*64)
        invalid=bytearray(wav_bytes());invalid[4:8]=b'\xff'*4
        with self.assertRaisesRegex(ValueError,'TTS_WAV_LENGTH_INVALID'):validate_wav(bytes(invalid))
    def test_http_requires_local_origin_click_and_json(self):
        ai=SpeechAI('FAKE_KEY',transport=lambda *_:wav_bytes())
        with tempfile.TemporaryDirectory() as d:
            server=make_server(Path(d)/'jobs',MeshyClient(''),port=0,speech_client=ai)
            thread=threading.Thread(target=server.serve_forever,daemon=True)
            thread.start()
            try:
                base='http://127.0.0.1:'+str(server.server_port)
                config=json.load(urlopen(base+'/api/config'))
                self.assertTrue(config['speechAIConfigured'])
                self.assertNotIn('FAKE_KEY',json.dumps(config))
                body=json.dumps({'beat':0,'text':'很高興認識你','voice':'coral'},ensure_ascii=False).encode()
                req=Request(base+'/api/story/voice',data=body,headers={
                    'Content-Type':'application/json','X-AIG-Request':'1'},method='POST')
                with urlopen(req) as r:
                    self.assertEqual(r.headers['Content-Type'],'audio/wav')
                    self.assertEqual(r.read(),wav_bytes())
                for headers in [
                    {'Content-Type':'application/json'},
                    {'Content-Type':'application/json','X-AIG-Request':'1',
                     'Origin':'https://attacker.example'}
                ]:
                    request=Request(base+'/api/story/voice',data=body,headers=headers,method='POST')
                    with self.assertRaises(HTTPError) as e:urlopen(request)
                    self.assertEqual(e.exception.code,403)
                too_long=Request(base+'/api/story/voice',data=b'x'*17000,headers={
                    'Content-Type':'application/json','X-AIG-Request':'1'},method='POST')
                with self.assertRaises(HTTPError) as e:urlopen(too_long)
                self.assertEqual(e.exception.code,409)
            finally:server.shutdown();server.server_close();thread.join(timeout=2)

if __name__=='__main__': unittest.main()
