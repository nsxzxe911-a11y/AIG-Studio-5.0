import { dispatchUiCommand, getUiState } from './runtime-adapter.js';
import { normalizeJogMultiplier, renderJogMultiplierControls } from './jog-multiplier.js';

const AXIS_PAGES=Object.freeze(['3AX','4AX','5AX','6AX']);
export function isAxisPage(pageId){return AXIS_PAGES.includes(pageId);}
export function applyMpgMultiplier(productId,value){
  const multiplier=normalizeJogMultiplier(value);
  const result=dispatchUiCommand(productId,'SETTINGS_SET',{key:'jogMultiplier',value:multiplier});
  return {...result,multiplier};
}
function productIdFor(stage){return stage?.closest?.('.product-pane')?.dataset?.product||'aig-ii';}
function refreshMpgStage(stage){
  const current=normalizeJogMultiplier(getUiState(productIdFor(stage),'settings.jogMultiplier'));
  stage.querySelectorAll?.('[data-jog-multiplier]').forEach(button=>button.classList?.toggle('active',Number(button.dataset?.jogMultiplier)===current));
  const readout=stage.querySelector?.('[data-mpg-readout]');
  if(readout)readout.textContent=`倍率 ×${current}`;
}
export function upgradeMpgStage(stage){
  if(!stage||!isAxisPage(stage.dataset?.runtimePage))return false;
  const controls=stage.querySelector?.('.axis-controls');
  if(!controls||controls.querySelector?.('[data-mpg-control]'))return false;
  controls.insertAdjacentHTML?.('afterbegin',renderJogMultiplierControls(getUiState(productIdFor(stage),'settings.jogMultiplier')));
  refreshMpgStage(stage);
  return true;
}
function scanNode(node){
  if(!node||node.nodeType!==1)return;
  if(node.matches?.('.runtime-stage'))upgradeMpgStage(node);
  node.querySelectorAll?.('.runtime-stage').forEach(upgradeMpgStage);
}
export function bootMpgAutobind(root=globalThis.document?.querySelector?.('#dual-runtime')){
  if(!root)return null;
  root.querySelectorAll?.('.runtime-stage').forEach(upgradeMpgStage);
  const Observer=globalThis.MutationObserver;
  const observer=Observer?new Observer(mutations=>{for(const mutation of mutations)mutation.addedNodes?.forEach(scanNode);}):null;
  observer?.observe(root,{childList:true,subtree:true});
  const onClick=event=>{
    const button=event.target?.closest?.('[data-jog-multiplier]');
    if(!button)return;
    const stage=button.closest?.('.runtime-stage');
    if(!stage)return;
    applyMpgMultiplier(productIdFor(stage),button.dataset.jogMultiplier);
    refreshMpgStage(stage);
  };
  root.addEventListener?.('click',onClick,false);
  return {disconnect(){observer?.disconnect();root.removeEventListener?.('click',onClick,false);}};
}
if(typeof document!=='undefined'){
  const start=()=>bootMpgAutobind(document.querySelector('#dual-runtime'));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
}
