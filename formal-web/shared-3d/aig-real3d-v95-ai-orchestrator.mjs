/**
 * V95 shared AI-assisted local pipeline: image evidence -> weak landmarker ->
 * inferred indexed XYZ -> source-safe rig -> budgeted GPU animation.
 * No remote AI service, unsourced identity synthesis, invented 1:1, or
 * fictitious 2-hour encoded movie. Model-adapter hook remains SOURCE gated.
 */
import {analyzeAIGReal3DPortraitPixels}
 from './aig-real3d-v95-photo-vision.mjs';
import {buildAIGReal3DProvisionalBody}
 from './aig-real3d-v95-provisional-rig.mjs';
export const AIG_REAL3D_V95_PIPELINE_SCHEMA='AIG_REAL3D_V95_LOCAL_AUTO_3D_MOVIE_PIPELINE_V1';
const fail=x=>{throw Error('REAL3D_V95_AUTO_'+x);};
const validSha=x=>typeof x==='string'&&/^[a-f0-9]{64}$/i.test(x);
export function createAIGReal3DResourceScheduler({
 maxCacheBytes=16_000_000,maxActiveTriangles=250_000,
 deviceFrameBudgetMs=16.667
}={}){
 if(!Number.isInteger(maxCacheBytes)||maxCacheBytes<512_000||maxCacheBytes>256_000_000||
  !Number.isInteger(maxActiveTriangles)||maxActiveTriangles<2000||maxActiveTriangles>700000||
  !Number.isFinite(deviceFrameBudgetMs)||deviceFrameBudgetMs<8||deviceFrameBudgetMs>100)
  fail('GPU_RESOURCE_SETTINGS_INVALID');
 const cache=new Map();let bytes=0,hits=0,misses=0,evictions=0,lastCost=null;
 function put(key,value,sizeBytes){
  if(typeof key!=='string'||key.length>180||
   !Number.isInteger(sizeBytes)||sizeBytes<0||sizeBytes>maxCacheBytes)
   fail('RESOURCE_KEY_OR_SIZE_INVALID');
  if(cache.has(key)){bytes-=cache.get(key).size;cache.delete(key);}
  while(cache.size&&bytes+sizeBytes>maxCacheBytes){
   const first=cache.keys().next().value;
   bytes-=cache.get(first).size;cache.delete(first);evictions++;
  }
  cache.set(key,{value,size:sizeBytes});bytes+=sizeBytes;
  return value;
 }
 function get(key){
  const data=cache.get(key);
  if(!data){misses++;return null;}
  cache.delete(key);cache.set(key,data);hits++;
  return data.value;
 }
 function decide({triangles,frameRenderMilliseconds,occludedChunks=0,
  dynamicJointCount=0,targetFPS=60}={}){
  if(!Number.isInteger(triangles)||triangles<0||
   !Number.isInteger(occludedChunks)||occludedChunks<0||
   !Number.isInteger(dynamicJointCount)||dynamicJointCount<0||
   !Number.isFinite(frameRenderMilliseconds)||frameRenderMilliseconds<0||
   ![24,30,60,90,120].includes(targetFPS))
   fail('MALFORMED_GPU_FRAME_SAMPLE');
  lastCost=frameRenderMilliseconds;
  const budget=1000/targetFPS;
  const overloaded=frameRenderMilliseconds>budget*1.12;
  const hasHeadroom=frameRenderMilliseconds<budget*.72;
  return {mode:overloaded?'REDUCE_FUTURE_DETAIL':hasHeadroom?'ALLOW_SOURCE_DETAIL':'HOLD',
   measuredCPUToGPUFrameCostMs:frameRenderMilliseconds,
   targetFPS,actualMeasuredFPS:frameRenderMilliseconds>0?
    Math.round(10000/frameRenderMilliseconds)/10:null,
   requestedMaxTriangles:maxActiveTriangles,
   sourceTrianglesOverBudget:triangles>maxActiveTriangles,
   sourceOccludedChunks:occludedChunks,
   originalSourceJointsStillAnimated:dynamicJointCount,
   actualFPSVerifiedAcrossHardware:false,
   neverDropsHiddenBonePhysics:true,
   doesNotModifyOriginalMesh:true};
 }
 return {put,get,decide,
  snapshot:()=>({cacheBytes:bytes,cacheEntries:cache.size,cacheHits:hits,
   cacheMisses:misses,evictedItems:evictions,lastDrawMs:lastCost,
   GPUActualAccelerationMeasured:false,noGPUFrameBufferUploadsSkippedCertified:true})};
}
export function planAIGReal3DFilmSegments({
 durationSeconds=7928,segmentSeconds=16,fps=24,
 sceneContinuityId='STAR_JOURNEY_ORIGINAL_HEROINE',
 source3DVerified=false,sourceVoiceVerified=false
}={}){
 if(!Number.isInteger(durationSeconds)||durationSeconds<1||
  durationSeconds>14400||!Number.isInteger(segmentSeconds)||
  segmentSeconds<2||segmentSeconds>120||
  ![24,30,60].includes(fps)||typeof sceneContinuityId!=='string'||
  !/^[A-Za-z][A-Za-z0-9_-]{2,90}$/.test(sceneContinuityId))
  fail('MOVIE_SEGMENT_SOURCE_INVALID');
 const segments=[];
 for(let s=0;s<durationSeconds;s+=segmentSeconds){
  const seconds=Math.min(segmentSeconds,durationSeconds-s);
  segments.push({id:'shot'+String(segments.length).padStart(5,'0'),
   startFrame:s*fps,endFrameExclusive:(s+seconds)*fps,
   seconds,sourceContinuityId:sceneContinuityId,
   originalBodyGeometryPreserved:true,
   segmentActuallyEncoded:false,segmentGPUFramesDecodedAndVerified:false});
 }
 return {schema:'AIG_REAL3D_V95_MOVIE_PLANNING_ONLY_V1',
  durationSeconds,totalFrames:durationSeconds*fps,
  durationTimecode:[Math.floor(durationSeconds/3600),
   Math.floor(durationSeconds%3600/60),durationSeconds%60].join(':'),
  segmentCount:segments.length,frameRateRequested:fps,segments,
  originalActorGeometryVerified:source3DVerified,
  voiceSourcesVerified:sourceVoiceVerified,
  producedFrames:0,actuallyEncodedMovie:false,
  true1080pFilmPASS:false,fullMovieReleasePASS:false};
}
export function runAIGReal3DLocalPortraitToRig({
 rgba,width,height,imageSha256,approvedIdentitySha256,
 approvedIdentitySourcePresent=false,faceLandmarks=null,
 wrapMode='FULL_WRAP',scheduler=null
}={}){
 if(!validSha(imageSha256)||!validSha(approvedIdentitySha256))
  fail('CHARACTER_IDENTITY_SOURCE_REQUIRED');
 const key='V95-portrait-'+imageSha256+'-'+approvedIdentitySha256+'-'+wrapMode;
 const cached=scheduler?.get(key);
 if(cached)return {...cached,resourceCacheHit:true};
 const vision=analyzeAIGReal3DPortraitPixels({
  rgba,width,height,imageSha256,faceLandmarks
 });
 if(vision.result!=='INFERRED_MODEL_CANDIDATE_ONLY')
  return {schema:AIG_REAL3D_V95_PIPELINE_SCHEMA,vision,
   state:'BLOCK_NO_OBSERVED_FACE',
   candidate:null,sourceHeroineIdentityVerified:false,
   true3DModelGenerated:false,releasePASS:false};
 const candidate=buildAIGReal3DProvisionalBody({
  vision,approvedIdentitySha256,sourceImageSha256:imageSha256,
  approvedIdentitySourcePresent,wrapMode
 });
 const out={schema:AIG_REAL3D_V95_PIPELINE_SCHEMA,
  vision,candidate,
  state:'WORKING_3D_ESTIMATED_CANDIDATE',
  sourceHeroineIdentityVerified:false,
  sourceImageMatchesApprovedSHA:approvedIdentitySourcePresent&&
   imageSha256===approvedIdentitySha256,
  true3DModelGenerated:true,source3DMeshTriangles:candidate.realIndexed3DTriangles,
  actualSkinnedJoints:candidate.realSkinnedJoints,
  faceAndBodyNaturalAppearanceCertified:false,
  generativeAIMLModelInvoked:vision.trainedMLInferenceActuallyUsed,
  importedAuthenticScan:false,
  candidateAcceptedAsFormalHeroine:false,
  releasePASS:false};
 if(scheduler){
  const n=candidate.mesh;
  scheduler.put(key,out,(n.positions.length+n.normals.length+n.indices.length)*8);
 }
 return {...out,resourceCacheHit:false};
}
