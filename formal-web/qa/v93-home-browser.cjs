"use strict";
const {chromium}=require("playwright"),assert=require("node:assert/strict"),fs=require("node:fs");
fs.mkdirSync("artifacts/v93",{recursive:true});
async function run(b,mobile){
 const name=mobile?"S23":"4K",ctx=await b.newContext({viewport:mobile?{width:360,height:772}:{width:3840,height:2160},deviceScaleFactor:mobile?4:1});
 const page=await ctx.newPage();
 try{
  await page.goto("http://127.0.0.1:8765/mobile-runtime.html#HOME",{waitUntil:"domcontentloaded",timeout:45000});
  await page.waitForFunction(()=>window.AIG_HOME_V93?.inspect()?.mounted,{timeout:25000});
  await page.waitForFunction(()=>["ready","error"].includes(document.querySelector(".screen.active canvas[data-aig93-glb]")?.dataset.aig93Glb),{timeout:30000});
  const info=await page.evaluate(()=>{
   const h=document.querySelector(".screen.active [data-home-runtime]"),btn=h.querySelector(".aigModuleCard[data-open-page='6AX']");
   const region=h.querySelector(".aig93-stage"),canvas=h.querySelector(".aig93-model-canvas");
   return{model:canvas.dataset.aig93Glb,home:h.getBoundingClientRect().toJSON(),
    stage:region.getBoundingClientRect().toJSON(),canvas:canvas.getBoundingClientRect().toJSON(),
    moduleButtons:h.querySelectorAll(".aig93-entries [data-open-page]").length,
    navButtons:h.querySelectorAll(".aig93-nav [data-open-page]").length,ids:!!btn.dataset.buttonId,
    nativeCad:h.querySelector("[data-home-cad]")?.textContent,scroll:document.documentElement.scrollHeight>innerHeight+4};
  });
  console.log("AIG_V93_HOME_GEOMETRY",name,JSON.stringify(info));
  assert.equal(info.model,"ready","HOME must render the real project GLB, not claim a fake preview");
  assert(info.home.width>300&&info.stage.height>110&&info.canvas.height>110);
  assert.equal(info.moduleButtons,9);assert.equal(info.navButtons,10);assert(info.ids);
  assert(!info.scroll,"HOME caused unintended browser page scrolling");
  const hidden=await page.evaluate(()=>({
    engineering:getComputedStyle(document.querySelector(".app>.top")).display==="none",
    reference:getComputedStyle(document.querySelector('.screen.active[data-page="HOME"]>.aig-reference-strip')).display==="none"
  }));
  assert(hidden.engineering&&hidden.reference,"engineering chrome or archived reference is still visible");
  if(mobile){
    const cardText=page.locator('.screen.active .aig93-entries .aigModuleCard[data-open-page="CAD"]');
    assert(await cardText.locator("b").isVisible());
    assert(!await cardText.locator("small").isVisible(),"cramped mobile module subtitles should be omitted");
  }
  await page.screenshot({path:"artifacts/v93/"+name+"-RGB-HOME.png",fullPage:false});
  await page.locator('.screen.active .aig93-entries .aigModuleCard[data-open-page="CAD"]').click();
  await page.waitForSelector('.screen.active[data-page="CAD"]',{timeout:15000});
  assert(await page.locator('.screen.active canvas[data-cad-canvas]').count()>0,"CAD original canvas disappeared");
  await page.locator('.app>.top .nav button[data-page="HOME"]').evaluate(e=>e.click());
  await page.waitForSelector('.screen.active[data-page="HOME"]');
  await page.locator('.screen.active .aig93-nav-btn[data-open-page="6AX"]').click();
  await page.waitForSelector('.screen.active[data-page="6AX"]',{timeout:20000});
  assert(await page.locator('.screen.active canvas[data-glcanvas]').count()>0,"Real 6AX renderer was lost");
  console.log("AIG_V93_"+name+"_HOME_GL_NAV_PASS");
 }finally{await ctx.close()}
}
(async()=>{const b=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--use-gl=angle","--use-angle=swiftshader"]});try{await run(b,false);await run(b,true)}finally{await b.close()}})().catch(e=>{console.error("AIG_V93_HOME_GATE_FAIL",e.stack||e);process.exitCode=1});
