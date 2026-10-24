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
import {createAIGReal3DThreeJointTimeline,inspectAIGReal3DSweptSourceRisk,
 AIG_REAL3D_THREE_JOINT_SCHEMA,AIG_REAL3D_THREE_JOINT_MANIFEST}
 from '../aig-real3d-three-joint-swept-motion.mjs';
const obj=[
 'v 0 0 0','v 1 0 0','v 1 1 0','v 0 1 0',
 'v 0 0 1','v 1 0 1','v 1 1 1','v 0 1 1',
 'f 1 4 3','f 1 3 2','f 5 6 7','f 5 7 8',
 'f 1 2 6','f 1 6 5','f 2 3 7','f 2 7 6',
 'f 3 4 8','f 3 8 7','f 4 1 5','f 4 5 8'
].join('\n');
const hash=createHash('sha256').update(obj).digest('hex');
const dense=buildAIGReal3DDenseOBJSource({
 objText:obj,sourceSha256:hash,heightMm:1680,sourceName:'NONHUMAN_THREE_JOINT_TEST.obj'
});
const marks={};
for(const k of ['headTop','chin','noseTip','neckBase',
 'leftShoulder','rightShoulder','leftElbow','rightElbow','leftWrist',
 'rightWrist','pelvis','leftKnee','rightKnee','leftHeel','rightHeel',
 'leftToe','rightToe'])marks[k]=[0,0,0];
for(const side of ['left','right'])for(const f of [
 'Thumb','Index','Middle','Ring','Pinky']){
 marks[side+f+'Base']=[0,0,0];
 marks[side+f+'Middle']=[1,0,0];
 marks[side+f+'Tip']=[1,1,0];
}
const anatomy=auditAIGReal3DDenseAnatomy({
 sourceGeometry:dense.sourceGeometry,sourceEvidence:dense.evidence,
 sourceSha256:hash,landmarks:marks
});
const digitBranching=auditAIGReal3DDenseFiveDigitBranches({
 sourceGeometry:dense.sourceGeometry,sourceEvidence:dense.evidence,
 sourceSha256:hash,anatomy,landmarks:marks
});
const fingerJunction=auditAIGReal3DFingerJointSurface({
 sourceGeometry:dense.sourceGeometry,sourceEvidence:dense.evidence,
 sourceSha256:hash,anatomy,digitBranching,landmarks:marks
});
const manifest={
 schema:AIG_REAL3D_THREE_JOINT_MANIFEST,
 sourceSha256:hash,sourceVertexCount:8,side:'left',finger:'Index',
 joints:[
  {joint:'Base',pivotSourceXYZ:[0,0,0],axisWorld:[0,0,1],
   vertexWeights:[[1,1],[2,1],[5,1],[6,1]]},
  {joint:'Middle',pivotSourceXYZ:[1,0,0],axisWorld:[0,1,0],
   vertexWeights:[[2,.9],[5,.7],[6,.8]]},
  {joint:'Distal',pivotSourceXYZ:[1,1,0],axisWorld:[1,0,0],
   vertexWeights:[[2,.8],[5,.5],[6,.7]]}
 ]
};
const run=(extra={})=>createAIGReal3DThreeJointTimeline({
 dense,fingerJunction,manifest,targetAnglesDeg:[30,25,20],...extra
});
test('3 inherited joint pivots rotate in real source XYZ and preserve every original face',()=>{
 const before=Array.from(dense.sourceGeometry.positions),result=run();
 assert.equal(result.schema,AIG_REAL3D_THREE_JOINT_SCHEMA);
 assert.deepEqual(result.jointNames,['Base','Middle','Distal']);
 assert.ok(result.frameCount>=6);
 assert.ok(result.maxActualAngularSampleStepDeg<=6);
 assert.equal(result.displayFrameIndexes.length,3);
 assert.deepEqual(Array.from(result.frames[0].workingCopyPositions),before);
 assert.notDeepEqual(Array.from(result.frames.at(-1).workingCopyPositions),before);
 assert.notDeepEqual(result.frames[0].worldJointPivots[1],
  result.frames.at(-1).worldJointPivots[1]);
 assert.notDeepEqual(result.frames[0].worldJointPivots[2],
  result.frames.at(-1).worldJointPivots[2]);
 assert.equal(result.frames.at(-1).deformation.originalTriangleCountUnchanged,12);
 assert.equal(result.diagnostics.trueThreeJointParentChildInheritance,true);
 assert.equal(result.diagnostics.naturalSkinDeformationPASS,false);
 assert.equal(result.diagnostics.continuousCollisionFreePASS,false);
 assert.equal(result.releasePASS,false);
 assert.deepEqual(Array.from(dense.sourceGeometry.positions),before);
 const posed=buildAIGReal3DWeightedFingerGPUPreview({
  dense,pose:{workingCopyPositions:result.frames.at(-1).workingCopyPositions,
   evidence:{sourceSha256:hash,sourceTriangleCount:12}}
 });
 assert.equal(posed.evidence.posedGPUOriginalTriangles,12);
 assert.deepEqual(posed.scene.nodes[0].mesh.indices,dense.scene.nodes[0].mesh.indices);
});
test('Parent rotation moves middle and distal pivots; distal-only motion moves neither ancestor',()=>{
 const parent=run({targetAnglesDeg:[30,0,0]}),
  distal=run({targetAnglesDeg:[0,0,30]});
 assert.notDeepEqual(parent.frames[0].worldJointPivots[1],
  parent.frames.at(-1).worldJointPivots[1]);
 assert.notDeepEqual(parent.frames[0].worldJointPivots[2],
  parent.frames.at(-1).worldJointPivots[2]);
 assert.deepEqual(distal.frames[0].worldJointPivots[1],
  distal.frames.at(-1).worldJointPivots[1]);
 assert.deepEqual(distal.frames[0].worldJointPivots[2],
  distal.frames.at(-1).worldJointPivots[2]);
});
test('Swept source AABB flags POSSIBLE intermediate crossing even when both sampled endpoints are separated',()=>{
 const from=new Float32Array([
  -1,-1,0, 1,-1,0, 0,1,0,
  4,-.5,-1,4,-.5,1,4,.5,.5
 ]);
 const to=new Float32Array(from);
 for(let i=3;i<6;i++)to[i*3]-=8;
 const result=inspectAIGReal3DSweptSourceRisk({
  from,to,groupA:[[0,1,2]],groupB:[[3,4,5]]
 });
 assert.equal(result.intervalNeedsNarrowerSamplingOrFurtherCollisionReview,true);
 assert.ok(result.possibleCrossChannelSweptAABBOverlaps>0);
 assert.equal(result.noContinuousCollisionFreeCertification,true);
 assert.equal(result.sweptAABBOverlapNotProofOfActualTriangleIntersection,true);
 const safe=new Float32Array(from);
 for(let i=3;i<6;i++)safe[i*3]+=1;
 const no=inspectAIGReal3DSweptSourceRisk({
  from,to:safe,groupA:[[0,1,2]],groupB:[[3,4,5]]
 });
 assert.equal(no.possibleCrossChannelSweptAABBOverlaps,0);
});
test('Invalid source binding, ancestor-less distal weights, duplicate vertex weights and sampling budget must BLOCK',()=>{
 assert.throws(()=>run({manifest:{...manifest,sourceSha256:'f'.repeat(64)}}),
  /THREE_JOINT_SOURCE_SHA_EXPLICIT_THREE_STAGE_REQUIRED/);
 assert.throws(()=>run({manifest:{...manifest,joints:[
  ...manifest.joints.slice(0,2),
  {...manifest.joints[2],vertexWeights:[[0,.4],[2,.5],[6,.5]]}
 ]}}),/THREE_JOINT_DISTAL_WEIGHTS_WITHOUT_ANCESTOR_INHERITANCE/);
 assert.throws(()=>run({manifest:{...manifest,joints:[
  {...manifest.joints[0],vertexWeights:[[1,.7],[1,.3],[2,.6]]},
  ...manifest.joints.slice(1)
 ]}}),/THREE_JOINT_DUPLICATE_OR_INVALID_ORIGINAL_VERTEX_WEIGHT/);
 assert.throws(()=>run({targetAnglesDeg:[70,5,5]}),
  /THREE_JOINT_SAMPLING_OR_SAFETY_CONFIG_INVALID/);
 assert.throws(()=>run({maxAngularStepDeg:.2}),
  /THREE_JOINT_SAMPLING_OR_SAFETY_CONFIG_INVALID/);
 assert.throws(()=>run({manifest:{...manifest,joints:[
  ...manifest.joints.slice(0,2),{...manifest.joints[2],pivotSourceXYZ:[100,100,100]}
 ]}}),/THREE_JOINT_JOINT_PIVOT_NOT_ON_NATIVE_SOURCE/);
 assert.throws(()=>inspectAIGReal3DSweptSourceRisk({
  from:new Float32Array([0,0,0]),to:new Float32Array([0,0,0]),
  groupA:[[0,0,4]],groupB:[]
 }),/THREE_JOINT_SWEPT_INPUT_INVALID/);
});
