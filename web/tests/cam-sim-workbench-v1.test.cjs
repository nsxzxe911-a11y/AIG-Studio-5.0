'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const read=(directory,file)=>fs.readFileSync(path.join(root,directory,file),'utf8');
function api(){
 const win={};
 vm.runInNewContext(read('formal-web','runtime/cam-manual-path-v1.js'),{window:win});
 return win.AigManualCam;
}
const params={safeZ:5,stockTop:0,stockThickness:20,feed:1200,rpm:6000,toolDia:10};
test('real deployed CAM+SIM and source assets match exactly',()=>{
 for(const file of ['mobile-runtime.html','runtime/cam-manual-path-v1.js','authority/aigii-cam-sim-workbench-v1.css','service-worker.js'])
  assert.equal(read('web',file),read('formal-web',file),file);
});
test('MANUAL CAM without CAD returns actual G1 geometry and preserves all motion nodes',()=>{
 const r=api().parseManual('G0 X0 Y0 Z5\nG1 Z-2\nG1 X30 Y0\nG1 X30 Y40\nG0 Z5',params);
 assert.equal(r.paths.length,3);
 assert.equal(r.nodes.length,5);
 assert.equal(r.paths[1].points[1].x,30);
 assert.equal(r.paths[2].depth,-2);
 assert.equal(r.verified,false);
});
test('unsafe rapid, stock-bottom exceedance and false rotary support are blocked',()=>{
 const p=api();
 assert.throws(()=>p.parseManual('G0 X0 Y0 Z5\nG1 Z-2\nG0 X30 Y5',params),/Safe-Z/);
 assert.throws(()=>p.parseManual('G0 X0 Y0 Z5\nG1 Z-21',params),/底面/);
 assert.throws(()=>p.parseManual('G0 X0 Y0 Z5\nG1 X10 Y20 Z-2',params),/XYZ/);
 assert.throws(()=>p.parseManual('G0 X0 Y0 Z5\nG1 A45',params),/A/);
 assert.throws(()=>p.parseManual('G0 X0 Y0 Z5',params),/G1/);
});
test('CAM runtime uses real manual parser, guards source switching and saves compatible paths',()=>{
 const html=read('formal-web','mobile-runtime.html');
 assert.match(html,/AigManualCam\.parseManual\(manualInput\.value,p\)/);
 assert.match(html,/state\.paths=parsed\.paths/);
 assert.match(html,/version:5,createdAt:Date\.now\(\)/);
 assert.match(html,/aig-cam-toolpath-v1/);
 assert.match(html,/verified:false,verificationStatus:"NOT_VERIFIED"/);
 assert.match(html,/routeModeInput\.addEventListener\("change",/);
 assert.match(html,/state\.paths=\[\];state\.manualNodes=\[\]/);
 assert.match(html,/manualBox/);
 assert.match(html,/data-cam-manual-input/);
 assert.match(html,/data-cam-canvas/);
});
test('SIM has four actual state cards and linked material-removal evidence',()=>{
 const html=read('formal-web','mobile-runtime.html');
 const start=html.indexOf('function simHubPage(){'),end=html.indexOf('\nfunction aiPage(){',start);
 const sim=new Function(html.slice(start,end)+'return simHubPage();')();
 for(const axis of ['3AX','4AX','5AX','6AX']){
  assert.ok(sim.includes('data-sim-state="'+axis+'"'),axis);
  assert.ok(sim.includes('data-sim-blocks="'+axis+'"'),axis);
  assert.ok(sim.includes('data-sim-volume="'+axis+'"'),axis);
  assert.ok(sim.includes('data-sim-collision="'+axis+'"'),axis);
  assert.ok(sim.includes('data-sim-progress="'+axis+'"'),axis);
  assert.ok(sim.includes('data-open-page="'+axis+'"'),axis);
 }
 assert.match(html,/state\.root\?\.querySelector\("\[data-removal-volume\]"\)/);
 assert.match(html,/state\.parsed\.errors/);
 assert.match(html,/data-sim-refresh/);
});
test('SIM dashboard never labels samples as user projects or mistakes parsed for PASS',()=>{
 const h=read('formal-web','mobile-runtime.html');
 assert.match(h,/內建範例程式/);
 assert.match(h,/aig-code-"\+axis/);
 assert.match(h,/沒有真機驗收/);
 assert.match(h,/data-sim-attention/);
});
test('old CNC Web runtime, 3AX-6AX and AI V2 are still present and syntactically valid',()=>{
 const html=read('formal-web','mobile-runtime.html');
 for(const token of ['function makeCadRuntime(root)','function makeCamRuntime(root)','function makeRuntime(root)',
 'function makeNcRuntime(root)','function parseProgram(','data-glcanvas','data-nc-code',
 'aigii-ai-cockpit-v2.css','aigii-axis-fidelity-v4.css','cam-manual-path-v1.js'])
  assert.ok(html.includes(token),token);
 for(const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(match[1])
  assert.doesNotThrow(()=>new vm.Script(match[1]));
});
test('offline cache v14 publishes new CAM/SIM functionality without a fake machine connector',()=>{
 const sw=read('formal-web','service-worker.js');
 assert.match(sw,/aig-ii-runtime-recovery-20261018-v15/);
 assert.ok(sw.includes('cam-manual-path-v1.js'));
 assert.ok(sw.includes('aigii-cam-sim-workbench-v1.css'));
 assert.doesNotThrow(()=>new vm.Script(sw));
});
