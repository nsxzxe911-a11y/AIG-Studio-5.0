import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {buildAIGReal3DDenseOBJSource}
 from '../aig-real3d-dense-source-obj.mjs';
import {auditAIGReal3DDenseAnatomy}
 from '../aig-real3d-dense-anatomy-review.mjs';
import {auditAIGReal3DDenseFiveDigitBranches}
 from '../aig-real3d-dense-digit-branch-gate.mjs';
import {auditAIGReal3DFingerJointSurface}
 from '../aig-real3d-native-finger-junction-gate.mjs';
import {createAIGReal3DDualFingerTimeline,
 inspectAIGReal3DLocalSourceTriangleContact,AIG_REAL3D_DUAL_TIMELINE_SCHEMA}
 from '../aig-real3d-dual-channel-timeline.mjs';
const obj=[
 'v 0 0 0','v 1 0 0','v 1 1 0','v 0 1 0',
 'v 0 0 1','v 1 0 1','v 1 1 1','v 0 1 1',
 'f 1 4 3','f 1 3 2','f 5 6 7','f 5 7 8',
 'f 1 2 6','f 1 6 5','f 2 3 7','f 2 7 6',
 'f 3 4 8','f 3 8 7','f 4 1 5','f 4 5 8'
].join('\n');
const sourceSha256=createHash('sha256').update(obj).digest('hex');
const dense=buildAIGReal3DDenseOBJSource({
 objText:obj,sourceSha256,heightMm:1680,sourceName:'NONHUMAN_TWO_CHANNEL_QA.obj'
});
const labels={};
for(const n of [
 'headTop','chin','noseTip','neckBase','leftShoulder','rightShoulder',
 'leftElbow','rightElbow','leftWrist','rightWrist','pelvis',
 'leftKnee','rightKnee','leftHeel','rightHeel','leftToe','rightToe'
])labels[n]=[0,0,0];
for(const side of ['left','right'])for(const finger of [
 'Thumb','Index','Middle','Ring','Pinky']){
 labels[side+finger+'Base']=[0,1,0];
 labels[side+finger+'Middle']=[0,0,0];
 labels[side+finger+'Tip']=[1,0,0];
}
const anatomy=auditAIGReal3DDenseAnatomy({
 sourceGeometry:dense.sourceGeometry,sourceEvidence:dense.evidence,
 sourceSha256,landmarks:labels
});
const digitBranching=auditAIGReal3DDenseFiveDigitBranches({
 sourceGeometry:dense.sourceGeometry,sourceEvidence:dense.evidence,
 sourceSha256,anatomy,landmarks:labels
});
const fingerJunction=auditAIGReal3DFingerJointSurface({
 sourceGeometry:dense.sourceGeometry,sourceEvidence:dense.evidence,
 sourceSha256,anatomy,digitBranching,landmarks:labels
});
const a={
 schema:'AIG_REAL3D_EXPLICIT_VERTEX_WEIGHTS_V1',sourceSha256,
 sourceVertexCount:8,side:'left',finger:'Index',joint:'Middle',
 pivotSourceXYZ:[0,0,0],axisWorld:[0,1,0],
 vertexWeights:[[1,.4],[2,.7],[5,.4]]
};
const b={
 ...a,side:'right',axisWorld:[1,0,0],
 vertexWeights:[[0,.4],[3,.7],[4,.4]]
};
const run=(args={})=>createAIGReal3DDualFingerTimeline({
 dense,fingerJunction,weightManifests:[a,b],
 targetAnglesDeg:[20,-25],frameCount:5,...args
});
test('Two independent real source XYZ channels move over 5 frames without changing original OBJ triangles',()=>{
 const before=Array.from(dense.sourceGeometry.positions);
 const result=run();
 assert.equal(result.schema,AIG_REAL3D_DUAL_TIMELINE_SCHEMA);
 assert.equal(result.frameCount,5);
 assert.equal(result.channels.length,2);
 assert.deepEqual(result.frames[0].angleDegrees,[0,0]);
 assert.deepEqual(result.frames.at(-1).angleDegrees,[20,-25]);
 assert.deepEqual(Array.from(result.frames[0].workingCopyPositions),before);
 assert.notDeepEqual(Array.from(result.frames[2].workingCopyPositions),before);
 assert.notDeepEqual(Array.from(result.frames.at(-1).workingCopyPositions),before);
 assert.notDeepEqual(Array.from(result.frames[2].workingCopyPositions),
  Array.from(result.frames.at(-1).workingCopyPositions));
 assert.deepEqual(Array.from(dense.sourceGeometry.positions),before);
 assert.ok(result.frames.at(-1).deformation.changedOriginalTriangles>0);
 assert.equal(result.frames.at(-1).sourceOriginalTriangles,12);
 assert.equal(result.sourceGlobalTriangleIndicesNotModified,true);
 assert.equal(result.diagnostics.animationRigPASS,false);
 assert.equal(result.releasePASS,false);
});
test('Independent weighted channels cannot share vertex ownership or imply true skeleton',()=>{
 assert.throws(()=>run({weightManifests:[a,{...b,vertexWeights:[[1,.5],[3,.4],[4,.7]]}]}),
  /REAL3D_DUAL_OVERLAPPING_INDEPENDENT_CHANNELS_REQUIRE_HIERARCHICAL_RIG/);
 assert.throws(()=>run({weightManifests:[a,{...a}]}),
  /REAL3D_DUAL_SEPARATE_FINGER_CHANNELS_REQUIRED/);
 assert.throws(()=>run({frameCount:60}),/REAL3D_DUAL_TWO_SOURCE_BOUND_CHANNELS_REQUIRED/);
 assert.throws(()=>run({weightManifests:[a,{...b,sourceSha256:'f'.repeat(64)}]}),
  /REAL3D_DUAL_TWO_SOURCE_BOUND_CHANNELS_REQUIRED/);
 assert.throws(()=>run({targetAnglesDeg:[25,80]}),
  /REAL3D_DUAL_TWO_SOURCE_BOUND_CHANNELS_REQUIRED/);
 assert.throws(()=>run({maxContactPairs:300000}),
  /REAL3D_DUAL_CONTACT_BUDGET_INVALID/);
});
test('Actual intersecting NONHUMAN 3D triangles yield narrowphase contact; displaced triangles do not',()=>{
 const first=[[0,1,2]],second=[[3,4,5]];
 const vertices=new Float32Array([
  -1,-1,0, 1,-1,0, 0,1,0,
  0,-.5,-1, 0,-.5,1, 0,.75,.5
 ]);
 const yes=inspectAIGReal3DLocalSourceTriangleContact({
  positions:vertices,firstTriangles:first,secondTriangles:second
 });
 assert.equal(yes.observedContactAtSample,true);
 assert.ok(yes.observedSourceTriangleIntersections>0);
 assert.equal(yes.budgetExhausted,false);
 assert.equal(yes.exhaustiveWholeBodyCollisionFreeProof,false);
 const shifted=new Float32Array(vertices);
 for(let i=3;i<6;i++)shifted[i*3]+=5;
 const no=inspectAIGReal3DLocalSourceTriangleContact({
  positions:shifted,firstTriangles:first,secondTriangles:second
 });
 assert.equal(no.observedContactAtSample,false);
 assert.equal(no.exactNoncoplanarTrianglePairsTested,0);
});
test('Broadphase budget exhaustion BLOCK, not false collision-free approval',()=>{
 const vertices=new Float32Array([
  -1,-1,0, 1,-1,0, 0,1,0,
  0,-.5,-1, 0,-.5,1, 0,.75,.5
 ]);
 const out=inspectAIGReal3DLocalSourceTriangleContact({
  positions:vertices,firstTriangles:[[0,1,2],[0,1,2],[0,1,2]],
  secondTriangles:[[3,4,5],[3,4,5],[3,4,5]],maxPairs:1
 });
 assert.equal(out.budgetExhausted,true);
 assert.equal(out.exhaustiveWholeBodyCollisionFreeProof,false);
 assert.throws(()=>inspectAIGReal3DLocalSourceTriangleContact({
  positions:vertices,firstTriangles:[[0,1,99]],secondTriangles:[[3,4,5]]
 }),/REAL3D_DUAL_TRIANGLE_CONTACT_INPUT_INVALID/);
});
