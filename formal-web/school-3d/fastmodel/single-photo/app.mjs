import {PhotoViewer} from './viewer.mjs';
import {SubmissionJournal} from './submission.mjs';
import {reviewEvidenceManifest} from './heroine-review.mjs';
const $=id=>document.getElementById(id),status=$('status');
let view=null,loadedFile='',ready=false,busy=false,skinReportUrl=null,sourceSha=null;
const reviewObjectUrls=[];
function clearReviewEvidence(){
 for(const url of reviewObjectUrls)URL.revokeObjectURL(url);
 reviewObjectUrls.length=0;
 $('review-downloads').replaceChildren();
 $('review-image').hidden=true;$('review-image').removeAttribute('src');
 $('review-status').textContent='目前尚無已擷取的真正 GLB 四方向圖片；不能判定頭頸或髮束是否通過。';
}
async function sha256Bytes(bytes){
 const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
 return Array.from(hash,x=>x.toString(16).padStart(2,'0')).join('');
}
const journal=window.AIG_OFFLINE?null:new SubmissionJournal(localStorage);
try{view=new PhotoViewer($('view'),m=>{$('viewport-status').textContent='顯示已隔離：'+m+'；生成檔案保留。';});}catch(e){$('viewport-status').textContent='此裝置暫時不能啟用 GPU 預覽；仍可生成與下載 GLB。';}
const labels={NEW:'等待',SUBMITTING:'送出中',PENDING:'排程中',IN_PROGRESS:'生成中',SUCCEEDED:'完成',SKIPPED:'不適用',BASIC_WALK_PENDING:'下載動作',SUBMISSION_UNKNOWN:'受理待確認',FAILED:'未完成',CANCELED:'已取消'};
function errorText(m){if(String(m).includes('MESHY_API_KEY'))return '重建服務未連接；請先在主機設定服務帳戶。';return String(m);}
async function api(path,options){const r=await fetch(path,options),d=await r.json();if(!r.ok)throw Error(d.error||'服務暫時無法回應');return d;}
function updateButton(){$('generate').disabled=!ready||busy||!$('photo').files.length;}
function addLink(label,url,name){const a=document.createElement('a');a.className='download';a.textContent=label;a.href=url;if(name)a.download=name;$('downloads').append(a);}
async function load(bytes,orbit){
 if(!view)return;
 const clips=await view.load(bytes,{orbit});$('clip').replaceChildren();
 clearReviewEvidence();
 sourceSha=null;
 try{sourceSha=await sha256Bytes(bytes);}catch(e){$('review-status').textContent='GLB 已載入，但 SHA-256 無法取得：'+e.message+'。證據匯出 BLOCKED。';}
 $('review-capture').disabled=!sourceSha;
 $('skin-check').disabled=false;
 $('skin-check-status').textContent='GLB 已載入。可按「檢查」掃描當前皮膚重疊，並在動畫播放時收集 12 個真實姿態。';
 $('skin-check-downloads').replaceChildren();
 if(skinReportUrl){URL.revokeObjectURL(skinReportUrl);skinReportUrl=null;}
 for(const c of clips){const o=document.createElement('option');o.value=String(c.index);o.textContent=c.name;$('clip').append(o);}
 $('clip').disabled=!clips.length;$('pause').disabled=!clips.length;$('pause').textContent='暫停動畫';
 $('viewport-status').textContent=orbit?'真 3D 物件 · 相機環繞展示（非骨架動作）':'真 GLB 動畫 · 可旋轉縮放 · PBR 材質';
}
function show(d){
 if(d.status==='COMPLETE'||d.status==='FAILED')journal?.finish(d.id);
 for(const stage of ['model','rig','animation']){const s=d.stages[stage];$('stage-'+stage).textContent=(labels[s.status]||s.status)+(s.progress!=null&&s.status!=='SUCCEEDED'?' '+s.progress+'%':'');}
 if(d.status==='COMPLETE'){busy=false;status.textContent=d.mode==='object'?'3D 物件已完成；相機環繞展示可用。':'3D 模型與骨架動畫已完成；請檢查造型、頭頸及髮束。';}
 else if(d.status==='FAILED'){busy=false;status.textContent='此階段未完成：'+errorText(d.message||'服務拒絕此模型')+'。已生成的模型與原圖保留；再次按生成會建立新任務。';}
 else if(d.status==='SUBMISSION_UNKNOWN'){busy=false;status.textContent='送出後連線中斷，正在保留受理待確認狀態；不會重複送出計費。可在服務端找回任務 ID 後續接。';}
 else{busy=true;status.textContent='自動接續處理中；可重新開啟此頁繼續查詢。'+(d.message?'\n'+errorText(d.message):'');}
 $('downloads').replaceChildren();
 for(const name of ['model.glb','rigged.glb','animated.glb'])if(d.artifacts[name])addLink(name,'/api/jobs/'+d.id+'/files/'+name,name);
 if(Object.keys(d.artifacts).length)addLink('離線播放頁','/api/jobs/'+d.id+'/files/offline.html','AIG-3D-Animation-Offline.html');
 updateButton();
}
async function follow(id){
 try{
  const d=await api('/api/jobs/'+id);show(d);
  const name=d.artifacts['animated.glb']?'animated.glb':d.artifacts['model.glb']?'model.glb':'';
  if(name&&loadedFile!==id+'/'+name){
   try{const r=await fetch('/api/jobs/'+id+'/files/'+name);if(!r.ok)throw Error('模型下載暫時失敗');await load(await r.arrayBuffer(),d.mode==='object');loadedFile=id+'/'+name;}
   catch(e){$('viewport-status').textContent='預覽未完成：'+e.message+'；生成任務與下載檔案保留。';}
  }
  if(d.status==='RUNNING')setTimeout(()=>follow(id),3000);
 }catch(e){status.textContent='連線暫停：'+errorText(e.message)+'。既有任務保留；重新開啟頁面可續接。';busy=false;updateButton();}
}
$('local-glb').addEventListener('change',async()=>{
 const f=$('local-glb').files?.[0];
 if(!f)return;
 if(f.size>200*1024*1024||f.size<20){$('skin-check-status').textContent='本機 GLB 檔案大小不合法；模型未修改。';return;}
 if(!view){$('skin-check-status').textContent='此裝置沒有可用的 WebGL 預覽；無法對本機 GLB 做完整蒙皮姿態檢查。';return;}
 try{
  await load(await f.arrayBuffer(),false);
  loadedFile='LOCAL:'+f.name;
  status.textContent='已在本機載入 GLB，可檢查皮膚雙層重疊、骨架異常及目前動畫姿態。不會使用 Meshy 點數或上傳檔案。';
 }catch(err){
  $('skin-check-status').textContent='本機 GLB 未載入：'+err.message+'。原有模型仍保留。';
 }
});
$('photo').addEventListener('change',()=>{updateButton();});
$('subject').addEventListener('change',()=>{$('action').disabled=$('subject').value==='object';});
$('action').addEventListener('change',()=>{});
$('generate').addEventListener('click',async()=>{
 const file=$('photo').files[0];if(!file)return;if(file.size>20*1024*1024){status.textContent='請選擇 20 MB 以內的照片。';return;}
 busy=true;updateButton();status.textContent='正在建立可續接的圖片生成任務…';
 try{
  const sha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer())),v=>v.toString(16).padStart(2,'0')).join('');
  const mode=$('subject').value,actionId=mode==='humanoid'&&$('action').value!==''?Number($('action').value):null;
  const fingerprint=sha+'|'+mode+'|'+(actionId??'default');
  const requestId=journal.begin(fingerprint);
  const image=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error('照片讀取失敗'));r.readAsDataURL(file);});
  const d=await api('/api/jobs',{method:'POST',headers:{'Content-Type':'application/json','X-AIG-Request':'1'},body:JSON.stringify({image,requestId,mode,actionId})});
  journal.accept(fingerprint,d.id);follow(d.id);
 }catch(e){busy=false;status.textContent=errorText(e.message);updateButton();}
});
function renderSkinReport(r){
 const counts=r.poseSampling?.sampledFrames;
 const risky=(r.coincidentTrianglePairs||0)+(r.skinningVertexIssues||0)+(r.degenerateTriangles||0);
 $('skin-check-status').textContent='已檢查 '+r.checkedTriangles+' 個來源三角面、'+r.checkedMeshCount+
  ' 個網格；疑似雙層三角面 '+r.coincidentTrianglePairs+' 組，退化面 '+r.degenerateTriangles+
  ' 個，權重異常 '+r.skinningVertexIssues+' 個。'+
  (r.anatomyTagsAvailable?('髮束／脖子包圍盒重疊：'+(r.hairNeckBoxOverlap?'需人工複查':'未觀察到')):'缺少明確髮束／脖子標記，該項不能判定。')+
  (r.incomplete?' 取樣達上限，未涵蓋全部模型。':'')+
  (counts!==undefined?' 動畫姿態已抽樣 '+counts+'/'+r.poseSampling.targetFrames+' 幀。':'')+
  (risky?' 存在疑點，不能自動修復或直接判定穿模。':' 未發現上述抽樣異常；不代表已證明無穿模。');
 if(r.poseSampling?.status==='SAMPLED_POSES_REVIEW_REQUIRED'){
  $('skin-check-downloads').replaceChildren();
  if(skinReportUrl)URL.revokeObjectURL(skinReportUrl);
  skinReportUrl=URL.createObjectURL(new Blob([JSON.stringify(r,null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.className='download';a.href=skinReportUrl;
  a.download='AIG-Skin-Overlap-POSE-SAMPLE-NOT-APPROVED.json';a.textContent='下載皮膚／重疊檢查報告';
  $('skin-check-downloads').append(a);
 }
}
$('review-capture').addEventListener('click',async()=>{
 if(!view?.model||!sourceSha)return;
 const button=$('review-capture');
 button.disabled=true;
 $('review-status').textContent='正在截取載入 GLB 的真實動畫姿態及四方向畫面。正式驗收狀態仍為 BLOCKED。';
 try{
  const fraction=Number($('review-pose').value);
  const result=await view.captureHeroineReview({fraction});
  const manifest=reviewEvidenceManifest({sourceSha256:sourceSha,clipName:result.clipName,
    timeSeconds:result.timeSeconds,views:result.views,audit:result.audit});
  clearReviewEvidence();
  const png=URL.createObjectURL(result.image);
  const json=URL.createObjectURL(new Blob([JSON.stringify(manifest,null,2)],{type:'application/json'}));
  reviewObjectUrls.push(png,json);
  $('review-image').src=png;$('review-image').hidden=false;
  const items=[
   {label:'下載四方向真 GLB 檢查圖（PNG）',url:png,name:'AIG-Real-GLB-4-Axis-Not-Approved.png'},
   {label:'下載 SHA／動畫時間／皮膚 QA 證據（JSON）',url:json,name:'AIG-Real-GLB-Inspection-Blocked.json'}
  ];
  for(const item of items){
   const link=document.createElement('a');link.className='download';link.href=item.url;
   link.download=item.name;link.textContent=item.label;$('review-downloads').append(link);
  }
  $('review-status').textContent='已從當前 GLB 擷取四方向圖片：'+
   (result.clipName||'靜止模型')+' · '+result.timeSeconds.toFixed(3)+'s · SHA-256 '+sourceSha.slice(0,16)+
   '…。皮膚疑似重合面 '+(result.audit?.coincidentTrianglePairs??'?')+
   ' 組；仍需人工核對哪一面是臉、頭頸有無缺口及髮束是否穿模。'+
   ' 正式模型核准與 Windows／Android 60 FPS 均未通過；圖片不能自行證明合格。';
 }catch(e){
  $('review-status').textContent='四方向擷取未完成：'+e.message+'；原始 GLB 不變，不能使用舊圖驗收。';
  clearReviewEvidence();
  $('review-status').textContent='四方向擷取 BLOCKED：'+e.message+'。請保持原始 GLB 後再試。';
 }finally{button.disabled=!sourceSha;}
});
$('skin-check').addEventListener('click',()=>{
 if(!view?.model)return;
 $('skin-check').disabled=true;
 try{
  const initial=view.startSkinInspection(r=>{
   renderSkinReport(r);
   if(r.poseSampling?.status==='SAMPLED_POSES_REVIEW_REQUIRED')$('skin-check').disabled=false;
  },{frames:12,minIntervalMs:100});
  renderSkinReport(initial);
 }catch(e){$('skin-check-status').textContent='皮膚／重疊掃描 BLOCKED：'+e.message+'；模型保留。';$('skin-check').disabled=false;}
});
$('clip').addEventListener('change',()=>{try{view.animation.select(Number($('clip').value));}catch(e){status.textContent='片段未切換：'+e.message;}});
$('pause').addEventListener('click',()=>{if(!view?.animation)return;view.animation.paused=!view.animation.paused;$('pause').textContent=view.animation.paused?'繼續動畫':'暫停動畫';});
if(window.AIG_OFFLINE){
 $('generation').hidden=true;$('stages').hidden=true;status.textContent='本機離線播放 · 原始 GLB 與 PBR 材質保留；造型與實機效能尚未正式驗收。';
 const bytes=Uint8Array.from(atob(window.AIG_OFFLINE.glb),c=>c.charCodeAt(0));
 const url=URL.createObjectURL(new Blob([bytes],{type:'model/gltf-binary'}));addLink('下載 GLB',url,'AIG-animated.glb');
 load(bytes.buffer,window.AIG_OFFLINE.orbit).catch(e=>{status.textContent='預覽未完成：'+e.message;});
}else{
 api('/api/config').then(async c=>{
  ready=c.configured;status.textContent=ready?'重建服務已連接；選圖後按一次生成。':'重建服務未連接；請先在主機設定服務帳戶。';updateButton();
  if(ready)api('/api/actions').then(actions=>{for(const a of actions){const o=document.createElement('option');o.value=String(a.action_id);o.textContent=a.name;$('action').append(o);}}).catch(()=>{});
  const pending=journal.pending().at(-1);
  if(pending){
   try{const d=await api('/api/requests/'+pending.requestId);journal.accept(pending.fingerprint,d.id);follow(d.id);}
   catch(e){status.textContent='前一筆送出尚未取得回覆；重新選擇相同照片與選項，會沿用已保存的請求編號。';}
  }else{const job=localStorage.getItem('aig-photo-job');if(job)follow(job);}
 }).catch(e=>{status.textContent='本機服務未啟動：'+errorText(e.message);});
}
