/** V91 isolated actual WebGL sport physics and real WebM controls. */
import {simulateAIGReal3DSportBall,AIG_REAL3D_V91_PRESETS}
 from './aig-real3d-sports-ballistics.mjs';
import {createAIGReal3DSport3DReplay,recordAIGReal3DSportFilmWebM}
 from './aig-real3d-sports-3d-replay.mjs';
import {createAIG3DRenderer} from './aig-real3d-webgl.mjs';
const $=id=>document.getElementById(id);
const canvas=$('scene'),renderer=createAIG3DRenderer(canvas,{
 quality:'balanced',pixelRatio:1,maxTriangles:10000,preserveDrawingBuffer:true,
 background:[.016,.036,.064,1]
});
let trajectory=null,replay=null,busy=false,playing=false,
 raf=0,startStamp=0,pausedIndex=0,photoURL=null,videoURL=null;
const params={
 BASEBALL:{position:[0,4.0,0],velocity:[29,10,0],spin:[0,0,145]},
 TENNIS:{position:[0,2.3,0],velocity:[18,6,0],spin:[0,0,240]},
 BASKETBALL:{position:[0,2.1,0],velocity:[7,7,0],spin:[0,0,42]},
 SOCCER:{position:[0,2.5,0],velocity:[23,8,0],spin:[0,130,0]},
 TABLE_TENNIS:{position:[0,1.25,0],velocity:[9,3,0],spin:[0,250,0]}
};
function follow(frame){
 const r=trajectory.preset.radiusM;
 renderer.setCamera({projection:'orthographic',yaw:.40,pitch:.27,
  focus:[frame.position[0],frame.position[1],frame.position[2]],
  distance:4,orthoSpan:Math.max(1,r*15)});
}
function showEvidence(last){
 const events=trajectory.collisions.length+trajectory.actorContacts.length;
 $('evidence').textContent=JSON.stringify({
  schema:trajectory.schema,sport:trajectory.sport,
  radiusM:trajectory.preset.radiusM,massKg:trajectory.preset.massKg,
  physicsSubsteps:trajectory.diagnostics.actualIntegratedSubsteps,
  trajectoriesAreRealXYZ:trajectory.diagnostics.actuallyMoving3DPositions,
  real3DGeometryTriangles:replay.sphereMesh.triangleCount,
  currentXYZ:last.position,currentVelocityMps:last.velocity,
  currentAngularVelocityRadps:last.angularVelocity,
  collisionAndActorEventCount:events,
  sportSpecificCoefficientsNotCertified:true,
  actorsAutomaticallyTracked:false,productionMoviePASS:false
 },null,2);
}
function draw(index){
 if(!replay)return;
 const frame=replay.frameAt(index);
 follow(frame);
 const actual=replay.renderFrame(renderer,index);
 $('frame').value=String(index);$('frame-number').textContent=
  index+' / '+(replay.frameCount-1);
 $('status').textContent='真 3D 球體影格 '+index+
  '｜時間 '+frame.timeSec.toFixed(3)+' s｜速度 '+
  Math.hypot(...frame.velocity).toFixed(2)+' m/s｜GPU 三角面 '+
  actual.renderedOriginalTriangles;
 if(index===0||index===replay.frameCount-1||index%15===0)showEvidence(frame);
}
function stop(){
 playing=false;cancelAnimationFrame(raf);
 $('pause').disabled=true;$('play').disabled=busy;
}
function build(){
 stop();
 const type=$('sport').value,p=params[type];
 trajectory=simulateAIGReal3DSportBall({sport:type,initialPosition:p.position,
  initialVelocity:p.velocity,initialAngularVelocity:p.spin,
  durationSec:3,fps:30});
 replay=createAIGReal3DSport3DReplay({trajectory});
 $('frame').max=String(replay.frameCount-1);
 pausedIndex=0;draw(0);
}
function play(){
 if(busy||playing||!replay)return;
 playing=true;$('pause').disabled=false;$('play').disabled=true;
 startStamp=performance.now()-1000*pausedIndex/replay.fps;
 const step=stamp=>{
  if(!playing)return;
  const idx=Math.min(replay.frameCount-1,
   Math.floor((stamp-startStamp)*replay.fps/1000));
  if(idx!==pausedIndex){pausedIndex=idx;draw(idx);}
  if(idx>=replay.frameCount-1){stop();return;}
  raf=requestAnimationFrame(step);
 };
 raf=requestAnimationFrame(step);
}
$('play').addEventListener('click',play);
$('pause').addEventListener('click',()=>stop());
$('reset').addEventListener('click',()=>{if(!busy)build();});
$('frame').addEventListener('input',e=>{
 if(busy)return;stop();pausedIndex=Number(e.target.value);draw(pausedIndex);
});
$('capture').addEventListener('click',async()=>{
 if(busy||!replay)return;
 stop();busy=true;
 try{
  const frame=await renderer.captureNativePNG(replay.scene,{width:960,height:540});
  if(!frame.genuineGpuReadback)throw Error('GPU READBACK REQUIRED');
  photoURL=URL.createObjectURL(frame.blob);
  const a=document.createElement('a');
  a.href=photoURL;a.download='Real3D-V91-'+trajectory.sport+'-FRAME.png';
  a.click();
  $('status').textContent='真 GPU PNG 已產生，SHA-256 '+frame.sha256;
 }catch(e){$('status').textContent='BLOCK：'+e.message;}
 finally{busy=false;$('play').disabled=false;}
});
$('record').addEventListener('click',async()=>{
 if(busy||!replay)return;
 stop();busy=true;$('record').disabled=true;$('play').disabled=true;
 $('status').textContent='由真 3D 連續影格送往瀏覽器 WebM 編碼；不是貼圖平移。';
 try{
  const result=await recordAIGReal3DSportFilmWebM({
   replay,renderer,canvas,beforeRenderFrame:follow
  });
  if(result.bytes<256)throw Error('MOVIE_EMPTY');
  if(videoURL)URL.revokeObjectURL(videoURL);
  videoURL=URL.createObjectURL(result.blob);
  const a=document.createElement('a');a.href=videoURL;
  a.download='Real3D-V91-'+trajectory.sport+'-3D-PHYSICS.webm';
  a.textContent='下載真 3D 球體動力 WebM（未驗證真人動作與音訊）';
  $('video-link').replaceChildren(a);a.click();
  $('status').textContent='WebM 已編碼 '+result.bytes+' bytes，實際送出 '+
   result.framesActuallySubmittedToEncoder+' 個 3D 影格。影片解碼與 FPS 尚待獨立驗證。';
 }catch(e){
  $('status').textContent='BLOCK：'+String(e?.message??e);
 }finally{busy=false;$('record').disabled=false;$('play').disabled=false;}
});
if(renderer.status!=='READY'){
 $('status').textContent='BLOCK：WebGL GPU 未啟用；不能播放或輸出假影片。';
 for(const id of ['play','pause','capture','record','reset'])$(id).disabled=true;
}else build();
