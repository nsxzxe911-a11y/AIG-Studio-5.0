/**
 * Genuine V105 CAD-vs-3D top silhouette pixel comparison.
 * Uses the exact V104 user-confirmed CNC XY polygon, not AI guessed height.
 */
import {createAIGReal3DTopCADObservation}
 from './aig-real3d-v104-cad-top-first.mjs';
import {compareAndRegisterAIGReal3DTopCAD}
 from './aig-real3d-v105-cad-silhouette-registration.mjs';
const $=id=>document.getElementById(id);
let source=null,scene=null,lastResult=null;
function setReady(ok){$('v105-compare').disabled=!ok;}
function showDifference(result){
 const size=result.resolution,canvas=$('v105-compare-canvas'),
  ctx=canvas.getContext('2d');
 if(!ctx)throw Error('CAD_SILHOUETTE_COMPARISON_CANVAS_MISSING');
 const original=result.originalMask,truth=result.observedCADMask,
  shifted=result.shiftedMask;
 const img=ctx.createImageData(size,size);
 for(let i=0;i<size*size;i++){
  const a=shifted?shifted[i]:original[i],b=truth[i],k=i*4;
  const rgb=a&&b?[60,171,138]:a?[240,166,59]:b?[176,100,212]:[5,16,28];
  img.data[k]=rgb[0];img.data[k+1]=rgb[1];
  img.data[k+2]=rgb[2];img.data[k+3]=255;
 }
 const buffer=document.createElement('canvas');
 buffer.width=size;buffer.height=size;
 buffer.getContext('2d').putImageData(img,0,0);
 ctx.imageSmoothingEnabled=false;
 ctx.clearRect(0,0,canvas.width,canvas.height);
 ctx.drawImage(buffer,0,0,canvas.width,canvas.height);
}
function compare(){
 if(!source||!scene)return;
 try{
  const vertices=JSON.parse($('v104-cad-outline').value);
  const observed=$('v104-cad-observed').checked;
  const observation=createAIGReal3DTopCADObservation({
   verticesXYmm:vertices,imageSha256:source.originalImageSha256,
   sourceVisibility:observed?'OBSERVED':'AI_ESTIMATED',
   originCNCmm:[0,0,0],assetId:source.assetId});
  const result=compareAndRegisterAIGReal3DTopCAD({
   scene,originalGLBSha256:source.actualSourceModelSha256,
   observedTopCAD:observation,
   resolution:96,maxTranslationMM:.5,
   authorizeTranslation:$('v105-authorize').checked});
  lastResult=result;
  showDifference(result);
  const receipt={
   schema:result.schema,status:result.status,
   originalGLBSha256:result.originalGLBSha256,
   observationImageSha256:result.observationImageSha256,
   sourceVisibility:result.sourceVisibility,
   originalRasterIoU:result.originalRasterIoU,
   bestRasterIoU:result.bestRasterIoU,
   measuredRasterIoUImprovement:result.measuredRasterIoUImprovement,
   proposedTranslationCNCmm:result.proposedTranslationCNCmm,
   originalSourceTriangleCount:result.originalSourceTriangleCount,
   sampledSourceAndCADSameMetricFrame:true,
   sourceGeometryUnchanged:result.sourceVertexPositionsNotModified,
   workingCopyAvailable:Boolean(result.workingScene),
   explicitlyAuthorized:result.declaredAuthorizedTranslation,
   observedHeightOrBackFaceCertified:false,
   imageSemanticSegmentationIndependentSourceCertified:false,
   actualTrainedNeuralGeometryModelCalled:false,releasePASS:false
  };
  $('v105-report').textContent=JSON.stringify(receipt,null,2);
  if(result.workingScene){
   document.dispatchEvent(new CustomEvent('aig-real3d-v105-register-scene',{
    detail:{sourceGLBSha256:source.actualSourceModelSha256,
     originalScene:scene,registeredScene:result.workingScene,
     registration:receipt}
   }));
   $('v104-current-face').textContent='V105 已建立實測輪廓的 XY 工作副本，原始 GLB 保留；GPU 可繼續查看工作副本。';
  }else{
   $('v104-current-face').textContent='V105 比對完成：'+
    result.status+'；只做誤差診斷，沒有修改原始模型。';
  }
 }catch(e){
  $('v104-current-face').textContent='BLOCK：'+String(e?.message??e);
 }
}
document.addEventListener('aig-real3d-v104-source-ready',event=>{
 const d=event.detail;
 if(!d?.imported?.actualSourceModelSha256||d.scene?.schema!=='AIG_REAL3D_SCENE_V1')return;
 source=d.imported;scene=d.scene;lastResult=null;
 setReady(true);
 if(d.reason!=='V105_REGISTRATION'){
  $('v105-authorize').checked=false;
  $('v105-report').textContent='真 GLB 來源已載入，請提供有尺寸的 CNC XY CAD 點列。';
 }
});
$('v105-compare').addEventListener('click',compare);
setReady(false);
