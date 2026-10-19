"use strict";
// Real Chrome UI and source state. This does not verify material-removal physics.
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {chromium}=require("playwright");
const base=process.env.AIG_TEST_URL||"http://127.0.0.1:8765/mobile-runtime.html";
const out=path.resolve("artifacts/v90");fs.mkdirSync(out,{recursive:true});
async function open(page,key){
 await page.goto(base+"#"+encodeURIComponent(key),{waitUntil:"domcontentloaded",timeout:30000});
 await page.waitForSelector('.screen.active[data-page="'+key+'"]',{timeout:20000});
 await page.waitForFunction(()=>Boolean(window.AIG_V90_CAD_CAM_SIM?.inspect),{timeout:12000});
}
async function run(browser,label){
 const phone=label==="s23",context=await browser.newContext({
  viewport:phone?{width:360,height:772}:{width:3840,height:2160},deviceScaleFactor:phone?4:1});
 const page=await context.newPage();
 try{
  await open(page,"CAD");
  const cad=page.locator('.screen.active [data-cad-runtime]');
  assert(await cad.locator('canvas[data-cad-canvas]').count(),"CAD native canvas");
  assert(await cad.locator('[data-button-id="BTN_CAD_FLOW_CAM"]').count(),"CAD navigation missing");
  assert.equal(await cad.locator('button[data-cad-tool]').count(),7,"original CAD tools changed");
  await page.screenshot({path:path.join(out,label+"-cad.png")});
  const cadCanvas=cad.locator("canvas[data-cad-canvas]");
  if(!phone){
   await cad.locator('[data-button-id="BTN_CAD_PROPERTIES_TOGGLE"]').click();
   assert.equal(await cad.getAttribute("data-aig90-props"),"collapsed");
   await cad.locator('[data-button-id="BTN_CAD_PROPERTIES_TOGGLE"]').click();
   assert.equal(await cad.getAttribute("data-aig90-props"),"expanded");
  }
  const canvasBox=await cadCanvas.boundingBox();
  assert(canvasBox&&canvasBox.width>140&&canvasBox.height>100,"CAD viewport collapsed");
  await cad.locator('button[data-cad-tool="LINE"]').click();
  await page.mouse.click(canvasBox.x+canvasBox.width*.38,canvasBox.y+canvasBox.height*.46);
  await page.mouse.click(canvasBox.x+canvasBox.width*.55,canvasBox.y+canvasBox.height*.55);
  await page.waitForTimeout(200);
  const cadNumber=await page.evaluate(()=>JSON.parse(localStorage.getItem("aig-cad-draft-v1")||"null")?.shapes?.length||0);
  assert(cadNumber>=1,"CAD real geometry not saved");
  await cad.locator('[data-button-id="BTN_CAD_FLOW_CAM"]').click();
  await page.waitForSelector('.screen.active[data-page="CAM"]',{timeout:12000});
  const cam=page.locator('.screen.active [data-cam-runtime]');
  assert(await cam.locator('canvas[data-cam-canvas]').count(),"CAM real canvas missing");
  assert(await cam.locator('textarea[data-cam-manual-input]').count(),"CAM manual source missing");
  await page.screenshot({path:path.join(out,label+"-cam.png")});
  // Open original manual controls on mobile using existing pane dock only.
  if(phone){
   const manual=page.locator('.screen.active .aig49-dock button[data-aig50-choice="manual"]');
   if(await manual.count())await manual.click();
  }
  const mode=cam.locator('select[data-cam-route-mode]');
  await mode.selectOption("MANUAL",{force:phone});
  const code="G0 X0 Y0 Z5\nG1 X0 Y0 Z-2\nG1 X12 Y0 Z-2\nG0 Z5";
  await cam.locator('textarea[data-cam-manual-input]').fill(code,{force:phone});
  // On Android the native preview action is hidden in the MANUAL pane.
  // The V60 manual buttons forward to ORIGINAL CALC/APPLY callbacks.
  if(phone)await cam.locator('[data-aig60-cmd="calc"]').click();
  else await cam.locator('button[data-cam-action="CALC"]').click();
  const count=await cam.locator('[data-cam-path-count]').textContent();
  assert(Number(String(count).match(/\d+/)?.[0]||0)>0,"original manual CAM produced no paths");
  if(phone)await cam.locator('[data-aig60-cmd="apply"]').click();
  else await cam.locator('button[data-cam-action="APPLY"]').click();
  const camSaved=await page.evaluate(()=>JSON.parse(localStorage.getItem("aig-cam-toolpath-v1")||"null"));
  assert(camSaved&&Array.isArray(camSaved.paths)&&camSaved.paths.length>0,
   "CAM actual paths not saved");
  if(phone){
    const view=page.locator('.screen.active .aig49-dock button[data-aig50-choice="view"]');
    if(await view.count())await view.click();
  }
  await cam.locator('[data-button-id="BTN_CAM_FLOW_SIM"]').click();
  await page.waitForSelector('.screen.active[data-page="SIM"]',{timeout:12000});
  const sim=page.locator('.screen.active [data-sim-hub]');
  assert(await sim.locator('[data-sim-card="6AX"]').count(),"original 6AX SIM evidence card missing");
  assert(await sim.locator('[data-button-id="BTN_SIM_FLOW_REFRESH"]').count(),"original SIM refresh entry absent");
  const api=await page.evaluate(()=>window.AIG_V90_CAD_CAM_SIM.inspect());
  assert(api.cad.originalApi&&api.cam.originalApi&&api.sim.originalApi,"missing original core API");
  assert(api.cam.savedPaths>0,"SIM handoff lost original CAM saved paths");
  assert.equal(api.machineOutput,"BLOCKED");
  await page.screenshot({path:path.join(out,label+"-sim.png")});
  console.log("V90_"+label.toUpperCase()+"_UI_RUNTIME_PASS · CNC_NUMERIC_GATE_PENDING");
 }finally{await page.close();await context.close();}
}
(async()=>{const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--use-gl=angle","--use-angle=swiftshader"]});try{await run(browser,"desktop");await run(browser,"s23")}finally{await browser.close()}})().catch(e=>{console.error("V90_UI_RUNTIME_FAIL",e.stack||String(e));process.exitCode=1});
