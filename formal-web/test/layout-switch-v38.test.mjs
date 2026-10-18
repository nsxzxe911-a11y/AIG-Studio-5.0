import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=n=>readFileSync(new URL("../"+n,import.meta.url),"utf8");
test("One genuine top-right mobile switch on both original Render runtimes",()=>{
 for(const p of ["mobile-runtime.html","studio-375.html"]){
  const html=read(p);
  for(const mode of ["auto","desktop","mobile"])assert.ok(html.includes('data-layout-mode="'+mode+'"'));
  assert.equal((html.match(/id="aig-layout-switch"/g)||[]).length,1);
  assert.ok(html.includes('src="./runtime/layout-mode.js"'));
  assert.ok(html.includes('src="./layout-switch-v38.js"'));
  assert.ok(html.includes('href="./layout-switch-v38.css"'));
  assert.ok(html.includes("drawAxisMachineProfile("));
 }
});
test("Manual mobile selection synchronously notifies the V37 real CNC layout",()=>{
 const layout=read("runtime/layout-mode.js");
 const compact=read("mobile-layout-v37.js");
 assert.ok(layout.includes("global.AIG_MOBILE_LAYOUT_V37.refresh()"));
 assert.ok(layout.includes("(max-width: 900px)"));
 assert.ok(compact.includes('selected==="mobile"?true:selected==="desktop"?false'));
 const wrapper=read("layout-switch-v38.js");
 assert.ok(wrapper.includes('w.AIG_MOBILE_LAYOUT_V37?.refresh?.()'));
});
test("V38 respects desktop preview, uses active mobile workbench and leaves live CNC intact",()=>{
 const css=read("layout-switch-v38.css");
 assert.ok(css.includes('html[data-aig-presentation="mobile"] .app'));
 assert.ok(css.includes("max-width:min(100%,480px)!important"));
 const bridge=read("layout-switch-v38.js");
 for(const forbidden of ["NC_SEND","MACHINE_CONNECT","localStorage.setItem(","localStorage.removeItem(","dispatchUiCommand("])assert.ok(!bridge.includes(forbidden));
});
test("Both web versions aligned and exact native repository pins preserved",()=>{
 const web=JSON.parse(read("dual-web-v38.json"));
 assert.equal(web.release,"38.0.0");assert.ok(web.projects.every(p=>p.webVersion==="38.0.0"));
 assert.deepEqual(web.projects.map(p=>p.nativeVersion),["432.0.0","375.0.0"]);
 const binding=JSON.parse(read("dual-latest-binding.json"));assert.equal(binding.sharedWebRelease.version,"38.0.0");
 assert.ok(read("service-worker.js").includes("layout-switch-v38-20261019"));
});
