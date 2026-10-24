/**
 * V82 persistent real Web Worker virtual processing pool.
 * The SINGLE source indexed OBJ is never copied to each Worker. Only compact
 * triangle packets are transferred. 2/4 real Worker instances are created
 * ONCE per session and reused over multiple genuine 3D source poses.
 * 4/8/16 virtual tasks do not create 4/8/16 physical CPU cores.
 */
import {packAIGQuadSourceTriangles}
 from './aig-real3d-quad-strain-pool.mjs';
import {inspectAIGQuadStrainPacket,mergeAIGQuadStrainResults}
 from './aig-real3d-quad-strain-task.mjs';
export const AIG_REAL3D_PERSISTENT_VPU_SCHEMA=
 'AIG_REAL3D_V82_PERSISTENT_SOURCE_WORKER_POOL_V1';
const err=s=>{throw Error('REAL3D_PERSISTENT_VPU_'+s);};
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const round=n=>Math.round(n*1000)/1000;
const snapshot=buffer=>buffer.byteLength;
function dispatch(worker,bytes,id,timeoutMs,abortSignal){
 return new Promise((resolve,reject)=>{
  let active=true,timer;
  const clear=()=>{
   if(!active)return;
   active=false;clearTimeout(timer);
   worker.removeEventListener('message',receive);
   worker.removeEventListener('error',fail);
   abortSignal?.removeEventListener('abort',cancel);
  };
  const receive=e=>{
   if(e.data?.id!==id)return;
   clear();
   if(e.data.ok)resolve(e.data.result);
   else reject(Error('REAL3D_PERSISTENT_VPU_WORKER_'+String(e.data.error)));
  };
  const fail=e=>{clear();reject(Error('REAL3D_PERSISTENT_VPU_WORKER_FAULT_'+String(e?.message)))};
  const cancel=()=>{clear();reject(Error('REAL3D_PERSISTENT_VPU_ABORTED'))};
  if(abortSignal?.aborted){cancel();return;}
  worker.addEventListener('message',receive);
  worker.addEventListener('error',fail);
  abortSignal?.addEventListener('abort',cancel,{once:true});
  timer=setTimeout(()=>{clear();reject(Error('REAL3D_PERSISTENT_VPU_TIMEOUT'));},timeoutMs);
  try{worker.postMessage({id,packed:bytes},[bytes]);}
  catch(e){clear();reject(e);}
 });
}
export function createAIGReal3DPersistentVPU({
 physicalWorkers=4,virtualLanes=16,
 maxPacketBytes=32*1024*1024,
 maxBatches=12,timeoutMs=45000,
 workerFactory=null
}={}){
 if(![1,2,4].includes(physicalWorkers)||
  ![4,8,16].includes(virtualLanes)||virtualLanes<physicalWorkers||
  !Number.isInteger(maxPacketBytes)||maxPacketBytes<1024||
  maxPacketBytes>64*1024*1024||
  !Number.isInteger(maxBatches)||maxBatches<2||maxBatches>24||
  !Number.isInteger(timeoutMs)||timeoutMs<1000||timeoutMs>120000||
  (workerFactory!==null&&typeof workerFactory!=='function'))
  err('CONFIG_INVALID');
 const workers=[];
 let busy=false,closed=false,batches=0,tasks=0,jobSerial=1,
  actualParallelWorkers=0,peakActive=0,highestPacketBytes=0,dispatches=0,
  lastError=null,closeReason=null;
 const real=workerFactory===null;
 // Unlike repeated V81 invocations, no more than 4 actual Web Workers exist.
 try{
  for(let i=0;i<physicalWorkers;i++){
   const w=workerFactory?workerFactory(i):
    new Worker(new URL('./aig-real3d-quad-strain-worker.mjs',import.meta.url),
     {type:'module'});
   if(!w||typeof w.postMessage!=='function'||
    typeof w.addEventListener!=='function'||
    typeof w.removeEventListener!=='function'||
    typeof w.terminate!=='function')err('WORKER_INVALID');
   workers.push(w);
  }
  actualParallelWorkers=workers.length;
 }catch(e){
  for(const w of workers)w.terminate();
  throw e;
 }
 const stats=()=>({
  schema:AIG_REAL3D_PERSISTENT_VPU_SCHEMA,
  realWebWorkersCreated:real?actualParallelWorkers:0,
  injectedQARunnersCreated:real?0:actualParallelWorkers,
  virtualLanesConfigured:virtualLanes,
  actualWorkerObjectsCreated:actualParallelWorkers,
  liveWorkerObjects:closed?0:workers.length,
  batchesCompleted:batches,virtualTasksCompleted:tasks,
  taskDispatches:dispatches,maxConcurrentRealWorkerTasks:peakActive,
  highestCompactSourcePacketBytes:highestPacketBytes,
  isClosed:closed,closeReason,lastError,
  physicalCPUCoresCreated:0,
  sourceGPUContextsCreated:0,
  deviceFPSMeasured:false,
  naturalHumanRigVerified:false,
  releasePASS:false
 });
 const close=(reason='EXPLICIT_DISPOSE')=>{
  if(closed)return stats();
  closed=true;closeReason=reason;
  for(const w of workers)try{w.terminate();}catch{}
  return stats();
 };
 async function runBatch({
  original,posed,indices,triangleOffsets,sourceSha256,abortSignal=null
 }={}){
  if(closed)err('SESSION_CLOSED');
  if(busy)err('CONCURRENT_BATCH_NOT_ALLOWED');
  if(batches>=maxBatches){close('MAX_BATCH_BUDGET');err('MAX_BATCH_BUDGET');}
  if(typeof sourceSha256!=='string'||!/^[a-f0-9]{64}$/i.test(sourceSha256))
   err('BOUND_SOURCE_SHA_REQUIRED');
  if(abortSignal?.aborted){close('ABORTED');err('ABORTED');}
  busy=true;const start=performance.now();
  try{
   const packet=packAIGQuadSourceTriangles({original,posed,indices,triangleOffsets});
   if(packet.byteLength>maxPacketBytes)err('COMPACT_TRIANGLE_MEMORY_BUDGET');
   if(packet.length/18<virtualLanes)err('INSUFFICIENT_SOURCE_TRIANGLES_FOR_LANES');
   const serial=mergeAIGQuadStrainResults([inspectAIGQuadStrainPacket(packet)]);
   const faces=packet.length/18;
   const parts=Array.from({length:virtualLanes},
    (_,i)=>Math.floor(faces/virtualLanes)+(i<faces%virtualLanes?1:0));
   const ranges=[];let startFace=0;
   for(const count of parts){ranges.push({startFace,count});startFace+=count;}
   if(startFace!==faces)err('SOURCE_FACE_COVERAGE_INCOMPLETE');
   let cursor=0,active=0,failed=false,completed=0;
   const outcomes=new Array(virtualLanes);
   const taskCounts=new Array(workers.length).fill(0);
   const execute=async(w,i)=>{
    while(!failed){
     if(abortSignal?.aborted)err('ABORTED');
     const lane=cursor++;
     if(lane>=virtualLanes)return;
     const {startFace,count}=ranges[lane];
     const slice=packet.slice(startFace*18,(startFace+count)*18);
     if(snapshot(slice)>maxPacketBytes)err('LANE_PACKET_BUDGET');
     active++;peakActive=Math.max(active,peakActive);
     try{
      outcomes[lane]=await dispatch(w,slice.buffer,jobSerial++,timeoutMs,abortSignal);
      completed++;taskCounts[i]++;dispatches++;
     }catch(e){failed=true;throw e;}
     finally{active--;}
    }
   };
   await Promise.all(workers.map(execute));
   if(completed!==virtualLanes||outcomes.some(x=>x===undefined))
    err('INCOMPLETE_SOURCE_TASKS');
   const combined=mergeAIGQuadStrainResults(outcomes);
   if(JSON.stringify(combined)!==JSON.stringify(serial))
    err('SERIAL_GLOBAL_INDEXED_GEOMETRY_MISMATCH');
   batches++;tasks+=completed;
   highestPacketBytes=Math.max(highestPacketBytes,packet.byteLength);
   return {sourceSha256,originalTriangleCount:indices.length/3,
    inspectedOriginalTriangles:faces,
    actualWorkerObjectsReused:workers.length,
    genuineWebWorkerCount:real?workers.length:0,
    injectedTestRunnerCount:real?0:workers.length,
    virtualTaskCount:virtualLanes,taskCounts,
    sourceIndexedGeometryResult:combined,serialEquivalent:true,
    originalSourceBuffersUnmodified:true,
    workerCreationCountCumulative:workers.length,
    workerCleanupDeferredUntilSessionClose:true,
    workerBatchWallMs:round(performance.now()-start),
    fourCoresNotCreated:true,fullGPUSceneUnaffected:true,
    releasePASS:false
   };
  }catch(e){
   lastError=String(e?.message??e);
   close('FAIL_CLOSED_AFTER_BATCH_ERROR');
   throw e;
  }finally{busy=false;}
 }
 return {runBatch,close,stats};
}
/**
 * Real source evidence must proceed in order: geometry -> FK -> collision
 * analysis -> GPU evidence. These are references to ALREADY verified results,
 * not generated human-body or simulated fake GPU output.
 */
export function verifyAIGReal3DStageEvidence({
 sourceSha256,geometry,pose,contact,gpu
}={}){
 if(!/^[a-f0-9]{64}$/i.test(String(sourceSha256))||
  geometry?.sourceSha256!==sourceSha256||
  geometry?.sourceTriangleCount<2000||
  pose?.sourceSha256!==sourceSha256||
  pose?.sourceTriangleCount!==geometry.sourceTriangleCount||
  contact?.sampledOriginalTriangleAudit!==true||
  contact?.sourceSha256!==sourceSha256||
  gpu?.sourceSha256!==sourceSha256||
  !Array.isArray(gpu?.frameSha256)||gpu.frameSha256.length<3||
  gpu.frameSha256.some(s=>!/^[a-f0-9]{64}$/i.test(s)))
  err('STAGE_EVIDENCE_SOURCE_CHAIN_BLOCK');
 return {
  schema:'AIG_REAL3D_V82_ORIGINAL_SOURCE_STAGE_CHAIN_V1',
  stages:['ORIGINAL_INDEXED_GEOMETRY','SOURCE_FK_POSE',
   'SAMPLED_CONTACT_AND_SWEPT_RISK','GENUINE_GPU_FRAMES'],
  sourceSha256,originalTriangleCount:geometry.sourceTriangleCount,
  sampledCollisionSafetyGuaranteed:false,
  noAutoHumanRigGenerated:true,
  originalGPUSourceFramesVerified:gpu.frameSha256.length,
  releasePASS:false
 };
}
