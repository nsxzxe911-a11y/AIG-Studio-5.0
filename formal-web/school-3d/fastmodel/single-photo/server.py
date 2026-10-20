"""Loopback-only single-photo UI. API key never leaves this process."""
import argparse, base64, json, os, re, tempfile, threading, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse
from pipeline import PhotoPipeline
from provider import MeshyClient
from dialogue_ai import DialogueAI
from tts_voice import SpeechAI
from reconstruction_service import SERVICE_ID,MULTIVIEW_ID,capabilities,require_service,project_job

HERE=Path(__file__).resolve().parent


def offline_document(pipe,job):
    report=pipe.read(job);name='animated.glb' if 'animated.glb' in report['artifacts'] else 'model.glb'
    if name not in report['artifacts']:raise ValueError('MODEL_NOT_READY')
    html=(HERE/'index.html').read_text(encoding='utf8')
    js=(HERE/'dist/app.js').read_text(encoding='utf8').replace('</script','<\\/script')
    payload={'glb':base64.b64encode((pipe.directory(job)/name).read_bytes()).decode(),'orbit':report['mode']=='object'}
    return html.replace('<script src="/app.js"></script>','<script>window.AIG_OFFLINE='+json.dumps(payload)+';\n'+js+'</script>')


def make_server(root,client,port=8765,dialogue_client=None,speech_client=None,allow_paid_3d=False):
    dialogue_client=dialogue_client or DialogueAI(os.environ.get('OPENAI_API_KEY',''))
    speech_client=speech_client or SpeechAI(os.environ.get('OPENAI_API_KEY',''))
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
                if path=='/api/config':self.send({'configured':bool(allow_paid_3d and client.configured),'provider':'AIG_INTERNAL_NO_PAID_FALLBACK','zeroCreditsMode':not allow_paid_3d,'liveGenerationVerified':False,'dialogueAIConfigured':dialogue_client.configured,'speechAIConfigured':speech_client.configured});return
                if path=='/api/reconstruction/services':
                    report=capabilities(client)
                    report['providerPolicy']='AIG_NATIVE_ONLY_ZERO_CREDITS'
                    report['defaultServiceId']=None
                    report['autoFallback']=False
                    for item in report['providers']:
                        item['configured']=bool(allow_paid_3d and item['configured'])
                    self.send(report);return
                reconstruction_match=re.fullmatch(r'/api/reconstruction/jobs/([0-9a-f]{32})',path)
                if reconstruction_match:
                    job=reconstruction_match[1];report=pipe.read(job)
                    if report['status']=='RUNNING':begin(job)
                    self.send(project_job(report));return
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
            if self.path not in ('/api/jobs','/api/reconstruction/jobs','/api/story/dialogue','/api/story/voice'):
                self.send({'error':'NOT_FOUND'},404);return
            if self.path=='/api/story/voice':
                try:
                    if self.headers.get('Content-Type')!='application/json':
                        raise ValueError('TTS_JSON_REQUIRED')
                    length=int(self.headers.get('Content-Length','0'))
                    if not 0<length<=4*1024:raise ValueError('TTS_REQUEST_LIMIT')
                    payload=json.loads(self.rfile.read(length))
                    # Explicit user click only; may incur per-line billing, never retry.
                    wav=speech_client.generate(payload)
                    self.send(wav,kind='audio/wav');return
                except Exception as error:
                    self.send({'error':str(error)[:160]},409);return
            if self.path=='/api/story/dialogue':
                try:
                    if self.headers.get('Content-Type')!='application/json':
                        raise ValueError('AI_DIALOGUE_JSON_REQUIRED')
                    length=int(self.headers.get('Content-Length','0'))
                    if not 0<length<=16*1024:raise ValueError('AI_DIALOGUE_REQUEST_LIMIT')
                    payload=json.loads(self.rfile.read(length))
                    # This is a user-clicked, opt-in billable request; no retries.
                    self.send(dialogue_client.generate(payload));return
                except Exception as error:
                    self.send({'error':str(error)[:160]},409);return
            try:
                # Explicit owner policy: no credit-bearing reconstruction requests
                # in the default self-developed AIG runtime. Never call Meshy.
                if not allow_paid_3d and client.configured:
                    raise ValueError('ZERO_CREDITS_REMOTE_3D_BLOCKED')
                if not client.configured:raise ValueError('MESHY_API_KEY_NOT_CONFIGURED')
                if self.headers.get('Content-Type')!='application/json':raise ValueError('JSON_REQUIRED')
                length=int(self.headers.get('Content-Length','0'))
                if not 0<length<=58*1024*1024:raise ValueError('REQUEST_SIZE_LIMIT')
                data=json.loads(self.rfile.read(length))
                if self.path=='/api/reconstruction/jobs':
                    require_service(data.get('serviceId'),client)
                    # Explicit contract: a single click authorizes the model,
                    # subsequent rig and animation provider stages. No new
                    # POST after acceptance-unknown or an interrupted request.
                    if data.get('autoStages') is not True:
                        raise ValueError('RECONSTRUCTION_AUTOMATION_CONFIRMATION_REQUIRED')
                elif 'serviceId' in data:require_service(data['serviceId'],client)
                request_id=data.get('requestId','')
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
                        file=Path(temporary)/'source';file.write_bytes(raw)
                        prepared=None
                        if 'preparedImage' in data:
                            if data.get('mode','humanoid')!='humanoid':
                                raise ValueError('PREPARED_REQUIRES_HUMANOID')
                            uri=data['preparedImage']
                            if not isinstance(uri,str) or not uri.startswith('data:image/png;base64,'):
                                raise ValueError('PREPARED_PNG_DATA_URI_REQUIRED')
                            encoded=uri[len('data:image/png;base64,'):]
                            if len(encoded)>28*1024*1024:raise ValueError('PREPARED_IMAGE_TOO_LARGE')
                            prep_bytes=base64.b64decode(encoded,validate=True)
                            if len(prep_bytes)>20*1024*1024:raise ValueError('PREPARED_IMAGE_SIZE_INVALID')
                            prepared=Path(temporary)/'prepared.png';prepared.write_bytes(prep_bytes)
                        extra=data.get('additionalImages',[])
                        if not isinstance(extra,list) or len(extra)>3:
                            raise ValueError('MULTIVIEW_MAX_FOUR_IMAGES')
                        if extra and data.get('serviceId')!=MULTIVIEW_ID:
                            raise ValueError('MULTIVIEW_PROVIDER_REQUIRED')
                        if extra and prepared is not None:
                            raise ValueError('PREPARED_FOREGROUND_AND_MULTIVIEW_CONFLICT')
                        source_files=[]
                        for i,uri in enumerate(extra,1):
                            if not isinstance(uri,str) or len(uri)>10*1024*1024:
                                raise ValueError('MULTIVIEW_IMAGE_BYTES_INVALID')
                            match=re.fullmatch(r'data:image/(png|jpeg|webp);base64,([a-zA-Z0-9+/=]+)',uri)
                            if not match:raise ValueError('MULTIVIEW_IMAGE_FORMAT_UNSUPPORTED')
                            image_bytes=base64.b64decode(match.group(2),validate=True)
                            if not 100<=len(image_bytes)<=7*1024*1024:raise ValueError('MULTIVIEW_IMAGE_BYTES_INVALID')
                            path=Path(temporary)/('extra-'+str(i));path.write_bytes(image_bytes)
                            source_files.append(path)
                        d=pipe.create(file,data.get('mode','humanoid'),data.get('actionId'),
                                      prepared_source=prepared,additional_sources=source_files,
                                      reconstruction_service=data.get('serviceId',SERVICE_ID))
                    d['requestId']=request_id
                    if self.path=='/api/reconstruction/jobs':
                        d['automation']={'enabled':True,'stages':['model','rig','animation'],
                                         'initiatedBy':'EXPLICIT_USER_GENERATE_CLICK',
                                         'repeatUnknownSubmission':False}
                    pipe.save(d['id'],d)
                    begin(d['id']);self.send(d,202)
            except Exception as e:self.send({'error':str(e)[:180]},409)
    class LocalServer(ThreadingHTTPServer):
        def server_close(self):stopping.set();super().server_close()
    server=LocalServer(('127.0.0.1',port),Handler);server.pipeline=pipe
    return server


def main():
    p=argparse.ArgumentParser();p.add_argument('--root',required=True);p.add_argument('--port',type=int,default=8765);a=p.parse_args()
    server=make_server(a.root,MeshyClient(os.environ.get('MESHY_API_KEY','')),a.port)
    print(f'AIG FastModel 3.9: http://127.0.0.1:{server.server_port} (Meshy account configured: {server.pipeline.client.configured}; optional opt-in dialogue LLM)',flush=True)
    try:server.serve_forever()
    except KeyboardInterrupt:pass
    finally:server.server_close()


if __name__=='__main__':main()
