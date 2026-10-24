/**
 * V79 bounded genuine WebGL multi-cycle stress with renderer teardown proofs.
 * Builds new renderer and ORIGINAL indexed source pose scenes per cycle.
 * No setTimeout-based fake frame samples, no fake VRAM or temperature readings.
 */
import {benchmarkAIGReal3DNativePosePlayback}
 from './aig-real3d-adaptive-pose-playback.mjs';
export const AIG_REAL3D_GPU_STRESS_SCHEMA=
 'AIG_REAL3D_GENUINE_GPU_SOURCE_CYCLE_STRESS_V1';
const fail=code=>{throw Error('REAL3D_GPU_STRESS_'+code);};
const num=v=>typeof v==='number'&&Number.isFinite(v);
export async function stressAIGReal3DGPUResourceCycles({
 createCycle,cycles=3,rafCallbacksPerCycle=48,mode='AUTO',
 requestFrame=typeof requestAnimationFrame==='function'?requestAnimationFrame:null,
 now=()=>performance.now(),
 readMemory=()=>({
  used:typeof performance.memory?.usedJSHeapSize==='number'?
   performance.memory.usedJSHeapSize:null,
  limit:typeof performance.memory?.jsHeapSizeLimit==='number'?
   performance.memory.jsHeapSizeLimit:null
 }),
 readVisibility=()=>typeof document==='undefined'?'visible':document.visibilityState
}={}){
 if(typeof createCycle!=='function'||!Number.isInteger(cycles)||
  cycles<2||cycles>5||!Number.isInteger(rafCallbacksPerCycle)||
  rafCallbacksPerCycle<12||rafCallbacksPerCycle>180||
  typeof requestFrame!=='function'||typeof now!=='function'||
  typeof readMemory!=='function'||typeof readVisibility!=='function')
  fail('SOURCE_CYCLE_PLAN_INVALID');
 const records=[],heaps=[];
 for(let cycle=0;cycle<cycles;cycle++){
  const instance=await createCycle(cycle);
  const renderer=instance?.renderer,poseScenes=instance?.poseScenes;
  if(!renderer||typeof renderer.getGPUResourceAccounting!=='function'||
   typeof renderer.releaseMesh!=='function'||
   typeof renderer.destroy!=='function'||!Array.isArray(poseScenes)||
   poseScenes.length<2){
   try{renderer?.destroy?.();}catch{}
   fail('REAL_GPU_RENDERER_AND_SOURCE_POSES_REQUIRED');
  }
  let sample=null,firstResources=null,afterRelease=null,afterDestroy=null;
  try{
   sample=await benchmarkAIGReal3DNativePosePlayback({
    renderer,poseScenes,rafCallbacks:rafCallbacksPerCycle,mode,
    requestFrame,now,readMemory,readVisibility
   });
   firstResources=renderer.getGPUResourceAccounting();
   if(sample.actualSourceIndexedDraws<2||
    sample.gpuOriginalIndexReusedForEveryDelta!==true||
    sample.gpuBufferSubDataCalls<1||
    !num(firstResources.activeTrackedOwnedGPUBufferCount)||
    firstResources.activeTrackedOwnedGPUBufferCount<3)
    fail('SOURCE_DRAW_GPU_BUFFER_REUSE_NOT_PROVEN');
   // Resource ownership: one live source Mesh was rendered throughout all poses.
   const released=renderer.releaseMesh(poseScenes[0].nodes[0].mesh);
   afterRelease=renderer.getGPUResourceAccounting();
   if(!released||afterRelease.activeTrackedOwnedGPUBufferCount!==0||
    afterRelease.ownedGPUBufferAllocationBalance!==0)
    fail('GPU_OWNED_BUFFER_NOT_RELEASED');
  }finally{
   renderer.destroy();
   afterDestroy=renderer.getGPUResourceAccounting();
  }
  if(afterDestroy.activeTrackedOwnedGPUBufferCount!==0||
   !afterDestroy.rendererDestroyed||
   afterDestroy.ownedGPUBufferAllocationBalance!==0)
   fail('RENDERER_TEARDOWN_BUFFER_BALANCE_FAILED');
  const item={cycleIndex:cycle,sourcePoseCount:poseScenes.length,
   requestedRafCallbacks:rafCallbacksPerCycle,
   realIndexedSourceDraws:sample.actualSourceIndexedDraws,
   gpuSourceBufferSubDataUpdates:sample.gpuBufferSubDataCalls,
   gpuBufferOwnershipAtPeak:firstResources,
   gpuBufferOwnershipAfterRelease:afterRelease,
   gpuBufferOwnershipAfterDestroy:afterDestroy,
   measuredRafMedianMs:sample.observedRafMedianMs,
   renderSubmissionMedianMs:sample.measuredRenderSubmissionMedianMs,
   observedBrowserHeapBytesBegin:sample.observedBrowserHeapBytesBegin,
   observedBrowserHeapBytesEnd:sample.observedBrowserHeapBytesEnd,
   sourceOriginalOBJUnmodified:sample.sourceOriginalOBJUnmodified,
   thermalTemperatureCelsius:sample.actualDeviceTemperatureCelsius};
  records.push(item);
  heaps.push(item.observedBrowserHeapBytesEnd);
 }
 const known=heaps.every(x=>num(x));
 const delta=known&&heaps.length>1?heaps.at(-1)-heaps[0]:null;
 return {schema:AIG_REAL3D_GPU_STRESS_SCHEMA,cyclesCompleted:records.length,
  callbacksRequested:cycles*rafCallbacksPerCycle,
  actualSourceIndexedDraws:records.reduce((v,r)=>v+r.realIndexedSourceDraws,0),
  realGPUBufferSubDataUpdates:records.reduce((v,r)=>v+r.gpuSourceBufferSubDataUpdates,0),
  everyRendererOwnedGPUBufferFullyReleased:true,
  originalSourceIndexBuffersNeverDuplicatedPerFrame:true,
  records,
  heapAvailableAcrossAllCycles:known,
  observedHeapEndDifferenceBytes:delta,
  observedHeapIsNotProvenMemoryLeakMetric:true,
  realGPUVRAMUsageBytes:null,deviceTemperatureCelsius:null,
  androidWindowsLongDurationThermalGatePASS:false,
  realDeviceStableFPS60_90_120PASS:false,
  trueHumanAnatomyAnimationPASS:false,
  releasePASS:false};
}
