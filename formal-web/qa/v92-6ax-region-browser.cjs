"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),{chromium}=require("playwright");
fs.mkdirSync("artifacts/v92",{recursive:true});
const uri="http://127.0.0.1:8765/mobile-runtime.html";
async function verify(browser,mobile){
 const name=mobile?"S23":"4K";
 const ctx=await browser.newContext({viewport:mobile?{width:360,height:772}:{width:3840,height:2160},deviceScaleFactor:mobile?4:1});
 const page=await ctx.newPage();
 try{
  await page.goto(uri+"#6AX",{waitUntil:"domcontentloaded",timeout:35000});
  await page.waitForFunction(()=>window.AIG_V92_IMAGE_REVERSE_MAPPING?.inspect()?.mounted===true,{timeout:25000});
  await page.waitForFunction(()=>document.querySelector('.screen.active canvas[data-glcanvas]')?.dataset.aig91Model==="GLB_READY",{timeout:35000});
  if(mobile){
   const view=page.locator('.screen.active .aig49-dock button[data-aig50-choice="view"]');
   if(await view.count())await view.click();
  }
  const before=await page.evaluate(()=>{
   const root=document.querySelector('.screen.active .simgrid[data-runtime="6AX"]'),
    stage=root.querySelector(".aig92-stage"),canvas=root.querySelector("canvas[data-glcanvas]");
   return {mapping:root.dataset.aig92ReverseMap,
    nativeButtons:root.querySelectorAll('[data-cmd="play"]').length,cam:root.aigCameraV92?.read(),
    stage:stage.getBoundingClientRect().toJSON(),gl:canvas.getBoundingClientRect().toJSON(),
    telemetry:!!root.querySelector('.aig92-telemetry [data-removal-volume]'),
    editor:root.querySelectorAll("textarea.code").length};
  });
  assert.equal(before.mapping,"ready");assert.equal(before.nativeButtons,1);
  assert(before.cam&&before.telemetry&&before.editor===1,"real native bindings lost");
  console.log("AIG_V92_GEOMETRY",name,JSON.stringify(before));
  await page.screenshot({path:"artifacts/v92/"+name+"-6AX-PRECHECK.png",fullPage:false});
  assert(before.gl.width>210&&before.gl.height>170,"live GLB work window was crushed "+JSON.stringify(before));
  await page.locator('.screen.active [data-button-id="BTN_6AX_CAMERA_TOP"]').click();
  const after=await page.evaluate(()=>document.querySelector('.screen.active [data-runtime="6AX"]').aigCameraV92.read());
  assert.notEqual(after.pitch,before.cam.pitch,"real camera callback did not move original WebGL viewpoint");
  await page.screenshot({path:"artifacts/v92/"+name+"-6AX-RGB-AUTHORITY-LIVE.png",fullPage:false});
  if(mobile){
   await page.locator('.screen.active .aig49-dock button[data-aig50-choice="tools"]').click();
  }
  assert(await page.locator('.screen.active [data-cmd="play"]').isVisible(),"real Play not usable");
  await page.screenshot({path:"artifacts/v92/"+name+"-6AX-CONTROLS.png",fullPage:false});
  // Same original canvas and NC working copy after MACHINE ↔ NC_FIRST.
  const gcode=await page.locator('.screen.active textarea.code[data-axis="6AX"]').inputValue();
  await page.locator('.screen.active [data-axis-subpage="NC_FIRST"]').click();
  assert.equal(await page.locator('.screen.active textarea.code[data-axis="6AX"]').inputValue(),gcode);
  await page.locator('.screen.active [data-axis-subpage="MACHINE"]').click();
  console.log("AIG_V92_"+name+"_REAL_AUTHORITY_LAYOUT_PASS");
 }finally{await ctx.close()}
}
(async()=>{const b=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--use-gl=angle","--use-angle=swiftshader"]});try{await verify(b,false);await verify(b,true)}finally{await b.close()}})().catch(e=>{console.error("AIG_V92_RUNTIME_FAIL",e.stack||e);process.exitCode=1});
