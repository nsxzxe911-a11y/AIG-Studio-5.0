import json,sys,tempfile,threading,unittest
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request,urlopen
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from provider import MeshyClient
from reconstruction_service import capabilities,require_service,project_job,SCHEMA,SERVICE_ID,MULTIVIEW_ID
from server import make_server

class ReconstructionServiceTests(unittest.TestCase):
 def test_only_real_provider_available_and_future_backends_are_not_implemented(self):
  config=capabilities(MeshyClient(''))
  self.assertEqual(config['schema'],SCHEMA)
  self.assertEqual(len(config['providers']),2)
  self.assertTrue(all(p['modelServiceIsReal'] for p in config['providers']))
  self.assertEqual(config['providers'][1]['id'],MULTIVIEW_ID)
  self.assertEqual(config['providers'][1]['maxViews'],4)
  self.assertFalse(config['providers'][1]['liveGenerationVerified'])
  self.assertFalse(config['providers'][0]['configured'])
  self.assertFalse(config['providers'][0]['liveGenerationVerified'])
  self.assertFalse(config['providers'][0]['separateTexturingStatusAvailable'])
  self.assertFalse(config['autoFallback'])
  self.assertFalse(config['glbQualityReleaseAllowed'])
  self.assertTrue(all(not p['implemented'] for p in config['futureProviders']))
  with self.assertRaisesRegex(ValueError,'MESHY_API_KEY'):require_service(SERVICE_ID,MeshyClient(''))
  with self.assertRaisesRegex(ValueError,'RECONSTRUCTION_SERVICE_UNSUPPORTED'):
   require_service('local-onnx-3d',MeshyClient('ABC'))
  self.assertEqual(require_service(SERVICE_ID,MeshyClient('ABC')),SERVICE_ID)
  self.assertEqual(require_service(MULTIVIEW_ID,MeshyClient('ABC')),MULTIVIEW_ID)
 def sample(self,status='RUNNING',**stages):
  return {'id':'a'*32,'status':status,'stages':{k:{'status':v} for k,v in stages.items()},
    'artifacts':{},'sourceSHA256':'b'*64,'uploadSHA256':'c'*64,'originalImageStillAvailable':True}
 def test_state_machine_distinguishes_real_phases_and_no_fake_texturing(self):
  scenarios=[('RUNNING',{'model':'NEW'},'PRECHECK'),
   ('RUNNING',{'model':'PENDING'},'RECONSTRUCTING'),
   ('RUNNING',{'model':'IN_PROGRESS'},'RECONSTRUCTING'),
   ('RUNNING',{'model':'DOWNLOADING'},'EXPORTING'),
   ('RUNNING',{'model':'SUCCEEDED','rig':'PENDING'},'RIGGING'),
   ('RUNNING',{'model':'SUCCEEDED','rig':'SUCCEEDED','animation':'PENDING'},'EXPORTING'),
   ('SUBMISSION_UNKNOWN',{'model':'SUBMISSION_UNKNOWN'},'SUBMISSION_UNKNOWN'),
   ('FAILED',{'model':'FAILED'},'FAILED'),
   ('COMPLETE',{'model':'SUCCEEDED','rig':'SUCCEEDED','animation':'SUCCEEDED'},'COMPLETE')]
  for state,stages,want in scenarios:
   with self.subTest(state=state,stage=stages):
    out=project_job(self.sample(state,**stages))
    self.assertEqual(out['phase'],want)
    self.assertFalse(out['releaseAllowed'])
    self.assertFalse(out['faceHairNeckApproved'])
    self.assertFalse(out['separateTexturingGate'])
 def test_exact_download_link_and_asset_sha_pass_without_approving_identity(self):
  row=self.sample('COMPLETE',model='SUCCEEDED',rig='SUCCEEDED',animation='SUCCEEDED')
  row['artifacts']={'model.glb':{'sha256':'e'*64,'bytes':1200},
                    'animated.glb':{'sha256':'f'*64,'bytes':2200},
                    'outside.glb':{'sha256':'d'*64,'bytes':12}}
  out=project_job(row)
  self.assertEqual(len(out['artifacts']),2)
  self.assertEqual(out['artifacts'][0]['downloadPath'],'/api/jobs/'+row['id']+'/files/model.glb')
  self.assertTrue(out['actualGLBProduced'])
  self.assertFalse(out['verifiedSourceGeometry'])
  self.assertFalse(out['releaseAllowed'])
  self.assertFalse(out['automaticStagesEnabled'])
  row['automation']={'enabled':True}
  self.assertTrue(project_job(row)['automaticStagesEnabled'])
  self.assertEqual(project_job(row)['automaticStages'],['model','rig','animation'])
  row['artifacts']['model.glb']['sha256']='invalid'
  self.assertEqual(len(project_job(row)['artifacts']),1)
 def test_http_service_discovery_poll_and_explicit_create_guard(self):
  with tempfile.TemporaryDirectory() as tmp:
   server=make_server(Path(tmp)/'jobs',MeshyClient(''),port=0)
   thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
   try:
    base='http://127.0.0.1:'+str(server.server_port)
    info=json.load(urlopen(base+'/api/reconstruction/services'))
    self.assertIsNone(info['defaultServiceId'])
    self.assertFalse(info['providers'][0]['configured'])
    self.assertNotIn('secret',json.dumps(info))
    req=Request(base+'/api/reconstruction/jobs',data=json.dumps({'serviceId':SERVICE_ID,'requestId':'a'*32}).encode(),headers={'Content-Type':'application/json','X-AIG-Request':'1'},method='POST')
    with self.assertRaises(HTTPError) as e:urlopen(req)
    self.assertEqual(e.exception.code,409)
    # Even if credentials exist, opt-in needs explicit auto-stage confirmation.
    server.pipeline.client.key='fake-local-key'
    missing=Request(base+'/api/reconstruction/jobs',data=json.dumps({
     'serviceId':SERVICE_ID,'requestId':'b'*32}).encode(),headers={
      'Content-Type':'application/json','X-AIG-Request':'1'},method='POST')
    with self.assertRaises(HTTPError) as e:urlopen(missing)
    self.assertEqual(e.exception.code,409)
    self.assertIn('ZERO_CREDITS_REMOTE_3D_BLOCKED',e.exception.read().decode())
    invalid=Request(base+'/api/reconstruction/jobs',data=b'{}',headers={'Content-Type':'application/json','X-AIG-Request':'1','Origin':'http://attacker.example'},method='POST')
    with self.assertRaises(HTTPError) as e:urlopen(invalid)
    self.assertEqual(e.exception.code,403)
    with self.assertRaises(HTTPError) as e:urlopen(base+'/api/reconstruction/jobs/'+'a'*32)
    self.assertEqual(e.exception.code,404)
   finally:server.shutdown();server.server_close();thread.join(timeout=2)
if __name__=='__main__':unittest.main()
