import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const rd=(p)=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("V32 exists on the two original runtime pages without replacing earlier modules",()=>{
 for(const p of ["mobile-runtime.html","studio-375.html"]){
  const s=rd(p);
  assert.ok(s.includes("./axis-performance-v32.js"));assert.ok(s.includes("./axis-performance-v32.css"));
  assert.ok(s.indexOf("axis-evidence-v31.js")<s.indexOf("axis-performance-v32.js"));
  assert.ok(s.includes("getPerformance:v32ReadPerformance,setAutoScale:v32SetAuto"));
  assert.ok(s.includes("return{render:v32Render"));
  assert.ok(s.includes('if(!root.closest(".screen")?.classList.contains("active"))return;'));
  assert.ok(s.includes("const cost=Math.max(0,end-start)"));
  assert.ok(s.includes("v32Perf.scale"));
  assert.ok(s.includes("getRemoval:()=>({...lastRemoval})"));
 }
});
test("V32 autofocus is framebuffer-only and geometry quality is preserved",()=>{
 const s=rd("mobile-runtime.html");
 assert.ok(s.includes("const FIDELITY=Object.freeze"));
 assert.ok(s.includes("const removalCache="));assert.ok(s.includes("const voxelCache="));
 assert.ok(s.includes("setQuality(next)"));
 assert.ok(s.includes("const dpr=Math.max(.5,Math.min(devicePixelRatio||1,cfg.dpr,Math.sqrt(cfg.pixels/cssArea))*v32Perf.scale)"));
});
test("V32 performance UI consumes real engine state without separate fake command results",()=>{
 const s=rd("axis-performance-v32.js");
 for(const q of ["root.aigVisualV32","bridge.setAuto(!current.auto)","state.jsMs","state.fps","state.contextLost"])assert.ok(s.includes(q));
 for(const q of ["NC_SEND","MACHINE_CONNECT","localStorage.setItem(","fetch(","target.click("])assert.ok(!s.includes(q));
});
test("V32 offline shell cache bumped",()=>{
 const s=rd("service-worker.js");
 assert.ok(s.includes("performance-v32-20261018"));
 assert.ok(s.includes('"./axis-performance-v32.js"'));
 assert.ok(s.includes('"./axis-performance-v32.css"'));
});
