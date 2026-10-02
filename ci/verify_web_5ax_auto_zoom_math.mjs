import fs from "node:fs";
import vm from "node:vm";
const html=fs.readFileSync(new URL("../web/index.html",import.meta.url),"utf8");
function extract(name){const start=html.indexOf("function "+name+"(");if(start<0)throw new Error("MISSING:"+name);let brace=html.indexOf("{",start),depth=0,end=-1;for(let i=brace;i<html.length;i++){if(html[i]==="{")depth++;else if(html[i]==="}"){depth--;if(depth===0){end=i+1;break}}}return html.slice(start,end)}
const ctx={};vm.createContext(ctx);vm.runInContext(extract("runtimeCameraZoomPlan"),ctx);
const base=2.55,now=2000;
const plan=(role,contact=false,travel=0,target=base,hold=0,manual=false,user=base,current=base)=>ctx.runtimeCameraZoomPlan({role,contactActive:contact,travel},user,current,target,now,hold,manual,.06,520);
const rapidShort=plan("RAPID",false,10),rapidLong=plan("RAPID",false,180),entry=plan("ENTRY"),cut=plan("CUT",false),contact=plan("CUT",true),feed=plan("FEED");
if(!(rapidLong.desired>rapidShort.desired&&rapidShort.desired>base&&entry.desired<base&&cut.desired<entry.desired&&contact.desired<cut.desired))throw new Error("ZOOM_ORDER_FAIL:"+JSON.stringify({rapidShort,rapidLong,entry,cut,contact}));
if(feed.switched)throw new Error("FEED_DEADBAND_BREATHING");
const held=plan("RAPID",false,180,base,now+500,false);if(held.switched)throw new Error("HOLD_WINDOW_FAIL");
const urgent=plan("CUT",true,40,rapidLong.desired,now+500,false);if(!urgent.switched||urgent.target>=rapidLong.desired)throw new Error("URGENT_CLOSE_FAIL");
const manual=plan("CUT",true,40,1.9,0,true,2.2,1.9);if(manual.target!==1.9||manual.mode!=="MANUAL HOLD"||manual.switched)throw new Error("MANUAL_PRIORITY_FAIL");
const low=plan("CUT",true,40,1.3,0,false,.5,1.3),high=plan("RAPID",false,999,4.7,0,false,9,4.7);if(low.desired<1.25||high.desired>4.8)throw new Error("ZOOM_BOUND_FAIL");
if(!(rapidLong.zoomMaxRate<contact.zoomMaxRate))throw new Error("RATE_ORDER_FAIL");
console.log("WEB_5AX_AUTO_ZOOM_MATH_PASS|LONG_G0_WIDEST|ENTRY_CLOSE|CUT_CLOSER|CONTACT_CLOSEST|DEADBAND|HOLD|URGENT_CLOSE|MANUAL_PRIORITY|BOUNDS_1.25_4.8|RATE_LIMIT");
