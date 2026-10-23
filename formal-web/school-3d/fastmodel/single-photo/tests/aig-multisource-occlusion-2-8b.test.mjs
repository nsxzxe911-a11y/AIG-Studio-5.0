import test from 'node:test';
import assert from 'node:assert/strict';
import {addAIG28BReviewedSource,auditAIG28BVisibleBoundary,
 trainAIG28BMultiPhoto,evaluateAIG28BHoldout}
 from '../aig-multisource-occlusion-2-8b.mjs';
import {assertAIG28Model,fingerprintAIG28Model}
 from '../aig-local-learner-2-8.mjs';
const IDs=[0,3,4,14];
const statement='VISIBLE_SOURCE_PIXELS_REVIEWED_NOT_HIDDEN_GEOMETRY';
function source(tag,shift=0){
 const width=160,height=128,pixels=new Uint8ClampedArray(width*height*4),
 labels=new Uint8Array(width*height);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  let id=0,colors=[228,220,208];
  if(x>=30&&x<130&&y>=30&&y<120){id=14;colors=[45,72,145]}
  if(x>=56&&x<104&&y>=12&&y<57){id=3;colors=[73,47,35]}
  if(x>=67&&x<93&&y>=57&&y<79){id=4;colors=[179,131,99]}
  const i=y*width+x,k=i*4;
  labels[i]=id;
  for(let c=0;c<3;c++)pixels[k+c]=colors[c]+shift;
  pixels[k+3]=255;
 }
 return {sourceSha256:'sha256:'+tag.repeat(64),width,height,pixels,
  labels,humanReviewed:true,humanReviewStatement:statement};
}
test('2.8-B trains genuinely distinct reviewed photos, sees all classes and blocks mutable source corruption',async()=>{
 const a=source('a'),b=source('b',3),hold=source('c',6);
 let data=addAIG28BReviewedSource([],a,{classIds:IDs});
 data=addAIG28BReviewedSource(data,b,{classIds:IDs});
 assert.equal(data.length,2);
 const firstBefore=data[0].pixels[0];
 a.pixels[0]=0;a.labels[0]=14;
 assert.equal(data[0].pixels[0],firstBefore,'dataset must snapshot real image bytes');
 assert.equal(data[0].labels[0],0,'reviewed mask must be immutable snapshot');
 assert.throws(()=>addAIG28BReviewedSource(data,b,{classIds:IDs}),
  /DUPLICATE_SOURCE_SHA_NO_TRAINING_LEAKAGE/);
 assert.throws(()=>addAIG28BReviewedSource(data,source('d'),{
  classIds:[0,3,14]}),/INCONSISTENT_CLASS_MANIFEST/);
 const model=trainAIG28BMultiPhoto(data,{epochs:280,learningRate:.4});
 assertAIG28Model(model);
 assert.equal(model.reviewedPhotoCount,2);
 assert.deepEqual(model.trainSourceSha256,[source('a').sourceSha256,b.sourceSha256]);
 assert.equal(model.reviewedMultiSourceTraining,true);
 assert.ok(model.trainingLossFinal<model.trainingLossInitial);
 assert.match(await fingerprintAIG28Model(model),/^sha256:[a-f0-9]{64}$/);
 const ev=evaluateAIG28BHoldout(model,hold,{
  confidenceThreshold:.60,minClassIoU:.60,maxAbstention:.25});
 assert.equal(ev.sourceDisjointHoldout,true);
 assert.equal(ev.thresholdGatePass,true,JSON.stringify(ev));
 assert.equal(ev.failedClasses.length,0);
 assert.equal(ev.perClassIoU.length,4);
 assert.ok(ev.perClassIoU.every(v=>v.IoU>.6),JSON.stringify(ev.perClassIoU));
 assert.equal(ev.generalRealPhotoSemanticAccuracyCertified,false);
});
test('2.8-B stops training photo used as held-out new source, denies unreviewed or guessed anatomy',()=>{
 const a=source('a'),b=source('b',4);
 assert.throws(()=>addAIG28BReviewedSource([],{
  ...a,humanReviewed:false},{classIds:IDs}),
 /EXPLICIT_VISIBLE_SOURCE_REVIEW/);
 assert.throws(()=>addAIG28BReviewedSource([],{
  ...a,humanReviewStatement:'AUTO_REVIEWED_BY_FAKE_AI'},{classIds:IDs}),
 /EXPLICIT_VISIBLE_SOURCE_REVIEW/);
 const data=addAIG28BReviewedSource(
  addAIG28BReviewedSource([],a,{classIds:IDs}),b,{classIds:IDs});
 const model=trainAIG28BMultiPhoto(data,{epochs:100});
 assert.throws(()=>evaluateAIG28BHoldout(model,a),
 /HOLDOUT_MUST_BE_NEW_INDEPENDENT_REVIEWED_PHOTO/);
 assert.throws(()=>trainAIG28BMultiPhoto(data.slice(0,1)),
 /AT_LEAST_TWO_DISTINCT_REVIEWED_PHOTOS_REQUIRED/);
});
test('2.8-B hair-to-neck contact reports actual visible pixel boundary, never invents hidden neck',()=>{
 const x=source('e');
 const p=auditAIG28BVisibleBoundary({
  labels:x.labels,width:x.width,height:x.height,
  sourceSha256:x.sourceSha256});
 assert.ok(p.observedHairNeckContactPixels>0);
 assert.equal(p.photoHairNeckBoundaryObserved,true);
 assert.equal(p.requiresReview,true);
 assert.equal(p.hiddenNeckReconstructed,false);
 assert.equal(p.inferredUnderHair3DVertices,0);
 assert.equal(p.hairNeckTissueCollisionCertified,false);
 const unknown=new Uint8Array(x.labels);
 for(let y=57;y<63;y++)for(let i=57;i<67;i++)
  unknown[y*x.width+i]=255;
 const q=auditAIG28BVisibleBoundary({
  labels:unknown,width:x.width,height:x.height,
  sourceSha256:x.sourceSha256});
 assert.ok(q.unknownPixels>0);
 assert.equal(q.hiddenNeckReconstructed,false);
 assert.throws(()=>auditAIG28BVisibleBoundary({
  ...x,sourceSha256:'sha256:fake'}),/EXACT_SOURCE_PIXEL_BOUNDARY_REQUIRED/);
});
