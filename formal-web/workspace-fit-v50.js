/* V50 full-site semantic mobile cockpit: existing CNC commands remain attached
   to original DOM. CAM strategies, parameters, manual editor and NC keypad
   are independently reachable without vertical whole-page scrolling. */
(function(w,d){"use strict";
const root=d.documentElement,axes=new Set(["3AX","4AX","5AX","6AX"]);
const supported=new Set(["CAD","CAM","NC","刀路",...axes]);
let pending=false;
function screen(){return d.querySelector(".app>.shell>.screen.active")}
function mobile(){
 const m=root.dataset.aigLayoutMode;
 if(m==="mobile")return true;if(m==="desktop")return false;
 return root.dataset.aigSkinPlatform==="mobile"||root.dataset.aigPresentation==="mobile"||
  root.dataset.aigV37Compact==="true"||w.matchMedia("(max-width:900px)").matches;
}
function roles(s){
 const cam=s.querySelector("[data-cam-runtime]>.camgrid");
 if(!cam)return;
 for(const p of cam.children){
  if(!p.matches(".panel"))continue;
  const role=p.querySelector("[data-cam-canvas]")?"preview":
   p.querySelector("[data-cam-manual-input]")?"manual":
   p.querySelector("[data-cam-strategy]")?"strategies":
   p.querySelector("[data-cam-tool]")?"params":null;
  if(role)p.dataset.aig50Role=role;
 }
}
function choices(s){
 const id=s.dataset.page;
 if(axes.has(id))return [["view","畫面"],["tools","控制"],["code","程式"]];
 if(id==="CAM")return s.querySelector("[data-cam-manual-input]")?
  [["view","刀路預覽"],["tools","策略／參數"],["manual","手動 CAM"]]:
  [["view","刀路預覽"],["tools","策略／參數"]];
 if(id==="NC")return [["code","G碼編輯"],["keypad","CNC 鍵盤"],["status","狀態"]];
 return [["view",id==="刀路"?"刀路畫面":"繪圖畫面"],["tools","工具／選項"]];
}
function pane(s,p){
 s.dataset.aig50Pane=p;
 // V49's CSS is retained as the base layout; override only CAM and NC.
 s.dataset.aig49Pane=(s.dataset.page==="CAM"||s.dataset.page==="NC")?"view":p;
 s.querySelectorAll(":scope>.aig49-dock button[data-aig50-choice]").forEach(b=>
  b.setAttribute("aria-pressed",String(b.dataset.aig50Choice===p)));
 w.requestAnimationFrame(()=>w.dispatchEvent(new Event("resize")));
}
function viewport(){
 // V54: do not drop the virtual-keyboard height correction on landscape when
 // the remaining visible area falls below 250px. Only resize when the active
 // original editor is focused. Desktop and pinch-zoom remain unchanged.
 const vv=w.visualViewport,focus=d.activeElement,active=screen();
 const typing=!!(focus&&active&&active.contains(focus)&&
  (/^(TEXTAREA|SELECT)$/.test(focus.tagName)||
  (focus.tagName==="INPUT"&&!["checkbox","button","radio","range","submit","reset","file"].includes(String(focus.type||"").toLowerCase()))));
 const height=Number(vv?.height),scale=Number(vv?.scale);
 const usable=mobile()&&typing&&Number.isFinite(height)&&height>=105&&
  Number.isFinite(scale)&&scale>=.95&&scale<=1.05&&
  height<w.innerHeight-Math.max(72,w.innerHeight*.13);
 if(usable)root.style.setProperty("--aig49-vh",Math.round(height)+"px");
 else root.style.removeProperty("--aig49-vh");
}
function update(){
 const s=screen();root.dataset.aig49Active=s?"true":"false";
 root.dataset.aig49Mobile=mobile()?"true":"false";viewport();
 if(!s||!supported.has(s.dataset.page))return;
 roles(s);
 let dock=s.querySelector(":scope>.aig49-dock");
 const options=choices(s);
 if(!dock){
  dock=d.createElement("nav");dock.className="aig49-dock";
  dock.setAttribute("aria-label","正式工作區操作分頁");
  for(const [key,label] of options){
   const b=d.createElement("button");b.type="button";b.textContent=label;
   b.dataset.aig50Choice=key;b.setAttribute("aria-pressed","false");
   b.addEventListener("click",()=>pane(s,key));dock.appendChild(b);
  }
  s.appendChild(dock);
 }
 const selected=s.dataset.aig50Pane;
 if(!options.some(([key])=>key===selected)){
  s.dataset.aig50Pane=s.dataset.page==="NC"?"code":
   axes.has(s.dataset.page)&&s.querySelector('.simgrid[data-axis-subpage="NC_FIRST"]')?"code":"view";
 }
 s.dataset.aig49Pane=(s.dataset.page==="CAM"||s.dataset.page==="NC")?"view":s.dataset.aig50Pane;
 dock.querySelectorAll("button[data-aig50-choice]").forEach(b=>
  b.setAttribute("aria-pressed",String(b.dataset.aig50Choice===s.dataset.aig50Pane)));
}
function schedule(){if(pending)return;pending=true;w.requestAnimationFrame(()=>{pending=false;update()})}
function boot(){
 update();
 const shell=d.querySelector(".app>.shell");
 if(shell)new MutationObserver(schedule).observe(shell,{subtree:true,attributes:true,attributeFilter:["class","data-axis-subpage"]});
 new MutationObserver(schedule).observe(root,{attributes:true,
  attributeFilter:["data-aig-layout-mode","data-aig-presentation","data-aig-skin-platform","data-aig-v37-compact"]});
 w.addEventListener("resize",schedule,{passive:true});
 w.addEventListener("orientationchange",schedule,{passive:true});
 w.addEventListener("hashchange",schedule);
 d.addEventListener("focusin",schedule);d.addEventListener("focusout",schedule);
 w.visualViewport?.addEventListener("resize",schedule,{passive:true});
 w.AIG_WORKSPACE_V50=Object.freeze({release:"50.0.0",refresh:update,inspect(){
  const s=screen();return{page:s?.dataset.page||null,pane:s?.dataset.aig50Pane||null,
   mobile:mobile(),available:s?choices(s).map(([k])=>k):[]};
 }});
}
if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})(window,document);

