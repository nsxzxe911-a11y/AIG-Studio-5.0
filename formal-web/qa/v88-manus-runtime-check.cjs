/* V88 static source-integrity Gate. Passing this is NOT a CNC or visual Gate. */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const crypto=require("node:crypto");
const base="formal-web/";
const read=p=>fs.readFileSync(base+p,"utf8");
const gitSha=s=>crypto.createHash("sha1").update("blob "+Buffer.byteLength(s)+"\\0").update(s).digest("hex");
const cssTag='<link rel="stylesheet" href="./v88-manus-runtime-adapter.css">\\n';
const jsTag='<script src="./runtime/v88-manus-runtime-adapter.js"></script>\\n';
const html=read("mobile-runtime.html"),sw=read("service-worker.js");
assert.equal((html.match(/v88-manus-runtime-adapter.css/g)||[]).length,1);
assert.equal((html.match(/v88-manus-runtime-adapter.js/g)||[]).length,1);
assert.equal(gitSha(html.replace(cssTag,"").replace(jsTag,"")),
 "b772e246b4b7e5758743ff2f2c0e71bcd46639d8",
 "V87 Runtime core and original handlers must be byte-for-byte unchanged");
const originalSW=sw.replace('"./v88-manus-runtime-adapter.css","./runtime/v88-manus-runtime-adapter.js",','')
 .replace("aig-ii-original-render-nc-sim-guard-v88-20261020","aig-ii-original-render-nc-sim-guard-v66-20261019");
assert.equal(gitSha(originalSW),"0e115d8095cfde04657df00481949b299796c816",
 "The PWA change must only add both offline assets and a versioned cache");
const style=read("v88-manus-runtime-adapter.css"),adapter=read("runtime/v88-manus-runtime-adapter.js");
for(const fragment of ['data-aig86-nc="collapsed"','data-axis-subpage="NC_FIRST"','data-aig65-platform="android"','.sceneWrap'])assert(style.includes(fragment));
for(const fragment of ["data-cmd","data-editcmd","data-removal-volume","textarea.code[data-axis]","V86_PANEL","NOT_VERIFIED"])assert(adapter.includes(fragment));
for(const banned of ["cloneNode(","eval(","WebSocket(","fetch(","localStorage.setItem(","innerHTML="])assert(!adapter.includes(banned));
assert(!html.includes('manus-v87/candidate/app.js'));
assert(sw.includes("./v88-manus-runtime-adapter.css")&&sw.includes("./runtime/v88-manus-runtime-adapter.js"));
console.log("AIG_V88_STATIC_SOURCE_GATE_PASS · UI source unchanged · machine output BLOCKED · CNC/visual Gate pending");
