"""Zero-credit native AIG 4.0 backend HTTP and journal tests."""
import base64
import io
import json
import sys
import tempfile
import threading
import time
import unittest
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request,urlopen
from PIL import Image,ImageDraw
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from aig_native4_jobs import AigNative4Jobs
from provider import MeshyClient
from server import make_server
from glb import audit_glb
from aig_native_provenance_5_4 import audit_native_aig4_job,SCHEMA as AIG54_SCHEMA

def foreground_bytes():
    img=Image.new('RGBA',(256,384),(0,0,0,0))
    d=ImageDraw.Draw(img)
    d.ellipse((85,22,170,90),fill=(128,91,71,255))
    d.rectangle((92,84,165,225),fill=(209,166,181,255))
    d.polygon([(92,200),(165,200),(199,289),(58,289)],fill=(236,183,209,255))
    d.rectangle((89,282,113,351),fill=(207,170,157,255))
    d.rectangle((144,282,170,351),fill=(207,170,157,255))
    b=io.BytesIO();img.save(b,format='PNG')
    return b.getvalue()

class AigNative4JobsTests(unittest.TestCase):
 def setUp(self):
    self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
    self.root=Path(self.tmp.name)
    self.raw=foreground_bytes()
    self.jobs=AigNative4Jobs(self.root)
 def wait_for(self,job):
    for _ in range(100):
        doc=self.jobs.read(job)
        if doc['status']!='RUNNING':return doc
        time.sleep(.1)
    self.fail('AIG4_LOCAL_BUILD_TIMEOUT')
 def test_hash_bound_idempotent_self_owned_generation(self):
    first=self.jobs.create(self.raw,'a'*32)
    second=self.jobs.create(self.raw,'a'*32)
    self.assertEqual(first['id'],second['id'])
    with self.assertRaisesRegex(ValueError,'AIG4_REQUEST_ID_SOURCE_MISMATCH'):
        self.jobs.create(self.raw+b'garbage','a'*32)
    self.jobs.begin(first['id']);self.jobs.begin(first['id'])
    last=self.wait_for(first['id'])
    self.assertEqual(last['status'],'COMPLETE')
    self.assertTrue(last['real3DMeshProduced'])
    self.assertTrue(last['noCreditsSpent'])
    self.assertFalse(last['formalHeroineApproved'])
    raw,mime=self.jobs.asset(first['id'],'model.glb')
    self.assertEqual(mime,'model/gltf-binary')
    path=self.root/'model.glb';path.write_bytes(raw)
    audit=audit_glb(path)
    self.assertGreater(audit['triangles'],3000)
    self.assertEqual(audit['skins'],0)
    self.assertEqual(audit['animationClips'],0)
    # 5.4: verify the bytes actually stored on disk, including GLB embedded source SHA.
    attestation=audit_native_aig4_job(self.jobs.directory(first['id']),last)
    self.assertEqual(attestation['schema'],AIG54_SCHEMA)
    self.assertTrue(attestation['sameJobSourceToGLBVerified'])
    self.assertEqual(attestation['modelGLBSHA256'],last['artifacts']['model.glb']['sha256'])
    self.assertEqual(attestation['sourceImageSHA256'],last['sourceSHA256'])
    self.assertEqual(attestation['engineSourceNowMatchesBuild'],True)
    self.assertFalse(attestation['generatorHasHumanoidRig'])
    self.assertFalse(attestation['realHeroineAppearanceApproved'])
    self.assertFalse(attestation['releaseAllowed'])
    self.assertRegex(attestation['nativeEngineSourceSHA256AtBuild'],r'^[a-f0-9]{64}
        contents,_=self.jobs.asset(first['id'],name)
        self.assertGreater(len(contents),100)
    with self.assertRaisesRegex(ValueError,'AIG4_ASSET_NAME_INVALID'):
        self.jobs.asset(first['id'],'../secret')
    with self.assertRaisesRegex(ValueError,'AIG4_JOB_ID_INVALID'):
        self.jobs.read('../../')
 def test_http_no_external_service_even_when_client_has_credentials(self):
    # Passing a (fake) Meshy credential MUST never be used by AIG4 endpoints.
    server=make_server(self.root/'http',MeshyClient('test-not-real'),port=0)
    thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
    try:
        base='http://127.0.0.1:'+str(server.server_port)
        caps=json.load(urlopen(base+'/api/aig4/capabilities'))
        self.assertEqual(caps['zeroCredits'],True)
        self.assertFalse(caps['autoRigging'])
        self.assertFalse(caps['releaseAllowed'])
        uri='data:image/png;base64,'+base64.b64encode(self.raw).decode()
        params=json.dumps({'image':uri,'requestId':'b'*32}).encode()
        def req(headers=None):
            h={'Content-Type':'application/json','X-AIG-Request':'1'}
            if headers:h.update(headers)
            return Request(base+'/api/aig4/jobs',data=params,headers=h,method='POST')
        with urlopen(req()) as resp:self.assertEqual(resp.status,202);created=json.load(resp)
        with urlopen(req()) as resp:repeat=json.load(resp)
        self.assertEqual(created['id'],repeat['id'])
        for _ in range(120):
            result=json.load(urlopen(base+'/api/aig4/jobs/'+created['id']))
            if result['status']!='RUNNING':break
            time.sleep(.1)
        self.assertEqual(result['status'],'COMPLETE')
        with urlopen(base+'/api/aig4/jobs/'+created['id']+'/files/model.glb') as r:
            self.assertTrue(r.read().startswith(b'glTF'))
        attestation=json.load(urlopen(base+'/api/aig4/jobs/'+created['id']+'/provenance'))
        self.assertEqual(attestation['schema'],AIG54_SCHEMA)
        self.assertTrue(attestation['verificationPerformedOnPersistedSourceBytes'])
        self.assertFalse(attestation['releaseAllowed'])
        self.assertEqual(attestation['jobId'],created['id'])
        with urlopen(base+'/api/aig4/jobs/'+created['id']+'/files/view-090.png') as r:
            self.assertEqual(r.read(8),b'\x89PNG\r\n\x1a\n')
        with self.assertRaises(HTTPError) as e:urlopen(req({'Origin':'https://attacker.example'}))
        self.assertEqual(e.exception.code,403)
        with self.assertRaises(HTTPError) as e:
            urlopen(Request(base+'/api/reconstruction/jobs',data=b'{}',
                    headers={'Content-Type':'application/json','X-AIG-Request':'1'}))
        self.assertIn('ZERO_CREDITS_REMOTE_3D_BLOCKED',e.exception.read().decode())
    finally:
        server.shutdown();server.server_close();thread.join(timeout=2)

 def test_zero_credits_blocks_voice_and_cloud_dialogue_even_with_credentials(self):
    class FakePaid:
        configured=True
        def __init__(self):self.requests=0
        def generate(self,body):
            self.requests+=1
            raise AssertionError('AIG_ZERO_CREDITS_PROVIDER_CALLED')
    fake_voice=FakePaid();fake_dialogue=FakePaid()
    server=make_server(self.root/'no-paid',MeshyClient('test-not-real'),port=0,
                       dialogue_client=fake_dialogue,speech_client=fake_voice)
    thread=threading.Thread(target=server.serve_forever,daemon=True)
    thread.start()
    try:
        base='http://127.0.0.1:'+str(server.server_port)
        config=json.load(urlopen(base+'/api/config'))
        self.assertFalse(config['speechAIConfigured'])
        self.assertFalse(config['dialogueAIConfigured'])
        self.assertFalse(config['configured'])
        for url,expected in [('/api/story/voice','ZERO_CREDITS_CLOUD_VOICE_BLOCKED'),
                             ('/api/story/dialogue','ZERO_CREDITS_CLOUD_DIALOGUE_BLOCKED')]:
            data=json.dumps({'beat':0,'text':'免費模式','voice':'coral'}).encode()
            request=Request(base+url,data=data,
                            headers={'Content-Type':'application/json','X-AIG-Request':'1'},
                            method='POST')
            with self.assertRaises(HTTPError) as error:
                urlopen(request)
            self.assertEqual(error.exception.code,409)
            self.assertIn(expected,error.exception.read().decode())
        self.assertEqual(fake_voice.requests,0)
        self.assertEqual(fake_dialogue.requests,0)
    finally:
        server.shutdown();server.server_close();thread.join(timeout=2)

if __name__=='__main__':unittest.main()
)
    # Byte tampering of the persisted GLB must fail closed without auto repair.
    glb_source=self.jobs.directory(first['id'])/'generated'/'AIG-4.0-VOLUME-TECHNICAL-NOT-APPROVED.glb'
    backup=glb_source.read_bytes()
    try:
        glb_source.write_bytes(backup+b'X')
        with self.assertRaisesRegex(ValueError,'AIG54_PERSISTED_DIGEST_MISMATCH'):
            audit_native_aig4_job(self.jobs.directory(first['id']),last)
    finally:
        glb_source.write_bytes(backup)
    self.assertEqual(audit_native_aig4_job(self.jobs.directory(first['id']),last)['status'],
                     'SOURCE_CHAIN_INTEGRITY_PASS_TECHNICAL_DRAFT_ONLY')
    for name in ('scaffold.json','confidence.png','view-000.png','view-315.png'):
        contents,_=self.jobs.asset(first['id'],name)
        self.assertGreater(len(contents),100)
    with self.assertRaisesRegex(ValueError,'AIG4_ASSET_NAME_INVALID'):
        self.jobs.asset(first['id'],'../secret')
    with self.assertRaisesRegex(ValueError,'AIG4_JOB_ID_INVALID'):
        self.jobs.read('../../')
 def test_http_no_external_service_even_when_client_has_credentials(self):
    # Passing a (fake) Meshy credential MUST never be used by AIG4 endpoints.
    server=make_server(self.root/'http',MeshyClient('test-not-real'),port=0)
    thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
    try:
        base='http://127.0.0.1:'+str(server.server_port)
        caps=json.load(urlopen(base+'/api/aig4/capabilities'))
        self.assertEqual(caps['zeroCredits'],True)
        self.assertFalse(caps['autoRigging'])
        self.assertFalse(caps['releaseAllowed'])
        uri='data:image/png;base64,'+base64.b64encode(self.raw).decode()
        params=json.dumps({'image':uri,'requestId':'b'*32}).encode()
        def req(headers=None):
            h={'Content-Type':'application/json','X-AIG-Request':'1'}
            if headers:h.update(headers)
            return Request(base+'/api/aig4/jobs',data=params,headers=h,method='POST')
        with urlopen(req()) as resp:self.assertEqual(resp.status,202);created=json.load(resp)
        with urlopen(req()) as resp:repeat=json.load(resp)
        self.assertEqual(created['id'],repeat['id'])
        for _ in range(120):
            result=json.load(urlopen(base+'/api/aig4/jobs/'+created['id']))
            if result['status']!='RUNNING':break
            time.sleep(.1)
        self.assertEqual(result['status'],'COMPLETE')
        with urlopen(base+'/api/aig4/jobs/'+created['id']+'/files/model.glb') as r:
            self.assertTrue(r.read().startswith(b'glTF'))
        with urlopen(base+'/api/aig4/jobs/'+created['id']+'/files/view-090.png') as r:
            self.assertEqual(r.read(8),b'\x89PNG\r\n\x1a\n')
        with self.assertRaises(HTTPError) as e:urlopen(req({'Origin':'https://attacker.example'}))
        self.assertEqual(e.exception.code,403)
        with self.assertRaises(HTTPError) as e:
            urlopen(Request(base+'/api/reconstruction/jobs',data=b'{}',
                    headers={'Content-Type':'application/json','X-AIG-Request':'1'}))
        self.assertIn('ZERO_CREDITS_REMOTE_3D_BLOCKED',e.exception.read().decode())
    finally:
        server.shutdown();server.server_close();thread.join(timeout=2)

 def test_zero_credits_blocks_voice_and_cloud_dialogue_even_with_credentials(self):
    class FakePaid:
        configured=True
        def __init__(self):self.requests=0
        def generate(self,body):
            self.requests+=1
            raise AssertionError('AIG_ZERO_CREDITS_PROVIDER_CALLED')
    fake_voice=FakePaid();fake_dialogue=FakePaid()
    server=make_server(self.root/'no-paid',MeshyClient('test-not-real'),port=0,
                       dialogue_client=fake_dialogue,speech_client=fake_voice)
    thread=threading.Thread(target=server.serve_forever,daemon=True)
    thread.start()
    try:
        base='http://127.0.0.1:'+str(server.server_port)
        config=json.load(urlopen(base+'/api/config'))
        self.assertFalse(config['speechAIConfigured'])
        self.assertFalse(config['dialogueAIConfigured'])
        self.assertFalse(config['configured'])
        for url,expected in [('/api/story/voice','ZERO_CREDITS_CLOUD_VOICE_BLOCKED'),
                             ('/api/story/dialogue','ZERO_CREDITS_CLOUD_DIALOGUE_BLOCKED')]:
            data=json.dumps({'beat':0,'text':'免費模式','voice':'coral'}).encode()
            request=Request(base+url,data=data,
                            headers={'Content-Type':'application/json','X-AIG-Request':'1'},
                            method='POST')
            with self.assertRaises(HTTPError) as error:
                urlopen(request)
            self.assertEqual(error.exception.code,409)
            self.assertIn(expected,error.exception.read().decode())
        self.assertEqual(fake_voice.requests,0)
        self.assertEqual(fake_dialogue.requests,0)
    finally:
        server.shutdown();server.server_close();thread.join(timeout=2)

if __name__=='__main__':unittest.main()
