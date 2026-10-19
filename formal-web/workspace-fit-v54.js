/* AIG dual Web V54: synchronize a user's NC-first selection with the existing
   real G-code pane, preserving tool actions, current NC text and scroll state. */
(function(w,d){"use strict";
 const axes=new Set(["3AX","4AX","5AX","6AX"]);
 function isMobile(){
  const root=d.documentElement;
  return root.dataset.aig49Mobile==="true" || root.dataset.aigLayoutMode==="mobile";
 }
 function selectFromAxisButton(target){
  if(!isMobile()||!axes.has(target?.closest(".screen")?.dataset.page))return false;
  const wanted=target.dataset.axisSubpage;
  if(wanted!=="NC_FIRST"&&wanted!=="MACHINE")return false;
  const page=target.closest(".screen"),axis=target.closest(".simgrid[data-runtime]");
  if(!page||!axis)return false;
  const pane=wanted==="NC_FIRST"?"code":"view";
  // Defer until the original axis subpage handler has set the actual mode.
  w.requestAnimationFrame(()=>{
   if(!page.classList.contains("active")||axis.dataset.axisSubpage!==wanted)return;
   const button=page.querySelector(':scope>.aig49-dock [data-aig50-choice="'+pane+'"]');
   if(button&&page.dataset.aig50Pane!==pane)button.click();
  });
  return true;
 }
 function init(){
  d.addEventListener("click",e=>{
   const target=e.target.closest?.(".axisSubpages button[data-axis-subpage]");
   if(target)selectFromAxisButton(target);
  });
  w.AIG_WORKSPACE_V54=Object.freeze({release:"54.0.0",inspect(){
   const page=d.querySelector(".app>.shell>.screen.active");
   const root=d.documentElement;
   return{page:page?.dataset.page||null,
    axisSubpage:page?.querySelector(".simgrid[data-runtime]")?.dataset.axisSubpage||null,
    pane:page?.dataset.aig50Pane||null,keyboard:root.dataset.aig53Keyboard==="true",
    mobile:isMobile(),usableHeight:root.style.getPropertyValue("--aig49-vh")||"auto"};
  }});
 }
 if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",init,{once:true});else init();
})(window,document);

