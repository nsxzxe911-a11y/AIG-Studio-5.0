/** V95 real local image pixels, inferred 3D rig, native GPU and WebM. */
import {runAIGReal3DLocalPortraitToRig,createAIGReal3DResourceScheduler,
 planAIGReal3DFilmSegments}
 from './aig-real3d-v95-ai-orchestrator.mjs';
import {createAIG3DRenderer} from './aig-real3d-webgl.mjs';
import {planAIGReal3DNative4K,auditAIGReal3D4KSourceProjection,
 captureAIGReal3DNative4K,AIG_REAL3D_V96_OUTPUTS}
 from './aig-real3d-v96-native-4k-pipeline.mjs';
const $=id=>document.getElementById(id);
const canvas=$('model'),scheduler=createAIGReal3DResourceScheduler(),
 CANON_PREVIOUSLY_RECORDED_SHA='fbf47f32a844a80e1bb39cb23084527baaf1350427c20d2b49d21fdc453444d6';
let renderer=null,out=null,frame=0,playing=false,raf=null,start=0,busy=false,
 cameraMode='oblique',reportURL=null,videoURL=null,photoURL=null,lastDrawMs=0,
 highQualityURL=null,last4KReport=null;
const cameraAngles={front:[0,.1],side:[Math.PI/2,.1],back:[Math.PI,.1],
 oblique:[.65,.23]};
function status(t){$('status').textContent=t;}
function setReady(ready){
 for(const k of ['play','front','side','back','oblique','png','webm','proof','quality4k','capture4k'])
  $(k).disabled=!ready;
 $('pause').disabled=true;
}
function stop(){
 playing=false;if(raf!==null)cancelAnimationFrame(raf);raf=null;
 $('pause').disabled=true;$('play').disabled=busy||!out;
}
async function originalSHA(data){
 return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data)),
  v=>v.toString(16).padStart(2,'0')).join('');
}
function poseCamera(){
 const [yaw,pitch]=cameraAngles[cameraMode];
 renderer.setCamera({projection:'orthographic',yaw,pitch,
  focus:[0,.84,0],orthoSpan:2.15,distance:4});
}
function proof(){
 if(!out)return;
 const p=out.candidate;
 $('evidence').textContent=JSON.stringify({
  pipeline:out.schema,
  originalPortraitSHA:out.vision.imageSha256,
  canonicalHeroineAuthoritySHAHistoricallyRecorded:CANON_PREVIOUSLY_RECORDED_SHA,
  visualFaceIdentityActuallyVerified:false,
  originalFaceNeverReplacedByNewApprovedAuthority:true,
  inputLandmarkerSource:out.vision.landmarkSource,
  detectionConfidence:out.vision.confidence,
  trainedAIModelActuallyInvoked:out.generativeAIMLModelInvoked,
  fullBodyHeightActuallyMeasured:false,
  inferredBodyHeightMeters:p.inferredHeightMeters,
  inputSourceFaceBoxPixels:out.vision.faceBox,
  actualIndexed3DTriangles:p.realIndexed3DTriangles,
  actualJointCount:p.realSkinnedJoints,
  bodySourceType:'PROVISIONAL_INFERRED_3D_PROXY_NOT_SCAN',
  fullHalfWrapAllSkeletonBonesEvaluated:true,
  currentMotionSeconds:frame/100,
  sourceSceneNeverPromotedToFormalIdentity:true,
  cachedResources:scheduler.snapshot(),
  currentSDRColorPipeline:renderer?.getColorPipeline?.()??null,
  lastGPUFrameCostMs:lastDrawMs,
  twoHourFilmActuallyProduced:false,formalReleasePASS:false
 },null,2);
}
function render(index){
 if(!out||!renderer)return;
 poseCamera();
 const time=Math.min(1.5,Math.max(0,index/100));
 const then=performance.now();
 const result=out.candidate.rig.updateGPU(renderer,time);
 lastDrawMs=performance.now()-then;
 scheduler.decide({triangles:result.actualOriginalTriangleCount,
  frameRenderMilliseconds:lastDrawMs,targetFPS:24,
  dynamicJointCount:result.sampledJoints});
 frame=index;$('frame').value=String(index);
 $('number').textContent=time.toFixed(2)+' s';
 status('真 WebGL 3D 影格｜'+result.actualOriginalTriangleCount+
  ' 個原始候選三角面｜'+result.sampledJoints+' 個動態關節｜GPU/CPU '+lastDrawMs.toFixed(1)+
  'ms｜正式女主角臉部比對 BLOCK');
 if(index%20===0||index===150)proof();
}
async function build(){
 const file=$('photo').files?.[0];
 if(!file)throw Error('請選擇肩膀以上照片');
 if(file.size<200||file.size>8_000_000)throw Error('照片 200 bytes～8 MB 限制，超出 BLOCK');
 busy=true;stop();setReady(false);
 try{
  const bytes=await file.arrayBuffer(),sha=await originalSHA(bytes);
  const bitmap=await createImageBitmap(file);
  const ratio=Math.min(1,1024/Math.max(bitmap.width,bitmap.height));
  const w=Math.max(96,Math.round(bitmap.width*ratio)),
   h=Math.max(96,Math.round(bitmap.height*ratio));
  const tmp=document.createElement('canvas');tmp.width=w;tmp.height=h;
  const ctx=tmp.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(bitmap,0,0,w,h);bitmap.close();
  const rgba=ctx.getImageData(0,0,w,h).data;
  const preview=$('source-photo'),pctx=preview.getContext('2d');
  pctx.clearRect(0,0,preview.width,preview.height);
  pctx.drawImage(tmp,0,0,preview.width,preview.height);
  out=runAIGReal3DLocalPortraitToRig({
   rgba,width:w,height:h,imageSha256:sha,
   approvedIdentitySha256:CANON_PREVIOUSLY_RECORDED_SHA,
   approvedIdentitySourcePresent:false,
   scheduler,wrapMode:$('mode').value
  });
  if(!out.true3DModelGenerated)throw Error('照片沒有足夠臉部色彩線索，自動候選 BLOCK');
  if(renderer)renderer.destroy();
  last4KReport=null;
  $('quality-report').textContent='尚未檢查 4K 原始幾何與 GPU。';
  renderer=createAIG3DRenderer(canvas,{pixelRatio:1,quality:'balanced',
   maxTriangles:200000,preserveDrawingBuffer:true,
   background:[.017,.034,.058,1]});
  if(renderer.status!=='READY')throw Error('真正的 WebGL GPU 未啟用，不能用假貼圖替代');
  renderer.setInspectionMode('LIT');
  renderer.setColorPipeline($('colorPipeline').value);
  frame=0;render(0);setReady(true);proof();
 }finally{busy=false;}
}
$('build').addEventListener('click',async()=>{
 status('本機解析照片、建立推估 3D 骨架；沒有上傳照片...');
 try{await build();}catch(e){
  out=null;setReady(false);status('BLOCK：'+String(e?.message??e));}
});
$('mode').addEventListener('change',()=>{
 if(out&&!busy){$('build').click();}
});
for(const key of Object.keys(cameraAngles))
 $(key).addEventListener('click',()=>{
  if(!out||busy)return;cameraMode=key;
  try{render(frame);}catch(e){status('BLOCK：'+String(e?.message??e));}
 });
$('frame').addEventListener('input',value=>{
 if(!out||busy)return;stop();
 try{render(Number(value.target.value));}catch(e){status('BLOCK：'+e.message);}
});
$('play').addEventListener('click',()=>{
 if(!out||playing||busy)return;
 playing=true;$('play').disabled=true;$('pause').disabled=false;
 start=performance.now()-frame*10;
 const tick=stamp=>{
  if(!playing)return;
  const next=Math.min(150,Math.floor((stamp-start)/10));
  if(next!==frame)render(next);
  if(next>=150){stop();return;}
  raf=requestAnimationFrame(tick);
 };
 raf=requestAnimationFrame(tick);
});
$('pause').addEventListener('click',stop);
$('png').addEventListener('click',async()=>{
 if(!out||busy)return;stop();busy=true;
 try{
  const p=await renderer.captureNativePNG(out.candidate.rig.workingScene,
   {width:960,height:640});
  if(!p.genuineGpuReadback)throw Error('Native GL RGBA readback absent');
  if(photoURL)URL.revokeObjectURL(photoURL);
  photoURL=URL.createObjectURL(p.blob);
  const a=document.createElement('a');a.href=photoURL;
  a.download='Real3D-V95-INFERRED-3D-NOT-CERTIFIED.png';a.click();
  status('真 GPU PNG SHA '+p.sha256+'；並非正式女主角 1:1 模型');
 }catch(e){status('BLOCK：'+e.message);}finally{busy=false;}
});
$('webm').addEventListener('click',async()=>{
 if(!out||busy)return;stop();busy=true;
 if(typeof MediaRecorder!=='function'||typeof canvas.captureStream!=='function'){
  busy=false;status('BLOCK：瀏覽器不支援真正的 GPU WebM 擷取');return;
 }
 const mime=['video/webm;codecs=vp8','video/webm'].find(x=>
  MediaRecorder.isTypeSupported(x));
 if(!mime){busy=false;status('BLOCK：瀏覽器沒有 WebM 編碼器');return;}
 const stream=canvas.captureStream(0),track=stream.getVideoTracks()[0];
 if(typeof track?.requestFrame!=='function'){
  stream.getTracks().forEach(t=>t.stop());busy=false;
  status('BLOCK：無法手動提交真 3D WebM 影格');return;
 }
 const chunks=[],rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:3400000});
 let error=null,begin=null,index=-1,submitted=0,stopped=false;
 const done=new Promise((resolve,reject)=>{
  rec.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data);};
  rec.onerror=e=>{error=e.error??Error('ENCODER_ERROR');};
  rec.onstop=()=>error?reject(error):resolve();
 });
 $('play').disabled=true;$('webm').disabled=true;
 try{
  rec.start();
  while(index<35){
   const stamp=await new Promise(resolve=>requestAnimationFrame(resolve));
   if(begin===null)begin=stamp;
   const next=Math.min(35,Math.floor((stamp-begin)*24/1000));
   if(next<=index)continue;
   render(Math.floor(next*150/35));track.requestFrame();
   submitted++;index=next;
  }
  rec.stop();stopped=true;await done;
  const blob=new Blob(chunks,{type:mime});
  if(blob.size<256||submitted<2)throw Error('REAL_ANIMATED_WEBM_EMPTY');
  if(videoURL)URL.revokeObjectURL(videoURL);
  videoURL=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=videoURL;
  a.download='Real3D-V95-ESTIMATED-SKINNED-3D-TEST.webm';
  a.textContent='下載真 3D 推估模型動態 WebM（短試片）';
  $('download').replaceChildren(a);a.click();
  status('WebM 已編碼 '+blob.size+' bytes，提交 '+submitted+
   ' 真 3D 影格；解碼 FPS 尚未獨立驗證，正式電影 BLOCK');
 }catch(e){status('BLOCK：'+String(e?.message??e));}
 finally{
  if(!stopped&&rec.state!=='inactive')rec.stop();
  stream.getTracks().forEach(t=>t.stop());
  busy=false;$('play').disabled=!out;$('webm').disabled=!out;
 }
});
$('plan').addEventListener('click',()=>{
 const p=planAIGReal3DFilmSegments();
 status('《星際之旅》2:12:08：已建立 '+p.segmentCount+
  ' 段／'+p.totalFrames+' 預定影格清冊；尚未生成或編碼整部電影。');
 if(!out)$('evidence').textContent=JSON.stringify({
  plannedSegments:p.segmentCount,plannedFrames:p.totalFrames,
  actuallyEncodedMovie:p.actuallyEncodedMovie,releasePASS:false},null,2);
});
$('proof').addEventListener('click',()=>{
 if(!out)return;proof();
 if(reportURL)URL.revokeObjectURL(reportURL);
 const text=$('evidence').textContent;
 reportURL=URL.createObjectURL(new Blob([text],{type:'application/json'}));
 const a=document.createElement('a');a.href=reportURL;
 a.download='V95-3D-SOURCE-AND-INFERENCE-EVIDENCE.json';a.click();
});

function qualityDiagnostics(){
 if(!out||!renderer)throw Error('請先建立真 3D 候選模型');
 const output=$('output').value;
 const dimensions=AIG_REAL3D_V96_OUTPUTS[output];
 if(!dimensions)throw Error('未授權的輸出解析度');
 const camera=renderer.getCamera(),scene=out.candidate.rig.workingScene,
  sourceSha256=out.vision.imageSha256;
 const plan=planAIGReal3DNative4K({
  output,gpuLimit:renderer.getGpuLimit(),
  estimatedWorkingMemoryMB:256,
  sourceTriangles:out.candidate.mesh.triangleCount
 });
 const geometry=auditAIGReal3D4KSourceProjection({
  scene,sourceSha256,camera,width:dimensions.width,height:dimensions.height,
  maxSourceEdgePx:20,maxOverLimitFraction:.08
 });
 last4KReport={schema:'AIG_REAL3D_V96_UI_NATIVE_4K_DIAGNOSTICS_V1',
  inputPortraitSHA:sourceSha256,output,plan,
  geometricDetail:geometry,
  outputPixelsAreActual4KIfNativeCaptureSucceeds:false,
  photoBasedAnatomical1to1PASS:false,
  native4KMaterialPBRPASS:false,
  selectedSDRColorPipeline:renderer.getColorPipeline(),
  fourK60FPSMoviePASS:false,releasePASS:false};
 $('quality-report').textContent=JSON.stringify(last4KReport,null,2);
 return last4KReport;
}
$('quality4k').addEventListener('click',()=>{
 if(!out||busy)return;
 try{
  stop();const r=qualityDiagnostics();
  status('來源原生 '+r.plan.width+'×'+r.plan.height+
   '｜GPU預算 '+(r.plan.hardwareBudgetPASS?'PASS':'BLOCK')+
   '｜幾何4K清晰度 '+(r.geometricDetail.sourceDetailCandidatePASS?'候選PASS':'BLOCK')+
   '｜人物自然度／電影級材質仍 BLOCK');
 }catch(e){status('BLOCK：'+e.message);}
});
$('capture4k').addEventListener('click',async()=>{
 if(!out||busy)return;
 stop();busy=true;$('capture4k').disabled=true;
 try{
  const report=qualityDiagnostics();
  if(!report.plan.hardwareBudgetPASS)throw Error('設備記憶體或真 GPU 渲染尺寸不足');
  // Original 3D is still only a proxy; source-detail Gate is diagnostic
  // so the user can inspect the real low-detail limit, not a fake upscale.
  poseCamera();
  const result=await captureAIGReal3DNative4K({
   renderer,scene:out.candidate.rig.workingScene,
   sourceSha256:out.vision.imageSha256,
   output:$('output').value,workingMemoryMB:256,
   camera:renderer.getCamera(),requireSourceDetailPASS:false
  });
  if(highQualityURL)URL.revokeObjectURL(highQualityURL);
  highQualityURL=URL.createObjectURL(result.pngBlob);
  const a=document.createElement('a');a.href=highQualityURL;
  a.download='Real3D-V96-TRUE-'+result.width+'x'+result.height+
   '-ESTIMATED-NOT-CINEMA.png';a.click();
  last4KReport={...last4KReport,
   outputPixelsAreActual4KIfNativeCaptureSucceeds:true,
   actualNativeGPUWidth:result.width,actualNativeGPUHeight:result.height,
   trueGPUReadPixels:result.trueGPUReadPixels,
   outputSourceSHA:result.sourceSha256,
   outputPngSHA:result.sha256,sourceDetailPASS:
    result.sourceGeometryProjectionQA.sourceDetailCandidatePASS,
   outputUpscaled:false,releasePASS:false};
  $('quality-report').textContent=JSON.stringify(last4KReport,null,2);
  status('真正 GPU '+result.width+'×'+result.height+' PNG 已生成，SHA '+
   result.sha256.slice(0,16)+'…；來源幾何清晰度 '+(
    last4KReport.sourceDetailPASS?'候選PASS':'BLOCK')+
   '，女主角身份與高擬真材質仍 BLOCK');
 }catch(e){status('BLOCK：'+String(e?.message??e));}
 finally{busy=false;$('capture4k').disabled=!out;}
});
$('colorPipeline').addEventListener('change',()=>{
 if(!out||!renderer||busy)return;
 try{
  renderer.setColorPipeline($('colorPipeline').value);
  render(frame);
  qualityDiagnostics();
 }catch(e){status('BLOCK：'+e.message);}
});
$('output').addEventListener('change',()=>{
 if(out&&!busy){
  try{qualityDiagnostics();}catch(e){status('BLOCK：'+e.message);}
 }
});
