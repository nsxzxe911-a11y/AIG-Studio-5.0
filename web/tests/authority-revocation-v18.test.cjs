'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const read=(area,f)=>fs.readFileSync(path.join(root,area,f),'utf8');
test('438 revocation notice mirrored and exactly 20 PNGs disallowed',()=>{
 for(const f of ['visual-library/authority-revocations-438.json','visual-library/manifest.json','image-library.html','service-worker.js'])
  assert.equal(read('web',f),read('formal-web',f),f);
 const r=JSON.parse(read('formal-web','visual-library/authority-revocations-438.json'));
 assert.equal(r.count,20);assert.equal(r.sources.length,20);
 assert.equal(new Set(r.sources).size,20);
 assert.equal(r.sources.filter(x=>x.includes('Mobile_HighRes/')).length,10);
 assert.equal(r.sources.filter(x=>x.includes('Desktop_4K/')).length,10);
 assert.equal(r.policy.authorityLookup,'BLOCK');
 assert.equal(r.policy.automaticFallback,false);
});
test('website registry no longer promotes 438 desktop; neither platform may select a web Authority automatically',()=>{
 const m=JSON.parse(read('formal-web','visual-library/manifest.json'));
 assert.equal(m.authorityRevocations438.status,'REVOKED_BY_USER');
 assert.match(m.authorityRegistry.id,/V4.*REVOKED/);
 for(const p of ['HOME','CAD','CAM','SIM','3AX','4AX','5AX','6AX','NC','AI']){
  assert.equal(m.authorityRegistry.desktop[p].runtimeSelectable,false,p+' desktop');
  assert.equal(m.authorityRegistry.mobile[p].runtimeSelectable,false,p+' mobile');
  assert.equal(m.authorityRegistry.desktop[p].identityStatus,'REVOKED_BY_USER_438');
 }
 const html=read('formal-web','image-library.html');
 assert.ok(html.includes('438 原圖已撤銷 Authority'));
 assert.ok(!html.includes('Registry V3 · 逐頁 exact SHA'));
 assert.ok(html.includes('authority-revocations-438.json'));
 const sw=read('formal-web','service-worker.js');
 assert.ok(sw.includes('aig-ii-authority-revocation-20261018-v18'));
});
