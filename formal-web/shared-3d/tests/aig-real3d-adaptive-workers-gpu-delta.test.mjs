import test from 'node:test';
import assert from 'node:assert/strict';
import {runAIGReal3DQuadStrain} from '../aig-real3d-quad-strain-pool.mjs';
import {applyAIGReal3DSourceMeshDelta} from '../aig-real3d-gpu-delta-source.mjs';
import {createAIG3DScene,createAIG3DMesh,addAIG3DNode} from '../aig-real3d-core.mjs';
const source=new Float32Array([
 0,0,0,1,0,0,0,1,0, 0,0,1,1,0,1,0,1,1
]);
const indices=new Uint32Array([0,1,2,3,4,5]);
const triangleOffsets=new Uint32Array([0,3]);
test('True 1/2/4 API falls back honestly in Node without browser Worker',async()=>{
 for(const count of [1,2,4]){
  const result=await runAIGReal3DQuadStrain({
   original:source,posed:new Float32Array(source),indices,triangleOffsets,
   requestedWorkers:count,minimumTrianglesForWorkers:1,forceFour:count>1
  });
  assert.equal(result.actualWorkerLanes,0);
  assert.equal(result.result.inspectedOriginalTriangles,2);
  assert.equal(result.parallelEquivalentToSerial,true);
  assert.equal(result.twoTimesFasterClaimSupported,false);
 }
 await assert.rejects(runAIGReal3DQuadStrain({
  original:source,posed:new Float32Array(source),indices,triangleOffsets,
  requestedWorkers:3
 }),/QUAD_SCHEDULER_CONFIG_INVALID/);
});
function scene(z=1,changeTopology=false){
 const m=createAIG3DMesh({
  positions:[0,0,0,1,0,0,0,1,0,0,0,z,1,0,z,0,1,z],
  normals:[0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1],
  indices:changeTopology?[0,2,1,3,4,5]:[0,1,2,3,4,5],
  provenance:'ORIGINAL_GLOBAL_NONHUMAN_SOURCE_TEST'
 });
 const s=createAIG3DScene({
  id:'real3dGPUUpdateFixture',consumer:'FastModel',
  units:'METERS',source:'NONHUMAN_SOURCE'
 });
 addAIG3DNode(s,{
  id:'posed_source_node',mesh:m,kind:'character',
  source:'NONHUMAN_ORIGINAL_INDEXED_QA',
  material:{baseColor:[.75,.65,.55,1],roughness:.8,metallic:0,doubleSided:true}
 });
 return s;
}
test('Changed native source vertices update once in stable scene without touching original index buffers',()=>{
 const live=scene(),next=scene(1.25),calls=[];
 const renderer={updateMeshVertices(mesh,args){
  calls.push({...args,positions:[...args.positions],normals:[...args.normals]});
  for(const id of args.changedVertexIndices)
   for(let k=0;k<3;k++){
    mesh.positions[3*id+k]=args.positions[3*id+k];
    mesh.normals[3*id+k]=args.normals[3*id+k];
   }
  return {changedVertexCount:args.changedVertexIndices.length,
   positionSubDataCalls:1,normalSubDataCalls:1,
   originalIndexBufferReused:true,fullGPUBufferReallocation:false};
 }};
 const originalIndices=[...live.nodes[0].mesh.indices];
 const result=applyAIGReal3DSourceMeshDelta({renderer,liveScene:live,nextScene:next});
 assert.equal(result.gpuNodesActuallyUpdated,1);
 assert.equal(result.changedOriginalLocalVertices,3);
 assert.equal(result.gpuBufferSubDataCalls,2);
 assert.deepEqual(calls[0].changedVertexIndices,[3,4,5]);
 assert.deepEqual(live.nodes[0].mesh.positions,next.nodes[0].mesh.positions);
 assert.deepEqual(live.nodes[0].mesh.indices,originalIndices);
 const again=applyAIGReal3DSourceMeshDelta({renderer,liveScene:live,nextScene:next});
 assert.equal(again.gpuNodesActuallyUpdated,0);
 assert.equal(again.gpuBufferSubDataCalls,0);
 assert.equal(result.releasePASS,false);
});
test('Mismatched source faces/provenance BLOCK before GPU mutation',()=>{
 const live=scene(),bad=scene(1.2,true);
 let called=0;
 const renderer={updateMeshVertices(){called++;return {};}};
 assert.throws(()=>applyAIGReal3DSourceMeshDelta({
  renderer,liveScene:live,nextScene:bad
 }),/REAL3D_GPU_DELTA_ORIGINAL_INDEXED_SOURCE_TOPOLOGY_MISMATCH/);
 assert.equal(called,0);
 const changedProvenance=scene(1.2);
 changedProvenance.nodes[0].mesh.provenance='WRONG_SOURCE';
 assert.throws(()=>applyAIGReal3DSourceMeshDelta({
  renderer,liveScene:live,nextScene:changedProvenance
 }),/REAL3D_GPU_DELTA_ORIGINAL_INDEXED_SOURCE_TOPOLOGY_MISMATCH/);
 assert.equal(called,0);
});
