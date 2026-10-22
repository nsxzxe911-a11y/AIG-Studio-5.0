import {PhotoViewer} from './viewer.mjs';
import {openAIG716AssetLibrary} from './aig-external-asset-library-7-16.mjs';
import {AIG19SceneRuntime} from './aig-scene-lifecycle-1-9.mjs';
const $=id=>document.getElementById(id);
let library=null,viewer=null,runtime=null,closed=false,loading=false;
const say=(message,bad=false)=>{
 $('status').textContent=message;$('status').dataset.error=bad?'true':'false';
};
const mib=n=>(n/(1024*1024)).toFixed(2)+' MiB';
async function init(){
 try{
  library=await openAIG716AssetLibrary();
  await refresh();
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
  if(result.status==='ACTIVE_SOURCE_BOUND_GPU_SCENE'){
   say('已開啟 '+result.asset.title+
    '。上一個模型的 GPU 資源已釋放；'+
    (result.asset.reviewStatus==='approved'?'此模型已審核。':
     '此模型尚未核准，只能作工作預覽。'));
  }else say('本次載入被較新的場景請求取代，不覆蓋目前模型。');
  report();
 }catch(error){
  say('BLOCKED：'+String(error.message||error)+
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
$('scene-refresh').addEventListener('click',()=>refresh().catch(e=>say(String(e),true)));
window.addEventListener('pagehide',()=>{
 closed=true;
 viewer?.renderer?.setAnimationLoop(null);
 try{viewer?.unloadCurrent()}catch{}
 viewer?.resize?.disconnect();viewer?.controls?.dispose();
 viewer?.env?.dispose();viewer?.renderer?.dispose();
 library?.close();
},{once:true});
init();
