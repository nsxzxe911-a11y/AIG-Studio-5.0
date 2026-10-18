import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=name=>readFileSync(new URL("../"+name,import.meta.url),"utf8");
test("automatic CNC G-code execution only updates existing row classes",()=>{
 for(const name of ["mobile-runtime.html","studio-375.html"]){
  const src=read(name),begin=src.indexOf("function renderExec(){"),end=src.indexOf("function focusSourceLine(",begin);
  assert.ok(begin>0&&end>begin);
  const seg=src.slice(begin,end);
  assert.ok(seg.includes("execRenderedSource!==state.parsed"));
  assert.ok(seg.includes("box.replaceChildren(frag)"));
  assert.ok(seg.includes('el.classList.toggle("active"'));
  assert.ok(!seg.includes("scrollExecInside("));
  assert.ok(!seg.includes(".scrollIntoView("));
  assert.ok(src.includes("drawAxisMachineProfile("));
  assert.ok(src.includes("getRemoval:()=>({...lastRemoval})"));
 }
});
test("G-code playback CSS prevents browser auto anchoring but permits user scroll",()=>{
 const css=read("axis-playback-v40.css");
 assert.ok(css.includes("html:has(.screen.active .simgrid[data-runtime])"));
 assert.ok(css.includes("overflow-anchor:none!important"));
 assert.ok(!css.includes("overflow:hidden!important"));
});
test("common Web V40 and original native pins preserved",()=>{
 const release=JSON.parse(read("dual-web-v40.json"));
 assert.equal(release.release,"40.0.0");assert.ok(release.projects.every(p=>p.webVersion==="40.0.0"));
 assert.deepEqual(release.projects.map(p=>p.nativeVersion),["432.0.0","375.0.0"]);
 const binding=JSON.parse(read("dual-latest-binding.json"));
 assert.equal(binding.sharedWebRelease.version,"40.0.0");
 assert.ok(read("service-worker.js").includes("playback-stay-v40"));
});
