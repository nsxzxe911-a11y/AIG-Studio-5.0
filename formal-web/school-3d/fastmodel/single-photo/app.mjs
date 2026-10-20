import {PhotoViewer} from './viewer.mjs';
import {SubmissionJournal} from './submission.mjs';
import {reviewEvidenceManifest} from './heroine-review.mjs';
import {timelineEvidenceManifest} from './timeline-review.mjs';
import {parseStory,resolveStoryClips,STORY_PIPELINE_VERSION} from './story-to-animation.mjs';
import {composeDialogue,updateDialogueCue,annotateDialoguePlan,DIALOGUE_VERSION} from './story-dialogue.mjs';
import {StoryAudio,AUDIO_CUE_VERSION} from './story-audio.mjs';
import {MovieWorkspace} from './movie-ui.mjs';
import {generateVoiceBatch,TTS_VERSION} from './voice-generator.mjs';
import {inspectHeroineImage,evaluateHeroineJob,HEROINE_REFERENCE} from './heroine-authority-3-7.mjs';
import {createImplicitScene,AigImplicitRenderer,AIG_SDF_VERSION} from './aig-sdf-4-1.mjs';
import {Aig42Governor,Aig42FrameCoalescer,AIG42_SCHEMA} from './aig-performance-4-2.mjs';
import {createRig,Aig43RigController,Aig43PatchCache,poseUniforms} from './aig-hybrid-4-3.mjs';
import {appearanceFor,auditHairNeck,Aig44TimingEvidence} from './aig-qa-4-4.mjs';
import {AIG45_POSES,AIG45_MARKERS,AIG45_SCHEMA,recognizePose,normalizeMark,auditMarks,reviewPoseSet} from './aig-calibration-4-5.mjs';
import {AIG46_SCHEMA,normalizePoseSet,buildHeadNeckPonytail,exportOBJ} from './aig-head-neck-4-6.mjs';
import {AIG47_SCHEMA,buildAIG47Draft,exportAIG47GLB} from './aig-welded-4-7.mjs';
const $=id=>document.getElementById(id),status=$('status');
let view=null,loadedFile='',ready=false,busy=false,skinReportUrl=null,sourceSha=null;
const reviewObjectUrls=[],timelineObjectUrls=[],importedActionHashes=new Set(),actionShaByClipIndex=new Map();
let storyPlan=null,storyOutputUrl=null,storyDialogue=null,storyParsed=null,storyRevision=0,cloudBusy=false,dialogueCloudConfigured=false,movieUI=null;
let speechAIConfigured=false,ttsBusy=false,ttsGeneration=0,ttsFiles=[],ttsDownloadUrls=[];
let heroineSourceRevision=0,heroinePreviewUrl=null,heroineEvidenceUrl=null,heroineSourceMatch=false;
const storySound=new StoryAudio({onStatus:m=>{$('story-audio-status').textContent=m;}});
function soundOptions(){return {
 voice:$('voice-enabled').checked,sfx:$('sfx-enabled').checked,
 music:$('music-enabled').checked,mood:$('music-mood').value,
 volume:Number($('audio-volume').value)/100
};}
function clearSubtitle(){
 $('story-subtitle').textContent='';$('story-subtitle').hidden=true;
}
function showSubtitle(text){
 $('story-subtitle').textContent=text||'';$('story-subtitle').hidden=!text;
}
function exportStoryEvidence(){
 if(storyOutputUrl){URL.revokeObjectURL(storyOutputUrl);storyOutputUrl=null;}
 $('story-downloads').replaceChildren();
 if(!storyPlan||!storyParsed)return;
 const evidence={
  schema:STORY_PIPELINE_VERSION,dialogueSchema:DIALOGUE_VERSION,audioSchema:AUDIO_CUE_VERSION,
  originalText:storyParsed.originalText,sourceCharacterSha256:sourceSha||null,
  steps:storyPlan.timeline.map(part=>({...part,
    sourceActionSha256:actionShaByClipIndex.get(part.index)||sourceSha||null
  })),dialogueStyle:storyDialogue?.style||null,
  dialogueLines:storyDialogue?.cues||[],audioSettings:soundOptions(),
  unmapped:storyParsed.unmapped,missing:storyPlan.missing,blocking:storyPlan.blocking,
  ready:storyPlan.ready&&!!sourceSha,realGLBClipPlaybackOnly:true,
  generatedMotionFromText:false,cloudLLMDialogueGenerated:storyDialogue?.generatedByCloudLLM===true,
  originalWebAudioMusic:true,browserSpeechOnly:true,dialogueProvider:storyDialogue?.provider||'OFFLINE_TEMPLATE',
  exportedSoundTrack:false,createdMp4:false,actualCombatSceneApproved:false,
  physicalGPU60FPSVerified:false
 };
 storyOutputUrl=URL.createObjectURL(new Blob([JSON.stringify(evidence,null,2)],{type:'application/json'}));
 const link=document.createElement('a');link.className='download';link.href=storyOutputUrl;
 link.download='AIG-3-3-Story-Dialogue-Audio-Cue-Sheet.json';
 link.textContent='下載劇情／台詞／聲音提示與素材缺口 JSON';
 $('story-downloads').append(link);
}
function clearGeneratedTts(reason='台詞或動作已改變；舊語音已隔離。'){
 ttsGeneration++;ttsFiles=[];
 for(const u of ttsDownloadUrls)URL.revokeObjectURL(u);
 ttsDownloadUrls=[];$('ai-tts-downloads').replaceChildren();
 $('ai-tts-status').textContent=reason;refreshTtsButton();
}
function refreshTtsButton(){
 $('ai-tts-generate').disabled=ttsBusy||movieUI?.isBusy||!speechAIConfigured||
  !storyPlan?.ready||!sourceSha||!view?.model;
}
function renderDialogueEditor(){
 const parent=$('story-dialogues');parent.replaceChildren();
 for(const cue of storyDialogue?.cues||[]){
  const outer=document.createElement('div');outer.className='story-dialogue';
  const title=document.createElement('label');title.textContent='第 '+(cue.beat+1)+' 段：'+cue.actionId+'｜'+cue.speaker;
  const edit=document.createElement('textarea');edit.rows=2;edit.maxLength=240;
  edit.value=cue.text;edit.setAttribute('aria-label','台詞 '+(cue.beat+1));
  edit.addEventListener('input',()=>{
   try{
    if(view?.animation?.story?.playing){
     view.animation.stopStory();view.animation.mixer.stopAllAction();
     $('story-play').disabled=!storyPlan?.ready;$('story-stop').disabled=true;
     $('clip').disabled=false;storySound.stop();clearSubtitle();
    }
    storyDialogue=updateDialogueCue(storyDialogue,cue.beat,edit.value);
    if(storyPlan?.ready)storyPlan=annotateDialoguePlan(storyPlan,storyDialogue);
    clearGeneratedTts('台詞已更新，先前合成的聲音已隔離。');
    exportStoryEvidence();
    $('story-status').textContent='台詞已更新，播放時使用新內容；語音品質依瀏覽器可用聲音決定。';
   }catch(e){$('story-status').textContent='台詞未更新：'+e.message;}
  });
  outer.append(title,edit);parent.append(outer);
 }
}
const refreshStoryAudioEvidence=()=>{if(storyPlan)exportStoryEvidence();};

function clearStoryPlan(reason='劇情或 GLB 動作已改變，請重新解析。'){
 if(movieUI?.isBusy)throw Error('MOVIE_RECORDING_IN_PROGRESS');
 movieUI?.invalidate();
 const wasPlaying=!!view?.animation?.story?.playing;
 view?.animation?.stopStory();
 if(wasPlaying){
  view.animation.mixer.stopAllAction();
  view.animation.paused=true;
  $('pause').textContent='繼續動畫';
 }
 storySound.stop();clearSubtitle();storyRevision++;
 clearGeneratedTts('人物／劇情改變；已隔離可能不相符的逐句配音。');
 storyPlan=null;storyDialogue=null;storyParsed=null;
 $('story-dialogues').replaceChildren();
 $('story-play').disabled=true;$('story-stop').disabled=true;
 if(storyOutputUrl){URL.revokeObjectURL(storyOutputUrl);storyOutputUrl=null;}
 $('story-downloads').replaceChildren();$('story-timeline').replaceChildren();
 $('story-status').textContent=reason;
 if(view?.animation)$('clip').disabled=!view.animation.clips?.length;
}
function storyBeatsVisible(plan){
 const parent=$('story-timeline');parent.replaceChildren();
 const matched=new Map(plan.timeline.map(x=>[x.beat,x]));
 const missed=new Map(plan.missing.map(x=>[x.beat,x]));
 for(let i=0;i<plan.inputBeats;i++){
  const beat=matched.get(i),gap=missed.get(i);
  const row=document.createElement('div');row.className='beat'+(gap?' missing':'');
  row.textContent=beat?(i+1)+'. '+beat.label+' → 真 GLB 動作「'+beat.clipName+'」｜'+beat.seconds.toFixed(2)+' 秒':
   (i+1)+'. 缺少 '+(gap?.actionId||'未知')+' 動作：'+(gap?.reason||'BLOCKED');
  row.dataset.storyBeat=String(i);parent.append(row);
 }
 for(const block of plan.blocking.filter(x=>x.beat===undefined)){
  const row=document.createElement('div');row.className='beat missing';
  row.textContent='場景限制：'+block.reason;parent.append(row);
 }
}
function clearTimelineEvidence(){
 for(const u of timelineObjectUrls)URL.revokeObjectURL(u);
 timelineObjectUrls.length=0;
 $('timeline-downloads').replaceChildren();
 $('timeline-image').hidden=true;$('timeline-image').removeAttribute('src');
 $('timeline-status').textContent='尚無這個真實 GLB 的 16 格動畫檢查證據；正式女主角與打鬥動作尚未核准。';
}
function clearReviewEvidence(){
 for(const url of reviewObjectUrls)URL.revokeObjectURL(url);
 reviewObjectUrls.length=0;
 $('review-downloads').replaceChildren();
 $('review-image').hidden=true;$('review-image').removeAttribute('src');
 $('review-status').textContent='目前尚無已擷取的真正 GLB 四方向圖片；不能判定頭頸或髮束是否通過。';
}
function saveHeroineEvidence(result){
 if(heroineEvidenceUrl)URL.revokeObjectURL(heroineEvidenceUrl);
 heroineEvidenceUrl=URL.createObjectURL(new Blob([JSON.stringify(result,null,2)],{type:'application/json'}));
 const area=$('heroine-evidence-downloads');area.replaceChildren();
 const link=document.createElement('a');link.className='download';link.href=heroineEvidenceUrl;
 link.download='AIG-3-7-heroine-source-and-model-audit-NOT-APPROVED.json';
 link.textContent='下載來源與 GLB 核對報告（非通過證明）';
 area.append(link);
 $('heroine-glb-status').textContent=result.sourceChainMatched
  ?'真 GLB 與指定來源照片的本機生成任務 SHA 已核對一致。但頭頸、髮束、五官、裙裝與 3D 動作仍需人工驗收，不能自動批准。'
  :'目前沒有真正由指定女主角照片產生、且來源與 GLB SHA 都一致的正式人物動畫。保持 BLOCKED。';
}
async function decodeHeroineImage(file){
 if(typeof createImageBitmap==='function'){
  const image=await createImageBitmap(file);
  try{return {width:image.width,height:image.height};}finally{image.close();}
 }
 return await new Promise((resolve,reject)=>{
  const url=URL.createObjectURL(file),img=new Image();
  img.onload=()=>{const shape={width:img.naturalWidth,height:img.naturalHeight};
   URL.revokeObjectURL(url);resolve(shape);};
  img.onerror=()=>{URL.revokeObjectURL(url);reject(Error('HEROINE_IMAGE_DECODE_FAILED'));};
  img.src=url;
 });
}
async function sha256Bytes(bytes){
 const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
 return Array.from(hash,x=>x.toString(16).padStart(2,'0')).join('');
}
let reconstructionEvidenceUrl=null,reconstructionEvidenceId=null;
const phaseZh={QUEUED:'等待排程',PRECHECK:'來源檢查',RECONSTRUCTING:'3D 網格與 PBR 建模',TEXTURING:'材質階段',RIGGING:'自動綁定骨架',EXPORTING:'動作生成／GLB 匯出',COMPLETE:'生成任務完成',FAILED:'階段失敗',SUBMISSION_UNKNOWN:'服務可能已受理，待人工確認'};
function renderReconstruction(job){
 if(!job?.schema?.includes('RECONSTRUCTION_SERVICE_3_9'))return;
 const phase=phaseZh[job.phase]||job.phase,files=job.artifacts||[];
 $('reconstruction-phase-status').textContent='3D 自動化：'+phase+
  '。原圖 SHA '+(job.sourceSHA256||'尚未取得').slice(0,16)+'…／輸入 SHA '+
  (job.providerInputSHA256||'尚未取得').slice(0,16)+'…。'+
  (job.phase==='SUBMISSION_UNKNOWN'?'未知受理狀態，不會自動重新付費提交。':'')+
  (job.phase==='COMPLETE'?' 仍須人工核對頭頸、髮束、衣服與真動作；不是正式女主角驗收 PASS。':'')+
  (job.lastError?' '+job.lastError:'');
 if(reconstructionEvidenceId===job.jobId && !['COMPLETE','FAILED','SUBMISSION_UNKNOWN'].includes(job.phase))return;
 if(reconstructionEvidenceUrl)URL.revokeObjectURL(reconstructionEvidenceUrl);
 reconstructionEvidenceUrl=URL.createObjectURL(new Blob([JSON.stringify(job,null,2)],{type:'application/json'}));
 reconstructionEvidenceId=job.jobId;
 const el=$('reconstruction-evidence-downloads');el.replaceChildren();
 const link=document.createElement('a');link.href=reconstructionEvidenceUrl;
 link.download='AIG-FastModel-3-9-reconstruction-'+job.jobId+'-NOT-RELEASE.json';
 link.className='download';link.textContent='下載 3D 任務與 SHA 證據';
 el.append(link);
}
const journal=window.AIG_OFFLINE?null:new SubmissionJournal(localStorage);
try{view=new PhotoViewer($('view'),m=>{$('viewport-status').textContent='顯示已隔離：'+m+'；生成檔案保留。';});}catch(e){$('viewport-status').textContent='此裝置暫時不能啟用 GPU 預覽；仍可生成與下載 GLB。';}
const labels={NEW:'等待',SUBMITTING:'送出中',PENDING:'排程中',IN_PROGRESS:'生成中',SUCCEEDED:'完成',SKIPPED:'不適用',BASIC_WALK_PENDING:'下載動作',SUBMISSION_UNKNOWN:'受理待確認',FAILED:'未完成',CANCELED:'已取消'};
function errorText(m){if(String(m).includes('MESHY_API_KEY'))return '重建服務未連接；請先在主機設定服務帳戶。';return String(m);}
async function api(path,options){const r=await fetch(path,options),d=await r.json();if(!r.ok)throw Error(d.error||'服務暫時無法回應');return d;}
function updateButton(){/* AIG native full single-photo 3D is not ready; never call credits. */ $('generate').disabled=true;}
function addLink(label,url,name){const a=document.createElement('a');a.className='download';a.textContent=label;a.href=url;if(name)a.download=name;$('downloads').append(a);}
async function load(bytes,orbit){
 if(!view)return;
 saveHeroineEvidence(evaluateHeroineJob({}));
 const clips=await view.load(bytes,{orbit});$('clip').replaceChildren();
 clearReviewEvidence();clearTimelineEvidence();clearStoryPlan('新人物已載入，請重新解析劇情。');
 importedActionHashes.clear();actionShaByClipIndex.clear();
 $('action-glb').disabled=false;
 $('action-import-status').textContent='已載入人物 GLB。可選擇另一個骨架相符、含真實動畫的外部 GLB（不會將來源網格重疊渲染）。';
 sourceSha=null;
 try{sourceSha=await sha256Bytes(bytes);}catch(e){$('review-status').textContent='GLB 已載入，但 SHA-256 無法取得：'+e.message+'。證據匯出 BLOCKED。';}
 $('review-capture').disabled=!sourceSha;
 $('timeline-capture').disabled=!sourceSha||!clips.length;
 $('timeline-status').textContent=clips.length
  ?'此模型已有 '+clips.length+' 個實際動畫片段，可選擇片段並擷取四時間點 × 四方向畫面；不代表具有打鬥劇情。'
  :'GLB 已載入，但沒有任何真實動畫片段；不能假裝打架或產生動畫 16 格，請提供有骨架動作的 GLB。';
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
 if(d.status==='COMPLETE'){
  busy=false;
  status.textContent=(d.mode==='object'?'3D 物件已完成；相機環繞展示可用。':'3D 模型與骨架動畫已完成；請檢查造型、頭頸及髮束。')+
   (d.preparedForegroundEvidence?
    ' 已使用 SHA 繫結的 3.8 前景草稿；遮罩、髮束、衣裙與人物真實外觀仍需人工驗收，不能視為正式女主角已完成。':'');
 }
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
  try{
   renderReconstruction(await api('/api/reconstruction/jobs/'+id));
  }catch(err){$('reconstruction-phase-status').textContent='3D 任務狀態暫時無法取得：'+err.message+'；原任務仍保留。';}
  const name=d.artifacts['animated.glb']?'animated.glb':d.artifacts['model.glb']?'model.glb':'';
  if(name&&loadedFile!==id+'/'+name){
   try{
    const r=await fetch('/api/jobs/'+id+'/files/'+name);
    if(!r.ok)throw Error('模型下載暫時失敗');
    const bytes=await r.arrayBuffer(),modelHash=await sha256Bytes(bytes);
    await load(bytes,d.mode==='object');loadedFile=id+'/'+name;
    saveHeroineEvidence(evaluateHeroineJob({job:d,modelSha256:modelHash,assetName:name}));
   }
   catch(e){$('viewport-status').textContent='預覽未完成：'+e.message+'；生成任務與下載檔案保留。';}
  }
  if(d.status==='RUNNING')setTimeout(()=>follow(id),3000);
 }catch(e){status.textContent='連線暫停：'+errorText(e.message)+'。既有任務保留；重新開啟頁面可續接。';busy=false;updateButton();}
}
$('action-glb').addEventListener('change',async()=>{
 const input=$('action-glb'),f=input.files?.[0];
 if(!f)return;
 if(!view?.model||!sourceSha){
  $('action-import-status').textContent='請先匯入正式人物 GLB 並取得來源 SHA。';input.value='';return;
 }
 if(f.size>200*1024*1024||f.size<20){
  $('action-import-status').textContent='外部動作 GLB 大小不合法（須少於 200 MB）。';input.value='';return;
 }
 input.disabled=true;
 $('action-import-status').textContent='核對外部 GLB 骨架、bind pose 與原人物的相容性；不合格時保留原動畫。';
 try{
  const buffer=await f.arrayBuffer(),actionSha=await sha256Bytes(buffer);
  const fingerprint=sourceSha+':'+actionSha;
  if(importedActionHashes.has(fingerprint))throw Error('ACTION_ALREADY_IMPORTED');
  const originalSha=sourceSha;
  const result=await view.importExternalAction(buffer);
  if(sourceSha!==originalSha)throw Error('ACTION_TARGET_CHANGED');
  importedActionHashes.add(fingerprint);
  result.importedNames.forEach((_,offset)=>actionShaByClipIndex.set(result.selectedIndex+offset,actionSha));
  clearReviewEvidence();clearTimelineEvidence();clearStoryPlan('新外部動作已匯入，請重新解析劇情以使用新增片段。');
  const clips=view.animation.clips;
  $('clip').replaceChildren();
  clips.forEach((clip,index)=>{
   const option=document.createElement('option');option.value=String(index);
   option.textContent=clip.name||'動作 '+(index+1);$('clip').append(option);
  });
  $('clip').value=String(result.selectedIndex);
  $('clip').disabled=false;$('pause').disabled=false;$('pause').textContent='暫停動畫';
  $('timeline-capture').disabled=!sourceSha;
  $('action-import-status').textContent=
   '已讀入相容外部動作：'+result.clipCount+' 片段／'+result.boneCount+' 個骨架關節，'+
   '來源檔 SHA-256 '+actionSha.slice(0,16)+'…。人物本體沒有增加第二層網格。'+
   '已選取第一個新動作，可執行 16 格動畫／皮膚檢查；**打鬥劇情與實機效果仍未核准**。';
 }catch(err){
  $('action-import-status').textContent='外部動作未接入：'+err.message+
   '。原本 GLB、骨架與動作保持不變；不做猜測性自動重定向。';
 }finally{input.disabled=!view?.model;input.value='';}
});
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
// 4.5 offline-only source registry & manual normalized 2D landmark marking.
let aig45Entries=[],aig45Active=null,aig45Marks=[],aig45Accepted=new Map();
const aig45Canvas=$('aig45-canvas'),aig45Ctx=aig45Canvas.getContext('2d');
const aig45Names={
 headTop:'頭頂',chin:'下巴',leftShoulder:'畫面左肩',rightShoulder:'畫面右肩',
 leftHip:'畫面左髖',rightHip:'畫面右髖',leftAnkle:'畫面左腳踝',rightAnkle:'畫面右腳踝'};
function aig45SetStatus(message){$('aig45-status').textContent=message;}
function aig45Controls(){
 $('aig45-selector').disabled=!aig45Entries.length;
 $('aig45-undo').disabled=!aig45Marks.length;
 $('aig45-accept').disabled=!aig45Active||aig45Marks.length!==AIG45_MARKERS.length;
 $('aig45-export').disabled=!aig45Accepted.size;
 const next=AIG45_MARKERS[aig45Marks.length];
 $('aig45-next-point').textContent=next?'下一個標記：'+aig45Names[next]:
  '八個標記已完成；請按「確認本張比例資料」。';
}
function aig45Draw(){
 if(!aig45Ctx)return;
 const c=aig45Canvas;const ctx=aig45Ctx;
 ctx.clearRect(0,0,c.width,c.height);
 ctx.fillStyle='#030811';ctx.fillRect(0,0,c.width,c.height);
 if(!aig45Active)return;
 const image=aig45Active.image;
 ctx.drawImage(image,0,0,c.width,c.height);
 ctx.font='bold 14px sans-serif';ctx.textBaseline='top';
 aig45Marks.forEach((point,i)=>{
  const x=point.x*c.width,y=point.y*c.height;
  ctx.beginPath();ctx.arc(x,y,6,0,Math.PI*2);
  ctx.fillStyle='#02e7fd';ctx.fill();
  ctx.strokeStyle='#030811';ctx.lineWidth=2;ctx.stroke();
  ctx.fillStyle='#fff';ctx.fillText(String(i+1),x+9,y+2);
 });
}
function aig45Activate(id){
 const entry=aig45Entries.find(e=>e.id===id)||null;
 aig45Active=entry;aig45Marks=[];
 if(entry){
  aig45SetStatus('來源 SHA 已匹配：'+entry.id+'。請依序點選八個清楚可見的二維點；若腳踝被遮擋，禁止猜測標記。');
 }else aig45SetStatus('請選擇入庫來源圖片。');
 aig45Draw();aig45Controls();
}
async function aig45ImageFromFile(file){
 const objectURL=URL.createObjectURL(file);
 try{
  return await new Promise((resolve,reject)=>{
   const im=new Image();
   im.onload=()=>resolve(im);
   im.onerror=()=>reject(Error('AIG45_IMAGE_DECODE_FAILED'));
   im.src=objectURL;
  });
 }finally{URL.revokeObjectURL(objectURL);}
}
$('aig45-input').addEventListener('change',async()=>{
 // Do not carry landmarks or hashes across a different upload batch.
 aig45Entries=[];aig45Active=null;aig45Marks=[];aig45Accepted.clear();
 aig46Reset();
 $('aig45-selector').replaceChildren();
 aig45Draw();aig45Controls();
 const files=Array.from($('aig45-input').files||[]);
 if(!files.length){aig45SetStatus('未選照片。');return;}
 if(files.length>4){aig45SetStatus('AIG45_MAX_FOUR_IMAGES');return;}
 const seen=new Set(),entries=[];
 try{
  for(const file of files){
   if(file.size>20*1024*1024||file.size<100)throw Error('AIG45_SOURCE_SIZE_INVALID');
   const sha=await sha256Bytes(await file.arrayBuffer());
   const image=await aig45ImageFromFile(file);
   const result=recognizePose({sha256:sha,width:image.naturalWidth,height:image.naturalHeight});
   if(!result.matched)throw Error('AIG45_UNREGISTERED_OR_RESIZED_PNG_'+file.name);
   if(seen.has(result.matchedRecord))throw Error('AIG45_DUPLICATE_POSE_SOURCE');
   seen.add(result.matchedRecord);
   entries.push({id:result.matchedRecord,source:result,image,file});
  }
  aig45Entries=entries;
  for(const entry of entries){
   const p=AIG45_POSES.find(v=>v.id===entry.id);
   const opt=document.createElement('option');opt.value=entry.id;
   opt.textContent=entry.id+' · '+p.description;
   $('aig45-selector').append(opt);
  }
  $('aig45-selector').value=entries[0].id;
  aig45Activate(entries[0].id);
 }catch(error){
  aig45Entries=[];aig45Active=null;
  $('aig45-selector').replaceChildren();
  aig45SetStatus('4.5 入庫驗證 BLOCKED：'+error.message+'。圖片被改碼或不是原本四張時不接受。');
  aig45Draw();aig45Controls();
 }
});
$('aig45-selector').addEventListener('change',()=>{
 const id=$('aig45-selector').value;
 aig45Activate(id);
});
aig45Canvas.addEventListener('click',event=>{
 if(!aig45Active||aig45Marks.length>=AIG45_MARKERS.length)return;
 const rect=aig45Canvas.getBoundingClientRect();
 if(!rect.width||!rect.height)return;
 const x=(event.clientX-rect.left)/rect.width;
 const y=(event.clientY-rect.top)/rect.height;
 try{
  aig45Marks.push(normalizeMark({x:x*aig45Active.image.naturalWidth,y:y*aig45Active.image.naturalHeight},aig45Active.image.naturalWidth,aig45Active.image.naturalHeight));
  aig45Draw();aig45Controls();
 }catch(error){aig45SetStatus('標記位置超界：'+error.message);}
});
$('aig45-undo').addEventListener('click',()=>{
 aig45Marks.pop();aig45Draw();aig45Controls();
});
$('aig45-accept').addEventListener('click',()=>{
 if(!aig45Active||aig45Marks.length!==8)return;
 try{
  const points=Object.fromEntries(AIG45_MARKERS.map((name,i)=>[name,aig45Marks[i]]));
  const evidence=auditMarks(aig45Active.source,points);
  aig45Accepted.set(aig45Active.id,evidence);
  aig46Reset();
  aig45SetStatus('校正已保存（僅本頁）：'+aig45Active.id+
   '；肩寬／身高比例 '+evidence.ratios.apparentShoulderWidthOverBody.toFixed(3)+
   '。深度與背面未實測，不會生成假 3D。');
  aig45Controls();
 }catch(error){aig45SetStatus('校正 BLOCKED：'+error.message+'。請撤回／修正不合理的點。');}
});
$('aig45-export').addEventListener('click',()=>{
 if(!aig45Accepted.size)return;
 try{
  const images=[...aig45Accepted.values()];
  const review=reviewPoseSet(images);
  const report={schema:AIG45_SCHEMA,sourceSet:AIG45_POSES.map(({id,sha256,width,height,view})=>
   ({id,sha256,width,height,view})),calibrations:images,review,
   cloudCreditsSpent:0,thirdParty3DInferenceUsed:false,
   manualMarksOnly:true,realWomanMeshVerified:false,formalReleaseAllowed:false};
  const uri=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));
  const a=document.createElement('a');
  a.href=uri;a.download='AIG-4.5-POSE-CALIBRATION-DRAFT-NOT-3D.json';
  a.click();setTimeout(()=>URL.revokeObjectURL(uri),30000);
  aig45SetStatus('來源 SHA＋手動比例資料已匯出。'+images.length+
   ' 張不同站姿不構成多角度 3D 觀測；背面仍是未知。');
 }catch(error){aig45SetStatus('校正報告 BLOCKED：'+error.message);}
});

// 4.6 independent native geometry path: no paid APIs or overwrite of 4.0 GLB.
let aig46Profile=null,aig46Draft=null,aig47Draft=null;
function aig47Reset(message='4.7 來源或馬尾參數已變更；請重新建立共享頂點技術網格。'){
 aig47Draft=null;
 for(const id of ['aig47-download','aig47-evidence'])$(id).disabled=true;
 $('aig47-build').disabled=!aig46Profile||!aig46Draft;
 $('aig47-status').textContent=message;
}
const aig46Canvas=$('aig46-canvas'),aig46Ctx=aig46Canvas.getContext('2d');
function aig46Reset(){
 aig46Draft=null;aig46Profile=null;
 aig47Reset('4.7 等待已校正的 4.5／4.6 來源。技術 GLB 不等於正式女主角。');
 $('aig46-downloads').replaceChildren();
 for(const id of ['aig46-swing','aig46-back','aig46-yaw'])$(id).disabled=true;
 $('aig46-build').disabled=!aig45Accepted.size;
 $('aig46-status').textContent='4.6 等待校正報告。已存在的原圖、4.0 GLB 與其餘 Runtime 工作區保持不變。';
 aig46Draw();
}
function aig46Draw(){
 const ctx=aig46Ctx,c=aig46Canvas;
 if(!ctx)return;
 ctx.fillStyle='#020407';ctx.fillRect(0,0,c.width,c.height);
 ctx.fillStyle='#b3d6ea';ctx.font='13px sans-serif';
 ctx.fillText('AIG 4.6 · 推估幾何，不是擬真人物',12,22);
 const draft=aig47Draft||aig46Draft;
 if(!draft)return;
 const yaw=Number($('aig46-yaw').value)*Math.PI/180;
 const cos=Math.cos(yaw),sin=Math.sin(yaw);
 const scale=690,cy=c.height*.66;
 const colorByPart={head:'#d3a9a1',neck:'#8dc6e8',headNeck:'#d3a9a1',ponytail:'#684a44'};
 const tris=[];
 for(const part of draft.parts){
  const points=[];
  for(let i=0;i<part.positions.length;i+=3){
   const x=part.positions[i],y=part.positions[i+1],z=part.positions[i+2];
   const rx=x*cos+z*sin,rz=-x*sin+z*cos;
   points.push({x:c.width/2+rx*scale,y:cy-(y-.22)*scale,z:rz});
  }
  for(let i=0;i<part.indices.length;i+=3){
   const a=points[part.indices[i]],b=points[part.indices[i+1]],
    d=points[part.indices[i+2]];
   // Camera projection with back-to-front painter ordering for technical preview.
   tris.push({a,b,d,z:(a.z+b.z+d.z)/3,color:colorByPart[part.name]||'#a9b6c4'});
  }
 }
 tris.sort((a,b)=>a.z-b.z);
 ctx.lineWidth=.5;
 for(const t of tris){
  ctx.fillStyle=t.color;ctx.strokeStyle='rgba(2,4,7,.28)';
  ctx.beginPath();ctx.moveTo(t.a.x,t.a.y);ctx.lineTo(t.b.x,t.b.y);
  ctx.lineTo(t.d.x,t.d.y);ctx.closePath();ctx.fill();ctx.stroke();
 }
 ctx.fillStyle='#f3c47a';
 ctx.fillText(aig47Draft?'4.7 頭頸一體共享頂點 · 技術 GLB · 非正式人物':'4.6 三個獨立封閉網格 · 無骨架／背面照片',12,c.height-16);
}
function aig46Status(){
 if(!aig46Draft)return;
 const summary=aig46Draft.topology.map(q=>q.part+': '+q.triangleCount+' 面').join(' / ');
 const profile=aig46Profile;
 $('aig46-status').textContent='來源 '+profile.poses.length+' 張已校正正面姿勢。'+
  summary+'。封閉網格：'+(aig46Draft.topologyQA?'PASS':'BLOCKED')+
  '；頭頸代理交疊：'+(aig46Draft.headNeckProxyTouchByGeometry?'存在':'需複查')+
  '。個別網格尚未焊成真皮膚、馬尾髮絲未驗證，不可作正式人物。';
}
function aig46Rebuild(){
 if(!aig46Profile)return;
 aig47Reset();
 try{
  const swing=Number($('aig46-swing').value)/1000,
   back=Number($('aig46-back').value)/1000;
  const candidate=buildHeadNeckPonytail(aig46Profile,
   {ponytailSwing:swing,ponytailBack:back});
  if(!candidate.topologyQA)throw Error('AIG46_WATERTIGHT_OR_OUTWARD_NORMAL_FAILED');
  aig46Draft=candidate;
  $('aig46-swing-value').textContent=swing.toFixed(3);
  $('aig46-back-value').textContent=back.toFixed(3);
  aig46Draw();aig46Status();
 }catch(error){
  aig46Draft=null;
  $('aig46-status').textContent='4.6 幾何 BLOCKED：'+error.message+
   '。保留來源圖與既有 4.0 GLB。';
  aig46Draw();
 }
}
function aig47Download(bytes,filename,mime){
 const link=document.createElement('a'),uri=URL.createObjectURL(new Blob([bytes],{type:mime}));
 link.href=uri;link.download=filename;link.click();
 setTimeout(()=>URL.revokeObjectURL(uri),30000);
}
$('aig47-build').addEventListener('click',()=>{
 if(!aig46Profile||!aig46Draft){
  aig47Reset('來源未通過 4.6 正式拓樸 Gate，不能憑空生成 4.7 頭頸。');return;
 }
 try{
  const draft=buildAIG47Draft(aig46Profile,{
   ponytailSwing:Number($('aig46-swing').value)/1000,
   ponytailBack:Number($('aig46-back').value)/1000
  });
  const glb=exportAIG47GLB(draft);
  if(!glb.bytes?.length||!draft.topologyQA)throw Error('AIG47_GLTF_EXPORT_GATE');
  aig47Draft=draft;
  $('aig47-download').disabled=false;$('aig47-evidence').disabled=false;
  $('aig47-build').disabled=false;
  $('aig47-status').textContent='已建立真正共享頂點的頭頸封閉網格（'+
   draft.headNeckJoinRingVertices+' 個共用環頂點；'+draft.topology[0].triangleCount+
   ' 個頭頸面）。技術 GLB '+glb.bytes.length+' bytes。馬尾／頸部代理檢測 '+ 
   draft.hairClearance.sampledPonytailVertices+' 個頂點，內部風險 '+ 
   draft.hairClearance.verticesInsideEnvelope+' 個。頭頸外形為推估、非人體實際焊接或蒙皮。';
  aig46Draw();
 }catch(error){
  aig47Reset('4.7 共享頭頸模型 BLOCKED：'+error.message+'；4.6 及原始來源不受影響。');
  aig46Draw();
 }
});
$('aig47-download').addEventListener('click',()=>{
 if(!aig47Draft)return;
 try{
  const glb=exportAIG47GLB(aig47Draft);
  aig47Download(glb.bytes,'AIG-4.7-technical-shared-head-neck-NOT-HEROINE.glb','model/gltf-binary');
 }catch(error){$('aig47-status').textContent='4.7 GLB 輸出 BLOCKED：'+error.message;}
});
$('aig47-evidence').addEventListener('click',()=>{
 if(!aig47Draft)return;
 const evidence={schema:AIG47_SCHEMA,sourceSHA256:aig47Draft.sourceSHA256,
  topology:aig47Draft.topology,sharedJoinVertices:aig47Draft.headNeckJoinRingVertices,
  headNeckSharedIndexSurface:aig47Draft.headNeckSharedVertexJoin,
  hairClearance:aig47Draft.hairClearance,headNeckActualPhotoSkinWelded:false,
  hairStrandPhysicalCollisionVerified:false,realHumanFaceVerified:false,
  animatedSkinningAvailable:false,realWindowsAndroidGpuVerified:false,
  originalPhotosAndPreviousGlbUnchanged:true,noPaidGeneration:true,releaseAllowed:false};
 aig47Download(JSON.stringify(evidence,null,2),'AIG-4.7-head-neck-hair-Gate-NOT-APPROVED.json','application/json');
});
$('aig46-build').addEventListener('click',()=>{
 try{
  aig46Profile=normalizePoseSet([...aig45Accepted.values()]);
  for(const id of ['aig46-swing','aig46-back','aig46-yaw'])$(id).disabled=false;
  aig46Rebuild();
  if(aig46Draft){
   $('aig46-downloads').replaceChildren();
   for(const [id,label] of [['obj','下載頭頸馬尾技術 OBJ'],['report','下載 4.6 幾何 QA JSON']]){
    const button=document.createElement('button');button.type='button';button.textContent=label;
    button.addEventListener('click',()=>{
     if(!aig46Draft||!aig46Profile)return;
     const report={schema:AIG46_SCHEMA,sourceSHA256:aig46Draft.sourceSHA256,
      source2DProfiles:aig46Profile.poses,medianRatios:aig46Profile.medianRatios,
      topology:aig46Draft.topology,headNeckProxyTouchByGeometry:aig46Draft.headNeckProxyTouchByGeometry,
      ponytailRootNearHeadProxy:aig46Draft.ponytailRootNearHeadProxy,
      ponytailNeckProxyIntersectionRisk:aig46Draft.ponytailNeckProxyIntersectionRisk,
      rearDepthKnown:false,headNeckMeshSeamWelded:false,
      realPhoto3DVerified:false,zeroCredits:true,releaseAllowed:false};
     const isOBJ=id==='obj';
     const data=isOBJ?exportOBJ(aig46Draft):JSON.stringify(report,null,2);
     const uri=URL.createObjectURL(new Blob([data],
      {type:isOBJ?'text/plain':'application/json'}));
     const link=document.createElement('a');
     link.href=uri;link.download=isOBJ?'AIG-4.6-head-neck-ponytail-TECHNICAL-DRAFT.obj':
      'AIG-4.6-source-part-QA-NOT-APPROVED.json';
     link.click();setTimeout(()=>URL.revokeObjectURL(uri),30000);
    });
    $('aig46-downloads').append(button);
   }
  }
 }catch(error){
  aig46Draft=null;aig46Profile=null;
  $('aig46-status').textContent='4.6 多姿勢校正 BLOCKED：'+error.message+
   '。有不同透視／比例時須先回 4.5 修正標點，不會捏造背面。';
  aig46Draw();
 }
});
for(const id of ['aig46-swing','aig46-back'])
 $(id).addEventListener('input',aig46Rebuild);
$('aig46-yaw').addEventListener('input',()=>{
 $('aig46-yaw-value').textContent=$('aig46-yaw').value+'°';
 aig46Draw();
});

let aig41Renderer=null,aig41Scene=null,aig42FrameQueue=null;
let aig43Controller=null,aig43Cache=null;
let aig44Appearance=null,aig44LastAudit=null,aig44Timing=null,aig44SourceSHA=null;
let aig42Governor=null,aig42Epoch=0,aig42CanvasLost=false;
const AIG41_QUALITY={fast:{pixelScale:.5,maxSteps:48},
 balanced:{pixelScale:.75,maxSteps:64},quality:{pixelScale:1,maxSteps:88}};
const aig41Canvas=$('aig41-canvas');
aig41Canvas.addEventListener('webglcontextlost',event=>{
 event.preventDefault();
 aig42CanvasLost=true;
 releaseAig41();
 $('aig41-status').textContent='GPU context 已中斷；SDF 暫停，來源與 4.0 GLB 保留。恢復後需手動重新載入。';
});
aig41Canvas.addEventListener('webglcontextrestored',()=>{
 aig42CanvasLost=false;
 $('aig41-status').textContent='GPU 已恢復；請重新生成／驗證 4.0 來源後啟動 SDF，避免舊資產混用。';
});
function releaseAig41(){
 aig42Epoch++;
 aig42FrameQueue?.dispose();aig42FrameQueue=null;
 aig41Renderer?.dispose();aig41Renderer=null;aig41Scene=null;aig42Governor=null;
 for(const id of ['aig41-yaw','aig41-quality','aig41-preview','aig41-release'])
  $(id).disabled=true;
 aig43Controller=null;aig43Cache?.invalidateAll();aig43Cache=null;
 for(const id of ['aig43-part','aig43-angle','aig43-reset'])$(id).disabled=true;
 $('aig43-angle').value='0';
 $('aig43-cache').textContent='4.3 GPU 參數已釋放；原圖與成功的 4.0 GLB 保留。';
 aig44Appearance=null;aig44LastAudit=null;aig44Timing=null;aig44SourceSHA=null;
 for(const id of ['aig44-hair','aig44-palette','aig44-check','aig44-evidence'])
  $(id).disabled=true;
 $('aig44-status').textContent='4.4 品質檢查已卸載；原始模型與已完成的 GLB 不受影響。';
}
function aig43UpdateCache(part){
 if(!aig43Controller||!aig43Cache)return;
 const entry=aig43Cache.get(aig43Controller,part);
 const info=aig43Cache.report();
 $('aig43-cache').textContent='4.3 '+part+
  ' · '+(entry.cacheHit?'Mesh 快取命中':'局部 Mesh 更新')+
  ' · '+entry.mesh.indices.length/3+' 個技術三角面 · 累積命中 '+info.hits+
  '／重建 '+info.misses+'；四肢與皮膚比例仍為推估。';
}
$('aig43-part').addEventListener('change',()=>{
 if(!aig43Controller)return;
 const part=$('aig43-part').value;
 $('aig43-angle').value=String(aig43Controller.rig.angles[part]);
 aig43UpdateCache(part);
});
$('aig43-angle').addEventListener('input',()=>{
 if(!aig43Controller)return;
 const part=$('aig43-part').value;
 aig43Controller.setAngle(part,Number($('aig43-angle').value));
 aig43UpdateCache(part);
 aig41Preview();
});
$('aig43-reset').addEventListener('click',()=>{
 if(!aig43Controller)return;
 const part=$('aig43-part').value;
 aig43Controller.reset(part);
 $('aig43-angle').value='0';
 aig43UpdateCache(part);
 aig41Preview();
});
function aig44Refresh(){
 if(!aig41Scene||!aig44Appearance)return;
 aig44LastAudit=auditHairNeck(aig41Scene,{hairBackOffset:aig44Appearance.hairBackOffset});
 const r=aig44LastAudit;
 $('aig44-hair-value').textContent=r.hairBackOffset.toFixed(3);
 $('aig44-status').textContent='4.4 頭頸 SDF '+(r.technicalNeckSdfContinuous?'連續':'可能不連續')+
  '；髮量／頸後最小距離 '+r.minHairNeckSignedDistance.toFixed(4)+
  ' 正規化單位。'+(r.proxyClearanceWithinSafetyMargin?' 發現代理體積交疊／安全間距不足。':
  ' 代理體積未偵測到近距離交疊。')+
  ' 這不是髮絲、皮膚和實體 Mesh 穿模 PASS；實機 GPU FPS 仍需驗證。';
 aig41Preview();
}
$('aig44-hair').addEventListener('input',()=>{
 if(!aig41Scene)return;
 aig44Appearance=appearanceFor($('aig44-palette').value,Number($('aig44-hair').value)/1000);
 aig44Refresh();
});
$('aig44-palette').addEventListener('change',()=>{
 if(!aig41Scene)return;
 aig44Appearance=appearanceFor($('aig44-palette').value,Number($('aig44-hair').value)/1000);
 aig44Refresh();
});
$('aig44-check').addEventListener('click',aig44Refresh);
$('aig44-evidence').addEventListener('click',()=>{
 if(!aig44LastAudit||!aig44SourceSHA)return;
 const evidence={schema:'AIG_FASTMODEL_4_4_LOCAL_QA',
   sourceSHA256:aig44SourceSHA,materialPreview:aig44Appearance,
   hairNeck:aig44LastAudit,timing:aig44Timing?.summary()||null,
   thirdPartyInferenceUsed:false,creditsSpent:0,formalReleaseAllowed:false,
   actualHumanHairMeshValidated:false,deviceVideoFPSVerified:false};
 const url=URL.createObjectURL(new Blob([JSON.stringify(evidence,null,2)],
   {type:'application/json'}));
 const a=document.createElement('a');a.href=url;
 a.download='AIG-4.4-Hair-Neck-GPU-DRAFT-NOT-APPROVED.json';a.click();
 setTimeout(()=>URL.revokeObjectURL(url),30000);
});
function aig42Draw(request){
 if(!aig41Scene||aig42CanvasLost||!request||request.epoch!==aig42Epoch)return;
 const canvas=$('aig41-canvas'), selection=$('aig41-quality').value;
 const automatic=selection==='auto';
 const config=automatic?aig42Governor.quality:(AIG41_QUALITY[selection]||AIG41_QUALITY.fast);
 try{
  if(!aig41Renderer)aig41Renderer=new AigImplicitRenderer(canvas,aig41Scene,config);
  else aig41Renderer.configure(config);
  // Pose uniforms update only positions, not GLB mesh or full-screen GPU shader.
  if(aig43Controller)aig41Renderer.setRigPose(poseUniforms(aig43Controller.rig));
  if(aig44Appearance)aig41Renderer.setAppearance(aig44Appearance);
  const t0=performance.now();
  const result=aig41Renderer.draw(request.yaw);
  const submitMs=performance.now()-t0;
  aig44Timing?.record({jsSubmitMs:submitMs,gpuSample:result.gpuSample});
  let gpuText='GPU 計時尚未取得（非 60 FPS 證據）';
  let changeResult=null;
  if(automatic&&result.gpuSample){
   changeResult=aig42Governor.observe(result.gpuSample);
  }
  if(result.gpuSample?.disjoint){
   gpuText='GPU 時鐘失真／不採用樣本';
  }else if(result.gpuSample&&Number.isFinite(result.gpuSample.gpuMs)){
   gpuText='GPU '+result.gpuSample.gpuMs.toFixed(2)+'ms／筆有效樣本';
  }
  const tierText=automatic?'自動 '+aig42Governor.quality.id:selection;
  $('aig41-status').textContent='AIG 4.2 SDF '+$('aig41-yaw').value+'° · '+tierText+
   ' · '+result.renderPixels+' 像素 · '+result.rayStepsLimit+' 步；'+gpuText+
   '；JS 提交 '+submitMs.toFixed(2)+'ms（非實際畫面 FPS）。'+
   (changeResult?.status==='MINIMUM_WORKLOAD_STILL_SLOW_USE_CACHED_GLB'?
    ' 已降到最低仍偏慢：請改用已快取的 4.0 低面數 GLB 預覽。':'')+
   ' 頭頸與衣物仍為推估 SDF，不代表完成的人物。';
  if(changeResult?.changed){
   // Just one follow-up draw to show lower GPU workload; no endless render loop.
   aig42FrameQueue?.schedule({yaw:request.yaw,epoch:request.epoch});
  }
 }catch(error){
  $('aig41-status').textContent='AIG 4.2 SDF 預覽 BLOCKED：'+error.message+
   '。保留 4.0 GLB 與來源，不自動改用付費服務。';
  aig42FrameQueue?.dispose();aig42FrameQueue=null;
  aig41Renderer?.dispose();aig41Renderer=null;
 }
}
function aig41Preview(){
 if(!aig41Scene||aig42CanvasLost)return;
 const yaw=Number($('aig41-yaw').value)*Math.PI/180;
 aig42FrameQueue?.schedule({yaw,epoch:aig42Epoch});
}
async function aig41FromScaffold(prefix,expectedSHA){
 releaseAig41();
 const response=await fetch(prefix+'scaffold.json');
 if(!response.ok)throw Error('AIG41_SCAFFOLD_FETCH_FAILED');
 const scaffold=await response.json();
 if(scaffold.sourceSHA256!==expectedSHA)throw Error('AIG41_SCAFFOLD_IMAGE_SHA_MISMATCH');
 const scene=createImplicitScene(scaffold);
 if(aig42CanvasLost)throw Error('AIG42_WEBGL_CONTEXT_LOST');
 const rig=createRig(scaffold);
 aig43Controller=new Aig43RigController(rig);
 aig43Cache=new Aig43PatchCache();
 // Prewarm the four bounded limb patches for independent LOD/export tasks.
 for(const part of ['leftArm','rightArm','leftLeg','rightLeg'])
  aig43Cache.get(aig43Controller,part);
 aig41Scene=scene;
 aig44SourceSHA=scaffold.sourceSHA256;
 aig44Timing=new Aig44TimingEvidence();
 $('aig44-hair').value='50';$('aig44-palette').value='natural';
 aig44Appearance=appearanceFor('natural',.05);
 for(const id of ['aig44-hair','aig44-palette','aig44-check','aig44-evidence'])
  $(id).disabled=false;
 aig44Refresh();
 aig42Governor=new Aig42Governor({targetGpuMs:12,initialTier:1});
 aig42FrameQueue=new Aig42FrameCoalescer({
  requestFrame:callback=>requestAnimationFrame(callback),
  cancelFrame:handle=>cancelAnimationFrame(handle),
  draw:aig42Draw
 });
 for(const id of ['aig41-yaw','aig41-quality','aig41-preview','aig41-release'])
  $(id).disabled=false;
 for(const id of ['aig43-part','aig43-angle','aig43-reset'])$(id).disabled=false;
 $('aig43-part').value='leftArm';
 $('aig43-angle').value='0';
 aig43UpdateCache('leftArm');
 $('aig41-yaw').value='0';
 $('aig41-quality').value='auto';
 aig41Preview();
}
$('aig41-yaw').addEventListener('input',aig41Preview);
$('aig41-quality').addEventListener('change',aig41Preview);
$('aig41-preview').addEventListener('click',aig41Preview);
$('aig41-release').addEventListener('click',()=>{
 releaseAig41();
 $('aig41-status').textContent='4.2 GPU 與排程已釋放。原始照片及 4.0 技術 GLB 保留。';
});
let aig4Busy=false;
function aig4RefreshButton(){
 $('aig4-build').disabled=aig4Busy||!$('aig4-front').files?.length;
}
for(const id of ['aig4-front','aig4-side'])
 $(''+id).addEventListener('change',()=>{
  $('aig4-status').textContent='來源已改變。4.0 只會依前景畫素建立自研封閉體積草模，未知背面／五官不會偽裝成真照片。';
  aig4RefreshButton();
 });
function aig4Link(label,url,name){
 const a=document.createElement('a');
 a.className='download';a.href=url;a.textContent=label;a.download=name;
 $('aig4-downloads').append(a);
}
async function aig4ReadData(file){
 return new Promise((resolve,reject)=>{
  const reader=new FileReader();
  reader.onload=()=>resolve(reader.result);
  reader.onerror=()=>reject(Error('AIG4_IMAGE_READ_FAILED'));
  reader.readAsDataURL(file);
 });
}
$('aig4-build').addEventListener('click',async()=>{
 if(aig4Busy)return;
 const front=$('aig4-front').files?.[0]||null;
 const side=$('aig4-side').files?.[0]||null;
 if(!front)return;
 if(front.size>20*1024*1024||side?.size>20*1024*1024){
  $('aig4-status').textContent='單張圖片不可超過 20 MB。';return;
 }
 releaseAig41();
 $('aig41-status').textContent='新圖片來源處理中，先釋放舊 SDF；已保存的 4.0 GLB 不變。';
 aig4Busy=true;aig4RefreshButton();
 $('aig4-view-gallery').replaceChildren();
 $('aig4-downloads').replaceChildren();
 const status4=$('aig4-status');
 status4.textContent='本機 AIG 4.0 來源與輪廓預檢中；不呼叫 Meshy／付費 API。';
 try{
  const frontBytes=await front.arrayBuffer();
  const frontSHA=await sha256Bytes(frontBytes);
  const sideBytes=side?await side.arrayBuffer():null;
  const sideSHA=sideBytes?await sha256Bytes(sideBytes):'NONE';
  const fingerprint='AIG_NATIVE_4_0|'+frontSHA+'|'+sideSHA;
  const requestId=(await sha256Bytes(new TextEncoder().encode(fingerprint))).slice(0,32);
  const payload={requestId,image:await aig4ReadData(front)};
  if(side)payload.sideImage=await aig4ReadData(side);
  const job=await api('/api/aig4/jobs',{method:'POST',
   headers:{'Content-Type':'application/json','X-AIG-Request':'1'},
   body:JSON.stringify(payload)});
  let end=null;
  for(let attempt=0;attempt<180;attempt++){
   end=await api('/api/aig4/jobs/'+job.id);
   if(end.status==='COMPLETE'||end.status==='FAILED')break;
   status4.textContent='AIG 自研幾何補面：'+end.phase+
    '。0 點數；正在計算封閉體積及八角度投影。';
   await new Promise(resolve=>setTimeout(resolve,1000));
  }
  if(!end||end.status!=='COMPLETE')throw Error(end?.lastError||'AIG4_JOB_INCOMPLETE_OR_TIMEOUT');
  if(!end.real3DMeshProduced||!end.artifacts?.['model.glb']?.sha256)
   throw Error('AIG4_TECHNICAL_GLB_NOT_VERIFIED');
  const prefix='/api/aig4/jobs/'+job.id+'/files/';
  aig4Link('下載真 3D 草模 GLB',prefix+'model.glb','AIG-4.0-VOLUME-TECHNICAL-NOT-APPROVED.glb');
  aig4Link('下載比例／信心／來源 SHA 報告',prefix+'scaffold.json','AIG-4.0-SCAFFOLD-NOT-APPROVED.json');
  aig4Link('下載信心圖',prefix+'confidence.png','AIG-4.0-confidence.png');
  // Only validated source-linked 4.0 scaffold may drive 4.1 preview.
  try{await aig41FromScaffold(prefix,frontSHA);}
  catch(error){
   $('aig41-status').textContent='4.1 SDF 預覽仍 BLOCKED：'+error.message+
    '；已通過的 4.0 輸出不受影響。';
  }
  for(const angle of [0,45,90,135,180,225,270,315]){
   const code=String(angle).padStart(3,'0');
   const img=document.createElement('img');
   img.src=prefix+'view-'+code+'.png';
   img.alt=code+'° 自研 3D 草模的推估視角，不是真實背面照片';
   img.style.width='100%';img.style.aspectRatio='3 / 4';img.style.objectFit='contain';
   img.style.border='1px solid #36576b';img.style.borderRadius='5px';
   $('aig4-view-gallery').append(img);
  }
  const preview=document.createElement('button');
  preview.type='button';preview.textContent='在 AIG 3D 工作區載入這份草模（非正式人物）';
  preview.addEventListener('click',async()=>{
   preview.disabled=true;
   try{
    const resp=await fetch(prefix+'model.glb');
    if(!resp.ok)throw Error('AIG4_GLB_DOWNLOAD_FAILED');
    const bytes=await resp.arrayBuffer();
    if(await sha256Bytes(bytes)!==end.artifacts['model.glb'].sha256)
     throw Error('AIG4_GLB_SHA_MISMATCH');
    await load(bytes,true);
    loadedFile='AIG_4_0_VOLUME_DRAFT_'+job.id;
    status.textContent='AIG 4.0 真體積網格草模已載入；四肢、頭頸、髮束、Rig、動畫均未驗收。';
   }catch(err){status4.textContent='GLB 預覽阻擋：'+err.message;}
   finally{preview.disabled=false;}
  });
  $('aig4-downloads').append(preview);
  status4.textContent='4.0 真實三角面 GLB 已產生，平均幾何信心 '+
    (end.confidenceMean*100).toFixed(1)+
    '%（僅啟發式數值，非實測準確率）；8 個補全角度與來源 SHA 已生成。' +
    ' 未知背面／頭頸／髮束／人體拓樸仍 BLOCKED，不能直接發佈成女主角。';
 }catch(error){
  status4.textContent='AIG 4.0 BLOCKED：'+error.message+
   '。若背景複雜，請改用去背的透明 PNG；不使用付費重建備援。';
 }finally{aig4Busy=false;aig4RefreshButton();}
});
$('photo').addEventListener('change',async()=>{
 updateButton();
 const revision=++heroineSourceRevision,file=$('photo').files?.[0];
 heroineSourceMatch=false;
 if(heroinePreviewUrl){URL.revokeObjectURL(heroinePreviewUrl);heroinePreviewUrl=null;}
 $('heroine-source-preview').hidden=true;$('heroine-source-preview').removeAttribute('src');
 if(!file){$('heroine-source-status').textContent='尚未選擇正式女主角照片。';return;}
 $('heroine-source-status').textContent='核對照片實際內容 SHA-256 與 JPEG 像素尺寸中…';
 try{
  const result=await inspectHeroineImage(file,{decodeImage:decodeHeroineImage});
  if(revision!==heroineSourceRevision)return;
  heroineSourceMatch=result.sourceMatched;
  if(result.sourceMatched){
   heroinePreviewUrl=URL.createObjectURL(file);
   $('heroine-source-preview').src=heroinePreviewUrl;
   $('heroine-source-preview').hidden=false;
   $('heroine-source-status').textContent=
    '指定女主角原始 JPEG SHA 與 1152×1536 尺寸匹配。這只是圖片來源驗證，' +
    '下半身未完整入鏡／髮束遮頸仍須在真正 GLB 建模後檢查。' +
    '零點數模式不會呼叫第三方 3D 服務。';
  }else{
   $('heroine-source-status').textContent='這是其他照片或已裁切／重新壓縮檔，' +
    '可另行生成但不能認定為本次指定女主角的唯一正式來源。';
  }
 }catch(err){
  if(revision===heroineSourceRevision)
   $('heroine-source-status').textContent='照片核對失敗：'+err.message+'。不會以副檔名冒充原始內容。';
 }
});
$('prepared-foreground').addEventListener('change',()=>{
 const file=$('prepared-foreground').files?.[0];
 $('prepared-foreground-status').textContent=file
  ?'已選取 '+file.name+'；將在按「生成」時驗證其 JPEG 原圖 SHA、RGBA 透明度與來源色彩。來源與前景未實際驗收，將由伺服器阻擋不合規輸入。'
  :'未選擇前景 PNG；預設使用原始照片。';
});
$('reconstruction-secondary').addEventListener('change',()=>{
 const files=Array.from($('reconstruction-secondary').files||[]);
 $('reconstruction-multiview-status').textContent=files.length>3
  ?'AIG 目前僅允許最多三張輔助角度作來源比對，已阻擋送出。'
  :files.length
   ?'已選擇 '+files.length+' 張輔助角度；AIG 尚未完成這些圖片的相機校正與來源比例比對。'
   :'沒有選輔助角度。使用單張原圖重建。';
 // 自研多視角校正尚未完成；禁止切換至 Meshy。
});
$('subject').addEventListener('change',()=>{$('action').disabled=$('subject').value==='object';});
$('action').addEventListener('change',()=>{});
$('generate').addEventListener('click',async()=>{
 status.textContent='AIG 自研任意照片 3D 核心尚未完成 Gate，禁止外部付費呼叫及假 GLB。';return;
 const file=$('photo').files[0];
 if(!file)return;
 const prepared=$('prepared-foreground').files?.[0]||null;
 const extraFiles=Array.from($('reconstruction-secondary').files||[]);
 if(extraFiles.length>3){
  status.textContent='Meshy 多圖服務最多四張：正面主圖加最多三張補角度。';return;
 }
 if(file.size>20*1024*1024||prepared?.size>20*1024*1024||extraFiles.some(f=>f.size>7*1024*1024)){

  status.textContent='原始照片與前景 PNG 各不得超過 20 MB。';return;
 }
 busy=true;updateButton();status.textContent='正在建立可續接的圖片生成任務…';
 try{
  const sha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer())),v=>v.toString(16).padStart(2,'0')).join('');
  const mode=$('subject').value,actionId=mode==='humanoid'&&$('action').value!==''?Number($('action').value):null;
  let preparedImage=null,preparedHash='NONE';
  const readData=file=>new Promise((resolve,reject)=>{
   const r=new FileReader();r.onload=()=>resolve(r.result);
   r.onerror=()=>reject(Error('來源圖片讀取失敗'));r.readAsDataURL(file);
  });
  if(prepared){
   if(mode!=='humanoid')throw Error('前景草稿只允許人物生成；物件模式請移除草稿。');
   const check=await inspectHeroineImage(file,{decodeImage:decodeHeroineImage});
   if(!check.sourceMatched)throw Error('原圖 SHA 不是指定女主角；前景草稿禁止連結其他來源。');
   if(!prepared.name.toLowerCase().endsWith('.png'))throw Error('前景草稿須是 RGBA PNG');
   preparedHash=await sha256Bytes(await prepared.arrayBuffer());
   preparedImage=await readData(prepared);
   $('prepared-foreground-status').textContent='前景草稿已提交來源比對；伺服器必須再次核對實際 PNG alpha 與每個不透明像素。';
  }
  const serviceId=$('reconstruction-service').value;
  if(!['meshy-image-to-3d','meshy-multi-image-to-3d'].includes(serviceId))
   throw Error('未實際接通的 3D 重建服務不得送出。');
  if(extraFiles.length&&serviceId!=='meshy-multi-image-to-3d')throw Error('多視角圖片需選 Meshy 多圖模式。');
  if(extraFiles.length&&prepared)throw Error('多視角不能與單張前景遮罩混用，請選其一。');
  const extraHashes=[];
  for(const f of extraFiles)extraHashes.push(await sha256Bytes(await f.arrayBuffer()));
  const fingerprint=sha+'|'+mode+'|'+(actionId??'default')+'|'+preparedHash+'|'+serviceId+'|'+extraHashes.join(',');
  const requestId=journal.begin(fingerprint);
  const image=await readData(file);
  const payload={image,requestId,mode,actionId,serviceId,autoStages:true};
  if(preparedImage)payload.preparedImage=preparedImage;
  if(extraFiles.length)payload.additionalImages=await Promise.all(extraFiles.map(readData));
  const d=await api('/api/reconstruction/jobs',{method:'POST',headers:{'Content-Type':'application/json','X-AIG-Request':'1'},body:JSON.stringify(payload)});
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
$('audio-volume').addEventListener('input',()=>{
 $('audio-volume-value').textContent=$('audio-volume').value+'%';
 refreshStoryAudioEvidence();
});
for(const id of ['voice-enabled','sfx-enabled','music-enabled','music-mood'])
 $(''+id).addEventListener('change',refreshStoryAudioEvidence);
$('dialogue-style').addEventListener('change',()=>$('story-build').click());
$('cloud-dialogue').addEventListener('click',async()=>{
 if(cloudBusy||!dialogueCloudConfigured)return;
 if(view?.animation?.story?.playing){
  $('cloud-dialogue-status').textContent='劇情正在播放，請先停止動畫再改寫台詞，避免台詞與聲音時序不一致。';
  return;
 }
 if(!storyParsed?.beats?.length)$('story-build').click();
 if(!storyParsed?.beats?.length)return;
 cloudBusy=true;$('cloud-dialogue').disabled=true;
 const rev=storyRevision,script=storyParsed.originalText,style=storyDialogue?.style||'witty';
 $('cloud-dialogue-status').textContent='雲端 AI 台詞請求已由使用者主動啟動。只傳送劇情與動作 IDs，不傳 GLB 或照片。';
 try{
  const result=await api('/api/story/dialogue',{
   method:'POST',headers:{'Content-Type':'application/json','X-AIG-Request':'1'},
   body:JSON.stringify({story:script,style,beats:storyParsed.beats.map(x=>({index:x.index,actionId:x.actionId}))})
  });
  if(rev!==storyRevision||!storyParsed||storyParsed.originalText!==script||storyDialogue?.style!==style)
   throw Error('AI_DIALOGUE_STORY_CHANGED_DISCARDED');
  if(result.source!=='CLOUD_LLM_PROVIDER_OUTPUT'||result.lines?.length!==storyDialogue.cues.length)
   throw Error('AI_DIALOGUE_RESPONSE_INVALID');
  const ordered=result.lines.map((line,i)=>{
   if(line.beat!==i||typeof line.text!=='string'||!line.text.trim()||line.text.length>240)
    throw Error('AI_DIALOGUE_LINE_INVALID');
   return {...storyDialogue.cues[i],text:line.text.trim(),edited:false,origin:'CLOUD_LLM_PROVIDER_OUTPUT'};
  });
  storyDialogue={...storyDialogue,cues:ordered,generatedByCloudLLM:true,provider:'OpenAI',model:result.model};
  if(storyPlan?.ready)storyPlan=annotateDialoguePlan(storyPlan,storyDialogue);
  clearGeneratedTts('AI 已改寫劇情台詞，舊音檔已隔離。');
  renderDialogueEditor();exportStoryEvidence();
  $('cloud-dialogue-status').textContent='真正雲端 AI 台詞已產生，共 '+ordered.length+
    ' 段；提供者 '+result.provider+'，模型 '+result.model+
    '。可逐句編輯。沒有憑空生成 GLB 動作或影片。';
 }catch(e){
  $('cloud-dialogue-status').textContent='雲端 AI 台詞未完成：'+e.message+
   '；保留本機台詞。不自動重送，避免重複計費。';
 }finally{cloudBusy=false;$('cloud-dialogue').disabled=!dialogueCloudConfigured;}
});

$('ai-tts-voice').addEventListener('change',()=>clearGeneratedTts('聲線已改變，請重新產生 WAV。'));
$('ai-tts-generate').addEventListener('click',async()=>{
 if(ttsBusy||movieUI?.isBusy||!speechAIConfigured)return;
 if(!storyPlan?.ready||!sourceSha||!view?.model){
  $('ai-tts-status').textContent='BLOCKED：尚未取得真 GLB 動作來源。';return;
 }
 if($('movie-voice-file').files?.length||$('movie-voice-lines').files?.length){
  $('ai-tts-status').textContent='請先清除手動選擇的配音檔，再產生 AI 聲音，避免混用。';return;
 }
 const revision=storyRevision;
 const signature=()=>storyPlan?.timeline?.map(p=>[p.beat,p.clipName,p.seconds,p.dialogue].join('|')).join('~')+'|'+sourceSha;
 const snapshot=signature();
 ttsBusy=true;const generation=++ttsGeneration;
 $('ai-tts-generate').disabled=true;$('movie-record').disabled=true;
 $('ai-tts-status').textContent='逐句產生真正 AI WAV，每句可能計費，不自動重試。';
 let decoder=null;
 try{
  const Ctx=window.AudioContext||window.webkitAudioContext;
  if(!Ctx)throw Error('TTS_BROWSER_DECODER_UNAVAILABLE');
  decoder=new Ctx();
  const output=await generateVoiceBatch(storyPlan,{
   voice:$('ai-tts-voice').value,
   post:async payload=>{
    const r=await fetch('/api/story/voice',{method:'POST',
     headers:{'Content-Type':'application/json','X-AIG-Request':'1'},
     body:JSON.stringify(payload)});
    if(!r.ok){
     let detail='TTS_HTTP_'+r.status;
     try{detail=(await r.json()).error||detail;}catch{}
     throw Error(detail);
    }
    if(!(r.headers.get('content-type')||'').startsWith('audio/wav'))throw Error('TTS_RESPONSE_NOT_WAV');
    return r.arrayBuffer();
   },
   decode:async bytes=>(await decoder.decodeAudioData(bytes)).duration,
   makeFile:(bytes,name)=>new File([bytes],name,{type:'audio/wav'}),
   stillCurrent:()=>generation===ttsGeneration&&revision===storyRevision&&signature()===snapshot,
   onProgress:({position,total,status})=>{
    if(generation===ttsGeneration)$('ai-tts-status').textContent='第 '+(position+1)+'/'+total+
     ' 句：'+(status==='READY'?'真 WAV 已收到':'正在生成（可能計費）');
   }
  });
  if(generation!==ttsGeneration||revision!==storyRevision||signature()!==snapshot)
   throw Error('TTS_STORY_CHANGED_DISCARDED');
  for(const u of ttsDownloadUrls)URL.revokeObjectURL(u);
  ttsDownloadUrls=[];ttsFiles=output.files;$('ai-tts-downloads').replaceChildren();
  for(const file of ttsFiles){
   const url=URL.createObjectURL(file);ttsDownloadUrls.push(url);
   const link=document.createElement('a');link.href=url;link.download=file.name;
   link.className='download';link.textContent='下載 '+file.name;
   $('ai-tts-downloads').append(link);
  }
  $('ai-tts-status').textContent='已產生 '+ttsFiles.length+
   ' 句真實 WAV（'+TTS_VERSION+'）；已對照真 GLB 動作秒數，可錄進 1080p 影片。未驗證音素級口型。';
 }catch(err){
  $('ai-tts-status').textContent='沒有完成整組配音：'+err.message+
   '。失敗時保留之前完整結果，不自動重送；已送出的請求可能計費。';
 }finally{
  try{await decoder?.close();}catch{}
  ttsBusy=false;refreshTtsButton();movieUI?.refresh();
 }
});
$('story-text').addEventListener('input',()=>clearStoryPlan('劇情已修改；請重新解析並檢查真實動作清單。'));
$('story-build').addEventListener('click',()=>{
 clearStoryPlan('解析劇情中……');
 try{
  const story=parseStory($('story-text').value);
  const clips=view?.animation?.clips||[];
  const plan=resolveStoryClips(story,clips);
  storyParsed=story;
  storyDialogue=composeDialogue(story,{style:$('dialogue-style').value});
  storyPlan=plan.ready?annotateDialoguePlan(plan,storyDialogue):plan;
  storyBeatsVisible(storyPlan);renderDialogueEditor();
  const blockers=plan.blocking.map(x=>x.reason);
  const coverage=plan.timeline.length+'/'+plan.inputBeats;
  $('story-status').textContent=plan.ready&&sourceSha
   ?'真 GLB 動作已全部對應：'+coverage+' 段，共 '+plan.seconds.toFixed(2)+
     ' 秒。按播放即可在原本 3D 人物上依時間軸播放；沒有生成新骨架或 MP4。'
   :'劇情已辨識 '+plan.inputBeats+' 個動作，配對 '+coverage+'。缺口：'+
     ([...new Set(blockers)].join('、')||'尚未載入有動畫的正式 GLB 與來源 SHA')+
     '。請匯入缺少的相容動作片段後重試；不以照片晃動充數。';
  $('story-play').disabled=!(plan.ready&&sourceSha&&view?.model);
  movieUI?.refresh();refreshTtsButton();
  exportStoryEvidence();
 }catch(e){clearStoryPlan('劇情解析 BLOCKED：'+e.message);}
});
$('dialogue-preview').addEventListener('click',()=>{
 if(!storyDialogue?.cues.length){
  $('story-build').click();
 }
 const cue=storyDialogue?.cues?.[0];
 if(!cue){$('story-audio-status').textContent='沒有可試聽的台詞。';return;}
 try{
  storySound.configure({...soundOptions(),music:false});
  storySound.start();
  showSubtitle(cue.speaker+'：'+cue.text);
  storySound.previewDialogue(cue.text,cue.actionId);
  $('story-audio-status').textContent='試聽第一句：'+cue.text+
    (storySound.voiceAvailable?'（瀏覽器語音）':'（本機無繁中語音，僅顯示字幕／音效）');
 }catch(e){$('story-audio-status').textContent='試聽失敗：'+e.message+'；字幕保留。';}
});
$('story-play').addEventListener('click',()=>{
 if(!storyPlan?.ready||!view?.model||!sourceSha){
  $('story-status').textContent='動畫播放 BLOCKED：缺少模型或真 GLB 動作，不能假動畫。';return;
 }
 if(view.reviewBusy||view.actionImportBusy){$('story-status').textContent='驗收／匯入進行中，不能同時播放劇情。';return;}
 try{
  storySound.configure(soundOptions());
  storySound.start();
  view.onFrame=(dt)=>{
   if(view?.animation?.story?.playing&&!view.animation.paused)storySound.tick(dt);
  };
  view.animation.startStory(storyPlan,{
   onStep:({position,beat,total})=>{
    showSubtitle(beat.dialogue);
    storySound.step(beat);
    $('story-status').textContent='真 3D 劇情播放 '+(position+1)+'/'+total+'：'+beat.label+
      '（'+beat.clipName+'，'+beat.seconds.toFixed(2)+'秒）。';
    [...$('story-timeline').children].forEach(x=>{x.style.borderColor=x.dataset.storyBeat===String(beat.beat)?'#73dfea':'#26455a';});
   },
   onFinish:()=>{
    storySound.stop();clearSubtitle();
    $('story-status').textContent='劇情真實 GLB 動作與本機對白／音效已播放完畢；目前不是已輸出的 MP4，也不是打鬥安全驗收。';
    $('story-stop').disabled=true;$('story-play').disabled=false;
    $('clip').disabled=false;$('pause').textContent='繼續動畫';
   }
  });
  $('story-stop').disabled=false;$('story-play').disabled=true;
  $('clip').disabled=true;$('pause').textContent='暫停動畫';
 }catch(e){
  storySound.stop();clearSubtitle();
  $('story-status').textContent='劇情播放 BLOCKED：'+e.message+'，原人物資料保留。';
 }
});
$('story-stop').addEventListener('click',()=>{
 if(!view?.animation)return;
 view.animation.stopStory();view.animation.mixer.stopAllAction();view.animation.paused=true;
 storySound.stop();clearSubtitle();
 $('story-stop').disabled=true;$('story-play').disabled=!storyPlan?.ready;
 $('clip').disabled=!view.animation.clips?.length;
 $('pause').textContent='繼續動畫';
 $('story-status').textContent='已停止劇情動畫。原始 GLB、骨架、動作片段仍保留。';
});
$('timeline-capture').addEventListener('click',async()=>{
 if(!sourceSha||!view?.model||!view.animation?.clips?.[view.animation.index]){
  $('timeline-status').textContent='缺少 GLB SHA 或真實動畫片段，不能產生 16 格驗收畫面。';return;
 }
 $('timeline-capture').disabled=true;$('review-capture').disabled=true;
 clearTimelineEvidence();
 $('timeline-status').textContent='開始從真實 GLB 動畫擷取；0／25／50／75% × 四方向。';
 try{
  const startedSha=sourceSha;
  const result=await view.captureTimelineReview({onProgress:p=>{
   $('timeline-status').textContent='實際姿態已擷取 '+p.capturedPoses+'/'+p.targetPoses+
     '，畫面 '+p.frames+'/16。來源模型與動畫不修改。';
  }});
  if(sourceSha!==startedSha)throw Error('TIMELINE_SOURCE_CHANGED');
  const manifest=timelineEvidenceManifest({sourceSha256:sourceSha,
    actionSha256:actionShaByClipIndex.get(view.animation.index)||sourceSha,
    clipName:result.clipName,samples:result.samples});
  const png=URL.createObjectURL(result.image);
  const json=URL.createObjectURL(new Blob([JSON.stringify(manifest,null,2)],{type:'application/json'}));
  timelineObjectUrls.push(png,json);
  $('timeline-image').src=png;$('timeline-image').hidden=false;
  for(const link of [
   {url:png,text:'下載真正動畫的 16 格檢查圖 PNG',file:'AIG-FastModel-3-0-GLB-Timeline-16-Frames.png'},
   {url:json,text:'下載 SHA／逐段皮膚異常 JSON',file:'AIG-FastModel-3-0-Animate-QA-BLOCKED.json'}
  ]){
   const a=document.createElement('a');a.className='download';a.href=link.url;
   a.download=link.file;a.textContent=link.text;$('timeline-downloads').append(a);
  }
  const risky=manifest.rows.filter(row=>
    row.duplicateSurfacePairs>0||row.collapsedTriangles>0||row.badRigWeights>0);
  $('timeline-status').textContent='實際動畫片段「'+manifest.selectedClipName+'」已擷取 16 格。'+
   '可疑姿態 '+risky.length+'/4；SHA-256 '+sourceSha.slice(0,16)+'…。'+
   '結果只涵蓋四個取樣時間，不能確認女主角已修復、全段無穿模或片段包含打鬥。';
 }catch(e){
  clearTimelineEvidence();
  $('timeline-status').textContent='全段 16 格檢查 BLOCKED：'+e.message+
   '。先前圖片已清空，避免將失敗或不同來源的圖片當成正式通過。';
 }finally{
  $('timeline-capture').disabled=!sourceSha||!view?.animation?.clips?.length;
  $('review-capture').disabled=!sourceSha;
 }
});
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
$('clip').addEventListener('change',()=>{
 if(view?.reviewBusy){
  $('timeline-status').textContent='16 格擷取正在使用原動畫片段；不得中途切換片段。';
  if(view.animation?.index!==null)$('clip').value=String(view.animation.index);
  return;
 }
 try{
  view.animation.select(Number($('clip').value));
  clearReviewEvidence();clearTimelineEvidence();clearStoryPlan('手動切換動作後，請重新解析劇情。');
  $('timeline-status').textContent='已切換真實 GLB 動畫片段；舊的四方向與 16 格圖片失效，請重新擷取。';
 }catch(e){status.textContent='片段未切換：'+e.message;}
});
$('pause').addEventListener('click',()=>{if(movieUI?.isBusy)return;if(!view?.animation)return;view.animation.paused=!view.animation.paused;if(view.animation.story?.playing){if(view.animation.paused)storySound.pause();else storySound.resume();}$('pause').textContent=view.animation.paused?'繼續動畫':'暫停動畫';});
movieUI=new MovieWorkspace({
 document,getContext:()=>({
  plan:storyPlan,sourceSha,view,sound:storySound,sourceName:loadedFile,
  dialogueOrigin:storyDialogue?.provider||'OFFLINE_TEMPLATE',
  soundOptions,dialogueCloudConfigured,generatedVoiceFiles:ttsFiles,ttsBusy
 }),showSubtitle,clearSubtitle
});
if(window.AIG_OFFLINE){
 $('generation').hidden=true;$('stages').hidden=true;status.textContent='本機離線播放 · 原始 GLB 與 PBR 材質保留；造型與實機效能尚未正式驗收。';
 const bytes=Uint8Array.from(atob(window.AIG_OFFLINE.glb),c=>c.charCodeAt(0));
 const url=URL.createObjectURL(new Blob([bytes],{type:'model/gltf-binary'}));addLink('下載 GLB',url,'AIG-animated.glb');
 load(bytes.buffer,window.AIG_OFFLINE.orbit).catch(e=>{status.textContent='預覽未完成：'+e.message;});
}else{
 api('/api/config').then(async c=>{
  ready=false;status.textContent='AIG 自研：零點數、無第三方付費呼叫。現有 GLB 可匯入／播放／檢查；任意照片自動完整 3D 尚未完成。';updateButton();
  api('/api/reconstruction/services').then(config=>{
   const connected=[]; // Third-party providers explicitly unavailable in native zero-credit mode.
   $('reconstruction-service').disabled=!connected.length;
   for(const option of $('reconstruction-service').options){
    option.disabled=!(config.providers||[]).some(p=>p.id===option.value&&p.modelServiceIsReal&&p.configured);
   }
   $('reconstruction-service-status').textContent='AIG 自研專用，第三方生成已停用且不扣點數。任意照片完整 3D 重建尚未通過驗收；可匯入真正的 GLB。';
  }).catch(err=>{
   $('reconstruction-service').disabled=true;
   $('reconstruction-service-status').textContent='重建服務查詢失敗：'+err.message;
  });
  dialogueCloudConfigured=!!c.dialogueAIConfigured;
  speechAIConfigured=!!c.speechAIConfigured;refreshTtsButton();
  $('ai-tts-status').textContent=speechAIConfigured
   ?'AI 語音服務已連接；只在主動點擊生成時送出台詞，可能計費。'
   :'AI 語音尚未連線，仍可手動匯入 WAV／MP3。';
  $('cloud-dialogue').disabled=!dialogueCloudConfigured;
  $('cloud-dialogue-status').textContent=dialogueCloudConfigured
   ?'已連接可選雲端 AI 台詞服務。只有主動點擊才傳送劇情與動作 IDs；可能計費，人物 GLB／照片不傳送。'
   :'雲端 AI 尚未連接。仍可使用本機台詞、系統朗讀、原創合成音效與配樂。';
  if(ready)api('/api/actions').then(actions=>{for(const a of actions){const o=document.createElement('option');o.value=String(a.action_id);o.textContent=a.name;$('action').append(o);}}).catch(()=>{});
  const pending=journal.pending().at(-1);
  if(pending){
   try{const d=await api('/api/requests/'+pending.requestId);journal.accept(pending.fingerprint,d.id);follow(d.id);}
   catch(e){status.textContent='前一筆送出尚未取得回覆；重新選擇相同照片與選項，會沿用已保存的請求編號。';}
  }else{const job=localStorage.getItem('aig-photo-job');if(job)follow(job);}
 }).catch(e=>{status.textContent='本機服務未啟動：'+errorText(e.message);});
}
