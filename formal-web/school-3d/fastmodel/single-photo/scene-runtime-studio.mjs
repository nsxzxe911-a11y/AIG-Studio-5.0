import {PhotoViewer} from './viewer.mjs';
import {openAIG716AssetLibrary} from './aig-external-asset-library-7-16.mjs';
import {AIG19SceneRuntime} from './aig-scene-lifecycle-1-9.mjs';
import {createAIG20WorldScene,addAIG20WorldObject,addAIG20CameraKey,
 assertAIG20Document,resolveAIG20WorldSources} from './aig-world-scene-2-0.mjs';
import {AIG20WorldRuntime} from './aig-world-runtime-2-0.mjs';
import {importAIG712SceneMap} from './aig-scene-map-7-12.mjs';
import {listAIG21MapAnchors,alignAIG21ObjectToMap}
 from './aig-map-model-alignment-2-1.mjs';
const $=id=>document.getElementById(id);
let library=null,viewer=null,runtime=null,closed=false,loading=false;
let worldRuntime=null,worldDoc=null,worldMetas=new Map(),worldSaved=[];
let worldFrame=0,worldPlaying=false,worldPlaybackStart=0;
let worldMapSnapshot=null;
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
   worldRuntime?.close();worldRuntime=null;stopWorldPlayback();
  }
  report();
 }catch(error){
  say('BLOCKED：+String(error.message||error)+
   '；已保留上一個可用場景及本機原始素材。',true);report();
 }finally{loading=false;$('scene-load').disabled=false}
});
$('scene-unload').addEventListener('click',async()=>{
 if(worldRuntime?.scene){
  try{
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
async function selectedMapRef(){
 const id=$('world-map').value;
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
