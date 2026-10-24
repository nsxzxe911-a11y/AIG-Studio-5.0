/** V92 isolated real Indexed XYZ rig + 3D sphere Film QA UI. No fake buttons. */
import {buildAIGReal3DV92NonhumanQA} from './aig-real3d-v92-qa-fixture.mjs';
import {recordAIGReal3DRigSportFilmWebM} from './aig-real3d-rig-sport-film.mjs';
import {createAIG3DRenderer} from './aig-real3d-webgl.mjs';
const $=id=>document.getElementById(id),canvas=$('v92-scene');
let renderer=null,test=null,playing=false,busy=false,raf=null,last=0,started=0,
 captureURL=null,videoURL=null;
function stop(){
 playing=false;if(raf!==null)cancelAnimationFrame(raf);raf=null;
 $('v92-pause').disabled=true;$('v92-play').disabled=busy;
}
function follow(){
 renderer.setCamera({projection:'orthographic',yaw:.34,pitch:.2,
  distance:4,focus:[0,1.65,0],orthoSpan:2.65});
}
function statusFrame(i){
 const f=test.film.frameAt(i);
 $('v92-frame').value=String(i);
 $('v92-frame-number').textContent=i+' / '+(test.film.frameCount-1);
 $('status').textContent='V92 真 3D '+test.rig.wrapMode+'｜Frame '+i+
  '｜ t='+f.timeSec.toFixed(3)+'s｜ball X='+
  f.position[0].toFixed(4)+'m';
 if(i%20===0||i===test.film.frameCount-1)showEvidence(i);
}
function showEvidence(i){
 const frame=test.film.frameAt(i);
 $('v92-evidence').textContent=JSON.stringify({
  schema:test.film.schema,
  sport:test.contact.trajectory.sport,sourceIsExplicitlyNONHUMAN:true,
  originalIndexedTriangles:test.mesh.triangleCount,
  originalSourceScanIndependentlyVerified:false,
  skinningJointCount:test.rig.boneCount,
  mode:test.rig.wrapMode,
  visibleSourceSkinningAlwaysEvaluated:true,
  impactAtSec:test.contact.event.timeSec,
  sourceAnchorXYZ:test.contact.contactPoint,
  calculatedContactVelocityMps:test.contact.sourceDerivedSurfaceVelocity,
  contactDistanceErrorM:test.contact.contactDistanceErrorM,
  ballImpulseFromRealRig:true,
  ballXYZ:frame.position,ballSpinRadps:frame.angularVelocity,
  actualRenderedGPUFrames:test.film.stats().actualCombinedGPURenders,
  productionReleasePASS:false
 },null,2);
}
function draw(i){
 if(!test||!renderer)return;
 follow();
 test.film.renderFrame(renderer,i);
 statusFrame(i);
}
function reset(){
 if(busy)return;
 stop();
 if(renderer)renderer.destroy();
 renderer=createAIG3DRenderer(canvas,{quality:'balanced',pixelRatio:1,
  maxTriangles:200000,preserveDrawingBuffer:true,background:[.02,.038,.07,1]});
 if(renderer.status!=='READY')throw Error('WebGL GPU source is BLOCKED');
 renderer.setInspectionMode('LIT');
 test=buildAIGReal3DV92NonhumanQA({
  sport:$('v92-sport').value,wrapMode:$('v92-wrap').value});
 $('v92-frame').max=String(test.film.frameCount-1);
 last=0;draw(last);
}
function play(){
 if(!test||busy||playing)return;
 playing=true;$('v92-play').disabled=true;$('v92-pause').disabled=false;
 started=performance.now()-last*1000/test.film.fps;
 const step=t=>{
  if(!playing)return;
  const i=Math.min(test.film.frameCount-1,
   Math.floor((t-started)*test.film.fps/1000));
  if(i!==last){last=i;draw(i);}
  if(i>=test.film.frameCount-1){stop();return;}
  raf=requestAnimationFrame(step);
 };
 raf=requestAnimationFrame(step);
}
$('v92-reset').addEventListener('click',()=>{try{reset();}catch(e){
 $('status').textContent='BLOCK：'+e.message;}});
$('v92-play').addEventListener('click',play);
$('v92-pause').addEventListener('click',stop);
$('v92-frame').addEventListener('input',value=>{
 if(busy||!test)return;
 stop();last=Number(value.target.value);draw(last);
});
$('v92-png').addEventListener('click',async()=>{
 if(!test||busy)return;stop();busy=true;
 try{
  draw(last);
  const result=await renderer.captureNativePNG(test.film.scene,
   {width:960,height:540});
  if(!result.genuineGpuReadback)throw Error('NO_REAL_GPU_READBACK');
  if(captureURL)URL.revokeObjectURL(captureURL);
  captureURL=URL.createObjectURL(result.blob);
  const a=document.createElement('a');a.href=captureURL;
  a.download='Real3D-V92-REAL-RIG-AND-SPORT-GPU.png';a.click();
  $('status').textContent='真 GPU PNG SHA256 '+result.sha256;
 }catch(e){$('status').textContent='BLOCK：'+e.message;}
 finally{busy=false;}
});
$('v92-webm').addEventListener('click',async()=>{
 if(!test||busy)return;stop();busy=true;
 $('v92-webm').disabled=true;$('v92-play').disabled=true;
 $('status').textContent='將真 3D 骨架變形＋球體動力逐影格交付給 WebM 編碼器。';
 try{
  const out=await recordAIGReal3DRigSportFilmWebM({
   film:test.film,canvas,renderer,onFrame:follow
  });
  if(videoURL)URL.revokeObjectURL(videoURL);
  videoURL=URL.createObjectURL(out.blob);
  const a=document.createElement('a');a.href=videoURL;
  a.download='Real3D-V92-SKINNED-RIG-SPORT-3D.webm';
  a.textContent='下載 Real3D V92 真 3D 動態 WebM（未驗證人體外觀）';
  $('v92-download').replaceChildren(a);a.click();
  $('status').textContent='WebM bytes '+out.bytes+'｜實際送出 '+out.realGPU3DFramesSubmitted+' 個 3D 影格。';
 }catch(e){$('status').textContent='BLOCK：'+e.message;}
 finally{busy=false;$('v92-webm').disabled=false;$('v92-play').disabled=false;}
});
try{reset();}catch(e){
 $('status').textContent='BLOCK：'+String(e?.message??e);
 for(const id of ['v92-play','v92-pause','v92-png','v92-webm'])$(id).disabled=true;
}
