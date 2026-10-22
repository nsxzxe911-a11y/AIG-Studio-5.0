import {RealMovieCapture,validateMovieSource,MOVIE_SOURCE_VERSION} from './movie-recorder.mjs';
import {mapVoiceFiles,voiceTimecodes,RmsMouthDriver,VOICE_CUES_VERSION} from './voice-cues.mjs';
import {openAIG716AssetLibrary} from './aig-external-asset-library-7-16.mjs';

/** Build buttons, actual recorded video and evidence only when a source-backed
 * GLB clip sequence is playable. No source GLB is modified or uploaded.
 * This class owns the movie UI, its audio/video resources and object URLs.
 */
export class MovieWorkspace {
 constructor({document,env=globalThis,getContext,showSubtitle,clearSubtitle}={}){
  if(!document||typeof getContext!=='function')throw Error('MOVIE_WORKSPACE_INVALID');
  this.doc=document;this.env=env;this.getContext=getContext;
  this.showSubtitle=showSubtitle;this.clearSubtitle=clearSubtitle;
  this.capture=null;this.active=false;this.finalizing=false;
  this.outputUrls=[];this.lockedSource=null;this.mouth=null;
  this.el=id=>document.getElementById(id);
  this.el('movie-record').addEventListener('click',()=>{void this.record();});
  this.el('movie-stop').addEventListener('click',()=>{void this.finish(false);});
  for(const id of ['movie-voice-file','movie-voice-lines']){
   this.el(id)?.addEventListener('change',()=>{
    if(this.active)return;
    this.clearOutput();
    this.el('movie-status').textContent='配音素材已更改；下一次錄影才會納入音訊。';
   });
  }
  this.refresh();
 }
 get isBusy(){return this.active||this.finalizing;}
 lock(on){
  for(const id of ['story-text','story-build','story-play','story-stop','pause',
   'local-glb','action-glb','clip','movie-voice-file','movie-voice-lines','ai-tts-generate','ai-tts-voice','dialogue-style','cloud-dialogue',
   'dialogue-preview','timeline-capture','review-capture']){
   const element=this.el(id);
   if(element)element.disabled=!!on;
  }
  for(const item of this.el('story-dialogues')?.querySelectorAll('textarea')||[])item.disabled=!!on;
  this.el('movie-stop').disabled=!on;
 }
 refresh(){
  if(this.isBusy)return;
  const {plan,sourceSha,view}=this.getContext();
  const available=!!(plan?.ready&&sourceSha&&view?.model);
  this.el('movie-record').disabled=!available;
  this.el('movie-stop').disabled=true;
  return available;
 }
 clearOutput(){
  for(const u of this.outputUrls)this.env.URL.revokeObjectURL(u);
  this.outputUrls=[];
  this.el('movie-downloads').replaceChildren();
  const video=this.el('movie-preview');
  video.pause?.();video.removeAttribute('src');video.hidden=true;
 }
 invalidate(){
  if(this.isBusy)throw Error('MOVIE_RECORDING_IN_PROGRESS');
  this.clearOutput();this.refresh();
 }
 restoreControls(){
  const {plan,sourceSha,view,dialogueCloudConfigured}=this.getContext();
  this.lock(false);
  this.refresh();
  this.el('story-play').disabled=!(plan?.ready&&sourceSha&&view?.model);
  this.el('story-stop').disabled=true;
  this.el('pause').disabled=!view?.animation;
  this.el('action-glb').disabled=!view?.model;
  this.el('timeline-capture').disabled=!(view?.model&&sourceSha&&view.animation?.clips?.length);
  this.el('review-capture').disabled=!(view?.model&&sourceSha);
  this.el('cloud-dialogue').disabled=!dialogueCloudConfigured;
  this.el('clip').disabled=!view?.animation?.clips?.length;
 }
 async record(){
  if(this.isBusy)return;
  const c=this.getContext();
  const {plan,sourceSha,view,sound,sourceName,dialogueOrigin,soundOptions}=c;
  const voiceFile=this.el('movie-voice-file').files?.[0]||null;
  const manualLines=Array.from(this.el('movie-voice-lines')?.files||[]);
  const generatedVoiceFiles=c.generatedVoiceFiles||[];
  const voiceFiles=manualLines.length?manualLines:generatedVoiceFiles;
  let capture=null;
  try{
   if(c.ttsBusy)throw Error('MOVIE_TTS_GENERATING');
   if((manualLines.length&&generatedVoiceFiles.length)||(voiceFile&&generatedVoiceFiles.length))
    throw Error('MOVIE_MANUAL_AND_AI_VOICE_CONFLICT');
   validateMovieSource({plan,sourceSha256:sourceSha,clips:view?.animation?.clips,
    haveModel:!!view?.model,dialogueOrigin,voiceFile});
   const cues=mapVoiceFiles(plan,voiceFiles,{wholeFilePresent:!!voiceFile});
   // Keep the previous verified movie available until a new Blob is complete.
   this.active=true;this.lock(true);
   this.el('movie-record').disabled=true;
   this.el('movie-status').textContent='準備 1080p 真 GLB 畫面與音軌；不會錄進瀏覽器系統 TTS。';
   const original=soundOptions();
   // IMPORTANT: start while inside the user's click activation, before any
   // await; browser AudioContext/WebAudio permissions can depend on it.
   const needAudio=original.sfx||original.music||!!voiceFile||cues.length>0;
   sound.configure({...original,voice:false,sfx:original.sfx||!!voiceFile||cues.length>0});
   if(needAudio)sound.start();
   sound.configure({...original,voice:false});
   const buffer=voiceFile?await sound.decodeVoiceFile(await voiceFile.arrayBuffer()):null;
   const cueBuffers=[];
   for(const cue of cues){
    const decoded=await sound.decodeVoiceFile(await cue.file.arrayBuffer());
    if(decoded.duration>cue.seconds+.05)
     throw Error('MOVIE_VOICE_CUE_LONGER_THAN_REAL_ACTION_'+(cue.position+1));
    cueBuffers.push(decoded);
   }
   if(!this.active)throw Error('MOVIE_START_ABORTED');
   const bus=needAudio?sound.createRecordingBus():null;
   const pixels=view.beginMovie1080p();
   if(pixels.actualCanvasWidth!==1920||pixels.actualCanvasHeight!==1080)
    throw Error('MOVIE_ACTUAL_CANVAS_SIZE_MISMATCH');
   capture=new RealMovieCapture({env:this.env,onState:m=>{
    if(m.state==='FAILED'){
     this.el('movie-status').textContent='錄影器已隔離：'+m.error;
     void this.finish(false); // release GPU viewport and audio bus even on async encoder failure
    }
   }});
   const info=capture.begin({sourceCanvas:view.canvas,audioDestination:bus,
    sourceSha256:sourceSha,plan,clips:view.animation.clips,haveModel:true,
    dialogueOrigin,voiceFile,sourceTimeNow:()=>this.env.performance?.now?.()||0});
   this.capture=capture;this.mouth=new RmsMouthDriver(view.model);
   this.lockedSource={sha:sourceSha,name:sourceName,
    dialogueOrigin,voiceImported:!!buffer||cueBuffers.length>0,
    voiceCueCount:cueBuffers.length,voiceTimecodes:cueBuffers.length?voiceTimecodes(plan):[],
    rmsMouthChannelAvailable:this.mouth.available&&needAudio,
    format:info.format};
   view.onAfterRender=t=>{
    capture.draw(t,this.el('story-subtitle').textContent);
   };
   view.onFrame=dt=>{
    if(view.animation?.story?.playing&&!view.animation.paused){
     sound.tick(dt);
     this.mouth?.applyLevel(sound.getVoiceLevel());
    }
   };
   if(buffer)sound.playRecordedVoice(buffer);
   view.animation.startStory(plan,{
    onStep:({position,beat,total})=>{
     this.showSubtitle(beat.dialogue);
     sound.step(beat);
     if(cueBuffers.length)sound.playRecordedVoice(cueBuffers[position]);
     this.el('movie-status').textContent='真正的 '+info.format.toUpperCase()+
      ' 1080p 錄製中：'+(position+1)+'/'+total+' · '+beat.clipName+
      '。字幕、原創音效與配樂隨動作同步。';
    },
    onFinish:()=>{void this.finish(true);}
   });
   this.el('movie-status').textContent='錄製開始（'+info.format.toUpperCase()+
    '），畫面 1920×1080／目標 30 FPS，瀏覽器 TTS 不含在錄影音軌。';
  }catch(err){
   if(capture){capture.fail(err);capture._finished?.catch?.(()=>{});}
   this.el('movie-status').textContent='錄影未建立：'+err.message+'，沒有產生假影片。';
   const {view,sound}=this.getContext();
   view?.animation?.stopStory();sound?.stop();
   this.mouth?.restore();this.mouth=null;
   if(view){view.onAfterRender=null;view.onFrame=null;view.endMovie1080p();}
   this.active=false;this.capture=null;this.lockedSource=null;
   this.restoreControls();
  }
 }
 async finish(completedStory){
  if(!this.active||this.finalizing)return;
  this.finalizing=true;const capture=this.capture;
  const {view,sound}=this.getContext();
  try{
   if(!completedStory){
    view?.animation?.stopStory();view?.animation?.mixer?.stopAllAction();
    if(view?.animation)view.animation.paused=true;
   }
   if(!capture)throw Error('MOVIE_NOT_STARTED');
   const output=await capture.stop();
   if(!output?.blob?.size)throw Error('MOVIE_EMPTY_OUTPUT');
   this.clearOutput();
   const videoUrl=this.env.URL.createObjectURL(output.blob);
   const metadata={...output.evidence,schema:MOVIE_SOURCE_VERSION,
    sourceSha256:this.lockedSource.sha,sourceLabel:this.lockedSource.name,
    realClipSequenceFullyRecorded:!!completedStory,
    audioVoiceFileIncluded:this.lockedSource.voiceImported,
    timedVoiceCueCount:this.lockedSource.voiceCueCount,
    timedVoiceTimecodes:this.lockedSource.voiceTimecodes,
    voiceCueSchema:VOICE_CUES_VERSION,
    rmsMouthChannelAvailable:this.lockedSource.rmsMouthChannelAvailable,
    phonemeLipSyncVerified:false,
    realHeroineGLBApproved:false,
    dialogueOrigin:this.lockedSource.dialogueOrigin||'OFFLINE_TEMPLATE',
    systemSpeechSynthCaptured:false,realMp4OnlyIfEncodedAsMp4:output.evidence.container==='mp4',
    nativeGPUFrameRateMeasured:false};
   const json=new Blob([JSON.stringify(metadata,null,2)],{type:'application/json'});
   const evidenceUrl=this.env.URL.createObjectURL(json);
   this.outputUrls.push(videoUrl,evidenceUrl);
   const player=this.el('movie-preview');player.src=videoUrl;player.hidden=false;
   for(const a of [
    {url:videoUrl,file:output.filename,label:'下載真實 '+metadata.container.toUpperCase()+' 錄影'},
    {url:evidenceUrl,file:'AIG-FastModel-3-5-Real-Movie-Evidence.json',label:'下載 1080p 錄影及逐句配音來源證據'}
   ]){
    const link=this.doc.createElement('a');link.href=a.url;link.download=a.file;
    link.className='download';link.textContent=a.label;this.el('movie-downloads').append(link);
   }
   this.el('movie-status').textContent=
    (completedStory?'完整劇情片段已由瀏覽器實際錄製。':'僅錄製使用者提前中止前的部分片段。')+
    ' 格式 '+metadata.container.toUpperCase()+'，解析度 1920×1080，錄得 '+metadata.actualFramesDrawn+
    ' 幀，音訊軌 '+metadata.audioTracksInFile+'；不含系統 TTS。實際 FPS／完整女主角質量仍待實機驗收。';
   let lib=null;
   try{
    lib=await openAIG716AssetLibrary();
    const videoType=output.evidence.container==='mp4'?'video/mp4':'video/webm';
    const payload=output.blob.type===videoType?output.blob:
     new Blob([output.blob],{type:videoType});
    await lib.importBlob(payload,{
     category:'animation',title:'FastModel 劇情動畫與場景轉場',
     tags:['動畫','場景','轉場','劇情'],
     source:'GENERATED_DERIVED',modelAccuracy:'NOT_VERIFIED',
     coordinateUnits:'UNKNOWN',derivedFrom:this.lockedSource.sha
    });
    this.el('movie-status').textContent+=' 已另外儲存到主程式外素材庫，待使用者核准重用。';
   }catch(error){
    this.el('movie-status').textContent+=' 錄影成功；外部素材庫尚未保存：'+
     String(error.message||error)+'。';
   }finally{lib?.close()}
  }catch(err){
   // A failed new recording must not delete the previous successful export.
   this.el('movie-status').textContent='本次影片未能輸出：'+err.message+'；無新檔案，保留先前已完成的錄影。';
  }finally{
   this.mouth?.restore();this.mouth=null;
   sound.stop();this.clearSubtitle();
   if(view){view.onAfterRender=null;view.onFrame=null;view.endMovie1080p();
    view.animation?.stopStory();if(view.animation)view.animation.paused=true;}
   this.active=false;this.finalizing=false;this.capture=null;this.lockedSource=null;
   this.restoreControls();
  }
 }
}
