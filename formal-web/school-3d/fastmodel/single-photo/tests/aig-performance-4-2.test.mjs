import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Aig42Governor,Aig42FrameCoalescer,Aig42GpuTimer,
 AIG42_TIERS,AIG42_SCHEMA} from '../aig-performance-4-2.mjs';

const gpu=(ms,disjoint=false)=>({source:'EXT_disjoint_timer_query_webgl2',gpuMs:ms,disjoint});
test('GPU adaptive tiers decrease only from real non-disjoint timer query measurements',()=>{
 const ctrl=new Aig42Governor({targetGpuMs:12,initialTier:2,slowSamples:3,fastSamples:4,cooldownSamples:2});
 for(const sample of [null,{gpuMs:33,disjoint:false},gpu(33,true),gpu(NaN),gpu(-1)]){
  assert.equal(ctrl.observe(sample).changed,false);
 }
 assert.equal(ctrl.quality.id,'balanced');
 assert.equal(ctrl.samples,0);
 ctrl.observe(gpu(30));ctrl.observe(gpu(28));
 assert.equal(ctrl.quality.id,'balanced');
 assert.equal(ctrl.observe(gpu(27)).status,'REDUCED_WORKLOAD');
 assert.equal(ctrl.quality.id,'fast');
 assert.equal(ctrl.report().deviceFpsVerified,false);
 assert.equal(ctrl.report().creditsUsed,0);
 assert.equal(ctrl.report().schema,AIG42_SCHEMA);
 assert.equal(AIG42_TIERS.length,4);
});
test('hysteresis and cooldown avoid up/down thrash and still allow conservative upgrade',()=>{
 const ctrl=new Aig42Governor({targetGpuMs:12,initialTier:1,slowSamples:2,fastSamples:4,cooldownSamples:2});
 ctrl.observe(gpu(35));ctrl.observe(gpu(35));
 assert.equal(ctrl.quality.id,'safe');
 for(let i=0;i<2;i++)assert.equal(ctrl.observe(gpu(1)).status,'COOLDOWN');
 for(let i=0;i<3;i++)assert.equal(ctrl.observe(gpu(1)).changed,false);
 assert.equal(ctrl.observe(gpu(1)).status,'RAISED_PREVIEW_QUALITY');
 assert.equal(ctrl.quality.id,'fast');
 assert.throws(()=>new Aig42Governor({targetGpuMs:0}),/POLICY_INVALID/);
});
test('rapid phone slider events coalesce into one rAF, preserve last angle, release cancels work',()=>{
 const scheduled=new Map(),drawn=[],cancelled=[];
 let next=0;
 const queue=new Aig42FrameCoalescer({
  requestFrame:callback=>{const id=++next;scheduled.set(id,callback);return id;},
  cancelFrame:id=>{cancelled.push(id);scheduled.delete(id);},
  draw:v=>drawn.push(v)});
 for(let i=0;i<150;i++)queue.schedule(i);
 assert.equal(scheduled.size,1);
 assert.equal(queue.coalesced,149);
 scheduled.get(1)();scheduled.delete(1);
 assert.deepEqual(drawn,[149]);
 assert.equal(queue.drawCount,1);
 queue.schedule(50);queue.dispose();
 assert.equal(cancelled.length,1);
 assert.equal(queue.schedule(11),false);
 assert.deepEqual(drawn,[149]);
});
test('asynchronous GPU timer never gl.finish/readPixels/spins; handles not-ready and disjoint',()=>{
 const ext={TIME_ELAPSED_EXT:1001,GPU_DISJOINT_EXT:1002};
 let ready=false,disjoint=false,deleted=0,queries=0,active=null,closed=0;
 const gl={
  QUERY_RESULT_AVAILABLE:2001,QUERY_RESULT:2002,
  getExtension:name=>name==='EXT_disjoint_timer_query_webgl2'?ext:null,
  createQuery:()=>({id:++queries}),
  beginQuery:(target,q)=>{assert.equal(target,1001);active=q;},
  endQuery:target=>{assert.equal(target,1001);closed++;active=null;},
  getQueryParameter:(q,key)=>key===2001?ready:9900000,
  getParameter:key=>{assert.equal(key,1002);return disjoint;},
  deleteQuery:()=>deleted++
 };
 const timer=new Aig42GpuTimer(gl);
 assert.equal(timer.supported,true);
 assert.equal(timer.begin(),true);
 assert.equal(timer.begin(),false);
 timer.end();
 assert.equal(timer.poll(),null);
 ready=true;
 assert.deepEqual(timer.poll(),gpu(9.9));
 assert.equal(deleted,1);
 timer.begin();timer.end();
 disjoint=true;
 assert.deepEqual(timer.poll(),{source:'EXT_disjoint_timer_query_webgl2',gpuMs:null,disjoint:true});
 assert.equal(deleted,2);
 timer.dispose();timer.dispose();assert.equal(deleted,2);
 assert.equal(closed,2);
 const fallback=new Aig42GpuTimer({});
 assert.equal(fallback.supported,false);
 assert.equal(fallback.begin(),false);
 assert.equal(fallback.poll(),null);
});
test('4.2 code path uses one background compute subprocess and previous GLB cache fallback',()=>{
 const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
 const backend=read('../aig_native4_jobs.py');
 const renderer=read('../aig-sdf-4-1.mjs');
 const app=read('../app.mjs'),html=read('../index.html');
 assert.match(backend,/subprocess\.run\(args/);
 assert.match(backend,/self\.compute_guard=threading\.Lock/);
 assert.match(backend,/BoundedSemaphore\(2\)/);
 assert.match(backend,/AIG42_COMPUTE_BUSY_RETRY_LATER/);
 assert.match(renderer,/determinant=b\*b-dot\(ro,ro\)/);
 assert.match(renderer,/this\.gpuTimer\.poll\(\)/);
 assert.match(renderer,/this\.gpuTimer\.begin\(\)/);
 assert.match(renderer,/configure\(\{/);
 assert.match(app,/new Aig42FrameCoalescer/);
 assert.match(app,/new Aig42Governor/);
 assert.match(app,/changeResult\?\.changed/);
 assert.match(html,/value="auto" selected/);
 assert.match(app,/已快取的 4\.0 低面數 GLB/);
 assert.doesNotMatch(read('../aig-performance-4-2.mjs'),/gl\.finish\(|readPixels\(/);
});
