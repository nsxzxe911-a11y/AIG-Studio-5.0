import test from 'node:test';
import assert from 'node:assert/strict';
import {createAIG3DScene,createAIG3DBox,addAIG3DNode,
 getAIG3DWorldMatrix,transformAIG3DPoint}
 from '../aig-real3d-core.mjs';
import {createAIGReal3DMetric4KWorkingScene,createAIGReal3DMetric4KCamera}
 from '../aig-real3d-v105-metric-4k-adapter.mjs';
import {auditAIGReal3D4KSourceProjection}
 from '../aig-real3d-v96-native-4k-pipeline.mjs';
const sha='b'.repeat(64);
test('V105 actual CNC mm source root+child world coordinates convert 1:1000 for native V96 metric 4K without mesh edits',()=>{
 const source=createAIG3DScene({id:'CNCMM',consumer:'AIG-Studio-5.0',
  units:'MM',source:'ORIGINAL_CNC_MM_WORKPIECE'});
 const mesh=createAIG3DBox([2,4,6],'REAL_CNC_CAD_INDEXED_XYZ'),
  childMesh=createAIG3DBox([1,1,1],'REAL_CNC_SIDE_ATTACHMENT');
 addAIG3DNode(source,{id:'FixtureBase',mesh,kind:'fixture',
  transform:{position:[120,40,30],rotationDeg:[0,25,0],scale:[1,1,1]},
  source:'CALIBRATED_CNC_FIXTURE'});
 addAIG3DNode(source,{id:'ToolChild',parentId:'FixtureBase',mesh:childMesh,
  kind:'tool',transform:{position:[10,3,2]},
  source:'ORIGINAL_CNC_TOOL'});
 const original=JSON.stringify(source),
  metric=createAIGReal3DMetric4KWorkingScene(source);
 assert.equal(metric.scaleApplied,.001);
 assert.equal(metric.scene.units,'METERS');
 assert.equal(metric.scene.nodes[0].mesh,source.nodes[0].mesh);
 assert.equal(metric.scene.nodes[1].mesh,source.nodes[1].mesh);
 assert.equal(metric.scene.nodes[0].mesh.indices.length,source.nodes[0].mesh.indices.length);
 for(const id of ['FixtureBase','ToolChild']){
  const orig=transformAIG3DPoint(getAIG3DWorldMatrix(source,id),[0,0,0]);
  const met=transformAIG3DPoint(getAIG3DWorldMatrix(metric.scene,id),[0,0,0]);
  orig.forEach((v,i)=>assert.ok(Math.abs(met[i]*1000-v)<1e-8));
 }
 const originalCam={projection:'orthographic',yaw:0,pitch:.2,
  orthoSpan:500,distance:600,focus:[120,40,30],fovDeg:55};
 const camera=createAIGReal3DMetric4KCamera(originalCam,{sceneUnits:'MM'});
 assert.equal(camera.orthoSpan,.5);
 assert.equal(camera.distance,.6);
 assert.deepEqual(camera.focus,[.12,.04,.03]);
 const qa=auditAIGReal3D4KSourceProjection({
  scene:metric.scene,sourceSha256:sha,camera,
  width:3840,height:2160});
 assert.equal(qa.width,3840);
 assert.equal(qa.height,2160);
 assert.equal(qa.sourceTriangles,24);
 assert.equal(JSON.stringify(source),original);
});
test('V105 METERS default original pass-through needs no surrogate remesh',()=>{
 const scene=createAIG3DScene({id:'OriginalMeters',consumer:'FastModel',
  units:'METERS',source:'REAL_SOURCE_MESH'});
 addAIG3DNode(scene,{id:'Actor',mesh:createAIG3DBox([1,2,1]),
  source:'IMPORTED_SOURCE'});
 const view=createAIGReal3DMetric4KWorkingScene(scene);
 assert.equal(view.scene,scene);
 assert.equal(view.scaleApplied,1);
 assert.equal(view.originalMeshDataNeverModified,true);
});
test('V105 reject unauthenticated units and invalid camera',()=>{
 assert.throws(()=>createAIGReal3DMetric4KWorkingScene({
  schema:'FAKE2D',nodes:[],units:'MM'}),/REAL_SOURCE_SCENE_REQUIRED/);
 assert.throws(()=>createAIGReal3DMetric4KCamera({
  projection:'orthographic',focus:[0,0],orthoSpan:1,
  distance:5,fovDeg:55,yaw:0,pitch:0}),/SOURCE_CAMERA_REQUIRED/);
});
