import test from "node:test";import assert from "node:assert/strict";import {readFileSync} from "node:fs";
const read=n=>readFileSync(new URL("../"+n,import.meta.url),"utf8");
test("both original real workspaces use same V41 controls and preserve V40 no auto scroll",()=>{
 for(const page of ["mobile-runtime.html","studio-375.html"]){
  const s=read(page);
  assert.ok(s.includes('src="./axis-workspace-v41.js"'));
  assert.ok(s.includes('href="./axis-workspace-v41.css"'));
  assert.ok(s.includes('src="./dual-web-v41.js"'));
  const a=s.indexOf("function renderExec(){"),b=s.indexOf("function focusSourceLine(",a);
  assert.ok(a>=0&&b>a);
  assert.ok(!s.slice(a,b).includes("scrollIntoView("));
  assert.ok(s.slice(a,b).includes('el.classList.toggle("active"'));
  assert.ok(s.includes("drawAxisMachineProfile("));
  assert.ok(s.includes("getRemoval:()=>({...lastRemoval})"));
 }
});
test("V41 workspace buttons have real dataset and aria-pressed callback",()=>{
 const js=read("axis-workspace-v41.js");
 for(const s of ['["machine","機台優先"]','["balanced","均衡"]','["code","程式優先"]',"button.addEventListener(\"click\",()=>setView(root,key))","root.dataset.aig41View=layout","button.setAttribute(\"aria-pressed\",String(selected))"])assert.ok(js.includes(s),s);
 for(const denied of ["scrollIntoView(","scrollTo(","localStorage.setItem(","MACHINE_CONNECT","NC_SEND","coreRuntime.dispatch("])assert.ok(!js.includes(denied),denied);
});
test("desktop and mobile CNC work areas keep separate honest layouts",()=>{
 const css=read("axis-workspace-v41.css");
 assert.ok(css.includes('data-aig41-view="machine"'));
 assert.ok(css.includes('data-aig41-view="balanced"'));
 assert.ok(css.includes('data-aig41-view="code"'));
 assert.ok(css.includes('html[data-aig-v37-compact="true"]'));
 assert.ok(css.includes("grid-template-columns:minmax(0,3fr) minmax(310px,1fr)"));
 assert.ok(css.includes("flex-direction:column!important"));
});
test("shared Web41 version while native exact SHA pins unchanged",()=>{
 const m=JSON.parse(read("dual-web-v41.json")),p=JSON.parse(read("dual-latest-binding.json"));
 assert.equal(m.release,"41.0.0");assert.ok(m.projects.every(x=>x.webVersion==="41.0.0"));
 assert.deepEqual(m.projects.map(x=>x.nativeVersion),["432.0.0","375.0.0"]);
 assert.equal(p.sharedWebRelease.version,"41.0.0");
 assert.ok(read("service-worker.js").includes("workspace-v41-20261019"));
});
