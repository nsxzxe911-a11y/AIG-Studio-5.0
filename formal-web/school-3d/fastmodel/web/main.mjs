import {FastModelView} from './renderer.mjs';
import {WIRE_MODES,WIRE_DENSITIES} from './mesh-lines.mjs';
import {SURFACE_GUIDES} from './surface-guides.mjs';
import {decodeGLB,readAccessor} from './fastmodel-data.mjs';
import {SCAN_KINDS,scanGeometry,limitAngle,paintScaffold} from './scene-tools.mjs';
import {DiskPressureGuard} from './resource-governor.mjs';
import {RESOLUTION_PRESETS} from './resolution-policy.mjs';
import {GRAPHICS_POLICY,assertRasterOnly} from './graphics-policy.mjs';
assertRasterOnly(GRAPHICS_POLICY);
const el=id=>document.getElementById(id),overlay=el('overlay'),detail=el('detail');let view=null,buffer=null,paused=false,lastStats=null,scanFile=null,lastScan=null;
// RGB cockpit: tabs switch only REAL existing controls; no decorative/fake buttons.
const controls=[...document.querySelectorAll('[data-panel-target]')];
function selectPanel(name){
  for(const b of controls){const chosen=b.dataset.panelTarget===name;b.setAttribute('aria-selected',String(chosen));b.tabIndex=chosen?0:-1;}
  for(const section of document.querySelectorAll('[data-panel]'))section.hidden=(section.dataset.panel!==name);
}
for(const b of controls){
  b.addEventListener('click',()=>selectPanel(b.dataset.panelTarget));
  b.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    event.preventDefault();const at=controls.indexOf(b),next=event.key==='Home'?0:event.key==='End'?controls.length-1:(at+(event.key==='ArrowRight'?1:-1)+controls.length)%controls.length;
    selectPanel(controls[next].dataset.panelTarget);controls[next].focus();
  });
}
selectPanel('model');
document.getElementById('raytrace-status').textContent='光線追蹤：關閉（自研光柵渲染 · 無 RTX/DXR 要求）';
const quickStatus=el('quick-status');
function updateWireStatus(value){el('meshline-status').textContent=value;}
el('helper-grid').addEventListener('change',()=>{el('viewport-frame').classList.toggle('show-helper-grid',el('helper-grid').checked);});
function applyWireChoice(){
 if(!view){updateWireStatus('GPU 尚未啟動，設定將在載入模型後生效。');return;}
 try{const r=view.setWireMode(el('mesh-lines').value,el('mesh-density').value);updateWireStatus(r.mode==='off'?'線框關閉 · 預覽效能優先':`實際網格線 ${r.segments.toLocaleString()} 段 · 最多 ${r.drawCalls} 次額外繪圖呼叫`);}catch(e){updateWireStatus('線框未切換：'+e.message);} }
function setSurfaceChoice(){const mode=el('surface-guide').value;if(!SURFACE_GUIDES.includes(mode))return;const status=el('surface-status');try{const result=view?.setSurfaceGuide(mode);status.textContent=mode==='clean'?'純表面 · 不額外繪製網格線':mode==='edit-tint'?'實際局部修改頂點柔光 · 無額外 Draw Call':'表面材質對比 · 無額外 Draw Call';}catch(e){status.textContent='切換失敗：'+e.message;}}
el('surface-guide').addEventListener('change',setSurfaceChoice);
el('mesh-lines').addEventListener('change',applyWireChoice);el('mesh-density').addEventListener('change',applyWireChoice);

// FastModel 1.4: bounded CPU analysis and real UI-to-renderer raster controls.
const guideCanvas=el('guide-overlay');
function refreshScaffold(){
 const limit=Number(el('scaffold-limit').value);
 for(const id of ['yaw','pitch']){
   const slider=el('scaffold-'+id);
   slider.value=String(limitAngle(Number(slider.value),limit));
   el('scaffold-'+id+'-value').textContent=slider.value+'°';
 }
 el('scaffold-limit-value').textContent=limit+'°';
 const enabled=el('scaffold-enabled').checked;
 if(view?.bound)paintScaffold(guideCanvas,view,{enabled,limit,
     yaw:Number(el('scaffold-yaw').value),pitch:Number(el('scaffold-pitch').value)});
 else {const ctx=guideCanvas.getContext('2d');ctx?.clearRect(0,0,guideCanvas.width,guideCanvas.height);}
 el('scaffold-status').textContent=enabled
  ?(view?.bound?'虛線參考支架已連動視角；角度限制 ±'+limit+'°。不修改原模型／骨架。':'支架已開啟，載入 GLB 後才有實際定位。')
  :'虛線支架關閉 · 零支架繪圖負擔';
}
for(const id of ['scaffold-enabled','scaffold-limit','scaffold-yaw','scaffold-pitch']){
 el(id).addEventListener(id==='scaffold-enabled'?'change':'input',refreshScaffold);
}
function applyLightPreset(){
 const p=el('light-preset').value;
 try{view?.setLighting(p);el('light-status').textContent='光柵預覽：'+el('light-preset').selectedOptions[0].textContent+'（非光線追蹤／非真實天空水面生成）';}
 catch(e){el('light-status').textContent='光線預設未套用：'+e.message;}
}
el('light-preset').addEventListener('change',applyLightPreset);
el('scene-kind').addEventListener('change',()=>{
 const k=el('scene-kind').value;
 if(!SCAN_KINDS.includes(k))return;
 const recommended={person:'soft',animal:'daylight',plant:'daylight',tree:'daylight',water:'water',sky:'sky',environment:'dusk'};
 el('light-preset').value=recommended[k];applyLightPreset();
 el('scan-status').textContent='已選擇 '+el('scene-kind').selectedOptions[0].textContent+'。請按快速掃描以更新幾何數據（此分類是手動標籤）。';
});
el('scan-btn').addEventListener('click',()=>{
 const file=scanFile||view?.file;
 if(!file){el('scan-status').textContent='無可掃描的 GLB。請選擇本機 GLB 檔案。';return;}
 try{
   lastScan=scanGeometry(file,readAccessor,{kind:el('scene-kind').value,maxSamples:12000});
   const e=lastScan.sampledExtent.map(x=>x.toFixed(3)).join(' × ');
   el('scan-status').textContent='真實 GLB 頂點抽樣 PASS：'+lastScan.samples.toLocaleString()+
     '/'+lastScan.vertices.toLocaleString()+' 點，'+lastScan.triangles.toLocaleString()+
     ' 三角面、'+lastScan.primitives+' 個 primitive。'+'\n抽樣外包圍 '+e+
     '（GLB 單位／不含骨架動畫姿態）。\n分類為手動指定，未啟用 AI 語意辨識；非照片、LiDAR 或光照深度掃描。';
 }catch(e){lastScan=null;el('scan-status').textContent='掃描失敗：'+e.message+'。原模型保留。';}
});
refreshScaffold();
applyLightPreset();

function showResolutionResult(result=null){
 const item=RESOLUTION_PRESETS[el('resolution').value],label=item?.short||'自訂';
 const selected=el('resolution').value.split('x').map(Number);
 const actual=result?.actual||(view?[view.width,view.height]:null);
 const same=actual&&actual[0]===selected[0]&&actual[1]===selected[1];
 el('resolution-tag').textContent=label+' · 60 FPS 目標';
 el('resolution-status').textContent=!view?'已選 '+label+'；此裝置未建立 WebGL2 GPU，不能驗收解析度。':
    result?.ok===false?'GPU／記憶體保護：'+result.reason+'；保留 '+actual.join('×')+' 原畫面及編輯資料。':
    (same?'已切換到 ':'指定 '+label+'；實際為 ')+(actual?.join('×')||'未量測')+(same?'；FPS 待實測。':'（自動降階保護中）。');
}


let lastUI=0;
const diskGuard=new DiskPressureGuard();let diskInfo={reason:'尚未取得瀏覽器儲存空間資訊',measured:false};
async function updateDisk(){
 try{if(navigator.storage?.estimate){const r=await navigator.storage.estimate();const test=diskGuard.preflight({quotaBytes:r.quota,usageBytes:r.usage,plannedWriteBytes:32*1024});diskInfo={...test,measured:true};}
 else diskInfo={reason:'STORAGE_API_UNAVAILABLE',measured:false};}
 catch(err){diskInfo={reason:'STORAGE_QUERY_FAILED',measured:false};}
 el('disk').textContent=diskInfo.allowed?'儲存配額正常（非實體硬碟容量）':('配額未確認／不足：'+diskInfo.reason);
}
updateDisk();
try{view=new FastModelView(el('view'),stats=>{lastStats=stats;let now=performance.now();if(now-lastUI<300&&stats.status==='running')return;lastUI=now;
 el('fps').textContent=stats.fps??'—';quickStatus.textContent=stats.status==='running'?(stats.fps!=null?stats.fps+' FPS':'GPU 預覽中'):'本機待機';
 if(stats.status==='RENDER_ACTION_BLOCKED'||stats.status==='GPU_CONTEXT_LOST'){quickStatus.textContent='渲染已隔離';overlay.textContent=stats.message||'渲染已隔離，請重新載入';return;}
 if(stats.stability){el('stability').textContent=stats.stability==='normal'?'穩定／一般':stats.stability==='pressure'?'記憶體壓力：已清理可重建快取':stats.stability==='critical'?'記憶體偏高：正在降階':'監測中／恢復中';}
 if(stats.frameBudget){el('balance').textContent='CPU 提交 '+stats.frameBudget.cpuSubmitMs.toFixed(2)+'ms／預算 3ms · GPU 時間 '+(stats.frameBudget.gpuMeasured?stats.frameBudget.gpuMs.toFixed(2)+'ms':'未量測')+' · 推估 GPU '+(stats.gpuEstimateMiB||0)+'MiB';}el('p95').textContent=stats.p95FrameMs??'—';el('draw').textContent=stats.drawCalls??'—';el('cpu').textContent=stats.jsSubmitMs??'—';let res=stats.resolution?.join('×')||'1920×1080';if(stats.resolution)showResolutionResult({ok:true,actual:stats.resolution});if(stats.wireMode)el('meshline-status').textContent=stats.wireMode==='off'?'線框關閉 · 效能優先':(stats.wireSkippedForLag?'掉幀保護：暫時隱藏網格線（模式設定保留）':`網格線 ${stats.wireLines||0} 段 · ${stats.wireMode} · ${stats.wireDensity}`);detail.textContent=`${stats.vertices?.toLocaleString()||0} 頂點 / ${stats.triangles?.toLocaleString()||0} 三角面\n${stats.sourcePrimitives} 原始 primitives → ${stats.drawCalls} draw calls\n尺寸 ${res} / 讀檔建置 ${stats.loadMs}ms\n${stats.skipped} 低層細髮略過（preview mode）`;
 overlay.textContent=`${res}  |  ${stats.fps??'量測中'} FPS\nGPU ${stats.gpu||'unknown'}\n僅技術候選，不可上正式首頁`;
 });view.onGuideFrame=refreshScaffold;view.autoQuality=el('auto').checked;view.setWireMode(el('mesh-lines').value,el('mesh-density').value);setSurfaceChoice();applyLightPreset();showResolutionResult({ok:true,actual:[view.width,view.height]});}catch(err){overlay.textContent='裝置不支援 WebGL2 預覽：'+err.message;quickStatus.textContent='GPU 不可用 · CPU 可掃描 GLB';showResolutionResult();}
async function importGLB(ab){if(!view){try{const f=decodeGLB(ab);scanFile=f;buffer=ab;lastScan=null;el('scan-status').textContent='GLB 已讀取（CPU 模式）；可執行幾何快速掃描，但此裝置不能 GPU 預覽。';}catch(e){el('scan-status').textContent='GLB 解析失敗：'+e.message;}return;}const beforeRunning=view.running,hadScene=!!view.file;el('demo').disabled=true;el('file').disabled=true;overlay.textContent='正在解析 GLB 和批次網格，請稍候…';try{view.stop();view.frames=[];view.last=0;await view.load(ab,el('quality').value);applyWireChoice();setSurfaceChoice();buffer=ab;scanFile=view.file;lastScan=null;el('scan-status').textContent='GLB 已載入，按「快速抽樣掃描 GLB」讀取幾何資料。';refreshScaffold();showResolutionResult({ok:true,actual:[view.width,view.height]});view.start();el('pause').disabled=false;paused=false;el('pause').textContent='暫停';}catch(e){overlay.textContent='GLB 載入失敗：'+e.message;if(hadScene&&view.entries.length&&beforeRunning)view.start();console.error(e);}finally{el('demo').disabled=false;el('file').disabled=false;}}
el('file').addEventListener('change',async()=>{const f=el('file').files?.[0];if(f)await importGLB(await f.arrayBuffer());});
el('demo').addEventListener('click',async()=>{try{let r=await fetch('../assets/phase17-visual-NOT-APPROVED.glb');if(!r.ok)throw Error('工程包內的 GLB 需要以 HTTP 開啟，或使用上方檔案選擇器');await importGLB(await r.arrayBuffer());}catch(e){overlay.textContent=e.message+'；請改選擇本機 GLB。';}});
el('pause').addEventListener('click',()=>{if(!view?.file)return;paused=!paused;if(paused)view.stop();else view.start();el('pause').textContent=paused?'繼續':'暫停';});
el('quality').addEventListener('change',async()=>{if(buffer)await importGLB(buffer);});
el('resolution').addEventListener('change',()=>{if(!view){showResolutionResult();return;}const selected=RESOLUTION_PRESETS[el('resolution').value];if(!selected){showResolutionResult({ok:false,reason:'UNKNOWN_PRESET',actual:[view.width,view.height]});return;}const result=view.resize(selected.width,selected.height);showResolutionResult(result);});
el('auto').addEventListener('change',()=>{if(view){view.autoQuality=el('auto').checked;view.setWireMode(el('mesh-lines').value,el('mesh-density').value);setSurfaceChoice();showResolutionResult({ok:true,actual:[view.width,view.height]});}});
el('wave').addEventListener('change',()=>{if(view)view.wind=el('wave').checked;});
el('reclaim').addEventListener('click',()=>{if(!view?.file)return;const r=view.releaseOptionalHair();el('reclaimstat').textContent=r.releasedHairBatches+' 組髮片請求釋放、'+(r.requestedGpuReleaseBytes/1048576).toFixed(2)+' MiB GPU 緩衝區，原始 GLB 與網格修改不動。';});
el('zoom').addEventListener('input',()=>{if(view)view.zoomFactor=Number(el('zoom').value)/100;});
el('patch').addEventListener('input',()=>{if(!view?.file)return;let stat=view.patchLocal(Number(el('patch').value)/100);if(stat)el('patchstat').textContent=stat.patchedVertices+' 頂點 / '+stat.bytes+' bytes GPU 區段更新 · CPU提交 '+stat.hostSubmitMs+' ms';});
el('turnl').addEventListener('click',()=>{if(view)view.angle=Math.max(-1.2,view.angle-.15);});el('turnr').addEventListener('click',()=>{if(view)view.angle=Math.min(1.2,view.angle+.15);});el('reset').addEventListener('click',()=>{if(view){view.angle=0;view.zoomFactor=1;el('zoom').value='100';}});
let pointerX=null;const c=el('view');c.addEventListener('pointerdown',e=>{pointerX=e.clientX;c.setPointerCapture?.(e.pointerId);});c.addEventListener('pointermove',e=>{if(pointerX===null||!view)return;view.angle=Math.max(-1.2,Math.min(1.2,view.angle+(e.clientX-pointerX)*.006));pointerX=e.clientX;});c.addEventListener('pointerup',()=>pointerX=null);c.addEventListener('pointercancel',()=>pointerX=null);
c.addEventListener('wheel',e=>{if(!view)return;e.preventDefault();view.zoomFactor=Math.max(.6,Math.min(1.6,view.zoomFactor-e.deltaY*.001));el('zoom').value=String(view.zoomFactor*100);},{passive:false});
el('export').addEventListener('click',async()=>{if(!lastStats)return;await updateDisk();let out={schema:'AIG_FastModel_1080p60_Preview_1',source:'WEBGL2_BROWSER_ONLY',date:new Date().toISOString(),userAgent:navigator.userAgent,webglGpu:view.gpu,visualAuthority:'NOT_APPROVED',nativeDX12Tested:false,nativeVulkanTested:false,renderPolicy:GRAPHICS_POLICY,...lastStats,localMeshEdit:view.patchStats,surfaceInspection:{mode:view.surfaceGuide,additionalDrawCalls:0,additionalLineBuffers:0},geometryScan:lastScan,scanKind:el('scene-kind').value,rasterLightPreset:view.lightPreset,referenceScaffold:{enabled:el('scaffold-enabled').checked,yaw:Number(el('scaffold-yaw').value),pitch:Number(el('scaffold-pitch').value),limit:Number(el('scaffold-limit').value),referenceOnly:true},meshLineDisplay:{mode:view.wireMode,density:view.wireDensity,segments:view.wireStats.segments,autoSuppressed:view.wireState.suppressed},resourcePolicy:{...lastStats.memoryPressure,gpuUsagePercentReliable:false},diskEstimate:diskInfo,warning:'browser storage quota is not entire device disk or storage write throughput'};const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(out,null,2)],{type:'application/json'}));a.download='AIG-FastModel-device-benchmark.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),3000);});