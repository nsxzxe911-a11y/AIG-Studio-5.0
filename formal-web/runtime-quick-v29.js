/* V29: RGB compact real-controls dock. Selection/navigation/pause only. CNC dangerous actions are focus-only. */
(function(w,d){"use strict";
const nav=d.getElementById("nav"),top=d.querySelector(".top");
if(!nav||!top||!w.AIG_UIUX_V27||!w.AIG_UIUX_V28)return;
const actions={
 HOME:[["CAD 製圖","CAD","nav"],["CAM 刀路","CAM","nav"],["NC 編輯","NC","nav"],["AI 助手","AI","nav"]],
 CAD:[["選取","[data-cad-tool='SELECT']","invoke"],["直線","[data-cad-tool='LINE']","invoke"],["矩形","[data-cad-tool='RECT']","invoke"],["圓","[data-cad-tool='CIRCLE']","invoke"],["圓弧","[data-cad-tool='ARC']","invoke"],["孔","[data-cad-tool='HOLE']","invoke"],["復原鍵位置","[data-cad-action='UNDO']","focus"]],
 CAM:[["平面","[data-cam-strategy='FACE']","invoke"],["輪廓","[data-cam-strategy='PROFILE']","invoke"],["口袋","[data-cam-strategy='POCKET']","invoke"],["鑽孔","[data-cam-strategy='DRILL']","invoke"],["計算刀路位置","[data-cam-action='CALC']","focus"]],
 SIM:[["三軸","3AX","nav"],["四軸","4AX","nav"],["五軸","5AX","nav"],["六軸","6AX","nav"]],
 NC:[["G-code 編輯器","[data-nc-code]","focus"],["驗證鍵位置","[data-nc-action='VERIFY']","focus"],["儲存鍵位置","[data-nc-action='SAVE']","focus"]],
 "刀路":[["刀路畫布","[data-tp-canvas]","focus"],["驗證鍵位置","[data-tp-action='VERIFY']","focus"]],
 AI:[["分析條件","[data-ai-objective]","focus"],["軸別設定","[data-ai-axis]","focus"],["分析鍵位置","[data-ai-analyze]","focus"],["規劃鍵位置","[data-ai-command='AI.PLAN.BUILD']","focus"]]
};
for(const id of ["3AX","4AX","5AX","6AX"])actions[id]=[
 ["播放鍵位置","[data-cmd='play']","focus"],["暫停模擬","[data-cmd='pause']","invoke"],
 ["NC-first 工作頁","[data-axis-subpage='NC_FIRST']","invoke"],["G-code 編輯區","[data-code]","focus"]
];
const button=d.createElement("button");button.type="button";button.id="ux29-launch";button.className="ux29-launch";button.textContent="快捷控制";
button.setAttribute("aria-controls","ux29-panel");button.setAttribute("aria-expanded","false");button.setAttribute("aria-haspopup","true");
top.insertBefore(button,top.querySelector(".status")||null);
const panel=d.createElement("section");panel.className="ux29-panel";panel.id="ux29-panel";panel.hidden=true;panel.setAttribute("role","region");panel.setAttribute("aria-label","當前模組快捷控制");
const header=d.createElement("div");header.className="ux29-head";
const name=d.createElement("strong"),close=d.createElement("button");close.type="button";close.textContent="關閉";header.append(name,close);
const hint=d.createElement("p");hint.className="ux29-hint";hint.textContent="綠邊直接呼叫原控制；藍邊只定位。沒有真正的原控制就不顯示。";
const grid=d.createElement("div");grid.className="ux29-grid";
const status=d.createElement("p");status.className="ux29-detail";status.setAttribute("role","status");status.setAttribute("aria-live","polite");
panel.append(header,hint,grid,status);d.body.appendChild(panel);
const toast=d.createElement("p");toast.className="ux29-feedback";toast.hidden=true;toast.setAttribute("role","status");toast.setAttribute("aria-live","polite");d.body.appendChild(toast);
let toastTimer=0;
function active(){return nav.querySelector("button.active[data-page]")?.dataset.page||d.querySelector(".screen.active[data-page]")?.dataset.page||"HOME"}
function currentScreen(id){const s=d.querySelector(".screen.active[data-page]");return s?.dataset.page===id?s:null}
function target(id,selector,mode){
 if(mode==="nav"){const b=Array.from(nav.querySelectorAll("button[data-page]")).find(x=>x.dataset.page===selector);return b&&!b.disabled?b:null}
 const s=currentScreen(id);if(!s)return null;const el=s.querySelector(selector);
 if(!el||!el.isConnected||el.disabled||el.getAttribute("aria-disabled")==="true"||el.closest("[hidden],[inert]"))return null;
 let parent=el;
 while(parent&&parent!==s){
  const style=typeof w.getComputedStyle==="function"?w.getComputedStyle(parent):null;
  if(style&&(style.display==="none"||style.visibility==="hidden"))return null;
  parent=parent.parentElement;
 }
 return parent===s?el:null;
}
function notify(msg){toast.textContent=msg;toast.hidden=false;if(toastTimer)w.clearTimeout(toastTimer);toastTimer=w.setTimeout(()=>toast.hidden=true,4800)}
function hide(){panel.hidden=true;button.setAttribute("aria-expanded","false")}
function place(){panel.style.top=Math.max(8,Math.min(w.innerHeight-130,top.getBoundingClientRect().bottom+7))+"px"}
function perform(entry,id){
 const [label,selector,mode]=entry;
 if(active()!==id){notify("工作頁已切換，請重新選取快捷鍵。");hide();return}
 const el=target(id,selector,mode);if(!el){notify("原控制目前不存在或不可用；未執行。");refresh();return}
 hide();
 if(mode==="nav"){const ok=w.AIG_UIUX_V27.navigate(selector);notify(ok?"已呼叫原導航，切換至 "+selector+"。":"原導航不可用，沒有切換。");return}
 if(mode==="focus"){
  const dest=el.matches("button,input,textarea,select,canvas,[tabindex]")?el:el.querySelector("button,input,textarea,select,canvas,[tabindex]")||el;
  if(dest.tagName==="CANVAS"&&!dest.hasAttribute("tabindex"))dest.tabIndex=0;
  try{dest.scrollIntoView?.({block:"center",behavior:"smooth"})}catch(_){}
  dest.focus?.({preventScroll:true});notify("已定位「"+label+"」，沒有代替執行 NC、驗證或機台操作。");return;
 }
 try{el.click();notify("已呼叫原工作頁「"+label+"」；實際結果以工作頁狀態為準。")}
 catch(_){notify("原控制發生錯誤，沒有重試或重設資料。")}
}
function refresh(){
 const id=active();name.textContent=(id==="HOME"?"首頁":id)+" · 真控制快捷";grid.replaceChildren();let n=0;
 for(const entry of actions[id]||[]){
  if(!target(id,entry[1],entry[2]))continue;
  const b=d.createElement("button");b.type="button";b.className=entry[2]==="focus"?"ux29-focus":"ux29-invoke";b.textContent=entry[0];
  b.setAttribute("aria-label",(entry[2]==="focus"?"定位原控制：":"呼叫原控制：")+entry[0]);
  b.addEventListener("click",()=>perform(entry,id));grid.appendChild(b);n++;
 }
 status.textContent=n?"已找到 "+n+" 個原控制。選擇工具後回到原工作頁。":"本頁沒有可用的核准快捷控制，不建立假按鈕。";
 if(!panel.hidden)place();return{page:id,available:n};
}
button.addEventListener("click",()=>{if(!panel.hidden){hide();return}refresh();panel.hidden=false;place();button.setAttribute("aria-expanded","true")});
close.addEventListener("click",hide);
nav.addEventListener("click",()=>{if(!panel.hidden){if(w.requestAnimationFrame)w.requestAnimationFrame(refresh);else refresh()}});
w.addEventListener("hashchange",()=>{if(!panel.hidden)refresh()});
w.addEventListener("resize",()=>{if(!panel.hidden)place()});
d.addEventListener("keydown",event=>{if(event.key==="Escape"&&!panel.hidden){hide();button.focus()}});
d.addEventListener("pointerdown",event=>{if(!panel.hidden&&!panel.contains(event.target)&&event.target!==button)hide()});
w.AIG_UIUX_V29=Object.freeze({version:"29",refresh,close:hide,allowedPages:Object.keys(actions)});
})(window,document);
