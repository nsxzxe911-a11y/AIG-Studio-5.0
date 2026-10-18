'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const read=(dir,p)=>fs.readFileSync(path.join(root,dir,p),'utf8');
const pages=['index.html','guide.html','updates.html','faq.html'];
const codeFiles=['site-v21.css','site-v21.js','service-worker.js'];

test('source web and Render formal-web are byte-for-byte identical for 2.1 site assets',()=>{
 for(const file of [...pages,...codeFiles])assert.equal(read('web',file),read('formal-web',file),file);
});

test('AIG-II ordinary site has visible 2.1 features, 10 true links and zero debug shell text',()=>{
 const html=read('formal-web','index.html');
 for(const s of ['site-v21.css','site-v21.js','workflow-options','workflow-go','module-filter-status',
  'recent-pages-list','site-back-top','./faq.html','雙專案']){
  assert.ok(html.includes(s),'missing '+s);
 }
 for(const p of ['HOME','CAD','CAM','SIM','3AX','4AX','5AX','6AX','NC','AI']){
  assert.match(html,new RegExp('href="\\./mobile-runtime\\.html#'+p+'"'),p);
 }
 assert.equal((html.match(/data-module-filter="/g)||[]).length,4);
 assert.equal((html.match(/data-module-category="/g)||[]).length,3);
 assert.doesNotMatch(html,/WEB RUNTIME|LAYOUT READY|UIAutomator|<iframe/);
});

test('knowledge center, release record and real FAQ work with local relative paths',()=>{
 for(const p of pages){
  const content=read('formal-web',p);
  assert.match(content,/lang="zh-Hant"/);
  assert.match(content,/site-v21\.css/);
  assert.match(content,/site-v21\.js/);
  assert.match(content,/href="\.\/mobile-runtime\.html#HOME"/);
  for(const m of content.matchAll(/(?:href|src)="\.\/([^"#?]+)(?:#[^"]*)?"/g)){
   assert.ok(fs.existsSync(path.join(root,'formal-web',m[1])),p+': missing local '+m[1]);
  }
 }
 const faq=read('formal-web','faq.html');
 assert.ok((faq.match(/<details>/g)||[]).length>=7);
 assert.match(faq,/不會保存 G-code 內容/);
 assert.match(faq,/網站的 RGB 玻璃樣式/);
 assert.match(read('formal-web','updates.html'),/id="site-v21"/);
});

test('offline V8 caches all 2.1 pages without changing the CNC workbench',()=>{
 const sw=read('formal-web','service-worker.js');
 assert.match(sw,/aig-ii-axis-workstations-20261018-v11/);
 for(const item of ['index.html','guide.html','updates.html','faq.html','site-v21.css',
  'site-v21.js','mobile-runtime.html','runtime/page-runtime-router.js']){
  assert.ok(sw.includes('"./'+item+'"'),item);
 }
 assert.doesNotThrow(()=>new vm.Script(sw));
 assert.doesNotThrow(()=>new vm.Script(read('formal-web','site-v21.js')));
 const app=read('formal-web','mobile-runtime.html');
 assert.match(app,/data-nc-code/);
 assert.match(app,/data-cad-canvas/);
 assert.match(app,/data-cam-canvas/);
 assert.match(app,/data-glcanvas/);
});

test('workflow chooser, category filter and browser-only recent list are interactive',()=>{
 const listeners={};
 function classList(){
  const set=new Set();
  return {toggle(c,yes){if(yes)set.add(c);else set.delete(c)},
   contains(c){return set.has(c)}};
 }
 function el(dataset={}){
  return {dataset:{...dataset},textContent:'',href:'',hidden:false,
   attributes:{},classList:classList(),children:[],events:{},
   setAttribute(k,v){this.attributes[k]=v},
   addEventListener(k,cb){this.events[k]=cb},
   querySelectorAll(){return []},appendChild(ch){this.children.push(ch)},
   append(...chs){this.children.push(...chs)},replaceChildren(...chs){this.children=chs}};
 }
 const chips=['ALL','DESIGN','AXIS','CODE'].map(v=>el({moduleFilter:v}));
 const choices=['CAD','NC','SIM'].map(v=>el({workflowChoice:v}));
 const groupSpecs=[['DESIGN',3],['AXIS',4],['CODE',2]];
 const groups=groupSpecs.map(([category,len])=>{
  const g=el({moduleCategory:category});
  const children=Array.from({length:len},()=>el({searchable:'test'}));
  g.querySelectorAll=selector=>selector==='[data-searchable]'?children:[];
  return g;
 });
 const ids={
  'site-search-input':el(), 'site-search':el(),
  'module-filter-status':el(), 'workflow-name':el(), 'workflow-description':el(),
  'workflow-go':el(), 'recent-pages-list':el(),'recent-pages-empty':el(),'site-back-top':el()
 };
 const doc={querySelectorAll(q){
  if(q==='[data-module-filter]')return chips;
  if(q==='[data-search-group][data-module-category]')return groups;
  if(q==='[data-workflow-choice]')return choices;
  return [];
 },getElementById:id=>ids[id]||null,createElement:()=>el(),addEventListener(k,cb){listeners[k]=cb}};
 const store={};
 const storage={getItem(k){return store[k]||null},setItem(k,v){store[k]=v}};
 const win={scrollY:0,addEventListener(k,cb){listeners['window:'+k]=cb},
  scrollTo(opts){this.lastScroll=opts},matchMedia(){return {matches:false}}};
 const js=read('formal-web','site-v21.js');
 new Function('document','window','localStorage',js)(doc,win,storage);
 assert.match(ids['module-filter-status'].textContent,/9 個/);
 chips[2].events.click();
 assert.match(ids['module-filter-status'].textContent,/4 個/);
 assert.equal(groups[0].classList.contains('category-hidden'),true);
 assert.equal(chips[2].attributes['aria-pressed'],'true');
 choices[1].events.click();
 assert.equal(ids['workflow-go'].href,'./mobile-runtime.html#NC');
 assert.equal(choices[1].attributes['aria-pressed'],'true');
 const target={closest(){return {getAttribute(){return './mobile-runtime.html#NC'}}}};
 listeners.click({target});
 assert.deepEqual(JSON.parse(store['aigii.site.recent-pages.v1']),['NC']);
 assert.equal(ids['recent-pages-empty'].hidden,true);
 assert.equal(ids['recent-pages-list'].children.length,1);
 win.scrollY=600;listeners['window:scroll']();
 assert.equal(ids['site-back-top'].hidden,false);
 ids['site-back-top'].events.click();
 assert.equal(win.lastScroll.top,0);
});
