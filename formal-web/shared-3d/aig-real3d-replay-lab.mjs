/** Real3D 1.3: guarded NC single-block numerical replay into actual WebGL mesh.
 * One bounded G0/G1 block per browser frame during full run; cancel on edits.
 * Never sends, schedules or approves machine movement.
 */
import {createAIG3DScene,createAIG3DCylinder,addAIG3DNode,addAIG3DToolpathOverlay}
 from './aig-real3d-core.mjs';
import {createAIG3DRenderer} from './aig-real3d-webgl.mjs';
import {parseAIG12NCWorkingCopy}
 from './aig-real3d-nc-preview-1-2.mjs';
import {createAIG13SingleBlockReplay,advanceAIG13SingleBlockReplay,
 seekAIG13SingleBlockReplay,auditAIG13SingleBlockReplay,
 currentAIG13ReplayBoundary} from './aig-real3d-step-replay-1-3.mjs';
const $=id=>document.getElementById(id);
const GPU_RENDER_OPTIONS=Object.freeze({
 pixelRatio:1.05,maxFramePixels:680000,preserveDrawingBuffer:true
});
let renderer=createAIG3DRenderer($('view'),GPU_RENDER_OPTIONS);
const source='LOCAL_REPARSED_LIMITED_NC_WORKING_COPY_NO_MACHINE_OUTPUT';
let parsed=null,replay=null,scene=null,busy=false,epoch=0,drag=null,previousMesh=null;
const displayToolMesh=createAIG3DCylinder({radius:1,height:6,segments:20,
 provenance:'READ_ONLY_TOOL_TIP_CYLINDER_FROM_LIMITED_NC_SOURCE_NOT_HOLDER_CHECKED'});
const num=x=>Number(x).toFixed(3);
const show3AXLayer=name=>{
 const input=document.querySelector('[data-3ax-layer="'+name+'"]');
 return input?input.checked:true;
};
const opts=()=>({
 stockOriginMm:[-8,-5,-2],stockSizeMm:[16,10,5],
 voxelMm:Number($('voxel').value),cutterDiameterMm:2,fluteLengthMm:6,maxFaces:42000
});
function status(message,ok=false){
 $('status').textContent=message;$('status').dataset.ok=ok?'true':'false';
}
function gates(){
 const ready=Boolean(replay)&&!busy;
 $('next').disabled=!ready||auditAIG13SingleBlockReplay(replay).finished;
 $('prev').disabled=!ready||auditAIG13SingleBlockReplay(replay).blockIndex===0;
 $('simulate').disabled=!ready||auditAIG13SingleBlockReplay(replay).finished;
 $('parse').disabled=busy;
 $('block').disabled=!ready;
 $('block').max=String(replay?.sourceBlocks??1);
 $('block').value=String(replay?replay._state.stepCount:0);
}
function paint(why='READY'){
 if(renderer.status!=='READY'){
  status('BLOCKED：WebGL 不可用，不能把模擬畫面當成完成品。');return;
 }
 if(!replay)return;
 const audit=auditAIG13SingleBlockReplay(replay),
  surface=currentAIG13ReplayBoundary(replay);
 const nextScene=createAIG3DScene({id:'real3d-v1-3-block-replay',
  consumer:'AIG-II',units:'MM',source});
 if(surface.mesh&&show3AXLayer('stock')){
  addAIG3DNode(nextScene,{
   id:'true_voxel_stock',kind:'stock',mesh:surface.mesh,source,
   material:{baseColor:[.64,.67,.72,1],metallic:.28,roughness:.57}
  });
 }
 const pos=audit.toolpathPositionMm;
 if(pos&&show3AXLayer('tool')){
  addAIG3DNode(nextScene,{id:'current_tool_preview',kind:'tool',
   mesh:displayToolMesh,source,
   transform:{position:[pos[0],pos[1],pos[2]+3],rotationDeg:[90,0,0]},
   material:{baseColor:[.25,.8,.95,1],metallic:.52,roughness:.35}});
 }
 if(show3AXLayer('path'))addAIG3DToolpathOverlay(nextScene,{
  id:'nc_preview_path',segments:replay.source.segments,source,units:'MM'
 });
 const oldMesh=previousMesh;
 scene=nextScene;
 const result=renderer.render(scene);
 if(result.status!=='WEBGL_XYZ_TRIANGLES_RENDERED')
  throw Error('AIG13_REAL_GPU_RENDER_BLOCKED_'+result.status);
 // Delete stale GPU buffers after new render: no unbounded VRAM buildup
 // during dozens of regenerated stock surfaces.
 if(oldMesh&&oldMesh!==surface.mesh)renderer.releaseMesh?.(oldMesh);
 previousMesh=surface.mesh;
 $('removed').textContent=num(audit.cumulativeRemovedMm3);
 $('remain').textContent=num(audit.remainingMm3);
 $('triangle').textContent=String(audit.triangleCount);
 $('block-status').textContent=
  '單節 '+audit.blockIndex+'/'+audit.totalBlocks+
  '｜來源 N/C 行 '+(audit.lastSourceLine??'初始')+
  '｜'+(audit.lastMotion??'尚未進刀')+
  '｜本節 '+num(audit.lastRemovedMm3)+' mm³'+
  '｜累積 '+num(audit.cumulativeRemovedMm3)+' mm³'+
  '｜下一行 '+(audit.nextSourceLine??'已結束');
 $('evidence').textContent=JSON.stringify({
  schema:'AIG_REAL3D_V1_3_VISUAL_NUMERICAL_REPLAY',
  source,reason:why,replay:audit,rendered:result,
  stockHasActualVoxelOccupancy:true,
  visible3DLayers:{stock:show3AXLayer('stock'),tool:show3AXLayer('tool'),path:show3AXLayer('path')},
  exactMaterialRemovalThroughOriginalVoxelEngine:true,
  originCoordinatesMm:[-8,-5,-2],
  sourceAcceptedCommands:'G21,G90,G54,G0,G1,S,F,M3,M5,M30',
  realFanucControllerCommandsSent:0,
  realMachineAxisKinematicsVerified:false,
  true0001MmPrecision:false,
  unsupportedNCBlocked:true,
  originalPhoneAndWindowsNativeGPUCertified:false
 },null,2).replace('"0.001":undefined,','');
 status('已從原始 NC 完成 '+audit.blockIndex+'／'+audit.totalBlocks+
  ' 節的真體素計算，累積 '+num(audit.cumulativeRemovedMm3)+
  ' mm³。只是唯讀模擬，不是 CNC 加工指令。',true);
 gates();
}
function cancel(){
 epoch++;busy=false;
}
function invalidate(text='NC 工作副本已修改，必須重新完整解析才能繼續。'){
 cancel();parsed=null;replay=null;
 if(previousMesh)renderer.releaseMesh?.(previousMesh);
 previousMesh=null;
 // Do not leave a stale successfully cut surface visible under edited NC
 // input. Render an intentionally empty scene with no trusted workpiece.
 if(renderer.status==='READY'){
  try{renderer.render(createAIG3DScene({id:'uncertified-source-empty',
   consumer:'AIG-II',units:'MM',source:'INVALIDATED_NC_WORKING_COPY_NOT_RENDERED'}));}
  catch{} 
 }
 scene=null;
 $('next').disabled=true;$('prev').disabled=true;
 $('simulate').disabled=true;$('block').disabled=true;
 $('removed').textContent='0.000';
 $('remain').textContent='0.000';$('triangle').textContent='0';
 $('block-status').textContent='尚未解析來源工作副本；不代表目前文字的切削結果。';
 $('evidence').textContent='BLOCKED：原 NC 副本與舊模擬結果已解除關聯。';
 status(text);gates();
}
function parse(){
 cancel();
 try{
  const candidate=parseAIG12NCWorkingCopy($('nc').value);
  const working=createAIG13SingleBlockReplay(candidate,opts());
  parsed=candidate;replay=working;
  paint('REPARSED_WORKING_COPY_INITIAL_STOCK');
 }catch(e){
  invalidate('BLOCKED：NC 完整解析／材料初始格線不通過：'+String(e.message||e));
 }
}
function next(){
 if(!replay||busy)return;
 try{
  advanceAIG13SingleBlockReplay(replay);
  paint('ONE_SOURCE_BLOCK_ACTUALLY_APPLIED');
 }catch(e){status('BLOCKED：此節失敗且之前已完成的材料副本不被覆蓋：'+String(e.message||e));gates();}
}
/** Reconstruct an earlier state in small browser chunks. Keep previous
 * verified state visible until all source blocks and mesh generation pass.
 */
async function reconstruct(at){
 if(!replay||busy)return;
 const old=replay,candidate=createAIG13SingleBlockReplay(parsed,opts()),
  token=++epoch;
 busy=true;gates();
 status('重新從原始 NC 數值計算到第 '+at+' 節，原畫面保持不變。');
 try{
  for(let i=0;i<at;i++){
   if(token!==epoch)return;
   advanceAIG13SingleBlockReplay(candidate);
   if(i%2===1)await new Promise(requestAnimationFrame);
  }
  if(token!==epoch)return;
  replay=candidate;busy=false;paint('REBUILT_FROM_ORIGINAL_NC_SOURCE');
 }catch(e){
  if(token!==epoch)return;
  replay=old;busy=false;
  status('BLOCKED：重新計算失敗，保留上一個有效工件：'+String(e.message||e));
  gates();
 }
}
async function runAll(){
 if(!replay||busy)return;
 busy=true;const token=++epoch;gates();
 try{
  while(token===epoch&&!auditAIG13SingleBlockReplay(replay).finished){
   advanceAIG13SingleBlockReplay(replay);
   paint('EACH_NC_BLOCK_NUMERICALLY_ADVANCED');
   const selected=document.querySelector('[data-3ax-rate][aria-pressed="true"]');
   const rate=selected?Number(selected.getAttribute('data-3ax-rate')):100;
   if(selected&&[25,50,100,200].includes(rate))
    await new Promise(resolve=>setTimeout(resolve,Math.ceil(4600/rate)));
   else await new Promise(requestAnimationFrame);
  }
  if(token!==epoch)return;
  status('完整單節數值模擬完成；最終體積與工件網格依各節真實更新。',true);
 }catch(e){if(token===epoch)status('BLOCKED：整段模擬在單節停止：'+String(e.message||e));}
 finally{if(token===epoch){busy=false;gates();}}
}
$('parse').addEventListener('click',parse);
$('next').addEventListener('click',next);
$('prev').addEventListener('click',()=>{
 if(replay&&!busy)reconstruct(auditAIG13SingleBlockReplay(replay).blockIndex-1);
});
$('simulate').addEventListener('click',runAll);
$('reset').addEventListener('click',()=>{if(busy)cancel();if(parsed)reconstruct(0);else invalidate('已清除本次工作副本。');});
$('block').addEventListener('change',e=>{
 if(!busy&&replay)reconstruct(Number(e.target.value));
});
$('nc').addEventListener('input',()=>invalidate());
$('voxel').addEventListener('change',()=>invalidate('體素解析度已更改，必須重新完整解析。'));
$('camera').addEventListener('click',()=>{
 if(renderer.status!=='READY'||!replay)return;
 renderer.setCamera({yaw:.65,pitch:.4,distance:28,focus:[0,0,0]});
 try{paint('CAMERA_ONLY_NO_STOCK_CHANGE');}catch(e){status('BLOCKED：'+String(e.message||e));}
});
// Optional mobile 3AX controls use the SAME real renderer/replay working copy;
// the normal desktop NC-first page does not need to expose these selectors.
const cameraPreset={
 iso:{yaw:.65,pitch:.4,distance:28},
 top:{yaw:0,pitch:1.42,distance:28},
 front:{yaw:0,pitch:0,distance:28},
 left:{yaw:-Math.PI/2,pitch:0,distance:28},
 right:{yaw:Math.PI/2,pitch:0,distance:28},
 reset:{yaw:.65,pitch:.4,distance:28},
 fit:{yaw:.65,pitch:.4,distance:24}
};
for(const button of document.querySelectorAll('[data-3ax-camera]')){
 button.addEventListener('click',()=>{
  if(renderer.status!=='READY'||!replay||busy)return;
  const key=button.getAttribute('data-3ax-camera');
  try{
   const current=renderer.getCamera();
   if(key==='zoom-in'||key==='zoom-out'){
    const factor=key==='zoom-in'?.78:1.28;
    renderer.setCamera({distance:Math.max(5,Math.min(80,current.distance*factor))});
   }else if(cameraPreset[key]){
    renderer.setCamera(cameraPreset[key]);
   }else throw Error('UNSUPPORTED_CAMERA_PRESET');
   paint('MOBILE_AUTHENTIC_3D_CAMERA_'+key.toUpperCase().replace('-','_'));
  }catch(error){status('BLOCKED：視角命令未完成：'+String(error.message||error));}
 });
}
for(const input of document.querySelectorAll('[data-3ax-layer]')){
 input.addEventListener('change',()=>{
  if(!replay||busy)return;
  if(!show3AXLayer('stock')&&!show3AXLayer('tool')){
   input.checked=true;
   status('保留至少一個真正 3D 幾何圖層，避免把空畫面當成真 3D。');
   return;
  }
  try{paint('MOBILE_REAL_WEBGL_LAYER_CHANGED');}
  catch(error){status('BLOCKED：圖層變更無法確認：'+String(error.message||error));}
 });
}
for(const button of document.querySelectorAll('[data-3ax-rate]')){
 button.addEventListener('click',()=>{
  const value=Number(button.getAttribute('data-3ax-rate'));
  if(![25,50,100,200].includes(value))return;
  for(const other of document.querySelectorAll('[data-3ax-rate]'))
   other.setAttribute('aria-pressed',String(other===button));
  status('單節回放倍率設定 '+value+'%（僅本機模擬速度，不會修改 CNC Feed F）。',true);
 });
}
for(const button of document.querySelectorAll('[data-3ax-stop]')){
 button.addEventListener('click',()=>{
  if(busy){
   cancel();
   status('已暫停本機 NC 回放，保留目前真體素材料狀態；這不是 CNC 控制器急停。',true);
  }else status('本機數值回放未運行；CNC MACHINE DISCONNECTED。',true);
  gates();
 });
}
const canvas=$('view');
let pageDisposed=false;
// WebGL context loss is a GPU lifecycle event, NOT an instruction to clear
// NC, CAD state, voxel occupancy or the last verified simulation working copy.
canvas.addEventListener('webglcontextlost',event=>{
 event.preventDefault(); // browser may restore this WebGL context
 cancel(); // halt in-flight replay/rewind at the last committed block
 status('GPU_CONTEXT_LOST：已停止繪圖，保留原 NC 與已驗證的材料工作副本；等待 WebGL 恢復。');
 gates();
});
canvas.addEventListener('webglcontextrestored',()=>{
 if(pageDisposed)return;
 const oldRenderer=renderer,camera=oldRenderer.getCamera?.();
 try{
  // The previous programs, uniform locations and GPU buffers are invalid
  // after restoration. Construct a NEW renderer; never reuse old handles.
  const candidate=createAIG3DRenderer(canvas,GPU_RENDER_OPTIONS);
  if(candidate.status!=='READY')throw Error('GPU_REINIT_NOT_READY');
  if(camera)candidate.setCamera(camera);
  renderer=candidate;
  oldRenderer.destroy();
  previousMesh=null; // the replacement renderer has its own mesh cache
  if(replay){
   paint('WEBGL_CONTEXT_RESTORED_SAME_NUMERICAL_NC_WORKING_COPY');
   status('GPU 已恢復：重新建立 WebGL 網格，保留 NC 來源與先前材料移除數值。',true);
  }else status('GPU 已恢復；尚無已解析的 NC 工作副本。',true);
  gates();
 }catch(error){
  status('BLOCKED：GPU 重建失敗，保留原 NC 工作副本；無法認證目前 3D 畫面：'+
   String(error.message||error));
  gates();
 }
});
canvas.addEventListener('pointerdown',e=>{
 if(renderer.status!=='READY')return;canvas.setPointerCapture(e.pointerId);
 drag={id:e.pointerId,x:e.clientX,y:e.clientY};
});
canvas.addEventListener('pointermove',e=>{
 if(!drag||drag.id!==e.pointerId||!replay)return;
 const c=renderer.getCamera();
 renderer.setCamera({yaw:c.yaw+(e.clientX-drag.x)*.008,
  pitch:Math.max(-1.4,Math.min(1.4,c.pitch+(e.clientY-drag.y)*.007))});
 drag.x=e.clientX;drag.y=e.clientY;
 try{paint('CAMERA_DRAG_ONLY');}catch(err){status('BLOCKED：'+err.message);}
});
for(const name of ['pointerup','pointercancel'])canvas.addEventListener(name,e=>{
 if(drag?.id===e.pointerId)drag=null;
 try{canvas.releasePointerCapture(e.pointerId);}catch{}
});
canvas.addEventListener('wheel',e=>{
 if(renderer.status!=='READY'||!replay)return;
 e.preventDefault();const c=renderer.getCamera();
 renderer.setCamera({distance:Math.max(8,Math.min(70,c.distance*(e.deltaY>0?1.1:.9)))});
 try{paint('CAMERA_ZOOM_ONLY');}catch(err){status('BLOCKED：'+err.message);}
},{passive:false});
window.addEventListener('pagehide',()=>{
 pageDisposed=true;
 cancel();if(previousMesh)renderer.releaseMesh?.(previousMesh);
 renderer.destroy();
},{once:true});
if(renderer.status==='READY'){
 renderer.setCamera({yaw:.65,pitch:.4,distance:28,focus:[0,0,0]});
 parse();
}else invalidate('BLOCKED：無 WebGL，無法核准真 3D 畫面。');
