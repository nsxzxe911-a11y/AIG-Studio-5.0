/**
 * Four genuine browser Web Worker computation lanes.
 * The main thread packs only original GLOBAL source Indexed XYZ touched faces.
 * Each worker receives its own TRANSFERRED compact packet (no 4x mesh copy).
 * Four workers do not equal four physical CPU cores or guarantee 2x speed.
 */
import {inspectAIGQuadStrainPacket,mergeAIGQuadStrainResults,QUAD_STRAIN_SCHEMA}
 from './aig-real3d-quad-strain-task.mjs';
const fail=s=>{throw Error('QUAD_'+s);};
function validate(original,posed,indices,triangleOffsets){
 if(!(original instanceof Float32Array)||!(posed instanceof Float32Array)||
  original.length!==posed.length||original.length%3||
  !(indices instanceof Uint32Array)||indices.length%3||
  !(triangleOffsets instanceof Uint32Array))fail('ORIGINAL_INDEXED_SOURCE_REQUIRED');
 let last=-3;
 for(const k of triangleOffsets){
  if(k%3||k+2>=indices.length||k<=last)fail('SOURCE_TRIANGLE_OFFSETS_INVALID');
  last=k;
  for(let i=0;i<3;i++)if(indices[k+i]>=original.length/3)
   fail('SOURCE_TRIANGLE_INDEX_OUT_OF_RANGE');
 }
}
export function packAIGQuadSourceTriangles({
 original,posed,indices,triangleOffsets
}={}){
 validate(original,posed,indices,triangleOffsets);
 const packed=new Float32Array(triangleOffsets.length*18);
 for(let i=0;i<triangleOffsets.length;i++){
  const offset=triangleOffsets[i],start=i*18;
  for(let n=0;n<3;n++){
   const globalId=indices[offset+n],src=globalId*3;
   for(let c=0;c<3;c++){
    packed[start+n*3+c]=original[src+c];
    packed[start+9+n*3+c]=posed[src+c];
   }
  }
 }
 return packed;
}
export function inspectAIGReal3DStrainSerial({
 original,posed,indices,triangleOffsets
}={}){
 const packed=packAIGQuadSourceTriangles({original,posed,indices,triangleOffsets});
 return mergeAIGQuadStrainResults([inspectAIGQuadStrainPacket(packed)]);
}
function runWorker(worker,buffer,id,timeoutMs){
 return new Promise((resolve,reject)=>{
  let timeout;
  const cleanup=()=>{
   worker.removeEventListener('message',onMessage);
   worker.removeEventListener('error',onError);
   clearTimeout(timeout);
  };
  const onMessage=e=>{
   if(e.data?.id!==id)return;
   cleanup();
   if(e.data.ok)resolve(e.data.result);
   else reject(Error(e.data.error||'QUAD_WORKER_FAILED'));
  };
  const onError=e=>{cleanup();reject(Error('QUAD_WORKER_EXCEPTION_'+e.message));};
  worker.addEventListener('message',onMessage);
  worker.addEventListener('error',onError);
  timeout=setTimeout(()=>{cleanup();reject(Error('QUAD_WORKER_TIMEOUT'));},timeoutMs);
  worker.postMessage({id,packed:buffer},[buffer]);
 });
}
/**
 * One-shot real worker pool; no CPU/GPU concurrency oversubscription after job.
 * Returns observed timing, never extrapolates it to other hardware.
 */
export async function runAIGReal3DQuadStrain({
 original,posed,indices,triangleOffsets,
 requestedWorkers=4,minimumTrianglesForWorkers=64,forceFour=false,
 timeoutMs=45000
}={}){
 const t0=performance.now();
 const packet=packAIGQuadSourceTriangles({original,posed,indices,triangleOffsets});
 if(requestedWorkers!==4||!Number.isInteger(minimumTrianglesForWorkers)||
  minimumTrianglesForWorkers<1||!Number.isFinite(timeoutMs)||
  timeoutMs<1000||timeoutMs>120000)fail('SCHEDULER_CONFIG_INVALID');
 const packedMs=performance.now()-t0;
 const serialStart=performance.now();
 const serial=mergeAIGQuadStrainResults([inspectAIGQuadStrainPacket(packet)]);
 const serialComputeMs=performance.now()-serialStart;
 const serialMs=packedMs+serialComputeMs;
 const capable=typeof Worker==='function';
 const hardware=typeof navigator!=='undefined'?navigator.hardwareConcurrency??0:0;
 const runParallel=capable&&(forceFour||packet.length/18>=minimumTrianglesForWorkers)&&
  (forceFour||hardware===0||hardware>=4)&&packet.length/18>=4;
 if(!runParallel){
  return {schema:QUAD_STRAIN_SCHEMA,result:serial,serialBaseline:serial,
   measuredSerialTotalMs:serialMs,measuredFourWorkerMs:null,
   measuredPackingMs:Math.round(packedMs*1000)/1000,
   benchmarkTimesIncludeIdenticalPackingCosts:true,
   actualWorkerLanes:0,requestedWorkerLanes:4,
   selectedMode:'SERIAL_SMALL_JOB_OR_UNSUPPORTED',
   parallelEquivalentToSerial:true,sourceTrianglesPreserved:true,
   gpuWasNotDuplicated:true,verifiedPhysicalCPUCores:0,
   twoTimesFasterClaimSupported:false};
 }
 const t1=performance.now(),workers=[];
 try{
  const lengths=[0,1,2,3].map(i=>Math.floor(packet.length/18/4)+
   (i<packet.length/18%4?1:0));
  let start=0;const jobs=[];
  for(let i=0;i<4;i++){
   const worker=new Worker(new URL('./aig-real3d-quad-strain-worker.mjs',import.meta.url),
    {type:'module'});
   workers.push(worker);
   const count=lengths[i],slice=packet.slice(start*18,(start+count)*18);
   start+=count;
   jobs.push(runWorker(worker,slice.buffer,i,timeoutMs));
  }
  const partial=await Promise.all(jobs);
  const parallel=mergeAIGQuadStrainResults(partial),
   parallelComputeMs=performance.now()-t1,
   parallelMs=packedMs+parallelComputeMs;
  if(JSON.stringify(parallel)!==JSON.stringify(serial))
   fail('PARALLEL_SERIAL_SOURCE_STRAIN_MISMATCH');
  return {schema:QUAD_STRAIN_SCHEMA,result:parallel,serialBaseline:serial,
   measuredSerialTotalMs:Math.round(serialMs*1000)/1000,
   measuredFourWorkerMs:Math.round(parallelMs*1000)/1000,
   measuredPackingMs:Math.round(packedMs*1000)/1000,
   benchmarkTimesIncludeIdenticalPackingCosts:true,
   actualWorkerLanes:4,requestedWorkerLanes:4,
   selectedMode:'FOUR_REAL_WEB_WORKERS',
   parallelEquivalentToSerial:true,sourceTrianglesPreserved:true,
   gpuWasNotDuplicated:true,verifiedPhysicalCPUCores:null,
   twoTimesFasterClaimSupported:false,
   oneRunObservedWallClockRatio:parallelMs?Math.round(serialMs/parallelMs*1000)/1000:null};
 }finally{for(const worker of workers)worker.terminate();}
}
