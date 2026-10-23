import test from 'node:test';
import assert from 'node:assert/strict';
import {AIG38CharacterAssetIndex,createAIG38CharacterCatalog,
 AIG38_ASSET_SCHEMA} from '../aig-character-asset-index-3-8.mjs';
import {AIG38_FIXED_WORK_PROFILE,AIG37_SLOT_PRESETS,
 planAIG36UnifiedCore,colourAIG36VertexShards}
 from '../aig-unified-120-core-3-6.mjs';

test('12,000 is a real executed logical-shard profile, not 12,000 physical cores',async()=>{
 assert.equal(AIG38_FIXED_WORK_PROFILE,12000);
 assert.ok(AIG37_SLOT_PRESETS.includes(12000));
 const plan=planAIG36UnifiedCore({
  requestedLogicalSlots:AIG38_FIXED_WORK_PROFILE,
  hardwareConcurrency:8,deviceMemoryGb:4,mobile:true
 });
 assert.equal(plan.logicalSlotsConfigured,12000);
 assert.equal(plan.activeProfile,'REAL3D_12000_LOGICAL_WORK_SLOTS');
 assert.ok(plan.schedulingLanes<=2);
 assert.equal(plan.parallelHardwareCoresCertified,0);
 const count=12024,w=32,h=64;
 const positions=new Float32Array(count*3);
 const ids=new Uint8Array(count).fill(2);
 const labels=new Uint8Array(w*h).fill(2);
 const pixels=new Uint8ClampedArray(w*h*4);
 for(let i=0;i<w*h;i++)pixels.set([201,142,112,255],i*4);
 for(let i=0;i<count;i++){
  positions[i*3]=(i%30-15)*.004;
  positions[i*3+1]=.8+(i%40)*.006;
  positions[i*3+2]=i%2?.05:-.05;
 }
 const source={width:w,height:h,pixels,labels};
 const first=pixels.slice(),pos=positions.slice();
 let yields=0;
 const result=await colourAIG36VertexShards({
  shell:{positions,vertexSourceLabelIds:ids,
   sourceClassColorRGB:{2:[.8,.55,.42]}},
  source,bodyHeightUnits:2,plan,
  yieldControl:async()=>{yields++}
 });
 assert.equal(result.completedIdenticalKernelSlots,12000);
 assert.equal(result.effectiveSlotsUsed,12000);
 assert.equal(result.actualVerticesColoured,count);
 assert.ok(yields>3);
 assert.equal(result.trueParallelCPUWorkers,0);
 assert.equal(result.rendererContextsCreated,0);
 assert.equal(result.hardwareSpeedupFromSlotsVerified,false);
 assert.deepEqual(pixels,first);
 assert.deepEqual(positions,pos);
 const small=await colourAIG36VertexShards({
  shell:{positions:positions.slice(0,300),vertexSourceLabelIds:ids.slice(0,100),
   sourceClassColorRGB:{2:[.8,.55,.42]}},
  source,bodyHeightUnits:2,plan,yieldControl:async()=>{}
 });
 assert.equal(small.effectiveSlotsUsed,100);
 assert.equal(small.slotCountLimitedByActualVertices,true);
});
test('12,000 clothing metadata records stay index-only, paged, no GPU meshes',()=>{
 const x=new AIG38CharacterAssetIndex();
 for(let i=0;i<12000;i++){
  x.register({id:'future:item-'+String(i).padStart(5,'0'),
   slot:i%3?'upper':'hair',title:'規劃資產 '+i,
   version:1,status:'pending',tags:['待完成真 3D']});
 }
 assert.equal(x.snapshot().totalIndexed,12000);
 assert.equal(x.snapshot().activeCount,0);
 const page=x.page({slot:'hair',offset:24,limit:8});
 assert.equal(page.items.length,8);
 assert.equal(page.totalMatched,4000);
 assert.equal(page.actualSourceMeshesLoadedByIndex,0);
 assert.equal(x.page({query:'不存在的圖資'}).totalMatched,0);
 assert.throws(()=>x.page({limit:1000}),/INVALID_PAGE_ARGUMENTS/);
 assert.throws(()=>x.planWear('future:item-00000'),/REAL_ASSET_NOT_INSTALLED/);
});
test('daily garment switching retains one base, checks GPU budget and hair asset presence',()=>{
 const x=createAIG38CharacterCatalog();
 assert.equal(x.snapshot().schema,AIG38_ASSET_SCHEMA);
 assert.equal(x.snapshot().totalIndexed,8);
 const hair=x.page({slot:'hair'});
 assert.equal(hair.items.length,5);
 assert.ok(hair.items.every(i=>i.status==='pending'&&!i.assetRef));
 assert.throws(()=>x.planWear('planned:ponytail'),/REAL_ASSET_NOT_INSTALLED/);
 const a=x.planWear('procedural:uniform');
 assert.deepEqual(a.proposedAssetIds,['procedural:uniform']);
 assert.equal(a.renderingAssetActuallyAttached,false);
 assert.throws(()=>x.commitWear('procedural:uniform'),/REAL_MESH_LOAD_REQUIRED/);
 assert.equal(x.snapshot().activeCount,0);
 assert.equal(x.commitWear('procedural:uniform',true).activeIndexCommitted,true);
 const b=x.planWear('procedural:casual');
 assert.deepEqual(b.proposedAssetIds,['procedural:casual']);
 assert.deepEqual(b.removedAssetIds,['procedural:uniform']);
 x.commitWear('procedural:casual',true);
 assert.deepEqual(x.snapshot().activeIds,['procedural:casual']);
 assert.equal(x.snapshot().bodySourceAndRigUnmodified,true);
 assert.equal(x.remove('procedural:casual'),true);
 assert.equal(x.snapshot().activeCount,0);
 const small=new AIG38CharacterAssetIndex({maxEstimatedGpuBytes:1024*1024});
 small.register({id:'big:uniform',slot:'outfit',title:'大衣服',
  version:1,status:'installed',assetRef:'local:big',
  estimatedGpuBytes:2*1024*1024});
 assert.throws(()=>small.planWear('big:uniform'),
  /ACTIVE_ASSET_GPU_OR_COUNT_BUDGET_BLOCKED/);
 assert.equal(small.snapshot().activeCount,0);
});
