import test from "node:test";import assert from "node:assert/strict";import {readFileSync} from "node:fs";
const read=n=>readFileSync(new URL("../"+n,import.meta.url),"utf8");
test("Auto G-code highlighting never uses page-wide scrollIntoView in either real Web runtime",()=>{
 for(const p of ["mobile-runtime.html","studio-375.html"]){
  const s=read(p),a=s.indexOf("function renderExec(){"),b=s.indexOf("function focusSourceLine(",a),fn=s.slice(a,b);
  assert.ok(a>0&&b>a);assert.ok(fn.includes("box.scrollTop=prior"));
  assert.ok(fn.includes('scrollExecInside(box,box.querySelector(".active"))'));
  assert.ok(!fn.includes(".scrollIntoView("));
  assert.ok(s.includes("ta.focus({preventScroll:true})"));
  assert.ok(s.includes('src="./dual-web-v39.js"'));
  assert.ok(s.includes("getRemoval:()=>({...lastRemoval})"));
 }
});
test("Execution-list scroll stays within its own box and prevents scroll anchor jumps",()=>{
 const css=read("axis-playback-v39.css");
 assert.ok(css.includes(".execView[data-exec]"));assert.ok(css.includes("overflow-anchor:none"));
 assert.ok(css.includes("overscroll-behavior:contain"));
});
test("Same 39 Web version and exact original native SHA pins",()=>{
 const v=JSON.parse(read("dual-web-v39.json"));assert.equal(v.release,"39.0.0");
 assert.ok(v.projects.every(p=>p.webVersion==="39.0.0"));
 assert.deepEqual(v.projects.map(p=>p.nativeVersion),["432.0.0","375.0.0"]);
 const pins=JSON.parse(read("dual-latest-binding.json"));assert.equal(pins.sharedWebRelease.version,"39.0.0");
 assert.ok(read("service-worker.js").includes("stable-playback-v39"));
});
