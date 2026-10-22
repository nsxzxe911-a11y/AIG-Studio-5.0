import test from 'node:test';
import assert from 'node:assert/strict';
import {
 AIG_REAL3D_SCHEMA,AIG_REAL3D_CONSUMERS,
 createAIG3DBox,createAIG3DCylinder,createAIG3DScene,addAIG3DNode,
 addAIG3DToolpathOverlay,updateAIG3DNodeTransform,getAIG3DWorldMatrix,
 transformAIG3DPoint,auditAIG3DScene
} from '../../../../shared-3d/aig-real3d-core.mjs';
import {demoAIG3DScene,createAIG3DCNCReadOnlyScene,
 createAIG3DFastModelReadOnlyScene}
 from '../../../../shared-3d/aig-real3d-adapters.mjs';

test('real 3D indexed triangle mesh exists in XYZ, not a flat background screenshot',()=>{
 const a=createAIG3DBox([2,3,4]),b=createAIG3DCylinder({segments:24});
 assert.equal(a.actualXYZTriangles,true);
 assert.equal(a.vertexCount,24);assert.equal(a.triangleCount,12);
 assert.equal(b.triangleCount,96);
 assert.deepEqual(a.bounds.min,[-1,-1.5,-2]);
 assert.deepEqual(a.bounds.max,[1,1.5,2]);
 assert.ok(b.positions.every(Number.isFinite));
 assert.ok(b.normals.every(Number.isFinite));
});
test('real 3D parent-child RY rotation and translation update both world XYZ',()=>{
 const s=createAIG3DScene({source:'UNIT_TEST_XYZ'});
 const box=createAIG3DBox();
 addAIG3DNode(s,{id:'root',mesh:box,
  transform:{position:[10,0,0],rotationDeg:[0,90,0]}});
 addAIG3DNode(s,{id:'tool',mesh:box,parentId:'root',
  transform:{position:[0,0,2]}});
 const world=transformAIG3DPoint(getAIG3DWorldMatrix(s,'tool'),[0,0,0]);
 assert.ok(Math.abs(world[0]-12)<1e-8);
 assert.ok(Math.abs(world[1])<1e-8);
 assert.ok(Math.abs(world[2])<1e-8);
 updateAIG3DNodeTransform(s,'tool',{position:[0,3,2]});
 const shifted=transformAIG3DPoint(getAIG3DWorldMatrix(s,'tool'),[0,0,0]);
 assert.ok(Math.abs(shifted[1]-3)<1e-8);
 assert.ok(s.revision>=3);
});
test('same shareable SceneGraph can describe all 3 project consumers and explicit units',()=>{
 assert.deepEqual(AIG_REAL3D_CONSUMERS,['FastModel','AIG-II','AIG-Studio-5.0']);
 for(const consumer of AIG_REAL3D_CONSUMERS){
  const s=createAIG3DScene({consumer,units:'MM',source:'SIM_SOURCE_AUDITED'});
  assert.equal(s.schema,AIG_REAL3D_SCHEMA);
  assert.equal(s.consumer,consumer);
  assert.equal(s.materialRemovalVerified,false);
  assert.equal(s.runtimeNCWriteEnabled,false);
 }
});
test('CNC source contracts are read only, and G0/G1 paths remain visual only',()=>{
 const real=createAIG3DCNCReadOnlyScene({
  axisPage:'6AX',sourceKind:'RUNTIME_SNAPSHOT',
  snapshotDigest:'f'.repeat(64),revision:2,
  solids:[{id:'stock',geometry:'box',kind:'stock',
   position:[0,0,0],size:[10,10,8],color:[.65,.55,.4,1]}],
  toolpath:[{from:[0,0,20],to:[1,0,20],motion:'G0'},
   {from:[1,0,20],to:[1,0,0],motion:'G1'}],
  axisValues:{X:10,Y:20,Z:30,A:40,B:50,C:60}});
 const a=auditAIG3DScene(real.scene);
 assert.equal(a.nodeCount,1);assert.equal(a.toolpathSegments,2);
 assert.equal(a.verifiedNCFeedOrStockRemoval,false);
 assert.equal(real.machineKinematicsVerified,false);
 assert.equal(real.actualCNCCommandsSent,0);
 assert.deepEqual(real.axes,['X','Y','Z','A','B','C']);
 assert.equal(real.axisState.C,60);
 assert.throws(()=>createAIG3DCNCReadOnlyScene({
  axisPage:'6AX',sourceKind:'RUNTIME_SNAPSHOT',snapshotDigest:'bad',
  solids:[]}),/READONLY_PROVENANCE_REQUIRED/);
 assert.throws(()=>createAIG3DCNCReadOnlyScene({
  axisPage:'3AX',toolpath:[{from:[0,0,0],to:[0,0,2],motion:'G2'}]}),
  /ONLY_EXPLICIT_LINEAR_SEGMENTS_SUPPORTED/);
});
test('FastModel scene keeps relative scale, no automatic human identity or fake depth',()=>{
 const s=demoAIG3DScene('FastModel');
 assert.equal(s.scene.units,'RELATIVE');
 assert.equal(s.animatedRigVerified,false);
 assert.equal(s.world3DMmInferred,false);
 assert.equal(s.scene.nodes.length,4);
 const proof=auditAIG3DScene(s.scene);
 assert.ok(proof.triangleCount>100);
 assert.equal(proof.verifiedAuthenticMachineModel,false);
});
test('all provided axis demonstration sources are explicit, not authority CNC proof',()=>{
 for(const axis of ['3AX','5AX']){
  const scene=demoAIG3DScene(axis);
  const p=auditAIG3DScene(scene.scene);
  assert.equal(scene.sourceKind,'DEMO_PROCEDURAL');
  assert.ok(p.triangleCount>100);
  assert.equal(p.verifiedAuthenticMachineModel,false);
  assert.equal(p.verifiedNCFeedOrStockRemoval,false);
  assert.equal(scene.materialRemovalVerified,false);
 }
});
test('strict invalid geometry, units and transform data fail closed',()=>{
 assert.throws(()=>createAIG3DBox([-1,1,1]),/VECTOR_INVALID/);
 assert.throws(()=>createAIG3DCylinder({segments:3}),/CYLINDER_PARAMS_INVALID/);
 assert.throws(()=>createAIG3DScene({units:'MAGIC',source:'bad'}),/SCENE_PROVENANCE_INVALID/);
 const s=createAIG3DScene({source:'AUDIT_TEST'});
 const m=createAIG3DBox();
 assert.throws(()=>addAIG3DNode(s,{id:'test',parentId:'unknown',mesh:m}),/PARENT_MISSING/);
 addAIG3DNode(s,{id:'test',mesh:m});
 assert.throws(()=>addAIG3DNode(s,{id:'test',mesh:m}),/NODE_INVALID/);
 assert.throws(()=>updateAIG3DNodeTransform(s,'test',{scale:[1,0,1]}),/VECTOR_INVALID/);
 assert.throws(()=>addAIG3DToolpathOverlay(s,{id:'v',segments:[
  {motion:'G1',from:[0,0,0],to:[Infinity,0,0]}]}),/VECTOR_INVALID/);
});
