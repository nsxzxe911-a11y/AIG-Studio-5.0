/* V82: native AI guided workflow; never simulates completed machining. */
(function(w,d){"use strict";
const pages=["HOME","CAD","CAM","SIM","3AX","4AX","5AX","6AX","NC","AI"];
function openPage(page){const button=[...d.querySelectorAll(".nav button")].find(x=>x.dataset.page===page);if(!button)return false;button.click();return true;}
function mount(){const root=d.querySelector("[data-ai-page-runtime]");if(!root||root.querySelector("[data-aig82-guide]"))return;
const guide=d.createElement("section");guide.className="aig82-guide";guide.dataset.aig82Guide="";
guide.innerHTML='<div class="aig82-intro"><div><span class="aig82-eyebrow">AIG II · 智慧加工工作區</span><h2>從照片到數位成品</h2><p>跟著三步驟操作，所有加工結果都需要真實核心驗證。</p></div><span class="aig82-safe">機台輸出鎖定</span></div><div class="aig82-actions"><button type="button" data-aig82="SOURCE">① 匯入照片／圖紙</button><button type="button" data-aig82="PLAN">② 建立加工方案</button><button type="button" data-aig82="RESULT">③ 查看驗證結果</button></div><p data-aig82-message role="status" aria-live="polite">先選擇加工資料；沒有資料時，請從第一步開始。</p><details class="aig82-advanced"><summary>展開完整加工設定與檢查</summary><div data-aig82-original></div></details>';
root.insertBefore(guide,root.firstChild);
const advanced=guide.querySelector("[data-aig82-original]");
const previous=root.querySelector(":scope > .aig77-guide");if(previous){const previousOriginal=previous.querySelector("[data-aig77-original]");if(previousOriginal){[...previousOriginal.children].forEach(x=>advanced.appendChild(x));}previous.remove();}
[...root.children].filter(x=>x!==guide).forEach(x=>advanced.appendChild(x));
const message=guide.querySelector("[data-aig82-message]");
guide.addEventListener("click",e=>{const btn=e.target.closest("[data-aig82]");if(!btn)return;const action=btn.dataset.aig82;
if(action==="SOURCE")message.textContent=openPage("HOME")?"已前往來源頁。請選擇照片、圖紙或 NC 程式。":"來源頁無法開啟，請檢查導覽。";
if(action==="PLAN"){const real=advanced.querySelector('[data-ai-command="AI.PLAN.BUILD"]');guide.querySelector("details").open=true;if(real){real.click();message.textContent="已執行現有加工規劃；請檢查下方缺口，不代表加工已完成。";}else message.textContent="無法找到真實規劃命令，已停止操作。";}
if(action==="RESULT"){guide.querySelector("details").open=true;const status=advanced.querySelector("[data-ai-status]");if(status){status.scrollIntoView({block:"center"});message.textContent="下方顯示目前工作結果與安全檢查；未驗證前不可上機。";}else message.textContent="結果尚未就緒，請先建立加工方案。";}
});
}
if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",mount,{once:true});else mount();
w.AIG_V82_AI_GUIDE=Object.freeze({mount,openPage});
})(window,document);