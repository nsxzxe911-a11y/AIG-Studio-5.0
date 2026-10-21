import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {normalizeAIG693AutoInputs,AIG693_INPUT_SCHEMA} from '../aig-auto-inputs-6-9.mjs';
test('6.9.3: empty Android number input is never Number("") => zero',()=>{
 for(const value of ['', '  ',null,undefined,'abc','NaN','0','-5','75','1']){
  const x=normalizeAIG693AutoInputs({mode:'AUTO',duration:value,story:'角色轉頭'});
  assert.equal(x.durationSeconds,8,String(value));
  assert.ok(x.corrections.includes('DURATION_DEFAULT_8_SECONDS'));
  assert.equal(x.ready,true);
 }
});
test('6.9.3: invalid select restores AUTO, valid 3D remains explicit and no WAV ever required',()=>{
 for(const mode of ['',undefined,'invalid',null]){
  const x=normalizeAIG693AutoInputs({mode,duration:'8',hasImage:true});
  assert.equal(x.requestedMode,'AUTO');
  assert.deepEqual(x.corrections,['MODE_DEFAULT_AUTO']);
  assert.equal(x.audioFileRequired,false);
 }
 assert.equal(normalizeAIG693AutoInputs({mode:'3D',duration:10,story:'hello'}).requestedMode,'3D');
 assert.equal(normalizeAIG693AutoInputs({mode:'2.5D',duration:2,story:'hello'}).durationSeconds,2);
});
test('6.9.3: no source is a friendly blocking reason, not progress purporting to generate',()=>{
 const x=normalizeAIG693AutoInputs({mode:'',duration:'',story:' ',hasImage:false});
 assert.equal(x.schema,AIG693_INPUT_SCHEMA);
 assert.equal(x.ready,false);
 assert.match(x.blockingReason,/照片|劇情/);
});
test('6.9.3: runtime and compact UI use real normalized inputs and actual progress stages',()=>{
 const read=f=>fs.readFileSync(new URL('../'+f,import.meta.url),'utf8');
 const app=read('app.mjs'),html=read('index.html'),shell=read('aig-unified-shell-6-9.mjs');
 for(const token of ['normalizeAIG693AutoInputs(', 'inputReady.durationSeconds',
  'inputReady.requestedMode','aig693Progress(', 'AIG693_INPUTS_READY',
  'aig693-progress','MODE_DURATION_OR_CLIPS_INVALID'])
  assert.ok(app.includes(token)||html.includes(token),token);
 for(const name of ['aig65-image','aig65-story','aig65-mode','aig65-duration'])
  assert.ok(shell.includes("'"+name+"'"),name);
 assert.ok(shell.includes('aig-unified-auto-sound'));
 assert.ok(shell.includes('panels.create.insertBefore(soundHelp'));
 assert.ok(html.includes('role="progressbar"'));
 assert.ok(html.includes('id="aig693-progress"'));
});
