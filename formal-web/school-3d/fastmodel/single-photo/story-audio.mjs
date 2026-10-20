/** FastModel 3.3 — local original procedural WebAudio sfx/music + optional
 * browser TTS. Audio starts only from a user gesture; generated sounds do not
 * depend on copyrighted songs/remote audio services. Browser voice quality
 * and voice availability vary by device.
 */
export const AUDIO_CUE_VERSION='AIG_FASTMODEL_3_3_PROCEDURAL_AUDIO_BROWSER_SPEECH';
const SFX=Object.freeze({
 walk:{wave:'triangle',hz:170,end:90,secs:.09},run:{wave:'triangle',hz:215,end:95,secs:.075},
 idle:{wave:'sine',hz:320,end:230,secs:.06},turn:{wave:'sine',hz:450,end:290,secs:.13},
 dodge:{wave:'sawtooth',hz:680,end:180,secs:.20},block:{wave:'square',hz:150,end:78,secs:.15},
 punch:{wave:'triangle',hz:135,end:46,secs:.13},kick:{wave:'triangle',hz:185,end:62,secs:.15},
 jump:{wave:'sine',hz:240,end:600,secs:.23},fall:{wave:'triangle',hz:120,end:45,secs:.23},
 bow:{wave:'sine',hz:523,end:392,secs:.22}
});
const MUSIC=Object.freeze({
 playful:[261.63,329.63,392,523.25,392,329.63,293.66,392],
 action:[196,233.08,293.66,392,293.66,233.08,174.61,233.08],
 cinematic:[174.61,261.63,349.23,261.63,196,293.66,392,293.66]
});
function validOptions(o){
 if(!['playful','action','cinematic'].includes(o.mood))throw Error('STORY_AUDIO_MOOD_INVALID');
 if(!Number.isFinite(o.volume)||o.volume<0||o.volume>1)throw Error('STORY_AUDIO_VOLUME_INVALID');
 for(const k of ['voice','sfx','music'])if(typeof o[k]!=='boolean')throw Error('STORY_AUDIO_OPTION_INVALID');
}
export function audioCueForAction(actionId){const a=SFX[actionId];return a?{...a}:null;}
export function soundtrackNote(mood,index){
 if(!MUSIC[mood]||!Number.isInteger(index)||index<0)throw Error('STORY_AUDIO_NOTE_INVALID');
 return MUSIC[mood][index%MUSIC[mood].length];
}
export class StoryAudio{
 constructor({env=globalThis,onStatus=()=>{},options={}}={}){
  this.env=env;this.onStatus=onStatus;this.options={voice:true,sfx:true,music:true,mood:'playful',volume:.28,...options};
  validOptions(this.options);this.audio=null;this.ownsAudio=false;this.enabled=false;
  this.lastCue=null;this.musicStep=0;this.musicClock=0;this.speechUtterance=null;
  this.voiceAvailable=false;this.effectsAvailable=false;this.musicEnabled=false;this.activeNodes=new Set();this.captureDestination=null;this.recordedVoice=null;
 }
 configure(opts){
  const updated={...this.options,...opts};validOptions(updated);
  this.options=updated;return this.options;
 }
 start(){
  // Run in the DIRECT click handler: browser speech/audio unlock may require
  // transient user activation, which is lost when awaiting a Promise.
  this.stop();
  const e=this.env;
  this.voiceAvailable=!!(this.options.voice&&e.speechSynthesis&&e.SpeechSynthesisUtterance);
  this.effectsAvailable=false;this.musicEnabled=false;
  this.enabled=true;this.paused=false;this.musicClock=0;this.musicStep=0;
  if((this.options.sfx||this.options.music)&&this.options.volume>0){
   const Context=e.AudioContext||e.webkitAudioContext;
   if(Context){
    try{
     if(!this.audio){this.audio=new Context();this.ownsAudio=true;}
     const pending=this.audio.resume?.();
     const markReady=()=>{
      if(!this.enabled||this.audio?.state==='suspended')return;
      const missedFirstSound=!this.effectsAvailable&&this.lastCue?.actionId;
      this.effectsAvailable=this.options.sfx;
      this.musicEnabled=this.options.music;
      if(missedFirstSound&&this.effectsAvailable){
       const sfx=audioCueForAction(this.lastCue.actionId);
       if(sfx)try{this._tone({...sfx,gain:.10*this.options.volume});}catch{}
      }
      this.onStatus('本機 WebAudio 已啟動；使用原創合成音效與配樂。');
     };
     this.effectsAvailable=this.options.sfx&&this.audio.state==='running';
     this.musicEnabled=this.options.music&&this.audio.state==='running';
     pending?.then?.(markReady).catch?.(err=>{
      if(!this.enabled)return;
      this.effectsAvailable=false;this.musicEnabled=false;
      this.onStatus('聲音輸出被裝置拒絕：'+String(err.message||err).slice(0,80)+'；字幕仍可用。');
     });
    }catch(err){this.effectsAvailable=false;this.musicEnabled=false;
     this.onStatus('音訊輸出不可用：'+String(err.message||err).slice(0,80)+'；字幕仍可用。');}
   }
  }
  const flags=[this.voiceAvailable?'語音支援':'語音不可用',
   this.effectsAvailable?'音效可用':'音效待啟動或不可用',
   this.musicEnabled?'配樂可用':'配樂待啟動或不可用'];
  this.onStatus('本機音軌：'+flags.join('／')+'；使用原創波形，不使用外部歌曲或雲端聲音生成。');
  return {voice:this.voiceAvailable,sfx:this.effectsAvailable,music:this.musicEnabled,
   actualCloudVoiceGenerated:false,licensedSongUsed:false};
 }
 _tone({hz,end=hz,secs=.12,wave='sine',gain=.07},at){
  const ctx=this.audio;
  if(!ctx||ctx.state==='closed')return false;
  const begin=Number.isFinite(at)?Math.max(ctx.currentTime,at):ctx.currentTime;
  const osc=ctx.createOscillator(),vol=ctx.createGain();
  osc.type=wave;osc.frequency.setValueAtTime(Math.max(30,hz),begin);
  osc.frequency.exponentialRampToValueAtTime(Math.max(30,end),begin+Math.max(.015,secs));
  vol.gain.setValueAtTime(.0001,begin);
  vol.gain.exponentialRampToValueAtTime(Math.max(.0001,gain),begin+.008);
  vol.gain.exponentialRampToValueAtTime(.0001,begin+secs);
  osc.connect(vol);vol.connect(ctx.destination);
  if(this.captureDestination)vol.connect(this.captureDestination);
  const node={osc,vol};this.activeNodes.add(node);
  osc.onended=()=>{this.activeNodes.delete(node);osc.disconnect();vol.disconnect();};
  osc.start(begin);osc.stop(begin+secs+.01);return true;
 }
 step(beat){
  if(!this.enabled||!beat)return;
  this.lastCue={beat:beat.beat,actionId:beat.actionId,text:beat.dialogue||''};
  // Stop ONLY previous tool-generated TTS line so it doesn't overlap next pose.
  const speech=this.env.speechSynthesis;
  if(this.voiceAvailable&&beat.dialogue){
   try{
    speech.cancel();
    const spoken=new this.env.SpeechSynthesisUtterance(beat.dialogue);
    spoken.lang='zh-TW';spoken.rate=.99;spoken.pitch=1.08;
    spoken.volume=Math.max(0,Math.min(1,this.options.volume*1.7));
    const voice=speech.getVoices?.().find(x=>/^zh[-_](TW|Hant)/i.test(x.lang));
    if(voice)spoken.voice=voice;
    speech.speak(spoken);this.speechUtterance=spoken;
   }catch(err){this.voiceAvailable=false;this.onStatus('此裝置無法朗讀台詞；字幕仍顯示。');}
  }
  if(this.effectsAvailable&&this.options.sfx){
   const sfx=audioCueForAction(beat.actionId);
   if(sfx){
    try{this._tone({...sfx,gain:.10*this.options.volume});}
    catch(err){this.effectsAvailable=false;this.onStatus('音效不可用：'+String(err.message||err).slice(0,80)+'；字幕與 GLB 動畫持續。');}
   }
  }
 }
 tick(dt){
  if(!this.enabled||this.paused||!this.musicEnabled||!this.options.music||!this.audio)return;
  if(!Number.isFinite(dt)||dt<0||dt>10)return;
  // Browser audio clock creates true tones, not a user-supplied music file.
  // Bound work per frame on mobile: max two notes after frame drops.
  this.musicClock+=Math.min(dt,.25);
  let budget=2;
  while(this.musicClock>=.34&&budget-->0){
   this.musicClock-=.34;
   const hz=soundtrackNote(this.options.mood,this.musicStep++);
   this._tone({hz,end:hz,secs:.27,wave:'sine',gain:.045*this.options.volume});
  }
 }
 createRecordingBus(){
  if(!this.enabled||!this.audio||this.audio.state==='closed')throw Error('MOVIE_AUDIO_CONTEXT_UNAVAILABLE');
  if(typeof this.audio.createMediaStreamDestination!=='function')throw Error('MOVIE_AUDIO_BUS_UNSUPPORTED');
  this.captureDestination=this.audio.createMediaStreamDestination();
  return this.captureDestination;
 }
 async decodeVoiceFile(buffer){
  if(!this.audio?.decodeAudioData||!(buffer instanceof ArrayBuffer)||buffer.byteLength>20*1024*1024||buffer.byteLength<100)
   throw Error('MOVIE_VOICE_DECODE_UNSUPPORTED');
  const voice=await this.audio.decodeAudioData(buffer.slice(0));
  if(!Number.isFinite(voice.duration)||voice.duration<=0||voice.duration>180)
   throw Error('MOVIE_VOICE_DURATION_UNSUPPORTED');
  return voice;
 }
 playRecordedVoice(audioBuffer){
  if(!this.enabled||!this.audio||!this.captureDestination)throw Error('MOVIE_VOICE_BUS_REQUIRED');
  if(!audioBuffer||!Number.isFinite(audioBuffer.duration))throw Error('MOVIE_VOICE_BUFFER_INVALID');
  // Successive numbered cue files take over exactly at their action beat.
  if(this.recordedVoice)this.stopRecordedVoice();
  const src=this.audio.createBufferSource(),gain=this.audio.createGain();
  src.buffer=audioBuffer;gain.gain.value=Math.max(0,Math.min(1,this.options.volume));
  src.connect(gain);gain.connect(this.audio.destination);gain.connect(this.captureDestination);
  // A real decoded voice waveform drives mouth RMS; never use text length
  // or an invented audio envelope as phoneme evidence.
  let analyser=null,levelData=null;
  if(typeof this.audio.createAnalyser==='function'){
   analyser=this.audio.createAnalyser();analyser.fftSize=512;
   gain.connect(analyser);levelData=new Uint8Array(analyser.fftSize);
  }
  this.recordedVoice={src,gain,analyser,levelData};
  src.onended=()=>{if(this.recordedVoice?.src===src)this.recordedVoice=null;
   try{src.disconnect();gain.disconnect();analyser?.disconnect();}catch{}};
  src.start();
  return {recordedVoiceRoutedToMux:true,voiceDuration:audioBuffer.duration,
    dialogueSpeechSynthRecorded:false,lipSyncConfirmed:false};
 }
 getVoiceLevel(){
  const r=this.recordedVoice;
  if(!r?.analyser||!r.levelData||typeof r.analyser.getByteTimeDomainData!=='function')return 0;
  try{
   r.analyser.getByteTimeDomainData(r.levelData);
   let sum=0;
   for(const b of r.levelData){const v=(b-128)/128;sum+=v*v;}
   // RMS of the actual imported voice buffer, not an invented phoneme map.
   return Math.min(1,Math.sqrt(sum/r.levelData.length)*3);
  }catch{return 0;}
 }
 stopRecordedVoice(){
  if(!this.recordedVoice)return;
  const {src,gain,analyser}=this.recordedVoice;this.recordedVoice=null;
  try{src.stop();}catch{}
  try{src.disconnect();gain.disconnect();analyser?.disconnect();}catch{}
 }
 releaseRecordingBus(){
  this.stopRecordedVoice();
  this.captureDestination=null;
 }
 pause(){
  if(!this.enabled)return;
  this.paused=true;
  if(this.voiceAvailable)try{this.env.speechSynthesis.pause?.();}catch{}
  if(this.audio?.state==='running')try{void this.audio.suspend?.();}catch{}
 }
 resume(){
  if(!this.enabled)return;
  this.paused=false;
  if(this.voiceAvailable)try{this.env.speechSynthesis.resume?.();}catch{}
  if(this.audio?.state==='suspended'){
   try{const p=this.audio.resume?.();p?.catch?.(()=>{this.effectsAvailable=false;this.musicEnabled=false;});}
   catch{this.effectsAvailable=false;this.musicEnabled=false;}
  }
 }
 previewDialogue(text,actionId='turn'){
  if(!this.enabled)throw Error('STORY_AUDIO_NOT_STARTED');
  this.step({beat:0,actionId,dialogue:text});
 }
 stop(){
  this.enabled=false;this.paused=false;this.lastCue=null;
  for(const item of this.activeNodes){
   try{item.osc.stop();}catch{}
   try{item.osc.disconnect();item.vol.disconnect();}catch{}
  }
  this.activeNodes.clear();this.releaseRecordingBus();
  if(this.env?.speechSynthesis&&this.speechUtterance){
   try{this.env.speechSynthesis.cancel();}catch{}
   this.speechUtterance=null;
  }
  if(this.audio&&this.audio.state==='running'){
   try{void this.audio.suspend?.();}catch{}
  }
 }
 dispose(){
  this.stop();
  if(this.ownsAudio&&this.audio){
   try{void this.audio.close?.();}catch{}
  }
  this.audio=null;this.ownsAudio=false;
 }
 get status(){return {enabled:this.enabled,voice:this.voiceAvailable,
  sfx:this.effectsAvailable,music:this.musicEnabled,
  lastCue:this.lastCue,origin:AUDIO_CUE_VERSION,
  realHumanRecordedVoice:false,commercialMusicUsed:false,
  cloudAiDialogueGenerated:false,movieAudioMixdownExported:false};}
}
