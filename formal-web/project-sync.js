/* AIG-II local-first cross-device transfer UI; all actions require direct user input. */
(function(){
"use strict";
const api=window.AIGProjectTransfer,storage=window.localStorage,$=id=>document.getElementById(id);
if(!api||!storage)return;
let plan=null;
const status=$("transfer-status"),file=$("transfer-file"),preview=$("transfer-preview");
const acknowledge=$("transfer-acknowledge"),apply=$("transfer-apply");
function inform(msg,level="info"){status.textContent=String(msg);status.dataset.level=level}
function backups(){
 const items=[];
 for(let i=0;i<storage.length;i++){const k=storage.key(i);if(/^aigii\.transfer\.backup\.[\w-]+$/.test(k))items.push(k)}
 return items.sort().reverse();
}
function refresh(){
 try{
  const entries=api.readEntries(storage),list=backups(),select=$("transfer-backups");
  $("transfer-count").textContent=String(Object.keys(entries).length);
  $("transfer-code-count").textContent=String(["3AX","4AX","5AX","6AX"].filter(a=>entries["aig-code-"+a]!=null).length);
  $("transfer-backup-count").textContent=String(list.length);
  select.replaceChildren();
  for(const k of list){const el=document.createElement("option");el.value=k;el.textContent=k.replace("aigii.transfer.backup.","備份 ");select.append(el)}
  if(!list.length){const el=document.createElement("option");el.value="";el.textContent="尚無可還原備份";select.append(el)}
  $("transfer-restore").disabled=list.length===0;
 }catch(e){inform("讀取本機資料失敗："+String(e.message||e),"error")}
}
function download(filename,body){
 const url=URL.createObjectURL(new Blob([body],{type:"application/json;charset=utf-8"}));
 try{const a=document.createElement("a");a.href=url;a.download=filename;document.body.append(a);a.click();a.remove()}
 finally{setTimeout(()=>URL.revokeObjectURL(url),1000)}
}
$("transfer-export").addEventListener("click",async()=>{
 try{
  const data=await api.exportProject(storage),json=JSON.stringify(data,null,2);
  download("AIG-II-Project-"+data.exportedAt.slice(0,10)+"-SHA256.json",json);
  inform("已產生跨裝置專案檔："+Object.keys(data.entries).length+" 項；摘要 "+data.digest.value.slice(0,16)+"…","success")
 }catch(e){inform("匯出失敗："+String(e.message||e),"error")}
});
function reset(){plan=null;preview.dataset.ready="false";file.value="";acknowledge.checked=false;apply.disabled=true}
file.addEventListener("change",async()=>{
 plan=null;preview.dataset.ready="false";acknowledge.checked=false;apply.disabled=true;
 const selected=file.files&&file.files[0];if(!selected)return;
 if(selected.size>api.MAX_SIZE){inform("檔案超過 8 MB 限制。","error");return}
 try{
  plan=await api.inspectFile(await selected.text(),storage);
  $("transfer-project-name").textContent=plan.projectName;
  $("transfer-date").textContent=plan.exportedAt;
  $("transfer-digest").textContent=plan.verified?"SHA-256 驗證通過":"舊格式，沒有 SHA-256 校驗";
  $("transfer-fields").textContent=plan.present.length+" 項："+plan.present.join("、");
  $("transfer-conflicts").textContent=plan.conflicts.length?plan.conflicts.length+" 項："+plan.conflicts.join("、"):"無衝突";
  preview.dataset.ready="true";
  inform("已完成檔案預覽。選擇處理方式並勾選確認前，不更動本機資料。")
 }catch(e){plan=null;inform("檢查失敗："+String(e.message||e),"error")}
});
acknowledge.addEventListener("change",()=>{apply.disabled=!(plan&&acknowledge.checked)});
$("transfer-apply").addEventListener("click",()=>{
 if(!plan||!acknowledge.checked){inform("請先檢查檔案並勾選確認。","error");return}
 try{
  const mode=document.querySelector('input[name="transfer-mode"]:checked')?.value||"keep";
  const result=api.applyFile(plan,storage,mode);
  reset();refresh();
  inform("已更新 "+result.changed+" 項，保留或略過 "+result.skipped+" 項。"+(result.backupKey?"本機備份已建立。":"")+" 請重新開啟工作頁。","success")
 }catch(e){inform("匯入遭阻止："+String(e.message||e),"error")}
});
$("transfer-cancel").addEventListener("click",()=>{reset();inform("已取消匯入，沒有更動本機資料。")});
$("transfer-restore").addEventListener("click",()=>{
 const k=$("transfer-backups").value;if(!k)return;
 if(!window.confirm("確定還原這個備份？系統會先建立反向備份，還原後需重新開啟工作頁。"))return;
 try{const result=api.restoreLocalBackup(storage,k);refresh();inform("已還原 "+result.restored+" 項並保留反向備份，請重新開啟工作頁。","success")}
 catch(e){inform("還原失敗："+String(e.message||e),"error")}
});
refresh();
})();