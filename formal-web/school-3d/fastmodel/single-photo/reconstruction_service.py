"""FastModel 3.9 — provider-neutral reconstruction contract backed by real Meshy.
This is an adapter over the existing real image-to-3D/rig/animation pipeline,
NOT a new inference engine, nor a mock geometric generator.
"""
import re

SERVICE_ID='meshy-image-to-3d'
SCHEMA='AIG_FASTMODEL_RECONSTRUCTION_SERVICE_3_9'
STAGES=('QUEUED','PRECHECK','RECONSTRUCTING','TEXTURING','RIGGING','EXPORTING',
        'COMPLETE','FAILED','SUBMISSION_UNKNOWN')
ARTIFACTS=('model.glb','rigged.glb','animated.glb')
FUTURE_BACKENDS=('local-onnx-3d','multi-view-reconstruction')

def capabilities(client):
    return {
        'schema':SCHEMA,
        'providers':[{
            'id':SERVICE_ID,'title':'Meshy Image-to-3D + Rigging',
            'configured':bool(client.configured),
            'accepts':['image/jpeg','image/png','image/webp'],
            'outputFormats':['glb'],
            'supportsPBR':True,'supportsRigging':True,
            'supportsBasicWalk':True,'supportsExplicitActionId':True,
            'modelServiceIsReal':True,'liveGenerationVerified':False,
            'providerCreditsRequired':True,'automaticPaidSubmission':False,
            'separateTexturingStatusAvailable':False,
            'nativeFrameRateVerified':False,'visualIdentityVerified':False
        }],
        'futureProviders':[{'id':name,'configured':False,'implemented':False}
                           for name in FUTURE_BACKENDS],
        'defaultServiceId':SERVICE_ID,'autoFallback':False,
        'maxSourceBytes':20*1024*1024,'glbQualityReleaseAllowed':False
    }

def require_service(service_id,client):
    if service_id!=SERVICE_ID:raise ValueError('RECONSTRUCTION_SERVICE_UNSUPPORTED')
    if not client.configured:raise ValueError('MESHY_API_KEY_NOT_CONFIGURED')
    return service_id

def project_job(job):
    if not isinstance(job,dict) or not re.fullmatch(r'[0-9a-f]{32}',str(job.get('id',''))):
        raise ValueError('RECONSTRUCTION_JOB_INVALID')
    stages=job.get('stages',{})
    state=job.get('status')
    if state=='COMPLETE':phase='COMPLETE'
    elif state=='FAILED':phase='FAILED'
    elif state=='SUBMISSION_UNKNOWN':phase='SUBMISSION_UNKNOWN'
    else:
        phase='QUEUED'
        for stage in ('model','rig','animation'):
            obj=stages.get(stage) or {}
            current=obj.get('status','NEW')
            if current=='SKIPPED' or current=='SUCCEEDED':continue
            if current in ('SUBMITTING','SUBMISSION_UNKNOWN'):
                phase='SUBMISSION_UNKNOWN';break
            if current=='DOWNLOADING':
                phase='EXPORTING';break
            if stage=='model':
                phase='PRECHECK' if current=='NEW' else 'RECONSTRUCTING'
            elif stage=='rig':
                phase='RIGGING'
            else:
                phase='EXPORTING'
            break
    evidence=[]
    for name in ARTIFACTS:
        artifact=(job.get('artifacts') or {}).get(name)
        if not isinstance(artifact,dict):continue
        sha=artifact.get('sha256')
        if not isinstance(sha,str) or not re.fullmatch(r'[0-9a-f]{64}',sha):continue
        evidence.append({'name':name,'sha256':sha,'bytes':artifact.get('bytes'),
                         'structuralOnly':True,'downloadPath':
                         '/api/jobs/'+job['id']+'/files/'+name})
    progress={}
    for stage in ('model','rig','animation'):
        row=stages.get(stage) or {}
        progress[stage]={'status':row.get('status','NEW'),
                         'progress':row.get('progress') if isinstance(row.get('progress'),(int,float)) else None,
                         'taskAssigned':bool(row.get('taskId'))}
    return {'schema':SCHEMA,'jobId':job['id'],'serviceId':SERVICE_ID,
            'phase':phase,'mode':job.get('mode'),'stages':progress,
            'sourceSHA256':job.get('sourceSHA256'),
            'providerInputSHA256':job.get('uploadSHA256'),
            'sourcePreserved':bool(job.get('originalImageStillAvailable',False)),
            'automaticStagesEnabled':bool((job.get('automation') or {}).get('enabled',False)),
            'automaticStages':['model','rig','animation'] if (job.get('automation') or {}).get('enabled') else [],
            'repeatUnknownSubmission':False,
            'artifacts':evidence,
            'inferredUnseenSurfaces':True,
            'creditsMayBeConsumed':True,
            'texturingIsPartOfModelTask':True,
            'separateTexturingGate':False,
            'actualGLBProduced':any(a['name']=='model.glb' for a in evidence),
            'verifiedSourceGeometry':False,'faceHairNeckApproved':False,
            'animationActionApproved':False,'video1080pApproved':False,
            'releaseAllowed':False,
            'lastError':str(job.get('message',''))[:160] if state in ('FAILED','SUBMISSION_UNKNOWN') else None}
