import test from "node:test";import assert from "node:assert/strict";import {readFileSync} from "node:fs";
const read=n=>readFileSync(new URL("../"+n,import.meta.url),"utf8");
test("ten module-specific functionality contracts and real axes",()=>{
 const s=JSON.parse(read("ai-page-contract-v43.json"));
 assert.equal(s.release,"43.0.0");assert.deepEqual(s.order,["HOME","CAD","CAM","SIM","3AX","4AX","5AX","6AX","NC","AI"]);
 for(const k of s.order)assert.ok(s.pages[k].buttons.length>=4);
 assert.deepEqual(s.pages["6AX"].axes,["X","Y","Z","A","B","C"]);
});
test("generated actions forward only to real current-page controls",()=>{
 const js=read("ai-page-v43.js");for(const x of ["old.click()","btn.disabled=!real","dataset.aig43ButtonId","dataset.aig43CommandId"])assert.ok(js.includes(x));
 for(const x of ["MACHINE_CONNECT","NC_SEND","localStorage.setItem(","localStorage.removeItem("])assert.ok(!js.includes(x));
});
test("double runtime platform split with V40 cutting behavior intact",()=>{
 for(const p of ["mobile-runtime.html","studio-375.html"]){
  const s=read(p);
  for(const name of ["ai-page-v43.js","ai-page-mobile-v43.css","ai-page-desktop-v43.css","dual-web-v43.js"])assert.ok(s.includes(name));
  assert.ok(s.includes("getRemoval:()=>({...lastRemoval})")&&s.includes("drawAxisMachineProfile("));
  const a=s.indexOf("function renderExec(){"),b=s.indexOf("function focusSourceLine(",a);
  assert.ok(!s.slice(a,b).includes("scrollIntoView("));
 }
});
test("release, native pins and offline assets",()=>{
 const web=JSON.parse(read("dual-web-v43.json")),bind=JSON.parse(read("dual-latest-binding.json"));
 assert.equal(web.release,"43.0.0");assert.ok(web.projects.every(p=>p.webVersion==="43.0.0"));
 assert.deepEqual(web.projects.map(p=>p.nativeVersion),["432.0.0","375.0.0"]);
 assert.equal(bind.sharedWebRelease.version,"43.0.0");
 assert.ok(read("service-worker.js").includes("ai-pages-v43-20261019"));
});
