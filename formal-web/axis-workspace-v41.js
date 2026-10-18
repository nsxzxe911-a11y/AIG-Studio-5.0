/* AIG-II / Studio V41: real CNC workspace priority layouts (presentation only).
   No scrollIntoView, G-code focus, canvas recreation, persisted NC writes or machine output. */
(function(w,d){"use strict";
 const AXES=new Set(["3AX","4AX","5AX","6AX"]);
 const choices=[["machine","機台優先"],["balanced","均衡"],["code","程式優先"]];
 const mounted=new Map();
 function node(tag,cls,label){
   const e=d.createElement(tag);if(cls)e.className=cls;if(label!==undefined)e.textContent=label;
   return e;
 }
 function read(root,selector){return(root.querySelector(selector)?.textContent||"").trim();}
 function mount(root){
   if(mounted.has(root)||!AXES.has(root.dataset.runtime))return false;
   if(!root.querySelector(":scope > .simleft")||!root.querySelector(":scope > .editor"))return false;
   const axis=root.dataset.runtime;
   root.classList.add("aig41-workspace");
   root.dataset.aig41View="machine";
   root.dataset.aig41HasHeader=root.querySelector(":scope > .axisModuleHeader")?"true":"false";
   const toolbar=node("section","aig41-toolbar");
   toolbar.setAttribute("aria-label",axis+" 工作區畫面配置");
   const title=node("strong","aig41-title",axis+" · 加工工作區");
   const group=node("div","aig41-layout-choices");
   group.setAttribute("role","group");group.setAttribute("aria-label","工作區佈局");
   const buttons=[];
   for(const [key,label] of choices){
     const button=node("button","aig41-layout-button",label);
     button.type="button";button.dataset.aig41Layout=key;
     button.setAttribute("aria-pressed",String(key==="machine"));
     button.addEventListener("click",()=>setView(root,key));
     group.appendChild(button);buttons.push(button);
   }
   const status=node("div","aig41-live-status");
   status.setAttribute("aria-label","現有 Runtime 加工狀態");
   status.setAttribute("aria-live","off");
   const state=node("span","aig41-state","等待模擬");
   const block=node("span","aig41-block","目前區塊 —");
   const progress=node("span","aig41-progress","進度 —");
   status.append(state,block,progress);
   const desc=node("small","aig41-description","切換只調整視窗比例；播放、NC、切削皆沿用原核心");
   toolbar.append(title,group,status,desc);
   const originalHeader=root.querySelector(":scope > .axisModuleHeader");
   if(originalHeader)originalHeader.insertAdjacentElement("afterend",toolbar);
   else root.insertBefore(toolbar,root.firstChild);
   mounted.set(root,{toolbar,buttons,state,block,progress});
   updateStatus(root);
   return true;
 }
 function setView(root,layout){
   if(!mounted.has(root)||!choices.some(([key])=>key===layout))return false;
   root.dataset.aig41View=layout;
   const view=mounted.get(root);
   for(const button of view.buttons){
     const selected=button.dataset.aig41Layout===layout;
     button.setAttribute("aria-pressed",String(selected));
   }
   return true;
 }
 function updateStatus(root){
   const view=mounted.get(root);if(!view)return;
   const badge=read(root,"[data-run-badge]")||"待初始化";
   const block=read(root,"[data-block]")||"—";
   const progress=read(root,"[data-progress-text]")||"—";
   const collision=read(root,"[data-collision]")||"";
   let line=badge;
   if(collision&&!/^(CLEAR|OK|—|0|待初始化)$/i.test(collision))line="碰撞提醒："+collision;
   if(view.state.textContent!==line)view.state.textContent=line;
   const current="區塊 "+block;if(view.block.textContent!==current)view.block.textContent=current;
   const ratio="進度 "+progress;if(view.progress.textContent!==ratio)view.progress.textContent=ratio;
   view.toolbar.dataset.aig41Alert=line.startsWith("碰撞提醒")?"true":"false";
 }
 function refresh(){
   const root=d.querySelector(".screen.active .simgrid[data-runtime]");
   if(!root||!AXES.has(root.dataset.runtime))return{axis:null,ready:false};
   mount(root);updateStatus(root);
   return{axis:root.dataset.runtime,ready:mounted.has(root),layout:root.dataset.aig41View};
 }
 let alive=true;
 function loop(){
   if(!alive)return;
   if(d.visibilityState!=="hidden")refresh();
   w.setTimeout(loop,d.visibilityState==="hidden"?1400:450);
 }
 function start(){
   for(const root of d.querySelectorAll(".simgrid[data-runtime]"))mount(root);
   refresh();w.setTimeout(loop,250);
 }
 if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",start,{once:true});else start();
 w.AIG_WORKSPACE_V41=Object.freeze({release:"41.0.0",refresh,setView,read(root){
   return{axis:root?.dataset?.runtime||null,layout:root?.dataset?.aig41View||null,exists:mounted.has(root)};
 },stop:()=>{alive=false}});
})(window,document);
