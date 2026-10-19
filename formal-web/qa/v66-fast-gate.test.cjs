/* AIG V66 whole-site FAST source gate.
 * Run: node formal-web/qa/v66-fast-gate.test.cjs
 * Contract/source only, NOT a browser visual, simulator material-removal,
 * TCP calibration, axis kinematic safety, or CNC-machine output pass. */
"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const at=(file)=>fs.readFileSync(path.resolve(__dirname,"..",file),"utf8");
let count=0;function check(name,fn){fn();console.log("PASS "+name);count++}
const html=at("mobile-runtime.html"),skin=at("workspace-rgb-v66.css"),resp=at("workspace-responsive-v66b.css");
const mechanism=at("runtime/6ax-mechanism-preview-v1.js"),
 loader=at("runtime/6ax-lazy-loader-v66.js"),
 bridge=at("runtime/6ax-nc-bridge-v2.js"),sw=at("service-worker.js");
const moduleMap={
 HOME:"data-home-runtime",CAD:"data-cad-runtime",CAM:"data-cam-runtime",
 SIM:"data-sim-hub","3AX":'data-runtime="'+ "3AX"+'"',
 "4AX":'data-runtime="'+ "4AX"+'"',"5AX":'data-runtime="'+ "5AX"+'"',
 "6AX":'data-runtime="'+ "6AX"+'"',NC:"data-nc-runtime",AI:"data-ai-page-runtime"
};
for(const [page,anchor] of Object.entries(moduleMap))check(page+" original runtime is still in source",()=>{
 assert.ok(html.includes(page),page+" name missing");
 if(page.endsWith("AX"))assert.ok(html.includes('simPage(axis)'),"axis original generator missing");
 else assert.ok(html.includes(anchor),anchor+" not found");
});
check("CAD real drawing canvas not replaced",()=>assert.ok(html.includes('data-cad-canvas')));
check("CAM true path canvas not replaced",()=>assert.ok(html.includes('data-cam-canvas')));
check("NC original textarea remains",()=>assert.ok(html.includes('data-nc-code')));
check("V65 3/4/5/6AX scripts remain",()=>{for(const id of ["3ax-v62","4ax-v63","5ax-v64","6ax-v65"])assert.ok(html.includes("axis-"+id+".js"),id)});
check("V66 RGB Glass and cross-page responsive styles linked",()=>{
 assert.ok(html.includes("workspace-rgb-v66.css"));
 assert.ok(html.includes("workspace-responsive-v66b.css"));
 assert.ok(resp.includes('[data-page="HOME"]'));assert.ok(resp.includes('[data-page="CAD"]'));
 assert.ok(resp.includes('[data-page="CAM"]'));assert.ok(resp.includes('[data-page="SIM"]'));
 assert.ok(resp.includes('[data-page="NC"]'));assert.ok(resp.includes('[data-page="AI"]'));
});
check("Windows 6AX 74/26 viewport retained",()=>assert.ok(resp.includes("2.85fr")));
check("A/B/H controls mount only in original 6AX sceneWrap",()=>{
 assert.ok(mechanism.includes('data-page="6AX"] .simgrid[data-runtime="6AX"] .sceneWrap'));
 assert.ok(mechanism.includes("BTN_6AX_VIEW_TOGGLE_PANEL"));
 assert.ok(mechanism.includes('panelToggle.addEventListener("click"'));
});
check("NC preview never writes original editor or clicks CNC RUN",()=>{
 assert.ok(bridge.includes("editor.value"));
 assert.ok(!/editor\.value\s*=(?!=)/.test(bridge));assert.ok(!/\.click\(\)/.test(bridge));
 assert.ok(bridge.includes('machineOutput:"BLOCKED"'));
});
check("current NC interference is sample-specific",()=>{
 assert.ok(bridge.includes("loaded.candidateKeys.has(key)"));
 assert.ok(!bridge.includes("const flag=loaded.samples.potential.length>0"));
});
check("6AX optional JS truly deferred in HTML",()=>{
 for(const src of ["6ax-mechanism-core-v1.js","6ax-mechanism-preview-v1.js","6ax-nc-readonly-v2.js","6ax-nc-bridge-v2.js"]){
  assert.ok(html.includes('data-aig66-lazy-src="./runtime/'+src+'"'));
  assert.ok(!html.includes('<script src="./runtime/'+src+'"></script>'));
 }
 assert.ok(html.includes('src="./runtime/6ax-lazy-loader-v66.js"'));
});
check("original V65 6AX core still immediately available",()=>assert.ok(html.includes('src="./axis-6ax-v65.js"')));
check("6AX loader listens to real page visibility instead of startup preload",()=>{
 assert.ok(loader.includes('.screen.active[data-page="6AX"]'));
 assert.ok(loader.includes('if(!force&&!active())return Promise.resolve(false)'));
 assert.ok(loader.includes("OPTIONAL_ASSET_FAILED"));
});
check("offline install critical pages guarded",()=>{
 assert.ok(sw.includes("V66_CRITICAL_SHELL_MISSING"));
 assert.ok(sw.includes("mobile-runtime.html")&&sw.includes("index.html"));
});
check("SW precache avoids giant 3D assets",()=>{
 const block=sw.slice(sw.indexOf("const SHELL=["),sw.indexOf("const MAX_DYNAMIC_ENTRIES"));
 assert.ok(block.includes("workspace-responsive-v66b.css"));
 for(const f of ["6ax-nc-bridge-v2.js","6ax-mechanism-preview-v1.js","axis-6ax-v65.js",".glb",".jpg"])
  assert.ok(!block.includes(f),"Unexpected preload "+f);
 assert.ok(sw.includes("MAX_DYNAMIC_ENTRIES=260"));
});
check("all module and 6AX browser selfcheck pages are present",()=>{
 const wide=at("qa/v66-all-modules-check.html"),six=at("qa/6ax-live-check.html");
 assert.ok(wide.includes("V66_PASSIVE_DOM_CONTRACT_ONLY"));
 assert.ok(wide.includes("10 頁 DOM 契約存在"));
 assert.ok(six.includes("inspect.renderedFrames>0"));
});
check("all new script source parses",()=>{
 for(const f of ["runtime/6ax-lazy-loader-v66.js","runtime/6ax-mechanism-core-v1.js",
 "runtime/6ax-mechanism-preview-v1.js","runtime/6ax-nc-readonly-v2.js","runtime/6ax-nc-bridge-v2.js","service-worker.js"])new vm.Script(at(f),{filename:f});
 for(const f of ["qa/v66-all-modules-check.html","qa/6ax-live-check.html"]){
  const source=at(f).match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(source,f+" no inline verification");
  new vm.Script(source,{filename:f});
 }
});
check("V66 preview cannot be mislabeled machine safe",()=>{
 assert.ok(mechanism.includes('machineOutput:"BLOCKED"'));
 assert.ok(at("runtime/6ax-nc-readonly-v2.js").includes('collisionGate:"UNVERIFIED"'));
});
console.log("AIG_V66_ALL_DEPARTMENTS_SOURCE_PASS|"+count+"_CASES|BROWSER_CNC_GATES_PENDING");
