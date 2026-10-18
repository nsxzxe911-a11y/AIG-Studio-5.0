/* V49 responsive dock: switch real live panels, never duplicate or fake callbacks.
   Does not persist or change user's CAD, CAM, NC or machine state. */
(function(){
 "use strict";
 const ids=new Set(["CAD","CAM","NC","刀路","3AX","4AX","5AX","6AX"]);
 const axes=new Set(["3AX","4AX","5AX","6AX"]);
 const root=document.documentElement;
 function active(){return document.querySelector(".app>.shell>.screen.active")}
 function mobile(){
  const override=root.getAttribute("data-aig-layout-mode");
  if(override==="mobile")return true;
  if(override==="desktop")return false;
  return root.getAttribute("data-aig-presentation")==="mobile"||
   root.getAttribute("data-aig-skin-platform")==="mobile"||
   root.getAttribute("data-aig-v37-compact")==="true"||
   matchMedia("(max-width:900px)").matches;
 }
 function sync(s){
  s.querySelectorAll(":scope>.aig49-dock button[data-aig49-choice]").forEach(b=>
   b.setAttribute("aria-pressed",String(b.dataset.aig49Choice===s.dataset.aig49Pane)));
 }
 function set(s,choice){
  s.dataset.aig49Pane=choice;sync(s);
  requestAnimationFrame(()=>window.dispatchEvent(new Event("resize")));
 }
 function update(){
  const s=active();
  root.setAttribute("data-aig49-active",s?"true":"false");
  root.setAttribute("data-aig49-mobile",mobile()?"true":"false");
  if(!s||!ids.has(s.dataset.page))return;
  if(!s.querySelector(":scope>.aig49-dock")){
   const dock=document.createElement("nav");dock.className="aig49-dock";
   dock.setAttribute("aria-label","工作區畫面切換");
   const choices=axes.has(s.dataset.page)?[["view","畫面"],["tools","控制"],["code","程式"]]:
    [["view",s.dataset.page==="NC"?"編輯":"畫面"],["tools",s.dataset.page==="CAM"?"加工策略":s.dataset.page==="NC"?"CNC 鍵盤":"工具"]];
   choices.forEach(([choice,label])=>{
    const b=document.createElement("button");b.type="button";
    b.dataset.aig49Choice=choice;b.textContent=label;
    b.setAttribute("aria-pressed","false");b.addEventListener("click",()=>set(s,choice));
    dock.appendChild(b);
   });
   s.appendChild(dock);
  }
  if(!s.dataset.aig49Pane)
   s.dataset.aig49Pane=axes.has(s.dataset.page)&&s.querySelector('.simgrid[data-axis-subpage="NC_FIRST"]')?"code":"view";
  sync(s);
 }
 let pending=false;
 function schedule(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;update()})}
 function init(){
  update();
  const shell=document.querySelector(".app>.shell");
  if(shell)new MutationObserver(schedule).observe(shell,{subtree:true,attributes:true,attributeFilter:["class","data-axis-subpage"]});
  new MutationObserver(schedule).observe(root,{attributes:true,
   attributeFilter:["data-aig-layout-mode","data-aig-presentation","data-aig-skin-platform","data-aig-v37-compact"]});
  window.addEventListener("resize",schedule,{passive:true});
  window.addEventListener("hashchange",schedule);
  if(window.visualViewport)window.visualViewport.addEventListener("resize",schedule,{passive:true});
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
 else init();
})();

