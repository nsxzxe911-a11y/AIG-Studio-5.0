/* V61 SIM cockpit: 4-axis selectable read-only evidence. No cloned 3D
   canvas, no false cutting animation, no auto-running CNC programs. */
(function(w,d){"use strict";
const root=d.documentElement,axes=["3AX","4AX","5AX","6AX"];
let selected="3AX",queued=false;
function screen(){return d.querySelector(".app>.shell>.screen.active")}
function mobile(){
 if(root.dataset.aigLayoutMode==="mobile")return true;
 if(root.dataset.aigLayoutMode==="desktop")return false;
 return root.dataset.aig49Mobile==="true"||w.matchMedia("(max-width:900px)").matches;
}
function apply(hub){
 const nav=hub.querySelector(".aig61-axisnav");
 if(nav)nav.querySelectorAll("button[data-aig61-axis]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.aig61Axis===selected)));
 for(const axis of axes){
  const card=hub.querySelector('[data-sim-card="'+axis+'"]');
  if(card)card.dataset.aig61Selected=axis===selected?"true":"false";
 }
}
function mount(hub){
 if(!hub||!hub.querySelector(".aigSimCards"))return false;
 if(!hub.querySelector(".aig61-axisnav")){
  const nav=d.createElement("nav");nav.className="aig61-axisnav";nav.setAttribute("aria-label","SIM 機台選擇");
  for(const axis of axes){
   const btn=d.createElement("button");btn.type="button";btn.textContent=axis;
   btn.dataset.aig61Axis=axis;btn.dataset.buttonId="BTN_SIM_SELECT_"+axis;
   btn.dataset.commandId="SIM_SELECT_EVIDENCE_"+axis;
   btn.addEventListener("click",()=>{selected=axis;apply(hub)});
   nav.appendChild(btn);
  }
  hub.querySelector(".aigSimCards").before(nav);
 }
 for(const axis of axes){
  const card=hub.querySelector('[data-sim-card="'+axis+'"]');
  const original=card?.querySelector('[data-open-page="'+axis+'"]');
  if(original){
   original.dataset.buttonId="BTN_SIM_OPEN_"+axis;
   original.dataset.commandId="NAV_"+axis;
  }
 }
 for(const [sel,id,cmd] of [
  ['[data-open-page="CAM"]',"BTN_SIM_GO_CAM","NAV_CAM"],
  ['[data-open-page="AI"]',"BTN_SIM_GO_AI","NAV_AI"],
  ["[data-sim-refresh]","BTN_SIM_REFRESH","SIM_STATUS_REFRESH"]]){
  const control=hub.querySelector(sel);
  if(control){control.dataset.buttonId=id;control.dataset.commandId=cmd;}
 }
 apply(hub);
 return true;
}
function update(){
 const page=screen(),isSim=page?.dataset.page==="SIM";
 root.dataset.aig61Sim=isSim?"true":"false";
 root.dataset.aig61Platform=mobile()?"android":"windows";
 if(isSim)mount(page.querySelector("[data-sim-hub]"));
}
function schedule(){if(queued)return;queued=true;w.requestAnimationFrame(()=>{queued=false;update()})}
function init(){
 update();
 const shell=d.querySelector(".app>.shell");
 if(shell)new MutationObserver(schedule).observe(shell,{subtree:true,childList:true,attributes:true,attributeFilter:["class"]});
 new MutationObserver(schedule).observe(root,{attributes:true,attributeFilter:["data-aig-layout-mode","data-aig49-mobile"]});
 w.addEventListener("resize",schedule,{passive:true});
 w.addEventListener("orientationchange",schedule,{passive:true});
 w.addEventListener("hashchange",schedule);
 w.AIG_SIM_V61=Object.freeze({version:"61.0.0",inspect(){
  const hub=d.querySelector(".app>.shell>.screen[data-page='SIM'] [data-sim-hub]");
  return {active:root.dataset.aig61Sim==="true",platform:root.dataset.aig61Platform,
   selected,realStatusApi:typeof hub?.aigSimApi?.refresh==="function",
   axisLinks:axes.filter(axis=>!!hub?.querySelector('[data-open-page="'+axis+'"]')),
   machineOutput:"DISABLED",materialRemoval:"READ_ONLY_FROM_AXIS_RUNTIME"};
 }});
}
if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",init,{once:true});else init();
})(window,document);

