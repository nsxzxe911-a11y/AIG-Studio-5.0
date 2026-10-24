/** Read-only Real3D triple-joint source + swept-risk GPU frame workstation. */
import {auditAIGReal3DDenseAnatomy} from './aig-real3d-dense-anatomy-review.mjs';
import {auditAIGReal3DDenseFiveDigitBranches} from './aig-real3d-dense-digit-branch-gate.mjs';
import {auditAIGReal3DFingerJointSurface} from './aig-real3d-native-finger-junction-gate.mjs';
import {createAIGReal3DThreeJointTimeline} from './aig-real3d-three-joint-swept-motion.mjs';
import {runAIGReal3DQuadStrain,benchmarkAIGReal3DWorkerModes}
 from './aig-real3d-quad-strain-pool.mjs';
import {applyAIGReal3DSourceMeshDelta}
 from './aig-real3d-gpu-delta-source.mjs';
import {benchmarkAIGReal3DNativePosePlayback}
 from './aig-real3d-adaptive-pose-playback.mjs';
import {stressAIGReal3DGPUResourceCycles}
 from './aig-real3d-gpu-stress-cycles.mjs';
import {inspectAIGReal3DPersistentGPUPosePool}
 from './aig-real3d-persistent-gpu-pose-pool.mjs';
import {buildAIGReal3DWeightedFingerGPUPreview} from './aig-real3d-weighted-motion-working-copy.mjs';
import {createAIGReal3DSparseNormalCache,evaluateAIGReal3DSparseNormals}
 from './aig-real3d-sparse-source-normals.mjs';
import {createAIG3DRenderer} from './aig-real3d-webgl.mjs';
import {validateAIGInspectionCapturePlan} from './aig-real3d-render-inspection.mjs';
export function mountAIGReal3DThreeJointControls({$,isBusy,setBusy,registerURL}={}){
 let source=null,report=null,stressScenes=null;
 const run=$('three-joint-run'),download=$('three-joint-download'),
  stressButton=$('three-joint-stress-run'),stressStatus=$('three-joint-stress-status'),
  poolButton=$('three-joint-pool-run'),poolStatus=$('three-joint-pool-status'),
  status=$('three-joint-status'),evidence=$('three-joint-evidence'),
  gallery=$('three-joint-gallery');
 const reset=()=>{
  source=null;report=null;stressScenes=null;run.disabled=true;download.disabled=true;
  stressButton.disabled=true;poolButton.disabled=true;
  poolStatus.textContent='等待真來源 OBJ 與三節關節 GPU 驗證。';
  stressStatus.textContent='等待同來源三節關節真 GPU 驗證。';
  gallery.replaceChildren();
  status.textContent='BLOCK：尚無原始 OBJ 與真三關節來源索引權重。';
  evidence.textContent='等待來源 SHA／本機權重。';
 };
 const load=v=>{
  reset();source=v;run.disabled=false;
  status.textContent='原始 OBJ 已載入，還需本機 47 點標記及 Base/Middle/Distal 權重 JSON。';
 };
 run.addEventListener('click',async()=>{
  if(isBusy()){status.textContent='BLOCK：GPU 工作區忙碌。';return;}
  if(!source||source.file!==$('model-file').files?.[0]||
   source.heightMm!==Number($('body-height').value)||
   source.upAxis!==$('up-axis').value){
   status.textContent='BLOCK：原始 OBJ 或校準參數變動，需重新匯入。';return;
  }
  setBusy(true);run.disabled=true;download.disabled=true;stressButton.disabled=true;poolButton.disabled=true;
  stressScenes=null;report=null;
  gallery.replaceChildren();let renderer;
  try{
   const marker=$('landmark-file').files?.[0],
    weights=$('three-joint-weights').files?.[0];
   if(!marker||!weights||marker.size>40000||weights.size>10000000||
    !/\.json$/i.test(marker.name)||!/\.json$/i.test(weights.name))
    throw Error('需要本機三維標記及同 SHA 三關節權重 JSON。');
   const [landmarks,manifest]=await Promise.all([
    marker.text().then(JSON.parse),weights.text().then(JSON.parse)
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
   const timeline=createAIGReal3DThreeJointTimeline({
    dense:source.dense,fingerJunction,manifest,
    targetAnglesDeg:[
     Number($('three-joint-base-angle').value),
     Number($('three-joint-middle-angle').value),
     Number($('three-joint-distal-angle').value)
    ],maxAngularStepDeg:6,displayFrameCount:3,contactBudget:120000
   });
   // Shared original mesh; only owned affected triangles cross to Web Workers.
   const originalSource=source.dense.sourceGeometry;
   const weighted=new Set(manifest.joints.flatMap(j=>
    j.vertexWeights.map(pair=>pair[0])));
   const offsets=[];
   for(let k=0;k<originalSource.indices.length;k+=3){
    if(weighted.has(originalSource.indices[k])||
     weighted.has(originalSource.indices[k+1])||
     weighted.has(originalSource.indices[k+2]))offsets.push(k);
   }
   const last=timeline.frames.at(-1);
   const quad=await runAIGReal3DQuadStrain({
    original:originalSource.positions,posed:last.workingCopyPositions,
    indices:originalSource.indices,triangleOffsets:Uint32Array.from(offsets),
    requestedWorkers:4,minimumTrianglesForWorkers:64
   });
   const check=last.deformation,q=quad.result;
   if(q.changedSourceTriangles!==check.changedSourceTriangles||
    q.invertedSourceTriangles!==check.invertedSourceTriangles||
    q.nearlyCollapsedSourceTriangles!==check.nearlyCollapsedSourceTriangles||
    Math.abs(q.maxSourceEdgeStretchPercent-check.maxSourceEdgeStretchPercent)>.003||
    Math.abs(q.maxSourceEdgeCompressionPercent-check.maxSourceEdgeCompressionPercent)>.003)
    throw Error('四工人/單核心原始來源應變不一致，必須停止驗證');
   renderer=createAIG3DRenderer($('native-webgl'),{
    quality:'balanced',pixelRatio:1,maxTriangles:700000,
    background:[.769,.745,.702,1]
   });
   if(renderer.status!=='READY'||renderer.getGpuLimit()<1920)
    throw Error('GPU 不支援原生 1080×1920 證據輸出');
   const camera=validateAIGInspectionCapturePlan({
    heightMeters:source.heightMm/1000,angle:'front',mode:'ALBEDO'
   });
   renderer.setCamera(camera.camera);renderer.setInspectionMode('BROWN_VOLUME');
   const normalCache=createAIGReal3DSparseNormalCache({
    original:originalSource.positions,indices:originalSource.indices
   });
   const normalScratch=new Float64Array(originalSource.positions.length);
   const affectedSourceVertexIds=[...weighted].sort((a,b)=>a-b);
   const frames=[];const playbackScenes=[];let livePose=null;
   for(const index of timeline.displayFrameIndexes){
    const sample=timeline.frames[index];
    const frameCPUStart=performance.now();
    const incrementalNormals=evaluateAIGReal3DSparseNormals({
     cache:normalCache,posed:sample.workingCopyPositions,
     changedGlobalVertexIds:affectedSourceVertexIds,outputNormals:normalScratch
    });
    const gpuPose=buildAIGReal3DWeightedFingerGPUPreview({
     normalOverride:normalScratch,
     dense:source.dense,pose:{
      workingCopyPositions:sample.workingCopyPositions,
      evidence:{sourceSha256:source.sha256,
       sourceTriangleCount:source.dense.evidence.originalTriangleCount}
     }
    });
    const sourceNormalsAndSceneBuildMs=performance.now()-frameCPUStart;
    const nativeCaptureBegin=performance.now();
    playbackScenes.push(gpuPose.scene);
    const gpuDelta=livePose?
     applyAIGReal3DSourceMeshDelta({
      renderer,liveScene:livePose.scene,nextScene:gpuPose.scene
     }):null;
    if(!livePose)livePose=gpuPose;
    const png=await renderer.captureNativePNG(livePose.scene,{
     width:1080,height:1920
    });
    const nativeGPUCaptureAndEncodeMs=performance.now()-nativeCaptureBegin;
    if(!png.genuineGpuReadback||png.resampledFromSmallerImage!==false||
     png.width!==1080||png.height!==1920)
     throw Error('三關節影格非原生真 GPU 輸出');
    const url=URL.createObjectURL(png.blob);registerURL(url);
    const fig=document.createElement('figure'),img=document.createElement('img'),
     cap=document.createElement('figcaption'),a=document.createElement('a');
    img.src=url;img.alt='三節關節真來源三維影格 '+index;
    cap.textContent='來源 XYZ：'+sample.anglesDeg.join('° / ')+'° · ';
    a.href=url;a.download='Real3D-THREE-JOINT-'+index+'-GPU.png';
    a.textContent='下載真 GPU PNG';cap.append(a);fig.append(img,cap);
    gallery.append(fig);
    frames.push({sampleIndex:index,sha256:png.sha256,width:png.width,
     height:png.height,sourceTriangles:gpuPose.evidence.posedGPUOriginalTriangles,
     gpuUploadMethod:gpuDelta?'GPU_BUFFER_SUBDATA_REUSE':'INITIAL_GPU_BUFFER_UPLOAD',
     gpuDelta,sparseNativeGlobalNormals:{
      sourceTrianglesRecomputed:incrementalNormals.affectedSourceTriangles,
      sourceVertexNormalsRecomputed:incrementalNormals.recomputedSourceVertexNormals,
      skippedSourceTriangleRecalculation:incrementalNormals.skippedOriginalTriangleRecalculation
     },
     realCPUOriginalNormalsAndSceneBuildMs:Math.round(sourceNormalsAndSceneBuildMs*1000)/1000,
     gpuReadbackAndPNGEncodingWallMs:Math.round(nativeGPUCaptureAndEncodeMs*1000)/1000});
   }
   const gpuPlayback=await benchmarkAIGReal3DNativePosePlayback({
    renderer,poseScenes:[livePose.scene,...playbackScenes.slice(0,2)],
    mode:$('three-joint-playback-hz').value,rafCallbacks:36
   });
   if(!gpuPlayback.gpuOriginalIndexReusedForEveryDelta||
    gpuPlayback.actualSourceIndexedDraws<2)
    throw Error('真 GPU 動作排程與索引重用驗收失敗');
   report={
    schema:'AIG_REAL3D_THREE_JOINT_GPU_SWEEP_EVIDENCE_V1',
    sourceSha256:source.sha256,
    originalSourceVertices:source.dense.evidence.originalVertexCount,
    originalSourceTriangles:source.dense.evidence.originalTriangleCount,
    sourceMarkerSnaps:timeline.sourceMarkerSnaps,
    sparseSourceTopology:timeline.sparseSourceTopology,
    quadCPUOriginalSourceStrain:quad,
    gpuNativeSourceBufferDeltaReusedOnLaterFrames:true,
    incrementalNativeSourceNormalsVerified:true,
    adaptiveRealSourceGPUFrameBudget:gpuPlayback,
    nonDisplayFullXYZScratchBuffersAllocated:
     timeline.sparseSourceTopology.scratchPoseFloat32BuffersAllocated,
    noContinuousAnimationFPSClaim:true,
    jointNames:timeline.jointNames,checkedFrameCount:timeline.frameCount,
    maxAngularStepDeg:timeline.maxActualAngularSampleStepDeg,
    frames:timeline.frames.map(x=>({
     sampleIndex:x.sampleIndex,timeFraction:x.timeFraction,
     anglesDeg:x.anglesDeg,worldJointPivots:x.worldJointPivots,
     movedOriginalVertices:x.movedOriginalVertices,
     deformation:x.deformation,contact:x.contact,
     sweptRiskFromPriorSample:x.sweptRiskFromPriorSample
    })),gpuFrames:frames,diagnostics:timeline.diagnostics,
    unchangedRawSourceOBJ:true,
    naturalHumanSkinPASS:false,automaticRigPASS:false,releasePASS:false
   };
   stressScenes=playbackScenes;
   evidence.textContent=JSON.stringify(report,null,2);download.disabled=false;
   stressButton.disabled=false;poolButton.disabled=false;
   poolStatus.textContent='原始三節關節 GPU 姿勢已驗證，可測試共用一套 GPU buffer 的 3×72 排程。';
   stressStatus.textContent='來源三個真 GPU 姿勢已通過，可進行獨立三輪緩衝清理壓力驗證。';
   status.textContent='真三關節極速模式：每幀僅處理 '+timeline.sparseSourceTopology.activeWeightedGlobalVertexCount+
    '/'+timeline.sparseSourceTopology.inputSourceVertexCount+
    ' 頂點、'+timeline.sparseSourceTopology.indexedAffectedOriginalTriangles+
    '/'+timeline.sparseSourceTopology.inputOriginalSourceTriangles+
    ' 個來源面片；'+
    '四路 Worker 工作通道 '+quad.actualWorkerLanes+'（少量面片自動單線程）；'+
    '中間影格僅保留 '+timeline.sparseSourceTopology.numberOfFullXYZFramesRetained+
    ' 組完整 XYZ。真三關節 '+timeline.frameCount+
    ' 個來源子幀、3 張真 GPU 完成；'+gpuPlayback.actualSourceIndexedDraws+
    ' 次實際 GPU 提交，排程 '+gpuPlayback.targetHz+' Hz（不能作為穩定 FPS 認證）。'+
    (timeline.diagnostics.possibleUnsampledSweptIntervalCollision?
     '跨幀存在潛在穿插，需人工複核；':'掃掠包圍盒未提出額外警訊；')+
    (timeline.diagnostics.exceedingSourceEdgeStrainThreshold?
     '來源網格拉伸超過閾值；':'')+
    '真人自然皮膚與正式動畫仍 BLOCK。';
  }catch(error){
   report=null;download.disabled=true;gallery.replaceChildren();
   evidence.textContent='BLOCK：'+String(error?.message||error);
   status.textContent='BLOCK：'+String(error?.message||error)+'；不補造來源人體。';
  }finally{renderer?.destroy?.();setBusy(false);run.disabled=false;}
 });
 stressButton.addEventListener('click',async()=>{
  if(isBusy()||!source||!stressScenes||!report){
   stressStatus.textContent='BLOCK：原始來源 GPU 報告不可用或工作區忙碌。';return;
  }
  setBusy(true);stressButton.disabled=true;
  try{
   const captureScenes=stressScenes;
   const result=await stressAIGReal3DGPUResourceCycles({
    cycles:3,rafCallbacksPerCycle:36,mode:$('three-joint-playback-hz').value,
    createCycle:()=>{
     const canvas=document.createElement('canvas');
     canvas.width=640;canvas.height=480;
     const renderer=createAIG3DRenderer(canvas,{
      quality:'balanced',pixelRatio:1,maxTriangles:700000,
      background:[.769,.745,.702,1]
     });
     if(renderer.status!=='READY')throw Error('真 GPU 狀態不可用');
     renderer.setInspectionMode('LIT');
     return {renderer,poseScenes:structuredClone(captureScenes)};
    }
   });
   report.extendedRealGPUResourceStress=result;
   evidence.textContent=JSON.stringify(report,null,2);
   stressStatus.textContent='三輪來源 GPU 壓力完成；'+result.actualSourceIndexedDraws+
    ' 個真 GPU 畫面，緩衝歸零驗證通過。無 Android／Windows 熱安全或穩定 FPS 認證。';
  }catch(error){
   stressStatus.textContent='BLOCK：'+String(error?.message||error);
  }finally{setBusy(false);stressButton.disabled=!stressScenes;}
 });
 poolButton.addEventListener('click',async()=>{
  if(isBusy()||!source||!stressScenes||!report){
   poolStatus.textContent='BLOCK：來源或 GPU 姿勢尚未通過驗證。';return;
  }
  setBusy(true);poolButton.disabled=true;stressButton.disabled=true;
  let renderer;
  try{
   const canvas=document.createElement('canvas');
   canvas.width=640;canvas.height=480;
   renderer=createAIG3DRenderer(canvas,{
    quality:'balanced',pixelRatio:1,maxTriangles:700000,
    background:[.769,.745,.702,1]
   });
   if(renderer.status!=='READY')throw Error('真 WebGL 工作區不可用');
   renderer.setInspectionMode('LIT');
   const evidencePool=await inspectAIGReal3DPersistentGPUPosePool({
    renderer,poseScenes:stressScenes,segments:3,
    rafCallbacksPerSegment:72,mode:$('three-joint-playback-hz').value,
    maxOwnedGPUBuffers:12,maxFullGPUUploadBytes:100000000
   });
   report.persistentGPUResourcePool=evidencePool;
   evidence.textContent=JSON.stringify(report,null,2);
   poolStatus.textContent='真 GPU 資源池完成 3×72 rAF：'+
    evidencePool.genuineSourceIndexedGPUDraws+
    ' 張原 Indexed 3D 幀，首次建立後新增 GPU 緩衝 0，關閉後歸零。'+
    '本次不能作為 Android／Windows 連續 FPS 與溫度認證。';
  }catch(error){
   poolStatus.textContent='BLOCK：'+String(error?.message||error);
  }finally{
   renderer?.destroy?.();
   setBusy(false);poolButton.disabled=!stressScenes;
   stressButton.disabled=!stressScenes;
  }
 });
 download.addEventListener('click',()=>{
  if(!report)return;
  const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{
   type:'application/json'
  }));registerURL(url);
  const a=document.createElement('a');a.href=url;
  a.download='AIG-Real3D-THREE-JOINT-SWEPT-REPORT.json';a.click();
 });
 return {load,reset};
}
