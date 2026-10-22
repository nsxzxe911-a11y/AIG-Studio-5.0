/** Real3D 1.2 NC-first source -> guarded stock simulation. Never writes CNC. */
import {createAIG3DScene,addAIG3DNode,addAIG3DToolpathOverlay}
 from './aig-real3d-core.mjs';
import {createAIG3DRenderer} from './aig-real3d-webgl.mjs';
import {createAIGVoxelStock,auditAIGVoxelStock,meshAIGVoxelStock}
 from './aig-real3d-stock-removal-1-1.mjs';
import {parseAIG12NCWorkingCopy,simulateAIG12NCWorkingCopy}
 from './aig-real3d-nc-preview-1-2.mjs';
const $=id=>document.getElementById(id),canvas=$('view'),
 renderer=createAIG3DRenderer(canvas,{pixelRatio:1.1,maxFramePixels:780000,preserveDrawingBuffer:true});
const SOURCE='AIG12_NC_LOCAL_USER_SOURCE_UNVERIFIED_NOT_MACHINE';
let parsed=null,scene=null,stockNode=null,result=null,drag=null;
const format=v=>Number(v).toFixed(3);
function status(text,ok=false){$('status').textContent=text;$('status').dataset.ok=ok?'true':'false';}
function config(){return{stockOriginMm:[-8,-5,-2],stockSizeMm:[16,10,5],
 voxelMm:Number($('voxel').value),cutterDiameterMm:2,fluteLengthMm:6,maxFaces:42000};}
function newUncutMesh(){
 const s=createAIGVoxelStock({...{
  originMm:config().stockOriginMm,sizeMm:config().stockSizeMm,
  voxelMm:config().voxelMm,maxCells:150000
 }});
 return{stock:s,boundary:meshAIGVoxelStock(s,{maxFaces:42000}),audit:auditAIGVoxelStock(s)};
}
function setScene(input=null,withNC=false){
 const data=input||newUncutMesh();
 if(!data.boundary?.mesh&&!data.boundaryMesh)
  throw Error('AIG12_SURFACE_EMPTY_NOT_RENDERABLE');
 const geom=data.boundaryMesh??data.boundary.mesh;
 const next=createAIG3DScene({id:'real3d-nc-first',
  consumer:'AIG-II',units:'MM',source:SOURCE});
 stockNode=addAIG3DNode(next,{id:'stock',kind:'stock',mesh:geom,
  source:SOURCE,material:{baseColor:[.61,.64,.72,1],metallic:.35,roughness:.6}});
 if(withNC&&parsed){
  addAIG3DToolpathOverlay(next,{id:'limited_working_copy_path',
   segments:parsed.segments,source:SOURCE,units:'MM'});
 }
 scene=next;
 $('removed').textContent=format(data.audit.removedMm3);
 $('remain').textContent=format(data.audit.remainingMm3);
 $('triangle').textContent=String(stockNode.mesh.triangleCount);
 redraw();
}
function redraw(){
 if(renderer.status!=='READY'||!scene){
  status('BLOCKED：WebGL GPU 無法使用，不宣稱渲染完成。');return;
 }
 try{
  const r=renderer.render(scene);
  const proof={schema:'AIG_REAL3D_NC_WORKING_COPY_V1_2',
   source:SOURCE,parsed:parsed?{
    sourceMotionBlocks:parsed.sourceMotionBlocks,
    feedSegments:parsed.feedSegments,rapidSegments:parsed.rapidSegments,
    verifiedForMachineUse:false,workOffsetResolvedFromMachine:false}:null,
   rendered:r,actualNumericalVoxelRemoval:result?.actualNumericalVoxelCutting??false,
   removedMm3:result?.actualRemovedVolumeMm3??0,
   stockMeshChangedAfterG1Feed:result?.audit?.removedMm3>0,
   G0NeverCuts:result?.rapidNeverCuts??true,
   machineCommandsSent:0,realMachineKinematicsVerified:false,
   completeFanucNCParsing:false,sourceValidatedAsProductionNC:false,
   nativeApkExeVerified:false};
  $('evidence').textContent=JSON.stringify(proof,null,2);
  status('WebGL XYZ 已繪製 '+r.triangles+' 個三角形；'+
   (result?'本機模擬已完成，材料移除 '+format(result.actualRemovedVolumeMm3)+' mm³。':
    '尚未進行切削，本機場景不會操作真機。'),true);
 }catch(e){status('BLOCKED：3D 繪圖器異常：'+String(e.message||e));}
}
function invalidate(){
 parsed=null;result=null;$('simulate').disabled=true;
 try{setScene();}catch(e){status('BLOCKED：無法建立可用 3D 工件：'+String(e.message||e));}
}
$('nc').addEventListener('input',()=>{
 parsed=null;$('simulate').disabled=true;
 status('NC 工作副本已修改，必須重新完整解析。之前畫面不代表新程式。');
});
$('voxel').addEventListener('change',invalidate);
$('parse').addEventListener('click',()=>{
 try{
  const candidate=parseAIG12NCWorkingCopy($('nc').value);
  parsed=candidate;result=null;$('simulate').disabled=false;
  setScene(null,true);
  status('解析 PASS（僅受限 G0／G1 子集）：'+candidate.segments.length+
   ' 條 XYZ 線段，可執行唯讀體素模擬；不屬於真機程式驗證。',true);
 }catch(e){parsed=null;$('simulate').disabled=true;
  status('BLOCKED：NC 解析未通過，禁止材料移除：'+String(e.message||e));}
});
$('simulate').addEventListener('click',()=>{
 if(!parsed)return;
 try{
  const sim=simulateAIG12NCWorkingCopy(parsed,config());
  if(sim.actualRemovedVolumeMm3<=0)status('中性：程式未與工件體素相交，移除體積為 0。',false);
  result=sim;setScene(sim,true);
 }catch(e){status('BLOCKED：切削模擬失敗且未覆蓋原工作副本：'+String(e.message||e));}
});
$('reset').addEventListener('click',invalidate);
$('camera').addEventListener('click',()=>{
 if(renderer.status==='READY'){
  renderer.setCamera({yaw:.68,pitch:.45,distance:28,focus:[0,0,0]});redraw();
 }
});
canvas.addEventListener('pointerdown',e=>{
 if(renderer.status!=='READY')return;
 canvas.setPointerCapture(e.pointerId);drag={id:e.pointerId,x:e.clientX,y:e.clientY};
});
canvas.addEventListener('pointermove',e=>{
 if(!drag||drag.id!==e.pointerId||renderer.status!=='READY')return;
 const c=renderer.getCamera();
 renderer.setCamera({yaw:c.yaw+(e.clientX-drag.x)*.008,
  pitch:Math.max(-1.4,Math.min(1.4,c.pitch+(e.clientY-drag.y)*.007))});
 drag.x=e.clientX;drag.y=e.clientY;redraw();
});
for(const event of ['pointerup','pointercancel'])canvas.addEventListener(event,e=>{
 if(drag?.id===e.pointerId)drag=null;
 try{canvas.releasePointerCapture(e.pointerId);}catch{}
});
canvas.addEventListener('wheel',e=>{
 if(renderer.status!=='READY')return;e.preventDefault();
 const c=renderer.getCamera();
 renderer.setCamera({distance:Math.max(8,Math.min(70,c.distance*(e.deltaY>0?1.1:.9)))});
 redraw();
},{passive:false});
window.addEventListener('pagehide',()=>renderer.destroy(),{once:true});
if(renderer.status==='READY'){
 renderer.setCamera({yaw:.68,pitch:.45,distance:28,focus:[0,0,0]});
 invalidate();
}else status('BLOCKED：沒有可用 WebGL，NC 模擬不能宣稱畫面通過。');
