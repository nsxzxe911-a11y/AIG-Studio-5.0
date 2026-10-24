import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {buildAIGReal3DDenseOBJSource} from '../aig-real3d-dense-source-obj.mjs';
import {auditAIGReal3DDenseAnatomy} from '../aig-real3d-dense-anatomy-review.mjs';
import {auditAIGReal3DDenseFiveDigitBranches} from '../aig-real3d-dense-digit-branch-gate.mjs';
import {auditAIGReal3DFingerJointSurface} from '../aig-real3d-native-finger-junction-gate.mjs';
import {createAIGReal3DThreeJointTimeline,AIG_REAL3D_FAST_SPARSE_FK_SCHEMA,
 AIG_REAL3D_THREE_JOINT_MANIFEST} from '../aig-real3d-three-joint-swept-motion.mjs';
// Explicitly NONHUMAN composite: a cube source with a completely independent
// rectangular source mesh. Sparse movement cannot change that other mesh.
const cube=[
 'v 0 0 0','v 1 0 0','v 1 1 0','v 0 1 0',
 'v 0 0 1','v 1 0 1','v 1 1 1','v 0 1 1',
 'f 1 4 3','f 1 3 2','f 5 6 7','f 5 7 8',
 'f 1 2 6','f 1 6 5','f 2 3 7','f 2 7 6',
 'f 3 4 8','f 3 8 7','f 4 1 5','f 4 5 8'
];
const nx=74,ny=60;
for(let y=0;y<ny;y++)for(let x=0;x<nx;x++)
 cube.push('v '+(3+x*.02).toFixed(5)+' '+(y/(ny-1)).toFixed(7)+' 0');
for(let y=0;y<ny-1;y++)for(let x=0;x<nx-1;x++){
 const a=8+1+y*nx+x,b=a+1,c=a+nx,d=c+1;
 cube.push('f '+a+' '+b+' '+d,'f '+a+' '+d+' '+c);
}
const obj=cube.join('\n'),sourceSha256=createHash('sha256').update(obj).digest('hex');
const dense=buildAIGReal3DDenseOBJSource({
 objText:obj,sourceSha256,heightMm:1680,sourceName:'NONHUMAN_SPARSE_CUBE_UNTOUCHED_GRID.obj'
});
const landmarks={};
for(const key of ['headTop','chin','noseTip','neckBase','leftShoulder',
 'rightShoulder','leftElbow','rightElbow','leftWrist','rightWrist',
 'pelvis','leftKnee','rightKnee','leftHeel','rightHeel','leftToe','rightToe'])
 landmarks[key]=[0,0,0];
for(const side of ['left','right'])for(const finger of [
 'Thumb','Index','Middle','Ring','Pinky']){
 landmarks[side+finger+'Base']=[0,0,0];
 landmarks[side+finger+'Middle']=[1,0,0];
 landmarks[side+finger+'Tip']=[1,1,0];
}
const anatomy=auditAIGReal3DDenseAnatomy({
 sourceGeometry:dense.sourceGeometry,sourceEvidence:dense.evidence,
 sourceSha256,landmarks
});
const branches=auditAIGReal3DDenseFiveDigitBranches({
 sourceGeometry:dense.sourceGeometry,sourceEvidence:dense.evidence,
 sourceSha256,anatomy,landmarks
});
const fingerJunction=auditAIGReal3DFingerJointSurface({
 sourceGeometry:dense.sourceGeometry,sourceEvidence:dense.evidence,
 sourceSha256,anatomy,digitBranching:branches,landmarks
});
const manifest={
 schema:AIG_REAL3D_THREE_JOINT_MANIFEST,
 sourceSha256,sourceVertexCount:dense.evidence.originalVertexCount,
 side:'left',finger:'Index',joints:[
  {joint:'Base',pivotSourceXYZ:[0,0,0],axisWorld:[0,0,1],
   vertexWeights:[[1,1],[2,1],[5,1],[6,1]]},
  {joint:'Middle',pivotSourceXYZ:[1,0,0],axisWorld:[0,1,0],
   vertexWeights:[[2,.9],[5,.7],[6,.8]]},
  {joint:'Distal',pivotSourceXYZ:[1,1,0],axisWorld:[1,0,0],
   vertexWeights:[[2,.8],[5,.5],[6,.7]]}
 ]
};
const pose=(options={})=>createAIGReal3DThreeJointTimeline({
 dense,fingerJunction,manifest,targetAnglesDeg:[30,25,20],...options
});
const p=(v,id)=>[v[id*3],v[id*3+1],v[id*3+2]];
const sub=(a,b)=>a.map((v,k)=>v-b[k]);
const len=x=>Math.hypot(...x);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const round=x=>{const v=Math.round(x*1000)/1000;return Object.is(v,-0)?0:v;};
// INDEPENDENT full source XYZ reference scan. A changed face cannot be omitted
// simply because the accelerated sparse topology list did not contain it.
function fullFaceReference(source,posed,indices){
 let changed=0,stretch=0,compression=0,flipped=0,collapsed=0;
 for(let i=0;i<indices.length;i+=3){
  const t=[indices[i],indices[i+1],indices[i+2]],
   old=t.map(j=>p(source,j)),now=t.map(j=>p(posed,j));
  if(old.every((a,k)=>a.every((v,j)=>v===now[k][j])))continue;
  changed++;
  for(const [a,b] of [[0,1],[1,2],[2,0]]){
   const prior=len(sub(old[a],old[b])),current=len(sub(now[a],now[b]));
   if(prior<1e-9)continue;
   stretch=Math.max(stretch,(current/prior-1)*100);
   compression=Math.max(compression,(1-current/prior)*100);
  }
  const n=cross(sub(old[1],old[0]),sub(old[2],old[0])),
   m=cross(sub(now[1],now[0]),sub(now[2],now[0]));
  if(len(m)<1e-11||len(m)/Math.max(len(n),1e-20)<.01)collapsed++;
  if(dot(n,m)<-1e-12)flipped++;
 }
 return {
  changedSourceTriangles:changed,maxSourceEdgeStretchPercent:round(stretch),
  maxSourceEdgeCompressionPercent:round(compression),
  invertedSourceTriangles:flipped,nearlyCollapsedSourceTriangles:collapsed,
  originalTriangleCountUnchanged:indices.length/3
 };
}
test('Sparse FK indexes 4 original vertices and skips untouched high-density source grid',()=>{
 const original=Array.from(dense.sourceGeometry.positions);
 const originalIndices=Array.from(dense.sourceGeometry.indices);
 const result=pose();
 const stat=result.sparseSourceTopology;
 assert.equal(stat.schema,AIG_REAL3D_FAST_SPARSE_FK_SCHEMA);
 assert.equal(stat.inputSourceVertexCount,dense.evidence.originalVertexCount);
 assert.equal(stat.inputOriginalSourceTriangles,dense.evidence.originalTriangleCount);
 assert.equal(stat.activeWeightedGlobalVertexCount,4);
 assert.equal(stat.skippedUnweightedGlobalVerticesPerFrame,stat.inputSourceVertexCount-4);
 assert.ok(stat.indexedAffectedOriginalTriangles>0);
 assert.ok(stat.indexedAffectedOriginalTriangles<stat.inputOriginalSourceTriangles*.02);
 assert.equal(stat.runtimeImageGPUChunksStillRebuiltPerCapture,true);
 assert.equal(result.diagnostics.cpuSparseFKSourceTopologyCacheUsed,true);
 assert.deepEqual(Array.from(dense.sourceGeometry.positions),original);
 assert.deepEqual(Array.from(dense.sourceGeometry.indices),originalIndices);
 assert.equal(result.releasePASS,false);
});
test('EVERY accelerated frame matches independently recomputed full original-index triangle strain exactly',()=>{
 const result=pose({targetAnglesDeg:[37,33,-20],maxAngularStepDeg:5,retainAllSourcePoses:true});
 const src=dense.sourceGeometry.positions,indices=dense.sourceGeometry.indices;
 for(const frame of result.frames){
  const reference=fullFaceReference(src,frame.workingCopyPositions,indices);
  for(const [key,value] of Object.entries(reference))
   assert.equal(frame.deformation[key],value,'sample '+frame.sampleIndex+' '+key);
  assert.equal(frame.deformation.sourceTrianglesActuallyInspected,
   result.sparseSourceTopology.indexedAffectedOriginalTriangles);
  assert.equal(frame.deformation.sourceTopologyIndexCachedOutsideTimeLoop,true);
  assert.equal(frame.movedOriginalVertices<=4,true);
  for(let j=8;j<src.length/3;j++){
   for(let axis=0;axis<3;axis++)
    assert.equal(frame.workingCopyPositions[j*3+axis],src[j*3+axis]);
  }
 }
 assert.equal(result.diagnostics.continuousCollisionFreePASS,false);
 assert.equal(result.diagnostics.naturalSkinDeformationPASS,false);
});
test('Source SHA, changed original vertex count, excessive distal weight still fail closed in fast mode',()=>{
 assert.throws(()=>pose({manifest:{...manifest,sourceSha256:'0'.repeat(64)}}),
  /THREE_JOINT_SOURCE_SHA_EXPLICIT_THREE_STAGE_REQUIRED/);
 assert.throws(()=>pose({manifest:{...manifest,sourceVertexCount:7}}),
  /THREE_JOINT_SOURCE_SHA_EXPLICIT_THREE_STAGE_REQUIRED/);
 assert.throws(()=>pose({manifest:{...manifest,joints:[
  manifest.joints[0],manifest.joints[1],
  {...manifest.joints[2],vertexWeights:[[2,1],[5,.5],[6,.7]]}
 ]}}),/THREE_JOINT_DISTAL_WEIGHTS_WITHOUT_ANCESTOR_INHERITANCE/);
});

test('FAST mode releases offscreen full XYZ pose arrays while preserving three GPU display frames',()=>{
 const full=pose({retainAllSourcePoses:true}),fast=pose();
 assert.equal(full.frameCount,fast.frameCount);
 assert.deepEqual(full.displayFrameIndexes,fast.displayFrameIndexes);
 assert.equal(full.sparseSourceTopology.numberOfFullXYZFramesRetained,full.frameCount);
 assert.equal(fast.sparseSourceTopology.numberOfFullXYZFramesRetained,3);
 assert.equal(fast.sparseSourceTopology.discardedIntermediateFullXYZFrames,
  fast.frameCount-3);
 for(let i=0;i<fast.frameCount;i++){
  const f=fast.frames[i],reference=full.frames[i];
  assert.deepEqual(f.deformation,reference.deformation);
  assert.deepEqual(f.contact,reference.contact);
  assert.deepEqual(f.sweptRiskFromPriorSample,
   reference.sweptRiskFromPriorSample);
  if(fast.displayFrameIndexes.includes(i))
   assert.deepEqual(f.workingCopyPositions,reference.workingCopyPositions);
  else assert.equal(f.workingCopyPositions,null);
 }
 assert.equal(fast.diagnostics.releasePASS,false);
});
