import test from 'node:test';
import assert from 'node:assert/strict';
import {createAIG3DScene,createAIG3DMesh,addAIG3DNode}
 from '../aig-real3d-core.mjs';
import {inspectAIGReal3DPersistentGPUPosePool,AIG_REAL3D_PERSISTENT_POOL_SCHEMA}
 from '../aig-real3d-persistent-gpu-pose-pool.mjs';
function pose(z){
 const count=1010,positions=[],normals=[],indices=[];
 for(let i=0;i<count;i++){
  const t=i*2*Math.PI/count;
  positions.push(Math.cos(t),Math.sin(t),z+(i%11)*.001);
  normals.push(0,0,1);
 }
 for(let i=1;i<=1002;i++)indices.push(0,i,i+1,0,i+1,i+2);
 const scene=createAIG3DScene({id:'NONHUMAN_PERSISTENT_ORIGINAL',
  consumer:'FastModel',units:'METERS',source:'ORIGINAL_NONHUMAN'});
 addAIG3DNode(scene,{
  id:'real_original_indexed_0',kind:'character',
  mesh:createAIG3DMesh({positions,normals,indices,
   provenance:'ORIGINAL_INDEXED_NONHUMAN_SHA_CONTRACT'}),
  material:{baseColor:[.6,.5,.4,1],roughness:.9,metallic:0}
 });
 return scene;
}
function renderer({leak=false,earlyCrash=false}={}){
 let created=0,deleted=0,fullUploads=0,uploaded=0,
  sub=0,incremental=0,active=0,dead=false,renders=0;
 const state=()=>({
  schema:'AIG_REAL3D_GPU_OWNED_BUFFER_LIFECYCLE_V1',
  activeTrackedOwnedGPUBufferCount:active,
  totalOwnedGPUBuffersCreated:created,
  totalOwnedGPUBuffersDeleted:deleted,
  ownedGPUBufferAllocationBalance:created-deleted,
  fullBufferDataUploads:fullUploads,
  bufferSubDataUpdates:sub,
  fullBufferBytesUploaded:uploaded,
  incrementalBytesUploaded:incremental,
  rendererDestroyed:dead
 });
 return {
  render(scene){
   if(!active){active=3;created+=3;fullUploads+=3;uploaded+=21024;}
   if(leak&&renders++===8){created+=3;active+=3;fullUploads+=3;uploaded+=900;}
   if(earlyCrash&&renders++===4)throw Error('INJECTED_GPU_CONTEXT_FAILURE');
   return {status:'WEBGL_XYZ_TRIANGLES_RENDERED',
    triangles:scene.nodes[0].mesh.triangleCount};
  },
  updateMeshVertices(mesh,{positions,normals,changedVertexIndices}){
   sub+=2;incremental+=changedVertexIndices.length*24;
   for(const i of changedVertexIndices)for(let j=0;j<3;j++){
    mesh.positions[i*3+j]=positions[i*3+j];
    mesh.normals[i*3+j]=normals[i*3+j];
   }
   return {changedVertexCount:changedVertexIndices.length,
    positionSubDataCalls:1,normalSubDataCalls:1,
    originalIndexBufferReused:true,fullGPUBufferReallocation:false};
  },
  releaseMesh(){if(!active)return false;deleted+=active;active=0;return true;},
  getGPUResourceAccounting:state,
  destroy(){deleted+=active;active=0;dead=true;}
 };
}
const makeTimer=()=>{let t=0;return resolve=>resolve(t+=16.667);};
test('Three 72-rAF source mesh sequences share one live VBO/EBO pool, with exact teardown',async()=>{
 const poses=[pose(0),pose(.03),pose(-.02)];
 const originals=poses.map(s=>JSON.stringify(s.nodes[0].mesh));
 const report=await inspectAIGReal3DPersistentGPUPosePool({
  renderer:renderer(),poseScenes:poses,segments:3,
  rafCallbacksPerSegment:72,mode:'AUTO',requestFrame:makeTimer(),
  readMemory:()=>({used:null,limit:null}),readVisibility:()=> 'visible'
 });
 assert.equal(report.schema,AIG_REAL3D_PERSISTENT_POOL_SCHEMA);
 assert.equal(report.segmentsCompleted,3);
 assert.equal(report.requestedRafCallbacksTotal,216);
 assert.ok(report.genuineSourceIndexedGPUDraws>10);
 assert.equal(report.gpuPoolInitiallyAllocatedBuffers,3);
 assert.equal(report.fullGPUBufferReallocationsAfterWarmup,0);
 assert.ok(report.realGPUBufferSubDataUpdates>10);
 assert.ok(report.segments.every(x=>
  x.fullGPUBufferUploadsSinceLastSegment===0&&
  x.indexVBOsAllocatedSinceLastSegment===0&&
  x.realSourceIndexedGPUFrames>1));
 assert.equal(report.ownedGPUResourceAccountAfterDestroy.totalOwnedGPUBuffersCreated,3);
 assert.equal(report.ownedGPUResourceAccountAfterDestroy.totalOwnedGPUBuffersDeleted,3);
 assert.equal(report.ownedGPUResourceAccountAfterDestroy.activeTrackedOwnedGPUBufferCount,0);
 assert.equal(report.originalPoseReferencesUnmodified,true);
 assert.deepEqual(poses.map(s=>JSON.stringify(s.nodes[0].mesh)),originals);
 assert.equal(report.actualDeviceTemperatureCelsius,null);
 assert.equal(report.realGPUDriverVRAMUsageBytes,null);
 assert.equal(report.realAndroidWindowsFPSAndSustainedThermalGatePASS,false);
 assert.equal(report.releasePASS,false);
});
test('Injected repeated full GPU allocation mid-series is BLOCK, never call it successful pooling',async()=>{
 await assert.rejects(inspectAIGReal3DPersistentGPUPosePool({
  renderer:renderer({leak:true}),poseScenes:[pose(0),pose(.03)],
  segments:3,rafCallbacksPerSegment:36,
  requestFrame:makeTimer(),readMemory:()=>({used:null,limit:null})
 }),/REAL3D_PERSISTENT_POOL_GPU_BUFFER_POOL_GREW_DURING_FRAMES/);
});
test('Failure during a GPU frame still releases original indexed GPU resources',async()=>{
 const gpu=renderer({earlyCrash:true});
 await assert.rejects(inspectAIGReal3DPersistentGPUPosePool({
  renderer:gpu,poseScenes:[pose(0),pose(.03)],
  segments:2,rafCallbacksPerSegment:36,
  requestFrame:makeTimer(),readMemory:()=>({used:null,limit:null})
 }),/INJECTED_GPU_CONTEXT_FAILURE/);
 const state=gpu.getGPUResourceAccounting();
 assert.equal(state.rendererDestroyed,true);
 assert.equal(state.ownedGPUBufferAllocationBalance,0);
});
test('Hidden document or critical JS heap cannot claim meaningful source playback; fail closed',async()=>{
 for(const read of [
  {readVisibility:()=> 'hidden',readMemory:()=>({used:null,limit:null})},
  {readVisibility:()=> 'visible',readMemory:()=>({used:99,limit:100})}
 ]){
  const gpu=renderer();
  await assert.rejects(inspectAIGReal3DPersistentGPUPosePool({
   renderer:gpu,poseScenes:[pose(0),pose(.03)],
   segments:2,rafCallbacksPerSegment:36,
   requestFrame:makeTimer(),...read
  }),/REAL3D_PERSISTENT_POOL_INSUFFICIENT_REAL_SOURCE_GPU_FRAMES_PER_SEGMENT/);
  assert.equal(gpu.getGPUResourceAccounting().ownedGPUBufferAllocationBalance,0);
 }
});
test('Invalid source mesh and oversize plans cannot bypass original topology and budget gate',async()=>{
 await assert.rejects(inspectAIGReal3DPersistentGPUPosePool({
  renderer:renderer(),poseScenes:[pose(0),pose(.01)],
  segments:7,rafCallbacksPerSegment:72,requestFrame:makeTimer()
 }),/REAL3D_PERSISTENT_POOL_TRUE_SOURCE_AND_BOUNDED_GPU_PLAN_REQUIRED/);
 await assert.rejects(inspectAIGReal3DPersistentGPUPosePool({
  renderer:renderer(),poseScenes:[pose(0),pose(.01)],
  segments:2,rafCallbacksPerSegment:36,requestFrame:makeTimer(),
  maxFullGPUUploadBytes:100
 }),/REAL3D_PERSISTENT_POOL_GPU_PREALLOCATION_BUDGET_EXCEEDED/);
});
