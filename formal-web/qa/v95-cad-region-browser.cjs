"use strict";
const {chromium}=require("playwright"),assert=require("node:assert/strict"),fs=require("node:fs");
fs.mkdirSync("artifacts/v95",{recursive:true});
async function check(b,entry,mobile){
 const label=(entry.includes("studio")?"STUDIO":"AIGII")+"-"+(mobile?"S23":"4K");
 const ctx=await b.newContext({viewport:mobile?{width:360,height:772}:{width:3840,height:2160},
   deviceScaleFactor:mobile?4:1,hasTouch:mobile,isMobile:mobile});
 const p=await ctx.newPage();
 try{
  await p.goto("http://127.0.0.1:8765/"+entry+"#CAD",{waitUntil:"domcontentloaded",timeout:45000});
  await p.waitForFunction(()=>window.AIG_CAD_V95?.inspect()?.sourceGate==="SOURCE_READY",{timeout:25000});
  const before=await p.evaluate(()=>window.AIG_CAD_V95.inspect());
  assert(before.realCanvas&&before.realButtons===20&&before.actualShapeCount===0,label+" source/native CAD");
  const root=p.locator(".screen.active [data-cad-runtime]");
  assert.equal(await root.locator(".aig95-rail button[data-cad-tool],.aig95-rail button[data-cad-action]").count(),10);
  assert.equal(await root.locator("canvas[data-cad-canvas]").count(),1);
  const boxes=await p.evaluate(()=>{
   const r=document.querySelector(".screen.active [data-cad-runtime]");
   const rect=x=>{const b=r.querySelector(x).getBoundingClientRect();return {x:b.x,y:b.y,w:b.width,h:b.height}};
   return {rail:rect(".aig95-rail"),canvas:rect(".cadCanvasWrap"),properties:rect('[data-aig95-region="PROPERTIES"]'),
     body:{w:document.documentElement.clientWidth,h:document.documentElement.clientHeight,scroll:document.documentElement.scrollWidth}};
  });
  assert(boxes.canvas.w>= (mobile?125:700)&&boxes.canvas.h>= (mobile?90:200),label+" canvas viewport");
  assert(boxes.body.scroll<=boxes.body.w+3,label+" horizontal overflow");
  await root.locator('[data-cad-tool="LINE"]').click();
  const canvas=root.locator("canvas[data-cad-canvas]");
  const box=await canvas.boundingBox();assert(box&&box.width>100&&box.height>90);
  await p.mouse.click(box.x+box.width*.36,box.y+box.height*.45);
  await p.mouse.click(box.x+box.width*.66,box.y+box.height*.57);
  await p.waitForFunction(()=>window.AIG_CAD_V95.inspect().actualShapeCount===1);
  await root.locator('[data-cad-action="UNDO"]').click();
  assert.equal(await p.evaluate(()=>window.AIG_CAD_V95.inspect().actualShapeCount),0);
  await root.locator('[data-cad-action="REDO"]').click();
  assert.equal(await p.evaluate(()=>window.AIG_CAD_V95.inspect().actualShapeCount),1);
  const data=await p.evaluate(()=>JSON.parse(localStorage.getItem("aig-cad-draft-v1")||"null"));
  assert.equal(data?.shapes?.length,1,label+" persisted geometry");
  assert.equal(await root.locator("[data-cad-msg]").count(),1);
  assert.equal(await root.locator("img").count(),0,"No bitmap-as-CAD UI");
  await p.screenshot({path:"artifacts/v95/"+label+"-CAD.png",fullPage:false});
  if(mobile){
   const tab=p.locator('.screen.active .aig49-dock [data-aig50-choice="tools"]');
   if(await tab.count()){
    await tab.click();await p.waitForTimeout(120);
    assert(await root.locator('[data-aig95-region="PROPERTIES"]').isVisible(),label+" property inspector");
   }
  }
  console.log("AIG_V95_"+label+"_REAL_CAD_LINE_UNDO_REDO_PERSIST_PASS");
 }finally{await ctx.close()}
}
(async()=>{
 const b=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--use-gl=angle","--use-angle=swiftshader"]});
 try{for(const entry of ["mobile-runtime.html","studio-375.html"])for(const mobile of [false,true])await check(b,entry,mobile)}
 finally{await b.close()}
})().catch(e=>{console.error("AIG_V95_CAD_BROWSER_FAIL",e.stack||e);process.exitCode=1});

