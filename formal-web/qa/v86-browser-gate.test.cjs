"use strict";
// Browser Gate: real Chromium DOM/layout evidence; not CNC numerical verification.
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {chromium}=require("playwright");
const base=process.env.AIG_TEST_URL||"http://127.0.0.1:8765/mobile-runtime.html";
const out=path.resolve(process.env.AIG_SCREENSHOT_DIR||"artifacts/v86");
fs.mkdirSync(out,{recursive:true});
async function open(page,pageName){await page.goto(base+"#"+encodeURIComponent(pageName),{waitUntil:"domcontentloaded",timeout:25000});
 await page.waitForSelector('.screen.active[data-page="'+pageName+'"]',{timeout:14000});await page.waitForTimeout(300);}
async function check(page,selector,msg){const element=page.locator(selector).first();assert(await element.count(),msg+": not found");const visible=await element.isVisible();assert(visible,msg+": not visible");return element;}
async function layout(page,label){const metrics=await page.evaluate(()=>({viewport:innerWidth,scroll:document.documentElement.scrollWidth,active:document.querySelector(".screen.active")?.dataset.page||null}));
 assert(metrics.scroll-metrics.viewport<=55,label+" horizontal overflow "+JSON.stringify(metrics));return metrics;}
(async()=>{
 const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--use-gl=angle","--use-angle=swiftshader"]});
 try{
  for(const item of [{name:"desktop",w:1440,h:900},{name:"mobile",w:390,h:844}]){
   const context=await browser.newContext({viewport:{width:item.w,height:item.h},reducedMotion:"reduce"});
   const page=await context.newPage();
   page.on("pageerror",e=>{console.error("BROWSER_PAGE_ERROR["+item.name+"]",e.message.slice(0,220));});
   await open(page,"AI");
   await check(page,'.screen.active [data-aig82-guide] button[data-aig82="PLAN"]',"AI real planner action");
   await check(page,'.screen.active [data-aig86-handoff] button[data-aig86-action="AUDIT"]',"AI safe audit");
   const legacy=page.locator('.screen.active .aig43-bar');
   if(await legacy.count())assert(!(await legacy.isVisible()),"duplicate V43 engineering action panel");
   await layout(page,item.name+" AI");
   await page.screenshot({path:path.join(out,item.name+"-ai.png")});
   await open(page,"NC");
   await check(page,'.screen.active [data-nc-runtime] textarea[data-nc-code]',"NC editable textarea");
   await check(page,'.screen.active [data-nc-action="VERIFY"]',"NC native verify button");
   await layout(page,item.name+" NC");
   await page.screenshot({path:path.join(out,item.name+"-nc.png")});
   await open(page,"6AX");
   await check(page,'.screen.active .simgrid.axisModule[data-runtime="6AX"]',"6AX runtime root");
   const axis=page.locator('.screen.active .simgrid.axisModule[data-runtime="6AX"]');
   await check(page,'.screen.active [data-aig86-toggle-nc]',"6AX live NC panel switch");
   await check(page,'.screen.active [data-cmd="play"]',"6AX true playback button");
   await check(page,'.screen.active .sceneWrap',"6AX main viewport");
   assert.equal(await axis.getAttribute("data-aig86-nc"),"collapsed","6AX main viewport must start focused");
   const width=await page.evaluate(()=>{const root=document.querySelector('.screen.active .simgrid.axisModule[data-runtime="6AX"]');
    const view=root.querySelector(".sceneWrap");return {parent:root.getBoundingClientRect().width,view:view.getBoundingClientRect().width}});
   assert(width.view>=width.parent*.58,"6AX visual workspace too narrow "+JSON.stringify(width));
   if(item.name==="desktop"){
    const source=await axis.locator("textarea.code").inputValue();
    await axis.locator("[data-aig86-toggle-nc]").click();
    await check(page,'.screen.active .simgrid.axisModule[data-runtime="6AX"]>.editor',"6AX expanded editor");
    assert.equal(await axis.locator("textarea.code").inputValue(),source,"NC data changed during view-only toggle");
    await axis.locator('.axisSubpages [data-axis-subpage="NC_FIRST"]').click();
    assert.equal(await axis.getAttribute("data-axis-subpage"),"NC_FIRST","NC-first mode not selected");
    await check(page,'.screen.active .simgrid.axisModule[data-runtime="6AX"]>.editor',"NC-first editor not visible");
    await axis.locator('.axisSubpages [data-axis-subpage="MACHINE"]').click();
    assert.equal(await axis.getAttribute("data-axis-subpage"),"MACHINE");
   }
   await layout(page,item.name+" 6AX");
   await page.screenshot({path:path.join(out,item.name+"-6ax.png")});
   await page.close();await context.close();
  }
  console.log("V86_BROWSER_DESKTOP_MOBILE_LAYOUT_PASS | SOURCE_UI_ONLY | CNC_NUMERIC_GATE_PENDING");
 }finally{await browser.close()}
})().catch(e=>{console.error("V86_BROWSER_GATE_FAIL",e.stack||String(e));process.exitCode=1});
