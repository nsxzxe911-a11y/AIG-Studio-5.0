import test from 'node:test';
import assert from 'node:assert/strict';
import {planAIGReal3DNativeResolution,AIG_REAL3D_NATIVE_RESOLUTION_SCHEMA}
 from '../aig-real3d-native-resolution.mjs';
const opts={gpuLimit:8192,deviceMemoryGB:8,devicePixelRatio:2,
 autoCssWidth:800,autoCssHeight:1200};
test('True native output profiles preserve exactly 1080p, 2K, Android 1440x3088 and 4K dimensions',()=>{
 for(const [preset,width,height] of [
  ['1080P',1080,1920],['2K',1440,2560],
  ['PHONE_1440_3088',1440,3088],['4K',2160,3840]
 ]){
  const result=planAIGReal3DNativeResolution({...opts,preset});
  assert.equal(result.schema,AIG_REAL3D_NATIVE_RESOLUTION_SCHEMA);
  assert.equal(result.width,width);
  assert.equal(result.height,height);
  assert.equal(result.pixels,width*height);
  assert.equal(result.permitted,true);
  assert.equal(result.noUpscaling,true);
  assert.equal(result.nativeGPUReadbackRequired,true);
  assert.equal(result.geometryVertexAndTriangleCountsUnchanged,true);
  assert.equal(result.resolutionCannotReconstructMissing3DAnatomy,true);
  assert.deepEqual(result.standardSevenPassQaDimensionsUnchanged,{width:1080,height:1920});
 }
});
test('Landscape 4K is truly 3840x2160, no pixel resize from 1080',()=>{
 const x=planAIGReal3DNativeResolution({...opts,preset:'4K',orientation:'landscape'});
 assert.equal(x.width,3840);
 assert.equal(x.height,2160);
 assert.equal(x.pixels,8294400);
 assert.ok(x.approximatePeakCaptureMemoryMiB>100);
});
test('No fake GPU 4K on weak/low-memory hardware, 1080p remains available',()=>{
 const insufficient=planAIGReal3DNativeResolution({
  ...opts,preset:'4K',gpuLimit:2048,deviceMemoryGB:4
 });
 assert.equal(insufficient.permitted,false);
 assert.ok(insufficient.limitReasons.includes('GPU_TEXTURE_OR_RENDERBUFFER_LIMIT'));
 assert.ok(insufficient.limitReasons.includes('4K_REQUIRES_HIGH_MEMORY_DEVICE'));
 const safe=planAIGReal3DNativeResolution({
  ...opts,preset:'1080P',gpuLimit:2048,deviceMemoryGB:2
 });
 assert.equal(safe.permitted,true);
});
test('AUTO never silently selects 4K and falls back to native 1080p on low memory',()=>{
 const high=planAIGReal3DNativeResolution({...opts,preset:'AUTO'});
 assert.equal(high.selectedPreset,'2K');
 const low=planAIGReal3DNativeResolution({...opts,preset:'AUTO',deviceMemoryGB:2});
 assert.equal(low.selectedPreset,'1080P');
 assert.equal(low.width,1080);
});
test('Invalid size, preset, device constraints are fail closed',()=>{
 assert.throws(()=>planAIGReal3DNativeResolution({...opts,preset:'8K'}),
  /REAL3D_RESOLUTION_PRESET_INVALID/);
 assert.throws(()=>planAIGReal3DNativeResolution({...opts,orientation:'diagonal'}),
  /REAL3D_RESOLUTION_INPUT_INVALID/);
 assert.throws(()=>planAIGReal3DNativeResolution({...opts,devicePixelRatio:0}),
  /REAL3D_RESOLUTION_INPUT_INVALID/);
});
