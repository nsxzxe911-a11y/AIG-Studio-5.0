import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const h=readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
const m=readFileSync(new URL('../web/main.mjs',import.meta.url),'utf8');
const required=['view','overlay','file','demo','pause','fps','p95','draw','cpu','detail','stability','balance','disk','resolution','quality','auto','wave','reclaim','reclaimstat','zoom','patch','patchstat','turnl','turnr','reset','export'];
test('AIG dark RGB formal work surface, big real 3D canvas first',()=>{
 assert.match(h,/--bg:#020407/);assert.match(h,/--panel:#07111b/);
 assert.match(h,/--cyan:#48e7f4/);assert.match(h,/--violet:#a57bff/);assert.match(h,/--pink:#ff59b3/);
 assert.ok(h.indexOf('class="viewport"')<h.indexOf('<aside class="control-pane"'));
 assert.ok(h.includes('aspect-ratio:16/9'));
 assert.equal(h.includes('TECHNICAL PREVIEW · 非正式人物'),false);
});
test('Every legacy executable callback and live telemetry target stays unique',()=>{
 for(const id of required){const escaped=id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  assert.equal((h.match(new RegExp('id="'+escaped+'"','g'))||[]).length,1,id);}
});
test('Four tabs have unique real panels, aria state and click/key controls',()=>{
 for(const name of ['model','motion','display','resource']){
  assert.match(h,new RegExp('id="tab-'+name+'"[^>]*data-panel-target="'+name+'"'));
  assert.match(h,new RegExp('id="panel-'+name+'"[^>]*data-panel="'+name+'"'));
 }
 assert.match(m,/addEventListener\('click',\(\)=>selectPanel\(/);
 assert.match(m,/addEventListener\('keydown',event=>/);
 assert.match(m,/selectPanel\('model'\)/);
});
test('Memory safety is not confused with GPU percent or fake verified 60 FPS',()=>{
 assert.match(h,/未儲存修改/);
 assert.match(h,/GPU 使用率/);
 assert.match(h,/尚未通過實機驗收/);
 assert.match(h,/1080p · 60 FPS 目標/);
 assert.match(h,/id="resolution-tag"/);
 assert.match(h,/id="resolution-status"/);
 assert.match(m,/quickStatus.textContent='GPU 不可用'/);
});