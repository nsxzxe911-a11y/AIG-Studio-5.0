import {buildAIGReal3DGLBStatic} from './aig-real3d-glb-native-mesh.mjs';
import {createAIG3DRenderer} from './aig-real3d-webgl.mjs';
import {
 auditAIG3DSourceSilhouette,validateAIGInspectionCapturePlan,
 AIG_INSPECTION_FRAME_SCHEMA
}from './aig-real3d-render-inspection.mjs';
const $=id=>document.getElementById(id),gallery=$('gallery'),status=$('status');
const urlPool=new Set();
let running=false;
const SETUPS=[
 ['正面黑線輪廓','front','BLACK_CONTOUR'],
 ['正面咖啡色平塗','front','BROWN_FLAT'],
 ['正面體積漸層','front','BROWN_VOLUME'],
 ['正面低高光','front','BROWN_FINISH'],
 ['側面體積陰影','side','BROWN_VOLUME'],
 ['背面體積陰影','back','BROWN_VOLUME'],
 ['45度體積陰影','threeQuarter','BROWN_VOLUME']
];
function setStatus(s,ready=false){status.textContent=s;status.dataset.ready=String(ready);}
function release(){for(const u of urlPool)URL.revokeObjectURL(u);urlPool.clear();}
$('inspect').addEventListener('click',async()=>{
 if(running)return;
 const file=$('model-file').files?.[0],heightMm=Number($('body-height').value);
 if(!file||!file.name.toLowerCase().endsWith('.glb')){
  setStatus('BLOCK：請先選擇本機真 GLB 網格來源。');return;
 }
 if(!Number.isInteger(heightMm)||heightMm<900||heightMm>2200){
  setStatus('BLOCK：需輸入 900–2200 mm 的來源實測身高。');return;
 }
 running=true;$('inspect').disabled=true;release();gallery.replaceChildren();
 $('evidence').textContent='讀取 GLB 與實際三角形…';
 let renderer;
 try{
  const bytes=await file.arrayBuffer();
  if(bytes.byteLength>50_000_000||bytes.byteLength<64)
   throw Error('GLB_SIZE_BLOCK');
  const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))]
   .map(x=>x.toString(16).padStart(2,'0')).join('');
  const {scene,evidence}=buildAIGReal3DGLBStatic({
   bytes,heightMm,sourceName:file.name,sourceSha256:hash
  });
  const audit=auditAIG3DSourceSilhouette(scene);
  if(!evidence.renderGeometryPASS)throw Error('GLB_NATIVE_GEOMETRY_GATE_BLOCK');
  const canvas=$('native-webgl');
  renderer=createAIG3DRenderer(canvas,{quality:'balanced',
   pixelRatio:1,background:[.769,.745,.702,1]});
  if(renderer.status!=='READY')throw Error('WEBGL_DEVICE_UNAVAILABLE');
  const proofs=[];
  for(let i=0;i<SETUPS.length;i++){
   const [label,angle,mode]=SETUPS[i];
   const spec=validateAIGInspectionCapturePlan({
    heightMeters:heightMm/1000,angle,mode:'ALBEDO'
   });
   renderer.setCamera(spec.camera);
   renderer.setInspectionMode(mode);
   const png=await renderer.captureNativePNG(scene,{
    width:1080,height:1920
   });
   const href=URL.createObjectURL(png.blob);urlPool.add(href);
   const fig=document.createElement('figure');
   const image=document.createElement('img');
   image.src=href;image.alt=label+' 原生 GPU 不可由炫光改變頂點';
   const caption=document.createElement('figcaption');
   const title=document.createElement('span');title.textContent=label;
   const download=document.createElement('a');
   download.textContent='下載真 PNG';
   download.download='AIG-Real3D-BROWN-'+angle+'-'+mode+'.png';
   download.href=href;
   caption.append(title,download);fig.append(image,caption);
   gallery.append(fig);
   proofs.push({mode,angle,width:1080,height:1920,sha256:png.sha256,
    sourceTriangleCount:evidence.actualTriangles});
   setStatus('真正 GPU 渲染 '+(i+1)+' / '+SETUPS.length+' 頁…');
  }
  const unchanged=auditAIG3DSourceSilhouette(scene);
  if(JSON.stringify(audit)!==JSON.stringify(unchanged))
   throw Error('SOURCE_GEOMETRY_CHANGED_DURING_RENDER');
  const result={
   schema:AIG_INSPECTION_FRAME_SCHEMA,
   userSourceName:file.name,sourceSha256:hash,
   measuredHeightMm:heightMm,
   geometry:audit,originalGLB:evidence,
   sevenRealBrownGPUPasses:proofs,
   sharedWebGLBloomPresent:false,baseSourceUnchanged:true,
   brownFullBodyColorOverrideApplied:true,
   blackOutlineCreatedInGPUFromSubjectMask:true,
   realHumanAppearanceApproved:false,
   geometricFatnessAttributableToGlow:false,
   noAuthenticHumanSilhouetteReferenceProvided:true,
   humanNaturalAppearanceApproved:false,
   stage1ReleasePASS:false
  };
  $('evidence').textContent=JSON.stringify(result,null,2);
  setStatus('7 張黑線與咖啡色真 GPU 圖已產出；使用來源網格，無假人補形，外觀自然度仍待真人來源驗證。',true);
 }catch(e){
  setStatus('BLOCK：'+(e?.message||String(e)));
  $('evidence').textContent='檢查未通過；已顯示的圖片不得作為完整證據。';
 }finally{
  renderer?.destroy?.();running=false;$('inspect').disabled=false;
 }
});
window.addEventListener('pagehide',release);
