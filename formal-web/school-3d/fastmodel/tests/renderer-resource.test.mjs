import test from 'node:test';import assert from 'node:assert/strict';
import {FastModelView} from '../web/renderer.mjs';
test('high pressure optional GPU release deletes only hair buffers not edited geometry',()=>{
  const deleted=[];const gl={deleteVertexArray(x){deleted.push(['vao',x]);},deleteBuffer(x){deleted.push(['buf',x]);}};
  const face={skin:0,vao:1,vb:2,ib:3,gpuBytes:3000};
  const hair={skin:1,vao:4,vb:5,ib:6,gpuBytes:7000,editable:false,optionalDetail:true,detailGroup:'fine-hair'};
  const neck={skin:1,vao:7,vb:8,ib:9,gpuBytes:2000};
  const pretend={gl,entries:[face,neck,hair],drawEntries:[face,neck,hair],gpuAllocatedEstimateBytes:14000,
    stats:{drawCalls:3,skipped:0},detailMode:'auto',detailState:{hidden:false},
    refreshDetailEntries:FastModelView.prototype.refreshDetailEntries};
  const r=FastModelView.prototype.releaseOptionalHair.call(pretend);
  assert.equal(r.requestedGpuReleaseBytes,7000);
  assert.equal(r.releasedHairBatches,1);
  assert.equal(pretend.entries.length,2);assert.equal(pretend.entries[0],face);assert.equal(pretend.entries[1],neck);assert.equal(pretend.activeDrawEntries.length,2);
  assert.equal(pretend.gpuAllocatedEstimateBytes,7000);
  assert.deepEqual(deleted,[['vao',4],['buf',5],['buf',6]]);
  assert.equal(FastModelView.prototype.releaseOptionalHair.call(pretend).requestedGpuReleaseBytes,0);
});

test('malformed incoming GLB cannot destroy existing render scene',async()=>{
  let released=false;
  const fake={governor:{b:{gpuWorkingSetEstimateBytes:128*1024*1024}},disposeMeshes(){released=true;}};
  await assert.rejects(FastModelView.prototype.load.call(fake,new Uint8Array(120).buffer));
  assert.equal(released,false);
});
test('skin index alone never allows a deletion of head, neck or primary hair',()=>{
 const deleted=[],gl={deleteVertexArray(x){deleted.push(x)},deleteBuffer(x){deleted.push(x)}};
 const neck={skin:1,vao:4,vb:5,ib:6,gpuBytes:7000};
 const obj={gl,entries:[neck],drawEntries:[neck],gpuAllocatedEstimateBytes:7000,
  detailMode:'auto',detailState:{hidden:false},refreshDetailEntries:FastModelView.prototype.refreshDetailEntries};
 const r=FastModelView.prototype.releaseOptionalHair.call(obj);
 assert.equal(r.requestedGpuReleaseBytes,0);assert.equal(obj.entries.length,1);assert.deepEqual(deleted,[]);
});
