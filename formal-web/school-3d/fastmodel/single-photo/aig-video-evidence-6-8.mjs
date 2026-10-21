/**
 * FastModel 6.8 — real browser evidence for MediaRecorder frames.
 * Draw calls are NOT encoded frames; WebAudio tracks attached to a
 * MediaStream are NOT proof the container muxed them. Fail closed.
 */
export const AIG68_SCHEMA='AIG_FASTMODEL_6_8_VIDEO_BROWSER_EVIDENCE';
const round=x=>Number.isFinite(x)?Math.round(x*10000)/10000:null;
const pct=(a,p)=>a.length?a[Math.min(a.length-1,Math.ceil(p*a.length)-1)]:null;
const median=a=>pct(a,.5);
export class AIG68FramePacing{
 constructor({targetFps=30,budget=10800}={}){
  if(!Number.isFinite(targetFps)||targetFps<=0||targetFps>120||
   !Number.isInteger(budget)||budget<3||budget>20000)
   throw Error('AIG68_INVALID_PACING_BUDGET');
  this.targetFps=targetFps;this.budget=budget;this.samples=[];
  this.invalidSamples=0;this.exceededBudget=0;
 }
 mark(timeMs){
  const a=this.samples;
  if(!Number.isFinite(timeMs)||timeMs<0||
   a.length&&timeMs<=a[a.length-1]){
   this.invalidSamples++;return false;
  }
  if(a.length>=this.budget){this.exceededBudget++;return false;}
  a.push(timeMs);return true;
 }
 report(){
  const a=this.samples,intervals=[];
  for(let i=1;i<a.length;i++)intervals.push(a[i]-a[i-1]);
  intervals.sort((x,y)=>x-y);
  const elapsed=a.length>=2?(a[a.length-1]-a[0])/1000:0;
  const measuredFps=elapsed>0?(a.length-1)/elapsed:0;
  const p95=pct(intervals,.95);
  return {schema:AIG68_SCHEMA,measurement:'REAL_CANVAS_DRAW_CALLBACK_TIMESTAMPS',
   canvasDrawCalls:a.length,invalidSamples:this.invalidSamples,
   sampleBudgetExhausted:this.exceededBudget>0,elapsedSeconds:round(elapsed),
   observedCanvasDrawFps:a.length>=3?round(measuredFps):null,
   medianGapMs:round(median(intervals)),p95GapMs:round(p95),
   gapsOver50Ms:intervals.filter(x=>x>50).length,
   targetFps:this.targetFps,
   drawPacingWithinTarget:a.length>=10&&measuredFps>=this.targetFps*.9&&
    p95<=1000/this.targetFps*1.5&&this.invalidSamples===0&&this.exceededBudget===0,
   measuredEncodedFrameCount:false,measuredAudioVideoSync:false,
   runtimeDeviceNativeFpsVerified:false,releaseApproved:false};
 }
}
/** Measured after decoding a REAL encoded output in an HTMLVideoElement.
 * This samples displayed/decoded frames, not all encoded frames in the file.
 */
export function analyzeAIG68DecodedVideoSamples(samples,{width,height,duration}={}){
 if(!Array.isArray(samples)||samples.length>240)throw Error('AIG68_INVALID_FRAME_SAMPLES');
 const clean=[];
 for(const s of samples){
  if(!Number.isFinite(s?.mediaTime)||s.mediaTime<0||
    !Number.isInteger(s?.presentedFrames)||s.presentedFrames<0)continue;
  if(clean.length&&(s.mediaTime<=clean.at(-1).mediaTime||
    s.presentedFrames<=clean.at(-1).presentedFrames))continue;
  clean.push({mediaTime:s.mediaTime,presentedFrames:s.presentedFrames});
 }
 const diffs=[];
 for(let i=1;i<clean.length;i++){
  const dt=clean[i].mediaTime-clean[i-1].mediaTime;
  if(dt>0)diffs.push(dt);
 }
 diffs.sort((a,b)=>a-b);
 const observed=clean.length>=2?
  (clean.at(-1).presentedFrames-clean[0].presentedFrames)/
  (clean.at(-1).mediaTime-clean[0].mediaTime):null;
 const resolutionCorrect=width===1920&&height===1080;
 return {schema:AIG68_SCHEMA,
  measurement:'REAL_HTMLVIDEO_REQUEST_VIDEO_FRAME_CALLBACK',
  encodedVideoMetadataResolution:[width||null,height||null],
  encodedVideoReportedDuration:Number.isFinite(duration)?round(duration):null,
  realEncodedVideoDimensionsConfirmed:resolutionCorrect,
  actualDecodedFramesSampled:clean.length,
  observedDecodedPlaybackFps:round(observed),
  medianDecodedMediaFrameGapMs:diffs.length?round(median(diffs)*1000):null,
  p95DecodedMediaFrameGapMs:diffs.length?round(pct(diffs,.95)*1000):null,
  realBrowserPlaybackSampleVerified:clean.length>=2&&resolutionCorrect,
  actualEntireEncodedFrameCountKnown:false,
  actualAudioTracksDemuxedAndListened:false,
  audioVideoSyncMeasured:false,
  hairNeckAndFaceHumanReviewed:false,
  formalReleaseAllowed:false};
}
function waitMetadata(video,ms,env){
 if(video.readyState>=1&&video.videoWidth>0)return Promise.resolve();
 return new Promise((resolve,reject)=>{
  let done=false;
  const finish=err=>{
   if(done)return;done=true;
   env.clearTimeout(timer);
   video.removeEventListener('loadedmetadata',ok);
   video.removeEventListener('error',bad);
   if(err)reject(err);else resolve();
  };
  const ok=()=>finish(),bad=()=>finish(Error('AIG68_VIDEO_DECODE_METADATA_ERROR'));
  video.addEventListener('loadedmetadata',ok);
  video.addEventListener('error',bad);
  const timer=env.setTimeout(()=>finish(Error('AIG68_VIDEO_METADATA_TIMEOUT')),ms);
  try{video.load?.();}catch(err){finish(err);}
 });
}
/** User-triggered (button click) actual browser video playback probe.
 * Video must refer to a real MediaRecorder blob. Never reports audio mux
 * as verified from a mere MediaStreamDestination track attachment.
 */
export async function probeAIG68EncodedPlayback(video,{
 env=globalThis,timeoutMs=6500,maxFrames=42
}={}){
 if(!video||typeof video.src!=='string'||!video.src.startsWith('blob:')||
  !Number.isFinite(timeoutMs)||timeoutMs<1000||timeoutMs>20000||
  !Number.isInteger(maxFrames)||maxFrames<2||maxFrames>120)
  throw Error('AIG68_REAL_BLOB_VIDEO_REQUIRED');
 await waitMetadata(video,timeoutMs,env);
 const width=video.videoWidth,height=video.videoHeight,duration=video.duration;
 if(width!==1920||height!==1080)
  return analyzeAIG68DecodedVideoSamples([],{width,height,duration});
 if(typeof video.requestVideoFrameCallback!=='function')
  return {...analyzeAIG68DecodedVideoSamples([],{width,height,duration}),
   unsupportedReason:'BROWSER_VIDEO_FRAME_CALLBACK_MISSING'};
 const collected=[];let handle=null,finished=false,timer,done;
 const completed=new Promise(resolve=>done=resolve);
 const cleanup=()=>{
  if(finished)return;finished=true;
  env.clearTimeout(timer);
  if(handle!=null)try{video.cancelVideoFrameCallback?.(handle);}catch{}
  video.removeEventListener?.('ended',cleanup);
  video.pause?.();
  done();
 };
 try{
  video.pause?.();
  video.currentTime=0;
  const callback=(now,meta)=>{
   if(finished)return;
   if(meta&&Number.isFinite(meta.mediaTime)&&Number.isInteger(meta.presentedFrames))
    collected.push({mediaTime:meta.mediaTime,presentedFrames:meta.presentedFrames});
   if(collected.length>=maxFrames){cleanup();return;}
   handle=video.requestVideoFrameCallback(callback);
  };
  video.addEventListener?.('ended',cleanup);
  handle=video.requestVideoFrameCallback(callback);
  timer=env.setTimeout(cleanup,timeoutMs);
  await video.play();
  await completed;
 }catch(e){cleanup();return {...analyzeAIG68DecodedVideoSamples(collected,{width,height,duration}),
   playbackFailedReason:String(e?.message||e).slice(0,120)};}
 return analyzeAIG68DecodedVideoSamples(collected,{width,height,duration});
}
