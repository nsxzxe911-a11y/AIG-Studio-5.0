"""FastModel 3.9 free local image->true mesh inference; NEVER makes paid requests.

Stable Fast 3D official model, preinstalled and licensed by the operator.
This module intentionally never downloads code, weights or calls an API.
The model produces a GLB mesh/texture but NOT a rig or animation.
"""
import hashlib,json,os,re,shutil,subprocess,tempfile,threading,uuid
from pathlib import Path
from PIL import Image,ImageOps
from glb import audit_glb

SERVICE_ID='local-stable-fast-3d'
MAX_SOURCE=20*1024*1024
MAX_GLB=200*1024*1024

def sha(path):
    with Path(path).open('rb') as stream:
        return hashlib.file_digest(stream,'sha256').hexdigest()

def atomic_json(path,doc):
    dest=Path(path);tmp=dest.with_suffix('.writing')
    tmp.write_text(json.dumps(doc,ensure_ascii=False,indent=2),encoding='utf8')
    os.replace(tmp,dest)

class FreeLocalEngine:
    def __init__(self,python=None,script=None,weights=None,device=None):
        self.python=Path(python or os.environ.get('AIG_SF3D_PYTHON','')).expanduser() if (python or os.environ.get('AIG_SF3D_PYTHON')) else None
        self.script=Path(script or os.environ.get('AIG_SF3D_SCRIPT','')).expanduser() if (script or os.environ.get('AIG_SF3D_SCRIPT')) else None
        self.weights=Path(weights or os.environ.get('AIG_SF3D_WEIGHTS','')).expanduser() if (weights or os.environ.get('AIG_SF3D_WEIGHTS')) else None
        self.device=device or os.environ.get('AIG_SF3D_DEVICE','cuda')
    @property
    def configured(self):
        return bool(self.python and self.python.is_file() and self.script and self.script.is_file()
          and self.script.name=='run.py' and self.weights and self.weights.is_dir()
          and (self.weights/'config.yaml').is_file() and (self.weights/'model.safetensors').is_file()
          and self.device in ('cuda','mps','cpu'))
    def capabilities(self):
        return {'id':SERVICE_ID,'title':'本機 Stable Fast 3D（零點數）',
          'configured':self.configured,'providerCreditsRequired':False,'networkRequestsAllowed':False,
          'modelServiceIsReal':True,'input':'single-image','outputFormats':['glb'],
          'riggingAvailable':False,'animationAvailable':False,'requiresInstalledWeights':True,
          'requiresLocalCompute':True,'gpuRecommended':True,
          'realHeroineApproved':False,'commercialLicenseNeedsReview':True}
    def generate(self,input_path,output_path):
        if not self.configured:raise ValueError('FREE_LOCAL_3D_MODEL_NOT_INSTALLED')
        original=Path(input_path);out=Path(output_path)
        if not original.is_file() or original.stat().st_size>MAX_SOURCE:
            raise ValueError('FREE_LOCAL_3D_SOURCE_INVALID')
        env=os.environ.copy()
        # Disable all Hugging Face downloads; never inject API tokens into child.
        env.update({'HF_HUB_OFFLINE':'1','TRANSFORMERS_OFFLINE':'1',
                    'HF_DATASETS_OFFLINE':'1','PIP_NO_INDEX':'1',
                    'DO_NOT_TRACK':'1','HF_HUB_DISABLE_TELEMETRY':'1'})
        for name in tuple(env):
            if any(word in name.upper() for word in ('MESHY','OPENAI_API_KEY','HF_TOKEN','HUGGING_FACE_HUB_TOKEN')):
                env.pop(name,None)
        with tempfile.TemporaryDirectory(prefix='aig-free3d-') as tmp:
            result=subprocess.run([str(self.python.resolve()),str(self.script.resolve()),str(original.resolve()),
                      '--pretrained-model',str(self.weights.resolve()),'--output-dir',tmp,
                      '--device',self.device,'--batch_size','1'],
                  cwd=str(self.script.resolve().parent),env=env,capture_output=True,
                  text=True,timeout=1200,check=False)
            if result.returncode:raise ValueError('FREE_LOCAL_3D_INFERENCE_FAILED')
            generated=Path(tmp)/'0'/'mesh.glb'
            if not generated.is_file() or not 128<generated.stat().st_size<=MAX_GLB:
                raise ValueError('FREE_LOCAL_3D_GLB_MISSING_OR_TOO_BIG')
            audit=audit_glb(generated)
            if audit.get('triangles',0)<4 or audit.get('vertices',0)<4:
                raise ValueError('FREE_LOCAL_3D_REAL_MESH_REQUIRED')
            shutil.copyfile(generated,out)
        return audit

class FreeLocalJobs:
    def __init__(self,root,engine=None):
        self.root=Path(root).resolve()/'free-local-3d'
        self.engine=engine or FreeLocalEngine()
        self._active=set();self._guard=threading.Lock()
    def dir(self,job):
        if not re.fullmatch(r'[0-9a-f]{32}',job):raise ValueError('JOB_ID_INVALID')
        return self.root/job
    def read(self,job):
        return json.loads((self.dir(job)/'job.json').read_text(encoding='utf8'))
    def save(self,job,doc):atomic_json(self.dir(job)/'job.json',doc)
    def lookup_request(self,request_id):
        if not re.fullmatch(r'[0-9a-f]{32}',str(request_id)):raise ValueError('REQUEST_ID_INVALID')
        if not self.root.exists():return None
        for path in self.root.glob('*/job.json'):
            try:
                doc=json.loads(path.read_text(encoding='utf8'))
                if doc.get('requestId')==request_id:return doc
            except (OSError,ValueError):continue
        return None
    def create(self,raw,request_id):
        if not self.engine.configured:raise ValueError('FREE_LOCAL_3D_MODEL_NOT_INSTALLED')
        if not isinstance(raw,bytes) or not 100<=len(raw)<=MAX_SOURCE:raise ValueError('FREE_LOCAL_IMAGE_SIZE_INVALID')
        if not re.fullmatch(r'[0-9a-f]{32}',str(request_id)):raise ValueError('REQUEST_ID_INVALID')
        existing=self.lookup_request(request_id)
        if existing:return existing
        with Image.open(__import__('io').BytesIO(raw)) as image:
            if image.format not in ('PNG','JPEG','WEBP') or image.width*image.height>40_000_000:
                raise ValueError('FREE_LOCAL_IMAGE_FORMAT_INVALID')
            normalized=ImageOps.exif_transpose(image).convert('RGBA')
            normalized.thumbnail((2048,2048))
        job=uuid.uuid4().hex;work=self.dir(job)
        work.mkdir(parents=True)
        (work/'source-original').write_bytes(raw)
        normalized.save(work/'source-input.png')
        doc={'id':job,'requestId':request_id,'status':'RUNNING','serviceId':SERVICE_ID,
             'provider':'LocalSF3D','mode':'object','sourceSHA256':sha(work/'source-original'),
             'uploadSHA256':sha(work/'source-input.png'),'stages':{
               'model':{'status':'NEW'},'rig':{'status':'SKIPPED'},'animation':{'status':'SKIPPED'}},
             'artifacts':{},'inferredUnseenSurfaces':True,'photorealismVerified':False,
             'realHeroineApproved':False,'noCreditsSpent':True,'releaseAllowed':False,
             'modelOnlyNoAnimation':True}
        self.save(job,doc);return doc
    def start(self,job):
        with self._guard:
            if job in self._active:return
            d=self.read(job)
            if d['status']!='RUNNING':return
            # Unknown previous runner state after process crash: don't
            # silently spawn another expensive GPU task from stale journal.
            if d['stages']['model']['status']!='NEW':
                d['status']='FAILED';d['message']='FREE_LOCAL_INTERRUPTED_RETRY_MANUALLY'
                self.save(job,d);return
            d['stages']['model']['status']='IN_PROGRESS';self.save(job,d)
            self._active.add(job)
        def work():
            try:
                d=self.read(job);root=self.dir(job)
                if sha(root/'source-original')!=d['sourceSHA256'] or sha(root/'source-input.png')!=d['uploadSHA256']:
                    raise ValueError('FREE_LOCAL_SOURCE_CHANGED')
                pending=root/'model.glb.pending'
                audit=self.engine.generate(root/'source-input.png',pending)
                if not pending.exists():raise ValueError('FREE_LOCAL_GLB_MISSING')
                pending.rename(root/'model.glb')
                d=self.read(job)
                d['artifacts']['model.glb']={'sha256':sha(root/'model.glb'),
                    'bytes':(root/'model.glb').stat().st_size,'audit':audit}
                d['stages']['model']['status']='SUCCEEDED';d['status']='COMPLETE'
                d['animationKind']='camera-orbit-object-only';self.save(job,d)
            except Exception as error:
                d=self.read(job);d['status']='FAILED'
                d['stages']['model']['status']='FAILED';d['message']=str(error)[:160]
                self.save(job,d)
            finally:
                with self._guard:self._active.discard(job)
        threading.Thread(target=work,daemon=True).start()
    def asset(self,job,name):
        d=self.read(job)
        if name!='model.glb' or name not in d['artifacts']:raise ValueError('FREE_LOCAL_ASSET_NOT_READY')
        file=self.dir(job)/name
        if sha(file)!=d['artifacts'][name]['sha256']:raise ValueError('FREE_LOCAL_OUTPUT_CHANGED')
        return file.read_bytes()
