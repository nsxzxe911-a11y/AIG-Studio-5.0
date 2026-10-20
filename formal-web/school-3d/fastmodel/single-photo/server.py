"""Loopback-only single-photo UI. API key never leaves this process."""
import argparse, base64, json, os, re, tempfile, threading, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse
from pipeline import PhotoPipeline
from provider import MeshyClient

HERE=Path(__file__).resolve().parent


def offline_document(pipe,job):
    report=pipe.read(job);name='animated.glb' if 'animated.glb' in report['artifacts'] else 'model.glb'
    if name not in report['artifacts']:raise ValueError('MODEL_NOT_READY')
    html=(HERE/'index.html').read_text(encoding='utf8')
    js=(HERE/'dist/app.js').read_text(encoding='utf8').replace('</script','<\\/script')
    payload={'glb':base64.b64encode((pipe.directory(job)/name).read_bytes()).decode(),'orbit':report['mode']=='object'}
    return html.replace('<script src="/app.js"></script>','<script>window.AIG_OFFLINE='+json.dumps(payload)+';\n'+js+'</script>')


def make_server(root,client,port=8765):
    pipe=PhotoPipeline(root,client);active=set();guard=threading.Lock();create_guard=threading.Lock();stopping=threading.Event()
    def begin(job):
        with guard:
            if job in active:return
            active.add(job)
        def work():
            try:
                for _ in range(2400):
                    if stopping.is_set():return
                    try:
                        d=pipe.step(job)
                    except Exception as error:
                        with __import__('pipeline').lock(pipe.directory(job)/'.lock'):
                            d=pipe.read(job);d['message']=str(error)[:180];pipe.save(job,d)
                        return
                    if d['status'] in ('COMPLETE','FAILED','SUBMISSION_UNKNOWN'):return
                    if stopping.wait(3):return
            finally:
                with guard:active.discard(job)
        threading.Thread(target=work,daemon=True).start()
    class Handler(BaseHTTPRequestHandler):
        def log_message(self,*a):pass
        def send(self,data,status=200,kind='application/json'):
            raw=json.dumps(data,ensure_ascii=False).encode() if kind=='application/json' else data
            self.send_response(status);self.send_header('Content-Type',kind);self.send_header('Content-Length',str(len(raw)));self.send_header('X-Content-Type-Options','nosniff');self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(raw)
        def valid_origin(self):
            host=self.headers.get('Host');port=self.server.server_port
            if host not in (f'127.0.0.1:{port}',f'localhost:{port}'):return False
            origin=self.headers.get('Origin')
            return not origin or origin=='http://'+host
        def do_GET(self):
            if not self.valid_origin():self.send({'error':'ORIGIN_BLOCKED'},403);return
            path=urlparse(self.path).path
            try:
                if path=='/api/config':self.send({'configured':client.configured,'provider':'Meshy','liveGenerationVerified':False});return
                if path=='/api/actions':self.send(client.request('/animations/library'));return
                request_match=re.fullmatch(r'/api/requests/([0-9a-f]{32})',path)
                if request_match:
                    with create_guard:
                        for existing in pipe.root.glob('*/job.json'):
                            d=json.loads(existing.read_text(encoding='utf8'))
                            if d.get('requestId')==request_match[1]:
                                if d['status']=='RUNNING':begin(d['id'])
                                self.send(d);return
                    self.send({'error':'REQUEST_NOT_FOUND'},404);return
                if path=='/':self.send((HERE/'index.html').read_bytes(),kind='text/html; charset=utf-8');return
                if path=='/app.js':self.send((HERE/'dist/app.js').read_bytes(),kind='text/javascript; charset=utf-8');return
                match=re.fullmatch(r'/api/jobs/([0-9a-f]{32})(?:/files/(model\.glb|rigged\.glb|animated\.glb|offline\.html|job\.json))?',path)
                if not match:self.send({'error':'NOT_FOUND'},404);return
                job,name=match.groups();d=pipe.read(job)
                if not name:
                    if d['status']=='RUNNING':begin(job)
                    self.send(d);return
                if name=='offline.html':self.send(offline_document(pipe,job).encode(),kind='text/html; charset=utf-8');return
                if name=='job.json':self.send(d);return
                if name!='job.json' and name not in d['artifacts']:raise ValueError('FILE_NOT_READY')
                self.send((pipe.directory(job)/name).read_bytes(),kind='application/json' if name=='job.json' else 'model/gltf-binary')
            except FileNotFoundError:self.send({'error':'NOT_FOUND_OR_BUILD_MISSING'},404)
            except Exception as e:self.send({'error':str(e)[:180]},409)
        def do_POST(self):
            if not self.valid_origin() or self.headers.get('X-AIG-Request')!='1':self.send({'error':'ORIGIN_BLOCKED'},403);return
            if self.path!='/api/jobs':self.send({'error':'NOT_FOUND'},404);return
            try:
                if not client.configured:raise ValueError('MESHY_API_KEY_NOT_CONFIGURED')
                if self.headers.get('Content-Type')!='application/json':raise ValueError('JSON_REQUIRED')
                length=int(self.headers.get('Content-Length','0'))
                if not 0<length<=29*1024*1024:raise ValueError('REQUEST_SIZE_LIMIT')
                data=json.loads(self.rfile.read(length));request_id=data.get('requestId','')
                if not re.fullmatch('[0-9a-f]{32}',request_id):raise ValueError('REQUEST_ID_INVALID')
                with create_guard:
                    # Duplicate browser submit/resume uses the same local job, not another charge.
                    for existing in pipe.root.glob('*/job.json'):
                        d=json.loads(existing.read_text(encoding='utf8'))
                        if d.get('requestId')==request_id:begin(d['id']);self.send(d,202);return
                    uri=data['image'];header,encoded=uri.split(',',1)
                    if not re.fullmatch(r'data:image/(png|jpeg|webp);base64',header):raise ValueError('IMAGE_FORMAT_UNSUPPORTED')
                    raw=base64.b64decode(encoded,validate=True)
                    if len(raw)>20*1024*1024:raise ValueError('IMAGE_SIZE_LIMIT_20MB')
                    with tempfile.TemporaryDirectory(prefix='aig-upload-') as temporary:
                        file=Path(temporary)/'source';file.write_bytes(raw);d=pipe.create(file,data.get('mode','humanoid'),data.get('actionId'))
                    d['requestId']=request_id;pipe.save(d['id'],d)
                    begin(d['id']);self.send(d,202)
            except Exception as e:self.send({'error':str(e)[:180]},409)
    class LocalServer(ThreadingHTTPServer):
        def server_close(self):stopping.set();super().server_close()
    server=LocalServer(('127.0.0.1',port),Handler);server.pipeline=pipe
    return server


def main():
    p=argparse.ArgumentParser();p.add_argument('--root',required=True);p.add_argument('--port',type=int,default=8765);a=p.parse_args()
    server=make_server(a.root,MeshyClient(os.environ.get('MESHY_API_KEY','')),a.port)
    print(f'AIG FastModel 2.7: http://127.0.0.1:{server.server_port} (Meshy account configured: {server.pipeline.client.configured})',flush=True)
    try:server.serve_forever()
    except KeyboardInterrupt:pass
    finally:server.server_close()


if __name__=='__main__':main()
