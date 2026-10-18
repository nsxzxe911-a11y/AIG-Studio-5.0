'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..'),read=(folder,f)=>fs.readFileSync(path.join(root,folder,f),'utf8');
const catalog=()=>JSON.parse(read('formal-web','visual-library/manifest.json'));
const names=['image-library.html','visual-library.css','visual-library.js','visual-library/manifest.json','mobile-runtime.html','index.html','service-worker.js',
 'runtime/visual-reference-v1.js','runtime-visual-reference.css'];
test('Web source mirrors Render actual publication directory',()=>{
 for(const f of names)assert.equal(read('web',f),read('formal-web',f),f);
});
test('whole indexed source set has ten slots and no cross-page visual substitutes',()=>{
 const c=catalog();
 assert.equal(c.originals.length,10);
 assert.equal(c.originals.filter(p=>p.src).length,7);
 assert.equal(c.originals.filter(p=>!p.src).length,3);
 assert.equal(c.related.length,2);assert.equal(c.components.length,32);
 for(const page of ['HOME','CAD','CAM','SIM','3AX','4AX','5AX','6AX','NC','AI'])
  assert.equal(c.originals.filter(p=>p.id===page).length,1,page);
 for(const missing of ['6AX','NC','AI']){
  const page=c.originals.find(p=>p.id===missing);
  assert.equal(page.src,null);assert.equal(page.status,'LIBRARY_VERIFIED_NOT_HOSTED');
 }
 assert.equal(new Set(c.originals.filter(p=>p.src).map(p=>p.src)).size,7);
 assert.equal(new Set(c.components.map(c=>c.buttonId)).size,32);
});
test('every published archive image and icon has a nonempty original Git blob SHA and a real binary',()=>{
 const c=catalog();
 for(const p of [...c.originals,...c.related,...c.components].filter(p=>p.src)){
  assert.match(p.gitBlobSha,/^[a-f0-9]{40}$/);
  assert.ok(p.src.startsWith('./visual-library/'));
  const relative=p.src.slice(2);
  const bytes=fs.readFileSync(path.join(root,'formal-web',relative));
  assert.ok(bytes.length>800,relative);
  const signature=bytes.subarray(0,12);
  if(relative.endsWith('.png'))assert.equal(signature.subarray(0,4).toString('hex'),'89504e47');
  else assert.equal(signature.subarray(0,2).toString('hex'),'ffd8');
 }
});
test('image gallery has 41 actual thumbnails, missing cards and functional filtering',()=>{
 const html=read('formal-web','image-library.html');
 assert.equal((html.match(/<img\b/g)||[]).length,41);
 assert.equal((html.match(/data-visual-kind="pending"/g)||[]).length,3);
 for(const id of ['HOME','CAD','CAM','SIM','3AX','4AX','5AX','6AX','NC','AI'])
  assert.ok(html.includes('IMG-AIGII-ARCHIVE-'+id+'-V1'));
 for(const f of ['all','page','axis','component','missing'])
  assert.ok(html.includes('data-visual-filter="'+f+'"'));
 const js=read('formal-web','visual-library.js');
 assert.ok(js.includes('aria-pressed'));assert.ok(js.includes('visual-hidden'));
 assert.doesNotThrow(()=>new vm.Script(js));
});
test('gallery and per-module source reference never replace CAD canvas, callbacks or CNC simulation',()=>{
 const runtime=read('formal-web','mobile-runtime.html');
 const source=read('formal-web','runtime/visual-reference-v1.js');
 for(const marker of ['function makeCadRuntime(root)','function makeCamRuntime(root)','function makeNcRuntime(root)','data-cad-canvas','data-cam-canvas','data-glcanvas','function parseProgram('])
  assert.ok(runtime.includes(marker),marker);
 assert.ok(runtime.includes('runtime-visual-reference.css'));
 assert.ok(runtime.includes('visual-reference-v1.js'));
 assert.ok(runtime.includes('href="./image-library.html"'));
 assert.ok(source.includes('document.querySelectorAll(".screen[data-page]")'));
 assert.ok(source.includes('screen.appendChild(details)'));
 assert.doesNotMatch(source,/innerHTML|removeChild|canvas\.getContext|localStorage\.clear|data-cmd|dispatchView/);
 assert.doesNotThrow(()=>new vm.Script(source));
});
test('homepage visibly links full picture library and shows three real thumbnails',()=>{
 const home=read('formal-web','index.html');
 assert.match(home,/visual-home-preview/);assert.match(home,/RGB 原圖分類/);
 for(const file of ['home.png','cad.png','axis4.png'])assert.ok(home.includes('./visual-library/pages/'+file));
});
test('cache V16 preloads gallery UI but not multi-megabyte images on startup',()=>{
 const sw=read('formal-web','service-worker.js');
 assert.match(sw,/aig-ii-authority-registry-recovered-20261018-v17/);
 for(const f of ['image-library.html','visual-library.css','visual-library.js','visual-library/manifest.json','runtime/visual-reference-v1.js'])
  assert.ok(sw.includes('"./'+f+'"'),f);
 assert.doesNotMatch(sw,/"\.\/visual-library\/pages\//);
 assert.doesNotThrow(()=>new vm.Script(sw));
});

test('Registry V3 identifies all Mobile/Desktop main originals without treating Library bytes as website bytes',()=>{
 const c=catalog(),html=read('formal-web','image-library.html');
 assert.equal(Object.keys(c.authorityRegistry.mobile).length,10);
 assert.equal(Object.keys(c.authorityRegistry.desktop).length,10);
 for(const axis of ['6AX','NC','AI']){
  assert.match(c.authorityRegistry.mobile[axis].sha256,/^[a-f0-9]{64}$/);
  assert.match(c.authorityRegistry.desktop[axis].sha256,/^[a-f0-9]{64}$/);
  assert.equal(c.originals.find(x=>x.id===axis).status,'LIBRARY_VERIFIED_NOT_HOSTED');
 }
 assert.ok(html.includes('10 / 10 原圖在 Library'));
 assert.ok(html.includes('網站待同步'));
});
