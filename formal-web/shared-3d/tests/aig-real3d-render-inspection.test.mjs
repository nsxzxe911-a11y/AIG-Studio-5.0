import test from 'node:test';
import assert from 'node:assert/strict';
import {createAIG3DScene,createAIG3DBox,addAIG3DNode}
 from '../aig-real3d-core.mjs';
import {auditAIG3DSourceSilhouette,validateAIGInspectionCapturePlan,
 AIG_INSPECTION_FRAME_SCHEMA} from '../aig-real3d-render-inspection.mjs';
test('Original source XYZ dimensions untouched and ratios unaffected by light',()=>{
 const scene=createAIG3DScene({id:'diagnosticFixture',consumer:'FastModel',
  units:'METERS',source:'LOCAL_DIAGNOSTIC_NONHUMAN_BOX'});
 addAIG3DNode(scene,{id:'nativeSourceBox',mesh:createAIG3DBox([.5,1.8,.3])});
 const src=scene.nodes[0].mesh.positions.join(',');
 const result=auditAIG3DSourceSilhouette(scene);
 assert.equal(result.schema,AIG_INSPECTION_FRAME_SCHEMA);
 assert.equal(result.sourceVertices,24);
 assert.equal(result.sourceTriangles,12);
 assert.ok(Math.abs(result.boundingMeters.widthX-.5)<1e-8);
 assert.ok(Math.abs(result.boundingMeters.heightY-1.8)<1e-8);
 assert.ok(Math.abs(result.boundingMeters.depthZ-.3)<1e-8);
 assert.ok(Math.abs(result.frontProjectedWidthHeightRatio-(.5/1.8))<1e-8);
 assert.ok(Math.abs(result.sideProjectedDepthHeightRatio-(.3/1.8))<1e-8);
 for(const mode of ['LIT','SILHOUETTE','NORMALS','ALBEDO']){
  const cfg=validateAIGInspectionCapturePlan({heightMeters:1.8,mode,angle:'front'});
  assert.equal(cfg.camera.projection,'orthographic');
  assert.equal(cfg.disableBloom,true);
  assert.equal(auditAIG3DSourceSilhouette(scene).frontProjectedWidthHeightRatio,
   result.frontProjectedWidthHeightRatio);
 }
 assert.equal(scene.nodes[0].mesh.positions.join(','),src);
 assert.equal(result.anatomicalVisualApproval,false);
});
test('CNC scene does not get human morphology claims',()=>{
 const scene=createAIG3DScene({id:'fixtureBox',consumer:'AIG-II',units:'METERS'});
 addAIG3DNode(scene,{id:'metalWorkpiece',mesh:createAIG3DBox([2,3,4]),
  kind:'stock'});
 const res=auditAIG3DSourceSilhouette(scene);
 assert.equal(res.frontProjectedWidthHeightRatio,2/3);
 assert.equal(res.sourceAuthenticityVerified,false);
 assert.equal(res.strictReleaseGate,'BLOCK_PENDING_REAL_HUMAN_SOURCE_AND_VISUAL_REVIEW');
});
test('Stable 4 angle camera contracts and invalid options fail',()=>{
 const angles=['front','side','back','threeQuarter'];
 const yaw=angles.map(angle=>validateAIGInspectionCapturePlan({
  heightMeters:1.7,angle,mode:'SILHOUETTE'
 }).camera.yaw);
 assert.deepEqual(yaw,[Math.PI,Math.PI/2,0,Math.PI*1.25]);
 assert.throws(()=>validateAIGInspectionCapturePlan({heightMeters:0}),/FRAME_HEIGHT_RANGE/);
 assert.throws(()=>validateAIGInspectionCapturePlan({heightMeters:1.6,mode:'BLOOM'}),
  /FRAME_INSPECTION_MODE/);
 assert.throws(()=>validateAIGInspectionCapturePlan({heightMeters:1.6,angle:'foo'}),
  /FRAME_CAMERA_ANGLE/);
 assert.throws(()=>auditAIG3DSourceSilhouette({}),/FRAME_SCENE_INVALID/);
});
