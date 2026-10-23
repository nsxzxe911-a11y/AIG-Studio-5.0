import test from 'node:test';
import assert from 'node:assert/strict';
import {AIG310_FIXED_WORK_PROFILE,AIG38_FIXED_WORK_PROFILE,
 AIG37_SLOT_PRESETS,planAIG36UnifiedCore,colourAIG36VertexShards}
 from '../aig-unified-120-core-3-6.mjs';
import {planAIG39ConservativeBudget}
 from '../aig-runtime-stability-3-9.mjs';

test('19,200 is the new logical-slot default, with no claim of 19,200 hardware cores',()=>{
 assert.equal(AIG310_FIXED_WORK_PROFILE,19200);
 assert.equal(AIG38_FIXED_WORK_PROFILE,12000);
 assert.ok(AIG37_SLOT_PRESETS.includes(19200));
 const desktop=planAIG36UnifiedCore({
  hardwareConcurrency:32,deviceMemoryGb:16});
 const phone=planAIG36UnifiedCore({
  hardwareConcurrency:8,deviceMemoryGb:2,mobile:true});
 assert.equal(desktop.logicalSlotsConfigured,19200);
 assert.equal(desktop.activeProfile,'REAL3D_19200_LOGICAL_WORK_SLOTS');
 assert.equal(desktop.schedulingLanes,4);
 assert.equal(phone.schedulingLanes,1);
 assert.equal(phone.realWebWorkersSpawned,0);
 assert.equal(desktop.sharedWebGLContextCount,1);
 assert.equal(desktop.parallelHardwareCoresCertified,0);
 const fallback=planAIG36UnifiedCore({requestedLogicalSlots:12000});
 assert.equal(fallback.activeProfile,'REAL3D_12000_LOGICAL_WORK_SLOTS');
});
test('19,200 actual source-pixel colour shards execute for 20,032 genuine vertices',async()=>{
 const vertexCount=20032,w=48,h=72;
 const p=new Float32Array(vertexCount*3),ids=new Uint8Array(vertexCount);
 ids.fill(2);
 const labels=new Uint8Array(w*h).fill(2);
 const pixels=new Uint8ClampedArray(w*h*4);
 for(let j=0;j<w*h;j++)pixels.set([194,111,75,255],j*4);
 for(let i=0;i<vertexCount;i++){
  p[i*3]=(i%17-8)/130;
  p[i*3+1]=.7+(i%101)/110;
  p[i*3+2]=i%2===0?.025:-.025;
 }
 const plan=planAIG36UnifiedCore({hardwareConcurrency:24,mobile:false});
 const before=p.slice(),sourceBefore=pixels.slice();
 let yields=0;
 const result=await colourAIG36VertexShards({
  shell:{positions:p,vertexSourceLabelIds:ids,sourceClassColorRGB:
   {2:[.55,.48,.44]}},
  source:{width:w,height:h,labels,pixels},bodyHeightUnits:2,plan,
  yieldControl:async()=>{yields++}
 });
 assert.equal(result.logicalSlotsConfigured,19200);
 assert.equal(result.effectiveSlotsUsed,19200);
 assert.equal(result.completedIdenticalKernelSlots,19200);
 assert.equal(result.actualVerticesColoured,vertexCount);
 assert.ok(yields>=60);
 assert.equal(result.sourcePixelsAltered,false);
 assert.equal(result.rendererContextsCreated,0);
 assert.equal(result.no19200PhysicalCoreClaim,true);
 assert.equal(result.trueParallelCPUWorkers,0);
 assert.equal(result.hardwareSpeedupFromSlotsVerified,false);
 assert.deepEqual(p,before);
 assert.deepEqual(pixels,sourceBefore);
 assert.ok(result.colours.every(Number.isFinite));
});
test('device guard never invents more vertex work than the model contains',async()=>{
 const count=113,w=16,h=32;
 const p=new Float32Array(count*3);
 const ids=new Uint8Array(count).fill(2);
 const source={width:w,height:h,labels:new Uint8Array(w*h).fill(2),
  pixels:new Uint8ClampedArray(w*h*4).fill(210)};
 for(let i=0;i<count;i++)p[i*3+1]=i/100;
 const plan=planAIG36UnifiedCore();
 const result=await colourAIG36VertexShards({
  shell:{positions:p,vertexSourceLabelIds:ids,sourceClassColorRGB:{2:[.7,.5,.4]}},
  source,bodyHeightUnits:2,plan,yieldControl:async()=>{}
 });
 assert.equal(result.effectiveSlotsUsed,count);
 assert.equal(result.slotCountLimitedByActualVertices,true);
 const budget=planAIG39ConservativeBudget({
  vertexCount:count,mobile:true,deviceMemoryGb:2});
 assert.equal(budget.requestedLogicalSlots,19200);
 assert.equal(budget.effectiveSlots,count);
 assert.equal(budget.cappedCooperativeLanes,1);
 assert.equal(budget.rendererContextsAllowed,1);
});
test('cancellation exits the cooperative 19,200 task without mutating source',async()=>{
 const count=20010,w=32,h=64;
 const positions=new Float32Array(count*3);
 const ids=new Uint8Array(count).fill(2);
 const pixels=new Uint8ClampedArray(w*h*4).fill(120);
 const labels=new Uint8Array(w*h).fill(2);
 const ctrl=new AbortController();let n=0;
 await assert.rejects(colourAIG36VertexShards({
  shell:{positions,vertexSourceLabelIds:ids,sourceClassColorRGB:{2:[.3,.3,.3]}},
  source:{width:w,height:h,pixels,labels},
  bodyHeightUnits:1,plan:planAIG36UnifiedCore(),
  signal:ctrl.signal,yieldControl:async()=>{if(++n===1)ctrl.abort()}
 }),/AIG36_CANCELLED_BEFORE_APPLY/);
 assert.ok(n>0);
 assert.ok(pixels.every(v=>v===120));
});
