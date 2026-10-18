'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const read=(folder,name)=>fs.readFileSync(path.join(root,folder,name),'utf8');
function load(){
 const global={};
 vm.runInNewContext(read('formal-web','runtime/ai-page-runtime.js'),{window:global,document:undefined});
 return global;
}
function storage(data){return{getItem:key=>Object.prototype.hasOwnProperty.call(data,key)?data[key]:null}}
test('AI V2 and workbench source exactly mirror the Render publish directory',()=>{
 for(const f of ['runtime/ai-page-runtime.js','mobile-runtime.html','authority/aigii-ai-cockpit-v2.css','service-worker.js'])
  assert.equal(read('web',f),read('formal-web',f));
});
test('each 3AX-6AX supports NC-first without claiming a machine PASS',()=>{
 const ai=load();
 assert.deepEqual(Array.from(ai.AIG_ALLOWED_AI_AXES),['3AX','4AX','5AX','6AX']);
 for(const axis of ai.AIG_ALLOWED_AI_AXES){
  const snap=ai.aigAiSnapshot(storage({['aig-code-'+axis]:'G90 G54 X0.\nM30'}),axis);
  const plan=ai.aigWebMachiningPlan({targetAxis:axis,snapshot:snap});
  assert.equal(plan.routeKind,'NC_FIRST');
  assert.equal(plan.safeForMachine,false);
  assert.equal(plan.machineEnabled,false);
  assert.ok(plan.issues.some(issue=>issue.code==='SIM_NOT_VERIFIED'));
 }
});
test('CAD, CAM and absent evidence result in honest routes and blocking findings',()=>{
 const ai=load();
 const cad=ai.aigAiSnapshot(storage({'aig-cad-draft-v1':'{"shapes":[{"type":"line"}]}'}),'5AX');
 const cam=ai.aigAiSnapshot(storage({'aig-cam-toolpath-v1':'{"paths":[{"type":"mill"}]}'}),'5AX');
 const empty=ai.aigAiSnapshot(storage({}),'5AX');
 assert.equal(ai.aigWebMachiningPlan({targetAxis:'5AX',snapshot:cad}).routeKind,'CAD_FIRST');
 assert.equal(ai.aigWebMachiningPlan({targetAxis:'5AX',snapshot:cam}).routeKind,'MANUAL_CAM_FIRST');
 const missing=ai.aigWebMachiningPlan({targetAxis:'5AX',snapshot:empty});
 assert.equal(missing.routeKind,'PREPARE_NC');
 assert.ok(missing.issues.some(v=>v.code==='NO_SOURCE_ARTIFACT'));
});
test('AI runtime does not forge SIM verification or lose state on invalid command',()=>{
 const ai=load(),runtime=new ai.WebAiPageRuntime();
 const good=runtime.dispatch({page:'AI',commandId:'AI.PLAN.BUILD',arguments:{targetAxis:'6AX'}});
 assert.equal(good.type,'ACCEPTED');
 const p=runtime.plan;
 const audit=runtime.dispatch({page:'AI',commandId:'AI.AUDIT.RUN',arguments:{}});
 assert.equal(audit.evidence.safe,'false');
 assert.equal(runtime.lastAuditSafe,false);
 const before=runtime.revision;
 assert.equal(runtime.dispatch({page:'AI',commandId:'AI.PLAN.BUILD',arguments:{targetAxis:'7AX'}}).type,'REJECTED');
 assert.equal(runtime.revision,before);
 assert.equal(runtime.plan,p);
});
test('real AI DOM has axis, plans, blockers, data refresh and original router IDs',()=>{
 const html=read('formal-web','mobile-runtime.html');
 const begin=html.indexOf('function aiPage(){'),end=html.indexOf('\nfunction ncPage(){',begin);
 const page=new Function(html.slice(begin,end)+'return aiPage();')();
 for(const marker of ['data-ai-axis','data-ai-stages','data-ai-issues','data-ai-status','data-ai-data','data-ai-refresh','value="6AX"'])
  assert.ok(page.includes(marker),marker);
 for(const id of ['AI.PLAN.BUILD','AI.PLAN.OPTIMIZE','AI.ASSIST.EXPLAIN','AI.AUDIT.RUN','AI.RECOVERY.REPLAN']){
  assert.ok(page.includes(id),id);
  assert.ok(read('formal-web','runtime/page-runtime-router.js').includes(id),id);
 }
 assert.ok(html.includes('aigii-ai-cockpit-v2.css'));
});
test('Web core remains and no AI can output NC_MACHINE',()=>{
 const html=read('formal-web','mobile-runtime.html');
 for(const marker of ['function makeCadRuntime(root)','function makeCamRuntime(root)','function makeNcRuntime(root)','function parseProgram(','data-glcanvas'])
  assert.ok(html.includes(marker),marker);
 const ai=read('formal-web','runtime/ai-page-runtime.js');
 assert.ok(!ai.includes("'NC_MACHINE'"));
 for(const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))
  if(match[1])assert.doesNotThrow(()=>new vm.Script(match[1]));
});
test('AI v13 offline cache includes page and runtime',()=>{
 const sw=read('formal-web','service-worker.js');
 assert.ok(sw.includes('aig-ii-authority-registry-recovered-20261018-v17'));
 assert.ok(sw.includes('aigii-ai-cockpit-v2.css'));
 assert.ok(sw.includes('ai-page-runtime.js'));
 assert.doesNotThrow(()=>new vm.Script(sw));
});

test('AIG-II selector guard keeps 4AX 5AX 6AX on the formal AI page',()=>{
 const router=read('formal-web','runtime/page-runtime-router.js');
 const guard=router.slice(router.indexOf('function sanitizeProductScreen('),router.indexOf('function installAuthoritySkinV1('));
 assert.ok(guard.includes("if(!AIGII_MODE)node.querySelectorAll('select option')"));
 const html=read('formal-web','mobile-runtime.html');
 const begin=html.indexOf('function aiPage(){'),end=html.indexOf('\nfunction ncPage(){',begin);
 const page=new Function(html.slice(begin,end)+'return aiPage();')();
 for(const axis of ['3AX','4AX','5AX','6AX'])assert.ok(page.includes('value="'+axis+'"'));
});
