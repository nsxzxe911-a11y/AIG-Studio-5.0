import test from 'node:test';
import assert from 'node:assert/strict';
import {createAIG3DScene,createAIG3DMesh,addAIG3DNode}
 from '../aig-real3d-core.mjs';
import {stressAIGReal3DGPUResourceCycles,AIG_REAL3D_GPU_STRESS_SCHEMA}
 from '../aig-real3d-gpu-stress-cycles.mjs';
function fixture(depth){
 const n=1005,positions=[],normals=[],indices=[];
 for(let i=0;i<n;i++){
  const a=2*Math.PI*i/n;
  positions.push(Math.cos(a),Math.sin(a),depth);
  normals.push(0,0,1);
 }
 for(let i=1;i<1002;i++)indices.push(0,i,i+1,0,i+1,(i+2)%n);
 const scene=createAIG3DScene({
  id:'NONHUMAN_REAL_GLOBAL_INDEXED_SOURCE',consumer:'FastModel',
  units:'METERS',source:'NONHUMAN_GENUINE_ORIGINAL'
 });
 addAIG3DNode(scene,{
  id:'original-indexed-source',kind:'character',
  mesh:createAIG3DMesh({positions,normals,indices,
   provenance:'ORIGINAL_GLOBAL_INDEXED_NONHUMAN_QA'}),
  material:{baseColor:[.6,.5,.4,1],roughness:.7,metallic:0}
 });
 return scene;
}
function fakeCycle({broken=false}={}){
 let liveBuffers=0,created=0,deleted=0,sub=0,destroyed=false;
 const renderer={
  render(scene){
   if(liveBuffers===0){liveBuffers=3;created+=3;}
   return {status:'WEBGL_XYZ_TRIANGLES_RENDERED',
    triangles:scene.nodes[0].mesh.triangleCount};
  },
  updateMeshVertices(mesh,{positions,normals,changedVertexIndices}){
   sub+=2;
   for(const id of changedVertexIndices)for(let k=0;k<3;k++){
    mesh.positions[id*3+k]=positions[id*3+k];
    mesh.normals[id*3+k]=normals[id*3+k];
   }
   return {changedVertexCount:changedVertexIndices.length,
    positionSubDataCalls:1,normalSubDataCalls:1,
    originalIndexBufferReused:true,fullGPUBufferReallocation:false};
  },
  releaseMesh(){
   if(broken)return false;
   deleted+=liveBuffers;liveBuffers=0;return true;
  },
  getGPUResourceAccounting(){
   return {
    activeTrackedOwnedGPUBufferCount:liveBuffers,
    totalOwnedGPUBuffersCreated:created,
    totalOwnedGPUBuffersDeleted:deleted,
    ownedGPUBufferAllocationBalance:created-deleted,
    bufferSubDataUpdates:sub,rendererDestroyed:destroyed
   };
  },
  destroy(){deleted+=liveBuffers;liveBuffers=0;destroyed=true;}
 };
 return {renderer,poseScenes:[fixture(0),fixture(.02),fixture(-.03)]};
}
test('Three real source pose rAF stress cycles release every original GPU index/vertex buffer',async()=>{
 let t=0;
 const report=await stressAIGReal3DGPUResourceCycles({
  createCycle:()=>fakeCycle(),cycles:3,rafCallbacksPerCycle:36,
  requestFrame:fn=>fn(t+=16.667),
  readMemory:()=>({used:null,limit:null}),readVisibility:()=> 'visible'
 });
 assert.equal(report.schema,AIG_REAL3D_GPU_STRESS_SCHEMA);
 assert.equal(report.cyclesCompleted,3);
 assert.equal(report.callbacksRequested,108);
 assert.ok(report.actualSourceIndexedDraws>=6);
 assert.ok(report.realGPUBufferSubDataUpdates>0);
 assert.equal(report.everyRendererOwnedGPUBufferFullyReleased,true);
 assert.equal(report.observedHeapEndDifferenceBytes,null);
 for(const cycle of report.records){
  assert.equal(cycle.gpuBufferOwnershipAtPeak.activeTrackedOwnedGPUBufferCount,3);
  assert.equal(cycle.gpuBufferOwnershipAfterRelease.activeTrackedOwnedGPUBufferCount,0);
  assert.equal(cycle.gpuBufferOwnershipAfterDestroy.ownedGPUBufferAllocationBalance,0);
  assert.equal(cycle.thermalTemperatureCelsius,null);
 }
 assert.equal(report.realGPUVRAMUsageBytes,null);
 assert.equal(report.realDeviceStableFPS60_90_120PASS,false);
 assert.equal(report.releasePASS,false);
});
test('GPU release failure BLOCKS, renderer finally still cleans its buffers',async()=>{
 let t=0;
 await assert.rejects(stressAIGReal3DGPUResourceCycles({
  createCycle:()=>fakeCycle({broken:true}),cycles:2,rafCallbacksPerCycle:24,
  requestFrame:fn=>fn(t+=16.667),
  readMemory:()=>({used:null,limit:null})
 }),/REAL3D_GPU_STRESS_GPU_OWNED_BUFFER_NOT_RELEASED/);
});
test('Invalid stress plan or insufficient renderer must not pass',async()=>{
 await assert.rejects(stressAIGReal3DGPUResourceCycles({
  createCycle:()=>({renderer:{},poseScenes:[]}),
  cycles:2,rafCallbacksPerCycle:36,requestFrame:cb=>cb(16)
 }),/REAL3D_GPU_STRESS_REAL_GPU_RENDERER_AND_SOURCE_POSES_REQUIRED/);
 await assert.rejects(stressAIGReal3DGPUResourceCycles({
  createCycle:()=>fakeCycle(),cycles:1,
  requestFrame:cb=>cb(16)
 }),/REAL3D_GPU_STRESS_SOURCE_CYCLE_PLAN_INVALID/);
});
