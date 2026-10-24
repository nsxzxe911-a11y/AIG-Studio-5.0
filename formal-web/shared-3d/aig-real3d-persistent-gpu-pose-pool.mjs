/**
 * V80: one live indexed source mesh and one WebGL context across multi-segment
 * rAF animation load, no complete GPU VBO/EBO reallocation after warmup.
 * The input poseScenes are immutable reference scenes: ONLY our owned live clone
 * changes. Bounded QA is not a perpetual playback, full FPS or thermal proof.
 */
import {applyAIGReal3DSourceMeshDelta} from './aig-real3d-gpu-delta-source.mjs';
import {createAIGReal3DFrameGovernor} from './aig-real3d-adaptive-pose-playback.mjs';
export const AIG_REAL3D_PERSISTENT_POOL_SCHEMA=
 'AIG_REAL3D_V80_PERSISTENT_INDEXED_GPU_POSE_POOL_V1';
const fail=x=>{throw Error('REAL3D_PERSISTENT_POOL_'+x);};
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const median=a=>{
 if(!a.length)return null;
 const b=[...a].sort((x,y)=>x-y),m=b.length>>1;
 return b.length%2?b[m]:(b[m-1]+b[m])/2;
};
const r3=x=>x===null?null:Math.round(x*1000)/1000;
const validStats=s=>s&&Number.isInteger(s.activeTrackedOwnedGPUBufferCount)&&
 Number.isInteger(s.totalOwnedGPUBuffersCreated)&&
 Number.isInteger(s.totalOwnedGPUBuffersDeleted)&&
 Number.isInteger(s.fullBufferDataUploads)&&
 Number.isInteger(s.bufferSubDataUpdates)&&
 Number.isFinite(s.fullBufferBytesUploaded)&&
 Number.isFinite(s.incrementalBytesUploaded)&&
 s.activeTrackedOwnedGPUBufferCount>=0&&
 s.totalOwnedGPUBuffersCreated>=s.totalOwnedGPUBuffersDeleted&&
 s.ownedGPUBufferAllocationBalance===s.activeTrackedOwnedGPUBufferCount;
const cloneScene=s=>{
 // Copy node arrays with distinct ownership; preserve original source provenance.
 const copy=structuredClone(s);
 if(copy===s||copy.nodes[0].mesh===s.nodes[0].mesh)
  fail('LIVE_SOURCE_SCENE_OWNERSHIP_NOT_SEPARATE');
 return copy;
};
export async function inspectAIGReal3DPersistentGPUPosePool({
 renderer,poseScenes,segments=3,rafCallbacksPerSegment=72,mode='AUTO',
 requestFrame=typeof requestAnimationFrame==='function'?requestAnimationFrame:null,
 now=()=>performance.now(),
 readMemory=()=>({
  used:typeof performance.memory?.usedJSHeapSize==='number'?
   performance.memory.usedJSHeapSize:null,
  limit:typeof performance.memory?.jsHeapSizeLimit==='number'?
   performance.memory.jsHeapSizeLimit:null
 }),
 readVisibility=()=>typeof document==='undefined'?'visible':document.visibilityState,
 maxOwnedGPUBuffers=12,maxFullGPUUploadBytes=100000000,
 abortSignal=null
}={}){
 if(!renderer||typeof renderer.render!=='function'||
  typeof renderer.updateMeshVertices!=='function'||
  typeof renderer.releaseMesh!=='function'||
  typeof renderer.destroy!=='function'||
  typeof renderer.getGPUResourceAccounting!=='function'||
  !Array.isArray(poseScenes)||poseScenes.length<2||
  poseScenes.some(s=>s?.schema!=='AIG_REAL3D_SCENE_V1'||
   !Array.isArray(s.nodes)||s.nodes.length!==1||
   s.nodes[0]?.mesh?.triangleCount<2000)||
  !Number.isInteger(segments)||segments<2||segments>6||
  !Number.isInteger(rafCallbacksPerSegment)||rafCallbacksPerSegment<24||
  rafCallbacksPerSegment>180||!['AUTO',30,60,90,120].includes(mode)||
  typeof requestFrame!=='function'||typeof now!=='function'||
  typeof readMemory!=='function'||typeof readVisibility!=='function'||
  !Number.isInteger(maxOwnedGPUBuffers)||maxOwnedGPUBuffers<3||
  maxOwnedGPUBuffers>128||!finite(maxFullGPUUploadBytes)||
  maxFullGPUUploadBytes<=0||maxFullGPUUploadBytes>1e9)
  fail('TRUE_SOURCE_AND_BOUNDED_GPU_PLAN_REQUIRED');
 const originalPositions=poseScenes.map(s=>s.nodes[0].mesh.positions.slice());
 const originalIndices=poseScenes.map(s=>s.nodes[0].mesh.indices.slice());
 const liveScene=cloneScene(poseScenes[0]);
 let baseline=null,prewarmed=false,draws=0,deltas=0,
  first=null,last=null,stageIdx=0;
 const stages=[],governor=createAIGReal3DFrameGovernor({mode});
 let error=null,afterRelease=null,afterDestroy=null;
 try{
  // One GPU upload for entire animation session, not once per stage.
  const warm=renderer.render(liveScene);
  if(warm?.status!=='WEBGL_XYZ_TRIANGLES_RENDERED'||
   warm.triangles!==poseScenes[0].nodes[0].mesh.triangleCount)
   fail('SOURCE_GPU_WARMUP_BLOCKED');
  baseline=renderer.getGPUResourceAccounting();
  if(!validStats(baseline)||baseline.activeTrackedOwnedGPUBufferCount<3||
   baseline.activeTrackedOwnedGPUBufferCount>maxOwnedGPUBuffers||
   baseline.fullBufferBytesUploaded>maxFullGPUUploadBytes)
   fail('GPU_PREALLOCATION_BUDGET_EXCEEDED');
  prewarmed=true;
  for(let segment=0;segment<segments;segment++){
   let sampled=0,rendered=0,hidden=0,pressure=0,updating=0,
    deltaBytes=0,skipped=0;
   const observedWall=[],rafGaps=[];
   let previous=null,heapStart=null,heapEnd=null;
   const allocationBefore=renderer.getGPUResourceAccounting();
   for(let k=0;k<rafCallbacksPerSegment;k++){
    if(abortSignal?.aborted)fail('ABORTED_SAFE_TEARDOWN');
    const timestamp=await new Promise(resolve=>requestFrame(resolve));
    if(!finite(timestamp)||previous!==null&&timestamp<previous)
     fail('RAF_CLOCK_INVALID');
    sampled++;
    if(first===null)first=timestamp;
    last=timestamp;
    if(previous!==null)rafGaps.push(timestamp-previous);
    previous=timestamp;
    const memory=readMemory()??{};
    if(k===0)heapStart=memory.used??null;
    heapEnd=memory.used??null;
    const chosen=governor.choose(timestamp,{
     visibility:readVisibility()==='hidden'?'hidden':'visible',
     heapUsedBytes:memory.used??null,
     heapLimitBytes:memory.limit??null
    });
    if(!chosen.draw){
     skipped++;
     if(chosen.reason==='DOCUMENT_HIDDEN')hidden++;
     if(chosen.reason==='CRITICAL_HEAP_PAUSE')pressure++;
     continue;
    }
    const start=now();
    const target=poseScenes[stageIdx%poseScenes.length];
    // Unlike repeated benchmark invocations, targets never alias mutable live.
    const update=applyAIGReal3DSourceMeshDelta({
     renderer,liveScene,nextScene:target
    });
    if(update.fullGPUVertexBuffersReallocated||
     !update.originalSourceTopologyPreserved||
     !update.reusedOriginalIndexGPUBuffers)
     fail('SOURCE_INDEX_GPU_BUFFER_REUSE_FAILED');
    const frame=renderer.render(liveScene);
    if(frame?.status!=='WEBGL_XYZ_TRIANGLES_RENDERED'||
     frame.triangles!==warm.triangles)
     fail('TRUE_GPU_SOURCE_FRAME_MISSING');
    const wall=now()-start;
    if(!finite(wall)||wall<0)fail('REAL_RENDER_WALL_INVALID');
    observedWall.push(wall);
    governor.observe({renderWallMs:wall});
    updating+=update.gpuBufferSubDataCalls;
    deltaBytes+=update.changedOriginalLocalVertices;
    rendered++;draws++;deltas++;stageIdx++;
    const usage=renderer.getGPUResourceAccounting();
    if(!validStats(usage)||usage.totalOwnedGPUBuffersCreated!==baseline.totalOwnedGPUBuffersCreated||
     usage.fullBufferDataUploads!==baseline.fullBufferDataUploads||
     usage.fullBufferBytesUploaded!==baseline.fullBufferBytesUploaded||
     usage.activeTrackedOwnedGPUBufferCount!==baseline.activeTrackedOwnedGPUBufferCount)
     fail('GPU_BUFFER_POOL_GREW_DURING_FRAMES');
   }
   if(rendered<2)fail('INSUFFICIENT_REAL_SOURCE_GPU_FRAMES_PER_SEGMENT');
   const allocationAfter=renderer.getGPUResourceAccounting();
   if(!validStats(allocationAfter)||
    allocationAfter.totalOwnedGPUBuffersCreated!==allocationBefore.totalOwnedGPUBuffersCreated||
    allocationAfter.fullBufferDataUploads!==allocationBefore.fullBufferDataUploads||
    allocationAfter.activeTrackedOwnedGPUBufferCount!==allocationBefore.activeTrackedOwnedGPUBufferCount)
    fail('GPU_BUFFER_POOL_GREW_BETWEEN_SEGMENTS');
   stages.push({
    segmentIndex:segment,requestedCallbacks:rafCallbacksPerSegment,
    actualRafCallbacks:sampled,realSourceIndexedGPUFrames:rendered,
    skippedCallbacks:skipped,hiddenCallbacks: hidden,
    criticalHeapPausedCallbacks:pressure,
    medianActualRafIntervalMs:r3(median(rafGaps)),
    medianGPURenderSubmissionWallMs:r3(median(observedWall)),
    indexVBOsAllocatedSinceLastSegment:allocationAfter.totalOwnedGPUBuffersCreated-
     allocationBefore.totalOwnedGPUBuffersCreated,
    fullGPUBufferUploadsSinceLastSegment:allocationAfter.fullBufferDataUploads-
     allocationBefore.fullBufferDataUploads,
    actualIncrementalSubDataCalls:updating,
    localSourceVerticesIncludedInDeltas:deltaBytes,
    observedHeapBytesFirst:heapStart,
    observedHeapBytesLast:heapEnd,
    targetHzAfterSegment:governor.snapshot().targetHz
   });
  }
  for(let i=0;i<poseScenes.length;i++){
   const got=poseScenes[i].nodes[0].mesh;
   if(got.positions.some((v,k)=>v!==originalPositions[i][k])||
    got.indices.some((v,k)=>v!==originalIndices[i][k]))
    fail('IMMUTABLE_ORIGINAL_REFERENCE_POSES_MUTATED');
  }
 }catch(err){error=err;}
 finally{
  // Even if the run fails mid-frame, ensure a complete resource release.
  try{
   if(prewarmed){
    const released=renderer.releaseMesh(liveScene.nodes[0].mesh);
    if(!released&&!error)error=Error('REAL3D_PERSISTENT_POOL_SOURCE_RELEASE_FAILED');
   }
   afterRelease=renderer.getGPUResourceAccounting();
  }catch(err){if(!error)error=err;}
  try{
   renderer.destroy();
   afterDestroy=renderer.getGPUResourceAccounting();
  }catch(err){if(!error)error=err;}
 }
 if(!validStats(afterDestroy)||!afterDestroy.rendererDestroyed||
  afterDestroy.ownedGPUBufferAllocationBalance!==0||
  afterDestroy.activeTrackedOwnedGPUBufferCount!==0||
  !afterRelease||afterRelease.ownedGPUBufferAllocationBalance!==0)
  fail('RESOURCE_POOL_TEARDOWN_NOT_BALANCED');
 if(error)throw error;
 const snapshot=governor.snapshot(),duration=first!==null&&last>first?last-first:null;
 return {
  schema:AIG_REAL3D_PERSISTENT_POOL_SCHEMA,
  sourcePoseCount:poseScenes.length,
  segmentsCompleted:stages.length,
  requestedRafCallbacksTotal:segments*rafCallbacksPerSegment,
  genuineSourceIndexedGPUDraws:draws,
  originalSourceGPUIndexBuffersReusedAcrossSegments:true,
  fullGPUBufferReallocationsAfterWarmup:0,
  originalPoseReferencesUnmodified:true,
  gpuPoolInitiallyAllocatedBuffers:baseline.activeTrackedOwnedGPUBufferCount,
  realGPUBufferSubDataUpdates:stages.reduce((x,s)=>x+s.actualIncrementalSubDataCalls,0),
  callbackWallWindowMs:r3(duration),
  governor:snapshot,segments:stages,
  ownedGPUResourceAccountAfterRelease:afterRelease,
  ownedGPUResourceAccountAfterDestroy:afterDestroy,
  realGPUDriverVRAMUsageBytes:null,
  actualDeviceTemperatureCelsius:null,
  manualPhysicalHardwareThermalMeasurementRequired:true,
  realAndroidWindowsFPSAndSustainedThermalGatePASS:false,
  verifiedHumanAnatomyPASS:false,
  releasePASS:false
 };
}
