"use strict";
const {chromium}=require("playwright"),assert=require("node:assert/strict"),fs=require("node:fs");
fs.mkdirSync("artifacts/v91",{recursive:true});
async function run(browser,mobile){
 const ctx=await browser.newContext({viewport:mobile?{width:360,height:772}:{width:3840,height:2160},deviceScaleFactor:mobile?4:1});
 const p=await ctx.newPage(),name=mobile?"S23":"4K";
 try{
  const page=await p.goto("http://127.0.0.1:8765/mobile-runtime-v91.html#6AX",{waitUntil:"domcontentloaded",timeout:40000});
  assert.equal(page.status(),200);
  await p.waitForSelector('.screen.active[data-page="6AX"]',{timeout:18000});
  await p.waitForFunction(()=>document.querySelector('.screen.active canvas[data-glcanvas]')?.dataset.aig91Model==="GLB_READY",{timeout:35000});
  const data=await p.evaluate(()=>{const c=document.querySelector('.screen.active canvas[data-glcanvas]');return{model:c.dataset.aig91Model,kind:c.closest('[data-runtime]')?.dataset.runtime,viewport:c.getBoundingClientRect().toJSON(),context:!!c.getContext("webgl")}});
  assert.equal(data.model,"GLB_READY");assert.equal(data.kind,"6AX");assert(data.context&&data.viewport.width>200&&data.viewport.height>160);
  assert(await p.locator('.aig55-nav button[data-aig55-page="CAM"]').count());
  await p.screenshot({path:"artifacts/v91/"+name+"-GLB-RGB.png"});
  await p.locator('.screen.active button[data-axis-subpage="NC_FIRST"]').click();
  assert(await p.locator('.screen.active textarea.code[data-axis="6AX"]').count());
  await p.screenshot({path:"artifacts/v91/"+name+"-NCFIRST.png"});
  console.log("AIG_V91_"+name+"_REAL_GLB_PASS");
 }finally{await ctx.close()}
}
(async()=>{const b=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--use-gl=angle","--use-angle=swiftshader"]});try{await run(b,false);await run(b,true)}finally{await b.close()}})().catch(e=>{console.error("AIG_V91_FAIL",e.stack||e);process.exitCode=1});
