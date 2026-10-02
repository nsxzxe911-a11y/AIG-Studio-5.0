import fs from "node:fs";
import vm from "node:vm";
const html=fs.readFileSync(new URL("../web/index.html",import.meta.url),"utf8");
function extract(name){const start=html.indexOf("function "+name+"(");if(start<0)throw new Error("MISSING:"+name);let brace=html.indexOf("{",start),depth=0,end=-1;for(let i=brace;i<html.length;i++){if(html[i]==="{")depth++;else if(html[i]==="}"){depth--;if(depth===0){end=i+1;break}}}return html.slice(start,end)}
const ctx={};vm.createContext(ctx);vm.runInContext(extract("runtimeMotionRole")+"\n"+extract("runtimeCameraLookaheadPlan"),ctx);
const move=(motion,from,to,cutting=false,raw="")=>({kind:"move",motion,from:{X:0,Y:0,Z:0,...from},to:{X:0,Y:0,Z:0,...to},cutting,raw});
const cur=move("G1",{X:0,Z:-2},{X:20,Z:-2},true,"G1 X20"),nextCut=move("G1",{X:20,Z:-2},{X:40,Z:-2},true,"G1 X40"),nextEntry=move("G1",{X:20,Y:0,Z:4},{X:20,Y:0,Z:-3},true,"G1 Z-3 (AIG ENTRY)"),rapid=move("G0",{X:20,Z:-2},{X:45,Z:8},false,"G0 X45 Z8"),reverse=move("G1",{X:20,Z:-2},{X:-20,Z:-2},true,"G1 X-20"),far=move("G1",{X:20,Z:-2},{X:220,Z:-2},true,"G1 X220");
const zero={x:0,y:0,z:0},now=2000,sceneR=70,pos={X:18,Y:0,Z:-2};
let r=ctx.runtimeCameraLookaheadPlan(cur,nextCut,pos,.82,sceneR,zero,now,0,false,.35,460);if(!r.eligible||r.mode!=="NEXT CUT"||Math.hypot(r.target.x,r.target.y,r.target.z)>r.maxOffset+1e-9)throw new Error("NEXT_CUT_FAIL:"+JSON.stringify(r));
r=ctx.runtimeCameraLookaheadPlan(cur,nextEntry,{X:20,Y:0,Z:-2},.82,sceneR,zero,now,0,false,.35,460);if(!r.eligible||r.mode!=="NEXT ENTRY")throw new Error("NEXT_ENTRY_FAIL:"+JSON.stringify(r));
r=ctx.runtimeCameraLookaheadPlan(cur,nextCut,pos,.40,sceneR,zero,now,0,false,.35,460);if(r.eligible||r.progressGate)throw new Error("EARLY_PROGRESS_FAIL");
r=ctx.runtimeCameraLookaheadPlan(cur,rapid,pos,.82,sceneR,zero,now,0,false,.35,460);if(r.eligible||r.mode!=="LOOKAHEAD OFF")throw new Error("RAPID_REJECT_FAIL");
r=ctx.runtimeCameraLookaheadPlan(cur,far,pos,.82,sceneR,zero,now,0,false,.35,460);if(r.eligible||r.distanceGate)throw new Error("DISTANCE_GATE_FAIL");
r=ctx.runtimeCameraLookaheadPlan(cur,reverse,{X:20,Y:0,Z:-2},.82,sceneR,zero,now,0,false,.35,460);if(r.eligible||r.angleGate||r.turnDeg<179)throw new Error("ANGLE_GATE_FAIL:"+JSON.stringify(r));
const held={x:2,y:0,z:0};r=ctx.runtimeCameraLookaheadPlan(cur,nextEntry,{X:20,Y:0,Z:-2},.82,sceneR,held,now,now+400,false,.35,460);if(r.mode!=="LOOKAHEAD HOLD"||r.target.x!==2)throw new Error("HOLD_FAIL:"+JSON.stringify(r));
r=ctx.runtimeCameraLookaheadPlan(cur,nextCut,pos,.82,sceneR,held,now,0,true,.35,460);if(r.mode!=="MANUAL HOLD"||r.target.x!==2)throw new Error("MANUAL_FAIL");
console.log("WEB_5AX_LOOKAHEAD_MATH_PASS|NEXT_CUT|NEXT_ENTRY|PROGRESS_GATE|RAPID_REJECT|DISTANCE_GATE|ANGLE_180_REJECT|MAX_OFFSET|HOLD|MANUAL_PRIORITY|NO_PREDICTION");
