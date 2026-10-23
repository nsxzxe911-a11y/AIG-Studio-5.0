/** Scan-native R&D gallery. Local files only; does not upload personal assets. */
import {buildAIGReal3DScanNative} from './aig-real3d-scan-native-mesh.mjs';
import {buildAIGReal3DGLBStatic} from './aig-real3d-glb-native-mesh.mjs';
import {createAIG3DRenderer} from './aig-real3d-webgl.mjs';
const $=id=>document.getElementById(id);
let renderer=null,locked=false;
const links=[];
try{renderer=createAIG3DRenderer($('source-canvas'));}
catch(e){$('status').textContent='GPU BLOCK：'+String(e.message||e);}
function status(msg,ready=false){
 $('status').textContent=msg;$('status').dataset.ready=String(ready);
}
function cleanup(){
 for(const u of links.splice(0))URL.revokeObjectURL(u);
 $('gallery').replaceChildren();
}
async function hash(buf){
 const dig=await crypto.subtle.digest('SHA-256',buf);
 return Array.from(new Uint8Array(dig),n=>n.toString(16).padStart(2,'0')).join('');
}
function viewCamera(heightMm,yaw){
 const H=heightMm/1000;
 renderer.setCamera({projection:'orthographic',yaw,pitch:0,
  focus:[0,H*.51,0],orthoSpan:H/.84,
  distance:Math.max(3,H*2.5),near:.01,far:20000});
}
async function snap(scene,heightMm,view){
 viewCamera(heightMm,view.yaw);
 const picture=await renderer.captureNativePNG(scene,{width:1080,height:1920});
 const url=URL.createObjectURL(picture.blob);
 links.push(url);
 const fig=document.createElement('figure');
 const cap=document.createElement('figcaption');
 cap.textContent=view.label+'｜原生 WebGL（不代表外觀通過）';
 const img=document.createElement('img');
 img.src=url;img.alt=view.label+' 原始 OBJ 的真正 3D 投影';
 const a=document.createElement('a');
 a.href=url;a.download='AIG-Real3D-SCAN-'+view.id+'-'+picture.sha256.slice(0,12)+'.png';
 a.textContent='下載 '+view.label+' 真 GPU PNG';
 const foot=document.createElement('small');
 foot.textContent='1080×1920｜SHA256 '+picture.sha256;
 fig.append(cap,img,a,foot);$('gallery').append(fig);
 return {id:view.id,yawRadians:view.yaw,sha256:picture.sha256,
  realGpuReadback:picture.genuineGpuReadback,
  output:[picture.width,picture.height]};
}
$('load-source').addEventListener('click',async()=>{
 if(locked||!renderer||renderer.status!=='READY'){
  status('BLOCK：WebGL 未就緒或處理中');return;
 }
 locked=true;$('load-source').disabled=true;
 cleanup();
 let loaded=null;
 try{
  const obj=$('source-obj').files?.[0];
  if(!obj||!(/\.(obj|glb)$/i.test(obj.name))||
     obj.size>(obj.name.toLowerCase().endsWith('.glb')?50000000:14000000)||
     obj.size<30)
   throw Error('請提供本機 OBJ（14MB 內）或 GLB（50MB 內）來源');
  const heightMm=Number($('source-height').value);
  const bytes=await obj.arrayBuffer();
  const sha256=await hash(bytes);
  let landmarks=null;
  const meta=$('source-landmarks').files?.[0];
  if(meta){
   if(meta.size>80000||!meta.name.toLowerCase().endsWith('.json'))
    throw Error('解剖標記 JSON 超出規格');
   const decoded=JSON.parse(await meta.text());
   landmarks=decoded.landmarks??decoded;
  }
  status('檢查 OBJ 真頂點、面、單一連通體、開放邊、人體比例…');
  loaded=obj.name.toLowerCase().endsWith('.glb')?
   buildAIGReal3DGLBStatic({bytes,heightMm,sourceName:obj.name,
    sourceSha256:sha256}):
   buildAIGReal3DScanNative({
    objText:new TextDecoder('utf-8',{fatal:true}).decode(bytes),
    sourceName:obj.name,sourceSha256:sha256,heightMm,
    upAxis:$('up-axis').value,landmarks
   });
  $('proof').textContent=JSON.stringify(loaded.evidence,null,2);
  const pipelineOK=loaded.evidence.geometryPASS??loaded.evidence.renderGeometryPASS;
  if(!pipelineOK)
   throw Error('幾何 Gate BLOCK：'+
    (loaded.evidence.geometricErrors?.join(', ')||
     '模型三維尺度／退化面不符合基本渲染要求'));
  const views=[
   {id:'FRONT',label:'正面',yaw:Math.PI},
   {id:'SIDE',label:'側面',yaw:Math.PI/2},
   {id:'BACK',label:'背面',yaw:0},
   {id:'THREE_QUARTER',label:'斜側面',yaw:Math.PI*.75}
  ];
  const captures=[];
  for(const view of views){
   status('真 GPU 多視角：'+view.label);
   captures.push(await snap(loaded.scene,heightMm,view));
  }
  $('proof').textContent=JSON.stringify({
   ...loaded.evidence,captures,allFourNativeGPUPhotos:true,
   externalTextureNotLoaded:true,photoLikenessNotProven:true,
   userVisualApprovalRequired:true,stage1ReleasePASS:false
  },null,2);
  status('四面向 3D 網格快照完成；真實來源、臉部／手／腳、照片吻合與骨架驗收仍 BLOCK。',true);
 }catch(e){
  const evidence=loaded?.evidence??null;
  $('proof').textContent=JSON.stringify({evidence,errors:[String(e.message||e)],
   releasePASS:false},null,2);
  status('BLOCK：'+String(e.message||e));
 }finally{
  if(loaded&&renderer)for(const n of loaded.scene.nodes)
   renderer.releaseMesh(n.mesh);
  locked=false;$('load-source').disabled=false;
 }
});
window.addEventListener('pagehide',()=>{cleanup();renderer?.destroy?.();});
