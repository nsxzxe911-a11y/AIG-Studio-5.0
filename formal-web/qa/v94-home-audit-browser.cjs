"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),{chromium}=require("playwright");
fs.mkdirSync("artifacts/v94",{recursive:true});
const repo="nsxzxe911-a11y/AIG-Studio-5.0",sha="0123456789abcdef0123456789abcdef01234567";
const release=(name,apk,exe)=>[{
 tag_name:name,draft:false,prerelease:false,published_at:"2026-10-06T04:00:00Z",
 assets:[
 {name:apk,size:1234000,browser_download_url:"https://github.com/nsxzxe911-a11y/"+(name.startsWith("studio")?"AIG-Studio-5.0":"AIG-II")+"/releases/download/"+name+"/"+apk},
 {name:exe,size:5678000,browser_download_url:"https://github.com/nsxzxe911-a11y/"+(name.startsWith("studio")?"AIG-Studio-5.0":"AIG-II")+"/releases/download/"+name+"/"+exe}
]}];
async function run(b,mobile){
 const kind=mobile?"S23":"4K";
 const ctx=await b.newContext({viewport:mobile?{width:360,height:772}:{width:3840,height:2160},deviceScaleFactor:mobile?4:1});
 const p=await ctx.newPage();
 try{
  await p.route("https://api.github.com/repos/**",async route=>{
   const url=new URL(route.request().url()),path=url.pathname;
   let body;
   if(path.includes("/git/ref/heads/"))body={object:{sha}};
   else if(path.includes("/actions/runs"))body={workflow_runs:[{head_sha:sha,name:"AIG V94 HOME Audit Download Gate",
     id:999001,status:"completed",conclusion:"success",
     created_at:"2026-10-20T00:00:00Z",html_url:"https://github.com/"+repo+"/actions/runs/999001"}]};
   else if(path.includes("/AIG-II/releases"))body=release("aig-legacy-test","AIG_II_FULL_INSTALLABLE.apk","AIG_II_SETUP.exe");
   else if(path.includes("/AIG-Studio-5.0/releases"))body=release("studio-legacy-test","AIG_Studio_372_RGB.apk","AIG_Studio_SETUP.exe");
   else return route.abort();
   await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(body)});
  });
  await p.goto("http://127.0.0.1:8765/mobile-runtime.html#HOME",{waitUntil:"domcontentloaded",timeout:35000});
  await p.waitForFunction(()=>window.AIG_HOME_V94_AUDIT?.inspect()?.valid===true,{timeout:20000});
  const native=await p.evaluate(()=>window.AIG_HOME_V93.inspect());
  assert(native.mounted&&native.nativeCad&&native.nativeCam&&native.nativeNc,"original HOME live data missing");
  const trigger=p.locator('.screen.active [data-button-id="BTN_HOME_V94_AUDIT_DOWNLOAD"]');
  assert(await trigger.count()===1);
  await trigger.click();
  const overlay=p.locator(".aig94-overlay");
  assert(await overlay.isVisible(),"HOME audit modal must be visible");
  assert(await overlay.getByText("來源／畫面 PASS").count()>0);
  assert(await overlay.getByText("BLOCKED").count()>0,"CNC Output must remain BLOCKED");
  assert(await overlay.getByText("歷史發布").count()>0,"Old APK/EXE must not look current");
  assert.equal(await overlay.locator('a.aig94-file-download[href*="/releases/download/"]').count(),4,
   "Only real published Release browser_download_url links allowed");
  await p.screenshot({path:"artifacts/v94/"+kind+"-HOME-AUDIT-DOWNLOAD.png",fullPage:false});
  await overlay.locator('[data-aig94-close]').click();
  assert(!(await overlay.isVisible()));
  await p.locator('.screen.active .aig93-nav-btn[data-open-page="6AX"]').click();
  await p.waitForSelector('.screen.active[data-page="6AX"]',{timeout:20000});
  assert(await p.locator('.screen.active canvas[data-glcanvas]').count());
  console.log("AIG_V94_"+kind+"_LIVE_HOME_DOWNLOAD_GATE_PASS");
 }finally{await ctx.close()}
}
(async()=>{const b=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--use-gl=angle","--use-angle=swiftshader"]});try{await run(b,false);await run(b,true)}finally{await b.close()}})().catch(e=>{console.error("AIG_V94_BROWSER_FAIL",e.stack||e);process.exitCode=1});
