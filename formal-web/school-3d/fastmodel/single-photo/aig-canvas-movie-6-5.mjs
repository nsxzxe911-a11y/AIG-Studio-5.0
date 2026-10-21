/** FastModel 6.5 REAL offline animated Canvas frames, optional foreground
 * parallax, actual MediaRecorder video and optional WebAudio recording bus.
 * No GLB is needed in 2D/2.5D; a flat photo is never claimed to be a
 * rigged character or a true per-limb/full-body animation.
 */
import {chooseMovieFormat} from './movie-recorder.mjs';
import {AIG65_SCHEMA,sampleAIG65FlatMotion,
 analyzeAIG65ForegroundPixels} from './aig-auto-animation-6-5.mjs';
export const AIG65_CAPTURE_SCHEMA='AIG_FASTMODEL_6_5_REAL_CANVAS_IMAGE_MOVIE_RECORDING';
export const AIG65_MOVIE_SIZE=Object.freeze({width:1920,height:1080,fpsTarget:30});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const hex=x=>typeof x==='string'&&/^[0-9a-f]{64}$/i.test(x);
export function prepareAIG65Layers(doc,image){
 if(!doc?.createElement||!image||!Number.isFinite(image.width)||!Number.isFinite(image.height)||
  image.width<32||image.height<32)throw Error('AIG65_REAL_IMAGE_LAYERS_REQUIRED');
 const maxDim=1000,scale=Math.min(1,maxDim/Math.max(image.width,image.height));
 const c=doc.createElement('canvas');
 c.width=Math.max(32,Math.round(image.width*scale));
 c.height=Math.max(32,Math.round(image.height*scale));
 const cx=c.getContext('2d',{willReadFrequently:true});
 if(!cx)throw Error('AIG65_CANVAS_IMAGE_CONTEXT_UNAVAILABLE');
 cx.drawImage(image,0,0,c.width,c.height);
 const photo=cx.getImageData(0,0,c.width,c.height);
 const evidence=analyzeAIG65ForegroundPixels(photo);
 if(!evidence.hasDistinctForeground)return {
  image,background:image,foreground:null,evidence,
  visualMethod:'FLAT_IMAGE_CAMERA_ONLY_NO_DEPTH_SEPARATION',
  exactObjectMaskVerified:false
 };
 const front=doc.createElement('canvas');front.width=c.width;front.height=c.height;
 const fgCtx=front.getContext('2d');
 if(!fgCtx)throw Error('AIG65_FOREGROUND_CANVAS_UNAVAILABLE');
 const pixels=new Uint8ClampedArray(photo.data),back=evidence.backgroundMedianRGB;
 let retained=0;
 for(let i=0;i<pixels.length;i+=4){
  const alpha=pixels[i+3],distance=back?Math.hypot(
   pixels[i]-back[0],pixels[i+1]-back[1],pixels[i+2]-back[2]
  ):255;
  // Pixels with genuine alpha stay genuine; opaque pixels use a
  // source-derived, soft color-key only — neither semantic segmentation
  // nor true camera depth can be inferred here.
  const matte=back?clamp((distance-38)/94,0,1):1;
  pixels[i+3]=Math.round(alpha*matte);
  if(pixels[i+3]>128)retained++;
 }
 if(retained<c.width*c.height*.025)return {
  image,background:image,foreground:null,evidence,
  visualMethod:'NO_RELIABLE_MATTE_FALLBACK_FLAT',
  exactObjectMaskVerified:false
 };
 fgCtx.putImageData(new ImageData(pixels,c.width,c.height),0,0);
 return {image,background:image,foreground:front,evidence,
  visualMethod:back?'HEURISTIC_2_5D_RGB_MATTE_PARALLAX':
   'ACTUAL_ALPHA_LAYER_PARALLAX',
  exactObjectMaskVerified:false
 };
}
function fillImage(ctx,bitmap,w,h,ox=0,oy=0,scale=1){
 if(!bitmap||!Number.isFinite(bitmap.width)||!Number.isFinite(bitmap.height))return;
 const cover=Math.max(w/bitmap.width,h/bitmap.height)*scale;
 const bw=bitmap.width*cover,bh=bitmap.height*cover;
 ctx.drawImage(bitmap,(w-bw)/2+ox,(h-bh)/2+oy,bw,bh);
}
export function drawAIG65CanvasFrame({
 ctx,canvas,plan,timeSeconds,layered=null,caption=''
}={}){
 if(!ctx||typeof ctx.fillRect!=='function'||!canvas||
  !Number.isFinite(canvas.width)||!Number.isFinite(canvas.height)||
  canvas.width<24||canvas.height<24||plan?.schema!==AIG65_SCHEMA||
  !plan.ready||plan.selectedMode==='3D')
  throw Error('AIG65_REAL_CANVAS_2D_PLAN_REQUIRED');
 const motion=sampleAIG65FlatMotion(plan,timeSeconds),
  w=canvas.width,h=canvas.height,t=motion.timeSeconds;
 ctx.save();ctx.fillStyle='#020407';ctx.fillRect(0,0,w,h);
 if(layered?.image){
  // Background is an image, NOT a generated 3D environmental scene.
  // Foreground depth is unverified even when a true alpha mask is present.
  ctx.save();ctx.translate(w/2,h/2);
  ctx.scale(motion.transform.zoom,motion.transform.zoom);
  ctx.translate(-w/2,-h/2);
  fillImage(ctx,layered.background||layered.image,w,h,
   -motion.depthOffset*w*.65,0,1.055);
  ctx.restore();
  if(plan.selectedMode==='2.5D'&&layered.foreground){
   ctx.save();ctx.translate(w/2,h/2);
   ctx.scale(motion.transform.zoom*1.09,motion.transform.zoom*1.09);
   ctx.rotate(motion.transform.angle);
   ctx.translate(-w/2,-h/2);
   fillImage(ctx,layered.foreground,w,h,
    (motion.transform.x+motion.depthOffset)*w,
    motion.transform.y*h,1);
   ctx.restore();
  }else{
   ctx.save();ctx.translate(w/2,h/2);
   ctx.rotate(motion.transform.angle);
   ctx.translate(-w/2,-h/2);
   // 2D route uses the real photo's transformed pixel sheet.
   if(plan.selectedMode==='2D')fillImage(ctx,layered.image,w,h,
    motion.transform.x*w,motion.transform.y*h,motion.transform.zoom);
   ctx.restore();
  }
 }else{
  // Text-only story still produces REAL animated typographic pixel frames,
  // never claims to synthesize a visual human character.
  const hue=190+Math.round(35*Math.sin(t*.7));
  const gradient=ctx.createLinearGradient(0,0,w,h);
  gradient.addColorStop(0,'#081b29');gradient.addColorStop(1,'#190e2b');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);
  ctx.fillStyle='hsla('+hue+',78%,65%,0.24)';
  for(let i=0;i<7;i++){
   ctx.beginPath();
   ctx.arc((i+1)*w/8+Math.sin(t*.35+i)*w*.035,
    h*(.2+.09*Math.cos(i+t*.3)),w*.043,0,Math.PI*2);
   ctx.fill();
  }
  const text=motion.beat.text||motion.beat.label||'AIG AUTO';
  ctx.fillStyle='#fff';ctx.textAlign='center';
  ctx.font='bold '+Math.round(w*.037)+'px sans-serif';
  const lines=String(text).match(/.{1,21}/gu)?.slice(0,3)||[];
  lines.forEach((line,i)=>ctx.fillText(line,w/2,h*.46+i*h*.07,w*.86));
 }
 const action=motion.beat.label||'動畫';
 ctx.fillStyle='rgba(2,4,7,.77)';ctx.fillRect(w*.045,h*.815,w*.91,h*.145);
 ctx.fillStyle='#d5faff';ctx.textAlign='left';
 ctx.font='bold '+Math.round(w*.024)+'px sans-serif';
 ctx.fillText('AIG '+plan.selectedMode+' · '+action,w*.075,h*.861,w*.81);
 const line=String(caption||motion.beat.text||'').slice(0,180);
 if(line){ctx.fillStyle='#fff';ctx.font=Math.round(w*.022)+'px sans-serif';
  ctx.fillText(line,w*.075,h*.927,w*.82);}
 ctx.restore();
 return {...motion,
  actualImagePixelFrameProduced:true,
  layeredParallaxActive:!!(plan.selectedMode==='2.5D'&&layered?.foreground),
  actualHumanJointPositionsComputed:false};
}
export class AIG65CanvasRecorder{
 constructor({env=globalThis,onStatus=()=>{}}={}){
  this.env=env;this.onStatus=onStatus;
  this.recorder=null;this.state='IDLE';this.chunks=[];this.frames=0;
  this.reject=null;this.resolve=null;this.promise=null;
  this.stream=null;this.format=null;this.canvas=null;this.lastError=null;
  this.tracks=[];this.sourceSHA256=null;this.audioTracks=0;
 }
 begin({canvas,plan,sourceSHA256,audioDestination=null}={}){
  if(this.state==='RECORDING'||this.state==='FINALIZING')throw Error('AIG65_CAPTURE_ALREADY_RUNNING');
  if(!plan?.ready||plan.selectedMode==='3D'||plan.schema!==AIG65_SCHEMA||
   sourceSHA256!==plan.sourceSHA256&&!(sourceSHA256===null&&!plan.hasImage)||
   !canvas||canvas.width!==1920||canvas.height!==1080||
   typeof canvas.captureStream!=='function')
   throw Error('AIG65_REAL_1080P_FLAT_SOURCE_REQUIRED');
  if(sourceSHA256!==null&&!hex(sourceSHA256))throw Error('AIG65_VIDEO_SHA_INVALID');
  const MediaRecorderImpl=this.env.MediaRecorder,format=chooseMovieFormat(MediaRecorderImpl);
  const video=canvas.captureStream(AIG65_MOVIE_SIZE.fpsTarget);
  const tracks=video.getVideoTracks?.()||[];
  if(!tracks.length)throw Error('AIG65_REAL_VIDEO_TRACK_REQUIRED');
  const audio=audioDestination?.stream?.getAudioTracks?.()||[];
  if(typeof this.env.MediaStream!=='function')throw Error('AIG65_MEDIA_STREAM_UNAVAILABLE');
  const stream=new this.env.MediaStream([...tracks,...audio]);
  this.state='RECORDING';this.frames=0;this.chunks=[];
  this.canvas=canvas;this.tracks=tracks;this.stream=stream;
  this.sourceSHA256=sourceSHA256;this.format=format;this.audioTracks=audio.length;
  this.promise=new Promise((res,rej)=>{this.resolve=res;this.reject=rej;});
  this.promise.catch(()=>{});
  try{
   const recorder=new MediaRecorderImpl(stream,{mimeType:format.mime,
    videoBitsPerSecond:6000000,audioBitsPerSecond:160000});
   this.recorder=recorder;
   recorder.ondataavailable=e=>{if(e.data?.size>0)this.chunks.push(e.data);};
   recorder.onerror=e=>this.fail(e.error||Error('AIG65_MEDIARECORDER_ERROR'));
   recorder.onstop=()=>this.finish();
   recorder.start(300);
   this.onStatus('已啟動真正 1920×1080 Canvas 錄製；目標 30 FPS，實測 FPS 尚未驗證。');
  }catch(error){this.fail(error);throw error;}
  return {format:format.ext,encodedMimeType:format.mime,audioTracks:audio.length};
 }
 frame(){if(this.state==='RECORDING')this.frames++;}
 stop(){
  if(this.state!=='RECORDING')return this.promise||Promise.reject(Error('AIG65_NOT_RECORDING'));
  this.state='FINALIZING';
  try{if(this.recorder?.state!=='inactive')this.recorder.stop();else this.finish();}
  catch(err){this.fail(err);}
  return this.promise;
 }
 finish(){
  if(this.state==='FAILED'||this.state==='COMPLETE')return;
  const size=this.chunks.reduce((sum,x)=>sum+x.size,0);
  if(size===0||this.frames<2){this.fail(Error('AIG65_EMPTY_OR_UNRENDERED_VIDEO'));return;}
  const blob=new Blob(this.chunks,{type:this.format.mime});
  this.state='COMPLETE';
  const output={blob,filename:'AIG-6.5-REAL-2D-2.5D-1080p.'+this.format.ext,
   evidence:{schema:AIG65_CAPTURE_SCHEMA,
    sourceSHA256:this.sourceSHA256,
    outputMimeType:this.format.mime,container:this.format.ext,
    actualBytes:blob.size,actualFramesDrawn:this.frames,
    targetResolution:[1920,1080],targetFps:30,
    audioTracksRecorded:this.audioTracks,
    systemSpeechSynthesisCaptured:false,
    actualMeasuredFpsStable30:false,
    trueHumanLimbAnimation:false,actual3DDepthReconstructed:false,
    originalGLBMoviePipelineUnmodified:true,
    releaseAllowed:false}};
  this.cleanup();this.resolve?.(output);
  this.onStatus('真正的影像編碼完成：'+blob.size+' bytes／'+this.frames+' Canvas 更新幀。');
 }
 fail(error){
  if(this.state==='FAILED'||this.state==='COMPLETE')return;
  this.lastError=error;this.state='FAILED';
  try{if(this.recorder?.state==='recording')this.recorder.stop();}catch{}
  this.cleanup();this.reject?.(error);
 }
 cleanup(){
  for(const t of this.tracks)try{t.stop();}catch{}
  this.tracks=[];this.stream=null;this.recorder=null;this.canvas=null;
 }
}
