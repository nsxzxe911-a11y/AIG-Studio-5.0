import {auditAIGReal3DV116CaptureNormalAndOcclusion}
 from './aig-real3d-v116-capture-normal-occlusion.mjs';
import {auditAIGReal3DV115ObservedBoundaryAtlas}
 from './aig-real3d-v115-observed-boundary-atlas.mjs';
import {deduplicateAIGReal3DV114VerifiedOverlapGLB}
 from './aig-real3d-v114-verified-overlap-dedup.mjs';
import {auditAIGReal3DV113TwoViewOverlap}
 from './aig-real3d-v113-overlap-seam.mjs';
import {buildAIGReal3DV112CalibratedMultiViewGLB}
 from './aig-real3d-v112-calibrated-multiview.mjs';
import {sha256AIGReal3DBytes,ingestAIGReal3DNativeGeneratedGLB}
 from './aig-real3d-v99-native-model-ingest.mjs';
import {createAIG3DRenderer} from './aig-real3d-webgl.mjs';
import {auditAIGReal3DV107Source,planAIGReal3DV107FiveAxis}
 from './aig-real3d-v107-five-axis-foot-head.mjs';
const $=id=>document.getElementById(id);
const report=x=>$('v112-report').textContent=JSON.stringify(x,null,2);
const status=x=>$('status').textContent=x;
let imported=null,renderer=null,original=null,busy=false;
async function readPhoto(file){
 if(!file||file.type!=='image/png'||file.size<64||file.size>12000000)
  throw Error('V112_SOURCE_PNG_REQUIRED_UNDER_12MB');
 const bytes=new Uint8Array(await file.arrayBuffer());
 const bmp=await createImageBitmap(new Blob([bytes],{type:'image/png'}));
 try{
  if(bmp.width<16||bmp.height<16||bmp.width>512||bmp.height>512)
   throw Error('V112_CALIBRATED_SOURCE_RANGE_16_TO_512_PX');
  const canvas=document.createElement('canvas');
  canvas.width=bmp.width;canvas.height=bmp.height;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  if(!ctx)throw Error('V113_ORIGINAL_PHOTO_RGB_DECODE_CANVAS_REQUIRED');
  ctx.drawImage(bmp,0,0);
  const photoRGBA=ctx.getImageData(0,0,bmp.width,bmp.height).data;
  return {bytes,width:bmp.width,height:bmp.height,
   photoRGBA,sha:await sha256AIGReal3DBytes(bytes)};
 }finally{bmp.close();}
}
async function readDepth(file,width,height){
 if(!file||file.size<24||file.size>6000000)
  throw Error('V112_REAL_DEPTH_JSON_SOURCE_REQUIRED_UNDER_6MB');
 const bytes=new Uint8Array(await file.arrayBuffer());
 const depthSha=await sha256AIGReal3DBytes(bytes);
 let body;try{body=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}
 catch{throw Error('V112_DEPTH_JSON_INVALID');}
 if(body?.width!==width||body?.height!==height||
  !Array.isArray(body?.valuesMM)||body.valuesMM.length!==width*height)
  throw Error('V112_DEPTH_MAP_MUST_MATCH_REAL_PHOTO_PIXEL_GRID');
 // The input must explicitly claim measured millimeter depth; not RGB luminance.
 if(body.depthUnit!=='MM'||body.measuredWithDepthSensor!==true)
  throw Error('V112_REAL_DEPTH_SENSOR_DECLARATION_REQUIRED');
 return {depthValuesMM:new Float32Array(body.valuesMM),depthSha};
}
function drawV115OpenEdges(receipt,view){
 const canvas=$('v115-edge-map'),ctx=canvas.getContext('2d');
 canvas.width=view.width;canvas.height=view.height;
 ctx.fillStyle='#07111b';ctx.fillRect(0,0,canvas.width,canvas.height);
 ctx.lineWidth=1;
 for(const edge of receipt.newOpenEdgeSourceWitness){
  const pair=edge.secondCameraSourcePixelEndpoints;
  if(!pair?.length)continue;
  ctx.beginPath();ctx.moveTo(pair[0][0]+.5,pair[0][1]+.5);
  ctx.lineTo(pair[1][0]+.5,pair[1][1]+.5);
  ctx.strokeStyle=edge.supportedByCamera0MeasuredSource?'#29f3b5':'#ff514e';
  ctx.stroke();
 }
}
function drawV113Mismatch(source){
 const canvas=$('v113-seam-mask');
 const {width,height,firstViewMismatchMask}=source;
 canvas.width=width;canvas.height=height;
 const ctx=canvas.getContext('2d');
 const data=ctx.createImageData(width,height);
 for(let k=0;k<firstViewMismatchMask.length;k++){
  const idx=k*4,bad=firstViewMismatchMask[k]===1;
  data.data[idx]=bad?255:8;
  data.data[idx+1]=bad?54:21;
  data.data[idx+2]=bad?44:31;
  data.data[idx+3]=255;
 }
 ctx.putImageData(data,0,0);
}
function draw(){
 if(!imported||!renderer)return;
 const a=Number($('v112-a').value),b=Number($('v112-b').value),
  progress=Number($('v112-slice').value)/100;
 $('v112-a-label').textContent=a+'°';$('v112-b-label').textContent=b+'°';
 $('v112-slice-label').textContent=Math.round(progress*100)+'%';
 const plan=planAIGReal3DV107FiveAxis({
  scene:imported.scene,sourceGLBSha256:imported.actualSourceModelSha256,
  aTiltDeg:a,bTurnDeg:b,footHeadProgress:progress});
 renderer.setVirtualStageV107({matrix:plan.modelStageMatrix,
  sourceScene:imported.scene,sourceMaxY:plan.clipSourceYMax,
  sourceGLBSha256:imported.actualSourceModelSha256,clipEnabled:progress<1});
 const r=renderer.render(imported.scene);
 if(r.status!=='WEBGL_XYZ_TRIANGLES_RENDERED'||
  r.triangles!==imported.sourceTriangles||!r.V107FiveAxisSourcePoseActive||
  r.V107OriginalFootHeadGPUSliceEnabled!==(progress<1))
  throw Error('V112_NATIVE_V107_GPU_FRAME_OR_SOURCE_BLOCK');
 const entry=JSON.parse($('v112-report').textContent);
 entry.actualGPU={drawStatus:r.status,triangles:r.triangles,
  actualSourceSHA:imported.actualSourceModelSha256,
  aTiltDeg:a,bTurnDeg:b,progress,
  sourceOriginalGLBUnmodified:true,originalFacesStillPresent:true,
  independentRealPhotoLikenessTested:false};
 report(entry);
 status('V112 真 WebGL 顯示兩片來源幾何：A '+a+'°、B '+b+
  '°、高度 '+Math.round(progress*100)+'%。未知面不會自動生成。');
}
$('v112-build').addEventListener('click',async()=>{
 if(busy)return;
 busy=true;$('v112-build').disabled=true;$('v112-download').disabled=true;
 status('V116：正在核對雙視角來源、去重邊界與可選實測法線…');
 try{
  if(!$('v112-calibration-confirm').checked)
   throw Error('V112_CALIBRATED_PHYSICAL_DEPTH_DECLARATION_NOT_CONFIRMED');
  const photo=await Promise.all([0,1].map(i=>readPhoto($('v112-photo-'+i).files?.[0])));
  const depth=await Promise.all([0,1].map(i=>readDepth(
   $('v112-depth-'+i).files?.[0],photo[i].width,photo[i].height)));
  let spec;try{spec=JSON.parse($('v112-calibration').value);}
  catch{throw Error('V112_CALIBRATED_CAMERA_CONFIGURATION_INVALID_JSON');}
  if(!Array.isArray(spec?.views)||spec.views.length!==2)
   throw Error('V112_TWO_INDEPENDENT_CAMERA_CALIBRATIONS_REQUIRED');
  const views=photo.map((p,i)=>({
   width:p.width,height:p.height,imagePNGBytes:p.bytes,
   photoRGBA:p.photoRGBA,
   photoSha256:p.sha,depthValuesMM:depth[i].depthValuesMM,
   depthSha256:depth[i].depthSha,
   intrinsics:spec.views[i].intrinsics,
   cameraToWorldMM:spec.views[i].cameraToWorldMM,
   depthMeasuredAndCalibrated:true
  }));
  const built=buildAIGReal3DV112CalibratedMultiViewGLB({
   views,correspondences:spec.correspondences,step:spec.step??2,
   maxSurfaceEdgeMM:spec.maxSurfaceEdgeMM??35,
   maxCorrespondenceRmsMM:spec.maxCorrespondenceRmsMM??1});
  const modelSHA=await sha256AIGReal3DBytes(built.glbBytes);
  const v113=auditAIGReal3DV113TwoViewOverlap({
   views,sourceGLBSha256:modelSHA,
   depthToleranceMM:Number($('v113-depth-mm').value),
   maxColorSeamMean:Number($('v113-color-rms').value)
  });
  if(v113.researchGate!=='PASS_OBSERVED_SEAM_CONSISTENCY')
   throw Error('V113_'+v113.geometryOverlapStatus+
    '_RMS_'+v113.overlapRmsMM+'_P95_'+v113.overlapP95MM);
  const {diagnostics:v113Diagnostics,...v113Summary}=v113;
  const useV114=$('v114-dedup').checked;
  const integrated=useV114?deduplicateAIGReal3DV114VerifiedOverlapGLB({
   glbBytes:built.glbBytes,sourceGLBSha256:modelSHA,views,
   depthToleranceMM:Number($('v113-depth-mm').value),
   maxRawColorDifference:Number($('v114-color-threshold').value),
   minimumTrianglesRemoved:Number($('v114-min-removed').value)
  }):null;
  const workingGLB=integrated?.glbBytes??built.glbBytes;
  const workingSHA=integrated?await sha256AIGReal3DBytes(workingGLB):modelSHA;
  if(integrated&&workingSHA===modelSHA)
   throw Error('V114_NEW_WORKING_COPY_SHA_MUST_DIFFER');
  const boundary=integrated?await auditAIGReal3DV115ObservedBoundaryAtlas({
   originalGLBBytes:built.glbBytes,workingGLBBytes:workingGLB,
   originalGLBSha256:modelSHA,workingGLBSha256:workingSHA,views,
   depthToleranceMM:Number($('v113-depth-mm').value),
   maxRawColorDifference:Number($('v114-color-threshold').value),
   minimumVerifiedNewEdgeFraction:Number($('v115-min-edge-fraction').value)
  }):null;
  if(boundary){
   $('v115-report').textContent=JSON.stringify(boundary,null,2);
   drawV115OpenEdges(boundary,views[1]);
   if(boundary.researchGate!=='PASS_SOURCE_OPEN_EDGE_ATLAS')
    throw Error('V115_'+boundary.measuredOpenSeamTopologyGate);
  }
  const v116Enabled=$('v116-enable').checked;
  let v116=null;
  if(v116Enabled){
   if(!useV114||!boundary)
    throw Error('V116_REQUIRES_V114_AND_V115_VERIFIED_TWO_VIEW_SOURCE');
   let manifests;try{manifests=JSON.parse($('v116-captures').value);}
   catch{throw Error('V116_CAPTURE_MANIFEST_JSON_INVALID');}
   if(!Array.isArray(manifests)||manifests.length!==2)
    throw Error('V116_NEEDS_TWO_CAPTURE_MANIFESTS');
   const captureManifests=manifests.map((x,i)=>({
    ...x,photoSha256:photo[i].sha,depthSha256:depth[i].depthSha
   }));
   v116=auditAIGReal3DV116CaptureNormalAndOcclusion({
    views,captureManifests,v115Receipt:boundary,
    depthJumpMM:Number($('v116-jump-mm').value),
    maxNormalAngleDeg:Number($('v116-normal-deg').value),
    maxPointToPointMM:Number($('v116-point-mm').value)
   });
   $('v116-report').textContent=JSON.stringify(v116,null,2);
   if(v116.researchGate!=='PASS_COMPUTED_NORMAL_CONTINUITY')
    throw Error('V116_'+v116.normalAndSurfaceGate);
  }
  const result=await ingestAIGReal3DNativeGeneratedGLB({
   glbBytes:workingGLB,referenceImageBytes:photo[0].bytes,
   declaredImageSha256:photo[0].sha,declaredGLBSha256:workingSHA,
   domain:'PERSON',assetId:useV114?'FastModelV114VerifiedOverlap':'FastModelV112RegisteredTwoView',
   outputOrigin:'SCAN',sourceUnits:'METERS'});
  const actualTriangles=integrated?.receipt.totalTrianglesAfter??built.receipt.observedTriangleCount;
  if(result.sourceTriangles!==actualTriangles)
   throw Error('V114_SOURCE_TRIANGLES_CHANGED_ON_NATIVE_IMPORT');
  if(renderer)renderer.destroy();
  renderer=createAIG3DRenderer($('v112-gl'),{
   quality:'balanced',pixelRatio:1,maxTriangles:200000,
   preserveDrawingBuffer:true,background:[.015,.028,.05,1]});
  if(renderer.status!=='READY')throw Error('V112_WEBGL_GPU_CONTEXT_REQUIRED');
  renderer.setInspectionMode('LIT');renderer.setColorPipeline('PBR_SDR');
  const audit=auditAIGReal3DV107Source(result.scene,workingSHA),
   mn=audit.worldBounds.min,mx=audit.worldBounds.max,
   extent=Math.max(.05,mx[0]-mn[0],mx[1]-mn[1],mx[2]-mn[2]);
  renderer.setCamera({projection:'perspective',yaw:.55,pitch:.26,
   distance:extent*3.5,focus:audit.originalPivotWorld,
   fovDeg:48,orthoSpan:extent*1.1,near:.0001,far:2000});
  imported=result;original={sha:workingSHA,bytes:workingGLB};
  drawV113Mismatch(v113Diagnostics);
  $('v112-a').value='0';$('v112-b').value='0';$('v112-slice').value='100';
  report({...built.receipt,v113OverlapSeamAndMaterial:v113Summary,
   v114VerifiedOverlapIntegration:integrated?.receipt??null,
   v114IntegrationRequested:useV114,
   v115MeasuredOpenBoundaryAtlas:boundary,
   v115OriginalSourceNoWelding:true,
   v116CaptureNormalAndOcclusion:v116,
   v116OptInEnabled:v116Enabled,
   untouchedV112OriginalGLBSha256:modelSHA,
   actualModelSourceSha256:workingSHA,
   originalFirstPhotoSha256:photo[0].sha,
   secondIndependentPhotoSha256:photo[1].sha,
   trueNativeImportedTriangles:result.sourceTriangles,
   actualGPU:null,thirdProjectOnly:true,
   full1to1NaturalBodyModelCertified:false,releasePASS:false});
  draw();
  $('v112-download').disabled=false;$('v112-reset').disabled=false;
 }catch(e){
  imported=null;original=null;$('v112-download').disabled=true;
  $('v112-reset').disabled=true;
  report({status:'BLOCK',error:String(e?.message??e),
   independentCalibratedSourceNotAvailableOrUnverified:true,
   originalSourceUnmodified:true,releasePASS:false});
  status('BLOCK：'+String(e?.message??e));
 }finally{busy=false;$('v112-build').disabled=false;}
});
for(const id of ['v112-a','v112-b','v112-slice'])$(id).addEventListener('input',()=>{
 try{draw();}catch(e){status('BLOCK：'+String(e?.message??e));}
});
$('v112-reset').addEventListener('click',()=>{
 if(!imported)return;
 $('v112-a').value='0';$('v112-b').value='0';$('v112-slice').value='100';
 try{draw();}catch(e){status('BLOCK：'+String(e?.message??e));}
});
$('v112-download').addEventListener('click',()=>{
 if(!original)return;
 const url=URL.createObjectURL(new Blob([original.bytes],{type:'model/gltf-binary'}));
 const a=document.createElement('a');a.href=url;
 a.download='FastModel-V112-ObservedTwoView-'+original.sha.slice(0,12)+'.glb';
 a.click();requestAnimationFrame(()=>URL.revokeObjectURL(url));
});
