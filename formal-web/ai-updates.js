/* AIG-II AI publication reader. Never manipulates CAD/CAM/NC state. */
(()=>{"use strict";
const check=document.getElementById("ai-update-check");
const state=document.getElementById("ai-update-result");
const version=document.getElementById("ai-module-version");
const fingerprint=document.getElementById("ai-module-fingerprint");
const details=document.getElementById("ai-update-details");
const KEY="aigii.web.ai.publication.last-seen.v1";
const expected="AIG_WEB_AI_ORCHESTRATOR_V2";
function display(message,description){if(state)state.textContent=message;if(details)details.textContent=description;}
if(!check)return;
check.addEventListener("click",async()=>{
 check.disabled=true;display("查詢網站已發布的 AI 模組…","僅讀取同網站的公開版本清單；不修改 CNC 專案，也不自動部署 AI。");
 let controller=null;
 if(typeof AbortController==="function"){controller=new AbortController();}
 const timeout=typeof setTimeout==="function"?setTimeout(()=>controller?.abort(),8000):null;
 try{
  const response=await fetch("./ai-update-manifest.json",{cache:"no-store",...(controller?{signal:controller.signal}:{})});
  if(!response.ok)throw new Error("HTTP "+response.status);
  const data=await response.json();
  if(data.schema!=="aigii-web-ai-publication-v1"||data.moduleId!==expected||!/^[a-f0-9]{40}$/.test(data.sourceGitBlobSha))throw new Error("發布資料格式或來源 SHA 無法驗證");
  if(data.machineOutputEnabled!==false||data.automaticCodeDeployment!==false)throw new Error("AI 安全標記不一致");
  if(version)version.textContent=data.moduleVersion+" · "+data.scope;
  if(fingerprint)fingerprint.textContent=data.sourceGitBlobSha.slice(0,12);
  let previous="";
  try{previous=window.localStorage?.getItem(KEY)||""}catch(_){}
  if(previous&&previous!==data.sourceGitBlobSha){
   display("偵測到與上次查詢不同的 Web AI 發布版本","請先儲存 CAD／CAM／NC 資料，再開啟 AI 工作頁重新載入。此檢查不代表新的 AI 模型已安裝或 Gate 已通過。");
  }else if(previous===data.sourceGitBlobSha){
   display("與上次查詢相同","網站目前可取得同一 Web AI V2 發布資料；是否已部署最新網站 SHA，仍須由 Render 與 GitHub 核對。");
  }else{
   display("已讀到 Web AI V2 發布資料","首次檢查已記下來源 SHA。沒有歷史版本可比對，因此不宣稱 AI 已升級。");
  }
  try{window.localStorage?.setItem(KEY,data.sourceGitBlobSha)}catch(_){}
 }catch(_){
  display("AI 更新資訊尚無法確認","請檢查網站連線或稍後由 GitHub 查證；現有 AI 工作頁及本機 CNC 資料不受影響。");
 }finally{if(timeout!==null&&typeof clearTimeout==="function")clearTimeout(timeout);check.disabled=false;}
});
})();