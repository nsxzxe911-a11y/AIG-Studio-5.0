/** Actual A/B: procedural continuous-body FIELD -> CPU worker -> existing GPU. */
import {buildAIGStage1AdultAnatomy}
 from './aig-real3d-human-anatomy.mjs';
import {buildAIGReal3DImplicitScene}
 from './aig-real3d-implicit-human-surfaces.mjs';
import {executeAIGReal3DDual19200}
 from './aig-real3d-dual-kernel-19200.mjs';
import {runAIG3DIndexedDrawingWorker}
 from './aig-real3d-dual-worker-bridge.mjs';
import {createAIG3DRenderer}
 from './aig-real3d-webgl.mjs';
const $=name=>document.getElementById(name);
let renderer,error=null,locked=false,lastProof=null;
const urls=[];
try{renderer=createAIG3DRenderer($('surface-view'));}
catch(e){error=e;$('state').textContent='真 GPU BLOCK：'+String(e);}
function status(s,ok=false){$('state').textContent=s;
 $('state').dataset.ok=ok?'true':'false';}
function front(model){
 const H=model.heightMeters;
 renderer.setCamera({
  projection:'orthographic',yaw:Math.PI,pitch:0,
  focus:[0,H/2,0],orthoSpan:Math.max(1.5,H/.80),
  distance:Math.max(4,H*3),near:.01,far:20000
 });
}
function setProof(p){lastProof=p;$('proof').textContent=JSON.stringify(p,null,2);}
function addPhoto(gender,method,frame,build,record){
 const url=URL.createObjectURL(frame.blob);urls.push(url);
 const card=document.createElement('figure');
 card.dataset.real3dSurfaceMethod=method;
 card.dataset.real3dGender=gender;
 const title=document.createElement('figcaption');
 title.textContent=(gender==='male'?'男性':'女性')+
  ' · '+(method==='sdf'?'A · SDF':'B · Metaball')+
  ' · 正交正面（待外觀驗收）';
 const image=document.createElement('img');
 image.alt='真 WebGL '+gender+' '+method+' 人體正面照片';
 image.src=url;
 const dl=document.createElement('a');
 dl.textContent='下載真 1080×1920 GPU PNG';
 dl.href=url;dl.download='AIG-Real3D-'+gender+'-'+method+
  '-FRONT-1080x1920-'+frame.sha256.slice(0,12)+'.png';
 const note=document.createElement('small');
 note.textContent=build.geometryEvidence.extractedTriangleCount+
  ' 三角形／'+build.geometryEvidence.surfaceConnectedComponents+
  ' 連通區／開放邊 '+build.geometryEvidence.nonManifoldEdges+
  '／SHA256 '+frame.sha256+'｜自然人體仍 BLOCK';
 card.append(title,image,dl,note);
 $('gallery').append(card);
}
async function runSingle({gender,method,resolution}){
 const model=buildAIGStage1AdultAnatomy(gender);
 const registry={
  sdf:({source,signal})=>buildAIGReal3DImplicitScene({
   source,method:'sdf',resolution,signal}),
  metaball:({source,signal})=>buildAIGReal3DImplicitScene({
   source,method:'metaball',resolution,signal})
 };
 status('繪圖核心：'+gender+' '+method+' 真 scalar-field 取樣／曲面提取中…');
 // NO Photoshop/AI figure substituted: all XYZ triangles go through the
 // same 19,200 slots + TRUE WebGL framebuffer.
 const result=await executeAIGReal3DDual19200({
  source:{model},renderer,method,algorithmRegistry:registry,
  resolution:'preview',
  hardwareConcurrency:Math.max(1,Math.min(256,navigator.hardwareConcurrency||2)),
  deviceMemoryGB:navigator.deviceMemory??null,
  mobile:window.innerWidth<760,
  drawingWorkerFactory:typeof Worker==='function'?
   runAIG3DIndexedDrawingWorker:null,
  shouldAcceptGeometry:({scene})=>
   scene.nodes.length===1&&
   scene.nodes[0].id==='continuousHumanSurface'
 });
 const ev=result.generatedGeometryEvidence;
 if(!ev?.actualContinuousSurfaceTopologicalPASS||
  ev.surfaceConnectedComponents!==1||ev.nonManifoldEdges!==0)
  throw Error('IMPLICIT_BODY_DISCONNECTED_OR_OPEN');
 front(model);
 // PNG capture reuses the SAME WebGL renderer and restores canvas pixels.
 status('渲染核心：真 GPU '+gender+' '+method+' 1080×1920 原生像素讀回中…');
 let frame;
 try{
  frame=await renderer.captureNativePNG(result.renderedScene,{
   width:1080,height:1920});
 }finally{
  // Free the render-mesh GPU cache; images in the gallery remain valid.
  for(const node of result.renderedScene.nodes)
   renderer.releaseMesh(node.mesh);
 }
 if(frame.width!==1080||frame.height!==1920||
  frame.actualColorSamples<8)
  throw Error('REAL_GPU_SNAPSHOT_CONTRACT_FAILED');
 addPhoto(gender,method,frame,result,ev);
 return {gender,method,sourceHeightMm:model.heightMeters*1000,
  geometry:ev,cpuWork:result.metrics,gpuFrame:result.gpuEvidence,
  target:[1080,1920],sha256:frame.sha256,
  realGPUPixelsRead:frame.genuineGpuReadback,
  exactFrontCamera:{projection:'orthographic',yawRadians:Math.PI,pitch:0},
  bodyAppearanceVisualApproval:false};
}
async function executeBatch(work){
 if(locked||!renderer||renderer.status!=='READY'){
  status('BLOCK：GPU 不可用或已有進行中的工作。');return;
 }
 locked=true;$('single').disabled=true;$('compare').disabled=true;
 $('gallery').replaceChildren();
 for(const url of urls.splice(0))URL.revokeObjectURL(url);
 const result=[];
 try{
  for(const item of work){
   const output=await runSingle(item);
   result.push(output);
   setProof({schema:'AIG_REAL3D_SDF_METABALL_TRUE_ISOSURFACE_V1',
    realCompleted:result.length,expected:work.length,
    sameNativeCameraAndPNG:true,automaticHumanApproval:false,
    candidates:result});
   await new Promise(resolve=>requestAnimationFrame(resolve));
  }
  const uniq=new Set(result.map(x=>x.sha256));
  if(uniq.size!==result.length)
   throw Error('CANDIDATE_PNG_IMAGES_NOT_UNIQUE');
  status('完成 '+result.length+' 張真 GPU 正面 PNG／'+
   '19,200 槽雙核心協作；自然人體外觀仍需目視驗收，Stage 1 BLOCK。',true);
 }catch(e){
  status('幾何或 GPU BLOCK：'+String(e.message||e));
  setProof({realCompleted:result.length,expected:work.length,
   partialScreenshotsNotRelease:true,
   errors:[String(e.stack||e)],candidates:result,
   visualApproval:false});
 }finally{
  locked=false;$('single').disabled=false;$('compare').disabled=false;
 }
}
$('single').addEventListener('click',()=>executeBatch([{
 gender:$('gender').value,method:$('candidate').value,
 resolution:$('grid-quality').value
}]));
$('compare').addEventListener('click',()=>{
 const resolution=$('grid-quality').value;
 executeBatch(['female','male'].flatMap(gender=>
  ['sdf','metaball'].map(method=>({gender,method,resolution}))));
});
window.addEventListener('pagehide',()=>{
 for(const url of urls)URL.revokeObjectURL(url);
 renderer?.destroy?.();
});
if(error)status('BLOCK：'+String(error));
