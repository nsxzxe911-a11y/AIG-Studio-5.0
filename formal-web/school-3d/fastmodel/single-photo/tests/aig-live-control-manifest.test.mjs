import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {FASTMODEL_CONTROL_SCHEMA,FASTMODEL_CONTROLS,bindFastModelLiveControls}
 from '../aig-live-control-manifest.mjs';

test('all six existing real media buttons receive stable unique Page/Button/Command identity',()=>{
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const app=fs.readFileSync(new URL('../app.mjs',import.meta.url),'utf8');
 const byId=new Map();
 for(const item of FASTMODEL_CONTROLS) {
  assert.equal((html.match(new RegExp('id="'+item.domId+'"','g'))||[]).length,1);
  const listeners=(app.match(new RegExp("aig65-"+item.domId.split('-').at(-1)+"'\\)\\.addEventListener",'g'))||[]);
  assert.ok(app.includes("'"+item.domId+"').addEventListener('click'"),item.domId);
  byId.set(item.domId,{tagName:'BUTTON',dataset:{}});
 }
 assert.equal(new Set(FASTMODEL_CONTROLS.map(x=>x.buttonId)).size,6);
 const doc={getElementById:id=>byId.get(id),
  querySelectorAll:query=>byId.has(query.slice(1))?[byId.get(query.slice(1))]:[]};
 const result=bindFastModelLiveControls(doc);
 assert.equal(result.ready,true);
 assert.equal(result.count,6);
 assert.equal(result.schema,FASTMODEL_CONTROL_SCHEMA);
 assert.equal(result.actualFilmNotProvedByThisManifest,true);
 for(const item of FASTMODEL_CONTROLS) {
  const el=byId.get(item.domId);
  assert.equal(el.dataset.aigCommandId,item.commandId);
  assert.equal(el.dataset.aigButtonId,item.buttonId);
  assert.equal(el.dataset.aigPageId,item.pageId);
 }
 byId.delete('aig65-play');
 assert.equal(bindFastModelLiveControls(doc).ready,false);
});
