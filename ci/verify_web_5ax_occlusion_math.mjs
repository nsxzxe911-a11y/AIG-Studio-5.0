import fs from "node:fs";
import vm from "node:vm";
const html=fs.readFileSync(new URL("../web/index.html",import.meta.url),"utf8");
function extract(name){const start=html.indexOf("function "+name+"(");if(start<0)throw new Error("MISSING:"+name);let brace=html.indexOf("{",start),depth=0,end=-1;for(let i=brace;i<html.length;i++){if(html[i]==="{")depth++;else if(html[i]==="}"){depth--;if(depth===0){end=i+1;break}}}return html.slice(start,end)}
const code=[extract("runtimeSegmentAabbHit"),extract("runtimeCameraOcclusion")].join("\n");
const ctx={inverseRotABPoint:p=>p};vm.createContext(ctx);vm.runInContext(code,ctx);
const box={minX:-1,maxX:1,minY:-1,maxY:1,minZ:-1,maxZ:1};
if(!ctx.runtimeSegmentAabbHit({x:0,y:0,z:5},{x:0,y:0,z:-5},box,0))throw new Error("AABB_HIT_FAIL");
if(ctx.runtimeSegmentAabbHit({x:4,y:4,z:5},{x:4,y:4,z:-5},box,0))throw new Error("AABB_CLEAR_FAIL");
if(!ctx.runtimeSegmentAabbHit({x:1.2,y:0,z:5},{x:1.2,y:0,z:-5},box,.25))throw new Error("AABB_PAD_FAIL");
const pose={A:0,B:0,C:0},farTable={minX:20,maxX:30,minY:20,maxY:30,minZ:-5,maxZ:-4};
let r=ctx.runtimeCameraOcclusion([0,0,5],[0,0,-5],pose,box,[],farTable);if(!r.blocked||r.reason!=="STOCK")throw new Error("STOCK_REASON_FAIL:"+JSON.stringify(r));
r=ctx.runtimeCameraOcclusion([0,0,5],[0,0,-5],pose,{minX:20,maxX:30,minY:20,maxY:30,minZ:20,maxZ:30},[{x:0,y:0,z:-1,w:2,d:2,h:2}],farTable);if(!r.blocked||r.reason!=="FIXTURE")throw new Error("FIXTURE_REASON_FAIL:"+JSON.stringify(r));
r=ctx.runtimeCameraOcclusion([0,0,5],[0,0,-5],pose,{minX:20,maxX:30,minY:20,maxY:30,minZ:20,maxZ:30},[],box);if(!r.blocked||r.reason!=="TABLE")throw new Error("TABLE_REASON_FAIL:"+JSON.stringify(r));
r=ctx.runtimeCameraOcclusion([5,5,5],[5,5,-5],pose,box,[],farTable);if(r.blocked)throw new Error("CLEAR_REASON_FAIL:"+JSON.stringify(r));
console.log("WEB_5AX_OCCLUSION_MATH_PASS|AABB_HIT|PAD|STOCK|FIXTURE|TABLE|CLEAR");
