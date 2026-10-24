import test from 'node:test';
import assert from 'node:assert/strict';
import {createAIG3DMesh,createAIG3DScene,addAIG3DNode}
 from '../aig-real3d-core.mjs';
import {auditAIGReal3DSourceStructure,repairAIGReal3DSourceMesh,
 repairAIGReal3DImportedScene}
 from '../aig-real3d-v101-structure-repair.mjs';

const sha='e'.repeat(64);
function tetra({flipFace=-1,extraDegenerate=false,copies=1}={}){
 const positions=[],normals=[],indices=[];
 const p=[[1,1,1],[-1,-1,1],[-1,1,-1],[1,-1,-1]];
 const f=[[0,2,1],[0,1,3],[0,3,2],[1,2,3]];
 for(let j=0;j<copies;j++){
  const base=positions.length/3;
  for(const v of p){positions.push(v[0]+4*j,v[1],v[2]);normals.push(0,1,0);}
  for(let i=0;i<f.length;i++){
   const face=[...f[i]];
   if(i===flipFace&&j===0)[face[1],face[2]]=[face[2],face[1]];
   indices.push(...face.map(x=>x+base));
  }
 }
 if(extraDegenerate)indices.push(0,0,2);
 return createAIG3DMesh({positions,normals,indices,
  provenance:'V101_REAL_INDEXED_TEST_TOPOLOGY'});
}
test('V101 original orientation bug is diagnosed and repaired in WORKING copy (not just GPU color)',()=>{
 const mesh=tetra({flipFace:0}),source=JSON.stringify(mesh);
 const before=auditAIGReal3DSourceStructure(mesh);
 assert.ok(before.misorientedSharedEdges>0);
 assert.equal(before.openBoundaryEdges,0);
 const fixed=repairAIGReal3DSourceMesh({mesh});
 assert.equal(fixed.status,'STRUCTURE_REPAIR_WORKING_COPY_READY');
 assert.equal(fixed.after.misorientedSharedEdges,0);
 assert.equal(fixed.after.openBoundaryEdges,0);
 assert.equal(fixed.after.nonManifoldEdgeCount,0);
 assert.equal(fixed.after.disconnectedFaceIslands,1);
 assert.ok(fixed.flippedOriginalFaceIDs.length>0);
 assert.equal(fixed.workingMesh.triangleCount,mesh.triangleCount);
 assert.deepEqual(fixed.workingMesh.positions,mesh.positions);
 assert.notDeepEqual(fixed.workingMesh.indices,mesh.indices);
 assert.equal(JSON.stringify(mesh),source);
 assert.equal(fixed.originalVertexXYZNotMoved,true);
 assert.equal(fixed.actualMLModelUsed,false);
 assert.equal(fixed.releasePASS,false);
});
test('V101 degenerates require permission; source-face mapping remains transparent',()=>{
 const mesh=tetra({copies:3,extraDegenerate:true});
 assert.equal(mesh.triangleCount,13);
 const refused=repairAIGReal3DSourceMesh({mesh});
 assert.equal(refused.status,'BLOCK_EXPLICIT_DEGENERATE_REPAIR_APPROVAL_REQUIRED');
 assert.equal(refused.workingMesh,null);
 const accepted=repairAIGReal3DSourceMesh({
  mesh,allowDropDegenerate:true,maxRemovedFraction:.08});
 assert.equal(accepted.status,'STRUCTURE_REPAIR_WORKING_COPY_READY');
 assert.equal(accepted.workingMesh.triangleCount,12);
 assert.deepEqual(accepted.removedOriginalDegenerateFaceIDs,[12]);
 assert.deepEqual(accepted.originalToWorkingFaceIDs,
  Array.from({length:12},(_,i)=>i));
 assert.equal(accepted.after.disconnectedFaceIslands,3);
 assert.equal(accepted.after.openBoundaryEdges,0);
 assert.equal(accepted.sourceOpeningsNeverFabricated,true);
});
test('V101 nonmanifold and duplicate faces never get fabricated repairs',()=>{
 const clean=tetra();
 const base={positions:clean.positions,normals:clean.normals,
  provenance:'V101_REAL_TEST_SOURCE'};
 const manifold=createAIG3DMesh({...base,
  indices:[...clean.indices,0,1,2]});
 assert.equal(repairAIGReal3DSourceMesh({mesh:manifold}).status,
  'BLOCK_NONMANIFOLD_SOURCE');
 const double=createAIG3DMesh({...base,
  indices:[...clean.indices,...clean.indices.slice(0,3)]});
 const status=repairAIGReal3DSourceMesh({mesh:double}).status;
 assert.ok(status==='BLOCK_NONMANIFOLD_SOURCE'||
  status==='BLOCK_DUPLICATE_SOURCE_FACES_REQUIRE_AUTHORITY');
});
test('V101 isolated surface components are retained, not mislabeled as bad anatomy',()=>{
 const mesh=tetra({copies:3});
 const quality=auditAIGReal3DSourceStructure(mesh);
 assert.equal(quality.disconnectedFaceIslands,3);
 const result=repairAIGReal3DSourceMesh({mesh});
 assert.equal(result.after.disconnectedFaceIslands,3);
 assert.equal(result.workingMesh.triangleCount,12);
 assert.equal(result.sourceDisconnectedPartsRetained,true);
 assert.equal(result.anatomicallyRealisticFaceOrHairCertified,false);
});
test('V101 imported V99 scene nodes and original image+model source SHA preserved across backend repair',()=>{
 const scene=createAIG3DScene({id:'v101QASource',consumer:'FastModel',
  units:'METERS',source:'V101_IMPORTED_TEST'});
 const original=tetra({flipFace:0});
 addAIG3DNode(scene,{id:'sourceModel1',kind:'object',mesh:original,
  source:'V99_ACTUAL_GLB_SOURCE'});
 const imported={schema:'AIG_REAL3D_V99_REAL_NATIVE_GENERATED_GLB_SOURCE_V1',
  scene,actualSourceModelSha256:sha,originalImageSha256:sha,
  assetId:'V101ValidOriginal'};
 const result=repairAIGReal3DImportedScene({imported});
 assert.equal(result.status,'WORKING_SCENE_READY_FOR_GPU');
 assert.equal(result.originalAssetId,'V101ValidOriginal');
 assert.equal(result.originalSourceSha256,sha);
 assert.notEqual(result.workingScene,scene);
 assert.notEqual(result.workingScene.nodes[0].mesh,original);
 assert.equal(result.workingScene.nodes[0].mesh.triangleCount,original.triangleCount);
 assert.equal(result.reports[0].after.misorientedSharedEdges,0);
 assert.equal(result.importedV99SourceUnmodified,true);
 assert.equal(result.releasePASS,false);
});
test('V101 unsafe input and unsupported fake mesh cannot be promoted to 3D structural PASS',()=>{
 assert.throws(()=>auditAIGReal3DSourceStructure({
  actualXYZTriangles:false,positions:[],normals:[],indices:[]
 }),/ACTUAL_INDEXED_XYZ_SOURCE_REQUIRED/);
 assert.throws(()=>repairAIGReal3DSourceMesh({
  mesh:tetra(),maxRemovedFraction:1}),/REPAIR_GATES_INVALID/);
 assert.throws(()=>repairAIGReal3DImportedScene({
  imported:{schema:'FAKE_IMAGE_2D',scene:{nodes:[{mesh:tetra()}]}}
 }),/REAL_V99_SOURCE_IMPORT_REQUIRED/);
});

test('V103 V101 backend retains AI-authored UV/tangent maps in safe Working Copy, BLOCKS orientation-unsafe mapped repairs',()=>{
 const mesh=tetra({flipFace:-1});
 mesh.uvs=[0,0,1,0,0,1,1,1];
 mesh.tangents=Array.from({length:4},()=>[1,0,0,1]).flat();
 const source=JSON.stringify(mesh);
 const res=repairAIGReal3DSourceMesh({mesh});
 assert.equal(res.status,'STRUCTURE_REPAIR_WORKING_COPY_READY');
 assert.deepEqual(res.workingMesh.uvs,mesh.uvs);
 assert.deepEqual(res.workingMesh.tangents,mesh.tangents);
 assert.equal(res.originalUVAndTangentsPreservedIfSourceValidated,true);
 assert.equal(JSON.stringify(mesh),source);
 const flipped=tetra({flipFace:0});
 flipped.uvs=[...mesh.uvs];flipped.tangents=[...mesh.tangents];
 const blocked=repairAIGReal3DSourceMesh({mesh:flipped});
 assert.equal(blocked.status,'BLOCK_SOURCE_TEXTURE_TANGENT_REORIENTATION_NEEDS_EVIDENCE');
 assert.equal(blocked.workingMesh,null);
 assert.equal(blocked.releasePASS,false);
});
