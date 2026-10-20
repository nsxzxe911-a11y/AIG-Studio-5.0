"use strict";
const fs=require("node:fs"),assert=require("node:assert/strict"),vm=require("node:vm");
const read=p=>fs.readFileSync("formal-web/"+p,"utf8");
const m=JSON.parse(read("authority/v95-cad-region-manifest.json"));
const registry=JSON.parse(read("visual-library/manifest.json"));
const revoked=JSON.parse(read("visual-library/authority-revocations-438.json"));
const cad=registry.originals.find(x=>x.id==="CAD");
assert.equal(m.source.sha256,cad.mobileAuthority.sha256);
assert.equal(m.source.width,941);assert.equal(m.source.height,1672);
assert.equal(m.desktop.status,"MISSING_AUTHORITY");
assert(revoked.sources.some(x=>x.includes("/02_CAD_DESKTOP_4K.png")));
assert.equal(m.actualControls.total,20);
const js=read("runtime/v95-cad-authority-layout.js");
new vm.Script(js,{filename:"v95-cad-authority-layout.js"});
for(const f of ["v95-cad-authority.css","v95-cad-mobile.css","v95-cad-desktop.css"]){
 const c=read(f);assert(c.includes("data-aig95-cad"),f);
 assert(!c.includes("background-image:")&&!c.includes("url("),"No fake bitmap UI");
}
assert(js.includes("root.aigCadApi")&&js.includes("grid.insertBefore(rail,panels[0])"));
assert(!js.includes("cloneNode(")&&!js.includes("localStorage.setItem("));
for(const file of ["mobile-runtime.html","studio-375.html"]){
 const s=read(file);
 assert(s.includes("v95-cad-authority-layout.js")&&s.includes("v95-cad-mobile.css")&&s.includes("v95-cad-desktop.css"));
 const start=s.indexOf("function cadPage(){"),end=s.indexOf("function ",start+20);
 const fn=new Function(s.slice(start,end)+"return cadPage;");
 const html=fn();
 assert.equal((html.match(/data-cad-tool=/g)||[]).length,7);
 assert.equal((html.match(/data-cad-action=/g)||[]).length,13);
 assert.equal((html.match(/data-cad-canvas/g)||[]).length,1);
 assert(s.includes('root.addEventListener("click",e=>aigGuard(root,"CAD 操作"'));
 assert(s.includes('root.aigCadApi={refreshView:'));
}
console.log("AIG_V95_CAD_AUTHORITY_SOURCE_PASS | 2 PROJECTS | 20 NATIVE CONTROLS | NO BITMAP UI");

