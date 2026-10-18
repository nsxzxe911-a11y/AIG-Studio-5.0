/* Public site themes only. No CNC operation or project storage changes. */
(function(){
"use strict";
const STORAGE_KEY="aigii.site.visual.theme.v24";
const allowed=new Set(["forest","mountain","coast","rgb"]);
const labels={forest:"森林晨光",mountain:"山嵐清晨",coast:"海岸暮色",rgb:"原版科技黑"};
let current="forest";
try{const value=window.localStorage.getItem(STORAGE_KEY);if(allowed.has(value))current=value}catch(_){}
function apply(theme,persist){
 if(!allowed.has(theme))return;
 current=theme;document.documentElement.dataset.siteTheme=theme;
 const buttons=document.querySelectorAll("[data-theme-choice]");
 for(const button of buttons){button.setAttribute("aria-pressed",String(button.dataset.themeChoice===theme));}
 const message=document.getElementById("aig-theme-status");
 if(message)message.textContent="目前背景："+labels[theme]+(theme==="rgb"?"（保留原站樣式）":"（離線向量景觀）");
 if(persist){try{window.localStorage.setItem(STORAGE_KEY,theme)}catch(_){}}
}
apply(current,false);
function init(){for(const b of document.querySelectorAll("[data-theme-choice]"))b.addEventListener("click",()=>apply(b.dataset.themeChoice,true));apply(current,false);}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
