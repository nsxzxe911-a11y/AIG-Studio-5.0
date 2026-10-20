"""FastModel 2.7 resumable single-photo neural-3D pipeline; no dummy fallback."""
import argparse, base64, hashlib, json, os, re, shutil, sys, time, uuid
from contextlib import contextmanager
from pathlib import Path
from PIL import Image, ImageOps
from provider import MeshyClient, RequestRejected
from glb import audit_glb
from prepared_input import verify_prepared_foreground
from reconstruction_service import SERVICE_ID,MULTIVIEW_ID,VALID_SERVICES


def digest(path):
    with Path(path).open('rb') as stream:return hashlib.file_digest(stream,'sha256').hexdigest()


def atomic_json(path,data):
    temporary=path.with_suffix('.tmp')
    with temporary.open('w',encoding='utf8') as stream:
        json.dump(data,stream,ensure_ascii=False,indent=2);stream.flush();os.fsync(stream.fileno())
    if path.exists():shutil.copyfile(path,path.with_suffix('.previous.json'))
    temporary.replace(path)


@contextmanager
def lock(path):
    with path.open('a+b') as file:
        file.seek(0);file.write(b'1');file.flush();file.seek(0)
        if os.name=='nt':
            import msvcrt
            msvcrt.locking(file.fileno(),msvcrt.LK_LOCK,1)
        else:
            import fcntl
            fcntl.flock(file,fcntl.LOCK_EX)
        try:yield
        finally:
            file.seek(0)
            if os.name=='nt':msvcrt.locking(file.fileno(),msvcrt.LK_UNLCK,1)
            else:fcntl.flock(file,fcntl.LOCK_UN)


class PhotoPipeline:
    def __init__(self,root,client):self.root=Path(root).resolve();self.client=client
    def directory(self,job):
        if not re.fullmatch('[0-9a-f]{32}',job):raise ValueError('JOB_ID_INVALID')
        return self.root/job
    def read(self,job):return json.loads((self.directory(job)/'job.json').read_text(encoding='utf8'))
    def save(self,job,data):atomic_json(self.directory(job)/'job.json',data)
    def create(self,source,mode='humanoid',action_id=None,prepared_source=None,additional_sources=None,reconstruction_service=SERVICE_ID):
        if not self.client.configured:raise ValueError('MESHY_API_KEY_NOT_CONFIGURED')
        if mode not in ('humanoid','object'):raise ValueError('SUBJECT_MODE_INVALID')
        if reconstruction_service not in VALID_SERVICES:raise ValueError('RECONSTRUCTION_SERVICE_UNSUPPORTED')
        extra=list(additional_sources or [])
        if len(extra)>3:raise ValueError('MULTIVIEW_MAX_FOUR_IMAGES')
        if extra and reconstruction_service!=MULTIVIEW_ID:raise ValueError('MULTIVIEW_PROVIDER_REQUIRED')
        if prepared_source is not None and extra:raise ValueError('PREPARED_FOREGROUND_AND_MULTIVIEW_CONFLICT')
        if extra and mode!='humanoid':raise ValueError('MULTIVIEW_HUMANOID_ONLY')
        if action_id is not None and (type(action_id) is not int or action_id<0 or mode!='humanoid'):raise ValueError('ACTION_ID_INVALID')
        source=Path(source)
        if not 0<source.stat().st_size<=20*1024*1024:raise ValueError('IMAGE_SIZE_LIMIT_20MB')
        original=digest(source)
        foreground_evidence=None
        if prepared_source is not None:
            # Only user-provided alpha masks tied to the exact original bytes;
            # the visible color samples must originate in the source JPEG.
            foreground_evidence=verify_prepared_foreground(source,prepared_source)
        with Image.open(source) as image:
            if image.format not in ('PNG','JPEG','WEBP'):raise ValueError('IMAGE_FORMAT_UNSUPPORTED')
            if image.width*image.height>40_000_000:raise ValueError('IMAGE_PIXEL_BUDGET')
            extension={'PNG':'.png','JPEG':'.jpg','WEBP':'.webp'}[image.format]
            normalized=ImageOps.exif_transpose(image).convert('RGBA');normalized.thumbnail((2048,2048))
        # Validate every extra source before creating a job or performing a
        # billable Meshy call. Extra views are only DRAFT independent images.
        prepared_extras=[]
        for index,p in enumerate(extra,1):
            path=Path(p)
            if not 100<=path.stat().st_size<=7*1024*1024:raise ValueError('MULTIVIEW_IMAGE_BYTES_INVALID')
            with Image.open(path) as image:
                if image.format not in ('PNG','JPEG','WEBP') or image.width*image.height>20_000_000:
                    raise ValueError('MULTIVIEW_IMAGE_FORMAT_OR_PIXEL_BUDGET')
                im=ImageOps.exif_transpose(image).convert('RGBA')
                im.thumbnail((2048,2048))
                fmt=image.format
            prepared_extras.append((path,index,fmt,im,digest(path)))
        self.root.mkdir(parents=True,exist_ok=True);job=uuid.uuid4().hex;work=self.directory(job);work.mkdir()
        shutil.copyfile(source,work/('source-original'+extension))
        if foreground_evidence:
            with Image.open(prepared_source) as image:
                # Preserve full-resolution RGBA alpha. Conversion / rescaling
                # of the original still remains separate and untouched.
                image.save(work/'source-upload.png',format='PNG')
        else:
            normalized.save(work/'source-upload.png')
        extra_evidence=[]
        for path,index,fmt,img,source_hash in prepared_extras:
            ext={'PNG':'.png','JPEG':'.jpg','WEBP':'.webp'}[fmt]
            original_name='additional-original-'+str(index)+ext
            upload_name='additional-upload-'+str(index)+'.png'
            shutil.copyfile(path,work/original_name)
            img.save(work/upload_name,format='PNG')
            if digest(path)!=source_hash or digest(work/original_name)!=source_hash:
                raise ValueError('MULTIVIEW_SOURCE_CHANGED')
            extra_evidence.append({'position':index,'originalFile':original_name,
                                   'originalSHA256':source_hash,'uploadFile':upload_name,
                                   'uploadSHA256':digest(work/upload_name),
                                   'unverifiedSameCharacter':True})
        if digest(source)!=original or digest(work/('source-original'+extension))!=original:raise ValueError('SOURCE_CHANGED')
        report={'schema':'AIG_SINGLE_PHOTO_3D_2_7','id':job,'status':'RUNNING','provider':'Meshy','mode':mode,'actionId':action_id,'sourceSHA256':original,'uploadSHA256':digest(work/'source-upload.png'),'originalFile':'source-original'+extension,'uploadFile':'source-upload.png','imageSize':list(normalized.size),
                'reconstructionService':reconstruction_service,
                'modelEndpoint':'/multi-image-to-3d' if reconstruction_service==MULTIVIEW_ID else '/image-to-3d',
                'additionalImageEvidence':extra_evidence,'stages':{k:{'status':'NEW'} for k in ('model','rig','animation')},'artifacts':{},'inferredUnseenSurfaces':True,'photorealismVerified':False,'releaseAllowed':False,
            'preparedForegroundEvidence':foreground_evidence,'originalImageStillAvailable':True,
            'foregroundAndHairEdgesApproved':False,'actualHeroineAnimationReviewed':False}
        self.save(job,report);return report
    def attach(self,job,stage,task_id):
        if stage not in ('model','rig','animation') or not re.fullmatch('[a-zA-Z0-9_-]{1,128}',task_id):raise ValueError('ATTACH_INVALID')
        with lock(self.directory(job)/'.lock'):
            d=self.read(job)
            if d['stages'][stage]['status'] not in ('SUBMITTING','SUBMISSION_UNKNOWN'):raise ValueError('ATTACH_REQUIRES_UNKNOWN_SUBMISSION')
            d['stages'][stage]={'status':'PENDING','taskId':task_id};d['status']='RUNNING';self.save(job,d)
        return d
    def step(self,job):
        with lock(self.directory(job)/'.lock'):
            d=self.read(job)
            if d['status'] in ('COMPLETE','FAILED','SUBMISSION_UNKNOWN'):return d
            work=self.directory(job)
            if digest(work/d['uploadFile'])!=d['uploadSHA256'] or digest(work/d['originalFile'])!=d['sourceSHA256']:
                raise ValueError('SOURCE_CHANGED')
            for entry in d.get('additionalImageEvidence',[]):
                if digest(work/entry['uploadFile'])!=entry['uploadSHA256'] or digest(work/entry['originalFile'])!=entry['originalSHA256']:
                    raise ValueError('MULTIVIEW_SOURCE_CHANGED')
            for stage in ('model','rig','animation'):
                s=d['stages'][stage]
                if s['status']=='SUCCEEDED':continue
                if stage=='rig' and d['mode']=='object':
                    d['stages']['rig']={'status':'SKIPPED'};d['stages']['animation']={'status':'SKIPPED'}
                    d['status']='COMPLETE';d['animationKind']='camera-orbit-object-only';self.save(job,d);return d
                if stage=='animation' and s['status']=='BASIC_WALK_PENDING':
                    refreshed=self.client.request('/rigging/'+d['stages']['rig']['taskId'])
                    if refreshed.get('status')!='SUCCEEDED':raise ValueError('RIG_ASSET_NOT_AVAILABLE')
                    walk=refreshed.get('result',{}).get('basic_animations',{}).get('walking_glb_url')
                    if not walk:raise ValueError('RIG_DID_NOT_RETURN_BASIC_WALK')
                    self._download(job,d,walk,'animated.glb',True)
                    s.update(status='SUCCEEDED',source='rig-basic-walk');s.pop('assetUrl',None)
                    d['status']='COMPLETE';d['animationKind']='skeletal-basic-walk';self.save(job,d);return d
                endpoint={'model':d.get('modelEndpoint','/image-to-3d'),'rig':'/rigging','animation':'/animations'}[stage]
                if s['status'] in ('SUBMITTING','SUBMISSION_UNKNOWN'):
                    s['status']=d['status']='SUBMISSION_UNKNOWN';self.save(job,d);return d
                if s['status']=='NEW':
                    if stage=='model':
                        uri='data:image/png;base64,'+base64.b64encode((work/d['uploadFile']).read_bytes()).decode()
                        payload={'model_type':'standard','ai_model':'meshy-7.1',
                                 'should_texture':True,'enable_pbr':True,'should_remesh':True,
                                 'target_polycount':30000,
                                 'pose_mode':'a-pose' if d['mode']=='humanoid' else '',
                                 'image_enhancement':False,'target_formats':['glb']}
                        if d.get('reconstructionService')==MULTIVIEW_ID:
                            urls=[uri]+['data:image/png;base64,'+
                                base64.b64encode((work/entry['uploadFile']).read_bytes()).decode()
                                for entry in d.get('additionalImageEvidence',[])]
                            if not 1<=len(urls)<=4:raise ValueError('MULTIVIEW_MAX_FOUR_IMAGES')
                            payload['image_urls']=urls
                        else:payload['image_url']=uri
                    elif stage=='rig':payload={'input_task_id':d['stages']['model']['taskId']}
                    else:payload={'rig_task_id':d['stages']['rig']['taskId'],'action_id':d['actionId']}
                    s['status']='SUBMITTING';self.save(job,d)
                    try:
                        answer=self.client.request(endpoint,payload);task=answer['result']
                        if not isinstance(task,str) or not re.fullmatch('[a-zA-Z0-9_-]{1,128}',task):raise ValueError('TASK_ID_INVALID')
                    except RequestRejected as error:
                        # A returned 5xx may follow accepted work: retain UNKNOWN.
                        unknown=bool(re.search(r'_(5\d\d|408)$',str(error)))
                        s['status']=d['status']='SUBMISSION_UNKNOWN' if unknown else 'FAILED';d['message']=str(error);self.save(job,d);return d
                    except Exception:
                        s['status']=d['status']='SUBMISSION_UNKNOWN';d['message']='POST_ACCEPTANCE_UNKNOWN_DO_NOT_RESUBMIT';self.save(job,d);return d
                    s.update(status='PENDING',taskId=task);self.save(job,d);return d
                result=self.client.request(endpoint+'/'+s['taskId'])
                status=result.get('status');s['progress']=result.get('progress',0)
                if status in ('FAILED','CANCELED'):
                    s['status']=status;d['status']='FAILED';d['message']=stage.upper()+'_REMOTE_'+status;self.save(job,d);return d
                if status!='SUCCEEDED':
                    if status not in ('PENDING','IN_PROGRESS'):raise ValueError('TASK_STATUS_UNKNOWN')
                    s['status']=status;self.save(job,d);return d
                if stage=='model':url=result['model_urls']['glb'];filename='model.glb'
                elif stage=='rig':url=result['result']['rigged_character_glb_url'];filename='rigged.glb'
                else:url=result['result']['animation_glb_url'];filename='animated.glb'
                # Persist the actual export/download phase; a restart can GET
                # the already-assigned task instead of creating a new charge.
                s['status']='DOWNLOADING';self.save(job,d)
                self._download(job,d,url,filename,stage=='animation')
                s['status']='SUCCEEDED';s['consumedCredits']=result.get('consumed_credits')
                if stage=='rig' and d['actionId'] is None:
                    walk=result.get('result',{}).get('basic_animations',{}).get('walking_glb_url')
                    if not walk:raise ValueError('RIG_DID_NOT_RETURN_BASIC_WALK')
                    d['stages']['animation']={'status':'BASIC_WALK_PENDING'}
                elif stage=='animation':d['status']='COMPLETE';d['animationKind']='skeletal-selected-action';self.save(job,d)
                self.save(job,d)
                return d
            return d
    def _download(self,job,data,url,filename,animated):
        work=self.directory(job);tmp=work/(filename+'.download')
        try:
            self.client.download(url,tmp);audit=audit_glb(tmp,require_animation=animated)
            tmp.replace(work/filename)
            data['artifacts'][filename]={'sha256':digest(work/filename),'bytes':(work/filename).stat().st_size,'audit':audit}
            self.save(job,data)
        finally:
            if tmp.exists():tmp.unlink()


def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--root',required=True);p.add_argument('--source');p.add_argument('--job');p.add_argument('--mode',default='humanoid',choices=['humanoid','object']);p.add_argument('--action-id',type=int);p.add_argument('--attach-stage',choices=['model','rig','animation']);p.add_argument('--task-id');p.add_argument('--once',action='store_true');a=p.parse_args()
    pipe=PhotoPipeline(a.root,MeshyClient(os.environ.get('MESHY_API_KEY','')))
    if a.attach_stage:
        if not a.job or not a.task_id:p.error('attach requires --job and --task-id')
        d=pipe.attach(a.job,a.attach_stage,a.task_id)
    elif a.source:d=pipe.create(a.source,a.mode,a.action_id)
    elif a.job:d=pipe.read(a.job)
    else:p.error('--source or --job required')
    print(json.dumps({'id':d['id'],'status':d['status']},ensure_ascii=False),flush=True)
    while d['status'] not in ('COMPLETE','FAILED','SUBMISSION_UNKNOWN'):
        d=pipe.step(d['id']);print(json.dumps({'id':d['id'],'status':d['status'],'stages':d['stages']},ensure_ascii=False),flush=True)
        if a.once:break
        if d['status']=='RUNNING':time.sleep(3)
    return 0 if d['status']=='COMPLETE' or a.once else 1


if __name__=='__main__':
    try:sys.exit(main())
    except (ValueError,OSError,KeyError,RequestRejected) as e:
        print(json.dumps({'status':'BLOCKED','message':str(e),'releaseAllowed':False}),file=sys.stderr);sys.exit(1)
