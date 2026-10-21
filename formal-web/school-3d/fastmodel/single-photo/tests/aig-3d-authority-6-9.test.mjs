import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=name=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');
test('6.9.4 suppresses unapproved generated humanoid as formal visible 3D, but never destroys its source',()=>{
 const app=read('app.mjs'),shell=read('aig-unified-shell-6-9.mjs'),html=read('index.html');
 for(const token of ['aigTechnicalModelUnapproved=technical===true',
  "aigUnifiedShell?.setModelEvidence(technical?'technical':'imported')",
  "const modelReady=!!(view?.model&&sourceSha)&&!aigTechnicalModelUnapproved",
  'aigUnifiedShell?.setCanvasReady(',
  'await load(output.bytes.buffer,false,{technical:true})',
  'await load(fitted.bytes.buffer,false,{technical:true})',
  'await load(bytes.buffer,false,{technical:true})',
  'await load(glb.bytes.buffer,false,{technical:true})']){
   assert.ok(app.includes(token),token);
 }
 assert.ok(app.includes('await load(await f.arrayBuffer(),false)'));
 assert.ok(!app.includes('this.scene.remove(this.model)'));
 for(const token of ["modelEvidence==='technical'","modelEvidence==='imported'",
  'viewCanvas.hidden=!allow3D',"stage.dataset.aigModelState=modelEvidence",
  'renderStage();','returnCreate.addEventListener']){
   assert.ok(shell.includes(token),token);
 }
 assert.ok(html.includes('[data-aig-model-state="imported"]'));
 assert.ok(html.includes('#aig-unified-stage-info'));
 assert.ok(html.includes('#aig-unified-model-technical'));
 assert.ok(html.includes('id="aig693-progress"'));
});
test('6.9.4 preserves accessible 3D import and 2D return controls, no fake success',()=>{
 const shell=read('aig-unified-shell-6-9.mjs');
 assert.ok(shell.includes('aig-unified-import-glb'));
 assert.ok(shell.includes('aig-unified-model-back'));
 assert.ok(shell.includes("file.click()"));
 assert.ok(shell.includes('技術模型'));
 assert.ok(shell.includes('正式女主角'));
 assert.ok(shell.includes('modelEvidence=kind'));
 assert.ok(shell.includes("['none','technical','imported']"));
});
