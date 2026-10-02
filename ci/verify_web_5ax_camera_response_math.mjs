import fs from "node:fs";
import vm from "node:vm";
const html=fs.readFileSync(new URL("../web/index.html",import.meta.url),"utf8");
function extract(name){const start=html.indexOf("function "+name+"(");if(start<0)throw new Error("MISSING:"+name);let brace=html.indexOf("{",start),depth=0,end=-1;for(let i=brace;i<html.length;i++){if(html[i]==="{")depth++;else if(html[i]==="}"){depth--;if(depth===0){end=i+1;break}}}return html.slice(start,end)}
const ctx={};vm.createContext(ctx);vm.runInContext(extract("runtimeMotionRole")+"\n"+extract("runtimeCameraResponse"),ctx);
const move=(motion,from,to,cutting=false,raw="")=>({kind:"move",motion,from:{X:0,Y:0,Z:0,A:0,B:0,C:0,...from},to:{X:0,Y:0,Z:0,A:0,B:0,C:0,...to},cutting,raw});
const longRapid=move("G0",{X:0},{X:180}),shortRapid=move("G0",{X:0},{X:10}),entry=move("G1",{Z:5},{Z:-2},true,"G1 Z-2 (AIG ENTRY)"),cut=move("G1",{X:0,Z:-2},{X:40,Z:-2},true,"G1 X40"),feed=move("G1",{X:0,Z:5},{X:40,Z:5},false,"G1 X40");
const rLong=ctx.runtimeCameraResponse(longRapid,false,16.667),rShort=ctx.runtimeCameraResponse(shortRapid,false,16.667),rEntry=ctx.runtimeCameraResponse(entry,false,16.667),rCutOpen=ctx.runtimeCameraResponse(cut,false,16.667),rCutContact=ctx.runtimeCameraResponse(cut,true,16.667),rFeed=ctx.runtimeCameraResponse(feed,false,16.667);
if(!(rLong.focusAlpha<rShort.focusAlpha&&rShort.focusAlpha<rEntry.focusAlpha&&rEntry.focusAlpha<rCutContact.focusAlpha))throw new Error("RESPONSE_ORDER_FAIL");
if(!(rCutContact.focusAlpha>rCutOpen.focusAlpha&&rCutContact.avoidAlpha>rCutOpen.avoidAlpha))throw new Error("CONTACT_TIGHTEN_FAIL");
if(rLong.label!=="RAPID SLOW"||rEntry.label!=="ENTRY LOCK"||rCutContact.label!=="CUT LOCK"||rFeed.label!=="TRACK")throw new Error("LABEL_FAIL");
function afterOneSecond(fps,bl,contact){let x=0;for(let i=0;i<fps;i++){const r=ctx.runtimeCameraResponse(bl,contact,1000/fps);x+=(1-x)*r.focusAlpha}return x}
const a30=afterOneSecond(30,cut,true),a60=afterOneSecond(60,cut,true),a120=afterOneSecond(120,cut,true),spread=Math.max(a30,a60,a120)-Math.min(a30,a60,a120);
if(spread>.003)throw new Error("FPS_RESPONSE_DRIFT:"+spread);
console.log("WEB_5AX_CAMERA_RESPONSE_MATH_PASS|RAPID_DISTANCE_SLOWDOWN|ENTRY_LOCK|CUT_CONTACT_TIGHTEN|30_60_120_EQUIVALENT|SPREAD="+spread.toFixed(6));
