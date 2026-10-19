/* V74 unified formal RGB skin: preserve live controls and runtime, suppress engineering presentation. */
(function(w,d){"use strict";
const pages=["HOME","CAD","CAM","SIM","3AX","4AX","5AX","6AX","NC","AI","刀路"];
function apply(){
 d.documentElement.classList.add("aig74-formal");
 for(const name of pages){
  const root=[...d.querySelectorAll(".app .shell .screen")].find(x=>x.dataset.page===name);
  if(!root)continue;root.classList.add("aig74-formal-screen");
  root.dataset.aig74Skin="RGB_GLASS";root.dataset.aig74LegacyLayer="BACKGROUND_ONLY";
  if(!root.querySelector(":scope > .aig74-page-heading")){
   const head=d.createElement("header");head.className="aig74-page-heading";
   const title=d.createElement("strong");title.textContent="AIG · "+(name==="刀路"?"3D 走刀":name);
   const note=d.createElement("span");note.textContent="正式工作區";
   head.append(title,note);root.insertBefore(head,root.firstChild);
  }
 }
}
if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",apply,{once:true});else apply();
w.AIG_V74_FORMAL_SKIN=Object.freeze({apply,inspect:()=>({screens:d.querySelectorAll(".aig74-formal-screen").length,legacyPolicy:"BACKGROUND_ONLY",controlsRetained:true,visualBrowserGate:"PENDING"})});
})(window,document);