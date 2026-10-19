/* AIG 6AX mechanism V1 source-level verification.
   Run: node formal-web/runtime/6ax-mechanism-v1.test.cjs
   Does not stand in for browser visual, collision, 0.001mm or machine safety Gates. */
"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const K=require("./6ax-mechanism-core-v1.js");
const near=(a,b)=>Math.abs(a-b)<1e-8;
const equalMatrix=(a,b)=>a.length===b.length&&a.every((v,i)=>near(v,b[i]));
let count=0;
function test(name,fn){fn();count++;console.log("PASS "+name)}
const base=K.solve();
test("six independent joints",()=>assert.deepEqual(K.joints.map(v=>v.id).sort(),["X","Y","Z","A","B","H"].sort()));
test("zero and 360 A same transform",()=>assert.ok(equalMatrix(K.solve({A:360}).pivots.cradle,base.pivots.cradle)));
test("zero and 360 B same transform",()=>assert.ok(equalMatrix(K.solve({B:360}).pivots.platter,base.pivots.platter)));
test("A 90 rotates complete cradle",()=>{const x=K.solve({A:90});assert.ok(!equalMatrix(x.pivots.cradle,base.pivots.cradle));assert.ok(equalMatrix(x.pivots.head,base.pivots.head));});
test("B 90 rotates platter only",()=>{const x=K.solve({B:90});assert.ok(!equalMatrix(x.pivots.platter,base.pivots.platter));assert.ok(equalMatrix(x.pivots.cradle,base.pivots.cradle));});
test("H 45 tilts tool independently",()=>{const x=K.solve({H:45});assert.ok(!near(x.toolTip[0],base.toolTip[0]));assert.ok(equalMatrix(x.pivots.platter,base.pivots.platter));});
test("XYZ displacement is separate",()=>{for(const [id,axis] of [["X",0],["Y",1],["Z",2]]){const pose=K.solve({[id]:100});assert.ok(near(pose.toolTip[axis]-base.toolTip[axis],.5));assert.ok(equalMatrix(pose.pivots.platter,base.pivots.platter));}});
test("compound A/B/H pose",()=>{const x=K.solve({A:90,B:180,H:45});assert.ok(!equalMatrix(x.pivots.platter,base.pivots.platter));assert.ok(!near(x.toolTip[0],base.toolTip[0]));});
test("reject invalid angles and numbers",()=>{assert.throws(()=>K.solve({H:46}),/AXIS_OUT_OF_PREVIEW_RANGE/);assert.throws(()=>K.solve({A:361}),/AXIS_OUT_OF_PREVIEW_RANGE/);assert.throws(()=>K.solve({X:Infinity}),/NON_FINITE_AXIS/);});
test("machine output fails closed",()=>{const x=K.solve({A:90,B:270,H:45});assert.equal(x.machineOutput,"BLOCKED");assert.equal(x.collisionGate,"NOT_IMPLEMENTED");assert.equal(K.verifiedCncSafety,false);});
test("WebGL and V65 NC editor coexist in source",()=>{
 const root=path.resolve(__dirname,"..");
 const html=fs.readFileSync(path.join(root,"mobile-runtime.html"),"utf8");
 for(const name of ["axis-6ax-v65.js","6ax-mechanism-core-v1.js","6ax-mechanism-preview-v1.js","axis-6ax-mechanism-v1.css"])assert.ok(html.includes(name),name);
 const viewer=fs.readFileSync(path.join(__dirname,"6ax-mechanism-preview-v1.js"),"utf8");
 for(const name of ['getContext("webgl"','AIG_6AX_MECHANISM_PREVIEW_V1','machineOutput:"BLOCKED"'])assert.ok(viewer.includes(name),name);
 assert.ok(html.includes('data-axis="6AX"')||html.includes('textarea.code')||html.includes("makeAxisScreen"));
});
console.log("AIG_6AX_MECHANISM_V1_SOURCE_PASS|"+count+"_CASES|BROWSER_AND_SAFETY_PENDING");
