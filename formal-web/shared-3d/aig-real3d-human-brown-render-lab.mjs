import {buildAIGReal3DGLBStatic} from './aig-real3d-glb-native-mesh.mjs';
import {buildAIGReal3DScanNative} from './aig-real3d-scan-native-mesh.mjs';
import {buildAIGReal3DSourceReview,validateAIGReal3DLandmarkSidecar} from './aig-real3d-source-review-gate.mjs';
import {compareAIGReal3DReferencePNGs} from './aig-real3d-reference-silhouette-browser.mjs';
import {evaluateAIGReal3DFourViewComparisons} from './aig-real3d-reference-silhouette.mjs';
import {createAIG3DRenderer} from './aig-real3d-webgl.mjs';
import {
 auditAIG3DSourceSilhouette,validateAIGInspectionCapturePlan,
 AIG_INSPECTION_FRAME_SCHEMA
}from './aig-real3d-render-inspection.mjs';
const $=id=>document.getElementById(id),gallery=$('gallery'),status=$('status');
const urlPool=new Set();
let running=false,report=null;
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
 const file=$('model-file').files?.[0];
 const inputHeight=$('body-height').value.trim();
 const heightMm=inputHeight===''?NaN:Number(inputHeight);
 if(!file||!/.(glb|obj)$/i.test(file.name)){
  setStatus('BLOCK：請先選擇本機原始 OBJ／GLB 網格來源。');return;
 }
 if(!Number.isInteger(heightMm)||heightMm<900||heightMm>2200){
  setStatus('BLOCK：需輸入 900–2200 mm 的來源實測身高。');return;
 }
 running=true;$('inspect').disabled=true;$('report-download').disabled=true;report=null;
 release();gallery.replaceChildren();$('reference-gallery').replaceChildren();
 $('reference-stats').textContent='尚未比對四方向透明輪廓；自然人體外觀 BLOCK。';
 $('evidence').textContent='讀取 GLB 與實際三角形…';
 let renderer;
 try{
  const bytes=await file.arrayBuffer();
  if(bytes.byteLength>50_000_000||bytes.byteLength<64)
   throw Error('GLB_SIZE_BLOCK');
  const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))]
   .map(x=>x.toString(16).padStart(2,'0')).join('');
  const isOBJ=/.obj$/i.test(file.name);
  const axis=$('up-axis').value;
  if(!isOBJ&&axis!=='Y')throw Error('GLB 格式目前僅支援 Y-Up；Z-Up 必須使用 OBJ 來源');
  const sidecar=$('landmark-file').files?.[0];
  let landmarks=null;
  if(sidecar){
   if(sidecar.size>40000||!sidecar.name.toLowerCase().endsWith('.json'))
    throw Error('解剖標記 JSON 大小／格式不符');
   try{landmarks=JSON.parse(await sidecar.text());}
   catch{throw Error('解剖標記 JSON 無法解析');}
   validateAIGReal3DLandmarkSidecar(landmarks);
  }
  const {scene,evidence}=isOBJ?buildAIGReal3DScanNative({
    objText:new TextDecoder('utf-8',{fatal:true}).decode(bytes),
    heightMm,upAxis:axis,landmarks,sourceName:file.name,sourceSha256:hash
  }):buildAIGReal3DGLBStatic({
    bytes,heightMm,sourceName:file.name,sourceSha256:hash
  });
  const audit=auditAIG3DSourceSilhouette(scene);
  if(!(isOBJ?evidence.geometryPASS:evidence.renderGeometryPASS))
   throw Error('原始幾何 Gate BLOCK：'+JSON.stringify(evidence.geometricErrors??evidence));
  const canvas=$('native-webgl');
  renderer=createAIG3DRenderer(canvas,{quality:'balanced',
   pixelRatio:1,background:[.769,.745,.702,1]});
  if(renderer.status!=='READY')throw Error('WEBGL_DEVICE_UNAVAILABLE');
  const proofs=[],sourceFrames=new Map();
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
   if((angle==='front'&&mode==='BROWN_FLAT')||
     (angle!=='front'&&mode==='BROWN_VOLUME')){
    sourceFrames.set(angle,png.blob);
   }
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
  const sourceReview=buildAIGReal3DSourceReview({
   sourceName:file.name,sourceSha256:hash,sourceBytes:bytes.byteLength,
   heightMm,upAxis:axis,evidence,
   landmarkSidecar:landmarks,
   declaredOrigin:$('source-origin').value,
   declaredMethod:$('capture-method').value,
   userClaimsAuthorized:$('source-rights').checked,
   captureProofs:proofs.filter(p=>p.mode==='BROWN_VOLUME'||p.mode==='BROWN_FINISH')
  });
  const silhouetteResults=[],silhouetteProblems=[];
  const selected=['front','side','back','threeQuarter'].filter(
   angle=>Boolean($('reference-'+angle).files?.[0]));
  for(const angle of selected){
   try{
    const referenceFile=$('reference-'+angle).files[0];
    if(!/\.png$/i.test(referenceFile.name))
     throw Error('必須選擇透明背景 PNG，不支援 JPG');
    const data=await compareAIGReal3DReferencePNGs({
     sourcePNG:sourceFrames.get(angle),referencePNG:referenceFile,
     angle,sourceSHA:hash
    });
    const href=URL.createObjectURL(data.overlayPNG);urlPool.add(href);
    const fig=document.createElement('figure'),img=document.createElement('img');
    img.src=href;img.alt=angle+'原始 GPU 人體輪廓與去背參考 PNG 差異';
    const cap=document.createElement('figcaption');
    const label=document.createElement('span');
    label.textContent=angle+' 重合 '+(data.diagnostic.intersectionOverUnion*100).toFixed(2)+'%';
    const link=document.createElement('a');
    link.download='AIG-Real3D-Reference-Difference-'+angle+'.png';
    link.href=href;link.textContent='下載輪廓差異圖';
    cap.append(label,link);fig.append(img,cap);
    $('reference-gallery').append(fig);
    silhouetteResults.push(data.diagnostic);
   }catch(e){silhouetteProblems.push({angle,error:e.message});}
  }
  const summary=evaluateAIGReal3DFourViewComparisons(silhouetteResults);
  $('reference-stats').textContent=selected.length===0?
   '尚未提供透明輪廓參考圖。GPU 渲染已完成，但沒有來源照片外型比對。':
   '已比對 '+summary.count+'/4 視角；平均重合率：'+
   (summary.averageIoU===null?'無法計算':(summary.averageIoU*100).toFixed(2)+'%')+
   '；失敗：'+silhouetteProblems.length+'；這不是人體自然度自動驗收。';
  report={...result,sourceReview,silhouetteComparison:{
   ...summary,images:silhouetteResults,errors:silhouetteProblems,
   transparentReferencesUploaded:selected.length,
   fourViewSilhouetteComparePASS:summary.allFourAnglesCompared&&
    summary.sourceSHAConsistent&&silhouetteProblems.length===0,
   anatomicalVisualApproval:false,personLikenessVerified:false
  }};
  $('evidence').textContent=JSON.stringify(report,null,2);
  $('report-download').disabled=false;
  setStatus('來源 '+file.name+' 完成 7 張真 GPU 圖；'+
   (sourceReview.readyForHumanReferenceReview?'已具備人工外觀核對前置資料。':
    '來源或人體標記仍有 Gate 缺口（請下載報告）。')+
   ' 自然人體／照片一比一仍 BLOCK。',true);
 }catch(e){
  setStatus('BLOCK：'+(e?.message||String(e)));
  $('evidence').textContent='檢查未通過；已顯示的圖片不得作為完整證據。';
 }finally{
  renderer?.destroy?.();running=false;$('inspect').disabled=false;
 }
});
window.addEventListener('pagehide',release);

$('report-download').addEventListener('click',()=>{
 if(!report)return;
 const blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json'});
 const u=URL.createObjectURL(blob);
 const a=document.createElement('a');
 a.href=u;a.download='AIG-Real3D-Source-Review-Report.json';
 document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(u),15000);
});
