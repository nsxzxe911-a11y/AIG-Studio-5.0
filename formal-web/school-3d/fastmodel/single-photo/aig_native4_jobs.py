"""AIG FastModel 4.0 offline-only bounded background jobs.
No paid inference provider, credit account, or network operations.
"""
import io
import json
import hashlib
import re
import shutil
import threading
import uuid
from pathlib import Path
from PIL import Image
from aig_native4 import foreground,build,digest,SCHEMA,ANGLES

def safe_json(path,doc):
    next_path=path.with_suffix('.tmp')
    next_path.write_text(json.dumps(doc,ensure_ascii=False,indent=2),encoding='utf-8')
    next_path.replace(path)

class AigNative4Jobs:
    def __init__(self,root):
        self.root=Path(root).resolve()/'native-aig4'
        self.guard=threading.RLock()
        self.running=set()
    def directory(self,job_id):
        if not re.fullmatch(r'[a-f0-9]{32}',str(job_id)):
            raise ValueError('AIG4_JOB_ID_INVALID')
        return self.root/job_id
    def read(self,job_id):
        return json.loads((self.directory(job_id)/'job.json').read_text(encoding='utf-8'))
    def lookup(self,request_id):
        if not re.fullmatch(r'[a-f0-9]{32}',str(request_id)):
            raise ValueError('AIG4_REQUEST_ID_INVALID')
        if not self.root.is_dir():return None
        for path in self.root.glob('*/job.json'):
            try:
                doc=json.loads(path.read_text(encoding='utf-8'))
                if doc.get('requestId')==request_id:return doc
            except (OSError,ValueError):continue
        return None
    def create(self,source_bytes,request_id,side_bytes=None):
        if not isinstance(source_bytes,bytes) or not 100<=len(source_bytes)<=20*1024*1024:
            raise ValueError('AIG4_SOURCE_INVALID')
        if side_bytes is not None and (not isinstance(side_bytes,bytes) or not 100<=len(side_bytes)<=20*1024*1024):
            raise ValueError('AIG4_SIDE_INVALID')
        with self.guard:
            previous=self.lookup(request_id)
            if previous:
                input_sha=hashlib.sha256(source_bytes).hexdigest()
                side_sha=hashlib.sha256(side_bytes).hexdigest() if side_bytes else None
                if previous['sourceSHA256']!=input_sha or previous['sideSourceSHA256']!=side_sha:
                    raise ValueError('AIG4_REQUEST_ID_SOURCE_MISMATCH')
                return previous
            job_id=uuid.uuid4().hex
            job=self.directory(job_id)
            job.mkdir(parents=True)
            try:
                source=job/'front-input'
                source.write_bytes(source_bytes)
                front=foreground(source)
                side=None
                if side_bytes:
                    side=job/'side-input'
                    side.write_bytes(side_bytes)
                    foreground(side)
                report={
                  'schema':SCHEMA,'id':job_id,'requestId':request_id,
                  'phase':'PRECHECK_COMPLETE','status':'RUNNING',
                  'sourceSHA256':front['originalSHA256'],
                  'sideSourceSHA256':digest(side) if side else None,
                  'mode':'SCULPTURAL_VOLUME_NOT_HUMANOID_RIG',
                  'artifacts':{},'noCreditsSpent':True,'networkRequestsMade':0,
                  'real3DMeshProduced':False,'formalHeroineApproved':False,
                  'releaseAllowed':False}
                safe_json(job/'job.json',report)
                return report
            except Exception:
                shutil.rmtree(job,ignore_errors=True)
                raise
    def begin(self,job_id):
        with self.guard:
            d=self.read(job_id)
            if d['status']!='RUNNING' or job_id in self.running:return
            if d['phase']!='PRECHECK_COMPLETE':
                d['status']='FAILED'
                d['phase']='INTERRUPTED_MUST_START_NEW_JOB'
                safe_json(self.directory(job_id)/'job.json',d)
                return
            d['phase']='GEOMETRIC_VOLUME_BUILDING'
            safe_json(self.directory(job_id)/'job.json',d)
            self.running.add(job_id)
        def task():
            job=self.directory(job_id)
            try:
                prior=self.read(job_id)
                a=job/'front-input'
                side=job/'side-input' if prior.get('sideSourceSHA256') else None
                if digest(a)!=prior['sourceSHA256'] or (side and digest(side)!=prior['sideSourceSHA256']):
                    raise ValueError('AIG4_IMAGE_CHANGED')
                result=build(a,job/'generated',side=side)
                model=job/'generated'/'AIG-4.0-VOLUME-TECHNICAL-NOT-APPROVED.glb'
                d=self.read(job_id)
                d['phase']='GEOMETRIC_DRAFT_COMPLETE'
                d['status']='COMPLETE'
                d['real3DMeshProduced']=True
                d['confidenceMean']=result['confidenceMean']
                d['meshType']=result['meshType']
                d['artifacts']={
                    'model.glb':{'file':'AIG-4.0-VOLUME-TECHNICAL-NOT-APPROVED.glb',
                         'sha256':result['meshGLBSHA256'],'bytes':model.stat().st_size,
                         'downloadPath':'/api/aig4/jobs/'+job_id+'/files/model.glb'},
                    'scaffold.json':{'sha256':digest(job/'generated'/'scaffold.json')}}
                safe_json(job/'job.json',d)
            except Exception as error:
                d=self.read(job_id);d['status']='FAILED'
                d['phase']='GEOMETRIC_BUILD_FAILED'
                d['lastError']=str(error)[:160]
                safe_json(job/'job.json',d)
            finally:
                with self.guard:self.running.discard(job_id)
        threading.Thread(target=task,daemon=True).start()
    def asset(self,job_id,name):
        d=self.read(job_id)
        if d['status']!='COMPLETE':raise ValueError('AIG4_JOB_NOT_COMPLETE')
        root=self.directory(job_id)/'generated'
        if name=='model.glb':
            path=root/'AIG-4.0-VOLUME-TECHNICAL-NOT-APPROVED.glb'
            check=d['artifacts']['model.glb']['sha256']
            mime='model/gltf-binary'
        elif name=='scaffold.json':
            path=root/name
            check=d['artifacts']['scaffold.json']['sha256']
            mime='application/json'
        elif name=='confidence.png':
            path=root/'confidence-2D-HEURISTIC.png';check=None;mime='image/png'
        elif re.fullmatch(r'view-(000|045|090|135|180|225|270|315)\.png',name):
            path=root/'unknown-views'/(name[5:8]+'-INFERRED.png')
            check=None;mime='image/png'
        else:raise ValueError('AIG4_ASSET_NAME_INVALID')
        data=path.read_bytes()
        if check and hashlib.sha256(data).hexdigest()!=check:
            raise ValueError('AIG4_OUTPUT_SHA_CHANGED')
        return data,mime
