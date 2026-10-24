import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectAIGQuadStrainPacket} from '../aig-real3d-quad-strain-task.mjs';
import {createAIGReal3DPersistentVPU,verifyAIGReal3DStageEvidence,
 AIG_REAL3D_PERSISTENT_VPU_SCHEMA} from '../aig-real3d-persistent-vpu.mjs';
const sha='a'.repeat(64),count=4096,original=new Float32Array(count*9),
 indices=new Uint32Array(count*3),triangleOffsets=new Uint32Array(count);
for(let i=0;i<count;i++){
 const j=i*9,z=i*.001;
 original.set([0,0,z,1,0,z,0,1,z],j);
 indices.set([i*3,i*3+1,i*3+2],i*3);
 triangleOffsets[i]=i*3;
}
const pose=angle=>{
 const posed=new Float32Array(original);
 for(let i=0;i<count;i++)posed[i*9+3]+=(i%5)*angle;
 return posed;
};
class TaskWorker{
 constructor(id,history,{corrupt=false}={}){
  this.id=id;this.history=history;this.dead=false;this.bad=corrupt;
  this.listeners={message:new Set(),error:new Set()};
 }
 addEventListener(type,handler){this.listeners[type].add(handler);}
 removeEventListener(type,handler){this.listeners[type].delete(handler);}
 postMessage(packet){
  this.history.push({id:this.id,job:packet.id,bytes:packet.packed.byteLength});
  queueMicrotask(()=>{
   const result=inspectAIGQuadStrainPacket(new Float32Array(packet.packed));
   if(this.bad)result.changedSourceTriangles+=1;
   for(const fn of this.listeners.message)
    fn({data:{id:packet.id,ok:true,result}});
  });
 }
 terminate(){this.dead=true;}
}
test('Three different true source XYZ batches share exactly four Worker objects and 48 virtual tasks',async()=>{
 const created=[],history=[];
 const s=createAIGReal3DPersistentVPU({
  virtualLanes:16,physicalWorkers:4,maxBatches:3,
  workerFactory:i=>{
   const w=new TaskWorker(i,history);created.push(w);return w;
  }
 });
 const reference=Array.from(original),samples=[];
 for(const v of [.01,.04,.09]){
  samples.push(await s.runBatch({
   original,posed:pose(v),indices,triangleOffsets,sourceSha256:sha
  }));
 }
 assert.equal(samples.length,3);
 assert.equal(created.length,4);
 assert.equal(s.stats().batchesCompleted,3);
 assert.equal(s.stats().virtualTasksCompleted,48);
 assert.equal(s.stats().taskDispatches,48);
 assert.equal(s.stats().maxConcurrentRealWorkerTasks,4);
 assert.equal(s.stats().realWebWorkersCreated,0); // mock != browser Worker
 assert.equal(s.stats().injectedQARunnersCreated,4);
 assert.ok(samples.every(x=>
  x.actualWorkerObjectsReused===4&&
  x.genuineWebWorkerCount===0&&x.serialEquivalent));
 assert.equal(history.length,48);
 assert.deepEqual(Array.from(original),reference);
 const close=s.close();
 assert.equal(close.liveWorkerObjects,0);
 assert.equal(close.isClosed,true);
 assert.ok(created.every(w=>w.dead));
 await assert.rejects(s.runBatch({
  original,posed:pose(.01),indices,triangleOffsets,sourceSha256:sha
 }),/REAL3D_PERSISTENT_VPU_SESSION_CLOSED/);
});
test('Corrupt worker output blocks source verification, immediately terminates every worker',async()=>{
 const created=[],session=createAIGReal3DPersistentVPU({
  physicalWorkers:2,virtualLanes:8,
  workerFactory:i=>{
   const w=new TaskWorker(i,[],{corrupt:i===0});created.push(w);return w;
  }
 });
 await assert.rejects(session.runBatch({
  original,posed:pose(.05),indices,triangleOffsets,sourceSha256:sha
 }),/REAL3D_PERSISTENT_VPU_SERIAL_GLOBAL_INDEXED_GEOMETRY_MISMATCH/);
 assert.equal(session.stats().isClosed,true);
 assert.equal(session.stats().closeReason,'FAIL_CLOSED_AFTER_BATCH_ERROR');
 assert.ok(created.every(w=>w.dead));
});
test('Invalid source SHA, oversized packet and batch budget must FAIL and close',async()=>{
 const p=createAIGReal3DPersistentVPU({
  virtualLanes:4,physicalWorkers:2,maxPacketBytes:1024,
  workerFactory:i=>new TaskWorker(i,[])
 });
 await assert.rejects(p.runBatch({
  original,posed:pose(.01),indices,triangleOffsets,sourceSha256:sha
 }),/REAL3D_PERSISTENT_VPU_COMPACT_TRIANGLE_MEMORY_BUDGET/);
 assert.equal(p.stats().liveWorkerObjects,0);
 const q=createAIGReal3DPersistentVPU({
  virtualLanes:4,physicalWorkers:2,maxBatches:2,
  workerFactory:i=>new TaskWorker(i,[])
 });
 for(const angle of [.01,.02])await q.runBatch({
  original,posed:pose(angle),indices,triangleOffsets,sourceSha256:sha
 });
 await assert.rejects(q.runBatch({
  original,posed:pose(.03),indices,triangleOffsets,sourceSha256:sha
 }),/REAL3D_PERSISTENT_VPU_MAX_BATCH_BUDGET/);
 assert.equal(q.stats().isClosed,true);
});
test('Four actual stage evidence links must belong to same SHA and original source triangles',()=>{
 const base={sourceSha256:sha,
  geometry:{sourceSha256:sha,sourceTriangleCount:3000},
  pose:{sourceSha256:sha,sourceTriangleCount:3000},
  contact:{sourceSha256:sha,sampledOriginalTriangleAudit:true},
  gpu:{sourceSha256:sha,frameSha256:['b'.repeat(64),'c'.repeat(64),'d'.repeat(64)]}
 };
 const result=verifyAIGReal3DStageEvidence(base);
 assert.equal(result.stages.length,4);
 assert.equal(result.sampledCollisionSafetyGuaranteed,false);
 assert.equal(result.releasePASS,false);
 assert.throws(()=>verifyAIGReal3DStageEvidence({
  ...base,gpu:{...base.gpu,sourceSha256:'0'.repeat(64)}
 }),/REAL3D_PERSISTENT_VPU_STAGE_EVIDENCE_SOURCE_CHAIN_BLOCK/);
 assert.throws(()=>verifyAIGReal3DStageEvidence({
  ...base,contact:{...base.contact,sampledOriginalTriangleAudit:false}
 }),/REAL3D_PERSISTENT_VPU_STAGE_EVIDENCE_SOURCE_CHAIN_BLOCK/);
});
