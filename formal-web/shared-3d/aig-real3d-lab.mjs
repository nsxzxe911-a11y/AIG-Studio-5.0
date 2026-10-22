/** Shared Real3D 1.0 — real WebGL source-bound visual verification surface. */
import {demoAIG3DScene} from './aig-real3d-adapters.mjs';
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
function status(v,ok=false){$('status').textContent=v;$('status').dataset.ok=ok?'true':'false';}
function evidence(render){
 const s=dataset?.scene;
 const audit=s?auditAIG3DScene(s):null;
 lastEvidence={
  sceneProfile:profile,engineVersion:'AIG_REAL3D_SCENE_V1',
  consumer:profile==='FastModel'?'FastModel':profile==='5AX'?'AIG Studio 5.0':'AIG-II',
  sourceKind:'EXPLICIT_PROCEDURAL_DEMO_NOT_AIG_AUTHORITY',
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
   status('真 WebGL 正在顯示 '+result.triangles+' 個 XYZ 三角形（'+
    result.antialiasProfile+'／'+result.effectiveSuperSampleScale.toFixed(2)+'× 抗鋸齒）；'+
    '刀路 G0 '+result.rapid+'／G1 '+result.feed+
    ' 為明確標記的示範疊層；未連接機台。',true);
  else status('目前無可用 GPU 繪圖介面：'+result.status);
 }catch(e){status('BLOCKED：3D 繪圖發生錯誤：'+String(e.message||e));
  $('proof').textContent=String(e.stack||e);}
}
function change(){
 profile=$('profile').value;
 dataset=demoAIG3DScene(profile);
 baseNode=dataset.scene.nodes.find(n=>n.id===(profile==='FastModel'?'building':'endmill'));
 $('mode').textContent=profile==='FastModel'?'FastModel｜相對場景示範':profile+'｜機台模型示範';
 $('spindle-y').value='0';
 const cam=renderer.getCamera();
 if(cam)renderer.setCamera({yaw:.7,pitch:.36,distance:14,focus:[0,0,0]});
 $('zoom').value='14';
 paint();
}
$('profile').addEventListener('change',change);
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
 renderer.setCamera({yaw:.7,pitch:.36,distance:14,focus:[0,0,0]});
 $('zoom').value='14';paint();
});
$('front').addEventListener('click',()=>{
 if(renderer.status!=='READY')return;
 renderer.setCamera({yaw:0,pitch:0,projection:'orthographic'});
 $('projection').value='orthographic';paint();
});
$('top').addEventListener('click',()=>{
 if(renderer.status!=='READY')return;
 renderer.setCamera({yaw:0,pitch:1.44,projection:'orthographic'});
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
if(renderer.status==='READY')change();
else {
 status('BLOCKED：WebGL 無法初始化（'+(initializationError||'GPU 不支援')+
  '）。既有模型資料保持不變，不進行假 3D 動畫。');
 evidence({status:renderer.status,initializationError});
}
