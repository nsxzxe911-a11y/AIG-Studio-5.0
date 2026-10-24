/**
 * 3 genuinely computed XYZ temporal samples, not CSS sprites or fake animation.
 * Frame GIF/video/60 FPS and real anatomy remain explicitly unverified.
 */
import {auditAIGReal3DDenseAnatomy} from './aig-real3d-dense-anatomy-review.mjs';
import {auditAIGReal3DDenseFiveDigitBranches} from './aig-real3d-dense-digit-branch-gate.mjs';
import {auditAIGReal3DFingerJointSurface} from './aig-real3d-native-finger-junction-gate.mjs';
import {createAIGReal3DDualFingerTimeline} from './aig-real3d-dual-channel-timeline.mjs';
import {buildAIGReal3DWeightedFingerGPUPreview}
 from './aig-real3d-weighted-motion-working-copy.mjs';
import {createAIG3DRenderer} from './aig-real3d-webgl.mjs';
import {validateAIGInspectionCapturePlan}
 from './aig-real3d-render-inspection.mjs';
export function mountAIGReal3DDualTimelineControls({
 $,isBusy,setBusy,registerURL
}={}){
 let source=null,lastReport=null;
 const run=$('dual-motion-run'),download=$('dual-motion-download'),
  status=$('dual-motion-status'),gallery=$('dual-motion-gallery'),
  evidence=$('dual-motion-evidence');
 const reset=()=>{
  source=null;lastReport=null;run.disabled=true;download.disabled=true;
  gallery.replaceChildren();
  status.textContent='BLOCK：必須先匯入來源 OBJ，再提供兩個來源 SHA 權重通道。';
  evidence.textContent='未提供來源兩組獨立頂點權重。';
 };
 const load=value=>{
  reset();source=value;run.disabled=false;
  status.textContent='來源 OBJ 已鎖定；請提供 47 點來源三維標記與兩組不同手指的獨立頂點權重。';
 };
 run.addEventListener('click',async()=>{
  if(isBusy()){
   status.textContent='BLOCK：另有 GPU 作業正在執行。';return;
  }
  if(!source||source.file!==$('model-file').files?.[0]||
   Number($('body-height').value)!==source.heightMm||
   $('up-axis').value!==source.upAxis){
   status.textContent='BLOCK：原始來源/身高/座標已改，需重新匯入。';return;
  }
  setBusy(true);run.disabled=true;download.disabled=true;
  lastReport=null;gallery.replaceChildren();
  let gpu;
  try{
   const markerFile=$('landmark-file').files?.[0],
    firstFile=$('weighted-motion-weights').files?.[0],
    secondFile=$('dual-motion-second-weights').files?.[0];
   if(!markerFile||!firstFile||!secondFile||
    markerFile.size>40000||firstFile.size>10000000||secondFile.size>10000000||
    ![markerFile,firstFile,secondFile].every(f=>/\.json$/i.test(f.name)))
    throw Error('需本機 47 點原始標記與兩個 SHA 綁定權重 JSON；不能自動杜撰骨架。');
   const [landmarks,first,second]=await Promise.all([
    markerFile.text().then(JSON.parse),
    firstFile.text().then(JSON.parse),
    secondFile.text().then(JSON.parse)
   ]);
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
   const targetAnglesDeg=[
    Number($('weighted-motion-angle').value),
    Number($('dual-motion-angle-b').value)
   ];
   const timeline=createAIGReal3DDualFingerTimeline({
    dense:source.dense,fingerJunction,
    weightManifests:[first,second],targetAnglesDeg,
    frameCount:3,maxContactPairs:150000
   });
   gpu=createAIG3DRenderer($('native-webgl'),{
    quality:'balanced',pixelRatio:1,maxTriangles:700000,
    background:[.769,.745,.702,1]
   });
   if(gpu.status!=='READY'||gpu.getGpuLimit()<1920)
    throw Error('GPU 不支援 1080×1920 原生來源工作副本擷取');
   const spec=validateAIGInspectionCapturePlan({
    heightMeters:source.heightMm/1000,angle:'front',mode:'ALBEDO'
   });
   gpu.setCamera(spec.camera);gpu.setInspectionMode('BROWN_VOLUME');
   const viewRecords=[];
   for(const frame of timeline.frames){
    const pose={workingCopyPositions:frame.workingCopyPositions,
     evidence:{sourceSha256:source.sha256,
      sourceTriangleCount:source.dense.evidence.originalTriangleCount,
      animationRigPASS:false,releasePASS:false}};
    const preview=buildAIGReal3DWeightedFingerGPUPreview({dense:source.dense,pose});
    const png=await gpu.captureNativePNG(preview.scene,{width:1080,height:1920});
    if(!png.genuineGpuReadback||png.resampledFromSmallerImage!==false||
     png.width!==1080||png.height!==1920)
     throw Error('真 GPU 來源工作副本擷取失敗');
    const url=URL.createObjectURL(png.blob);registerURL(url);
    const fig=document.createElement('figure'),
     img=document.createElement('img'),
     cap=document.createElement('figcaption'),
     a=document.createElement('a');
    img.src=url;img.alt='來源真3D第 '+frame.frameIndex+' 幀';
    a.href=url;a.download='Real3D-DUAL-POSE-FRAME-'+frame.frameIndex+'-GPU.png';
    a.textContent='下載真 GPU PNG';
    cap.textContent='來源三維幀 '+frame.frameIndex+' / 2，角度 '+
     frame.angleDegrees.join('° / ')+'° · ';
    cap.append(a);fig.append(img,cap);gallery.append(fig);
    viewRecords.push({frameIndex:frame.frameIndex,sha256:png.sha256,
     width:png.width,height:png.height,
     originalSourceTriangles:preview.evidence.posedGPUOriginalTriangles});
    gpu.releaseMesh?.(preview.scene?.nodes?.[0]?.mesh);
   }
   lastReport={
    schema:'AIG_REAL3D_SOURCE_DUAL_CHANNEL_3_FRAME_GPU_EVIDENCE_V1',
    sourceSha256:source.sha256,
    channelDescriptions:timeline.channels,
    sampledFrameCount:timeline.frameCount,
    frames:timeline.frames.map(f=>({
     frameIndex:f.frameIndex,progress:f.progress,
     angles:f.angleDegrees,
     deformation:f.deformation,
     triangleContact:f.contact,
     xyzChangedOnTrueSource:f.actualGlobalXYZWorkingCopy
    })),
    gpuFrames:viewRecords,
    diagnostics:timeline.diagnostics,
    originalOBJUnmodified:true,allGPUFramesNative:true,
    fullRealtimeAnimationRendered:false,
    collisionFreeBetweenFramesNotProven:true,
    humanAnatomicalRigVerified:false,releasePASS:false
   };
   evidence.textContent=JSON.stringify(lastReport,null,2);
   download.disabled=false;
   status.textContent='真雙通道三維樣本 3 幀已完成：'+
    (timeline.diagnostics.observedInterpenetratingTrianglePairsInSampledFrames?
     '發現三角面穿插；':'取樣影格未觀察到非共面的面片穿插；')+
    (timeline.diagnostics.broadphaseOrNarrowphaseBudgetExhausted?
     '碰撞檢查不完整；':'')+
    '最大拉伸 '+timeline.diagnostics.maxSourceEdgeStretchPercent+
    '%。非連續影格安全證明；擬真人自然動畫保持 BLOCK。';
  }catch(error){
   lastReport=null;download.disabled=true;gallery.replaceChildren();
   evidence.textContent='BLOCK：'+String(error?.message||error);
   status.textContent='BLOCK：'+String(error?.message||error)+
    '；不得把無來源動作當成真實人體。';
  }finally{
   gpu?.destroy?.();setBusy(false);run.disabled=false;
  }
 });
 download.addEventListener('click',()=>{
  if(!lastReport)return;
  const url=URL.createObjectURL(new Blob([JSON.stringify(lastReport,null,2)],{
   type:'application/json'
  }));registerURL(url);
  const a=document.createElement('a');a.href=url;
  a.download='Real3D-DUAL-3FRAMES-SOURCE-CONTACT-GPU.json';a.click();
 });
 return {reset,load};
}
