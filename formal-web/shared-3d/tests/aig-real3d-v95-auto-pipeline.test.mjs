import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeAIGReal3DPortraitPixels}
 from '../aig-real3d-v95-photo-vision.mjs';
import {buildAIGReal3DProvisionalBody}
 from '../aig-real3d-v95-provisional-rig.mjs';
import {createAIGReal3DResourceScheduler,runAIGReal3DLocalPortraitToRig,
 planAIGReal3DFilmSegments}
 from '../aig-real3d-v95-ai-orchestrator.mjs';
const sha='a'.repeat(64),approvedSha='b'.repeat(64);
function portrait(){
 const width=256,height=256,rgba=new Uint8ClampedArray(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const p=(y*width+x)*4;
  const skin=x>=95&&x<=159&&y>=27&&y<=109;
  rgba[p]=skin?211:12;rgba[p+1]=skin?143:26;
  rgba[p+2]=skin?112:56;rgba[p+3]=255;
 }
 return {rgba,width,height,imageSha256:sha};
}
test('V95 local pixel portrait detection is explicitly weak and not identity ML',()=>{
 const v=analyzeAIGReal3DPortraitPixels(portrait());
 assert.equal(v.result,'INFERRED_MODEL_CANDIDATE_ONLY');
 assert.equal(v.confidence,'LOW');
 assert.equal(v.trainedMLInferenceActuallyUsed,false);
 assert.ok(v.faceBox.width>45&&v.faceBox.height>65);
 assert.equal(v.identityFaceSimilarityMeasured,false);
});
test('V95 fully missing portrait face is BLOCK not synthetic identity success',()=>{
 const src=portrait();src.rgba.fill(0);
 const v=analyzeAIGReal3DPortraitPixels(src);
 assert.equal(v.result,'BLOCK_SOURCE_FACE_NOT_FOUND');
 const pipeline=runAIGReal3DLocalPortraitToRig({
  ...src,approvedIdentitySha256:approvedSha});
 assert.equal(pipeline.true3DModelGenerated,false);
 assert.equal(pipeline.state,'BLOCK_NO_OBSERVED_FACE');
});
test('V95 shoulder portrait automatically creates real XYZ full-body candidate with valid 6-joint skinned animation',()=>{
 const out=runAIGReal3DLocalPortraitToRig({
  ...portrait(),approvedIdentitySha256:approvedSha});
 assert.equal(out.state,'WORKING_3D_ESTIMATED_CANDIDATE');
 assert.equal(out.true3DModelGenerated,true);
 assert.ok(out.source3DMeshTriangles>2000);
 assert.equal(out.actualSkinnedJoints,6);
 assert.equal(out.sourceHeroineIdentityVerified,false);
 assert.equal(out.candidate.status,'INFERRED_CANDIDATE_NEEDS_HEROINE_IDENTITY_REVIEW');
 const rig=out.candidate.rig;
 const before=rig.pose(0).meshes.bodyCandidate.positions;
 const after=rig.pose(.5).meshes.bodyCandidate.positions;
 assert.notDeepEqual(before,after);
 assert.deepEqual(rig.pose(.5).meshes.bodyCandidate.indices,
  out.candidate.mesh.indices);
 assert.equal(out.candidate.sourceMeasuredFullBodyHeightMeters,null);
 assert.equal(out.candidate.generatedProxyNotRealPhotoFacialReconstruction,true);
 assert.equal(out.releasePASS,false);
});
test('V95 source SHA may match canonical file but never implies face recognition',()=>{
 const result=runAIGReal3DLocalPortraitToRig({
  ...portrait(),approvedIdentitySha256:sha,
  approvedIdentitySourcePresent:true});
 assert.equal(result.sourceImageMatchesApprovedSHA,true);
 assert.equal(result.sourceHeroineIdentityVerified,false);
 assert.equal(result.candidate.identityVisualSimilarityConfirmed,false);
});
test('V95 rejects spoofed identity source, out-of-range pixels and untrusted detector',()=>{
 const src=portrait();
 assert.throws(()=>runAIGReal3DLocalPortraitToRig({
  ...src,approvedIdentitySha256:'not-a-sha'}),/CHARACTER_IDENTITY_SOURCE_REQUIRED/);
 assert.throws(()=>analyzeAIGReal3DPortraitPixels({
  ...src,width:11000}),/SOURCE_IMAGE_OR_SHA_INVALID/);
 assert.throws(()=>analyzeAIGReal3DPortraitPixels({
  ...src,faceLandmarks:{faceBox:{x:240,y:15,width:30,height:30}}}),
  /OBSERVED_FACE_OUTSIDE_IMAGE/);
});
test('V95 FULL/HALF preview shares exact whole skinned skeleton, not a 2D moving image',()=>{
 const v=analyzeAIGReal3DPortraitPixels(portrait());
 const a=buildAIGReal3DProvisionalBody({vision:v,
  sourceImageSha256:sha,approvedIdentitySha256:approvedSha,
  wrapMode:'FULL_WRAP'});
 const b=buildAIGReal3DProvisionalBody({vision:v,
  sourceImageSha256:sha,approvedIdentitySha256:approvedSha,
  wrapMode:'HALF_WRAP'});
 assert.deepEqual(a.rig.pose(.25).meshes,b.rig.pose(.25).meshes);
 assert.equal(a.mesh.actualXYZTriangles,true);
 assert.equal(b.rig.stats().fullSkeletonAlwaysEvaluated,true);
});
test('V95 bounded geometry LRU cache and real measured GPU budget policy',()=>{
 const scheduler=createAIGReal3DResourceScheduler({maxCacheBytes:512000});
 const src=portrait(),options={...src,approvedIdentitySha256:approvedSha,scheduler};
 const a=runAIGReal3DLocalPortraitToRig(options);
 const b=runAIGReal3DLocalPortraitToRig(options);
 assert.equal(a.resourceCacheHit,false);assert.equal(b.resourceCacheHit,true);
 assert.equal(scheduler.snapshot().cacheHits,1);
 assert.equal(scheduler.decide({triangles:300000,frameRenderMilliseconds:45,
  dynamicJointCount:6,targetFPS:60}).mode,'REDUCE_FUTURE_DETAIL');
 assert.equal(scheduler.decide({triangles:3000,frameRenderMilliseconds:6,
  dynamicJointCount:6,targetFPS:60}).mode,'ALLOW_SOURCE_DETAIL');
 assert.equal(scheduler.snapshot().GPUActualAccelerationMeasured,false);
});
test('V95 2:12:08 schedules real chunk/frame IDs but does not pretend to encode movie',()=>{
 const p=planAIGReal3DFilmSegments();
 assert.equal(p.durationSeconds,7928);
 assert.equal(p.totalFrames,190272);
 assert.equal(p.frameRateRequested,24);
 assert.equal(p.segmentCount,496);
 assert.equal(p.segments[0].startFrame,0);
 assert.equal(p.segments.at(-1).endFrameExclusive,190272);
 assert.equal(p.producedFrames,0);
 assert.equal(p.actuallyEncodedMovie,false);
 assert.equal(p.fullMovieReleasePASS,false);
});
