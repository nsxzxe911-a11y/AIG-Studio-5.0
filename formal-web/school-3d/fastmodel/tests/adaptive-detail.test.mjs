import test from 'node:test';
import assert from 'node:assert/strict';
import {DETAIL_MODES,optionalDetailGroup,initialDetailState,nextDetailState,visiblePreviewEntries,measuredFrameSummary} from '../web/adaptive-detail.mjs';
import {FastModelView} from '../web/renderer.mjs';
import fs from 'node:fs';
const read=x=>fs.readFileSync(new URL('../'+x,import.meta.url),'utf8');
test('optional detail requires explicit material marker and known category',()=>{
 assert.deepEqual(DETAIL_MODES,['auto','full','eco']);
 assert.equal(optionalDetailGroup({name:'hair',extras:{}},false),null);
 assert.equal(optionalDetailGroup({name:'skin1'},false),null);
 assert.equal(optionalDetailGroup({extras:{aigOptionalRenderDetail:true,aigOptionalGroup:'fine-hair'}},true),null);
 assert.equal(optionalDetailGroup({extras:{aigOptionalRenderDetail:true,aigOptionalGroup:'face'}},false),null);
 assert.equal(optionalDetailGroup({extras:{aigOptionalRenderDetail:true,aigOptionalGroup:'foliage'}},false),'foliage');
 assert.equal(optionalDetailGroup({extras:{aigOptionalRenderDetail:true,aigOptionalGroup:'water-foam'}},false),'water-foam');
});
test('automatic slow-frame downgrade and hysteresis restore without deleting meshes',()=>{
 let s=initialDetailState();
 for(let i=0;i<17;i++)s=nextDetailState(s,{p95Ms:28});assert.equal(s.hidden,false);
 s=nextDetailState(s,{p95Ms:28});assert.equal(s.hidden,true);
 for(let i=0;i<179;i++)s=nextDetailState(s,{p95Ms:13});assert.equal(s.hidden,true);
 s=nextDetailState(s,{p95Ms:13});assert.equal(s.hidden,false);
 assert.equal(nextDetailState(initialDetailState(),{mode:'eco'}).hidden,true);
 assert.equal(nextDetailState({hidden:true,slow:20,cool:0},{mode:'full'}).hidden,false);
 assert.equal(nextDetailState(initialDetailState(),{pressure:true}).hidden,true);
 assert.throws(()=>nextDetailState(initialDetailState(),{p95Ms:NaN}));
});
test('display-only LOD preserves structural entries, GPU objects and exact order',()=>{
 const face={skin:0,vao:1,optionalDetail:false},neck={skin:1,vao:2},fine={skin:1,vao:3,optionalDetail:true};
 const all=[face,neck,fine],one=visiblePreviewEntries(all,true);
 assert.deepEqual(one,[face,neck]);assert.equal(all.length,3);
 assert.deepEqual(visiblePreviewEntries(all,false),all);
});
test('renderer LOD commits only active display list; source entries remain',()=>{
 const structural={skin:1,optionalDetail:false};
 const optional={skin:1,optionalDetail:true};
 const fake={entries:[structural,optional],drawEntries:[structural,optional],detailMode:'auto',detailState:{hidden:true},stats:{drawCalls:2}};
 let r=FastModelView.prototype.refreshDetailEntries.call(fake);
 assert.equal(r.activeDrawCalls,1);assert.equal(fake.entries.length,2);assert.deepEqual(fake.activeDrawEntries,[structural]);
 assert.equal(r.hiddenOptional,1);
});
test('actual UI/render pipeline, raster and 1080p default all retained',()=>{
 const h=read('web/index.html'),m=read('web/main.mjs'),r=read('web/renderer.mjs'),p=read('tools/build_standalone.py');
 for(const token of ['id="detail-mode"','id="detail-status"','value="auto" selected','id="resolution"','1920x1080','value="off" selected','value="clean" selected'])assert.ok(h.includes(token),token);
 assert.ok(r.includes('optionalDetailGroup('));assert.ok(r.includes('nextDetailState('));assert.ok(r.includes('this.activeDrawEntries'));
 assert.ok(m.includes("view.setDetailMode(el('detail-mode').value)"));
 assert.ok(p.includes('adaptive-detail.mjs'));assert.ok(p.includes("+'\\n'+adaptive+'\\n'"));
 assert.ok(h.includes('光線追蹤：關閉')||m.includes('光線追蹤：關閉'));
});

test('browser frame statistics require enough valid samples and never claim GPU timing',()=>{
 assert.equal(measuredFrameSummary([16,17,18]),null);
 const data=Array(65).fill(16);
 const r=measuredFrameSummary(data);
 assert.equal(r.samples,65);assert.equal(r.fps,62.5);assert.equal(r.p95Ms,16);
 assert.equal(r.source,'BROWSER_RAF_FRAME_DELTA_NOT_GPU_TIME');
 assert.equal(measuredFrameSummary(Array(60).fill(Infinity)),null);
});
test('even an all-optional scene cannot turn into a blank viewport',()=>{
 const optional={optionalDetail:true,vao:9};
 assert.deepEqual(visiblePreviewEntries([optional],true),[optional]);
});
