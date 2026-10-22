/**
 * FastModel Real3D 2.0 — source-locked reusable world scene contract.
 * Multiple user assets, ONE renderer and coordinate system. Animation camera
 * tracks are editable; no automatic physical scale, map survey accuracy,
 * missing building geometry, movie, or 3D skinned actor is fabricated.
 */
export const AIG20_SCHEMA='AIG_FASTMODEL_REAL3D_2_0_SOURCE_LOCKED_WORLD_SCENE';
export const AIG20_CATEGORIES=Object.freeze(['character','building','environment','scene']);
const kinds=new Set(AIG20_CATEGORIES);
const sha=s=>typeof s==='string'&&/^sha256:[a-f0-9]{64}$/.test(s);
const id=s=>typeof s==='string'&&/^[a-zA-Z0-9_-]{1,70}$/.test(s);
const num=Number.isFinite;
const err=s=>{throw Error('AIG20_'+s)};
const vec=(arr,n,limit)=>Array.isArray(arr)&&arr.length===n&&
 arr.every(v=>num(v)&&Math.abs(v)<=limit);
const unitQuat=q=>vec(q,4,1)&&
 Math.abs(Math.hypot(...q)-1)<.002;
const clone=o=>JSON.parse(JSON.stringify(o));
export function createAIG20WorldScene({
 id:sceneId='scene',title='新場景',coordinateMode='LOCAL_RELATIVE',
 mapRef=null
}={}){
 if(!id(sceneId)||typeof title!=='string'||!title.trim()||
  title.length>140||!['LOCAL_RELATIVE','MEASURED_LOCAL_METRES',
   'WGS84_APPROX_LOCAL_METRES'].includes(coordinateMode))
  err('SCENE_ID_OR_COORDINATE_MODE_INVALID');
 if(mapRef!==null&&(!id(mapRef.assetId)||!sha(mapRef.sha256)||
  !['LOCAL_RELATIVE','MEASURED_LOCAL_METRES','WGS84_APPROX_LOCAL_METRES']
   .includes(mapRef.coordinateMode)||coordinateMode!==mapRef.coordinateMode))
  err('MAP_PROVENANCE_OR_COORDINATE_MODE_MISMATCH');
 return {
  schema:AIG20_SCHEMA,id:sceneId,title:title.trim(),revision:0,
  coordinateMode,workingUnits:coordinateMode==='LOCAL_RELATIVE'?
   'UNSCALED_SCENE_UNITS':'METRES_AS_DOCUMENTED',
  mapRef:mapRef?{assetId:mapRef.assetId,sha256:mapRef.sha256,
   coordinateMode:mapRef.coordinateMode}:null,
  mapOverlayOnly:true,objects:[],cameraKeys:[],
  originalAssetFilesModified:false,estimatedGeometryConvertedToMeasured:false,
  actorSkinningOrAnimationNotInvented:true,environmentAuthorityUnverified:true
 };
}
export function addAIG20WorldObject(scene,{
 nodeId,assetId,sourceSha256,category,
 position=[0,0,0],quaternion=[0,0,0,1],scale=[1,1,1],
 physicalScaleReviewed=false,selectedClip=null
}={}){
 assertAIG20Document(scene);
 if(scene.objects.length>=12||!id(nodeId)||scene.objects.some(o=>o.nodeId===nodeId)||
  !id(assetId)||!sha(sourceSha256)||!kinds.has(category)||
  !vec(position,3,10000)||!unitQuat(quaternion)||!vec(scale,3,30)||
  scale.some(v=>v<=0)||typeof physicalScaleReviewed!=='boolean'||
  selectedClip!==null&&(!Number.isInteger(selectedClip)||selectedClip<0||
   selectedClip>64))
  err('OBJECT_SOURCE_OR_TRANSFORM_INVALID');
 if(scene.coordinateMode!=='LOCAL_RELATIVE'&&!physicalScaleReviewed)
  err('METRIC_OBJECT_SCALE_REQUIRES_REVIEW');
 const next=clone(scene);
 next.objects.push({nodeId,assetId,sourceSha256,category,
  position:[...position],quaternion:[...quaternion],scale:[...scale],
  physicalScaleReviewed,selectedClip});
 next.revision++;
 return next;
}
export function addAIG20CameraKey(scene,{
 keyId,timeSeconds,position,target,fov=45,easing='LINEAR'
}={}){
 assertAIG20Document(scene);
 if(scene.cameraKeys.length>=48||!id(keyId)||
  scene.cameraKeys.some(k=>k.keyId===keyId||k.timeSeconds===timeSeconds)||
  !num(timeSeconds)||timeSeconds<0||timeSeconds>3600||
  !vec(position,3,10000)||!vec(target,3,10000)||
  Math.hypot(...position.map((v,i)=>v-target[i]))<.02||
  !num(fov)||fov<10||fov>100||
  !['LINEAR','SMOOTHSTEP','CUT'].includes(easing))
  err('CAMERA_KEY_INVALID');
 const next=clone(scene);
 next.cameraKeys.push({keyId,timeSeconds,position:[...position],
  target:[...target],fov,easing});
 next.cameraKeys.sort((a,b)=>a.timeSeconds-b.timeSeconds);
 next.revision++;return next;
}
export function sampleAIG20Camera(scene,seconds){
 assertAIG20Document(scene);
 if(!num(seconds)||seconds<0)err('CAMERA_SAMPLE_TIME_INVALID');
 const keys=scene.cameraKeys;if(!keys.length)return null;
 if(seconds<=keys[0].timeSeconds)return clone(keys[0]);
 const last=keys.at(-1);if(seconds>=last.timeSeconds)return clone(last);
 for(let i=1;i<keys.length;i++){
  const a=keys[i-1],b=keys[i];
  if(seconds>b.timeSeconds)continue;
  if(b.easing==='CUT')return clone(seconds<b.timeSeconds?a:b);
  let t=(seconds-a.timeSeconds)/Math.max(1e-9,b.timeSeconds-a.timeSeconds);
  if(b.easing==='SMOOTHSTEP')t=t*t*(3-2*t);
  const lerp=(x,y)=>x+(y-x)*t;
  return {keyId:b.keyId,timeSeconds:seconds,
   position:a.position.map((x,i)=>lerp(x,b.position[i])),
   target:a.target.map((x,i)=>lerp(x,b.target[i])),
   fov:lerp(a.fov,b.fov),easing:b.easing};
 }
 return clone(last);
}
export function assertAIG20Document(scene){
 if(!scene||scene.schema!==AIG20_SCHEMA||!id(scene.id)||
  !Number.isSafeInteger(scene.revision)||scene.revision<0||
  !['LOCAL_RELATIVE','MEASURED_LOCAL_METRES','WGS84_APPROX_LOCAL_METRES']
   .includes(scene.coordinateMode)||
  !Array.isArray(scene.objects)||scene.objects.length>12||
  !Array.isArray(scene.cameraKeys)||scene.cameraKeys.length>48)
  err('WORLD_SCENE_SCHEMA_INVALID');
 if(scene.mapRef&&(!sha(scene.mapRef.sha256)||!id(scene.mapRef.assetId)||
  scene.mapRef.coordinateMode!==scene.coordinateMode))
  err('MAP_REFERENCE_SOURCE_INVALID');
 const seen=new Set();
 for(const o of scene.objects){
  if(!id(o.nodeId)||seen.has(o.nodeId)||!id(o.assetId)||
   !sha(o.sourceSha256)||!kinds.has(o.category)||
   !vec(o.position,3,10000)||!unitQuat(o.quaternion)||
   !vec(o.scale,3,30)||o.scale.some(v=>v<=0)||
   typeof o.physicalScaleReviewed!=='boolean'||
   scene.coordinateMode!=='LOCAL_RELATIVE'&&!o.physicalScaleReviewed)
   err('WORLD_OBJECT_UNVERIFIED_OR_DUPLICATE');
  seen.add(o.nodeId);
 }
 const seenKeys=new Set();
 let last=-1;
 for(const k of scene.cameraKeys){
  if(!id(k.keyId)||seenKeys.has(k.keyId)||!num(k.timeSeconds)||
   k.timeSeconds<0||k.timeSeconds>3600||k.timeSeconds<=last||
   !vec(k.position,3,10000)||!vec(k.target,3,10000)||
   Math.hypot(...k.position.map((x,i)=>x-k.target[i]))<.02||
   !num(k.fov)||k.fov<10||k.fov>100||
   !['LINEAR','SMOOTHSTEP','CUT'].includes(k.easing))
   err('WORLD_CAMERA_TRACK_INVALID');
  last=k.timeSeconds;seenKeys.add(k.keyId);
 }
 return true;
}
export async function resolveAIG20WorldSources(scene,library){
 assertAIG20Document(scene);
 if(!library||typeof library.get!=='function')err('ASSET_VAULT_REQUIRED');
 const records=new Map();
 for(const object of scene.objects){
  const k=object.assetId;
  if(!records.has(k)){
   const meta=await library.get(k);
   if(!meta||meta.sha256!==object.sourceSha256||
    meta.category!==object.category||meta.mime!=='model/gltf-binary')
    err('GLB_ASSET_SHA_CATEGORY_OR_MEDIA_CHANGED');
   if(scene.coordinateMode!=='LOCAL_RELATIVE'&&(
    meta.reviewStatus!=='approved'||
    meta.modelAccuracy!=='CALIBRATED_MEASURED'||
    meta.coordinateUnits!=='METRES'))
    err('METRIC_SCALE_MUST_BE_APPROVED_SOURCE_WITH_METRE_UNITS');
   records.set(k,meta);
  }
 }
 let map=null;
 if(scene.mapRef){
  const meta=await library.get(scene.mapRef.assetId);
  if(!meta||meta.sha256!==scene.mapRef.sha256||
   meta.category!=='map'||meta.mime!=='application/json')
   err('MAP_ASSET_SHA_CATEGORY_OR_MEDIA_CHANGED');
  map=meta;
 }
 return {assets:[...records.values()],map,
  sceneMode:scene.coordinateMode,
  realWorldScaleCertified:scene.coordinateMode==='MEASURED_LOCAL_METRES'&&
   scene.objects.length>0&&
   [...records.values()].every(x=>x.reviewStatus==='approved')};
}
