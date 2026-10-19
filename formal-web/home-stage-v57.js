/* V57 HOME adaptive platform selector; no state writes or false metrics. */
(function(w,d){"use strict";
 const root=d.documentElement;let pending=false;
 function platform(){
  if(root.dataset.aigLayoutMode==="mobile")return"android";
  if(root.dataset.aigLayoutMode==="desktop")return"windows";
  if(root.dataset.aig49Mobile==="true")return"android";
  return w.matchMedia("(max-width:900px)").matches?"android":"windows";
 }
 function refresh(){
  const home=!!d.querySelector(".app>.shell>.screen.active[data-page='HOME'] [data-home-runtime]");
  root.dataset.aig57Home=home?"true":"false";
  root.dataset.aig57Platform=platform();
 }
 function schedule(){if(pending)return;pending=true;w.requestAnimationFrame(()=>{pending=false;refresh()})}
 function start(){
  refresh();const shell=d.querySelector(".app>.shell");
  if(shell)new MutationObserver(schedule).observe(shell,{subtree:true,attributes:true,attributeFilter:["class"]});
  new MutationObserver(schedule).observe(root,{attributes:true,attributeFilter:["data-aig-layout-mode","data-aig49-mobile"]});
  w.addEventListener("resize",schedule,{passive:true});w.addEventListener("orientationchange",schedule,{passive:true});w.addEventListener("hashchange",schedule);
  w.AIG_HOME_V57=Object.freeze({version:"57.0.0",inspect(){
   const el=d.querySelector(".app>.shell>.screen.active[data-page='HOME'] [data-home-runtime]");
   return{active:root.dataset.aig57Home==="true",platform:root.dataset.aig57Platform,
    routes:el?[...new Set([...el.querySelectorAll("[data-open-page]")].map(x=>x.dataset.openPage))]:[],
    mobileAuthority:"NON_NATIVE_4K_HOLD",windowsAuthority:"REVOKED_SOURCE_HOLD"};
  }});
 }
 if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",start,{once:true});else start();
})(window,document);

