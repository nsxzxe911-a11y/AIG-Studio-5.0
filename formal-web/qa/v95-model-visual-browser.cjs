"use strict";
const {chromium}=require("playwright"),assert=require("node:assert/strict"),fs=require("node:fs");
fs.mkdirSync("artifacts/v95",{recursive:true});
async function test(browser,mobile){
 const name=mobile?"S23":"4K";
 const ctx=await browser.newContext({viewport:mobile?{width:360,height:772}:{width:3840,height:2160},deviceScaleFactor:mobile?4:1});
 const p=await ctx.newPage(),errors=[];p.on("pageerror",e=>errors.push(e.message));
 try{
  const res=await p.goto("http://127.0.0.1:8765/mobile-runtime.html#HOME",{waitUntil:"domcontentloaded",timeout:45000});
  assert.equal(res.status(),200);
  await p.waitForFunction(()=>window.AIG_HOME_V93?.inspect()?.mounted,null,{timeout:25000});
  await p.waitForFunction(()=>{const c=document.querySelector('.screen.active canvas[data-aig93-glb]');
   return c?.dataset.aig93Glb==="ready"&&c?.dataset.aig95Rendered==="true"},null,{timeout:45000});
  const result=await p.evaluate(()=>{
   const c=document.querySelector('.screen.active canvas[data-aig93-glb]');
   return{m:window.AIG_HOME_V93_VIEWER.inspect(),home:window.AIG_HOME_V93.inspect(),
    bounds:c.getBoundingClientRect().toJSON(),
    stage:document.querySelector('.screen.active .aig93-stage').getBoundingClientRect().toJSON(),
    scroll:document.documentElement.scrollHeight>innerHeight+4};
  });
  assert(result.m.ready&&result.m.autoFramed&&result.m.visualOnly);
  assert(result.m.workpieceVisible&&result.m.leftColumnVisible&&result.m.bridgeVisible,"Complete machine parts invisible");
  assert(result.m.structuralParts.length>20);
  assert(result.m.bounds.min.every(Number.isFinite)&&result.m.bounds.max.every(Number.isFinite));
  assert(result.bounds.width>250&&result.bounds.height>110,"Model canvas crushed");
  assert(result.home.mounted&&result.home.nativeNc&&result.home.nativeCam);
  assert(!result.scroll,"HOME page overflow");
  assert(!errors.some(e=>/GLB|WebGL|shader|GL_DRAW/i.test(e)),JSON.stringify(errors));
  await p.screenshot({path:"artifacts/v95/"+name+"-HOME-FULL-6AX.png",fullPage:false});
  await p.locator('.screen.active .aig93-nav-btn[data-open-page="6AX"]').click();
  await p.waitForSelector('.screen.active[data-page="6AX"]',{timeout:20000});
  await p.waitForFunction(()=>document.querySelector('.screen.active canvas[data-glcanvas]')?.dataset.aig91Model==="GLB_READY",null,{timeout:40000});
  assert(await p.locator('.screen.active textarea.code[data-axis="6AX"]').count());
  if(mobile){
    const btn=p.locator('.screen.active .aig49-dock button[data-aig50-choice="view"]');
    if(await btn.count())await btn.click();
  }
  await p.screenshot({path:"artifacts/v95/"+name+"-6AX-GLB-FULL.png",fullPage:false});
  console.log("AIG_V95_"+name+"_COMPLETE_MODEL_PASS",JSON.stringify({count:result.m.structuralParts.length,bounds:result.m.bounds}));
 }finally{await ctx.close()}
}
(async()=>{const b=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--use-gl=angle","--use-angle=swiftshader"]});
 try{await test(b,false);await test(b,true)}finally{await b.close()}})().catch(e=>{console.error("AIG_V95_MODEL_BROWSER_FAIL",e.stack||e);process.exitCode=1});
