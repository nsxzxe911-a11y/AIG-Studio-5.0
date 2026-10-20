"use strict";
const fs=require("node:fs"),assert=require("node:assert/strict"),path=require("node:path");
const home=fs.readFileSync("formal-web/index.html","utf8");
const sw=fs.readFileSync("formal-web/service-worker.js","utf8");
const pages=["mobile-runtime.html","mobile-runtime-v86.html","mobile-runtime-v90.html","studio-375.html"];
for(const p of pages){
 const s=fs.readFileSync(path.join("formal-web",p),"utf8");
 assert(s.includes('data-aig-web-workspace="retired"'),p+" must be retired, not executable Web app");
 assert(!s.includes("function makeRuntime(")&&!s.includes("gl.drawArrays("),p+" still contains old Web app");
 assert(!s.includes("localStorage.clear")&&!s.includes("indexedDB.deleteDatabase"));
}
for(const p of ["runtime/v88-manus-runtime-adapter.js","runtime/v89-nc-first-state.js",
 "runtime/v90-cad-cam-sim-runtime.js","runtime/v92-6ax-authority-layout.js","runtime/v93-home-glb-viewer.js",
 "runtime/v93-home-rgb-layout.js","runtime/v94-home-audit-download.js","v91-rgb-desktop.css",
 "v93-home-rgb.css","v94-home-audit-download.css","studio-375-overlay.js"]){
 assert(!fs.existsSync(path.join("formal-web",p)),"Old low-grade runtime still shipped: "+p);
}
assert(!home.includes('href="./studio-375.html"'));
assert(!/href="\.\/mobile-runtime\.html#/.test(home));
assert(home.includes("低階 Web 工作區已撤下"));
assert(sw.includes("aig-ii-portal-native-only-20261020"));
assert(!sw.includes("v93-home-glb-viewer")&&!sw.includes("cam-nc-preflight"));
console.log("AIG_WEB_LOW_GRADE_RUNTIME_RETIRED_PASS | DUAL_SITE_PRESERVED | NO_NATIVE_OR_LOCAL_DATA_REMOVAL");
