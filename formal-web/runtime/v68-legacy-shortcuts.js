/* AIG V68 / gradual V43 toolbar consolidation.
 * Moves original V43 PROXY shortcut toolbar (whose click delegates to the
 * existing native button) into a genuine details element. No CNC state reset.
 * Full original functionality remains available on explicit "進階" action.
 */
(function(w,d){"use strict";
 const supported=new Set(["CAD","CAM","SIM","3AX","4AX","5AX","6AX","NC","AI"]);
 let count=0,queued=false;
 function wrap(screen){
  if(!supported.has(screen.dataset.page))return;
  let bar=screen.querySelector(".aig43-bar");
  if(bar?.closest(".aig68-legacy-extra"))return;
  const current=screen.querySelector(":scope>.aig68-legacy-extra");
  if(!bar){
   const more=screen.querySelector(".aig68-advanced-toggle");
   if(more&&!current){more.disabled=true;more.title="本頁尚無進階快捷列";}
   return;
  }
  const detail=current||d.createElement("details");
  detail.className="aig68-legacy-extra";
  detail.dataset.aig68OriginalShortcutPanel=screen.dataset.page;
  detail.open=false;
  detail.id="aig68-advanced-"+screen.dataset.page;
  if(!current){
   const summary=d.createElement("summary");
   summary.textContent="進階功能／原有快捷操作（展開）";
   summary.dataset.aig68ButtonId="BTN."+screen.dataset.page+".ADVANCED.OPEN";
   detail.append(summary);
  }
  // Existing buttons and their event listeners are moved intact; never clone.
  detail.append(bar);
  if(!current)screen.append(detail);
  const more=screen.querySelector(".aig68-advanced-toggle");
  if(more){more.disabled=false;more.title="展開原有附加快捷操作";
   more.setAttribute("aria-controls",detail.id)}
  detail.addEventListener("toggle",()=>{
   if(more)more.setAttribute("aria-expanded",String(detail.open));
   const summary=detail.querySelector("summary");
   if(summary)summary.textContent=detail.open?
    "進階功能／原有快捷操作（收合）":"進階功能／原有快捷操作（展開）";
  });
  count++;
 }
 function apply(){
  for(const screen of d.querySelectorAll(".app>.shell>.screen[data-page]"))wrap(screen);
 }
 function schedule(){
  if(queued)return;queued=true;
  w.requestAnimationFrame(()=>{queued=false;apply()});
 }
 function init(){
  apply();
  const shell=d.querySelector(".app>.shell");
  if(shell)new MutationObserver(schedule).observe(shell,{childList:true,subtree:true});
 }
 w.AIG_V68_LEGACY_SHORTCUTS=Object.freeze({
  refresh:apply,inspect:()=>({wrappedPanels:count,originalButtonsCloned:false,
   sourceCallbacksIntact:true,secondaryOpen:[...d.querySelectorAll(".aig68-legacy-extra[open]")]
    .map(x=>x.dataset.aig68OriginalShortcutPanel)})
 });
 if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",init,{once:true});else init();
})(window,document);