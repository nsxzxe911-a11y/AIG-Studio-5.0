"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),crypto=require("node:crypto");
const read=p=>fs.readFileSync("formal-web/"+p,"utf8");
const sha=text=>crypto.createHash("sha1").update("blob "+Buffer.byteLength(text)+"\0").update(text).digest("hex");
const html=read("mobile-runtime.html"),sw=read("service-worker.js");
for(const version of ["88-manus-runtime-adapter","89-nc-first-state","90-cad-cam-sim-runtime"]){
 const p=version[0]==="9"&&version[1]==="0"?"v90-cad-cam-sim-runtime":"v"+version;
 assert.equal(html.split('"./'+p+'.css"').length,2,"CSS exactly once "+p);
 assert.equal(html.split('"./runtime/'+p+'.js"').length,2,"JS exactly once "+p);
}
let h=html;
for(const version of ["v88-manus-runtime-adapter","v89-nc-first-state","v90-cad-cam-sim-runtime"]){
 h=h.replace('<link rel="stylesheet" href="./'+version+'.css">\n',"");
 h=h.replace('<script src="./runtime/'+version+'.js"></script>\n',"");
}
assert.equal(sha(h),"b772e246b4b7e5758743ff2f2c0e71bcd46639d8","V87 original CNC Runtime HTML must be preserved");
let s=sw;
for(const version of ["v88-manus-runtime-adapter","v89-nc-first-state","v90-cad-cam-sim-runtime"]){
 s=s.replace('"./'+version+'.css","./runtime/'+version+'.js",',"");
}
s=s.replace("aig-ii-original-render-nc-sim-guard-v90-20261020","aig-ii-original-render-nc-sim-guard-v66-20261019");
assert.equal(sha(s),"0e115d8095cfde04657df00481949b299796c816","PWA baseline protected");
const script=read("runtime/v90-cad-cam-sim-runtime.js"),skin=read("v90-cad-cam-sim-runtime.css");
for(const required of ["getShapeCount","aigCamApi","aigSimApi","data-open-page","NAV_SIM","NAV_CAM","aig-cam-toolpath-v1","numericCncGate"]){
 assert(script.includes(required),"missing original Runtime binding "+required);
}
for(const blocked of ["cloneNode(","innerHTML=","WebSocket(","XMLHttpRequest(","navigator.serial","navigator.usb"]){
 assert(!script.includes(blocked),"unexpected machining path or fake clone "+blocked);
}
assert(skin.includes('data-aig90-props="collapsed"'));
assert(!html.includes("manus-v87/candidate/app.js"),"Manus isolated source must not execute");
console.log("AIG_V90_STATIC_GATE_PASS | ORIGINAL_RUNTIME_UNMODIFIED | CORE_NUMERICAL_GATE_PENDING");
