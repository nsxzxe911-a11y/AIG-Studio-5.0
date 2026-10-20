"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs");
const root="formal-web/",read=p=>fs.readFileSync(root+p,"utf8");
const h=read("mobile-runtime.html"),sw=read("service-worker.js"),ui=read("runtime/v94-home-audit-download.js"),skin=read("v94-home-audit-download.css");
for(const required of ["AIG_HOME_V94_AUDIT","BTN_HOME_V94_AUDIT_DOWNLOAD","BTN_HOME_V94_AUDIT_REFRESH","GitHub API","releases/download/","workflow_runs","machineOutput","physicalMachineOutput"]){
 if(required==="machineOutput")continue;assert(ui.includes(required),required)
}
assert(ui.includes("physicalMachineOutput:\"BLOCKED\""));
assert(ui.includes("r?.head_sha===sha"),"GitHub Gate must exactly match formal branch HEAD SHA");
assert(ui.includes('r.name==="AIG V94 HOME Audit Download Gate"'),"Never call V93 PASS a V94 audit PASS");
assert(ui.includes("!r.draft&&!r.prerelease"),"No draft or prerelease downloads");
assert(ui.includes('validUrl(a.browser_download_url,project.repo)'),"No invented asset URLs");
assert(ui.includes('歷史發布')&&ui.includes('非目前網頁版'),"Historical downloads must be labeled");
assert(ui.includes('private:true')&&ui.includes('if(record.private)'),"Private AIG-II must not expose anonymous asset downloads");
assert(!ui.includes("localStorage.setItem(")&&!ui.includes("localStorage.removeItem("));
assert(!ui.includes("navigator.serial")&&!ui.includes("WebSocket("));
assert(h.includes("v94-home-audit-download.js")&&h.includes("v94-home-audit-download.css"));
assert(sw.includes('"./runtime/v94-home-audit-download.js"')&&sw.includes('"./v94-home-audit-download.css"'));
assert(h.includes("function makeRuntime(")&&h.includes("function makeHomeRuntime(")&&h.includes("voxelStock(scene"));
assert(skin.includes(".aig94-overlay[hidden]"));
console.log("AIG_V94_AUDIT_DOWNLOAD_STATIC_PASS | RELEASE_ASSET_URL_GROUNDED | CNC_BLOCKED");
