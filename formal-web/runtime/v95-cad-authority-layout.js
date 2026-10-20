/* V95 CAD authority -> original DOM regions. The reference 02_CAD.png is
   NOT a background; the real CAD canvas and original 20 command buttons move.
   Root delegated handlers and saved CAD drawings remain intact. */
(function(w,d){"use strict";
const REQUIRED_TOOLS=["LINE","RECT","CIRCLE","ARC","HOLE","SELECT","PAN"];
const REQUIRED_ACTIONS=["TRIM","EXTEND","OFFSET","ARRAY","DIM","UNDO","REDO","FIT","SNAP","CONNECT","DISCONNECT","DELETE","CLEAR"];
let mounted=0,queued=false;
function make(tag,cls,text){const n=d.createElement(tag);n.className=cls;if(text!==undefined)n.textContent=text;return n}
function isMobile(){
 const h=d.documentElement;
 if(h.dataset.aigLayoutMode==="mobile")return true;
 if(h.dataset.aigLayoutMode==="desktop")return false;
 return h.dataset.aig49Mobile==="true"||w.matchMedia("(max-width:900px)").matches;
}
function verify(root){
 const t=[...root.querySelectorAll("button[data-cad-tool]")],a=[...root.querySelectorAll("button[data-cad-action]")];
 if(t.length!==REQUIRED_TOOLS.length||a.length!==REQUIRED_ACTIONS.length)return "COMMAND_COUNT";
 for(const key of REQUIRED_TOOLS)if(t.filter(b=>b.dataset.cadTool===key).length!==1)return "TOOL_"+key;
 for(const key of REQUIRED_ACTIONS)if(a.filter(b=>b.dataset.cadAction===key).length!==1)return "ACTION_"+key;
 if(root.querySelectorAll("canvas[data-cad-canvas]").length!==1)return "CANVAS_COUNT";
 if(root.querySelectorAll("[data-cad-msg]").length!==1)return "STATUS_COUNT";
 if(typeof root.aigCadApi?.getShapeCount!=="function"||typeof root.aigCadApi?.refreshView!=="function")return "NATIVE_API";
 return null;
}
function mount(root){
 if(root.dataset.aig95Mapped==="SOURCE_READY")return true;
 const issue=verify(root);
 if(issue){root.dataset.aig95Mapped="BLOCKED_"+issue;return false}
 const strip=root.querySelector(":scope>.toolstrip"),grid=root.querySelector(":scope>.workgrid");
 const panels=grid?[...grid.children].filter(x=>x.classList.contains("panel")):[];
 const msg=root.querySelector("[data-cad-msg]");
 if(!strip||!grid||panels.length!==2||!msg)return false;
 const rail=make("aside","aig95-rail");
 rail.dataset.aig95Region="TOOLS";rail.setAttribute("aria-label","CAD 原生繪圖與編輯工具");
 const title=make("h3","aig95-rail-title","繪圖工具");
 rail.append(title,strip);grid.insertBefore(rail,panels[0]);
 panels[0].dataset.aig95Region="DRAW_CANVAS";
 panels[1].dataset.aig95Region="PROPERTIES";
 grid.classList.add("aig95-workgrid");
 const footer=make("div","aig95-live-footer");
 footer.dataset.aig95Region="LIVE_MESSAGE";
 footer.append(msg);root.append(footer);
 root.classList.add("aig95-native-cad");
 root.dataset.aig95Mapped="SOURCE_READY";
 root.dataset.aig95Authority="AIGII-MOBILE-CAD-CURRENT-20261016";
 mounted++;
 return true;
}
function render(){
 const screen=d.querySelector('.app>.shell>.screen[data-page="CAD"]');
 const root=screen?.querySelector("[data-cad-runtime]");
 const active=!!screen?.classList.contains("active");
 d.documentElement.dataset.aig95Cad=active?"true":"false";
 d.documentElement.dataset.aig95Platform=isMobile()?"android":"windows";
 if(root&&mount(root)&&active){
  const pane=screen.dataset.aig50Pane||"view";
  if(root.dataset.aig95LastPane!==pane){
   root.dataset.aig95LastPane=pane;
   w.requestAnimationFrame(()=>{root.aigCadApi?.refreshView();w.dispatchEvent(new Event("resize"))});
  }
 }
}
function schedule(){if(queued)return;queued=true;w.requestAnimationFrame(()=>{queued=false;render()})}
function init(){
 render();
 const shell=d.querySelector(".app>.shell");
 if(shell)new MutationObserver(schedule).observe(shell,{subtree:true,attributes:true,attributeFilter:["class","data-aig50-pane"]});
 new MutationObserver(schedule).observe(d.documentElement,{attributes:true,attributeFilter:["data-aig-layout-mode","data-aig49-mobile"]});
 w.addEventListener("hashchange",schedule);
 w.addEventListener("orientationchange",schedule,{passive:true});
 w.AIG_CAD_V95=Object.freeze({version:"95.0.0",inspect(){
  const r=d.querySelector('.screen[data-page="CAD"] [data-cad-runtime]');
  return {sourceGate:r?.dataset.aig95Mapped||"PENDING",platform:d.documentElement.dataset.aig95Platform,
   realCanvas:!!r?.querySelector("canvas[data-cad-canvas]"),
   realButtons:r?.querySelectorAll("button[data-cad-tool],button[data-cad-action]").length||0,
   actualShapeCount:typeof r?.aigCadApi?.getShapeCount==="function"?r.aigCadApi.getShapeCount():null,
   desktopAuthority:"MISSING_AUTHORITY",machineOutput:"BLOCKED",authorityImageBackground:false};
 }});
}
if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",init,{once:true});else init();
})(window,document);

