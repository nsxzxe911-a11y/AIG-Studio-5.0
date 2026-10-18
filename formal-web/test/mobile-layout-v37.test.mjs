import test from "node:test";import assert from "node:assert/strict";import {readFileSync} from "node:fs";
const read=n=>readFileSync(new URL("../"+n,import.meta.url),"utf8");
test("Both real Render CNC workspaces load V37 container-width layout, replacing old V36 JS",()=>{
 for(const name of ["mobile-runtime.html","studio-375.html"]){
  const s=read(name);assert.ok(s.includes('src="./mobile-layout-v37.js"'));assert.ok(!s.includes('src="./mobile-layout-v36.js"'));
  assert.ok(s.includes('href="./mobile-layout-v37.css"'));
  assert.ok(s.includes("getRemoval:()=>({...lastRemoval})"));
  assert.ok(s.includes("drawAxisMachineProfile({axis,cx,cy,stockBottom,stockH,spanX,spanY,tableR,R,vp})"));
 }
});
test("Measured compact mode works on wide browser with 440px mobile app frame",()=>{
 const s=read("mobile-layout-v37.js");
 for(const x of ["app?.getBoundingClientRect().width","root?.getBoundingClientRect().width","dataset.aigPresentation","frame<=900","html.dataset.aigV37Compact"])assert.ok(s.includes(x),x);
 assert.ok(!s.includes('matchMedia("(max-width:800px)")'));
});
test("Real workbench is flex column with full-width machining and editable NC code",()=>{
 const s=read("mobile-layout-v37.css");
 for(const x of ['html[data-aig-v37-compact="true"] .simgrid.axisModule',
  "flex-flow:column nowrap!important","overflow-x:auto!important","width:100%!important",
  "simgrid>.simleft","simgrid>.editor","textarea.code","v30-hud"])assert.ok(s.includes(x),x);
});
test("No live CNC state or stored working file overwritten by responsive enhancement",()=>{
 const s=read("mobile-layout-v37.js");
 for(const x of ["localStorage.setItem(","localStorage.removeItem(","coreRuntime.dispatch(","NC_SEND","MACHINE_CONNECT"])assert.ok(!s.includes(x),x);
 assert.ok(s.includes('d.createElement("details")'));assert.ok(s.includes("details.open=true"));
});
test("Shared Web version and precache align V37 while native exact SHA stays stable",()=>{
 const s=JSON.parse(read("dual-web-v37.json")),bind=JSON.parse(read("dual-latest-binding.json"));
 assert.equal(s.release,"37.0.0");assert.ok(s.projects.every(p=>p.webVersion==="37.0.0"));
 assert.deepEqual(s.projects.map(p=>p.nativeVersion),["432.0.0","375.0.0"]);
 assert.equal(bind.sharedWebRelease.version,"37.0.0");
 assert.ok(read("service-worker.js").includes("container-fit-v37-20261019"));
});
