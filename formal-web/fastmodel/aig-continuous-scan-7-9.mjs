/** FastModel 7.9 | real local VIDEO/CAMERA continuous frame scanner.
 * Deterministic frame analysis, bounded keyframe memory, interruption-safe
 * metadata checkpoints, and explicit source/pose uncertainty.
 * Accepted keyframes are visual observations, NOT recovered 3D geometry,
 * verified anatomy, learned model weights or automatically measured camera pose.
 * No network/third-party dependencies. Caller owns image pixel buffers.
 */
export const AIG79_SCHEMA='AIG_FASTMODEL_7_9_CONTINUOUS_VIDEO_KEYFRAME_MEMORY';
export const AIG79_MODES=Object.freeze(['video','camera']);
const finite=Number.isFinite,clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
function settings({
 maxKeyframes=24,minIntervalMs=200,noveltyThreshold=.065,
 minContrast=.055,minSharpness=.022,minBrightness=.08,maxBrightness=.93
}={}){
 const vals=[maxKeyframes,minIntervalMs,noveltyThreshold,minContrast,minSharpness,minBrightness,maxBrightness];
 if(!vals.every(finite)||!Number.isInteger(maxKeyframes)||maxKeyframes<4||maxKeyframes>64||
 !Number.isInteger(minIntervalMs)||minIntervalMs<80||minIntervalMs>5000||
 noveltyThreshold<.005||noveltyThreshold>.5||
 minContrast<0||minContrast>.4||minSharpness<0||minSharpness>.5||
 minBrightness<0||minBrightness>.6||maxBrightness<.5||maxBrightness>1||
 minBrightness>=maxBrightness)throw Error('AIG79_SCAN_CONFIG_INVALID');
 return {maxKeyframes,minIntervalMs,noveltyThreshold,minContrast,minSharpness,minBrightness,maxBrightness};
}
export function createAIG79ContinuousScan({mode='video',sourceId=null,config={}}={}){
 if(!AIG79_MODES.includes(mode)||sourceId!==null&&
  (typeof sourceId!=='string'||sourceId.length>128||!/^[A-Za-z0-9:_-]+$/.test(sourceId)))
  throw Error('AIG79_SOURCE_INVALID');
 return {schema:AIG79_SCHEMA,mode,sourceId,config:settings(config),
  state:'ready',framesSeen:0,framesAccepted:0,framesRejected:0,framesReplaced:0,
  sinceMs:0,lastTimeMs:-Infinity,lastDescriptor:null,
  keyframes:[],recordedTimes:[],reasonCounts:{},nextId:1,
  geometryTruth:'SOURCE_VIDEO_2D_OBSERVATIONS_NO_3D_POSE_SOLVED',
  rawSourcePhotoPersisted:false,continuousModelTrainingCompleted:false};
}
function requireSession(s){
 if(s?.schema!==AIG79_SCHEMA||!s.config||!Array.isArray(s.keyframes))
  throw Error('AIG79_SESSION_INVALID');
}
export function setAIG79ScanState(s,state){
 requireSession(s);
 if(!['scanning','paused','stopped'].includes(state))throw Error('AIG79_STATE_INVALID');
 if(s.state==='stopped'&&state!=='stopped')throw Error('AIG79_STOPPED_START_NEW_SESSION');
 s.state=state;return summarizeAIG79Scan(s);
}
function analyze(image){
 const {width:w,height:h,data}=image||{};
 if(!Number.isInteger(w)||!Number.isInteger(h)||w<16||h<16||w*h>1100000||
  !data||data.length!==w*h*4)throw Error('AIG79_RGBA_DIMENSION_INVALID');
 const rows=12,cols=12,lum=new Array(rows*cols);let avg=0,avg2=0;
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
  let k=0,sum=0;
  const y0=Math.floor(y*h/rows),y1=Math.max(y0+1,Math.floor((y+1)*h/rows)),
   x0=Math.floor(x*w/cols),x1=Math.max(x0+1,Math.floor((x+1)*w/cols)),
   sy=Math.max(1,Math.floor((y1-y0)/3)),sx=Math.max(1,Math.floor((x1-x0)/3));
  for(let yy=y0;yy<y1;yy+=sy)for(let xx=x0;xx<x1;xx+=sx){
   const at=(yy*w+xx)*4,alpha=data[at+3]/255;
   const v=(.2126*data[at]+.7152*data[at+1]+.0722*data[at+2])/255;
   // Source is composited over neutral dark background for transparent images.
   sum+=v*alpha+.07*(1-alpha);k++;
  }
  const v=sum/k;lum[y*cols+x]=v;avg+=v;avg2+=v*v;
 }
 avg/=lum.length;const contrast=Math.sqrt(Math.max(0,avg2/lum.length-avg*avg));
 let gradient=0,g=0;
 for(let y=1;y<rows-1;y++)for(let x=1;x<cols-1;x++){
  const at=y*cols+x;
  gradient+=Math.hypot(lum[at+1]-lum[at-1],lum[at+cols]-lum[at-cols])/2;g++;
 }
 return {descriptor:lum.map(v=>Math.round(v*255)/255),
  brightness:avg,contrast,sharpness:gradient/g};
}
function distance(a,b){
 if(!a||!b||a.length!==b.length)return 1;
 let total=0;
 for(let i=0;i<a.length;i++)total+=Math.abs(a[i]-b[i]);
 return total/a.length;
}
function reject(s,reason,quality={}) {
 s.framesRejected++;s.reasonCounts[reason]=(s.reasonCounts[reason]||0)+1;
 return {accepted:false,reason,quality};
}
function poseLabel(pose){
 if(pose===null||pose===undefined||
  (typeof pose==='object'&&pose.reviewed===false&&pose.yaw===null&&pose.pitch===null))
  return {yaw:null,pitch:null,reviewed:false};
 if(typeof pose!=='object'||pose.reviewed!==true||
  ![pose.yaw,pose.pitch].every(finite)||Math.abs(pose.yaw)>3.142||
  Math.abs(pose.pitch)>1.571)throw Error('AIG79_POSE_REVIEW_INVALID');
 return {yaw:pose.yaw,pitch:pose.pitch,reviewed:true};
}
function angularDistance(a,b){
 if(!a.reviewed||!b.reviewed)return 0;
 return Math.hypot(a.yaw-b.yaw,a.pitch-b.pitch);
}
export function scanAIG79Frame(s,{image,timeMs,pose=null}={}){
 requireSession(s);
 if(s.state!=='scanning')return {accepted:false,reason:'NOT_SCANNING'};
 if(!finite(timeMs)||timeMs<0||timeMs>604800000)
  throw Error('AIG79_TIME_INVALID');
 if(timeMs<s.lastTimeMs)throw Error('AIG79_TIME_REGRESSION');
 const observed=analyze(image),manualPose=poseLabel(pose);
 s.framesSeen++;s.sinceMs=timeMs;
 const descriptor=observed.descriptor,delta=distance(descriptor,s.lastDescriptor);
 s.lastDescriptor=descriptor;
 if(timeMs-s.lastTimeMs<s.config.minIntervalMs)return reject(s,'THROTTLED',observed);
 s.lastTimeMs=timeMs;
 if(observed.brightness<s.config.minBrightness)return reject(s,'DARK',observed);
 if(observed.brightness>s.config.maxBrightness)return reject(s,'OVEREXPOSED',observed);
 if(observed.contrast<s.config.minContrast)return reject(s,'LOW_CONTRAST',observed);
 if(observed.sharpness<s.config.minSharpness)return reject(s,'LOW_DETAIL',observed);
 let nearest=1;let poseGain=0;
 for(const item of s.keyframes){
  nearest=Math.min(nearest,distance(item.descriptor,descriptor));
  poseGain=Math.max(poseGain,angularDistance(item.pose,manualPose));
 }
 const hasNewEvidence=!s.keyframes.length||nearest>=s.config.noveltyThreshold||
  manualPose.reviewed&&poseGain>.23&&nearest>=.015;
 if(!hasNewEvidence)return reject(s,'DUPLICATE',observed);
 const quality={brightness:observed.brightness,contrast:observed.contrast,sharpness:observed.sharpness,
  motionSinceLast:delta,novelty:nearest,angleVerified:manualPose.reviewed};
 const frame={id:s.nextId++,atMs:timeMs,descriptor,quality,pose:manualPose,
  source:'LOCAL_DECODED_VIDEO_FRAME',depthMeasured:false,
  cameraPoseAutomaticallyEstimated:false};
 let replaced=null;
 if(s.keyframes.length>=s.config.maxKeyframes){
  // Evict the least informative/more redundant source observation.
  // Keep reviewed-angle frames unless another reviewed keyframe is near them.
  let worst=-1,worstScore=Infinity;
  for(let i=0;i<s.keyframes.length;i++){
   const k=s.keyframes[i];
   let closest=1,angleSeparation=Infinity;
   for(let j=0;j<s.keyframes.length;j++)if(i!==j){
    closest=Math.min(closest,distance(k.descriptor,s.keyframes[j].descriptor));
    if(k.pose.reviewed&&s.keyframes[j].pose.reviewed)
     angleSeparation=Math.min(angleSeparation,angularDistance(k.pose,s.keyframes[j].pose));
   }
   const anchor=k.pose.reviewed&&(angleSeparation>.2)?1:0;
   const score=closest+.4*k.quality.sharpness+anchor+.1*k.quality.contrast;
   if(score<worstScore){worstScore=score;worst=i;}
  }
  // New frame must be more novel than redundant cached one.
  const newScore=nearest+.4*quality.sharpness+
    (manualPose.reviewed&&poseGain>.2?1:0)+.1*quality.contrast;
  if(newScore<=worstScore)return reject(s,'CACHE_CAPACITY_KEEP_BETTER',quality);
  replaced=s.keyframes[worst].id;s.keyframes.splice(worst,1);s.framesReplaced++;
 }
 s.keyframes.push(frame);s.framesAccepted++;
 // s.keyframes contains only tiny descriptor vectors and numeric metadata.
 return {accepted:true,id:frame.id,replacedId:replaced,quality,
  cached:s.keyframes.length,reviewedAngles:s.keyframes.filter(x=>x.pose.reviewed).length};
}
export function summarizeAIG79Scan(s){
 requireSession(s);
 const samples=s.keyframes;
 const poseReviewed=samples.filter(k=>k.pose.reviewed);
 const yawBins=new Set(poseReviewed.map(k=>Math.floor((k.pose.yaw+Math.PI)/(Math.PI/6))));
 const avgSharpness=samples.length?
  samples.reduce((v,k)=>v+k.quality.sharpness,0)/samples.length:0;
 return {schema:AIG79_SCHEMA,state:s.state,mode:s.mode,sourceId:s.sourceId,
  framesSeen:s.framesSeen,framesAccepted:s.framesAccepted,
  framesRejected:s.framesRejected,framesReplaced:s.framesReplaced,
  cacheSize:samples.length,cacheLimit:s.config.maxKeyframes,
  reviewedPoses:poseReviewed.length,reviewedYawBins:yawBins.size,
  averageSharpness:avgSharpness,
  reasons:{...s.reasonCounts},
  cameraPoseSolvedAutomatically:false,full3DHeadRecovered:false,
  modelMemory:'BOUNDED_KEYFRAME_DESCRIPTORS_NOT_TRAINED_3D_MODEL',
  offlineNoUpload:true};
}
export function exportAIG79Memory(s){
 requireSession(s);
 return {schema:AIG79_SCHEMA,revision:1,mode:s.mode,sourceId:s.sourceId,
  config:{...s.config},keyframes:s.keyframes.map(k=>({
   id:k.id,atMs:k.atMs,descriptor:[...k.descriptor],
   quality:{...k.quality},pose:{...k.pose},
   source:k.source,depthMeasured:false,cameraPoseAutomaticallyEstimated:false
  })),
  summary:summarizeAIG79Scan(s),
  originalVideoFramesSaved:false,actual3DModelLearned:false};
}
export function importAIG79Memory(snapshot,{requiredSourceId=null}={}){
 if(!snapshot||snapshot.schema!==AIG79_SCHEMA||snapshot.revision!==1||
  !Array.isArray(snapshot.keyframes)||snapshot.keyframes.length>64||
  typeof snapshot.mode!=='string'||!AIG79_MODES.includes(snapshot.mode)||
  requiredSourceId!==null&&snapshot.sourceId!==requiredSourceId)
  throw Error('AIG79_MEMORY_SCHEMA_OR_SOURCE_MISMATCH');
 const s=createAIG79ContinuousScan({mode:snapshot.mode,sourceId:snapshot.sourceId,config:snapshot.config});
 if(snapshot.keyframes.length>s.config.maxKeyframes)throw Error('AIG79_MEMORY_CAPACITY_INVALID');
 let last=-Infinity;
 for(const k of snapshot.keyframes){
  if(!Number.isInteger(k.id)||k.id<1||!finite(k.atMs)||k.atMs<last||
   !Array.isArray(k.descriptor)||k.descriptor.length!==144||
   !k.descriptor.every(x=>finite(x)&&x>=0&&x<=1)||
   !k.quality||![k.quality.sharpness,k.quality.contrast,k.quality.brightness,k.quality.novelty].every(finite))
   throw Error('AIG79_MEMORY_FRAME_INVALID');
  const pose=poseLabel(k.pose);
  s.keyframes.push({id:k.id,atMs:k.atMs,descriptor:[...k.descriptor],
   pose,quality:{...k.quality},source:'RESTORED_LOCAL_KEYFRAME_METADATA',
   depthMeasured:false,cameraPoseAutomaticallyEstimated:false});
  last=k.atMs;s.nextId=Math.max(s.nextId,k.id+1);
 }
 s.framesAccepted=s.keyframes.length;s.state='paused';
 return s;
}
