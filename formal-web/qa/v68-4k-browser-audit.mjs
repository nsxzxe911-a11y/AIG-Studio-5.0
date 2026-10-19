/* AIG V68 — REAL Chromium UHD / mobile high-density browser evidence.
 * Does not synthesize screenshot dimensions, photography, images or any fake NC.
 * 4K monitor = 3840x2160 physical browser screenshot; mobile DPR 4 S23-like.
 * Evidence separates actual CSS viewport, canvas backing pixels, WebGL channels
 * and image asset intrinsic resolution. Never labels them CNC/Authority PASS.
 */
import {chromium} from "playwright";
import {PNG} from "pngjs";
import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,"..");
const base=(process.env.AIG_V68_BASE_URL||"http://127.0.0.1:8765").replace(/\/$/,"");
const output=path.resolve(process.env.AIG_V68_AUDIT_OUT||path.join(here,"artifacts","v68"));
const profiles=[
 {id:"windows_4k_3840x2160",cssW:3840,cssH:2160,dpr:1,mode:"AUTO",phone:false},
 {id:"desktop_1080p_supersampled",cssW:1920,cssH:1080,dpr:1,mode:"ULTRA_4K",phone:false},
 {id:"android_1440x3088",cssW:360,cssH:772,dpr:4,mode:"AUTO",phone:true},
 {id:"android_1080x2316",cssW:360,cssH:772,dpr:3,mode:"AUTO",phone:true}
];
const pages=["HOME","CAD","CAM","SIM","3AX","4AX","5AX","6AX","NC","AI"];
const all={schema:"AIG_V68_4K_RGB_REAL_BROWSER_V1",when:new Date().toISOString(),
 commit:process.env.GITHUB_SHA||"unknown",base,
 profiles:[],captures:[],problems:[],
 sourceBitmapAuthority:"NON4K_IMAGE_SOURCES_NOT_MAGICALLY_UPSCALED",
 webglCollision:"UNVERIFIED",precision:"0.001MM_UNVERIFIED",
 exactRgbImageComparison:"NOT_CONNECTED",nativeApkExe:"PENDING",
 machines:"NO_MACHINE_OUTPUT"};
await fs.mkdir(output,{recursive:true});
function issue(profile,page,kind,detail,severity="WARNING"){
 all.problems.push({profile,page,kind,severity,detail:String(detail||"").slice(0,450)});
}
function metrics(buffer){const png=PNG.sync.read(buffer),n=png.width*png.height,step=Math.max(1,Math.floor(n/90000));
 let bright=0,sat=0,min=255,max=0,total=0;
 for(let i=0;i<n;i+=step){const j=i*4,r=png.data[j],g=png.data[j+1],b=png.data[j+2],avg=(r+g+b)/3;
  total++;min=Math.min(min,avg);max=Math.max(max,avg);
  if(avg>105)bright++;if(Math.max(r,g,b)-Math.min(r,g,b)>40) sat++;
 }
 return {width:png.width,height:png.height,brightnessFraction:bright/total,
  colorFraction:sat/total,colorRange:max-min,
  visualContentPresent:max-min>35&&bright/total>.0005};
}
async function snap(browserPage,profile,id){
 const buffer=await browserPage.screenshot({animations:"disabled",fullPage:false,timeout:18000});
 const dir=path.join(output,profile.id);await fs.mkdir(dir,{recursive:true});
 const file=path.join(dir,id+".png");await fs.writeFile(file,buffer);
 const m=metrics(buffer);
 all.captures.push({profile:profile.id,page:id,file:path.relative(output,file),metrics:m,source:"ACTUAL_BROWSER_PNG"});
 if(m.width!==profile.cssW*profile.dpr||m.height!==profile.cssH*profile.dpr)
  issue(profile.id,id,"SCREENSHOT_PIXEL_DIMENSION_MISMATCH",JSON.stringify(m),"FAIL");
 if(!m.visualContentPresent)issue(profile.id,id,"POSSIBLE_BLACK_SCREEN",JSON.stringify(m),"WARNING");
}
async function inspection(page){
 return page.evaluate(()=>{
  const visible=document.querySelector(".screen.active"),current=visible?.dataset.page;
  const quality=window.AIG_V68_VISUAL_QUALITY;
  const canvas=visible?.querySelector("canvas[data-glcanvas],canvas[data-cad-canvas],canvas[data-cam-canvas],.aig6-canvas,canvas[data-canvas]");
  const rect=canvas?.getBoundingClientRect();
  const gl=canvas?.getContext?.("webgl")||null;
  let colors=null;if(gl){try{colors={red:gl.getParameter(gl.RED_BITS),green:gl.getParameter(gl.GREEN_BITS),
   blue:gl.getParameter(gl.BLUE_BITS),alpha:gl.getParameter(gl.ALPHA_BITS)}}catch(e){colors={error:String(e)}}}
  return {activePage:current,
   quality:quality?.inspect?.()||null,
   browserPixelRatio:window.devicePixelRatio,viewWidth:innerWidth,viewHeight:innerHeight,
   documentWidth:document.documentElement.scrollWidth,screenWidth:document.documentElement.clientWidth,
   canvas:canvas&&rect?{cssW:rect.width,cssH:rect.height,
    width:canvas.width,height:canvas.height,
    actualDpr:rect.width>0?canvas.width/rect.width:0,visible:rect.width>0&&rect.height>0,
    pixelCount:canvas.width*canvas.height}:null,glColorBits:colors,
   rgbStyle:!![...document.styleSheets].some(s=>String(s.href||"").includes("v68-rgb-4k.css")),
   visualLayoutMode:document.documentElement.dataset.aig68VisualMode||null};
 });
}
function inspectQuality(p,id,d){
 if(!d.quality){issue(p.id,id,"QUALITY_POLICY_MISSING","No V68 display policy loaded","FAIL");return}
 if(d.quality.mode!==p.mode)issue(p.id,id,"QUALITY_MODE_NOT_APPLIED",d.quality.mode+" != "+p.mode,"FAIL");
 if(d.documentWidth>d.screenWidth+5)issue(p.id,id,"HORIZONTAL_OVERFLOW",d.documentWidth+" vs "+d.screenWidth,"WARNING");
 if(d.canvas?.visible){
  if(d.canvas.width<1||d.canvas.height<1)issue(p.id,id,"BACKING_BUFFER_EMPTY","0 pixel bitmap","FAIL");
  if(d.canvas.pixelCount>8294400)issue(p.id,id,"PIXEL_BUDGET_EXCEEDED",d.canvas.pixelCount,"WARNING");
  if(d.canvas.actualDpr<.95)issue(p.id,id,"PIXEL_DENSITY_TOO_LOW",d.canvas.actualDpr,"WARNING");
 }
 if(d.glColorBits&&d.glColorBits.red!==undefined&&d.glColorBits.red<8)
  issue(p.id,id,"WEBGL_COLOR_DEPTH_LOW",JSON.stringify(d.glColorBits),"WARNING");
}
let browser;
try{
 browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage",
  "--use-gl=angle","--use-angle=swiftshader","--enable-webgl","--ignore-gpu-blocklist"]});
 for(const p of profiles){
  const ctx=await browser.newContext({viewport:{width:p.cssW,height:p.cssH},deviceScaleFactor:p.dpr,
   isMobile:p.phone,hasTouch:p.phone,locale:"zh-TW",reducedMotion:"reduce",serviceWorkers:"block"});
  const page=await ctx.newPage(),summary={id:p.id,qualityMode:p.mode,checks:[],fatal:null};
  page.on("pageerror",e=>issue(p.id,"ALL","JS_EXCEPTION",String(e),"WARNING"));
  page.setDefaultTimeout(12000);
  try{
   // PUBLIC WEBSITE: actual text scales for 4K viewport; source bitmap remains source size.
   await page.goto(base+"/index.html",{waitUntil:"domcontentloaded",timeout:45000});
   await page.waitForTimeout(250);
   const publicSize=await page.evaluate(()=>({
    containerWidth:document.querySelector(".site-container")?.getBoundingClientRect()?.width||0,
    viewportWidth:innerWidth,rgbCssLoaded:[...document.styleSheets].some(s=>
     String(s.href||"").includes("v68-rgb-4k.css")),
    imageSources:[...document.images].slice(0,10).map(img=>({
     src:img.getAttribute("src")||"",naturalW:img.naturalWidth,naturalH:img.naturalHeight
    }))}));
   summary.publicSite=publicSize;
   if(p.cssW>=3840&&publicSize.containerWidth<1450)issue(p.id,"START","4K_PUBLIC_LAYOUT_NOT_WIDE",
    "Container width "+publicSize.containerWidth,"WARNING");
   await snap(page,p,"PUBLIC_HOME");
   // WORKSPACE: keep original data; no .click() on CNC Run, NC verify or CAD Clear.
   await page.goto(base+"/mobile-runtime.html#HOME",{waitUntil:"domcontentloaded",timeout:45000});
   await page.waitForFunction(()=>!!window.AIG_V68_VISUAL_QUALITY,{timeout:9000});
   await page.locator(".aig67-global-trigger").waitFor({state:"visible",timeout:9000});
   if(p.mode==="ULTRA_4K"){
    await page.locator(".aig67-global-trigger").click();
    await page.locator('[data-aig68-quality="ULTRA_4K"]').click();
    await page.waitForFunction(()=>window.AIG_V68_VISUAL_QUALITY?.inspect?.().mode==="ULTRA_4K",{timeout:6000});
   }
   const pre=await inspection(page);summary.quality=pre.quality;
   // DOM page navigation uses the existing real V67 router via visible button.
   for(const id of pages){
    try{
     if(id!=="HOME"){
      const btn=page.locator(".aig67-global-trigger");
      await btn.click({timeout:4000,noWaitAfter:true});
      await page.locator('.aig67-global-panel [data-aig67-global-route="'+id+'"]').click({timeout:4000,noWaitAfter:true});
     }
     await page.locator('.screen.active[data-page="'+id+'"]').waitFor({state:"visible",timeout:9000});
     await page.waitForTimeout(id.endsWith("AX")?500:170);
     const d=await inspection(page);
     summary.checks.push({page:id,info:d});
     inspectQuality(p,id,d);
     if(d.activePage!==id)issue(p.id,id,"REAL_NAV_NOT_CORRECT",d.activePage,"FAIL");
     if(["HOME","CAD","CAM","6AX","NC","AI"].includes(id))await snap(page,p,id);
    }catch(e){issue(p.id,id,"PAGE_RENDRER_OR_ROUTER_FAILED",String(e),"FAIL");}
   }
  }catch(e){summary.fatal=String(e);issue(p.id,"ALL","PROFILE_FATAL",String(e),"FAIL")}
  all.profiles.push(summary);await ctx.close();
 }
}finally{if(browser)await browser.close()}
const fails=all.problems.filter(x=>x.severity==="FAIL"),warn=all.problems.filter(x=>x.severity==="WARNING");
all.summary={profiles:profiles.length,realScreenshotCount:all.captures.length,
 failureCount:fails.length,warningCount:warn.length,
 desktop4KScreenshot:all.captures.some(x=>x.profile==="windows_4k_3840x2160"&&x.metrics.width===3840&&x.metrics.height===2160),
 mobileNative1440:all.captures.some(x=>x.profile==="android_1440x3088"&&x.metrics.width===1440&&x.metrics.height===3088),
 rgbOriginalAuthority:"PENDING",
 webpageRenderGate:fails.length?"FAIL":"SOURCE_AND_BROWSER_VIEWPORT_PASS_WITH_WARNINGS",
 releaseGate:"BLOCKED_PENDING_IMAGE_AUTHORITY_ANDROID_WINDOWS_AND_CNC_SAFETY"};
await fs.writeFile(path.join(output,"report.json"),JSON.stringify(all,null,2));
await fs.writeFile(path.join(output,"report.md"),[
 "# AIG V68 Real 4K RGB Chromium Audit",
 "Commit: "+all.commit,
 "Screenshots: "+all.summary.realScreenshotCount,
 "Actual Windows 4K capture: "+all.summary.desktop4KScreenshot,
 "Actual mobile 1440x3088 capture: "+all.summary.mobileNative1440,
 "Problems: "+fails.length+" FAIL / "+warn.length+" WARNING",
 "RGB Authority originals: NOT_UPSCALED — platform validation pending",
 "CNC 0.001mm/material-removal/6-axis safety: NOT_CERTIFIED",
 "## Findings",
 ...all.problems.map(x=>"- "+x.severity+" "+x.profile+" "+x.page+" "+x.kind+": "+x.detail)
 ].join("\n"));
console.log("AIG_V68_4K_CHROMIUM|"+JSON.stringify(all.summary));
if(fails.length)process.exitCode=1;
