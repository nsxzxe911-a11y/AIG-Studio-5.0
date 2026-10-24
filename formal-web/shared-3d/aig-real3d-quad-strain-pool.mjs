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
 if(![1,2,4].includes(requestedWorkers)||!Number.isInteger(minimumTrianglesForWorkers)||
  minimumTrianglesForWorkers<1||!Number.isFinite(timeoutMs)||
  timeoutMs<1000||timeoutMs>120000)fail('SCHEDULER_CONFIG_INVALID');
 const packedMs=performance.now()-t0;
 const serialStart=performance.now();
 const serial=mergeAIGQuadStrainResults([inspectAIGQuadStrainPacket(packet)]);
 const serialComputeMs=performance.now()-serialStart;
 const serialMs=packedMs+serialComputeMs;
 const capable=typeof Worker==='function';
 const hardware=typeof navigator!=='undefined'?navigator.hardwareConcurrency??0:0;
 const forceParallel=forceFour;
 const runParallel=requestedWorkers>1&&capable&&
  (forceParallel||packet.length/18>=minimumTrianglesForWorkers)&&
  (forceParallel||hardware===0||hardware>=requestedWorkers)&&
  packet.length/18>=requestedWorkers;
 if(!runParallel){
  return {schema:QUAD_STRAIN_SCHEMA,result:serial,serialBaseline:serial,
   measuredSerialTotalMs:serialMs,measuredFourWorkerMs:null,
   measuredPackingMs:Math.round(packedMs*1000)/1000,
   benchmarkTimesIncludeIdenticalPackingCosts:true,
   actualWorkerLanes:0,requestedWorkerLanes:requestedWorkers,
   selectedMode:'SERIAL_SMALL_JOB_OR_UNSUPPORTED',
   parallelEquivalentToSerial:true,sourceTrianglesPreserved:true,
   gpuWasNotDuplicated:true,verifiedPhysicalCPUCores:0,
   twoTimesFasterClaimSupported:false};
 }
 const t1=performance.now(),workers=[];
 try{
  const lengths=Array.from({length:requestedWorkers},
   (_,i)=>Math.floor(packet.length/18/requestedWorkers)+
    (i<packet.length/18%requestedWorkers?1:0));
  let start=0;const jobs=[];
  for(let i=0;i<requestedWorkers;i++){
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
   measuredFourWorkerMs:requestedWorkers===4?Math.round(parallelMs*1000)/1000:null,
   measuredTwoWorkerMs:requestedWorkers===2?Math.round(parallelMs*1000)/1000:null,
   measuredActiveWorkerMs:Math.round(parallelMs*1000)/1000,
   measuredPackingMs:Math.round(packedMs*1000)/1000,
   benchmarkTimesIncludeIdenticalPackingCosts:true,
   actualWorkerLanes:requestedWorkers,requestedWorkerLanes:requestedWorkers,
   selectedMode:requestedWorkers===4?'FOUR_REAL_WEB_WORKERS':'TWO_REAL_WEB_WORKERS',
   parallelEquivalentToSerial:true,sourceTrianglesPreserved:true,
   gpuWasNotDuplicated:true,verifiedPhysicalCPUCores:null,
   twoTimesFasterClaimSupported:false,
   oneRunObservedWallClockRatio:parallelMs?Math.round(serialMs/parallelMs*1000)/1000:null};
 }finally{for(const worker of workers)worker.terminate();}
}

/**
 * Like-for-like microbenchmark with NEW dedicated workers on each trial.
 * Report all 3 modes and median total duration including source-packet packing.
 * Do not use a single sample or hardwareConcurrency to claim physical 2x.
 */
export async function benchmarkAIGReal3DWorkerModes({
 original,posed,indices,triangleOffsets,
 repeats=3,timeoutMs=45000
}={}){
 if(!Number.isInteger(repeats)||repeats<2||repeats>5)
  fail('BENCHMARK_REPETITIONS_INVALID');
 const sample={serial:[],two:[],four:[]},diagnostics=[];
 for(let i=0;i<repeats;i++){
  // Alternate mode order to reduce consistent first-run/JIT bias.
  const order=i%2? [4,2,1]:[1,2,4];
  for(const count of order){
   const result=await runAIGReal3DQuadStrain({
    original,posed,indices,triangleOffsets,
    requestedWorkers:count,forceFour:count>1,
    minimumTrianglesForWorkers:1,timeoutMs
   });
   if(count>1&&result.actualWorkerLanes!==count)
    fail('BENCHMARK_EXPECTED_TRUE_WORKERS');
   const key=count===1?'serial':count===2?'two':'four';
   const elapsed=count===1?result.measuredSerialTotalMs:result.measuredActiveWorkerMs;
   sample[key].push(elapsed);
   diagnostics.push({
    mode:key,trial:i,elapsedMs:elapsed,actualWorkerLanes:result.actualWorkerLanes,
    sourceDataEqualToSerial:result.parallelEquivalentToSerial
   });
  }
 }
 const med=(arr)=>{
  const sorted=[...arr].sort((a,b)=>a-b),mid=Math.floor(sorted.length/2);
  return sorted.length%2?sorted[mid]:(sorted[mid-1]+sorted[mid])/2;
 };
 const medians=Object.fromEntries(Object.entries(sample).map(([name,arr])=>[
  name,Math.round(med(arr)*1000)/1000]));
 // A deliberately conservative auto recommendation: speed measured in this
 // environment, and only accept parallel if >=10% lower median total time.
 const hardware=typeof navigator!=='undefined'?navigator.hardwareConcurrency??0:0;
 const eligible=Object.entries(medians).filter(([name])=>
  name==='serial'||hardware===0||hardware>=(name==='four'?4:2));
 eligible.sort((a,b)=>a[1]-b[1]);
 const fastest=eligible[0]?.[0]??'serial';
 const recommended=fastest!=='serial'&&medians[fastest]<medians.serial*.9?
  fastest:'serial';
 return {
  schema:'AIG_REAL3D_ADAPTIVE_1_2_4_CPU_WORKERS_BENCHMARK_V1',
  trialCountPerMode:repeats,samplesMs:sample,medianTotalMs:medians,
  rawTrialEvidence:diagnostics,
  recommendedMode:recommended,
  serialMedianMs:medians.serial,
  twoWorkerSpeedupVsSerial:medians.two?Math.round(medians.serial/medians.two*1000)/1000:null,
  fourWorkerSpeedupVsSerial:medians.four?Math.round(medians.serial/medians.four*1000)/1000:null,
  twoWorkerToFourWorkerRatio:medians.four?Math.round(medians.two/medians.four*1000)/1000:null,
  includesPackingAndWorkerStartup:true,
  repeatModeOrderAlternated:true,
  samplingHardwareSpecific:true,
  adaptiveSelectionBasedOnMeasuredTime:true,
  recommendedForThisWorkloadOnly:true,
  fullFrameGPUSpeedMeasured:false,
  CPUPhysicalCoreCountVerified:false,
  animation60FPSVerified:false,
  globalPerformanceDoubledPASS:false,
  releasePASS:false
 };
}
