import test from 'node:test';
import assert from 'node:assert/strict';
import {AIG3D_QUALITY_PRESETS,getAIG3DQuality,resolveAIG3DFrameBudget}
 from '../../../../shared-3d/aig-real3d-quality.mjs';

test('RGBA subpixels: four real SSAA levels have increasing physical render buffers',()=>{
 const expected=[
  ['performance',400,200,80000],
  ['balanced',500,250,125000],
  ['smooth',700,350,245000],
  ['ultra',900,450,405000]
 ];
 for(const [name,w,h,pixels] of expected){
  const b=resolveAIG3DFrameBudget({cssWidth:400,cssHeight:200,preset:name});
  assert.equal(b.width,w);assert.equal(b.height,h);
  assert.equal(b.allocatedPixels,pixels);
  assert.equal(b.cappedBySafety,false);
  assert.equal(b.finalDisplayPixelOneBlendedRGBColor,undefined);
  assert.equal(b.mirrorReflectionCalculated,false);
 }
 assert.equal(Object.keys(AIG3D_QUALITY_PRESETS).length,4);
});
test('4K draw buffers are safely capped for low-memory devices',()=>{
 for(const name of Object.keys(AIG3D_QUALITY_PRESETS)){
  const b=resolveAIG3DFrameBudget({
   cssWidth:3840,cssHeight:2160,preset:name,deviceLimit:4096});
  assert.ok(b.allocatedPixels<=b.maxFramePixels);
  assert.ok(b.width<=4096&&b.height<=4096);
  assert.equal(b.cappedBySafety,true);
 }
 const s=resolveAIG3DFrameBudget({
  cssWidth:1440,cssHeight:900,preset:'ultra',deviceLimit:2048});
 assert.ok(s.width<=2048&&s.height<=2048);
 assert.ok(s.allocatedPixels<=3100000);
});
test('invalid GPU requests are BLOCKED without changing the quality settings',()=>{
 for(const name of ['FXAA_FAKE','MSAA8_PROMISED','fake','__proto__','constructor'])
  assert.throws(()=>getAIG3DQuality(name),/UNSUPPORTED/);
 for(const options of [
  {cssWidth:-5,cssHeight:200},
  {cssWidth:100,cssHeight:0},
  {cssWidth:400,cssHeight:200,deviceLimit:32},
  {cssWidth:400,cssHeight:200,deviceLimit:Infinity},
  {cssWidth:400,cssHeight:200,maxFramePixels:99999999}
 ])assert.throws(()=>resolveAIG3DFrameBudget(options),/INVALID/);
});
test('quality selection does not alter CAD coordinates or manufacturing geometry data',()=>{
 const a=[10.001,-35.003,70.005];
 for(const name of Object.keys(AIG3D_QUALITY_PRESETS)){
  resolveAIG3DFrameBudget({cssWidth:360,cssHeight:200,preset:name});
  assert.deepEqual(a,[10.001,-35.003,70.005]);
 }
});
