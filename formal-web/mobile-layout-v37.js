/* V37: actual workbench-width mobile recovery, not viewport-only media rules.
   Reuses the real V30 HUD and existing status DOM; never writes CNC work state. */
(function(w,d){"use strict";
const axes=new Set(["3AX","4AX","5AX","6AX"]);
const wrapped=new Map();let stopped=false,observer=null,lastMode=null;
function simRoots(){return [...d.querySelectorAll(".simgrid[data-runtime]")].filter(x=>axes.has(x.dataset.runtime));}
function measure(){
 const app=d.querySelector(".app"),root=d.querySelector(".screen.active .simgrid[data-runtime]");
 const widths=[d.documentElement.clientWidth,w.innerWidth,app?.getBoundingClientRect().width,root?.getBoundingClientRect().width]
  .filter(x=>Number.isFinite(x)&&x>0);
 const frame=widths.length?Math.min(...widths):w.innerWidth;
 const explicit=d.documentElement.dataset.aigPresentation==="mobile";
 return{compact:explicit||frame<=900,frame:Math.round(frame),explicit};
}
function fold(el,kind,label){
 if(!el||el.parentElement?.classList.contains("aig37-collapse"))return;
 const details=d.createElement("details");details.className="aig37-collapse";details.dataset.aig37Kind=kind;
 const summary=d.createElement("summary");summary.textContent=label;summary.setAttribute("aria-label",label);
 el.parentNode.insertBefore(details,el);details.append(summary,el);wrapped.set(el,details);
}
function unfold(){
 for(const [el,details] of wrapped){
  if(details.isConnected){details.parentNode.insertBefore(el,details);details.remove();}
 }wrapped.clear();
}
function check(){
 const state=measure(),html=d.documentElement;
 if(lastMode!==state.compact){html.dataset.aigV37Compact=state.compact?"true":"false";lastMode=state.compact;}
 html.dataset.aigV37Width=String(state.frame);
 if(!state.compact){unfold();return state;}
 for(const root of simRoots()){
  const hud=root.querySelector(".v30-hud"),status=root.querySelector(".runtimeStatus");
  fold(hud,"hud",root.dataset.runtime+"｜即時加工數據與效能（展開）");
  fold(status,"status",root.dataset.runtime+"｜詳細機台狀態與安全檢查（展開）");
  const details=status?.parentElement;
  if(details?.classList.contains("aig37-collapse")){
   const collision=(root.querySelector("[data-collision]")?.textContent||"").trim();
   const warning=collision.length>0&&!/^(?:CLEAR|OK|—|N\/A|0|待初始化|未檢查)$/i.test(collision);
   const label=details.querySelector("summary");
   if(warning){details.open=true;details.dataset.alert="true";
    if(label)label.textContent=root.dataset.runtime+"｜碰撞／安全檢查："+collision+"（展開）";
   }else{details.dataset.alert="false";
    if(label)label.textContent=root.dataset.runtime+"｜詳細機台狀態與安全檢查（展開）";
   }
  }
 }
 return state;
}
function tick(){if(stopped)return;if(d.visibilityState!=="hidden")check();w.setTimeout(tick,800);}
function start(){
 check();const app=d.querySelector(".app");
 if(w.ResizeObserver&&app){observer=new w.ResizeObserver(()=>check());observer.observe(app);}
 w.addEventListener("resize",check,{passive:true});
 w.addEventListener("orientationchange",check,{passive:true});
 w.setTimeout(tick,300);
}
function stop(){stopped=true;observer?.disconnect();w.removeEventListener("resize",check);w.removeEventListener("orientationchange",check);unfold();delete d.documentElement.dataset.aigV37Compact;}
if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",start,{once:true});else start();
w.AIG_MOBILE_LAYOUT_V37=Object.freeze({release:"37.0.0",measure,refresh:check,stop});
})(window,document);
