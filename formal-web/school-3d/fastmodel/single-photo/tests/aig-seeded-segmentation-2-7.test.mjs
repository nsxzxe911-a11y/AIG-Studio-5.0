import test from 'node:test';
import assert from 'node:assert/strict';
import {segmentAIG27Pixels,AIG27_SCHEMA} from '../aig-seeded-segmentation-2-7.mjs';
import {inspectAIG26SemanticLabels} from '../aig-vision-metric-color-2-6.mjs';
const SHA='sha256:'+'d'.repeat(64);
function fixture(){
 const width=256,height=192,pixels=new Uint8ClampedArray(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=(y*width+x)*4;
  let c=[228,228,224]; // actual source background RGB
  if(x>=64&&x<192&&y>=38&&y<170)c=[45,65,120]; // clothing
  if(x>=99&&x<151&&y>=20&&y<72)c=[78,44,30]; // visible hair
  if(x>=113&&x<137&&y>=70&&y<88)c=[185,135,100]; // visible neck
  pixels[i]=c[0];pixels[i+1]=c[1];pixels[i+2]=c[2];
  pixels[i+3]=255;
 }
 return {width,height,pixels};
}
const sample=(result,x,y)=>result.labels[y*result.width+x];
const seeds=[
 {x:10,y:100,labelId:0},
 {x:240,y:100,labelId:0},
 {x:78,y:130,labelId:14}, // garment
 {x:116,y:31,labelId:3}, // hair
 {x:123,y:80,labelId:4} // neck visibly uncovered
];
test('2.7 performs genuine offline source RGBA geodesic segmentation on actual observable surfaces',()=>{
 const {width,height,pixels}=fixture(),before=pixels.slice();
 const out=segmentAIG27Pixels({width,height,pixels,sourceSha256:SHA,seeds,
  maxWorkSide:256});
 assert.equal(out.schema,AIG27_SCHEMA);
 assert.equal(out.sourceSha256,SHA);
 assert.equal(out.width,width);
 assert.equal(out.height,height);
 assert.equal(sample(out,10,100),0);
 assert.equal(sample(out,79,131),14);
 assert.equal(sample(out,119,35),3);
 assert.equal(sample(out,126,80),4);
 assert.equal(out.automaticTrainedSemanticInference,false);
 assert.equal(out.occludedBodyNotReconstructed,true);
 assert.equal(out.notGroundTruth,true);
 assert.equal(out.releaseAllowed,false);
 assert.ok(out.regions.every(r=>r.userSuppliedClassNotModelPrediction));
 assert.deepEqual(pixels,before,'segmentation cannot rewrite photo pixels');
 assert.ok(out.runs.length>20,'real spatial segmentation, not one coloured card');
 const decoded=[];
 for(const [label,count] of out.runs)
  for(let i=0;i<count;i++)decoded.push(label);
 assert.deepEqual(decoded,[...out.labels],'RLE faithfully serializes every pixel');
 assert.equal(decoded.length,width*height);
});
test('2.7 integrates as UNVERIFIED AIG26 source-bound external pixel proof without forging model SHA',()=>{
 const img=fixture(),out=segmentAIG27Pixels({
  ...img,sourceSha256:SHA,seeds,maxWorkSide:256
 });
 const proof=inspectAIG26SemanticLabels({
  width:out.width,height:out.height,sourceSha256:SHA,
  labels:out.labels,producer:'UNVERIFIED',modelSha256:null,
  humanReviewed:false,
  regions:out.regions.map(r=>({id:r.id,className:r.className,confidence:0}))
 });
 assert.equal(proof.proofStatus,'UNREVIEWED_2D_LABELS_ONLY');
 assert.equal(proof.automaticSemanticModelExecutedHere,false);
 assert.equal(proof.imageClassificationGroundTruthCertified,false);
 assert.equal(proof.categoryEvidence.length,3);
});
test('2.7 refuses unsupported classes, photo identity mistakes, missing background, conflicting seeds and memory excess',()=>{
 const img=fixture();
 const base={...img,sourceSha256:SHA,maxWorkSide:256};
 const fail=(x,pattern)=>assert.throws(()=>segmentAIG27Pixels({...base,...x}),pattern);
 fail({seeds:seeds.filter(s=>s.labelId!==0)},
  /NEED_USER_BACKGROUND_AND_FOREGROUND_SEEDS/);
 fail({seeds:[{x:1,y:1,labelId:0},{x:120,y:80,labelId:25}]},
  /SEED_COORDINATES_AND_CLASS_INVALID/);
 fail({seeds:[{x:1,y:1,labelId:0},{x:1.2,y:1,labelId:3}],
  maxWorkSide:128},/CONFLICTING_CLASS_SEEDS_IN_SAME_WORK_CELL/);
 fail({seeds,sourceSha256:'sha256:unverified'},/BOUNDED_RGBA_SOURCE_SHA/);
 fail({seeds,maxWorkSide:1024},/BOUNDED_RGBA_SOURCE_SHA/);
 fail({seeds,pixels:new Uint8Array(32)},/BOUNDED_RGBA_SOURCE_SHA/);
});
test('2.7 identical-colour labels remain seed-driven and never claim automatic face or identity recognition',()=>{
 const width=128,height=128,pixels=new Uint8ClampedArray(width*height*4);
 for(let i=0;i<width*height;i++){
  pixels[4*i]=90;pixels[4*i+1]=65;pixels[4*i+2]=60;pixels[4*i+3]=255;
 }
 const out=segmentAIG27Pixels({pixels,width,height,sourceSha256:SHA,
  maxWorkSide:128,seeds:[
   {x:2,y:2,labelId:0},
   {x:35,y:70,labelId:3},
   {x:99,y:70,labelId:4}
  ]});
 assert.equal(out.labels[70*width+35],3);
 assert.equal(out.labels[70*width+99],4);
 assert.equal(out.claimedHumanOrFaceIdentity,false);
 assert.equal(out.physical3DDepthInferred,false);
 assert.equal(out.humanReviewRequired,true);
});
