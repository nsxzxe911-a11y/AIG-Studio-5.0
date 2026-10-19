/* AIG V90 — CAD / CAM / SIM native Runtime UI adapter.
 * Live CAD, CAM, simulation and saved project state are the only authority.
 * No new path generators, fake numeric evidence or machine communication.
 */
(function(w,d){"use strict";
const ROUTES=Object.freeze([
 {page:"CAD",target:"CAM",label:"到 CAM 編製刀路",id:"BTN_CAD_FLOW_CAM",command:"NAV_CAM"},
 {page:"CAM",target:"SIM",label:"到 SIM 驗證中心",id:"BTN_CAM_FLOW_SIM",command:"NAV_SIM"},
 {page:"SIM",target:"6AX",label:"查看 6AX 真 Runtime",id:"BTN_SIM_FLOW_6AX",command:"NAV_6AX"}
]);
const statusNodes=new Map();
const roots=new Map();
let ready=false;
function getRoot(page){
 const screen=d.querySelector('.app>.shell>.screen[data-page="'+page+'"]');
 return screen?.querySelector(page==="CAD"?"[data-cad-runtime]":page==="CAM"?"[data-cam-runtime]":"[data-sim-hub]")||null;
}
function savedCam(){
 try{const obj=JSON.parse(w.localStorage?.getItem("aig-cam-toolpath-v1")||"null");
  return {count:Array.isArray(obj?.paths)?obj.paths.length:0,source:obj?.source||"UNKNOWN",saved:!!obj};}
 catch(_){return {count:0,source:"UNKNOWN",saved:false}}
}
function cadCount(){
 const api=getRoot("CAD")?.aigCadApi;
 if(typeof api?.getShapeCount==="function"){
  const n=Number(api.getShapeCount());if(Number.isFinite(n))return n;
 }
 return null;
}
function stateFor(page){
 if(page==="CAD"){
  const c=cadCount();
  return c===null?"CAD 核心尚未就緒；切頁不會清空圖形。":
   "CAD 幾何 "+c+" 個 · 原始 AutoSave · 尚未執行 CAM 驗證";
 }
 if(page==="CAM"){
  const root=getRoot("CAM"),mode=root?.querySelector("[data-cam-route-mode]")?.value||"UNKNOWN";
  const value=root?.querySelector("[data-cam-path-count]")?.textContent||"0";
  const n=Number(String(value).match(/\d+/)?.[0]||0),stored=savedCam();
  return "CAM "+mode+" · 預覽 "+n+" 條 · 本機正式套用 "+stored.count+" 條 · 未通過 SIM Gate";
 }
 const root=getRoot("SIM");
 if(!root?.aigSimApi?.sample)return "SIM 原始狀態 API 未就緒，不顯示假材料移除數據";
 const real=root.aigSimApi.sample("6AX");
 if(!real||!real.hasBlocks)return "6AX Runtime 尚無可驗證區塊 · 可直接進入 NC-first";
 return "6AX "+real.state+" · "+real.blocks+" · 移除 "+real.volume+" · "+real.collision+" · 尚未通過 CNC Release Gate";
}
function refresh(){
 for(const [page,node] of statusNodes)node.textContent=stateFor(page);
}
function addControl(parent,id,cmd,label,to){
 const button=d.createElement("button");button.type="button";button.className="aig90-flow-action";
 button.dataset.buttonId=id;button.dataset.commandId=cmd;button.dataset.openPage=to;
 button.textContent=label;return parent.appendChild(button);
}
function mountFlow(cfg){
 const page=cfg.page,root=getRoot(page);
 if(!root||root.dataset.aig90FlowMounted==="true")return false;
 const anchor=page==="CAD"?root.querySelector(".toolstrip"):
              page==="CAM"?root.querySelector("[data-cam-canvas]")?.closest(".panel")?.querySelector(":scope > .head"):
                            root.querySelector(".aigSimHero .body");
 if(!anchor)return false;
 const bar=d.createElement("div");bar.className="aig90-flowbar";bar.dataset.aig90Flow=page;
 const caption=d.createElement("span");caption.className="aig90-flow-status";
 caption.dataset.aig90Status=page;caption.setAttribute("role","status");
 bar.append(caption);
 addControl(bar,cfg.id,cfg.command,cfg.label,cfg.target);
 if(page==="CAD"){
  const toggle=d.createElement("button");toggle.type="button";
  toggle.className="aig90-property-toggle";
  toggle.dataset.buttonId="BTN_CAD_PROPERTIES_TOGGLE";toggle.dataset.commandId="VIEW_CAD_PROPERTIES";
  toggle.setAttribute("aria-expanded","true");toggle.textContent="收合屬性";
  root.dataset.aig90Props="expanded";
  toggle.addEventListener("click",()=>{
   const screen=root.closest(".screen");
   if(d.documentElement.dataset.aig58Platform==="android"){
    const target=screen?.dataset.aig50Pane==="tools"?"view":"tools";
    screen?.querySelector('.aig49-dock button[data-aig50-choice="'+target+'"]')?.click();
   }else{
    const closed=root.dataset.aig90Props!=="collapsed";
    root.dataset.aig90Props=closed?"collapsed":"expanded";
    toggle.textContent=closed?"展開屬性":"收合屬性";
    toggle.setAttribute("aria-expanded",String(!closed));
    w.requestAnimationFrame(()=>root.aigCadApi?.refreshView?.());
   }
  });
  bar.append(toggle);
 }
 if(page==="SIM"){
  const update=d.createElement("button");update.type="button";update.className="aig90-refresh";
  update.dataset.buttonId="BTN_SIM_FLOW_REFRESH";update.dataset.commandId="SIM_ORIGINAL_STATUS_REFRESH";
  update.textContent="讀取實際狀態";
  update.addEventListener("click",()=>{root.aigSimApi?.refresh?.();refresh()});
  bar.append(update);
 }
 if(page==="CAD")anchor.after(bar);
 else if(page==="CAM")anchor.after(bar);
 else anchor.append(bar);
 root.dataset.aig90FlowMounted="true";
 roots.set(page,root);statusNodes.set(page,caption);
 return true;
}
function mountAxisNcBridge(){
 const screen=d.querySelector('.app>.shell>.screen[data-page="6AX"]');
 const header=screen?.querySelector('.simgrid.axisModule[data-runtime="6AX"] > .axisModuleHeader');
 const nc=d.querySelector('.app>.shell>.screen[data-page="NC"] [data-nc-runtime] .ncEditorMain .head');
 if(header&&!header.querySelector('[data-aig90-go-nc]')){
  const button=addControl(header,"BTN_6AX_GO_STANDALONE_NC","NAV_NC",
    "獨立 NC 編輯","NC");
  button.dataset.aig90GoNc="";button.setAttribute("aria-label","開啟獨立 NC 編輯器（不重置 6AX）");
 }
 if(nc&&!nc.querySelector('[data-aig90-back-6ax]')){
  const button=addControl(nc,"BTN_NC_BACK_6AX","NAV_6AX",
    "返回 6AX","6AX");
  button.dataset.aig90Back6ax="";button.setAttribute("aria-label","返回六軸原 Runtime 工作區");
 }
}
function audit(){
 const cad=getRoot("CAD"),cam=getRoot("CAM"),sim=getRoot("SIM");
 return {version:"90.0.0",cad:{mounted:!!cad?.dataset.aig90FlowMounted,realCanvas:!!cad?.querySelector("canvas[data-cad-canvas]"),
    originalApi:typeof cad?.aigCadApi?.refreshView==="function",buttonCount:cad?.dataset.aig58ControlCount||null},
   cam:{mounted:!!cam?.dataset.aig90FlowMounted,realCanvas:!!cam?.querySelector("canvas[data-cam-canvas]"),
    originalApi:typeof cam?.aigCamApi?.refreshView==="function",savedPaths:savedCam().count,
    manualSource:!!cam?.querySelector("textarea[data-cam-manual-input]")},
   sim:{mounted:!!sim?.dataset.aig90FlowMounted,originalApi:typeof sim?.aigSimApi?.sample==="function",
    sixAxisEvidence:sim?.aigSimApi?.sample?.("6AX")?.state||"NOT_INITIALIZED"},
   machineOutput:"BLOCKED",numericCncGate:"NOT_VERIFIED"};
}
function init(){
 if(ready)return;ready=true;
 ROUTES.forEach(mountFlow);mountAxisNcBridge();refresh();
 const sourceCAD=getRoot("CAD")?.querySelector("[data-cad-count]");
 const sourceCAM=getRoot("CAM")?.querySelector("[data-cam-path-count]");
 for(const el of [sourceCAD,sourceCAM])if(el)new MutationObserver(refresh).observe(el,{subtree:true,childList:true,characterData:true});
 d.addEventListener("change",e=>{if(e.target.matches?.("[data-cam-route-mode]"))refresh()});
 w.addEventListener("aig-cam-updated",refresh);
 w.addEventListener("aig-cad-updated",refresh);
 w.addEventListener("hashchange",refresh);
 const shell=d.querySelector(".app>.shell");
 if(shell)new MutationObserver(refresh).observe(shell,{subtree:false,childList:false,attributes:true,attributeFilter:["class"]});
 w.AIG_V90_CAD_CAM_SIM=Object.freeze({inspect:audit,refresh});
}
if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",init,{once:true});else init();
})(window,document);
