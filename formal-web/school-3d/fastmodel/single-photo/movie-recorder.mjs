/** AIG FastModel 3.4 — real client-side canvas and WebAudio stream mux.
 * Outputs actual MediaRecorder-supported WebM/MP4 only, never relabels files.
 * Requires a real character GLB, fully resolved real clip plan, and user click.
 * Browser SpeechSynthesis is NOT captured. Optional user-provided decoded voice
 * file is routed into the same recording audio mix as original SFX and music.
 */
export const MOVIE_SOURCE_VERSION='AIG_FASTMODEL_3_4_ACTUAL_CANVAS_MEDIARECORDER';
export const MOVIE_SIZE=Object.freeze({width:1920,height:1080,fps:30});
const MOVIE_MIMES=Object.freeze([
 {mime:'video/mp4;codecs="avc1.42E01E,mp4a.40.2"',ext:'mp4'},
 {mime:'video/mp4',ext:'mp4'},
 {mime:'video/webm;codecs=vp9,opus',ext:'webm'},
 {mime:'video/webm;codecs=vp8,opus',ext:'webm'},
 {mime:'video/webm',ext:'webm'}
]);
export function chooseMovieFormat(MediaRecorderImpl,{preferMp4=true}={}){
 if(typeof MediaRecorderImpl!=='function'||typeof MediaRecorderImpl.isTypeSupported!=='function')
  throw Error('MOVIE_MEDIARECORDER_UNSUPPORTED');
 const options=preferMp4?MOVIE_MIMES:[...MOVIE_MIMES].sort((a,b)=>(a.ext==='webm'?0:1)-(b.ext==='webm'?0:1));
 for(const f of options)if(MediaRecorderImpl.isTypeSupported(f.mime))return {...f};
 throw Error('MOVIE_CODEC_UNAVAILABLE');
}
export function validateMovieSource({plan,sourceSha256,clips,haveModel,dialogueOrigin,voiceFile}={}){
 if(!haveModel||!/^[0-9a-f]{64}$/i.test(sourceSha256||''))throw Error('MOVIE_VERIFIED_GLB_SOURCE_REQUIRED');
 if(!plan?.ready||!Array.isArray(plan.timeline)||!plan.timeline.length)throw Error('MOVIE_REAL_ACTION_TIMELINE_REQUIRED');
 if(!Number.isFinite(plan.seconds)||plan.seconds<.1||plan.seconds>180)throw Error('MOVIE_DURATION_BUDGET');
 if(!Array.isArray(clips))throw Error('MOVIE_CLIPS_REQUIRED');
 for(const beat of plan.timeline){
  const clip=clips[beat.index];
  if(!clip||clip!==undefined&&(clip.name!==beat.clipName||clip.duration!==beat.clipDuration||
    !clip.tracks?.length))throw Error('MOVIE_CLIP_SOURCE_CHANGED');
 }
 if(!['OFFLINE_TEMPLATE','OpenAI',undefined].includes(dialogueOrigin))throw Error('MOVIE_DIALOGUE_SOURCE_INVALID');
 if(voiceFile&&(voiceFile.size>20*1024*1024||voiceFile.size<100||
   !/^(audio\/(wav|wave|x-wav|mpeg|mp3|ogg|webm|mp4)|application\/octet-stream)$/.test(voiceFile.type)))
  throw Error('MOVIE_VOICE_FILE_INVALID');
 return {status:'SOURCE_READY_RECORDING_NOT_STARTED',width:MOVIE_SIZE.width,
  height:MOVIE_SIZE.height,targetFps:MOVIE_SIZE.fps,
  sourceGLB_SHA256:sourceSha256.toLowerCase(),durationSeconds:plan.seconds,
  hasExternalVoiceFile:!!voiceFile,
  browserSpeechIncluded:false,verifiedHumanCharacterApproved:false,
  native60fpsProven:false,outputFileWritten:false};
}
export class RealMovieCapture{
 constructor({env=globalThis,onState=()=>{}}={}){
  this.env=env;this.onState=onState;this.state='IDLE';this.blobs=[];
  this.recorder=null;this.stream=null;this.destination=null;this.captureCanvas=null;
  this.videoTracks=[];this.startedAt=0;this.framesDrawn=0;this.subtitle='';
  this.source=null;this.output=null;this.format=null;this.ctx=null;
  this._resolve=null;this._reject=null;this._finished=null;
  this.stopRequested=false;this.captureFrameStep=1000/MOVIE_SIZE.fps;
 }
 begin({sourceCanvas,audioDestination,sourceSha256,plan,clips,haveModel,
   dialogueOrigin,voiceFile=null,sourceTimeNow=()=>0}={}){
  if(this.state!=='IDLE'&&this.state!=='COMPLETE'&&this.state!=='FAILED')throw Error('MOVIE_ALREADY_RECORDING');
  validateMovieSource({plan,sourceSha256,clips,haveModel,dialogueOrigin,voiceFile});
  if(!sourceCanvas||typeof sourceCanvas.width!=='number'||!sourceCanvas.width)
   throw Error('MOVIE_RENDER_CANVAS_REQUIRED');
  const MediaRecorderImpl=this.env.MediaRecorder;
  const format=chooseMovieFormat(MediaRecorderImpl);
  const canvas=this.env.document?.createElement?.('canvas');
  if(!canvas?.captureStream||!canvas?.getContext)throw Error('MOVIE_CANVAS_CAPTURE_UNSUPPORTED');
  canvas.width=MOVIE_SIZE.width;canvas.height=MOVIE_SIZE.height;
  const ctx=canvas.getContext('2d',{alpha:false});
  if(!ctx)throw Error('MOVIE_2D_COMPOSITOR_UNAVAILABLE');
  const videoStream=canvas.captureStream(MOVIE_SIZE.fps);
  const videoTracks=videoStream?.getVideoTracks?.()||[];
  if(!videoTracks.length)throw Error('MOVIE_VIDEO_TRACK_MISSING');
  // The local audio mix is an AudioContext MediaStreamDestination. Web Speech
  // synthesized audio is NEVER part of the recording and must be disclosed.
  const audioTracks=audioDestination?.stream?.getAudioTracks?.()||[];
  const mix=new this.env.MediaStream([...videoTracks,...audioTracks]);
  this.state='RECORDING';this.blobs=[];this.output=null;this.framesDrawn=0;
  this.stopRequested=false;this.format=format;this.captureCanvas=canvas;
  this.ctx=ctx;this.stream=mix;this.videoTracks=videoTracks;
  this.source=sourceCanvas;this.startedAt=sourceTimeNow();
  this.lastRenderedTime=-Infinity;
  this._finished=new Promise((resolve,reject)=>{this._resolve=resolve;this._reject=reject;});
  // The encoder may fail asynchronously before the UI awaits stop(). Keep a
  // handled promise to avoid browser-level unhandled rejection noise.
  this._finished.catch(()=>{});
  let recorder;
  try{
   recorder=new MediaRecorderImpl(mix,{mimeType:format.mime,
    videoBitsPerSecond:6500000,audioBitsPerSecond:160000});
   this.recorder=recorder;
   recorder.ondataavailable=e=>{if(e?.data?.size>0)this.blobs.push(e.data);};
   recorder.onerror=e=>this.fail(e?.error||Error('MOVIE_ENCODER_ERROR'));
   recorder.onstop=()=>{
    if(this.state==='FAILED')return;
    this._finish();
   };
   recorder.start(500);
   this.onState({state:'RECORDING',format:format.ext,width:1920,height:1080,fpsTarget:30,
    audioTrackIncluded:audioTracks.length>0,browserTtsCaptured:false});
   return {format:format.ext,mime:format.mime,audioTrackIncluded:audioTracks.length>0};
  }catch(e){this.fail(e);throw e;}
 }
 draw(timeMs,subtitle=''){
  if(this.state!=='RECORDING'||!Number.isFinite(timeMs))return false;
  if(timeMs-this.lastRenderedTime+1e-6<this.captureFrameStep)return false;
  this.lastRenderedTime=timeMs;
  const ctx=this.ctx,src=this.source;
  try{
   ctx.fillStyle='#020407';ctx.fillRect(0,0,1920,1080);
   ctx.drawImage(src,0,0,1920,1080);
   if(subtitle){
    const text=String(subtitle).slice(0,240);
    ctx.fillStyle='rgba(2,4,7,.84)';
    ctx.fillRect(120,914,1680,108);
    ctx.fillStyle='#ffffff';ctx.textAlign='center';
    ctx.font='bold 40px sans-serif';
    const lines=[...text.matchAll(/.{1,38}/gu)].map(x=>x[0]).slice(0,2);
    lines.forEach((line,i)=>ctx.fillText(line,960,965+i*44,1620));
   }
   this.framesDrawn++;
   return true;
  }catch(e){this.fail(e);return false;}
 }
 stop(){
  if(this.state!=='RECORDING')return this._finished||Promise.reject(Error('MOVIE_NOT_RECORDING'));
  this.state='FINALIZING';this.stopRequested=true;
  try{
   if(this.recorder?.state!=='inactive')this.recorder.stop();
   else this._finish();
  }catch(e){this.fail(e);}
  return this._finished;
 }
 _finish(){
  if(this.state==='COMPLETE'||this.state==='FAILED')return;
  const bytes=this.blobs.reduce((s,x)=>s+x.size,0);
  if(!bytes||!this.framesDrawn){this.fail(Error('MOVIE_EMPTY_CAPTURE'));return;}
  const blob=new Blob(this.blobs,{type:this.format.mime});
  const evidence={schema:MOVIE_SOURCE_VERSION,
   container:this.format.ext,encodedMimeType:this.format.mime,
   actualFramesDrawn:this.framesDrawn,targetFrameRate:MOVIE_SIZE.fps,
   resolution:[MOVIE_SIZE.width,MOVIE_SIZE.height],
   audioTracksInFile:this.stream?.getAudioTracks?.().length||0,
   browserSpeechCaptured:false,sourceGLBUnmodified:true,
   realGPUFps30Measured:false,native60fpsVerified:false,
   heroineAnatomyVerified:false,storyChoreographyApproved:false,
   note:'Real browser MediaRecorder output. Frame cadence and codec quality depend on actual device; this is not measured constant frame rate or evidence of real heroine approval.'
  };
  this.output={blob,filename:'AIG-FastModel-3-4-Real-1080p.'+this.format.ext,evidence};
  this.state='COMPLETE';
  this.cleanup();
  this._resolve?.(this.output);
  this.onState({state:'COMPLETE',...evidence,sizeBytes:bytes});
 }
 fail(error){
  if(this.state==='FAILED'||this.state==='COMPLETE')return;
  this.state='FAILED';
  try{if(this.recorder?.state==='recording')this.recorder.stop();}catch{}
  this.cleanup();
  this._reject?.(error instanceof Error?error:Error(String(error)));
  this.onState({state:'FAILED',error:String(error?.message||error),fileClaimed:false});
 }
 cleanup(){
  for(const track of this.videoTracks)try{track.stop?.();}catch{}
  this.videoTracks=[];this.recorder=null;this.captureCanvas=null;this.ctx=null;this.source=null;
  this.stream=null;
 }
}
