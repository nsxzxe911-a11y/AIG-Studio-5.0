/* V60 CAM page. Route every new control to the EXISTING CAM core.
   No synthetic toolpaths, no CAM source rewrites and no NC output. */
(function(w,d){"use strict";
 const root=d.documentElement;
 const strategies=["FACE","PROFILE","POCKET","DRILL","ZLEVEL","PARALLEL","ADAPTIVE","CHAMFER","TAP"];
 const actions=["RELOAD","CALC","FIT","APPLY","FLOW"];
 const labels={FACE:"平面",PROFILE:"輪廓",POCKET:"口袋",DRILL:"鑽孔",ZLEVEL:"Z 等高",PARALLEL:"平行",ADAPTIVE:"自適應",CHAMFER:"倒角",TAP:"攻牙",
 RELOAD:"重讀 CAD",CALC:"計算刀路",FIT:"全覽",APPLY:"套用刀路",FLOW:"進入刀路"};
 let pending=false,lastPane=null,lastPage=null;
 function active(){return d.querySelector(".app>.shell>.screen.active")}
 function mobile(){
  if(root.dataset.aigLayoutMode==="mobile")return true;
  if(root.dataset.aigLayoutMode==="desktop")return false;
  return root.dataset.aig49Mobile==="true"||w.matchMedia("(max-width:900px)").matches;
 }
 function panelRole(panel){
  if(panel.querySelector("[data-cam-canvas]"))return"preview";
  if(panel.querySelector("[data-cam-manual-input]"))return"manual";
  if(panel.querySelector("[data-cam-strategy]"))return"strategies";
  if(panel.querySelector("[data-cam-tool]"))return"params";
  return null;
 }
 function decorate(page){
  const cam=page.querySelector("[data-cam-runtime]");
  const grid=cam?.querySelector(":scope>.camgrid");
  if(!cam||!grid)return false;
  const found=new Set(),missing=[],roleSet=new Set();
  for(const panel of [...grid.children]){
   const role=panelRole(panel);if(!role)continue;
   panel.dataset.aig50Role=role;roleSet.add(role);
  }
  for(const [type,ids,selector,dataset] of [
   ["STRATEGY",strategies,"button[data-cam-strategy]","camStrategy"],
   ["ACTION",actions,"button[data-cam-action]","camAction"]]){
   const elements=[...cam.querySelectorAll(selector)];
   for(const id of ids)if(elements.filter(el=>el.dataset[dataset]===id).length!==1)missing.push(type+"_"+id);
   for(const btn of elements){
    const id=btn.dataset[dataset];
    const key="BTN_CAM_"+type+"_"+id;
    if(found.has(key))missing.push("DUPLICATE_"+key);
    found.add(key);
    btn.dataset.buttonId=key;btn.dataset.commandId="CAM_"+type+"_"+id;btn.dataset.aig60Real="true";
    if(labels[id])btn.setAttribute("aria-label",labels[id]+"（"+id+"）");
   }
  }
  for(const role of ["preview","manual","strategies","params"])if(!roleSet.has(role))missing.push("ROLE_"+role);
  const mode=cam.querySelector("select[data-cam-route-mode]");
  const input=cam.querySelector("textarea[data-cam-manual-input]");
  const canvas=cam.querySelector("canvas[data-cam-canvas]");
  if(!mode||!input||!canvas)missing.push("CORE_INPUT_OR_CANVAS");
  const body=cam.querySelector("[data-cam-manual-panel]>.body");
  if(body&&!body.querySelector(".aig60-manual-work")&&mode){
   const group=d.createElement("div");group.className="aig60-manual-work";
   group.setAttribute("role","group");group.setAttribute("aria-label","真實手動 CAM 工作流程");
   const create=(id,label,callback)=>{
    const b=d.createElement("button");b.type="button";b.dataset.aig60Cmd=id;
    b.dataset.buttonId="BTN_CAM_MANUAL_"+id.toUpperCase();
    b.dataset.commandId="CAM_"+id.toUpperCase();
    b.textContent=label;b.addEventListener("click",callback);group.append(b);return b;
   };
   create("mode","啟用 MANUAL",()=>{
    if(mode.value==="MANUAL")return;
    mode.value="MANUAL";mode.dispatchEvent(new Event("change",{bubbles:true}));updateButtons(cam);
   });
   for(const [cmd,label] of [["CALC","計算真刀路"],["APPLY","套用刀路"]])
    create(cmd.toLowerCase(),label,()=>{
     if(mode.value!=="MANUAL")return;
     const original=cam.querySelector('button[data-cam-action="'+cmd+'"]');
     if(original&&!original.disabled)original.click();
    });
   create("view","查看預覽",()=>{
    const nav=page.querySelector(':scope>.aig49-dock button[data-aig50-choice="view"]');
    if(nav&&!nav.disabled)nav.click();
   });
   body.append(group);
  }
  cam.dataset.aig60Controls=String(found.size);
  cam.dataset.aig60Gate=missing.length?"BLOCK":"SOURCE_READY";
  updateButtons(cam);
  return missing.length===0&&found.size===14;
 }
 function updateButtons(cam){
  const manual=cam.querySelector('select[data-cam-route-mode]')?.value==="MANUAL";
  const group=cam.querySelector(".aig60-manual-work");
  if(!group)return;
  const mode=group.querySelector('[data-aig60-cmd="mode"]');
  if(mode){mode.textContent=manual?"MANUAL 已啟用":"啟用 MANUAL";mode.setAttribute("aria-pressed",String(manual));}
  for(const id of ["calc","apply"]){const b=group.querySelector('[data-aig60-cmd="'+id+'"]');if(b)b.disabled=!manual;}
 }
 function repaint(page){
  const cam=page.querySelector("[data-cam-runtime]"),canvas=cam?.querySelector("canvas[data-cam-canvas]");
  const rect=canvas?.getBoundingClientRect();
  if(rect?.width>=35&&rect?.height>=35&&typeof cam?.aigCamApi?.refreshView==="function"){
   cam.aigCamApi.refreshView();return true;
  }
  return false;
 }
 function update(force=false){
  const page=active(),isCam=page?.dataset.page==="CAM";
  root.dataset.aig60Cam=isCam?"true":"false";
  root.dataset.aig60Platform=mobile()?"android":"windows";
  if(!isCam){lastPage=page?.dataset.page||null;lastPane=null;return;}
  const ready=decorate(page),pane=page.dataset.aig50Pane||"view";
  const switched=lastPage!=="CAM"||pane!==lastPane;
  lastPage="CAM";lastPane=pane;
  if(ready&&(force||switched)&&(!mobile()||pane==="view"))w.requestAnimationFrame(()=>repaint(page));
 }
 function schedule(force=false){if(pending)return;pending=true;w.requestAnimationFrame(()=>{pending=false;update(force)})}
 function init(){
  update(true);
  const shell=d.querySelector(".app>.shell");
  if(shell)new MutationObserver(()=>schedule()).observe(shell,{subtree:true,attributes:true,attributeFilter:["class","data-aig50-pane"]});
  new MutationObserver(()=>schedule()).observe(root,{attributes:true,attributeFilter:["data-aig-layout-mode","data-aig49-mobile"]});
  w.addEventListener("resize",()=>schedule(true),{passive:true});
  w.addEventListener("orientationchange",()=>schedule(true),{passive:true});
  w.addEventListener("hashchange",()=>schedule(true));
  d.addEventListener("change",e=>{
   if(e.target.matches?.("[data-cam-route-mode]"))updateButtons(e.target.closest("[data-cam-runtime]"));
  });
  w.AIG_CAM_V60=Object.freeze({version:"60.0.0",inspect(){
   const page=d.querySelector('.app>.shell>.screen[data-page="CAM"]');
   const cam=page?.querySelector("[data-cam-runtime]");
   return{page:active()?.dataset.page||null,platform:root.dataset.aig60Platform,
    pane:page?.dataset.aig50Pane||null,realCanvas:!!cam?.querySelector("canvas[data-cam-canvas]"),
    controls:Number(cam?.dataset.aig60Controls)||0,gate:cam?.dataset.aig60Gate||"PENDING",
    manual:cam?.querySelector("[data-cam-route-mode]")?.value==="MANUAL",
    machineOutput:"DISABLED",realPathSource:"ORIGINAL_CAM_CORE"};
  }});
 }
 if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",init,{once:true});else init();
})(window,document);

