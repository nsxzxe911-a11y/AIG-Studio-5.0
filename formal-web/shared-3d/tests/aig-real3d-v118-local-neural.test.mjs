import test from 'node:test';
import assert from 'node:assert/strict';
import {trainAIGReal3DV118LocalNeural}
 from '../aig-real3d-v118-local-neural.mjs';
const sha='a'.repeat(64);
const fixture=(w=128,h=160)=>{
 const rgba=new Uint8ClampedArray(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const fg=x>=36&&x<=95&&y>=22&&y<=137;
  const bg=((Math.floor(x/8)+Math.floor(y/8))%2)?[45,163,76]:[207,178,53];
  const c=y<75?[55,75,189]:[187,68,117];
  rgba.set([...(fg?c:bg),255],(y*w+x)*4);
 }
 return {rgba,width:w,height:h,sourcePhotoSha256:sha,
  foregroundSeeds:[{x:48,y:40},{x:72,y:112}],
  backgroundSeeds:[{x:3,y:4},{x:11,y:4}]};
};
test('V118 real neural weights train on original RGB, deterministic weights SHA, original pixels immutable',async()=>{
 const input=fixture(),before=Uint8ClampedArray.from(input.rgba);
 const a=await trainAIGReal3DV118LocalNeural(input);
 assert.equal(a.status,'LOCALLY_TRAINED_NEURAL_INFERENCE_COMPLETED');
 assert.equal(a.actualNeuralWeightsExecuted,true);
 assert.equal(a.modelLearnedFromUserLabels,true);
 assert.ok(a.trainingLossFinal<a.trainingLossFirst*.12);
 assert.equal(a.foregroundPixels,60*116);
 assert.equal(a.learnedParameterCount,61);
 assert.match(a.modelWeightsSha256,/^[a-f0-9]{64}$/);
 assert.equal(a.workingRGBA[(40*128+50)*4+3],255);
 assert.equal(a.workingRGBA[(2*128+2)*4+3],0);
 assert.deepEqual([...input.rgba],[...before]);
 assert.equal(a.completeHuman3DOrClothesRecovered,false);
 assert.equal(a.productionReleasePASS,false);
 const b=await trainAIGReal3DV118LocalNeural(input);
 assert.equal(a.modelWeightsSha256,b.modelWeightsSha256);
 assert.deepEqual([...a.workingRGBA],[...b.workingRGBA]);
});
test('V118 source seed collisions, ambiguous labels, and fake SHA fail closed',async()=>{
 const s=fixture();
 await assert.rejects(trainAIGReal3DV118LocalNeural({...s,
  backgroundSeeds:[{x:48,y:40},{x:11,y:4}]}),/CONFLICTING_LABELS/);
 await assert.rejects(trainAIGReal3DV118LocalNeural({...s,
  foregroundSeeds:[{x:20,y:4},{x:28,y:4}]}),/LABEL_COLORS_AMBIGUOUS/);
 await assert.rejects(trainAIGReal3DV118LocalNeural({...s,
  sourcePhotoSha256:'wrong'}),/SOURCE_SIZE_SHA_TRAINING_CONTRACT_INVALID/);
});
test('V118 colors shared by foreground and background cannot be passed as meaningful segmentation',async()=>{
 const s=fixture();
 for(let y=22;y<=137;y++)for(let x=36;x<=95;x++)
  s.rgba.set([207,178,53,255],(y*128+x)*4);
 await assert.rejects(trainAIGReal3DV118LocalNeural(s),
  /LABEL_COLORS_AMBIGUOUS_NO_VISUAL_SEPARATION/);
});
