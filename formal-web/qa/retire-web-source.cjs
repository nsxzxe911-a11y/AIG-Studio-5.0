"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const dir=path.resolve("formal-web");
const read=p=>fs.readFileSync(path.join(dir,p),"utf8");
const index=read("index.html"),work=read("mobile-runtime.html"),studio=read("studio-375.html"),sw=read("service-worker.js"),downloads=read("native-download.html");
for(const p of ["index.html","mobile-runtime.html","studio-375.html","native-download.html","service-worker.js"]){
 assert(fs.existsSync(path.join(dir,p)),p);
}
for(const p of ["mobile-runtime-v86.html","mobile-runtime-v90.html","runtime/v90-cad-cam-sim-runtime.js","runtime/v92-6ax-authority-layout.js",
"runtime/v93-home-glb-viewer.js","runtime/v93-home-rgb-layout.js","runtime/v94-home-audit-download.js","v90-cad-cam-sim-runtime.css",
"v91-rgb-desktop.css","v92-6ax-authority-layout.css","v93-home-rgb.css","v94-home-audit-download.css"]){
 assert(!fs.existsSync(path.join(dir,p)),"Removed Web artifact remains: "+p);
}
assert(!/href="\.\/(?:mobile-runtime(?:-v\d+)?|studio-375)\.html/.test(index),"Index must not link to low-grade runtimes");
assert(index.includes('id="dual-projects"')&&index.includes('data-site-theme="forest"'),"Original dual project website is missing");
assert(index.includes("native-download.html"),"No native release routing");
for(const html of [work,studio]){
 assert(html.includes("低階 Web 工作區已撤除"));
 assert(!html.includes("<canvas")&&!html.includes("aigCode")&&!html.includes("makeRuntime("),"No broken Web machine shell");
 assert(!html.includes("localStorage.clear")&&!html.includes("indexedDB.deleteDatabase"),"User data must remain");
}
assert(downloads.includes("nsxzxe911-a11y/AIG-II/releases"));
assert(downloads.includes("nsxzxe911-a11y/AIG-Studio-5.0/releases"));
assert(downloads.includes("AIG-local-CNC-drafts-backup.json"));
for(const forbidden of ["localStorage.clear","localStorage.removeItem","indexedDB.deleteDatabase","fetch(","XMLHttpRequest"]){
 assert(!downloads.includes(forbidden),"Backup may not erase or upload CNC drafts: "+forbidden);
}
const shellMatch=sw.match(/const SHELL=\[([\s\S]*?)\];/);assert(shellMatch);
const shell=JSON.parse("["+shellMatch[1].replace(/,(\s*\])/g,"$1")+"]");
for(const f of shell){const local=f.replace(/^\.\//,"");if(!local)continue;
 assert(fs.existsSync(path.join(dir,local)),"Service worker precache missing: "+f);
}
assert(!shell.some(x=>/v9[0-5]-.*(?:css|js)|runtime-v9[0-5]\.html/.test(x)),"Old Web cached by SW");
assert(sw.includes("caches.delete")&&!sw.includes("localStorage.clear")&&!sw.includes("indexedDB.deleteDatabase"),"Service Worker must not delete user drafts");
console.log("AIG_WEB_DECOMMISSION_STATIC_PASS | 12 V90-V95 FILES REMOVED | FIVE-NATIVE-VERSION-PORTAL_SAFE");
