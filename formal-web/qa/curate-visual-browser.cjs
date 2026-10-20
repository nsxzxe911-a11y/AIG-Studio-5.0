"use strict";
const {chromium}=require("playwright"),assert=require("node:assert/strict"),fs=require("node:fs");
fs.mkdirSync("artifacts/visual-curation",{recursive:true});
async function run(b,mobile){
 const name=mobile?"S23":"4K",ctx=await b.newContext({
  viewport:mobile?{width:360,height:772}:{width:3840,height:2160},deviceScaleFactor:mobile?4:1});
 const p=await ctx.newPage();
 try{
  const res=await p.goto("http://127.0.0.1:8765/image-library.html",{waitUntil:"domcontentloaded",timeout:30000});
  assert.equal(res.status(),200);
  const cards=p.locator("[data-visual-kind]");
  assert.equal(await cards.count(),20);
  const img=p.locator("main img");
  assert.equal(await img.count(),2,"Do not show old historical/icon/candidate imagery");
  await p.waitForFunction(()=>[...document.querySelectorAll('main img')].every(x=>x.complete&&x.naturalWidth>0),null,{timeout:15000});
  assert.equal(await p.locator('img[src*="visual-library/pages/"]').count(),0);
  assert.equal(await p.locator('img[src*="visual-library/icons/"]').count(),0);
  assert.equal(await p.locator('img[src*="visual-library/candidates/"]').count(),0);
  assert(await p.getByText("10/5 原始圖",{exact:true}).count());
  await p.locator('[data-visual-filter="mobile"]').click();
  assert.equal(await p.locator('[data-visual-kind]:visible').count(),11);
  await p.locator('[data-visual-filter="desktop"]').click();
  assert.equal(await p.locator('[data-visual-kind]:visible').count(),7);
  await p.locator('[data-visual-filter="reference"]').click();
  assert.equal(await p.locator('[data-visual-kind]:visible').count(),2);
  await p.locator('[data-visual-filter="all"]').click();
  await p.screenshot({path:"artifacts/visual-curation/"+name+"-CURATED-LIBRARY.png",fullPage:false});
  await p.goto("http://127.0.0.1:8765/index.html#dual-projects",{waitUntil:"domcontentloaded"});
  assert(await p.locator("#dual-projects").count(),"Original dual-project site must not disappear");
  assert(await p.locator('a[href="./image-library.html"]').count()>0);
  await p.goto("http://127.0.0.1:8765/native-download.html",{waitUntil:"domcontentloaded"});
  assert(await p.getByText("原生版本與下載核對").count());
  console.log("AIG_CURATED_IMAGE_"+name+"_PASS");
 }finally{await ctx.close()}
}
(async()=>{const b=await chromium.launch({headless:true});
try{await run(b,false);await run(b,true)}finally{await b.close()}})().catch(e=>{console.error("AIG_CURATED_VISUAL_BROWSER_FAIL",e.stack||e);process.exitCode=1});