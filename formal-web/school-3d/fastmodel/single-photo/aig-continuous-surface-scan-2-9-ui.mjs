/** AIG Real3D 2.9: actual XYZ BufferGeometry in EXISTING PhotoViewer WebGL.
 * No additional renderer/canvas, no changes to the source GLB/world actor,
 * no fake radar echo, no inferred full-body physical 1:1 certification.
 */
import * as THREE from 'three';
import {aig26SRGBToLinear} from './aig-vision-metric-color-2-6.mjs';
import {buildAIG29ContinuousSurface,inspectAIG29FiveAxisSurface}
 from './aig-continuous-surface-scan-2-9.mjs';
const $=id=>document.getElementById(id);
export function installAIG29ContinuousScan({
 getImage,getSegmentation,getSharedViewer
}={}){
 if(typeof getImage!=='function'||typeof getSegmentation!=='function'||
  typeof getSharedViewer!=='function'||!$('scan29-build'))
  throw Error('AIG29_FORMAL_3D_SCAN_CONTRACT_REQUIRED');
 let overlay=null,scan=null,probeLines=null,rendererSource=null;
 let drawProof=null,scanStamp=null;
 const status=(message,bad=false)=>{
  $('scan29-status').textContent=(bad?'BLOCKED：':'')+message;
  $('scan29-status').style.color=bad?'#ffd298':'#aef5e6';
 };
 const disposeGroup=group=>{
  if(!group)return;
  group.parent?.remove(group);
  group.traverse(o=>{
   o.geometry?.dispose?.();
   if(Array.isArray(o.material))o.material.forEach(m=>m.dispose?.());
   else o.material?.dispose?.();
  });
 };
 const removeOverlay=()=>{
  disposeGroup(overlay);overlay=null;probeLines=null;
  scan=null;rendererSource=null;drawProof=null;scanStamp=null;
 };
 const proof=()=>{
  $('scan29-proof').textContent=JSON.stringify({
   schema:'AIG_REAL3D_2_9_ACTUAL_SHARED_THREE_WEBGL_PROOF',
   originalSourcePhotoSHA:scan?.sourceSha256??null,
   original2DImageSize:scan?.sourceSize??null,
   genuine3DMeshes:scan?.surfaces.length??0,
   actualTriangleCount:scan?.continuousTriangleCount??0,
   actualVertexCount:scan?.continuousVertexCount??0,
   actualSmoothNormalsPresent:!!scan?.surfaces.every(s=>
    s.normals.length===s.positions.length&&s.degeneracyCount===0),
   actualWebGLSceneObjectActive:!!overlay?.parent,
   sharedExistingViewerContext:!!rendererSource,
   sourceRGBColoursMappedOntoReal3DVertices:!!scan,
   modelFrontDepthAndBackAreGuessed:scan?.inferredFrontAndBackDepth??null,
   actualMeasuredPhysicalHeightMm:null,
   originalPhotoAndGLBPreserved:true,
   CNC5AXSurfaceNormalPath:probeLines?.userData?.inspection?.sampleCount??0,
   CNCMachineNeverMoved:true,
   simulatedProbeNotARealEcho:false,
   webGLDrawEvidence:drawProof,
   oneToOneRealWorldFullBodyCertified:false,
   releaseAllowed:false
  },null,2);
 };
 const source=()=>{
  const a=getImage(),b=getSegmentation();
  if(!a?.sha||!a.original||
   a.original.data.length!==a.width*a.height*4||
   !b?.segmentation||b.sha!==a.sha||
   b.width!==a.width||b.height!==a.height)
   throw Error('請先使用同一來源照片，完成 2.6 SHA 與 2.7 像素標籤');
  return {width:a.width,height:a.height,sourceSha256:a.sha,
   pixels:a.original.data,labels:b.segmentation.labels};
 };
 function colorForSourceXYZ(s,data,i,raw){
  const k=i*3,x=s.positions[k],y=s.positions[k+1],z=s.positions[k+2];
  const {width,height,labels,pixels}=data;
  const projectedX=Math.max(0,Math.min(width-1,Math.round(
   x/scan.bodyHeightUnits*height+(width-1)/2)));
  const projectedY=Math.max(0,Math.min(height-1,Math.round(
   height-1-y/scan.bodyHeightUnits*height)));
  const lookup=(projectedY*width+projectedX),front=z>=0;
  const observed=front&&labels[lookup]===s.sourceLabelId&&
   pixels[lookup*4+3]>128;
  const sourceRGB=observed?[
   pixels[lookup*4]/255,pixels[lookup*4+1]/255,
   pixels[lookup*4+2]/255]:raw;
  // Inferred rear material deliberately softened, not invented exact dye.
  return sourceRGB.map(v=>aig26SRGBToLinear(
   Math.max(0,Math.min(1,front?v:v*.80))));
 }
 const buildPreview=async()=>{
  const data=source(),radialSegments=Number($('scan29-radial').value),
   sliceStep=Number($('scan29-step').value),
   depthRatio=Number($('scan29-depth').value);
  status('正在從真正來源輪廓建立 XYZ 曲面、法線與 PBR 材質…');
  await new Promise(resolve=>setTimeout(resolve,0));
  const reconstruction=buildAIG29ContinuousSurface({
   ...data,radialSegments,sliceStep,depthRatio
  });
  const group=new THREE.Group();
  group.name='AIG29_REAL_SOURCE_BOUNDED_CONTINUOUS_SURFACE';
  group.userData={sourceSha256:data.sourceSha256,
   estimatedRearDepth:true,original3DGLBUntouched:true};
  for(const shell of reconstruction.surfaces){
   const geometry=new THREE.BufferGeometry();
   geometry.setAttribute('position',new THREE.BufferAttribute(shell.positions,3));
   geometry.setAttribute('normal',new THREE.BufferAttribute(shell.normals,3));
   geometry.setIndex(new THREE.BufferAttribute(shell.indices,1));
   const vertexColours=new Float32Array(shell.positions.length);
   for(let i=0;i<shell.vertexCount;i++){
    const col=colorForSourceXYZ(shell,data,i,shell.sourceVisibleRGB);
    vertexColours.set(col,i*3);
   }
   geometry.setAttribute('color',new THREE.BufferAttribute(vertexColours,3));
   geometry.computeBoundingSphere();
   const material=new THREE.MeshStandardMaterial({
    vertexColors:true,roughness:.76,metalness:0,
    side:THREE.FrontSide
   });
   const mesh=new THREE.Mesh(geometry,material);
   mesh.name='AIG29_SOURCE_LABEL_'+shell.sourceLabelId+'_TRUE_CURVED_SURFACE';
   mesh.userData={sourceLabelId:shell.sourceLabelId,
    sourceVisiblePixels:shell.sourceVisiblePixelCount,
    unknownDepth:true,actualTriangleCount:shell.triangleCount};
   group.add(mesh);
  }
  // Only swap the old 2.9 overlay AFTER the new geometry & viewer exist.
  const viewer=await getSharedViewer();
  if(!viewer?.scene||!viewer.renderer||viewer.movieMode||
   viewer.reviewBusy)throw Error('真正共享 3D 渲染器未就緒或正在錄影／檢查');
  try{
   viewer.scene.add(group);
   // Never reset scene, source GLBs, bone mixer, vault or textures.
   const prev=overlay;
   overlay=group;scan=reconstruction;rendererSource=viewer;
   probeLines=null;scanStamp=scan.sourceSha256;
   viewer.controls.target.set(0,1,0);
   viewer.camera.position.set(2.15,1.4,3.4);
   viewer.camera.lookAt(viewer.controls.target);
   viewer.controls.update();
   disposeGroup(prev);
   await new Promise(resolve=>requestAnimationFrame(()=>
    requestAnimationFrame(resolve)));
   drawProof={
    realActiveWebGLContext:!viewer.renderer.getContext()?.isContextLost?.(),
    actualDrawCalls:viewer.renderer.info.render.calls,
    actualSubmittedTriangles:viewer.renderer.info.render.triangles,
    expectedMinimumCurvedTriangles:scan.continuousTriangleCount,
    originalViewerRendererReused:true,
    compositorNotBillboard:true
   };
   proof();
   status('3D 曲面真正送入原 WebGL 視窗：'+
    reconstruction.surfaces.length+' 個連續曲面、'+
    reconstruction.continuousTriangleCount+' 個真 XYZ 三角面。'+
    '前後深度仍是推估，不冒充一比一測量。');
  }catch(e){
   if(overlay!==group)disposeGroup(group);
   throw e;
  }
 };
 $('scan29-build').addEventListener('click',async()=>{
  try{await buildPreview()}catch(e){status(String(e.message||e),true)}
 });
 $('scan29-probe').addEventListener('click',()=>{
  try{
   if(!scan||!overlay||!rendererSource||!scanStamp||
    getImage()?.sha!==scanStamp||!overlay.parent)
    throw Error('來源 3D 曲面已失效，請重新建立真正 XYZ 曲面');
   if(probeLines){
    disposeGroup(probeLines);probeLines=null;
    proof();status('已隱藏五軸虛擬探頭。原 3D 曲面仍保留。');
    return;
   }
   const standoff=Number($('scan29-standoff').value);
   const inspection=inspectAIG29FiveAxisSurface(scan,{
    standoff,perSurfaceSamples:120
   });
   const pts=new Float32Array(inspection.sampleCount*6);
   for(let i=0;i<inspection.sampleCount;i++){
    const p=inspection.probeSamples[i];
    pts.set(p.onGeneratedSurfaceXYZ,i*6);
    pts.set(p.probeXYZ,i*6+3);
   }
   const geometry=new THREE.BufferGeometry();
   geometry.setAttribute('position',new THREE.BufferAttribute(pts,3));
   const material=new THREE.LineBasicMaterial({
    color:0x65edee,transparent:true,opacity:.80,depthTest:true
   });
   const lines=new THREE.LineSegments(geometry,material);
   lines.name='AIG29_VIRTUAL_5AX_AB_PROBE_SOURCE_NORMALS';
   lines.userData={inspection:{
    sampleCount:inspection.sampleCount,
    uniqueAngles:inspection.uniqueSurfaceNormalOrientationBins,
    hardwareScan:false,notRealEcho:true
   }};
   overlay.add(lines);probeLines=lines;
   proof();status('已用真實曲面法線建立 '+inspection.sampleCount+
    ' 個虛擬五軸 A/B 檢查向量，非真實感測器回波或 CNC 指令。');
  }catch(e){status(String(e.message||e),true)}
 });
 $('scan29-hide').addEventListener('click',()=>{
  removeOverlay();proof();
  status('已移除 2.9 曲面預覽，原 GLB 動畫／場景／NC 核心保持不變。');
 });
 $('photo23-source').addEventListener('change',()=>{
  removeOverlay();proof();
  status('照片來源已變更，2.9 暫存曲面失效；原 3D 世界未刪除。');
 });
 proof();return {get report(){return scan},clear:removeOverlay};
}
