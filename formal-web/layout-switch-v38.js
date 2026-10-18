/* V38: real UI mode-switch bridge for BOTH production CNC pages.
   It updates only presentation state; no replacement canvas, NC code, toolpath or data. */
(function(w,d){"use strict";
 const toolbar=d.getElementById("aig-layout-switch");
 if(!toolbar)return;
 const buttons=[...toolbar.querySelectorAll("[data-layout-mode]")];
 function sync(){
   const source=w.AIG_LAYOUT_VIEW;
   const mode=source?.getMode?.()||d.documentElement.dataset.aigLayoutMode||"auto";
   const presentation=source?.getPresentation?.()||d.documentElement.dataset.aigPresentation||"desktop";
   toolbar.dataset.aigV38Mode=mode;
   for(const b of buttons){
     const selected=b.dataset.layoutMode===mode;
     if(b.getAttribute("aria-pressed")!==String(selected))b.setAttribute("aria-pressed",String(selected));
   }
   w.AIG_MOBILE_LAYOUT_V37?.refresh?.();
   return{mode,presentation,compact:d.documentElement.dataset.aigV37Compact==="true"};
 }
 buttons.forEach(b=>b.addEventListener("click",()=>{
   // Original layout-mode.js performs the actual state change and preference save.
   // This listener only checks/synchronizes it after its existing handler completes.
   sync();
 }));
 w.addEventListener("resize",sync,{passive:true});
 w.addEventListener("orientationchange",sync,{passive:true});
 if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",sync,{once:true});else sync();
 w.AIG_LAYOUT_SWITCH_V38=Object.freeze({release:"38.0.0",read:sync});
})(window,document);
