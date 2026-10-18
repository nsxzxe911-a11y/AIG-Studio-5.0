'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const {TextEncoder}=require('node:util');
const root=path.resolve(__dirname,'../..');
const read=(area,file)=>fs.readFileSync(path.join(root,area,file),'utf8');
const ASSETS=['index.html','guide.html','faq.html','updates.html','project-sync.html','project-sync.css','project-sync.js','project-transfer.js','site-phase4.css','phase4.css','service-worker.js','mobile-runtime.html'];
function memStorage(initial={}){
 const m=new Map(Object.entries(initial));
 return {getItem:k=>m.has(k)?m.get(k):null,setItem(k,v){m.set(k,String(v))},removeItem:k=>m.delete(k),key:i=>[...m.keys()][i],get length(){return m.size}};
}
function api(){
 const context={crypto:webcrypto,TextEncoder};
 vm.runInNewContext(read('formal-web','project-transfer.js'),{window:context});
 return context.AIGProjectTransfer;
}
test('Phase IV Web and deployed formal-web source files are identical',()=>{
 for(const f of ASSETS)assert.equal(read('web',f),read('formal-web',f),f);
});
test('site and workbench both link to the proper same-origin project handoff',()=>{
 const home=read('formal-web','index.html'),runtime=read('formal-web','mobile-runtime.html');
 assert.match(home,/href="\.\/project-sync\.html"/);
 assert.match(runtime,/class="projectTransferLink"/);
 assert.match(runtime,/target="_blank"/);
 assert.doesNotMatch(runtime,/data-menu-file/);
 assert.doesNotMatch(runtime,/a\.dataset\.menuAction==="EXPORT"/);
 for(const p of ['HOME','CAD','CAM','SIM','3AX','4AX','5AX','6AX','NC','AI'])
  assert.match(runtime,new RegExp('\\["'+p+'","\\#'));
 const scripts=[...runtime.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(Boolean);
 for(const code of scripts)assert.doesNotThrow(()=>new vm.Script(code));
});
test('project manager is a real local file transfer, not a simulated Google sync',()=>{
 const h=read('formal-web','project-sync.html'),js=read('formal-web','project-sync.js');
 for(const id of ['transfer-export','transfer-file','transfer-apply','transfer-confirm','transfer-backups','transfer-restore'].filter(x=>x!=='transfer-confirm'))
  assert.ok(h.includes('id="'+id+'"'),id);
 assert.match(h,/id="transfer-acknowledge"/);
 assert.match(h,/SHA-256/);
 assert.match(h,/手動開啟 Google Drive/);
 assert.doesNotMatch(h,/已連線 Google|Google Drive 已同步/);
 assert.match(js,/api\.inspectFile/);
 assert.match(js,/api\.applyFile/);
 assert.match(js,/api\.restoreLocalBackup/);
 assert.doesNotThrow(()=>new vm.Script(js));
});
test('export contains all 3~6 axes and SHA-256; corrupted data is rejected',async()=>{
 const t=api(),a=memStorage({'aig-project-meta-v1':'{"name":"test","revision":3}','aig-code-3AX':'G90','aig-code-6AX':'G0 A0 B0 C0'});
 const exported=await t.exportProject(a,Date.parse('2026-10-18T00:00:00Z'));
 assert.equal(exported.schema,'AIG-PROJECT-TRANSFER-2');
 assert.equal(exported.entries['aig-code-6AX'],'G0 A0 B0 C0');
 assert.match(exported.digest.value,/^[0-9a-f]{64}$/);
 const valid=await t.inspectFile(JSON.stringify(exported),memStorage());assert.equal(valid.verified,true);
 const corrupted=JSON.parse(JSON.stringify(exported));corrupted.entries['aig-code-6AX']='G0 A0 B0 C99';
 await assert.rejects(()=>t.inspectFile(JSON.stringify(corrupted),memStorage()),/SHA-256/);
});
test('conflict choices preserve data, make pre-apply backups and recover safely',async()=>{
 const t=api(),deviceA=memStorage({'aig-project-meta-v1':'{"name":"A"}','aig-code-6AX':'G0 C180'});
 const pack=await t.exportProject(deviceA);
 const deviceB=memStorage({'aig-project-meta-v1':'{"name":"B"}','aig-code-6AX':'G0 C0'});
 let review=await t.inspectFile(JSON.stringify(pack),deviceB);
 assert.equal(review.conflicts.length,2);
 assert.equal(deviceB.getItem('aig-code-6AX'),'G0 C0');
 const keep=t.applyFile(review,deviceB,'keep');assert.equal(keep.changed,0);assert.equal(deviceB.getItem('aig-code-6AX'),'G0 C0');
 review=await t.inspectFile(JSON.stringify(pack),deviceB);
 const imported=t.applyFile(review,deviceB,'replace');assert.ok(imported.backupKey);assert.equal(deviceB.getItem('aig-code-6AX'),'G0 C180');
 const restored=t.restoreLocalBackup(deviceB,imported.backupKey);assert.ok(restored.recoveryKey);
 assert.equal(deviceB.getItem('aig-code-6AX'),'G0 C0');
});
test('stale preview blocks overwriting edited data and legacy format remains recognized',async()=>{
 const t=api(),src=memStorage({'aig-code-3AX':'G90'});
 const exported=await t.exportProject(src);
 const dest=memStorage({'aig-code-3AX':'G91'});
 const reviewed=await t.inspectFile(JSON.stringify(exported),dest);
 dest.setItem('aig-code-3AX','G93');
 assert.throws(()=>t.applyFile(reviewed,dest,'replace'),/重新讀取/);
 assert.equal(dest.getItem('aig-code-3AX'),'G93');
 const old=await t.inspectFile(JSON.stringify({schema:'AIG-WEB-PROJECT-1',nc:{'5AX':'G0 A0'}}),memStorage());
 assert.equal(old.verified,false);
 assert.equal(old.entries['aig-code-5AX'],'G0 A0');
});
test('Phase IV assets are included in versioned offline cache',()=>{
 const sw=read('formal-web','service-worker.js');
 assert.match(sw,/aig-ii-authority-revocation-20261018-v18/);
 for(const p of ['index.html','project-sync.html','project-transfer.js','project-sync.js','project-sync.css','phase4.css','mobile-runtime.html'])
  assert.ok(sw.includes('"./'+p+'"'),p);
 assert.doesNotThrow(()=>new vm.Script(sw));
});
