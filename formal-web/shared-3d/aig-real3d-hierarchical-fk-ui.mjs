/** Real source-index parent-child FK workstation; never automatic skeleton creation. */
import {auditAIGReal3DDenseAnatomy} from './aig-real3d-dense-anatomy-review.mjs';
import {auditAIGReal3DDenseFiveDigitBranches} from './aig-real3d-dense-digit-branch-gate.mjs';
import {auditAIGReal3DFingerJointSurface} from './aig-real3d-native-finger-junction-gate.mjs';
import {createAIGReal3DHierarchicalFingerTimeline}
 from './aig-real3d-hierarchical-fk-working-copy.mjs';
import {buildAIGReal3DWeightedFingerGPUPreview}
 from './aig-real3d-weighted-motion-working-copy.mjs';
import {createAIG3DRenderer} from './aig-real3d-webgl.mjs';
import {validateAIGInspectionCapturePlan}
 from './aig-real3d-render-inspection.mjs';
export function mountAIGReal3DHierarchicalFKControls({
 $,isBusy,setBusy,registerURL
}={}){
 let source=null,report=null;
 const button=$('hierarchical-fk-run'),save=$('hierarchical-fk-download'),
  status=$('hierarchical-fk-status'),json=$('hierarchical-fk-evidence'),
  gallery=$('hierarchical-fk-gallery');
 const reset=()=>{
  source=null;report=null;button.disabled=true;save.disabled=true;
  gallery.replaceChildren();
  status.textContent='BLOCK：尚未匯入來源原始 OBJ。';
  json.textContent='尚未提供來源 SHA 綁定的 Base→Middle 父子關節權重。';
 };
 const load=value=>{
  reset();source=value;button.disabled=false;
  status.textContent='來源 OBJ 已鎖定；需要本機三維標記與同 SHA 父子關節權重 JSON。';
 };
 button.addEventListener('click',async()=>{
  if(isBusy()){
   status.textContent='BLOCK：GPU 工作區忙碌。';return;
  }
  if(!source||source.file!==$('model-file').files?.[0]||
   source.upAxis!==$('up-axis').value||
   source.heightMm!==Number($('body-height').value)){
   status.textContent='BLOCK：來源／身高／UP 軸改變，必須重新匯入。';return;
  }
  setBusy(true);button.disabled=true;save.disabled=true;report=null;
  gallery.replaceChildren();let gpu;
  try{
   const markerFile=$('landmark-file').files?.[0],
    manifestFile=$('hierarchical-fk-weights').files?.[0];
   if(!markerFile||!manifestFile||
    markerFile.size>40000||manifestFile.size>10000000||
    !/\.json$/i.test(markerFile.name)||!/\.json$/i.test(manifestFile.name))
    throw Error('需本機 47 點來源 3D 標記及 SHA 綁定父子關節權重 JSON。');
   const [landmarks,manifest]=await Promise.all([
    markerFile.text().then(JSON.parse),manifestFile.text().then(JSON.parse)
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
   const timeline=createAIGReal3DHierarchicalFingerTimeline({
    dense:source.dense,fingerJunction,manifest,
    targetAnglesDeg:[Number($('hierarchical-fk-parent-angle').value),
     Number($('hierarchical-fk-child-angle').value)],
    displayFrameCount:3,maxDegreesBetweenCheckedSamples:8,
    contactBudget:120000
   });
   gpu=createAIG3DRenderer($('native-webgl'),{
    quality:'balanced',pixelRatio:1,maxTriangles:700000,
    background:[.769,.745,.702,1]
   });
   if(gpu.status!=='READY'||gpu.getGpuLimit()<1920)
    throw Error('GPU 無法擷取原生 1080×1920');
   const spec=validateAIGInspectionCapturePlan({
    heightMeters:source.heightMm/1000,angle:'front',mode:'ALBEDO'
   });
   gpu.setCamera(spec.camera);gpu.setInspectionMode('BROWN_VOLUME');
   const gpuFrames=[];
   for(const index of timeline.displayFrameIndexes){
    const frame=timeline.samples[index];
    const posed=buildAIGReal3DWeightedFingerGPUPreview({
     dense:source.dense,pose:{
      workingCopyPositions:frame.workingCopyPositions,
      evidence:{sourceSha256:source.sha256,
       sourceTriangleCount:source.dense.evidence.originalTriangleCount}
     }
    });
    const png=await gpu.captureNativePNG(posed.scene,{width:1080,height:1920});
    if(!png.genuineGpuReadback||png.resampledFromSmallerImage!==false||
     png.width!==1080||png.height!==1920)
     throw Error('父子關節真 GPU 幀不符合原生擷取');
    const url=URL.createObjectURL(png.blob);registerURL(url);
    const fig=document.createElement('figure'),img=document.createElement('img'),
     cap=document.createElement('figcaption'),a=document.createElement('a');
    img.src=url;img.alt='父子關節原始 3D GPU 影格 '+index;
    cap.textContent='原始全球 XYZ 影格 '+index+'，角度 '+
     frame.parentAngleDeg+'° / '+frame.childAngleDeg+'° · ';
    a.href=url;a.download='Real3D-FK-FRAME-'+index+'-GPU.png';
    a.textContent='下載原生 GPU PNG';
    cap.append(a);fig.append(img,cap);gallery.append(fig);
    gpuFrames.push({sampleIndex:index,sha256:png.sha256,
     width:png.width,height:png.height,
     originalTriangleCount:posed.evidence.posedGPUOriginalTriangles});
   }
   report={
    schema:'AIG_REAL3D_PARENT_CHILD_FK_GPU_EVIDENCE_V1',
    sourceSha256:source.sha256,
    sourceOriginalTriangles:source.dense.evidence.originalTriangleCount,
    orderedJointHierarchy:timeline.jointHierarchy,
    side:timeline.side,finger:timeline.finger,
    checkedSubframeCount:timeline.subframeCount,
    maximumAngularStepDeg:timeline.maxActualDegreesBetweenSamples,
    checkedSamples:timeline.samples.map(f=>({
     sampleIndex:f.sampleIndex,time:f.normalizedTime,
     parentAngleDeg:f.parentAngleDeg,childAngleDeg:f.childAngleDeg,
     transformedChildPivotWorldMeters:f.transformedChildPivotWorldMeters,
     movedOriginalVertices:f.movedOriginalVertices,
     deformation:f.deformation,contact:f.contact
    })),
    gpuFrames,
    diagnostics:timeline.diagnostics,
    rawSourceNotModified:true,allGpuScreenshotsNative:true,
    realHumanSkeletonIndependentlyVerified:false,
    skinMotionNaturalnessPASS:false,animationRigPASS:false,releasePASS:false
   };
   json.textContent=JSON.stringify(report,null,2);save.disabled=false;
   status.textContent='真父子關節 FK 三幀 GPU 與 '+timeline.subframeCount+
    ' 個來源 XYZ 動作取樣完成。'+
    (timeline.diagnostics.observedCrossRegionTriangleIntersectionAtSample?
     '量測到來源面片穿插；':'取樣未量測到非共面穿插；')+
    (timeline.diagnostics.anyCollisionCheckBudgetExhausted?
     '碰撞預算不足，檢查不完整；':'')+
    '來源骨架與真人皮膚自然動畫仍 BLOCK。';
  }catch(error){
   report=null;save.disabled=true;gallery.replaceChildren();
   json.textContent='BLOCK：'+String(error?.message||error);
   status.textContent='BLOCK：'+String(error?.message||error)+
    '。不得自動補原始人體資料。';
  }finally{
   gpu?.destroy?.();setBusy(false);button.disabled=false;
  }
 });
 save.addEventListener('click',()=>{
  if(!report)return;
  const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{
   type:'application/json'
  }));registerURL(url);
  const a=document.createElement('a');
  a.href=url;a.download='AIG-Real3D-PARENT-CHILD-FK-SUBFRAME-REPORT.json';a.click();
 });
 return {load,reset};
}
