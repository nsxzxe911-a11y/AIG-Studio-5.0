import fs from "node:fs";
import vm from "node:vm";
const html=fs.readFileSync(new URL("../web/index.html",import.meta.url),"utf8");
function extract(name){
 const start=html.indexOf("function "+name+"("); if(start<0)throw new Error("MISSING:"+name);
 let brace=html.indexOf("{",start),depth=0,end=-1;
 for(let i=brace;i<html.length;i++){if(html[i]==="{")depth++;else if(html[i]==="}"){depth--;if(depth===0){end=i+1;break}}}
 if(end<0)throw new Error("UNBALANCED:"+name); return html.slice(start,end);
}
const code=[extract("runtimeToolAxisVector"),extract("runtimeDepthCue")].join("\n");
const ctx={};vm.createContext(ctx);vm.runInContext(code,ctx);
const near=ctx.runtimeDepthCue(ctx.runtimeToolAxisVector({A:0,B:0,C:0},"5AX"),[0,0,1]);
const flat=ctx.runtimeDepthCue(ctx.runtimeToolAxisVector({A:0,B:90,C:0},"5AX"),[0,0,1]);
const far=ctx.runtimeDepthCue(ctx.runtimeToolAxisVector({A:0,B:180,C:0},"5AX"),[0,0,1]);
const tilted=ctx.runtimeToolAxisVector({A:35,B:42,C:0},"5AX");
const norm=Math.hypot(tilted.x,tilted.y,tilted.z);
if(near.label!=="NEAR"||flat.label!=="FLAT"||far.label!=="FAR")throw new Error("DEPTH_POLARITY_FAIL:"+near.label+"/"+flat.label+"/"+far.label);
if(Math.abs(norm-1)>1e-9)throw new Error("TOOL_AXIS_NOT_UNIT:"+norm);
console.log("WEB_5AX_CAMERA_MATH_PASS|B0_NEAR|B90_FLAT|B180_FAR|AB_UNIT_AXIS|NO_PREDICTION");
