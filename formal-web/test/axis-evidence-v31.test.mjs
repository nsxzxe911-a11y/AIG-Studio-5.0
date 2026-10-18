import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=(name)=>readFileSync(new URL("../"+name,import.meta.url),"utf8");
test("V31 includes evidence on both original workspaces and keeps all V30 assets",()=>{
 for(const file of ["mobile-runtime.html","studio-375.html"]){
  const page=read(file);
  for(const asset of ["axis-hud-v30.js","axis-evidence-v31.js","axis-evidence-v31.css"])assert.ok(page.includes(asset),asset);
  assert.ok(page.indexOf("axis-hud-v30.js")<page.indexOf("axis-evidence-v31.js"));
 }
});
test("Studio creates only active 3AX-6AX contexts; preserve all original modules",()=>{
 const studio=read("studio-375.html");
 assert.ok(studio.includes("function v31EnsureAxisRuntime(axis)"));
 assert.ok(studio.includes("if(v31AxisRoots.has(name))v31EnsureAxisRuntime(name)"));
 assert.ok(!studio.includes('aigGuard(el,(el.dataset.runtime||"NC")+" Runtime 初始化",()=>makeRuntime(el)'));
 assert.ok(studio.includes("const pixelBudget=phone?2600000:4800000;"));
 assert.ok(studio.includes("const pixelDpr=Math.sqrt(pixelBudget/area);"));
 for(const p of ["CAD","CAM","NC","AI"])assert.ok(studio.includes('name==="'+p+'"'));
});
test("Evidence never performs CNC callbacks or invents precision PASS",()=>{
 const js=read("axis-evidence-v31.js");
 for(const term of ["[data-removal-volume]","[data-remaining-volume]","[data-removal-percent]","[data-removal]","[data-cut-resolution]","canvas[data-glcanvas]"]){
  assert.ok(js.includes(term),term);
 }
 for(const bad of ["localStorage.setItem","dispatchUiCommand(","NC_SEND","MACHINE_CONNECT","target.click()"]){
  assert.ok(!js.includes(bad),bad);
 }
});
test("offline update invalidates old resources",()=>{
 const sw=read("service-worker.js");
 assert.ok(sw.includes("evidence-v31-20261018"));
 assert.ok(sw.includes('"./axis-evidence-v31.js"'));
 assert.ok(sw.includes('"./axis-evidence-v31.css"'));
});
