/* AIG-II Render / Studio 375 V23: opt-in read-only DOM/runtime attachment check.
   This does NOT assert machining correctness, precision or CNC machine output.
   No storage write, no canvas draw, no NC/CAM action dispatch.
*/
(()=>{"use strict";
 const bar=document.querySelector(".aig-studio-v375-portal-link");
 if(!bar||document.getElementById("v23-inspect-button"))return;
 const button=document.createElement("button");
 button.type="button";button.id="v23-inspect-button";button.className="v23-check-trigger";
 button.textContent="逐頁檢查";
 button.setAttribute("aria-haspopup","dialog");
 bar.appendChild(button);
 const dialog=document.createElement("dialog");
 dialog.id="v23-check-dialog";dialog.className="v23-check-dialog";
 const heading=document.createElement("h2");heading.textContent="Studio 375 · 十頁掛載自檢";
 const intro=document.createElement("p");intro.textContent="唯讀核對真實 DOM 與操作元件，不點擊切削、不儲存資料，也不代表 0.001 mm 或 Release Gate PASS。";
 const summary=document.createElement("p");summary.id="v23-check-summary";summary.setAttribute("role","status");
 const table=document.createElement("div");table.id="v23-check-results";table.className="v23-check-results";
 const foot=document.createElement("div");foot.className="v23-dialog-actions";
 const refresh=document.createElement("button");refresh.type="button";refresh.textContent="重新檢查";
 const close=document.createElement("button");close.type="button";close.textContent="關閉";
 const portal=document.createElement("a");portal.href="./dual-project-latest.html#page-check";portal.textContent="十頁入口 ↗";
 foot.append(refresh,portal,close);
 dialog.append(heading,intro,summary,table,foot);
 document.body.appendChild(dialog);
 const definitions=[
  ["HOME","正式 HOME","[data-home-runtime]","[data-open-page='CAD']"],
  ["CAD","CAD 製圖","[data-cad-runtime]","canvas[data-cad-canvas]"],
  ["CAM","CAM 刀路","[data-cam-runtime]","canvas.camCanvas"],
  ["SIM","SIM 模擬","[data-sim-hub]","[data-sim-axis='3AX']"],
  ["3AX","3AX 三軸","[data-runtime='3AX']","canvas[data-glcanvas]"],
  ["4AX","4AX 四軸","[data-runtime='4AX']","canvas[data-glcanvas]"],
  ["5AX","5AX 五軸","[data-runtime='5AX']","canvas[data-glcanvas]"],
  ["6AX","6AX 六軸","[data-runtime='6AX']","canvas[data-glcanvas]"],
  ["NC","NC 編輯","[data-nc-runtime]","[data-nc-code]"],
  ["AI","AI 輔助","[data-ai-runtime]","[data-ai-cad]"]
 ];
 function inspect(){
  table.replaceChildren();
  let matched=0;
  for(const [page,name,component,operation] of definitions){
   const screen=document.querySelector(".screen[data-page='"+page+"']");
   const mount=screen&&screen.querySelector(component);
   const control=screen&&screen.querySelector(operation);
   const ok=!!(screen&&mount&&control);
   if(ok)matched++;
   const row=document.createElement("div");row.className="v23-check-row";
   const nameEl=document.createElement("strong");nameEl.textContent=name;
   const status=document.createElement("span");status.className=ok?"v23-check-mounted":"v23-check-missing";
   status.textContent=ok?"元件掛載可見":"缺少元件，需修復";
   const go=document.createElement("button");go.type="button";go.textContent="進入 "+page;
   go.addEventListener("click",()=>{
    if(typeof dialog.close==="function")dialog.close();else dialog.hidden=true;
    const nav=document.querySelector(".nav button[data-page='"+page+"']");
    if(nav)nav.click();else location.hash="#"+page;
   });
   row.append(nameEl,status,go);table.appendChild(row);
  }
  summary.textContent="實際 DOM 掛載："+matched+" / "+definitions.length+" 頁。此數字不是功能、材料移除或 CNC 安全驗收結果。";
  return matched;
 }
 button.addEventListener("click",()=>{
  inspect();
  if(typeof dialog.showModal==="function")dialog.showModal();else dialog.hidden=false;
 });
 refresh.addEventListener("click",inspect);
 close.addEventListener("click",()=>{if(typeof dialog.close==="function")dialog.close();else dialog.hidden=true});
 dialog.addEventListener("click",event=>{if(event.target===dialog&&typeof dialog.close==="function")dialog.close()});
 window.AIG_STUDIO_V23_INSPECT=Object.freeze({inspect});
})();
