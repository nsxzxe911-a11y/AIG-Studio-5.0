import test from 'node:test';
import assert from 'node:assert/strict';
import {createAIG3DScene,createAIG3DBox,addAIG3DNode}
 from '../aig-real3d-core.mjs';
import {extractAIGReal3DObservedAlphaContour,calibrateAIGReal3DAlphaToCAD}
 from '../aig-real3d-v106-photo-cad-contour.mjs';
import {compareAndRegisterAIGReal3DTopCAD}
 from '../aig-real3d-v105-cad-silhouette-registration.mjs';
const imageSha256='a'.repeat(64),meshSha256='b'.repeat(64);
const w=256,h=256;
function bitmap(inside){
 const rgba=new Uint8Array(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const k=(y*w+x)*4;rgba[k]=35;rgba[k+1]=76;rgba[k+2]=205;
  rgba[k+3]=inside(x,y)?255:0;
 }
 return rgba;
}
const alphaSource=()=>bitmap((x,y)=>x>=60&&x<108&&y>=30&&y<174);
function sourceCube(){
 const s=createAIG3DScene({id:'V106Source',consumer:'AIG-Studio-5.0',
  units:'MM',source:'REAL_INDEXED_CNC_TOP_QA'});
 addAIG3DNode(s,{id:'RealCNCPart',kind:'stock',mesh:createAIG3DBox([2,4,6]),
  source:'MEASURED_CNC_SOURCE_MESH'});
 return s;
}
function extraction(rgba=alphaSource()){
 return extractAIGReal3DObservedAlphaContour({
  rgba,width:w,height:h,imageSha256
 });
}
const calibrate=(contour,opts={})=>calibrateAIGReal3DAlphaToCAD({
 contour,pixelAnchors:[[60,30],[108,30]],
 cncAnchorsMM:[[-1,3],[1,3]],
 ...opts
});
test('V106 actual transparent source has exact non-square shape pixels, 4 contour vertices and SHA without AI',()=>{
 const original=alphaSource(),snapshot=original.slice(),out=extraction(original);
 assert.equal(out.schema,'AIG_REAL3D_V106_SOURCE_ALPHA_CAD_TOP_CONTOUR_V1');
 assert.equal(out.pixelForegroundCount,48*144);
 assert.equal(out.foregroundComponents,1);
 assert.equal(out.holes,0);
 assert.equal(out.pixelVertices.length,4);
 assert.deepEqual([...out.pixelVertices].sort((a,b)=>a[0]-b[0]||a[1]-b[1]),
  [[60,30],[60,174],[108,30],[108,174]]);
 assert.equal(out.alphaIsActuallyMeasuredFromOriginalPixels,true);
 assert.equal(out.genuineCadXYScaleEstablished,false);
 assert.equal(out.actualNeuralForegroundSegmentationCalled,false);
 assert.deepEqual(original,snapshot);
});
test('V106 known top-oriented 2 measured anchors directly feed real V105 observed CAD IoU, no mesh generation',()=>{
 const out=calibrate(extraction(),{
  confirmedTopView:true,calibratedMeasurement:true});
 assert.equal(out.mmPerPixel,2/48);
 assert.equal(out.observedTopCAD.sourceVisibility,'OBSERVED');
 assert.equal(out.observedTopCAD.actual3DHeightObserved,false);
 assert.deepEqual(out.observedTopCAD.XYBoundsMM,{min:[-1,-3],max:[1,3]});
 const src=sourceCube(),original=JSON.stringify(src),
  r=compareAndRegisterAIGReal3DTopCAD({
   scene:src,originalGLBSha256:meshSha256,
   observedTopCAD:out.observedTopCAD,maxTranslationMM:0,
   authorizeTranslation:false,resolution:96});
 assert.ok(r.originalRasterIoU>.95,'actual source projected IoU '+r.originalRasterIoU);
 assert.equal(r.workingScene,null);
 assert.equal(r.releasePASS,false);
 assert.equal(JSON.stringify(src),original);
});
test('V106 uncalibrated/unchecked photo never gets observed 3D authority, even when alpha real',()=>{
 for(const opts of [
  {confirmedTopView:false,calibratedMeasurement:true},
  {confirmedTopView:true,calibratedMeasurement:false},
  {confirmedTopView:false,calibratedMeasurement:false}
 ]){
  const r=calibrate(extraction(),opts);
  assert.equal(r.observedTopCAD.sourceVisibility,'AI_ESTIMATED');
  const test=compareAndRegisterAIGReal3DTopCAD({
   scene:sourceCube(),originalGLBSha256:meshSha256,
   observedTopCAD:r.observedTopCAD,authorizeTranslation:true,maxTranslationMM:.5});
  assert.equal(test.status,'BLOCK_AI_ESTIMATED_TOP_CANNOT_REGISTER');
  assert.equal(test.workingScene,null);
 }
});
test('V106 source alpha rejects opaque RGB photographs rather than pretending subject separation',()=>{
 const rgba=new Uint8Array(w*h*4);
 for(let k=0;k<w*h;k++)rgba[k*4+3]=255;
 assert.throws(()=>extraction(rgba),/OPAQUE_SOURCE_NEEDS_TRUSTED_SEGMENTATION/);
});
test('V106 strict incomplete mask, disconnected person/background and holes BLOCK',()=>{
 assert.throws(()=>extraction(bitmap((x,y)=>x<26&&y>20&&y<90)),
  /SOURCE_SILHOUETTE_CROPPED_AT_IMAGE_BORDER/);
 assert.throws(()=>extraction(bitmap((x,y)=>
  x>=30&&x<70&&y>=20&&y<70||x>=120&&x<180&&y>=120&&y<180)),
  /MULTIPLE_FOREGROUND_ISLANDS/);
 assert.throws(()=>extraction(bitmap((x,y)=>
  x>=50&&x<150&&y>=50&&y<150&&!(x>=90&&x<110&&y>=90&&y<110))),
  /SOURCE_ALPHA_HOLES_REQUIRE_MULTILOOP/);
});
test('V106 physically inconsistent anchors, forged SHA and out-of-frame source fail closed',()=>{
 const c=extraction();
 assert.throws(()=>calibrateAIGReal3DAlphaToCAD({
  contour:c,pixelAnchors:[[60,30],[60,31]],
  cncAnchorsMM:[[0,0],[10,0]]
 }),/TWO_ANCHOR_CALIBRATION_BASELINE_TOO_SHORT/);
 assert.throws(()=>calibrateAIGReal3DAlphaToCAD({
  contour:c,pixelAnchors:[[-1,40],[180,40]],
  cncAnchorsMM:[[0,0],[10,0]]
 }),/PIXEL_CALIBRATION_ANCHOR_OUTSIDE_IMAGE/);
 assert.throws(()=>extractAIGReal3DObservedAlphaContour({
  rgba:alphaSource(),width:w,height:h,imageSha256:'bogus'
 }),/ORIGINAL_IMAGE_ALPHA_SOURCE_AND_SHA_REQUIRED/);
});
test('V106 user-authored 90 degree calibrated camera rotation is preserved not mirrored',()=>{
 const r=calibrateAIGReal3DAlphaToCAD({
  contour:extraction(),pixelAnchors:[[60,30],[108,30]],
  cncAnchorsMM:[[10,20],[10,22]],confirmedTopView:true,
  calibratedMeasurement:true
 });
 assert.ok(Math.abs(r.rotationSin-1)<1e-6);
 assert.ok(Math.abs(r.rotationCos)<1e-6);
 assert.equal(r.observedTopCAD.sourceVisibility,'OBSERVED');
 assert.equal(r.observedTopCAD.actual3DHeightObserved,false);
});
