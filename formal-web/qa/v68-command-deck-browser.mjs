/* AIG V68 Playwright: real Chrome, no destructive native commands invoked. */
import {chromium} from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
const here=path.dirname(fileURLToPath(import.meta.url));
const spec=JSON.parse(await fs.readFile(path.resolve(here,"../runtime/v68-button-layout-contract.json"),"utf8"));
const base=(process.env.AIG_V68_BASE_URL||"http://127.0.0.1:8765").replace(/\/$/,"");
const out=path.resolve(process.env.AIG_V68_AUDIT_OUT||path.join(here,"artifacts/v68"));
await fs.mkdir(out,{recursive:true});
const lanes=spec.lanes.map(x=>x.id),events=[],captures=[],pages=[];
function issue(code,profile,page,message,severity="FAIL"){events.push({code,profile,page,severity,message:String(message).slice(0,700)})}
const profiles=[
{id:"desktop_1920",width:1920,height:1080,dpr:1,mobile:false},
{id:"mobile_360",width:360,height:772,dpr:3,mobile:true},
{id:"desktop_4k",width:3840,height:2160,dpr:1,mobile:false,subset:["CAD","6AX"]}
];
let browser;
try{
 browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--use-gl=angle","--use-angle=swiftshader","--enable-webgl","--ignore-gpu-blocklist"]});
 for(const profile of profiles){
  const ctx=await browser.newContext({viewport:{width:profile.width,height:profile.height},deviceScaleFactor:profile.dpr,isMobile:profile.mobile,hasTouch:profile.mobile,locale:"zh-TW",reducedMotion:"reduce",serviceWorkers:"block"});
  const page=await ctx.newPage();page.setDefaultTimeout(9000);
  page.on("pageerror",e=>issue("JS_PAGE_ERROR",profile.id,"ACTIVE",e,"WARNING"));
  let baseline=null;
  try{
   await page.goto(base+"/mobile-runtime.html#CAD",{waitUntil:"domcontentloaded",timeout:45000});
   await page.waitForFunction(()=>window.AIG_V68_COMMAND_DECK?.inspect?.().ready===true,{timeout:16000});
   for(const id of profile.subset||spec.pageOrder){
    const route=id==="TOOLPATH"?"刀路":id;
    try{
     if(id!=="CAD"){
      const ok=await page.evaluate(target=>{
       if(target==="刀路"&&typeof window.show==="function"){window.show(target);return !!document.querySelector('.screen.active[data-page="刀路"]')}
       try{window.aigProductionPageRouter?.navigateView?.("VIEW.NAV."+target)}
       catch(_){return false}
       return !!document.querySelector('.screen.active[data-page="'+target+'"]');
      },route);
      if(!ok)throw Error("PRODUCTION_ROUTER_UNAVAILABLE_"+route);
     }
     const deck=page.locator('.screen.active .aig68-deck[data-aig68-page="'+id+'"]');
     await deck.waitFor({state:"visible",timeout:12000});
     await page.waitForTimeout(id.endsWith("AX")?380:100);
     const oldBar=page.locator('.screen.active>.aig68-legacy-extra');
     if(id!=="TOOLPATH"){
      if(await oldBar.count()!==1)issue("LEGACY_SHORTCUT_NOT_WRAPPED",profile.id,id,"Missing safe original V43 details");
      else if(await oldBar.evaluate(n=>n.open))issue("DUPLICATE_SHORTCUT_SHOWN_BY_DEFAULT",profile.id,id,"Should be collapsed");
     }
     const topLegacy=page.locator(".aig55-top");
     if(await topLegacy.count()){
      const duplicateHeader=await topLegacy.evaluate(el=>
       !!document.body.querySelector(":scope>.aig67-global-nav")&&getComputedStyle(el).display!=="none");
      if(duplicateHeader)issue("DUPLICATE_SIMULATOR_HEADER",profile.id,id,"V55 simulator bar still crowds cutting view");
     }
     if(!profile.subset&&(id==="CAD"||id==="6AX")&&await oldBar.count()){
      const more=deck.locator(".aig68-advanced-toggle");
      if(await more.isEnabled()){
       await more.click({timeout:3500});
       if(!await oldBar.evaluate(n=>n.open))issue("ADVANCED_DETAILS_DID_NOT_OPEN",profile.id,id,"More toggle");
       await more.click({timeout:3500});
       if(await oldBar.evaluate(n=>n.open))issue("ADVANCED_DETAILS_DID_NOT_CLOSE",profile.id,id,"More toggle");
      }
     }
     const measured=await page.evaluate(({id,lanes,mobile})=>{
      const el=document.querySelector('.screen.active .aig68-deck[data-aig68-page="'+id+'"]');
      if(!el)return null;
      const box=el.getBoundingClientRect(),snapshot=window.AIG_V68_COMMAND_DECK.snapshot().pages.find(p=>p.page===id);
      const slots=lanes.map(l=>{
       const tab=el.querySelector('[data-aig68-lane-tab="'+l+'"]');
       const group=el.querySelector('[data-aig68-lane="'+l+'"]'),elem=mobile?tab:group,r=elem.getBoundingClientRect();
       return{lane:l,enabled:!tab.disabled,x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),
        ratio:+((r.left-box.left)/Math.max(box.width,1)).toFixed(4),
        actual:group.querySelectorAll(".aig68-native-button").length};
      });
      const original=[...el.querySelectorAll("button.aig68-native-button")].map(node=>({
       id:node.dataset.aig68ButtonId,slot:node.dataset.aig68Slot,
       actualGroup:node.closest("[data-aig68-lane]")?.dataset.aig68Lane,
       originalSelector:[...node.attributes].filter(a=>/data-(cad|cam|tp|nc|cmd|sim|ai|axis|render)/.test(a.name))
        .slice(0,3).map(a=>[a.name,a.value])}));
      return{snap:snapshot,slots,original,
       nc:document.querySelector('.screen[data-page="NC"] [data-nc-code]')?.value||"",
       horizontalOverflow:document.documentElement.scrollWidth>innerWidth+4};
     },{id,lanes,mobile:profile.mobile});
     if(!measured)throw Error("MISSING_SIX_LANE_NATIVE_DECK");
     const expected=spec.allRecords.filter(r=>r.page===id);
     const ids=new Set(measured.original.map(x=>x.id));
     for(const rec of expected)if(!ids.has(rec.buttonId))issue("CONFIGURED_NATIVE_BUTTON_MISSING",profile.id,id,rec.buttonId);
     if(measured.snap?.missingConfiguredButtons)issue("SOURCE_SELECTOR_NOT_PRESENT",profile.id,id,JSON.stringify(measured.snap.issues));
     if(measured.slots.length!==6||measured.slots.some((s,i)=>s.lane!==lanes[i]))issue("ORDER_MISMATCH",profile.id,id,"six slots not stable");
     if(measured.slots.some((s,i)=>i>0&&s.x<measured.slots[i-1].x-3))issue("LANE_ORDER_REVERSED",profile.id,id,"left-to-right index mismatch");
     if(measured.original.some(x=>x.actualGroup!==x.slot))issue("NATIVE_BUTTON_IN_WRONG_GROUP",profile.id,id,"matched native node in different section");
     if(measured.horizontalOverflow)issue("HORIZONTAL_OVERFLOW",profile.id,id,"document width exceeds viewport","WARNING");
     if(profile.mobile){
      const ratios=measured.slots.map(s=>s.ratio);
      if(baseline&&ratios.some((r,i)=>Math.abs(r-baseline[i])>.055))
       issue("CROSS_PAGE_BUTTON_POSITION_DRIFT",profile.id,id,JSON.stringify({baseline,ratios}));
      baseline=ratios;
      for(const lane of lanes){
       const tab=deck.locator('[data-aig68-lane-tab="'+lane+'"]');
       if(await tab.isDisabled())continue;
       await tab.click({timeout:4200});
       const live=await deck.locator('[data-aig68-lane]').evaluateAll(nodes=>nodes.filter(n=>!n.hidden&&getComputedStyle(n).display!=="none").map(n=>n.dataset.aig68Lane));
       if(live.length!==1||live[0]!==lane||await tab.getAttribute("aria-selected")!=="true")
        issue("CATEGORY_TAB_TOGGLING_FAIL",profile.id,id,JSON.stringify({lane,live}));
      }
      const after=await page.evaluate(()=>document.querySelector('.screen[data-page="NC"] [data-nc-code]')?.value||"");
      if(after!==measured.nc)issue("CATEGORY_TOGGLES_MODIFIED_GCODE",profile.id,id,"NC changed without actual native click");
      const view=deck.locator('[data-aig68-lane-tab="VIEW"]');
      if(!await view.isDisabled())await view.click();
     }
     if(id==="CAD"&&!profile.subset){
      if(profile.mobile)await deck.locator('[data-aig68-lane-tab="EDIT"]').click();
      const native=deck.locator('[data-aig68-button-id="BTN.CAD.DRAW.LINE"]');
      await native.click({timeout:5000});
      const hud=await page.locator('.screen.active [data-cad-toolhud]').textContent();
      if(!String(hud||"").toUpperCase().includes("LINE"))
       issue("CAD_REAL_LINE_CALLBACK_FAIL",profile.id,id,"Tool HUD after click: "+hud);
     }
     await fs.mkdir(path.join(out,profile.id),{recursive:true});
     const filename=path.join(out,profile.id,id+".png");
     try{await page.screenshot({path:filename,timeout:26000,animations:"allow",fullPage:false});
      captures.push({profile:profile.id,page:id,file:path.relative(out,filename)})}
     catch(e){issue("SCREENSHOT_FAILED",profile.id,id,e,"WARNING")}
     pages.push({profile:profile.id,page:id,sourceCount:expected.length,
      nativeCount:measured.original.length,unknown:measured.snap?.unknown||0,
      missing:measured.snap?.missingConfiguredButtons||0,slots:measured.slots,
      sourceCallbackIntegrity:"ALL_NATIVE_NODES_REPARENTED_NOT_CLONED; CAD LINE CLICK TESTED ONLY"});
    }catch(e){issue("PAGE_BROWSER_TEST_FAILED",profile.id,id,e)}
   }
  }catch(e){issue("PROFILE_BROWSER_FATAL",profile.id,"ALL",e)}
  finally{await ctx.close()}
 }
}finally{if(browser)await browser.close()}
const summary={inspectedPages:pages.length,captures:captures.length,
 missingNative:pages.reduce((sum,p)=>sum+p.missing,0),
 failures:events.filter(x=>x.severity==="FAIL").length,
 warnings:events.filter(x=>x.severity==="WARNING").length,
 cncOutput:"BLOCKED",authorityGate:"NOT_EVALUATED",nativeCallbackGate:"ONLY_SAFE_CAD_LINE_CLICKED"};
await fs.writeFile(path.join(out,"report.json"),JSON.stringify({
 schema:"AIG_V68_REAL_CHROMIUM_BUTTON_DECK",timestamp:new Date().toISOString(),
 base,summary,pages,events,captures,lanes,releaseStatus:"NOT_CNC_RELEASE"
},null,2));
console.log("AIG_V68_CHROMIUM_BUTTON_LAYOUT|"+JSON.stringify(summary));
if(summary.failures)process.exitCode=1;
