/** Shared Real3D 1.0 — real WebGL source-bound visual verification surface. */
import {demoAIG3DScene} from './aig-real3d-adapters.mjs';
import {createAIGReal3DHumanScene}
 from './aig-real3d-human-bridge.mjs';
import {updateAIG3DNodeTransform,auditAIG3DScene}
 from './aig-real3d-core.mjs';
import {createAIG3DRenderer} from './aig-real3d-webgl.mjs';

const $=id=>document.getElementById(id);
const canvas=$('view');
let renderer,initializationError=null;
try{renderer=createAIG3DRenderer(canvas);}
catch(e){
 initializationError=String(e.message||e);
 renderer={status:'WEBGL_INIT_BLOCKED',getCamera(){return null;},destroy(){}};
}
let dataset=null,baseNode=null,profile=null,lastEvidence=null;
let lastHumanPhoto=null,photoBusy=false,humanRebuildQueued=false;
const isHuman=()=>profile==='HumanMale'||profile==='HumanFemale';
const humanGender=()=>profile==='HumanFemale'?'female':'male';
const displayHeight=()=>{
 $('human-height-value').textContent=$('human-height').value+' mm';
 const body=Number($('human-build').value);
 $('human-build-value').textContent=(body<35?'偏瘦':body>65?'偏胖':'標準')+'（'+body+'）';
};
const ageDefault=(gender,age)=>({
 male:{adult:1780,child:1200,middle:1740,elder:1680},
 female:{adult:1680,child:1160,middle:1640,elder:1580}
}[gender]?.[age]??1680);
const humanFront=()=>{
 const h=Number($('human-height').value)/1000;
 const camera=renderer.getCamera();
 renderer.setCamera({projection:'orthographic',
  yaw:Math.PI,pitch:0,
  focus:[0,h/2,0],orthoSpan:Math.max(1.5,h/0.80),
  distance:Math.max(4,h*3),near:.01,far:20000});
 $('projection').value='orthographic';
 $('zoom').value=String(Math.max(5,Math.min(28,renderer.getCamera().distance)));
};
function status(v,ok=false){$('status').textContent=v;$('status').dataset.ok=ok?'true':'false';}
function evidence(render){
 const s=dataset?.scene;
 const audit=s?auditAIG3DScene(s):null;
 lastEvidence={
  sceneProfile:profile,engineVersion:'AIG_REAL3D_SCENE_V1',
  consumer:isHuman()?'FastModel':profile==='FastModel'?'FastModel':profile==='5AX'?'AIG Studio 5.0':'AIG-II',
  sourceKind:dataset?.sourceKind??'EXPLICIT_PROCEDURAL_DEMO_NOT_AIG_AUTHORITY',
  trueHumanGeometry:dataset?.appearance??null,
  trueFrontPNG:lastHumanPhoto??null,
  renderer:render,audit,
  readOnly:true,noNCCommandsSent:true,
  cncKinematicsMapped:false,materialRemovalMm3:null,
  originalHuman3DReferenceMatched:false,nativeApkExeHardwareGate:false
 };
 $('proof').textContent=JSON.stringify(lastEvidence,null,2);
}
function paint(){
 if(!dataset)return;
 try{
  const result=renderer.render(dataset.scene);
  evidence(result);
  if(result.status==='WEBGL_XYZ_TRIANGLES_RENDERED')
   status(isHuman()?
    '真 WebGL 已繪製人體 '+result.triangles+
    ' 個 XYZ 三角形，身高 '+dataset.appearance.heightMm+
    ' mm｜男女源模型＋參數化改形｜外觀仍 BLOCK。':
    '真 WebGL 正在顯示 '+result.triangles+' 個 XYZ 三角形（'+
    result.antialiasProfile+'／'+result.effectiveSuperSampleScale.toFixed(2)+'× 抗鋸齒）；'+
    '刀路 G0 '+result.rapid+'／G1 '+result.feed+
    ' 為明確標記的示範疊層；未連接機台。',true);
  else status('目前無可用 GPU 繪圖介面：'+result.status);
 }catch(e){status('BLOCKED：3D 繪圖發生錯誤：'+String(e.message||e));
  $('proof').textContent=String(e.stack||e);}
}
function change(){
 const nextProfile=$('profile').value;
 const human=nextProfile==='HumanMale'||nextProfile==='HumanFemale';
 let next;
 try{
  next=human?createAIGReal3DHumanScene({
   gender:nextProfile==='HumanMale'?'male':'female',
   age:$('human-age').value,
   heightMm:Number($('human-height').value),
   build:Number($('human-build').value)
  }):demoAIG3DScene(nextProfile);
 }catch(e){
  status('人體幾何建置 BLOCK：'+String(e?.message||e));
  $('human-source-status').textContent='BLOCK：'+String(e?.message||e);
  return;
 }
 // Geometry is confirmed before disposing old GPU buffers. Never clear
 // the renderer when a new body build fails.
 const old=dataset;
 if(old?.scene&&renderer.status==='READY')
  for(const node of old.scene.nodes)renderer.releaseMesh(node.mesh);
 profile=nextProfile;dataset=next;lastHumanPhoto=null;
 const seen=document.querySelector('#human-photo-result');
 seen.replaceChildren();
 baseNode=human?null:next.scene.nodes.find(n=>
  n.id===(nextProfile==='FastModel'?'building':'endmill'));
 $('human-controls').hidden=!human;
 $('spindle-y').disabled=human;$('spindle-y').value='0';
 $('mode').textContent=human?
  'REAL3D｜'+(humanGender()==='male'?'男性':'女性')+
  '真 XYZ 人體技術模型，未外觀驗收':
  nextProfile==='FastModel'?'FastModel｜相對場景示範':nextProfile+'｜機台模型示範';
 if(human){
  humanFront();
  const a=next.appearance;
  $('human-source-status').textContent=
   '真幾何 '+a.actualMeshTriangles+' 三角形／'+a.bodyParts+
   ' 個部件｜'+a.heightMm+' mm｜腳底 '+a.footGroundMm+
   ' mm｜來源檢查 '+(a.sourceAnatomyNumericalAuditPASS?'數值通過':'有異常')+
   '｜外觀未核准';
 }else{
  renderer.setCamera({yaw:.7,pitch:.36,distance:14,focus:[0,0,0],
   projection:'perspective',orthoSpan:9});
  $('projection').value='perspective';
  $('zoom').value='14';
 }
 displayHeight();paint();
}
$('profile').addEventListener('change',()=>{
 const v=$('profile').value;
 if(v==='HumanMale'||v==='HumanFemale')
  $('human-height').value=String(ageDefault(v==='HumanMale'?'male':'female',
   $('human-age').value));
 change();
});
$('human-age').addEventListener('change',()=>{
 $('human-height').value=String(ageDefault(humanGender(),$('human-age').value));
 if(isHuman())change();
});
function queueHumanRebuild(){
 displayHeight();
 if(!isHuman()||humanRebuildQueued)return;
 humanRebuildQueued=true;
 requestAnimationFrame(()=>{humanRebuildQueued=false;if(isHuman())change();});
}
$('human-height').addEventListener('input',queueHumanRebuild);
$('human-build').addEventListener('input',queueHumanRebuild);
$('human-front').addEventListener('click',()=>{
 if(!isHuman()||renderer.status!=='READY')return;
 try{humanFront();paint()}catch(e){status('正面相機 BLOCK：'+e.message);}
});
$('human-photo').addEventListener('click',async()=>{
 if(!isHuman()||photoBusy||renderer.status!=='READY')return;
 photoBusy=true;$('human-photo').disabled=true;
 const source=dataset;
 try{
  humanFront();
  const rec=await renderer.captureNativePNG(source.scene,{
   width:1080,height:1920});
  if(source!==dataset)throw Error('SOURCE_CHANGED_DURING_GPU_CAPTURE');
  const url=URL.createObjectURL(rec.blob);
  const frame=document.createElement('figure');
  frame.style.cssText='margin:0;border:1px solid #477b92;border-radius:9px;padding:10px';
  const img=document.createElement('img');
  img.src=url;img.alt='真正 Real3D 男女基礎人體 WebGL 0° 正面照';
  img.style.cssText='width:100%;max-width:370px;height:auto;display:block';
  const dl=document.createElement('a');
  dl.href=url;
  dl.download='AIG-Real3D-'+humanGender()+'-'+$('human-age').value+
   '-FRONT-1080x1920-'+rec.sha256.slice(0,12)+'.png';
  dl.textContent='儲存 GPU 真正正面 PNG';
  dl.style.cssText='display:block;color:#92edff;margin:10px 0';
  const details=document.createElement('small');
  details.textContent='1080×1920｜真 WebGL｜SHA256 '+rec.sha256+
   '｜Stage1 人體外觀仍 BLOCK';
  frame.append(img,dl,details);
  $('human-photo-result').prepend(frame);
  lastHumanPhoto={source:'REAL_WEBGL_GPU_FRAME',gender:humanGender(),
   view:'front',projection:'orthographic',yawDegrees:180,
   bodyFrontWorldSide:'-Z',pitchDegrees:0,
   nativePNGWidth:rec.width,nativePNGHeight:rec.height,
   sha256:rec.sha256,genuineGpuReadback:rec.genuineGpuReadback,
   actualColorSamples:rec.actualColorSamples,
   releasePASS:false};
  $('human-source-status').textContent='已輸出 GPU 正面 PNG '+rec.width+
   '×'+rec.height+'｜SHA '+rec.sha256.slice(0,16)+
   '…｜請目視檢查頭頸肩腿；仍為 BLOCK。';
  evidence(renderer.getLastStats());
 }catch(e){
  status('正面 PNG BLOCK：'+String(e?.message||e));
  $('human-source-status').textContent='正面 PNG BLOCK：'+String(e?.message||e);
 }finally{
  photoBusy=false;$('human-photo').disabled=false;
 }
});
$('quality').addEventListener('change',()=>{
 if(renderer.status!=='READY')return;
 try{
  renderer.setQuality($('quality').value);
  paint();
  const budget=renderer.getQuality().lastFrameBudget;
  $('quality-hint').textContent='抗鋸齒：'+$('quality').selectedOptions[0].text+
   '；有效渲染倍率 '+budget.effectiveScale.toFixed(2)+'×；'+
   (budget.cappedBySafety?'已依顯存上限自動降低實際取樣尺寸。':'目前未觸發像素上限。')+
   ' MSAA '+(renderer.getQuality().hardwareMSAAContextEnabled?
    '裝置回報可用，樣本數 '+renderer.getQuality().reportedMSAASamples:'未啟用或不支援')+
   '。原始 3D 幾何與 NC 未修改。';
 }catch(e){status('BLOCKED：畫質切換失敗：'+String(e.message||e));}
});
$('projection').addEventListener('change',()=>{
 if(renderer.status!=='READY')return;
 try{renderer.setCamera({projection:$('projection').value});paint();}
 catch(e){status('BLOCKED：'+e.message);}
});
$('zoom').addEventListener('input',()=>{
 if(renderer.status!=='READY')return;
 renderer.setCamera({distance:Number($('zoom').value)});paint();
});
$('spindle-y').addEventListener('input',()=>{
 if(!dataset||!baseNode)return;
 const offset=Number($('spindle-y').value);
 const current={...baseNode.transform,position:[...baseNode.transform.position]};
 // Relative scene/work position visualization only. Does not jog real CNC.
 current.position[1]=(profile==='FastModel'?.45:.9)+offset;
 updateAIG3DNodeTransform(dataset.scene,baseNode.id,current);
 paint();
});
$('reset').addEventListener('click',()=>{
 if(renderer.status!=='READY')return;
 if(isHuman())humanFront();
 else renderer.setCamera({yaw:.7,pitch:.36,distance:14,focus:[0,0,0]});
 $('zoom').value=isHuman()?String(Math.max(5,Math.min(28,renderer.getCamera().distance))):'14';
 paint();
});
$('front').addEventListener('click',()=>{
 if(renderer.status!=='READY')return;
 if(isHuman())humanFront();
 else renderer.setCamera({yaw:0,pitch:0,projection:'orthographic'});
 $('projection').value='orthographic';paint();
});
$('top').addEventListener('click',()=>{
 if(renderer.status!=='READY')return;
 renderer.setCamera({yaw:isHuman()?Math.PI:0,pitch:1.44,projection:'orthographic'});
 $('projection').value='orthographic';paint();
});
let drag=null,prevSpan=null;
canvas.addEventListener('pointerdown',e=>{
 if(renderer.status!=='READY')return;
 canvas.setPointerCapture(e.pointerId);
 if(drag===null)drag={id:e.pointerId,x:e.clientX,y:e.clientY};
 else prevSpan={id:e.pointerId,x:e.clientX,y:e.clientY};
});
canvas.addEventListener('pointermove',e=>{
 if(renderer.status!=='READY')return;
 if(prevSpan&&drag&&prevSpan.id===e.pointerId){
  const old=Math.hypot(prevSpan.x-drag.x,prevSpan.y-drag.y);
  const now=Math.hypot(e.clientX-drag.x,e.clientY-drag.y);
  const distance=renderer.getCamera().distance;
  renderer.setCamera({distance:Math.max(4,Math.min(35,distance+(old-now)*.045))});
  prevSpan.x=e.clientX;prevSpan.y=e.clientY;
  $('zoom').value=String(renderer.getCamera().distance);paint();
  return;
 }
 if(!drag||drag.id!==e.pointerId||prevSpan)return;
 const c=renderer.getCamera();
 renderer.setCamera({yaw:c.yaw+(e.clientX-drag.x)*.009,
  pitch:Math.max(-1.4,Math.min(1.44,c.pitch+(e.clientY-drag.y)*.006))});
 drag.x=e.clientX;drag.y=e.clientY;paint();
});
function releasePointer(e){
 if(drag?.id===e.pointerId){drag=prevSpan?{...prevSpan}:null;prevSpan=null;}
 else if(prevSpan?.id===e.pointerId)prevSpan=null;
 try{canvas.releasePointerCapture(e.pointerId);}catch{}
}
canvas.addEventListener('pointerup',releasePointer);
canvas.addEventListener('pointercancel',releasePointer);
canvas.addEventListener('wheel',e=>{
 if(renderer.status!=='READY')return;e.preventDefault();
 const c=renderer.getCamera(),distance=Math.max(4,Math.min(35,c.distance*(e.deltaY>0?1.1:.9)));
 renderer.setCamera({distance});$('zoom').value=String(distance);paint();
},{passive:false});
const resize=()=>{if(renderer.status==='READY')paint();};
window.addEventListener('resize',resize);
window.addEventListener('pagehide',()=>renderer.destroy(),{once:true});
if(renderer.status==='READY'){
 const params=new URLSearchParams(location.search);
 const chosen=params.get('profile');
 if(['HumanMale','HumanFemale','3AX','5AX','FastModel'].includes(chosen))
  $('profile').value=chosen;
 $('human-height').value=String(ageDefault(
  $('profile').value==='HumanFemale'?'female':'male','adult'));
 change();
}
else {
 status('BLOCKED：WebGL 無法初始化（'+(initializationError||'GPU 不支援')+
  '）。既有模型資料保持不變，不進行假 3D 動畫。');
 evidence({status:renderer.status,initializationError});
}
