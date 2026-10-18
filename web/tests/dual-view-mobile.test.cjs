'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const PAGES=['HOME','CAD','CAM','SIM','3AX','4AX','5AX','6AX','NC','AI'];

test('root opens the actual runtime instead of the legacy Authority engineering gallery',()=>{
 const html=read('index.html');
 assert.match(html,/location\.replace\(dest\.href\)/);
 assert.match(html,/\.\/mobile-runtime\.html/);
 assert.doesNotMatch(html,/uiux\/assets|legacy-runtime\.html|authority-image|<script src="app.js"/);
 assert.doesNotMatch(html,/WEB RUNTIME.*LAYOUT READY/i);
});

test('deep-link to each runtime page survives the root redirect',()=>{
 const html=read('index.html');
 const script=html.match(/<script>([\s\S]*?)<\/script>/);
 assert.ok(script,'root redirect JS exists');
 for(const page of PAGES){
  let redirected='',anchor={href:''};
  const loc={href:'https://example.test/#'+page,hash:'#'+page,replace(url){redirected=url}};
  const doc={getElementById(id){assert.equal(id,'enter-runtime');return anchor}};
  new Function('location','document','URL',script[1])(loc,doc,URL);
  assert.equal(redirected,'https://example.test/mobile-runtime.html#'+page);
  assert.equal(anchor.href,redirected);
 }
});

test('single true Web Runtime retains ten-page navigation and live callbacks',()=>{
 const runtime=read('mobile-runtime.html');
 for(const page of PAGES)assert.ok(runtime.includes('["'+page+'","#'),page);
 for(const binding of [
  'data-home-runtime','data-home-cad','data-home-cam','data-home-nc','data-home-network',
  'data-cad-canvas','data-cam-canvas','data-nc-code','data-glcanvas',
  'data-open-page','data-ai-page-runtime','productionPageRouter.navigateView'
 ])assert.ok(runtime.includes(binding),binding);
 assert.match(runtime,/function makeHomeRuntime\(root\)/);
 assert.match(runtime,/function makeCadRuntime\(root\)/);
 assert.match(runtime,/function makeCamRuntime\(root\)/);
 assert.match(runtime,/function makeNcRuntime\(root\)/);
 assert.match(runtime,/aigii-rgb-glass-runtime-20261018-v1\.css/);
 const scripts=[...runtime.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
   .map(x=>x[1]).filter(Boolean);
 for(const script of scripts)assert.doesNotThrow(()=>new vm.Script(script), 'inline script parses');
});

test('mobile and desktop select different responsive presentations from one real runtime',()=>{
 const runtime=read('mobile-runtime.html');
 const src=read('runtime/layout-mode.js');
 assert.match(runtime,/data-layout-mode="auto"/);
 assert.match(runtime,/data-layout-mode="desktop"/);
 assert.match(runtime,/data-layout-mode="mobile"/);
 assert.match(src,/max-width:\s*720px/);
 assert.match(src,/aigPresentation/);
 assert.doesNotMatch(src,/uiux\/assets|axis3\.jpg|axis5\.jpg/);
});

test('approved RGB Glass source is visual STYLE, not falsely claimed native 4K',()=>{
 const manifest=JSON.parse(read('authority/aigii-rgb-glass-style-20261018-v1.json'));
 const css=read('authority/aigii-rgb-glass-runtime-20261018-v1.css');
 assert.equal(manifest.styleId,'AIGII-RGB-GLASS-20261018-STYLE-V1');
 assert.equal(manifest.registeredReference.native4K,false);
 assert.equal(manifest.registeredReference.width,1672);
 assert.equal(manifest.registeredReference.height,941);
 assert.deepEqual(manifest.desktop.targetNative,[3840,2160]);
 assert.deepEqual(manifest.mobile.targetNative,[2160,3840]);
 assert.equal(manifest.sourcePolicy.styleToPageAuthorityAutoPromotion,false);
 assert.match(css,/--panel:\s*#07111b/i);
 assert.match(css,/\.aigFormalHome/);
 assert.match(css,/aigModuleCard/);
 assert.doesNotMatch(css,/uiux\/assets|legacy-runtime\.html|authority\/6ax-reference\.svg/);
});

test('service worker installs a new cache and can serve the true Runtime offline',()=>{
 const code=read('service-worker.js');
 assert.match(code,/aig-ii-rgb-glass-20261018-v5/);
 assert.match(code,/\.\/mobile-runtime\.html/);
 assert.match(code,/aigii-rgb-glass-runtime-20261018-v1\.css/);
 assert.match(code,/caches\.match\(isRuntime\?"\.\/mobile-runtime\.html":"\.\/index\.html"\)/);
 assert.doesNotMatch(code,/legacy-runtime\.html|\.\/app\.js|\.\/mobile-layout\.js/);
 assert.doesNotThrow(()=>new vm.Script(code));
});
