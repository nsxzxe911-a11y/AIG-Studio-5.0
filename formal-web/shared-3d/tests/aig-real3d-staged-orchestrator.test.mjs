import test from 'node:test';
import assert from 'node:assert/strict';
import {createAIG3DScene,createAIG3DMesh,addAIG3DNode}
 from '../aig-real3d-core.mjs';
import {inspectAIGReal3DStrainSerial} from '../aig-real3d-quad-strain-pool.mjs';
import {inspectAIGQuadStrainPacket} from '../aig-real3d-quad-strain-task.mjs';
import {coordinateAIGReal3DStages,AIG_REAL3D_V83_SCHEMA}
 from '../aig-real3d-staged-orchestrator.mjs';
const sourceSha256='a'.repeat(64),rings=50,cols=32,
  original=new Float32Array(rings*cols*3),
  indices=new Uint32Array((rings-1)*cols*6),normals=[];
for(let y=0;y<rings;y++)for(let c=0;c<cols;c++){
 const th=c*Math.PI*2/cols,k=(y*cols+c)*3;
 original.set([.5*Math.cos(th),y/rings,.5*Math.sin(th)],k);
 normals.push(Math.cos(th),0,Math.sin(th));
}
let at=0;
for(let y=0;y<rings-1;y++)for(let c=0;c<cols;c++){
 const a=y*cols+c,b=y*cols+(c+1)%cols,
  d=(y+1)*cols+(c+1)%cols,e=(y+1)*cols+c;
 indices.set([a,b,d,a,d,e],at);at+=6;
}
const sourceTriangleCount=indices.length/3;
const allOffsets=Uint32Array.from({length:sourceTriangleCount},(_,i)=>i*3);
function makeFrames(offsets=allOffsets){
 const poseXYZ=[0,.025,-.08].map(change=>{
  const p=new Float32Array(original);
  for(let y=19;y<29;y++)for(let c=0;c<cols;c++)
   p[(y*cols+c)*3]+=.08*change;
  return p;
 });
 function scene(positions){
  const s=createAIG3DScene({id:'ORIGINAL_INDEXED_NONHUMAN_SOURCE',
   consumer:'FastModel',units:'METERS',source:'NONHUMAN_ORIGINAL_OBJ_QA'});
  addAIG3DNode(s,{id:'native_source_0',kind:'character',
   mesh:createAIG3DMesh({
    positions:Array.from(positions),normals,indices:Array.from(indices),
    provenance:'NONHUMAN_SHA_BOUND_ORIGINAL_SOURCE_QA'}),
   material:{baseColor:[.6,.5,.4,1],roughness:.9,metallic:0}});
  return s;
 }
 const poseScenes=poseXYZ.map(scene),frameEvidence=poseXYZ.map((posed,i)=>({
  sampleIndex:i,
  deformation:inspectAIGReal3DStrainSerial({
   original,posed,indices,triangleOffsets:offsets}),
  contact:{observedContactAtSample:false,budgetExhausted:false},
  sweptRiskFromPriorSample:i===0?null:{
   intervalNeedsNarrowerSamplingOrFurtherCollisionReview:i===2,
   budgetExhausted:false}
 }));
 const gpuFrameEvidence=poseXYZ.map((_,i)=>({
  sampleIndex:i,sha256:'b'.repeat(64),width:1080,height:1920,
  sourceTriangles:sourceTriangleCount
 }));
 return {sourceSha256,original,indices,triangleOffsets:offsets,
  posedSources:poseXYZ,poseScenes,frameEvidence,gpuFrameEvidence};
}
class RealComputationMockWorker{
 constructor(id,history,bad=false){
  this.id=id;this.history=history;this.bad=bad;this.dead=false;
  this.listeners={message:new Set(),error:new Set()};
 }
 addEventListener(t,fn){this.listeners[t].add(fn);}
 removeEventListener(t,fn){this.listeners[t].delete(fn);}
 postMessage({id,packed}){
  this.history.push({id:this.id,job:id});
  queueMicrotask(()=>{
   const result=inspectAIGQuadStrainPacket(new Float32Array(packed));
   if(this.bad)result.changedSourceTriangles++;
   for(const cb of this.listeners.message)cb({data:{id,ok:true,result}});
  });
 }
 terminate(){this.dead=true;}
}
function fakeGPU({failDraw=false,leak=false}={}){
 let created=0,deleted=0,active=0,fullUploads=0,bytes=0,
  destroyed=false,sub=0,draws=0;
 const state=()=>({
  activeTrackedOwnedGPUBufferCount:active,
  totalOwnedGPUBuffersCreated:created,
  totalOwnedGPUBuffersDeleted:deleted,
  ownedGPUBufferAllocationBalance:created-deleted,
  fullBufferDataUploads:fullUploads,fullBufferBytesUploaded:bytes,
  bufferSubDataUpdates:sub,rendererDestroyed:destroyed
 });
 return {
  render(scene){
   if(!active){created+=3;active+=3;fullUploads+=3;bytes+=24000;}
   draws++;
   if(failDraw&&draws===2)throw Error('INJECTED_GPU_DISCONNECT');
   if(leak&&draws===2){created+=3;active+=3;fullUploads+=3;bytes+=24000;}
   return {status:'WEBGL_XYZ_TRIANGLES_RENDERED',
    triangles:scene.nodes.reduce((n,x)=>n+x.mesh.triangleCount,0)};
  },
  updateMeshVertices(mesh,args){
   sub+=2;
   for(const id of args.changedVertexIndices)
    for(let c=0;c<3;c++){
     mesh.positions[id*3+c]=args.positions[id*3+c];
     mesh.normals[id*3+c]=args.normals[id*3+c];
    }
   return {originalIndexBufferReused:true,fullGPUBufferReallocation:false,
    changedVertexCount:args.changedVertexIndices.length,
    positionSubDataCalls:1,normalSubDataCalls:1};
  },
  getGPUResourceAccounting:state,
  releaseMesh(){if(!active)return false;deleted+=active;active=0;return true;},
  destroy(){deleted+=active;active=0;destroyed=true;}
 };
}
test('V83 genuine source data moves strictly geometry -> FK -> collision -> GPU, and all worker/GPU resources close',async()=>{
 const sample=makeFrames(),workers=[],history=[],renderer=fakeGPU();
 const sourceBefore=Array.from(original),idxBefore=Array.from(indices);
 const result=await coordinateAIGReal3DStages({
  ...sample,renderer,requestedWorkers:'AUTO',hardwareConcurrency:8,
  virtualLanes:16,workerFactory:i=>{
   const w=new RealComputationMockWorker(i,history);workers.push(w);return w;
  }
 });
 assert.equal(result.schema,AIG_REAL3D_V83_SCHEMA);
 assert.deepEqual(result.stageOrder,[
  'ORIGINAL_INDEXED_GEOMETRY','SOURCE_FK_POSE',
  'SAMPLED_CONTACT_AND_SWEPT_RISK','GENUINE_GPU_FRAMES']);
 assert.equal(result.selectedWorkers,4);
 assert.equal(result.virtualTasksExecuted,48);
 assert.equal(workers.length,4);
 assert.equal(history.length,48);
 assert.ok(workers.every(w=>w.dead));
 assert.ok(result.workerResults.every(x=>x.sourceFKStrainParity));
 assert.ok(result.gpuDraws.slice(1).every(x=>x.frameReusedOriginalGPUBuffers));
 assert.equal(result.stages[2].possibleSweptCollisionIntervals,true);
 assert.equal(result.stages[2].continuousTimeCollisionFreeGuaranteed,false);
 assert.equal(result.overallReleasePASS,false);
 assert.equal(result.originalSourceXYZAndFaceIndicesUnmodified,true);
 assert.deepEqual(Array.from(original),sourceBefore);
 assert.deepEqual(Array.from(indices),idxBefore);
 assert.equal(renderer.getGPUResourceAccounting().ownedGPUBufferAllocationBalance,0);
});
test('Small affected source region selects true serial and does not create virtual hardware cores',async()=>{
 const sample=makeFrames(allOffsets.slice(0,32)),gpu=fakeGPU();
 const result=await coordinateAIGReal3DStages({
  ...sample,renderer:gpu,requestedWorkers:'AUTO',hardwareConcurrency:8
 });
 assert.equal(result.selectedWorkers,1);
 assert.equal(result.actualRealWorkerCreations,0);
 assert.equal(result.virtualTasksExecuted,0);
 assert.ok(result.workerResults.every(x=>x.processingMode==='SERIAL_SMALL_WORKLOAD'));
 assert.equal(gpu.getGPUResourceAccounting().ownedGPUBufferAllocationBalance,0);
});
test('Unexpected GPU full-upload or GPU failure immediately BLOCK and clean the worker pool',async()=>{
 for(const mode of ['leak','failDraw']){
  const workers=[],gpu=fakeGPU({[mode]:true});
  await assert.rejects(coordinateAIGReal3DStages({
   ...makeFrames(),renderer:gpu,requestedWorkers:4,hardwareConcurrency:8,
   workerFactory:i=>{
    const w=new RealComputationMockWorker(i,[]);workers.push(w);return w;
   }
  }),/REAL3D_V83_GPU_BUFFER_REALLOCATION_BETWEEN_POSES|INJECTED_GPU_DISCONNECT/);
  assert.ok(workers.every(w=>w.dead));
  assert.equal(gpu.getGPUResourceAccounting().ownedGPUBufferAllocationBalance,0);
 }
});
test('Broken 3D GPU source chain and unknown collision evidence never produce a false PASS',async()=>{
 const sample=makeFrames(),gpu=fakeGPU();
 sample.gpuFrameEvidence[1].sha256='BROKEN';
 await assert.rejects(coordinateAIGReal3DStages({
  ...sample,renderer:gpu
 }),/REAL3D_V83_EXISTING_NATIVE_GPU_FRAME_EVIDENCE_INVALID/);
 assert.equal(gpu.getGPUResourceAccounting().rendererDestroyed,true);
 const bad=makeFrames();bad.frameEvidence[1].contact=null;
 await assert.rejects(coordinateAIGReal3DStages({
  ...bad,renderer:fakeGPU()
 }),/REAL3D_V83_GPU_FRAME_SOURCE_FK_NOT_MATCHED|REAL3D_V83_SOURCE_CONTACT_AND_SWEPT_EVIDENCE_REQUIRED/);
});
test('V83 refuses trusted source pose strain discrepancies even if parallel output agrees with serial',async()=>{
 const sample=makeFrames();sample.frameEvidence[2].deformation.changedSourceTriangles++;
 const workers=[],gpu=fakeGPU();
 await assert.rejects(coordinateAIGReal3DStages({
  ...sample,renderer:gpu,requestedWorkers:2,
  workerFactory:i=>{const w=new RealComputationMockWorker(i,[]);workers.push(w);return w;}
 }),/REAL3D_V83_SOURCE_FK_STRAIN_PARITY_changedSourceTriangles/);
 assert.ok(workers.every(w=>w.dead));
 assert.equal(gpu.getGPUResourceAccounting().ownedGPUBufferAllocationBalance,0);
});
