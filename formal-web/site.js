/* AIG-II public website navigation and on-page search.
   This page is the public dual-project portal; retired Web runtimes remain disabled. */
(function(){
"use strict";
const PAGES=new Set(["HOME","CAD","CAM","SIM","3AX","4AX","5AX","6AX","NC","AI"]);
/* Offline-first site navigation, without blocking the visible page. */
if(typeof navigator!=="undefined" && "serviceWorker" in navigator){
 window.addEventListener("load",()=>{
  navigator.serviceWorker.register("./service-worker.js").catch(()=>{});
 },{once:true});
}
function legacyDeepLink(){
  let page="";
  try{page=decodeURIComponent(location.hash.slice(1)).toUpperCase()}catch(_){return false}
  if(!PAGES.has(page))return false;
  const dest=new URL("./native-download.html",location.href);
  dest.hash=page;
  location.replace(dest.href);
  return true;
}
if(legacyDeepLink())return;
window.addEventListener("hashchange",legacyDeepLink);
const nav=document.querySelector(".nav-inner");
const toggle=document.getElementById("site-menu-toggle");
if(nav&&toggle){
  toggle.addEventListener("click",()=>{
    const expanded=nav.dataset.expanded!=="true";
    nav.dataset.expanded=String(expanded);
    toggle.setAttribute("aria-expanded",String(expanded));
  });
  for(const a of nav.querySelectorAll("a")){
    a.addEventListener("click",()=>{
      nav.dataset.expanded="false";
      toggle.setAttribute("aria-expanded","false");
    });
  }
}
const input=document.getElementById("site-search-input");
const searchForm=document.getElementById("site-search");
const message=document.getElementById("site-search-message");
const empty=document.getElementById("site-search-empty");
if(!input||!searchForm||!message||!empty)return;
const items=Array.from(document.querySelectorAll("[data-searchable]"));
const groups=Array.from(document.querySelectorAll("[data-search-group]"));
const simplify=s=>String(s||"").normalize("NFKC").trim().toLocaleLowerCase();
function filter(){
  const q=simplify(input.value);
  let visible=0;
  for(const item of items){
    const match=!q||simplify(item.textContent+" "+(item.dataset.searchable||"")).includes(q);
    item.classList.toggle("search-hidden",!match);
    if(match)visible++;
  }
  for(const group of groups){
    const children=group.querySelectorAll("[data-searchable]");
    const hasAny=Array.from(children).some(item=>!item.classList.contains("search-hidden"));
    group.classList.toggle("search-hidden",!hasAny);
  }
  empty.dataset.visible=String(Boolean(q)&&visible===0);
  message.textContent=q?(visible+" 項符合搜尋"):"可搜尋 CAD、CAM、SIM、軸數及 G-code 等功能";
}
searchForm.addEventListener("submit",event=>{
  event.preventDefault();
  filter();
  document.getElementById("modules")?.scrollIntoView({block:"start",behavior:"smooth"});
});
input.addEventListener("input",filter);
document.addEventListener("keydown",event=>{
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="k"){
    event.preventDefault();input.focus();input.select();
  }
  if(event.key==="Escape"&&document.activeElement===input){
    input.value="";filter();input.blur();
  }
});
filter();
})();
