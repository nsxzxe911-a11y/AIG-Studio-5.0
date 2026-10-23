import {PhotoViewer} from './viewer.mjs';
import {installAIG26VisionPanel} from './aig-vision-metric-color-2-6-ui.mjs';
import {installAIG27SegmentationPanel} from './aig-seeded-segmentation-2-7-ui.mjs';
import {installAIG28LocalLearning} from './aig-local-learner-2-8-ui.mjs';
import {installAIG28BMultiSource} from './aig-multisource-occlusion-2-8b-ui.mjs';
import {installAIG29ContinuousScan} from './aig-continuous-surface-scan-2-9-ui.mjs';
import {installAIG313ClassroomCapacity}
 from './aig-classmates-crowd-3-13-ui.mjs';
import {installAIGStage1DualAdultRuntime}
 from './aig-stage1-dual-adult-runtime.mjs';
import {installAIG31HeadBodyControls} from './aig-articulated-view-3-1-ui.mjs';
import {installAIG32DigitControls} from './aig-20-digit-articulation-3-2-ui.mjs';
import {installAIG34PhotoDigitPanel} from './aig-photo-digit-silhouette-3-4-ui.mjs';
import {buildAIG23PhotoActor} from './aig-photo-rig-world-2-3.mjs';
import {detectAIG24Image} from './aig-auto-image-detect-2-4.mjs';
import {AIG25WorldMovieRecorder,validateAIG25TrueWorldMovie,
 verifyAIG25DecodedFrame}
 from './aig-true-world-movie-2-5.mjs';
import {openAIG716AssetLibrary} from './aig-external-asset-library-7-16.mjs';
import {AIG19SceneRuntime} from './aig-scene-lifecycle-1-9.mjs';
import {createAIG20WorldScene,addAIG20WorldObject,addAIG20CameraKey,
 assertAIG20Document,resolveAIG20WorldSources} from './aig-world-scene-2-0.mjs';
import {AIG20WorldRuntime} from './aig-world-runtime-2-0.mjs';
import {importAIG712SceneMap} from './aig-scene-map-7-12.mjs';
import {listAIG21MapAnchors,alignAIG21ObjectToMap}
 from './aig-map-model-alignment-2-1.mjs';
import {compileAIG22Story,verifyAIG22Story,AIG22StoryPlayer}
 from './aig-text-world-storyboard-2-2.mjs';
const $=id=>document.getElementById(id);
let library=null,viewer=null,runtime=null,closed=false,loading=false;
let worldRuntime=null,worldDoc=null,worldMetas=new Map(),worldSaved=[];
let worldFrame=0,worldPlaying=false,worldPlaybackStart=0;
let worldMapSnapshot=null;
let aig313Classroom=null;
let aigStage1BaseAdults=null;
// Serialize async scene creation/add operations. UI clicks are not awaited
// by browsers: two rapid actions must not commit documents from stale state.
let worldBuildMutation=false;
// World edits must be serialized INSTEAD of silently throwing away rapid
// source-add clicks. Snapshot each click's inputs before the first await.
let worldEditTail=Promise.resolve();
function enqueueWorldEdit(operation){
 const next=worldEditTail.then(async()=>{
  if(loading)throw Error('AIG20_WORKSPACE_BUSY_NO_WORLD_MUTATION');
  worldBuildMutation=true;
  try{return await operation()}
  finally{worldBuildMutation=false}
 });
 worldEditTail=next.catch(()=>{});
 return next;
}
function setWorldBuildMutation(busy){
 worldBuildMutation=busy;
 $('world-new').disabled=busy;
 $('world-add').disabled=busy;
}
let story22Plan=null,story22Player=null,story22FrameHook=null,story22PriorFrame=null;
const say=(message,bad=false)=>{
 $('status').textContent=message;$('status').dataset.error=bad?'true':'false';
};
const mib=n=>(n/(1024*1024)).toFixed(2)+' MiB';
async function init(){
 try{
  library=await openAIG716AssetLibrary();
  await refresh();
  await refreshWorldAssets();
  say('資產索引已就緒，尚未啟動 GPU。');
  aig313Classroom?.refreshSources?.().catch(()=>{});
  const id=new URL(location.href).searchParams.get('asset');
  if(id&&id.length<=150&&[...$('scene-choice').options].some(x=>x.value===id))
   $('scene-choice').value=id;
 }catch(error){say('BLOCKED：讀取本機資產失敗：'+String(error.message||error),true)}
}
async function refresh(){
 if(!library)return;
 const all=await library.list({limit:1000});
 const models=all.filter(x=>x.mime==='model/gltf-binary'&&
  ['character','building','scene','environment'].includes(x.category));
 const previous=$('scene-choice').value;
 $('scene-choice').replaceChildren();
 const empty=document.createElement('option');
 empty.value='';empty.textContent='選擇已匯入的 3D GLB';$('scene-choice').append(empty);
 for(const asset of models){
  const item=document.createElement('option');
  item.value=asset.id;
  item.textContent=asset.title+' · '+asset.category+' · '+asset.reviewStatus;
  $('scene-choice').append(item);
 }
 if(models.some(x=>x.id===previous))$('scene-choice').value=previous;
 report();
}
function report(){
 if(worldRuntime?.scene){
  const current=worldRuntime.current(),gpu=viewer?.renderer?.info;
  $('metrics').textContent=JSON.stringify({
   activeWorld:current.sceneId,worldRevision:current.revision,
   modelObjects:current.objects,
   map:current.mapReadOnly,
   rendererGeometries:gpu?.memory?.geometries??null,
   rendererTextures:gpu?.memory?.textures??null,
   gpuVRAMBytesVerified:false,
   viewerContexts:1,
   renderOutputColorSpace:viewer?.renderer?.outputColorSpace??null,
   actualPBRLinearLightPipeline:!!viewer,
   nativeDisplayICCColourCertified:false,
   physicallyMeasured3DFullbodyCertified:false,
   immutableSourceAssetsPreserved:true
  },null,2);
  return;
 }
 if(!runtime){
  $('metrics').textContent='GPU 未啟動，沒有活動場景。'+
   '\n原始人物、建築、地圖與影片仍在外部資料庫。';
  return;
 }
 const s=runtime.stats(),gpu=viewer?.renderer?.info;
 $('metrics').textContent=JSON.stringify({
  activeScene:s.active,
  cpuBinaryCacheMiB:mib(s.cachedCPUBytes),
  cpuCacheMaxMiB:mib(s.maxCachedBytes),
  cacheSources:s.cachedSourceCount,cacheHits:s.cacheHits,
  cacheMisses:s.cacheMisses,evictions:s.evictions,
  activeRendererGeometries:gpu?.memory?.geometries??null,
  activeRendererTextures:gpu?.memory?.textures??null,
  currentDrawCalls:gpu?.render?.calls??null,
  actualGpuVRAMBytesKnown:false,
  immutableOriginalAssetsPreserved:true
 },null,2);
}
$('scene-load').addEventListener('click',async()=>{
 const id=$('scene-choice').value;
 if(!id){say('請先選擇要開啟的已匯入 GLB。',true);return}
 if(loading){say('現有場景正在載入中，請使用下一次切換。',true);return}
 loading=true;$('scene-load').disabled=true;
 try{
  if(!runtime){
   viewer=new PhotoViewer($('viewport'),e=>say('3D 模組隔離錯誤：'+e,true));
   runtime=new AIG19SceneRuntime({library,viewer,
    budgetBytes:48*1024*1024,maxEntries:4});
  }
  say('正在按需核對來源 SHA、解析真 GLB 並建立 GPU 工作場景…');
  const result=await runtime.activate(id);
  if(result.status==='ALREADY_ACTIVE_NO_REPARSE'){
   say('此 GLB 已在 GPU 工作場景中：'+result.asset.title+
    '。來源 SHA 未變，直接重用目前模型與鏡頭，不重建網格。');
  }else if(result.status==='ACTIVE_SOURCE_BOUND_GPU_SCENE'){
   say('已開啟 '+result.asset.title+
    '。上一個模型的 GPU 資源已釋放；'+
    (result.asset.reviewStatus==='approved'?'此模型已審核。':
     '此模型尚未核准，只能作工作預覽。'));
  }else say('本次載入被較新的場景請求取代，不覆蓋目前模型。');
  if(result.status==='ACTIVE_SOURCE_BOUND_GPU_SCENE'||
     result.status==='ALREADY_ACTIVE_NO_REPARSE'){
   invalidateAIG22Storyboard('單 GLB 工作區取代來源世界，文字時間軸已停用');
    worldRuntime?.close();worldRuntime=null;stopWorldPlayback();
  }
  report();
 }catch(error){
  say('BLOCKED：'+String(error.message||error)+
   '；已保留上一個可用場景及本機原始素材。',true);report();
 }finally{loading=false;$('scene-load').disabled=false}
});
$('scene-unload').addEventListener('click',async()=>{
 if(worldRuntime?.scene){
  try{
   invalidateAIG22Storyboard('世界場景已卸載，故事時間軸停用');
   viewer.unloadCurrent();worldRuntime.close();worldRuntime=null;
   refreshWorldActorControls();
   stopWorldPlayback();say('已卸載整個 2.0 世界的 GPU 來源；已保存的人物、建築與地圖資料不變。');
   report();
  }catch(e){say('轉場／驗收中不可清空：'+String(e.message||e),true)}
  return;
 }
 if(!runtime){say('目前沒有活動 GPU 場景。');return}
 try{
  const result=await runtime.unload();
  say(result.status==='GPU_SCENE_RELEASED_SOURCE_BLOB_PRESERVED'?
   '已卸載工作場景並要求 Three.js 釋放模型 GPU 資源；外部來源與分類索引未刪除。':
   '場景切換正在進行，本次清場未執行。');
  report();
 }catch(error){say('不能中斷目前錄影／驗收：'+String(error.message||error),true)}
});
$('scene-clear').addEventListener('click',()=>{
 if(!runtime){say('尚無暫存 RAM，不需清除。');return}
 const r=runtime.clearCache();
 say(r.status==='ONLY_TRANSIENT_RAM_CACHE_CLEARED'?
  '已清理暫存二進位 RAM，不刪除外部素材庫、原圖、已核准模型與活動 GPU 畫面。':
  '清理未完成');report();
});
$('scene-refresh').addEventListener('click',()=>{
 refresh().then(refreshWorldAssets).catch(e=>say(String(e),true));
});

const updateWorldStatus=(msg,error=false)=>{
 const e=$('world-status');e.textContent=msg;
 e.style.color=error?'#f5c591':'#9ff2db';
};
const triple=str=>{
 const a=str.split(',').map(v=>Number(v.trim()));
 if(a.length!==3||a.some(x=>!Number.isFinite(x)))
  throw Error('3D 座標必須為三個有限數字，使用逗號分開');
 return a;
};
function stopWorldPlayback(){
 worldPlaying=false;
 if(worldFrame){cancelAnimationFrame(worldFrame);worldFrame=0}
}
function worldEvidence(){
 refreshWorldPlacementChoices();
 $('world-proof').textContent=worldDoc?JSON.stringify({
  id:worldDoc.id,sourceMode:worldDoc.coordinateMode,revision:worldDoc.revision,
  objects:worldDoc.objects.map(x=>({node:x.nodeId,
   category:x.category,assetId:x.assetId,sourceSHA:x.sourceSha256,
   xyz:x.position,scale:x.scale})),
  sourceMap:worldDoc.mapRef?.sha256??null,
  cameraKeyframes:worldDoc.cameraKeys,
  realDimensionsNotInferred:worldDoc.coordinateMode==='LOCAL_RELATIVE',
  noSourceGLBRewritten:true
 },null,2):'尚未建立世界場景來源';
 if(worldDoc){
  const last=worldDoc.cameraKeys.at(-1);
  $('world-scrub').max=String(Math.max(10,last?.timeSeconds??0));
 }
}
async function refreshWorldAssets(){
 if(!library)return;
 const all=await library.list({limit:1000});
 worldMetas=new Map(all.map(a=>[a.id,a]));
 function rebuild(selectId,accept,none){
  const el=$(selectId),keep=el.value;el.replaceChildren();
  const item=document.createElement('option');item.value='';
  item.textContent=none;el.append(item);
  for(const m of all.filter(accept)){
   const option=document.createElement('option');option.value=m.id;
   option.textContent=m.title+' ['+m.category+'] '+m.reviewStatus;
   el.append(option);
  }
  if([...el.options].some(x=>x.value===keep))el.value=keep;
 }
 rebuild('world-asset',x=>x.mime==='model/gltf-binary'&&
  ['character','building','environment','scene'].includes(x.category),
  '選擇人物／建築／環境 GLB');
 rebuild('world-map',x=>x.mime==='application/json'&&x.category==='map',
  '不連接地圖圖資');
 worldSaved=all.filter(x=>x.category==='scene'&&
  x.mime==='application/json'&&x.tags.includes('world20'));
 rebuild('world-saved',x=>worldSaved.some(y=>y.id===x.id),
  '尚無已保存世界場景');
 rebuild('story-saved',x=>x.mime==='application/json'&&
  x.category==='animation'&&x.tags.includes('story22'),
  '尚無已保存來源劇本');
}
function drawAIG20Map(map){
 const canvas=$('world-map-preview'),ctx=canvas?.getContext('2d');
 if(!ctx)return;
 const w=canvas.width,h=canvas.height;
 ctx.clearRect(0,0,w,h);ctx.fillStyle='#06111e';ctx.fillRect(0,0,w,h);
 if(!map){
  $('world-map-caption').textContent='尚未連接 7.12 來源圖資';
  return;
 }
 const items=[];
 for(const feature of map.features){
  const g=feature.geometry;
  if(!g)continue;
  const points=g.type==='Point'?[g.coordinates]:
   g.type==='Polygon'?g.coordinates[0]:g.coordinates;
  if(!Array.isArray(points)||points.length>2048||
   !points.every(p=>Array.isArray(p)&&p.length===2&&
    p.every(Number.isFinite)))continue;
  items.push({feature,type:g.type,points});
 }
 if(!items.length){
  ctx.fillStyle='#b8dfeb';ctx.font='15px sans-serif';
  ctx.fillText('有來源地圖，但無已存圖徵',20,h/2);
 }else{
  const all=items.flatMap(v=>v.points),
   loX=Math.min(...all.map(v=>v[0])),hiX=Math.max(...all.map(v=>v[0])),
   loY=Math.min(...all.map(v=>v[1])),hiY=Math.max(...all.map(v=>v[1])),
   scale=Math.min((w-36)/Math.max(hiX-loX,1),
    (h-36)/Math.max(hiY-loY,1)),
   xy=p=>[w/2+(p[0]-(loX+hiX)/2)*scale,
    h/2-(p[1]-(loY+hiY)/2)*scale];
  const colors={building:'#83e0f1',road:'#dcd8bf',tree:'#90d5a0',
   water:'#6ebfff',house:'#9cb4ec',sports_facility:'#cc9ce5'};
  for(const item of items){
   const color=colors[item.feature.category]||'#bacdd8';
   ctx.beginPath();const first=xy(item.points[0]);ctx.moveTo(...first);
   for(const pt of item.points.slice(1))ctx.lineTo(...xy(pt));
   if(item.type==='Point'){
    ctx.arc(first[0],first[1],4,0,Math.PI*2);
    ctx.fillStyle=color;ctx.fill();
   }else{
    if(item.type==='Polygon'){ctx.closePath();ctx.fillStyle=color+'33';ctx.fill()}
    ctx.strokeStyle=color;ctx.lineWidth=2;ctx.stroke();
   }
  }
 }
 $('world-map-caption').textContent=map.id+' · '+items.length+
  ' 個來源圖徵 · '+map.coordinateMode+
  ' · 只有 2D 俯視圖資，未自動建立建築 3D 高度';
}
async function selectedMapRef({id=$('world-map').value,mode=$('world-mode').value}={}){
 if(!id){worldMapSnapshot=null;refreshWorldPlacementChoices();return null;}
 const m=worldMetas.get(id);
 if(!m)throw Error('地圖資產索引已更新，請重新整理');
 const loaded=await library.get(id,{includePayload:true});
 if(!loaded?.blob||loaded.asset?.sha256!==m.sha256)
  throw Error('地圖來源 SHA 不符');
 if(loaded.blob.size>8*1024*1024)throw Error('地圖檔太大');
 const snapshot=JSON.parse(await loaded.blob.text());
 const map=importAIG712SceneMap(snapshot);
 drawAIG20Map(map);
 worldMapSnapshot=snapshot;refreshWorldPlacementChoices();
 // FastModel 7.12 used the suffix METERS while the 2.0 composer uses
 // METRES; normalize names WITHOUT changing the underlying source.
 const original=map.coordinateMode;
 const coordinateMode=original.replace('METERS','METRES');
 if(coordinateMode!==mode)
  throw Error('地圖與世界的相對／實測／WGS84 座標模式不一致');
 return {assetId:id,sha256:m.sha256,coordinateMode};
}
function beginNewWorld(mapRef=null,{title=$('world-title').value.trim(),mode=$('world-mode').value}={}){
 worldDoc=createAIG20WorldScene({
  id:'world-'+crypto.randomUUID(),
  title:title||'新場景',
  coordinateMode:mode,mapRef
 });
 stopWorldPlayback();worldEvidence();
 return worldDoc;
}
// No dropped actor clicks: each user event captures its own source ID,
// coordinates, source SHA and map selection BEFORE joining the transaction
// queue. Only a successfully resolved edit commits worldDoc.
$('world-new').addEventListener('click',()=>{
 const opts={
  title:$('world-title').value.trim(),mode:$('world-mode').value,
  mapId:$('world-map').value
 };
 void enqueueWorldEdit(async()=>{
  const mapRef=await selectedMapRef({id:opts.mapId,mode:opts.mode});
  beginNewWorld(mapRef,opts);
  invalidateAIG22Storyboard('新世界場景已建立，故事需重新核對');
  updateWorldStatus('已建立來源座標一致的空白世界場景；已存外部來源與原模型完全保留。');
 }).catch(e=>updateWorldStatus('BLOCKED：'+String(e.message||e),true));
});
$('world-add').addEventListener('click',()=>{
 const spec={
  sourceId:$('world-asset').value,mode:$('world-mode').value,
  mapId:$('world-map').value,title:$('world-title').value.trim(),
  scale:Number($('world-scale').value),
  position:['world-x','world-y','world-z'].map(k=>Number($(k).value)),
  reviewed:$('world-metric-reviewed').checked
 };
 const source=worldMetas.get(spec.sourceId);
 void enqueueWorldEdit(async()=>{
  if(!source||source.mime!=='model/gltf-binary')
   throw Error('請選擇真實 GLB 人物／建築／環境');
  if(!Number.isFinite(spec.scale)||spec.position.some(x=>!Number.isFinite(x)))
   throw Error('模型比例與位置必須是實際數值');
  const mapRef=await selectedMapRef({id:spec.mapId,mode:spec.mode});
  const current=worldDoc||createAIG20WorldScene({
   id:'world-'+crypto.randomUUID(),title:spec.title||'新場景',
   coordinateMode:spec.mode,mapRef
  });
  if(current.coordinateMode!==spec.mode||
   JSON.stringify(current.mapRef)!==JSON.stringify(mapRef))
   throw Error('地圖或座標系已更改；不覆蓋既有來源');
  const next=addAIG20WorldObject(current,{
   nodeId:'node-'+(current.objects.length+1),assetId:spec.sourceId,
   sourceSha256:source.sha256,category:source.category,
   position:spec.position,scale:[spec.scale,spec.scale,spec.scale],
   physicalScaleReviewed:spec.reviewed
  });
  // Atomic scene replacement AFTER exact immutable source-ID validation.
  worldDoc=next;
  invalidateAIG22Storyboard('場景增加模型，劇情來源需重新核對');
  updateWorldStatus('已加入 '+source.title+'：真正來源 GLB，沒有生成替身。');
  worldEvidence();
 }).catch(e=>updateWorldStatus('BLOCKED：'+String(e.message||e),true));
});
// Real3D 2.4 — automatically inspect actual source RGBA on file selection
// without creating a false billboard animation, rerendering the 3D canvas,
// or silently trusting a person/animal classification from color heuristics.
let photo24Sequence=0,photo24Latest=null;
async function autoInspectPhoto24(file){
 if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type)||
  file.size<100||file.size>12*1024*1024)
  throw Error('圖片必須為 12 MiB 以下的 JPG、PNG 或 WebP');
 const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',
  await file.arrayBuffer()));
 const sha=[...hash].map(n=>n.toString(16).padStart(2,'0')).join('');
 const image=await createImageBitmap(file);
 let pixels,w,h;
 try{
  const scale=Math.min(1,1024/image.width,1024/image.height);
  w=Math.floor(image.width*scale);h=Math.floor(image.height*scale);
  if(w<128||h<128)throw Error('可分析的照片像素太小');
  const canvas=document.createElement('canvas');
  canvas.width=w;canvas.height=h;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  if(!ctx)throw Error('無法解碼來源 RGB 畫素');
  ctx.drawImage(image,0,0,w,h);
  pixels=ctx.getImageData(0,0,w,h).data;
 }finally{image.close?.()}
 return detectAIG24Image({
  pixels,width:w,height:h,sourceImageSHA256:sha
 });
}
$('photo23-source').addEventListener('change',async()=>{
 const serial=++photo24Sequence;
 photo24Latest=null;
 const file=$('photo23-source').files?.[0];
 if(!file){
  $('photo24-auto-status').textContent='尚未選擇圖片。';
  $('photo24-auto-proof').textContent='尚無自動圖片分析。';
  return;
 }
 $('photo24-auto-status').textContent='正自動掃描來源 RGB、主體輪廓、對比、像素與比例…';
 try{
  const proof=await autoInspectPhoto24(file);
  if(serial!==photo24Sequence)return;
  photo24Latest={file,proof};
  $('photo24-auto-proof').textContent=JSON.stringify(proof,null,2);
  $('photo24-auto-status').textContent=proof.autoTechnicalRigAllowed?
   '已取得單一長形主體候選，可試建真 3D 技術骨架；這不是 AI 人臉辨識，也不是 1:1 身分還原。':
   '分析完成，但不能可靠判斷是單一人物：'+proof.autoProcessReason+
   '。不會把整張圖片晃動當成 3D 動畫。';
 }catch(e){
  if(serial!==photo24Sequence)return;
  $('photo24-auto-status').textContent='BLOCKED：'+String(e.message||e);
  $('photo24-auto-proof').textContent='分析失敗；原圖不清空。';
 }
});
// Real3D 2.3 — the one-photo action uses only the already implemented
// 6.4 rig/GLB generator. Original image is separately preserved by SHA in
// the outside-app IndexedDB library, not written into the JS bundle.
$('photo23-build').addEventListener('click',async()=>{
 if(loading||worldBuildMutation){
  $('photo23-status').textContent='BLOCKED：場景正更新中；未動原圖或模型。';
  return;
 }
 loading=true;setWorldBuildMutation(true);
 $('photo23-build').disabled=true;
 try{
  const file=$('photo23-source').files?.[0];
  if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type)||
   file.size<100||file.size>12*1024*1024)
   throw Error('請選擇 12 MiB 以下的單張 JPG／PNG／WebP 人物照片');
  if(!library)throw Error('本機素材庫尚未啟動');
  const candidate=photo24Latest?.file===file?
   photo24Latest.proof:await autoInspectPhoto24(file);
  if(!candidate.autoTechnicalRigAllowed)
   throw Error('自動圖片偵測不支持直接製成人形：'+candidate.autoProcessReason+
    '。需要更可靠的語義與輪廓證據，不生成假人物。');
  // Original bytes are independently content-addressed before any derived
  // model work. A geometry/GLB failure must never erase this input.
  const original=await library.importBlob(file,{
   category:'character',title:'Real3D 2.3 原始照片：'+file.name,
   tags:['Real3D23','原圖','單照片'],source:'USER_LOCAL',
   modelAccuracy:'NOT_VERIFIED',coordinateUnits:'UNKNOWN'
  });
  $('photo23-status').textContent='原圖已保存 SHA，正在解析單張照片及真 17 骨模型…';
  const image=await createImageBitmap(file);
  let data;
  try{
   const factor=Math.min(1,1024/image.width,1024/image.height);
   const width=Math.floor(image.width*factor),
    height=Math.floor(image.height*factor);
   if(width<128||height<128)throw Error('照片尺寸太小，無法建立比例約束');
   const scan=document.createElement('canvas');
   scan.width=width;scan.height=height;
   const ctx=scan.getContext('2d',{willReadFrequently:true});
   if(!ctx)throw Error('無法讀取來源 RGB 像素');
   ctx.drawImage(image,0,0,width,height);
   data=ctx.getImageData(0,0,width,height);
  }finally{image.close?.()}
  if(original.sha256!=='sha256:'+candidate.sourceImageSHA256)
   throw Error('來源圖片已改變，禁止用舊分析結果建模');
  const {bytes,proof}=await buildAIG23PhotoActor({
   pixels:data.data,width:data.width,height:data.height,
   sourceImageSHA256:original.sha256.replace(/^sha256:/,'')
  });
  const model=await library.importBlob(
   new Blob([bytes],{type:'model/gltf-binary'}),{
    category:'character',title:'Real3D 2.3 單照片真骨架技術角色',
    tags:['Real3D23','真骨架','衣物蒙皮','動作'],
    source:'GENERATED_DERIVED',modelAccuracy:'ESTIMATED',
    coordinateUnits:'RELATIVE',derivedFrom:original.id
   });
  if(model.sha256!=='sha256:'+proof.modelGLBSHA256)
   throw Error('GLB 保存後來源 SHA 不符，不提交工作場景');
  await refreshWorldAssets();
  $('world-asset').value=model.id;
  if(worldDoc&&worldDoc.coordinateMode!==$('world-mode').value)
   throw Error('既有場景座標模式已更改，原世界保持不變');
  const draft=worldDoc||createAIG20WorldScene({
   id:'world-'+crypto.randomUUID(),
   title:$('world-title').value.trim()||'Real3D 2.3 單照片場景',
   coordinateMode:$('world-mode').value,mapRef:await selectedMapRef()
  });
  const next=addAIG20WorldObject(draft,{
   nodeId:'node-'+(draft.objects.length+1),
   category:'character',assetId:model.id,sourceSha256:model.sha256,
   position:[0,0,0],scale:[1,1,1],physicalScaleReviewed:false
  });
  const active=await ensureWorldViewer();
  const mounted=await active.load(next);
  if(mounted.status!=='COMPOSITED_WORLD_GPU_READY')
   throw Error('新世界載入已被較新操作取代');
  runtime?.clearActiveReferenceAfterExternalCommit();
  worldDoc=next;stopWorldPlayback();
  invalidateAIG22Storyboard('新單照片真骨架來源已加入，需重新解析中文劇情');
  refreshWorldActorControls();worldEvidence();report();
  $('photo23-proof').textContent=JSON.stringify({
   ...proof,automaticImageInspection:candidate,
   originalAssetId:original.id,generatedGLBAssetId:model.id,
   worldSceneId:worldDoc.id,sourceNodeId:next.objects.at(-1).nodeId,
   originalFilePreserved:true
  },null,2);
  $('photo23-status').textContent=
   '已真正加入 '+next.objects.at(-1).nodeId+'：'+
   proof.realBones+' 骨、'+proof.realSkinnedMeshes+' 個真蒙皮網格、'+
   proof.realSourceClips.length+' 段原始骨架動畫；'+
   (proof.contactRiskNeedsRepair?'衣物/髮束接觸仍有風險，禁止發布。':
    '離散姿態接觸檢查通過，但連續時間仍待驗證。')+
   ' 可以在下方 2.2 依真正存在的 Clip 撰寫劇情。';
  updateWorldStatus('2.3 來源模型已載入同一個正式 3D 工作視窗。');
  try{await saveWorld(true)}
  catch(e){$('photo23-status').textContent+=' 世界文件未保存：'+
   String(e.message||e)+'；現有 GPU 模型不刪除。'}
 }catch(e){
  $('photo23-status').textContent='BLOCKED：'+String(e.message||e)+
   '。不覆蓋原照片、已存 GLB 或上一次可用工作場景。';
 }finally{
  loading=false;setWorldBuildMutation(false);
  $('photo23-build').disabled=false;
 }
});
async function ensureWorldViewer(){
 if(!library)throw Error('本機資產庫尚未開啟');
 if(!viewer){
  viewer=new PhotoViewer($('viewport'),e=>say('3D 引擎隔離：'+e,true));
 }
 if(!worldRuntime)worldRuntime=new AIG20WorldRuntime({library,viewer});
 return worldRuntime;
}
async function saveWorld(auto=false){
 if(!worldDoc||!worldDoc.objects.length)
  throw Error('至少加入一個真實來源模型才能保存場景');
 assertAIG20Document(worldDoc);
 const proof=await resolveAIG20WorldSources(worldDoc,library);
 const json=JSON.stringify(worldDoc,null,2);
 const meta=await library.importBlob(new Blob([json],{type:'application/json'}),{
  category:'scene',title:worldDoc.title,
  tags:['world20','場景','多來源'],
  source:'GENERATED_DERIVED',
  modelAccuracy:proof.realWorldScaleCertified?'CALIBRATED_MEASURED':'ESTIMATED',
  coordinateUnits:worldDoc.coordinateMode==='LOCAL_RELATIVE'?
   'RELATIVE':'METRES'
 });
 await refreshWorldAssets();
 updateWorldStatus((auto?'已自動保存':'已保存')+'世界場景資料：'+meta.title+
  '，關聯模型 '+worldDoc.objects.length+
  ' 個，原始 GLB 不會被重新編碼。已存文件仍須人工審核才能推薦重用。');
 return meta;
}
function refreshWorldPlacementChoices(){
 function populate(id,items,prev){
  const select=$(id),remember=select.value;
  select.replaceChildren();
  const empty=document.createElement('option');
  empty.value='';empty.textContent=prev;select.append(empty);
  for(const item of items){
   const option=document.createElement('option');
   option.value=item.value;option.textContent=item.label;
   select.append(option);
  }
  if(items.some(i=>i.value===remember))select.value=remember;
 }
 populate('world-align-object',(worldDoc?.objects||[]).map(x=>({
  value:x.nodeId,label:x.nodeId+' — '+x.category
 })), '選擇現有 3D 物件');
 let anchors=[];
 if(worldMapSnapshot){
  try{anchors=listAIG21MapAnchors(worldMapSnapshot).anchors.map(x=>({
   value:x.featureId,label:x.featureId+' — '+x.category+' ('+x.name+')'
  }))}catch{anchors=[]}
 }
 populate('world-map-feature',anchors,'選擇來源地圖圖徵');
}
function refreshWorldActorControls(){
 const list=worldRuntime?.listSourceActorClips()||[];
 const element=$('world-actor-choice'),previous=element.value;
 element.replaceChildren();
 const empty=document.createElement('option');empty.value='';
 empty.textContent='選擇有來源動畫的角色';element.append(empty);
 for(const item of list){
  const option=document.createElement('option');option.value=item.nodeId;
  option.textContent=item.nodeId+' · '+item.clips.length+' clips';
  element.append(option);
 }
 if(list.some(x=>x.nodeId===previous))element.value=previous;
 if(!element.value&&list.length)element.value=list[0].nodeId;
 const clips=$('world-actor-clip'),actor=list.find(x=>x.nodeId===element.value),
  selected=clips.value;
 clips.replaceChildren();
 const filler=document.createElement('option');filler.value='';
 filler.textContent='目前沒有來源 GLB 動作';clips.append(filler);
 for(const clip of actor?.clips||[]){
  const option=document.createElement('option');option.value=String(clip.index);
  option.textContent=clip.name+' ('+clip.durationSeconds.toFixed(2)+' 秒)';
  clips.append(option);
 }
 if((actor?.clips||[]).some(c=>String(c.index)===selected))
  clips.value=selected;
 else if(actor?.clips.length)clips.value=String(actor.clipIndex);
 $('world-actor-status').textContent=actor?
  '角色 '+actor.nodeId+' 正使用來源 GLB Clip；無自動偽造動作。':
  '沒有已驗證來源動畫；單張圖的靜態模型不會冒充會跑跳。';
}
$('world-actor-choice').addEventListener('change',refreshWorldActorControls);
$('world-actor-play').addEventListener('click',()=>{
 try{
  const actor=$('world-actor-choice').value,index=Number($('world-actor-clip').value);
  if(!actor||!$('world-actor-clip').value)throw Error('請先選真正的 GLB 角色和 Clip');
  const result=worldRuntime?.selectSourceActorClip(actor,index);
  if(!result)throw Error('尚未載入世界場景');
  $('world-actor-status').textContent='正在播放 '+actor+' 的原始 GLB 動作 '+
   result.sourceClipName+'，片長 '+result.sourceDurationSeconds.toFixed(2)+
   ' 秒；不是 AI 虛構動作。';
 }catch(e){$('world-actor-status').textContent='BLOCKED：'+String(e.message||e)}
});
$('world-actor-pause').addEventListener('click',()=>{
 try{
  const actor=$('world-actor-choice').value;
  if(!actor)throw Error('選擇已載入來源動畫的角色');
  worldRuntime.pauseSourceActor(actor,true);
  $('world-actor-status').textContent='已暫停角色 '+actor+
   ' 的原始 GLB 動作，場景與其他模型不受影響。';
 }catch(e){$('world-actor-status').textContent='BLOCKED：'+String(e.message||e)}
});
$('world-align').addEventListener('click',async()=>{
 try{
  if(loading)throw Error('前次場景載入中');
  if(!worldDoc||!worldMapSnapshot)throw Error('請先從 7.12 載入並確認來源地圖');
  const nodeId=$('world-align-object').value,
   featureId=$('world-map-feature').value;
  if(!nodeId||!featureId)throw Error('選擇來源模型及真實地圖圖徵');
  const ox=Number($('world-align-offset-x').value),
   oz=Number($('world-align-offset-z').value);
  if(!$('world-align-offset-x').value.trim()||
   !$('world-align-offset-z').value.trim())
   throw Error('請填寫有效水平偏移數字');
  const next=alignAIG21ObjectToMap(worldDoc,worldMapSnapshot,{
   nodeId,featureId,offsetXZ:[ox,oz]
  });
  // Check original source IDs and SHA are still present before
  // committing any live geometry position or new scene document.
  await resolveAIG20WorldSources(next,library);
  if(worldRuntime?.scene)worldRuntime.updateWorldPositions(next);
  worldDoc=next;worldEvidence();
  invalidateAIG22Storyboard('地圖對位與場景 revision 已變更，請重新編譯');
  updateWorldStatus('已將 '+nodeId+' 對齊地圖 '+featureId+
   ' 的候選 XY→場景 XZ，保留 Y、原 GLB、骨架及比例。'+
   (worldRuntime?.scene?'畫面已直接移位，沒有重新載入 GPU。':'按合成預覽顯示。'));
  try{await saveWorld(true)}catch(e){
   updateWorldStatus('對位已保存於工作模型，但外部資產庫存檔受限：'+
    String(e.message||e),true);
  }
 }catch(e){updateWorldStatus('BLOCKED：'+String(e.message||e)+
  '；已核准來源與上一個工作場景保持不變。',true)}
});
$('world-preview').addEventListener('click',async()=>{
 // Do not render a partially committed document when multiple source edits
 // are queued. Wait for their exact transactional completion first.
 await worldEditTail;
 if(loading){updateWorldStatus('已有載入操作，請勿重覆切換',true);return}
 loading=true;$('world-preview').disabled=true;
 try{
  if(!worldDoc||!worldDoc.objects.length)
   throw Error('先選擇來源加入人物／建築／環境');
  const actor=await ensureWorldViewer();
  const result=await actor.load(worldDoc);
  if(result.status!=='COMPOSITED_WORLD_GPU_READY')
   throw Error('本輪載入已被新來源取代');
  runtime?.clearActiveReferenceAfterExternalCommit();
  invalidateAIG22Storyboard('世界來源已重新載入，請重新解析文字動作');
  refreshWorldActorControls();
  updateWorldStatus('已在同一個 WebGL 3D 畫面載入 '+
   result.objects+' 個原始模型來源，'+
   (result.mapReadOnly?'已連接真地圖來源記錄。':'地圖未連接。')+
   ' 可直接旋轉或拖動鏡頭，不必重新產生女主角或建築。');
  try{await saveWorld(true)}catch(e){
   updateWorldStatus('3D 世界已顯示，但外部自動儲存未成功：'+
    String(e.message||e)+'；不清除目前模型。',true)
  }
 }catch(e){updateWorldStatus('BLOCKED：'+String(e.message||e)+
  '；保留原有可用 3D 場景及來源資產。',true)}
 finally{loading=false;$('world-preview').disabled=false;report();worldEvidence()}
});
$('world-save').addEventListener('click',()=>saveWorld(false)
 .catch(e=>updateWorldStatus('儲存失敗：'+String(e.message||e),true)));
$('world-load').addEventListener('click',async()=>{
 try{
  const id=$('world-saved').value;
  if(!id)throw Error('請選擇曾儲存的世界場景');
  const loaded=await library.get(id,{includePayload:true});
  if(!loaded?.blob)throw Error('檔案已遺失');
  const document=JSON.parse(await loaded.blob.text());
  assertAIG20Document(document);
  await resolveAIG20WorldSources(document,library);
  worldDoc=document;
  invalidateAIG22Storyboard('載入另一份場景，劇情來源須重新核對');
  $('world-title').value=document.title;
  $('world-mode').value=document.coordinateMode;
  $('world-map').value=document.mapRef?.assetId??'';
  if(document.mapRef)await selectedMapRef();
  else drawAIG20Map(null);
  stopWorldPlayback();worldEvidence();
  updateWorldStatus('已從外部素材庫讀取 '+document.title+
   '；尚未重新載入 GPU。按「合成真正的 3D 世界並顯示」。');
 }catch(e){updateWorldStatus('讀取失敗：'+String(e.message||e),true)}
});
$('world-key-add').addEventListener('click',async()=>{
 try{
  if(!worldDoc)throw Error('先建立場景文件並加入來源');
  const time=Number($('world-time').value);
  const cameraPosition=triple($('world-camera-position').value),
   target=triple($('world-camera-target').value);
  const next=addAIG20CameraKey(worldDoc,{
   keyId:'camera-'+(worldDoc.cameraKeys.length+1),
   timeSeconds:time,position:cameraPosition,target,
   easing:$('world-ease').value
  });
  if(worldRuntime?.scene)worldRuntime.updateCameraTrack(next);
  worldDoc=next;worldEvidence();
  invalidateAIG22Storyboard('已修改鏡頭來源，請重新編譯劇本');
  updateWorldStatus('鏡頭關鍵影格已加入，可拖動時間軸預覽。已載入模型無需再次上傳 GPU。');
  try{await saveWorld(true)}catch(e){
   updateWorldStatus('鏡頭已加入，但自動儲存受限：'+String(e.message||e),true)
  }
 }catch(e){updateWorldStatus('BLOCKED：'+String(e.message||e),true)}
});
$('world-scrub').addEventListener('input',()=>{
 try{
  if(!worldRuntime?.scene)throw Error('先合成世界場景');
  const result=worldRuntime.applyCamera(Number($('world-scrub').value));
  updateWorldStatus(result?'正在預覽真實相機軌跡 '+Number($('world-scrub').value).toFixed(1)+' 秒':
   '此場景尚未加入鏡頭影格。');
 }catch(e){updateWorldStatus('轉場尚不可播放：'+String(e.message||e),true)}
});

// Real3D 2.5 — film is created by the SAME WebGL world renderer.
// Never use 6.5 flat-image parallax/zoom as 3D or fabricate unseen GLB clips.
let movie25Session=null,movie25Busy=false,movie25DownloadUrl=null;
let movie25LastOutput=null,movie25DisabledSnapshot=null;
const movie25LockIds=[
 'world-new','world-add','world-preview','world-key-add',
 'world-load','world-align','scene-load','scene-unload','scene-clear',
 'story-compile','story-play','story-stop','story-load',
 'story-save','world-play','world-pause','photo23-build'
];
function lockMovie25(locked){
 if(locked){
  movie25DisabledSnapshot=new Map(movie25LockIds.map(id=>[id,$(id)?.disabled]));
  for(const id of movie25LockIds){const el=$(id);if(el)el.disabled=true}
  $('movie25-record').disabled=true;
  $('movie25-stop').disabled=false;
 }else{
  for(const [id,wasDisabled] of movie25DisabledSnapshot||[])
   if($(id))$(id).disabled=wasDisabled;
  movie25DisabledSnapshot=null;
  $('movie25-record').disabled=false;
  $('movie25-stop').disabled=true;
 }
}
const film25Status=(message,error=false)=>{
 $('movie25-status').textContent=message;
 $('movie25-status').style.color=error?'#efc18a':'#98e8dd';
};
async function finishMovie25({cancel=false,reason=''}={}){
 const session=movie25Session;
 if(!session)return;
 movie25Session=null;
 if(viewer?.onFrame===session.frameHook)viewer.onFrame=session.oldOnFrame;
 if(viewer?.onAfterRender===session.afterHook)
  viewer.onAfterRender=session.oldAfterRender;
 try{session.player.stop()}catch{}
 try{if(viewer?.movieMode)viewer.endMovie1080p()}catch{}
 if(cancel){
  session.recorder.abort(Error(reason||'USER_CANCELLED'));
  film25Status('本次錄影已取消。原始 GLB、劇本與上一份成功的影片均保留。');
  movie25Busy=false;loading=false;lockMovie25(false);return;
 }
 try{
  const output=await session.recorder.stop();
  // Source manifest remains immutable across any onFrame callbacks.
  if(worldRuntime?.scene)
   verifyAIG22Story(session.plan,worldRuntime.scene,
    worldRuntime.listSourceActorClips());
  // A correct EBML/MP4 magic is necessary but not sufficient.
  // Decode a TRUE first video frame before replacing the last good film.
  const decoded=await verifyAIG25DecodedFrame(output.blob);
  output.evidence.browserDecodedFrameVerified=true;
  output.evidence.decodedFrameResolution=[
   decoded.actualVideoWidth,decoded.actualVideoHeight];
  output.evidence.localVaultVideoRoundtripVerified=false;
  const url=URL.createObjectURL(output.blob);
  const old=movie25DownloadUrl;movie25DownloadUrl=url;
  const a=$('movie25-download');
  a.href=url;a.download=output.filename;a.hidden=false;
  movie25LastOutput=output;
  if(old)URL.revokeObjectURL(old);
  $('movie25-proof').textContent=JSON.stringify(output.evidence,null,2);
  film25Status('已實際錄製 '+output.evidence.actualFramesComposited+
   ' 幀真 WebGL 3D 畫面，已編碼並解碼確認 '+output.evidence.containerExtension+
   '，大小 '+mib(output.blob.size)+'。字幕已燒入影片，沒有假人物影像。');
  try{
   const saved=await library.importBlob(output.blob,{
    category:'animation',title:'Real3D 2.5 來源世界 1080p 真 3D 電影',
    tags:['Real3D25','來源3D','世界場景','影片','真骨架'],
    source:'GENERATED_DERIVED',modelAccuracy:'NOT_VERIFIED',
    coordinateUnits:'UNKNOWN',derivedFrom:session.plan.sceneId
   });
   const reopened=await library.get(saved.id,{includePayload:true});
   if(!reopened?.blob||reopened.asset?.sha256!==saved.sha256||
    reopened.blob.size!==output.blob.size||
    reopened.blob.type!==output.blob.type)
    throw Error('AIG25_VAULT_VIDEO_SHA_ROUNDTRIP_INVALID');
   // The existing 7.16 IndexedDB vault verified the actual encoded Blob SHA
   // after reopening. This is not a claim of cloud sync or Android file IO.
   output.evidence.localVaultVideoRoundtripVerified=true;
   output.evidence.localVaultAssetId=saved.id;
   output.evidence.localVaultSHA256=saved.sha256;
   $('movie25-proof').textContent=JSON.stringify(output.evidence,null,2);
   film25Status($('movie25-status').textContent+
    '；影片已獨立保存本機素材庫 '+saved.id+'（SHA 回讀通過）。');
  }catch(saveError){
   film25Status($('movie25-status').textContent+
    '；外部素材庫未保存（可能超過 64 MiB）：'+
    String(saveError.message||saveError)+
    '。影片下載連結仍保留。',true);
  }
 }catch(error){
  film25Status('影片錄製失敗：'+String(error.message||error)+
   '。不改動原來源；之前成功影片仍可下載。',true);
 }finally{
  movie25Busy=false;loading=false;lockMovie25(false);
 }
}
$('movie25-record').addEventListener('click',()=>{
 if(movie25Busy)return;
 let record=null,frameHook=null,afterHook=null,movie25ViewportAcquired=false;
 try{
  if(loading||worldBuildMutation||!viewer||!worldRuntime?.scene||
   !story22Plan?.ready||!worldDoc)
   throw Error('請先建立真正的 3D 世界並完成中文劇情編譯');
  if(worldDoc.id!==worldRuntime.scene.id||
   worldDoc.revision!==worldRuntime.scene.revision||
   JSON.stringify(worldDoc.objects)!==JSON.stringify(worldRuntime.scene.objects)||
   JSON.stringify(worldDoc.cameraKeys)!==
    JSON.stringify(worldRuntime.scene.cameraKeys))
   throw Error('編輯中的世界與 GPU 實際場景不同；請先重新合成預覽');
  if(viewer.movieMode||viewer.onFrame||viewer.onAfterRender||
   viewer.reviewBusy||worldPlaying)
   throw Error('3D 工作視窗／劇情播放已占用，停止後才可錄影');
  const proof=validateAIG25TrueWorldMovie({
   plan:story22Plan,scene:worldRuntime.scene,
   actors:worldRuntime.listSourceActorClips(),viewer
  });
  movie25Busy=true;loading=true;lockMovie25(true);
  const viewport=viewer.beginMovie1080p();
  movie25ViewportAcquired=true;
  if(viewport.actualCanvasWidth!==1920||
   viewport.actualCanvasHeight!==1080)
   throw Error('實際 WebGL 畫布未達 1920×1080');
  record=new AIG25WorldMovieRecorder({
   onState:data=>{
    if(data.state==='FAILED'&&movie25Session)
     void finishMovie25({cancel:true,reason:data.message});
   }
  });
  record.begin({sourceCanvas:viewer.canvas,proof});
  const session={
   recordStart:performance.now(),oldOnFrame:viewer.onFrame,
   oldAfterRender:viewer.onAfterRender,plan:story22Plan,
   recorder:record,player:null,subtitle:'',subtitleUntil:0,
   readyToFinish:false,frameHook:null,afterHook:null
  };
  session.player=new AIG22StoryPlayer({
   worldRuntime,onEvent:e=>{
    if(e.type==='SUBTITLE'){
     session.subtitle=e.text;
     session.subtitleUntil=e.timeSeconds+e.durationSeconds;
    }
   },onEnd:()=>{session.readyToFinish=true}
  });
  frameHook=(dt,t)=>{
   session.oldOnFrame?.(dt,t);
   const result=session.player.advance(dt);
   if(session.subtitle&&result.elapsedSeconds>=session.subtitleUntil)
    session.subtitle='';
  };
  afterHook=t=>{
   session.oldAfterRender?.(t);
   session.recorder.draw(t,session.subtitle);
   if(session.readyToFinish)void finishMovie25();
  };
  session.frameHook=frameHook;session.afterHook=afterHook;
  movie25Session=session;
  viewer.onFrame=frameHook;viewer.onAfterRender=afterHook;
  session.player.start(story22Plan);
  film25Status('正在從唯一 WebGL 世界渲染並錄製真 3D 電影：'+
   story22Plan.durationSeconds.toFixed(2)+
   ' 秒，1080p／目標 30 FPS；來源動作與字幕按真時間軸播放。');
 }catch(error){
  if(movie25Session){
   void finishMovie25({cancel:true,reason:String(error.message||error)});
  }else{
   record?.abort(error);
   if(viewer?.onFrame===frameHook)viewer.onFrame=null;
   if(viewer?.onAfterRender===afterHook)viewer.onAfterRender=null;
   // Do not end a *different* owner's running movie on a blocked start.
   try{if(movie25ViewportAcquired&&viewer?.movieMode)viewer.endMovie1080p()}catch{}
   if(movie25Busy){movie25Busy=false;loading=false;lockMovie25(false)}
  }
  film25Status('BLOCKED：'+String(error.message||error)+
   '。不會以照片運鏡取代真 3D。',true);
 }
});
$('movie25-stop').addEventListener('click',()=>{
 void finishMovie25({cancel:true,reason:'USER_CANCELLED'});
});
function showAIG22Plan(plan){
 $('story-proof').textContent=plan?JSON.stringify({
  status:plan.status,ready:plan.ready,sourceScene:plan.sceneId,
  revision:plan.sceneRevision,events:plan.events,
  missing:plan.blocked,seconds:plan.durationSeconds,
  generatedMotion:false,generatedVoice:false,
  originalAssetsModified:false
 },null,2):'沒有來源已驗證的可播放劇本';
 $('story-play').disabled=!plan?.ready;
 $('story-save').disabled=!plan?.ready;
}
function stopAIG22Storyboard(reason='劇情已停止，原模型未清空'){
 if(story22Player){
  if(worldRuntime?.scene)for(const a of worldRuntime.listSourceActorClips())
   try{worldRuntime.pauseSourceActor(a.nodeId,true)}catch{}
  story22Player.stop();story22Player=null;
 }
 if(viewer&&story22FrameHook&&viewer.onFrame===story22FrameHook)
  viewer.onFrame=story22PriorFrame;
 story22FrameHook=null;story22PriorFrame=null;
 $('story-status').textContent=reason;
}
function invalidateAIG22Storyboard(reason){
 stopAIG22Storyboard(reason);
 story22Plan=null;showAIG22Plan(null);
}
$('story-compile').addEventListener('click',()=>{
 try{
  if(!worldRuntime?.scene||!worldDoc)
   throw Error('請先載入真正包含原始人物 GLB 的世界場景');
  const plan=compileAIG22Story($('story-text').value,{
   scene:worldRuntime.scene,actors:worldRuntime.listSourceActorClips()
  });
  story22Plan=plan;showAIG22Plan(plan);
  $('story-status').textContent=plan.ready?
   '已解析 '+plan.events.length+' 個真正來源時間軸事件，可播放。'+
   '字幕只有文字，人物動作只有 GLB 內已有 Clip。':
   'BLOCKED：'+plan.blocked.map(x=>'第'+(x.line||'?')+
    '行 '+x.reason).join('；')+'。沒有產生假動畫。';
 }catch(e){
  story22Plan=null;showAIG22Plan(null);
  $('story-status').textContent='BLOCKED：'+String(e.message||e);
 }
});
$('story-play').addEventListener('click',()=>{
 try{
  if(!story22Plan?.ready||!worldRuntime?.scene||!viewer)
   throw Error('請先完成有真來源動作的劇本驗證');
  if(loading||viewer.movieMode||viewer.reviewBusy||viewer.onFrame)
   throw Error('目前工作頁正在載入／錄影／占用影格回呼，禁止搶用時間軸');
  verifyAIG22Story(story22Plan,worldRuntime.scene,
   worldRuntime.listSourceActorClips());
  stopWorldPlayback();
  stopAIG22Storyboard('準備新劇本');
  // Durable proof of a source-GLB cue actually dispatched, rather than
  // a transient "開始播放" string overwritten by the next animation frame.
  $('story-status').dataset.actualSourceClipPlayed='false';
  $('story-status').dataset.actualSourceClipName='';
  story22Player=new AIG22StoryPlayer({
   worldRuntime,onEvent:e=>{
    if(e.type==='ACTOR_SOURCE_CLIP'){
     $('story-status').dataset.actualSourceClipPlayed='true';
     $('story-status').dataset.actualSourceClipName=e.clipName;
    }
    $('story-status').textContent='執行第 '+e.line+' 行：'+e.type+
     (e.nodeId?' '+e.nodeId+'／'+e.clipName:'');
    if(e.type==='SUBTITLE')$('story-subtitle').textContent=e.text;
   },onEnd:()=>{
    $('story-status').textContent='已依原始 GLB Clip／已設定鏡頭／文字字幕完成劇本。';
    stopAIG22Storyboard('劇情已完成；模型、鏡頭與來源保留。');
   }
  });
  story22PriorFrame=viewer.onFrame;
  story22FrameHook=(dt,t)=>{
   story22PriorFrame?.(dt,t);
   story22Player?.advance(dt);
  };
  viewer.onFrame=story22FrameHook;
  $('story-subtitle').textContent='來源劇情正在播放（沒有合成語音）';
  const result=story22Player.start(story22Plan);
  $('story-status').textContent='開始播放 '+result.events+
   ' 個真來源時間軸事件，沿用同一個 GLB 世界視窗。';
 }catch(e){
  stopAIG22Storyboard('BLOCKED：'+String(e.message||e));
 }
});
$('story-stop').addEventListener('click',()=>stopAIG22Storyboard());
$('story-save').addEventListener('click',async()=>{
 try{
  if(!story22Plan?.ready)throw Error('只有來源已確認的劇本可入庫');
  verifyAIG22Story(story22Plan,worldRuntime.scene,
   worldRuntime.listSourceActorClips());
  const blob=new Blob([JSON.stringify(story22Plan,null,2)],{
   type:'application/json'});
  const item=await library.importBlob(blob,{
   category:'animation',title:'FastModel 2.2 劇情／動作／鏡頭時間軸',
   tags:['story22','劇情','來源動畫','鏡頭','字幕'],
   source:'GENERATED_DERIVED',modelAccuracy:'NOT_VERIFIED',
   coordinateUnits:'UNKNOWN',derivedFrom:story22Plan.sceneId
  });
  await refreshWorldAssets();
  $('story-status').textContent='已另存劇本 '+item.id+
   ' 到主程式外素材庫。GLB、角色圖與場景原始來源未被改寫。';
 }catch(e){$('story-status').textContent='劇本尚未保存：'+String(e.message||e)}
});
$('story-load').addEventListener('click',async()=>{
 try{
  const id=$('story-saved').value;
  if(!id||!worldRuntime?.scene)throw Error('請先開啟對應的原始世界場景及已保存劇本');
  const got=await library.get(id,{includePayload:true});
  if(!got?.blob||got.asset?.mime!=='application/json')
   throw Error('劇本原始資料不存在');
  const plan=JSON.parse(await got.blob.text());
  verifyAIG22Story(plan,worldRuntime.scene,
   worldRuntime.listSourceActorClips());
  stopAIG22Storyboard('載入原始劇本來源');
  story22Plan=plan;$('story-text').value=plan.sourceText;
  showAIG22Plan(plan);
  $('story-status').textContent='已核對世界來源 SHA、revision 和 GLB 動作，'+
   '此劇本可播放；未重新產生人物模型。';
 }catch(e){$('story-status').textContent='BLOCKED：'+String(e.message||e)+
  '。不清空正在使用的模型或既有劇本。'}
});
$('world-play').addEventListener('click',()=>{
 if(!worldRuntime?.scene||worldDoc?.cameraKeys.length<2){
  updateWorldStatus('至少要有兩個鏡頭關鍵格，且已載入來源模型。',true);
  return;
 }
 stopWorldPlayback();worldPlaying=true;
 const length=worldDoc.cameraKeys.at(-1).timeSeconds;
 worldPlaybackStart=performance.now()-
  Number($('world-scrub').value)*1000;
 const tick=now=>{
  if(!worldPlaying)return;
  const seconds=Math.min(length,Math.max(0,(now-worldPlaybackStart)/1000));
  try{worldRuntime.applyCamera(seconds);
   $('world-scrub').value=String(seconds);
   if(seconds>=length){stopWorldPlayback();return}
  }catch(e){stopWorldPlayback();updateWorldStatus(String(e),true);return}
  worldFrame=requestAnimationFrame(tick);
 };
 worldFrame=requestAnimationFrame(tick);
 updateWorldStatus('正在以同一個 3D 場景播放鏡頭轉場；沒有複製模型或建立第二個 Renderer。');
});
$('world-pause').addEventListener('click',()=>{
 stopWorldPlayback();updateWorldStatus('已停止鏡頭轉場。來源與場景保留。');
});
window.addEventListener('pagehide',()=>{
 aigStage1BaseAdults?.stop?.();
 if(movie25Session)void finishMovie25({cancel:true,reason:'PAGE_CLOSED'});
 if(movie25DownloadUrl){URL.revokeObjectURL(movie25DownloadUrl);movie25DownloadUrl=null}
 stopAIG22Storyboard('工作頁已關閉');
 closed=true;stopWorldPlayback();worldRuntime?.close();
 viewer?.renderer?.setAnimationLoop(null);
 try{viewer?.unloadCurrent()}catch{}
 viewer?.resize?.disconnect();viewer?.controls?.dispose();
 viewer?.env?.dispose();viewer?.renderer?.dispose();
 library?.close();
},{once:true});
const aig26Source=installAIG26VisionPanel({getLibrary:()=>library});
const aig27Source=installAIG27SegmentationPanel({
 getSourceState:()=>aig26Source,getLibrary:()=>library
});
const aig28Learner=installAIG28LocalLearning({
 getImage:()=>aig26Source,
 getSegmentation:()=>aig27Source,
 getLibrary:()=>library
});
installAIG28BMultiSource({
 getImage:()=>aig26Source,
 getSegmentation:()=>aig27Source,
 getLearner:()=>aig28Learner
});
let aig31Body=null;
const aig30Scan=installAIG29ContinuousScan({
 getImage:()=>aig26Source,
 getSegmentation:()=>aig27Source,
 getSharedViewer:async()=>{await ensureWorldViewer();return viewer},
 getBodyPose:()=>aig31Body?.pose??null
});
let aig32Digits=null;
aig31Body=installAIG31HeadBodyControls({
 getFusedScan:()=>aig30Scan,
 onPoseApplied:(actualPose)=>{
  // The actual posed body drives attached garment mesh vertices.
  // Garment sync failure must not stop the existing 3.1 joints or fingers.
  try{aig30Scan.applyBodyPose(actualPose)}
  catch(e){$('scan37-status').textContent=
   '服裝跟隨骨架暫未通過：'+String(e?.message||e)+
   '；人體模型與來源保留。'}
  aig32Digits?.refreshFromHeadBodyPose();
 }
});
const aig34Photo=installAIG34PhotoDigitPanel({
 getPhoto:()=>aig26Source,
 getSegmentation:()=>aig27Source,
 onApplied:()=>aig32Digits?.refreshFromPhotoContours()
});
aig32Digits=installAIG32DigitControls({
 getFusedScan:()=>aig30Scan,
 getBodyPose:()=>aig31Body.pose,
 getOriginalPhoto:()=>aig26Source,
 getPhotoDigitConstraints:()=>aig34Photo.active
});
aigStage1BaseAdults=installAIGStage1DualAdultRuntime({
 getSharedViewer:async()=>{
  await ensureWorldViewer();
  return viewer;
 }
});
aig313Classroom=installAIG313ClassroomCapacity({
 getFusedScan:()=>aig30Scan,
 getViewer:()=>viewer,
 getCharacterSourceAssets:async()=>library?
  (await library.list({limit:1000})).filter(a=>
   a.category==='character'&&a.mime==='model/gltf-binary'):[],
 getLoadedWorldCharacterCount:()=>worldRuntime?.scene?
  worldRuntime.scene.objects.filter(a=>a.category==='character').length:0
});
init();
