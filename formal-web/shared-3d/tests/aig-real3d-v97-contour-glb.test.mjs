import test from 'node:test';
import assert from 'node:assert/strict';
import {runAIGReal3DV97PhotoConstrainedModel}
 from '../aig-real3d-v97-auto-constrained-model.mjs';
import {runAIGReal3DLocalPortraitToRig}
 from '../aig-real3d-v95-ai-orchestrator.mjs';
import {extractAIGReal3DObservedFaceSilhouette}
 from '../aig-real3d-v97-portrait-silhouette.mjs';
import {exportAIGReal3DV97AnimatedGLB}
 from '../aig-real3d-v97-export-animated-glb.mjs';
const source='a'.repeat(64),authority='b'.repeat(64);
function portrait(shape='trapezoid'){
 const width=256,height=256,rgba=new Uint8ClampedArray(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=(y*width+x)*4;
  let yes=false;
  if(shape==='trapezoid'&&y>=30&&y<=110){
   const t=(y-30)/80,half=Math.round(31-13*t);
   yes=Math.abs(x-128)<=half;
  }
  rgba[i]=yes?215:12;rgba[i+1]=yes?145:26;
  rgba[i+2]=yes?108:52;rgba[i+3]=255;
 }
 return {rgba,width,height,imageSha256:source};
}
test('V97 observed original pixel row silhouette actually improves inferred XYZ head contour',()=>{
 const input=portrait();
 const previous=runAIGReal3DLocalPortraitToRig({
  ...input,approvedIdentitySha256:authority});
 const next=runAIGReal3DV97PhotoConstrainedModel({
  ...input,approvedIdentitySha256:authority});
 assert.equal(next.state,'IMAGE_CONSTRAINED_INFERRED_3D_CANDIDATE');
 assert.equal(next.actualColorMaskObserved,true);
 assert.ok(next.actualHeadVerticesMoved>100);
 assert.ok(next.contourErrorAfter+1e-5<next.contourErrorBefore);
 assert.equal(next.actualFaceContourFitImprovementMeasured,true);
 assert.equal(next.real3DAnimatedJoints,6);
 assert.equal(next.real3DSkinnedTriangles,previous.source3DMeshTriangles);
 const original=previous.candidate.mesh,after=next.candidate.mesh;
 assert.notDeepEqual(after.positions.slice(0,300),original.positions.slice(0,300));
 assert.deepEqual(after.indices,original.indices);
 // HEAD ends at 2 + (14-1)*28 = 366 original vertices. Rest never changes.
 assert.deepEqual(after.positions.slice(366*3),original.positions.slice(366*3));
 assert.deepEqual(after.positions.filter((_,i)=>i%3===2).slice(0,366),
  original.positions.filter((_,i)=>i%3===2).slice(0,366));
 assert.equal(next.sourceHeroineIdentityVerified,false);
 assert.equal(next.final3DFacialLikenessCertified,false);
 assert.equal(next.releasePASS,false);
 const pose1=next.candidate.rig.pose(0).meshes.bodyCandidate;
 const pose2=next.candidate.rig.pose(.5).meshes.bodyCandidate;
 assert.notDeepEqual(pose1.positions,pose2.positions);
});
test('V97 absent source mask cannot be falsely treated as semantic face reconstruction',()=>{
 const noFace=portrait('none');
 const a=runAIGReal3DV97PhotoConstrainedModel({
  ...noFace,approvedIdentitySha256:authority});
 assert.equal(a.state,'BLOCK_FACE_NOT_FOUND');
 assert.equal(a.candidate,null);
 assert.equal(a.sourceHeroineIdentityVerified,false);
});
test('V97 source color contour cannot be reused across two different image hashes',()=>{
 const input=portrait();
 const base=runAIGReal3DLocalPortraitToRig({
  ...input,approvedIdentitySha256:authority});
 const rows=extractAIGReal3DObservedFaceSilhouette({
  ...input,faceBox:base.vision.faceBox});
 assert.ok(rows.totalMaskRows>=10);
 assert.equal(rows.maskIsColorHeuristicNotTrainedSemanticModel,true);
 assert.equal(rows.imageObservedDepth,false);
 assert.equal(rows.subjectIdentityConfirmed,false);
 assert.throws(()=>runAIGReal3DV97PhotoConstrainedModel({
  ...input,imageSha256:'short',approvedIdentitySha256:authority
 }),/ORIGINAL_FACE_SHA_REQUIRED/);
});
test('V97 exports real glTF 2.0 binary Indexed XYZ and genuine deformation morph timeline',()=>{
 const r=runAIGReal3DV97PhotoConstrainedModel({
  ...portrait(),approvedIdentitySha256:authority});
 const original=JSON.stringify(r.candidate.mesh);
 const glb=exportAIGReal3DV97AnimatedGLB({
  candidate:r.candidate,sourceImageSha256:source});
 const bytes=glb.bytes,dv=new DataView(bytes.buffer);
 assert.equal(dv.getUint32(0,true),0x46546c67);
 assert.equal(dv.getUint32(4,true),2);
 assert.equal(dv.getUint32(8,true),bytes.byteLength);
 const jsonLength=dv.getUint32(12,true);
 assert.equal(dv.getUint32(16,true),0x4e4f534a);
 const json=JSON.parse(new TextDecoder().decode(bytes.subarray(20,20+jsonLength)));
 assert.equal(json.asset.version,'2.0');
 assert.equal(json.meshes[0].primitives[0].mode,4);
 assert.equal(json.meshes[0].primitives[0].targets.length,3);
 assert.equal(json.animations[0].channels[0].target.path,'weights');
 assert.equal(json.accessors[json.animations[0].samplers[0].input].count,4);
 assert.equal(json.accessors[json.animations[0].samplers[0].output].count,12);
 assert.equal(json.extras.sourceIdentityFaceStillBlocked,true);
 assert.equal(json.extras.nativeGlTFBones,false);
 assert.equal(glb.indexedTriangles,r.candidate.mesh.triangleCount);
 assert.equal(glb.glTFMorphAnimationActuallyIncluded,true);
 assert.equal(JSON.stringify(r.candidate.mesh),original);
 assert.equal(glb.releasePASS,false);
 const binStart=20+jsonLength;
 assert.equal(dv.getUint32(binStart+4,true),0x004e4942);
 const binLen=dv.getUint32(binStart,true);
 assert.equal(binLen,json.buffers[0].byteLength);
});
test('V97 refuses forged source hash or absent real source 3D when exporting',()=>{
 const r=runAIGReal3DV97PhotoConstrainedModel({
  ...portrait(),approvedIdentitySha256:authority});
 assert.throws(()=>exportAIGReal3DV97AnimatedGLB({
  candidate:r.candidate,sourceImageSha256:authority
 }),/SOURCE_RIG_TIME_OR_IDENTITY_INVALID/);
 assert.throws(()=>exportAIGReal3DV97AnimatedGLB({
  candidate:r.candidate,sourceImageSha256:source,
  sampleTimes:[0,.5,.5,1.5]
 }),/SOURCE_RIG_TIME_OR_IDENTITY_INVALID/);
});
