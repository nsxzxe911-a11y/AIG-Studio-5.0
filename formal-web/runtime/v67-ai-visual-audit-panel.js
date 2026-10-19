/* AIG V67 AI cockpit: read-only overview of all real pages and exact RGB
 * Authority coverage, with native page navigation. No fake NC action,
 * destructive state changes or automatic approval of missing images. */
(function(w,d){"use strict";
 const murl="./authority/v67-authority-ledger.json",curl="./runtime/v67-page-subpage-contract.json";
 let root=null,ledger=null,contract=null,status=null,findingsHost=null,findings=null,ready=false,lastError="";
 const goto=id=>{
  try{return !!w.AIG_V67_GLOBAL_NAV?.route(id)}catch(e){lastError=String(e);return false}
 };
 const el=(tag,text,cls)=>{const node=d.createElement(tag);if(text!==undefined)node.textContent=text;
  if(cls)node.className=cls;return node};
 async function read(url){
  const controller=new AbortController(),timeout=w.setTimeout(()=>controller.abort(),3800);
  try{const r=await fetch(url,{signal:controller.signal,cache:"no-cache"});
   if(!r.ok)throw Error(url+" HTTP "+r.status);return await r.json()}
  finally{w.clearTimeout(timeout)}
 }
 function inspect(){
  const current=w.AIG_V67_CONTROL_REGISTRY?.snapshot?.()||null;
  const pages=contract?.pages||[],authority=ledger?.summary;
  return {ready,pages:pages.length,subpages:pages.reduce((n,p)=>n+p.subpages.length,0),
   visibleControlRecords:current?.controllers||0,
   unknownButtonIds:current?.unknown??null,legacyDuplicateIds:current?.duplicates??null,
   approvedExactPagePairs:authority?.approvedExactPagePairs??null,
   approvedExactSubpagePairs:authority?.approvedExactSubpagePairs??null,
   missingAuthoritySlots:authority?.missing??null,
   old438ImagesRevoked:ledger?.revoked?.count??null,
   knownScreenshotDefects:findings?.findings?.length??null,
   latestDefectEvidenceRun:findings?.source?.runId??null,
   defectReportIsSnapshot:true,
   modelVisionConnected:false,lastError,releaseGate:"BLOCKED_PENDING_EXACT_IMAGE_CALLBACK_BROWSER_AND_DUAL_SHA"};
 }
 function update(){
  if(!status)return;const a=inspect();
  const text="主頁 "+a.pages+" · 副頁 "+a.subpages+" · 真控制 "+a.visibleControlRecords+
   " · 未映射 "+(a.unknownButtonIds??"—")+" · 重複 "+(a.legacyDuplicateIds??"—")+
   " · 核准 RGB 原圖 "+(a.approvedExactPagePairs??0)+"/22 ＋ "+(a.approvedExactSubpagePairs??0)+"/118"+
   " · 撤銷舊圖 "+(a.old438ImagesRevoked??20);
  if(status.textContent!==text)status.textContent=text;
  root.dataset.aig67AuditStatus=a.missingAuthoritySlots>0?"BLOCKED_AUTHORITY":"PENDING";
 }
 function renderFindings(){
  if(!findingsHost)return;findingsHost.replaceChildren();
  const title=el("strong","最近一次實際 Chromium 圖像巡檢發現","aig67-audit-findings-title");
  findingsHost.append(title);
  if(!findings){
   findingsHost.append(el("p","尚未取得可核對的實際截圖缺陷紀錄，禁止視為 PASS。","aig67-audit-note"));
   return;
  }
  const meta=el("p","證據 Run "+findings.source.runId+" · "+
   (findings.extractedEvidence.cncCaptures+findings.extractedEvidence.publicCaptures)+
   " 張實際截圖 · "+findings.findings.length+" 項已登記問題（不是即時模型判定）","aig67-audit-note");
  findingsHost.append(meta);
  const list=el("div",undefined,"aig67-audit-issue-list");
  for(const issue of findings.findings.slice(0,12)){
   const row=el("div",undefined,"aig67-audit-issue");
   row.dataset.severity=issue.severity;row.dataset.issueId=issue.id;
   const heading=el("strong",issue.id+" · "+issue.page+" · "+issue.category);
   const description=el("p",issue.resolution||issue.evidence);
   const state=el("small",issue.status);
   row.append(heading,description,state);
   const id=String(issue.page).split(",")[0];
   if(["HOME","CAD","CAM","SIM","3AX","4AX","5AX","6AX","NC","AI"].includes(id)){
    const go=el("button","查看 "+id,"btn");go.type="button";
    go.dataset.buttonId="BTN_AI_AUDIT_FINDING_"+issue.id;
    go.dataset.commandId="NAV_"+id;go.addEventListener("click",()=>goto(id));
    row.append(go);
   }
   list.append(row);
  }
  findingsHost.append(list);
  const url=el("a","開啟這次 GitHub 自動截圖證據 ↗","aig67-audit-link");
  url.href="https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/actions/runs/"+findings.source.runId;
  url.target="_blank";url.rel="noopener noreferrer";findingsHost.append(url);
 }

 function mount(){
  if(root?.isConnected)return true;
  const host=d.querySelector(".screen[data-page='AI'] [data-ai-page-runtime]");
  if(!host)return false;
  root=el("section",undefined,"panel aig67-ai-visual-panel");
  root.dataset.aig67Audit="panel";
  const head=el("div",undefined,"head");
  const title=el("h3","AI 全站視覺巡檢與功能覆蓋");
  const state=el("span","Authority Gate · 未通過","aig67-audit-state");
  head.append(title,state);
  const body=el("div",undefined,"aig67-audit-body");
  status=el("p","正在讀取逐頁 Authority 與 Button ID 清冊…","aig67-audit-counts");
  const note=el("p","逐頁自動截圖由 GitHub Actions Chromium 執行；此處顯示即時 DOM/ID 與 Authority 缺口，不以畫面存在冒充核心 PASS。",
   "aig67-audit-note");
  const controls=el("div",undefined,"aig67-audit-actions");
  const refresh=el("button","重新檢查目前工作區", "btn");
  refresh.type="button";refresh.dataset.buttonId="BTN.AI.AUDIT.RECHECK";
  refresh.dataset.commandId="UI_AUDIT_REFRESH";
  refresh.addEventListener("click",()=>{w.AIG_V67_CONTROL_REGISTRY?.annotate?.();update()});
  const qa=el("a","全站截圖／Gate ↗","aig67-audit-link");
  qa.href="https://github.com/nsxzxe911-a11y/AIG-Studio-5.0/actions/workflows/v67-rgb-authority-visual-gate.yml";
  qa.target="_blank";qa.rel="noopener noreferrer";qa.dataset.buttonId="BTN.AI.AUDIT.OPEN_REPORT";
  controls.append(refresh,qa);
  const nav=el("div",undefined,"aig67-audit-nav");
  for(const id of ["HOME","CAD","CAM","SIM","3AX","4AX","5AX","6AX","NC","AI"]){
   const b=el("button",id,"btn");b.type="button";
   b.dataset.buttonId="BTN.AI.AUDIT.OPEN_"+id;
   b.dataset.commandId="NAV_"+id;
   b.addEventListener("click",()=>goto(id));nav.append(b);
  }
  const safe=el("p","機台輸出 BLOCKED · RGB 原圖逐頁核准待驗證 · Android/Windows Gate 待完成",
   "aig67-audit-safety");
  findingsHost=el("section",undefined,"aig67-audit-findings");
  body.append(status,note,controls,nav,findingsHost,safe);root.append(head,body);host.append(root);
  renderFindings();
  update();return true;
 }
 async function init(){
  if(!mount()){let retries=0;const retry=()=>{
    if(mount()){start();return}if(++retries<18)w.setTimeout(retry,250)
  };retry();return}
  start();
 }
 async function start(){
  try{const result=await Promise.all([read(curl),read(murl)]);
   if(result[0]?.pages?.length!==11||result[1]?.summary?.missing===undefined)
    throw Error("V67_AUDIT_CONTRACT_MISMATCH");
   [contract,ledger]=result;ready=true;lastError="";
   // Snapshot from a REAL Chromium artifact. Display its age and source run;
   // do not represent this as a continuous vision-model result.
   try{findings=await read("./qa/v67-confirmed-visual-defects.json")}catch(_){findings=null}
   renderFindings();
  }catch(e){lastError=String(e?.message||e);ready=false;}
  update();
 }
 w.AIG_V67_AI_VISUAL_AUDIT=Object.freeze({inspect,update});
 if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",init,{once:true});else init();
})(window,document);