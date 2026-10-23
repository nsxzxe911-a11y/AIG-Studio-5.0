import test from 'node:test';
import assert from 'node:assert/strict';
import {AIG36_SCHEMA,AIG36_SLOT_LIMIT,planAIG36UnifiedCore,
 colourAIG36VertexShards,fitAIG36Camera,selectAIG36Lighting}
 from '../aig-unified-120-core-3-6.mjs';
test('120 identical LOGICAL slots do not impersonate hardware cores or GPU contexts',()=>{
 const p=planAIG36UnifiedCore({hardwareConcurrency:16,
  deviceMemoryGb:8,requestedLogicalSlots:120});
 assert.equal(p.schema,AIG36_SCHEMA);
 assert.equal(AIG36_SLOT_LIMIT,120000);
 assert.equal(p.kernelImplementationCount,1);
 assert.equal(p.logicalSlotsConfigured,120);
 assert.ok(p.schedulingLanes<=4);
 assert.equal(p.realWebWorkersSpawned,0);
 assert.equal(p.parallelHardwareCoresCertified,0);
 assert.equal(p.sharedWebGLContextCount,1);
 assert.equal(p.actualHardwareRayTracingEnabled,false);
 assert.ok(p.stages.includes('VISIBLE_CAMERA_FRAMING'));
 const slow=planAIG36UnifiedCore({hardwareConcurrency:2,
  deviceMemoryGb:1,mobile:true,rayTracingRequested:true});
 assert.equal(slow.schedulingLanes,1);
 assert.equal(slow.lightingMode,
  'REQUESTED_RAYTRACE_UNAVAILABLE_FALLBACK_PBR');
 assert.throws(()=>planAIG36UnifiedCore({requestedLogicalSlots:120001}),
  /LOGICAL_SLOT_RANGE/);
 assert.throws(()=>planAIG36UnifiedCore({requestedLogicalSlots:0}),
  /LOGICAL_SLOT_RANGE/);
});
test('real per-vertex RGB values are computed in 120 identical bounded shards',async()=>{
 const w=32,h=64,count=1440;
 const positions=new Float32Array(count*3);
 const ids=new Uint8Array(count).fill(2);
 for(let i=0;i<count;i++){
  positions[i*3]=(i%10-5)/300;
  positions[i*3+1]=.8+(i%20)/100;
  positions[i*3+2]=i%2?.05:-.05;
 }
 const labels=new Uint8Array(w*h).fill(2);
 const pixels=new Uint8ClampedArray(w*h*4);
 for(let i=0;i<w*h;i++)pixels.set([190,110,80,255],i*4);
 const pixelsBefore=pixels.slice(),labelsBefore=labels.slice(),
  positionsBefore=positions.slice();
 const plan=planAIG36UnifiedCore({hardwareConcurrency:12,
  requestedLogicalSlots:120});
 let yields=0;
 const actual=await colourAIG36VertexShards({
  shell:{positions,vertexSourceLabelIds:ids,sourceClassColorRGB:
   {2:[.5,.4,.3]}},
  source:{width:w,height:h,labels,pixels},
  bodyHeightUnits:2,plan,yieldControl:async()=>{yields++}
 });
 assert.equal(actual.actualVerticesColoured,count);
 assert.equal(actual.completedIdenticalKernelSlots,120);
 assert.equal(actual.rendererContextsCreated,0);
 assert.equal(actual.trueParallelCPUWorkers,0);
 assert.ok(yields>=30);
 assert.ok(actual.colours[0]>.0&&actual.colours[0]<1);
 assert.notEqual(actual.colours[0],actual.colours[3],
  'reverse-side inferred colour must differ from front source RGB');
 assert.deepEqual(pixels,pixelsBefore);
 assert.deepEqual(labels,labelsBefore);
 assert.deepEqual(positions,positionsBefore);
});
test('camera frame uses real bounds; raytrace selection visibly falls back to PBR',()=>{
 const fit=fitAIG36Camera({width:1.1,height:2,depth:.45,
  verticalFovDeg:40,aspect:390/844});
 assert.ok(fit.distance>3);
 assert.ok(fit.far>fit.near);
 assert.equal(fit.sourceBoundsUsed,true);
 assert.throws(()=>fitAIG36Camera({width:0,height:2,depth:.4,
  verticalFovDeg:40,aspect:1}),/INVALID_CAMERA_BOUNDS/);
 const p=planAIG36UnifiedCore();
 const requested=selectAIG36Lighting('raytrace',p);
 assert.equal(requested.rayTracing,false);
 assert.equal(requested.active,'QUALITY_PBR_FALLBACK');
 assert.equal(requested.shadows,true);
 assert.equal(selectAIG36Lighting('balanced',p).shadows,false);
 assert.equal(selectAIG36Lighting('quality',p).shadows,true);
 assert.throws(()=>selectAIG36Lighting('magic',p),/UNKNOWN_LIGHTING_MODE/);
 const off=planAIG36UnifiedCore({gpuContextAvailable:false});
 assert.equal(selectAIG36Lighting('raytrace',off).active,'NO_GPU_CONTEXT');
});
