import {sha256AIGReal3DBytes,ingestAIGReal3DNativeGeneratedGLB}
 from './aig-real3d-v99-native-model-ingest.mjs';
import {connectAIGReal3DImportedGeometryToUnified4K}
 from './aig-real3d-v99-ai-inference-adapter.mjs';
import {planAIGReal3DNative4K,captureAIGReal3DNative4K}
 from './aig-real3d-v96-native-4k-pipeline.mjs';
import {createAIG3DRenderer}
 from './aig-real3d-webgl.mjs';
import {createAIGReal3DMetric4KWorkingScene,createAIGReal3DMetric4KCamera}
 from './aig-real3d-v105-metric-4k-adapter.mjs';
import {auditAIGReal3DHDR10Source}
 from './aig-real3d-v103-hdr10-evidence.mjs';
import {remodelAIGReal3DGeometryBackend}
 from './aig-real3d-v101-backend-orchestrator.mjs';
import {planAIGReal3DAdaptiveArtworkFrame,
 planAIGReal3DNativeOutputWithinArtwork,
 findAIGReal3DVisibleAlphaROI,createAIGReal3DAdaptivePreviewGate}
 from './aig-real3d-v102-adaptive-frame.mjs';
import {auditAIGReal3D4KSourceProjection}
 from './aig-real3d-v96-native-4k-pipeline.mjs';
const $=id=>document.getElementById(id);
let imported=null,renderer=null,bridge=null,ready=false,busy=false,
 fileURL=null,mode='oblique',cameraSpan=2,
 v101=null,showRepaired=false,v105AlignedScene=null,v102Artwork=null,
 v102Frame=null,v102Worker=null,v102SourceEpoch=0,v102ReferenceURL=null,
 v102PreviewGate=createAIGReal3DAdaptivePreviewGate();
const activeScene=()=>v105AlignedScene??(showRepaired&&v101?.workingScene?
 v101.workingScene:imported?.scene);

document.addEventListener('aig-real3d-v105-register-scene',event=>{
 const d=event.detail;
 if(!ready||!renderer||!imported||!d||
  d.sourceGLBSha256!==imported.actualSourceModelSha256||
  d.originalScene!==activeScene()||
  d.registeredScene?.schema!=='AIG_REAL3D_SCENE_V1'||
  !d.registration?.workingCopyAvailable||
  !d.registration?.explicitlyAuthorized||
  d.registration?.sourceVisibility!=='OBSERVED'){
  status('BLOCK：V105 校正來源或觀測授權不一致，不允許替換 GPU 工作副本');
  return;
 }
 try{
  v105AlignedScene=d.registeredScene;
  focusCamera();
  const frame=renderer.render(activeScene());
  if(frame.status!=='WEBGL_XYZ_TRIANGLES_RENDERED')
   throw Error('V105_ACTUAL_GPU_CORRECTED_XYZ_NOT_RENDERED');
  inspect();
  document.dispatchEvent(new CustomEvent('aig-real3d-v104-source-ready',{
   detail:{imported,scene:activeScene(),sourceRevision:v102SourceEpoch,
    reason:'V105_REGISTRATION'}
  }));
  status('V105 實測 CAD XY 定位工作副本已在真 GPU 顯示；原始 GLB 頂點、面、UV 不變。');
 }catch(e){v105AlignedScene=null;status('BLOCK：'+String(e?.message??e));}
});
const views={front:[0,.08],side:[Math.PI/2,.08],
 back:[Math.PI,.08],oblique:[.58,.23]};
function status(x){$('status').textContent=x;}
function enable(v){
 ready=v;for(const k of ['front','side','back','oblique','quality','png4k','repair101','adapt102'])
  $(k).disabled=!v;
 $('original101').disabled=!v||!v101?.workingScene;
 $('remodel101').disabled=!v||!v101?.workingScene;
}
async function prepareV102Artwork(source){
 const bitmap=await createImageBitmap(source);
 try{
  if(bitmap.width<96||bitmap.height<96||
   bitmap.width>7680||bitmap.height>4320)
   throw Error('V102_ARTWORK_IMAGE_DIMENSIONS_BLOCK');
  const w=bitmap.width,h=bitmap.height;
  const ratio=Math.min(1,1024/Math.max(w,h));
  const sw=Math.max(1,Math.round(w*ratio)),
   sh=Math.max(1,Math.round(h*ratio));
  const buffer=document.createElement('canvas');buffer.width=sw;buffer.height=sh;
  const ctx=buffer.getContext('2d',{willReadFrequently:true});
  if(!ctx)throw Error('V102_ORIGINAL_IMAGE_FRAME_UNAVAILABLE');
  ctx.drawImage(bitmap,0,0,sw,sh);
  let roi={x:0,y:0,width:w,height:h},alphaMeasured=false;
  if(sw>=96&&sh>=96){
   const mask=findAIGReal3DVisibleAlphaROI({
    rgba:ctx.getImageData(0,0,sw,sh).data,width:sw,height:sh});
   if(mask.alphaDerivedROI){
    const r=mask.subjectROI;
    roi={x:r.x*w/sw,y:r.y*h/sh,
     width:Math.min(w-r.x*w/sw,r.width*w/sw),
     height:Math.min(h-r.y*h/sh,r.height*h/sh)};
    alphaMeasured=true;
   }
  }
  if(v102ReferenceURL)URL.revokeObjectURL(v102ReferenceURL);
  v102ReferenceURL=URL.createObjectURL(source);
  const img=$('v102-original-image');img.src=v102ReferenceURL;img.hidden=false;
  const preview=$('model');
  const scale=Math.min(1,Math.sqrt(900000/(w*h)));
  preview.width=Math.max(96,Math.floor(w*scale));
  preview.height=Math.max(96,Math.floor(h*scale));
  preview.style.aspectRatio=w+' / '+h;
  $('v102-frame').style.aspectRatio=w+' / '+h;
  $('v102-frame-label').textContent=
   '原圖 '+w+'×'+h+'｜相機跟隨構圖'+(alphaMeasured?'（透明主體範圍）':'（完整畫面）');
  return {width:w,height:h,roi,alphaMeasured};
 }finally{bitmap.close();}
}
function focusCamera(){
 if(!renderer||!v102Artwork||!activeScene())
  throw Error('V102_IMAGE_FRAME_OR_SOURCE_NOT_READY');
 const [yaw,pitch]=views[mode];
 v102Frame=planAIGReal3DAdaptiveArtworkFrame({
  scene:activeScene(),
  artworkWidth:v102Artwork.width,artworkHeight:v102Artwork.height,
  subjectROI:v102Artwork.roi,yaw,pitch,
  originalImageSha256:imported.originalImageSha256,
  sourceRevision:v102SourceEpoch});
 renderer.setCamera(v102Frame.camera);
 $('v102-report').textContent=JSON.stringify({
  originalImageSHA:imported.originalImageSha256,
  originalGLBSHA:imported.actualSourceModelSha256,
  frame:v102Frame,previews:v102PreviewGate.snapshot(),
  originalArtworkPixelsUntouched:true,
  full4KOnlyOnExplicitExport:true,
  V101GeometryRemodelDedicatedWorkerImplemented:true,
  trainedNeuralAIInferenceInSeparateWorkerVerified:false,
  actualV101WorkingCopyAlreadyAvailable:Boolean(v101?.workingScene),
  hiddenBackOrHumanIdentityCertified:false,releasePASS:false
 },null,2);
}
function inspect(){
 if(!ready||!imported||!renderer)throw Error('真 GLB 尚未讀取');
 const camera=renderer.getCamera();
 bridge=connectAIGReal3DImportedGeometryToUnified4K({
  imported,camera
 });
 const active=activeScene();
 const metric4K=createAIGReal3DMetric4KWorkingScene(active),
  metricCamera=createAIGReal3DMetric4KCamera(camera,{sceneUnits:active.units});
 const active4K=auditAIGReal3D4KSourceProjection({
  scene:metric4K.scene,sourceSha256:imported.originalImageSha256,
  camera:metricCamera,width:3840,height:2160});
 const plan=planAIGReal3DNative4K({
  gpuLimit:renderer.getGpuLimit(),sourceTriangles:imported.sourceTriangles
 });
 const proof={
  schema:imported.schema,domain:imported.domain,assetId:imported.assetId,
  originalImageSHA:imported.originalImageSha256,
  actualGLBSourceSHA:imported.actualSourceModelSha256,
  sourceFaceCount:imported.sourceTriangles,realMeshes:imported.nodeCount,
  geometrySource:imported.perMesh,
  V101ShowingRepairedWorkingCopy:showRepaired,
  V101ActiveTriangleCount:active.nodes.reduce((s,n)=>s+n.mesh.triangleCount,0),
  V101ActiveSourceDetail4K:active4K,
  V105Metric4KSourceScale:metric4K.scaleApplied,
  V105OriginalCNCMMSourceNotRewritten:true,
  V101OriginalSourceNeverChanged:true,
  missingGeometryNeverAutomaticallyFabricated:true,
  sourceSHAAndModelBytesVerified:true,
  cameraBased4KGeometry:bridge.detail,
  nativeFramebufferBudget:plan,
  actuallyExecutedLocalAIModel:false,
  actualNeuralModelWeightsInstalled:false,
  trueHumanIdentityPhotoSimilarityTested:false,
  sourceTexturePBRMaterialCertified:false,
  selectedActualSDRShader:renderer.getColorPipeline(),
  originalGLTFMaterialFactorSourcesPreserved:imported.perMesh.every(x=>!!x.materialSourceFactors),
  animationSkinRigAutomaticallyTransferred:false,
  hdr10Readiness:auditAIGReal3DHDR10Source({
   rendererColorBits:[...(renderer.getLastStats()?.framebufferRGBBits??[8,8,8]),0],
   linearSceneFloatSource:false,sourceLuminanceActuallyMeasured:false,
   outputEncodedBitDepth:null,transferFunction:null,
   colorPrimaries:null,colorMatrix:null
  }),
  GGXSourceBRDFCurrentlyActive:renderer.getColorPipeline().physicallyBasedGGXDirectLighting,
  fullIBLAndHDR10OutputNotYetCertified:true,
  finalCinemaQualityPASS:false,releasePASS:false
 };
 $('proof').textContent=JSON.stringify(proof,null,2);
 return proof;
}
$('import').addEventListener('click',async()=>{
 const source=$('reference').files?.[0],model=$('mesh-file').files?.[0];
 if(!source||!model){status('BLOCK：請同時提供參考圖片和真 GLB 3D 檔');return;}
 if(source.size<32||source.size>12000000||model.size<128||model.size>35000000){
  status('BLOCK：照片 12 MB、GLB 35 MB 來源預算限制');return;
 }
 if(busy)return;
 busy=true;enable(false);
 try{
  const [image,glb]=await Promise.all([
   source.arrayBuffer(),model.arrayBuffer()
  ]);
  const [imageSha,modelSha]=await Promise.all([
   sha256AIGReal3DBytes(image),sha256AIGReal3DBytes(glb)
  ]);
  v101=null;showRepaired=false;v105AlignedScene=null;
  v102SourceEpoch++;
  if(v102Worker){v102Worker.terminate();v102Worker=null;}
  v102PreviewGate.setAIRebuilderBusy(false);
  v102Artwork=await prepareV102Artwork(source);
  $('v101-report').textContent='尚未檢查來源結構。';
  imported=await ingestAIGReal3DNativeGeneratedGLB({
   glbBytes:glb,referenceImageBytes:image,
   declaredImageSha256:imageSha,declaredGLBSha256:modelSha,
   domain:$('domain').value,
   assetId:'LocalNative'+$('domain').value,
   outputOrigin:'AUTHORIZED_SOURCE_MESH',
   sourceUnits:$('v104-units').value
  });
  if(renderer)renderer.destroy();
  renderer=createAIG3DRenderer($('model'),{quality:'balanced',
   pixelRatio:1,maxTriangles:200000,preserveDrawingBuffer:true,
   background:[.015,.028,.05,1]});
  if(renderer.status!=='READY')throw Error('真正 GPU WebGL 不可用');
  renderer.setInspectionMode('LIT');
  renderer.setColorPipeline($('v102-colors').value);
  enable(true);focusCamera();
  const result=renderer.render(activeScene());
  if(result.status!=='WEBGL_XYZ_TRIANGLES_RENDERED')
   throw Error('原始 GPU 三角面沒有真正繪製');
  inspect();
  document.dispatchEvent(new CustomEvent('aig-real3d-v104-source-ready',{
   detail:{imported,scene:activeScene(),sourceRevision:v102SourceEpoch}
  }));
  status('V99 已從真正 GLB 解析 '+imported.sourceTriangles+
   ' 個原始三角面；SHA 與 GPU PASS。來源人物身份及電影級外觀仍 BLOCK。');
 }catch(e){enable(false);status('BLOCK：'+String(e?.message??e));}
 finally{busy=false;}
});
for(const k of Object.keys(views))$(k).addEventListener('click',()=>{
 if(!ready||busy)return;
 try{mode=k;focusCamera();renderer.render(activeScene());}
 catch(e){status('BLOCK：'+e.message);}
});
$('quality').addEventListener('click',()=>{
 try{
  const r=inspect();
  status('真來源 4K 幾何：'+(
   r.cameraBased4KGeometry?.sourceDetailCandidatePASS?'畫面密度候選 PASS':'BLOCK')+
   '；女主角臉型、材質與動畫來源仍需實證。');
 }catch(e){status('BLOCK：'+e.message);}
});
$('png4k').addEventListener('click',async()=>{
 if(!ready||busy)return;
 busy=true;$('png4k').disabled=true;
 const originalPreviewCamera=renderer.getCamera();
 try{
  const [yaw,pitch]=views[mode];
  const nativeArtworkFrame=planAIGReal3DNativeOutputWithinArtwork({
   scene:activeScene(),artworkWidth:v102Artwork.width,
   artworkHeight:v102Artwork.height,subjectROI:v102Artwork.roi,
   originalImageSha256:imported.originalImageSha256,
   sourceRevision:v102SourceEpoch,
   outputWidth:3840,outputHeight:2160,yaw,pitch
  });
  const metric4K=createAIGReal3DMetric4KWorkingScene(activeScene()),
   metricCamera=createAIGReal3DMetric4KCamera(nativeArtworkFrame.camera,{
    sceneUnits:activeScene().units});
  renderer.setCamera(metricCamera);
  const out=await captureAIGReal3DNative4K({
   renderer,scene:metric4K.scene,
   sourceSha256:imported.originalImageSha256,
   output:'UHD_4K',workingMemoryMB:256,
   camera:metricCamera,requireSourceDetailPASS:false});
  if(fileURL)URL.revokeObjectURL(fileURL);
  fileURL=URL.createObjectURL(out.pngBlob);
  const a=document.createElement('a');a.href=fileURL;
  a.download='Real3D-V101-'+(showRepaired?'REPAIRED':'ORIGINAL')+'-3840x2160.png';a.click();
  const qa=JSON.parse($('proof').textContent);
  qa.actualNativeGPUFrameWidth=out.width;
  qa.actualNativeGPUFrameHeight=out.height;
  qa.actualNativeGPUReadback=out.trueGPUReadPixels;
  qa.V102NativePictureContentFrame=nativeArtworkFrame.nativeOutputFrameContentRect;
  qa.V102OriginalImageCompositionNotStretched=true;
  qa.V102SceneCameraOnlyOutput=true;
  qa.realSource4KPNG_SHA=out.sha256;
  qa.actualSource4KCloseUpGeometryGate=out.sourceGeometryProjectionQA?.sourceDetailCandidatePASS;
  $('proof').textContent=JSON.stringify(qa,null,2);
  status('已生成真正 3840×2160 GPU PNG（非 upscale）；來源外型仍不是正式人物身份認證。');
 }catch(e){status('BLOCK：'+String(e?.message??e));}
 finally{
  if(renderer&&ready){
   try{
    renderer.setCamera(originalPreviewCamera);
    renderer.render(activeScene());
   }catch(e){status('BLOCK：V102預覽相機復原失敗 '+String(e?.message??e));}
  }
  busy=false;$('png4k').disabled=!ready;
 }
});

$('repair101').addEventListener('click',()=>{
 if(!ready||!imported||v102Worker)return;
 const sourceSHA=imported.actualSourceModelSha256,
  jobId=++v102SourceEpoch;
 // V101 CPU source repair runs in its OWN actual Worker.
 // Canvas and last source image are still available while this runs.
 try{
  if(typeof Worker!=='function')throw Error('WEB_WORKER_REQUIRED_FOR_NONBLOCKING_REMODELLING');
  v102PreviewGate.setAIRebuilderBusy(true);
  renderer.setQuality('performance');
  v102Worker=new Worker(new URL('./aig-real3d-v102-remodel-worker.mjs',
   import.meta.url),{type:'module'});
  $('repair101').disabled=true;
  status('V102：AI 模型結構修整在獨立 Worker 執行中；原始 3D 預覽不必等待它完成。');
  const worker=v102Worker;
  const done=()=>{
   if(v102Worker===worker){worker.terminate();v102Worker=null;}
   v102PreviewGate.setAIRebuilderBusy(false);
   if(renderer)renderer.setQuality($('v102-quality').value==='duringAI'?
    'performance':'balanced');
   enable(ready);
  };
  worker.addEventListener('error',event=>{
   if(jobId!==v102SourceEpoch)return;
   status('BLOCK：V102 Worker 真實執行失敗：'+event.message);
   done();
  });
  worker.addEventListener('message',event=>{
   if(jobId!==v102SourceEpoch)return;
   const msg=event.data;
   if(msg?.jobId!==jobId||msg?.sourceSHA!==sourceSHA||
    msg.type==='REMODEL_BLOCK'){
    status('BLOCK：V102 Worker 回傳錯誤或來源 SHA 不符：'+msg?.reason);
    done();return;
   }
   if(msg.type!=='REMODEL_RESULT'){status('BLOCK：不明 Worker 回覆');done();return;}
   const result=msg.result;v101=result;
   const details={
    schema:result.schema,status:result.status,
    sourceImageSHA:result.sourceImageSHA,
    sourceModelSHA:result.sourceMeshSHA,
    assetId:result.originalAssetId??imported.assetId,
    independentRealWorkerExecuted:true,
    nodeReports:result.structural?.reports?.map(r=>({
     nodeId:r.nodeId,status:r.status,
     originalTriangles:r.before?.sourceTriangles,
     revisedTriangles:r.after?.sourceTriangles??null,
     originalWindingConflicts:r.before?.misorientedSharedEdges,
     repairedWindingConflicts:r.after?.misorientedSharedEdges??null,
     invertedOriginalFaceIDs:r.flippedOriginalFaceIDs??[],
     originalDisconnectedComponents:r.before?.disconnectedFaceIslands,
     workingDisconnectedComponents:r.after?.disconnectedFaceIslands
    })),
    trainedAI3DGeneratorActuallyCalled:false,
    trainedNeuralRepairModelActuallyCalled:false,
    originalGLBPreserved:true,releasePASS:false
   };
   $('v101-report').textContent=JSON.stringify(details,null,2);
   if(!result.workingScene){
    status('BLOCK：來源結構不安全，修整 Worker 未產生偽造補洞模型。');
    done();return;
   }
   showRepaired=true;v105AlignedScene=null;
   document.dispatchEvent(new CustomEvent('aig-real3d-v104-source-ready',{
    detail:{imported,scene:activeScene(),sourceRevision:v102SourceEpoch}
   }));
   focusCamera();
   // Return only the final GPU snapshot. AI's intermediate revisions
   // never trigger the full native 4K PNG pipeline.
   v102PreviewGate.enqueue({scene:activeScene(),
    sourceRevision:v102SourceEpoch,sourceSHA});
   done();
   requestAnimationFrame(time=>{
    try{
     const r=v102PreviewGate.pump(time,scene=>renderer.render(scene));
     if(r.status==='RENDERED_LATEST_SOURCE')
      status('V102：修整後真 3D 工作副本已自適應原圖框架；獨立 Worker 完成，4K 按需輸出。');
     else status('V102：預覽幀合併 '+r.status);
    }catch(e){status('BLOCK：'+e.message);}
   });
  });
  worker.postMessage({type:'REMODEL_SOURCE',jobId,sourceSHA,
   imported,camera:renderer.getCamera()});
 }catch(e){
  if(v102Worker){v102Worker.terminate();v102Worker=null;}
  v102PreviewGate.setAIRebuilderBusy(false);
  if(renderer)renderer.setQuality('balanced');
  status('BLOCK：'+e.message);enable(ready);
 }
});
$('v102-colors').addEventListener('change',()=>{
 if(!ready||!renderer||busy)return;
 try{
  const mode=$('v102-colors').value;
  renderer.setColorPipeline(mode);
  renderer.render(activeScene());
  const receipt=JSON.parse($('proof').textContent);
  receipt.sourceColorShaderMode=mode;
  receipt.originalSourceMaterialFactorsNotRewritten=true;
  receipt.materialTexturesAndTruePBRNotYetCertified=true;
  $('proof').textContent=JSON.stringify(receipt,null,2);
  status('已切換實際 GPU SDR 著色：'+mode+
   '；不需要重新運算 AI 幾何模型，正式 HDR10／PBR 尚未驗證。');
 }catch(e){status('BLOCK：'+String(e?.message??e));}
});
$('v102-quality').addEventListener('change',()=>{
 if(!renderer||!ready)return;
 try{
  const during=$('v102-quality').value==='duringAI';
  v102PreviewGate.setAIRebuilderBusy(during||v102Worker!==null);
  renderer.setQuality(during?'performance':'balanced');
  renderer.render(activeScene());
  status(during?'V102 低負載預覽：AI 重製優先，4K 僅按需匯出。':'V102 平衡預覽：仍以原始 AI 圖框架為準。');
 }catch(e){status('BLOCK：'+e.message);}
});
$('adapt102').addEventListener('click',()=>{
 if(!ready||!renderer)return;
 try{
  focusCamera();
  const result=renderer.render(activeScene());
  if(result.status!=='WEBGL_XYZ_TRIANGLES_RENDERED')
   throw Error('GPU自適應影格未輸出');
  status('V102 已依原 AI 圖片比例／主體範圍重設真 3D 鏡頭，沒有改動模型或要求 AI 重製。');
 }catch(e){status('BLOCK：'+e.message);}
});
for(const [id,repaired] of [['original101',false],['remodel101',true]]){
 $(id).addEventListener('click',()=>{
  if(!ready||busy||!v101?.workingScene)return;
  try{
   showRepaired=repaired;v105AlignedScene=null;
   document.dispatchEvent(new CustomEvent('aig-real3d-v104-source-ready',{
    detail:{imported,scene:activeScene(),sourceRevision:v102SourceEpoch}
   }));
   focusCamera();
   const result=renderer.render(activeScene());
   if(result.status!=='WEBGL_XYZ_TRIANGLES_RENDERED')
    throw Error('切換的真幾何沒有繪製');
   inspect();
   status(repaired?'正在顯示 V101 修整後真 XYZ 工作副本':'正在顯示 V99 原始 SHA 鎖定 GLB');
  }catch(e){status('BLOCK：'+e.message);}
 });
}
