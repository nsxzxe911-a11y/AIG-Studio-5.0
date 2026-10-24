import test from 'node:test';
import assert from 'node:assert/strict';
import {planAIGReal3DV117PhotoReconstruction,
 verifyAIGReal3DV117RealGPUInspection}
 from '../aig-real3d-v117-evidence-orchestrator.mjs';
const hash=c=>c.repeat(64);
function input({w=128,h=128,transparent=false,complex=false}={}){
 const rgba=new Uint8ClampedArray(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const fg=x>=38&&x<=89&&y>=20&&y<=107;
  const bg=complex?(((Math.floor(x/8)+Math.floor(y/8))%2)?
   [31,155,78]:[219,177,48]):[232,231,224];
  const color=fg?[36,92,186]:bg;
  rgba.set([...color,transparent&&!fg?0:255],(y*w+x)*4);
 }
 return {rgba,width:w,height:h,sourcePhotoSha256:hash('a')};
}
test('V117 fully automatic actual transparent source routes to real GLB with 5 approved GPU poses, no neural claims',()=>{
 const source=input({transparent:true}),before=Uint8ClampedArray.from(source.rgba);
 const p=planAIGReal3DV117PhotoReconstruction(source);
 assert.equal(p.status,'READY_FOR_TRUE_GLB_GPU');
 assert.equal(p.selectedForegroundModule,'ORIGINAL_ALPHA_ALREADY_SEGMENTED');
 assert.equal(p.route,'V109_SOURCE_PNG_GLTF_THEN_V107_5AX_GPU');
 assert.equal(p.geometryType,'FLAT_FRONT_ONLY_2_5D');
 assert.equal(p.actualNeuralModelExecuted,false);
 assert.equal(p.originalPhoto1to1LikenessNotCertified,true);
 assert.equal(p.proposedGPUPoseSweep.length,5);
 assert.deepEqual([...source.rgba],[...before]);
 const modelSha256=hash('f'),sourceTriangles=3724;
 const actualFrames=p.proposedGPUPoseSweep.map(q=>({
  status:'WEBGL_XYZ_TRIANGLES_RENDERED',sourceSHA:modelSha256,
  triangles:sourceTriangles,aTiltDeg:q.a,bTurnDeg:q.b,
  sourceHeightProgress:q.progress,gpuClipEnabled:q.progress<1
 }));
 const receipt=verifyAIGReal3DV117RealGPUInspection({
  plan:p,modelSha256,sourceTriangles,actualFrames});
 assert.equal(receipt.checkedRealGPUFrames,5);
 assert.equal(receipt.actualGPUResult,'PASS_SOURCE_GLTF_FIVE_POSE_INSPECTION');
 assert.equal(receipt.productionReleasePASS,false);
 assert.throws(()=>verifyAIGReal3DV117RealGPUInspection({
  plan:p,modelSha256,sourceTriangles,actualFrames:actualFrames.map(
   (x,i)=>i===3?{...x,sourceSHA:hash('b')}:x)}),/WRONG_SOURCE_OR_FAKED_STATE/);
});
test('V117 opaque plain-background image autonomously segments source colors',()=>{
 const p=planAIGReal3DV117PhotoReconstruction(input());
 assert.equal(p.status,'READY_FOR_TRUE_GLB_GPU');
 assert.equal(p.selectedForegroundModule,'AUTO_SIMPLE_BORDER_BG');
 assert.equal(p.sourceEvidenceTier,'DETERMINISTIC_SIMPLE_BACKGROUND');
 assert.equal(p.realPixelClassificationPerformed,true);
 assert.equal(p.workingRGBA[3],0);
 assert.equal(p.workingRGBA[(60*128+60)*4+3],255);
});
test('V117 complex opaque source must not pretend automatic human recognition',()=>{
 const s=input({complex:true});
 const p=planAIGReal3DV117PhotoReconstruction(s);
 assert.equal(p.status,'NEEDS_SOURCE_REVIEW');
 assert.equal(p.actualNeuralModelExecuted,false);
 assert.equal(p.autoSubmittedToGPU,false);
 assert.match(p.nextAction,/V111/);
 const seeded=planAIGReal3DV117PhotoReconstruction({
  ...s,foregroundSeeds:[{x:44,y:27},{x:69,y:70}],
  backgroundSeeds:[{x:5,y:4},{x:12,y:4}]});
 assert.equal(seeded.status,'READY_FOR_TRUE_GLB_GPU',JSON.stringify(seeded,(k,v)=>k==='workingRGBA'?'OMITTED':v));
 assert.equal(seeded.selectedForegroundModule,'V111_USER_SEEDED_COMPLEX_BACKGROUND');
 assert.equal(seeded.sourceEvidenceTier,'USER_INTERACTIVE_UNVERIFIED');
 assert.equal(seeded.workingRGBA[3],0);
});
test('V117 independent reviewed mask routes without requiring background model inference',()=>{
 const s=input({complex:true}),mask=new Uint8ClampedArray(s.rgba.length);
 for(let y=0;y<128;y++)for(let x=0;x<128;x++){
  const v=x>=38&&x<=89&&y>=20&&y<=107?255:0;
  mask.set([v,v,v,255],(y*128+x)*4);
 }
 const before=Uint8ClampedArray.from(s.rgba);
 const p=planAIGReal3DV117PhotoReconstruction({...s,
  externalMaskRGBA:mask,externalMaskSha256:hash('c'),
  externalMaskConfirmed:true});
 assert.equal(p.status,'READY_FOR_TRUE_GLB_GPU');
 assert.equal(p.selectedForegroundModule,'EXTERNAL_USER_REVIEWED_MASK_NOT_AI_CERTIFIED');
 assert.equal(p.sourceEvidenceTier,'EXTERNAL_USER_REVIEWED_UNVERIFIED');
 assert.equal(p.sourceCoverage.externalMaskSha256,hash('c'));
 assert.deepEqual([...s.rgba],[...before]);
 const bad=planAIGReal3DV117PhotoReconstruction({...s,
  externalMaskRGBA:mask,externalMaskSha256:hash('c')});
 assert.notEqual(bad.status,'READY_FOR_TRUE_GLB_GPU');
});
test('V117 real 3D request, fake depth, absent photo and conflicting masks always fail closed',()=>{
 const base=input();
 assert.equal(planAIGReal3DV117PhotoReconstruction({...base,
  desiredOutput:'REQUIRE_COMPLETE_3D'}).code,
  'SINGLE_VIEW_CANNOT_PROVE_UNOBSERVED_BACKSIDE');
 assert.equal(planAIGReal3DV117PhotoReconstruction({...base,
  depthMeasurementDeclared:true}).code,'DEPTH_SOURCE_MISSING');
 assert.equal(planAIGReal3DV117PhotoReconstruction({...base,
  depthSourceSha256:hash('b')}).code,'INDEPENDENT_DEPTH_EVIDENCE_REQUIRED');
 assert.throws(()=>planAIGReal3DV117PhotoReconstruction({
  ...base,sourcePhotoSha256:'fake'}),/ACTUAL_SOURCE_PIXELS_DIMENSIONS_AND_SHA_REQUIRED/);
 const mixed=planAIGReal3DV117PhotoReconstruction({...base,
  externalMaskRGBA:base.rgba,externalMaskSha256:hash('b'),
  externalMaskConfirmed:true,
  foregroundSeeds:[{x:41,y:21},{x:58,y:62}],
  backgroundSeeds:[{x:3,y:3},{x:9,y:3}]});
 assert.equal(mixed.code,'CONFLICTING_MASK_AND_USER_SEEDS');
});
