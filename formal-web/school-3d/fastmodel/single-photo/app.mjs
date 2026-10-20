import {PhotoViewer} from './viewer.mjs';
import {SubmissionJournal} from './submission.mjs';
import {reviewEvidenceManifest} from './heroine-review.mjs';
import {timelineEvidenceManifest} from './timeline-review.mjs';
import {parseStory,resolveStoryClips,STORY_PIPELINE_VERSION} from './story-to-animation.mjs';
import {composeDialogue,updateDialogueCue,annotateDialoguePlan,DIALOGUE_VERSION} from './story-dialogue.mjs';
import {StoryAudio,AUDIO_CUE_VERSION} from './story-audio.mjs';
import {MovieWorkspace} from './movie-ui.mjs';
const $=id=>document.getElementById(id),status=$('status');
let view=null,loadedFile='',ready=false,busy=false,skinReportUrl=null,sourceSha=null;
const reviewObjectUrls=[],timelineObjectUrls=[],importedActionHashes=new Set(),actionShaByClipIndex=new Map();
let storyPlan=null,storyOutputUrl=null,storyDialogue=null,storyParsed=null,storyRevision=0,cloudBusy=false,dialogueCloudConfigured=false,movieUI=null;
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
  renderDialogueEditor();exportStoryEvidence();
  $('cloud-dialogue-status').textContent='真正雲端 AI 台詞已產生，共 '+ordered.length+
    ' 段；提供者 '+result.provider+'，模型 '+result.model+
    '。可逐句編輯。沒有憑空生成 GLB 動作或影片。';
 }catch(e){
  $('cloud-dialogue-status').textContent='雲端 AI 台詞未完成：'+e.message+
   '；保留本機台詞。不自動重送，避免重複計費。';
 }finally{cloudBusy=false;$('cloud-dialogue').disabled=!dialogueCloudConfigured;}
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
  movieUI?.refresh();
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
  soundOptions,dialogueCloudConfigured
 }),showSubtitle,clearSubtitle
});
if(window.AIG_OFFLINE){
 $('generation').hidden=true;$('stages').hidden=true;status.textContent='本機離線播放 · 原始 GLB 與 PBR 材質保留；造型與實機效能尚未正式驗收。';
 const bytes=Uint8Array.from(atob(window.AIG_OFFLINE.glb),c=>c.charCodeAt(0));
 const url=URL.createObjectURL(new Blob([bytes],{type:'model/gltf-binary'}));addLink('下載 GLB',url,'AIG-animated.glb');
 load(bytes.buffer,window.AIG_OFFLINE.orbit).catch(e=>{status.textContent='預覽未完成：'+e.message;});
}else{
 api('/api/config').then(async c=>{
  ready=c.configured;status.textContent=ready?'重建服務已連接；選圖後按一次生成。':'重建服務未連接；請先在主機設定服務帳戶。';updateButton();
  dialogueCloudConfigured=!!c.dialogueAIConfigured;
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
