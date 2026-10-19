"use strict";
// V89: Reconstruct both V87 baseline blobs; assert new code touches no CNC parser/core.
const assert=require("node:assert/strict"),fs=require("node:fs"),crypto=require("node:crypto");
const root="formal-web/";const read=x=>fs.readFileSync(root+x,"utf8");
const sha=x=>crypto.createHash("sha1").update("blob "+Buffer.byteLength(x)+"\0").update(x).digest("hex");
const html=read("mobile-runtime.html"),sw=read("service-worker.js");
for(const name of ["v88-manus-runtime-adapter","v89-nc-first-state"]){
 assert.equal(html.split('./'+name+'.css').length,2,"one CSS reference "+name);
}
for(const name of ["v88-manus-runtime-adapter","v89-nc-first-state"]){
 assert.equal(html.split('./runtime/'+name+'.js').length,2,"one JS reference "+name);
}
const cleanHTML=html
 .replace('<link rel="stylesheet" href="./v89-nc-first-state.css">\n',"")
 .replace('<script src="./runtime/v89-nc-first-state.js"></script>\n',"")
 .replace('<link rel="stylesheet" href="./v88-manus-runtime-adapter.css">\n',"")
 .replace('<script src="./runtime/v88-manus-runtime-adapter.js"></script>\n',"");
assert.equal(sha(cleanHTML),"b772e246b4b7e5758743ff2f2c0e71bcd46639d8","CNC Runtime HTML unchanged from V87");
const cleanSW=sw
 .replace('"./v89-nc-first-state.css","./runtime/v89-nc-first-state.js",',"")
 .replace('"./v88-manus-runtime-adapter.css","./runtime/v88-manus-runtime-adapter.js",',"")
 .replace("aig-ii-original-render-nc-sim-guard-v89-20261020","aig-ii-original-render-nc-sim-guard-v66-20261019");
assert.equal(sha(cleanSW),"0e115d8095cfde04657df00481949b299796c816","offline baseline unchanged");
const adapter=read("runtime/v89-nc-first-state.js");
for(const term of ['aig-nc-working-copy-6AX-v89','aig-code-6AX','data-aig89-switch-gate','NC_6AX_WORKING_COPY_RECOVER','data-editcmd="parse"','textarea.code[data-axis="6AX"]'])assert(adapter.includes(term),term);
assert(!adapter.includes("cloneNode(")&&!adapter.includes("innerHTML="));
assert(!adapter.includes("WebSocket(")&&!adapter.includes("fetch("));
assert(!html.includes('manus-v87/candidate/app.js'));
assert(sw.includes('"./v89-nc-first-state.css"')&&sw.includes('"./runtime/v89-nc-first-state.js"'));
console.log("AIG_V89_SOURCE_INTEGRITY_PASS | NATIVE_CNC_UNMODIFIED | PHYSICAL_OUTPUT_BLOCKED");
