import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectAIGQuadStrainPacket} from '../aig-real3d-quad-strain-task.mjs';
import {runAIGReal3DVirtualProcessor,AIG_REAL3D_VPU_SCHEMA}
 from '../aig-real3d-virtual-processor.mjs';
const faces=1024,original=new Float32Array(faces*9),
 posed=new Float32Array(faces*9),indices=new Uint32Array(faces*3),
 offsets=new Uint32Array(faces);
for(let i=0;i<faces;i++){
 const j=i*9,z=i*.002;
 original.set([0,0,z,1,0,z,0,1,z],j);
 posed.set([0,0,z,1+(i%3)*.01,0,z,0,1,z],j);
 indices.set([i*3,i*3+1,i*3+2],i*3);offsets[i]=i*3;
}
class GenuineCalculationMockWorker{
 constructor(index,counts){
  this.index=index;this.listeners={message:new Set(),error:new Set()};
  this.counts=counts;this.dead=false;
 }
 addEventListener(type,handler){this.listeners[type].add(handler);}
 removeEventListener(type,handler){this.listeners[type].delete(handler);}
 postMessage(data){
  if(this.dead)throw Error('DEAD_WORKER');
  this.counts[this.index]=(this.counts[this.index]||0)+1;
  queueMicrotask(()=>{
   const result=inspectAIGQuadStrainPacket(new Float32Array(data.packed));
   for(const cb of this.listeners.message)cb({data:{id:data.id,ok:true,result}});
  });
 }
 terminate(){this.dead=true;}
}
test('16 virtual tasks are executed by ONLY four bounded task runners, original source parity exact',async()=>{
 const creation=[],taskCounts=[];
 const out=await runAIGReal3DVirtualProcessor({
  original,posed,indices,triangleOffsets:offsets,
  virtualLanes:16,physicalWorkers:4,forceParallel:true,
  workerFactory:i=>{
   const instance=new GenuineCalculationMockWorker(i,taskCounts);
   creation.push(instance);return instance;
  }
 });
 assert.equal(out.schema,AIG_REAL3D_VPU_SCHEMA);
 assert.equal(creation.length,4);
 assert.ok(creation.every(w=>w.dead));
 assert.equal(out.actualRealWebWorkers,0); // injected mocks are NOT browser Worker
 assert.equal(out.injectedTestWorkerObjects,4);
 assert.equal(out.actualVirtualTaskLanesExecuted,16);
 assert.equal(out.workerTaskCounts.reduce((a,b)=>a+b,0),16);
 assert.ok(out.workerTaskCounts.every(x=>x>0));
 assert.equal(out.peakSimultaneouslyActiveWorkerTasks,4);
 assert.equal(out.serialResultMatchesVPU,true);
 assert.equal(out.result.inspectedOriginalTriangles,faces);
 assert.equal(out.originalOBJModified,false);
 assert.equal(out.globalTwoTimesFasterCertified,false);
 assert.equal(out.releasePASS,false);
});
test('Small source regions run honestly in serial mode rather than creating fake processors',async()=>{
 const out=await runAIGReal3DVirtualProcessor({
  original,posed,indices,triangleOffsets:new Uint32Array([0,3,6]),
  virtualLanes:16,physicalWorkers:4
 });
 assert.equal(out.actualRealWebWorkers,0);
 assert.equal(out.actualVirtualTaskLanesExecuted,1);
 assert.equal(out.selectedMode,'SERIAL_BECAUSE_SMALL_UNSUPPORTED_OR_BUDGETED');
 assert.equal(out.result.inspectedOriginalTriangles,3);
});
test('Memory cap, fabricated source order, abort and impossible virtual channels all BLOCK',async()=>{
 await assert.rejects(runAIGReal3DVirtualProcessor({
  original,posed,indices,triangleOffsets:offsets,
  maxPackedBytes:1024,virtualLanes:8
 }),/REAL3D_VPU_BOUNDED_TASK_MEMORY_BUDGET_EXCEEDED/);
 await assert.rejects(runAIGReal3DVirtualProcessor({
  original,posed,indices,triangleOffsets:new Uint32Array([3,0])
 }),/QUAD_SOURCE_TRIANGLE_OFFSETS_INVALID/);
 await assert.rejects(runAIGReal3DVirtualProcessor({
  original,posed,indices,triangleOffsets:offsets,virtualLanes:3
 }),/REAL3D_VPU_INVALID_VIRTUAL_SCHEDULER_SETTINGS/);
 const controller=new AbortController();controller.abort();
 await assert.rejects(runAIGReal3DVirtualProcessor({
  original,posed,indices,triangleOffsets:offsets,abortSignal:controller.signal
 }),/REAL3D_VPU_ABORTED/);
});
test('Two real worker slot settings allow sixteen virtual task allocations without falsely claiming sixteen real cores',async()=>{
 const counts=[];
 const r=await runAIGReal3DVirtualProcessor({
  original,posed,indices,triangleOffsets:offsets,
  virtualLanes:16,physicalWorkers:2,forceParallel:true,
  workerFactory:i=>new GenuineCalculationMockWorker(i,counts)
 });
 assert.equal(r.injectedTestWorkerObjects,2);
 assert.equal(r.actualVirtualTaskLanesExecuted,16);
 assert.equal(r.workerTaskCounts.reduce((a,b)=>a+b,0),16);
 assert.equal(r.actualPhysicalCPUCoreCountVerified,false);
 assert.equal(r.trueGPUAccelerationCertified,false);
});
