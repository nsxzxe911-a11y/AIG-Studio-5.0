/**
 * V106 actual source PNG alpha -> calibrated CAD TOP controls.
 * Browser SHA verifies exact selected photo equals V99 imported picture.
 * This doesn't invent RGB segmentation or backside and never auto-applies
 * the V105 mesh correction permission.
 */
import {extractAIGReal3DObservedAlphaContour,
 calibrateAIGReal3DAlphaToCAD}
 from './aig-real3d-v106-photo-cad-contour.mjs';
const $=id=>document.getElementById(id);
let source=null,contour=null,calibrated=null;
const setReady=()=>{
 $('v106-extract').disabled=!source;
 $('v106-calibrate').disabled=!contour;
};
function drawAlphaPixels(image,original){
 const c=$('v106-outline-canvas'),ctx=c.getContext('2d');
 if(!ctx)throw Error('V106_PIXEL_CANVAS_CONTEXT_REQUIRED');
 ctx.clearRect(0,0,c.width,c.height);
 const scale=Math.min(c.width/original.width,c.height/original.height),
  w=original.width*scale,h=original.height*scale,
  x=(c.width-w)/2,y=(c.height-h)/2;
 ctx.drawImage(image,x,y,w,h);
 ctx.beginPath();
 original.pixelVertices.forEach((p,i)=>{
  if(!i)ctx.moveTo(x+p[0]*scale,y+p[1]*scale);
  else ctx.lineTo(x+p[0]*scale,y+p[1]*scale);
 });
 ctx.closePath();ctx.lineWidth=2.4;ctx.strokeStyle='#efc764';ctx.stroke();
}
const fail=e=>{
 $('v106-report').textContent='BLOCK：'+String(e?.message??e);
};
document.addEventListener('aig-real3d-v104-source-ready',event=>{
 const d=event.detail;
 if(d?.reason==='V105_REGISTRATION')return;
 if(d?.imported?.schema!=='AIG_REAL3D_V99_REAL_NATIVE_GENERATED_GLB_SOURCE_V1')
  return;
 source=d.imported;contour=null;calibrated=null;
 $('v106-anchors').value='';
 $('v106-top-confirm').checked=false;
 $('v106-measured-confirm').checked=false;
 $('v106-report').textContent=
  '已取得原始 GLB 與圖片 SHA。請按「讀取 Alpha」檢驗原圖片像素。';
 setReady();
});
$('v106-extract').addEventListener('click',async()=>{
 if(!source)return;
 const image=$('reference').files?.[0];
 if(!image){fail(Error('ORIGINAL_IMAGE_FILE_MISSING'));return;}
 let bitmap=null;
 $('v106-extract').disabled=true;
 try{
  const fileBytes=await image.arrayBuffer(),
   digest=await crypto.subtle.digest('SHA-256',fileBytes),
   actualSHA=Array.from(new Uint8Array(digest),x=>
    x.toString(16).padStart(2,'0')).join('');
  if(actualSHA!==source.originalImageSha256)
   throw Error('SOURCE_IMAGE_SHA_CHANGED_SINCE_GLB_IMPORT');
  bitmap=await createImageBitmap(new Blob([fileBytes],{type:image.type}));
  if(bitmap.width>2048||bitmap.height>2048)
   throw Error('V106_SOURCE_IMAGE_EXCEEDS_BOUNDARY_TRACE_MEMORY_BUDGET');
  const canvas=document.createElement('canvas');
  canvas.width=bitmap.width;canvas.height=bitmap.height;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  if(!ctx)throw Error('V106_ORIGINAL_RGBA_CANVAS_UNAVAILABLE');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(bitmap,0,0);
  contour=extractAIGReal3DObservedAlphaContour({
   rgba:ctx.getImageData(0,0,canvas.width,canvas.height).data,
   width:bitmap.width,height:bitmap.height,imageSha256:actualSHA
  });
  drawAlphaPixels(bitmap,contour);
  $('v106-report').textContent=JSON.stringify({
   originalImageSha256:actualSHA,
   sourceWidth:contour.width,sourceHeight:contour.height,
   realSourceAlphaForegroundPixels:contour.pixelForegroundCount,
   truePixelContourVertices:contour.pixelVertices.length,
   connectedForegroundParts:contour.foregroundComponents,
   imageIsCertifiedTopView:false,
   calibratedPhysicalMillimeters:false,
   originalSourceMeshPreserved:true,releasePASS:false
  },null,2);
 }catch(e){contour=null;calibrated=null;fail(e);}
 finally{bitmap?.close();setReady();}
});
$('v106-calibrate').addEventListener('click',()=>{
 if(!contour||!source)return;
 try{
  const {pixelAnchors,cncAnchorsMM}=JSON.parse($('v106-anchors').value);
  calibrated=calibrateAIGReal3DAlphaToCAD({
   contour,pixelAnchors,cncAnchorsMM,
   confirmedTopView:$('v106-top-confirm').checked,
   calibratedMeasurement:$('v106-measured-confirm').checked,
   assetId:source.assetId
  });
  $('v104-cad-outline').value=
   JSON.stringify(calibrated.observedTopCAD.verticesXYmm);
  $('v104-cad-observed').checked=
   calibrated.observedTopCAD.sourceVisibility==='OBSERVED';
  $('v105-authorize').checked=false;
  $('v106-report').textContent=JSON.stringify({
   schema:calibrated.schema,imageSha256:calibrated.imageSha256,
   modelGLBSha256:source.actualSourceModelSha256,
   pixelVertices:contour.pixelVertices.length,
   resultingCalibratedCADVertices:calibrated.observedTopCAD.verticesXYmm.length,
   CADPixelMMScale:calibrated.mmPerPixel,
   sourceVisibility:calibrated.observedTopCAD.sourceVisibility,
   physicalLandmarksDeclaredMeasured:calibrated.userConfirmedPhysicalMeasurement,
   topCameraDeclaredCorrect:calibrated.userConfirmedTopOrientation,
   calibratedCADBoundsMM:calibrated.observedTopCAD.XYBoundsMM,
   physicallyUnseenHeightNotGuessed:true,
   actualNeuralAIPhotoGeometryReconstruction:false,
   V105MeshCorrectionNotAutomaticallyAuthorized:true,
   originalGLBAndPictureNotChanged:true,
   releasePASS:false
  },null,2);
 }catch(e){calibrated=null;fail(e);}
});
setReady();
