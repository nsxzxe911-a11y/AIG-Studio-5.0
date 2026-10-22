import {createAIG3DScene,createAIG3DCylinder,addAIG3DNode,
 addAIG3DToolpathOverlay,updateAIG3DNodeTransform}
 from './aig-real3d-core.mjs';
import {createAIGVoxelStock,createAIGCylindricalCutter,applyAIGFeedCut,
 auditAIGVoxelStock,meshAIGVoxelStock}
 from './aig-real3d-stock-removal-1-1.mjs';
import {createAIG3DRenderer} from './aig-real3d-webgl.mjs';
const $=id=>document.getElementById(id);
const canvas=$('view'),renderer=createAIG3DRenderer(canvas,{
 pixelRatio:1.2,maxFramePixels:780000,preserveDrawingBuffer:true
});
let stock=null,cutter=null,scene=null,stockNode=null,toolNode=null,feedCount=0,cutLog=[];
const source='PROCEDURAL_G1_VOXEL_TEST_FIXTURE_NOT_LIVE_NC';
const positions=[
 {from:[-5,0,2],to:[5,0,2]},
 {from:[5,-1.4,1.4],to:[-5,-1.4,1.4]},
 {from:[-5,1.4,1],to:[5,1.4,1]},
 {from:[5,0,0],to:[-5,0,0]}
];
const fmt=x=>x.toFixed(3);
function status(text,ok=false){$('status').textContent=text;$('status').dataset.pass=ok?'true':'false';}
function evidence(lastAction){
 const a=auditAIGVoxelStock(stock);
 $('removed').textContent=fmt(a.removedMm3);
 $('remaining').textContent=fmt(a.remainingMm3);
 $('voxels').textContent=String(a.remainingCells);
 $('triangles').textContent=stockNode?.mesh?.triangleCount??'0';
 const r=renderer.render(scene);
 const data={
  schema:a.schema,realNumerical3DRemoval:a.materialRemovalByFeedNumericallyVerified,
  stock:a,lastAction,tool:{diameterMm:cutter.diameterMm,fluteLengthMm:cutter.fluteLengthMm},
  feedOperations:feedCount,history:cutLog,render:r,
  source,sourceIsSynthetic:true,
  ncFeedRateAndAxisKinematicsVerified:false,
  liveFanucMachineConnection:false,
  trueContinuous001mmMaterialPrecision:false,
  AndroidWindowsNativeGPUHardwareVerified:false
 };
 $('proof').textContent=JSON.stringify(data,null,2);
 if(r.status!=='WEBGL_XYZ_TRIANGLES_RENDERED'){
  status('BLOCKED：本機 GPU 3D 繪圖不可用：'+r.status);return;
 }
 status('工件 3D 體積和表面已更新。累積移除 '+fmt(a.removedMm3)+
  ' mm³；記憶體受限於 '+a.totalCells+' 個體素。',true);
}
function init(){
 if(renderer.status!=='READY'){
  status('BLOCKED：WebGL 不可用，無法冒稱真 3D 渲染成功。');return;
 }
 try{
  const voxelMm=Number($('pitch').value),diameterMm=Number($('diameter').value);
  stock=createAIGVoxelStock({originMm:[-6,-4,0],sizeMm:[12,8,6],
   voxelMm,maxCells:150000});
  cutter=createAIGCylindricalCutter({diameterMm,fluteLengthMm:4});
  scene=createAIG3DScene({id:'real3d-voxel-stock',units:'MM',
   consumer:'AIG-II',source});
  const surface=meshAIGVoxelStock(stock);
  stockNode=addAIG3DNode(scene,{id:'stock',kind:'stock',
   mesh:surface.mesh,source,
   material:{baseColor:[.64,.44,.22,1],metallic:.28,roughness:.56}});
  toolNode=addAIG3DNode(scene,{id:'tool',kind:'tool',
   mesh:createAIG3DCylinder({
    radius:diameterMm/2,height:4,segments:32,
    provenance:'PROCEDURAL_CYLINDER_TOOL_NOT_MILL_MACHINE'
   }),source,transform:{
    position:[-5,0,4],rotationDeg:[90,0,0]
   },material:{baseColor:[.73,.87,.95,1],metallic:.55,roughness:.31}});
  addAIG3DToolpathOverlay(scene,{id:'feed-plan',source,units:'MM',
   segments:positions.map(p=>({...p,motion:'G1'}))});
  feedCount=0;cutLog=[];
  renderer.setCamera({focus:[0,0,3],yaw:.74,pitch:.46,distance:24});
  evidence({motion:'RESET',removedMm3:0});
 }catch(e){status('BLOCKED：工件建立失敗：'+String(e.message||e));}
}
function setTip(pos){
 const next={...toolNode.transform,position:[
  pos[0],pos[1],pos[2]+cutter.fluteLengthMm/2
 ]};updateAIG3DNodeTransform(scene,toolNode.id,next);
}
$('feed').addEventListener('click',()=>{
 if(!stock||!scene)return;
 try{
  const segment=positions[feedCount%positions.length],
   result=applyAIGFeedCut(stock,cutter,{...segment,motion:'G1',source});
  const old=stockNode.mesh,newMesh=meshAIGVoxelStock(stock);
  if(newMesh.empty)throw Error('STOCK_FULLY_REMOVED_NO_SURFACE');
  renderer.releaseMesh(old);
  stockNode.mesh=newMesh.mesh;
  scene.revision++;
  setTip(segment.to);feedCount++;cutLog.push(result);
  evidence(result);
 }catch(e){status('BLOCKED：G1 進給或工件再生失敗：'+String(e.message||e));}
});
$('rapid').addEventListener('click',()=>{
 if(!stock||!scene)return;
 try{
  const result=applyAIGFeedCut(stock,cutter,{motion:'G0',
   from:[-5,-3,7],to:[5,-3,7],source});
  setTip([5,-3,7]);cutLog.push(result);evidence(result);
 }catch(e){status('BLOCKED：'+String(e.message||e));}
});
$('reset').addEventListener('click',init);
$('pitch').addEventListener('change',init);
$('diameter').addEventListener('change',init);
$('orbit').addEventListener('click',()=>{
 if(renderer.status!=='READY'||!scene)return;
 try{
  const c=renderer.getCamera();
  renderer.setCamera({yaw:c.yaw+.75,pitch:Math.min(1.1,c.pitch+.1)});
  evidence({motion:'CAMERA_ONLY',removedMm3:0});
 }catch(e){status('BLOCKED：'+e.message);}
});
window.addEventListener('pagehide',()=>renderer.destroy(),{once:true});
if(renderer.status==='READY')init();
else status('BLOCKED：WebGL 初始化失敗；未提供假的工件模型。');
