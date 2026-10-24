import {trainAIGReal3DV118LocalNeural}
 from './aig-real3d-v118-local-neural.mjs';
import {planAIGReal3DV117PhotoReconstruction,
 verifyAIGReal3DV117RealGPUInspection}
 from './aig-real3d-v117-evidence-orchestrator.mjs';
import {segmentAIGReal3DV111FromUserSeeds}
 from './aig-real3d-v111-seeded-segmentation.mjs';
import {extractAIGReal3DV110Foreground}
 from './aig-real3d-v110-source-mask.mjs';
import {buildAIGReal3DV109PhotoSurfaceGLB}
 from './aig-real3d-v109-photo-surface.mjs';
import {sha256AIGReal3DBytes,ingestAIGReal3DNativeGeneratedGLB}
 from './aig-real3d-v99-native-model-ingest.mjs';
import {createAIG3DRenderer}
 from './aig-real3d-webgl.mjs';
import {planAIGReal3DV107FiveAxis}
 from './aig-real3d-v107-five-axis-foot-head.mjs';
const $=id=>document.getElementById(id);
let renderer=null,source=null,original=null,blobURL=null,v110MaskURL=null,busy=false;
const status=t=>$('status').textContent=t;
const report=x=>$('receipt').textContent=JSON.stringify(x,null,2);
async function pngFromFile(file){
 if(!file||file.type!=='image/png'||file.size>12000000||file.size<64)
  throw Error('PNG_ONLY_AND_12MB_BUDGET');
 const array=new Uint8Array(await file.arrayBuffer());
 const bitmap=await createImageBitmap(new Blob([array],{type:'image/png'}));
 try{
  if(bitmap.width>1024||bitmap.height>1024||bitmap.width<16||bitmap.height<16)
   throw Error('PHOTO_IMAGE_16_TO_1024_PIXELS_PER_AXIS_REQUIRED');
  const c=document.createElement('canvas');c.width=bitmap.width;c.height=bitmap.height;
  const ctx=c.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(bitmap,0,0);
  return {bytes:array,width:bitmap.width,height:bitmap.height,
   rgba:ctx.getImageData(0,0,c.width,c.height).data};
 }finally{bitmap.close();}
}
let v111Photo=null;
const v111Seeds={foreground:[],background:[]};
const v111Canvas=$('v111-source-canvas');
const v111Ctx=v111Canvas.getContext('2d');
function v111Reflect(){
 $('v111-count').textContent='主體 '+v111Seeds.foreground.length+
  ' 點／背景 '+v111Seeds.background.length+' 點';
 if(!v111Photo)return;
 v111Canvas.width=v111Photo.width;v111Canvas.height=v111Photo.height;
 const data=new ImageData(new Uint8ClampedArray(v111Photo.rgba),
  v111Photo.width,v111Photo.height);
 v111Ctx.putImageData(data,0,0);
 const radius=Math.max(3,Math.min(v111Photo.width,v111Photo.height)*.012);
 for(const [kind,points] of Object.entries(v111Seeds))
  for(const p of points){
   v111Ctx.beginPath();v111Ctx.arc(p.x+.5,p.y+.5,radius,0,Math.PI*2);
   v111Ctx.fillStyle=kind==='foreground'?'#fb374b':'#3fbfff';
   v111Ctx.fill();
   v111Ctx.strokeStyle='#fff';v111Ctx.lineWidth=1;
   v111Ctx.stroke();
  }
}
$('photo').addEventListener('change',async()=>{
 v111Seeds.foreground=[];v111Seeds.background=[];v111Photo=null;
 $('v111-count').textContent='讀取來源圖片中…';
 try{
  const f=$('photo').files?.[0];if(!f)throw Error('NO_IMAGE');
  v111Photo=await pngFromFile(f);v111Reflect();
 }catch(e){$('v111-count').textContent='圖片讀取失敗：'+String(e?.message??e);}
});
v111Canvas.addEventListener('click',e=>{
 if(!v111Photo)return;
 const rect=v111Canvas.getBoundingClientRect();
 if(!rect.width||!rect.height)return;
 const x=Math.max(0,Math.min(v111Photo.width-1,
  Math.floor((e.clientX-rect.left)*v111Photo.width/rect.width))),
  y=Math.max(0,Math.min(v111Photo.height-1,
   Math.floor((e.clientY-rect.top)*v111Photo.height/rect.height)));
 const kind=$('v111-kind').value,other=kind==='foreground'?'background':'foreground';
 if(v111Seeds[kind].length>=80){status('BLOCK：單種來源標記最多 80 個');return;}
 if(v111Seeds[kind].some(p=>p.x===x&&p.y===y)||
  v111Seeds[other].some(p=>p.x===x&&p.y===y)){
  status('BLOCK：主體／背景標記不可使用同一來源像素');return;
 }
 v111Seeds[kind].push({x,y});v111Reflect();
 status('V111 已紀錄來源像素 ('+x+','+y+')：'+
  (kind==='foreground'?'主體':'背景')+'。至少各 2 點再執行。');
});
$('v111-clear').addEventListener('click',()=>{
 v111Seeds.foreground=[];v111Seeds.background=[];v111Reflect();
 status('V111 主體／背景標記已清除，原圖不變。');
});
async function createV110AlphaWorkingCopy(photo,originalImageSha){
 const maskFile=$('v110-mask-file').files?.[0]??null;
 const external=maskFile?await pngFromFile(maskFile):null;
 if(external&&(external.width!==photo.width||external.height!==photo.height))
  throw Error('V110_EXTERNAL_MASK_PIXEL_DIMENSIONS_MISMATCH');
 const externalMaskSha256=external?
  await sha256AIGReal3DBytes(external.bytes):null;
 const seeded=$('v111-enable').checked;
 const neural=$('v118-enable').checked;
 if(neural&&(seeded||external))
  throw Error('V118_NEURAL_TRAINING_CONFLICTS_WITH_V111_MODE_OR_EXTERNAL_MASK');
 if(seeded&&external)throw Error('V111_SEEDS_AND_EXTERNAL_MASK_ARE_MUTUALLY_EXCLUSIVE');
 const neuralResult=neural?await trainAIGReal3DV118LocalNeural({
  rgba:photo.rgba,width:photo.width,height:photo.height,
  sourcePhotoSha256:originalImageSha,
  foregroundSeeds:v111Seeds.foreground,
  backgroundSeeds:v111Seeds.background
 }):null;
 const segmentation=seeded?segmentAIGReal3DV111FromUserSeeds({
  rgba:photo.rgba,width:photo.width,height:photo.height,
  imageSha256:originalImageSha,
  foregroundSeeds:v111Seeds.foreground,
  backgroundSeeds:v111Seeds.background
 }):null;
 const result=neural?{
  schema:neuralResult.schema,
  maskedRGBA:neuralResult.workingRGBA,
  sourceMode:'V118_LOCALLY_TRAINED_NEURAL_PIXEL_INFERENCE',
  foreground:neuralResult.foregroundPixels,
  foregroundFraction:neuralResult.foregroundFraction,
  maxBorderRGBDistance:null,
  fractionAmbiguousSourceBoundary:neuralResult.boundaryUncertainFraction,
  originalImageColorPixelsPreserved:neuralResult.allOriginalPhotoRGBBytesPreserved
 }:seeded?{
  ...segmentation,
  maskedRGBA:segmentation.originalWorkingRGBA,
  sourceMode:segmentation.segmentationMode,
  foreground:segmentation.foregroundPixelCount,
  foregroundFraction:segmentation.foregroundFraction,
  maxBorderRGBDistance:null,
  fractionAmbiguousSourceBoundary:segmentation.uncertainBoundaryFraction,
  originalImageColorPixelsPreserved:segmentation.originalSourceRGBPreserved
 }:extractAIGReal3DV110Foreground({
  rgba:photo.rgba,width:photo.width,height:photo.height,
  imageSha256:originalImageSha,
  externalMaskRGBA:external?.rgba??null,
  externalMaskSha256,
  externalMaskConfirmed:$('v110-mask-confirm').checked,
  externalMaskMode:$('v110-mask-mode').value
 });
 const maskedCanvas=document.createElement('canvas');
 maskedCanvas.width=photo.width;maskedCanvas.height=photo.height;
 const context=maskedCanvas.getContext('2d',{willReadFrequently:true});
 if(!context)throw Error('V110_CANVAS_PNG_ENCODE_UNAVAILABLE');
 context.putImageData(new ImageData(result.maskedRGBA,photo.width,photo.height),0,0);
 const blob=await new Promise(resolve=>maskedCanvas.toBlob(resolve,'image/png'));
 if(!blob||blob.size<64)throw Error('V110_ALPHA_PNG_BINARY_ENCODE_FAILED');
 const maskedPNGBytes=new Uint8Array(await blob.arrayBuffer());
 const maskedImageSha256=await sha256AIGReal3DBytes(maskedPNGBytes);
 if(v110MaskURL)URL.revokeObjectURL(v110MaskURL);
 v110MaskURL=URL.createObjectURL(blob);
 $('v110-mask-preview').src=v110MaskURL;
 const evidence={schema:result.schema,sourceMode:result.sourceMode,
  originalImageSha256:originalImageSha,
  editedAlphaWorkCopySha256:maskedImageSha256,
  independentExternalMaskSha256:externalMaskSha256,
  foregroundPixels:result.foreground,
  foregroundFraction:result.foregroundFraction,
  maxBorderRGBDistance:result.maxBorderRGBDistance,
  fractionAmbiguousSourceBoundary:result.fractionAmbiguousSourceBoundary,
  originalImageColorPixelsPreserved:result.originalImageColorPixelsPreserved,
  maskedPNGImageEncodedFromSourcePixelColors:true,
  PNGTransparentRGBColorCanonicalizationPossible:true,
  actualNeuralForegroundSegmentationRun:neural,
  v118ModelWeightsSha256:neural?neuralResult.modelWeightsSha256:null,
  v118ActualLocalTrainingSamples:neural?neuralResult.trainingExamples:null,
  v118TrainingIterations:neural?neuralResult.trainingIterations:null,
  v118TrainingLossFinal:neural?neuralResult.trainingLossFinal:null,
  v118PretrainedHumanSemanticModelLoaded:false,
  v118NeuralInferencePerformedOnOriginalPixels:neural,
  v118SourceLabelsProvidedByUser:neural,
  originalSourceCannotBeClaimedAsFull3D:true,
  v111UserSeededSegmentation:seeded,
  foregroundSeedCount:seeded?v111Seeds.foreground.length:null,
  backgroundSeedCount:seeded?v111Seeds.background.length:null,
  v111OnlySourceConnectedColorNotSemanticAI:seeded,
  outputRequiresV109ActualGLBAndGPU:true,
  releasePASS:false};
 $('v110-mask-report').textContent=JSON.stringify(evidence,null,2);
 if(neural){
  $('v118-report').textContent=JSON.stringify({
   sourcePhotoSha256:originalImageSha,
   alphaWorkingImageSha256:maskedImageSha256,
   weightsSha256:neuralResult.modelWeightsSha256,
   actualNeuralInferenceExecuted:true,
   trainingSamples:neuralResult.trainingExamples,
   trainLossStart:neuralResult.trainingLossFirst,
   trainLossFinal:neuralResult.trainingLossFinal,
   foregroundPixels:neuralResult.foregroundPixels,
   sourceConfidence:'USER_PIXEL_LABELS_ONLY',
   semanticHumanSegmentationCertified:false,
   naturalHuman1to1Certified:false,releasePASS:false
  },null,2);
 }
 return {maskedPNGBytes,maskedImageSha256,rgba:result.maskedRGBA,evidence};
}
$('v110-preview').addEventListener('click',async()=>{
 if(busy)return;busy=true;$('v110-preview').disabled=true;
 try{
  const f=$('photo').files?.[0],photo=await pngFromFile(f),
   sha=await sha256AIGReal3DBytes(photo.bytes);
  const result=await createV110AlphaWorkingCopy(photo,sha);
  status('前景模型／來源預覽完成：'+result.evidence.sourceMode+
   '。請核對遮罩輪廓；此處未生成深度或背面。');
 }catch(e){
  status('BLOCK：'+String(e?.message??e));
  $('v110-mask-report').textContent='BLOCK：'+String(e?.message??e);
 }finally{busy=false;$('v110-preview').disabled=false;}
});
function omitV117RawPixels(plan){
 if(!plan)return null;
 const {workingRGBA,...record}=plan;
 return record;
}
$('v118-train').addEventListener('click',()=>{
 if(!$('v118-enable').checked){
  status('BLOCK：請先勾選 V118 本機神經網路並於原圖標記主體／背景');
  return;
 }
 if(!busy)$('v110-preview').click();
});
async function prepareV117SourcePlan(){
 const photo=await pngFromFile($('photo').files?.[0]),
  sourcePhotoSha256=await sha256AIGReal3DBytes(photo.bytes),
  externalFile=$('v110-mask-file').files?.[0]??null,
  depthFile=$('depth').files?.[0]??null,
  external=externalFile?await pngFromFile(externalFile):null,
  externalMaskSha256=external?
   await sha256AIGReal3DBytes(external.bytes):null,
  depthSourceSha256=depthFile?
   await sha256AIGReal3DBytes(new Uint8Array(await depthFile.arrayBuffer())):null;
 if($('v118-enable').checked){
  if(external||$('v111-enable').checked)
   throw Error('V118_NEURAL_CONFLICT_WITH_V111_OR_EXTERNAL_MASK');
  if($('v117-desired').value==='REQUIRE_COMPLETE_3D')
   return {status:'BLOCK',schema:'REAL3D_V118_NEURAL_ROUTE',
    code:'SINGLE_VIEW_CANNOT_PROVE_UNOBSERVED_BACKSIDE',
    nextAction:'V118 真 AI 前景分割無法推導未拍攝背面',
    actualNeuralModelExecuted:false,productionReleasePASS:false};
  if(depthSourceSha256&&(!$('depth-confirm').checked||
   depthSourceSha256===sourcePhotoSha256))
   throw Error('V118_SEPARATE_DEPTH_EVIDENCE_NOT_CONFIRMED');
  const inference=await trainAIGReal3DV118LocalNeural({
   rgba:photo.rgba,width:photo.width,height:photo.height,
   sourcePhotoSha256,
   foregroundSeeds:v111Seeds.foreground,
   backgroundSeeds:v111Seeds.background
  });
  return {
   status:'READY_FOR_TRUE_GLB_GPU',
   schema:'AIG_REAL3D_V118_ACTUAL_LEARNED_PIXEL_ROUTE_V1',
   route:'V118_LOCAL_NEURAL_TO_V109_GLTF_V107_GPU',
   selectedForegroundModule:'V118_LOCALLY_TRAINED_NEURAL_PIXEL_INFERENCE',
   sourcePhotoSha256,dimensions:[photo.width,photo.height],
   localNeuralWeightsSha256:inference.modelWeightsSha256,
   sourceCoverage:{foregroundPixels:inference.foregroundPixels},
   actualNeuralModelExecuted:true,
   actualLearnedHumanSemanticRecognition:false,
   declaredIndependentDepthSha256:depthSourceSha256,
   geometryType:depthSourceSha256?'OBSERVED_VISIBLE_DEPTH_ONLY_NO_UNKNOWN_BACKSIDE':
    'FLAT_FRONT_ONLY_2_5D',
   proposedGPUPoseSweep:[
    {a:0,b:0,progress:1},{a:90,b:0,progress:1},
    {a:0,b:90,progress:1},{a:90,b:90,progress:1},
    {a:45,b:180,progress:.5}
   ],
   completeHuman3DOrClothesRecovered:false,
   unknownBacksideRemainsUnknown:true,
   productionReleasePASS:false
  };
 }
 const plan=planAIGReal3DV117PhotoReconstruction({
  rgba:photo.rgba,width:photo.width,height:photo.height,
  sourcePhotoSha256,
  externalMaskRGBA:external?.rgba??null,externalMaskSha256,
  externalMaskConfirmed:$('v110-mask-confirm').checked,
  externalMaskMode:$('v110-mask-mode').value,
  foregroundSeeds:$('v111-enable').checked?v111Seeds.foreground:[],
  backgroundSeeds:$('v111-enable').checked?v111Seeds.background:[],
  depthSourceSha256,depthMeasurementDeclared:$('depth-confirm').checked,
  sourceWidthMM:Number($('width-mm').value),
  widthPhysicallyMeasured:$('width-verified').checked,
  desiredOutput:$('v117-desired').value
 });
 return plan;
}
let v117Running=false;
$('v117-plan').addEventListener('click',async()=>{
 if(v117Running||busy)return;
 v117Running=true;$('v117-plan').disabled=true;
 try{
  const plan=await prepareV117SourcePlan();
  $('v117-plan-report').textContent=JSON.stringify(omitV117RawPixels(plan),null,2);
  status(plan.status==='READY_FOR_TRUE_GLB_GPU'?
   'V117 已找到可執行來源路線：'+plan.selectedForegroundModule+
   '；原照片材質不變，真人背面未重建。':
   'V117 '+plan.status+'：'+(plan.nextAction??plan.code));
 }catch(e){
  status('BLOCK：'+String(e?.message??e));
  $('v117-plan-report').textContent=JSON.stringify({
   status:'BLOCK',error:String(e?.message??e),releasePASS:false},null,2);
 }finally{v117Running=false;$('v117-plan').disabled=false;}
});
$('v117-auto').addEventListener('click',async()=>{
 if(v117Running||busy)return;
 v117Running=true;$('v117-auto').disabled=true;$('v117-plan').disabled=true;
 $('v117-inspection-report').textContent='來源 GLB 與五姿態 GPU 尚未驗證。';
 try{
  const plan=await prepareV117SourcePlan();
  $('v117-plan-report').textContent=JSON.stringify(omitV117RawPixels(plan),null,2);
  if(plan.status!=='READY_FOR_TRUE_GLB_GPU'){
   status('V117 '+plan.status+'：'+(plan.nextAction??plan.code));
   return;
  }
  const built=await runReal3DPhotoBuild({v117Plan:plan});
  if(!built||!source||!renderer)
   throw Error('V117_SOURCE_GLTF_REAL_GPU_BUILD_NOT_COMPLETED');
  const frames=[];
  for(const target of plan.proposedGPUPoseSweep){
   $('a').value=String(target.a);
   $('b').value=String(target.b);
   $('progress').value=String(target.progress*100);
   draw(); // Real renderer.render, not a fake GPU frame receipt.
   const receipt=JSON.parse($('receipt').textContent);
   frames.push({...receipt.lastActualGPUFrame});
  }
  const checked=verifyAIGReal3DV117RealGPUInspection({
   plan,modelSha256:built.modelSha,
   sourceTriangles:built.sourceTriangles,actualFrames:frames
  });
  $('a').value='0';$('b').value='0';$('progress').value='100';
  draw();
  const finalReceipt=JSON.parse($('receipt').textContent);
  finalReceipt.v117ActualFivePoseGPUGate=checked;
  if(plan.localNeuralWeightsSha256){
   finalReceipt.v118ActualNeuralInferenceAndGPUGate={
    modelWeightsSha256:plan.localNeuralWeightsSha256,
    neuralWeightsActuallyTrainedAndExecuted:true,
    userAnnotatedPhotoPixelsRequired:true,
    actual5PoseGPUPASS:checked.checkedRealGPUFrames===5,
    pretrainedHumanSemanticWeightsPresent:false,
    completePhotorealisticHuman3D:false,
    productionReleasePASS:false
   };
  }
  report(finalReceipt);
  $('v117-inspection-report').textContent=JSON.stringify(checked,null,2);
  status('V117 五軸真 GPU 五姿態來源一致性 PASS；人體 1:1、深度缺口與未知背面仍 BLOCK。');
 }catch(e){
  status('BLOCK：'+String(e?.message??e));
  $('v117-inspection-report').textContent=JSON.stringify({
   status:'BLOCK',error:String(e?.message??e),
   actualNeuralInferencePerformed:false,productionReleasePASS:false},null,2);
 }finally{
  v117Running=false;$('v117-auto').disabled=false;$('v117-plan').disabled=false;
 }
});
function draw(){
 if(!source||!renderer)return;
 const a=Number($('a').value),b=Number($('b').value),
  p=Number($('progress').value)/100;
 $('a-value').textContent=a+'°';$('b-value').textContent=b+'°';
 $('progress-value').textContent=Math.round(p*100)+'%';
 const plan=planAIGReal3DV107FiveAxis({
  scene:source.scene,sourceGLBSha256:source.actualSourceModelSha256,
  aTiltDeg:a,bTurnDeg:b,footHeadProgress:p});
 renderer.setVirtualStageV107({matrix:plan.modelStageMatrix,
  sourceScene:source.scene,sourceMaxY:plan.clipSourceYMax,
  sourceGLBSha256:source.actualSourceModelSha256,clipEnabled:p<1});
 const gpu=renderer.render(source.scene);
 if(gpu.status!=='WEBGL_XYZ_TRIANGLES_RENDERED'||
  gpu.triangles!==source.sourceTriangles||!gpu.V107FiveAxisSourcePoseActive)
  throw Error('V109_PHOTO_TO_FIVE_AXIS_REAL_GPU_BLOCK');
 const latest=JSON.parse($('receipt').textContent);
 latest.lastActualGPUFrame={status:gpu.status,triangles:gpu.triangles,
  aTiltDeg:a,bTurnDeg:b,sourceHeightProgress:p,
  sourceSHA:source.actualSourceModelSha256,
  gpuClipEnabled:gpu.V107OriginalFootHeadGPUSliceEnabled};
 report(latest);
 status('真 GLB 表面已進行五軸 GPU 繪圖：A='+a+'° B='+b+'°，由底向上 '+Math.round(p*100)+'%。未知背面仍 BLOCK。');
}
async function runReal3DPhotoBuild({v117Plan=null}={}){
 if(busy)return;busy=true;$('build').disabled=true;$('save').disabled=true;
 $('v110-preview').disabled=true;
 try{
  const f=$('photo').files?.[0],g=$('depth').files?.[0];
  const photo=await pngFromFile(f);
  const originalImageSha=await sha256AIGReal3DBytes(photo.bytes);
  if(v117Plan&&(v117Plan.status!=='READY_FOR_TRUE_GLB_GPU'||
   v117Plan.sourcePhotoSha256!==originalImageSha||
   v117Plan.dimensions[0]!==photo.width||
   v117Plan.dimensions[1]!==photo.height))
   throw Error('V117_PLANNED_SOURCE_CHANGED_BEFORE_GPU_EXECUTION');
  const v110=await createV110AlphaWorkingCopy(photo,originalImageSha);
  if(v117Plan){
   const expectedMode=v117Plan.selectedForegroundModule==='V111_USER_SEEDED_COMPLEX_BACKGROUND'?
    'INTERACTIVE_COLOR_CONNECTED_NOT_NEURAL_AI':v117Plan.selectedForegroundModule;
   if(v110.evidence.sourceMode!==expectedMode||
    v117Plan.sourceCoverage.foregroundPixels!==v110.evidence.foregroundPixels||
    (v117Plan.localNeuralWeightsSha256??null)!==
     (v110.evidence.v118ModelWeightsSha256??null)||
    (v117Plan.sourceCoverage.externalMaskSha256??null)!==
      (v110.evidence.independentExternalMaskSha256??null))
    throw Error('V117_SOURCE_MASK_CHANGED_AFTER_PLANNING');
  }
  const imageSha=v110.maskedImageSha256;
  let depthValuesMM=null,depthSourceSha256=null;
  if(g){
   if(!$('depth-confirm').checked)
    throw Error('DEPTH_SOURCE_NOT_CONFIRMED_AS_SEPARATE_MEASUREMENT');
   const depth=await pngFromFile(g);
   if(depth.width!==photo.width||depth.height!==photo.height)
    throw Error('DEPTH_AND_PHOTO_IMAGE_DIMENSIONS_DIFFER');
   const near=Number($('depth-near').value),far=Number($('depth-far').value);
   if(!Number.isFinite(near)||!Number.isFinite(far)||
    far<=near||far-near>50000)
    throw Error('DEPTH_MM_RANGE_INVALID');
   depthSourceSha256=await sha256AIGReal3DBytes(depth.bytes);
   depthValuesMM=new Float32Array(depth.width*depth.height);
   for(let i=0;i<depthValuesMM.length;i++)
    depthValuesMM[i]=near+(depth.rgba[i*4]/255)*(far-near);
  }else if($('depth-confirm').checked)
   throw Error('NO_SEPARATE_DEPTH_PNG_IS_PRESENT');
  if(v117Plan&&
   (v117Plan.declaredIndependentDepthSha256??null)!==(depthSourceSha256??null))
   throw Error('V117_DEPTH_SOURCE_CHANGED_AFTER_PLANNING');
  const generated=buildAIGReal3DV109PhotoSurfaceGLB({
   rgba:v110.rgba,width:photo.width,height:photo.height,
   originalPNGBytes:v110.maskedPNGBytes,imageSha256:imageSha,
   sourceWidthMM:Number($('width-mm').value),
   widthPhysicallyMeasured:$('width-verified').checked,
   depthValuesMM,depthSourceSha256,
   depthMeasurementDeclared:!!g
  });
  if(generated.receipt.geometryGenerationGate!=='FRONT_SURFACE_CREATED')
   throw Error('SOURCE_SILHOUETTE_COVERAGE_BLOCK');
  const modelSha=await sha256AIGReal3DBytes(generated.glbBytes);
  const ingested=await ingestAIGReal3DNativeGeneratedGLB({
   glbBytes:generated.glbBytes,referenceImageBytes:v110.maskedPNGBytes,
   declaredImageSha256:imageSha,declaredGLBSha256:modelSha,
   domain:'PERSON',assetId:'FastModelV109ObservedFront',
   outputOrigin:'LOCAL_MODEL_OUTPUT',sourceUnits:'METERS'
  });
  if(renderer)renderer.destroy();
  renderer=createAIG3DRenderer($('gl'),{
   quality:'balanced',pixelRatio:1,maxTriangles:200000,
   preserveDrawingBuffer:true,background:[.015,.028,.05,1]});
  if(renderer.status!=='READY')throw Error('WEBGL_GPU_UNAVAILABLE');
  renderer.setInspectionMode('LIT');
  renderer.setColorPipeline('PBR_SDR');
  const span=Math.max(0.01,Number($('width-mm').value)/1000);
  renderer.setCamera({projection:'perspective',yaw:.45,pitch:.13,
   distance:span*3.8,focus:[0,0,0],fovDeg:48,
   orthoSpan:span*1.5,near:.0001,far:100});
  source=ingested;
  original={bytes:generated.glbBytes,sha:modelSha};
  if(blobURL)URL.revokeObjectURL(blobURL);
  blobURL=URL.createObjectURL(new Blob([photo.bytes],{type:'image/png'}));
  $('photo-preview').src=blobURL;
  report({...generated.receipt,v110SourceMask:v110.evidence,
   v117ActiveControllerPlan:v117Plan?omitV117RawPixels(v117Plan):null,
   originalOpaqueOrAlphaPhotoSha256:originalImageSha,
   modelSha256:modelSha,
   actualImportedTriangleCount:ingested.sourceTriangles,
   actualImportedImageSha256:ingested.originalImageSha256,
   textureEmbeddedInGLB:true,V107RealGPUFiveAxisSource:true,
   authenticScannedBackside:false,finalReleasePASS:false});
  for(const id of ['a','b'])$(id).value='0';
  $('progress').value='100';
  draw();$('save').disabled=false;$('reset').disabled=false;
  return {modelSha,sourceTriangles:ingested.sourceTriangles,actualGLB:true};
 }catch(e){
  source=null;original=null;$('save').disabled=true;$('reset').disabled=true;
  status('BLOCK：'+String(e?.message??e));
  report({status:'BLOCK',error:String(e?.message??e),
   generatedReal3DSourceCertified:false});
  return null;
 }finally{busy=false;$('build').disabled=false;$('v110-preview').disabled=false;}
}
$('build').addEventListener('click',()=>{void runReal3DPhotoBuild();});
for(const id of ['a','b','progress'])$(id).addEventListener('input',()=>{
 try{draw();}catch(e){status('BLOCK：'+String(e?.message??e));}
});
$('reset').addEventListener('click',()=>{
 if(!source)return;
 $('a').value='0';$('b').value='0';$('progress').value='100';
 try{draw();}catch(e){status('BLOCK：'+String(e?.message??e));}
});
$('save').addEventListener('click',()=>{
 if(!original)return;
 const url=URL.createObjectURL(new Blob([original.bytes],{type:'model/gltf-binary'}));
 const a=document.createElement('a');
 a.href=url;a.download='FastModel-V109-ObservedFrontOnly-'+original.sha.slice(0,12)+'.glb';
 a.click();
 requestAnimationFrame(()=>URL.revokeObjectURL(url));
});
