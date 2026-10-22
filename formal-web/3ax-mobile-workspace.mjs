/**
 * AIG-II Mobile 3AX: validate visual pixel-region/command contract against
 * independently pinned source SHA. This is DOM control verification, not a
 * camera/physical machine geometry assertion.
 */
import {validateAIG3AXMobileMap} from './3ax-mobile-reverse-core.mjs';
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
