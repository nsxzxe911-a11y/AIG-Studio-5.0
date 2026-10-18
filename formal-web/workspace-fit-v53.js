/* V53 live viewport state & editor accessibility; uses V50's existing pane callbacks.
   Never modifies text, scrollTop, saves, CNC machine output or the parser. */
(function(w,d){"use strict";
 const root=d.documentElement;
 const names=new Set(["3AX","4AX","5AX","6AX"]);
 let pending=false;
 const active=()=>d.querySelector(".app>.shell>.screen.active");
 function state(){
  const s=active(),vv=w.visualViewport;
  const isMobile=root.dataset.aig49Mobile==="true";
  const landscape=isMobile&&w.innerWidth>w.innerHeight&&w.innerHeight<700;
  const f=d.activeElement;
  const editing=!!(f&&s&&s.contains(f)&&(
   f.tagName==="TEXTAREA" ||
   (f.tagName==="INPUT"&&!["checkbox","radio","range","button","submit","reset","file"].includes((f.type||"").toLowerCase()))));
  const height=vv&&Number.isFinite(vv.height)?vv.height:w.innerHeight;
  const keyboard=!!(isMobile&&editing&&vv&&vv.scale>=.95&&vv.scale<=1.05&&
    w.innerHeight-height>Math.max(85,w.innerHeight*.16));
  root.dataset.aig53Landscape=landscape?"true":"false";
  root.dataset.aig53Keyboard=keyboard?"true":"false";
  if(isMobile&&editing&&s&&f){
    const page=s.dataset.page;
    let target=null;
    if(names.has(page)&&f.closest(".simgrid .editor"))target="code";
    else if(page==="NC"&&f.matches("[data-nc-code]"))target="code";
    else if(page==="CAM"&&f.matches("[data-cam-manual-input]"))target="manual";
    if(target&&s.dataset.aig50Pane!==target){
      const button=s.querySelector(':scope>.aig49-dock [data-aig50-choice="'+target+'"]');
      if(button)button.click(); // delegates to the existing V50 live panel callback
    }
  }
 }
 function schedule(){
  if(pending)return;
  pending=true;w.requestAnimationFrame(()=>{pending=false;state()});
 }
 function init(){
  state();
  w.addEventListener("resize",schedule,{passive:true});
  w.addEventListener("orientationchange",schedule,{passive:true});
  w.addEventListener("hashchange",schedule);
  d.addEventListener("focusin",schedule);
  d.addEventListener("focusout",schedule);
  w.visualViewport?.addEventListener("resize",schedule,{passive:true});
  w.visualViewport?.addEventListener("scroll",schedule,{passive:true});
  new MutationObserver(schedule).observe(root,{attributes:true,
   attributeFilter:["data-aig49-mobile","data-aig-layout-mode","data-aig-v37-compact"]});
  const shell=d.querySelector(".app>.shell");
  if(shell)new MutationObserver(schedule).observe(shell,{subtree:true,attributes:true,
   attributeFilter:["class","data-aig50-pane","data-axis-subpage"]});
  w.AIG_WORKSPACE_V53=Object.freeze({version:"53.0.0",inspect:()=>({
   page:active()?.dataset.page||null,landscape:root.dataset.aig53Landscape==="true",
   keyboard:root.dataset.aig53Keyboard==="true",pane:active()?.dataset.aig50Pane||null,
   viewportHeight:w.visualViewport?.height||w.innerHeight})});
 }
 if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",init,{once:true});else init();
})(window,document);

