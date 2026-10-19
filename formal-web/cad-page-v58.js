/* V58 CAD-only layout adapter. Decorates the ORIGINAL 20 controls.
   Never intercepts CAD core commands, replaces the real canvas or mutates projects. */
(function(w,d){"use strict";
 const root=d.documentElement;
 const labels={
  LINE:"直線",RECT:"矩形",CIRCLE:"圓形",ARC:"圓弧",HOLE:"孔位",
  SELECT:"選取",PAN:"平移",TRIM:"修剪",EXTEND:"延伸",OFFSET:"偏移",
  ARRAY:"陣列",DIM:"標註",UNDO:"復原",REDO:"重做",FIT:"全覽",SNAP:"吸附",
  CONNECT:"連接 CAM",DISCONNECT:"獨立 CAD",DELETE:"刪除選取",CLEAR:"清空畫布"
 };
 const expectedTools=["LINE","RECT","CIRCLE","ARC","HOLE","SELECT","PAN"];
 const expectedActions=["TRIM","EXTEND","OFFSET","ARRAY","DIM","UNDO","REDO","FIT","SNAP","CONNECT","DISCONNECT","DELETE","CLEAR"];
 let queued=false,lastPage="";
 function current(){return d.querySelector('.app>.shell>.screen.active')}
 function mobile(){
  if(root.dataset.aigLayoutMode==="mobile")return true;
  if(root.dataset.aigLayoutMode==="desktop")return false;
  return root.dataset.aig49Mobile==="true"||w.matchMedia("(max-width:900px)").matches;
 }
 function decorate(){
  const page=d.querySelector('.app>.shell>.screen[data-page="CAD"]');
  const cad=page?.querySelector("[data-cad-runtime]");
  if(!cad)return false;
  const tools=[...cad.querySelectorAll("button[data-cad-tool]")];
  const actions=[...cad.querySelectorAll("button[data-cad-action]")];
  const seen=new Set(),issue=[];
  for(const [type,items,keys] of [["TOOL",tools,expectedTools],["ACTION",actions,expectedActions]]){
   for(const key of keys)if(items.filter(b=>b.dataset[type==="TOOL"?"cadTool":"cadAction"]===key).length!==1)issue.push(type+"_"+key);
   for(const button of items){
    const key=type==="TOOL"?button.dataset.cadTool:button.dataset.cadAction;
    const id="BTN_CAD_"+type+"_"+key;
    if(seen.has(id))issue.push("DUPLICATE_"+id);
    seen.add(id);
    button.dataset.buttonId=id;button.dataset.commandId="CAD_"+type+"_"+key;
    button.dataset.aig58Real="true";
    if(labels[key]){
     button.textContent=labels[key];
     button.setAttribute("aria-label",labels[key]+"（"+key+"）");
    }
   }
  }
  cad.dataset.aig58ControlGate=issue.length?"FAIL":"PASS";
  cad.dataset.aig58ControlCount=String(seen.size);
  return issue.length===0&&seen.size===20;
 }
 function refresh(){
  const s=current(),isCad=s?.dataset.page==="CAD";
  root.dataset.aig58Cad=isCad?"true":"false";
  root.dataset.aig58Platform=mobile()?"android":"windows";
  if(isCad){
   decorate();
   if(lastPage!=="CAD"){
    lastPage="CAD";w.requestAnimationFrame(()=>w.dispatchEvent(new Event("resize")));
   }
  }else lastPage=s?.dataset.page||"";
 }
 function schedule(){if(queued)return;queued=true;w.requestAnimationFrame(()=>{queued=false;refresh()})}
 function boot(){
  refresh();
  const shell=d.querySelector(".app>.shell");
  if(shell)new MutationObserver(schedule).observe(shell,{subtree:true,attributes:true,attributeFilter:["class","data-aig50-pane"]});
  new MutationObserver(schedule).observe(root,{attributes:true,
   attributeFilter:["data-aig-layout-mode","data-aig49-mobile"]});
  w.addEventListener("hashchange",schedule);
  w.addEventListener("resize",schedule,{passive:true});
  w.addEventListener("orientationchange",schedule,{passive:true});
  w.AIG_CAD_V58=Object.freeze({version:"58.0.0",inspect(){
   const cad=d.querySelector('.app>.shell>.screen[data-page="CAD"] [data-cad-runtime]');
   const s=current();
   return{page:s?.dataset.page||null,platform:root.dataset.aig58Platform,
    pane:s?.dataset.aig50Pane||null,
    realCanvas:!!cad?.querySelector("canvas[data-cad-canvas]"),
    controls:Number(cad?.dataset.aig58ControlCount)||0,
    controlGate:cad?.dataset.aig58ControlGate||"PENDING",
    drawMode:"ORIGINAL_CORE",storage:"UNCHANGED",machineOutput:"DISABLED"};
  }});
 }
 if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})(window,document);

