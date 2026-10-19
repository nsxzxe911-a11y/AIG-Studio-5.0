/* V64 single-page 5AX controller. Bind to original eight simulation actions
   and nine G-code editor callbacks; never create alternative execution paths. */
(function(w,d){"use strict";
const doc=d.documentElement;
const actions=["play","pause","step","dry","single","optional","blockskip","reset","follow","occlusion","center"];
const editor=["parse","verify","load","clear","insert","delete","undo","redo","save"];
let prev="",prevPane="",scheduled=false;
function current(){return d.querySelector(".app>.shell>.screen.active")}
function root3(){return d.querySelector('.app>.shell>.screen[data-page="5AX"] .simgrid[data-runtime="5AX"]')}
function isMobile(){
 if(doc.dataset.aigLayoutMode==="mobile")return true;
 if(doc.dataset.aigLayoutMode==="desktop")return false;
 return doc.dataset.aig49Mobile==="true"||w.matchMedia("(max-width:900px)").matches;
}
function setSubpage(screen,axis,mode){
 if(!["MACHINE","NC_FIRST"].includes(mode))return false;
 if(axis.dataset.axisSubpage===mode)return true;
 axis.dataset.axisSubpage=mode;
 axis.querySelectorAll(".aig64-subpages button[data-aig64-mode]").forEach(b=>
  b.setAttribute("aria-pressed",String(b.dataset.aig64Mode===mode)));
 const pane=screen.querySelector(':scope>.aig49-dock button[data-aig50-choice="'+(mode==="NC_FIRST"?"code":"view")+'"]');
 if(isMobile()&&pane&&!pane.disabled)pane.click();
 w.requestAnimationFrame(()=>w.dispatchEvent(new Event("resize")));
 return true;
}
function mount(){
 const page=d.querySelector('.app>.shell>.screen[data-page="5AX"]');
 const axis=page?.querySelector(".simgrid[data-runtime='5AX']");
 if(!axis)return false;
 const errors=[],present=new Set();
 for(const [kind,keys,selector,keyName] of [
  ["RUN",actions,"button[data-cmd]","cmd"],
  ["EDIT",editor,"button[data-editcmd]","editcmd"]]){
  const buttons=[...axis.querySelectorAll(selector)];
  for(const key of keys){
   const group=buttons.filter(b=>b.dataset[keyName]===key);
   if(group.length!==1){errors.push(kind+"_"+key+"_COUNT_"+group.length);continue}
   const btn=group[0];const id="BTN_5AX_"+kind+"_"+key.toUpperCase();
   if(present.has(id))errors.push("DUP_"+id);else present.add(id);
   btn.dataset.buttonId=id;btn.dataset.commandId="AXIS_5AX_"+kind+"_"+key.toUpperCase();
   btn.dataset.aig64Real="true";
  }
 }
 if(!axis.querySelector("canvas[data-glcanvas]"))errors.push("MISSING_REAL_WEBGL");
 if(!axis.querySelector("canvas[data-canvas]"))errors.push("MISSING_FALLBACK");
 if(!axis.querySelector("textarea.code[data-axis='5AX']"))errors.push("MISSING_NC_EDITOR");
 for(const attr of ["data-removal-volume","data-cut-resolution","data-collision","data-progress-text"]){
  if(!axis.querySelector("["+attr+"]"))errors.push("MISSING_"+attr);
 }
 // AIG-II already exposes the original axis subpage toggle. Studio does not;
 // wire a LIVE view switch to its actual WebGL panel and actual NC editor.
 if(!axis.querySelector(":scope>.axisModuleHeader")&&!axis.querySelector(".aig64-subpages")){
  const header=d.createElement("div");header.className="aig64-subpages";
  header.setAttribute("role","group");header.setAttribute("aria-label","5AX 實際工作頁");
  for(const [mode,label] of [["MACHINE","機台／動畫"],["NC_FIRST","NC-first／G-code"]]){
   const b=d.createElement("button");b.type="button";b.dataset.aig64Mode=mode;
   b.dataset.buttonId="BTN_5AX_WORK_"+mode;b.dataset.commandId="AXIS_5AX_VIEW_"+mode;
   b.textContent=label;b.setAttribute("aria-pressed",String(mode===(axis.dataset.axisSubpage||"MACHINE")));
   b.addEventListener("click",()=>setSubpage(page,axis,mode));header.append(b);
  }
  const toolbar=axis.querySelector(":scope>.aig41-toolbar");
  if(toolbar)toolbar.insertBefore(header,toolbar.firstChild);
  else axis.insertBefore(header,axis.firstChild);
  if(!axis.dataset.axisSubpage)axis.dataset.axisSubpage="MACHINE";
 }
 axis.dataset.aig64CoreGate=errors.length?"FAIL":"SOURCE_READY";
 axis.dataset.aig64RealControls=String(present.size);
 return errors.length===0&&present.size===20;
}
function drawSize(){
 const page=current();if(page?.dataset.page!=="5AX")return false;
 const axis=root3(),scene=axis?.querySelector(".sceneWrap");
 const w0=scene?.getBoundingClientRect().width||0,h0=scene?.getBoundingClientRect().height||0;
 if(w0<35||h0<35)return false;
 // Existing engine listens to resize. No WebGL canvas reinitialization.
 w.dispatchEvent(new Event("resize"));return true;
}
function render(){
 const page=current(),is3=page?.dataset.page==="5AX";
 doc.dataset.aig64Axis=is3?"5AX":"none";
 doc.dataset.aig64Platform=isMobile()?"android":"windows";
 if(!is3){prev=page?.dataset.page||"";prevPane="";return;}
 const ok=mount(),pane=page.dataset.aig50Pane||"view",changed=prev!=="5AX"||prevPane!==pane;
 prev="5AX";prevPane=pane;
 if(ok&&changed&&(!isMobile()||pane==="view"||pane==="code"))w.requestAnimationFrame(drawSize);
}
function schedule(){if(scheduled)return;scheduled=true;w.requestAnimationFrame(()=>{scheduled=false;render()})}
function init(){
 render();
 const shell=d.querySelector(".app>.shell");
 if(shell)new MutationObserver(schedule).observe(shell,{subtree:true,attributes:true,attributeFilter:["class","data-aig50-pane","data-axis-subpage"]});
 new MutationObserver(schedule).observe(doc,{attributes:true,attributeFilter:["data-aig-layout-mode","data-aig49-mobile"]});
 w.addEventListener("hashchange",schedule);
 w.addEventListener("orientationchange",schedule,{passive:true});
 w.AIG_5AX_V64=Object.freeze({version:"64.0.0",inspect(){
  const axis=root3();return{active:doc.dataset.aig64Axis==="5AX",platform:doc.dataset.aig64Platform,
   pane:current()?.dataset.aig50Pane||null,realCanvas:!!axis?.querySelector("canvas[data-glcanvas]"),
   commandCount:Number(axis?.dataset.aig64RealControls)||0,sourceGate:axis?.dataset.aig64CoreGate||"PENDING",
   core:"ORIGINAL_CNC_SIM",machineOutput:"DISABLED"};
 }});
}
if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",init,{once:true});else init();
})(window,document);


