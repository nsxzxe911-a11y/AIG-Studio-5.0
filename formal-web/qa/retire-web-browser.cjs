"use strict";
const {chromium}=require("playwright"),assert=require("node:assert/strict"),fs=require("node:fs");
fs.mkdirSync("artifacts/web-retirement",{recursive:true});
async function test(browser,mobile){
 const ctx=await browser.newContext({viewport:mobile?{width:360,height:772}:{width:3840,height:2160},deviceScaleFactor:mobile?4:1});
 const page=await ctx.newPage(),label=mobile?"S23":"4K";
 try{
  await page.goto("http://127.0.0.1:8765/index.html#dual-projects",{waitUntil:"domcontentloaded"});
  assert(await page.locator("#dual-projects").count(),"Keep dual projects main site");
  assert.equal(await page.locator('a[href*="mobile-runtime.html"]').count(),0);
  assert(await page.locator('a[href="./native-download.html"]').count()>2);
  await page.screenshot({path:"artifacts/web-retirement/"+label+"-ORIGINAL-SITE-SAFE.png",fullPage:false});
  await page.goto("http://127.0.0.1:8765/mobile-runtime.html#6AX",{waitUntil:"domcontentloaded"});
  assert(await page.getByRole("heading",{name:"低階 Web 工作區已撤除"}).count());
  assert.equal(await page.locator("canvas").count(),0);
  await page.goto("http://127.0.0.1:8765/native-download.html",{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>{localStorage.setItem("AIG_CAD_DRAFT_TEST","KEEP_USER_DRAFT");localStorage.setItem("AIG_TOKEN_TEST","DO_NOT_EXPORT");});
  const downloadPromise=page.waitForEvent("download");
  await page.getByRole("button",{name:"匯出這台裝置的本機 CNC 工作備份"}).click();
  const file=await downloadPromise;
  assert.equal(file.suggestedFilename(),"AIG-local-CNC-drafts-backup.json");
  assert.equal(await page.evaluate(()=>localStorage.getItem("AIG_CAD_DRAFT_TEST")),"KEEP_USER_DRAFT");
  assert.equal(await page.evaluate(()=>localStorage.getItem("AIG_TOKEN_TEST")),"DO_NOT_EXPORT");
  const saved=await file.path();const data=JSON.parse(fs.readFileSync(saved,"utf8"));
  assert.equal(data.drafts.AIG_CAD_DRAFT_TEST,"KEEP_USER_DRAFT");
  assert(!("AIG_TOKEN_TEST" in data.drafts),"Do not export tokens");
  assert(await page.locator('a[href="https://github.com/nsxzxe911-a11y/AIG-II/releases"]').count());
  assert(await page.locator('a[href="https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/releases"]').count());
  await page.screenshot({path:"artifacts/web-retirement/"+label+"-NATIVE-RELEASE-PORTAL.png",fullPage:false});
  console.log("AIG_WEB_RETIRED_"+label+"_PASS");
 }finally{await ctx.close()}
}
(async()=>{const b=await chromium.launch({headless:true});try{await test(b,false);await test(b,true)}finally{await b.close()}})().catch(e=>{console.error("AIG_WEB_DECOMMISSION_BROWSER_FAIL",e.stack||e);process.exitCode=1;});
