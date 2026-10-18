import test from "node:test";import assert from "node:assert/strict";import {readFileSync} from "node:fs";
const read=n=>readFileSync(new URL("../"+n,import.meta.url),"utf8");
test("both live CNC projects load two separate platform skins without replacing runtime",()=>{
 for(const page of ["mobile-runtime.html","studio-375.html"]){
  const src=read(page);
  for(const path of ["skin-mobile-v42.css","skin-desktop-v42.css","skin-platform-v42.js","dual-web-v42.js"])assert.ok(src.includes(path),page+":"+path);
  assert.ok(src.includes("drawAxisMachineProfile("));assert.ok(src.includes("getRemoval:()=>({...lastRemoval})"));
  const a=src.indexOf("function renderExec(){"),b=src.indexOf("function focusSourceLine(",a);
  assert.ok(a>0&&b>a&&!src.slice(a,b).includes("scrollIntoView("));
 }
});
test("mobile and desktop are separate CSS resources with distinct viewport sizing",()=>{
 const a=read("skin-mobile-v42.css"),b=read("skin-desktop-v42.css");
 assert.ok(a.includes('data-aig-skin-platform="mobile"'));assert.ok(!a.includes('data-aig-skin-platform="desktop"'));
 assert.ok(b.includes('data-aig-skin-platform="desktop"'));assert.ok(!b.includes('data-aig-skin-platform="mobile"'));
 assert.ok(a.includes("height:clamp(270px,37svh,365px)!important"));
 assert.ok(b.includes("height:clamp(330px,49svh,480px)!important"));
});
test("real layout controls activate skin, no CNC data fake",()=>{
 const src=read("skin-platform-v42.js");
 for(const x of ["aigSkinPlatform","aigLayoutMode","aigPresentation","MutationObserver"])assert.ok(src.includes(x));
 for(const x of ["localStorage.setItem(","coreRuntime.dispatch(","NC_SEND","MACHINE_CONNECT","canvas.replaceWith"])assert.ok(!src.includes(x));
});
test("Web V42 synchronizes versions but explicitly blocks uninspected archive assets",()=>{
 const m=JSON.parse(read("dual-web-v42.json"));
 assert.equal(m.release,"42.0.0");assert.ok(m.projects.every(p=>p.webVersion==="42.0.0"));
 assert.deepEqual(m.projects.map(p=>p.nativeVersion),["432.0.0","375.0.0"]);
 assert.equal(m.platformSkins.sourceArchive.verifiedExtractedAssets,0);
 assert.equal(m.gate.imageReplacement,"PENDING_UNPACKED_ASSETS");
 assert.ok(read("service-worker.js").includes("dual-skins-v42-20261019"));
});
