import io, json, struct, sys, tempfile, threading, unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from PIL import Image

BASE=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(BASE))


def fixture_glb(animated=True):
    # Tetrahedron is SYNTHETIC technical geometry, never a generated character.
    arrays=[struct.pack('<12f',0,0,0,1,0,0,0,1,0,0,0,1),struct.pack('<12H',0,2,1,0,1,3,1,2,3,2,0,3),struct.pack('<2f',0,1),struct.pack('<6f',0,0,0,0,.5,0),struct.pack('<16H',*([0,0,0,0]*4)),struct.pack('<16f',*([1,0,0,0]*4))]
    data=bytearray();views=[]
    for a in arrays:
        data.extend(b'\0'*(-len(data)%4));views.append({'buffer':0,'byteOffset':len(data),'byteLength':len(a)});data.extend(a)
    g={'asset':{'version':'2.0'},'scene':0,'scenes':[{'nodes':[0,1]}], 'nodes':[{'mesh':0,'skin':0},{}], 'meshes':[{'primitives':[{'attributes':{'POSITION':0,'JOINTS_0':4,'WEIGHTS_0':5},'indices':1,'material':0}]}], 'materials':[{'pbrMetallicRoughness':{'baseColorFactor':[.5,.6,.7,1],'roughnessFactor':.7}}], 'buffers':[{'byteLength':len(data)}], 'bufferViews':views,'accessors':[{'bufferView':0,'componentType':5126,'count':4,'type':'VEC3','min':[0,0,0],'max':[1,1,1]},{'bufferView':1,'componentType':5123,'count':12,'type':'SCALAR'},{'bufferView':2,'componentType':5126,'count':2,'type':'SCALAR'},{'bufferView':3,'componentType':5126,'count':2,'type':'VEC3'},{'bufferView':4,'componentType':5123,'count':4,'type':'VEC4'},{'bufferView':5,'componentType':5126,'count':4,'type':'VEC4'}],'skins':[{'joints':[1]}]}
    if animated:g['animations']=[{'name':'SYNTHETIC translation','samplers':[{'input':2,'output':3,'interpolation':'LINEAR'}],'channels':[{'sampler':0,'target':{'node':1,'path':'translation'}}]}]
    j=json.dumps(g).encode();j+=b' '*(-len(j)%4);data.extend(b'\0'*(-len(data)%4))
    return struct.pack('<III',0x46546c67,2,28+len(j)+len(data))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(data),0x004e4942)+data


class PipelineTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from provider import MeshyClient
        from pipeline import PhotoPipeline
        cls.Client,cls.Pipeline=MeshyClient,PhotoPipeline
        cls.posts=[];cls.fail_stage=None;cls.bad_asset=False;cls.bad_walk=False;cls.reject=0;cls.drop_post=False
        class Handler(BaseHTTPRequestHandler):
            def log_message(self,*a):pass
            def do_POST(self):
                body=json.loads(self.rfile.read(int(self.headers['Content-Length'])))
                cls.posts.append((self.path,body,self.headers.get('Authorization')))
                if cls.drop_post:self.connection.close();return
                if cls.reject:self.send_response(cls.reject);self.end_headers();return
                stage=self.path.rsplit('/',1)[-1]
                self.send_response(200);self.end_headers();self.wfile.write(json.dumps({'result':stage+'-task'}).encode())
            def do_GET(self):
                if self.path.startswith('/asset'):
                    self.send_response(200);self.end_headers();self.wfile.write(b'not glb' if cls.bad_asset or (cls.bad_walk and 'walking' in self.path) else fixture_glb());return
                stage=self.path.split('/')[-2]
                origin='http://127.0.0.1:'+str(self.server.server_port)
                d={'status':'FAILED' if cls.fail_stage==stage else 'SUCCEEDED','progress':100,'model_urls':{'glb':origin+'/asset-model.glb'},'result':{'rigged_character_glb_url':origin+'/asset-rig.glb','animation_glb_url':origin+'/asset-animated.glb','basic_animations':{'walking_glb_url':origin+'/asset-walking.glb'}}}
                self.send_response(200);self.end_headers();self.wfile.write(json.dumps(d).encode())
        cls.server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
        cls.thread=threading.Thread(target=cls.server.serve_forever,daemon=True);cls.thread.start()
    @classmethod
    def tearDownClass(cls):cls.server.shutdown();cls.server.server_close()
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
        self.root=Path(self.tmp.name);self.source=self.root/'任意照片.jpg'
        Image.new('RGB',(90,140),(60,110,150)).save(self.source)
        self.url='http://127.0.0.1:'+str(self.server.server_port)
        self.client=self.Client('test-secret',base_url=self.url)
        self.p=self.Pipeline(self.root/'jobs',self.client)
        self.posts.clear();type(self).fail_stage=None;type(self).bad_asset=False;type(self).bad_walk=False;type(self).reject=0;type(self).drop_post=False
    def finish(self,job):
        for _ in range(15):
            report=self.p.step(job)
            if report['status'] in ('COMPLETE','FAILED','SUBMISSION_UNKNOWN'):return report
        self.fail('pipeline did not terminate')
    def test_any_photo_no_manual_guides_chains_real_protocol_and_preserves_original(self):
        original=self.source.read_bytes();report=self.p.create(self.source,action_id=4);job=report['id']
        done=self.finish(job)
        self.assertEqual(done['status'],'COMPLETE')
        self.assertEqual([x[0] for x in self.posts],['/image-to-3d','/rigging','/animations'])
        self.assertEqual(self.posts[1][1]['input_task_id'],'image-to-3d-task')
        self.assertEqual(self.posts[2][1]['rig_task_id'],'rigging-task')
        self.assertNotIn('test-secret',json.dumps(done))
        self.assertEqual(original,self.source.read_bytes())
        self.assertTrue((self.p.directory(job)/'animated.glb').is_file())
        self.assertFalse(done['releaseAllowed']);self.assertTrue(done['inferredUnseenSurfaces'])
    def test_default_walk_uses_actual_rig_output_without_extra_animation_charge(self):
        done=self.finish(self.p.create(self.source)['id'])
        self.assertEqual(done['status'],'COMPLETE');self.assertEqual(len(self.posts),2)
        self.assertEqual(done['animationKind'],'skeletal-basic-walk')
    def test_restart_uses_existing_task_id_instead_of_posting_again(self):
        job=self.p.create(self.source,action_id=4)['id'];self.p.step(job)
        self.p=self.Pipeline(self.root/'jobs',self.client)
        self.assertEqual(self.finish(job)['status'],'COMPLETE')
        self.assertEqual(len([x for x in self.posts if x[0]=='/image-to-3d']),1)
    def test_submitting_unknown_never_automatically_posts_again(self):
        job=self.p.create(self.source)['id'];f=self.p.directory(job)/'job.json';d=json.loads(f.read_text());d['stages']['model']={'status':'SUBMITTING'};f.write_text(json.dumps(d))
        self.assertEqual(self.p.step(job)['status'],'SUBMISSION_UNKNOWN')
        self.assertEqual(self.p.step(job)['status'],'SUBMISSION_UNKNOWN');self.assertEqual(self.posts,[])
        self.p.attach(job,'model','image-to-3d-task')
        self.assertEqual(self.finish(job)['status'],'COMPLETE')
    def test_rig_failure_keeps_successful_model_and_input(self):
        type(self).fail_stage='rigging'
        job=self.p.create(self.source)['id'];done=self.finish(job)
        self.assertEqual(done['status'],'FAILED')
        self.assertTrue((self.p.directory(job)/'model.glb').is_file())
        self.assertTrue((self.p.directory(job)/'source-original.jpg').is_file())
    def test_invalid_asset_cannot_become_successful_3d(self):
        type(self).bad_asset=True;job=self.p.create(self.source)['id']
        with self.assertRaisesRegex(ValueError,'GLB'):self.finish(job)
        self.assertFalse((self.p.directory(job)/'model.glb').exists())
    def test_missing_key_has_no_cloud_request_or_fake_output(self):
        p=self.Pipeline(self.root/'unconfigured',self.Client(''))
        with self.assertRaisesRegex(ValueError,'MESHY_API_KEY'):p.create(self.source)
        self.assertEqual(self.posts,[]);self.assertFalse((self.root/'unconfigured').exists())
    def test_object_mode_is_explicit_camera_orbit_not_faked_character_motion(self):
        done=self.finish(self.p.create(self.source,mode='object')['id'])
        self.assertEqual(done['status'],'COMPLETE');self.assertEqual(len(self.posts),1)
        self.assertEqual(done['animationKind'],'camera-orbit-object-only')
    def test_source_snapshot_tampering_is_rejected(self):
        job=self.p.create(self.source)['id']
        (self.p.directory(job)/'source-upload.png').write_bytes(b'changed')
        with self.assertRaisesRegex(ValueError,'SOURCE_CHANGED'):self.p.step(job)
        self.assertEqual(self.posts,[])
    def test_basic_walk_download_failure_resumes_without_posting_null_action(self):
        type(self).bad_walk=True;job=self.p.create(self.source)['id']
        with self.assertRaisesRegex(ValueError,'GLB'):self.finish(job)
        self.assertTrue((self.p.directory(job)/'rigged.glb').is_file())
        type(self).bad_walk=False
        self.assertEqual(self.finish(job)['status'],'COMPLETE')
        self.assertEqual(len(self.posts),2)
    def test_actual_post_connection_drop_is_unknown_and_never_resubmitted(self):
        type(self).drop_post=True;job=self.p.create(self.source)['id']
        self.assertEqual(self.p.step(job)['status'],'SUBMISSION_UNKNOWN')
        self.assertEqual(self.p.step(job)['status'],'SUBMISSION_UNKNOWN');self.assertEqual(len(self.posts),1)
    def test_auth_credit_and_rate_rejection_are_visible_without_auto_resubmit(self):
        for code in (401,402,429):
            type(self).reject=code;job=self.p.create(self.source)['id'];done=self.p.step(job)
            self.assertEqual(done['status'],'FAILED');self.assertIn(str(code),done['message'])
            self.p.step(job)
        self.assertEqual(len(self.posts),3)
    def test_post_server_error_is_acceptance_unknown(self):
        type(self).reject=500;job=self.p.create(self.source)['id']
        self.assertEqual(self.p.step(job)['status'],'SUBMISSION_UNKNOWN')
    def test_default_walk_refreshes_signed_asset_url_from_existing_rig_task(self):
        job=self.p.create(self.source)['id']
        for _ in range(4):self.p.step(job)
        f=self.p.directory(job)/'job.json';d=json.loads(f.read_text());d['stages']['animation']['assetUrl']=self.url+'/expired-resource';f.write_text(json.dumps(d))
        self.assertEqual(self.p.step(job)['status'],'COMPLETE')
        self.assertEqual(len(self.posts),2)


if __name__=='__main__':unittest.main()
