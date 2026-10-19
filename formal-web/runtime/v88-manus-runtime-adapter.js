/* AIG V88 — source-only UI adapter; keeps 6AX CNC runtime and G-code identity. */
(function(w,d){"use strict";
const axes=["3AX","4AX","5AX","6AX"];
const runActions=["play","pause","step","dry","single","reset"];
const editActions=["parse","verify","load","clear","insert","delete","undo","redo","save"];
function sourceCount(root,attr,value){
 return [...root.querySelectorAll("button["+attr+"]")].filter(b=>b.getAttribute(attr)===value).length;
}
function check(root){
 const failures=[];
 for(const cmd of runActions)if(sourceCount(root,"data-cmd",cmd)!==1)failures.push("RUN_"+cmd);
 for(const cmd of editActions)if(sourceCount(root,"data-editcmd",cmd)!==1)failures.push("EDIT_"+cmd);
 if(root.querySelectorAll("textarea.code[data-axis]").length!==1)failures.push("NC_SOURCE");
 if(!root.querySelector("canvas[data-glcanvas]"))failures.push("WEBGL_SOURCE");
 if(!root.querySelector("[data-removal-volume]"))failures.push("REMOVAL_SOURCE");
 if(!root.querySelector(".aig86-editor-toggle"))failures.push("V86_PANEL");
 return failures;
}
function mount(root){
 if(root.dataset.aig88Mounted==="true")return true;
 if(!axes.includes(root.dataset.runtime)||root.dataset.aig86Mounted!=="true")return false;
 const failures=check(root);
 root.dataset.aig88Source=failures.length?"REVIEW":"LAYOUT_BOUND";
 if(failures.length)return false; // Never imply CNC material-removal or Safety Gate PASS.
 const list=root.querySelector(".simleft .runtimeStatus");
 if(!list)return false;
 const safety=d.createElement("div");safety.className="metric aig88-runtime-note";
 const title=d.createElement("b");title.textContent="上機安全";
 const value=d.createElement("span");value.dataset.aig88Safety="";
 value.setAttribute("role","status");safety.append(title,value);list.append(safety);
 function refreshSafety(){value.textContent=(w.navigator?.onLine===false?"OFFLINE · ":"LOCAL DRAFT · ")+"真機輸出 BLOCKED";}
 refreshSafety();
 w.addEventListener("online",refreshSafety);w.addEventListener("offline",refreshSafety);
 // The original NC drawer owns the toggle callback. On mobile, switch only
 // through the existing VIEW/CODE dock; never synthesize NC or machining commands.
 const toggle=root.querySelector(".aig86-editor-toggle");
 toggle.addEventListener("click",()=>{
   if(root.dataset.runtime!=="6AX"||d.documentElement.dataset.aig65Platform!=="android")return;
   const screen=root.closest(".screen");
   if(!screen?.classList.contains("active"))return;
   const target=toggle.getAttribute("aria-expanded")==="true"?"code":"view";
   const pane=screen.querySelector('.aig49-dock button[data-aig50-choice="'+target+'"]');
   if(pane&&!pane.disabled&&screen.dataset.aig50Pane!==target)pane.click();
 });
 root.dataset.aig88Mounted="true";return true;
}
function mountAll(){d.querySelectorAll(".simgrid.axisModule[data-runtime]").forEach(mount);}
if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",mountAll,{once:true});else mountAll();
w.AIG_V88_FORMAL_ADAPTER=Object.freeze({
 version:"88.0.0",mount:mountAll,
 inspect:()=>axes.map(axis=>{
   const root=d.querySelector('.simgrid.axisModule[data-runtime="'+axis+'"]');
   return {axis,uiBound:root?.dataset.aig88Source==="LAYOUT_BOUND",
     pageMode:root?.dataset.axisSubpage||null,ncDrawer:root?.dataset.aig86Nc||null,
     sourceTextareaCount:root?.querySelectorAll("textarea.code[data-axis]").length||0,
     sourceProblems:root?check(root):["MISSING_RUNTIME"],
     cncRelease:"NOT_VERIFIED",machineOutput:"BLOCKED"};
 })
});
})(window,document);
