import {PhotoViewer} from './viewer.mjs';
import {openAIG716AssetLibrary} from './aig-external-asset-library-7-16.mjs';
import {AIG19SceneRuntime} from './aig-scene-lifecycle-1-9.mjs';
import {createAIG20WorldScene,addAIG20WorldObject,addAIG20CameraKey,
 assertAIG20Document,resolveAIG20WorldSources} from './aig-world-scene-2-0.mjs';
import {AIG20WorldRuntime} from './aig-world-runtime-2-0.mjs';
const $=id=>document.getElementById(id);
let library=null,viewer=null,runtime=null,closed=false,loading=false;
let worldRuntime=null,worldDoc=null,worldMetas=new Map(),worldSaved=[];
let worldFrame=0,worldPlaying=false,worldPlaybackStart=0;
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
   worldRuntime?.close();worldRuntime=null;stopWorldPlayback();
  }
  report();
 }catch(error){
  say('BLOCKED：+String(error.message||error)+
   '；已保留上一個可用場景及本機原始素材。',true);report();
 }finally{loading=false;$('scene-load').disabled=false}
});
$('scene-unload').addEventListener('click',async()=>{
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
}
async function selectedMapRef(){
 const id=$('world-map').value;
 if(!id)return null;
 const m=worldMetas.get(id);
 if(!m)throw Error('地圖資產索引已更新，請重新整理');
 const loaded=await library.get(id,{includePayload:true});
 if(!loaded?.blob||loaded.asset?.sha256!==m.sha256)
  throw Error('地圖來源 SHA 不符');
 if(loaded.blob.size>8*1024*1024)throw Error('地圖檔太大');
 const map=JSON.parse(await loaded.blob.text());
 if(map.schema!=='AIG_FASTMODEL_7_12_SOURCE_SCENE_MAP_DATA'||
  !['LOCAL_RELATIVE','MEASURED_LOCAL_METERS','WGS84_APPROX_LOCAL_METERS']
   .includes(map.coordinateMode))
  throw Error('必須使用經 7.12 來源記錄的場景地圖，不能拿一般 JSON 冒充地圖');
 // FastModel 7.12 used the suffix METERS while the 2.0 composer uses
 // METRES; normalize names WITHOUT changing the underlying source.
 const original=map.coordinateMode;
 const coordinateMode=original.replace('METERS','METRES');
 if(coordinateMode!==$('world-mode').value)
  throw Error('地圖與世界的相對／實測／WGS84 座標模式不一致');
 return {assetId:id,sha256:m.sha256,coordinateMode};
}
function beginNewWorld(mapRef=null){
 worldDoc=createAIG20WorldScene({
  id:'world-'+crypto.randomUUID(),
  title:$('world-title').value.trim()||'新場景',
  coordinateMode:$('world-mode').value,mapRef
 });
 stopWorldPlayback();worldEvidence();
 return worldDoc;
}
$('world-new').addEventListener('click',()=>{
 try{beginNewWorld();updateWorldStatus('已建立新的空白場景文件；已存外部來源完全保留。')}
 catch(e){updateWorldStatus('BLOCKED：'+String(e.message||e),true)}
});
$('world-add').addEventListener('click',async()=>{
 try{
  if(loading)throw Error('前次場景載入尚未結束');
  const sourceId=$('world-asset').value;
  const source=worldMetas.get(sourceId);
  if(!source||source.mime!=='model/gltf-binary')
   throw Error('請選擇真實 GLB 人物／建築／環境');
  const mapRef=await selectedMapRef();
  if(!worldDoc)beginNewWorld(mapRef);
  if(worldDoc.coordinateMode!==$('world-mode').value||
   JSON.stringify(worldDoc.mapRef)!==JSON.stringify(mapRef))
   throw Error('地圖或座標系已更改。請先按「建立新場景」；不覆蓋既有來源');
  const scale=Number($('world-scale').value),
   pos=['world-x','world-y','world-z'].map(k=>Number($(k).value));
  if(!Number.isFinite(scale)||pos.some(x=>!Number.isFinite(x)))
   throw Error('模型比例與位置必須是實際數值');
  worldDoc=addAIG20WorldObject(worldDoc,{
   nodeId:'node-'+(worldDoc.objects.length+1),assetId:sourceId,
   sourceSha256:source.sha256,category:source.category,
   position:pos,scale:[scale,scale,scale],
   physicalScaleReviewed:$('world-metric-reviewed').checked
  });
  updateWorldStatus('已加入 '+source.title+'：真正來源 GLB，沒有生成替身。');
  worldEvidence();
 }catch(e){updateWorldStatus('BLOCKED：'+String(e.message||e),true)}
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
$('world-preview').addEventListener('click',async()=>{
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
  $('world-title').value=document.title;
  $('world-mode').value=document.coordinateMode;
  $('world-map').value=document.mapRef?.assetId??'';
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
 closed=true;stopWorldPlayback();worldRuntime?.close();
 viewer?.renderer?.setAnimationLoop(null);
 try{viewer?.unloadCurrent()}catch{}
 viewer?.resize?.disconnect();viewer?.controls?.dispose();
 viewer?.env?.dispose();viewer?.renderer?.dispose();
 library?.close();
},{once:true});
init();
