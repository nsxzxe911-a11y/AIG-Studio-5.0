import test from "node:test";import assert from "node:assert/strict";import {readFileSync} from "node:fs";
const read=n=>readFileSync(new URL("../"+n,import.meta.url),"utf8");
test("Both original phone runtimes receive V36 layout last",()=>{
 for(const p of ["mobile-runtime.html","studio-375.html"]){
  const s=read(p);assert.ok(s.indexOf("axis-machine-v35.css")<s.indexOf("mobile-layout-v36.css"));
  assert.ok(s.indexOf("axis-machine-v35.js")<s.indexOf("mobile-layout-v36.js"));
  assert.ok(s.includes("dual-web-v36.js"));assert.ok(s.includes("drawAxisMachineProfile({axis,cx,cy,stockBottom,stockH,spanX,spanY,tableR,R,vp})"));
 }});
test("Phone header is flex not implicit grid columns, nav horizontal and axis workbench one column",()=>{
 const s=read("mobile-layout-v36.css");
 for(const v of ["display:flex!important","flex-flow:row wrap!important","grid-template-areas:none!important","overflow-x:auto!important","flex-direction:column!important","[data-axis-subpage=\"NC_FIRST\"]"])assert.ok(s.includes(v),v);
 assert.ok(s.includes("max-width:800px"));
});
test("Mobile status details preserve live DOM and surface safety events",()=>{
 const s=read("mobile-layout-v36.js");
 for(const v of ["d.createElement(\"details\")","details.append(summary,el)","warning","details.open=true","restore()"])assert.ok(s.includes(v),v);
 for(const illegal of ["localStorage.setItem(","localStorage.removeItem(","MACHINE_CONNECT","NC_SEND","coreRuntime.dispatch("])assert.ok(!s.includes(illegal));
});
test("Web V36 aligned while native versions remain independent",()=>{
 const s=JSON.parse(read("dual-web-v36.json"));assert.equal(s.release,"36.0.0");
 assert.deepEqual(s.projects.map(x=>x.nativeVersion),["432.0.0","375.0.0"]);
 assert.ok(s.projects.every(x=>x.webVersion==="36.0.0"));
 const b=JSON.parse(read("dual-latest-binding.json"));assert.equal(b.sharedWebRelease.version,"36.0.0");
 assert.ok(read("service-worker.js").includes("mobile-fit-v36-20261018"));
});
