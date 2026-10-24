import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {buildAIGReal3DDenseOBJSource} from '../aig-real3d-dense-source-obj.mjs';
import {auditAIGReal3DDenseAnatomy} from '../aig-real3d-dense-anatomy-review.mjs';
import {auditAIGReal3DDenseFiveDigitBranches}
 from '../aig-real3d-dense-digit-branch-gate.mjs';
import {auditAIGReal3DFingerJointSurface}
 from '../aig-real3d-native-finger-junction-gate.mjs';
import {buildAIGReal3DWeightedFingerGPUPreview}
 from '../aig-real3d-weighted-motion-working-copy.mjs';
import {createAIGReal3DHierarchicalFingerTimeline,
 AIG_REAL3D_HIERARCHICAL_FK_SCHEMA,AIG_REAL3D_HIERARCHICAL_MANIFEST_SCHEMA}
 from '../aig-real3d-hierarchical-fk-working-copy.mjs';
const obj=[
 'v 0 0 0','v 1 0 0','v 1 1 0','v 0 1 0',
 'v 0 0 1','v 1 0 1','v 1 1 1','v 0 1 1',
 'f 1 4 3','f 1 3 2','f 5 6 7','f 5 7 8',
 'f 1 2 6','f 1 6 5','f 2 3 7','f 2 7 6',
 'f 3 4 8','f 3 8 7','f 4 1 5','f 4 5 8'
].join('\n');
const hash=createHash('sha256').update(obj).digest('hex');
const dense=buildAIGReal3DDenseOBJSource({
 objText:obj,sourceSha256:hash,heightMm:1680,sourceName:'NONHUMAN_CUBE_HIERARCHY.obj'
});
const marks={};
for(const k of [
 'headTop','chin','noseTip','neckBase','leftShoulder','rightShoulder',
 'leftElbow','rightElbow','leftWrist','rightWrist','pelvis',
 'leftKnee','rightKnee','leftHeel','rightHeel','leftToe','rightToe'
])marks[k]=[0,0,0];
for(const side of ['left','right'])for(const finger of [
 'Thumb','Index','Middle','Ring','Pinky']){
 marks[side+finger+'Base']=[0,0,0];
 marks[side+finger+'Middle']=[1,0,0];
 marks[side+finger+'Tip']=[1,1,0];
}
const anatomy=auditAIGReal3DDenseAnatomy({
 sourceGeometry:dense.sourceGeometry,sourceEvidence:dense.evidence,
 sourceSha256:hash,landmarks:marks
});
const branches=auditAIGReal3DDenseFiveDigitBranches({
 sourceGeometry:dense.sourceGeometry,sourceEvidence:dense.evidence,
 sourceSha256:hash,anatomy,landmarks:marks
});
const fingerJunction=auditAIGReal3DFingerJointSurface({
 sourceGeometry:dense.sourceGeometry,sourceEvidence:dense.evidence,
 sourceSha256:hash,anatomy,digitBranching:branches,landmarks:marks
});
const manifest={
 schema:AIG_REAL3D_HIERARCHICAL_MANIFEST_SCHEMA,
 sourceSha256:hash,sourceVertexCount:8,side:'left',finger:'Index',
 parent:{joint:'Base',pivotSourceXYZ:[0,0,0],axisWorld:[0,0,1],
  vertexWeights:[[1,1],[2,1],[5,1],[6,1]]},
 child:{joint:'Middle',pivotSourceXYZ:[1,0,0],axisWorld:[0,1,0],
  vertexWeights:[[2,.8],[5,.6],[6,.7]]}
};
const run=(arg={})=>createAIGReal3DHierarchicalFingerTimeline({
 dense,fingerJunction,manifest,targetAnglesDeg:[30,25],
 maxDegreesBetweenCheckedSamples:8,displayFrameCount:3,...arg
});
test('Original-index parent-child FK moves distal pivot, produces real sampled XYZ and GPU triangles but never claims human rig PASS',()=>{
 const original=Array.from(dense.sourceGeometry.positions);
 const out=run();
 assert.equal(out.schema,AIG_REAL3D_HIERARCHICAL_FK_SCHEMA);
 assert.ok(out.subframeCount>=5);
 assert.equal(out.displayFrameIndexes.length,3);
 assert.equal(out.samples.length,out.subframeCount);
 assert.equal(out.samples[0].movedOriginalVertices,0);
 assert.deepEqual(Array.from(out.samples[0].workingCopyPositions),original);
 assert.notDeepEqual(Array.from(out.samples.at(-1).workingCopyPositions),original);
 assert.notDeepEqual(out.samples[0].transformedChildPivotWorldMeters,
  out.samples.at(-1).transformedChildPivotWorldMeters);
 assert.notDeepEqual(out.samples[0].childAxisInParentSpaceWorld,
  out.samples.at(-1).childAxisInParentSpaceWorld);
 assert.ok(out.maxActualDegreesBetweenSamples<=8);
 assert.equal(out.samples.at(-1).deformation.originalSourceTriangleCount,12);
 assert.equal(out.diagnostics.parentPivotCarriesChildPivot,true);
 assert.equal(out.diagnostics.sampledFramesDoNotProveContinuousCollisionFreedom,true);
 assert.equal(out.diagnostics.skinAndJointNaturalnessPASS,false);
 assert.equal(out.diagnostics.animationRigPASS,false);
 assert.equal(out.releasePASS,false);
 assert.deepEqual(Array.from(dense.sourceGeometry.positions),original);
 const preview=buildAIGReal3DWeightedFingerGPUPreview({
  dense,pose:{workingCopyPositions:out.samples.at(-1).workingCopyPositions,
   evidence:{sourceSha256:hash,sourceTriangleCount:12}}
 });
 assert.equal(preview.evidence.posedGPUOriginalTriangles,12);
 assert.deepEqual(preview.scene.nodes[0].mesh.indices,dense.scene.nodes[0].mesh.indices);
 assert.equal(preview.evidence.releasePASS,false);
});
test('Child-only rotation does not move distal pivot; parent-only rotates inherited child pivot',()=>{
 const child=run({targetAnglesDeg:[0,30]});
 const parent=run({targetAnglesDeg:[30,0]});
 assert.deepEqual(child.samples[0].transformedChildPivotWorldMeters,
  child.samples.at(-1).transformedChildPivotWorldMeters);
 assert.notDeepEqual(parent.samples[0].transformedChildPivotWorldMeters,
  parent.samples.at(-1).transformedChildPivotWorldMeters);
 assert.notDeepEqual(child.samples.at(-1).workingCopyPositions,
  parent.samples.at(-1).workingCopyPositions);
});
test('Fake source binding, coincident pivots, weights without parent inheritance and excessive rotation fail closed',()=>{
 assert.throws(()=>run({manifest:{...manifest,sourceSha256:'f'.repeat(64)}}),
  /REAL3D_HIERARCHY_ORIGINAL_GLOBAL_SOURCE_JOINT_AND_MANIFEST_REQUIRED/);
 assert.throws(()=>run({manifest:{...manifest,
  child:{...manifest.child,pivotSourceXYZ:[0,0,0]}}}),
  /REAL3D_HIERARCHY_PARENT_CHILD_PIVOTS_COINCIDENT/);
 assert.throws(()=>run({manifest:{...manifest,
  child:{...manifest.child,vertexWeights:[[0,.3],[2,.8],[6,.7]]}}}),
  /REAL3D_HIERARCHY_CHILD_WEIGHTS_WITHOUT_PARENT_INHERITANCE/);
 assert.throws(()=>run({targetAnglesDeg:[80,10]}),
  /REAL3D_HIERARCHY_TIMELINE_SAMPLING_OR_ANGLE_INVALID/);
 assert.throws(()=>run({maxDegreesBetweenCheckedSamples:0}),
  /REAL3D_HIERARCHY_TIMELINE_SAMPLING_OR_ANGLE_INVALID/);
 assert.throws(()=>run({manifest:{...manifest,
  parent:{...manifest.parent,pivotSourceXYZ:[100,100,100]}}}),
  /REAL3D_HIERARCHY_JOINT_PIVOT_OFF_SOURCE_MESH/);
});
test('No native index or missing explicit source joint marker cannot silently auto-rig',()=>{
 assert.throws(()=>run({dense:{...dense,sourceGeometry:{
  ...dense.sourceGeometry,originalGlobalIndexSpace:false}}}),
  /REAL3D_HIERARCHY_ORIGINAL_GLOBAL_SOURCE_JOINT_AND_MANIFEST_REQUIRED/);
 assert.throws(()=>run({fingerJunction:{...fingerJunction,fingers:[]}}),
  /REAL3D_HIERARCHY_ORIGINAL_JOINT_SOURCE_REPORT_REQUIRED/);
 assert.throws(()=>run({contactBudget:0}),
  /REAL3D_HIERARCHY_TIMELINE_SAMPLING_OR_ANGLE_INVALID/);
});
