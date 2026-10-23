import test from 'node:test';
import assert from 'node:assert/strict';
import {AIG_STAGE1_4K_SCHEMA,AIG_STAGE1_4K_PIXELS,
 planAIGStage1AdaptivePreview,planAIGStage1True4KOutput,
 validateAIGStage1RasterResult}
 from '../aig-stage1-4k-adaptive-render.mjs';
test('true 4K uses exactly 3840x2160 or 2160x3840 actual render-target pixels, no upscaling',()=>{
 const landscape=planAIGStage1True4KOutput({
  orientation:'landscape',maxTextureSize:8192,maxRenderbufferSize:8192});
 assert.equal(landscape.schema,AIG_STAGE1_4K_SCHEMA);
 assert.deepEqual([landscape.width,landscape.height],[3840,2160]);
 assert.equal(landscape.exactly4KPixels,8294400);
 assert.equal(landscape.actualNativePixels,AIG_STAGE1_4K_PIXELS);
 assert.equal(landscape.supportedByReportedLimits,true);
 assert.equal(landscape.renderWithExistingWebGLRenderer,true);
 assert.equal(landscape.oneRenderTargetAtATime,true);
 assert.equal(landscape.noExtraGPUContexts,true);
 const portrait=planAIGStage1True4KOutput({
  orientation:'portrait',maxTextureSize:4096,maxRenderbufferSize:4096});
 assert.deepEqual([portrait.width,portrait.height],[2160,3840]);
 assert.equal(portrait.actualNativePixels,8294400);
});
test('GPU 4K unsupported must FAIL, not return an enlarged lower resolution image',()=>{
 const weak=planAIGStage1True4KOutput({
  orientation:'landscape',maxTextureSize:2048,maxRenderbufferSize:4096});
 assert.equal(weak.supportedByReportedLimits,false);
 assert.equal(weak.failureReason,'GPU_OR_MEMORY_CANNOT_PROVE_TRUE_4K');
 const lowMemory=planAIGStage1True4KOutput({
  orientation:'portrait',maxTextureSize:8192,maxRenderbufferSize:8192,
  availableMemoryGB:1});
 assert.equal(lowMemory.supportedByReportedLimits,false);
 assert.throws(()=>planAIGStage1True4KOutput({
  orientation:'ultrawide',maxTextureSize:8192,maxRenderbufferSize:8192
 }),/KNOWN_ORIENTATION_AND_GPU_LIMITS_REQUIRED/);
});
test('live adaptive rendering respects real mobile and desktop GPU budgets, not fake 4K',()=>{
 for(const [width,height,mobile,mem] of [
  [390,844,true,4],[1440,900,false,8],
  [1920,1080,false,16],[3840,2160,false,8]]){
  const r=planAIGStage1AdaptivePreview({
   cssWidth:width,cssHeight:height,devicePixelRatio:3,
   maxTextureSize:8192,maxRenderbufferSize:8192,
   mobile,deviceMemoryGB:mem,mode:'quality'});
  assert.equal(r.gpuLimitsRespected,true);
  assert.ok(r.renderedPixels<=r.maxPixelsBudget);
  assert.ok(r.actualGpuCSSAspectError<.0045);
  assert.ok(r.plannedPixelRatio<=2.5);
  if(mobile)assert.ok(r.renderedPixels<=4147200);
 }
 const limited=planAIGStage1AdaptivePreview({
  cssWidth:4000,cssHeight:500,devicePixelRatio:4,
  maxTextureSize:1024,maxRenderbufferSize:1024,mode:'economy'});
 assert.equal(limited.gpuLimitsRespected,true);
 assert.ok(limited.allocatedGPUWidth<=1024);
 assert.ok(limited.allocatedGPUHeight<=1024);
});
test('actual GPU readback and PNG IHDR dimensions must match EXACT 4K',()=>{
 const valid=validateAIGStage1RasterResult({
  expectedWidth:3840,expectedHeight:2160,
  actualWidth:3840,actualHeight:2160,
  actualPNGWidth:3840,actualPNGHeight:2160});
 assert.equal(valid.exactPixelContractPASS,true);
 assert.equal(valid.reportedPixels,8294400);
 assert.equal(valid.releaseAppearanceGatePASS,false);
 const fake=validateAIGStage1RasterResult({
  expectedWidth:3840,expectedHeight:2160,
  actualWidth:1920,actualHeight:1080,
  actualPNGWidth:3840,actualPNGHeight:2160});
 assert.equal(fake.exactPixelContractPASS,false);
 assert.throws(()=>validateAIGStage1RasterResult({
  expectedWidth:3840,expectedHeight:2160,
  actualWidth:0,actualHeight:2160,
  actualPNGWidth:3840,actualPNGHeight:2160
 }),/PIXEL_READBACK_DIMENSIONS_REQUIRED/);
});
