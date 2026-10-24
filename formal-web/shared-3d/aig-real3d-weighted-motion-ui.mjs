/** Local, opt-in source-weighted motion preview; no autorig, no source writes. */
import {auditAIGReal3DDenseAnatomy} from './aig-real3d-dense-anatomy-review.mjs';
import {auditAIGReal3DDenseFiveDigitBranches} from './aig-real3d-dense-digit-branch-gate.mjs';
import {auditAIGReal3DFingerJointSurface} from './aig-real3d-native-finger-junction-gate.mjs';
import {createAIGReal3DWeightedFingerPose,buildAIGReal3DWeightedFingerGPUPreview}
 from './aig-real3d-weighted-motion-working-copy.mjs';
import {createAIG3DRenderer} from './aig-real3d-webgl.mjs';
import {validateAIGInspectionCapturePlan}
 from './aig-real3d-render-inspection.mjs';
export function mountAIGReal3DWeightedMotionControls({
 $,isBusy,setBusy,registerURL
}={}){
 let source=null,lastReport=null;
 const run=$('weighted-motion-run'),download=$('weighted-motion-download'),
  status=$('weighted-motion-status'),evidence=$('weighted-motion-evidence'),
  figure=$('weighted-motion-figure'),image=$('weighted-motion-image'),
  link=$('weighted-motion-png-download');
 const reset=()=>{
  source=null;lastReport=null;run.disabled=true;download.disabled=true;
  figure.hidden=true;link.hidden=true;
  evidence.textContent='尚未載入來源；不允許自動填補骨架與假人體。';
  status.textContent='BLOCK：需先完成本機原始高密度 OBJ 匯入。';
 };
 const load=value=>{
  reset();source=value;run.disabled=false;
  status.textContent='來源已鎖定。需原 3D 標記 JSON 和同 SHA 頂點權重 JSON 才能建立動作工作副本。';
 };
 run.addEventListener('click',async()=>{
  if(isBusy()){
   status.textContent='BLOCK：另一項 GPU 操作正在執行。';return;
  }
  if(!source||source.file!==$('model-file').files?.[0]||
   Number($('body-height').value)!==source.heightMm||
   $('up-axis').value!==source.upAxis){
   status.textContent='BLOCK：來源檔或尺寸設定已變更，請重新匯入。';return;
  }
  setBusy(true);run.disabled=true;download.disabled=true;
  lastReport=null;figure.hidden=true;link.hidden=true;
  let gpu;
  try{
   const markerFile=$('landmark-file').files?.[0],
    weightsFile=$('weighted-motion-weights').files?.[0];
   if(!markerFile||!weightsFile||markerFile.size>40000||
    weightsFile.size>10000000||
    !/\.json$/i.test(markerFile.name)||!/\.json$/i.test(weightsFile.name))
    throw Error('需要本機 47 點來源標記 JSON 與 10MB 以下來源 SHA 綁定頂點權重 JSON。');
   const landmarks=JSON.parse(await markerFile.text()),
    weightManifest=JSON.parse(await weightsFile.text());
   const anatomy=auditAIGReal3DDenseAnatomy({
    sourceGeometry:source.dense.sourceGeometry,
    sourceEvidence:source.dense.evidence,
    sourceSha256:source.sha256,landmarks
   });
   const digitBranching=auditAIGReal3DDenseFiveDigitBranches({
    sourceGeometry:source.dense.sourceGeometry,
    sourceEvidence:source.dense.evidence,
    sourceSha256:source.sha256,anatomy,landmarks
   });
   const fingerJunction=auditAIGReal3DFingerJointSurface({
    sourceGeometry:source.dense.sourceGeometry,
    sourceEvidence:source.dense.evidence,
    sourceSha256:source.sha256,anatomy,digitBranching,landmarks
   });
   const angleDeg=Number($('weighted-motion-angle').value);
   const frame0=createAIGReal3DWeightedFingerPose({
    dense:source.dense,fingerJunction,weightManifest,angleDeg:0
   });
   const frame=createAIGReal3DWeightedFingerPose({
    dense:source.dense,fingerJunction,weightManifest,angleDeg
   });
   if(frame0.evidence.movedOriginalVertices!==0||
    frame.evidence.sourceTriangleCount!==frame0.evidence.sourceTriangleCount)
    throw Error('初始姿勢/變形姿勢來源三角面數異常');
   const posed=buildAIGReal3DWeightedFingerGPUPreview({
    dense:source.dense,pose:frame
   });
   gpu=createAIG3DRenderer($('native-webgl'),{
    quality:'balanced',pixelRatio:1,maxTriangles:700000,
    background:[.769,.745,.702,1]
   });
   if(gpu.status!=='READY'||gpu.getGpuLimit()<1920)
    throw Error('GPU 原生擷取不可用');
   const camera=validateAIGInspectionCapturePlan({
    heightMeters:source.heightMm/1000,angle:'front',mode:'ALBEDO'
   });
   gpu.setCamera(camera.camera);gpu.setInspectionMode('BROWN_VOLUME');
   const png=await gpu.captureNativePNG(posed.scene,{width:1080,height:1920});
   if(!png.genuineGpuReadback||png.resampledFromSmallerImage!==false||
    png.width!==1080||png.height!==1920)
    throw Error('生成失敗：非原生 GPU 工作副本 PNG');
   const previewURL=URL.createObjectURL(png.blob);registerURL(previewURL);
   image.src=previewURL;link.href=previewURL;link.hidden=false;
   figure.hidden=false;
   lastReport={
    schema:'AIG_REAL3D_LOCAL_WEIGHTED_MOTION_GPU_REPORT_V1',
    sourceSha256:source.sha256,
    sourceTrianglesUnchanged:source.dense.evidence.originalTriangleCount,
    baseline:frame0.evidence,posed:frame.evidence,
    gpuEvidence:{
     width:png.width,height:png.height,sha256:png.sha256,
     originalTriangles:posed.evidence.posedGPUOriginalTriangles,
     nativeGpuReadback:true,noImageUpscaling:true
    },
    originalRawSourceNeverModified:true,
    independentHumanScanVerified:false,realisticFingerMotionCertified:false,
    animationRigPASS:false,releasePASS:false
   };
   evidence.textContent=JSON.stringify(lastReport,null,2);
   download.disabled=false;
   status.textContent='原始網格權重姿勢已計算並輸出真正 GPU PNG。'+
    '來源頂點實際位移 '+frame.evidence.movedOriginalVertices+
    '、變形三角面 '+frame.evidence.changedOriginalTriangles+
    '、最大拉伸 '+frame.evidence.maxOriginalEdgeStretchPercent+'%、反轉面片 '+
    frame.evidence.invertedFaceNormalTriangles+
    '。這是非破壞性工作副本；真人手指／動畫自然度仍 BLOCK。';
  }catch(error){
   lastReport=null;download.disabled=true;figure.hidden=true;link.hidden=true;
   evidence.textContent='BLOCK：'+String(error?.message||error);
   status.textContent='BLOCK：'+String(error?.message||error)+
    '；不生成假骨架、不修改原始 OBJ。';
  }finally{
   gpu?.destroy?.();setBusy(false);run.disabled=false;
  }
 });
 download.addEventListener('click',()=>{
  if(!lastReport)return;
  const url=URL.createObjectURL(new Blob([JSON.stringify(lastReport,null,2)],{
   type:'application/json'
  }));registerURL(url);
  const anchor=document.createElement('a');
  anchor.href=url;anchor.download='AIG-Real3D-RAW-WEIGHTED-MOTION-GPU-EVIDENCE.json';
  anchor.click();
 });
 return {reset,load};
}
