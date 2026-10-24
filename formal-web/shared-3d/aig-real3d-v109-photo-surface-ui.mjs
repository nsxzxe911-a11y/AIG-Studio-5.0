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
async function createV110AlphaWorkingCopy(photo,originalImageSha){
 const maskFile=$('v110-mask-file').files?.[0]??null;
 const external=maskFile?await pngFromFile(maskFile):null;
 if(external&&(external.width!==photo.width||external.height!==photo.height))
  throw Error('V110_EXTERNAL_MASK_PIXEL_DIMENSIONS_MISMATCH');
 const externalMaskSha256=external?
  await sha256AIGReal3DBytes(external.bytes):null;
 const result=extractAIGReal3DV110Foreground({
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
  actualNeuralForegroundSegmentationRun:false,
  originalSourceCannotBeClaimedAsFull3D:true,
  outputRequiresV109ActualGLBAndGPU:true,
  releasePASS:false};
 $('v110-mask-report').textContent=JSON.stringify(evidence,null,2);
 return {maskedPNGBytes,maskedImageSha256,rgba:result.maskedRGBA,evidence};
}
$('v110-preview').addEventListener('click',async()=>{
 if(busy)return;busy=true;$('v110-preview').disabled=true;
 try{
  const f=$('photo').files?.[0],photo=await pngFromFile(f),
   sha=await sha256AIGReal3DBytes(photo.bytes);
  const result=await createV110AlphaWorkingCopy(photo,sha);
  status('V110 前景預覽完成：'+result.evidence.sourceMode+
   '。請核對遮罩輪廓；此處未生成深度或背面。');
 }catch(e){
  status('BLOCK：'+String(e?.message??e));
  $('v110-mask-report').textContent='BLOCK：'+String(e?.message??e);
 }finally{busy=false;$('v110-preview').disabled=false;}
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
$('build').addEventListener('click',async()=>{
 if(busy)return;busy=true;$('build').disabled=true;$('save').disabled=true;
 $('v110-preview').disabled=true;
 try{
  const f=$('photo').files?.[0],g=$('depth').files?.[0];
  const photo=await pngFromFile(f);
  const originalImageSha=await sha256AIGReal3DBytes(photo.bytes);
  const v110=await createV110AlphaWorkingCopy(photo,originalImageSha);
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
   originalOpaqueOrAlphaPhotoSha256:originalImageSha,
   modelSha256:modelSha,
   actualImportedTriangleCount:ingested.sourceTriangles,
   actualImportedImageSha256:ingested.originalImageSha256,
   textureEmbeddedInGLB:true,V107RealGPUFiveAxisSource:true,
   authenticScannedBackside:false,finalReleasePASS:false});
  for(const id of ['a','b'])$(id).value='0';
  $('progress').value='100';
  draw();$('save').disabled=false;$('reset').disabled=false;
 }catch(e){
  source=null;original=null;$('save').disabled=true;$('reset').disabled=true;
  status('BLOCK：'+String(e?.message??e));
  report({status:'BLOCK',error:String(e?.message??e),
   generatedReal3DSourceCertified:false});
 }finally{busy=false;$('build').disabled=false;$('v110-preview').disabled=false;}
});
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
