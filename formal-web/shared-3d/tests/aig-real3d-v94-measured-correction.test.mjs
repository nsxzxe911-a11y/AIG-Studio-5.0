import test from 'node:test';
import assert from 'node:assert/strict';
import {createAIG3DMesh,createAIG3DScene,addAIG3DNode}
 from '../aig-real3d-core.mjs';
import {buildAIGReal3DMeasuredGeometryWorkingCopy}
 from '../aig-real3d-v94-measured-geometry-working-copy.mjs';
const sourceSha='a'.repeat(64),evidence='b'.repeat(64);
function make(){
 const positions=[-1,-1,-1,1,-1,-1,1,1,-1,-1,1,-1,
  -1,-1,1,1,-1,1,1,1,1,-1,1,1];
 const indices=[0,2,1,0,3,2,4,5,6,4,6,7,
  0,1,5,0,5,4,3,7,6,3,6,2,
  1,2,6,1,6,5,0,4,7,0,7,3];
 const mesh=createAIG3DMesh({positions,indices,
  normals:Array.from({length:8},()=>[0,0,1]).flat(),
  provenance:'SOURCED_NONHUMAN_MEASUREMENT_VERTEX_CUBE'});
 const scene=createAIG3DScene({id:'v94Measured',consumer:'FastModel',
  units:'METERS',source:'REAL_FILE_TEST_QA_ORIGINAL_CUBE'});
 addAIG3DNode(scene,{id:'hull',mesh,kind:'object',
  source:'NONHUMAN_MEASURED_EXPLICIT_ORIGINAL'});
 return {mesh,scene};
}
function points(mesh){
 return [0,1,2].map(id=>{
  const p=mesh.positions.slice(3*id,3*id+3);
  return {nodeId:'hull',originalVertexIndex:id,
   measuredLocalXYZMeters:[p[0],p[1],p[2]+.0005],
   evidenceSha256:evidence};
 });
}
test('V94 measured correction changes only externally measured original XYZ and keeps all original indices immutable',()=>{
 const {mesh,scene}=make(),original=JSON.stringify(mesh);
 const patch=buildAIGReal3DMeasuredGeometryWorkingCopy({
  sourceScene:scene,sourceSha256:sourceSha,measurements:points(mesh)
 });
 assert.equal(patch.actualSourceVerticesMoved,3);
 assert.equal(patch.originalSourceTriangleCount,12);
 assert.equal(patch.displayTriangleCount,12);
 assert.equal(patch.componentReports[0].sourceTriangleQuality.sourceMotionGeometryGatePASS,true);
 assert.equal(patch.originalSourceMeshesNeverMutated,true);
 assert.equal(patch.hiddenOrUnobservedGeometryNeverGenerated,true);
 assert.equal(JSON.stringify(mesh),original);
 const working=patch.workingScene.nodes[0].mesh;
 assert.equal(working.indices.join(','),mesh.indices.join(','));
 for(let i=3;i<mesh.vertexCount;i++)
  assert.deepEqual(working.positions.slice(i*3,i*3+3),
   mesh.positions.slice(i*3,i*3+3));
 assert.equal(patch.releasePASS,false);
});
test('V94 measured correction blocks wrong SHA, wrong local unit and unmeasured source extrapolation',()=>{
 const {scene,mesh}=make();
 assert.throws(()=>buildAIGReal3DMeasuredGeometryWorkingCopy({
  sourceScene:scene,sourceSha256:'WRONG',measurements:points(mesh)
 }),/SHA_SCENE_MEASUREMENT_BUDGET_INVALID/);
 const oversized=points(mesh);oversized[0].measuredLocalXYZMeters[2]+=.4;
 assert.throws(()=>buildAIGReal3DMeasuredGeometryWorkingCopy({
  sourceScene:scene,sourceSha256:sourceSha,measurements:oversized
 }),/MEASURED_DISPLACEMENT_EXCEEDS_VERIFIED_LIMIT/);
 const duplicate=points(mesh);duplicate[1].originalVertexIndex=0;
 assert.throws(()=>buildAIGReal3DMeasuredGeometryWorkingCopy({
  sourceScene:scene,sourceSha256:sourceSha,measurements:duplicate
 }),/DUPLICATE_ORIGINAL_VERTEX_MEASUREMENT/);
});
