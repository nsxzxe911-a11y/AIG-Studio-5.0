import fs from "node:fs";
import vm from "node:vm";
const html=fs.readFileSync(new URL("../web/index.html",import.meta.url),"utf8");
function extract(name){const start=html.indexOf("function "+name+"(");if(start<0)throw new Error("MISSING:"+name);let brace=html.indexOf("{",start),depth=0,end=-1;for(let i=brace;i<html.length;i++){if(html[i]==="{")depth++;else if(html[i]==="}"){depth--;if(depth===0){end=i+1;break}}}return html.slice(start,end)}
const ctx={camera:{avoidTargetYaw:0,avoidTargetPitch:0,avoidTargetValid:false,avoidHoldUntil:0,avoidSwitchCount:0,lastAvoidDecision:"CLEAR"}};vm.createContext(ctx);vm.runInContext(extract("runtimeOcclusionHysteresis"),ctx);
const clear=(yaw,pitch,score)=>({yaw,pitch,score,occlusion:{blocked:false,count:0,reason:"CLEAR"}}),blocked=(yaw,pitch,count=1)=>({yaw,pitch,score:count*100+yaw*yaw+pitch*pitch,occlusion:{blocked:true,count,reason:"FIXTURE"}});
let r=ctx.runtimeOcclusionHysteresis(clear(.12,.06,.018),null,1000,.008,720);if(!r.switched||ctx.camera.avoidTargetYaw!==.12)throw new Error("INITIAL_SWITCH_FAIL");
r=ctx.runtimeOcclusionHysteresis(clear(-.12,.06,.018),clear(.12,.06,.018),1200,.008,720);if(r.switched||r.decision!=="STABLE HOLD"||ctx.camera.avoidTargetYaw!==.12)throw new Error("SYMMETRIC_FLIP_FLOP:"+JSON.stringify(r));
r=ctx.runtimeOcclusionHysteresis(clear(-.22,.10,.058),blocked(.12,.06,1),1300,.008,720);if(!r.switched||ctx.camera.avoidTargetYaw!==-.22)throw new Error("BLOCKED_ESCAPE_FAIL");
ctx.camera.avoidTargetYaw=.12;ctx.camera.avoidTargetPitch=.06;ctx.camera.avoidTargetValid=true;ctx.camera.avoidHoldUntil=1500;r=ctx.runtimeOcclusionHysteresis(clear(0,0,0),clear(.12,.06,.018),2400,.008,720);if(!r.switched||ctx.camera.avoidTargetYaw!==0)throw new Error("CLEAR_RECENTER_FAIL");
ctx.camera.avoidTargetYaw=.12;ctx.camera.avoidTargetPitch=.06;ctx.camera.avoidTargetValid=true;ctx.camera.avoidHoldUntil=0;r=ctx.runtimeOcclusionHysteresis(clear(.10,.05,.014),clear(.12,.06,.018),5000,.008,720);if(r.switched)throw new Error("MARGIN_TOO_SENSITIVE");
console.log("WEB_5AX_HYSTERESIS_MATH_PASS|SYMMETRIC_HOLD|MIN_HOLD|BLOCKED_ESCAPE|CLEAR_RECENTER|SCORE_MARGIN");
