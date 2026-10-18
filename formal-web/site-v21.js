/* AIG-II Site 2.1: functional discovery; no fake CNC callbacks. */
(function(){
"use strict";
const PAGE_IDS=["HOME","CAD","CAM","SIM","3AX","4AX","5AX","6AX","NC","AI"];
const pages=new Set(PAGE_IDS);
const names={HOME:"工作首頁",CAD:"CAD 製圖",CAM:"CAM 刀路",SIM:"SIM 模擬","3AX":"3AX 三軸","4AX":"4AX 四軸","5AX":"5AX 五軸","6AX":"6AX 六軸",NC:"NC 編輯",AI:"AI 輔助"};
const categoryButtons=Array.from(document.querySelectorAll("[data-module-filter]"));
const groups=Array.from(document.querySelectorAll("[data-search-group][data-module-category]"));
const moduleStatus=document.getElementById("module-filter-status");
const searchInput=document.getElementById("site-search-input");
let selected="ALL";
function renderCategories(){
 let count=0;
 for(const group of groups){
   const allowed=selected==="ALL"||group.dataset.moduleCategory===selected;
   group.classList.toggle("category-hidden",!allowed);
   for(const item of group.querySelectorAll("[data-searchable]")){
     if(allowed&&!item.classList.contains("search-hidden"))count++;
   }
 }
 for(const button of categoryButtons){
   button.setAttribute("aria-pressed",String(button.dataset.moduleFilter===selected));
 }
 if(moduleStatus){
   const name={ALL:"全部功能",DESIGN:"設計與刀路",AXIS:"多軸加工",CODE:"NC 與 AI"}[selected];
   moduleStatus.textContent=name+" · "+count+" 個可進入的工作頁";
 }
}
for(const b of categoryButtons)b.addEventListener("click",()=>{
 const value=b.dataset.moduleFilter;
 if(!["ALL","DESIGN","AXIS","CODE"].includes(value))return;
 selected=value;
 renderCategories();
});
if(searchInput)searchInput.addEventListener("input",renderCategories);
const searchForm=document.getElementById("site-search");
if(searchForm)searchForm.addEventListener("submit",renderCategories);
if(groups.length)renderCategories();

const workflowButtons=Array.from(document.querySelectorAll("[data-workflow-choice]"));
const workflowTitle=document.getElementById("workflow-name");
const workflowText=document.getElementById("workflow-description");
const workflowLink=document.getElementById("workflow-go");
const workflows={
 CAD:{title:"從 CAD 製圖開始",text:"建立幾何與尺寸，接續規劃 CAM 刀路，再進入 SIM 與 NC 檢查。",page:"CAD",link:"開始 CAD 製圖"},
 NC:{title:"直接編輯 NC 程式",text:"已有 G-code 就直接開啟 NC 編輯器，檢查指令、工作座標與刀具設定。",page:"NC",link:"進入 NC 編輯器"},
 SIM:{title:"直接查看加工模擬",text:"選擇 SIM 與機台軸數，查看對應的加工模擬工作頁。",page:"SIM",link:"開啟 SIM 模擬"}
};
function showWorkflow(key){
 const cfg=workflows[key];
 if(!cfg||!workflowLink||!workflowTitle||!workflowText)return;
 workflowTitle.textContent=cfg.title;
 workflowText.textContent=cfg.text;
 workflowLink.href="./mobile-runtime.html#"+cfg.page;
 workflowLink.textContent=cfg.link+"　↗";
 for(const b of workflowButtons)b.setAttribute("aria-pressed",String(b.dataset.workflowChoice===key));
}
for(const b of workflowButtons)b.addEventListener("click",()=>showWorkflow(b.dataset.workflowChoice));
if(workflowButtons.length)showWorkflow("CAD");

const RECENT_KEY="aigii.site.recent-pages.v1";
const recentList=document.getElementById("recent-pages-list");
const recentEmpty=document.getElementById("recent-pages-empty");
function readRecent(){
 try{
  const x=JSON.parse(localStorage.getItem(RECENT_KEY)||"[]");
  return Array.isArray(x)?[...new Set(x.filter(p=>typeof p==="string"&&pages.has(p)))].slice(0,4):[];
 }catch(_){return []}
}
function renderRecent(){
 if(!recentList||!recentEmpty)return;
 recentList.replaceChildren();
 const recent=readRecent();
 recentEmpty.hidden=recent.length>0;
 for(const page of recent){
  const li=document.createElement("li");
  const a=document.createElement("a");
  a.href="./mobile-runtime.html#"+page;
  const span=document.createElement("span");
  span.textContent=names[page];
  const arrow=document.createElement("em");
  arrow.textContent="開啟 ›";
  a.append(span,arrow);li.appendChild(a);recentList.appendChild(li);
 }
}
function saveRecent(page){
 if(!pages.has(page))return;
 const list=[page,...readRecent().filter(p=>p!==page)].slice(0,4);
 try{localStorage.setItem(RECENT_KEY,JSON.stringify(list))}catch(_){}
 renderRecent();
}
document.addEventListener("click",event=>{
 const link=event.target&&event.target.closest?event.target.closest('a[href*="mobile-runtime.html#"]'):null;
 if(!link)return;
 const href=link.getAttribute("href")||"";
 const match=href.match(/^(?:\.\/)?mobile-runtime\.html#(HOME|CAD|CAM|SIM|3AX|4AX|5AX|6AX|NC|AI)$/i);
 if(match)saveRecent(match[1].toUpperCase());
});
renderRecent();

const backTop=document.getElementById("site-back-top");
if(backTop){
 const refresh=()=>{backTop.hidden=(window.scrollY||0)<460};
 backTop.addEventListener("click",()=>window.scrollTo({top:0,behavior:window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"}));
 window.addEventListener("scroll",refresh,{passive:true});
 refresh();
}
})();
