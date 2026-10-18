/* AIG-II × AIG Studio common Web V40.0.0.
   Same exact source module loaded by both original browser workspaces.
   Uses existing navigation buttons; never simulates CAD, CAM, G-code or machine output. */
(function(w,d){"use strict";
const VERSION="40.0.0";
const PAGES=["HOME","CAD","CAM","SIM","3AX","4AX","5AX","6AX","NC","AI"];
const project=/\/studio-375\.html(?:$|[?#])/i.test(w.location.pathname)?"STUDIO":"AIGII";
const other=project==="AIGII"?"./studio-375.html":"./mobile-runtime.html";
const native=project==="AIGII"?"432.0.0":"375.0.0";
const name=project==="AIGII"?"AIG-II":"AIG Studio 5.0";
function inspect(){
 const results=PAGES.map(page=>{
  const screen=d.querySelector('.screen[data-page="'+page+'"]');
  const button=d.querySelector('.nav button[data-page="'+page+'"]');
  const required=button&&screen&&typeof button.click==="function";
  const runtime=["3AX","4AX","5AX","6AX"].includes(page)?screen?.querySelector('.simgrid[data-runtime="'+page+'"]'):null;
  return{page,screen:Boolean(screen),nav:Boolean(button),routable:Boolean(required),axisRuntime:runtime?Boolean(runtime.querySelector('[data-canvas]')&&runtime.querySelector('textarea.code')):null};
 });
 return{webVersion:VERSION,project,nativeVersion:native,loaded:results.filter(x=>x.routable).length,total:PAGES.length,modules:results,
  note:"只驗證已掛載的 Web 元件與原有導航，不代表 CAD/CAM/NC、真材料移除或原生 CNC Gate PASS"};
}
function create(){
 if(d.getElementById("aig40-launch"))return;
 const top=d.querySelector(".app > .top");
 if(!top)return;
 const btn=d.createElement("button");btn.type="button";btn.id="aig40-launch";btn.className="aig40-launch";
 btn.setAttribute("aria-controls","aig40-panel");btn.setAttribute("aria-expanded","false");
 btn.textContent="雙專案 Web V40";
 const status=top.querySelector(".status");if(status)top.insertBefore(btn,status);else top.appendChild(btn);
 const panel=d.createElement("section");panel.id="aig40-panel";panel.className="aig40-panel";panel.hidden=true;
 panel.setAttribute("role","region");panel.setAttribute("aria-label","雙專案 V40 共用版本與頁面檢查");
 const head=d.createElement("div");head.className="aig40-panel-head";
 const strong=d.createElement("strong");strong.textContent=name+" · 共用 Web V"+VERSION;
 const close=d.createElement("button");close.type="button";close.textContent="關閉";close.setAttribute("aria-label","關閉版本面板");
 close.addEventListener("click",()=>toggle(false));
 head.append(strong,close);
 const info=d.createElement("p");info.className="aig40-info";
 info.textContent="Web 共同版本 40.0.0｜本專案原生主線 "+native+"。兩種版本分別驗收，工作資料不會跨專案自動複製。";
 const grid=d.createElement("div");grid.className="aig40-grid";
 const foot=d.createElement("div");foot.className="aig40-foot";
 const target=d.createElement("a");target.href=other+(w.location.hash&&PAGES.includes(w.location.hash.slice(1).toUpperCase())?w.location.hash:"#HOME");
 target.textContent=project==="AIGII"?"切換 Studio V40 工作區 →":"切換 AIG-II V40 工作區 →";
 const proof=d.createElement("a");proof.href="./dual-project-latest.html#shared-web-v40";proof.textContent="版本與 exact SHA ↗";
 const hint=d.createElement("p");hint.className="aig40-hint";
 hint.textContent="按頁籤只會呼叫原工作區導航按鈕。可用性不等於 CNC 安全驗證。";
 foot.append(target,proof);
 panel.append(head,info,grid,hint,foot);
 top.insertAdjacentElement("afterend",panel);
 function render(){
  const report=inspect();grid.replaceChildren();
  for(const item of report.modules){
   const b=d.createElement("button");b.type="button";b.className="aig40-page";b.disabled=!item.routable;
   const label=d.createElement("b");label.textContent=item.page;
   const meta=d.createElement("small");meta.textContent=item.routable?"原模組可切換":"模組尚未掛載";
   b.append(label,meta);
   if(item.routable)b.addEventListener("click",()=>{
    const real=d.querySelector('.nav button[data-page="'+item.page+'"]');
    if(!real||real.disabled)return;
    real.click();toggle(false);
   });
   grid.appendChild(b);
  }
  hint.textContent=report.loaded+"/"+report.total+" 個頁面具備原有導覽元件；不代表功能及原生 Gate PASS。";
 }
 function toggle(open){panel.hidden=!open;btn.setAttribute("aria-expanded",String(open));if(open)render();}
 btn.addEventListener("click",()=>toggle(panel.hidden));
 d.addEventListener("keydown",e=>{if(e.key==="Escape"&&!panel.hidden)toggle(false)});
 return panel;
}
function boot(){
 const p=create();
 w.AIG_DUAL_WEB_V40=Object.freeze({release:VERSION,project,inspect,commonSource:"./dual-web-v40.js",nativeVersion:native});
 return Boolean(p);
}
if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})(window,document);
