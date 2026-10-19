/* AIG V67: single compact always-reachable RGB page switcher.
 * Uses the ORIGINAL AIG production page router. Does not create a replacement
 * engineering shell, does not clear any CNC state or trigger machine output. */
(function(w,d){"use strict";
 const IDS=["HOME","CAD","CAM","SIM","3AX","4AX","5AX","6AX","NC","AI"];
 const LABELS={HOME:"首頁",CAD:"CAD",CAM:"CAM",SIM:"SIM","3AX":"3軸","4AX":"4軸","5AX":"5軸","6AX":"6軸",NC:"NC",AI:"AI"};
 let root=null,trigger=null,popup=null,lastAction="",error="",listeners=false;
 function active(){return d.querySelector(".app>.shell>.screen.active")?.dataset.page||"HOME"}
 function update(){if(!root)return;const page=active();
  for(const b of popup.querySelectorAll("button[data-aig67-global-route]"))
   b.setAttribute("aria-current",String(b.dataset.aig67GlobalRoute===page));
  trigger.title="工作區 · "+(LABELS[page]||page);
  trigger.setAttribute("aria-label","開啟工作區導航，當前："+(LABELS[page]||page));
 }
 function close(){if(!root)return;root.dataset.open="false";trigger.setAttribute("aria-expanded","false");popup.hidden=true}
 function route(id){
  if(!IDS.includes(id))return false;
  close();
  const router=w.aigProductionPageRouter;
  try{
   if(!router?.navigateView)throw Error("PAGE_ROUTER_UNAVAILABLE");
   router.navigateView("VIEW.NAV."+id);
   lastAction=id;
   w.requestAnimationFrame(()=>{
    update();if(active()!==id){error="NAVIGATION_DID_NOT_OPEN_"+id;
     root.dataset.error=error;}else{error="";delete root.dataset.error;}
   });
   return true;
  }catch(e){error=String(e?.message||e);root.dataset.error=error;return false}
 }
 function mount(){
  if(root?.isConnected)return;
  const activeShell=d.querySelector(".app>.shell");if(!activeShell)return;
  root=d.createElement("div");root.className="aig67-global-nav";
  trigger=d.createElement("button");trigger.type="button";trigger.className="aig67-global-trigger";
  trigger.textContent="≡ 工作區";trigger.dataset.aig67GlobalNav="TOGGLE";
  trigger.dataset.buttonId="BTN.GLOBAL.NAV.TOGGLE";
  trigger.dataset.commandId="UI_NAV_TOGGLE";trigger.setAttribute("aria-expanded","false");
  trigger.setAttribute("aria-controls","aig67-global-nav-panel");
  popup=d.createElement("nav");popup.className="aig67-global-panel";popup.id="aig67-global-nav-panel";
  popup.setAttribute("aria-label","十頁正式 CNC 工作區導航");popup.hidden=true;
  for(const id of IDS){
   const b=d.createElement("button");b.type="button";b.textContent=LABELS[id];b.dataset.aig67GlobalRoute=id;
   b.dataset.buttonId="BTN.GLOBAL.NAV.OPEN_"+id;b.dataset.commandId="NAV_"+id;
   b.addEventListener("click",()=>route(id));popup.append(b);
  }
  trigger.addEventListener("click",()=>{
   const show=popup.hidden;popup.hidden=!show;root.dataset.open=String(show);
   trigger.setAttribute("aria-expanded",String(show));update()
  });
  // Render at document level: parent panels may hide/clip the old header.
  // Route remains the ORIGINAL production page router, without fake buttons.
  root.append(trigger,popup);d.body.append(root);
  if(!listeners){
   listeners=true;d.addEventListener("pointerdown",e=>{if(root&&!root.contains(e.target))close()});
   d.addEventListener("keydown",e=>{if(e.key==="Escape"&&root?.dataset.open==="true"){close();trigger.focus()}});
   const region=d.querySelector(".app>.shell");
   if(region)new MutationObserver(()=>w.requestAnimationFrame(update)).observe(region,{
    subtree:true,attributes:true,attributeFilter:["class"]});
  }
  update();
 }
 function init(){mount();if(root)return;let k=0;const retry=()=>{mount();if(root||++k>20)return;w.setTimeout(retry,250)};retry()}
 w.AIG_V67_GLOBAL_NAV=Object.freeze({version:"67.0.0",route,
  inspect:()=>({mounted:!!root?.isConnected,open:root?.dataset.open==="true",
   activePage:active(),lastAction,error,availablePages:IDS.slice(),handler:"aigProductionPageRouter.navigateView"})});
 if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",init,{once:true});else init();
})(window,document);