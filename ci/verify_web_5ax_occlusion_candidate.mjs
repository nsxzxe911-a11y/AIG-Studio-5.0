import fs from "node:fs";
import vm from "node:vm";
const html=fs.readFileSync(new URL("../web/index.html",import.meta.url),"utf8");
function extract(name){const start=html.indexOf("function "+name+"(");if(start<0)throw new Error("MISSING:"+name);let brace=html.indexOf("{",start),depth=0,end=-1;for(let i=brace;i<html.length;i++){if(html[i]==="{")depth++;else if(html[i]==="}"){depth--;if(depth===0){end=i+1;break}}}return html.slice(start,end)}
const code=extract("runtimeOcclusionCandidate");
const ctx={camera:{yaw:0,pitch:.5},runtimeCameraOcclusion:(eye)=>({blocked:Math.abs(eye[1])<.5,count:Math.abs(eye[1])<.5?1:0,reason:Math.abs(eye[1])<.5?"FIXTURE":"CLEAR"})};vm.createContext(ctx);vm.runInContext(code,ctx);
const r=ctx.runtimeOcclusionCandidate([0,0,0],10,[0,0,0],{A:0,B:0,C:0},{},[],{});
if(r.occlusion.blocked)throw new Error("CANDIDATE_STILL_BLOCKED");
if(Math.abs(r.yaw)>.13||Math.abs(r.pitch)>.07)throw new Error("CANDIDATE_SHIFT_TOO_LARGE:"+JSON.stringify(r));
if(Math.abs(r.yaw)<.10)throw new Error("CANDIDATE_DID_NOT_SHIFT:"+JSON.stringify(r));
console.log("WEB_5AX_OCCLUSION_CANDIDATE_PASS|DIRECT_BLOCKED|SMALL_YAW_SHIFT|NO_CAMERA_JUMP");
