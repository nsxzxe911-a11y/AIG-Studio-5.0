import {FastModelView} from './renderer.mjs';
import {WIRE_MODES,WIRE_DENSITIES} from './mesh-lines.mjs';
import {SURFACE_GUIDES} from './surface-guides.mjs';
import {decodeGLB,readAccessor,sampleVec3Accessor} from './fastmodel-data.mjs';
import {SCAN_KINDS,scanGeometry,limitAngle,paintScaffold} from './scene-tools.mjs';
import {auditAnatomyMetadata} from './anatomy-guard.mjs';
import {inspectHeadNeckGeometry,inspectHairNeckOcclusion,assessAnimationDeviceEvidence} from './character-integrity.mjs';
import {createHeadNeckBridgeCandidate} from './seam-bridge.mjs';
import {inspectAnimatedIntegrity} from './animated-integrity.mjs';
import {SCAN_MODES,SCAN_DENSITIES,buildScanOverlay,paintScanOverlay} from './scan-overlay.mjs';
import {faceShapeSignature,CharacterFaceRoster} from './character-face.mjs';
import {measuredFrameSummary} from './adaptive-detail.mjs';
import {DiskPressureGuard} from './resource-governor.mjs';
import {RESOLUTION_PRESETS} from './resolution-policy.mjs';
import {GRAPHICS_POLICY,assertRasterOnly} from './graphics-policy.mjs';
assertRasterOnly(GRAPHICS_POLICY);
const el=id=>document.getElementById(id),overlay=el('overlay'),detail=el('detail');let view=null,buffer=null,paused=false,lastStats=null,scanFile=null,lastScan=null,scanTopology=null,scanOverlayLast=0;
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
 if(el('scan-mode')?.value!=='off'){
   view.setWireMode('off','balanced');
   updateWireStatus('快速掃描已接管線條：原密集網格線關閉；選擇關閉掃描後恢復你原有的線框設定。');return;
 }
 try{const r=view.setWireMode(el('mesh-lines').value,el('mesh-density').value);updateWireStatus(r.mode==='off'?'線框關閉 · 預覽效能優先':`實際網格線 ${r.segments.toLocaleString()} 段 · 最多 ${r.drawCalls} 次額外繪圖呼叫`);}catch(e){updateWireStatus('線框未切換：'+e.message);} }
function setSurfaceChoice(){const mode=el('surface-guide').value;if(!SURFACE_GUIDES.includes(mode))return;const status=el('surface-status');try{const result=view?.setSurfaceGuide(mode);status.textContent=mode==='clean'?'純表面 · 不額外繪製網格線':mode==='edit-tint'?'實際局部修改頂點柔光 · 無額外 Draw Call':'表面材質對比 · 無額外 Draw Call';}catch(e){status.textContent='切換失敗：'+e.message;}}
el('surface-guide').addEventListener('change',setSurfaceChoice);
el('mesh-lines').addEventListener('change',applyWireChoice);el('mesh-density').addEventListener('change',applyWireChoice);

// FastModel 2.1 scan display: real joint parent edges = solid; source mesh
// boundary/projected silhouette = faint dashed (NOT actual depth-tested occlusion).
const scanCanvas=el('scan-overlay');
function clearScanOverlay(){
 const ctx=scanCanvas.getContext('2d');ctx?.clearRect(0,0,scanCanvas.width,scanCanvas.height);
}
function applyScanMode(){
 const mode=el('scan-mode').value,density=el('scan-density').value;
 const status=el('scan-layer-status');
 if(!SCAN_MODES.includes(mode)||!SCAN_DENSITIES.includes(density)){
   status.textContent='掃描層設定無效，保留原模型。';return;
 }
 if(mode==='off'){
   scanTopology=null;scanOverlayLast=0;clearScanOverlay();
   if(view){view.onScanFrame=null;view.scanOverlayTelemetry=null;applyWireChoice();}
   status.textContent='掃描覆蓋層關閉；保留原表面與你的線框設定。';return;
 }
 const f=view?.file||scanFile;
 if(!f){status.textContent='請先載入有真實 bones/skin 的 GLB；掃描層不會假造骨架。';return;}
 try{
   scanTopology=buildScanOverlay(f,readAccessor,{density});
   if(!view){
     status.textContent='已有 GLB，但無 WebGL2 畫面；骨架及虛線不能冒充即時 GPU 預覽。';return;
   }
   // Scan lines are distinct from full triangular wire mode; no duplicate mesh grid.
   view.setWireMode('off','balanced');
   if(scanTopology.status.startsWith('BLOCKED')){
     view.onScanFrame=null;clearScanOverlay();
     status.textContent='掃描層 BLOCKED：'+scanTopology.status+'；需有真實骨架關係和有效網格來源。';return;
   }
   scanOverlayLast=0;
   view.onScanFrame=(world,ts)=>{
     if(ts-scanOverlayLast<50)return view.scanOverlayTelemetry;
     scanOverlayLast=ts;
     const result=paintScanOverlay(scanCanvas,view,scanTopology,world,{mode:el('scan-mode').value,density:el('scan-density').value});
     if(result.status==='SCAN_DISPLAY_BLOCKED')status.textContent=result.reason;
     else if(ts%350<60)status.textContent='骨架實線 '+result.bonesDrawn+' 段 · 外型低亮虛線 '+result.dashedSegments+
       ' 段 · '+(scanTopology.omitted||0)+' 個來源批次超出預算/不相容；無滿版三角線／無深度遮擋保證。';
     return result;
   };
   status.textContent='掃描層啟用：'+mode+'；真實骨段 '+scanTopology.bones.length+
    ' 條、可選來源輪廓 '+scanTopology.surfaces.length+' 批。隨動畫姿態更新，純顯示層。';
 }catch(e){
   scanTopology=null;if(view)view.onScanFrame=null;clearScanOverlay();
   status.textContent='掃描層 BLOCKED：'+e.message+'；來源 GLB 不變。';
 }
}
el('scan-mode').addEventListener('change',applyScanMode);
el('scan-density').addEventListener('change',applyScanMode);
// FastModel 1.4: bounded CPU analysis and real UI-to-renderer raster controls.
const faceRoster=new CharacterFaceRoster();
function compareLoadedFace(replace=false){
 const file=scanFile||view?.file, id=el('character-id').value.trim(),role=el('character-role').value;
 if(!file){el('face-status').textContent='請先載入含 face 標記的 GLB。';return;}
 try{
   const signature=faceShapeSignature(file,sampleVec3Accessor,{characterId:id});
   const result=faceRoster.add({id,role,signature,replace});
   const duplicates=result.warnings.filter(x=>x.level==='EXACT_DESCRIPTOR_DUPLICATE');
   const similar=result.warnings.filter(x=>x.level!=='EXACT_DESCRIPTOR_DUPLICATE');
   const msg='角色 '+result.id+' '+(replace?'重新掃描':'登錄')+'成功；女主角 '+(result.leadId||'尚未建立')+'，已比較 '+result.compared+' 名。';
   el('face-status').textContent=duplicates.length?msg+' 完全相同的臉型特徵：'+duplicates.map(x=>x.id).join('、')+'；可能複製臉型，需人工修改。'
     :similar.length?msg+' 相似提醒：'+similar.map(x=>x.id+'（'+x.score+'）').join('、')+'；建議查看正、側面與表情。'
     :msg+' 尚無相似提醒（不保證完全不撞臉）；非真人身分辨識。';
 }catch(err){el('face-status').textContent='比對失敗：'+err.message+'。原模型與既有角色資料保留。';}
}
el('face-compare').addEventListener('click',()=>compareLoadedFace(false));
el('face-rescan').addEventListener('click',()=>compareLoadedFace(true));
el('face-clear').addEventListener('click',()=>{
 faceRoster.clear();
 el('face-status').textContent='本次角色對照已清空；不影響來源 GLB 與編輯資料。';
});
const guideCanvas=el('guide-overlay');
function paintCurrentScaffold(){
 if(!el('scaffold-enabled').checked||!view?.bound)return;
 paintScaffold(guideCanvas,view,{enabled:el('scaffold-enabled').checked,
  limit:Number(el('scaffold-limit').value),yaw:Number(el('scaffold-yaw').value),
  pitch:Number(el('scaffold-pitch').value)});
}
function refreshScaffold(){
 const limit=Number(el('scaffold-limit').value);
 for(const id of ['yaw','pitch']){
   const slider=el('scaffold-'+id);
   slider.value=String(limitAngle(Number(slider.value),limit));
   el('scaffold-'+id+'-value').textContent=slider.value+'°';
 }
 el('scaffold-limit-value').textContent=limit+'°';
 const enabled=el('scaffold-enabled').checked;
 if(enabled&&view?.bound)paintCurrentScaffold();
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
el('anatomy-check').addEventListener('click',()=>{
 const f=view?.file||scanFile;
 if(!f){el('anatomy-status').textContent='請先載入 GLB，才可稽核頭頸標記。';return;}
 try{
   const r=auditAnatomyMetadata(f);
   el('anatomy-status').textContent=r.status==='HEAD_NECK_METADATA_FOUND_CONTINUITY_NOT_PROVEN'
    ?'已找到明確頭／頸標記；保護 '+r.protectedMaterials.size+' 種關聯材質，不參與可選細節隱藏。實際幾何縫合仍未驗證。'
    :'沒有完整頭／頸語意標記；保留全部未分類主體批次，不假稱頭頸連續。請以模型旋轉、正側面和動畫實圖進一步驗收。';
 }catch(e){el('anatomy-status').textContent='頭頸稽核失敗：'+e.message+'；模型不變。';}
});
// FastModel 1.8: manual on-demand geometry QA; no automatic mesh edits.
let latestSeam=null,latestHair=null,lastAnimatedAudit=null;
el('bridge-candidate').addEventListener('click',()=>{
 if(!(buffer instanceof ArrayBuffer)){el('bridge-status').textContent='未載入 GLB，無法建立候選橋接。';return;}
 try{
   const result=createHeadNeckBridgeCandidate(buffer);
   const blob=new Blob([result.buffer],{type:'model/gltf-binary'});
   const url=URL.createObjectURL(blob),link=document.createElement('a');
   link.href=url;link.download='AIG-FastModel-HEAD-NECK-VISUAL-BRIDGE-CANDIDATE-NOT-APPROVED.glb';
   link.click();setTimeout(()=>URL.revokeObjectURL(url),3000);
   el('bridge-status').textContent='已產生獨立候選：新增 '+result.newTriangleCount+' 個三角面，原 GLB 與目前編輯不變。注意：未焊接來源頂點、未驗證法線／動畫骨架；不作正式角色。';
 }catch(e){el('bridge-status').textContent='候選橋接 BLOCKED：'+e.message+'。原始 GLB 完整保留，不產生假修補。';}
});
el('seam-check').addEventListener('click',()=>{
 const f=view?.file||scanFile;
 if(!f){el('seam-status').textContent='未載入 GLB：頭頸接縫未驗證。';return;}
 try{
  latestSeam=inspectHeadNeckGeometry(f,readAccessor);
  el('seam-status').textContent=latestSeam.measured
    ?'頭／頸開放邊抽樣最近距離 '+latestSeam.approxClosestBoundaryDistance.toFixed(6)+'（GLB 局部單位），'+latestSeam.sampledComparisons+' 次比較。僅診斷，未證明網格焊接／動畫不斷頸。'
    :'頭頸接縫 BLOCKED：'+latestSeam.reason+'；保留原模型。';
 }catch(e){latestSeam=null;el('seam-status').textContent='頭頸幾何診斷中止：'+e.message+'；原模型保留。';}
});
el('animated-check').addEventListener('click',()=>{
 const f=view?.file||scanFile;
 if(!f){el('animated-status').textContent='動畫驗收 BLOCKED：請先載入有頭／頸／髮束標記及骨架旋轉動畫的 GLB。';return;}
 try{
   lastAnimatedAudit=inspectAnimatedIntegrity(f,readAccessor,{frames:25,maxVerticesPerRole:480,maxPairsPerFrame:25000});
   if(lastAnimatedAudit.status==='BLOCKED'){
    el('animated-status').textContent='逐幀骨架檢查 BLOCKED：'+lastAnimatedAudit.reason+'。不修改原模型。';
   }else{
    const a=lastAnimatedAudit;
    el('animated-status').textContent='已採樣 '+a.sampledFrames+' 幀（實際 GLB 旋轉骨架），頭／頸最近樣本最大 '+a.headNeckMaxNearestSample.toFixed(4)+
    '、髮／頸最近樣本最小 '+a.hairNeckMinNearestSample.toFixed(4)+'（模型單位）；投影重疊風險影格：'+
    (a.hairOverlapFrames.length?a.hairOverlapFrames.join('、'):'未發現 AABB 重疊')+
    '。此數據不是三角面穿模證明、頭頸焊接通過或實機 FPS 驗收。';
   }
 }catch(e){lastAnimatedAudit=null;el('animated-status').textContent='動畫逐幀檢查失敗：'+e.message+'；原始模型保留。';}
});
el('hair-check').addEventListener('click',()=>{
 const f=view?.file||scanFile;
 if(!f){el('hair-status').textContent='未載入 GLB：髮束遮擋未驗證。';return;}
 try{
  latestHair=inspectHairNeckOcclusion(f,readAccessor);
  el('hair-status').textContent=latestHair.measured
   ?'局部 AABB 遮擋風險：正面 '+(latestHair.frontProxy*100).toFixed(1)+'%、側面 '+(latestHair.sideProxy*100).toFixed(1)+'%。不是實際深度遮擋或動畫碰撞證據，仍須人工實圖驗收。'
   :'髮束遮擋 BLOCKED：'+latestHair.reason+'；未推測頭髮是否擋住脖子。';
 }catch(e){latestHair=null;el('hair-status').textContent='髮束檢查中止：'+e.message+'；原模型保留。';}
});
const deviceGate=assessAnimationDeviceEvidence([]);
el('native-gate-status').textContent='Windows／Android 原生動畫證據 '+deviceGate.status+'：兩平台均需實機 FPS、p95、尺寸及溫度；瀏覽器 FPS 不可當真機 GPU 證據。';
el('scan-btn').addEventListener('click',()=>{
 const file=scanFile||view?.file;
 if(!file){el('scan-status').textContent='無可掃描的 GLB。請選擇本機 GLB 檔案。';return;}
 try{
   lastScan=scanGeometry(file,readAccessor,{kind:el('scene-kind').value,maxSamples:12000,sampleReader:sampleVec3Accessor});
   if(el('scan-mode').value==='off'){el('scan-mode').value='bones-outline';applyScanMode();}
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


// FastModel 1.5 uses explicit glTF optional-detail tags, not guesses from skin index.
function applyDetailChoice(){
 if(!view){el('detail-status').textContent='未建立 GPU，顯示層級在模型載入後才會套用。';return;}
 try{
   const result=view.setDetailMode(el('detail-mode').value);
   el('detail-status').textContent='模式 '+result.mode+' · 目前隱藏 '+result.hiddenOptional+' 個已標記輔助批次。未標記的主模型不變。';
 }catch(e){el('detail-status').textContent='細節切換失敗：'+e.message;}
}
el('detail-mode').addEventListener('change',applyDetailChoice);
let frameBaseline=null;
function latestFrameSummary(){return measuredFrameSummary(view?.frames||[]);}
el('baseline').addEventListener('click',()=>{
 const s=latestFrameSummary();
 if(!s){el('compare-status').textContent='有效幀數不足 60；先載入模型並執行預覽。';return;}
 frameBaseline=s;
 el('compare-status').textContent='已記錄同一工作階段基線 '+s.samples+' 幀：'+s.fps+' FPS、p95 '+s.p95Ms+' ms。';
});
el('compare').addEventListener('click',()=>{
 const s=latestFrameSummary();
 if(!frameBaseline||!s){el('compare-status').textContent='請先記錄基線，並累積至少 60 幀有效預覽資料。';return;}
 const delta=+(100*(s.fps/frameBaseline.fps-1)).toFixed(1);
 const pct=(delta>=0?'+':'')+delta+'%';
 el('compare-status').textContent='基線 '+frameBaseline.fps+' → 目前 '+s.fps+' FPS（'+pct+'）；p95 '+frameBaseline.p95Ms+' → '+s.p95Ms+' ms。僅瀏覽器幀間距；非 GPU 使用率或原生 60 FPS 驗收。';
});
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
 if(stats.frameBudget){el('balance').textContent='CPU 提交 '+stats.frameBudget.cpuSubmitMs.toFixed(2)+'ms／預算 3ms · GPU 時間 '+(stats.frameBudget.gpuMeasured?stats.frameBudget.gpuMs.toFixed(2)+'ms':'未量測')+' · 推估 GPU '+(stats.gpuEstimateMiB||0)+'MiB';}el('p95').textContent=stats.p95FrameMs??'—';el('draw').textContent=stats.drawCalls??'—';el('cpu').textContent=stats.jsSubmitMs??'—';let res=stats.resolution?.join('×')||'1920×1080';if(stats.resolution)showResolutionResult({ok:true,actual:stats.resolution});if(stats.wireMode)el('meshline-status').textContent=stats.wireMode==='off'?'線框關閉 · 效能優先':(stats.wireSkippedForLag?'掉幀保護：暫時隱藏網格線（模式設定保留）':`網格線 ${stats.wireLines||0} 段 · ${stats.wireMode} · ${stats.wireDensity}`);if(stats.previewDetail){
    const d=stats.previewDetail;
    el('detail-status').textContent=d.mode+' · '+d.activeDrawCalls+' 個可顯示批次 / '+d.hiddenOptional+' 個標記細節暫時隱藏（可恢復）；已標記 '+d.optionalMarked+' 個。';
  }
 detail.textContent=`${stats.vertices?.toLocaleString()||0} 頂點 / ${stats.triangles?.toLocaleString()||0} 三角面\n${stats.sourcePrimitives} 原始 primitives → ${stats.drawCalls} draw calls\n尺寸 ${res} / 讀檔建置 ${stats.loadMs}ms\n${stats.skipped} 低層細髮略過（preview mode）`;
 overlay.textContent=`${res}  |  ${stats.fps??'量測中'} FPS\nGPU ${stats.gpu||'unknown'}\n僅技術候選，不可上正式首頁`;
 });view.onGuideFrame=paintCurrentScaffold;view.autoQuality=el('auto').checked;applyDetailChoice();view.setWireMode(el('mesh-lines').value,el('mesh-density').value);setSurfaceChoice();applyLightPreset();showResolutionResult({ok:true,actual:[view.width,view.height]});}catch(err){overlay.textContent='裝置不支援 WebGL2 預覽：'+err.message;quickStatus.textContent='GPU 不可用';el('scan-status').textContent='WebGL2 GPU 不可用；仍可選取 GLB 執行 CPU 幾何掃描。';showResolutionResult();}
async function importGLB(ab){if(!view){try{const f=decodeGLB(ab);scanFile=f;buffer=ab;lastScan=null;el('scan-status').textContent='GLB 已讀取（CPU 模式）；可執行幾何快速掃描，但此裝置不能 GPU 預覽。';}catch(e){el('scan-status').textContent='GLB 解析失敗：'+e.message;}return;}const beforeRunning=view.running,hadScene=!!view.file;el('demo').disabled=true;el('file').disabled=true;overlay.textContent='正在解析 GLB 和批次網格，請稍候…';try{view.stop();view.frames=[];view.last=0;await view.load(ab,el('quality').value);applyWireChoice();setSurfaceChoice();applyDetailChoice();buffer=ab;scanFile=view.file;lastScan=null;latestSeam=null;latestHair=null;lastAnimatedAudit=null;applyScanMode();el('animated-status').textContent='新模型尚未逐幀驗證動畫。';el('seam-status').textContent='新 GLB 尚未量測頭頸接縫。';el('bridge-status').textContent='新 GLB 尚未建立橋接候選。';el('hair-status').textContent='新 GLB 尚未量測髮束遮擋。';el('anatomy-status').textContent='已載入新模型，請重新檢查頭頸標記；不自動宣稱連續。';el('scan-status').textContent='GLB 已載入，按「快速抽樣掃描 GLB」讀取幾何資料。';refreshScaffold();showResolutionResult({ok:true,actual:[view.width,view.height]});view.start();el('pause').disabled=false;paused=false;el('pause').textContent='暫停';}catch(e){overlay.textContent='GLB 載入失敗：'+e.message;if(hadScene&&view.entries.length&&beforeRunning)view.start();console.error(e);}finally{el('demo').disabled=false;el('file').disabled=false;}}
el('file').addEventListener('change',async()=>{const f=el('file').files?.[0];if(f)await importGLB(await f.arrayBuffer());});
el('demo').addEventListener('click',async()=>{try{let r=await fetch('../assets/phase17-visual-NOT-APPROVED.glb');if(!r.ok)throw Error('工程包內的 GLB 需要以 HTTP 開啟，或使用上方檔案選擇器');await importGLB(await r.arrayBuffer());}catch(e){overlay.textContent=e.message+'；請改選擇本機 GLB。';}});
el('pause').addEventListener('click',()=>{if(!view?.file)return;paused=!paused;if(paused)view.stop();else view.start();el('pause').textContent=paused?'繼續':'暫停';});
el('quality').addEventListener('change',async()=>{if(buffer)await importGLB(buffer);});
el('resolution').addEventListener('change',()=>{if(!view){showResolutionResult();return;}const selected=RESOLUTION_PRESETS[el('resolution').value];if(!selected){showResolutionResult({ok:false,reason:'UNKNOWN_PRESET',actual:[view.width,view.height]});return;}const result=view.resize(selected.width,selected.height);showResolutionResult(result);});
el('auto').addEventListener('change',()=>{if(view){view.autoQuality=el('auto').checked;view.setWireMode(el('mesh-lines').value,el('mesh-density').value);setSurfaceChoice();showResolutionResult({ok:true,actual:[view.width,view.height]});}});
el('wave').addEventListener('change',()=>{if(view){view.wind=el('wave').checked;view.staticPoseUploaded=false;}});
el('reclaim').addEventListener('click',()=>{if(!view?.file)return;const r=view.releaseOptionalHair();el('reclaimstat').textContent=r.releasedHairBatches+' 組明確標記的細髮 GPU 快取釋放、'+(r.requestedGpuReleaseBytes/1048576).toFixed(2)+' MiB。未標記的頭頸、主髮型與工作副本不動。';});
el('zoom').addEventListener('input',()=>{if(view)view.zoomFactor=Number(el('zoom').value)/100;});
el('patch').addEventListener('input',()=>{if(!view?.file)return;let stat=view.patchLocal(Number(el('patch').value)/100);if(stat)el('patchstat').textContent=stat.patchedVertices+' 頂點 / '+stat.bytes+' bytes GPU 區段更新 · CPU提交 '+stat.hostSubmitMs+' ms';});
el('turnl').addEventListener('click',()=>{if(view)view.angle=Math.max(-1.2,view.angle-.15);});el('turnr').addEventListener('click',()=>{if(view)view.angle=Math.min(1.2,view.angle+.15);});el('reset').addEventListener('click',()=>{if(view){view.angle=0;view.zoomFactor=1;el('zoom').value='100';}});
let pointerX=null;const c=el('view');c.addEventListener('pointerdown',e=>{pointerX=e.clientX;c.setPointerCapture?.(e.pointerId);});c.addEventListener('pointermove',e=>{if(pointerX===null||!view)return;view.angle=Math.max(-1.2,Math.min(1.2,view.angle+(e.clientX-pointerX)*.006));pointerX=e.clientX;});c.addEventListener('pointerup',()=>pointerX=null);c.addEventListener('pointercancel',()=>pointerX=null);
document.addEventListener('visibilitychange',()=>{
 if(!view?.file)return;
 if(document.hidden)view.stop();
 else if(!paused)view.start();
});
c.addEventListener('wheel',e=>{if(!view)return;e.preventDefault();view.zoomFactor=Math.max(.6,Math.min(1.6,view.zoomFactor-e.deltaY*.001));el('zoom').value=String(view.zoomFactor*100);},{passive:false});
el('export').addEventListener('click',async()=>{if(!lastStats)return;await updateDisk();let out={schema:'AIG_FastModel_1080p60_Preview_1',scanDisplay:{mode:el('scan-mode').value,density:el('scan-density').value,overlay:view.scanOverlayTelemetry||null,realDepthHiddenVerified:false,realSkinJointsOnly:true,sourceGLBUnchanged:true},source:'WEBGL2_BROWSER_ONLY',date:new Date().toISOString(),userAgent:navigator.userAgent,webglGpu:view.gpu,visualAuthority:'NOT_APPROVED',nativeDX12Tested:false,nativeVulkanTested:false,renderPolicy:GRAPHICS_POLICY,...lastStats,localMeshEdit:view.patchStats,surfaceInspection:{mode:view.surfaceGuide,additionalDrawCalls:0,additionalLineBuffers:0},previewDetail:lastStats.previewDetail||null,frameBaseline,latestBrowserFrameSummary:latestFrameSummary(),geometryScan:lastScan,headNeckGeometryInspection:latestSeam,hairNeckOcclusionInspection:latestHair,animatedPoseAudit:lastAnimatedAudit,requiredNativeDeviceGate:assessAnimationDeviceEvidence([]),scanKind:el('scene-kind').value,rasterLightPreset:view.lightPreset,referenceScaffold:{enabled:el('scaffold-enabled').checked,yaw:Number(el('scaffold-yaw').value),pitch:Number(el('scaffold-pitch').value),limit:Number(el('scaffold-limit').value),referenceOnly:true},meshLineDisplay:{mode:view.wireMode,density:view.wireDensity,segments:view.wireStats.segments,autoSuppressed:view.wireState.suppressed},resourcePolicy:{...lastStats.memoryPressure,gpuUsagePercentReliable:false},diskEstimate:diskInfo,warning:'browser storage quota is not entire device disk or storage write throughput'};const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(out,null,2)],{type:'application/json'}));a.download='AIG-FastModel-device-benchmark.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),3000);});