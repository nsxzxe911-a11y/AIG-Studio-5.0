/* AIG V67: all first-level public HTML pages visual crawler. Read-only.
 * Separate from real CNC runtime 11-page/subpage Chromium gate.
 */
import {chromium} from "playwright";
import {PNG} from "pngjs";
import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,"..");
const base=(process.env.AIG_V67_BASE_URL||"http://127.0.0.1:8765").replace(/\/$/,"");
const out=path.resolve(process.env.AIG_V67_AUDIT_OUT||path.join(here,"artifacts","v67"));
const profiles=[
 {id:"public_desktop",width:1920,height:1080,dpr:1,mobile:false},
 {id:"public_mobile",width:360,height:772,dpr:3,mobile:true}
];
const routes=(await fs.readdir(root)).filter(name=>/\.html$/i.test(name)&&name!=="mobile-runtime.html").sort();
const report={schema:"AIG_V67_ALL_PUBLIC_PAGES_VISUAL",date:new Date().toISOString(),
 source:"REAL_CHROMIUM_NOT_STATIC_MOCK",base,routes,profiles:[],captures:[],issues:[],
 authorityGate:"PENDING_PLATFORM_SPECIFIC_EXACT_REFERENCE",machineSafety:"BLOCKED"};
await fs.mkdir(out,{recursive:true});
const problem=(type,profile,route,detail)=>report.issues.push({type,profile,route,detail:String(detail)});
function metrics(buf){
 const p=PNG.sync.read(buf),step=Math.max(1,Math.floor(p.width*p.height/100000));
 let bright=0,dark=0,colored=0,n=0,low=255,high=0;
 for(let i=0;i<p.width*p.height;i+=step){const j=i*4,r=p.data[j],g=p.data[j+1],b=p.data[j+2],y=(r+g+b)/3;
  n++;low=Math.min(low,y);high=Math.max(high,y);
  if(y<23)dark++;if(y>95)bright++;if(Math.max(r,g,b)-Math.min(r,g,b)>34&&Math.max(r,g,b)>88)colored++}
 return{width:p.width,height:p.height,brightRatio:bright/n,darkRatio:dark/n,rgbPixelsRatio:colored/n,
  dynamicRange:high-low,blankRisk:high-low<20||bright/n<.0004};
}
let browser;
try{
 browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--use-gl=angle","--use-angle=swiftshader"]});
 for(const pr of profiles){
  const context=await browser.newContext({viewport:{width:pr.width,height:pr.height},
   deviceScaleFactor:pr.dpr,isMobile:pr.mobile,hasTouch:pr.mobile,locale:"zh-TW",reducedMotion:"reduce",serviceWorkers:"block"});
  const page=await context.newPage(),stats={id:pr.id,checked:0,failed:0};
  page.setDefaultTimeout(10000);
  for(const route of routes){
   try{
    const response=await page.goto(base+"/"+encodeURIComponent(route),{waitUntil:"domcontentloaded",timeout:35000});
    await page.waitForTimeout(260);
    const dom=await page.evaluate(()=>({
     title:document.title,documentWidth:document.documentElement.scrollWidth,
     viewportWidth:document.documentElement.clientWidth,
     internalLinks:[...document.querySelectorAll("a[href]")].filter(a=>a.href.startsWith(location.origin)).length,
     missingImages:[...document.images].filter(i=>i.complete&&i.naturalWidth===0)
      .map(i=>i.currentSrc||i.src).slice(0,15),
     bodyText:document.body?.innerText?.slice(0,1200)||"",
     nativeButtons:document.querySelectorAll("button,[role=button]").length,
     portalRegistry:window.AIG_V67_PORTAL_REGISTRY?.inspect?.()||null,
    }));
    if(response?.status()!==200)problem("HTTP_STATUS",pr.id,route,response?.status());
    if(dom.documentWidth>dom.viewportWidth+4)problem("HORIZONTAL_OVERFLOW",pr.id,route,
     dom.documentWidth+"px vs "+dom.viewportWidth+"px");
    if(dom.missingImages.length)problem("BROKEN_IMAGES",pr.id,route,dom.missingImages.join("; "));
    if(route==="index.html"&&!dom.portalRegistry?.ready)
     problem("PORTAL_ID_AUDIT_MISSING",pr.id,route,"START links not mapped");
    const directory=path.join(out,pr.id);await fs.mkdir(directory,{recursive:true});
    const fn=path.join(directory,route.replace(".html",".png"));
    const img=await page.screenshot({path:fn,animations:"disabled",fullPage:false,timeout:17000});
    const pix=metrics(img);
    report.captures.push({profile:pr.id,route,file:path.relative(out,fn),status:"SCREENSHOT_PRESENT_AUTHORITY_PENDING",dom:{...dom,bodyText:undefined},pixels:pix});
    if(pix.blankRisk)problem("POSSIBLY_BLANK",pr.id,route,JSON.stringify(pix));
    stats.checked++;
   }catch(e){stats.failed++;problem("PAGE_FAIL",pr.id,route,String(e))}
  }
  report.profiles.push(stats);await context.close();
 }
}finally{if(browser)await browser.close()}
report.summary={routes:routes.length,totalScreenshots:report.captures.length,
 failures:report.profiles.reduce((n,x)=>n+x.failed,0),issues:report.issues.length,
 release:"BLOCKED_NO_EXACT_PLATFORM_IMAGE_AUTHORITY_AND_CNC_GATE"};
await fs.writeFile(path.join(out,"public-report.json"),JSON.stringify(report,null,2));
console.log("AIG_V67_ALL_PUBLIC_SITE_SCREENSHOTS|"+JSON.stringify(report.summary));
if(report.summary.failures>0)process.exitCode=1;
