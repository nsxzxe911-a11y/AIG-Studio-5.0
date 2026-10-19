/* AIG V86 — read-only page inventory and optional external AI design handoff.
 * NEVER uploads projects, G-code, CAD, images, tokens or secrets. */
(function(w,d){"use strict";
const PAGES=["HOME","CAD","CAM","SIM","3AX","4AX","5AX","6AX","NC","AI","刀路"];
const IMAGE_STATE=Object.freeze({
 HOME:"歷史參考圖待核對",CAD:"使用者 CAD 風格參考已入庫",
 CAM:"歷史參考圖待核對",SIM:"歷史參考圖待核對",
 "3AX":"歷史參考圖待核對","4AX":"歷史參考圖待核對","5AX":"歷史參考圖待核對",
 "6AX":"使用者 6AX 風格參考已入庫",NC:"4K 圖候選待核准",AI:"4K 圖候選待核准","刀路":"3D 走刀圖待重製"
});
const GAPS=Object.freeze([
 "照片描線的幾何尚未證明已寫入 CAD 核心",
 "全軸 CAM→SIM 真材料移除與碰撞數值回歸尚未完整驗證",
 "NC Fanuc 上機前安全 Gate 尚未通過；Web 不得送出機台指令",
 "Web／Windows 真實畫面與 Button ID 完整對應尚未通過逐頁比對",
 "3D 走刀獨立正式 RGB 視覺仍需重製"
]);
function inspect(){
 return {schema:"AIG_V86_WORKSPACE_READ_ONLY",machineOutput:"BLOCKED",releaseGate:"NOT_FULLY_VERIFIED",
 pages:PAGES.map(page=>{
  const screen=[...d.querySelectorAll(".app .shell .screen[data-page]")].find(x=>x.dataset.page===page);
  const controls=screen?[...screen.querySelectorAll("button:not(.aig43-action)")]:[];
  const numbered=controls.filter(x=>!!x.dataset.buttonId);
  const enabled=controls.filter(x=>!x.disabled);
  return {page,available:!!screen,buttons:controls.length,hasButtonId:numbered.length,
   requiresIdReview:Math.max(0,controls.length-numbered.length),enabled:enabled.length,
   image:IMAGE_STATE[page]||"未核對"};
 }),gaps:[...GAPS]};
}
function composeExternalBrief(data){
 const facts=data.pages.map(x=>x.page+": "+x.buttons+" native buttons, "+x.requiresIdReview+" missing Button ID review, image "+x.image);
 return [
  "AIG-II / AIG Studio 5.0 — external AI UI design assistance ONLY (sanitized, no private source)",
  "Language: Traditional Chinese. Formal Windows desktop: 3840x2160. Mobile: independent responsive rearrangement.",
  "RGB style: #020407 background, #07111B panels, cyan/blue/violet luminous glass, semantic warning/red emergency, full-page CAD/6AX distinct visual authorities.",
  "Main route HOME CAD CAM SIM 3AX 4AX 5AX 6AX NC AI; also independent 3D toolpath workspace.",
  "Keep central CNC viewport dominant (65–75%), secondary controls collapsible. No engineering-shell UI and no fake screenshot buttons.",
  "Deliver editable component hierarchy, one page at a time; Page ID / Subpage ID / Button ID / Command ID / callback/state contracts and UI screenshots.",
  "All native CNC modules and physical machine output are separate; never claim precision, material removal, collision PASS or G-code safe without tests.",
  "Current UI inventory (counts only, NO G-code, geometry, passwords, proprietary files):",...facts,
  "Unresolved validation:",...data.gaps.map(x=>"- "+x),
  "Please propose page-specific layouts, concrete missing-control mapping, CSS/HTML patches and executable acceptance tests. Do not deploy or replace the original Render site."
 ].join("\n");
}
function mount(){
 const guide=d.querySelector("[data-aig82-guide]");
 if(!guide||guide.querySelector("[data-aig86-handoff]"))return false;
 const advanced=guide.querySelector(".aig82-advanced [data-aig82-original]")||guide;
 const box=d.createElement("section");box.className="aig86-handoff";box.dataset.aig86Handoff="";
 const h=d.createElement("div");h.className="aig86-handoff-head";
 const title=d.createElement("strong");title.textContent="工作區完整性／AI 協作";
 const help=d.createElement("p");help.textContent="只提供頁面與按鈕數量，絕不傳送圖紙、G-code 或帳號資料。";
 h.append(title,help);
 const actions=d.createElement("div");actions.className="aig86-handoff-actions";
 const audit=d.createElement("button");audit.type="button";audit.dataset.aig86Action="AUDIT";audit.dataset.buttonId="BTN_AI_WORKSPACE_AUDIT";audit.dataset.commandId="AI_UI_AUDIT_READ_ONLY";audit.textContent="盤點十頁與刀路";
 const exportBtn=d.createElement("button");exportBtn.type="button";exportBtn.dataset.aig86Action="EXPORT";exportBtn.dataset.buttonId="BTN_AI_EXTERNAL_BRIEF";exportBtn.dataset.commandId="AI_EXTERNAL_BRIEF_COPY_ONLY";exportBtn.textContent="複製給其他 AI 的需求";
 actions.append(audit,exportBtn);
 const status=d.createElement("p");status.className="aig86-handoff-status";status.setAttribute("role","status");status.setAttribute("aria-live","polite");status.textContent="尚未檢查；此工具不代表 Release PASS。";
 const output=d.createElement("pre");output.className="aig86-handoff-output";output.hidden=true;
 const editor=d.createElement("textarea");editor.className="aig86-handoff-copy";editor.readOnly=true;editor.hidden=true;
 editor.setAttribute("aria-label","可複製的去識別化 AI 協作任務單");
 box.append(h,actions,status,output,editor);advanced.append(box);
 audit.addEventListener("click",()=>{
  const state=inspect();output.hidden=false;
  output.textContent=state.pages.map(x=>x.page+"｜原生按鈕 "+x.buttons+"｜待核對 Button ID "+x.requiresIdReview+"｜"+x.image).join("\n")+
  "\n\n尚缺證據：\n"+state.gaps.map(x=>"• "+x).join("\n");
  status.textContent="已盤點 "+state.pages.filter(x=>x.available).length+"/"+state.pages.length+" 工作頁；尚未完成 CNC Gate。";
 });
 exportBtn.addEventListener("click",async()=>{
  const brief=composeExternalBrief(inspect());
  editor.value=brief;editor.hidden=false;editor.focus();editor.select();
  try{
   if(!w.navigator?.clipboard?.writeText)throw Error("CLIPBOARD_UNAVAILABLE");
   await w.navigator.clipboard.writeText(brief);
   status.textContent="需求單已複製。可貼到你授權的 Figma 或其他 AI，不會自動上傳任何專案。";
  }catch(_){
   status.textContent="瀏覽器未授權剪貼簿；下方已選取安全需求文字，可手動複製。";
  }
 });
 return true;
}
if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",mount,{once:true});else mount();
w.AIG_V86_EXTERNAL_ASSIST=Object.freeze({mount,inspect,composeExternalBrief});
})(window,document);
