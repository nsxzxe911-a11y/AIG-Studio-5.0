/* V36 mobile layout repair. Progressive, DOM-preserving collapsible diagnostics.
   No storage, geometry, parser, callback replacement or automatic machine action. */
(function(w,d){"use strict";
const phone=w.matchMedia("(max-width:800px)");
const roots=[...d.querySelectorAll(".simgrid[data-runtime]")].filter(x=>["3AX","4AX","5AX","6AX"].includes(x.dataset.runtime));
const wrapped=new Map();
function wrap(el,kind,summaryLabel){
 if(!el||el.parentElement?.classList.contains("aig36-collapse"))return;
 const details=d.createElement("details");details.className="aig36-collapse";details.dataset.aig36Kind=kind;
 const summary=d.createElement("summary");summary.textContent=summaryLabel;summary.setAttribute("aria-label",summaryLabel);
 el.parentNode.insertBefore(details,el);details.append(summary,el);
 wrapped.set(el,details);
}
function restore(){
 for(const [el,details] of wrapped){
  if(details.isConnected){details.parentNode.insertBefore(el,details);details.remove();}
 }
 wrapped.clear();
}
function update(){
 if(!phone.matches){restore();return;}
 for(const root of roots){
  const telemetry=root.querySelector(".v30-hud");
  const extended=root.querySelector(".runtimeStatus");
  wrap(telemetry,"summary",root.dataset.runtime+"｜座標、加工效能與材料移除詳情（展開）");
  wrap(extended,"machine",root.dataset.runtime+"｜完整機台狀態、碰撞與加工參數（展開）");
  const details=extended?.parentElement;
  if(details?.matches(".aig36-collapse")){
   const raw=(root.querySelector("[data-collision]")?.textContent||"").trim();
   const warning=raw!==""&&!/^(?:CLEAR|OK|—|未|N\/A|0)$/i.test(raw);
   if(warning){
    details.open=true;details.dataset.alert="true";
    const title=details.querySelector("summary");if(title)title.textContent=root.dataset.runtime+"｜碰撞／安全檢查："+raw+"（已展開）";
   }else{
    details.dataset.alert="false";
    const title=details.querySelector("summary");if(title)title.textContent=root.dataset.runtime+"｜完整機台狀態、碰撞與加工參數（展開）";
   }
  }
 }
}
let active=true;
function tick(){if(!active)return;if(d.visibilityState!=="hidden")update();w.setTimeout(tick,750);}
if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",update,{once:true});else update();
w.setTimeout(tick,500);
w.AIG_MOBILE_LAYOUT_V36=Object.freeze({version:"36.0.0",refresh:update,stop:()=>{active=false;restore()}});
})(window,document);
