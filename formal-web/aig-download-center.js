/**
 * AIG downloadable legacy/local CNC backup.
 * Runs ONLY on direct click; never modifies/removes working copies,
 * never posts content or browser credentials to an API.
 * This is intentionally the same exported JSON schema as native-download.html.
 */
(() => {
  'use strict';
  const button=document.getElementById('export-local');
  const status=document.getElementById('export-status');
  if(!button||!status)throw Error('AIG_DOWNLOAD_CENTER_BACKUP_CONTROLS_MISSING');
  button.addEventListener('click',()=>{
    try{
      const drafts=Object.create(null);
      let count=0;
      for(let i=0;i<localStorage.length;i++){
        const k=localStorage.key(i);
        if(!k||
          !/(?:aig|cad|cam|nc|gcode|draft|working)/i.test(k)||
          !/(?:cad|cam|nc|gcode|draft|working)/i.test(k))continue;
        if(/(?:token|auth|login|password|secret|credential|api[_-]?key|session)/i.test(k))continue;
        const value=localStorage.getItem(k);
        if(value===null)continue;
        drafts[k]=value;
        count++;
      }
      if(count===0){
        status.textContent='這台裝置目前沒有找到符合條件的本機 CNC 工作副本；沒有修改任何資料。';
        return;
      }
      const json=JSON.stringify({
        schema:'AIG_WEB_LEGACY_LOCAL_DRAFT_BACKUP',
        createdAt:new Date().toISOString(),
        drafts
      },null,2);
      const blob=new Blob([json],{type:'application/json;charset=utf-8'});
      const objectUrl=URL.createObjectURL(blob);
      const link=document.createElement('a');
      link.href=objectUrl;
      link.download='AIG-local-CNC-drafts-backup.json';
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(()=>URL.revokeObjectURL(objectUrl),30000);
      status.textContent='已要求下載 '+count+' 筆本機 CNC 工作資料；原內容保留，沒有傳送到伺服器。';
    }catch(error){
      status.textContent='無法匯出本機資料，原資料未清除：'+String(error?.message||error);
    }
  });
})();