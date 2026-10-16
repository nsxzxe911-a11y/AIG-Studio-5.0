import { dispatchUiCommand, getUiState } from './runtime-adapter.js';
import { createPageModel } from './editor/editor-model.js';
import { createEditorStore, makeStoreKey } from './editor/editor-store.js';
import { mountVisualEditor, mountDefinitionEditor, renderElementOverlay } from './editor/editor-view.js';
import { listCommands } from './editor/command-registry.js';
import * as pagePackApi from './editor/page-pack.js';

const DEFAULT_CATALOG=Object.freeze({
  'aig-ii':Object.freeze({name:'AIG-II',pages:Object.freeze(['STARTUP','LOGIN','HOME','CAD','CAM','SIM','3AX','4AX','5AX','6AX','NC','AI','SETTINGS'])}),
  'aig':Object.freeze({name:'AIG / Studio 5.0',pages:Object.freeze(['STARTUP','LOGIN','HOME','CAD','CAM','SIM','3AX','4AX','5AX','6AX','NC','AI','SETTINGS'])})
});
const selected=new Map([['aig-ii','HOME'],['aig','HOME']]);
const editorStore=createEditorStore();
const editorModels=new Map();
let catalog=DEFAULT_CATALOG;

function escapeHtml(value=''){return String(value).replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));}
function deviceClass(){return typeof matchMedia==='function'&&matchMedia('(max-width: 900px)').matches?'mobile':'desktop';}
function keyFor(productId,pageId,device=deviceClass()){return makeStoreKey(productId,pageId,device);}
function editingModel(productId,pageId,device=deviceClass()){
  const key=keyFor(productId,pageId,device);
  if(editorModels.has(key))return editorModels.get(key);
  let model=editorStore.loadDraft(key);
  if(!model){const current=editorStore.getCurrentApproved(key);model=current?structuredClone(current):createPageModel(productId,pageId,device);model.status='DRAFT';}
  editorModels.set(key,model);return model;
}
function approvedModel(productId,pageId,device=deviceClass()){return editorStore.getCurrentApproved(keyFor(productId,pageId,device));}

export function configureProductPages(data){const next={};for(const productId of ['aig-ii','aig']){const source=data?.[productId];if(!source||!Array.isArray(source.pages))throw new Error(`INVALID_PRODUCT_CATALOG:${productId}`);next[productId]={name:source.name||productId,pages:[...source.pages]};}catalog=next;}
export function getProductPages(productId){const product=catalog[productId];if(!product)throw new Error(`UNKNOWN_PRODUCT:${productId}`);return [...product.pages];}
export function getSelectedPage(productId){if(!catalog[productId])throw new Error(`UNKNOWN_PRODUCT:${productId}`);return selected.get(productId)||'HOME';}
export function selectPage(productId,pageId){const pages=getProductPages(productId);if(!pages.includes(pageId))throw new Error(`UNSUPPORTED_PAGE:${productId}:${pageId}`);selected.set(productId,pageId);return pageId;}
export function resetRuntimeSelection(){selected.set('aig-ii','HOME');selected.set('aig','HOME');}
export function resolveAuthorityStatus(asset){return asset?.src?'READY':'PENDING_ASSET';}
function pageLabel(pageId){return pageId==='SETTINGS'?'設定':pageId;}

function pageControls(productId,pageId){
  const conn=getUiState(productId,'ui.connection');
  if(pageId==='CAD')return `<div class="runtime-control-grid"><button data-command="CAD_EDITOR_OPEN">開啟 CAD 編輯</button><button data-command="CONNECT">連接 CAM</button><button data-command="DISCONNECT">獨立作業</button><span class="state-readout" data-state="ui.connection">${escapeHtml(conn)}</span></div>`;
  if(pageId==='CAM')return `<div class="runtime-control-grid"><button data-command="CAM_EDITOR_OPEN">開啟 CAM 編輯</button><button data-command="CONNECT">連接 SIM</button><button data-command="DISCONNECT">獨立作業</button><span class="state-readout" data-state="ui.connection">${escapeHtml(conn)}</span></div>`;
  if(pageId==='SIM')return `<div class="runtime-control-grid"><button data-command="SIM_PLAY">播放</button><button data-command="SIM_PAUSE">暫停</button><button data-command="SIM_STOP">停止</button><span class="state-readout" data-state="sim.playback">${escapeHtml(getUiState(productId,'sim.playback'))}</span></div>`;
  if(['3AX','4AX','5AX','6AX'].includes(pageId)){const axes=pageId==='3AX'?['X','Y','Z']:pageId==='4AX'?['X','Y','Z','A']:pageId==='5AX'?['X','Y','Z','A','B']:['X','Y','Z','A','B','C'];return `<div class="axis-controls">${axes.map(axis=>`<div class="axis-row"><b>${axis}</b><button data-command="JOG_${axis}_MINUS">${axis}-</button><span data-state="axis.${axis.toLowerCase()}">${Number(getUiState(productId,`axis.${axis.toLowerCase()}`)).toFixed(3)}</span><button data-command="JOG_${axis}_PLUS">${axis}+</button></div>`).join('')}</div>`;}
  if(pageId==='NC')return `<div class="nc-editor-wrap"><textarea class="nc-editor" data-nc-editor spellcheck="false">${escapeHtml(getUiState(productId,'nc.text'))}</textarea><div class="runtime-control-grid"><button data-command="NC_VALIDATE">驗證 NC</button><span class="state-readout">未接 Native Core 的驗證會顯示 PENDING，不送機。</span></div></div>`;
  if(pageId==='SETTINGS')return `<div class="settings-editor"><label>FPS<input data-setting="fps" type="number" min="30" max="120" step="30" value="${Number(getUiState(productId,'settings.fps'))}"></label><label>精度<input value="${escapeHtml(getUiState(productId,'settings.precision'))}" readonly></label></div>`;
  return `<div class="runtime-control-grid"><button data-command="CONNECT">連接</button><button data-command="DISCONNECT">斷開／獨立</button><span class="state-readout" data-state="ui.connection">${escapeHtml(conn)}</span></div>`;
}
function authoritySurface(productId,pageId){
  const model=approvedModel(productId,pageId);
  if(!model?.authorityAsset?.src)return `<div class="authority-surface pending-surface"><div class="pending-copy">此頁 Authority 圖尚未核准到目前 Web Runtime。<br>正式 Runtime 保留，不切換工程殼。</div></div>`;
  return `<div class="authority-surface approved-surface"><img class="runtime-authority-image" src="${escapeHtml(model.authorityAsset.src)}" alt="${escapeHtml(`${productId} ${pageId} Authority`)}"><div class="runtime-overlay-layer">${(model.elements||[]).map(renderElementOverlay).join('')}</div></div>`;
}
function renderPageBody(productId,pageId){const model=approvedModel(productId,pageId);const state=resolveAuthorityStatus(model?.authorityAsset);const safeTitle=`${catalog[productId].name} · ${pageLabel(pageId)}`;return `<section class="runtime-stage" data-runtime-page="${escapeHtml(pageId)}"><div class="runtime-stage-head"><div><span class="eyebrow">正式 Runtime</span><h2>${escapeHtml(safeTitle)}</h2></div><span class="status-chip ${state==='READY'?'ready':'pending'}" data-runtime-status>${state}</span></div>${authoritySurface(productId,pageId)}${pageControls(productId,pageId)}<div class="runtime-actions"><button type="button" data-action="open-editor">視覺介面編輯器</button><button type="button" data-action="open-review">Authority 檢視</button></div></section>`;}
function bindRuntimeControls(root,productId){const statusNode=root.querySelector('[data-runtime-status]');const refresh=()=>root.querySelectorAll('[data-state]').forEach(node=>{const value=getUiState(productId,node.dataset.state);node.textContent=typeof value==='number'?value.toFixed(3):String(value??'');});root.querySelectorAll('[data-command]').forEach(button=>button.addEventListener('click',()=>{const result=dispatchUiCommand(productId,button.dataset.command,{step:.001});statusNode.textContent=result.status;statusNode.classList.toggle('pending',!result.ok);statusNode.classList.toggle('ready',result.ok);refresh();}));root.querySelector('[data-nc-editor]')?.addEventListener('input',event=>{const result=dispatchUiCommand(productId,'NC_EDIT',{text:event.target.value});statusNode.textContent=result.status;});root.querySelectorAll('[data-setting]').forEach(input=>input.addEventListener('change',()=>{const value=input.type==='number'?Number(input.value):input.value;const result=dispatchUiCommand(productId,'SETTINGS_SET',{key:input.dataset.setting,value});statusNode.textContent=result.status;refresh();}));refresh();}
function openEditor(pane,productId,pageId,redrawRuntime){
  const host=pane.querySelector('.maintenance-host');host.hidden=false;const device=deviceClass(),key=keyFor(productId,pageId,device);let model=editingModel(productId,pageId,device);host.innerHTML=`<section class="maintenance-panel"><header><div><span class="eyebrow">設定 → 維護</span><h2>視覺介面編輯器 · ${escapeHtml(pageLabel(pageId))}</h2></div><button data-editor-close>關閉</button></header><div class="editor-host"></div><div class="definition-host"></div></section>`;host.querySelector('[data-editor-close]').addEventListener('click',()=>{host.hidden=true;host.replaceChildren();});const commands=listCommands(productId);const mountAll=()=>{mountVisualEditor(host.querySelector('.editor-host'),model,{store:editorStore,storeKey:key,commandOptions:commands,packApi:pagePackApi,onChange:updated=>{model=updated;editorModels.set(key,updated);},onApproved:approved=>{editorModels.delete(key);model=editingModel(productId,pageId,device);redrawRuntime();},onImported:imported=>{model=imported;editorModels.set(key,imported);mountAll();}});mountDefinitionEditor(host.querySelector('.definition-host'),model,{commandOptions:commands,onChange:updated=>{model=updated;editorModels.set(key,updated);}});};mountAll();
}
export function renderProductPane(productId,doc=globalThis.document){if(!doc)return {productId,selectedPage:getSelectedPage(productId),pages:getProductPages(productId)};const pane=doc.createElement('section');pane.className='product-pane';pane.dataset.product=productId;const pages=getProductPages(productId);pane.innerHTML=`<header class="product-head"><div><span class="eyebrow">AIG 正式網頁</span><h1>${escapeHtml(catalog[productId].name)}</h1></div><span class="status-chip ready">LOCAL-FIRST</span></header><nav class="product-tabs" aria-label="${escapeHtml(catalog[productId].name)} 頁面">${pages.map(p=>`<button type="button" data-page="${escapeHtml(p)}" class="page-tab">${escapeHtml(pageLabel(p))}</button>`).join('')}</nav><div class="product-runtime"></div><div class="maintenance-host" hidden></div>`;const runtime=pane.querySelector('.product-runtime');const draw=()=>{const current=getSelectedPage(productId);runtime.innerHTML=renderPageBody(productId,current);bindRuntimeControls(runtime,productId);pane.querySelectorAll('.page-tab').forEach(button=>button.classList.toggle('active',button.dataset.page===current));runtime.querySelector('[data-action="open-review"]')?.addEventListener('click',()=>{globalThis.location.href='./review/';});runtime.querySelector('[data-action="open-editor"]')?.addEventListener('click',()=>openEditor(pane,productId,current,draw));};pane.querySelectorAll('.page-tab').forEach(button=>button.addEventListener('click',()=>{selectPage(productId,button.dataset.page);pane.querySelector('.maintenance-host').hidden=true;draw();}));draw();return pane;}
export function bootRuntimeShell(doc=globalThis.document){if(!doc)return;const root=doc.querySelector('#dual-runtime');if(!root)throw new Error('MISSING_DUAL_RUNTIME_ROOT');root.replaceChildren(renderProductPane('aig-ii',doc),renderProductPane('aig',doc));}
if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',()=>bootRuntimeShell(document),{once:true});
