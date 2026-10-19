/* AIG V86 — native workspace controls, preserving original callbacks and state. */
(function(w,d){"use strict";
const wanted=["play","pause","step","dry","single","reset"];
const axes=["3AX","4AX","5AX","6AX"];
function mountAxis(root){
 const axis=root.dataset.runtime;
 if(!axes.includes(axis)||root.dataset.aig86Mounted==="true")return false;
 const header=root.querySelector(":scope > .axisModuleHeader");
 const left=root.querySelector(":scope > .simleft");
 const editor=root.querySelector(":scope > .editor");
 const body=left?.querySelector(":scope > .body");
 const controls=body?.querySelector(":scope > .controls");
 const viewport=body?.querySelector(":scope > .sceneWrap");
 if(!header||!body||!controls||!viewport||!editor)return false;
 root.dataset.aig86Mounted="true";
 const button=d.createElement("button");button.type="button";button.className="aig86-editor-toggle";
 button.dataset.aig86ToggleNc="";button.dataset.buttonId="BTN_"+axis+"_PANEL_NC";
 button.dataset.commandId="VIEW_NC_EDITOR";button.setAttribute("aria-controls","aig86-nc-"+axis);
 editor.id="aig86-nc-"+axis;header.appendChild(button);
 let preferredCollapsed=true;
 function refresh(){const showing=root.dataset.axisSubpage==="NC_FIRST"||!preferredCollapsed;
  root.dataset.aig86Nc=showing?"expanded":"collapsed";
  button.setAttribute("aria-expanded",String(showing));
  button.textContent=showing?"收合 NC 編輯":"展開 NC 編輯";
  button.hidden=root.dataset.axisSubpage==="NC_FIRST";
 }
 button.addEventListener("click",()=>{preferredCollapsed=!preferredCollapsed;refresh();w.requestAnimationFrame(()=>w.dispatchEvent(new Event("resize")));});
 new MutationObserver(refresh).observe(root,{attributes:true,attributeFilter:["data-axis-subpage"]});
 controls.classList.add("aig86-tool-controls");
 // Move live original DOM elements, never clone controls or spoof core callbacks.
 const advanced=d.createElement("details");advanced.className="aig86-extras";
 const summary=d.createElement("summary");summary.textContent="其他控制";
 const extra=d.createElement("div");extra.className="aig86-extra-commands";
 advanced.append(summary,extra);
 for(const child of [...controls.children]){
  const cmd=child.dataset?.cmd;
  if(!cmd||wanted.includes(cmd))continue;
  extra.appendChild(child);
 }
 if(extra.children.length)controls.appendChild(advanced);
 controls.querySelectorAll("button[data-cmd]").forEach(btn=>{if(btn.dataset.cmd==="reset")btn.title="重設前請確認目前模擬狀態";});
 body.insertBefore(controls,viewport); // Live simulation controls before tall viewport.
 refresh();return true;
}
function mount(){for(const root of d.querySelectorAll(".simgrid.axisModule[data-runtime]"))mountAxis(root)}
if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",mount,{once:true});else mount();
w.AIG_V86_WORKSPACE=Object.freeze({mount,inspect:()=>axes.map(axis=>{const root=d.querySelector('.simgrid.axisModule[data-runtime="'+axis+'"]');return {axis,mounted:root?.dataset.aig86Mounted==="true",ncPanel:root?.dataset.aig86Nc||"UNKNOWN",livePlay:!!root?.querySelector('[data-cmd="play"]'),liveNC:!!root?.querySelector("textarea.code")}})});
})(window,document);
