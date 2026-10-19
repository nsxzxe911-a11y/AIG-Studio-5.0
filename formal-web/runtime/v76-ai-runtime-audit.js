/* V76 AI runtime diagnostics: no synthetic success or autonomous deployment. */
(function(w,d){"use strict";
const modules=["HOME","CAD","CAM","SIM","3AX","4AX","5AX","6AX","NC","AI"];
function report(){
 const deck=w.AIG_V68_COMMAND_DECK?.snapshot?.();
 const art=w.AIG_V73_PAGE_ART?.inspect?.()||{};
 const source=w.AIG_V69_SOURCE?.inspect?.()||null;
 const checks=modules.map(page=>{const root=[...d.querySelectorAll(".screen")].find(x=>x.dataset.page===page);const rec=deck?.pages?.find(x=>x.page===page);return {page,screen:!!root,buttonCount:rec?.currentRealButtonCount??null,unmapped:rec?.unmappedButtonCount??null,missing:rec?.missingConfiguredButtons??null,art:art[page]||"NOT_MOUNTED",status:!root?"BLOCKED":!rec?"NOT_AUDITED":rec.missing||rec.unknown?"NEEDS_REVIEW":"SOURCE_MAPPED_NOT_BROWSER_VERIFIED"}});
 return {schema:"AIG_V76_AI_RUNTIME_AUDIT",checks,source,releaseGate:"PENDING_BROWSER_AND_CORE_TEST",machineOutput:"BLOCKED"};
}
function mount(){
 const root=d.querySelector('[data-ai-page-runtime]');if(!root||root.querySelector("[data-aig76-ai-audit]"))return;
 const panel=d.createElement("section");panel.className="panel aig76-ai-audit";panel.dataset.aig76AiAudit="";panel.innerHTML='<div class="head"><h2>AI 全站功能巡檢</h2><small>即時讀取真實 UI 狀態，不代替核心驗證</small></div><div class="body"><button type="button" class="btn" data-aig76-run data-button-id="BTN.AI.AUDIT.ALL_PAGES" data-command-id="COMMAND.AI.AUDIT.READ_ONLY">巡檢十頁按鈕與畫面</button><p data-aig76-summary role="status">尚未巡檢</p><div data-aig76-results></div></div>';
 root.append(panel);
 panel.querySelector("[data-aig76-run]").addEventListener("click",()=>{
 const r=report();panel.querySelector("[data-aig76-summary]").textContent="已檢查 "+r.checks.length+" 頁；這不是加工完成或 Release PASS。";
 const target=panel.querySelector("[data-aig76-results]");target.replaceChildren();
 for(const x of r.checks){const row=d.createElement("p");row.textContent=x.page+"｜"+x.status+"｜按鈕 "+(x.buttonCount??"待查")+"｜缺失 "+(x.missing??"待查")+"｜未映射 "+(x.unmapped??"待查")+"｜圖片 "+x.art;target.append(row)}
 });
}
if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",mount,{once:true});else mount();
w.AIG_V76_AI_AUDIT=Object.freeze({mount,report});
})(window,document);