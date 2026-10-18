'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const ORDER=['HOME','CAD','CAM','SIM','3AX','4AX','5AX','6AX','NC','AI'];
const PAGES=Object.fromEntries(ORDER.map(page=>[page,{sub:page,features:['Verified source state']}]));

test('formal site includes desktop/mobile controls and ten-page mobile runtime',()=>{
 const html=read('index.html');
 const mobile=read('mobile-runtime.html');
 const worker=read('service-worker.js');
 assert.match(html,/data-aig-view="desktop"/);
 assert.match(html,/data-aig-view="mobile"/);
 assert.match(html,/id="mobile-open-full"/);
 assert.match(html,/src="mobile-layout.js"/);
 assert.match(mobile,/data-glcanvas/);
 for(const page of ORDER)assert.ok(mobile.includes('["'+page+'","#'),page);
 for(const required of ['mobile-runtime.html','mobile-layout.js','mobile-layout.css','runtime/page-runtime-router.js','authority/cam-unified-rgb-v1.css'])
  assert.ok(worker.includes('./'+required),required);
});
test('mobile mode never substitutes a desktop image for Mobile Authority',()=>{
 const css=read('mobile-layout.css'),js=read('mobile-layout.js');
 assert.match(css,/\.authority-stage img\{display:none!important\}/);
 assert.match(js,/MOBILE_4K_AUTHORITY_PENDING/);
 assert.match(js,/mobile-runtime\.html/);
 assert.doesNotMatch(js,/frame\.src=['"]\.\/legacy-runtime/);
 assert.doesNotMatch(css,/url\s*\(/);
});
test('all ten phone navigation routes share the same real runtime',()=>{
 const source=read('mobile-layout.js');
 const nodes={};
 function node(){
  return {dataset:{},children:[],attributes:{},classList:{add(){}},
    setAttribute(key,value){this.attributes[key]=value},addEventListener(type,cb){this.onAction=cb},
    appendChild(child){this.children.push(child)},append(...c){this.children.push(...c)},
    replaceChildren(...c){this.children=c},querySelector(q){return q==='.mobile-quicknav'?this.children.find(c=>c.className==='mobile-quicknav')||null:null}};
 }
 ['mobile-viewport','mobile-page-display','mobile-page-features','authority-image','mobile-page-label','mobile-page-caption','authority-state','authority-class','authority-source','authority-sha','visual-status','ev-authority','mobile-open-full'].forEach(id=>nodes[id]=node());
 const controls=['auto','desktop','mobile'].map(mode=>Object.assign(node(),{dataset:{aigView:mode}}));
 const listeners={};
 let hash='#HOME',width=1400;
 const document={documentElement:{dataset:{}},getElementById:id=>nodes[id],querySelectorAll:q=>q==='[data-aig-view]'?controls:[],createElement:tag=>Object.assign(node(),{tagName:tag.toUpperCase()})};
 const window={innerWidth:width,location:{get hash(){return hash},set hash(v){hash=v}},matchMedia:()=>({matches:width<=760}),localStorage:{getItem(){return null},setItem(){}},addEventListener(type,fn){listeners[type]=fn}};
 const renderPage=page=>{hash='#'+page};
 new Function('window','document','PAGES','ORDER','renderPage',source)(window,document,PAGES,ORDER,renderPage);
 controls[2].onAction();
 assert.equal(document.documentElement.dataset.aigPresentation,'mobile');
 for(const page of ORDER){
  hash='#'+page;listeners.hashchange();
  assert.equal(nodes['mobile-page-display'].children[1].src,'./mobile-runtime.html#'+page);
  assert.equal(nodes['mobile-open-full'].href,'./mobile-runtime.html#'+page);
 }
 controls[1].onAction();
 assert.equal(document.documentElement.dataset.aigPresentation,'desktop');
 assert.equal(nodes['mobile-viewport'].hidden,true);
});
