"use strict";
const {chromium}=require("playwright");
const fs=require("node:fs"),assert=require("node:assert/strict");
const path=require("node:path");
async function inspect(browser,tag,width,height){
 const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:tag==="S23"?3:1});
 const page=await ctx.newPage();
 try{
  await page.goto("http://127.0.0.1:8765/image-library.html",{waitUntil:"load"});
  await page.locator(".module-card").first().waitFor();
  assert.equal(await page.locator(".module-card").count(),10);
  assert.equal(await page.locator(".reference img").count(),2);
  assert.equal(await page.locator('img[src*="/pages/"],img[src*="/icons/"],img[src*="/candidates/"]').count(),0);
  assert.equal(await page.locator(".module-card img").count(),0,"A missing authority must not gain a substitute");
  const broken=await page.locator("img").evaluateAll(list=>list.filter(x=>!x.complete||!x.naturalWidth).map(x=>x.src));
  assert.equal(broken.length,0,"Broken displayed reference images: "+broken.join(","));
  const pageSize=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,innerWidth:innerWidth}));
  assert(pageSize.scrollWidth<=pageSize.innerWidth+2,tag+" horizontal overflow "+JSON.stringify(pageSize));
  fs.mkdirSync("artifacts/aig-authority-cleanup",{recursive:true});
  await page.screenshot({path:path.resolve("artifacts/aig-authority-cleanup/"+tag+"-APPROVED-MANIFEST-GALLERY.png"),fullPage:true});
  await page.goto("http://127.0.0.1:8765/index.html#dual-projects",{waitUntil:"domcontentloaded"});
  assert.equal(await page.locator("#dual-projects").count(),1,"Original dual-project home removed");
  assert.equal(await page.locator('a[href="./image-library.html"]').count()>0,true);
  console.log("AIG_AUTHORITY_VISUAL_"+tag+"_PASS");
 }finally{await ctx.close()}
}
(async()=>{const browser=await chromium.launch({headless:true});try{await inspect(browser,"S23",360,772);await inspect(browser,"4K",3840,2160)}finally{await browser.close()}})().catch(e=>{console.error("AIG_AUTHORITY_VISUAL_FAIL",e.stack||e);process.exitCode=1});
