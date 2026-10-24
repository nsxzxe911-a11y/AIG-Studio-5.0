import test from 'node:test';
import assert from 'node:assert/strict';
import {createAIG3DScene,createAIG3DBox,addAIG3DNode}
 from '../aig-real3d-core.mjs';
import {createAIGReal3DTopCADObservation,
 convertAIGReal3DWorldToCNC} from '../aig-real3d-v104-cad-top-first.mjs';
import {compareAndRegisterAIGReal3DTopCAD}
 from '../aig-real3d-v105-cad-silhouette-registration.mjs';
const sha='a'.repeat(64);
function cube(units='MM'){
 const s=createAIG3DScene({id:'TestCADSource',consumer:'AIG-Studio-5.0',
  units,source:'V105_ACTUAL_XYZ_SOURCE_ORIGINAL'});
 const u=units==='MM'?1:.001;
 const node=addAIG3DNode(s,{id:'Workpiece',kind:'stock',
  mesh:createAIG3DBox([2*u,4*u,6*u],
   'V105_REAL_INDEXED_MODEL'),
  source:'AUTHORIZED_MEASURED_CAD_TEST_MODEL'});
 node.mesh.uvs=Array.from({length:node.mesh.vertexCount*2},(_,i)=>i%2);
 node.mesh.tangents=Array.from({length:node.mesh.vertexCount*4},(_,i)=>i%4===3?1:0);
 return s;
}
function observed(offset=[0,0],status='OBSERVED'){
 const p=[[-1,-3],[1,-3],[1,3],[-1,3]]
  .map(v=>v.map((x,i)=>x+offset[i]));
 return createAIGReal3DTopCADObservation({
  verticesXYmm:p,imageSha256:sha,sourceVisibility:status});
}
test('V105 genuinely matching world-scale original CAD top silhouette = near-unity IoU, no AI mesh rewrite',()=>{
 const scene=cube(),src=JSON.stringify(scene);
 const r=compareAndRegisterAIGReal3DTopCAD({
  scene,originalGLBSha256:sha,observedTopCAD:observed(),
  authorizeTranslation:false,resolution:96,maxTranslationMM:.5});
 assert.ok(r.originalRasterIoU>.97,JSON.stringify({iou:r.originalRasterIoU}));
 assert.ok(r.bestRasterIoU>.97);
 assert.equal(r.status,'OBSERVED_SILHOUETTE_COMPARISON_ONLY_NOT_AUTHORIZED');
 assert.equal(r.workingScene,null);
 assert.equal(r.originalSourceTriangleCount,12);
 assert.equal(r.sourceOriginalSceneNeverMutated,true);
 assert.equal(JSON.stringify(scene),src);
 assert.equal(r.releasePASS,false);
});
test('V105 independent observed XY silhouette guides bounded rigid WORKING copy (not remeshing original)',()=>{
 const s=cube(),source=JSON.stringify(s);
 const r=compareAndRegisterAIGReal3DTopCAD({
  scene:s,originalGLBSha256:sha,observedTopCAD:observed([.28,-.25]),
  maxTranslationMM:.5,authorizeTranslation:true,resolution:96,
  minIoUImprovement:.025});
 assert.equal(r.status,'CAD_XY_REGISTRATION_WORKING_COPY_READY');
 assert.ok(r.bestRasterIoU>r.originalRasterIoU+.04,JSON.stringify(r));
 assert.ok(Math.abs(r.proposedTranslationCNCmm[0]-.28)<.07);
 assert.ok(Math.abs(r.proposedTranslationCNCmm[1]+.25)<.09);
 assert.equal(r.proposedTranslationCNCmm[2],0);
 assert.notEqual(r.workingScene,s);
 assert.notEqual(r.workingScene.nodes[0],s.nodes[0]);
 assert.equal(r.workingScene.nodes[0].mesh,s.nodes[0].mesh);
 assert.equal(r.workingScene.nodes[0].mesh.triangleCount,12);
 assert.deepEqual(r.workingScene.nodes[0].mesh.uvs,s.nodes[0].mesh.uvs);
 assert.deepEqual(r.workingScene.nodes[0].mesh.tangents,s.nodes[0].mesh.tangents);
 const w=convertAIGReal3DWorldToCNC(
  r.workingScene.nodes[0].transform.position,{sceneUnits:s.units});
 assert.ok(Math.abs(w[0]-.28)<.07);
 assert.ok(Math.abs(w[1]+.25)<.09);
 assert.equal(w[2],0);
 assert.equal(r.originalCNCMachineKinematicsNotChanged,true);
 assert.equal(JSON.stringify(s),source);
});
test('V105 AI-estimated CAD may be compared but never registered even with explicit allow',()=>{
 const r=compareAndRegisterAIGReal3DTopCAD({
  scene:cube(),originalGLBSha256:sha,
  observedTopCAD:observed([.29,-.2],'AI_ESTIMATED'),
  authorizeTranslation:true,maxTranslationMM:.5});
 assert.equal(r.status,'BLOCK_AI_ESTIMATED_TOP_CANNOT_REGISTER');
 assert.equal(r.workingScene,null);
 assert.ok(r.bestRasterIoU>r.originalRasterIoU);
 assert.equal(r.independentPhotoFaceOrHairIdentityCertified,false);
});
test('V105 identical XY bounding box but different L-shaped contour is not called a match',()=>{
 const s=cube();
 const L=createAIGReal3DTopCADObservation({
  imageSha256:sha,
  sourceVisibility:'OBSERVED',
  verticesXYmm:[[-1,-3],[1,-3],[1,-1],[0,-1],[0,3],[-1,3]]
 });
 const r=compareAndRegisterAIGReal3DTopCAD({
  scene:s,originalGLBSha256:sha,observedTopCAD:L,
  maxTranslationMM:0,resolution:96});
 assert.ok(r.originalRasterIoU<.8,JSON.stringify(r.originalRasterIoU));
 assert.equal(r.status,'OBSERVED_SILHOUETTE_COMPARISON_ONLY_NOT_AUTHORIZED');
 assert.equal(r.CADSilhouetteObservationNotAutomaticallyOriginalPhoto,true);
});
test('V105 mm and meters models same actual CAD mm silhouette, no fake 1000x correction',()=>{
 const mm=compareAndRegisterAIGReal3DTopCAD({
  scene:cube('MM'),originalGLBSha256:sha,observedTopCAD:observed(),
  resolution:96,maxTranslationMM:0});
 const meters=compareAndRegisterAIGReal3DTopCAD({
  scene:cube('METERS'),originalGLBSha256:sha,observedTopCAD:observed(),
  resolution:96,maxTranslationMM:0});
 assert.ok(Math.abs(mm.originalRasterIoU-meters.originalRasterIoU)<.001);
 assert.equal(mm.originalSourceTriangleCount,meters.originalSourceTriangleCount);
 assert.equal(meters.sourceVertexPositionsNotModified,true);
});
test('V105 self-intersecting CAD, fake GLB and unauthorized plan fail explicitly',()=>{
 const bow=createAIGReal3DTopCADObservation({
  imageSha256:sha,verticesXYmm:[[0,0],[2,2],[0,2],[2,0],[2,3]]
 });
 assert.throws(()=>compareAndRegisterAIGReal3DTopCAD({
  scene:cube(),originalGLBSha256:sha,observedTopCAD:bow
 }),/SELF_INTERSECTING_CAD_OUTLINE_BLOCK/);
 assert.throws(()=>compareAndRegisterAIGReal3DTopCAD({
  scene:cube(),originalGLBSha256:'FAKE',observedTopCAD:observed()
 }),/CALIBRATED_SOURCE_AND_REGISTRATION_GATES_REQUIRED/);
 assert.throws(()=>compareAndRegisterAIGReal3DTopCAD({
  scene:{schema:'FAKE_IMAGE_BILLBOARD',nodes:[]},
  originalGLBSha256:sha,observedTopCAD:observed()
 }),/ORIGINAL_XYZ_SCENE_REQUIRED/);
});
