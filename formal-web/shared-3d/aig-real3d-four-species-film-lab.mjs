/** V93 actual functional source-indexed WebGL research UI. */
import {buildAIGReal3DV93FourSpeciesQA}
 from './aig-real3d-v93-qa-fixture.mjs';
import {createAIGReal3DFourSpeciesFilm,recordAIGReal3DFourSpeciesWebM}
 from './aig-real3d-four-species-film.mjs';
import {createAIG3DRenderer} from './aig-real3d-webgl.mjs';
const $=id=>document.getElementById(id);
const canvas=$('scene');
let renderer=null,qa=null,film=null,playing=false,busy=false,raf=null,
 frameIndex=0,originStamp=null,pngURL=null,webmURL=null;
function stop(){
 playing=false;if(raf!==null)cancelAnimationFrame(raf);raf=null;
 $('pause').disabled=true;$('play').disabled=busy;
}
function camera(){
 renderer.setCamera({projection:'orthographic',yaw:.36,pitch:.20,
  focus:[0,1.62,0],orthoSpan:2.8,distance:4});
}
function renderOptions(){
 if($('wrap').value==='HALF_WRAP'&&$('visibility').value==='HIDE')
  return {visibleAttachments:[]};
 return {};
}
function showEvidence(index){
 const frame=film.frameAt(index);
 $('evidence').textContent=JSON.stringify({
  schema:film.schema,species:qa.engine.species,
  geometryProvenance:'NONHUMAN_AUTHOR_CREATED_QA_NOT_A_REAL_SCAN',
  trueSourceBodyIndexedTriangles:qa.prior.mesh.triangleCount,
  attachmentKind:qa.engine.kinds[0],
  trueSourceAttachmentTriangles:qa.attachmentSource.triangleCount,
  originalJointCount:qa.engine.rig.boneCount,
  fullAndHalfAlwaysSimulateHiddenJoints:true,
  realThreeDimensionalFrame:frameIndex,
  currentBallPositionMeters:frame.position,
  currentBallSpinRadPerSec:frame.angularVelocity,
  sourceRootPinned:true,
  flowedAngularDisplacementDeg:
   qa.engine.secondaryAt('testAttachment',frame.timeSec)*180/Math.PI,
  actorPlusAttachmentsPlusBallGPUFrames:
   film.stats().actualCompleteGPUMovieFrames,
  fourRealBiologicalSourceScansIndependentlyVerified:false,
  productionReleasePASS:false
 },null,2);
}
function draw(index){
 if(!film||!renderer)return;
 camera();
 const result=film.renderFrame(renderer,index,renderOptions());
 frameIndex=index;
 $('frame').value=String(index);
 $('number').textContent=index+' / '+(film.frameCount-1);
 $('status').textContent='真 3D '+qa.engine.species+
  '｜'+qa.engine.rig.wrapMode+
  '｜'+result.triangles+' indexed GPU triangles'+
  '｜ t='+result.timeSec.toFixed(3)+'秒';
 if(index===0||index===film.frameCount-1||index%20===0)
  showEvidence(index);
}
function rebuild(){
 if(busy)return;
 stop();
 if(renderer)renderer.destroy();
 renderer=createAIG3DRenderer(canvas,{
  quality:'balanced',pixelRatio:1,maxTriangles:25000,
  preserveDrawingBuffer:true,background:[.016,.035,.065,1]
 });
 if(renderer.status!=='READY')throw Error('真 WebGL GPU 未啟用；不能用假 2D 畫面取代');
 renderer.setInspectionMode('LIT');
 qa=buildAIGReal3DV93FourSpeciesQA({
  species:$('species').value,wrapMode:$('wrap').value});
 film=createAIGReal3DFourSpeciesFilm({
  secondary:qa.engine,sportFilm:qa.prior.film});
 $('frame').max=String(film.frameCount-1);
 frameIndex=0;draw(0);
}
$('build').addEventListener('click',()=>{
 try{rebuild();}catch(e){$('status').textContent='BLOCK：'+String(e.message??e);}
});
$('species').addEventListener('change',()=>{
 try{rebuild();}catch(e){$('status').textContent='BLOCK：'+e.message;}
});
$('wrap').addEventListener('change',()=>{
 if($('wrap').value==='FULL_WRAP')$('visibility').value='ALL';
 try{rebuild();}catch(e){$('status').textContent='BLOCK：'+e.message;}
});
$('visibility').addEventListener('change',()=>{
 if($('wrap').value==='FULL_WRAP')$('visibility').value='ALL';
 if(!busy&&film){stop();draw(frameIndex);}
});
$('play').addEventListener('click',()=>{
 if(busy||playing||!film)return;
 playing=true;$('play').disabled=true;$('pause').disabled=false;
 originStamp=performance.now()-1000*frameIndex/film.fps;
 const tick=stamp=>{
  if(!playing)return;
  const i=Math.min(film.frameCount-1,
   Math.floor((stamp-originStamp)*film.fps/1000));
  if(i!==frameIndex)draw(i);
  if(i>=film.frameCount-1){stop();return;}
  raf=requestAnimationFrame(tick);
 };
 raf=requestAnimationFrame(tick);
});
$('pause').addEventListener('click',stop);
$('frame').addEventListener('input',v=>{
 if(busy||!film)return;
 stop();draw(Number(v.target.value));
});
$('png').addEventListener('click',async()=>{
 if(!film||busy)return;stop();busy=true;
 $('png').disabled=true;
 try{
  draw(frameIndex);
  const out=await renderer.captureNativePNG(film.scene,{width:960,height:540});
  if(!out.genuineGpuReadback)throw Error('真 GPU 原始 PNG 讀回未通過');
  if(pngURL)URL.revokeObjectURL(pngURL);
  pngURL=URL.createObjectURL(out.blob);
  const link=document.createElement('a');
  link.href=pngURL;link.download='Real3D-V93-TRUE-SOURCE-SURFACE-GPU.png';
  link.click();
  $('status').textContent='真 GPU 原始 PNG SHA256 '+out.sha256;
 }catch(e){$('status').textContent='BLOCK：'+e.message;}
 finally{busy=false;$('png').disabled=false;}
});
$('webm').addEventListener('click',async()=>{
 if(!film||busy)return;stop();busy=true;
 $('webm').disabled=true;$('play').disabled=true;
 $('status').textContent='將原始 3D 骨架、附著表面與球體逐格送往真 WebM 編碼器。';
 try{
  const out=await recordAIGReal3DFourSpeciesWebM({
   film,renderer,canvas,preRender:camera,renderOptions:renderOptions()
  });
  if(webmURL)URL.revokeObjectURL(webmURL);
  webmURL=URL.createObjectURL(out.blob);
  const a=document.createElement('a');a.href=webmURL;
  a.download='Real3D-V93-'+qa.engine.species+'-SOURCE-3D-MOVIE.webm';
  a.textContent='下載 V93 真 GPU 3D 動態 WebM（非真人／動物掃描）';
  $('download').replaceChildren(a);a.click();
  $('status').textContent='WebM 已錄製 '+out.bytes+' bytes｜實際提交 '+
   out.real3DSourceFramesSubmitted+' 影格，未驗證 1080p60。';
 }catch(e){$('status').textContent='BLOCK：'+String(e?.message??e);}
 finally{busy=false;$('webm').disabled=false;$('play').disabled=false;}
});
try{rebuild();}catch(e){
 $('status').textContent='BLOCK：'+String(e?.message??e);
 for(const id of ['play','pause','png','webm','build'])$(id).disabled=true;
}
