import test from 'node:test';
import assert from 'node:assert/strict';
import {AIG711_SCHEMA,suggestAIG711StereoMatches,commitAIG711ReviewedCandidates}
 from '../aig-auto-correspondence-7-11.mjs';
import {createAIG710Calibration,createAIG710Fusion,summarizeAIG710Fusion}
 from '../aig-multiview-fusion-7-10.mjs';
const w=320,h=240,dis=18;
let seed=1757;
const rand=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296};
const pixels=new Uint8ClampedArray(w*h*4);
for(let i=0;i<w*h;i++)pixels.set([23,30,44,255],4*i);
for(let n=0;n<25;n++){
 const x=35+(n%5)*50,y=30+Math.floor(n/5)*43;
 for(let dy=-9;dy<=9;dy++)for(let dx=-9;dx<=9;dx++){
  const v=30+Math.floor(rand()*210),k=(y+dy)*w*4+(x+dx)*4;
  pixels.set([v,Math.floor(v*.72),255-v,255],k);
 }
}
function frame(shift=0){
 const data=new Uint8ClampedArray(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const k=(y*w+x)*4,sx=x+shift;
  data.set(sx<w?pixels.subarray((y*w+sx)*4,(y*w+sx)*4+4):[23,30,44,255],k);
 }
 return {width:w,height:h,data};
}
const a=frame(),b=frame(dis),
 opts={maxFeatures:120,maxPatchError:.38,minPatchContrast:.035};
const cal=createAIG710Calibration({width:w,height:h,focalPx:240,baselineMm:60,
 calibrationReviewed:true,rectifiedParallelReviewed:true,
 sourceId:'sha256:'+'a'.repeat(64)});
test('7.11 unedited RGB pixels yield many real mutual patch correspondences',()=>{
 const proposal=suggestAIG711StereoMatches(a,b,opts);
 assert.equal(proposal.schema,AIG711_SCHEMA);
 assert.equal(proposal.previewOnly,true);
 assert.equal(proposal.cameraExtrinsicsSolved,false);
 assert.equal(proposal.realXYZReconstructed,false);
 assert.ok(proposal.cornersA>35&&proposal.cornersB>35);
 assert.ok(proposal.candidates.length>=15);
 const accurate=proposal.candidates.filter(x=>x.disparityPx===dis&&x.epipolarErrorPx===0);
 assert.ok(accurate.length>10,'Known stereo pixel translation must be recovered');
 assert.ok(proposal.candidates[0].confidence>.8);
});
test('7.11 proposal only, no preapproval / no extra 3D state changes',()=>{
 const proposal=suggestAIG711StereoMatches(a,b,opts);
 const fusion=createAIG710Fusion(cal);
 assert.equal(fusion.features.size,0);
 assert.throws(()=>commitAIG711ReviewedCandidates(fusion,proposal,{
  frameAId:'A',frameBId:'B',timeAMs:100,timeBMs:900
 }),/NO_USER_ACCEPTED_MATCHES/);
 assert.equal(fusion.features.size,0);
});
test('7.11 user reviewed candidates are triangulated by original 7.10 physical gate',()=>{
 const proposal=suggestAIG711StereoMatches(a,b,opts);
 const fusion=createAIG710Fusion(cal);
 const ids=proposal.candidates.filter(x=>x.disparityPx===dis).slice(0,8).map(x=>x.id);
 const r=commitAIG711ReviewedCandidates(fusion,proposal,{
  frameAId:'A',frameBId:'B',timeAMs:100,timeBMs:900,reviewedIds:ids
 });
 assert.equal(r.accepted.length,8);
 assert.equal(r.blocked.length,0);
 assert.equal(r.automaticCameraPoseSolved,false);
 assert.equal(r.finalXYZThroughGate710,true);
 assert.equal(fusion.features.size,8);
 for(const x of r.accepted)assert.ok(Math.abs(x.xyzMm[2]-800)<.001);
 assert.equal(summarizeAIG710Fusion(fusion).dense3DSurfaceOrMeshBuilt,false);
});
test('7.11 duplicate reviews, untrusted labels and invalid source sizes BLOCK',()=>{
 const p=suggestAIG711StereoMatches(a,b,opts),f=createAIG710Fusion(cal);
 assert.throws(()=>commitAIG711ReviewedCandidates(f,p,{
  frameAId:'A',frameBId:'B',timeAMs:0,timeBMs:800,
  reviewedIds:[p.candidates[0].id,p.candidates[0].id]
 }),/DUPLICATE_REVIEW_ID/);
 const wrong=commitAIG711ReviewedCandidates(f,p,{
  frameAId:'A',frameBId:'B',timeAMs:0,timeBMs:800,
  reviewedIds:['does-not-exist']
 });
 assert.equal(wrong.accepted.length,0);
 assert.equal(wrong.blocked.length,1);
 assert.throws(()=>suggestAIG711StereoMatches(a,{width:321,height:h,
  data:new Uint8ClampedArray(321*h*4)}),/SAME_RECTIFIED_IMAGE_DIMENSIONS/);
 assert.throws(()=>suggestAIG711StereoMatches({width:3,height:3,data:new Uint8Array(3)},b),/FRAME_SIZE_INVALID/);
});
test('7.11 geometrical epipolar and reverse match filter non-stereo changes',()=>{
 const p=suggestAIG711StereoMatches(a,frame(0),opts);
 assert.ok(p.candidates.length<3,'No correct positive disparity if source images identical');
 const disordered=suggestAIG711StereoMatches(b,a,opts);
 assert.ok(disordered.candidates.length<3,'Reverse stereo orientation must be rejected');
});
test('7.11 source texture / rectified match processing is deterministic and budget bounded',()=>{
 const p=suggestAIG711StereoMatches(a,b,{...opts,maxFeatures:24});
 const again=suggestAIG711StereoMatches(a,b,{...opts,maxFeatures:24});
 assert.deepEqual(p.candidates,again.candidates);
 assert.ok(p.candidates.length<=24);
 assert.throws(()=>suggestAIG711StereoMatches(a,b,{maxFeatures:3000}),/MATCH_CONFIG_INVALID/);
});
