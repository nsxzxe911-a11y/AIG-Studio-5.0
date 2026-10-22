/**
 * AIG first new standalone 3AX web workspace: browser-only local file
 * import/export and live textual XYZ HUD. All numeric cut/replay controls
 * remain owned by the already verified Real3D 1.3 controller. No network
 * write, no CNC machine authority, no synthetic acceptance banners.
 */
const $=id=>document.getElementById(id);
const nc=$('nc'),upload=$('nc-upload'),fileStatus=$('file-message');
const announce=message=>{fileStatus.textContent=message;};
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