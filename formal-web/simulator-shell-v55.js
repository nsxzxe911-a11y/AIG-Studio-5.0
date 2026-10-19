/* AIG V55 simulator shell. All CNC commands delegate to original real handlers. */
(function(w,d){"use strict";
const pages=[["HOME","首頁"],["CAD","CAD"],["CAM","CAM"],["SIM","SIM"],
 ["3AX","3AX"],["4AX","4AX"],["5AX","5AX"],["6AX","6AX"],["NC","NC"],["AI","AI"]];
const axes=new Set(["3AX","4AX","5AX","6AX"]);
const doc=d.documentElement;
let bar=null,last=null,queued=false;
const active=()=>d.querySelector(".app>.shell>.screen.active");
function nativeNav(id){return d.querySelector('.app>.top .nav button[data-page="'+id+'"]')}
function navigate(id){const button=nativeNav(id);if(!button||button.disabled)return false;button.click();return true}
function element(tag,cls,label){
 const el=d.createElement(tag);
 if(cls)el.className=cls;if(label!==undefined)el.textContent=label;
 return el;
}
function mount(){
 if(bar)return bar;
 const app=d.querySelector(".app"),shell=app?.querySelector(":scope>.shell");
 if(!app||!shell)return null;
 bar=element("header","aig55-top");bar.setAttribute("aria-label","AIG CNC 正式模擬器");
 const home=element("button","aig55-home","⌂ 首頁");home.type="button";
 home.addEventListener("click",()=>navigate("HOME"));
 const identity=element("div","aig55-id");
 identity.append(element("strong","",d.querySelector(".app>.top .logo")?.textContent?.trim()||"AIG CNC"),
  element("small","","RGB CNC SIMULATOR"));
 const nav=element("nav","aig55-nav");nav.setAttribute("aria-label","模組");
 for(const [id,label] of pages.slice(1)){
  const b=element("button","",label);b.type="button";b.dataset.aig55Page=id;
  b.setAttribute("aria-current","false");b.addEventListener("click",()=>navigate(id));nav.appendChild(b);
 }
 const commands=element("div","aig55-actions");
 for(const [key,label] of [["play","▶ 開始"],["pause","Ⅱ 暫停"],["step","單步"]]){
  const b=element("button","aig55-act",label);b.type="button";b.dataset.aig55Cmd=key;
  b.addEventListener("click",()=>{
   const s=active(),target=s?.querySelector('.simgrid[data-runtime] .simleft [data-cmd="'+key+'"]');
   if(target&&!target.disabled)target.click();
  });
  commands.appendChild(b);
 }
 bar.append(home,identity,nav,commands,element("span","aig55-safe","僅模擬 · 無機台輸出"));
 app.insertBefore(bar,shell);return bar;
}
function render(){
 const s=active(),page=s?.dataset.page||"HOME";
 doc.dataset.aig55Sim=s&&page!=="HOME"?"true":"false";
 if(!mount())return;
 bar.querySelectorAll("button[data-aig55-page]").forEach(b=>
  b.setAttribute("aria-current",b.dataset.aig55Page===page?"page":"false"));
 const axis=axes.has(page)?s.querySelector(".simgrid[data-runtime]"):null;
 bar.querySelectorAll("button[data-aig55-cmd]").forEach(b=>{
  const real=axis?.querySelector('.simleft [data-cmd="'+b.dataset.aig55Cmd+'"]');
  b.disabled=!real||real.disabled;
 });
 if(page!==last){
  last=page;
  w.requestAnimationFrame(()=>w.dispatchEvent(new Event("resize")));
 }
}
function schedule(){if(queued)return;queued=true;w.requestAnimationFrame(()=>{queued=false;render()})}
function boot(){
 mount();render();
 d.querySelectorAll(".app>.shell>.screen").forEach(s=>{
  new MutationObserver(schedule).observe(s,{attributes:true,attributeFilter:["class"]});
  const axis=s.querySelector(".simgrid[data-runtime]");
  if(axis)new MutationObserver(schedule).observe(axis,{attributes:true,attributeFilter:["data-axis-subpage"]});
 });
 w.addEventListener("hashchange",schedule);
 w.AIG_SIMULATOR_V55=Object.freeze({version:"55.0.0",navigate,inspect:()=>{
  const s=active();return{page:s?.dataset.page||"HOME",
   cockpit:doc.dataset.aig55Sim==="true",originalNavigation:!!nativeNav(s?.dataset.page||"HOME"),
   actualWebGL:!!s?.querySelector("canvas[data-glcanvas]"),machineOutput:"DISABLED"};
 }});
}
if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})(window,document);

