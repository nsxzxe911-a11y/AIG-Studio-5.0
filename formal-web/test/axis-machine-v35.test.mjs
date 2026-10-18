import test from "node:test";import assert from "node:assert/strict";import {readFileSync} from "node:fs";
const read=n=>readFileSync(new URL("../"+n,import.meta.url),"utf8");
test("both actual WebGL runtimes call axis-specific machine geometry",()=>{
 for(const p of ["mobile-runtime.html","studio-375.html"]){
 const s=read(p);
 assert.ok(s.includes("function drawAxisMachineProfile(p)"));
 assert.equal((s.match(/drawAxisMachineProfile\(\{axis,cx,cy,stockBottom,stockH,spanX,spanY,tableR,R,vp\}\)/g)||[]).length,1);
 for(const id of ["3AX","4AX","5AX","6AX"])assert.ok(s.includes('axis==="'+id+'"'));
 assert.ok(s.includes("getRemoval:()=>({...lastRemoval})"));
 assert.ok(s.includes("axis-machine-v35.js"));
 }
});
test("Studio removes old placeholder machine blocks",()=>{
 const s=read("studio-375.html");assert.ok(!s.includes('drawMesh(cube,T(-tableR-7,0,stockBottom-7),rgb("#24394b"),vp)'));
});
test("actual machine viewport stays before read-only HUD",()=>{
 const s=read("axis-hud-v30.js");
 assert.ok(s.includes('scene.insertAdjacentElement("afterend",wrap)'));
 assert.ok(!s.includes("scene.parentNode.insertBefore(wrap,scene)"));
});
test("shared release and offline assets match 35.0.0",()=>{
 const x=JSON.parse(read("dual-web-v34.json"));
 assert.equal(x.release,"35.0.0");assert.ok(x.projects.every(p=>p.webVersion==="35.0.0"));
 const sw=read("service-worker.js");assert.ok(sw.includes("axis-real-v35"));assert.ok(sw.includes('"./axis-machine-v35.js"'));
});
