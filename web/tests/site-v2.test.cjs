'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const read=(area,name)=>fs.readFileSync(path.join(root,area,name),'utf8');
const active=['index.html','site.js','site.css','site-v2.css','guide.html','updates.html','service-worker.js'];
const axes=['HOME','CAD','CAM','SIM','3AX','4AX','5AX','6AX','NC','AI'];

test('website source and live Render formal-web mirror are identical',()=>{
 for(const f of active){
   assert.equal(read('web',f),read('formal-web',f),'mirror mismatch: '+f);
 }
});

test('homepage is an editorial website and does not open an engineering shell',()=>{
 const h=read('formal-web','index.html');
 for(const token of ['<header class="site-container brand-row">','site-container notice-ribbon','class="quick-path"',
  'class="guide-teasers"','class="sidebar"','技術知識庫','網站更新','site-v2.css']){
  assert.ok(h.includes(token),'missing: '+token);
 }
 assert.doesNotMatch(h,/location\.replace\(|<iframe|WEB RUNTIME|LAYOUT READY|uiux\/assets/);
 for(const page of axes)assert.match(h,new RegExp('href="\\./mobile-runtime\\.html#'+page+'"'),'missing page '+page);
});

test('all public pages link to real local paths and have mobile menu controls',()=>{
 const files=['index.html','guide.html','updates.html'];
 for(const f of files){
  const h=read('formal-web',f);
  assert.match(h,/lang="zh-Hant"/);
  assert.match(h,/<nav class="primary-nav"/);
  assert.match(h,/id="site-navigation"/);
  assert.match(h,/id="site-menu-toggle"/);
  assert.match(h,/href="\.\/mobile-runtime\.html#HOME"/);
  assert.doesNotMatch(h,/<iframe|WEB RUNTIME|LAYOUT READY/);
  for(const m of h.matchAll(/(?:href|src)="\.\/([^"#?]+)(?:#[^"]*)?"/g)){
   const rel=m[1];
   assert.ok(fs.existsSync(path.join(root,'formal-web',rel)),f+': unresolved '+rel);
  }
 }
});

test('knowledge base actually describes CAD, NC-first, SIM checks and multi-axis',()=>{
 const g=read('formal-web','guide.html');
 for(const id of ['cad-cam','nc-first','sim-check','axis-guide']){
   assert.match(g,new RegExp('id="'+id+'"'));
 }
 assert.match(g,/不能取代機台說明書/);
 assert.match(g,/原點|座標/);
});
test('changelog cites verifiable previous deployment and warns about independent CNC Gate',()=>{
 const g=read('formal-web','updates.html');
 assert.match(g,/b7f617d0feb045d15600b2120e3b265b0167c69a/);
 assert.match(g,/網站部署成功代表網頁更新已發布/);
 assert.match(g,/AIG-II\/releases/);
});
test('Site 2.0 is fully cached and JavaScript has valid parse trees',()=>{
 const worker=read('formal-web','service-worker.js');
 assert.match(worker,/aig-ii-visual-library-20261018-v16/);
 for(const p of ['index.html','guide.html','updates.html','site-v2.css','mobile-runtime.html']){
  assert.ok(worker.includes('"./'+p+'"'),'not cached: '+p);
 }
 const site=read('formal-web','site.js');
 assert.match(site,/register\("\.\/service-worker\.js"\)/);
 assert.doesNotThrow(()=>new vm.Script(site));
 assert.doesNotThrow(()=>new vm.Script(worker));
});
