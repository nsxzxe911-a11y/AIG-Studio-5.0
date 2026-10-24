/**
 * V104 visual debug controls on the existing verified GLB native lab.
 * Only the TOP source view is generated on receipt; other five on click.
 * Canvas is CAD depth evidence, NOT a replacement for source artwork.
 */
import {createAIGReal3DTopCADObservation,createAIGReal3DTopFirstInspector,
 AIG_REAL3D_V104_FACES}
 from './aig-real3d-v104-cad-top-first.mjs';
const $=id=>document.getElementById(id);
let imported=null,scene=null,sourceRevision=0,inspector=null,selected='TOP',
 observedTopCAD=null;
const buttonId={TOP:'v104-top',FRONT:'v104-front',BACK:'v104-back',
 LEFT:'v104-left',RIGHT:'v104-right',BOTTOM:'v104-bottom'};
function status(s){$('v104-current-face').textContent=s;}
function fail(e){status('BLOCK：'+String(e?.message??e));}
function setReady(ok){
 for(const k of Object.values(buttonId))$(k).disabled=!ok;
 $('v104-summary').disabled=!ok;
 $('v104-cad-compare').disabled=!ok;
}
function drawView(face){
 const canvas=$('v104-depth-canvas'),ctx=canvas.getContext('2d');
 if(!ctx)throw Error('V104_2D_CAD_CANVAS_UNAVAILABLE');
 const r=face.resolution,raw=ctx.createImageData(r,r),
  lo=face.visibleDepthRange?.min??0,hi=face.visibleDepthRange?.max??0,
  dspan=Math.max(.00001,hi-lo);
 for(let i=0;i<r*r;i++){
  const hit=face.occupiedGrid[i]===1,
   v=hit?(face.depthGrid[i]-lo)/dspan:0,
   offset=i*4;
  raw.data[offset]=hit?Math.round(35+110*v):2;
  raw.data[offset+1]=hit?Math.round(88+150*v):12;
  raw.data[offset+2]=hit?Math.round(146+106*v):25;
  raw.data[offset+3]=255;
 }
 const buffer=document.createElement('canvas');buffer.width=r;buffer.height=r;
 buffer.getContext('2d').putImageData(raw,0,0);
 ctx.clearRect(0,0,canvas.width,canvas.height);
 ctx.imageSmoothingEnabled=false;
 ctx.drawImage(buffer,0,0,canvas.width,canvas.height);
 ctx.strokeStyle='rgba(130,195,225,.17)';ctx.lineWidth=1;
 for(let k=0;k<=8;k++){
  const x=canvas.width*k/8,y=canvas.height*k/8;
  ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,canvas.height);ctx.stroke();
  ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(canvas.width,y);ctx.stroke();
 }
 status('正在檢查 '+face.faceId+'｜真 XYZ 表面深度｜來源網格原始面數 '+
  face.rasterizedSourceTriangleCount+'｜非獨立照片量測');
}
function chooseFace(faceId){
 if(!inspector)return;
 try{
  const face=inspector.requestFace(faceId);
  selected=faceId;drawView(face);
  $('v104-report').textContent=JSON.stringify({
   requestedFace:faceId,axes:face.axes,
   originalIndexedTriangles:face.rasterizedSourceTriangleCount,
   originalVertexFaceIDsRetained:face.faceIdGrid.some(x=>x>=0),
   depthRange:face.visibleDepthRange,hitPixels:face.hitPixels,
   sourceNodePixelCounts:face.sourceNodePixelCounts,
   workPerformedOnDemand:inspector.audit(),
   sourceGeometrySha256:imported.actualSourceModelSha256,
   CADWorldCoordinates:'CNC_XY_Z_UP_TO_REAL3D_X_Z_NEGY',
   rendererDidNotRegenerateGeometry:true,
   missingFacePhotoIsNotRealGroundTruth:true,
   actualAI3DNeuralModelExecutedByThisInspector:false,
   sourcePhotoIdentitySimilarityMeasured:false,
   releasePASS:false
  },null,2);
 }catch(e){fail(e);}
}
function startInspector(){
 if(!imported||!scene)return;
 inspector=createAIGReal3DTopFirstInspector({
  scene,sourceGeometrySHA:imported.actualSourceModelSha256,
  masterOriginCNCmm:[0,0,0],observedTopCAD,resolution:64
 });
 setReady(true);chooseFace('TOP');
}
document.addEventListener('aig-real3d-v104-source-ready',event=>{
 const info=event.detail;
 if(info?.imported?.schema!=='AIG_REAL3D_V99_REAL_NATIVE_GENERATED_GLB_SOURCE_V1'||
  info?.scene?.schema!=='AIG_REAL3D_SCENE_V1'){
  fail(Error('V104_REAL_SOURCE_SHA_AND_XYZ_REQUIRED'));return;
 }
 imported=info.imported;scene=info.scene;
 sourceRevision=info.sourceRevision;
 observedTopCAD=null;
 $('v104-cad-outline').value='';
 $('v104-cad-observed').checked=false;
 try{startInspector();}
 catch(e){inspector=null;setReady(false);fail(e);}
});
for(const [faceId,id] of Object.entries(buttonId)){
 $(id).addEventListener('click',()=>chooseFace(faceId));
}
$('v104-summary').addEventListener('click',()=>{
 if(!inspector)return;
 try{
  const report=inspector.fullSixFaceSummary();
  $('v104-report').textContent=JSON.stringify(report,null,2);
  status('六面按需來源檢查完成；3 軸 × 6 視角＝18 個觀測分量，不是 18 維，也不是背面實測。');
 }catch(e){fail(e);}
});
$('v104-cad-compare').addEventListener('click',()=>{
 if(!imported||!scene)return;
 try{
  const parsed=JSON.parse($('v104-cad-outline').value);
  observedTopCAD=createAIGReal3DTopCADObservation({
   verticesXYmm:parsed,
   imageSha256:imported.originalImageSha256,
   sourceVisibility:$('v104-cad-observed').checked?'OBSERVED':'AI_ESTIMATED',
   actualTopPlaneHeightMM:null,
   originCNCmm:[0,0,0],assetId:imported.assetId
  });
  startInspector();
  $('v104-report').textContent=JSON.stringify({
   ...inspector.topCADComparison,
   originalTopObservationType:observedTopCAD.sourceVisibility,
   topPlaneHeightNotMeasured:true,
   sourceCADIsUserSuppliedNotIndependentlyAudited:true,
   anySingle2DTopCannotConfirmHumanOrAnimalBack:true,
   real3DHasNotBeenReshapedToFakeCADMatch:true,
   onDemandFacesGenerated:inspector.audit().actualFacesGenerated,
   releasePASS:false
  },null,2);
  status('已比較俯視 CAD XY 尺寸；此步只查輪廓外框，不冒稱深度或人體身份 1:1。');
 }catch(e){fail(e);}
});
setReady(false);
