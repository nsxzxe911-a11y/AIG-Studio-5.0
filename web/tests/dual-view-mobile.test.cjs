'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const PAGES=['HOME','CAD','CAM','SIM','3AX','4AX','5AX','6AX','NC','AI'];

test('public homepage is a normal content-first website, not a forced full-screen workbench',()=>{
 const html=read('index.html');
 assert.match(html,/<header class="site-container brand-row">/);
 assert.match(html,/aria-label="網站主導覽"/);
 assert.match(html,/class="page-grid"/);
 assert.match(html,/class="main-column"/);
 assert.match(html,/class="sidebar"/);
 assert.match(html,/產品功能分類/);
 assert.match(html,/使用指南/);
 assert.match(html,/id="site-search-input"/);
 assert.match(html,/href="\.\/site\.css"/);
 assert.match(html,/src="\.\/site\.js"/);
 assert.doesNotMatch(html,/location\.replace|<iframe|uiux\/assets|legacy-runtime\.html/);
 assert.doesNotMatch(html,/WEB RUNTIME|LAYOUT READY|UIAutomator|AUTHORITY LOCK/i);
});

test('all ten working pages have real direct links without fake backend destinations',()=>{
 const html=read('index.html');
 for(const page of PAGES)assert.ok(html.includes('./mobile-runtime.html#'+page),page);
 for(const target of ['#modules','#cadcam','#multiaxis','#ncai','#guide','#about'])
  assert.ok(html.includes('href="'+target+'"'),target);
 assert.doesNotMatch(html,/<form[^>]+action="https?:/);
});

test('normal site search, responsive mobile navigation and old page hashes have implementation',()=>{
 const js=read('site.js'),css=read('site.css');
 assert.doesNotThrow(()=>new vm.Script(js));
 assert.match(js,/querySelectorAll\("\[data-searchable\]"\)/);
 assert.match(js,/search-hidden/);
 assert.match(js,/setAttribute\("aria-expanded"/);
 assert.match(js,/legacyDeepLink/);
 assert.match(css,/@media\(max-width:760px\)/);
 assert.match(css,/\.page-grid\{grid-template-columns:1fr/);
 assert.doesNotMatch(css,/uiux\/assets|authority-image|legacy-runtime\.html/);
});

test('all operational CAD/CAM/SIM/NC/AI routes remain on the true separate workbench',()=>{
 const runtime=read('mobile-runtime.html');
 for(const page of PAGES)assert.ok(runtime.includes('["'+page+'","#'),page);
 for(const marker of ['data-home-runtime','data-cad-canvas','data-cam-canvas','data-glcanvas','data-nc-code','data-ai-page-runtime','productionPageRouter.navigateView'])
  assert.ok(runtime.includes(marker),marker);
 for(const marker of ['function makeHomeRuntime(root)','function makeCadRuntime(root)','function makeCamRuntime(root)','function makeNcRuntime(root)'])
  assert.ok(runtime.includes(marker),marker);
 assert.match(runtime,/data-layout-mode="auto"/);
 assert.match(runtime,/data-layout-mode="desktop"/);
 assert.match(runtime,/data-layout-mode="mobile"/);
 for(const s of [...runtime.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>x[1]).filter(Boolean))
  assert.doesNotThrow(()=>new vm.Script(s));
});

test('public portal uses approved AIG-II identity without claiming mock images are 4K Authority',()=>{
 const manifest=JSON.parse(read('authority/aigii-rgb-glass-style-20261018-v1.json'));
 assert.equal(manifest.styleId,'AIGII-RGB-GLASS-20261018-STYLE-V1');
 assert.equal(manifest.registeredReference.native4K,false);
 assert.equal(manifest.sourcePolicy.styleToPageAuthorityAutoPromotion,false);
 const html=read('index.html');
 assert.doesNotMatch(html,/4K PASS|原生 4K 已完成|APK 下載|FULL GATE PASS/);
 assert.match(html,/AIG-II/);
});

test('PWA caches both website and workbench, without loading the old engineering gallery',()=>{
 const sw=read('service-worker.js');
 assert.doesNotThrow(()=>new vm.Script(sw));
 assert.match(sw,/aig-ii-cam-sim-core-20261018-v14/);
 for(const entry of ['site.css','site.js','index.html','mobile-runtime.html','runtime/page-runtime-router.js'])
  assert.ok(sw.includes('"./'+entry+'"'),entry);
 assert.doesNotMatch(sw,/legacy-runtime\.html|\.\/app\.js|\.\/mobile-layout\.js/);
});

test('live website search controls filter rows and report true counts',()=>{
 const src=read('site.js');
 const handlers={},navHandlers={},menu={dataset:{},handlers:{},setAttribute(n,v){this[n]=v},addEventListener(n,f){this.handlers[n]=f}};
 const makeItem=(text,keys)=>({
  textContent:text,dataset:{searchable:keys},hidden:false,
  classList:{value:new Set(),toggle(key,on){if(on)this.value.add(key);else this.value.delete(key)},contains(key){return this.value.has(key)}}
 });
 const items=[makeItem('CAD 製圖','CAD 2D'),makeItem('CAM 刀路','CAM 工序'),makeItem('NC 編輯','Fanuc G-code')];
 const group={classList:{toggle(){}},querySelectorAll:()=>items};
 const input={value:'',focus(){this.focused=true},select(){this.selected=true},blur(){},addEventListener(n,f){this[n]=f}};
 const form={addEventListener(n,f){this[n]=f}};
 const msg={textContent:''},empty={dataset:{}};
 const nav={dataset:{expanded:'false'},querySelectorAll:()=>[{addEventListener(n,f){navHandlers[n]=f}}]};
 const ids={'site-menu-toggle':menu,'site-search-input':input,'site-search':form,'site-search-message':msg,'site-search-empty':empty,'modules':{scrollIntoView(){}}};
 const document={querySelector:k=>k==='.nav-inner'?nav:null,getElementById:id=>ids[id],querySelectorAll:k=>k==='[data-searchable]'?items:k==='[data-search-group]'?[group]:[],addEventListener(n,f){handlers[n]=f},activeElement:null};
 const window={addEventListener(n,f){handlers['window:'+n]=f}};
 const location={hash:'',href:'https://example.test/',replace(){throw Error('unexpected redirect')}};
 new Function('document','window','location','URL',src)(document,window,location,URL);
 input.value='CAD';input.input();
 assert.equal(items.filter(x=>!x.classList.contains('search-hidden')).length,1);
 assert.match(msg.textContent,/1 項符合/);
 input.value='no_such_function';input.input();
 assert.equal(empty.dataset.visible,'true');
 menu.handlers.click();assert.equal(nav.dataset.expanded,'true');
 assert.equal(menu['aria-expanded'],'true');
});
