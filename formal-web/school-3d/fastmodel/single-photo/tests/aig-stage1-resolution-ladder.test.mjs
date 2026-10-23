import test from 'node:test';
import assert from 'node:assert/strict';
import {AIG_STAGE1_RESOLUTION_SCHEMA,AIG_STAGE1_RESOLUTION_LEVELS,
 AIG_STAGE1_RESOLUTION_PRESETS,planAIGStage1ResolutionLadder,
 verifyAIGStage1ResolutionResult}
 from '../aig-stage1-resolution-ladder.mjs';

const base={orientation:'landscape',maxTextureSize:8192,
 maxRenderbufferSize:8192,deviceMemoryGB:8};
test('strict 16:9 4K 3K 2K 1080p native dimensions, both orientations',()=>{
 assert.deepEqual(AIG_STAGE1_RESOLUTION_LEVELS,['4k','3k','2k','1080p']);
 assert.deepEqual(AIG_STAGE1_RESOLUTION_PRESETS,{
  '4k':[3840,2160],'3k':[3200,1800],
  '2k':[2560,1440],'1080p':[1920,1080]
 });
 for(const orientation of ['landscape','portrait'])
  for(const level of AIG_STAGE1_RESOLUTION_LEVELS){
   const r=planAIGStage1ResolutionLadder({
    ...base,requested:level,orientation
   });
   assert.equal(r.schema,AIG_STAGE1_RESOLUTION_SCHEMA);
   assert.equal(r.isSupported,true);
   assert.equal(r.actualSelectedLevel,level);
   assert.equal(r.manualSelectionNeverDowngrades,true);
   assert.equal(r.levels.length,1);
   const natural=AIG_STAGE1_RESOLUTION_PRESETS[level];
   const expected=orientation==='portrait'?
    [...natural].reverse():natural;
   assert.deepEqual([r.selectedWidth,r.selectedHeight],expected);
   const proof=verifyAIGStage1ResolutionResult({
    selected:{level,orientation},renderTargetWidth:expected[0],
    renderTargetHeight:expected[1],
    pngWidth:expected[0],pngHeight:expected[1]
   });
   assert.equal(proof.authenticResolutionPASS,true);
   assert.equal(proof.appearanceVisualApprovalPASS,false);
  }
});
test('automatic downward compatibility picks highest real GPU supported tier',()=>{
 for(const [cap,expected] of [
  [8192,'4k'],[3500,'3k'],[3000,'2k'],
  [2048,'1080p'],[1280,null]
 ]){
  const r=planAIGStage1ResolutionLadder({...base,
   requested:'auto',maxTextureSize:cap,maxRenderbufferSize:cap});
  assert.equal(r.actualSelectedLevel,expected);
  assert.equal(r.isSupported,expected!==null);
  assert.equal(r.noUpscaleFromSmallerFrame,true);
  assert.equal(r.automaticDowngradeExplicit,expected!==null&&expected!=='4k');
 }
});
test('manually forcing 4K fails instead of secretly returning 3K or 1080p',()=>{
 const r=planAIGStage1ResolutionLadder({...base,
  requested:'4k',maxTextureSize:3000,maxRenderbufferSize:3000});
 assert.equal(r.isSupported,false);
 assert.equal(r.actualSelectedLevel,null);
 assert.equal(r.levels.length,1);
 assert.equal(r.levels[0].level,'4k');
 assert.equal(r.manualSelectionNeverDowngrades,true);
 const couldRun2K=planAIGStage1ResolutionLadder({...base,
  requested:'2k',maxTextureSize:3000,maxRenderbufferSize:3000});
 assert.equal(couldRun2K.isSupported,true);
 assert.equal(couldRun2K.actualSelectedLevel,'2k');
});
test('portrait fallback follows rotated max renderbuffer constraints',()=>{
 const r=planAIGStage1ResolutionLadder({...base,requested:'auto',
  orientation:'portrait',maxTextureSize:3000,maxRenderbufferSize:3000});
 assert.equal(r.actualSelectedLevel,'2k');
 assert.deepEqual([r.selectedWidth,r.selectedHeight],[1440,2560]);
});
test('insufficient reported memory downgrades automatically but keeps explicit 4K blocked',()=>{
 const a=planAIGStage1ResolutionLadder({...base,
  requested:'auto',deviceMemoryGB:1.1});
 assert.equal(a.actualSelectedLevel,'1080p');
 const explicit=planAIGStage1ResolutionLadder({...base,
  requested:'4k',deviceMemoryGB:1.1});
 assert.equal(explicit.isSupported,false);
});
test('PNG actual dimensions must match GPU framebuffer and declared tier',()=>{
 assert.equal(verifyAIGStage1ResolutionResult({
  selected:{level:'2k',orientation:'landscape'},
  renderTargetWidth:1920,renderTargetHeight:1080,
  pngWidth:2560,pngHeight:1440
 }).authenticResolutionPASS,false);
 assert.equal(verifyAIGStage1ResolutionResult({
  selected:{level:'3k',orientation:'portrait'},
  renderTargetWidth:1800,renderTargetHeight:3200,
  pngWidth:1800,pngHeight:3200
 }).authenticResolutionPASS,true);
 assert.throws(()=>planAIGStage1ResolutionLadder({...base,
  requested:'5k'}),/OUTPUT_RESOLUTION_OR_DEVICE_CAPABILITIES_REQUIRED/);
 assert.throws(()=>verifyAIGStage1ResolutionResult({
  selected:{level:'2k',orientation:'landscape'},
  renderTargetWidth:0,renderTargetHeight:1440,pngWidth:2560,pngHeight:1440
 }),/TARGET_AND_PNG_DIMENSIONS_REQUIRED/);
});
