import test from 'node:test';
import assert from 'node:assert/strict';
import {Aig17GLBGpuGovernor,AIG17_SCHEMA}
 from '../aig-glb-gpu-adaptive-1-7.mjs';
const measurement=gpuMs=>({source:'EXT_disjoint_timer_query_webgl2',
 disjoint:false,gpuMs});
test('1.7 real GLB governor rejects JS CPU timing and GPU_DISJOINT',()=>{
 const g=new Aig17GLBGpuGovernor({slowSamples:3,cooldownSamples:0});
 const initial=g.pixelRatioFactor;
 for(let i=0;i<40;i++){
  g.observe({source:'JS_RENDER_SUBMIT_NOT_GPU_TIME',disjoint:false,gpuMs:99});
  g.observe({source:'EXT_disjoint_timer_query_webgl2',disjoint:true,gpuMs:99});
  g.observe({source:'EXT_disjoint_timer_query_webgl2',disjoint:false,gpuMs:NaN});
 }
 assert.equal(g.pixelRatioFactor,initial);
 assert.equal(g.report.gpuSamplesAccepted,0);
 assert.equal(g.report.gpuSamplesIgnored,120);
 assert.equal(g.report.p95GpuMs,null);
 assert.equal(g.report.nativeAndroidWindowsFpsVerified,false);
});
test('1.7 only actual GPU ms can reduce and later restore preview pixels',()=>{
 const g=new Aig17GLBGpuGovernor({initialTier:3,slowSamples:3,
  fastSamples:8,cooldownSamples:2,targetGpuMs:12});
 assert.equal(g.observe(measurement(24)).changed,false);
 assert.equal(g.observe(measurement(24)).changed,false);
 assert.equal(g.observe(measurement(24)).reason,'VALIDATED_GPU_SLOW');
 assert.equal(g.pixelRatioFactor,.8);
 g.observe(measurement(1));g.observe(measurement(1)); // cooldown
 for(let i=0;i<7;i++)assert.equal(g.observe(measurement(1)).changed,false);
 assert.equal(g.observe(measurement(1)).reason,'VALIDATED_GPU_HEADROOM');
 assert.equal(g.pixelRatioFactor,1);
 assert.equal(g.report.safeQualityChanges,2);
 assert.equal(g.report.gpuSamplesAccepted,13);
});
test('sample history remains bounded and percentile is honest GPU source',()=>{
 const g=new Aig17GLBGpuGovernor();
 for(let i=0;i<180;i++)g.observe(measurement(10+i%7));
 assert.equal(g.report.schema,AIG17_SCHEMA);
 assert.equal(g.report.gpuSamplesAccepted,180);
 assert.ok(g.report.p95GpuMs>=g.report.p50GpuMs);
 assert.equal(g.samples.length,120);
 assert.equal(g.report.changesOnlyPreviewPixelRatio,undefined);
});
test('GPU adaptive policy is finite and cannot claim arbitrary unsupported fast mode',()=>{
 assert.throws(()=>new Aig17GLBGpuGovernor({initialTier:9}),/POLICY_INVALID/);
 assert.throws(()=>new Aig17GLBGpuGovernor({targetGpuMs:0}),/POLICY_INVALID/);
 assert.throws(()=>new Aig17GLBGpuGovernor({fastSamples:1}),/POLICY_INVALID/);
 const g=new Aig17GLBGpuGovernor({initialTier:0,cooldownSamples:0,slowSamples:2});
 for(let i=0;i<100;i++)g.observe(measurement(120));
 assert.equal(g.pixelRatioFactor,.5);
 assert.equal(g.report.cpuSubmitIsNotGpuTime,true);
 assert.equal(g.report.photoLikenessOrArticulatedAnimationApproved,false);
});
