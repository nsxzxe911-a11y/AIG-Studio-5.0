'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const read=(area,file)=>fs.readFileSync(path.join(root,area,file),'utf8');
test('original Render site portal is mirrored, editor is unchanged, and live CNC entry is separate',()=>{
  const h=read('formal-web','index.html'),w=read('web','index.html');
  assert.equal(h,w,'deployed and source site must match');
  assert.equal(read('web','site-frontpage-v3.css'),read('formal-web','site-frontpage-v3.css'));
  for(const expected of ['id="dual-projects"','AIG-II / MAIN INTEGRATION','AIG CNC / AIG STUDIO 5.0',
    'id="site-navigation"','aig-editorial-front','site-frontpage-v3.css','./updates.html','./image-library.html',
    './mobile-runtime.html#HOME','./mobile-runtime.html#NC'])assert.ok(h.includes(expected),expected);
  assert.ok(!h.includes('正式 Authority 已找回'),'revoked asset cannot be claimed approved');
  assert.ok(!h.includes('從既有圖庫貼上 9 張整頁參考與 32 個元件'),'stale asset count removed');
  assert.ok(!h.includes('<iframe'),'no engineering shell embedding');
  assert.ok(!h.includes('data-cad-runtime'),'workstation must not replace public portal');
});
test('portal skin only adds editorial CSS and no fake button or in-page machine UI',()=>{
  const css=read('formal-web','site-frontpage-v3.css');
  assert.match(css,/\.aig-editorial-front/);
  assert.match(css,/@media\(max-width:490px\)/);
  assert.doesNotMatch(css,/url\(.*(?:png|jpg|webp)/);
});
