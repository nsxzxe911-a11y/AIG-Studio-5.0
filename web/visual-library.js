/* AIG RGB catalog filters — image provenance stays separate from runtime UI. */
(function(){
"use strict";
const cards=[...document.querySelectorAll("[data-visual-kind]")];
const buttons=[...document.querySelectorAll("[data-visual-filter]")];
const search=document.getElementById("visual-search");
const summary=document.getElementById("visual-results");
let selected="all";
const keep=(node,q)=>{
 const type=node.dataset.visualKind;
 const group=node.dataset.visualGroup||"";
 const kind=selected==="all"||
  selected==="page"&&(type==="page"&&!group.includes("多軸"))||
  selected==="axis"&&(group.includes("多軸")&&type!=="component")||
  selected==="component"&&type==="component"||
  selected==="missing"&&type==="pending";
 const terms=(node.dataset.visualSearch||"").toLocaleLowerCase("zh-TW");
 return kind&&terms.includes(q);
};
function render(){
 const q=(search?.value||"").trim().toLocaleLowerCase("zh-TW");
 let count=0;
 for(const item of cards){
  const visible=keep(item,q);item.classList.toggle("visual-hidden",!visible);
  item.setAttribute("aria-hidden",String(!visible));
  if(visible)count++;
 }
 for(const button of buttons)button.setAttribute("aria-pressed",String(button.dataset.visualFilter===selected));
 if(summary)summary.textContent="目前符合條件："+count+" 個圖檔／待補項目（整頁圖僅供原圖對照）";
}
for(const button of buttons)button.addEventListener("click",()=>{
 const value=button.dataset.visualFilter;
 if(!["all","page","axis","component","missing"].includes(value))return;
 selected=value;render();
});
search?.addEventListener("input",render);
render();
})();