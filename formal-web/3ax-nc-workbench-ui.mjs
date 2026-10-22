/**
 * AIG first new standalone 3AX web workspace: browser-only local file
 * import/export and live textual XYZ HUD. All numeric cut/replay controls
 * remain owned by the already verified Real3D 1.3 controller. No network
 * write, no CNC machine authority, no synthetic acceptance banners.
 */
const $=id=>document.getElementById(id);
const nc=$('nc'),upload=$('nc-upload'),fileStatus=$('file-message');
const announce=message=>{fileStatus.textContent=message;};

/** Isolated local-first NC Working Copy. Never touches legacy app keys or cloud. */
const LOCAL_KEY='AIG_V2_3AX_NC_WORKING_COPY_LOCAL';
const LOCAL_SCHEMA='AIG_3AX_NC_WORKING_COPY_V1';
let currentRevision=0,lastSavedEnvelope=null,pendingSave=null,foreignTabEdit=false;
const validText=value=>typeof value==='string'&&value.trim().length>0&&
 value.length<=120000&&!value.includes('\0');
function restoreLocalNC(){
 try{
  const saved=localStorage.getItem(LOCAL_KEY);
  lastSavedEnvelope=saved;
  if(saved===null)return;
  const entry=JSON.parse(saved);
  if(entry?.schema!==LOCAL_SCHEMA||!Number.isSafeInteger(entry.revision)||
     entry.revision<1||!validText(entry.source))throw Error('LOCAL_WORKING_COPY_INTEGRITY_BLOCKED');
  currentRevision=entry.revision;
  if(nc.value!==entry.source){
   nc.value=entry.source;
   // The existing 1.3 simulation MUST invalidate its old sample evidence.
   nc.dispatchEvent(new Event('input',{bubbles:true}));
  }
  announce('已從此瀏覽器恢復 NC 工作副本（修訂 '+currentRevision+'）。請重新解析；尚未驗證真機。');
 }catch(e){
  foreignTabEdit=true; // Bad/missing storage permission must never erase old data.
  announce('本機工作副本無法安全恢復；禁止自動覆蓋舊存檔。可先匯出目前 NC：'+String(e.message||e));
 }
}
function persistNC(){
 pendingSave=null;
 if(foreignTabEdit||!validText(nc.value))return;
 try{
  // Separate tabs must not silently overwrite each other's source.
  const old=localStorage.getItem(LOCAL_KEY);
  if(old!==lastSavedEnvelope){
   foreignTabEdit=true;
   announce('BLOCKED：另一分頁的 NC 存檔已改變。本頁內容仍在，請先「匯出 NC 副本」，不要覆蓋別人的版本。');
   return;
  }
  const payload=JSON.stringify({schema:LOCAL_SCHEMA,revision:++currentRevision,
   source:nc.value,savedAt:new Date().toISOString(),
   machineOutputAuthorized:false});
  localStorage.setItem(LOCAL_KEY,payload);
  lastSavedEnvelope=payload;
  announce('NC 工作副本已自動儲存於本機瀏覽器（修訂 '+currentRevision+'）。此存檔並非 Fanuc 加工核准。');
 }catch(e){
  currentRevision=Math.max(0,currentRevision-1);
  announce('本機儲存失敗，畫面上的 NC 不會清除；請使用「匯出 NC 副本」：'+String(e.message||e));
 }
}
restoreLocalNC();
nc.addEventListener('input',()=>{
 if(pendingSave!==null)clearTimeout(pendingSave);
 // Preserve a previous valid copy rather than replacing it with blank NC.
 if(validText(nc.value)&&!foreignTabEdit)pendingSave=setTimeout(persistNC,300);
});
window.addEventListener('storage',event=>{
 if(event.key!==LOCAL_KEY||event.newValue===lastSavedEnvelope)return;
 foreignTabEdit=true;
 if(pendingSave!==null)clearTimeout(pendingSave);
 pendingSave=null;
 announce('BLOCKED：另一分頁已修改 NC 存檔。保留本頁工作內容；請匯出副本再決定採用哪一版。');
});
window.addEventListener('pagehide',()=>{
 if(pendingSave!==null){
  clearTimeout(pendingSave);
  persistNC();
 }
});

$('import-nc').addEventListener('click',()=>upload.click());
upload.addEventListener('change',async()=>{
 const file=upload.files?.[0];upload.value='';
 if(!file)return;
 if(file.size<=0||file.size>120000||!/\.(nc|txt)$/i.test(file.name)){
  announce('BLOCKED：只允許 120 KB 以下的本機 .nc 或 .txt 工作副本。');return;
 }
 try{
  const raw=await file.text();
  if(!raw||raw.length>120000||raw.includes('\0'))
    throw Error('FILE_NOT_A_VALID_TEXT_WORKING_COPY');
  nc.value=raw;
  nc.dispatchEvent(new Event('input',{bubbles:true}));
  announce('已讀入本機副本：'+file.name+'。需點「解析 NC」才能進行新模擬。');
 }catch(e){announce('BLOCKED：本機檔案讀取失敗：'+String(e.message||e));}
});
$('export-nc').addEventListener('click',()=>{
 const raw=nc.value;
 if(!raw||raw.length>120000){
  announce('BLOCKED：沒有有效大小的 NC 文字可以匯出。');return;
 }
 const blob=new Blob([raw],{type:'text/plain;charset=utf-8'});
 const url=URL.createObjectURL(blob);
 const link=document.createElement('a');link.href=url;
 link.download='AIG-3AX-NC-WORKING-COPY.nc';
 document.body.append(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
 announce('已匯出 NC 原文工作副本；這不是 Fanuc 機台執行核准。');
});
let lastEvidence='';
const updateHud=()=>{
 const raw=$('evidence').textContent;
 if(!raw||raw===lastEvidence)return;
 lastEvidence=raw;
 try{
  const obj=JSON.parse(raw),v=obj?.replay?.toolpathPositionMm;
  if(Array.isArray(v)&&v.length===3&&v.every(Number.isFinite)){
   ['x','y','z'].forEach((key,i)=>{$('axis-'+key).textContent=Number(v[i]).toFixed(3);});
  }else throw Error('NOT_READY');
 }catch{for(const key of ['x','y','z'])$('axis-'+key).textContent='—';}
};
new MutationObserver(updateHud).observe($('evidence'),{childList:true,subtree:true,characterData:true});
updateHud();