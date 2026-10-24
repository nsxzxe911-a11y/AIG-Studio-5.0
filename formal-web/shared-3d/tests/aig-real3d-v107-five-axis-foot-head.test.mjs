import test from 'node:test';
import assert from 'node:assert/strict';
import {createAIG3DScene,createAIG3DBox,addAIG3DNode,transformAIG3DPoint}
 from '../aig-real3d-core.mjs';
import {auditAIGReal3DV107Source,planAIGReal3DV107FiveAxis,
 createAIGReal3DV107IncrementalStage}
 from '../aig-real3d-v107-five-axis-foot-head.mjs';
const sha='c'.repeat(64),near=(a,b,eps=1e-8)=>Math.abs(a-b)<eps;
function cube(units='MM'){
 const s=createAIG3DScene({id:'FastModelDemoSource',consumer:'FastModel',
  units,source:'V107_TRUE_SOURCE_TEST_RIG'});
 const factor=units==='MM'?1:.001;
 const mesh=createAIG3DBox([2*factor,4*factor,6*factor],
  'V107_SOURCE_REAL_INDEXED_CUBE_NO_HUMAN_CLAIM');
 mesh.uvs=Array.from({length:mesh.vertexCount*2},(_,i)=>i%2);
 mesh.tangents=Array.from({length:mesh.vertexCount*4},(_,i)=>i%4===3?1:0);
 addAIG3DNode(s,{id:'ActorSource',mesh,kind:'character',
  source:'TEST_ORIGINAL_IMPORTED_INDEXED_XYZ'});
 return s;
}
test('V107 upper XYZ virtual camera translation respects MM/METERS and not CNC writes',()=>{
 const s=cube(),plan=planAIGReal3DV107FiveAxis({
  scene:s,sourceGLBSha256:sha,topXYZCNCmm:[10,20,30]});
 assert.deepEqual(plan.viewShiftWorld,[10,30,-20]);
 assert.equal(plan.stageDescription.topXYZ.drivesToolOrFanucCNC,false);
 assert.equal(plan.rendererModelPoseSource,'ONE_REAL_INDEXED_XYZ_GLB');
 assert.equal(plan.virtualPoseDoesNotCertifyCNCMachineCollisionSafety,true);
 const m=cube('METERS'),unit=planAIGReal3DV107FiveAxis({
  scene:m,sourceGLBSha256:sha,topXYZCNCmm:[10,20,30]});
 assert.deepEqual(unit.viewShiftWorld,[.01,.03,-.02]);
 assert.equal(unit.sourceGeometryUnmodified,true);
});
test('V107 virtual B is A CHILD and moves around local CNC Z, not world-fixed yaw',()=>{
 const s=cube(),source=JSON.stringify(s);
 const zero=planAIGReal3DV107FiveAxis({
  scene:s,sourceGLBSha256:sha,aTiltDeg:0,bTurnDeg:0});
 const fullTurn=planAIGReal3DV107FiveAxis({
  scene:s,sourceGLBSha256:sha,aTiltDeg:0,bTurnDeg:360});
 for(let i=0;i<16;i++)assert.ok(near(zero.modelStageMatrix[i],
  fullTurn.modelStageMatrix[i]),'0/360 actual stage matrix element '+i);
 assert.deepEqual(zero.childBActualAxis,[0,1,0]);
 const tilted=planAIGReal3DV107FiveAxis({
  scene:s,sourceGLBSha256:sha,aTiltDeg:90,bTurnDeg:90});
 assert.deepEqual(tilted.childBActualAxis,[0,0,1]);
 const testWorld=transformAIG3DPoint(tilted.modelStageMatrix,[0,0,1]);
 assert.ok(near(testWorld[0],1));
 assert.ok(near(testWorld[1],0));
 assert.ok(near(testWorld[2],0));
 assert.equal(tilted.jointHierarchy,
  'INDEPENDENT_TOP_XYZ_VIEW_AND_BOTTOM_A_PARENT_OF_B');
 assert.equal(tilted.stageDescription.childB.mountedOn,'A');
 assert.equal(JSON.stringify(s),source);
});
test('V107 source height foot/head is independent of A/B tilt and 360 B rotation',()=>{
 const s=cube(),audit=auditAIGReal3DV107Source(s,sha);
 assert.equal(audit.trueIndexedSourceTriangles,12);
 assert.deepEqual(audit.worldBounds.min,[-1,-2,-3]);
 assert.deepEqual(audit.worldBounds.max,[1,2,3]);
 const foot=planAIGReal3DV107FiveAxis({
  scene:s,sourceGLBSha256:sha,sourceAudit:audit,
  aTiltDeg:90,bTurnDeg:270,footHeadProgress:0});
 const middle=planAIGReal3DV107FiveAxis({
  scene:s,sourceGLBSha256:sha,sourceAudit:audit,
  aTiltDeg:-120,bTurnDeg:123,footHeadProgress:.5});
 const full=planAIGReal3DV107FiveAxis({
  scene:s,sourceGLBSha256:sha,sourceAudit:audit,
  aTiltDeg:-180,bTurnDeg:360,footHeadProgress:1});
 assert.equal(foot.footToHeadSliceWorldY,-2);
 assert.equal(middle.footToHeadSliceWorldY,0);
 assert.equal(full.footToHeadSliceWorldY,2);
 for(const p of [foot,middle,full]){
  assert.equal(p.clipSourceSceneRequired,true);
  assert.equal(p.allOriginalIndexedFacesStillUploaded,true);
  assert.equal(p.actual3DNewGeometryGenerated,false);
  assert.equal(p.releasePASS,false);
 }
});
test('V107 incremental foot-to-head step/cancel/resume/reset is stable and never rewrites mesh',()=>{
 const s=cube(),bytes=JSON.stringify(s);
 const queue=createAIGReal3DV107IncrementalStage({
  scene:s,sourceGLBSha256:sha,steps:20});
 assert.equal(queue.current(),0);
 const reset=queue.reset();
 assert.equal(reset.progress,0);
 const first=queue.step({aTiltDeg:45,bTurnDeg:90});
 assert.equal(first.step,1);assert.equal(first.progress,.05);
 assert.equal(first.aTiltDeg,45);assert.equal(first.bTurnDeg,90);
 const stop=queue.cancel();
 assert.equal(stop.lastCompletedStep,1);
 assert.equal(queue.step().status,'BLOCK_CANCELLED_MUST_RESUME');
 assert.equal(queue.current(),1);
 assert.equal(queue.resume().progress,.05);
 const final=queue.jump(1);
 assert.equal(final.step,20);
 assert.equal(final.progress,1);
 assert.equal(queue.step().status,'FOOT_HEAD_REVEAL_COMPLETE');
 assert.equal(JSON.stringify(s),bytes);
});
test('V107 stale original source/invalid A,B/negative height/progress is BLOCK not fake success',()=>{
 const s=cube();
 for(const x of [{aTiltDeg:181},{aTiltDeg:-181},{bTurnDeg:361},
  {bTurnDeg:-1},{footHeadProgress:1.1},
  {topXYZCNCmm:[0,0,Infinity]}]){
  assert.throws(()=>planAIGReal3DV107FiveAxis({
   scene:s,sourceGLBSha256:sha,...x}),
   /VIRTUAL_AXIS_LIMIT_OR_SOURCE_REVISION_INVALID/);
 }
 const stage=createAIGReal3DV107IncrementalStage({
  scene:s,sourceGLBSha256:sha});
 s.revision++;
 assert.throws(()=>stage.step(),/SOURCE_CHANGED_RESTART_PROGRESSIVE_DRAW/);
});
