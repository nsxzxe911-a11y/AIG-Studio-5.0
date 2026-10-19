/* AIG V66 — on-demand 6AX articulated WebGL modules.
 * Original V65 CNC engine / NC editor remain available immediately.
 * Defers optional V66 source code until user actually opens 6AX.
 * No new CNC actions, no resets, no G-code writes. */
(function(w,d){"use strict";
 const ASSETS=Object.freeze([
  "./runtime/6ax-mechanism-core-v1.js",
  "./runtime/6ax-mechanism-preview-v1.js",
  "./runtime/6ax-nc-readonly-v2.js",
  "./runtime/6ax-nc-bridge-v2.js"
 ]);
 let state="IDLE",promise=null,started=0,ended=0,lastError="",attempts=0,queued=false;
 const t=()=>w.performance?.now?.()||Date.now();
 const active=()=>!!d.querySelector('.app>.shell>.screen.active[data-page="6AX"]');
 function report(){
  const root=d.documentElement;if(root)root.dataset.aig66Loader=state;
  w.dispatchEvent(new CustomEvent("aig66:6ax-load",{detail:{state,error:lastError}}));
 }
 function failureUi(){
  const host=d.querySelector('.app>.shell>.screen[data-page="6AX"] .simgrid[data-runtime="6AX"] .sceneWrap');
  if(!host||host.querySelector("[data-aig66-retry]"))return;
  const button=d.createElement("button");button.type="button";button.className="aig66-6ax-retry";
  button.dataset.aig66Retry="true";button.textContent="六軸機構未載入 · 重試";
  button.setAttribute("aria-label","重新載入六軸機構預覽，原本的 NC 模擬仍可繼續使用");
  button.addEventListener("click",()=>{button.remove();load(true)});
  host.append(button);
 }
 function loadOne(src){return new Promise((resolve,reject)=>{
  const script=d.createElement("script");script.src=src;script.async=false;
  script.onload=()=>resolve();script.onerror=()=>reject(Error("OPTIONAL_ASSET_FAILED:"+src));
  d.body.appendChild(script);
 })}
 function load(force=false){
  if(state==="READY")return Promise.resolve(true);
  if(promise)return promise;
  if(!force&&!active())return Promise.resolve(false);
  if(attempts>=3&&!force)return Promise.resolve(false);
  state="LOADING";lastError="";started=t();attempts++;report();
  // Only start from an all-uninitialized module set to avoid reinitializing an
  // existing original simulator if a partial network failure occurs.
  let ready=ASSETS.filter((_,i)=>[
   !!w.AIG_6AX_MECHANISM_CORE_V1,
   !!w.AIG_6AX_MECHANISM_PREVIEW_V1,
   !!w.AIG_6AX_NC_READONLY_V2,
   !!w.AIG_6AX_NC_BRIDGE_V2
  ][i]).length;
  promise=(async()=>{
   for(let i=ready;i<ASSETS.length;i++)await loadOne(ASSETS[i]);
   if(!w.AIG_6AX_NC_BRIDGE_V2||!w.AIG_6AX_MECHANISM_PREVIEW_V1)
    throw Error("V66_MODULE_INITIALIZATION_FAILED");
   ended=t();state="READY";report();return true;
  })().catch(err=>{ended=t();lastError=String(err?.message||err);state="FAILED";report();failureUi();return false}).finally(()=>{promise=null});
  return promise;
 }
 function schedule(){
  if(queued)return;queued=true;
  w.requestAnimationFrame(()=>{queued=false;if(active())load()});
 }
 function boot(){
  const host=d.querySelector(".app>.shell");
  if(host)new MutationObserver(schedule).observe(host,{subtree:true,attributes:true,attributeFilter:["class","data-page"]});
  d.addEventListener("click",schedule,{passive:true});
  w.addEventListener("hashchange",schedule);
  schedule();
 }
 if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
 w.AIG_6AX_V66_LOADER=Object.freeze({load,inspect:()=>Object.freeze({
  state,attempts,assets:ASSETS.slice(),elapsedMs:Math.max(0,ended-started),
  lastError,originalV65Unaffected:!!w.AIG_6AX_V65,
  machineOutput:"BLOCKED"
 })});
})(window,document);
