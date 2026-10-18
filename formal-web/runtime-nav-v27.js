/* V27 – Traditional Chinese modular navigation, existing real page callbacks only. */
(function(w,d){"use strict";
const DATA=[["HOME","首頁","主頁","[data-home-runtime]"],["CAD","CAD 製圖","設計","[data-cad-runtime]"],["CAM","CAM 刀路","設計","[data-cam-runtime]"],["SIM","SIM 模擬","多軸模擬","[data-sim-hub]"],["3AX","三軸加工","多軸模擬","[data-runtime='3AX']"],["4AX","四軸加工","多軸模擬","[data-runtime='4AX']"],["5AX","五軸加工","多軸模擬","[data-runtime='5AX']"],["6AX","六軸加工","多軸模擬","[data-runtime='6AX']"],["NC","NC 程式","NC 與 AI","[data-nc-runtime]"],["AI","AI 助手","NC 與 AI","[data-ai-runtime],[data-ai-page-runtime]"],["刀路","刀路編輯","設計","[data-tp-runtime]"],["功能","功能設定","主頁","[data-menu-runtime]"]];
const pageMap=new Map(DATA.map(item=>[item[0],item]));
const nav=d.getElementById("nav"),top=d.querySelector(".top");
if(!nav||!top)return;
const launch=d.createElement("button");
launch.id="ux27-launch";launch.className="ux27-launch";launch.type="button";launch.textContent="繁中模組導航";launch.setAttribute("aria-haspopup","dialog");
top.insertBefore(launch,top.querySelector(".status")||null);
const pop=d.createElement("dialog");pop.className="ux27-dialog";pop.id="ux27-dialog";pop.setAttribute("aria-label","繁中模組導航");
const head=d.createElement("header"),title=d.createElement("h2"),exit=d.createElement("button");
head.className="ux27-head";title.textContent="AIG 正式模組導航";
exit.type="button";exit.textContent="關閉";head.append(title,exit);
const tip=d.createElement("p");tip.textContent="按鈕連接原本的 CNC 頁面切換函式，並非圖片或假按鈕。";
const layout=d.createElement("div");layout.className="ux27-layout";
const groups=d.createElement("div");groups.className="ux27-groups";
for(const group of ["主頁","設計","多軸模擬","NC 與 AI"]){
 const section=d.createElement("section"),h=d.createElement("h3"),buttons=d.createElement("div");
 section.className="ux27-section";buttons.className="ux27-buttons";h.textContent=group;
 for(const entry of DATA.filter(x=>x[2]===group)){
  const b=d.createElement("button");b.type="button";b.dataset.ux27Page=entry[0];b.textContent=entry[1];buttons.appendChild(b);
 }
 section.append(h,buttons);groups.appendChild(section);
}
const aside=d.createElement("aside");aside.className="ux27-aside";
const h=d.createElement("h3");h.textContent="實際頁面狀態";
const status=d.createElement("p"),network=d.createElement("p"),mount=d.createElement("p"),warn=d.createElement("p");
warn.className="ux27-warning";warn.textContent="僅檢查 DOM 掛載，不能視為材料移除、加工精度或 Release Gate PASS。";
const reload=d.createElement("button"),settings=d.createElement("button"),back=d.createElement("a");
reload.type="button";reload.textContent="重新讀取狀態";
settings.type="button";settings.textContent="介面設定";
back.href="./index.html#dual-projects";back.textContent="返回原網站 ↗";
aside.append(h,status,network,mount,warn,reload,settings,back);layout.append(groups,aside);
const foot=d.createElement("p");foot.className="ux27-foot";foot.textContent="所有 CNC 輸出保持停用；工作頁與程式資料不因導覽切換而清除。";
pop.append(head,tip,layout,foot);d.body.appendChild(pop);
function current(){return nav.querySelector("button.active[data-page]")?.dataset.page||d.querySelector(".screen.active")?.dataset.page||"HOME"}
function inspect(){
 const id=current(),entry=pageMap.get(id),screen=d.querySelector('.screen[data-page="'+id+'"]');
 const found=screen&&entry?screen.querySelector(entry[3]):null;
 status.textContent="當前頁面："+(entry?.[1]||id)+"（"+id+"）";
 network.textContent="網站網路："+(w.navigator?.onLine===false?"離線":"未偵測到離線")+"，不代表 CNC 模組連接狀態。";
 mount.textContent=screen?(found?"頁面元件：已建立（不等於功能 PASS）":"頁面元件：待初始化或未找到"):"頁面元件：尚未建立";
 for(const b of groups.querySelectorAll("[data-ux27-page]"))b.setAttribute("aria-current",String(b.dataset.ux27Page===id));
 return{page:id,mounted:!!found};
}
function open(){inspect();if(typeof pop.showModal==="function"){if(!pop.open)pop.showModal()}else pop.setAttribute("open","")}
function close(){if(typeof pop.close==="function"){if(pop.open)pop.close()}else pop.removeAttribute("open")}
function navigate(page){
 if(!pageMap.has(page))return false;
 const link=Array.from(nav.querySelectorAll("button[data-page]")).find(b=>b.dataset.page===page);
 if(!link){mount.textContent="原始工作區缺少對應真按鈕，沒有切換。";return false}
 close();link.click();
 if(typeof w.requestAnimationFrame==="function")w.requestAnimationFrame(inspect);else inspect();
 return true;
}
launch.addEventListener("click",open);exit.addEventListener("click",close);reload.addEventListener("click",inspect);
settings.addEventListener("click",()=>{close();const button=d.querySelector(".uiux25-launch");if(button)button.click()});
groups.addEventListener("click",e=>{const b=e.target.closest("[data-ux27-page]");if(b)navigate(b.dataset.ux27Page)});
w.addEventListener?.("online",()=>{if(pop.open)inspect()});w.addEventListener?.("offline",()=>{if(pop.open)inspect()});
w.AIG_UIUX_V27=Object.freeze({version:"27",open,navigate,inspect,pages:DATA.map(x=>x[0])});
})(window,document);