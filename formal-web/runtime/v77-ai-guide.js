/* V77: AI guided entry. Existing planner stays functional under advanced details. */
(function(w,d){"use strict";
function mount(){const root=d.querySelector("[data-ai-page-runtime]");if(!root||root.querySelector(".aig77-guide"))return;
const guide=d.createElement("section");guide.className="aig77-guide";guide.innerHTML='<h2>AI 幫我完成加工</h2><p>依照步驟操作，沒有資料也可以先開始。機台輸出保持關閉。</p><div class="aig77-steps"><button type="button" data-aig77-action="SOURCE">① 匯入照片／圖紙</button><button type="button" data-aig77-action="PLAN">② AI 幫我規劃</button><button type="button" data-aig77-action="RESULT">③ 查看加工結果</button></div><p class="aig77-message" role="status" aria-live="polite">先選擇照片、圖紙或已有的 NC 程式。</p><details class="aig77-advanced"><summary>進階功能與加工參數</summary><div data-aig77-original></div></details>';
root.insertBefore(guide,root.firstChild);
const advanced=guide.querySelector("[data-aig77-original]");[...root.children].filter(x=>x!==guide).forEach(x=>advanced.appendChild(x));
const message=guide.querySelector(".aig77-message");
guide.addEventListener("click",e=>{const button=e.target.closest("[data-aig77-action]");if(!button)return;const a=button.dataset.aig77Action;
if(a==="SOURCE"){const nav=[...d.querySelectorAll(".nav button")].find(x=>x.dataset.page==="HOME");if(nav){nav.click();message.textContent="已切換來源頁，請匯入照片、圖紙或 NC 程式。"}else message.textContent="來源頁暫時無法開啟。";}
if(a==="PLAN"){advanced.closest("details").open=true;const real=advanced.querySelector('[data-ai-command="AI.PLAN.BUILD"]');if(real){real.click();message.textContent="已呼叫現有加工規劃。請在下方查看結果與缺口；尚未代表加工完成。"}else message.textContent="目前找不到真實規劃功能，已停止操作。";}
if(a==="RESULT"){advanced.closest("details").open=true;advanced.querySelector("[data-ai-status]")?.scrollIntoView({block:"center",behavior:"smooth"});message.textContent="請查看工作結果與安全缺口；只有完成 Gate 驗證才能交付。";}
});
}
if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",mount,{once:true});else mount();
w.AIG_V77_AI_GUIDE=Object.freeze({mount});
})(window,document);