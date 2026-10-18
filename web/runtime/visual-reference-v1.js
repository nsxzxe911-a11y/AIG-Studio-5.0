/* AIG RGB per-module image reference: display only.
   No button overlay, no fake machine state, no Canvas/WebGL interception. */
(function(){
"use strict";
const refs=Object.freeze({
 HOME:["首頁","home.png"],CAD:["製圖","cad.png"],CAM:["刀路","cam.jpg"],
 SIM:["模擬","sim.jpg"],"3AX":["三軸","axis3.jpg"],"4AX":["四軸","axis4.png"],"5AX":["五軸","axis5.jpg"],
 "6AX":["六軸",null],NC:["NC",null],AI:["AI",null]
});
function create(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n}
function addPreview(screen){
 const page=screen.dataset.page,entry=refs[page];if(!entry||screen.querySelector(".aig-reference-strip"))return;
 const [label,file]=entry,details=create("details","aig-reference-strip");
 details.dataset.imageId=file?"IMG-AIGII-ARCHIVE-"+page+"-V1":"AIGII-MOBILE-"+page+"-CURRENT-20261016";
 const summary=create("summary","aig-reference-summary");
 const tile=create("span","aig-reference-mini");
 if(file){
  const img=create("img");img.src="./visual-library/pages/"+file;img.alt="";img.loading="lazy";img.decoding="async";tile.appendChild(img);
 }else tile.textContent="已入庫";
 const copy=create("span","aig-reference-copy");
 copy.append(create("strong","",page+"｜"+label+"：已入庫原圖對照"),
             create("small","","只顯示視覺參考，不干涉畫圖、3D 或按鈕；點擊展開"));
 summary.append(tile,copy,create("span","aig-reference-chevron","展開原圖 ▾"));
 details.appendChild(summary);
 const panel=create("div","aig-reference-detail");
 if(file){
  const fig=create("figure");
  const img=create("img");img.src="./visual-library/pages/"+file;
  img.alt=page+" 已入庫歷史整頁視覺參考，不是真正操作畫面";
  img.loading="lazy";img.decoding="async";
  fig.appendChild(img);
  const cap=create("figcaption","","舊圖庫原圖預覽；不是最後核准的 Mobile/Desktop Authority，也不是可操作的機台畫面。");
  fig.appendChild(cap);panel.appendChild(fig);
 }else panel.appendChild(create("p","","此頁 Mobile／Desktop Authority 原圖均已找到；網站尚未同步這批原始 PNG，暫時不展示替代圖。"));
 const link=create("a","aig-reference-link","開啟完整圖庫／來源分類 ↗");link.href="./image-library.html";
 link.target="_blank";link.rel="noopener noreferrer";panel.appendChild(link);
 details.append(panel);screen.appendChild(details);
}
function init(){document.querySelectorAll(".screen[data-page]").forEach(addPreview)}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
