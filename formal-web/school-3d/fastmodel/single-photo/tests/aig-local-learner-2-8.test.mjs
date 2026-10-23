import test from 'node:test';
import assert from 'node:assert/strict';
import {trainAIG28PixelModel,assertAIG28Model,inferAIG28Pixels,
 evaluateAIG28IndependentSource,fingerprintAIG28Model}
 from '../aig-local-learner-2-8.mjs';
function specimen(digest='a',shift=0){
 const width=128,height=128,pixels=new Uint8ClampedArray(width*height*4),
  labels=new Uint8Array(width*height);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const id=x<43?0:x<86?3:14,i=y*width+x,k=i*4;
  const rgb=id===0?[235,230,219]:id===3?[63,45,35]:[48,75,157];
  labels[i]=id;
  for(let j=0;j<3;j++)pixels[k+j]=rgb[j]+shift;
  pixels[k+3]=255;
 }
 return {width,height,pixels,labels,sourceSha256:'sha256:'+digest.repeat(64),
  humanReviewed:true};
}
test('2.8 actual first-party source-supervised loss decreases and automatically infers different-source held-out pixel labels',()=>{
 const source=specimen(),unchanged=source.pixels.slice();
 const model=trainAIG28PixelModel({examples:[source],classIds:[0,3,14],
  epochs:220,learningRate:.3});
 assert.equal(assertAIG28Model(model),true);
 assert.equal(model.weights.length,27);
 assert.ok(model.trainingLossFinal<model.trainingLossInitial*.2);
 assert.equal(model.pretrainedUniversalVisionWeightsIncluded,false);
 assert.equal(model.independentCrossPhotoAccuracyVerified,false);
 const fresh=specimen('b',5);
 const auto=inferAIG28Pixels({model,...fresh,confidenceThreshold:.62});
 assert.equal(auto.automaticLearnedPixelInferenceExecuted,true);
 assert.equal(auto.inferencePhotoDifferentFromTraining,true);
 assert.equal(auto.knownPixels,fresh.width*fresh.height);
 assert.equal(auto.labels[20],0);
 assert.equal(auto.labels[60],3);
 assert.equal(auto.labels[110],14);
 const evaluation=evaluateAIG28IndependentSource({model,...fresh,
  reviewedLabels:fresh.labels,humanReviewed:true,confidenceThreshold:.62});
 assert.equal(evaluation.independentlyReviewedNewSource,true);
 assert.ok(evaluation.meanIoU>.9,'synthetic fixture only; not natural photo benchmark');
 assert.equal(evaluation.generalSemanticUseApproved,false);
 assert.deepEqual(source.pixels,unchanged);
});
test('2.8 unreviewed pseudo-mask is not automatically promoted to ML training ground truth',()=>{
 const source=specimen();
 assert.throws(()=>trainAIG28PixelModel({
  examples:[{...source,humanReviewed:false}],classIds:[0,3,14]}),
 /REAL_DISTINCT_SOURCE_AND_HUMAN_REVIEW_REQUIRED/);
 assert.throws(()=>trainAIG28PixelModel({examples:[source],classIds:[3,14]}),
 /CLASS_SET_MUST_INCLUDE_BACKGROUND/);
 assert.throws(()=>trainAIG28PixelModel({
  examples:[source,source],classIds:[0,3,14]}),
 /REAL_DISTINCT_SOURCE_AND_HUMAN_REVIEW_REQUIRED/);
 assert.throws(()=>trainAIG28PixelModel({
  examples:[source],classIds:[0,3,14],epochs:0}),
 /SUPERVISED_TRAINING_PARAMETERS_INVALID/);
 const model=trainAIG28PixelModel({examples:[source],classIds:[0,3,14],
  epochs:35,learningRate:.3});
 const tampered={...model,weights:[...model.weights,99999]};
 assert.throws(()=>assertAIG28Model(tampered),/WEIGHTS_OR_REVIEWED_TRAINING_PROVENANCE_INVALID/);
 assert.throws(()=>evaluateAIG28IndependentSource({model,...source,
  reviewedLabels:source.labels,humanReviewed:true}),
 /INDEPENDENT_REVIEWED_DIFFERENT_SOURCE_REQUIRED/);
 assert.throws(()=>evaluateAIG28IndependentSource({model,...specimen('b',5),
  reviewedLabels:specimen('b',5).labels,humanReviewed:false}),
 /INDEPENDENT_REVIEWED_DIFFERENT_SOURCE_REQUIRED/);
});
test('2.8 model SHA matches exact learned numeric weights and deterministic training inputs',async()=>{
 const a=specimen(),args={examples:[a],classIds:[0,3,14],epochs:80};
 const first=trainAIG28PixelModel(args),second=trainAIG28PixelModel(args);
 assert.deepEqual(first.weights,second.weights);
 const x=await fingerprintAIG28Model(first),y=await fingerprintAIG28Model(second);
 assert.match(x,/^sha256:[a-f0-9]{64}$/);
 assert.equal(x,y);
 const changed={...first,weights:[...first.weights]};
 changed.weights[0]+=.0001;
 assert.notEqual(await fingerprintAIG28Model(changed),x);
});
test('2.8 ambiguous/unfamiliar colours abstain; confidence never forges human identity or 3D depth',()=>{
 const train=specimen();
 const model=trainAIG28PixelModel({examples:[train],classIds:[0,3,14],
  epochs:80});
 const out=new Uint8ClampedArray(128*128*4);
 for(let i=0;i<128*128;i++){
  out.set([125,125,125,255],i*4);
 }
 const pred=inferAIG28Pixels({model,sourceSha256:'sha256:'+'f'.repeat(64),
  width:128,height:128,pixels:out,confidenceThreshold:.99,
  marginThreshold:.8});
 assert.equal(pred.unknownPixels,128*128);
 assert.equal(pred.labels[0],255);
 assert.equal(pred.personIdentityVerified,false);
 assert.equal(pred.hidden3DGeometryRecovered,false);
 assert.equal(pred.crossPhotoSemanticAccuracyMeasuredHere,false);
 assert.throws(()=>inferAIG28Pixels({
  model,sourceSha256:'sha256:bad',width:128,height:128,pixels:out}),
 /SOURCE_BOUND_INFERENCE_PIXELS_INVALID/);
});
