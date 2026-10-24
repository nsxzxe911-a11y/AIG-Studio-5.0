/**
 * V81: Virtual Processing Unit (VPU) for TRUE original-source geometry math.
 *
 * A virtual lane is a small triangle task, not a physical or virtualized CPU
 * core. A MAXIMUM of 1/2/4 real Dedicated Web Workers owns the task queue.
 * Each worker pulls the next unclaimed lane after its last reply. Original
 * GLOBAL Indexed XYZ and triangle order are never modified. No GPU duplication.
 *
 * VPU does not provide hardware cores, boost clocks, 2x/4x speed or verified
 * real-body animation. Oversubscription can be slower; time the actual work.
 */
import {packAIGQuadSourceTriangles} from './aig-real3d-quad-strain-pool.mjs';
import {inspectAIGQuadStrainPacket,mergeAIGQuadStrainResults}
 from './aig-real3d-quad-strain-task.mjs';
export const AIG_REAL3D_VPU_SCHEMA=
 'AIG_REAL3D_VIRTUAL_TRIANGLE_TASK_WORK_STEALING_V1';
const fail=x=>{throw Error('REAL3D_VPU_'+x);};
const round=n=>Math.round(n*1000)/1000;
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const perf=()=>performance.now();
function workerJob(worker,buffer,id,timeoutMs,abortSignal){
 return new Promise((resolve,reject)=>{
  let active=true,timer=null;
  const cleanup=()=>{
   if(!active)return;active=false;
   clearTimeout(timer);
   worker.removeEventListener('message',onMessage);
   worker.removeEventListener('error',onError);
   abortSignal?.removeEventListener('abort',onAbort);
  };
  const onMessage=e=>{
   if(e.data?.id!==id)return;
   cleanup();
   if(e.data.ok)resolve(e.data.result);
   else reject(Error('REAL3D_VPU_WORKER_ERROR_'+String(e.data.error)));
  };
  const onError=e=>{
   cleanup();reject(Error('REAL3D_VPU_WORKER_RUNTIME_'+String(e.message??e)));
  };
  const onAbort=()=>{cleanup();reject(Error('REAL3D_VPU_ABORTED'));};
  if(abortSignal?.aborted){onAbort();return;}
  worker.addEventListener('message',onMessage);
  worker.addEventListener('error',onError);
  abortSignal?.addEventListener('abort',onAbort,{once:true});
  timer=setTimeout(()=>{
   cleanup();reject(Error('REAL3D_VPU_WORKER_TIMEOUT'));
  },timeoutMs);
  try{worker.postMessage({id,packed:buffer},[buffer]);}
  catch(err){cleanup();reject(err);}
 });
}
/**
 * Actual task execution; the caller can inject a mockWorkerFactory in Node QA.
 * In production, Worker is required and each Worker actually parses/runs the
 * SAME triangle strain module; a Node mock is NEVER reported as a real browser.
 */
export async function runAIGReal3DVirtualProcessor({
 original,posed,indices,triangleOffsets,
 virtualLanes=8,physicalWorkers=4,minTrianglesForParallel=256,
 maxPackedBytes=64*1024*1024,timeoutMs=45000,
 abortSignal=null,forceParallel=false,
 workerFactory=null
}={}){
 if(![4,8,16].includes(virtualLanes)||![1,2,4].includes(physicalWorkers)||
  physicalWorkers>virtualLanes||
  !Number.isInteger(minTrianglesForParallel)||minTrianglesForParallel<1||
  !Number.isInteger(maxPackedBytes)||maxPackedBytes<128||
  maxPackedBytes>64*1024*1024||
  !Number.isInteger(timeoutMs)||timeoutMs<1000||timeoutMs>120000||
  typeof forceParallel!=='boolean'||
  (abortSignal!==null&&typeof abortSignal?.addEventListener!=='function')||
  (workerFactory!==null&&typeof workerFactory!=='function'))
  fail('INVALID_VIRTUAL_SCHEDULER_SETTINGS');
 if(abortSignal?.aborted)fail('ABORTED');
 const start=perf();
 // Existing packer checks ordered original triangle offsets and all source ids.
 const packed=packAIGQuadSourceTriangles({original,posed,indices,triangleOffsets});
 const packedMs=perf()-start,faces=packed.length/18;
 if(packed.byteLength>maxPackedBytes)
  fail('BOUNDED_TASK_MEMORY_BUDGET_EXCEEDED');
 const serialStart=perf(),baseline=mergeAIGQuadStrainResults([
  inspectAIGQuadStrainPacket(packed)]);
 const serialTotalMs=packedMs+(perf()-serialStart);
 const capable=workerFactory!==null||typeof Worker==='function';
 const cores=typeof navigator==='undefined'?0:navigator.hardwareConcurrency??0;
 const parallel=capable&&faces>=physicalWorkers&&faces>=virtualLanes&&
  (forceParallel||faces>=minTrianglesForParallel)&&
  (forceParallel||cores===0||cores>=physicalWorkers);
 if(!parallel)return {
  schema:AIG_REAL3D_VPU_SCHEMA,result:baseline,
  sourceTrianglesExamined:faces,requestedVirtualTaskLanes:virtualLanes,
  actualVirtualTaskLanesExecuted:1,
  requestedPhysicalWebWorkers:physicalWorkers,actualRealWebWorkers:0,
  virtualLanesAreNotPhysicalCPUCoreCount:true,
  actualPhysicalCPUCoreCountVerified:false,
  selectedMode:'SERIAL_BECAUSE_SMALL_UNSUPPORTED_OR_BUDGETED',
  workerTaskCounts:[],workQueuePeakPendingTasks:0,
  sourcePackedBytes:packed.byteLength,maxPendingWorkerPacketBytes:0,
  measuredSerialWallMs:round(serialTotalMs),
  measuredVPUWallMs:null,
  measuredObservedVPUvsSerialRatio:null,
  serialResultMatchesVPU:true,originalTriangleOrderPreserved:true,
  originalOBJModified:false,trueGPUAccelerationCertified:false,
  deviceThermalCertified:false,stableDevice60FPSCertified:false,
  globalTwoTimesFasterCertified:false,releasePASS:false
 };
 const workerList=[],taskCount=Array(physicalWorkers).fill(0),
  partials=Array(virtualLanes),sizes=Array.from({length:virtualLanes},
   (_,i)=>Math.floor(faces/virtualLanes)+(i<faces%virtualLanes?1:0));
 let cursor=0,jobId=0,active=0,peakActive=0,stop=false;
 const parallelStart=perf();
 try{
  for(let i=0;i<physicalWorkers;i++){
   const worker=workerFactory?
    workerFactory(i):
    new Worker(new URL('./aig-real3d-quad-strain-worker.mjs',import.meta.url),
     {type:'module'});
   if(!worker||typeof worker.postMessage!=='function'||
    typeof worker.terminate!=='function'||
    typeof worker.addEventListener!=='function'||
    typeof worker.removeEventListener!=='function')
    fail('WORKER_FACTORY_INVALID');
   workerList.push(worker);
  }
  let offset=0;
  const ranges=sizes.map(count=>{
   const ret={offset,count};offset+=count;return ret;
  });
  const execute=async(worker,workerIndex)=>{
   while(!stop){
    if(abortSignal?.aborted)fail('ABORTED');
    const id=cursor++;
    if(id>=virtualLanes)return;
    // Compact packet slice contains exclusively THIS lane's original faces.
    // At any instant <= physicalWorkers packets are transferred in-flight.
    const {offset,count}=ranges[id];
    const slice=packed.slice(offset*18,(offset+count)*18);
    active++;peakActive=Math.max(peakActive,active);
    try{
     partials[id]=await workerJob(worker,slice.buffer,jobId++,timeoutMs,abortSignal);
     taskCount[workerIndex]++;
    }catch(e){stop=true;throw e;}
    finally{active--;}
   }
  };
  await Promise.all(workerList.map(execute));
  if(partials.some(x=>x==null)||
   taskCount.reduce((a,b)=>a+b,0)!==virtualLanes)
   fail('UNFINISHED_VIRTUAL_LANES');
  const actual=mergeAIGQuadStrainResults(partials);
  if(JSON.stringify(actual)!==JSON.stringify(baseline))
   fail('SOURCE_RESULTS_MISMATCH_SERIAL');
  const vpMs=packedMs+(perf()-parallelStart);
  return {
   schema:AIG_REAL3D_VPU_SCHEMA,result:actual,sourceTrianglesExamined:faces,
   requestedVirtualTaskLanes:virtualLanes,
   actualVirtualTaskLanesExecuted:virtualLanes,
   requestedPhysicalWebWorkers:physicalWorkers,
   actualRealWebWorkers:workerFactory===null?physicalWorkers:0,
   injectedTestWorkerObjects:workerFactory!==null?physicalWorkers:0,
   virtualLanesAreNotPhysicalCPUCoreCount:true,
   actualPhysicalCPUCoreCountVerified:false,
   selectedMode:workerFactory===null?'REAL_WEB_WORKER_VIRTUAL_TASK_MULTIPLEX':
    'QA_INJECTED_WORKER_QUEUE',
   workerTaskCounts:taskCount,workQueuePeakPendingTasks:virtualLanes,
   peakSimultaneouslyActiveWorkerTasks:peakActive,
   sourcePackedBytes:packed.byteLength,
   maxPendingWorkerPacketBytes:packed.byteLength*2,
   measuredSerialWallMs:round(serialTotalMs),
   measuredVPUWallMs:round(vpMs),
   measuredObservedVPUvsSerialRatio:vpMs?round(serialTotalMs/vpMs):null,
   serialResultMatchesVPU:true,originalTriangleOrderPreserved:true,
   originalOBJModified:false,trueGPUAccelerationCertified:false,
   deviceThermalCertified:false,stableDevice60FPSCertified:false,
   globalTwoTimesFasterCertified:false,releasePASS:false
  };
 }finally{
  for(const worker of workerList)worker.terminate();
 }
}
