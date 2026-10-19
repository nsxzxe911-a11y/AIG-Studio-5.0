/* AIG V67 WHOLE-WEBSITE REAL CHROMIUM SCREENSHOT AUDITOR
 * Evidence-only. No destructive CNC actions; does not modify user projects.
 * Page/Subpage/Button IDs must be grounded in the runtime contract. Images
 * without latest approved SHA remain AUTHORITY_MISSING (never fake PASS).
 */
import {chromium} from "playwright";
import {PNG} from "pngjs";
import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const base=(process.env.AIG_V67_BASE_URL||"http://127.0.0.1:8765").replace(/\/$/,"");
const out=path.resolve(process.env.AIG_V67_AUDIT_OUT||path.join(here,"artifacts","v67"));
const [contract,authority]=await Promise.all([
 fs.readFile(path.join(root,"runtime/v67-page-subpage-contract.json"),"utf8").then(JSON.parse),
 fs.readFile(path.join(root,"authority/v67-authority-ledger.json"),"utf8").then(JSON.parse)
]);
const profiles=[
 {id:"desktop_4k",platform:"DESKTOP",width:3840,height:2160,dpr:1,isMobile:false},
 {id:"mobile_1440",platform:"MOBILE",width:360,height:772,dpr:4,isMobile:true},
 {id:"mobile_compact",platform:"MOBILE",width:360,height:772,dpr:2,isMobile:true,layoutOnly:true},
 {id:"mobile_landscape",platform:"MOBILE",width:915,height:412,dpr:1,isMobile:true,layoutOnly:true}
];
const all={schema:"AIG_V67_REAL_CHROMIUM_AUDIT_V1",created:new Date().toISOString(),
 base,branch:process.env.GITHUB_REF_NAME||"manual",commit:process.env.GITHUB_SHA||"unknown",
 browser:"Chromium Playwright",testProfiles:profiles,
 contract:{pages:contract.pageCount,subpages:contract.pages.reduce((s,p)=>s+p.subpages.length,0)},
 authority:{totalMainPairs:authority.pagePlatforms.length,totalSubpagePairs:authority.subpagePlatforms.length,
  missing:authority.summary.missing,revoked:authority.revoked.count,
  styleReferenceOnly:true},
 captures:[],issues:[],profiles:[],consoleErrors:[],visionModelStatus:"NOT_CONNECTED",
 visualRelease:"BLOCKED_AUTHORITY_NOT_APPROVED",cncRelease:"BLOCKED",
 warning:"Screenshots and pixel heuristics alone cannot confirm Authority equality, 0.001mm material removal, kinematics, TCP, Fanuc safety or true AI semantic vision."};
await fs.mkdir(out,{recursive:true});
function issue(type,profile,page,subpage,detail,severity="WARNING"){
 all.issues.push({type,profile,page,subpage:subpage||null,detail:String(detail||""),severity});
}
function basename(s){return String(s).replace(/[^A-Za-z0-9_.-]/g,"_").slice(0,110)}
function imageMetrics(raw){
 try{
  const png=PNG.sync.read(raw),n=png.width*png.height,step=Math.max(1,Math.floor(n/150000));
  let min=255,max=0,colored=0,bright=0,dark=0,samples=0;
  for(let i=0;i<n;i+=step){const j=i*4,r=png.data[j],g=png.data[j+1],b=png.data[j+2],l=(r+g+b)/3;
   samples++;min=Math.min(min,l);max=Math.max(max,l);
   if(Math.max(r,g,b)-Math.min(r,g,b)>30&&Math.max(r,g,b)>75)colored++;
   if(l>90)bright++;
   if(l<23)dark++;
  }
  return {pixelWidth:png.width,pixelHeight:png.height,approxRGBFraction:colored/samples,
   brightFraction:bright/samples,darkFraction:dark/samples,dynamicRange:max-min,
   heuristicStatus:max-min<30||bright/samples<.001?"POSSIBLY_BLANK_OR_BLACK":"PIXELS_PRESENT_NOT_SEMANTIC_PASS"};
 }catch(e){return{heuristicStatus:"PNG_ANALYSIS_FAILED",error:String(e?.message||e)}}
}
async function screenshot(page,profile,pageId,subId="MAIN",locator=null){
 const dir=path.join(out,profile.id,basename(pageId));await fs.mkdir(dir,{recursive:true});
 const filename=path.join(dir,basename(subId)+".png");
 try{
  // A moving CNC control cannot satisfy locator.screenshot()'s stability
  // check while WebGL keeps rendering. Capture the visible rectangle from the
  // same REAL Chromium viewport instead; never scroll/alter the CNC scene.
  let captureMode="VIEWPORT",clipped=false;
  let buf;
  if(locator){
   const box=await locator.boundingBox({timeout:3500});
   if(!box)throw Error("REGION_NOT_ATTACHED_OR_NOT_VISIBLE");
   const view=page.viewportSize();
   const x=Math.max(0,box.x),y=Math.max(0,box.y);
   const right=Math.min(view.width,box.x+box.width);
   const bottom=Math.min(view.height,box.y+box.height);
   if(right-x<2||bottom-y<2){
    issue("REGION_NOT_IN_VISIBLE_VIEWPORT",profile.id,pageId,subId,
      "Region exists but is outside the active view. Screenshot not counted as PASS.","WARNING");
    return null;
   }
   clipped=x!==box.x||y!==box.y||right<box.x+box.width||bottom<box.y+box.height;
   if(clipped)issue("REGION_PARTIALLY_OUTSIDE_VIEWPORT",profile.id,pageId,subId,
     "Visible region was clipped; not a full subpage capture.","WARNING");
   buf=await page.screenshot({timeout:16000,animations:"disabled",
     clip:{x,y,width:right-x,height:bottom-y}});
   captureMode="VISIBLE_REGION_CROP";
  }else{
   buf=await page.screenshot({timeout:20000,animations:"disabled",fullPage:false});
  }
  await fs.writeFile(filename,buf);
  const m=imageMetrics(buf),relative=path.relative(out,filename);
  all.captures.push({profile:profile.id,page:pageId,subpage:subId,
   file:relative,metrics:m,captureMode,clipped,
   source:"REAL_CHROMIUM",approvedAuthorityComparison:"NOT_AVAILABLE"});
  if(m.heuristicStatus!=="PIXELS_PRESENT_NOT_SEMANTIC_PASS")
   issue("IMAGE_RENDER_HEURISTIC",profile.id,pageId,subId,m.heuristicStatus,"WARNING");
  return relative;
 }catch(e){issue("SCREENSHOT_FAILED",profile.id,pageId,subId,String(e),"FAIL");return null}
}
async function inspectRuntime(page,id){
 return await page.evaluate(id=>{
 const screen=document.querySelector('.screen.active[data-page="'+id+'"]');
 const reg=window.AIG_V67_CONTROL_REGISTRY;
 const screenRect=screen?.getBoundingClientRect();
 const controls=screen?[...screen.querySelectorAll("button,input[type=button],input[type=range],input[type=checkbox],select[data-axis]")].map(n=>{
  const r=n.getBoundingClientRect(),sty=getComputedStyle(n);
  return {id:n.dataset.aig67ButtonId||null,legacyId:n.dataset.buttonId||null,
   callback:n.dataset.aig67CallbackEvidence||"MISSING",
   issue:n.dataset.aig67Issue||null,
   visible:r.width>0&&r.height>0&&sty.visibility!=="hidden"&&sty.display!=="none",
   withinScreen:r.top>=-3&&r.left>=-3&&r.bottom<=innerHeight+3&&r.right<=innerWidth+3,
   disabled:!!n.disabled,area:Math.round(r.width*r.height)};
 }):[];
 return{
  active:screen?.dataset.page||null,
  rect:screenRect?{w:screenRect.width,h:screenRect.height}:null,
  viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio,
   documentScrollWidth:document.documentElement.scrollWidth,
   documentClientWidth:document.documentElement.clientWidth},
  navCount:document.querySelectorAll(".nav button[data-page]").length,
  realNavigation:window.AIG_V67_GLOBAL_NAV?.inspect?.()||null,
  originalNcExists:!!document.querySelector('.screen[data-page="NC"] [data-nc-code]'),
  originalCadExists:!!document.querySelector('.screen[data-page="CAD"] [data-cad-canvas]'),
  originalCamExists:!!document.querySelector('.screen[data-page="CAM"] [data-cam-canvas]'),
  screenCanvasCount:screen?.querySelectorAll("canvas").length||0,
  screenPanelCount:screen?.querySelectorAll(".panel").length||0,
  errors:screen?[...screen.querySelectorAll(".aigIssueCenter,.ncAlarm.show,[role=alert]")].map(n=>n.textContent?.trim().slice(0,200)).filter(Boolean).slice(0,10):[],
  globalAudit:reg?.inspect?.()||null,controls,
  lazy:window.AIG_6AX_V66_LOADER?.inspect?.()?.state||"NOT_REGISTERED",
  webgl:window.AIG_6AX_MECHANISM_PREVIEW_V1?.inspect?.()||null,
  fileExt:"no_state_mutation"
 };
 },id);
}
async function navigateRuntime(page,id){
 const errors=[];let mode="NOT_NAVIGATED";
 const global=page.locator(".aig67-global-trigger");
 const item=page.locator('.aig67-global-panel button[data-aig67-global-route="'+id+'"]');
 if(await global.count()&&await global.isVisible().catch(()=>false)&&await item.count()){
  try{await global.click({timeout:3800,noWaitAfter:true});await item.click({timeout:3800,noWaitAfter:true});
   mode="VISIBLE_V67_ROUTER_BUTTON"}catch(e){errors.push("V67 "+String(e).slice(0,200))}
 }
 if(mode==="NOT_NAVIGATED"){
  const legacy=page.locator('.nav button[data-page="'+id+'"]');
  if(await legacy.count()&&await legacy.isVisible().catch(()=>false)){
   try{await legacy.click({timeout:3000,noWaitAfter:true});mode="VISIBLE_LEGACY_NAV"}catch(e){errors.push("LEGACY "+String(e).slice(0,160))}
  }
 }
 if(mode==="NOT_NAVIGATED"){
  const links=page.locator('.screen.active [data-open-page="'+id+'"]:visible');
  if(await links.count()){
   try{await links.first().click({timeout:3500,noWaitAfter:true});mode="VISIBLE_PAGE_LINK"}catch(e){errors.push("PAGE_LINK "+String(e).slice(0,160))}
  }
 }
 if(mode==="NOT_NAVIGATED"){
  // Read-only browser audit fallback: navigate via the REAL existing router.
  // Flag the missing visible user route, never count this as a user-click PASS.
  const succeeded=await page.evaluate(id=>{
   try{return !!window.aigProductionPageRouter?.navigateView?.("VIEW.NAV."+id)}catch(_){return false}
  },id);
  mode=succeeded?"DIRECT_ROUTER_FALLBACK_NOT_UI_PROVEN":"NO_NAV_ROUTE";
  issue("VISIBLE_NAVIGATION_UNAVAILABLE","BROWSER",id,null,
   "Only internal router could open page; details: "+errors.join("; "),"WARNING");
 }
 await page.locator('.screen.active[data-page="'+id+'"]').waitFor({state:"visible",timeout:9000});
 await page.waitForTimeout(id.endsWith("AX")?700:180);
 return mode;
}
async function profileRun(browser,profile){
 const context=await browser.newContext({
  viewport:{width:profile.width,height:profile.height},deviceScaleFactor:profile.dpr,
  isMobile:profile.isMobile,hasTouch:profile.isMobile,
  reducedMotion:"reduce",locale:"zh-TW",serviceWorkers:"block"
 });
 const page=await context.newPage();page.setDefaultTimeout(12000);
 const result={profile:profile.id,pages:[],errorCount:0,renderCandidates:[],authorityPending:0};
 page.on("pageerror",e=>{result.errorCount++;all.consoleErrors.push({profile:profile.id,type:"pageerror",message:String(e).slice(0,600)})});
 page.on("console",m=>{if(m.type()==="error")all.consoleErrors.push({profile:profile.id,type:"console",message:m.text().slice(0,600)})});
 try{
  await page.goto(base+"/index.html",{waitUntil:"domcontentloaded",timeout:45000});
  await page.waitForTimeout(500);
  await screenshot(page,profile,"START","MAIN");
  const portal=await page.evaluate(()=>({title:document.title,
   links:[...document.querySelectorAll('a[href]')].length,
   workspace:!!document.querySelector('a[href*="mobile-runtime.html"]'),
   portalIds:window.AIG_V67_PORTAL_REGISTRY?.inspect?.()||null,
   scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}));
  result.pages.push({page:"START",portal});
  if(!portal.workspace)issue("START_WORKSPACE_LINK_MISSING",profile.id,"START",null,"Public portal has no runtime link","FAIL");
  if(!portal.portalIds?.ready)issue("START_CONTROL_IDS_MISSING",profile.id,"START",null,"Portal links/buttons not uniquely ID-verified","WARNING");
  if(portal.scrollWidth>portal.clientWidth+4)issue("HORIZONTAL_OVERFLOW",profile.id,"START",null,"Public portal overflows viewport","WARNING");
  if(profile.layoutOnly){await context.close();all.profiles.push(result);return}
  await page.goto(base+"/mobile-runtime.html#HOME",{waitUntil:"domcontentloaded",timeout:45000});
  await page.locator('.screen.active[data-page="HOME"]').waitFor({state:"attached",timeout:16000});
  try{await page.waitForFunction(()=>window.AIG_V67_CONTROL_REGISTRY?.inspect?.().ready,{timeout:8500})}
  catch(e){issue("ID_REGISTRY_INIT_FAILED",profile.id,"HOME",null,String(e),"FAIL")}
  for(const spec of contract.pages.filter(p=>p.kind==="runtime")){
   const id=spec.id;
   try{
    const routeMethod=id==="HOME"?"ENTRY_HASH":await navigateRuntime(page,id);
    await page.waitForTimeout(180);
    if(id==="6AX"){try{await page.waitForFunction(()=>["READY","FAILED"].includes(window.AIG_6AX_V66_LOADER?.inspect?.()?.state),{timeout:13000})}catch(_){}
     const switcher=page.locator(".screen.active[data-page='6AX'] .aig6-toggle");
     if(await switcher.count())try{await switcher.click({timeout:4500,noWaitAfter:true})}catch(e){
      issue("6AX_VISUAL_OPEN_FAIL",profile.id,id,null,String(e),"WARNING")}
    }
    const info=await inspectRuntime(page,id);
    result.pages.push({page:id,info,routeMethod});
    if(info.active!==id)issue("PAGE_NOT_ACTIVE",profile.id,id,null,"SPA actual view mismatch","FAIL");
    if(!info.originalNcExists||!info.originalCadExists||!info.originalCamExists)
     issue("CORE_EDITOR_DISAPPEARED",profile.id,id,null,"CAD/CAM/NC root not retained","FAIL");
    if(info.viewport.documentScrollWidth>info.viewport.documentClientWidth+4)
     issue("HORIZONTAL_OVERFLOW",profile.id,id,null,JSON.stringify(info.viewport),"WARNING");
    const unmapped=info.controls.filter(n=>n.issue||!n.id);
    if(unmapped.length)issue("BUTTON_ID_UNMAPPED",profile.id,id,null,
      unmapped.length+" controls have missing, duplicate or unclassified IDs","WARNING");
    const badRects=info.controls.filter(n=>n.visible&&n.area<100);
    if(badRects.length)issue("TINY_INTERACTIVE_TARGET",profile.id,id,null,badRects.length+" visible controls <100px²","WARNING");
    if(info.errors.length)issue("RUNTIME_ALERT_VISIBLE",profile.id,id,null,info.errors.join(" ; "),"WARNING");
    const approved=authority.pagePlatforms.find(x=>x.pageId===spec.pageId&&x.platform===profile.platform);
    if(!approved?.approved){result.authorityPending++;issue("PAGE_AUTHORITY_MISSING",profile.id,id,"MAIN",
     "Exact approved RGB image/SHA is not registered; screenshot is evidence, not authority","BLOCKED")}
    await screenshot(page,profile,id,"MAIN");
    for(const sub of spec.subpages){
     if(sub.kind==="PENDING"){
      issue("SUBPAGE_NOT_IMPLEMENTED",profile.id,id,sub.id,"Registered pending subpage; cannot claim interaction","BLOCKED");continue;
     }
     const loc=page.locator('.screen.active[data-page="'+id+'"] '+sub.selector).first();
     if(!(await loc.count())){issue("SUBPAGE_SELECTOR_MISSING",profile.id,id,sub.id,sub.selector,"WARNING");continue}
     if(sub.kind==="NAVIGABLE"&&/^(3AX|4AX|5AX|6AX)$/.test(id)){
      try{await loc.click({timeout:3500,noWaitAfter:true});await page.waitForTimeout(180);
       const state=await page.locator('.screen.active[data-page="'+id+'"] .simgrid[data-runtime="'+id+'"]').first()
        .getAttribute("data-axis-subpage");
       if(state!==sub.id.slice(("SUBPAGE_"+id+"_").length))
        issue("SUBPAGE_CLICK_NO_TRANSITION",profile.id,id,sub.id,"Current axis pane: "+state,"FAIL");
       await screenshot(page,profile,id,sub.id);
      }catch(e){issue("SUBPAGE_NAV_FAILED",profile.id,id,sub.id,String(e),"WARNING")}
     }else if(await loc.isVisible().catch(()=>false)){
      if(sub.kind==="NAVIGABLE")await screenshot(page,profile,id,sub.id);
      else{
       try{await screenshot(page,profile,id,sub.id,loc)}
       catch(e){issue("REGION_CAPTURE_FAILED",profile.id,id,sub.id,String(e),"WARNING")}
      }
     }else issue("SUBPAGE_REGION_NOT_VISIBLE",profile.id,id,sub.id,"Requires real pane navigation or unfinished region","WARNING");
    }
   }catch(e){issue("PAGE_AUDIT_FAILED",profile.id,id,null,String(e),"FAIL");result.errorCount++}
  }
 }catch(e){issue("PROFILE_FATAL",profile.id,"ALL",null,String(e),"FAIL");result.errorCount++}
 await context.close();all.profiles.push(result);
}
let browser;
try{
 browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--use-gl=angle",
  "--use-angle=swiftshader","--enable-webgl","--ignore-gpu-blocklist"]});
 for(const p of profiles)await profileRun(browser,p);
}finally{if(browser)await browser.close()}
const issuesByStatus={};for(const s of ["FAIL","WARNING","BLOCKED"])issuesByStatus[s]=all.issues.filter(x=>x.severity===s).length;
all.summary={screenshots:all.captures.length,profiles:all.profiles.length,
 pageContractCount:contract.pageCount,subpageContractCount:all.contract.subpages,
 issues:issuesByStatus,releaseGate:"BLOCKED",
 screenshotGate:issuesByStatus.FAIL===0?"CAPTURED_CHECK_WARNINGS":"CAPTURE_INCOMPLETE",
 authorityGate:authority.summary.approvedExactPagePairs===22&&authority.summary.approvedExactSubpagePairs===118?"READY":"BLOCKED",
 semanticVisionGate:process.env.AIG_VISUAL_MODEL_CONNECTED==="1"?"MODEL_CONFIGURED_BUT_NOT_EXECUTED":"PENDING_NO_MULTIMODAL_CONNECTOR"};
await fs.writeFile(path.join(out,"report.json"),JSON.stringify(all,null,2));
const md=["# AIG V67 Visual Audit", "",
 "Commit: "+all.commit,"Base: "+base,
 "Screenshots: "+all.summary.screenshots,
 "Real Chromium profiles: "+all.profiles.map(x=>x.profile).join(", "),
 "Issues: "+JSON.stringify(issuesByStatus),
 "Approved RGB Authority: "+all.summary.authorityGate,
 "AI semantic image model: "+all.summary.semanticVisionGate,
 "CNC machine output: BLOCKED",
 "Release Gate: BLOCKED until approved Authority, callbacks, true browser UX, full simulation and double-project exact SHA are verified.",
 "",
 "## Findings",...all.issues.slice(0,160).map(x=>
  "- **"+x.severity+"** "+x.profile+" / "+x.page+" / "+(x.subpage||"MAIN")+": "+x.type+" — "+x.detail)
 ];
await fs.writeFile(path.join(out,"report.md"),md.join("\n"));
console.log("AIG_V67_VISUAL_AUDIT|"+JSON.stringify(all.summary));
if(issuesByStatus.FAIL>0)process.exitCode=1;
