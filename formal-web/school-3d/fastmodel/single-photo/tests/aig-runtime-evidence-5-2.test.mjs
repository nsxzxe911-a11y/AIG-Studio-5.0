import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Aig52FrameEvidence,AIG52_SCHEMA} from '../aig-runtime-evidence-5-2.mjs';
const sha='c'.repeat(64);
const make=(dt=1000/60,frames=241,{sourceSHA256=sha,visibility='visible',resizeAt=-1}={})=>{
 const x=new Aig52FrameEvidence({sourceSHA256,targetFrames:240,minimumSeconds:2});
 for(let i=0;i<frames;i++){
  x.addFrame({timeMs:i*dt,renderCpuMs:1.8,width:i===resizeAt?721:720,height:1280,
   drawCalls:32,triangles:999,visibility});
  if(x.done)break;
 }
 return x;
};
test('5.2 actual 60 FPS frame-loop timestamps yield SHA-bound browser-only evidence; never fake native',()=>{
 const x=make(),r=x.summary({verifiedSource:sha,clipName:'synthetic real-timing QA'});
 assert.equal(r.schema,AIG52_SCHEMA);
 assert.equal(r.measuredFrameIntervals,240);
 assert.ok(Math.abs(r.framesPerSecond-60)<.01);
 assert.ok(r.p95FrameMs>16&&r.p95FrameMs<17);
 assert.equal(r.outcome,'BROWSER_FRAME_TIMING_PASS_ONLY');
 assert.equal(r.maxDrawCalls,32);
 assert.equal(r.maxTriangles,999);
 assert.equal(r.canvasSizePx.width,720);
 assert.equal(r.actualCanvasPixels,921600);
 assert.equal(r.gpuExecutionTimeMeasured,false);
 assert.equal(r.actualNativeAndroid60FpsVerified,false);
 assert.equal(r.actualNativeWindows60FpsVerified,false);
 assert.equal(r.originalCharacterIdentityMatched,false);
 assert.equal(r.releaseAllowed,false);
});
test('5.2 30 fps, hidden page, wrong source, bad timer, canvas resize or partial sample BLOCK',()=>{
 const slow=make(1000/30);
 assert.equal(slow.summary({verifiedSource:sha}).outcome,'BLOCKED');
 assert.ok(slow.summary({verifiedSource:sha}).framesOverTargetBudget>0);
 const mismatched=make();
 assert.equal(mismatched.summary({verifiedSource:'d'.repeat(64)}).outcome,'BLOCKED');
 const hidden=make(1000/60,241,{visibility:'hidden'});
 assert.equal(hidden.summary({verifiedSource:sha}).measurementInvalidReason,'AIG52_PAGE_NOT_VISIBLE');
 assert.equal(hidden.summary({verifiedSource:sha}).outcome,'BLOCKED');
 const resized=make(1000/60,241,{resizeAt:22});
 assert.equal(resized.summary({verifiedSource:sha}).outcome,'BLOCKED');
 assert.equal(resized.summary({verifiedSource:sha}).measurementInvalidReason,'AIG52_CANVAS_RESIZED_DURING_MEASUREMENT');
 const incomplete=make(1000/60,30);
 assert.equal(incomplete.summary({verifiedSource:sha}).outcome,'BLOCKED');
 const negative=new Aig52FrameEvidence({sourceSHA256:sha});
 assert.throws(()=>negative.addFrame({timeMs:-1,renderCpuMs:-2,width:720,height:1280,drawCalls:1,triangles:3}),/NONFINITE_OR_MISSING/);
 const backward=new Aig52FrameEvidence({sourceSHA256:sha});
 backward.addFrame({timeMs:500,renderCpuMs:1,width:720,height:1280,drawCalls:1,triangles:3});
 backward.addFrame({timeMs:490,renderCpuMs:1,width:720,height:1280,drawCalls:1,triangles:3});
 assert.equal(backward.summary({verifiedSource:sha}).outcome,'BLOCKED');
});
test('5.2 120Hz is actually counted, hitch P95 and missed budget are not erased',()=>{
 const high=make(1000/120,260);
 assert.ok(high.summary({verifiedSource:sha}).framesPerSecond>100);
 assert.equal(high.summary({verifiedSource:sha}).outcome,'BROWSER_FRAME_TIMING_PASS_ONLY');
 const x=new Aig52FrameEvidence({sourceSHA256:sha,targetFrames:240,minimumSeconds:2});
 let t=0;
 for(let i=0;i<241;i++){
  if(i)t+=(i%9===0?90:1000/60);
  x.addFrame({timeMs:t,renderCpuMs:1,width:1280,height:720,drawCalls:1,triangles:3});
 }
 const r=x.summary({verifiedSource:sha});
 assert.equal(r.outcome,'BLOCKED');
 assert.ok(r.hitchRatio>.05);
 assert.ok(r.longestFrameMs>80);
 assert.ok(r.p95FrameMs>20);
});
test('5.2 actual on-screen viewer captures post-render timing without stealing video recording hook',()=>{
 const app=fs.readFileSync(new URL('../app.mjs',import.meta.url),'utf8');
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const viewer=fs.readFileSync(new URL('../viewer.mjs',import.meta.url),'utf8');
 for(const id of ['aig52-load','aig52-visual','aig52-visual-report','aig52-fps','aig52-fps-report','aig52-status']){
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 }
 assert.ok(viewer.includes('this.onFrameMeasured?.('));
 assert.ok(viewer.includes('this.onAfterRender?.(t)'));
 assert.ok(viewer.includes('this.renderer.render(this.scene,this.camera)'));
 assert.ok(viewer.includes('performance.now()-renderStart'));
 assert.ok(app.includes("$('aig52-load').addEventListener('click'"));
 assert.ok(app.includes("$('aig52-visual').addEventListener('click'"));
 assert.ok(app.includes("$('aig52-fps').addEventListener('click'"));
 assert.ok(app.includes('await view.captureTimelineReview()'));
 assert.ok(app.includes('view.onFrameMeasured=frame=>'));
 assert.ok(app.includes('sha!==aig50Report.sourceSHA256'));
 assert.ok(app.includes('sourceSha===aig50Report?.sourceSHA256'));
 assert.ok(app.includes('new MovieWorkspace('));
 assert.ok(app.includes('generateVoiceBatch('));
 assert.ok(app.includes('auditAIG51PosedSeamsAndHair(source,'));
});
