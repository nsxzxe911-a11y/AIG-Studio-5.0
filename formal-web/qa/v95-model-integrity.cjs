"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs");
const read=p=>fs.readFileSync("formal-web/"+p,"utf8");
const home=read("runtime/v93-home-glb-viewer.js"),runtime=read("mobile-runtime.html"),old=read("mobile-runtime-v86.html");
for(const key of ["STATIC_BED","STATIC_LEFT_COLUMN","STATIC_RIGHT_COLUMN","STATIC_BRIDGE","SPINDLE_HEAD","B_CRADLE_RIGHT_ARM","A_BODY","CHUCK","WORKPIECE"]){
 assert(home.includes('"'+key+'"'),"Missing visible GLB structural part: "+key);
}
assert(home.includes('workpieceVisible:geometry.names.includes("WORKPIECE")'));
assert(home.includes('leftColumnVisible:geometry.names.includes("STATIC_LEFT_COLUMN")'));
assert(home.includes('gl.uniformMatrix3fv(uniforms.normalMatrix'));
assert(home.includes('GLB_COMPONENT_MISSING_'));
assert(home.includes('canvas.dataset.aig95Rendered="true"'));
assert(home.includes('const distance=(Math.max(maxY/tanHalf'));
const filter=home.match(/const skip=\/\^.*?\/;/)?.[0];
assert(filter&&filter.includes("B_CRADLE_LEFT_ARM"));
for(const forbidden of ["STATIC_LEFT_","STATIC_BRIDGE","STATIC_BACK_WALL","B_SUPPORT_REAR","WORKPIECE"]){
 assert(!filter.includes(forbidden),"Do not hide critical model part: "+forbidden);
}
const native=runtime.match(/const v91Hidden=\/\^.*?\/;/)?.[0];
assert(native&&native.includes("B_CRADLE_LEFT_ARM"));
assert(!native.includes("WORKPIECE")&&!native.includes("STATIC_LEFT_"));
assert(runtime.includes('v94-home-audit-download.js'));
assert(runtime.includes("function makeRuntime(")&&runtime.includes("voxelStock(scene"));
assert(!old.includes("v91DrawGlb"));
console.log("AIG_V95_MODEL_STRUCTURE_GATE_PASS | ORIGINAL_CNC_PRESERVED");
