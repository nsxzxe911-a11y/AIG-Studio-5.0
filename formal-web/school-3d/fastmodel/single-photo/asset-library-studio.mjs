import {openAIG716AssetLibrary,AIG716_CATEGORIES}
 from './aig-external-asset-library-7-16.mjs';
const $=id=>document.getElementById(id);
let library=null,visible=[],selected=new Set();
const status=(msg,bad=false)=>{
 $('status').dataset.state=bad?'error':'ok';
 $('status').textContent=msg;
};
const filename=s=>s.normalize('NFC').replace(/[\u0000-\u001f<>:"/\\|?*]/g,'_').slice(0,120);
const extMap={glb:'model/gltf-binary',gltf:'model/gltf+json',
 png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',
 webp:'image/webp',json:'application/json',geojson:'application/json',
 mp4:'video/mp4',webm:'video/webm',bin:'application/octet-stream'};
const categoryName={
 character:'人物',building:'建築',map:'圖資',scene:'場景',
 transition:'轉場',environment:'環境',animation:'動畫'
};
const parts=s=>s.split(',').map(x=>x.trim()).filter(Boolean);
const pretty=n=>n<1024?n+' B':n<1024*1024?
 (n/1024).toFixed(1)+' KiB':(n/1048576).toFixed(1)+' MiB';
const el=(tag,txt)=>{const node=document.createElement(tag);
 if(txt!==undefined)node.textContent=txt;return node;};
async function stats(){
 if(!library)return;
 const x=await library.estimate();
 $('stats').textContent='儲存項目 '+x.assetRecords+' 筆；獨立檔案 '+
  x.distinctPayloads+' 份；實際內容 '+pretty(x.storedPayloadBytes)+
  '；重複來源節省 '+pretty(x.duplicateBytesAvoided)+
  '。主程式啟動不預載模型，只有開啟指定素材時才讀取。';
}
async function draw(){
 const list=$('asset-list');
 visible=await library.list({category:$('asset-filter').value||null,limit:250});
 list.replaceChildren();
 if(!visible.length)list.append(el('p','尚未匯入此分類的素材'));
 for(const item of visible){
  const card=el('div');card.className='asset';card.setAttribute('role','listitem');
  const info=el('div'),name=el('strong',item.title);
  info.append(name,el('small',
   categoryName[item.category]+' · '+pretty(item.bytes)+
   ' · SHA '+item.sha256.slice(7,19)+' · '+item.reviewStatus+
   ' · 使用 '+item.reuseCount+' 次 · revision '+item.revision));
  info.append(el('small',(item.tags||[]).join('、')||'無標籤'));
  const controls=el('div'),select=el('input');
  select.type='checkbox';select.checked=selected.has(item.id);
  select.setAttribute('aria-label','選擇備份 '+item.title);
  select.style.width='24px';select.style.height='24px';
  select.addEventListener('change',()=>{
   if(select.checked)selected.add(item.id);else selected.delete(item.id);
  });
  controls.append(select);
  const download=el('button','取回檔案');
  download.addEventListener('click',async()=>{
   try{
    const loaded=await library.get(item.id,{includePayload:true});
    const url=URL.createObjectURL(loaded.blob),a=el('a');
    const suffix={ 'model/gltf-binary':'.glb','image/png':'.png',
     'image/jpeg':'.jpg','image/webp':'.webp','application/json':'.json',
     'video/mp4':'.mp4','video/webm':'.webm',
     'application/octet-stream':'.bin'}[item.mime]||'.bin';
    a.href=url;a.download=filename(item.title)+suffix;
    a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    status('已提供 '+item.title+' 的原始檔下載；SHA 來源未被修改。');
   }catch(e){status('讀取失敗：'+String(e.message||e),true)}
  });
  controls.append(download);
  if(item.reviewStatus==='unreviewed'){
   const approve=el('button','審核通過');
   approve.addEventListener('click',async()=>{
    if(!confirm('已實際檢查 '+item.title+
     ' 的內容與來源？核准後才允許自動推薦重用。'))return;
    try{
     await library.approve(item.id,{reviewed:true});
     await draw();status('已核准 '+item.title+'；保留原始 SHA。');
    }catch(e){status(String(e.message||e),true)}
   });
   controls.append(approve);
  }
  card.append(info,controls);list.append(card);
 }
 await stats();
}
async function main(){
 try{
  library=await openAIG716AssetLibrary();
  status('本機資產庫已開啟。所有素材內容與 FastModel 網頁程式分離。');
  await draw();
 }catch(e){
  status('本機儲存無法啟動：'+String(e.message||e)+
   '。請確認瀏覽器允許此網站的本機資料儲存。',true);
  return;
 }
 $('asset-file').addEventListener('change',()=>{
  const file=$('asset-file').files?.[0];if(!file)return;
  const name=file.name.replace(/\.[^.]*$/,'');
  $('asset-title').value=filename(name);
  const low=file.name.toLowerCase(),ext=low.split('.').at(-1);
  if(ext==='geojson')$('asset-category').value='map';
  if(ext==='mp4'||ext==='webm')$('asset-category').value='transition';
  // Heuristic file-extension classification is not computer vision:
  // never infer a real person/scene/category from pixels silently.
 });
 $('asset-import').addEventListener('click',async()=>{
  const file=$('asset-file').files?.[0];
  if(!file){status('請先選擇一個素材來源檔。',true);return;}
  $('asset-import').disabled=true;
  try{
   const ext=file.name.toLowerCase().split('.').at(-1);
   const mime=extMap[ext];
   if(!mime)throw Error('此檔案格式未開放，避免把可執行程式放進資料庫');
   const blob=new Blob([file],{type:mime});
   const item=await library.importBlob(blob,{
    category:$('asset-category').value,
    title:$('asset-title').value||file.name,
    tags:parts($('asset-tags').value),
    source:'USER_LOCAL',reviewStatus:'unreviewed',
    modelAccuracy:'NOT_VERIFIED',coordinateUnits:'UNKNOWN'
   });
   await draw();status('已保存：'+item.title+'（'+pretty(item.bytes)+
    '）。原檔 SHA 去重存放，尚需人工核准才能推薦給新場景。');
  }catch(e){status('匯入未完成：'+String(e.message||e),true)}
  finally{$('asset-import').disabled=false;}
 });
 $('asset-filter').addEventListener('change',()=>draw().catch(e=>status(String(e),true)));
 $('asset-reuse').addEventListener('click',async()=>{
  try{
   const tags=parts($('asset-reuse-tags').value);
   if(!tags.length)throw Error('請輸入至少一個想重用的標籤');
   const category=$('asset-filter').value||$('asset-category').value;
   const data=await library.suggest({category,tags,limit:10});
   $('reuse-results').replaceChildren();
   if(!data.length)$('reuse-results').append(el('p','尚無已核准且符合標籤的素材'));
   for(const record of data){
    const btn=el('button','使用 '+record.title+'（相似標籤 '+record.reuseScore+'）');
    btn.addEventListener('click',async()=>{
     try{
      await library.recordReuse(record.id);
      await draw();
      status('已記錄核准素材 '+record.title+
       ' 的重用；若要載入原始模型，請按「取回檔案」或由正式工作頁讀取。');
     }catch(e){status(String(e),true)}
    });
    $('reuse-results').append(btn);
   }
  }catch(e){status('推薦失敗：'+String(e.message||e),true)}
 });
 $('storage-persist').addEventListener('click',async()=>{
  try{
   const r=await library.requestPersistence();
   status(r.persistent?'瀏覽器已核准持久化儲存；仍建議外部備份。':
    '瀏覽器未提供永久保存保證。請用下方功能備份到外部資料夾。');
  }catch(e){status('持久化請求失敗：'+String(e.message||e),true)}
 });
 $('asset-folder-backup').addEventListener('click',async()=>{
  try{
   if(!selected.size)throw Error('請先勾選至少一個素材備份');
   if(typeof showDirectoryPicker!=='function')
    throw Error('此瀏覽器不支援直接選資料夾，可用每個檔案「取回檔案」備份');
   // Browser needs direct user selection; it cannot invisibly write to
   // Desktop/AppData/Android/data or hidden OS directories.
   const handle=await showDirectoryPicker({mode:'readwrite'});
   const root=await handle.getDirectoryHandle('AIG_FastModel_Library',{create:true});
   const list=[];
   for(const id of selected){
    const x=await library.get(id,{includePayload:true});
    if(!x)continue;
    const group=await root.getDirectoryHandle(x.asset.category,{create:true});
    const ext={ 'model/gltf-binary':'.glb','image/png':'.png',
     'image/jpeg':'.jpg','image/webp':'.webp','application/json':'.json',
     'video/mp4':'.mp4','video/webm':'.webm',
     'application/octet-stream':'.bin'}[x.asset.mime]||'.bin';
    const fileName=x.asset.sha256.slice(7)+ext;
    const fh=await group.getFileHandle(fileName,{create:true});
    const writer=await fh.createWritable();await writer.write(x.blob);await writer.close();
    list.push({...x.asset,folder:x.asset.category,file:fileName});
   }
   const fh=await root.getFileHandle('source-manifest.json',{create:true});
   const writer=await fh.createWritable();
   await writer.write(JSON.stringify({schema:'AIG716_PORTABLE_ASSET_BACKUP',
    date:new Date().toISOString(),records:list,
    assetsPreservedWithoutReencoding:true,
    privateMasterFilesNotModelTraining:true},null,2));
   await writer.close();
   status('已由你授權備份 '+list.length+
    ' 份資產到 AIG_FastModel_Library 分類資料夾，另附來源清單。');
  }catch(e){status('外部備份尚未完成：'+String(e.message||e),true)}
 });
 window.addEventListener('pagehide',()=>library?.close(),{once:true});
}
main();
