"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),crypto=require("node:crypto");
const read=p=>fs.readFileSync("formal-web/"+p,"utf8");
const doc=read("mobile-runtime.html"),js=read("runtime/v92-6ax-authority-layout.js"),css=read("v92-6ax-authority-layout.css"),
 manifest=JSON.parse(read("authority/v92-6ax-source-region-manifest.json")),sw=read("service-worker.js");
assert.equal(manifest.source.authorityId,"AIGII-MOBILE-6AX-CURRENT-20261016");
assert.equal(manifest.source.sha256,"73f34e958bb22925ceed32b986443240b9322a77bf0cadbc1b81f62501683be6");
assert.equal(manifest.desktop.status,"MISSING_AUTHORITY");
assert(manifest.regions.length>=6&&manifest.regions.every(a=>a.rect.length===4));
assert(manifest.regions.every(a=>a.rect[0]>=0&&a.rect[1]>=0&&a.rect[0]+a.rect[2]<=864&&a.rect[1]+a.rect[3]<=1536));
assert(doc.includes("root.aigCameraV92")&&doc.includes("v91DrawGlb")&&doc.includes("function makeRuntime(")&&doc.includes("voxelStock(scene"));
assert(doc.includes("aig-code-")&&doc.includes("v89-nc-first-state.js"));
for(const b of ["BTN_6AX_CAMERA_TOP","BTN_6AX_CAMERA_IN","BTN_6AX_CAMERA_FIT"]){
 assert(js.includes(b),"missing live callback "+b)
}
assert(js.includes("appendChild(target)")&&js.includes("original.canvas===root.querySelector"));
assert(!js.includes("cloneNode(")&&!js.includes("innerHTML="));
assert(sw.includes('"./runtime/v92-6ax-authority-layout.js"'));
assert(!css.includes("background-image:url(")&&!css.includes("pointer-events:none!important"));
assert.equal((doc.match(/src=".\/runtime\/v92-6ax-authority-layout.js"/g)||[]).length,1);
console.log("AIG_V92_AUTHORITY_REGION_AND_NATIVE_CALLBACK_SOURCE_PASS");
