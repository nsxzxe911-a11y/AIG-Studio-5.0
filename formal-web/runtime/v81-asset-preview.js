/* V81: nonblocking, opt-in authority preview. Never replaces live controls. */
(function(w,d){"use strict";
const map={NC:"AIG_NC_RGB_4K_candidate.png",AI:"AIG_AI_RGB_4K_candidate.png","刀路":"AIG_3D_TOOLPATH_RGB_4K_candidate.png"};
function mount(){for(const [page,file] of Object.entries(map)){
const screen=[...d.querySelectorAll(".screen")].find(el=>el.dataset.page===page);
if(!screen||screen.querySelector("[data-aig81-preview]"))continue;
const details=d.createElement("details");details.className="aig81-preview";details.dataset.aig81Preview=page;
const summary=d.createElement("summary");summary.textContent="檢視 "+page+" RGB 候選設計（非操作畫面）";details.append(summary);
const img=d.createElement("img");img.loading="lazy";img.alt=page+" RGB 候選設計參考，不是功能按鈕";img.src="./visual-library/pages/"+file;
img.onerror=()=>{details.hidden=true;details.dataset.assetStatus="MISSING"};
img.onload=()=>{details.dataset.assetStatus="AVAILABLE"};
details.append(img);screen.insertBefore(details,screen.firstChild);
}}
if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",mount,{once:true});else mount();
w.AIG_V81_PREVIEW=Object.freeze({mount,inspect:()=>[...d.querySelectorAll("[data-aig81-preview]")].map(x=>({page:x.dataset.aig81Preview,status:x.dataset.assetStatus||"PENDING"}))});
})(window,document);