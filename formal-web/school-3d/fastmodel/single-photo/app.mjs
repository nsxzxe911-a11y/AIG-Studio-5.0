import {PhotoViewer,parseRiggedGLB} from './viewer.mjs';
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
import {AIG48_SCHEMA,buildAIG48Draft,exportAIG48GLB,auditAIG48Poses} from './aig-skin-motion-4-8.mjs';
import {AIG49_SCHEMA,auditAIG49DynamicContacts} from './aig-dynamic-collision-4-9.mjs';
import {AIG50_SCHEMA,auditAIG50FullBody} from './aig-fullbody-5-0.mjs';
import {AIG51_SCHEMA,auditAIG51PosedSeamsAndHair} from './aig-seam-contact-5-1.mjs';
import {AIG52_SCHEMA,Aig52FrameEvidence} from './aig-runtime-evidence-5-2.mjs';
import {AIG53_SCHEMA,compileAIG53Evidence} from './aig-unified-gate-5-3.mjs';
import {AIG54_SCHEMA,verifyAIG54NativeChain} from './aig-native-source-5-4.mjs';
import {AIG55_SCHEMA,generateAIG55NativeHumanoid} from './aig-native-humanoid-5-5.mjs';
import {AIG56_SCHEMA,generateAIG56NativeHumanoid} from './aig-native-body-5-6.mjs';
import {AIG57_SCHEMA,generateAIG57SchoolHeroineTechnical} from './aig-native-appearance-5-7.mjs';
import {AIG58_SCHEMA,generateAIG58FittedTechnical,auditAIG58RealPoseContacts} from './aig-appearance-fit-5-8.mjs';
import {AIG59_SCHEMA,runAIG59BoundedAutoFit} from './aig-auto-fit-5-9.mjs';
import {AIG60_SCHEMA,AIG60_MARKS,calibrateAIG60FaceMarks,fitAIG60MeasuredFaceGLB,auditAIG60DenseAnimation} from './aig-face-alignment-6-0.mjs';
import {AIG61_SCHEMA,proposeAIG61LocalLandmarks,acceptAIG61ReviewedProposal} from './aig-face-scan-assist-6-1.mjs';
import {AIG62_SCHEMA,AIG62_REFERENCES,verifyAIG62ReferenceFile} from './aig-school-visual-6-2.mjs';
import {AIG63_SCHEMA,compareAIG63ActualImages,auditAIG63SchoolModelActualGLTF,bindAIG63Evidence} from './aig-visual-compare-6-3.mjs';
import {AIG64_AUTOBODY_SCHEMA,analyzeAIG64PartialPortrait,generateAIG64SinglePartialFullbody} from './aig-single-photo-autobody-6-4.mjs';
import {inspectAigSourceObservation,AIG_SOURCE_OBSERVATION_SCHEMA} from './aig-source-observation-6-12.mjs';
import {upgradeAig64FullBodyMotion,auditAig61FullBodyLimbMotion} from './aig-fullbody-motion-6-11.mjs';
import {AIG65_SCHEMA,planAIG65AutoAnimation,publicAIG65Plan} from './aig-auto-animation-6-5.mjs';
import {AIG65_CAPTURE_SCHEMA,prepareAIG65Layers,drawAIG65CanvasFrame,AIG65CanvasRecorder} from './aig-canvas-movie-6-5.mjs';
import {AIG66_SCHEMA,createAIG66Portrait} from './aig-portrait-6-6.mjs';
import {AIG67_SCHEMA,detectAIG67BrowserFace,decodeAIG67PCM16Wav,sampleAIG67AudioMouth,buildAIG67AudioBuffer} from './aig-portrait-audio-6-7.mjs';
import {AIG68_SCHEMA,AIG68FramePacing,probeAIG68EncodedPlayback} from './aig-video-evidence-6-8.mjs';
import {initAIGUnifiedShell} from './aig-unified-shell-6-9.mjs';
import {bindFastModelLiveControls} from './aig-live-control-manifest.mjs';
import {normalizeAIG693AutoInputs} from './aig-auto-inputs-6-9.mjs';
const $=id=>document.getElementById(id),status=$('status');
let view=null,loadedFile='',ready=false,busy=false,skinReportUrl=null,sourceSha=null;
let aigUnifiedShell=null,aigTechnicalModelUnapproved=false;
const reviewObjectUrls=[],timelineObjectUrls=[],importedActionHashes=new Set(),actionShaByClipIndex=new Map();
let storyPlan=null,storyOutputUrl=null,storyDialogue=null,storyParsed=null,storyRevision=0,cloudBusy=false,dialogueCloudConfigured=false,movieUI=null;
let speechAIConfigured=false,ttsBusy=false,ttsGeneration=0,ttsFiles=[],ttsDownloadUrls=[];
let heroineSourceRevision=0,heroinePreviewUrl=null,heroineEvidenceUrl=null,heroineSourceMatch=false;
let aig53ImageAdmission=null,aig53HeroineSourceChain=null,aig53Report=null;
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
 aig53HeroineSourceChain=result;aig53Invalidate('正式人物 GLB 來源鏈已更新，5.3 原驗收表失效。');
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
async function load(bytes,orbit,{technical=false}={}){
 if(!view)return;
 aig53Invalidate('3D 播放器模型已切換，5.3 須重新整合相同來源 SHA 的證據。');
 saveHeroineEvidence(evaluateHeroineJob({}));
 const clips=await view.load(bytes,{orbit});$('clip').replaceChildren();
 // Real GLB parsing does not prove the original photo's face or skin quality.
 // Technical rigs must not be displayed as a finished heroine by default.
 aigTechnicalModelUnapproved=technical===true;
 aigUnifiedShell?.setModelEvidence(technical?'technical':'imported');
 clearReviewEvidence();clearTimelineEvidence();clearStoryPlan('新人物已載入，請重新解析劇情。');
 importedActionHashes.clear();actionShaByClipIndex.clear();
 $('action-glb').disabled=false;
 $('action-import-status').textContent='已載入人物 GLB。可選擇另一個骨架相符、含真實動畫的外部 GLB（不會將來源網格重疊渲染）。';
 sourceSha=null;
 try{sourceSha=await sha256Bytes(bytes);}catch(e){$('review-status').textContent='GLB 已載入，但 SHA-256 無法取得：'+e.message+'。證據匯出 BLOCKED。';}
 // A new actual GLB invalidates 6.3 render evidence, but preserves the
 // independently verified 2D user crop for an easy second model comparison.
 ++aig63Revision;aig63Report=null;aig63PNG=null;aig63ModelSHA=null;
 aig63Compare.hidden=true;aig63Refresh();
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
let aig48Draft=null,aig48QA=null,aig48Busy=false;
let aig49Audit=null,aig49Rig=null,aig49Busy=false,aig49Epoch=0;
function aig49Reset(message='4.9 技術骨架來源已變更，舊碰撞採樣不可再使用。'){
 aig49Epoch++;aig49Audit=null;aig49Rig=null;
 for(const id of ['aig49-load','aig49-evidence'])$(id).disabled=true;
 $('aig49-audit').disabled=aig49Busy||!aig48Draft||!aig48QA;
 $('aig49-status').textContent=message;
}
function aig48Reset(message='4.8 來源或 4.7 網格已變更；請重新產生骨架動畫。'){
 aig48Draft=null;aig48QA=null;
 aig49Reset('4.8 來源失效；4.9 已清除舊動態三角碰撞報告。');
 $('aig48-download').disabled=true;$('aig48-evidence').disabled=true;
 $('aig48-build').disabled=aig48Busy||!aig47Draft;
 $('aig48-status').textContent=message;
}
function aig47Reset(message='4.7 來源或馬尾參數已變更；請重新建立共享頂點技術網格。'){
 aig47Draft=null;
  aig48Reset();
 aig48Reset('4.7 來源失效，4.8 先前技術骨架／動作證據已隔離。');
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
  aig48Reset('4.7 已建立。可產生 4.8 真骨架技術動畫。');
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

$('aig48-build').addEventListener('click',async()=>{
 if(aig48Busy||!aig47Draft)return;
 const source=aig47Draft;
 aig48Busy=true;aig48Reset('4.8 正在回讀真正 GLB 骨架並逐姿態驗證；不代表已還原真人。');
 try{
  const rig=buildAIG48Draft(source);
  const qa=await auditAIG48Poses(rig);
  if(aig47Draft!==source)return; // Never certify stale source.
  if(qa.sampledClips.length!==3||!qa.glbRoundtrip||qa.minSampledTriangleArea<=1e-10)
   throw Error('AIG48_SAMPLED_POSE_GATE');
  aig48Draft=rig;aig48QA=qa;
  aig49Reset('4.8 骨架動畫來源已驗證。可執行 4.9 動態三角面接觸掃描。');
  $('aig48-download').disabled=false;$('aig48-evidence').disabled=false;
  $('aig48-status').textContent='真技術骨架 5 節點／2 個 SkinnedMesh／3 個動畫：'+
   qa.sampledClips.map(x=>x.clip+' '+x.maxVertexDisplacement.toFixed(4)).join('／')+
   '。已測試 15 個姿態，最小三角面積 '+qa.minSampledTriangleArea.toExponential(2)+
   '。真實臉型、髮束三角碰撞、完整人體及 Android／Windows 60 FPS 仍 BLOCKED。';
 }catch(error){
  if(aig47Draft===source)aig48Reset('4.8 Rig QA BLOCKED：'+error.message+'；4.7 GLB、劇情與影片功能不變。');
 }finally{
  aig48Busy=false;$('aig48-build').disabled=!aig47Draft;
 }
});

$('aig49-audit').addEventListener('click',async()=>{
 if(aig49Busy||!aig48Draft||!aig48QA||movieUI?.isBusy)return;
 const rig=aig48Draft,epoch=++aig49Epoch;
 aig49Audit=null;aig49Rig=null;aig49Busy=true;
 for(const id of ['aig49-audit','aig49-load','aig49-evidence'])$(id).disabled=true;
 $('aig49-status').textContent='從真骨架 GLB 取出 15 個姿態的頭頸／馬尾三角面，進行有預算上限的碰撞計算。';
 try{
  const report=await auditAIG49DynamicContacts(rig);
  if(aig48Draft!==rig||aig49Epoch!==epoch)return;
  if(report.posesChecked!==15||report.testedFacePairs<1)throw Error('AIG49_INCOMPLETE_POSE_AUDIT');
  aig49Audit=report;aig49Rig=rig;
  $('aig49-evidence').disabled=false;$('aig49-load').disabled=!view;
  $('aig49-status').textContent='4.9 已從真 GLB 採樣 '+report.posesChecked+
   ' 個姿態，實際檢查 '+report.testedFacePairs+' 組三角面，接觸／相交 '+report.confirmedSurfaceContactPairs+
   ' 組。'+(report.confirmedSurfaceContactPairs>0?
    '檢測到頭頸／馬尾交疊風險：正式角色仍 BLOCKED；先調整 4.6 馬尾，再重新產生 4.7～4.9。':
    '取樣時刻未發現三角面相交，但無法證明兩幀之間不穿模、髮絲沒有碰撞或正式人物可發佈。')+
   ' 可下載有來源 SHA 的報告，或載入技術 GLB 試播劇情／配音／錄影。';
 }catch(error){
  if(aig48Draft===rig&&aig49Epoch===epoch)
   aig49Reset('4.9 真三角面掃描 BLOCKED：'+error.message+'。原 4.8 GLB、來源照片及影片功能不變。');
 }finally{
  aig49Busy=false;
  $('aig49-audit').disabled=!aig48Draft||!aig48QA;
 }
});
$('aig49-evidence').addEventListener('click',()=>{
 if(!aig49Audit||aig49Rig!==aig48Draft)return;
 aig47Download(JSON.stringify(aig49Audit,null,2),
  'AIG-4.9-15-real-skinned-poses-INTERSECTION-QA-NOT-RELEASE.json','application/json');
});
$('aig49-load').addEventListener('click',async()=>{
 if(!aig49Audit||aig49Rig!==aig48Draft||!view||movieUI?.isBusy)return;
 const rig=aig49Rig,epoch=aig49Epoch,report=aig49Audit;
 $('aig49-load').disabled=true;
 try{
  const glb=exportAIG48GLB(rig);
  if(!glb.bytes?.length||report.posesChecked!==15)throw Error('AIG49_UNVERIFIED_TECHNICAL_GLB');
  await load(glb.bytes.buffer,false,{technical:true});
  if(aig49Epoch!==epoch||aig49Rig!==rig)throw Error('AIG49_SOURCE_CHANGED_DURING_LOAD');
  $('aig49-status').textContent='4.9 技術 GLB 已載入可旋轉動畫工作區；轉頭、低頭、甩馬尾可由劇本文字匹配實際 Clip。'+
   '可沿用台詞／音效／音樂／1080p 錄影操作，但錄製仍由使用者啟動。'+
   (report.confirmedSurfaceContactPairs?'注意：仍有 '+report.confirmedSurfaceContactPairs+' 組碰撞風險。':'')+
   '這仍不是完整人體、真實女主角或正式影片驗收。';
 }catch(error){
  $('aig49-status').textContent='4.9 技術 GLB 預覽未完成：'+error.message+'；可保留檢測 JSON 與原 4.8 GLB。';
 }finally{
  $('aig49-load').disabled=!aig49Audit||aig49Rig!==aig48Draft||!view;
 }
});

$('aig48-download').addEventListener('click',()=>{
 if(!aig48Draft||!aig48QA)return;
 try{
  aig47Download(exportAIG48GLB(aig48Draft).bytes,
   'AIG-4.8-skinned-motion-TECHNICAL-NOT-HEROINE.glb','model/gltf-binary');
 }catch(error){$('aig48-status').textContent='4.8 GLB BLOCKED：'+error.message;}
});
$('aig48-evidence').addEventListener('click',()=>{
 if(!aig48Draft||!aig48QA)return;
 const report={...aig48QA,skinBones:aig48Draft.boneNames,
  inputHeadNeckTriangleCount:aig48Draft.sourceTopology[0].triangleCount,
  headNeckOneIndexedConnectedSurface:true,sourcePonytailClearance:aig48Draft.sourceHairClearance,
  original4_7AndOlderOutputsRetained:true,thirdPartyInferenceUsed:false,creditsSpent:0};
 aig47Download(JSON.stringify(report,null,2),'AIG-4.8-bone-pose-risk-NOT-HEROINE.json','application/json');
});


// 5.0 isolated source-hashed full-body inspection. No mutation of existing runtime or character GLB.
let aig50Report=null,aig50Parsed=null,aig50Revision=0,aig50Busy=false;
let aig51Report=null,aig51Busy=false;

let aig52Report=null,aig52VisualReport=null,aig52Busy=false,aig52Monitor=null;
function aig52Invalidate(message='5.2 GLB 已變更，舊畫面與 FPS 結果失效。'){
 aig53Invalidate('5.2 證據來源已變更，5.3 驗收報告已失效。');
 if(view)view.onFrameMeasured=null;
 aig52Monitor=null;aig52Report=null;aig52VisualReport=null;
 for(const id of ['aig52-fps','aig52-visual','aig52-fps-report','aig52-visual-report'])$(id).disabled=true;
 $('aig52-load').disabled=aig52Busy||aig50Report?.outcome!=='STRUCTURAL_QA_PASS_ONLY';
 $('aig52-status').textContent=message;
}
function aig52RefreshAvailable(){
 const ready=!!view?.model&&!!view?.animation?.clips?.length&&
  sourceSha===aig50Report?.sourceSHA256&&!!aig50Parsed;
 $('aig52-fps').disabled=!ready||!!aig52Monitor||aig52Busy;
 $('aig52-visual').disabled=!ready||!!aig52Monitor||aig52Busy;
 return ready;
}

function aig51Reset(message='5.1 來源或 5.0 驗證結果變更；舊穿模報告已隔離。'){
 aig53Invalidate('5.1 或上游來源變更，5.3 驗收報告已失效。');
 aig51Report=null;$('aig51-report').disabled=true;
 $('aig51-run').disabled=aig51Busy||!aig50Parsed||aig50Report?.outcome!=='STRUCTURAL_QA_PASS_ONLY';
 $('aig51-status').textContent=message;
}
$('aig50-input').addEventListener('change',()=>{
 aig50Revision++;aig50Report=null;$('aig50-report').disabled=true;
 aig50Parsed=null;aig51Reset('5.1 等待最新 GLB 通過 5.0，舊動態接縫／髮束檢查已失效。');
 aig52Invalidate('GLB 來源已變更，5.2 畫面／FPS 原證據失效。');
 $('aig50-run').disabled=aig50Busy||!$('aig50-input').files?.length;
 $('aig50-status').textContent='新本機 GLB 已選擇；須驗證真人體骨架、頭頸胸共享索引網格和真蒙皮動作。不會覆蓋舊人物、劇情或聲音。';
});
$('aig50-run').addEventListener('click',async()=>{
 if(aig50Busy)return;
 const input=$('aig50-input'),file=input.files?.[0];
 if(!file)return;
 if(file.size<20||file.size>40*1024*1024){
  $('aig50-status').textContent='5.0 檔案超出本機 QA 上限（40MB），未讀入。';return;
 }
 const revision=++aig50Revision;
 aig50Busy=true;aig50Report=null;$('aig50-report').disabled=true;
 aig50Parsed=null;aig51Reset('5.0 重新檢查來源，5.1 上一次結果已失效。');
 aig52Invalidate('5.0 重新驗證中，5.2 只能使用相同來源 SHA 的實際 GLB。');
 $('aig50-run').disabled=true;input.disabled=true;
 $('aig50-status').textContent='獨立 GLTFLoader 檢查真 GLB：完整人體骨架、三角面連接、蒙皮權重與真動作。';
 try{
  const bytes=await file.arrayBuffer();
  const sha=await sha256Bytes(bytes);
  const parsed=await parseRiggedGLB(bytes);
  const report=await auditAIG50FullBody(parsed,{sourceSHA256:sha});
  if(revision!==aig50Revision)throw Error('AIG50_SOURCE_CHANGED');
  aig50Report=report;
  aig50Parsed=report.outcome==='STRUCTURAL_QA_PASS_ONLY'?parsed:null;
  $('aig52-load').disabled=report.outcome!=='STRUCTURAL_QA_PASS_ONLY';
  aig51Reset(report.outcome==='STRUCTURAL_QA_PASS_ONLY'?
   '5.0 結構層通過；可執行 5.1 真動畫胸頸肩接縫與真髮束／身體碰撞取樣。':
   '5.0 尚未通過，5.1 不可繞過骨架與來源檢查。');
  $('aig50-report').disabled=false;
  $('aig50-status').textContent='5.0 '+report.outcome+'；真骨架 '+report.boneCount+
   ' 節點、SkinnedMesh '+report.skinnedMeshCount+' 件；缺少必需關節 '+report.missingBones.length+
   '、階層風險 '+report.hierarchyProblems.length+'；同一索引網格頭／頸／胸 '+(report.shoulderNeckHeadActualSharedIndexedComponent?'存在':'未證實')+
   '；動作變形 '+(report.animationHasRealSkinnedVertexMotion?'有':'未通過')+
   '。結構成功不等於真女主角或正式 Release；下載 JSON 查看完整原因。';
 }catch(error){
  aig50Report=null;aig50Parsed=null;
  aig51Reset('5.0 失敗，5.1 禁止運行。');
  aig52Invalidate('5.0 來源 BLOCKED：5.2 不可冒用正式人物或效能證據。');
  $('aig50-status').textContent='5.0 全身骨架 QA BLOCKED：'+error.message+'。來源未寫回、既有 4.9 劇情／影片仍保留。';
 }finally{
  aig50Busy=false;input.disabled=false;
  $('aig50-run').disabled=!input.files?.length;
 }
});
$('aig50-report').addEventListener('click',()=>{
 if(!aig50Report)return;
 aig47Download(JSON.stringify(aig50Report,null,2),
  'AIG-5.0-FULLBODY-SHOULDER-NECK-STRUCTURE-ONLY-NOT-APPROVED.json','application/json');
});

$('aig51-run').addEventListener('click',async()=>{
 if(aig51Busy||!aig50Parsed||aig50Report?.outcome!=='STRUCTURAL_QA_PASS_ONLY')return;
 const revision=aig50Revision,source=aig50Parsed,upstream=aig50Report;
 aig53Invalidate('5.1 重新檢查真動畫接縫與髮束，統一 Gate 須重新計算。');
 aig51Busy=true;aig51Report=null;
 $('aig51-run').disabled=true;$('aig51-report').disabled=true;
 $('aig51-status').textContent='5.1 正從真 GLB 的動畫姿態檢查胸／頸／頭／雙肩三角接縫，以及馬尾對身體的 SAT 交叉檢測。';
 try{
  const report=await auditAIG51PosedSeamsAndHair(source,{
   sourceSHA256:upstream.sourceSHA256,aig50Report:aig50Report
  });
  if(revision!==aig50Revision||source!==aig50Parsed||
    upstream!==aig50Report)throw Error('AIG51_SOURCE_CHANGED');
  aig51Report=report;$('aig51-report').disabled=false;
  $('aig51-status').textContent='5.1 '+report.outcome+'：已取樣 '+report.posesChecked+
   ' 個動畫姿態；真髮束／身體三角接觸 '+report.confirmedBodyHairContacts+
   '；肩頸動畫接縫變形 '+(report.sampledShoulderNeckSeamsInRange?'在限制內':'異常')+
   '。只是離散取樣的幾何 QA，不代表全時間無穿模、正式女主角或實機 60 FPS。';
 }catch(error){
  aig51Report=null;
  $('aig51-status').textContent='5.1 動畫接縫／髮束碰撞 BLOCKED：'+error.message+
   '。未更改原 GLB、4.9 動畫、故事、聲音或錄影。';
 }finally{
  aig51Busy=false;
  $('aig51-run').disabled=!aig50Parsed||aig50Report?.outcome!=='STRUCTURAL_QA_PASS_ONLY';
 }
});
$('aig51-report').addEventListener('click',()=>{
 if(!aig51Report)return;
 aig47Download(JSON.stringify(aig51Report,null,2),
  'AIG-5.1-POSED-SEAM-HAIR-CONTACT-SAMPLED-NOT-APPROVED.json','application/json');
});

// 5.2: real browser WebGL viewer, actual pose contact sheets, and measured frame pacing.
$('aig52-load').addEventListener('click',async()=>{
 if(aig52Busy||!aig50Parsed||aig50Report?.outcome!=='STRUCTURAL_QA_PASS_ONLY'||!view)return;
 const input=$('aig50-input'),file=input.files?.[0],revision=aig50Revision;
 if(!file)return;
 aig52Busy=true;aig52Invalidate('5.2 由已驗證的同一 SHA 來源載入真 GLB；使用者明確選擇替換當前預覽，原始 GLB 不修改。');
 $('aig52-load').disabled=true;
 try{
  if(movieUI?.isBusy)throw Error('AIG52_MOVIE_IS_RECORDING');
  const bytes=await file.arrayBuffer(),sha=await sha256Bytes(bytes);
  if(sha!==aig50Report.sourceSHA256||revision!==aig50Revision)throw Error('AIG52_SOURCE_SHA_CHANGED');
  await load(bytes,false);
  if(sourceSha!==sha||revision!==aig50Revision)throw Error('AIG52_VIEWER_SOURCE_MISMATCH');
  aig52RefreshAvailable();
  $('aig52-status').textContent='5.2 已載入與 5.0 來源 SHA 一致的真 GLB；可操作相機、動畫、16 格截圖或畫面 FPS 實測。此動作會重設目前播放的劇情／錄影時間軸，但原檔保留。';
 }catch(e){
  $('aig52-status').textContent='5.2 真 GLB 載入 BLOCKED：'+e.message+'。未產生 FPS 或虛構人物證據。';
 }finally{
  aig52Busy=false;
  $('aig52-load').disabled=aig50Report?.outcome!=='STRUCTURAL_QA_PASS_ONLY';
 }
});
$('aig52-visual').addEventListener('click',async()=>{
 if(aig52Busy||!aig52RefreshAvailable()||!view)return;
 aig52Busy=true;$('aig52-visual').disabled=true;
 aig53Invalidate('5.2 16 格真動畫畫面重新擷取中。');
 const sha=sourceSha,revision=aig50Revision;
 $('aig52-status').textContent='從真 GLB 的所選動作擷取四個時間點 × 四方向實際 WebGL 像素，檢查姿態與模型。';
 try{
  const result=await view.captureTimelineReview();
  if(sha!==sourceSha||revision!==aig50Revision||!aig52RefreshAvailable())
   throw Error('AIG52_VISUAL_SOURCE_CHANGED');
  const report={schema:AIG52_SCHEMA,sourceSHA256:sha,sourceMatchesCurrentViewer:true,
   visualEvidenceSource:'ACTUAL_BROWSER_WEBGL_CAPTURE_16_VIEWS',
   clipName:result.clipName,frameCount:result.frames,
   frames:result.samples.map(s=>({timeSeconds:s.timeSeconds,views:s.views,
    actualSkinPoseAudit:s.audit})),gpuFpsNotMeasuredByScreenshots:true,
   automaticPhotoIdentityApproval:false,realHeroineApproved:false,releaseAllowed:false};
  aig52VisualReport=report;
  aig47Download(result.image,'AIG-5.2-REAL-GLB-ANIMATION-16-VIEW-NOT-APPROVED.png','image/png');
  $('aig52-visual-report').disabled=false;
  $('aig52-status').textContent='5.2 真 GLB 16 格動畫／四方向 PNG 已擷取，並可下載來源 SHA＋各姿態幾何 QA JSON；這不是人工核准的女主角，也不是 60 FPS 驗收。';
 }catch(error){aig52VisualReport=null;
  $('aig52-status').textContent='5.2 真 GLB 影像檢查 BLOCKED：'+error.message+'；原劇情和檔案未改動。';
 }finally{aig52Busy=false;aig52RefreshAvailable();}
});
$('aig52-visual-report').addEventListener('click',()=>{
 if(aig52VisualReport)aig47Download(JSON.stringify(aig52VisualReport,null,2),
  'AIG-5.2-REAL-GLB-16-VIEW-SHA-POSE-ONLY.json','application/json');
});
function aig52FinishMeasured(){
 if(!aig52Monitor)return;
 const data=aig52Monitor,environment={
  userAgent:navigator.userAgent.slice(0,220),pixelRatio:view?.renderer?.getPixelRatio()||null,
  measurementOnlyWithinActiveVisibleBrowser:true
 };
 if(view)view.onFrameMeasured=null;
 aig52Monitor=null;
 aig52Report=data.summary({environment,clipName:view?.animation?.clips?.[view.animation.index]?.name||null,
  verifiedSource:sourceSha});
 aig53Invalidate('5.2 瀏覽器 FPS 新紀錄完成，5.3 須重新整合。');
 $('aig52-fps-report').disabled=false;
 $('aig52-status').textContent='5.2 真瀏覽器 FPS：'+aig52Report.outcome+
  '；平均 '+aig52Report.framesPerSecond.toFixed(2)+' FPS／p95 '+
  (aig52Report.p95FrameMs?.toFixed(2)||'無')+' ms／卡頓比例 '+
  ((aig52Report.hitchRatio||0)*100).toFixed(2)+'%。'+
  '這是實際 WebGL 畫面更新節奏，並非 GPU 完成耗時，也不是 Android／Windows 原生 60FPS 驗證。';
 aig52RefreshAvailable();
}
$('aig52-fps').addEventListener('click',()=>{
 if(!aig52RefreshAvailable()||!view?.animation?.clips?.length||aig52Monitor)return;
 if(view.movieMode||view.reviewBusy||view.actionImportBusy){
  $('aig52-status').textContent='錄影／截圖／外部動作操作中，不可混算 FPS。';return;
 }
 aig52Report=null;$('aig52-fps-report').disabled=true;
 aig53Invalidate('開始 5.2 FPS 新測量；原有 5.3 FPS Gate 已失效。');
 const data=new Aig52FrameEvidence({sourceSHA256:sourceSha,targetFrames:240,minimumSeconds:2});
 const revision=aig50Revision,sha=sourceSha;
 aig52Monitor=data;
 view.animation.paused=false;
 view.onFrameMeasured=frame=>{
  if(revision!==aig50Revision||sourceSha!==sha||view.movieMode||view.reviewBusy||
     view.actionImportBusy){
   data.invalidReason='AIG52_SOURCE_OR_VIEWER_MODE_CHANGED';data.done=true;
  }else data.addFrame(frame);
  if(data.done)aig52FinishMeasured();
 };
 $('aig52-fps').disabled=true;$('aig52-visual').disabled=true;
 $('aig52-status').textContent='5.2 正在測量此裝置瀏覽器的 240 個真 WebGL 動畫畫面間隔；請保持頁面可見，不切換模型或視窗大小。';
});
$('aig52-fps-report').addEventListener('click',()=>{
 if(aig52Report)aig47Download(JSON.stringify(aig52Report,null,2),
  'AIG-5.2-ACTUAL-BROWSER-FRAME-TIMING-SHA-NOT-NATIVE-FPS.json','application/json');
});
const aig18Toggle=$('aig18-instance-toggle'),
 aig18Download=$('aig18-instance-report'),
 aig18Status=$('aig18-instance-status');
function aig18Show(report){
 if(!report){aig18Status.textContent='GPU 檢視器未建立，來源 GLB 未變動。';return;}
 aig18Toggle.textContent=report.active?'還原原始 GLB 物件顯示':
  '啟用 1.8 靜態 GPU 合批（需載入 GLB）';
 aig18Download.disabled=!report.loadedGLBPresent;
 if(report.reason==='NO_IDENTICAL_SAFE_STATIC_GROUPS_SOURCE_UNCHANGED'){
  aig18Status.textContent='此模型沒有符合安全條件的重複靜態物件，沒有強制刪除、簡化或合併人物 3D。';
 }else{
  aig18Status.textContent='Real3D 1.8 '+report.reason+
   '；來源共 '+report.groupedStaticMeshes+' 個安全靜態網格 → '+
   report.instanceDrawGroups+' 組 GPU Instance；估計可省 '+
   report.theoreticalDrawCallsSaved+
   ' 次 draw call。真正 FPS 改善需以實機測量，GLB／動畫源檔不變。';
 }
}
aig18Toggle.addEventListener('click',()=>{
 if(!view){aig18Show(null);return;}
 try{
  const old=view.getStaticInstancingReport();
  const next=view.setStaticInstancingEnabled(!old.active);
  aig18Show(next);
 }catch(error){
  aig18Status.textContent='BLOCKED：'+String(error.message||error)+
   '；原始 GLB 及動作未修改。';
 }
});
aig18Download.addEventListener('click',()=>{
 if(!view?.model){aig18Status.textContent='BLOCKED：尚未載入 GLB。';return;}
 const evidence={...view.getStaticInstancingReport(),
  sourceSHA256:sourceSha??null,
  animationClipNames:view.animation?.clips?.map(x=>x.name)||[],
  downloadIsSourceEvidenceNotFpsProof:true,
  modelTextureBonesMorphTargetsUnchanged:true,
  nativeAndroidWindowsRealFpsMeasured:false};
 aig47Download(JSON.stringify(evidence,null,2),
  'AIG-FASTMODEL-REAL3D-1-8-STATIC-GLB-INSTANCING-NOT-FPS.json','application/json');
});
const aig17Toggle=$('aig17-gpu-toggle'),
 aig17Download=$('aig17-gpu-report'),
 aig17Status=$('aig17-gpu-status');
function aig17Show(report){
 if(!report){aig17Status.textContent='GPU 主檢視器尚未建立，未更改任何模型或畫質。';return;}
 aig17Toggle.textContent=report.enabled?'關閉智慧畫質並恢復原預覽':'啟用 GPU 量測與智慧預覽（需先載入真 GLB）';
 aig17Download.disabled=!report.loadedGLBScenePresent;
 const governor=report.governor;
 if(report.enabled){
  aig17Status.textContent='Real3D 1.7：真 GLB 的 WebGL2 GPU 計時已開啟；'+
   '已接收 '+(governor?.gpuSamplesAccepted??0)+' 筆有效 GPU 時間，'+
   'p95 '+(governor?.p95GpuMs?.toFixed(2)??'尚無')+' ms，'+
   '預覽像素比 '+report.previewPixelRatio.toFixed(2)+'×。'+
   '不改動動畫／骨架／原始材質；非 Android／Windows 原生 FPS。';
 }else if(report.reason==='GPU_TIMER_UNAVAILABLE_NO_QUALITY_DOWNGRADE'){
  aig17Status.textContent='此 WebGL 裝置沒有可靠的 GPU 執行計時擴充；'+
   '已保留原畫質與原動畫，不用 JS／CPU 時間冒充 GPU 測量。';
 }else{
  aig17Status.textContent='Real3D 1.7：'+report.reason+
   '；原 GLB／動畫均保留，像素比 '+report.previewPixelRatio.toFixed(2)+'×。';
 }
}
aig17Toggle.addEventListener('click',()=>{
 if(!view){aig17Show(null);return;}
 try{
  const existing=view.getGpuAccelerationReport();
  const next=view.setGpuAccelerationEnabled(!existing.enabled);
  aig17Show(next);
 }catch(error){
  aig17Status.textContent='BLOCKED：GPU 智能畫質操作尚不可執行：'+
   String(error?.message||error)+'；原始 GLB／動畫／檔案未修改。';
 }
});
aig17Download.addEventListener('click',()=>{
 if(!view?.model){aig17Status.textContent='BLOCKED：沒有載入真 GLB。';return;}
 const report=view.getGpuAccelerationReport();
 const evidence={...report,sourceSHA256:sourceSha??null,
  sourceDigestAuditedInSeparateGate:sourceSha!==null,
  browserUserAgent:navigator.userAgent.slice(0,220),
  devicePixelRatio:window.devicePixelRatio,
  animationClipName:view.animation?.clips?.[view.animation.index]?.name??null,
  modelPhotorealCharacterIdentityNotVerified:true,
  platformNativeGpuPerformanceCertified:false};
 aig47Download(JSON.stringify(evidence,null,2),
  'AIG-FASTMODEL-REAL3D-1-7-ACTUAL-GPU-TIMER-OR-UNSUPPORTED-NOT-NATIVE-FPS.json','application/json');
 aig17Show(report);
});
document.addEventListener('visibilitychange',()=>{
 if(document.visibilityState!=='visible'&&aig52Monitor){
  aig52Monitor.invalidReason='AIG52_PAGE_NOT_VISIBLE';aig52Monitor.done=true;
  aig52FinishMeasured();
 }
});

// 5.3 compound evidence manifest never permits automatic release.
function aig53Invalidate(message='5.3 一項來源改變；請重新產生統一 Gate 證據。'){
 aig53Report=null;
 $('aig53-download').disabled=true;
 $('aig53-status').textContent=message;
}
$('aig53-review').addEventListener('click',()=>{
 // Collect ONLY live audit objects; never trust separately imported JSON as a certificate.
 try{
  const currentClipName=view?.animation?.clips?.[view.animation.index]?.name||null;
  const report=compileAIG53Evidence({
   sourceImageEvidence:aig53ImageAdmission,
   heroineSourceChain:aig53HeroineSourceChain,
   rig50:aig50Report,seams51:aig51Report,
   visual52:aig52VisualReport,fps52:aig52Report,nativeTechnical54:aig54Report,
   currentViewerSourceSHA256:sourceSha,currentClipName,
   storyReady:storyPlan?.ready===true
  });
  aig53Report=report;
  $('aig53-download').disabled=false;
  const missing=report.checks.filter(x=>x.status!=='PASS');
  $('aig53-status').textContent='5.3 '+report.outcome+'；'+
   report.passedChecks+'/'+report.totalChecks+' 項通過，'+
   report.blockedChecks+' 項 BLOCKED。阻擋：'+
   missing.map(x=>x.id).join('、')+
   '。同 SHA 技術證據只能送人工複核；沒有正式人物外觀簽核、Android/Windows 原生 FPS 與有聲成片驗收，releaseAllowed 永遠 false。';
 }catch(e){
  aig53Report=null;$('aig53-download').disabled=true;
  $('aig53-status').textContent='5.3 統一 Gate BLOCKED：'+e.message+'。未修改任何前階段或已錄製檔案。';
 }
});
$('aig53-download').addEventListener('click',()=>{
 if(!aig53Report)return;
 aig47Download(JSON.stringify(aig53Report,null,2),
  'AIG-5.3-UNIFIED-SHA-RELEASE-GATE-BLOCKED-NOT-APPROVED.json','application/json');
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
let aig54NativeJobId=null,aig54ExpectedSourceSHA=null,aig54Report=null,aig54Busy=false;
function aig54Invalidate(message='自研來源已變更；5.4 來源完整性證據已失效。'){
 aig55Invalidate('自研原圖或 5.4 來源鏈已失效，5.5 需重新確認。');
 aig54NativeJobId=null;aig54ExpectedSourceSHA=null;aig54Report=null;
 $('aig54-download').disabled=true;$('aig54-check').disabled=true;
 $('aig54-status').textContent=message;
}
$('aig54-check').addEventListener('click',async()=>{
 if(aig54Busy||!aig54NativeJobId||!aig54ExpectedSourceSHA)return;
 const jobId=aig54NativeJobId,imageSHA=aig54ExpectedSourceSHA;
 const file=$('aig4-front').files?.[0];
 if(!file){aig54Invalidate('原來源圖片已遺失，不能證明 GLB 由本張原圖產生。');return;}
 aig54Busy=true;$('aig54-check').disabled=true;$('aig54-download').disabled=true;
 $('aig54-status').textContent='5.4 正重新讀取來源照片及後端硬碟檔，然後下載真 GLB 以 SHA-256 重驗。';
 try{
  const original=await file.arrayBuffer();
  if(await sha256Bytes(original)!==imageSHA)throw Error('AIG54_SOURCE_INPUT_CHANGED');
  const base='/api/aig4/jobs/'+jobId;
  const manifest=await api(base+'/provenance');
  const response=await fetch(base+'/files/model.glb',{cache:'no-store'});
  if(!response.ok)throw Error('AIG54_GLB_DOWNLOAD_FAILED');
  const glbBytes=await response.arrayBuffer();
  const report=await verifyAIG54NativeChain({
   manifest,glbBytes,expectedImageSHA256:imageSHA,expectedJobId:jobId
  });
  if(jobId!==aig54NativeJobId||imageSHA!==aig54ExpectedSourceSHA)
   throw Error('AIG54_SOURCE_CHANGED_DURING_READ');
  aig54Report=report;$('aig54-download').disabled=false;
  aig56RefreshEnabled();aig57RefreshEnabled();aig58RefreshEnabled();aig59RefreshEnabled();aig60RefreshEnabled();
  $('aig55-build').disabled=!aig55Scaffold||aig55Scaffold.sourceSHA256!==imageSHA;
  $('aig55-status').textContent=$('aig55-build').disabled?'5.5 缺少已核對的自研人體比例來源。':
   '5.4 真來源完整性通過；可用相同原圖 SHA 產生帶骨架、蒙皮與真動畫的自研技術 GLB。';
  aig53Invalidate('已取得新的 5.4 自研來源鏈技術證據；不自動解除 5.3 正式人物 Gate。');
  $('aig54-status').textContent='5.4 '+report.outcome+'：原始檔／生成器／GLB／Scaffold 已比對，'+
   '瀏覽器下載 GLB 的 SHA 也一致。來源真實性≠完整全身人物；4.0 草模無 Rig，'+
   '5.0～5.3 正式女主角 Gate 仍 BLOCKED。';
 }catch(error){
  aig54Report=null;
  aig55Invalidate('5.4 實體來源核對失敗，5.5 不可拿舊的生成器或照片假裝新的來源。');
  $('aig54-status').textContent='5.4 來源完整性 BLOCKED：'+error.message+
   '。未改寫原圖、GLB、劇情、聲音或錄影資料。';
 }finally{
  aig54Busy=false;
  $('aig54-check').disabled=!aig54NativeJobId;
 }
});
$('aig54-download').addEventListener('click',()=>{
 if(aig54Report)aig47Download(JSON.stringify(aig54Report,null,2),
  'AIG-5.4-NATIVE-SOURCE-GLB-SHA-INTEGRITY-TECHNICAL-ONLY.json','application/json');
});

let aig55Scaffold=null,aig55Report=null,aig55Busy=false,aig55Epoch=0;
let aig56Report=null,aig56Busy=false,aig56Epoch=0;
function aig56Invalidate(message='5.6 肩髖拓樸來源已變更，舊的網格驗收失效。'){
 aig57Invalidate('來源或 5.4 驗證變更，5.7 校園造型證據失效。');
 ++aig56Epoch;aig56Report=null;
 $('aig56-build').disabled=true;$('aig56-report').disabled=true;
 $('aig56-status').textContent=message;
}
function aig56RefreshEnabled(){
 const valid=!!aig54Report&&!!aig55Scaffold&&!aig56Busy&&!aig55Busy&&
  aig55Scaffold.sourceSHA256===aig54Report.sourceImageSHA256&&
  aig55Scaffold.meshGLBSHA256===aig54Report.modelGLBSHA256;
 $('aig56-build').disabled=!valid;
 return valid;
}

function aig55Invalidate(message='5.5 技術來源已變更，骨架 GLB 證據失效。'){
 aig56Invalidate('來源照片、scaffold 或 5.4 SHA 已改變，舊 5.6 網格報告失效。');
 ++aig55Epoch;aig55Report=null;aig55Scaffold=null;
 $('aig55-build').disabled=true;$('aig55-report').disabled=true;
 $('aig55-status').textContent=message;
}
$('aig55-build').addEventListener('click',async()=>{
 if(aig55Busy||!aig54Report||!aig55Scaffold)return;
 if(aig55Scaffold.sourceSHA256!==aig54Report.sourceImageSHA256||
  aig55Scaffold.meshGLBSHA256!==aig54Report.modelGLBSHA256){
  aig55Invalidate('5.4 的真 GLB 與 5.5 輪廓來源不同，已阻擋生成。');return;
 }
 const epoch=++aig55Epoch,scaffold=aig55Scaffold,proof=aig54Report;
 aig55Busy=true;$('aig55-build').disabled=true;$('aig55-report').disabled=true;
 $('aig55-status').textContent='以自研已核對原圖比例建立真三維人體，輸出 17 骨架 SKIN GLB，回讀真動畫與 5.0 骨架 Gate。';
 try{
  const output=generateAIG55NativeHumanoid(scaffold);
  const bytes=output.bytes,sha=await sha256Bytes(bytes);
  const parsed=await parseRiggedGLB(bytes.buffer);
  const qa=await auditAIG50FullBody(parsed,{sourceSHA256:sha});
  if(epoch!==aig55Epoch||scaffold!==aig55Scaffold||
     proof!==aig54Report)throw Error('AIG55_SOURCE_CHANGED_WHILE_GENERATING');
  const report={schema:AIG55_SCHEMA,
   originalImageSHA256:scaffold.sourceSHA256,
   sourceNative54:proof,modelGLBSHA256:sha,actualSourceConstrainedSilhouette:scaffold.proportions,
   nativeTechnicalBuild:output,
   outputGLBByteLength:bytes.byteLength,
   actualGLTFLoaderParsedSkinnedMeshes:qa.skinnedMeshCount,
   actualGLTFLoaderParsedBones:qa.boneCount,actualGLTFLoaderParsedClips:qa.clipsAvailable,
   fullBody50Audit:qa,
   sourceOriginalFaceTextureReproduced:false,
   headNeckSkinNotPhysicallyCertified:true,shoulderAndHipNotFullyWatertight:true,
   garmentPBRFromImageVerified:false,hiddenGeometryMeasured:false,
   faceIdentityHumanApproved:false,formalHeroineApproved:false,
   nativeAndroidWindows60FPSVerified:false,releaseAllowed:false};
  delete report.nativeTechnicalBuild.bytes;
  if(qa.outcome!=='STRUCTURAL_QA_PASS_ONLY')throw Error('AIG55_REAL_SKIN_GLTF_AUDIT_BLOCKED');
  aig55Report=report;
  aig47Download(bytes,'AIG-5.5-NATIVE-HUMANOID-SKINNED-TECHNICAL.glb','model/gltf-binary');
  $('aig55-report').disabled=false;
  let previewStatus='技術 GLB 已產生但裝置 GPU 工作區不可用；可下載原始 GLB。';
  if(view){
   try{
    await load(bytes.buffer,false,{technical:true});
    if(sha!==sourceSha)throw Error('AIG55_VIEWER_SHA_MISMATCH');
    // Generated technical humanoid can use the existing isolated QA and 5.2 measurements.
    aig50Revision++;aig50Report=qa;aig50Parsed=parsed;
    aig51Reset('5.5 自研骨架技術模型已生成；5.1 真人髮束／接縫必須另行跑真動畫取樣。');
    aig52Invalidate('5.5 真 GLB 已載入；可擷取動畫或實測瀏覽器 FPS，不代表正式女主角。');
    aig52RefreshAvailable();
    $('aig52-load').disabled=true;
    $('aig50-report').disabled=false;
    $('aig50-status').textContent='5.0 '+qa.outcome+'：5.5 自研技術人體有真 17 節骨架及蒙皮；來源外觀、衣物、全部接縫未核准。';
    previewStatus='已載入真 GLB，四段骨架動畫可在工作區切換與播放。';
   }catch(e){previewStatus='預覽未通過：'+e.message+'；GLB 原檔與 QA 證據已保留。';}
  }
  $('aig55-status').textContent='5.5 真 GLB '+qa.outcome+
   '；來源 SHA '+scaffold.sourceSHA256.slice(0,12)+
   '，GLB SHA '+sha.slice(0,12)+'；17 骨＋4 Clip。'+previewStatus+
   ' 全身比例與背面仍推估、肩髖未證明水密，正式人物／實機 FPS BLOCKED。';
 }catch(e){
  aig55Report=null;$('aig55-report').disabled=true;
  $('aig55-status').textContent='5.5 自研全身骨架 GLB BLOCKED：'+e.message+
   '。不清空原始草模、音樂、台詞、影片或其他分頁。';
 }finally{
  aig55Busy=false;$('aig55-build').disabled=
   !aig55Scaffold||!aig54Report||aig55Scaffold.sourceSHA256!==aig54Report.sourceImageSHA256;
 }
});
$('aig55-report').addEventListener('click',()=>{
 if(aig55Report)aig47Download(JSON.stringify(aig55Report,null,2),
  'AIG-5.5-NATIVE-HUMANOID-REAL-SKIN-GLB-TECHNICAL-NOT-HEROINE.json','application/json');
});


$('aig56-build').addEventListener('click',async()=>{
 if(!aig56RefreshEnabled())return;
 const scaffold=aig55Scaffold,proof=aig54Report,epoch=++aig56Epoch;
 aig56Busy=true;$('aig56-build').disabled=true;$('aig56-report').disabled=true;
 $('aig56-status').textContent='5.6 正在從自研比例來源生成真肩髖挖孔接合／手掌輪廓，回讀 GLB 真骨架與網格結構。';
 try{
  const product=generateAIG56NativeHumanoid(scaffold);
  const bytes=product.bytes,sha=await sha256Bytes(bytes);
  const parsed=await parseRiggedGLB(bytes.buffer);
  const qa=await auditAIG50FullBody(parsed,{sourceSHA256:sha});
  if(epoch!==aig56Epoch||scaffold!==aig55Scaffold||proof!==aig54Report)
   throw Error('AIG56_NATIVE_SOURCE_CHANGED_DURING_BUILD');
  if(!product.indexedSurfaceClosureVerified||!product.fullyWatertightJunctionsVerified||
   qa.outcome!=='STRUCTURAL_QA_PASS_ONLY')
   throw Error('AIG56_REAL_INDEX_MANIFOLD_OR_ANIMATED_SKIN_QA_BLOCKED');
  // This proves oriented topological closure, NOT physical mesh intersections.
  const report={schema:AIG56_SCHEMA,sourceImageSHA256:scaffold.sourceSHA256,
   native4ModelSHA256:proof.modelGLBSHA256,modelGLBSHA256:sha,
   indexedOrientedClosedBody:true,bodyManifoldEdges:product.bodyManifoldEdges,
   bodyTriangleCount:product.bodyTriangleCount,boneCount:product.boneCount,
   animationClips:product.animationClipNames,
   realGLTFLoaderAnd5_0SkinAudit:qa,
   technicalGeometryFromOverallPhotoRatioOnly:true,
   continuousCollisionFreeProven:false,facePhotoMatched:false,
   geometricSurfaceSelfIntersectionVerified:false,
   shoulderHipRealSkinPhysicalStretchVerified:false,
   allHairAndGarmentCollisionsVerified:false,
   realHeroineAppearanceApproved:false,nativeAndroidWindows60FPSVerified:false,
   formalReleaseAllowed:false,releaseAllowed:false,
   outcome:'CLOSED_INDEXED_HUMANOID_TECHNICAL_QA_ONLY'};
  aig56Report=report;
  aig47Download(bytes,'AIG-5.6-NATIVE-JOINT-WELDED-SKINNED-TECHNICAL.glb','model/gltf-binary');
  $('aig56-report').disabled=false;
  let preview='目前 3D 預覽不可用；已提供真 GLB 檔與結構證據下載。';
  if(view){
   try{
    await load(bytes.buffer,false,{technical:true});
    if(sourceSha!==sha)throw Error('AIG56_VIEWER_SOURCE_SHA_MISMATCH');
    // Same source GLB accepted by existing 5.0/5.1/5.2 runtime validation.
    aig50Revision++;aig50Report=qa;aig50Parsed=parsed;
    aig51Reset('5.6 肩髖 index 閉合並非 5.1 動態穿模 PASS；請另外取樣檢查。');
    aig52Invalidate('5.6 已載入真 GLB，可重新擷取 16 格並測試瀏覽器 FPS。');
    aig52RefreshAvailable();
    $('aig52-load').disabled=true;$('aig50-report').disabled=false;
    $('aig50-status').textContent='5.6 真人工草模 17 骨／4 Clip '+qa.outcome+
     '，肩髖閉合索引面已驗證；人臉、衣服及碰撞仍未核准。';
    preview='已載入原 RGB 3D 播放工作區，可實際播放四段骨架動作。';
   }catch(error){preview='真 GLB 已產生，預覽被隔離：'+error.message;}
  }
  $('aig56-status').textContent='5.6 真 GLB '+qa.outcome+'；骨架 '+product.boneCount+
   '／Clip '+product.animationClipNames.length+'／索引網格邊 '+product.bodyManifoldEdges+
   '／GLB SHA '+sha.slice(0,12)+'。'+preview+
   ' 這是索引拓樸閉合，不是幾何零交疊、寫實女主角或原生 60 FPS。';
 }catch(error){
  aig56Report=null;$('aig56-report').disabled=true;
  $('aig56-status').textContent='5.6 肩髖閉合／真動畫 QA BLOCKED：'+error.message+
   '；保留 5.5、4.0 原 GLB 及劇情／音效／錄影資料。';
 }finally{aig56Busy=false;aig56RefreshEnabled();}
});
$('aig56-report').addEventListener('click',()=>{
 if(aig56Report)aig47Download(JSON.stringify(aig56Report,null,2),
  'AIG-5.6-REAL-INDEX-MANIFOLD-SKIN-GLB-SHA-NOT-HEROINE.json','application/json');
});


let aig57Report=null,aig57Busy=false,aig57Epoch=0;
function aig57Invalidate(message='5.7 來源已變更，之前的校園服裝／人物幾何證據失效。'){
 aig58Invalidate('5.7 或來源照片改變，5.8 原裙裝／馬尾檢查失效。');
 ++aig57Epoch;aig57Report=null;
 $('aig57-build').disabled=true;$('aig57-report').disabled=true;
 $('aig57-status').textContent=message;
}
function aig57RefreshEnabled(){
 const available=!!aig54Report&&!!aig55Scaffold&&!aig57Busy&&
  !aig55Busy&&!aig56Busy&&
  aig55Scaffold.sourceSHA256===aig54Report.sourceImageSHA256&&
  aig55Scaffold.meshGLBSHA256===aig54Report.modelGLBSHA256;
 $('aig57-build').disabled=!available;
 return available;
}
$('aig57-build').addEventListener('click',async()=>{
 if(!aig57RefreshEnabled())return;
 const scaffold=aig55Scaffold,sourceProof=aig54Report,revision=++aig57Epoch;
 aig57Busy=true;$('aig57-build').disabled=true;$('aig57-report').disabled=true;
 $('aig57-status').textContent='5.7 正建立真人體積式臉部、制服、裙褶、蝴蝶結、背包、骨架馬尾髮束，再由 GLTFLoader 實際回讀及 5.0 骨架動畫 QA。';
 try{
  const output=generateAIG57SchoolHeroineTechnical(scaffold),bytes=output.bytes;
  const glbSHA=await sha256Bytes(bytes);
  const parsed=await parseRiggedGLB(bytes.buffer);
  const qa=await auditAIG50FullBody(parsed,{sourceSHA256:glbSHA});
  if(revision!==aig57Epoch||scaffold!==aig55Scaffold||
   sourceProof!==aig54Report)throw Error('AIG57_NATIVE4_SOURCE_CHANGED');
  if(qa.outcome!=='STRUCTURAL_QA_PASS_ONLY'||qa.skinnedMeshCount!==9||
   qa.clipsAvailable!==5||output.extraParts.length!==7)
   throw Error('AIG57_REAL_GLTF_SKIN_CLOTHING_OR_ANIMATION_QA_BLOCKED');
  const report={
   schema:AIG57_SCHEMA,sourceNative54:sourceProof,
   sourceImageSHA256:scaffold.sourceSHA256,sourceNative4GLBSHA256:sourceProof.modelGLBSHA256,
   generatedGLBSHA256:glbSHA,generatedGLBBytes:bytes.byteLength,
   original56BodyMeshPreserved:output.bodyMeshPreserved,
   selfAuthoredIndexedSkinned3DParts:output.extraParts,
   skeletonBoneCount:qa.boneCount,realSkinnedMeshes:qa.skinnedMeshCount,
   quaternionAnimationClips:qa.poseReports,
   clipCount:qa.clipsAvailable,fullbodySkinQA:qa,
   originalPhotoFaceLikenessVerified:false,
   exactImageTextureReconstructed:false,
   nativeHairPhysicsVerified:false,garmentSelfCollisionVerified:false,
   geometricSurfaceSelfIntersectionFreeProven:false,
   realHeroineVisualAuthorityApproved:false,
   nativeAndroidWindows60FPSVerified:false,formalReleaseAllowed:false,
   releaseAllowed:false,outcome:'3D_SCHOOL_STYLE_TECHNICAL_SKIN_QA_ONLY'
  };
  aig47Download(bytes,'AIG-5.7-NATIVE-SCHOOL-UNIFORM-SKINNED-TECHNICAL.glb',
   'model/gltf-binary');
  let preview='可下載真 GLB，裝置 GPU 預覽暫時不可用。';
  if(view){
   try{
    await load(bytes.buffer,false,{technical:true});
    if(sourceSha!==glbSHA)throw Error('AIG57_VIEWER_SOURCE_SHA_MISMATCH');
    aig50Revision++;aig50Report=qa;aig50Parsed=parsed;
    aig51Reset('5.7 自研制服、臉部與馬尾為真 3D 網格；5.1 穿模仍須逐段獨立抽樣。');
    aig52Invalidate('5.7 已載入真 GLB，可用現有 16 格真動畫和瀏覽器 FPS 取樣。');
    aig52RefreshAvailable();$('aig52-load').disabled=true;
    $('aig50-report').disabled=false;
    $('aig50-status').textContent='5.7 真人體模型 '+qa.outcome+
      '：17 骨、9 個真 SkinnedMesh 與五段 Clip；來源臉型、服裝真實性未核准。';
    preview='已載入 RGB 3D 工作區，五段真骨架 Clip 可切換播放；原檔與影音工具保留。';
   }catch(error){preview='GLB 源檔已保留；3D 預覽隔離：'+error.message;}
  }
  if(revision!==aig57Epoch||scaffold!==aig55Scaffold)throw Error('AIG57_SOURCE_CHANGED_AFTER_PREVIEW');
  aig57Report=report;$('aig57-report').disabled=false;
  $('aig57-status').textContent='5.7 真 GLB '+qa.outcome+'；9 網格（原 2＋新 7）、17 骨、5 Clip，SHA '+glbSHA.slice(0,12)+
   '。'+preview+' 面容與衣裙、馬尾仍為技術造型／關鍵影格，非原圖外觀核准或實機 60 FPS。';
 }catch(error){
  aig57Report=null;$('aig57-report').disabled=true;
  $('aig57-status').textContent='5.7 真造型／動畫 GLB BLOCKED：'+error.message+
   '。原版 5.5／5.6、原照片、故事、配音與音樂檔不會被覆蓋。';
 }finally{aig57Busy=false;aig57RefreshEnabled();}
});
$('aig57-report').addEventListener('click',()=>{
 if(aig57Report&&(!view||sourceSha===aig57Report.generatedGLBSHA256))
  aig47Download(JSON.stringify(aig57Report,null,2),
   'AIG-5.7-REAL-3D-FACE-UNIFORM-HAIR-SHA-NOT-APPROVED.json','application/json');
 else $('aig57-status').textContent='目前工作區模型 SHA 已不同，5.7 報告不可冒用，請重新生成／載入。';
});


let aig58Report=null,aig58Busy=false,aig58Epoch=0;
function aig58Invalidate(message='5.8 來源已改變，原有裙裝／馬尾三角面取樣報告無效。'){
 aig59Invalidate('來源草模或 5.8 模型參數已更換，舊 5.9 自動修整來源失效。');
 ++aig58Epoch;aig58Report=null;
 $('aig58-report').disabled=true;$('aig58-build').disabled=true;
 $('aig58-status').textContent=message;
}
function aig58RefreshEnabled(){
 const valid=!!aig55Scaffold&&!!aig54Report&&!aig58Busy&&
  !aig55Busy&&!aig56Busy&&!aig57Busy&&
  aig55Scaffold.sourceSHA256===aig54Report.sourceImageSHA256&&
  aig55Scaffold.meshGLBSHA256===aig54Report.modelGLBSHA256;
 $('aig58-build').disabled=!valid;
 return valid;
}
$('aig58-build').addEventListener('click',async()=>{
 if(!aig58RefreshEnabled())return;
 const scaffold=aig55Scaffold,upstream=aig54Report,revision=++aig58Epoch;
 aig58Busy=true;$('aig58-build').disabled=true;$('aig58-report').disabled=true;
 $('aig58-status').textContent='5.8 正修整實際 GLB 的百褶裙／馬尾，重新計算法向，並以真姿態三角面 SAT 檢查裙裝／分束髮絲。';
 try{
  const result=generateAIG58FittedTechnical(scaffold),bytes=result.bytes;
  const sha=await sha256Bytes(bytes),parsed=await parseRiggedGLB(bytes.buffer);
  const qa=await auditAIG50FullBody(parsed,{sourceSHA256:sha});
  if(qa.outcome!=='STRUCTURAL_QA_PASS_ONLY'||qa.skinnedMeshCount!==9||
    qa.clipsAvailable!==5)throw Error('AIG58_TRUE_GLTF_SKIN_QA_BLOCKED');
  const contact=await auditAIG58RealPoseContacts(parsed,{sourceSHA256:sha,maxClips:5});
  // Compare the same first two real animation clips on the UNMODIFIED 5.7
  // GLB. Never claim fitted geometry reduced intersections without a true
  // source-to-source triangle result. Keep the default 25-pose full gate.
  const prior=generateAIG57SchoolHeroineTechnical(scaffold);
  const priorSHA=await sha256Bytes(prior.bytes);
  const priorGLTF=await parseRiggedGLB(prior.bytes.buffer);
  const priorContacts=await auditAIG58RealPoseContacts(priorGLTF,{
   sourceSHA256:priorSHA,maxClips:2
  });
  const twoClips=contact.clips.slice(0,2);
  const fittedSkirtContacts=twoClips.reduce((sum,clip)=>sum+
   clip.samples.reduce((total,s)=>total+s.skirtBodyTriangleContacts,0),0);
  const fittedHairContacts=twoClips.reduce((sum,clip)=>sum+
   clip.samples.reduce((total,s)=>total+s.hairBodyTriangleContacts,0),0);
  const contactComparison={
   source57GLBSHA256:priorSHA,source58GLBSHA256:sha,
   comparedClipNames:twoClips.map(c=>c.name),
   samplesCompared:priorContacts.posesChecked,
   original57SkirtBodyContacts:priorContacts.skirtBodyConfirmedTriangleContacts,
   fitted58SkirtBodyContacts:fittedSkirtContacts,
   original57HairBodyContacts:priorContacts.hairBodyConfirmedTriangleContacts,
   fitted58HairBodyContacts:fittedHairContacts,
   skirtContactDelta:fittedSkirtContacts-priorContacts.skirtBodyConfirmedTriangleContacts,
   hairContactDelta:fittedHairContacts-priorContacts.hairBodyConfirmedTriangleContacts,
   possibleFittingRegression:fittedSkirtContacts>priorContacts.skirtBodyConfirmedTriangleContacts||
    fittedHairContacts>priorContacts.hairBodyConfirmedTriangleContacts,
   comparisonOnlyTwoClips:true
  };
  if(revision!==aig58Epoch||scaffold!==aig55Scaffold||upstream!==aig54Report)
   throw Error('AIG58_SOURCE_CHANGED_DURING_AUDIT');
  const report={schema:AIG58_SCHEMA,sourceImageSHA256:scaffold.sourceSHA256,
   native4GLBSourceSHA256:upstream.modelGLBSHA256,generatedGLBSHA256:sha,
   generatedGLBByteLength:bytes.byteLength,original56BodyMeshPreserved:true,
   modifiedSkirtVertices:result.adjustedSkirtVertices,
   modifiedHairVertices:result.adjustedHairVertices,
   skirtExpansion:result.skirtExpansion,hairBackClearance:result.hairBackClearance,
   bodyBoneCount:qa.boneCount,realSkinnedMeshes:qa.skinnedMeshCount,
   animationClips:qa.clipsAvailable,skinAudit50Outcome:qa.outcome,
   realPosedTriangleContactQA:contact,
   comparisonToUnmodified57SameTenPoses:contactComparison,
   finalPoseSampleContactFree:contact.sampledBodyGarmentAndHairContactFree,
   sampledCollisionOutcome:contact.outcome,
   independentlyAnimatedClothPhysics:false,independentlyAnimatedHairPhysics:false,
   originalPhotoFacialProportionsConfirmed:false,
   actualVisualReferenceLikenessApproved:false,
   fullContinuousMotionCollisionFreeProven:false,
   nativeAndroidWindows60FpsVerified:false,releaseAllowed:false};
  aig58Report=report;$('aig58-report').disabled=false;
  aig47Download(bytes,'AIG-5.8-POSE-FITTED-SCHOOL-UNIFORM-TECHNICAL.glb','model/gltf-binary');
  let preview='模型 GLB 已下載，現有 GPU 工作區不可用；檢查報告仍可下載。';
  if(view){
   try{
    await load(bytes.buffer,false,{technical:true});
    if(sourceSha!==sha)throw Error('AIG58_VIEWER_SHA_MISMATCH');
    aig50Revision++;aig50Report=qa;aig50Parsed=parsed;
    aig51Reset('5.8 須以這份 GLB 重新執行原 5.1 骨架／髮束 QA；原有報告不可直接沿用。');
    aig52Invalidate('5.8 真 GLB 已載入，16 格動畫與本裝置瀏覽器 FPS 請重新取樣。');
    aig52RefreshAvailable();$('aig52-load').disabled=true;$('aig50-report').disabled=false;
    $('aig50-status').textContent='5.8 '+qa.outcome+'，9 真網格＋17 骨架＋5 Clip；衣裙／髮束碰撞另見 5.8 實際接觸報告。';
    preview='已載入真 3D 工作區，可直接播放五段骨架動畫。';
   }catch(err){preview='預覽隔離：'+err.message+'；模型 GLB 仍保留。';}
  }
  if(revision!==aig58Epoch||scaffold!==aig55Scaffold)
   throw Error('AIG58_SOURCE_CHANGED_AFTER_PREVIEW');
  $('aig58-status').textContent='5.8 真 GLB '+qa.outcome+
   '；裙裝接觸 '+contact.skirtBodyConfirmedTriangleContacts+
   '、髮束接觸 '+contact.hairBodyConfirmedTriangleContacts+
   '（'+contact.posesChecked+' 個離散姿態）；與 5.7 相同前十姿態比較裙裝 Δ '+
   contactComparison.skirtContactDelta+'／馬尾 Δ '+contactComparison.hairContactDelta+
   '；三角面風險：'+contact.outcome+
   '。'+preview+' 照片臉型、布料髮絲物理及原生 60 FPS 仍未核准。';
 }catch(err){
  aig58Report=null;$('aig58-report').disabled=true;
  $('aig58-status').textContent='5.8 技術模型／動畫取樣 BLOCKED：'+err.message+
   '；原 5.7、原照片、劇情、聲音與音樂不受影響。';
 }finally{aig58Busy=false;aig58RefreshEnabled();}
});
$('aig58-report').addEventListener('click',()=>{
 if(aig58Report&&(!view||sourceSha===aig58Report.generatedGLBSHA256))
  aig47Download(JSON.stringify(aig58Report,null,2),
   'AIG-5.8-GARMENT-HAIR-REAL-POSE-CONTACT-SHA-NOT-APPROVED.json','application/json');
 else $('aig58-status').textContent='真播放器 GLB 來源 SHA 已改變，5.8 舊證據不可使用。';
});


let aig59Report=null,aig59Busy=false,aig59Epoch=0;
function aig59Invalidate(message='5.9 原始 GLB 或來源 SHA 改變，自動修整證據失效。'){
 aig60Invalidate('5.9 GLB／來源 SHA 已變更，6.0 照片臉部標定與舊報告失效。');
 ++aig59Epoch;aig59Report=null;
 $('aig59-build').disabled=true;$('aig59-capture').disabled=true;
 $('aig59-report').disabled=true;
 $('aig59-status').textContent=message;
}
function aig59RefreshEnabled(){
 const valid=!!aig55Scaffold&&!!aig54Report&&!aig59Busy&&!aig58Busy&&
  !aig57Busy&&!aig56Busy&&!aig55Busy&&
  aig55Scaffold.sourceSHA256===aig54Report.sourceImageSHA256&&
  aig55Scaffold.meshGLBSHA256===aig54Report.modelGLBSHA256;
 $('aig59-build').disabled=!valid;
 return valid;
}
$('aig59-build').addEventListener('click',async()=>{
 if(!aig59RefreshEnabled())return;
 if(movieUI?.isBusy||view?.movieMode){
  $('aig59-status').textContent='目前正在錄製，不能混合自動修整與影片時間軸。';return;
 }
 const scaffold=aig55Scaffold,upstream=aig54Report,revision=++aig59Epoch;
 aig60Invalidate('開始新一輪 5.9 自動避讓，6.0 須重新核對同一 GLB 與照片。');
 aig59Busy=true;$('aig59-build').disabled=true;
 $('aig59-report').disabled=true;$('aig59-capture').disabled=true;
 $('aig59-status').textContent='5.9 開始用實際 GLB 真三角面測量多組裙襬／馬尾候選；不能使用假的幀數或估算接觸量。';
 try{
  const selected=await runAIG59BoundedAutoFit(scaffold,{
   parseGLB:arraybuffer=>parseRiggedGLB(arraybuffer),
   hashBytes:bytes=>sha256Bytes(bytes),
   onProgress:p=>{
    $('aig59-status').textContent=p.phase==='measure'?
     '5.9 正以實際 3D 骨架取樣三角面：第 '+p.current+'/'+p.total+' 組候選。':
     '5.9 正以全部五段動畫共 25 姿態複核；任何接觸退步自動返回 5.8。';
   }
  });
  const bytes=selected.bytes,sha=await sha256Bytes(bytes);
  const parsed=await parseRiggedGLB(bytes.buffer);
  const qa=await auditAIG50FullBody(parsed,{sourceSHA256:sha});
  if(qa.outcome!=='STRUCTURAL_QA_PASS_ONLY'||qa.skinnedMeshCount!==9||
   qa.clipsAvailable!==5||sha!==selected.selectedGLBSHA256)
   throw Error('AIG59_SOURCE_OR_ACTUAL_SKIN_QA_BLOCKED');
  if(selected.actualMeasuredSkirtDelta>0||selected.actualMeasuredHairDelta>0)
   throw Error('AIG59_FULL_POSE_COLLISION_REGRESSION_NOT_ROLLED_BACK');
  if(revision!==aig59Epoch||scaffold!==aig55Scaffold||upstream!==aig54Report)
   throw Error('AIG59_SOURCE_CHANGED_DURING_AUTO_FIT');
  const {bytes:discardBytes,...publicEvidence}=selected;
  const report={...publicEvidence,
   sourceNative54GLBSHA256:upstream.modelGLBSHA256,
   fullbody50Outcome:qa.outcome,actualRealSkinnedMeshes:qa.skinnedMeshCount,
   actualAnimationClips:qa.clipsAvailable,
   actualWebGL16FrameCapture:null,
   originalPhotoFaceLandmarksNotMeasured:true,
   realApprovedHeroine:false,formalReleaseAllowed:false,releaseAllowed:false};
  aig47Download(bytes,'AIG-5.9-AUTO-FIT-SKINNED-SCHOOL-UNIFORM-TECHNICAL.glb',
   'model/gltf-binary');
  let viewerStatus='真 GLB 已建立但無瀏覽器 GPU 畫面；16 格視覺證據不可假造。';
  if(view){
   try{
    await load(bytes.buffer,false,{technical:true});
    if(sourceSha!==sha)throw Error('AIG59_VIEWER_SHA_MISMATCH');
    aig50Revision++;aig50Report=qa;aig50Parsed=parsed;
    aig51Reset('5.9 對新 GLB 的 5.1 頭頸／髮束檢查須另外重跑，原有 SHA 無法沿用。');
    aig52Invalidate('5.9 新 GLB 已載入；先前 FPS、16 格動畫資料失效。');
    aig52RefreshAvailable();$('aig52-load').disabled=true;
    $('aig50-report').disabled=false;
    $('aig50-status').textContent='5.9 自動避讓＋五段真動畫 '+qa.outcome+
      '；裙裝髮束離散接觸與外觀核准分開驗證。';
    viewerStatus='已載入真 3D 工作區，可直接播放五段骨架動畫與擷取四方向 16 格。';
   }catch(error){viewerStatus='真 GLB 已下載，3D 預覽隔離：'+error.message;}
  }
  if(revision!==aig59Epoch||scaffold!==aig55Scaffold)
   throw Error('AIG59_SOURCE_CHANGED_AFTER_VIEWER_LOAD');
  aig59Report=report;
  aig60RefreshEnabled();
  $('aig59-report').disabled=false;
  $('aig59-capture').disabled=!view||sourceSha!==sha||
   !view.animation?.clips?.length;
  $('aig59-status').textContent='5.9 '+selected.outcome+
    '；五段 25 姿態：裙裝接觸 Δ '+selected.actualMeasuredSkirtDelta+
    '，馬尾接觸 Δ '+selected.actualMeasuredHairDelta+
    '。候選 '+selected.profileCandidates.length+' 組，採用第 '+(selected.selectedProfileIndex+1)+
    ' 組，完整回退：'+(selected.selectionAfterFullClipFallback?'有':'無')+
    '。'+viewerStatus+' 人臉相似度、完整髮絲物理、原生 60 FPS 仍 BLOCK。';
 }catch(err){
  aig59Report=null;$('aig59-report').disabled=true;
  $('aig59-capture').disabled=true;
  $('aig59-status').textContent='5.9 真動畫自動避讓 BLOCKED：'+err.message+
   '；原 5.8、5.7 GLB 與故事／聲音／錄影來源均保留。';
 }finally{aig59Busy=false;aig59RefreshEnabled();}
});
$('aig59-capture').addEventListener('click',async()=>{
 if(aig59Busy||!aig59Report||!view||
  sourceSha!==aig59Report.selectedGLBSHA256){
  $('aig59-status').textContent='5.9 來源 SHA／模型或 GPU 不一致，禁止擷取冒用畫面。';return;
 }
 const report=aig59Report,sha=sourceSha,revision=aig59Epoch;
 aig59Busy=true;$('aig59-capture').disabled=true;
 $('aig59-status').textContent='5.9 正從真 GLB 的真正 WebGL 畫面擷取四姿態 × 四方向，非合成的平面假照片。';
 try{
  const result=await view.captureTimelineReview();
  if(revision!==aig59Epoch||report!==aig59Report||sourceSha!==sha||
     result.frames!==16||!result.image||result.image.type!=='image/png')
   throw Error('AIG59_VISUAL_SOURCE_OR_TRUE_FRAME_COUNT_CHANGED');
  report.actualWebGL16FrameCapture={
   sourceSHA256:sha,animationClipName:result.clipName,
   frameCount:result.frames,viewCount:4,
   poseFractions:[0,.25,.5,.75],captureFromRealGlTFAndWebGL:true,
   framePoseAudits:result.samples.map(v=>({timeSeconds:v.timeSeconds,
    views:v.views?.map(x=>x.key),actualGeometryAudit:v.audit})),
   originalReferenceFacePhotographicMatchNotVerified:true,
   visualHumanApproval:false};
  aig47Download(result.image,
   'AIG-5.9-ACTUAL-GLB-ANIMATION-16-VIEW-NOT-HEROINE-APPROVED.png','image/png');
  $('aig59-status').textContent='5.9 已擷取真 WebGL 動畫 16 格 PNG，含同源 SHA 與姿態檢查；沒有宣稱臉型還原、零穿模或手機／Windows 60 FPS。';
 }catch(err){
  if(report===aig59Report)report.actualWebGL16FrameCapture=null;
  $('aig59-status').textContent='5.9 真 WebGL 截圖 BLOCKED：'+err.message+
   '；先前來源 GLB／接觸量測未變。';
 }finally{
  aig59Busy=false;aig59RefreshEnabled();
  $('aig59-capture').disabled=!aig59Report||!view||
   sourceSha!==aig59Report.selectedGLBSHA256;
 }
});
$('aig59-report').addEventListener('click',()=>{
 if(aig59Report&&(!view||sourceSha===aig59Report.selectedGLBSHA256))
  aig47Download(JSON.stringify(aig59Report,null,2),
   'AIG-5.9-REAL-POSE-AUTO-FIT-25-POSE-GLB-SHA-NOT-APPROVED.json',
   'application/json');
 else $('aig59-status').textContent='工作區 GLB SHA 已改變，5.9 上次風險報告不可再沿用。';
});


let aig60Report=null,aig60Revision=0,aig60Busy=false,aig60ImageFile=null,
 aig60SourceSha=null,aig60Dimensions=null,aig60Bitmap=null,aig60Marks={};
const aig60Photo=$('aig60-marks');
function aig60Invalidate(message='6.0 原始照片或 5.9 GLB 已更改，臉部校準驗收失效。'){
 aig61Invalidate('原圖或 5.9 模型已變更，6.1 快速掃描建議點與人工審查失效。');
 ++aig60Revision;aig60Report=null;aig60ImageFile=null;
 aig60SourceSha=null;aig60Dimensions=null;aig60Marks={};
 if(aig60Bitmap){aig60Bitmap.close?.();aig60Bitmap=null;}
 aig60Photo.style.display='none';
 for(const id of ['aig60-build','aig60-report','aig60-capture','aig60-reset'])
  $(id).disabled=true;
 $('aig60-status').textContent=message;
}
function aig60RefreshEnabled(){
 const valid=!!aig54Report&&!!aig59Report&&!aig60Busy&&!aig59Busy&&
  aig59Report.sourceImageSHA256===aig54Report.sourceImageSHA256&&
  aig55Scaffold?.sourceSHA256===aig54Report.sourceImageSHA256;
 $('aig60-photo-load').disabled=!valid;
 $('aig60-build').disabled=!valid||!aig60Bitmap||
  Object.keys(aig60Marks).length!==AIG60_MARKS.length||
  (!!aig61Proposal&&!aig61Review);
 aig61RefreshEnabled();
 return valid;
}
function aig60DrawSourceMarks(){
 if(!aig60Bitmap||!aig60Dimensions)return;
 const canvas=aig60Photo,ctx=canvas.getContext('2d');
 ctx.clearRect(0,0,canvas.width,canvas.height);
 ctx.drawImage(aig60Bitmap,0,0,canvas.width,canvas.height);
 const r=Math.max(5,Math.min(canvas.width,canvas.height)*.008);
 ctx.lineWidth=r*.55;ctx.font='bold '+Math.round(r*2.8)+'px sans-serif';
 for(const [i,label] of AIG60_MARKS.entries()){
  const p=aig60Marks[label];if(!p)continue;
  ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);
  ctx.strokeStyle='#05070d';ctx.stroke();
  ctx.fillStyle='#6ff5f9';ctx.fill();
  ctx.fillStyle='#05070d';ctx.fillText((i+1)+':'+label,p.x+r+3,p.y-r-4);
 }
}
function aig60MarkStatus(){
 const count=Object.keys(aig60Marks).length;
 const next=AIG60_MARKS[count];
 if(next){
  $('aig60-status').textContent='照片已在本機核對同一 SHA。請點照片的「'+next+
   '」位置（'+(count+1)+'/6）。標定座標取自原始像素，不是 AI 猜測。';
 }else{
  try{
   const measured=calibrateAIG60FaceMarks({
    imageWidth:aig60Dimensions.width,imageHeight:aig60Dimensions.height,
    sourceImageSHA256:aig60SourceSha,marks:aig60Marks
   });
   $('aig60-status').textContent='六點真照片比例已核對，眼距／臉長 '+
    measured.realPixelMeasured2DProportions.eyeSpanByFaceHeight.toFixed(3)+
    '。可生成 3D 臉部校準 GLB；未測到的背面深度仍為推估。';
  }catch(e){
   $('aig60-status').textContent='六點順序或比例不合法：'+e.message+
    '。請按「重設六點標記」，重新從額頭點起，不會造假或自動修正量測。';
  }
 }
 aig60RefreshEnabled();
}
$('aig60-photo').addEventListener('change',()=>{
 aig60Invalidate('來源照片選取已變更，舊六點／GLB 報告隔離。請重新核對同源 SHA。');
 aig60RefreshEnabled();
});
$('aig60-photo-load').addEventListener('click',async()=>{
 if(!aig60RefreshEnabled())return;
 const file=$('aig60-photo').files?.[0];
 if(!file||file.size<100||file.size>20*1024*1024){
  $('aig60-status').textContent='請選擇原照片 JPEG/PNG，檔案大小不得超過 20 MB。';return;
 }
 const revision=++aig60Revision;
 aig60Busy=true;$('aig60-photo-load').disabled=true;
 try{
  const bytes=await file.arrayBuffer(),photoSha=await sha256Bytes(bytes);
  if(photoSha!==aig54Report.sourceImageSHA256||
   photoSha!==aig59Report.sourceImageSHA256)
   throw Error('AIG60_ORIGINAL_PHOTO_SHA_DOES_NOT_MATCH_VERIFIED_SOURCE');
  const image=await createImageBitmap(file);
  if(image.width<128||image.height<128||image.width>12000||image.height>12000){
   image.close?.();throw Error('AIG60_IMAGE_DIMENSIONS_INVALID');
  }
  if(revision!==aig60Revision||photoSha!==aig54Report?.sourceImageSHA256){
   image.close?.();throw Error('AIG60_IMAGE_CHANGED_DURING_LOAD');
  }
  if(aig60Bitmap)aig60Bitmap.close?.();
  aig60Bitmap=image;aig60ImageFile=file;aig60SourceSha=photoSha;
  aig60Dimensions={width:image.width,height:image.height};
  aig60Marks={};
  aig60Photo.width=image.width;aig60Photo.height=image.height;
  aig60Photo.style.display='block';
  $('aig60-reset').disabled=false;
  aig60DrawSourceMarks();aig60MarkStatus();
 }catch(e){
  aig60ImageFile=null;aig60Bitmap=null;
  $('aig60-status').textContent='6.0 原照片校準 BLOCKED：'+e.message;
 }finally{aig60Busy=false;aig60RefreshEnabled();}
});
aig60Photo.addEventListener('pointerdown',event=>{
 if(aig61Capturing!==null||aig61EditKey){
  aig61HandleCanvasPointer(event);return;
 }
 if(aig60Busy||!aig60Bitmap||Object.keys(aig60Marks).length>=AIG60_MARKS.length)return;
 const box=aig60Photo.getBoundingClientRect();
 if(box.width<=0||box.height<=0)return;
 const x=(event.clientX-box.left)/box.width*aig60Photo.width;
 const y=(event.clientY-box.top)/box.height*aig60Photo.height;
 if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||y<0||
  x>=aig60Photo.width||y>=aig60Photo.height)return;
 const key=AIG60_MARKS[Object.keys(aig60Marks).length];
 aig60Marks[key]={x,y};
 aig60DrawSourceMarks();aig60MarkStatus();
 event.preventDefault();
});
$('aig60-reset').addEventListener('click',()=>{
 if(!aig60Bitmap)return;
 aig61Invalidate('已重設原圖六點，6.1 快速掃描建議點不再有效。');
 aig60Marks={};aig60Report=null;
 $('aig60-capture').disabled=true;$('aig60-report').disabled=true;
 aig60DrawSourceMarks();aig60MarkStatus();
});
$('aig60-build').addEventListener('click',async()=>{
 if(!aig60RefreshEnabled()||!aig60ImageFile||
  Object.keys(aig60Marks).length!==AIG60_MARKS.length)return;
 const revision=++aig60Revision,source=aig54Report,base59=aig59Report;
 const scaffold=aig55Scaffold,originalFile=aig60ImageFile;
 aig60Busy=true;$('aig60-build').disabled=true;
 $('aig60-report').disabled=true;$('aig60-capture').disabled=true;
 $('aig60-status').textContent='從原照片六點像素量測更新真 3D 臉部網格、骨架回讀，再執行 45 個不同時間點的三角面取樣。';
 try{
  const originalBytes=await originalFile.arrayBuffer();
  if(await sha256Bytes(originalBytes)!==source.sourceImageSHA256)
   throw Error('AIG60_IMAGE_BYTES_CHANGED');
  const measured=calibrateAIG60FaceMarks({
   imageWidth:aig60Dimensions.width,imageHeight:aig60Dimensions.height,
   sourceImageSHA256:source.sourceImageSHA256,marks:aig60Marks
  });
  const sourceModel=generateAIG58FittedTechnical(scaffold,base59.selectedProfile);
  const sourceGLBSHA=await sha256Bytes(sourceModel.bytes);
  if(sourceGLBSHA!==base59.selectedGLBSHA256)
   throw Error('AIG60_PARENT59_GLBSHA_CHANGED');
  const fitted=fitAIG60MeasuredFaceGLB({
   baseGLB:sourceModel.bytes,baseGLBSHA256:sourceGLBSHA,
   sourceImageSHA256:source.sourceImageSHA256,calibration:measured
  });
  const fittedSHA=await sha256Bytes(fitted.bytes);
  const parsed=await parseRiggedGLB(fitted.bytes.buffer);
  const boneAudit=await auditAIG50FullBody(parsed,{sourceSHA256:fittedSHA});
  if(boneAudit.outcome!=='STRUCTURAL_QA_PASS_ONLY'||
   boneAudit.clipsAvailable!==5||boneAudit.skinnedMeshCount!==9)
   throw Error('AIG60_REAL_GLTF_SKIN_QA_BLOCKED');
  const denser=await auditAIG60DenseAnimation(parsed,{
   sourceSHA256:fittedSHA,maxClips:5
  });
  if(revision!==aig60Revision||source!==aig54Report||
    base59!==aig59Report||scaffold!==aig55Scaffold)
   throw Error('AIG60_SOURCE_OR_MARKS_CHANGED_DURING_BUILD');
  const {bytes:discardBytes,...sourceEvidence}=fitted;
  const report={schema:AIG60_SCHEMA,sourceImageSHA256:source.sourceImageSHA256,
   parent59GLBSHA256:sourceGLBSHA,generatedGLBSHA256:fittedSHA,
   generatedGLBBytes:fitted.bytes.byteLength,
   measuredOriginalPhotoLandmarks:measured,
   candidateAssistant61UserReview:aig61Review ? {schema:AIG61_SCHEMA,
    sourceImageSHA256:aig61Review.sourceImageSHA256,
    manualCorrections:aig61Review.manualCorrections,
    sourceApproval:aig61Review.sourceApproval,
    priorUnapprovedPixelConfidence:aig61Proposal?.pixelEvidence,
    originalPhotoIdentityAnd3DDepthNotApproved:true}:null,
   actualReal3DFaceMeshEvidence:sourceEvidence,
   bodyBoneAndSkinQA:{outcome:boneAudit.outcome,
    bones:boneAudit.boneCount,meshes:boneAudit.skinnedMeshCount,
    clips:boneAudit.clipsAvailable},
   dense45TimePoseTriangleSAT:denser,
   visual16Frame:null,
   originalPhotoImagePerspectiveAndDepthUnmeasured:true,
   face2DProportionMeasuredNotPhotorealLikenessCertified:true,
   nativeAndroidWindows60FPSMeasured:false,
   formalHeroineAppearanceApproved:false,releaseAllowed:false};
  aig47Download(fitted.bytes,
   'AIG-6.0-MEASURED-PHOTO-FACE-17BONE-SKIN-TECHNICAL.glb','model/gltf-binary');
  let preview='真 GLB 已產出；瀏覽器 3D GPU 目前無法驗證。';
  if(view){
   try{
    await load(fitted.bytes.buffer,false,{technical:true});
    if(sourceSha!==fittedSHA)throw Error('AIG60_VIEWER_GLBSHA_CHANGED');
    aig50Revision++;aig50Report=boneAudit;aig50Parsed=parsed;
    aig51Reset('6.0 已更換校準後真 GLB，原 5.1 穿模／接縫報告失效。');
    aig52Invalidate('6.0 真 GLB 已載入，16 格視覺與 FPS 須重新實測。');
    aig52RefreshAvailable();$('aig52-load').disabled=true;
    $('aig50-report').disabled=false;
    preview='已載入真 WebGL 3D 工作區，可播放原五段動畫並擷取真畫面。';
   }catch(e){preview='真 GLB 已保存；播放器驗證隔離：'+e.message;}
  }
  if(revision!==aig60Revision||source!==aig54Report||
   base59!==aig59Report)throw Error('AIG60_SOURCE_CHANGED_AFTER_PREVIEW');
  aig60Report=report;$('aig60-report').disabled=false;
  $('aig60-capture').disabled=!view||sourceSha!==fittedSHA;
  $('aig60-status').textContent='6.0 '+boneAudit.outcome+
   '；照片六點已對位真臉部三角面 '+fitted.geometryMovedRealSkinnedFaceVertices+
   ' 頂點。動畫 45 時點的裙裝接觸 '+denser.skirtBodyContactsAcrossDistinctSamples+
   '、馬尾接觸 '+denser.hairBodyContactsAcrossDistinctSamples+
   '；結果 '+denser.outcome+'。'+preview+
   ' 人物身份／未見深度／原生 60 FPS 仍未核准。';
 }catch(e){
  aig60Report=null;$('aig60-report').disabled=true;
  $('aig60-status').textContent='6.0 真照片臉型／3D GLB QA BLOCKED：'+e.message+
   '；原照片、5.9 GLB、台詞、聲音、影片資料不覆蓋。';
 }finally{aig60Busy=false;aig60RefreshEnabled();}
});
$('aig60-capture').addEventListener('click',async()=>{
 if(!aig60Report||!view||sourceSha!==aig60Report.generatedGLBSHA256)return;
 const report=aig60Report,revision=aig60Revision,sha=sourceSha;
 aig60Busy=true;$('aig60-capture').disabled=true;
 try{
  const images=await view.captureTimelineReview();
  if(report!==aig60Report||revision!==aig60Revision||sha!==sourceSha||
     images.frames!==16||images.image?.type!=='image/png')
   throw Error('AIG60_REAL_GLTF_VISUAL_SOURCE_CHANGED');
  report.visual16Frame={sourceGLBSHA256:sha,
   animationClipName:images.clipName,
   actualRenderedViews:16,
   sampledPositions:[0,.25,.5,.75],actualWebGLCapture:true,
   referencePhotoPhotorealFaceReviewCompleted:false,
   nativeGpu60fpsVerified:false};
  aig47Download(images.image,
   'AIG-6.0-REAL-PHOTO-CALIBRATED-GLB-16-VIEWS-NOT-APPROVED.png','image/png');
  $('aig60-status').textContent='6.0 校準 GLB 真 16 格 PNG 已擷取；照片比對仍須人工外觀審查，這不代表完整動畫零穿模。';
 }catch(e){
  if(report===aig60Report)report.visual16Frame=null;
  $('aig60-status').textContent='6.0 真 WebGL 影像驗證 BLOCKED：'+e.message;
 }finally{
  aig60Busy=false;
  $('aig60-capture').disabled=!aig60Report||!view||
   sourceSha!==aig60Report.generatedGLBSHA256;
 }
});
$('aig60-report').addEventListener('click',()=>{
 if(aig60Report&&(!view||sourceSha===aig60Report.generatedGLBSHA256))
  aig47Download(JSON.stringify(aig60Report,null,2),
   'AIG-6.0-REAL-PHOTO-PIXEL-FACE-POSE-GLB-SHA-NOT-APPROVED.json','application/json');
 else $('aig60-status').textContent='6.0 真播放器 GLB SHA 不一致，舊來源校準報告已隔離。';
});


let aig61Capturing=null,aig61Proposal=null,aig61Review=null,aig61EditKey=null,
 aig61Corrections={},aig61Task=0;
function aig61Invalidate(message='6.1 已清除舊照片像素候選；可用原圖重新掃描。'){
 ++aig61Task;aig61Capturing=null;aig61Proposal=null;aig61Review=null;
 aig61EditKey=null;aig61Corrections={};
 for(const id of ['aig61-edit','aig61-accept','aig61-edit-select'])$(id).disabled=true;
 $('aig61-status').textContent=message;
}
function aig61RefreshEnabled(){
 const ready=!!aig60Bitmap&&!!aig60SourceSha&&!!aig54Report&&!!aig59Report&&
  !aig60Busy&&!aig59Busy&&
  aig60SourceSha===aig54Report.sourceImageSHA256&&
  aig60SourceSha===aig59Report.sourceImageSHA256;
 $('aig61-assist').disabled=!ready;
 const reviewing=ready&&!!aig61Proposal;
 $('aig61-edit-select').disabled=!reviewing;
 $('aig61-edit').disabled=!reviewing;
 $('aig61-accept').disabled=!reviewing||!!aig61EditKey||!!aig61Capturing;
 return ready;
}
function aig61HandleCanvasPointer(event){
 if(aig60Busy||!aig60Bitmap||!aig61RefreshEnabled())return;
 const rect=aig60Photo.getBoundingClientRect();
 if(rect.width<=0||rect.height<=0)return;
 const x=(event.clientX-rect.left)/rect.width*aig60Photo.width;
 const y=(event.clientY-rect.top)/rect.height*aig60Photo.height;
 if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||y<0||
    x>=aig60Photo.width||y>=aig60Photo.height)return;
 event.preventDefault();
 if(aig61EditKey){
  const key=aig61EditKey;aig61EditKey=null;
  ++aig61Task;
  aig61Corrections[key]={x,y};aig60Marks[key]={x,y};aig61Review=null;
  aig60Report=null;$('aig60-report').disabled=true;
  $('aig60-capture').disabled=true;
  aig60DrawSourceMarks();
  $('aig61-status').textContent='已人工修正 '+key+
   ' 的實際原圖像素位置；須重新按「已逐點檢視並確認六點」才可生成新 GLB。';
  aig61RefreshEnabled();aig60RefreshEnabled();return;
 }
 if(aig61Capturing===null||aig61Capturing.length>=2)return;
 aig61Capturing.push({x,y});
 if(aig61Capturing.length===1){
  const ctx=aig60Photo.getContext('2d');
  ctx.beginPath();ctx.arc(x,y,Math.max(6,aig60Photo.width*.009),0,Math.PI*2);
  ctx.strokeStyle='#72f6df';ctx.lineWidth=5;ctx.stroke();
  $('aig61-status').textContent='已標記額頭，請點原照片下巴位置。';
  return;
 }
 const anchors=[...aig61Capturing];aig61Capturing=null;
 // Reload the original unannotated bitmap before reading any pixels;
 // UI cursor strokes must NEVER influence the face contrast detector.
 aig60DrawSourceMarks();
 try{
  const pixels=aig60Photo.getContext('2d',{willReadFrequently:true})
   .getImageData(0,0,aig60Photo.width,aig60Photo.height);
  const proposed=proposeAIG61LocalLandmarks({
   imageData:pixels.data,imageWidth:pixels.width,imageHeight:pixels.height,
   sourceImageSHA256:aig60SourceSha,forehead:anchors[0],chin:anchors[1]
  });
  aig61Proposal=proposed;aig61Corrections={};aig61Review=null;
  aig60Marks=Object.fromEntries(AIG60_MARKS.map(k=>[
   k,{...proposed.suggestedMarks[k]}
  ]));
  aig60DrawSourceMarks();
  $('aig61-status').textContent='依原圖對比找到六個候選點，低對比候選：'+
   (proposed.weakMarkKeys.join('、')||'無')+
   '。請逐點看圖，必要時選擇標記進行修正，再人工確認；尚未核准臉部相貌。';
 }catch(error){
  aig61Proposal=null;aig61Review=null;aig60Marks={};
  aig60DrawSourceMarks();
  $('aig61-status').textContent='6.1 自動輔助 BLOCKED：'+error.message+
   '。原圖可改用 6.0 手動六點標記，沒有採用猜測的照片特徵。';
 }
 aig61RefreshEnabled();aig60RefreshEnabled();
}
$('aig61-assist').addEventListener('click',()=>{
 if(!aig61RefreshEnabled())return;
 ++aig61Task;aig61Capturing=[];aig61Proposal=null;aig61Review=null;
 aig61EditKey=null;aig61Corrections={};aig60Marks={};aig60Report=null;
 $('aig60-report').disabled=true;$('aig60-capture').disabled=true;
 aig60DrawSourceMarks();aig61RefreshEnabled();aig60RefreshEnabled();
 $('aig61-status').textContent='6.1 本機掃描模式：請先點照片額頭，再點下巴。' +
  '只會在兩點限定的臉部區域分析照片原始像素，不呼叫付費或雲端服務。';
});
$('aig61-edit').addEventListener('click',()=>{
 if(!aig61Proposal||!aig61RefreshEnabled())return;
 ++aig61Task;
 aig61EditKey=$('aig61-edit-select').value;
 if(!AIG60_MARKS.includes(aig61EditKey)){aig61EditKey=null;return;}
 aig61Review=null;$('aig60-build').disabled=true;
 $('aig61-accept').disabled=true;
 $('aig61-status').textContent='請在真照片重新點選 '+aig61EditKey+
  '，取代偵測的陰影／眼鼻嘴候選；完成後還須重新人工確認。';
});
$('aig61-accept').addEventListener('click',async()=>{
 if(!aig61Proposal||!aig61RefreshEnabled()||aig61EditKey||aig61Capturing)return;
 const task=++aig61Task,source=aig60SourceSha,file=aig60ImageFile;
 $('aig61-accept').disabled=true;
 try{
  if(!file||await sha256Bytes(await file.arrayBuffer())!==source)
   throw Error('AIG61_VERIFIED_ORIGINAL_BYTES_CHANGED');
  const reviewed=acceptAIG61ReviewedProposal(aig61Proposal,{
   imageWidth:aig60Dimensions.width,imageHeight:aig60Dimensions.height,
   sourceImageSHA256:source,userConfirmed:true,corrections:aig61Corrections
  });
  if(task!==aig61Task||source!==aig60SourceSha)
   throw Error('AIG61_REVIEW_SOURCE_CHANGED');
  aig61Review=reviewed;
  aig60Marks=structuredClone(reviewed.reviewedMarks);
  aig60DrawSourceMarks();aig60MarkStatus();
  $('aig61-status').textContent='已由使用者逐點檢視確認六點（人工修正 '+
   reviewed.manualCorrections.length+' 點），接回 6.0 真照片比例→真 GLB 校準。' +
   '自動建議的準確度未經人工標準資料集驗證；仍非正式人物相貌核准。';
 }catch(error){
  aig61Review=null;$('aig61-status').textContent='6.1 人工審查 BLOCKED：'+error.message+
   '。可修正六點或恢復 6.0 手動標記。';
 }finally{aig61RefreshEnabled();aig60RefreshEnabled();}
});


let aig62Evidence=null,aig62ObjectURL=null,aig62Revision=0;
function aig62Reset(message='6.2 請重新核對入庫校園制服視覺圖資。'){
 aig63Reset('6.2 圖片或 SHA 已改變，6.3 畫面與校園參考比對失效。');
 ++aig62Revision;aig62Evidence=null;
 $('aig62-report').disabled=true;
 if(aig62ObjectURL){URL.revokeObjectURL(aig62ObjectURL);aig62ObjectURL=null;}
 const img=$('aig62-preview');img.hidden=true;img.removeAttribute('src');
 $('aig62-status').textContent=message;
}
$('aig62-file').addEventListener('change',()=>aig62Reset());
$('aig62-select').addEventListener('change',()=>aig62Reset());
$('aig62-verify').addEventListener('click',async()=>{
 const file=$('aig62-file').files?.[0],id=$('aig62-select').value;
 if(!file||!AIG62_REFERENCES.some(x=>x.id===id)){
  $('aig62-status').textContent='請選擇入庫的原始圖檔，不能用不同圖片冒充造型來源。';return;
 }
 const rev=++aig62Revision;
 $('aig62-verify').disabled=true;$('aig62-report').disabled=true;
 aig63Reset('重新核對校園圖資，原 6.3 參考裁切與真畫面不能沿用。');
 let decoded=null;
 try{
  const raw=await file.arrayBuffer(),sha=await sha256Bytes(raw);
  const sig=new Uint8Array(raw,0,Math.min(raw.byteLength,12));
  const jpg=sig[0]===255&&sig[1]===216&&sig[2]===255;
  const png=[137,80,78,71,13,10,26,10].every((v,i)=>sig[i]===v);
  if(!jpg&&!png)throw Error('AIG62_UNSUPPORTED_FILE_SIGNATURE');
  decoded=await createImageBitmap(file);
  const evidence=verifyAIG62ReferenceFile({id,fileSHA256:sha,
   fileBytes:raw.byteLength,width:decoded.width,height:decoded.height,
   mime:jpg?'image/jpeg':'image/png'});
  if(rev!==aig62Revision||id!==$('aig62-select').value||
     file!==$('aig62-file').files?.[0])throw Error('AIG62_STALE_REFERENCE_SELECTION');
  aig62Evidence=evidence;
  if(aig62ObjectURL)URL.revokeObjectURL(aig62ObjectURL);
  aig62ObjectURL=URL.createObjectURL(file);
  const image=$('aig62-preview');image.src=aig62ObjectURL;image.hidden=false;
  $('aig62-report').disabled=false;
  aig63Refresh();
  $('aig62-status').textContent='校園女主角 2D 視覺參考已核對：'+
   sha.slice(0,12)+'，'+decoded.width+'×'+decoded.height+
   '。這不是 3D GLB；其他動畫服裝（含泳裝）均保留。';
 }catch(e){
  aig62Reset('6.2 來源核對 BLOCKED：'+e.message+
   '。不會改動角色 GLB、任何服裝、劇情或動畫。');
 }finally{decoded?.close?.();$('aig62-verify').disabled=false;}
});
$('aig62-report').addEventListener('click',()=>{
 if(!aig62Evidence)return;
 aig47Download(JSON.stringify({schema:AIG62_SCHEMA,reference:aig62Evidence,
  libraryFolder:'/AIG FastModel/女主角正式圖資/2026-10-21',
  actualImageBinaryEmbeddedInDeployedSite:false,
  modelGLBAutomaticallyApproved:false,
  otherAnimationCostumesPreserved:true,
  currentSwimwearAssetsDeleted:false,
  releaseAllowed:false
 },null,2),'AIG-6.2-SCHOOL-VISUAL-REFERENCE-NOT-GLB.json','application/json');
});


let aig63Revision=0,aig63Busy=false,aig63Bitmap=null,aig63ReferencePixels=null,
 aig63ROI=null,aig63Drag=null,aig63Report=null,aig63PNG=null,aig63ModelSHA=null;
const aig63Canvas=$('aig63-reference-canvas'),aig63Compare=$('aig63-compare-canvas');
function aig63Reset(message='6.3 參考圖／GLB 已改變，請重新建立真渲染比較。'){
 ++aig63Revision;aig63Busy=false;aig63ROI=null;aig63Drag=null;
 aig63Report=null;aig63PNG=null;aig63ModelSHA=null;
 if(aig63Bitmap){aig63Bitmap.close?.();aig63Bitmap=null;}
 aig63ReferencePixels=null;
 aig63Canvas.hidden=true;aig63Compare.hidden=true;
 for(const id of ['aig63-capture','aig63-image','aig63-report'])$(id).disabled=true;
 $('aig63-status').textContent=message;
 aig63Refresh();
}
function aig63Refresh(){
 const valid=!!aig62Evidence&&!!aig62ObjectURL&&!aig63Busy;
 $('aig63-prepare').disabled=!valid;
 $('aig63-capture').disabled=!valid||!aig63ROI||!view?.model||
  !view.animation?.clips?.length||view.reviewBusy||view.movieMode;
 $('aig63-image').disabled=!aig63PNG||aig63ModelSHA!==sourceSha;
 $('aig63-report').disabled=!aig63Report||aig63ModelSHA!==sourceSha;
 return valid;
}
function aig63PaintROI(){
 if(!aig63Bitmap)return;
 const ctx=aig63Canvas.getContext('2d');
 ctx.clearRect(0,0,aig63Canvas.width,aig63Canvas.height);
 ctx.drawImage(aig63Bitmap,0,0);
 const box=aig63Drag?.box||aig63ROI;
 if(box){
  ctx.strokeStyle='#7cf9f3';ctx.lineWidth=Math.max(3,aig63Canvas.width*.0035);
  ctx.setLineDash([12,7]);ctx.strokeRect(box.x,box.y,box.width,box.height);
  ctx.setLineDash([]);
 }
}
function aig63PointerPoint(e){
 const r=aig63Canvas.getBoundingClientRect();
 if(r.width<1||r.height<1)return null;
 const x=(e.clientX-r.left)/r.width*aig63Canvas.width;
 const y=(e.clientY-r.top)/r.height*aig63Canvas.height;
 if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||y<0||
    x>=aig63Canvas.width||y>=aig63Canvas.height)return null;
 return {x,y};
}
aig63Canvas.addEventListener('pointerdown',e=>{
 if(aig63Busy||!aig63Bitmap)return;
 const p=aig63PointerPoint(e);if(!p)return;
 aig63Drag={start:p,box:{x:p.x,y:p.y,width:0,height:0}};
 aig63ROI=null;aig63Report=null;aig63PNG=null;
 aig63Canvas.setPointerCapture?.(e.pointerId);
 aig63Refresh();e.preventDefault();
});
aig63Canvas.addEventListener('pointermove',e=>{
 if(!aig63Drag)return;
 const point=aig63PointerPoint(e);if(!point)return;
 const start=aig63Drag.start;
 aig63Drag.box={x:Math.min(start.x,point.x),y:Math.min(start.y,point.y),
  width:Math.abs(start.x-point.x),height:Math.abs(start.y-point.y)};
 aig63PaintROI();e.preventDefault();
});
aig63Canvas.addEventListener('pointerup',e=>{
 if(!aig63Drag)return;
 const box=aig63Drag.box;aig63Drag=null;
 if(box.width>=24&&box.height>=24){
  aig63ROI={x:Math.floor(box.x),y:Math.floor(box.y),
   width:Math.floor(box.width),height:Math.floor(box.height)};
  $('aig63-status').textContent='已框選真 2D 圖資：'+
   aig63ROI.width+'×'+aig63ROI.height+
   ' 原始像素；請確保是完整人物而非同張圖中多個人／多個模型。';
 }else $('aig63-status').textContent='框選區域太小；請拖曳至少 24×24 像素的人物範圍。';
 aig63PaintROI();aig63Refresh();e.preventDefault();
});
aig63Canvas.addEventListener('pointercancel',()=>{
 aig63Drag=null;aig63PaintROI();aig63Refresh();
});
$('aig63-prepare').addEventListener('click',async()=>{
 if(!aig63Refresh())return;
 const revision=++aig63Revision,id=aig62Evidence.referenceId,
  visual=aig62Evidence,file=$('aig62-file').files?.[0];
 if(!file)return;
 aig63Busy=true;$('aig63-prepare').disabled=true;
 $('aig63-status').textContent='6.3 正核對校園圖資原始檔案並讀取原始像素，供人物局部框選。';
 let bitmap=null;
 try{
  const digest=await sha256Bytes(await file.arrayBuffer());
  if(digest!==visual.sourceImageSHA256)
   throw Error('AIG63_REFERENCE_SOURCE_SHA_MISMATCH');
  bitmap=await createImageBitmap(file);
  if(bitmap.width!==visual.pixelDimensions[0]||
   bitmap.height!==visual.pixelDimensions[1])
   throw Error('AIG63_REFERENCE_SOURCE_DIMENSIONS_CHANGED');
  if(revision!==aig63Revision||id!==aig62Evidence?.referenceId)
   throw Error('AIG63_REFERENCE_CHANGED_WHILE_DECODING');
  aig63Bitmap?.close?.();aig63Bitmap=bitmap;bitmap=null;
  aig63ROI=null;aig63ReferencePixels=null;
  aig63Canvas.width=aig63Bitmap.width;aig63Canvas.height=aig63Bitmap.height;
  aig63Canvas.hidden=false;aig63PaintROI();
  // Snapshot ONLY the original, unannotated pixels; future ROI borders
  // must not influence the actual image-difference metrics.
  aig63ReferencePixels=aig63Canvas.getContext('2d',{willReadFrequently:true})
   .getImageData(0,0,aig63Canvas.width,aig63Canvas.height);
  $('aig63-status').textContent='已核對 '+id+
   ' 的來源 SHA；請在原圖拖曳框選一個完整人物，再比對真 GLB 正面。';
 }catch(err){
  $('aig63-status').textContent='6.3 2D 原圖核對 BLOCKED：'+err.message;
  aig63Canvas.hidden=true;
 }finally{bitmap?.close?.();aig63Busy=false;aig63Refresh();}
});
$('aig63-capture').addEventListener('click',async()=>{
 if(!aig63Refresh()||!aig63ROI||!aig63ReferencePixels||!view?.model||
    !/^[a-f0-9]{64}$/i.test(sourceSha||''))return;
 const currentReference=aig62Evidence,roi={...aig63ROI},
  currentModel=view.model,sha=sourceSha,revision=++aig63Revision;
 aig63Busy=true;$('aig63-capture').disabled=true;
 $('aig63-status').textContent='正在核對真正 SkinnedMesh、擷取實際 WebGL 正面姿態，計算兩張真影像的像素色彩與輪廓差異。';
 let rendered=null;
 try{
  const geometry=auditAIG63SchoolModelActualGLTF({
   scene:view.model,animations:view.animation?.clips||[]
  },{modelGLBSHA256:sha});
  if(!geometry.schoolOutfitMeshesPresent)
   throw Error('AIG63_NOT_THE_ACTUAL_SKINNED_SCHOOL_CHARACTER_GLB');
  const screenshot=await view.captureHeroineReview({fraction:0});
  if(screenshot.image?.type!=='image/png'||screenshot.views?.length!==4||
    screenshot.views[0]?.key!=='positive-z'||!screenshot.audit)
   throw Error('AIG63_NO_REAL_WEBGL_FRONT_QA');
  const pngSHA=await sha256Bytes(await screenshot.image.arrayBuffer());
  rendered=await createImageBitmap(screenshot.image);
  if(rendered.width!==960||rendered.height!==720)
   throw Error('AIG63_UNEXPECTED_RENDER_TILE_LAYOUT');
  const raster=document.createElement('canvas');
  raster.width=rendered.width;raster.height=rendered.height;
  const ctx=raster.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(rendered,0,0);
  const renderedROI={x:14,y:36,width:452,height:307};
  const differences=compareAIG63ActualImages({
   referenceImage:aig63ReferencePixels,
   renderedImage:ctx.getImageData(0,0,raster.width,raster.height),
   referenceROI:roi,renderedROI,
   referenceSHA256:currentReference.sourceImageSHA256,
   modelGLBSHA256:sha,capturedPngSHA256:pngSHA
  });
  if(revision!==aig63Revision||sha!==sourceSha||view.model!==currentModel||
   currentReference!==aig62Evidence)
   throw Error('AIG63_IMAGE_OR_GLB_CHANGED_WHILE_CAPTURING');
  const paired=bindAIG63Evidence({visual:differences,geometry,
    verifiedReference:currentReference});
  const canvas=aig63Compare;
  canvas.width=960;canvas.height=550;
  const c=canvas.getContext('2d');
  c.fillStyle='#020407';c.fillRect(0,0,canvas.width,canvas.height);
  c.drawImage(aig63Bitmap,roi.x,roi.y,roi.width,roi.height,12,45,462,480);
  c.drawImage(rendered,renderedROI.x,renderedROI.y,renderedROI.width,
   renderedROI.height,486,45,462,480);
  c.fillStyle='#e5f2fc';c.font='bold 20px sans-serif';
  c.fillText('6.2 核對 2D 圖片人物局部',12,30);
  c.fillText('6.3 真 GLB WebGL 正面渲染',486,30);
  const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?
   resolve(b):reject(Error('AIG63_COMPARE_PNG_EXPORT_FAILED')),'image/png'));
  if(revision!==aig63Revision||sha!==sourceSha||view.model!==currentModel)
   throw Error('AIG63_SOURCE_CHANGED_AFTER_IMAGE_EXPORT');
  aig63Report={...paired,actualCompositePNG_SHA256:await sha256Bytes(await blob.arrayBuffer()),
   actualReferenceRegionManuallySelected:true,realWebGLClipName:screenshot.clipName,
   scenePoseAudit:screenshot.audit,scenePoseAuditIncomplete:!!screenshot.audit.incomplete,
   realViewKeys:screenshot.views.map(x=>x.key),
   styleSheet2DStillNotAGLB:true,appearanceApprovedByHuman:false,releaseAllowed:false};
  aig63PNG=blob;aig63ModelSHA=sha;canvas.hidden=false;
  $('aig63-status').textContent='6.3 已從真來源渲染比較：參考圖／GLB SHA 各自保存。平均 RGB 差 '+differences.directMeanAbsoluteRGBDifference+
   '、輪廓梯度差 '+differences.edgeDensityDifference+
   '。此數字受背景／光照／姿勢影響，不是臉型相似率；尚待人工逐項檢查。';
 }catch(err){
  aig63Report=null;aig63PNG=null;aig63ModelSHA=null;
  aig63Compare.hidden=true;
  $('aig63-status').textContent='6.3 真校園 GLB 外觀比對 BLOCKED：'+err.message+
   '。原始動畫／服裝／照片不受影響。';
 }finally{rendered?.close?.();aig63Busy=false;aig63Refresh();}
});
$('aig63-image').addEventListener('click',()=>{
 if(aig63PNG&&aig63ModelSHA===sourceSha)
  aig47Download(aig63PNG,'AIG-6.3-VERIFIED-2D-VS-ACTUAL-SCHOOL-GLB.png','image/png');
});
$('aig63-report').addEventListener('click',()=>{
 if(aig63Report&&aig63ModelSHA===sourceSha&&aig62Evidence?.sourceImageSHA256===
  aig63Report.verifiedReferenceSHA256)
  aig47Download(JSON.stringify(aig63Report,null,2),
   'AIG-6.3-SCHOOL-2D-REAL-3D-PIXEL-SHA-QA-NOT-APPROVED.json','application/json');
 else $('aig63-status').textContent='6.3 參考圖／GLB SHA 已改變，不能沿用舊外觀報告。';
});


let aig64SingleBytes=null,aig64SingleReport=null,aig64SingleBusy=false,aig64SingleRevision=0;
function aig64SingleInvalidate(message='已變更輸入照片，上一個全身 GLB 不可再當成目前的來源。'){
 ++aig64SingleRevision;aig64SingleBytes=null;aig64SingleReport=null;
 $('aig64-single-motion-upgrade').disabled=true;
 $('aig64-single-download').disabled=true;
 $('aig64-single-report').disabled=true;
 $('aig64-single-status').textContent=message;
}
$('aig64-single-photo').addEventListener('change',()=>{
 aig64SingleInvalidate();
 $('aig64-single-build').disabled=aig64SingleBusy||
  !$('aig64-single-photo').files?.length;
});
$('aig64-subject-kind').addEventListener('change',()=>{
 aig64SingleInvalidate('生物來源已切換，之前的 GLB／分析報告已隔離，需重新計算。');
 const domain=$('aig64-subject-kind').value;
 $('aig64-single-build').textContent=domain==='HUMAN'?
  '單張照片 → 自動補全正常人體比例 → 真 GLB＋動畫':
  (domain==='ANIMAL'?'動物':'植物')+'｜只做真色彩／輪廓分析，禁止假人體 GLB';
 $('aig64-observation-status').textContent='主體類型已切換；不會自動把動物、植物當作人體模型。';
});
$('aig64-single-build').addEventListener('click',async()=>{
 if(aig64SingleBusy||!$('aig64-single-photo').files?.length)return;
 if(view?.movieMode){
  $('aig64-single-status').textContent='正在錄製影片。請在錄製完成後生成新全身模型，以免插入動作時間軸。';return;
 }
 const input=$('aig64-single-photo').files[0],revision=++aig64SingleRevision;
 aig64SingleBusy=true;aig64SingleBytes=null;aig64SingleReport=null;
 $('aig64-single-motion-upgrade').disabled=true;
 $('aig64-single-build').disabled=true;$('aig64-single-report').disabled=true;
 $('aig64-single-download').disabled=true;
 $('aig64-single-status').textContent=$('aig64-subject-kind').value==='HUMAN'?
  '正在從照片真像素推估可見頭肩，再依人體比例補齊技術模型；會明示推估部分。':
  '正在分析原始照片前景／色彩／輪廓，非人體不生成預設人體 GLB。';
 let bitmap=null;
 try{
  if(input.size<100||input.size>20*1024*1024)
   throw Error('AIG64_PHOTO_FILE_SIZE_OUT_OF_BOUNDS');
  const raw=await input.arrayBuffer(),sha=await sha256Bytes(raw);
  const sig=new Uint8Array(raw,0,Math.min(raw.byteLength,16));
  const jpeg=sig[0]===255&&sig[1]===216&&sig[2]===255,
   png=[137,80,78,71,13,10,26,10].every((v,i)=>sig[i]===v),
   webp=sig[0]===82&&sig[1]===73&&sig[2]===70&&sig[3]===70&&
    sig[8]===87&&sig[9]===69&&sig[10]===66&&sig[11]===80;
  if(!jpeg&&!png&&!webp)throw Error('AIG64_ONLY_ACTUAL_JPEG_PNG_WEBP');
  bitmap=await createImageBitmap(input);
  if(bitmap.width<128||bitmap.height<128||bitmap.width>12000||
   bitmap.height>12000)
   throw Error('AIG64_IMAGE_DIMENSION_OUT_OF_BOUNDS');
  // Work on the ORIGINAL decoded photo (optionally downscaled for memory).
  // Full-source SHA is never replaced by the smaller canvas SHA.
  const shrink=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));
  const cw=Math.max(128,Math.round(bitmap.width*shrink)),
   ch=Math.max(128,Math.round(bitmap.height*shrink));
  const raster=document.createElement('canvas');raster.width=cw;raster.height=ch;
  const ctx=raster.getContext('2d',{willReadFrequently:true});
  if(!ctx)throw Error('AIG64_ORIGINAL_IMAGE_PIXELS_NOT_READABLE');
  ctx.drawImage(bitmap,0,0,cw,ch);
  const image=ctx.getImageData(0,0,cw,ch);
  const domain=$('aig64-subject-kind').value;
  const observation=inspectAigSourceObservation({
   pixels:image.data,imageWidth:cw,imageHeight:ch,
   sourceImageSHA256:sha,domain
  });
  $('aig64-observation-status').textContent=
   '真像素分析｜'+domain+'｜'+observation.segmentationMethod+
   '｜取樣原色 RGB '+observation.measuredForegroundMedianRGB.join('/')+
   '｜可見輪廓 '+observation.observedSilhouetteBands.filter(
    v=>v.widthPixels!==null).length+'/11 列；身高／物種／材質彈性無法僅靠照片證實。';
  if(domain!=='HUMAN'){
   if(revision!==aig64SingleRevision||
      input!==$('aig64-single-photo').files?.[0])
    throw Error('AIG612_SOURCE_CHANGED_DURING_ANALYSIS');
   aig64SingleBytes=null;
   aig64SingleReport={
    schema:AIG_SOURCE_OBSERVATION_SCHEMA,sourceImageSHA256:sha,
    observedPixels:observation,requestedDomain:domain,
    actualAnimalOrPlant3DModelProduced:false,
    animalPlantPoseAndElasticPhysicsApproved:false,
    humanSkeletonMayNotBeSubstituted:true,releaseAllowed:false
   };
   $('aig64-single-motion-upgrade').disabled=true;
   $('aig64-single-download').disabled=true;
   $('aig64-single-report').disabled=false;
   $('aig64-single-status').textContent=
    '6.12 '+(domain==='PLANT'?'植物':'動物')+
    '照片分析已完成，可下載真像素／色彩／輪廓資料。該物種獨立建模與彈性引擎仍 BLOCKED；' +
    '不產生假人體 GLB，也不宣稱已識別物種或恢復看不見的構造。';
   return;
  }
  const analysis=analyzeAIG64PartialPortrait({
   pixels:image.data,imageWidth:cw,imageHeight:ch,
   sourceImageSHA256:sha
  });
  const output=generateAIG64SinglePartialFullbody({analysis});
  const actualSHA=await sha256Bytes(output.bytes);
  const parsed=await parseRiggedGLB(output.bytes.buffer);
  const qa=await auditAIG50FullBody(parsed,{sourceSHA256:actualSHA});
  const schools=auditAIG63SchoolModelActualGLTF(parsed,{modelGLBSHA256:actualSHA});
  if(qa.outcome!=='STRUCTURAL_QA_PASS_ONLY'||qa.boneCount!==17||
   qa.skinnedMeshCount!==9||qa.clipsAvailable!==5||
   !schools.schoolOutfitMeshesPresent)
   throw Error('AIG64_FULL_BODY_SKINNED_GLB_GEOMETRY_GATE_BLOCKED');
  if(revision!==aig64SingleRevision||
   input!==$('aig64-single-photo').files?.[0])
   throw Error('AIG64_INPUT_PHOTO_CHANGED_DURING_GENERATION');
  const {scaffold,...analysisForReport}=analysis;
  const report={
   schema:AIG64_AUTOBODY_SCHEMA,
   originalSinglePhotoSHA256:sha,
   originalPixelSize:[bitmap.width,bitmap.height],
   imagePixelsActuallySampled:[cw,ch],
   detectedPartialCoverage:analysis.photoCoverage,
   portraitAndHeadBoundsFromPixelContrast:analysis.detectedForegroundThumbnailBox,
   uncertainObservedShoulderWidth:analysis.widthToHeightModelRatio,
   estimatedHeadToWholeBodyRatio:analysis.headToBodyRatioPrior,
   inferredBodySectionsNotInOriginalPhoto:true,
   manuallyRequiredViews:0,manualFaceLandmarksRequired:0,
   automaticFullBodyGeneratedFromOnePhoto:true,
   generatedRealGLBSHA256:actualSHA,GLBBytes:output.bytes.byteLength,
   fullbodyQAOutcome:qa.outcome,realBoneCount:qa.boneCount,
   realSkinnedMeshes:qa.skinnedMeshCount,realAnimationClips:qa.clipsAvailable,
   realUniformAndHairParts:schools.visibleSchoolAccessories,
   sourceAnalysis:analysisForReport,
   actualPixelColourAndShapeObservation:observation,
   imageAnalysisMethod:'LOCAL_PIXEL_OBSERVATION_PLUS_HUMAN_TECHNICAL_PRIORS',
   sourceHeadShapeAndIdentityExact:false,
   allUnseenProportionsEstimatedNotPhotographicallyMeasured:true,
   allOriginalMovieVoiceAndOtherCostumesPreserved:true,
   nativeAndroidWindows60FPSMeasured:false,
   releaseAllowed:false
  };
  // Produce a usable GLB even on a mobile browser without a functioning GPU.
  // Renderer errors are isolated and do not destroy the successful file.
  let preview='真 GLB 可下載；尚未取得目前裝置 GPU 的 3D 預覽。';
  if(view){
   try{
    await load(output.bytes.buffer,false,{technical:true});
    if(sourceSha!==actualSHA)throw Error('AIG64_VIEWER_WRONG_GLBSHA');
    aig50Revision++;aig50Report=qa;aig50Parsed=parsed;
    aig51Reset('6.4 自動補全模型已載入；接縫、馬尾穿模須重新對新 GLB 取樣。');
    aig52Invalidate('6.4 單張照片模型已載入，16 幀動畫畫面及 FPS 請重新取樣。');
    aig52RefreshAvailable();$('aig52-load').disabled=true;
    $('aig50-report').disabled=false;
    preview='已載入真 3D 工作區，五段骨架動畫可操作。';
   }catch(err){preview='GPU 預覽隔離：'+err.message+'；GLB 仍可下載。';}
  }
  if(revision!==aig64SingleRevision||input!==$('aig64-single-photo').files?.[0])
   throw Error('AIG64_SOURCE_CHANGED_AFTER_PREVIEW');
  aig64SingleBytes=output.bytes;aig64SingleReport=report;
  $('aig64-single-motion-upgrade').disabled=false;
  $('aig64-single-download').disabled=false;
  $('aig64-single-report').disabled=false;
  $('aig64-single-status').textContent='6.4 已從單張 '+(
   analysis.photoCoverage==='HEAD_AND_UPPER_BODY_VISIBLE'?'上半身':'臉／頭部')+
   '照自動生完整全身 GLB：17 骨、9 個真蒙皮網格、5 段真動畫；不需要四面照片。'+
   preview+' 未拍到的真實身材及人物身份仍屬估算，非完全 3D 相貌還原。';
 }catch(err){
  aig64SingleBytes=null;aig64SingleReport=null;
  $('aig64-single-motion-upgrade').disabled=true;
  $('aig64-observation-status').textContent='照片分析／生成 BLOCKED：'+err.message;
  $('aig64-single-status').textContent='6.4 單張照片自動建模 BLOCKED：'+err.message+
   '。清楚的臉部或上半身照片即可重試，不必提供四視角；原動畫與服裝未更動。';
 }finally{
  bitmap?.close?.();aig64SingleBusy=false;
  $('aig64-single-build').disabled=!$('aig64-single-photo').files?.length;
 }
});
$('aig64-single-download').addEventListener('click',()=>{
 if(aig64SingleBytes&&aig64SingleReport)
  aig47Download(aig64SingleBytes,
   aig64SingleReport.realAnimationClips===7?
    'AIG-6.11-ONE-PHOTO-REAL-BILATERAL-RIGGED-MOTION-TECHNICAL.glb':
    'AIG-6.4-ONE-FACE-OR-UPPERBODY-TO-FULL-RIGGED-TECHNICAL.glb',
   'model/gltf-binary');
});
$('aig64-single-report').addEventListener('click',()=>{
 if(aig64SingleReport)
  aig47Download(JSON.stringify(aig64SingleReport,null,2),
   aig64SingleReport.schema===AIG_SOURCE_OBSERVATION_SCHEMA?
    'AIG-6.12-PIXEL-COLOUR-SHAPE-ONLY-NO-BIOLOGICAL-MODEL.json':
    'AIG-6.4-SINGLE-PARTIAL-PHOTO-ANATOMICAL-ESTIMATE-SHA.json',
   'application/json');
});
/** On-demand control is wired to the already verified single-photo GLB.
 * Existing generation and downloaded original five clips remain intact.
 */
$('aig64-single-motion-upgrade').addEventListener('click',async()=>{
 if(aig64SingleBusy||!aig64SingleBytes||!aig64SingleReport||
   aig64SingleReport.realAnimationClips!==5)return;
 if(view?.movieMode){
  $('aig64-single-status').textContent='錄影時不能替換真 GLB；請先結束錄影。';return;
 }
 const revision=aig64SingleRevision;
 const source=aig64SingleReport.originalSinglePhotoSHA256;
 const base=aig64SingleBytes;
 const reportBefore=aig64SingleReport;
 aig64SingleBusy=true;
 $('aig64-single-motion-upgrade').disabled=true;
 $('aig64-single-build').disabled=true;
 $('aig64-single-status').textContent='正在真正增加雙腿與雙臂 3D 骨架動畫，逐幀檢查實際蒙皮頂點；沒有用 2D 推鏡冒充。';
 try{
  const upgraded=upgradeAig64FullBodyMotion({
   schema:AIG64_AUTOBODY_SCHEMA,bytes:base,
   sourceImageSHA256:source,riggedBoneCount:reportBefore.realBoneCount,
   generatedCompleteTechnicalBody:true,releaseAllowed:false
  });
  const proof=await auditAig61FullBodyLimbMotion(upgraded);
  if(!proof.actualSkinVertexMotionVerified||
     !proof.leftAndRightLegMotionVerified||!proof.leftAndRightArmMotionVerified||
     upgraded.animationClipCount!==7)
   throw Error('AIG61_REAL_BILATERAL_SKIN_MOTION_NOT_VERIFIED');
  const sha=await sha256Bytes(upgraded.bytes);
  if(revision!==aig64SingleRevision ||
     source!==aig64SingleReport?.originalSinglePhotoSHA256 ||
     base!==aig64SingleBytes)
   throw Error('AIG61_SOURCE_CHANGED_DURING_MOTION_UPGRADE');
  let preview='7 段真 GLB 可以下載；此裝置尚未驗證 3D GPU 預覽。';
  if(view){
   try{
    await load(upgraded.bytes.buffer,false,{technical:true});
    if(sourceSha!==sha)throw Error('AIG61_RENDERER_SOURCE_SHA_MISMATCH');
    aig50Report=null;aig50Parsed=null;
    $('aig50-report').disabled=true;
    aig51Reset('已換成 7 動作全身技術 GLB；接縫與碰撞請重新驗證。');
    preview='真 3D 工作區已載入 7 段骨架動畫。';
   }catch(err){preview='GPU 隔離：'+err.message+'；真 GLB 仍可下載。';}
  }
  if(revision!==aig64SingleRevision || base!==aig64SingleBytes)
   throw Error('AIG61_SOURCE_CHANGED_AFTER_RENDER');
  aig64SingleBytes=upgraded.bytes;
  aig64SingleReport={...reportBefore,
   upgradedMotionSchema:upgraded.schema,
   originalFiveClipGLBSHA256:reportBefore.generatedRealGLBSHA256,
   generatedRealGLBSHA256:sha,GLBBytes:upgraded.bytes.length,
   realAnimationClips:7,
   realBilateralLimbMotionEvidence:proof,
   sourceIdentityExact:false,physicalFootContactCertified:false,
   hairAndClothPhysicsCertified:false,releaseAllowed:false
  };
  $('aig64-single-download').disabled=false;
  $('aig64-single-report').disabled=false;
  $('aig64-single-status').textContent='雙腿與雙臂真蒙皮動作已逐幀驗證：17 骨／9 網格／7 段真 GLB；'+
   preview+' 未拍到的身材與人臉身份仍是推估，髮絲碰撞及真走路接地尚未通過。';
 }catch(err){
  // NEVER destroy the original successfully generated GLB or its 5 clips.
  aig64SingleBytes=base;aig64SingleReport=reportBefore;
  $('aig64-single-motion-upgrade').disabled=false;
  $('aig64-single-status').textContent='全身動作升級 BLOCKED：'+err.message+
   '。原來已驗證的 5 段 GLB 和全部照片、動畫未被清空。';
 }finally{
  aig64SingleBusy=false;
  $('aig64-single-build').disabled=!$('aig64-single-photo').files?.length;
 }
});


let aig66Portrait=null,aig67Audio=null,aig67FaceEvidence=null,aig67VoiceSha=null;
let aig68FramePacing=null,aig68PlaybackProof=null,aig68LastRecordedUrl=null,
 aig68QaBusy=false,aig68OutputForRevision=null;
let aig65Current=null,aig65Building=false,aig65Playing=false,aig65Recording=false,aig65Finalizing=false,
 aig65FrameId=null,aig65StartedAt=0,aig65LastBeat=-1,aig65LastClock=0,
 aig65Recorder=null,aig65FilmCanvas=null,aig65DecodedImage=null,aig65Layers=null,
 aig65Revision=0,aig65VideoUrls=[],aig65VideoEvidence=null,aig65Interrupted=false,
 aig65CaptureError=null;
const aig65Canvas=$('aig65-canvas');
function aig65Show(text){$('aig65-status').textContent=text;}
function aig693Progress(step,message,{error=false}={}){
 const el=$('aig693-progress');
 if(!el)return;
 const value=Math.max(0,Math.min(4,Number.isFinite(step)?step:0));
 el.setAttribute('aria-valuenow',String(value));
 el.setAttribute('data-aig-state',error?'error':value===4?'complete':'working');
 el.textContent=(error?'無法生成：':value===4?'動畫已生成：':
  value===0?'等待生成：':'實際步驟 '+value+'／4：')+message;
}

function aig65Refresh(){
 const busy=aig65Building||aig65Playing||aig65Recording||aig65Finalizing,
  sourceReady=aig65Current?.plan?.ready===true;
 $('aig65-build').disabled=busy;
 aigUnifiedShell?.setCanvasReady(sourceReady&&aig65Current?.plan?.selectedMode!=='3D');
 $('aig65-play').disabled=busy||!sourceReady;
 $('aig65-record').disabled=busy||!sourceReady||
  aig65Current.plan.selectedMode==='3D';
 $('aig65-stop').disabled=!(aig65Playing||aig65Recording||aig65Finalizing);
 $('aig65-report').disabled=busy||!sourceReady;
 $('aig68-review').disabled=busy||aig68QaBusy||!aig68LastRecordedUrl||
  $('aig65-video').src!==aig68LastRecordedUrl||!sourceReady;
 for(const id of ['aig65-image','aig65-story','aig65-mode','aig65-duration','aig66-face','aig67-voice'])
  $(id).disabled=busy;
}
function aig65Invalidate(reason='來源或劇情變更，請重新計算 AUTO 動畫。'){
 if(aig65Playing||aig65Recording||aig65Finalizing)return;
 ++aig65Revision;
 aig65Current=null;aig65Layers=null;aig66Portrait=null;aig67Audio=null;aig67FaceEvidence=null;aig67VoiceSha=null;
 aig65DecodedImage?.close?.();aig65DecodedImage=null;
 aig68LastRecordedUrl=null;aig68PlaybackProof=null;aig68OutputForRevision=null;aig65VideoEvidence=null;
 $('aig695-need-real-3d').hidden=true;
 $('aig68-status').textContent='圖片或劇情已改變：舊影片仍可下載，但不代表新來源驗收。';
 aig65Show(reason);aig693Progress(0,'來源已改變，請重新生成');aig65Refresh();
}
for(const id of ['aig65-image','aig65-story','aig65-mode','aig65-duration','aig66-face','aig67-voice'])
 $(id).addEventListener(id==='aig65-story'?'input':'change',()=>{
  aig65Invalidate('圖片、劇情或模式已變更；舊播放計畫不可冒用，按 AUTO 重新生成。');
 });
function aig65ReportObject(){
 if(!aig65Current?.plan)return null;
 return {schema:AIG65_SCHEMA,
  plan:publicAIG65Plan(aig65Current.plan),
  originalImageSHA256:aig65Current.imageSha,
  originalImageDimensions:aig65Current.imageDimensions,
  pixelImageLayerReport:aig65Layers?.evidence||null,
  localPortraitEvidence:aig66Portrait?.evidence||null,
  browserNativeFaceEvidence:aig67FaceEvidence,
  voiceFileSHA256:aig67VoiceSha,
  localAudioAmplitude:aig67Audio?.decoded?{
   schema:AIG67_SCHEMA,pcmSamplesDecoded:true,
   durationSeconds:aig67Audio.decoded.durationSeconds,
   envelopeFrameSeconds:aig67Audio.decoded.envelopeSeconds,
   mouthFollowsRealWaveformAmplitude:true,
   phonemeExactLipSync:false
  }:null,
  compositorMethod:aig65Layers?.visualMethod||
   (aig65Current.plan.selectedMode==='3D'?'GLB_EXISTING_RIG':'TEXT_CARD'),
  actualRealMediaRecorderResult:aig65VideoEvidence,
  realEncodedPlaybackProof:aig68PlaybackProof,
  videoEvidenceSchema:AIG68_SCHEMA,
  voiceAndMusicEngine:'EXISTING_LOCAL_STORY_AUDIO',
  systemTtsNeverCapturedInVideo:true,
  original3DMoviePipelineUnchanged:true,
  imageActionMayBeCameraTransformRatherThanTrueLimbMotion:true,
  otherExistingCostumesPreserved:true,
  originalPhoto3DDepthNotInferred:true,
  nativeAndroidWindows60FPSUnverified:true,
  releaseAllowed:false};
}
$('aig65-build').addEventListener('click',async()=>{
 if(aig65Building||aig65Playing||aig65Recording||aig65Finalizing||movieUI?.isBusy)return;
 aig68LastRecordedUrl=null;aig68PlaybackProof=null;aig68OutputForRevision=null;aig65VideoEvidence=null;
 $('aig68-status').textContent='已更換動畫來源，6.8 編碼影片驗收需重新錄製。';
 $('aig695-need-real-3d').hidden=true;
 const photo=$('aig65-image').files?.[0]||null,
  voice=$('aig67-voice').files?.[0]||null;
 const inputReady=normalizeAIG693AutoInputs({
  mode:$('aig65-mode').value,
  duration:$('aig65-duration').value,
  story:$('aig65-story').value,
  hasImage:!!photo
 });
 const story=inputReady.storyText,
  selected=inputReady.requestedMode,
  duration=inputReady.durationSeconds,rev=++aig65Revision;
 if(inputReady.corrections.includes('MODE_DEFAULT_AUTO'))
  $('aig65-mode').value='AUTO';
 if(inputReady.corrections.includes('DURATION_DEFAULT_8_SECONDS'))
  $('aig65-duration').value='8';
 aig65Building=true;aig65Refresh();
 aig693Progress(1,'檢查照片、劇情、模式與秒數');
 aig65Show('正在確認動畫來源。'+
  (inputReady.corrections.length?'已將無效欄位恢復為 AUTO／8 秒。':'')+
  ' 不需要配音檔，也不需要第三方服務。');
 let bitmap=null;
 try{
  if(!inputReady.ready)throw Error(inputReady.blockingReason);
  let imageSha=null,dimensions=null,photoLayer=null;
  // Sound files are OPTIONAL. Text and photo animation never require WAV.
  // Existing device TTS + locally synthesized original SFX/music are usable
  // during preview even when no external audio file is supplied.
  let decodedVoice=null,voiceSha=null;
  if(voice){
   if(voice.size<44||voice.size>16*1024*1024)
    throw Error('AIG67_VOICE_WAV_SIZE_LIMIT');
   const bytes=await voice.arrayBuffer();
   decodedVoice=decodeAIG67PCM16Wav(bytes);
   if(decodedVoice.durationSeconds>duration+.03)
    throw Error('AIG67_VOICE_LONGER_THAN_FILM');
   voiceSha=await sha256Bytes(bytes);
  }
  if(photo){
   if(photo.size<100||photo.size>20*1024*1024)
    throw Error('AIG65_IMAGE_SIZE_LIMIT');
   const bytes=await photo.arrayBuffer();imageSha=await sha256Bytes(bytes);
   const sig=new Uint8Array(bytes,0,Math.min(bytes.byteLength,16));
   const jpg=sig[0]===255&&sig[1]===216&&sig[2]===255;
   const png=[137,80,78,71,13,10,26,10].every((v,i)=>sig[i]===v);
   const webp=[82,73,70,70].every((v,i)=>sig[i]===v)&&
    [87,69,66,80].every((v,i)=>sig[i+8]===v);
   if(!jpg&&!png&&!webp)throw Error('AIG65_ACTUAL_IMAGE_FORMAT_INVALID');
   bitmap=await createImageBitmap(photo);
   if(bitmap.width<64||bitmap.height<64||bitmap.width>12000||
      bitmap.height>12000)throw Error('AIG65_IMAGE_DIMENSIONS_INVALID');
   dimensions=[bitmap.width,bitmap.height];
   // Foreground sampling is optional: image animation can work with
   // arbitrary backgrounds even if a clean 2.5D matte cannot be measured.
   photoLayer=prepareAIG65Layers(document,bitmap);
  }
  aig693Progress(2,'已確認輸入與來源圖片');
  const modelReady=!!(view?.model&&sourceSha)&&!aigTechnicalModelUnapproved;
  const plan=planAIG65AutoAnimation({
   storyText:story,hasImage:!!photo,imageSHA256:imageSha,
   hasGLB:modelReady,glbSHA256:modelReady?sourceSha:null,
   clips:view?.animation?.clips||[],requestedMode:selected,
   durationSeconds:duration
  });
  if(!plan.ready)throw Error('AIG65_AUTO_PLAN_BLOCKED: '+plan.blockers.join('、'));
  aig693Progress(3,'已確定 '+plan.selectedMode+' 動畫引擎');
  if(decodedVoice&&plan.selectedMode==='3D')
   throw Error('AIG67_IMPORTED_WAV_ONLY_SUPPORTED_IN_2D_2_5D_RECORDING');
  if(rev!==aig65Revision||photo!==($('aig65-image').files?.[0]||null)||
    voice!==($('aig67-voice').files?.[0]||null))
   throw Error('AIG65_SOURCE_CHANGED_DURING_BUILD');
  aig67FaceEvidence=null;
  if(plan.selectedMode!=='3D'&&bitmap&&$('aig66-face').checked){
   aig66Portrait=createAIG66Portrait(document,bitmap,photoLayer);
   const face=await detectAIG67BrowserFace(bitmap);
   aig67FaceEvidence=face;
   if(face.verified)aig66Portrait.setDetectedFaceBox(
    face.box,bitmap.width,bitmap.height);
   photoLayer=aig66Portrait.layers;
  }else aig66Portrait=null;
  if(rev!==aig65Revision||photo!==($('aig65-image').files?.[0]||null)||
     voice!==($('aig67-voice').files?.[0]||null))
   throw Error('AIG67_SOURCE_CHANGED_DURING_FACE_DETECTION');
  aig67Audio=decodedVoice?{decoded:decodedVoice,sha:voiceSha}:null;
  aig67VoiceSha=voiceSha;
  $('aig67-status').textContent=decodedVoice?
    '已解碼真 PCM16 WAV '+decodedVoice.durationSeconds.toFixed(2)+
    ' 秒；嘴部動態來自真波形 RMS，不是音素辨識。':
    '未上傳 WAV（正常）：仍能生成動畫、播放裝置語音及原創音效／音樂；有聲影像不需要外部音檔。系統語音 TTS 不能直接封入錄影。';
  aig65DecodedImage?.close?.();aig65DecodedImage=bitmap;bitmap=null;
  aig65Layers=plan.selectedMode==='3D'?null:photoLayer;
  aig65Current={plan,imageSha,imageDimensions:dimensions,
   modelSha:modelReady?sourceSha:null,storyText:story};
  if(plan.selectedMode==='3D'){
   $('story-text').value=story;
   $('story-build').click();
   if(!storyPlan?.ready)throw Error('AIG65_3D_CLIPS_FAILED_SECOND_CHECK');
   aig65Show('6.5 AUTO 選定真 3D：已接原有骨架劇情時間軸。按「播放 AUTO」即走原真 GLB 動畫；錄影請使用下方 3D 1080p 原錄影器。');
  }else{
   const note=drawAIG65CanvasFrame({
    ctx:aig65Canvas.getContext('2d'),canvas:aig65Canvas,
    plan,timeSeconds:0,layered:aig65Layers,portrait:aig66Portrait
   });
   aig65Show('6.9.2 AUTO 選定 '+plan.selectedMode+
    '：真 Canvas 畫面已建立；'+plan.timeline.length+' 段、'+
    plan.seconds.toFixed(2)+' 秒，'+
    (note.layeredParallaxActive?'已套用來源像素的近似前景視差。':
      '未證明可信景深分層，採真 2D 圖片平移／推鏡。')+
    ' 可播放或錄製真 1080p。'+
    (decodedVoice?'已載入 WAV 配音；':'未提供音檔也可生成：播放時可用裝置朗讀、音效及配樂；錄影時可錄入本機音效與配樂（依瀏覽器支援）。')+
    ' 照片裡的手腳不會自行變成關節動畫。');
  }
  aig693Progress(4,'已有實際動畫預覽；可切換播放／錄製');
 }catch(err){
  aig65Current=null;aig65Layers=null;aig66Portrait=null;aig67Audio=null;aig67VoiceSha=null;aig67FaceEvidence=null;
  const reason=String(err.message||err);
  if(reason.includes('VERIFIED_REAL_GLB_CLIPS_REQUIRED')){
   $('aig695-need-real-3d').hidden=false;
   aigUnifiedShell?.activate('create');
  }
  aig693Progress(0,reason.includes('VERIFIED_REAL_GLB_CLIPS_REQUIRED')?
    '缺少匹配的真 GLB 骨架動作；請匯入模型或選擇照片運鏡。':reason,{error:true});
  aig65Show('6.9.5 無法生成：'+
   (reason.includes('VERIFIED_REAL_GLB_CLIPS_REQUIRED')?
    '缺少可匹配的 3D GLB 骨架動畫，不能把照片推鏡冒充人物走路；下方提供匯入 GLB 或自行選擇 AUTO 照片運鏡。':
    reason.includes('MODE_DURATION_OR_CLIPS_INVALID')?
    '動畫模式或秒數無效，請將模式設為 AUTO、秒數設為 8 後重新生成。':reason)+
   '；原始照片、GLB、服裝及已產生的影片不受影響。');
 }finally{bitmap?.close?.();aig65Building=false;aig65Refresh();}
});
function aig65StopSound(){
 try{storySound.stop();}catch{}
}
function aig65CancelRAF(){
 if(aig65FrameId!==null){cancelAnimationFrame(aig65FrameId);aig65FrameId=null;}
}
async function aig65StopRun(natural=false){
 if(aig65Finalizing)return;
 aig65Finalizing=true;aig65CancelRAF();
 const recorder=aig65Recorder,wasRecording=aig65Recording;
 aig65Playing=false;aig65Recording=false;
 try{
  if(wasRecording&&recorder){
   const result=await recorder.stop();
   if(!result?.blob?.size)throw Error('AIG65_EMPTY_MEDIARECORDER_OUTPUT');
   const url=URL.createObjectURL(result.blob),
    evidence=aig65ReportObject();
   const data={
    ...result.evidence,mode:aig65Current?.plan.selectedMode,
    canvasFramePacing:aig68FramePacing?.report()||null,
    decodedPlaybackFpsNotYetMeasured:true,
    completeTimelineRecorded:natural,
    imageSourceSHA256:aig65Current?.imageSha,
    textStoryShaNotProvided:true,
    voiceFileSHA256:aig67VoiceSha,
    actualVoicePCMDecoded:!!aig67Audio?.decoded,
    voiceAmplitudeLipMotionNotPhonemeVisemes:true,
    actualVoiceMuxPlaybackConfirmedOnDevice:false,
    measuredPhonemeLipSync:false,
    narrationSpeechSynthesisNotInRecordedAudio:true,
    originalPhotoMotionIs2D2_5DNotRiggedLimbAnimation:true
   };
   aig65VideoEvidence=data;
   aig68PlaybackProof=null;aig68LastRecordedUrl=url;
   aig68OutputForRevision=aig65Revision;
   $('aig68-status').textContent='6.8 真影片已編碼完成。請按下方「檢查編碼影片」實際解碼驗證解析度與幀率；配音是否可聽仍需人工確認。';
   aig65VideoUrls.push(url);
   const video=$('aig65-video');video.src=url;video.hidden=false;
   const link=document.createElement('a');link.href=url;
   link.className='download';link.download=result.filename;
   link.textContent='下載已編碼 '+result.evidence.container.toUpperCase()+
    ' 1080p 動畫（'+result.evidence.actualFramesDrawn+' 次 Canvas 繪製，實際編碼幀待驗）';
   $('aig65-downloads').append(link);
   const manifestURL=URL.createObjectURL(new Blob([
    JSON.stringify({...evidence,realVideoFile:data},null,2)
   ],{type:'application/json'}));
   aig65VideoUrls.push(manifestURL);
   const a=document.createElement('a');a.href=manifestURL;
   a.download='AIG-6.8-REAL-CANVAS-1080p-CAPTURE-EVIDENCE.json';
   a.className='download';a.textContent='影片與原圖 SHA 記錄';
   $('aig65-downloads').append(a);
   aig65Show('6.8 真 '+result.evidence.container.toUpperCase()+
    ' 影片已由此瀏覽器實際編碼，Canvas 繪製次數 '+data.actualFramesDrawn+
    '、容器 '+data.outputMimeType+'、接入串流的音軌 '+data.audioTracksAttachedToCaptureStream+
    '。'+(natural?'完整劇情':'手動中斷片段')+
    '。編碼幀數、音軌封裝與播放品質仍需 6.8 真影片檢查；系統 TTS 未錄進影片。');
  }else aig65Show('6.7 AUTO Canvas 動畫已停止；原照片／影片與 GLB 不改動。');
 }catch(err){
  aig65CaptureError=String(err.message||err);
  aig65Show('6.8 本次影片編碼 BLOCKED：'+aig65CaptureError+
   '。不提供假檔案，先前真影片仍保留。');
 }finally{
  aig65StopSound();aig65Recorder=null;aig65FilmCanvas=null;
  aig65Finalizing=false;aig65Refresh();
 }
}
function aig65PlayOrRecord(recording){
 const current=aig65Current;
 if(!current?.plan?.ready||aig65Playing||aig65Recording||aig65Finalizing||
    movieUI?.isBusy)return;
 if(current.plan.selectedMode==='3D'){
  if(recording){aig65Show('真 3D 錄影請使用原 3D 錄影工作區。');return;}
  $('story-play').click();aig65Show('已交由原 GLB 骨架劇情播放器，不使用平面圖片假動作。');return;
 }
 if(current.modelSha&&current.plan.modelGLBSHA256!==current.modelSha){
  aig65Show('原有 GLB 已切換，請重新分析劇情和來源。');return;
 }
 try{
  aig65LastBeat=-1;aig65LastClock=0;aig65CaptureError=null;
  if(recording){
   aig68FramePacing=new AIG68FramePacing({targetFps:30});
   aig68LastRecordedUrl=null;aig68PlaybackProof=null;
   $('aig68-status').textContent='正在錄製並觀測 Canvas 幀間隔，尚非編碼影片幀率。';
  }
  const hasRealWav=!!aig67Audio?.decoded;
  storySound.configure({...soundOptions(),voice:!hasRealWav&&!recording&&soundOptions().voice});
  // Optional audio errors must never gate the visual animation:
  // a silent preview/movie is valid if this device has no audio support.
  try{storySound.start();}catch(audioError){
   $('story-audio-status').textContent='裝置聲音不可用，先執行無聲動畫：'+String(audioError.message||audioError).slice(0,90);
  }
  let mediaBus=null;
  if(hasRealWav)storySound.ensureVoiceContext();
  if(recording||hasRealWav){
   // Audio is optional: no audio destination is recorded as silent video;
   // browser SpeechSynthesis is intentionally not claimed as captured.
   if((hasRealWav||soundOptions().sfx||soundOptions().music)&&storySound.audio?.state!=='closed'){
    try{mediaBus=storySound.createRecordingBus();}catch{mediaBus=null;}
   }
  }
  let preparedVoiceBuffer=null;
  if(hasRealWav){
   if(!mediaBus)throw Error('AIG67_VOICE_MEDIASTREAM_BUS_REQUIRED');
   preparedVoiceBuffer=buildAIG67AudioBuffer(storySound.audio,aig67Audio.decoded);
  }
  if(recording){
   aig65FilmCanvas=document.createElement('canvas');
   aig65FilmCanvas.width=1920;aig65FilmCanvas.height=1080;
   drawAIG65CanvasFrame({ctx:aig65FilmCanvas.getContext('2d'),
    canvas:aig65FilmCanvas,plan:current.plan,timeSeconds:0,layered:aig65Layers,portrait:aig66Portrait});
   aig65Recorder=new AIG65CanvasRecorder({
    onStatus:m=>aig65Show(m)
   });
   aig65Recorder.begin({canvas:aig65FilmCanvas,plan:current.plan,
    sourceSHA256:current.plan.sourceSHA256,audioDestination:mediaBus});
   aig65Recording=true;
  }else aig65Playing=true;
  aig65StartedAt=performance.now();
  if(preparedVoiceBuffer)storySound.playRecordedVoice(preparedVoiceBuffer);
  const rev=aig65Revision;
  function animate(now){
   if(rev!==aig65Revision||!aig65Current||
      (!aig65Playing&&!aig65Recording))return;
   // rAF's frame timestamp can precede performance.now() from the click
   // handler by a few milliseconds. Never dispatch negative animation
   // time (especially on 120Hz phones and WebView cold-start frames).
   const t=Math.max(0,Math.min(current.plan.seconds,(now-aig65StartedAt)/1000));
   const aig67Mouth=aig67Audio?.decoded?
    sampleAIG67AudioMouth(aig67Audio.decoded,t).openness:undefined;
   const stamp=drawAIG65CanvasFrame({ctx:aig65Canvas.getContext('2d'),
    canvas:aig65Canvas,plan:current.plan,timeSeconds:t,layered:aig65Layers,portrait:aig66Portrait,audioAmplitude:aig67Mouth});
   if(aig65Recording){
    drawAIG65CanvasFrame({ctx:aig65FilmCanvas.getContext('2d'),
     canvas:aig65FilmCanvas,plan:current.plan,timeSeconds:t,layered:aig65Layers,portrait:aig66Portrait,audioAmplitude:aig67Mouth});
    aig65Recorder?.frame();
    aig68FramePacing?.mark(now);
   }
   if(stamp.beat.beat!==aig65LastBeat){
    aig65LastBeat=stamp.beat.beat;
    storySound.step({beat:stamp.beat.beat,actionId:stamp.beat.actionId,
     dialogue:stamp.beat.text});
   }
   const dt=Math.max(0,Math.min(.2,t-aig65LastClock));
   aig65LastClock=t;storySound.tick(dt);
   if(t>=current.plan.seconds){
    void aig65StopRun(true);return;
   }
   aig65FrameId=requestAnimationFrame(animate);
  }
  aig65FrameId=requestAnimationFrame(animate);aig65Refresh();
  aig65Show(recording?'6.7 正在錄製真 1920×1080 '+current.plan.selectedMode+
   ' Canvas 動畫，WAV／WebAudio 有提供時接入音軌。':'6.7 正在播放 '+current.plan.selectedMode+' 真 Canvas 動畫。');
 }catch(err){
  aig65CancelRAF();aig65Playing=false;aig65Recording=false;
  aig65StopSound();
  aig65Show('6.9.2 Canvas 啟動 BLOCKED：'+err.message+
   '。若裝置不支援 MediaRecorder，仍可選擇播放。');
  aig65Refresh();
 }
}
$('aig65-play').addEventListener('click',()=>aig65PlayOrRecord(false));
$('aig65-record').addEventListener('click',()=>aig65PlayOrRecord(true));
$('aig65-stop').addEventListener('click',()=>{
 if(aig65Recording||aig65Playing)void aig65StopRun(false);
});
$('aig68-review').addEventListener('click',async()=>{
 if(aig68QaBusy||aig65Recording||aig65Playing||aig65Finalizing||
    !aig68LastRecordedUrl||aig68OutputForRevision!==aig65Revision)return;
 const video=$('aig65-video'),target=aig68LastRecordedUrl;
 if(video.src!==target)return;
 aig68QaBusy=true;aig65Refresh();
 $('aig68-status').textContent='正在用瀏覽器播放真正的錄製影片，測試解碼後畫面的寬高與幀間隔。';
 try{
  const evidence=await probeAIG68EncodedPlayback(video,{maxFrames:42,timeoutMs:6500});
  if(video.src!==target||aig68OutputForRevision!==aig65Revision)
   throw Error('AIG68_SOURCE_CHANGED_DURING_VIDEO_PROBE');
  aig68PlaybackProof=evidence;
  aig68VideoStatus(evidence);
  aig47Download(JSON.stringify(aig65ReportObject(),null,2),
   'AIG-6.8-ACTUAL-ENCODED-VIDEO-BROWSER-QA.json','application/json');
 }catch(err){
  $('aig68-status').textContent='6.8 編碼影片檢測未通過：'+String(err.message||err).slice(0,140)+
   '。既有影片仍可下載，不能以來源測試當成真影片驗證。';
 }finally{aig68QaBusy=false;aig65Refresh();}
});
function aig68VideoStatus(e){
 if(e.realBrowserPlaybackSampleVerified){
  $('aig68-status').textContent='6.8 已確認真正錄製影片的解碼畫面 '+e.encodedVideoMetadataResolution.join('×')+
   '，解碼回放取樣幀 '+e.actualDecodedFramesSampled+
   '，觀察回放 FPS '+String(e.observedDecodedPlaybackFps)+
   '。聲音有無成功封裝、口型精準度、頭髮／脖子穿模仍需實際觀看聆聽，不可自動 Release PASS。';
 }else{
  $('aig68-status').textContent='6.8 尚未確認真 1080p 回放：'+
   e.encodedVideoMetadataResolution.join('×')+
   '，解碼幀樣本 '+e.actualDecodedFramesSampled+
   '；該影片保留，但正式驗收 BLOCKED。';
 }
}
$('aig65-report').addEventListener('click',()=>{
 const report=aig65ReportObject();if(!report)return;
 aig47Download(JSON.stringify(report,null,2),
  'AIG-6.7-AUTO-REAL-WAV-FACE-TIMELINE.json',
  'application/json');
});

let aig4Busy=false;
function aig4RefreshButton(){
 $('aig4-build').disabled=aig4Busy||!$('aig4-front').files?.length;
}
for(const id of ['aig4-front','aig4-side'])
 $(''+id).addEventListener('change',()=>{
  aig54Invalidate('AIG 自研照片或輔助角度已變更，原 5.4 來源證據失效。');
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
 aig54Invalidate('開始新的 AIG 自研幾何工作，5.4 等待完成後核對來源。');
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
  const fingerprint='AIG_NATIVE_5_4_PROVENANCE|'+frontSHA+'|'+sideSHA;
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
  aig54NativeJobId=job.id;aig54ExpectedSourceSHA=frontSHA;
  $('aig54-check').disabled=false;
  $('aig54-status').textContent='AIG 自研技術 GLB 已完成，可讀取硬碟原圖／GLB／生成器並重新驗證 SHA。';
  // 5.5 only accepts the exact scaffold from the verified native job, not stale ratios.
  const bodyScaffold=await api('/api/aig4/jobs/'+job.id+'/files/scaffold.json');
  if(bodyScaffold.sourceSHA256!==frontSHA||
     bodyScaffold.meshGLBSHA256!==end.artifacts['model.glb'].sha256)
   throw Error('AIG55_NATIVE4_SCAFFOLD_SOURCE_OR_GLB_MISMATCH');
  aig55Scaffold=bodyScaffold;
  aig56RefreshEnabled();aig57RefreshEnabled();aig58RefreshEnabled();aig59RefreshEnabled();aig60RefreshEnabled();
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
    await load(bytes,true,{technical:true});
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
 heroineSourceMatch=false;aig53ImageAdmission=null;
 aig53Invalidate('正式女主角來源圖片已變更，5.3 必須重驗。');
 if(heroinePreviewUrl){URL.revokeObjectURL(heroinePreviewUrl);heroinePreviewUrl=null;}
 $('heroine-source-preview').hidden=true;$('heroine-source-preview').removeAttribute('src');
 if(!file){$('heroine-source-status').textContent='尚未選擇正式女主角照片。';return;}
 $('heroine-source-status').textContent='核對照片實際內容 SHA-256 與 JPEG 像素尺寸中…';
 try{
  const result=await inspectHeroineImage(file,{decodeImage:decodeHeroineImage});
  if(revision!==heroineSourceRevision)return;
  heroineSourceMatch=result.sourceMatched;
  aig53ImageAdmission=result;
  aig53Invalidate('正式女主角照片核對有新結果，5.3 驗收表須重新計算。');
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
  aig53Invalidate('真 GLB 動畫片段已切換，5.3 舊片段的視覺/FPS 統一報告失效。');
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

// Presentation-only mounting after original event/callback initialization.
// This moves original DOM elements without cloning IDs or losing listeners.
aigUnifiedShell=initAIGUnifiedShell(document);
if(!aigUnifiedShell.ready)console.warn('AIG compact workspace unavailable:',aigUnifiedShell.reason);
const aigLiveControlBindings=bindFastModelLiveControls(document);
if(!aigLiveControlBindings.ready)
 console.error('AIG live command ID binding unavailable:',aigLiveControlBindings.reason);
$('aig695-switch-auto').addEventListener('click',()=>{
 // Explicit user choice, never a silent downgrade to fake 3D.
 $('aig65-mode').value='2D';
 $('aig65-mode').dispatchEvent(new Event('change',{bubbles:true}));
 $('aig695-need-real-3d').hidden=true;
 aigUnifiedShell?.activate('create');
 $('aig65-build').click();
});
$('aig695-import-glb').addEventListener('click',()=>{
 $('aig695-need-real-3d').hidden=true;
 aigUnifiedShell?.activate('model');
 $('aig-unified-model-technical')?.setAttribute('open','');
 $('local-glb').click();
});
