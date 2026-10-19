/* V73: one authentic image per runtime page, never cover interactive controls. */
(function(w,d){"use strict";
const pages={HOME:"home.png",CAD:"cad.png",CAM:"cam.jpg",SIM:"sim.jpg","3AX":"axis3.jpg","4AX":"axis4.png","5AX":"axis5.jpg"};
function mount(){for(const [page,file] of Object.entries(pages)){
 const screen=d.querySelector('.app .shell .screen[data-page="'+page+'"]');if(!screen)continue;
 if(screen.querySelector(".aig73-page-art"))continue;
 const figure=d.createElement("figure");figure.className="aig73-page-art";figure.dataset.aig73Page=page;
 const image=d.createElement("img");image.src="./visual-library/pages/"+file;image.alt=page+" RGB 頁面參考圖";image.loading=page==="HOME"?"eager":"lazy";
 image.onerror=()=>{figure.hidden=true;figure.dataset.aig73Status="MISSING_IMAGE"};
 image.onload=()=>{figure.dataset.aig73Status="LOADED"};
 figure.append(image);screen.insertBefore(figure,screen.firstChild);
 }
}
if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",mount,{once:true});else mount();
w.AIG_V73_PAGE_ART=Object.freeze({mount,inspect:()=>Object.fromEntries([...d.querySelectorAll(".aig73-page-art")].map(x=>[x.dataset.aig73Page,x.dataset.aig73Status||"LOADING"]))});
})(window,document);
