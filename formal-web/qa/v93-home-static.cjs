"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),crypto=require("node:crypto");
const read=p=>fs.readFileSync("formal-web/"+p,"utf8");
const source=read("mobile-runtime.html"),js=read("runtime/v93-home-rgb-layout.js"),
 view=read("runtime/v93-home-glb-viewer.js"),css=read("v93-home-rgb.css"),
 manifest=JSON.parse(read("authority/v93-home-region-manifest.json")),cache=read("service-worker.js");
assert.equal(manifest.desktopAuthority,"MISSING_APPROVED_4K_IMAGE");
assert(source.includes("function makeHomeRuntime(")&&source.includes("function makeRuntime(")&&source.includes("voxelStock(scene"));
assert(source.includes("v92-6ax-authority-layout.js")&&source.includes("v93-home-rgb-layout.js"));
assert(source.includes("v93-home-glb-viewer.js")&&cache.includes("v93-home-rgb-layout.js"));
for(const key of ["data-home-network","data-home-cad","data-home-cam","data-home-nc","aigModuleCard","aigProjects"]){
 assert(js.includes(key),"Missing native HOME live binding "+key)
}
for(const blocked of ["cloneNode(","innerHTML=","localStorage.clear(","XMLHttpRequest(","navigator.serial","navigator.usb"]){
 assert(!js.includes(blocked)&&!view.includes(blocked),"Unsafe synthetic/native route "+blocked)
}
assert(view.includes("aig_6ax_machine_v9.glb")&&view.includes("gl.drawArrays"));
assert(css.includes(".aig93-model-canvas")&&css.includes(".aig93-nav-btn"));
assert(!css.includes("background-image:url("),"No screenshot fake visual allowed");
assert(source.includes("aig-code-")&&source.includes("aig-cad-draft-v1"));
console.log("AIG_V93_HOME_SOURCE_PASS | ORIGINAL_HOME_CORE_PROTECTED | RGB_NATIVE_NAV | GLB_REAL_VISUAL_ONLY");
