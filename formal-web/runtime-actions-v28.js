/* V28 formal RGB context palette – delegates only safe selection actions to REAL page buttons.
   CNC edit/destructive actions are never mirrored. Readiness is not reported as Gate PASS. */
(function(w,d){"use strict";
const dialog=d.getElementById("ux27-dialog"),api=w.AIG_UIUX_V27;
if(!dialog||!api)return;
const aside=dialog.querySelector(".ux27-aside");
if(!aside)return;
const PALETTE={
CAD:[
 ["選取","[data-cad-tool='SELECT']","invoke"],["直線","[data-cad-tool='LINE']","invoke"],
 ["矩形","[data-cad-tool='RECT']","invoke"],["圓形","[data-cad-tool='CIRCLE']","invoke"],
 ["圓弧","[data-cad-tool='ARC']","invoke"],["孔","[data-cad-tool='HOLE']","invoke"],
 ["找到復原鍵","[data-cad-action='UNDO']","focus"]
],
CAM:[
 ["平面加工","[data-cam-strategy='FACE']","invoke"],
 ["輪廓加工","[data-cam-strategy='PROFILE']","invoke"],
 ["口袋加工","[data-cam-strategy='POCKET']","invoke"],
 ["鑽孔","[data-cam-strategy='DRILL']","invoke"],
 ["找到計算刀路","[data-cam-action='CALC']","focus"]
],
SIM:[
 ["進入三軸","[data-open-page='3AX']","invoke"],
 ["進入四軸","[data-open-page='4AX']","invoke"],
 ["進入五軸","[data-open-page='5AX']","invoke"],
 ["進入六軸","[data-open-page='6AX']","invoke"]
],
NC:[
 ["定位 NC 編輯器","[data-nc-code]","focus"],
 ["找到驗證鍵","[data-nc-action='VERIFY']","focus"],
 ["找到儲存鍵","[data-nc-action='SAVE']","focus"]
],
"刀路":[
 ["找到畫布","[data-tp-canvas]","focus"],
 ["找到驗證鍵","[data-tp-action='VERIFY']","focus"]
],
AI:[
 ["定位分析條件","[data-ai-objective]","focus"],
 ["定位分析軸別","[data-ai-axis]","focus"],
 ["找到 AI 分析鍵","[data-ai-analyze]","focus"],
 ["找到 AI 規劃鍵","[data-ai-command='AI.PLAN.BUILD']","focus"]
]
};
for(const axis of ["3AX","4AX","5AX","6AX"]){
 PALETTE[axis]=[
  ["找到播放鍵","[data-cmd='play']","focus"],
  ["暫停模擬","[data-cmd='pause']","invoke"],
  ["開啟 NC-first 工作頁","[data-axis-subpage='NC_FIRST']","invoke"],
  ["定位 G-code","[data-code]","focus"]
 ];
}
const panel=d.createElement("section");panel.className="ux28-real-controls";panel.setAttribute("aria-label","當前模組真控制快捷");
const title=d.createElement("h3");title.textContent="當前模組 · 真控制快捷";
const text=d.createElement("p");text.className="ux28-explain";text.textContent="僅顯示確實存在的工作頁按鈕。直接選工具或定位原按鈕，不代替 CNC 執行。";
const controls=d.createElement("div");controls.className="ux28-buttons";
const details=d.createElement("p");details.className="ux28-status";details.setAttribute("role","status");details.setAttribute("aria-live","polite");
panel.append(title,text,controls,details);
const anchor=aside.querySelector(".ux27-warning");
if(anchor)anchor.insertAdjacentElement("afterend",panel);else aside.appendChild(panel);
function active(){
 return d.querySelector("#nav button.active[data-page]")?.dataset.page||
        d.querySelector(".screen.active")?.dataset.page||"HOME";
}
function screenFor(page){return d.querySelector('.screen[data-page="'+page+'"]')}
function findTarget(page,selector){
 const screen=screenFor(page);
 const result=screen?.querySelector(selector);
 if(!result||result.disabled||result.closest?.("[hidden]"))return null;
 return result;
}
function focusExisting(target){
 if(typeof target.scrollIntoView==="function")target.scrollIntoView({block:"center",behavior:"auto"});
 if(typeof target.focus==="function")target.focus({preventScroll:true});
}
function refresh(){
 controls.replaceChildren();
 const page=active(),items=PALETTE[page]||[];
 const available=items.map(([label,selector,kind])=>({label,selector,kind,element:findTarget(page,selector)})).filter(x=>x.element);
 for(const item of available){
  const b=d.createElement("button");b.type="button";b.className=item.kind==="invoke"?"ux28-operate":"ux28-locate";
  b.textContent=item.label;b.dataset.ux28Selector=item.selector;
  b.setAttribute("aria-label",(item.kind==="invoke"?"以原按鈕選擇":"找到原始控制：")+item.label);
  b.addEventListener("click",()=>{
   const target=findTarget(active(),item.selector);
   if(!target){details.textContent="原控制已不存在或不可用，未執行動作。";return}
   if(dialog.open&&typeof dialog.close==="function")dialog.close();
   if(item.kind==="invoke"){
    // Only safe, explicitly allowlisted selection/pause/navigation actions use this path.
    target.click();
   }else focusExisting(target);
  });
  controls.appendChild(b);
 }
 details.textContent=available.length
  ?"已找到 "+available.length+" 個當前頁面控制。選取工具會呼叫原按鈕；「找到」只定位，不執行危險操作。"
  :"此頁沒有核准的快捷動作；請用原工作頁控制，不會生成假按鈕。";
 return{page,controls:available.length};
}
const open=d.getElementById("ux27-launch");
if(open)open.addEventListener("click",refresh);
const refreshButton=aside.querySelector("button");
if(refreshButton)refreshButton.addEventListener("click",refresh);
const nav=d.getElementById("nav");
if(nav)nav.addEventListener("click",()=>{if(dialog.open){if(w.requestAnimationFrame)w.requestAnimationFrame(refresh);else refresh();}});
w.AIG_UIUX_V28=Object.freeze({version:"28",refresh,allowedPages:Object.keys(PALETTE)});
})(window,document);