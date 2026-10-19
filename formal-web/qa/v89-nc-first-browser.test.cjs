"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {chromium}=require("playwright");
const URL=process.env.AIG_TEST_URL||"http://127.0.0.1:8765/mobile-runtime.html";
const dir=path.resolve("artifacts/v89");fs.mkdirSync(dir,{recursive:true});
async function runCase(browser,mode){
 const c=await browser.newContext({viewport:mode==="desktop"?{width:3840,height:2160}:{width:360,height:772},deviceScaleFactor:mode==="desktop"?1:4});
 const page=await c.newPage();
 try{
  await page.goto(URL+"#6AX",{waitUntil:"domcontentloaded",timeout:30000});
  const root=page.locator('.screen.active .simgrid.axisModule[data-runtime="6AX"]');
  await root.locator('textarea.code[data-axis="6AX"]').waitFor({state:"attached",timeout:20000});
  await page.waitForFunction(()=>document.querySelector('.screen.active [data-runtime="6AX"]')?.dataset.aigInitialized==="true",{timeout:20000});
  await page.waitForFunction(()=>window.AIG_V89_NC_WORKING_COPY?.inspect().mounted===true,{timeout:10000});
  const ta=root.locator('textarea.code[data-axis="6AX"]');
  const starting=await ta.inputValue();
  assert(starting.length>20,"original NC program missing");
  const serial="(AIG V89 WORKING COPY TEST)";
  await page.evaluate(marker=>{
   const t=document.querySelector('.screen.active textarea.code[data-axis="6AX"]');
   t.value+="\n"+marker;t.dispatchEvent(new Event("input",{bubbles:true}));
  },serial);
  await page.waitForTimeout(520); // Let native 350ms parser finish before snapshot.
  const value=await ta.inputValue();
  assert(value.endsWith(serial),"native source textarea must keep edits");
  const draft=await page.evaluate(()=>JSON.parse(localStorage.getItem("aig-nc-working-copy-6AX-v89")||"null"));
  assert.equal(draft?.text,value,"working copy did not autosave");
  assert.notEqual(draft?.text,await page.evaluate(()=>localStorage.getItem("aig-code-6AX")),"autosave overwrote formal main");
  const snap=await page.evaluate(()=>{const r=document.querySelector('.screen.active [data-runtime="6AX"]');return {code:r.querySelector("textarea.code").value,gl:r.querySelector("canvas[data-glcanvas]"),fallback:r.querySelector("canvas[data-canvas]"),progress:r.querySelector("[data-progress-text]").textContent,volume:r.querySelector("[data-removal-volume]").textContent}});
  if(mode==="desktop")await page.screenshot({path:path.join(dir,"desktop-6ax-machine.png")});
  else await page.screenshot({path:path.join(dir,"mobile-6ax-machine.png")});
  await root.locator('.axisSubpages button[data-axis-subpage="NC_FIRST"]').click();
  await page.waitForTimeout(160);
  assert.equal(await root.getAttribute("data-axis-subpage"),"NC_FIRST");
  assert(await root.locator("textarea.code").isVisible(),"NC-first original editor hidden");
  if(mode==="desktop")await page.screenshot({path:path.join(dir,"desktop-6ax-nc-first.png")});
  else await page.screenshot({path:path.join(dir,"mobile-6ax-nc-first.png")});
  await root.locator('.axisSubpages button[data-axis-subpage="MACHINE"]').click();
  await page.waitForTimeout(160);
  const verified=await page.evaluate(({expected})=>{
    const r=document.querySelector('.screen.active [data-runtime="6AX"]');
    return {text:r.querySelector("textarea.code").value,gl:r.querySelector("canvas[data-glcanvas]"),fallback:r.querySelector("canvas[data-canvas]"),gate:r.dataset.aig89SwitchGate,volume:r.querySelector("[data-removal-volume]").textContent,progress:r.querySelector("[data-progress-text]").textContent};
  },{expected:value});
  assert.equal(verified.text,value,"NC text changed by tab switch");
  assert.equal(verified.gate,"DOM_PRESERVED","DOM switch evidence must preserve state");
  // The independent NC editor may import a pending 6AX draft by explicit action,
  // but does not automatically overwrite the saved main program.
  await page.locator('.app>.top .nav button[data-page="NC"]').click();
  await page.waitForSelector('.screen.active[data-page="NC"]');
  await page.locator('.screen.active [data-nc-axis]').selectOption("6AX");
  const importDraft=page.locator('.screen.active [data-command-id="NC_IMPORT_6AX_WORKING_COPY"]');
  assert(await importDraft.isVisible(),"independent NC must offer the pending 6AX draft");
  await importDraft.click();
  assert.equal(await page.locator('.screen.active textarea[data-nc-code]').inputValue(),value,
   "independent NC explicit draft import did not transfer the program");
  assert.notEqual(await page.evaluate(()=>localStorage.getItem("aig-code-6AX")),value,
   "draft import must not silently overwrite the main NC program");
  await page.locator('.app>.top .nav button[data-page="6AX"]').click();
  await page.waitForSelector('.screen.active[data-page="6AX"]');
  assert.equal(await page.locator('.screen.active textarea.code[data-axis="6AX"]').inputValue(),value,
   "6AX working state changed after visiting standalone NC");
  await page.reload({waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.querySelector('.screen.active [data-runtime="6AX"]')?.dataset.aigInitialized==="true",{timeout:20000});
  const fresh=page.locator('.screen.active [data-runtime="6AX"]');
  const recovery=fresh.locator('[data-command-id="NC_6AX_WORKING_COPY_RECOVER"]');
  // A recovered draft must be an explicit user action, never overwrite saved main.
  if(mode==="mobile")await fresh.locator('.axisSubpages button[data-axis-subpage="NC_FIRST"]').click();
  assert(await recovery.isVisible(),"pending working-copy recovery not presented");
  await recovery.click();
  assert.equal(await fresh.locator('textarea.code').inputValue(),value);
  await fresh.locator('button[data-editcmd="save"]').click();
  await page.waitForTimeout(50);
  const persisted=await page.evaluate(()=>({main:localStorage.getItem("aig-code-6AX"),draft:localStorage.getItem("aig-nc-working-copy-6AX-v89")}));
  assert.equal(persisted.main,value,"native save did not write main");
  assert.equal(persisted.draft,null,"working copy not cleared after successful save");
  console.log("V89_BROWSER_"+mode.toUpperCase()+"_PASS | DRAFT+NC_SWITCH+RECOVERY+REAL_SAVE");
 }finally{await page.close();await c.close();}
}
(async()=>{const b=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--use-gl=angle","--use-angle=swiftshader"]});try{await runCase(b,"desktop");await runCase(b,"mobile")}finally{await b.close()}})().catch(e=>{console.error("V89_BROWSER_FAIL",e.stack||String(e));process.exitCode=1});
