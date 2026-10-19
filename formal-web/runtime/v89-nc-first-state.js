/* AIG V89 — 6AX NC-first Working Copy, separate from verified/saved G-code.
 * Only the original Runtime handles parse, save and CNC simulation.
 * Page/subpage transitions do not reset an axis or material-removal buffers.
 */
(function(w,d){"use strict";
const AXIS="6AX",KEY="aig-nc-working-copy-6AX-v89",MAIN="aig-code-6AX",MAX=512*1024;
let mounted=false,root=null,textarea=null,notice=null,recover=null,ncNotice=null,ncImport=null;
let dirtyInTab=false,timer=null,revision=0;
function store(){try{return w.localStorage}catch(_){return null}}
function storedMain(){try{return store()?.getItem(MAIN)??null}catch(_){return null}}
function draft(){
 try{
  const raw=store()?.getItem(KEY);if(!raw)return null;
  const x=JSON.parse(raw);
  if(x.schema!=="AIG_NC_WORKING_COPY_V1"||x.axis!==AXIS||typeof x.text!=="string"||
     x.text.length>MAX||typeof x.baseMain!=="string"&&x.baseMain!==null)return null;
  return x;
 }catch(_){return null}
}
function status(message,isWarning=false){
 if(!notice)return;notice.textContent=message;notice.dataset.aig89Warning=String(isWarning);
}
function syncUi(){
 const x=draft(),main=storedMain();
 const pending=Boolean(x&&x.text!==main&&x.text!==textarea?.value);
 const canRecover=pending&&!dirtyInTab;
 if(recover)recover.hidden=!canRecover;
 if(canRecover)status(x.baseMain===main?"發現未儲存 6AX 工作副本。":"工作副本的原始主程式已更動；恢復不會自動覆寫主程式。",x.baseMain!==main);
 else if(x&&x.text!==main&&x.text===textarea?.value)status("6AX 工作副本已保存至本機，尚未提交主程式。");
 else if(!dirtyInTab)status("NC 工作副本獨立保存；正式 NC 主程式只由原始「儲存」更新。");
 syncStandalone();
}
function saveDraft(){
 if(!textarea||root?.dataset.aigInitialized!=="true")return false;
 const s=store();if(!s){status("本機儲存不可用，請使用原始「儲存」並另行備份。",true);return false}
 const main=storedMain(),value=textarea.value;
 if(value===main){try{s.removeItem(KEY)}catch(_){}syncUi();return true}
 if(value.length>MAX){status("工作副本超過 512K 字元保護上限，尚未自動保存。",true);return false}
 const old=draft(),baseMain=dirtyInTab?(old?.baseMain??main):(main);
 const next={schema:"AIG_NC_WORKING_COPY_V1",axis:AXIS,text:value,baseMain,
  revision:Math.max(Number(old?.revision)||0,revision)+1,updatedAt:new Date().toISOString()};
 try{s.setItem(KEY,JSON.stringify(next));revision=next.revision;syncUi();return true}
 catch(_){status("工作副本寫入失敗（可能為儲存空間不足），目前編輯內容未刪除。",true);return false}
}
function flush(){if(timer!==null){w.clearTimeout(timer);timer=null}if(dirtyInTab)saveDraft()}
function onInput(){dirtyInTab=true;if(timer!==null)w.clearTimeout(timer);timer=w.setTimeout(()=>{timer=null;saveDraft()},160);status("編輯中 · 工作副本待保存。")}
function confirmMainSave(){
 const main=storedMain();
 if(textarea&&main===textarea.value){
  if(timer!==null){w.clearTimeout(timer);timer=null}
  try{store()?.removeItem(KEY)}catch(_){}
  dirtyInTab=false;syncUi();
 }else {flush();status("主程式尚未確認寫入；工作副本繼續保留。",true)}
}
function metric(root,sel){return root.querySelector(sel)?.textContent||""}
function number(text){const n=Number(String(text).match(/[-+]?\d+(?:\.\d+)?/)?.[0]);return Number.isFinite(n)?n:null}
function snapshot(){return {code:textarea?.value,editor:textarea,
  gl:root?.querySelector("canvas[data-glcanvas]"),canvas:root?.querySelector("canvas[data-canvas]"),
  progress:number(metric(root,"[data-progress-text]")),
  volume:number(metric(root,"[data-removal-volume]"))}}
function verifySwitch(snap){
 if(!root||!snap)return;
 const after=snapshot();
 const ok=snap.editor===after.editor&&snap.gl===after.gl&&snap.canvas===after.canvas&&
    snap.code===after.code&&
    (snap.progress===null||after.progress===null||after.progress+0.001>=snap.progress)&&
    (snap.volume===null||after.volume===null||after.volume+0.001>=snap.volume);
 root.dataset.aig89SwitchGate=ok?"DOM_PRESERVED":"DOM_REVIEW";
 if(!ok)status("切換後狀態核對異常，請勿直接執行加工。",true);
}
function selectMobilePane(mode){
 if(d.documentElement.dataset.aig65Platform!=="android")return;
 const screen=root?.closest(".screen");
 const desired=mode==="NC_FIRST"?"code":"view";
 const button=screen?.querySelector('.aig49-dock button[data-aig50-choice="'+desired+'"]');
 if(button&&!button.disabled&&screen.dataset.aig50Pane!==desired)button.click();
}
function addNotice(){
 const last=root.querySelector(":scope > .editor > .body:last-child");
 if(!last)return false;
 const bar=d.createElement("div");bar.className="aig89-working-copy";bar.dataset.aig89WorkingCopy="";
 notice=d.createElement("span");notice.dataset.aig89CopyStatus="";
 notice.setAttribute("role","status");notice.setAttribute("aria-live","polite");
 recover=d.createElement("button");recover.type="button";recover.hidden=true;
 recover.dataset.buttonId="BTN_6AX_NC_RECOVER_WORKING_COPY";
 recover.dataset.commandId="NC_6AX_WORKING_COPY_RECOVER";recover.textContent="恢復工作副本";
 bar.append(notice,recover);last.append(bar);
 recover.addEventListener("click",()=>{
  if(dirtyInTab)return;
  const x=draft(),main=storedMain();
  if(!x||x.text===main)return syncUi();
  if(root.querySelector("[data-run-badge]")?.textContent==="RUN"){
   status("模擬執行中不可恢復草稿；先暫停，避免重置材料移除狀態。",true);return;
  }
  textarea.value=x.text;dirtyInTab=false;
  const parse=root.querySelector('button[data-editcmd="parse"]');
  if(!parse){status("缺少原始 G-code 解析命令；工作副本未提交。",true);return}
  parse.click(); // Only native parser, never manual CNC/machine action.
  textarea.focus({preventScroll:true});syncUi();
 });
 return true;
}
function syncStandalone(){
 if(!ncNotice)return;
 const axis=d.querySelector("[data-nc-runtime] [data-nc-axis]")?.value;
 const x=draft(),pending=axis===AXIS&&x&&x.text!==storedMain();
 ncNotice.hidden=!pending; if(!pending)return;
 const span=ncNotice.querySelector("span");
 if(span)span.textContent="6AX NC-first 有獨立工作副本，尚未寫入正式 NC 主程式。";
}
function mountStandalone(){
 const area=d.querySelector("[data-nc-runtime]");
 const anchor=area?.querySelector("[data-nc-msg]");
 if(!anchor||area.dataset.aig89NcMounted==="true")return;
 const bar=d.createElement("div");bar.className="aig89-nc-import";bar.hidden=true;
 bar.dataset.aig89NcImport="";
 const span=d.createElement("span");const action=d.createElement("button");
 action.type="button";action.dataset.buttonId="BTN_NC_IMPORT_6AX_WORKING_COPY";
 action.dataset.commandId="NC_IMPORT_6AX_WORKING_COPY";action.textContent="匯入到 NC 編輯區";
 bar.append(span,action);anchor.parentElement.append(bar);ncNotice=bar;ncImport=action;
 action.addEventListener("click",()=>{
  const axis=area.querySelector("[data-nc-axis]")?.value,x=draft();
  const target=area.querySelector("textarea[data-nc-code]");
  if(axis!==AXIS||!x||!target)return;
  const authoritative=storedMain();
  // Do not replace an independently edited NC page without an explicit save/reload.
  const source=authoritative??area.dataset.aig89NcBaseline??null;
  if(source===null&&target.value.trim()){span.textContent="無法確認獨立 NC 原稿，拒絕覆蓋。";return}
  if(source!==null&&target.value!==source){
   span.textContent="獨立 NC 編輯區已有變更，請先儲存或重載，未匯入。";return
  }
  target.value=x.text;target.dispatchEvent(new Event("input",{bubbles:true}));
  target.focus({preventScroll:true});
  span.textContent="已匯入編輯區，尚未儲存；請使用原 NC 儲存與驗證。";
  action.hidden=true;
 });
 function captureNcBaseline(){
   area.dataset.aig89NcBaseline=area.querySelector("textarea[data-nc-code]")?.value??"";
   syncStandalone();
 }
 area.querySelector("[data-nc-axis]")?.addEventListener("change",()=>{
   Promise.resolve().then(captureNcBaseline); // let original axis-change LOAD finish first
 });
 area.dataset.aig89NcMounted="true";captureNcBaseline();
}
function mount(){
 if(mounted)return;
 root=d.querySelector('.simgrid.axisModule[data-runtime="6AX"]');
 textarea=root?.querySelector('textarea.code[data-axis="6AX"]');
 if(!root||!textarea||!addNotice())return;
 mounted=true;root.dataset.aig89Mounted="true";root.dataset.aig89SwitchGate="NOT_RUN";
 textarea.addEventListener("input",onInput);
 textarea.addEventListener("blur",flush);
 root.addEventListener("click",event=>{
  const b=event.target.closest("button");
  if(!b||!root.contains(b))return;
  if(b.dataset.editcmd==="save"){Promise.resolve().then(confirmMainSave);return}
  if(b.dataset.axisSubpage==="NC_FIRST"||b.dataset.axisSubpage==="MACHINE"){
   flush();const snap=snapshot(),mode=b.dataset.axisSubpage;
   Promise.resolve().then(()=>selectMobilePane(mode));
   w.requestAnimationFrame(()=>verifySwitch(snap));
  }
 });
 d.addEventListener("visibilitychange",()=>{if(d.hidden)flush()});
 w.addEventListener("pagehide",flush);
 mountStandalone();syncUi();
}
if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",mount,{once:true});else mount();
w.AIG_V89_NC_WORKING_COPY=Object.freeze({
 version:"89.0.0",
 inspect:()=>({mounted,axis:AXIS,sourceTextareaCount:root?.querySelectorAll('textarea.code[data-axis="6AX"]').length||0,
  draftExists:!!draft(),savedProgramUnmodifiedByAutosave:true,
  switchGate:root?.dataset.aig89SwitchGate||"NOT_RUN",machineOutput:"BLOCKED",
  cncNumericalGate:"NOT_VERIFIED"}),
 flush
});
})(window,document);
