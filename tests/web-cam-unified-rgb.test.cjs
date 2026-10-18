'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname,'..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const routerSource=read('web/runtime/page-runtime-router.js');

function boot(mode){
  const nav={dataset:{},style:{},children:[],appendChild(node){this.children.push(node);return node;}};
  const screens={dataset:{},style:{},children:[],appendChild(node){this.children.push(node);return node;}};
  const document={
    documentElement:{dataset:{aigProject:mode},classList:{add(){}}},
    readyState:'loading',
    head:{appendChild(){}},
    addEventListener(){},
    getElementById(id){return id==='nav'?nav:id==='screens'?screens:null;},
    querySelector(){return null;},
    createElement(){return{dataset:{},style:{},appendChild(){},setAttribute(){}};}
  };
  const window={};
  vm.runInNewContext(routerSource,{window,document},{filename:'page-runtime-router.js'});
  return {window,nav,screens};
}

test('AIG-II exposes all ten real main pages, including every axis',()=>{
  const {window,nav,screens}=boot('AIGII');
  assert.deepEqual(Array.from(window.AIG_ACTIVE_PAGE_IDS),['HOME','CAD','CAM','SIM','3AX','4AX','5AX','6AX','NC','AI']);
  for(const page of ['3AX','4AX','5AX','6AX']){
    nav.appendChild({tagName:'BUTTON',dataset:{page},style:{}});
    screens.appendChild({tagName:'SECTION',dataset:{page},querySelectorAll(){return[]},querySelector(){return null}});
  }
  assert.deepEqual(nav.children.map(n=>n.dataset.page),['3AX','4AX','5AX','6AX']);
  assert.deepEqual(screens.children.map(n=>n.dataset.page),['3AX','4AX','5AX','6AX']);
  assert.equal(nav.style.gridTemplateColumns,'repeat(10,minmax(72px,1fr))');
  assert.equal(window.AigPageRuntimeRouter.inventory().length,122);
});

test('AIG first project still excludes only 4AX/5AX/6AX',()=>{
  const {window,nav,screens}=boot('AIG');
  assert.deepEqual(Array.from(window.AIG_ACTIVE_PAGE_IDS),['HOME','CAD','CAM','SIM','3AX','NC','AI']);
  for(const page of ['3AX','4AX','5AX','6AX']){
    nav.appendChild({tagName:'BUTTON',dataset:{page},style:{}});
    screens.appendChild({tagName:'SECTION',dataset:{page},querySelectorAll(){return[]},querySelector(){return null}});
  }
  assert.deepEqual(nav.children.map(n=>n.dataset.page),['3AX']);
  assert.deepEqual(screens.children.map(n=>n.dataset.page),['3AX']);
  assert.equal(nav.style.gridTemplateColumns,'repeat(7,minmax(72px,1fr))');
});

test('CAM visual skin is reference style, not an image overlay',()=>{
  const html=read('web/index.html');
  const css=read('web/authority/cam-unified-rgb-v1.css');
  const serviceWorker=read('web/service-worker.js');
  assert.match(html,/<html lang="zh-Hant" data-aig-project="AIGII">/);
  assert.match(html,/href="\.\/authority\/cam-unified-rgb-v1\.css"/);
  assert.match(css,/html\.aigCamUnified \.simgrid/);
  assert.match(css,/background:linear-gradient/);
  assert.doesNotMatch(css,/url\s*\(/i);
  assert.match(serviceWorker,/cam-unified-rgb-v1\.css/);
  assert.match(html,/data-glcanvas/);
  assert.match(html,/data-cam-runtime/);
});
