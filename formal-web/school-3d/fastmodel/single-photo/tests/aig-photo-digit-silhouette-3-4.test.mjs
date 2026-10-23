import test from 'node:test';
import assert from 'node:assert/strict';
import {AIG34_SCHEMA,detectAIG34FiveDigitContours,
 constrainAIG34DigitPoseToPhoto}
 from '../aig-photo-digit-silhouette-3-4.mjs';
const SHA='sha256:'+'e'.repeat(64);
const W=256,H=384;
function realFiveTips(){
 const labels=new Uint8Array(W*H),
  pixels=new Uint8ClampedArray(W*H*4);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const k=y*W+x;
  let on=y>=170&&y<=231&&x>=40&&x<=105;
  // Five independent observed terminal protrusions, with real blank gaps.
  for(const cx of [44,57,70,83,96]){
   if(y>=232&&y<=300&&Math.abs(x-cx)<=2)on=true;
  }
  labels[k]=on?8:0;
  pixels.set(on?[182,130,111,255]:[26,30,39,255],k*4);
 }
 return {width:W,height:H,labels,pixels,sourceSha256:SHA,group:'leftHand'};
}
function fake3DResult(){
 const names=['thumb','index','middle','ring','little'];
 const meshes=names.map((name,i)=>{
  const n=i===0?2:3,x=-.22+(i-2)*.036;
  return {id:'leftHand'+name,side:'left',type:'hand',index:i,
   positions:new Float32Array([x,1,0]),indices:new Uint32Array([0]),
   actual3DJointXYZ:Array.from({length:n+1},(_,j)=>[x,1-j*.04,0]),
   phalanxCount:n};
 });
 return {sourceSha256:SHA,meshes,actualPositionsAndIndexedTrianglesPresent:true,
  generatedActual3DDigits:5,generatedActual3DPhalanges:14};
}
test('3.4 five truly separated source hand tips are actually detected as photo pixels, not guessed',()=>{
 const src=realFiveTips(),before=src.pixels.slice(),
  originalLabels=src.labels.slice();
 const scan=detectAIG34FiveDigitContours(src);
 assert.equal(scan.schema,AIG34_SCHEMA);
 assert.equal(scan.group,'leftHand');
 assert.equal(scan.sourceClassId,8);
 assert.equal(scan.status,'FIVE_DISTINCT_SOURCE_2D_PROTRUSIONS');
 assert.equal(scan.safeForGeometryConstraint,true);
 assert.equal(scan.independentVisibleTips,5);
 assert.deepEqual(scan.tips.map(p=>p.sourcePixelTip[0]),[44,57,70,83,96]);
 assert.deepEqual(scan.tips.map(p=>p.sourcePixelTip[1]),[300,300,300,300,300]);
 assert.ok(scan.tips.every(p=>p.actualSourceRGB.join(',')==='182,130,111'));
 assert.equal(scan.leftToRightSlotIsAnatomicalIdentity,false);
 assert.equal(scan.actual3DDepthMeasured,false);
 assert.deepEqual(src.pixels,before);
 assert.deepEqual(src.labels,originalLabels);
});
test('3.4 2D photo visible tips change 3D implicit line-chain X and length without modifying original 3.2 geometry',()=>{
 const observed=detectAIG34FiveDigitContours(realFiveTips());
 const original=fake3DResult(),pointCopy=original.meshes.map(
  m=>m.actual3DJointXYZ.map(p=>[...p]));
 const rig={sourceSha256:SHA,anchoredBodyHeightRelativeUnits:2,
  sourceAnchors:{leftHand:{xyz:[-.22,1,0]}}};
 const edited=constrainAIG34DigitPoseToPhoto({
  result:original,rig,constraints:[observed],photoWidth:W,
  photoHeight:H
 });
 assert.equal(edited.sourcePhotoConstraintsActuallyApplied,5);
 assert.equal(edited.constrainedGroupCount,1);
 assert.equal(edited.oneToOnePhysicalDepthVerified,false);
 assert.equal(edited.surfaceSourceEvidence,'ACTUAL_MASK_XY_OUTLINE_ONLY_Z_UNMEASURED');
 assert.equal(edited.sourcePhotoPixelsNotChanged,true);
 assert.equal(edited.originalReal3D32ModelNotChanged,true);
 assert.notDeepEqual(edited.meshes[0].actual3DJointXYZ,
  original.meshes[0].actual3DJointXYZ);
 assert.ok(edited.constrainedDigitIDs.every(
  x=>x.observedTipPx[1]===300&&x.observedTipLabelIdentity===false));
 assert.deepEqual(original.meshes.map(m=>m.actual3DJointXYZ),
  pointCopy,'original user geometry MUST not mutate when source X/Y changes');
 for(const mesh of edited.meshes){
  assert.equal(mesh.unknownDepthStillUnmeasured,true);
  assert.equal(mesh.photoConstrainedSilhouette,true);
  assert.ok(mesh.photoProtrusionScale>=.72&&mesh.photoProtrusionScale<=1.45);
 }
});
test('3.4 rejects four fingers and blobs rather than auto-fabricating fifth or real 3D depth',()=>{
 const src=realFiveTips();
 for(let y=232;y<=300;y++)for(let x=94;x<=98;x++)
  src.labels[y*W+x]=0;
 const scan=detectAIG34FiveDigitContours(src);
 assert.equal(scan.safeForGeometryConstraint,false);
 assert.equal(scan.independentVisibleTips,0);
 assert.equal(scan.tips.length,0);
 assert.notEqual(scan.status,'FIVE_DISTINCT_SOURCE_2D_PROTRUSIONS');
 assert.throws(()=>constrainAIG34DigitPoseToPhoto({
  result:fake3DResult(),
  rig:{sourceSha256:SHA,anchoredBodyHeightRelativeUnits:2,
   sourceAnchors:{leftHand:{xyz:[-.22,1,0]}}},
  constraints:[scan],photoWidth:W,photoHeight:H
 }),/FIVE_VERIFIED_TIPS_AND_SAME_SOURCE_SHA_REQUIRED/);
});
test('3.4 source-photo SHA, source label, original pixels, forbidden dimension jumps fail closed',()=>{
 const src=realFiveTips(),good=detectAIG34FiveDigitContours(src);
 assert.throws(()=>detectAIG34FiveDigitContours({
  ...src,sourceSha256:'sha256:'+'a'.repeat(64),labels:src.labels.subarray(0,15)
 }),/VERIFIED_2D_SOURCE_SHA_AND_RGBA_REQUIRED/);
 const result=fake3DResult(),rig={sourceSha256:SHA,
  anchoredBodyHeightRelativeUnits:2,
  sourceAnchors:{leftHand:{xyz:[-.22,1,0]}}};
 assert.throws(()=>constrainAIG34DigitPoseToPhoto({
  result,rig,constraints:[{...good,sourceSha256:'sha256:'+'b'.repeat(64)}],
  photoWidth:W,photoHeight:H
 }),/FIVE_VERIFIED_TIPS_AND_SAME_SOURCE_SHA_REQUIRED/);
 assert.throws(()=>constrainAIG34DigitPoseToPhoto({
  result,rig:{...rig,sourceSha256:'sha256:'+'c'.repeat(64)},
  constraints:[good],photoWidth:W,photoHeight:H
 }),/MATCHING_3D_SOURCE_AND_PHOTO_REQUIRED/);
 assert.throws(()=>detectAIG34FiveDigitContours({...src,group:'inventedFinger'}),
  /VERIFIED_2D_SOURCE_SHA_AND_RGBA_REQUIRED/);
});
