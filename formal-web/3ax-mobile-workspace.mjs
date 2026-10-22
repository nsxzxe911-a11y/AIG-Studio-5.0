/**
 * AIG-II Mobile 3AX: validate visual pixel-region/command contract against
 * independently pinned source SHA. This is DOM control verification, not a
 * camera/physical machine geometry assertion.
 */
import {validateAIG3AXMobileMap,buildAIG3AXCADPlaneCalibration,
 projectAIG3AXPixelToCADXY} from './3ax-mobile-reverse-core.mjs';
const root=document.getElementById('mobile-3ax-workspace'),
 status=document.getElementById('reverse-status');
const forbidden=['NAV_4AX','NAV_5AX','NAV_6AX','JOG','NAV_AI','NAV_CAD','NAV_CAM','NAV_SIM'];
try{
 const response=await fetch('./3ax-mobile-reverse-map.json',{cache:'no-store'});
 if(!response.ok)throw Error('REGION_MANIFEST_NOT_AVAILABLE_'+response.status);
 const map=await response.json();
 const proof=validateAIG3AXMobileMap(map);
 if(map.source.authorityId!==root.dataset.authorityId)
  throw Error('ACTIVE_PAGE_SOURCE_AUTHORITY_MISMATCH');
 const mismatches=[];
 const audited=[];
 for(const region of map.regions){
  const candidates=[...root.querySelectorAll('[data-button-id]')].filter(
   el=>el.getAttribute('data-button-id')===region.id);
  if(!candidates.length)continue; // Information-only regions have no controls
  for(const el of candidates){
   if(!region.enabled){
    if(!(el instanceof HTMLButtonElement)||!el.disabled)
     mismatches.push(region.id+':DISABLED_GUARD_MISSING');
   }else if(region.commandId!==el.dataset.commandId)
     mismatches.push(region.id+':COMMAND_ID_NOT_EXACT');
   audited.push(region.id);
  }
 }
 for(const id of forbidden){
  const el=[...root.querySelectorAll('[data-button-id]')].find(el=>el.dataset.buttonId===id);
  if(!el||!el.disabled)mismatches.push(id+':MUST_BE_DISABLED');
 }
 if(!audited.includes('NC_PREV')||!audited.includes('NC_NEXT')||
  !audited.includes('EMERGENCY_STOP')||!audited.includes('CAM_TOP'))
  mismatches.push('REQUIRED_CORE_CALLBACK_NOT_PRESENT');
 if(mismatches.length)throw Error('MOBILE_BUTTON_SHARED_COMMAND_GATE_BLOCKED '+mismatches.join(','));
 status.textContent='原圖來源 SHA 已鎖定，'+proof.regionCount+
  ' 個區域已編碼；'+audited.length+
  ' 個 DOM Button ID 對應已查核。真機移動、完整 3D 機台模型和 Z 深度仍未驗證。';
 status.dataset.ok='true';
 root.dataset.sourceMapGate='PASS';
}catch(error){
 status.textContent='BLOCKED：3AX 逆向區域／Command ID 檢查未通過：'+
  String(error?.message||error)+'。原始 NC 數值工作頁仍可獨立使用。';
 root.dataset.sourceMapGate='BLOCKED';
 root.querySelectorAll('[data-3ax-camera],[data-3ax-rate],[data-3ax-layer]')
  .forEach(el=>{el.disabled=true;});
}
// Inform the user that no pixel-to-physical depth estimate was silently created.


let xyCalibration=null;
const calibStatus=document.getElementById('cad-calibration-status'),
 projection=document.getElementById('cad-plane-projection'),
 calibrate=document.getElementById('cad-plane-calibrate'),
 project=document.getElementById('cad-plane-project'),
 anchorsInput=document.getElementById('cad-plane-anchors');
function resetPlane(){
 xyCalibration=null;project.disabled=true;
 projection.textContent='校準資料已變更，舊的 CAD X/Y 投影無效；Z 深度仍未量測。';
}
anchorsInput.addEventListener('input',resetPlane);
calibrate.addEventListener('click',()=>{
 resetPlane();
 try{
  const anchors=JSON.parse(anchorsInput.value);
  const proven=buildAIG3AXCADPlaneCalibration(anchors);
  xyCalibration=proven;
  project.disabled=false;
  calibStatus.textContent='已建立同平面 X/Y 投影，使用 '+proven.calibrationAnchors+
   ' 個已量測對照點；平均重投影殘差 '+proven.rmsReprojectionMm.toFixed(3)+
   ' mm。注意：這不是獨立精度驗收，Z 未知，嚴禁轉為 CNC 刀路。';
  calibStatus.dataset.ok='true';
 }catch(error){
  calibStatus.dataset.ok='false';
  calibStatus.textContent='BLOCKED：CAD 圖像比例無法驗證：'+String(error.message||error)+
   '。原 NC 與 3D 數值工件保持不變。';
 }
});
project.addEventListener('click',()=>{
 if(!xyCalibration)return;
 try{
  const xInput=document.getElementById('cad-source-pixel-x'),
   yInput=document.getElementById('cad-source-pixel-y');
  if(xInput.value.trim()===''||yInput.value.trim()==='')
   throw Error('SOURCE_PIXEL_COORDINATES_REQUIRED');
  const pixel=[Number(xInput.value),Number(yInput.value)];
  const cad=projectAIG3AXPixelToCADXY(xyCalibration,pixel);
  const displayMm=n=>(Math.abs(n)<0.0005?0:n).toFixed(3);
  projection.textContent='同平面 CAD X='+displayMm(cad.xMm)+
   ' mm、Y='+displayMm(cad.yMm)+
   ' mm；Z=未知。僅幾何量測對照，沒有寫入 NC 或更改材料。';
 }catch(error){
  projection.textContent='BLOCKED：像素投影失敗：'+String(error.message||error);
 }
});
