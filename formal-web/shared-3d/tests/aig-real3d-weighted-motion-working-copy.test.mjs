import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {buildAIGReal3DDenseOBJSource} from '../aig-real3d-dense-source-obj.mjs';
import {auditAIGReal3DDenseAnatomy} from '../aig-real3d-dense-anatomy-review.mjs';
import {auditAIGReal3DDenseFiveDigitBranches} from '../aig-real3d-dense-digit-branch-gate.mjs';
import {auditAIGReal3DFingerJointSurface} from '../aig-real3d-native-finger-junction-gate.mjs';
import {createAIGReal3DWeightedFingerPose,buildAIGReal3DWeightedFingerGPUPreview}
 from '../aig-real3d-weighted-motion-working-copy.mjs';
const obj=[
 'v 0 0 0','v 1 0 0','v 1 1 0','v 0 1 0',
 'v 0 0 1','v 1 0 1','v 1 1 1','v 0 1 1',
 'f 1 4 3','f 1 3 2','f 5 6 7','f 5 7 8',
 'f 1 2 6','f 1 6 5','f 2 3 7','f 2 7 6',
 'f 3 4 8','f 3 8 7','f 4 1 5','f 4 5 8'
].join('\n');
const hash=createHash('sha256').update(obj).digest('hex');
const dense=buildAIGReal3DDenseOBJSource({
 objText:obj,sourceSha256:hash,heightMm:1680,sourceName:'NONHUMAN_WEIGHT_QA.obj'
});
const allSourceMarkers=()=>{
 const marks={};
 for(const name of [
  'headTop','chin','noseTip','neckBase','leftShoulder','rightShoulder',
  'leftElbow','rightElbow','leftWrist','rightWrist','pelvis',
  'leftKnee','rightKnee','leftHeel','rightHeel','leftToe','rightToe'
 ])marks[name]=[0,0,0];
 for(const side of ['left','right'])for(const name of [
  'Thumb','Index','Middle','Ring','Pinky']){
  marks[side+name+'Base']=[0,1,0];
  marks[side+name+'Middle']=[0,0,0];
  marks[side+name+'Tip']=[1,0,0];
 }
 return marks;
};
const labels=allSourceMarkers();
const anatomy=auditAIGReal3DDenseAnatomy({
 sourceGeometry:dense.sourceGeometry,sourceEvidence:dense.evidence,
 sourceSha256:hash,landmarks:labels
});
const digitBranching=auditAIGReal3DDenseFiveDigitBranches({
 sourceGeometry:dense.sourceGeometry,sourceEvidence:dense.evidence,
 sourceSha256:hash,anatomy,landmarks:labels
});
const fingerJunction=auditAIGReal3DFingerJointSurface({
 sourceGeometry:dense.sourceGeometry,sourceEvidence:dense.evidence,
 sourceSha256:hash,anatomy,digitBranching,landmarks:labels
});
const weights={
 schema:'AIG_REAL3D_EXPLICIT_VERTEX_WEIGHTS_V1',sourceSha256:hash,
 sourceVertexCount:8,side:'left',finger:'Index',joint:'Middle',
 pivotSourceXYZ:[0,0,0],axisWorld:[0,1,0],
 vertexWeights:[[1,.4],[2,.7],[5,.4],[6,.7]]
};
test('Actual rotated XYZ working copy retains immutable source and exact GPU chunk triangles',()=>{
 const original=Array.from(dense.sourceGeometry.positions);
 const zero=createAIGReal3DWeightedFingerPose({
  dense,fingerJunction,weightManifest:weights,angleDeg:0
 });
 assert.deepEqual(Array.from(zero.workingCopyPositions),original);
 assert.equal(zero.evidence.movedOriginalVertices,0);
 const pose=createAIGReal3DWeightedFingerPose({
  dense,fingerJunction,weightManifest:weights,angleDeg:20
 });
 assert.ok(pose.evidence.movedOriginalVertices>=3);
 assert.ok(pose.evidence.maxWorkingCopyDisplacementMm>0);
 assert.equal(pose.evidence.sourceTriangleCount,12);
 assert.equal(pose.evidence.sourceTrianglesAdded,0);
 assert.equal(pose.evidence.sourceTrianglesRemoved,0);
 assert.equal(pose.evidence.releasePASS,false);
 assert.equal(pose.evidence.animationRigPASS,false);
 assert.deepEqual(Array.from(dense.sourceGeometry.positions),original);
 const gpu=buildAIGReal3DWeightedFingerGPUPreview({dense,pose});
 assert.equal(gpu.evidence.posedGPUOriginalTriangles,12);
 assert.equal(gpu.scene.nodes.length,dense.scene.nodes.length);
 assert.deepEqual(gpu.scene.nodes[0].mesh.indices,dense.scene.nodes[0].mesh.indices);
 assert.equal(gpu.evidence.releasePASS,false);
 assert.notDeepEqual(gpu.scene.nodes[0].mesh.positions,dense.scene.nodes[0].mesh.positions);
});
test('No weights, forged SHA, duplicate weights and no stationary anchor are BLOCK',()=>{
 const build=(m)=>createAIGReal3DWeightedFingerPose({
  dense,fingerJunction,weightManifest:m,angleDeg:20
 });
 assert.throws(()=>build(undefined),/REAL3D_WEIGHTED_WEIGHT_MANIFEST_INVALID_OR_UNBOUND/);
 assert.throws(()=>build({...weights,sourceSha256:'f'.repeat(64)}),/REAL3D_WEIGHTED_WEIGHT_MANIFEST_INVALID_OR_UNBOUND/);
 assert.throws(()=>build({...weights,vertexWeights:[[1,1],[1,.4],[2,.5]]}),
  /REAL3D_WEIGHTED_INVALID_DUPLICATED_SOURCE_VERTEX_WEIGHT/);
 assert.throws(()=>build({...weights,vertexWeights:Array.from({length:8},(_,i)=>[i,1])}),
  /REAL3D_WEIGHTED_NO_STATIC_SOURCE_ANCHOR/);
 assert.throws(()=>build({...weights,pivotSourceXYZ:[100,10,100]}),
  /REAL3D_WEIGHTED_PIVOT_NOT_ON_SOURCE_JOINT/);
});
test('Out-of-range pose, missing real source junction and corrupted global triangles block',()=>{
 assert.throws(()=>createAIGReal3DWeightedFingerPose({
  dense,fingerJunction,weightManifest:weights,angleDeg:90
 }),/REAL3D_WEIGHTED_WEIGHT_MANIFEST_INVALID_OR_UNBOUND/);
 assert.throws(()=>createAIGReal3DWeightedFingerPose({
  dense,fingerJunction:{...fingerJunction,sourceSha256:'0'.repeat(64)},
  weightManifest:weights
 }),/REAL3D_WEIGHTED_ORIGINAL_SOURCE_AND_JUNCTION_SHA_REQUIRED/);
 const pose=createAIGReal3DWeightedFingerPose({
  dense,fingerJunction,weightManifest:weights,angleDeg:20
 });
 assert.throws(()=>buildAIGReal3DWeightedFingerGPUPreview({
  dense:{...dense,scene:{...dense.scene,nodes:[{
   ...dense.scene.nodes[0],sourceGlobalVertexIds:undefined
  }]}},pose
 }),/REAL3D_WEIGHTED_ORIGINAL_GPU_CHUNK_VERTEX_MAPPING_REQUIRED/);
});
