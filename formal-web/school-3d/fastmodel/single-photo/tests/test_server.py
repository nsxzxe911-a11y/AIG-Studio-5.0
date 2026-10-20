import base64, json, sys, tempfile, threading, unittest
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from PIL import Image
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))


class ServerTest(unittest.TestCase):
    def setUp(self):
        from server import make_server
        from provider import MeshyClient
        self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
        self.server=make_server(Path(self.tmp.name)/'jobs',MeshyClient(''),port=0)
        self.addCleanup(self.server.server_close);self.addCleanup(self.server.shutdown)
        threading.Thread(target=self.server.serve_forever,daemon=True).start()
        self.url='http://127.0.0.1:'+str(self.server.server_port)
    def test_config_exposes_connection_state_without_secret(self):
        d=json.load(urlopen(self.url+'/api/config'))
        self.assertFalse(d['configured']);self.assertFalse(d['liveGenerationVerified']);self.assertNotIn('key',d)
    def test_cross_origin_cannot_trigger_billable_create(self):
        req=Request(self.url+'/api/jobs',data=b'{}',headers={'Content-Type':'application/json','Origin':'https://unrelated.example','X-AIG-Request':'1'})
        with self.assertRaises(HTTPError) as e:urlopen(req)
        self.assertEqual(e.exception.code,403)
    def test_unconfigured_generation_returns_actionable_error_without_fake_job(self):
        req=Request(self.url+'/api/jobs',data=b'{}',headers={'Content-Type':'application/json','X-AIG-Request':'1'})
        with self.assertRaises(HTTPError) as e:urlopen(req)
        self.assertEqual(e.exception.code,409);self.assertIn('MESHY_API_KEY',e.exception.read().decode())
    def test_invalid_job_and_path_escape_are_rejected(self):
        for path in ['/api/jobs/not-valid','/api/jobs/'+('a'*32)+'/files/../../provider.py']:
            with self.assertRaises(HTTPError):urlopen(self.url+path)
    def test_duplicate_browser_submission_returns_same_job_and_report_download(self):
        from test_pipeline import PipelineTest
        PipelineTest.setUpClass()
        try:
            client=self.server.pipeline.client;client.key='test-secret';client.base='http://127.0.0.1:'+str(PipelineTest.server.server_port)
            import io
            image=io.BytesIO();Image.new('RGB',(32,48)).save(image,format='PNG')
            data=json.dumps({'image':'data:image/png;base64,'+base64.b64encode(image.getvalue()).decode(),'requestId':'b'*32}).encode()
            def post():return json.load(urlopen(Request(self.url+'/api/jobs',data=data,headers={'Content-Type':'application/json','X-AIG-Request':'1'})))
            first,second=post(),post()
            self.assertEqual(first['id'],second['id'])
            report=json.load(urlopen(self.url+'/api/jobs/'+first['id']+'/files/job.json'))
            self.assertEqual(report['id'],first['id']);self.assertNotIn('test-secret',json.dumps(report))
            recovered=json.load(urlopen(self.url+'/api/requests/'+('b'*32)))
            self.assertEqual(recovered['id'],first['id'])
        finally:
            self.server.server_close();PipelineTest.tearDownClass()


if __name__=='__main__':unittest.main()
