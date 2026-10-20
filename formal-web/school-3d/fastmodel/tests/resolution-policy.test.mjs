import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {checkRenderTarget,framebufferEstimateBytes,RESOLUTION_PRESETS} from '../web/resolution-policy.mjs';
import {FastModelView} from '../web/renderer.mjs';
const HTML=readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
const MAIN=readFileSync(new URL('../web/main.mjs',import.meta.url),'utf8');
const budget=256*1048576;
const limits={maxRenderbufferSize:8192,maxViewportWidth:8192,maxViewportHeight:8192,gpuBudgetBytes:budget,existingGpuBytes:15*1048576};
test('RGB quality UI offers genuine 720p,1080p,2K/QHD and 4K/UHD controls exactly once',()=>{
 for(const key of ['1280x720','1920x1080','2560x1440','3840x2160']){
  assert.equal((HTML.match(new RegExp('value="'+key+'"','g'))||[]).length,1,key);
  const [w,h]=key.split('x').map(Number);
  assert.deepEqual([RESOLUTION_PRESETS[key].width,RESOLUTION_PRESETS[key].height],[w,h]);
 }
 assert.match(HTML,/id="resolution-status"/);
 assert.match(HTML,/3840 × 2160 · 4K \/ UHD/);
 assert.match(HTML,/2560 × 1440 · 2K \/ QHD/);
 assert.match(MAIN,/view\.resize\(selected\.width,selected\.height\)/);
});
test('2K and 4K are true internal drawing-buffer dimensions, not CSS zoom',()=>{
 assert.equal(framebufferEstimateBytes(2560,1440),44236800);
 assert.equal(framebufferEstimateBytes(3840,2160),99532800);
 for(const key of ['1920x1080','2560x1440','3840x2160']){
  const x=RESOLUTION_PRESETS[key];assert.equal(checkRenderTarget({...limits,width:x.width,height:x.height}).allowed,true);
 }
});
test('GPU with 2048 max renderbuffer rejects both high targets; original viewport intact',()=>{
 for(const [w,h] of [[2560,1440],[3840,2160]]){
  assert.equal(checkRenderTarget({...limits,width:w,height:h,maxRenderbufferSize:2048}).reason,'GPU_DIMENSION_LIMIT');
 }
});
test('budget pressure blocks 4K without inventing physical GPU usage',()=>{
 let r=checkRenderTarget({...limits,width:3840,height:2160,gpuBudgetBytes:128*1048576,existingGpuBytes:20*1048576});
 assert.equal(r.reason,'FRAMEBUFFER_MEMORY_BUDGET');
 assert.equal(r.allowed,false);
});
test('invalid dimensions and unreliable GPU capability blocked safely',()=>{
 assert.equal(checkRenderTarget({...limits,width:NaN,height:1080}).reason,'RESOLUTION_INVALID');
 assert.equal(checkRenderTarget({...limits,width:3840,height:2160,maxViewportWidth:2048}).reason,'GPU_DIMENSION_LIMIT');
 assert.equal(checkRenderTarget({width:3840,height:2160}).reason,'GPU_LIMITS_UNAVAILABLE');
});
test('real FastModelView.resize changes backing buffer, keeps aspect and records user request',()=>{
 let vp=[],size=[1920,1080];const gl={MAX_RENDERBUFFER_SIZE:1,MAX_VIEWPORT_DIMS:2,
  getParameter(k){return k===1?8192:new Int32Array([8192,8192]);},viewport(...a){vp=a;}};
 const canvas={width:1920,height:1080};const v={gl,canvas,width:1920,height:1080,baseWidth:1920,baseHeight:1080,
  gpuAllocatedEstimateBytes:15*1048576,governor:{b:{gpuWorkingSetEstimateBytes:budget}}};
 let r=FastModelView.prototype.resize.call(v,2560,1440);
 assert.equal(r.ok,true);assert.deepEqual([canvas.width,canvas.height],[2560,1440]);
 assert.deepEqual([v.baseWidth,v.baseHeight],[2560,1440]);assert.deepEqual(vp,[0,0,2560,1440]);
 r=FastModelView.prototype.resize.call(v,3840,2160);
 assert.equal(r.ok,true);assert.deepEqual([canvas.width,canvas.height],[3840,2160]);
 r=FastModelView.prototype.resize.call(v,1920,1080,true);
 assert.equal(r.ok,true);assert.deepEqual([v.baseWidth,v.baseHeight],[3840,2160], 'automatic downgrade does NOT overwrite user target');
});
test('failed 4K allocation preserves existing 2K canvas and original user setting',()=>{
 const gl={MAX_RENDERBUFFER_SIZE:1,MAX_VIEWPORT_DIMS:2,getParameter(k){return k===1?3000:new Int32Array([3000,3000]);},viewport(){throw Error('must not reach GPU resizing');}};
 const canvas={width:2560,height:1440};const v={gl,canvas,width:2560,height:1440,baseWidth:2560,baseHeight:1440,
 gpuAllocatedEstimateBytes:0,governor:{b:{gpuWorkingSetEstimateBytes:budget}}};
 const res=FastModelView.prototype.resize.call(v,3840,2160);
 assert.equal(res.ok,false);assert.equal(res.reason,'GPU_DIMENSION_LIMIT');assert.equal(v.baseWidth,2560);
 assert.deepEqual([canvas.width,canvas.height],[2560,1440]);
});
test('reload preserves chosen resolution instead of hard-resetting to 1080p',()=>{
 const s=readFileSync(new URL('../web/renderer.mjs',import.meta.url),'utf8');
 assert.match(s,/this\.resize\(this\.baseWidth\*this\.governor\.recommendedScale,this\.baseHeight\*this\.governor\.recommendedScale,true\)/);
 assert.doesNotMatch(s,/this\.resize\(1920,1080\)/);
});