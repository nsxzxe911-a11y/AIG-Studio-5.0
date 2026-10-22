import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {auditAIG50FullBody} from '../aig-fullbody-5-0.mjs';
import {auditAIG63SchoolModelActualGLTF} from '../aig-visual-compare-6-3.mjs';
import {AIG64_AUTOBODY_SCHEMA,AIG64_DEFAULT_HEAD_TO_BODY_RATIO,
 analyzeAIG64PartialPortrait,generateAIG64SinglePartialFullbody}
 from '../aig-single-photo-autobody-6-4.mjs';

const HASH='f'.repeat(64),w=320,h=480;
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
function photo(kind='face'){
 const pixels=new Uint8ClampedArray(w*h*4);
 for(let i=0;i<pixels.length;i+=4){
  pixels[i]=238;pixels[i+1]=235;pixels[i+2]=230;pixels[i+3]=255;
 }
 function ellipse(cx,cy,rx,ry){
  for(let y=Math.max(0,cy-ry);y<=Math.min(h-1,cy+ry);y++)
   for(let x=Math.max(0,cx-rx);x<=Math.min(w-1,cx+rx);x++){
    if(((x-cx)/rx)**2+((y-cy)/ry)**2>1)continue;
    const i=(y*w+x)*4;
    pixels[i]=68;pixels[i+1]=53;pixels[i+2]=52;pixels[i+3]=255;
   }
 }
 if(kind!=='blank'){
  ellipse(160,105,39,74);
  if(kind==='upper'){
   // Upper body should share part of head region in this single image.
   ellipse(160,290,85,144);
  }
 }
 return pixels;
}
const inputs=kind=>({
 pixels:photo(kind),imageWidth:w,imageHeight:h,sourceImageSHA256:HASH
});
test('6.4 ONLY ONE face image estimates complete normal human proportions without multi-angle or manual marks',async()=>{
 const result=analyzeAIG64PartialPortrait(inputs('face'));
 assert.equal(result.schema,AIG64_AUTOBODY_SCHEMA);
 assert.equal(result.photoCoverage,'FACE_OR_HEAD_ONLY_VISIBLE');
 assert.equal(result.headToBodyRatioPrior,7.5);
 assert.equal(result.widthToHeightModelRatio,.48);
 assert.equal(result.noAdditionalAnglesRequired,true);
 assert.equal(result.hasReliableMeasuredHeight,false);
 assert.equal(result.inferredUnseenLegsArmsTorso,true);
 assert.equal(result.releaseAllowed,false);
 assert.equal(result.scaffold.proportions.ratiosByImageHeight.length,11);
 assert.ok(result.scaffold.proportions.ratiosByImageHeight.every(
  r=>r.source==='INFERRED_STANDARD_HUMAN_PROPORTION_NOT_PHOTO_OBSERVATION'));
 const model=generateAIG64SinglePartialFullbody({analysis:result});
 assert.equal(model.generatedCompleteTechnicalBody,true);
 assert.equal(model.inputCoverage,'FACE_OR_HEAD_ONLY_VISIBLE');
 assert.equal(model.noBackOrSidePhotoRequired,true);
 assert.equal(model.riggedBoneCount,17);
 assert.ok(model.actualTechnicalHeadToBodyRatio>7.4&&
  model.actualTechnicalHeadToBodyRatio<7.6,
  'real mesh head-to-body geometry must use ~7.5 heads, not metadata only');
 assert.ok(model.actuallyRemeshedVertexCount>200);
 assert.ok(model.actualLegLengthStretchFactor>1.1);
 assert.equal(model.skinnedMeshCount,9);
 assert.equal(model.animationClipCount,5);
 assert.equal(model.originalPhotoFullbodyLikenessVerified,false);
 assert.equal(model.releaseAllowed,false);
 const gltf=await new GLTFLoader().parseAsync(model.bytes.buffer,'');
 const qa=await auditAIG50FullBody(gltf,{sourceSHA256:digest(model.bytes)});
 assert.equal(qa.outcome,'STRUCTURAL_QA_PASS_ONLY');
 assert.equal(qa.skinnedMeshCount,9);
 assert.equal(qa.clipsAvailable,5);
 assert.equal(qa.boneCount,17);
 const uniform=auditAIG63SchoolModelActualGLTF(gltf,{modelGLBSHA256:digest(model.bytes)});
 assert.equal(uniform.schoolOutfitMeshesPresent,true);
});
test('6.4 one upper-body photo can constrain width but still invents unseen legs and back conservatively',()=>{
 const scan=analyzeAIG64PartialPortrait(inputs('upper'));
 assert.equal(scan.photoCoverage,'HEAD_AND_UPPER_BODY_VISIBLE');
 assert.ok(scan.widthToHeightModelRatio>=.43);
 assert.ok(scan.widthToHeightModelRatio<=.56);
 assert.ok(scan.scaffold.proportions.ratiosByImageHeight.some(
  r=>r.source==='UPPER_BODY_PIXEL_WIDTH_AS_LOOSE_CONSTRAINT'));
 const generated=generateAIG64SinglePartialFullbody({analysis:scan});
 assert.equal(generated.unseenPhotoRegionsProcedurallyEstimated,true);
 assert.equal(generated.originalPhotoFaceIdentityReconstructed,false);
 assert.equal(generated.generatedWholeBodyParts.includes('rightLeg'),true);
 assert.equal(generated.noBackOrSidePhotoRequired,true);
 assert.ok(Math.abs(generated.actualTechnicalHeadToBodyRatio-7.5)<.05);
});
test('6.4 selected connected human silhouette excludes floating background object from measured head/shoulder widths',()=>{
 const base=inputs('upper');
 const noisy={...base,pixels:new Uint8ClampedArray(base.pixels)};
 // Detached object inside the main person's BOUNDING BOX, but not connected
 // to that person. Bounding-box-only masking previously poisoned widths.
 for(let y=70;y<=161;y++)for(let x=83;x<=98;x++){
  const k=(y*w+x)*4;
  noisy.pixels[k]=68;noisy.pixels[k+1]=53;
  noisy.pixels[k+2]=52;noisy.pixels[k+3]=255;
 }
 const a=analyzeAIG64PartialPortrait(base);
 const b=analyzeAIG64PartialPortrait(noisy);
 assert.equal(b.photoCoverage,a.photoCoverage);
 assert.equal(b.widthToHeightModelRatio,a.widthToHeightModelRatio);
 assert.deepEqual(b.detectedForegroundThumbnailBox,a.detectedForegroundThumbnailBox);
 assert.deepEqual(b.scaffold.proportions.ratiosByImageHeight,
  a.scaffold.proportions.ratiosByImageHeight);
});
test('6.4 rejects no person, forged SHA, bad image, forced multi-person or fabricated approved scaffold',()=>{
 assert.throws(()=>analyzeAIG64PartialPortrait(inputs('blank')),
  /AIG64_NO_OBSERVABLE_SUBJECT_CONTRAST/);
 assert.throws(()=>analyzeAIG64PartialPortrait({...inputs('face'),
  sourceImageSHA256:'x'}),/AIG64_PARTIAL_IMAGE_SOURCE/);
 assert.throws(()=>analyzeAIG64PartialPortrait({...inputs('face'),
  imageWidth:48}),/AIG64_PARTIAL_IMAGE_SOURCE/);
 assert.throws(()=>analyzeAIG64PartialPortrait({...inputs('upper'),
  expectedPersonCount:2}),/AIG64_PARTIAL_IMAGE_SOURCE/);
 const evidence=analyzeAIG64PartialPortrait(inputs('face'));
 assert.throws(()=>generateAIG64SinglePartialFullbody({analysis:{
  ...evidence,releaseAllowed:true}}),/AIG64_UNTRUSTED/);
 assert.throws(()=>generateAIG64SinglePartialFullbody({analysis:{
  ...evidence,scaffold:{...evidence.scaffold,releaseAllowed:true}
 }}),/AIG64_UNTRUSTED/);
});
test('6.4 deterministic real GLB for identical single-photo pixels and no external service',()=>{
 const p=analyzeAIG64PartialPortrait(inputs('face'));
 const modelA=generateAIG64SinglePartialFullbody({analysis:p});
 const modelB=generateAIG64SinglePartialFullbody({analysis:p});
 assert.equal(digest(modelA.bytes),digest(modelB.bytes));
 assert.equal(modelA.sourceImageSHA256,HASH);
 assert.equal(modelA.anatomicallyPlausibleEstimateOnly,true);
 assert.equal(modelA.mobileNative60FPSMeasured,false);
});
test('6.4 independent RGB direct-entry without 4.0/5.4/6.0 source, no wardrobe loss',()=>{
 const read=f=>fs.readFileSync(new URL('../'+f,import.meta.url),'utf8');
 const html=read('index.html'),app=read('app.mjs');
 for(const id of ['aig64-single-photo','aig64-single-build',
  'aig64-single-download','aig64-single-report','aig64-single-status'])
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 for(const id of ['aig64-single-build','aig64-single-download','aig64-single-report'])
  assert.ok(app.includes("$('"+id+"').addEventListener('click'"),id);
 assert.ok(app.includes('analyzeAIG64PartialPortrait({'));
 assert.ok(app.includes('generateAIG64SinglePartialFullbody({analysis})'));
 assert.ok(app.includes('await parseRiggedGLB(output.bytes.buffer)'));
 assert.ok(app.includes('await auditAIG50FullBody(parsed,'));
 assert.ok(app.includes('await load(output.bytes.buffer,false,{technical:true})'));
 assert.ok(app.includes("aig64SingleBytes=output.bytes"));
 assert.ok(app.includes("aig64-single-photo').files"));
 assert.ok(app.includes('new MovieWorkspace('));
 assert.ok(app.includes('generateVoiceBatch('));
 assert.ok(read('aig-native-appearance-5-7.mjs').includes('makeSkirt(width)'));
 const m=JSON.parse(read('AIG62-SCHOOL-VISUAL-ASSETS.json'));
 assert.equal(m.otherCostumesAndSwimwearStillAvailable,true);
});
