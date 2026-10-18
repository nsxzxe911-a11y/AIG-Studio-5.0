'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const get=(dir,name)=>fs.readFileSync(path.join(root,dir,name),'utf8');
const pages=['HOME','CAD','CAM','SIM','3AX','4AX','5AX','6AX','NC','AI'];
const assets=['index.html','mobile-runtime.html','site-dual-v2.css','authority/aigii-runtime-visual-v2.css','service-worker.js'];

test('updated visual sources mirror exactly to the real Render publish directory',()=>{
 for(const file of assets)assert.equal(get('web',file),get('formal-web',file),file);
});
test('regular website homepage now provides real dual-project links rather than a fake Studio core',()=>{
 const html=get('formal-web','index.html');
 assert.match(html,/id="dual-projects"/);
 assert.match(html,/AIG-II \/ MAIN INTEGRATION/);
 assert.match(html,/AIG CNC \/ AIG STUDIO 5\.0/);
 assert.match(html,/共用 Web 製圖模組/);
 assert.match(html,/原生核心/);
 assert.match(html,/site-dual-v2\.css/);
 assert.doesNotMatch(html,/<iframe|location\.replace|UIAutomator|WEB RUNTIME/);
 for(const page of pages)assert.ok(html.includes('./mobile-runtime.html#'+page),page);
});
test('workbench visual update retains real input, rendering and page callbacks',()=>{
 const html=get('formal-web','mobile-runtime.html');
 assert.match(html,/aigii-runtime-visual-v2\.css/);
 assert.match(html,/網站首頁　↗/);
 for(const t of ['function makeCadRuntime(root)','function makeCamRuntime(root)','function makeNcRuntime(root)',
 'function parseProgram(','data-glcanvas','data-cad-canvas','data-cam-canvas','data-nc-code',
 'data-ai-page-runtime','productionPageRouter.navigateView']){
  assert.ok(html.includes(t),t);
 }
 assert.doesNotMatch(html,/<title>.*Runtime<\/title>/);
 for(const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)){
  if(match[1])assert.doesNotThrow(()=>new vm.Script(match[1]));
 }
});
test('machining viewport keeps majority width with axis-specific controls and mobile fallback',()=>{
 const css=get('formal-web','authority/aigii-runtime-visual-v2.css');
 assert.match(css,/\.simgrid\s*\{[^}]*2\.45fr[^}]*\.85fr/s);
 assert.match(css,/\.sceneWrap\s*\{min-height:min\(69vh,940px\)/);
 assert.match(css,/@media\(max-width:800px\)/);
 assert.match(css,/\.simgrid\{display:block!important\}/);
 assert.doesNotMatch(css,/url\([^)]*uiux\/assets|background-image\s*:\s*url/);
});
test('offline cache v10 explicitly refreshes both website and workbench styles',()=>{
 const sw=get('formal-web','service-worker.js');
 assert.match(sw,/aig-ii-ai-orchestrator-20261018-v13/);
 assert.ok(sw.includes('"./site-dual-v2.css"'));
 assert.ok(sw.includes('"./authority/aigii-runtime-visual-v2.css"'));
 assert.ok(sw.includes('"./mobile-runtime.html"'));
 assert.doesNotThrow(()=>new vm.Script(sw));
});
