/**
 * REAL3D independent next candidate R&D workbench: Anatomical Template Morph
 * versus Subdivision, genuine 3D vertices + CPU Worker + original WebGL.
 * SDF and metaballs have been rejected by the user; no automatic human PASS.
 */
import {buildAIGStage1AdultAnatomy}
 from './aig-real3d-human-anatomy.mjs';
import {buildAIGReal3DTemplateScene}
 from './aig-real3d-anatomical-template-morph.mjs';
import {executeAIGReal3DDual19200}
 from './aig-real3d-dual-kernel-19200.mjs';
import {runAIG3DIndexedDrawingWorker}
 from './aig-real3d-dual-worker-bridge.mjs';
import {createAIG3DRenderer}
 from './aig-real3d-webgl.mjs';

const $=id=>document.getElementById(id);
let renderer,locked=false;
const urls=[];
try{renderer=createAIG3DRenderer($('surface-view'));}
catch(e){$('state').textContent='WebGL BLOCK：'+String(e.message||e);}
function notice(t,ok=false){
 $('state').textContent=t;
 $('state').dataset.ok=ok?'true':'false';
}
function setEvidence(e){$('proof').textContent=JSON.stringify(e,null,2);}
function cameraForHeight(heightMm){
 const H=heightMm/1000;
 renderer.setCamera({projection:'orthographic',yaw:Math.PI,pitch:0,
  focus:[0,H/2,0],orthoSpan:Math.max(1.5,H/.80),
  distance:Math.max(4,H*3),near:.01,far:20000});
}
const names={
 'template-morph':'A · Template Morph',
 subdivision:'B · Subdivision'
};
function putCard({gender,method,record,frame}){
 const url=URL.createObjectURL(frame.blob);
 urls.push(url);
 const fig=document.createElement('figure');
 fig.dataset.real3dSurfaceMethod=method;
 fig.dataset.real3dGender=gender;
 const cap=document.createElement('figcaption');
 cap.textContent=(gender==='male'?'男性':'女性')+' · '+
  names[method]+' · 正面正交（未驗收）';
 const img=document.createElement('img');
 img.alt=gender+' '+names[method]+' 真 WebGL 1080x1920 正面照';
 img.src=url;
 const a=document.createElement('a');
 a.href=url;
 a.download='AIG-REAL3D-'+gender+'-'+method+
  '-FRONT-1080x1920-'+frame.sha256.slice(0,12)+'.png';
 a.textContent='下載真 WebGL 正面 PNG';
 const meta=document.createElement('small');
 meta.textContent=record.actualTriangles+' 真三角形／連通區 '+
  record.actualConnectedComponents+'／開放邊 '+record.nonManifoldEdges+
  '／GPU SHA256 '+frame.sha256+'｜自然外觀 BLOCK';
 fig.append(cap,img,a,meta);
 $('gallery').append(fig);
}
async function one({gender,method,heightMm,build}){
 if(!['male','female'].includes(gender)||!names[method]||
  !Number.isFinite(heightMm)||!Number.isFinite(build))
  throw Error('TEMPLATE_INPUT_INVALID');
 const model=buildAIGStage1AdultAnatomy(gender);
 notice('CPU 繪圖：'+gender+' '+method+
  ' 真控制點 → 單一 3D 網格／三角形檢查');
 const registry={
  'template-morph':({source,signal})=>
   buildAIGReal3DTemplateScene({...source,source,method:'template-morph',signal}),
  subdivision:({source,signal})=>
   buildAIGReal3DTemplateScene({...source,source,method:'subdivision',signal})
 };
 const start=performance.now();
 const result=await executeAIGReal3DDual19200({
  source:{model,heightMm,build},renderer,method,
  algorithmRegistry:registry,resolution:'preview',
  hardwareConcurrency:Math.max(1,Math.min(256,
   Math.floor(navigator.hardwareConcurrency||2))),
  mobile:window.innerWidth<760,
  deviceMemoryGB:navigator.deviceMemory??null,
  drawingWorkerFactory:typeof Worker==='function'?
   runAIG3DIndexedDrawingWorker:null,
  shouldAcceptGeometry:({scene})=>scene.nodes.length===1&&
   scene.nodes[0].id==='singleAnatomicalTemplate'
 });
 const geo=result.generatedGeometryEvidence;
 if(!geo?.topologyContinuousPASS||geo.actualConnectedComponents!==1||
  geo.nonManifoldEdges!==0||geo.actualTriangles<5000)
  throw Error('TEMPLATE_NOT_ONE_CLOSED_HUMAN_CAGE');
 cameraForHeight(heightMm);
 notice('GPU 渲染：'+gender+' '+method+
  ' 正面 0°，原生 1080×1920 畫面讀取');
 let frame;
 try{
  frame=await renderer.captureNativePNG(result.renderedScene,{
   width:1080,height:1920});
 }finally{
  for(const node of result.renderedScene.nodes)
   renderer.releaseMesh(node.mesh);
 }
 if(!frame?.genuineGpuReadback||frame.width!==1080||
  frame.height!==1920||frame.actualColorSamples<8)
  throw Error('TRUE_GPU_RENDERED_PNG_INVALID');
 putCard({gender,method,record:geo,frame});
 return {gender,method,heightMm,bodyBuild:build,
  geometry:geo,sourceWasTemplateControlPoints:true,
  actualCpuWorker:result.metrics.actualCpuWorkersUsed,
  sharedGpuRenderPass:result.metrics.renderPasses,
  dualLogicalWorkSlots:result.plan.totalLogicalWorkSlots,
  trueFramebufferReadback:frame.genuineGpuReadback,
  frameWidth:frame.width,frameHeight:frame.height,
  sha256:frame.sha256,
  renderElapsedMs:Math.round(performance.now()-start),
  camera:{projection:'orthographic',yaw:Math.PI,pitch:0},
  humanAppearanceApproved:false};
}
async function run(items){
 if(locked||renderer?.status!=='READY'){
  notice('BLOCK：WebGL 未就緒或正在拍攝中');return;
 }
 locked=true;$('single').disabled=true;$('compare').disabled=true;
 $('gallery').replaceChildren();
 for(const url of urls.splice(0))URL.revokeObjectURL(url);
 const outputs=[];
 try{
  for(const item of items){
   outputs.push(await one(item));
   setEvidence({schema:'AIG_REAL3D_SINGLE_CAGE_ANATOMICAL_TEMPLATE_V1',
    completed:outputs.length,expected:items.length,
    genuineGpuImageCount:outputs.length,
    stage1HumanNaturalProportionsPASS:false,
    candidates:outputs});
   await new Promise(resolve=>requestAnimationFrame(resolve));
  }
  if(new Set(outputs.map(v=>v.sha256)).size!==outputs.length)
   throw Error('DUPLICATE_GPU_PNG_IMAGES');
  notice('完成 '+outputs.length+' 張正面實拍：完整單一 3D 模板網格＋19,200 工作槽。'+
   '外觀自然度仍 BLOCK，待實際目視淘汰／核准。',true);
 }catch(e){
  notice('程式／真幾何／GPU BLOCK：'+String(e?.message||e));
  setEvidence({completed:outputs.length,expected:items.length,
   errors:[String(e?.stack||e)],candidates:outputs,
   incompleteVisualGate:true,releasePASS:false});
 }finally{
  locked=false;$('single').disabled=false;$('compare').disabled=false;
 }
}
function currentOptions(){
 return {gender:$('gender').value,method:$('candidate').value,
  heightMm:Number($('height-mm').value),
  build:Number($('body-build').value)};
}
$('single').addEventListener('click',()=>run([currentOptions()]));
$('compare').addEventListener('click',()=>{
 const choice=currentOptions();
 run(['female','male'].flatMap(gender=>
  ['template-morph','subdivision'].map(method=>({
   gender,method,heightMm:gender===choice.gender?
    choice.heightMm:gender==='male'?1780:1680,
   build:choice.build
  }))));
});
$('gender').addEventListener('change',()=>{
 const h=$('gender').value==='male'?1780:1680;
 $('height-mm').value=h;$('height-readout').textContent=h+' mm';
});
$('height-mm').addEventListener('input',()=>{
 $('height-readout').textContent=$('height-mm').value+' mm';
});
$('body-build').addEventListener('input',()=>{
 $('build-readout').textContent=$('body-build').value;
});
window.addEventListener('pagehide',()=>{
 for(const u of urls)URL.revokeObjectURL(u);
 renderer?.destroy?.();
});
