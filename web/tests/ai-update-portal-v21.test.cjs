'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');const read=(area,p)=>fs.readFileSync(path.join(root,area,p),'utf8');
test('AI update entry added in existing Render updates and original portal',()=>{
 for(const p of ['index.html','updates.html','ai-updates.html','ai-updates.js','ai-update-manifest.json','site-ai-updates-v1.css','service-worker.js'])assert.equal(read('web',p),read('formal-web',p),p);
 assert.match(read('formal-web','updates.html'),/id="ai-updates"/);
 assert.match(read('formal-web','updates.html'),/href="\.\/ai-updates\.html"/);
 assert.match(read('formal-web','index.html'),/href="\.\/ai-updates\.html"/);
 assert.match(read('formal-web','index.html'),/id="dual-projects"/);
 assert.match(read('formal-web','ai-updates.html'),/href="\.\/mobile-runtime\.html#AI"/);
});
test('AI update check is a real read-only publication check and may not mutate CNC work',()=>{
 const man=JSON.parse(read('formal-web','ai-update-manifest.json'));
 assert.equal(man.moduleId,'AIG_WEB_AI_ORCHESTRATOR_V2');
 assert.equal(man.sourceGitBlobSha.length,40);
 assert.equal(man.machineOutputEnabled,false);
 assert.equal(man.automaticCodeDeployment,false);
 const js=read('formal-web','ai-updates.js');
 assert.doesNotThrow(()=>new vm.Script(js));
 assert.match(js,/fetch\("\.\/ai-update-manifest\.json"/);
 assert.ok(!js.includes('localStorage.clear('));
 assert.ok(!js.includes('NC_MACHINE'));
 assert.ok(!js.includes('dispatch('));
 const sw=read('formal-web','service-worker.js');
 assert.match(sw,/const CACHE="aig-ii-original-render-v4-ai-update-20261018-v21"/);
 for(const p of ['./ai-updates.html','./ai-updates.js','./ai-update-manifest.json','./site-ai-updates-v1.css'])assert.ok(sw.includes('"'+p+'"'),p);
});
test('AI update layer does not misrepresent native Gate and remains responsive',()=>{
 const html=read('formal-web','ai-updates.html');
 assert.match(html,/local-first/);
 assert.match(html,/不會自動下發 CNC 程式/);
 assert.match(html,/id="ai-update-check"/);
 assert.match(read('formal-web','site-ai-updates-v1.css'),/@media\(max-width:500px\)/);
});
