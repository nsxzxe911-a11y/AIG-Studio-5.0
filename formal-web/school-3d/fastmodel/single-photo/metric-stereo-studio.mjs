/**
 * FastModel 7.13 — REAL end-to-end user workflow.
 * Local photograph bytes -> SHA -> rectified stereo disparity -> metric XYZ ->
 * independently orbitable textured WebGL triangle surface -> binary glTF2.
 */
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {createAIG713StereoCalibration,reconstructAIG713StereoSurface}
 from './aig-metric-stereo-7-13.mjs';
import {mountAIG714HeroineScan} from './aig-heroine-scan-ui-7-14.mjs';
import {mountAIG715CandidateStudio} from './aig-heroine-candidate-ui-7-15.mjs';
const $=id=>document.getElementById(id);
const status=$('status'),proof=$('proof'),screen=$('view'),download=$('export'),
 evidence=$('evidence'),start=$('reconstruct');
let model=null,calibration=null,result=null,leftCanvas=null,texture=null;
let sourceInfo=null,busy=false;
const state=(msg,ok=false)=>{status.textContent=msg;status.dataset.pass=ok?'true':'false';};
const canvasParent=screen.parentElement;
const renderer=new THREE.WebGLRenderer({canvas:screen,antialias:true,alpha:false});
renderer.setClearColor('#020c16',1);
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
const scene=new THREE.Scene();
scene.background=new THREE.Color('#020a13');
const camera=new THREE.PerspectiveCamera(45,1,.01,10000);
camera.position.set(0,0,5);
const controls=new OrbitControls(camera,screen);
controls.enableDamping=true;controls.minDistance=.01;
scene.add(new THREE.AmbientLight(0xffffff,1.8));
const light=new THREE.DirectionalLight(0xffffff,2.5);
light.position.set(0,1,2);scene.add(light);
function resize(){
 const b=canvasParent.getBoundingClientRect();
 const h=Math.max(350,screen.getBoundingClientRect().height||450);
 renderer.setSize(Math.max(10,b.width-20),h,false);
 camera.aspect=(b.width-20)/h;
 camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(canvasParent);
resize();
let prior=0;
renderer.setAnimationLoop(t=>{
 const dt=Math.min(.1,Math.max(0,(t-prior)/1000));prior=t;
 controls.update(dt);skin23Mixer?.update(dt);renderer.render(scene,camera);
});
let candidatePreview=null,skin23Preview=null,skin23Mixer=null;
function releaseSkinnedPreview(){
 if(!skin23Preview)return;
 if(skin23Mixer){
  skin23Mixer.stopAllAction();skin23Mixer.uncacheRoot(skin23Preview);
 }
 scene.remove(skin23Preview);
 const geo=new Set(),mat=new Set(),skeletons=new Set();
 skin23Preview.traverse(node=>{
  if(node.geometry)geo.add(node.geometry);
  for(const m of Array.isArray(node.material)?node.material:
   node.material?[node.material]:[])mat.add(m);
  if(node.isSkinnedMesh&&node.skeleton)skeletons.add(node.skeleton);
 });
 for(const s of skeletons)s.dispose();
 for(const g of geo)g.dispose();
 for(const m of mat)m.dispose();
 skin23Preview=null;skin23Mixer=null;
 if(model)model.visible=true;
}
function renderAIG23SkinPreview(result){
 releaseSkinnedPreview();
 if(!result)return;
 releaseCandidatePreview();
 skin23Preview=result.scene;
 scene.add(skin23Preview);
 if(model)model.visible=false;
 skin23Mixer=new THREE.AnimationMixer(skin23Preview);
 const action=skin23Mixer.clipAction(result.clips[0]);
 action.reset().play();
 controls.target.set(0,0,0);
 camera.position.set(.23,.14,1.8);
 camera.near=.001;camera.far=1000;camera.updateProjectionMatrix();
 controls.update();
}

function releaseCandidatePreview(){
 if(!candidatePreview)return;
 scene.remove(candidatePreview);
 candidatePreview.traverse(node=>{
  if(node.geometry?.dispose)node.geometry.dispose();
  if(node.material){
   const mats=Array.isArray(node.material)?node.material:[node.material];
   for(const m of mats){m.map?.dispose();m.dispose();}
  }
 });
 candidatePreview=null;
 if(model)model.visible=true;
}
function renderCandidatePreview(candidate){
 if(candidate!==null)releaseSkinnedPreview();
 if(candidate===null){releaseCandidatePreview();return;}
 if(!candidate?.geometryGroups)throw Error('AIG715_MISSING_REAL_CANDIDATE_GEOMETRY');
 const sourceCanvas=document.getElementById('heroine-photo');
 const group=new THREE.Group();
 group.name='AIG715_Editable_Relative_Depth_Not_Physical_Measurement';
 const palette={HAIR:0xc58e6a,FACE:0xf7b5a1,NECK:0xe8ac94,
  JACKET:0x597594,SHIRT:0xe9f2f7,SKIRT:0x9b6070,
  SKIN:0xf9c2a6,BAG:0x9a714b,ACCESSORY:0xcab071};
 try{
  for(const [part,p] of Object.entries(candidate.geometryGroups)){
   if(!p.triangles)continue;
   const geo=new THREE.BufferGeometry();
   geo.setAttribute('position',new THREE.Float32BufferAttribute(p.positions,3));
   geo.setAttribute('uv',new THREE.Float32BufferAttribute(p.uv,2));
   geo.computeVertexNormals();
   const texture=new THREE.CanvasTexture(sourceCanvas);
   texture.colorSpace=THREE.SRGBColorSpace;
   const material=new THREE.MeshStandardMaterial({map:texture,color:0xffffff,
    side:THREE.DoubleSide,roughness:1,metalness:0});
   const m=new THREE.Mesh(geo,material);
   m.name='AIG715_'+part+'_INDEPENDENT_RELATIVE_SURFACE';
   m.userData={semantic:part,source:'SINGLE_IMAGE_ESTIMATE',
    physicalDepthInMillimetres:false,sourceClothThicknessKnown:false};
   group.add(m);
  }
  if(!group.children.length)throw Error('AIG715_NO_RELIABLE_EDITABLE_TRIANGLES');
  releaseCandidatePreview();
  scene.add(group);candidatePreview=group;
  if(model)model.visible=false; // Existing measured stereo model remains intact.
  controls.target.set(0,0,0);
  camera.position.set(.25,.11,1.75);
  camera.near=.001;camera.far=1000;camera.updateProjectionMatrix();
  controls.update();
 }catch(e){
  if(candidatePreview!==group){
   group.traverse(n=>{
    n.geometry?.dispose();
    const m=n.material;if(m){m.map?.dispose();m.dispose();}
   });
  }
  throw e;
 }
}
function cleanupModel(){
 if(!model)return;
 scene.remove(model);model.geometry.dispose();model.material.dispose();
 texture?.dispose();model=null;texture=null;
}
function resetOutput(){
 // Transactional replacement: keep the previous valid measurements AND
 // 3D mesh until a new stereo pair has actually produced a new surface.
 // A failed file, missing camera calibration or low-confidence match
 // must never destroy the last usable model or its GLB download.
 download.disabled=!result;evidence.disabled=!result;
}
async function readImage(input,label){
 const file=input.files?.[0];
 if(!file||file.size<100||file.size>15000000||
  !['image/png','image/jpeg','image/webp'].includes(file.type))
  throw Error(label+'：必須選擇有效的 JPG / PNG / WebP（15MB 以下）');
 const bytes=await file.arrayBuffer();
 const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
 const digest='sha256:'+Array.from(hash,x=>x.toString(16).padStart(2,'0')).join('');
 const blob=new Blob([bytes],{type:file.type});
 const bitmap=await createImageBitmap(blob,{imageOrientation:'from-image'});
 if(bitmap.width<32||bitmap.height<32||bitmap.width>8192||bitmap.height>8192){
  bitmap.close();throw Error(label+'：影像原始尺寸無效');
 }
 return {bitmap,digest,fileName:file.name,originalWidth:bitmap.width,
  originalHeight:bitmap.height};
}
function raster(bitmap,w,h){
 const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});
 if(!ctx)throw Error('CANVAS_RGBA_UNAVAILABLE');
 ctx.drawImage(bitmap,0,0,w,h);
 return {width:w,height:h,data:ctx.getImageData(0,0,w,h).data,canvas};
}
const save=(bytes,filename,type)=>{
 const blob=bytes instanceof Blob?bytes:new Blob([bytes],{type}),
  url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=filename;a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
};
function makeMesh(recon,srcCanvas){
 const geo=new THREE.BufferGeometry();
 // Live WebGL preview displays actual millimetre-valued XYZ coordinates.
 geo.setAttribute('position',new THREE.BufferAttribute(recon.positions,3));
 geo.setAttribute('uv',new THREE.BufferAttribute(recon.uvs,2));
 geo.setIndex(new THREE.BufferAttribute(recon.indices,1));
 geo.computeVertexNormals();
 const tex=new THREE.CanvasTexture(srcCanvas);
 tex.colorSpace=THREE.SRGBColorSpace;
 const material=new THREE.MeshStandardMaterial({map:tex,side:THREE.DoubleSide,
  roughness:1,metalness:0});
 const mesh=new THREE.Mesh(geo,material);
 mesh.name='Observed_Stereo_Front_XYZ_CameraSpace_Millimetres';
 mesh.userData={
  aigReconstruction:'AIG713_ACTUAL_RECTIFIED_STEREO_VISIBLE_FRONT',
  aigPhysicalUnits:'millimetres',
  sourceLeftSHA256:recon.leftSHA256,
  sourceRightSHA256:recon.rightSHA256,
  baselineMillimetres:recon.physicalBaselineMm,
  backSideInferred:false,oneToOneScaleFromMeasuredBaseline:true
 };
 return {mesh,tex};
}
start.addEventListener('click',async()=>{
 if(busy)return;
 busy=true;start.disabled=true;resetOutput();
 let L=null,R=null;
 try{
  if(!($('physical-reviewed').checked&&$('camera-reviewed').checked&&
   $('rectified-reviewed').checked))
   throw Error('必須先完成實際相機位移、焦距與極線校正；一般兩張不同角度的照片不能直接當成平行雙目');
  const baselineMm=Number($('baseline').value),focalOrig=Number($('focal').value);
  if(!$('baseline').value.trim()||!$('focal').value.trim()||
   !Number.isFinite(baselineMm)||!Number.isFinite(focalOrig))
   throw Error('請提供實測 baseline mm 與原始照片 fx（像素）');
  state('正在讀取兩張照片並核對原始 SHA…');
  [L,R]=await Promise.all([
   readImage($('left-photo'),'左側照片'),readImage($('right-photo'),'右側照片')
  ]);
  if(L.originalWidth!==R.originalWidth||L.originalHeight!==R.originalHeight)
   throw Error('左右照片原始解析度不同；請先執行鏡頭與影像極線校正');
  if(L.digest===R.digest)throw Error('不能用同一張照片冒充兩個 3D 視角');
  const scale=Math.min(1,320/L.originalWidth,240/L.originalHeight),
   width=Math.floor(L.originalWidth*scale),
   height=Math.floor(L.originalHeight*scale);
  if(width<32||height<32)
   throw Error('來源照片長寬比過大，不能可靠建立視差');
  const left=raster(L.bitmap,width,height),right=raster(R.bitmap,width,height);
  const fxScaled=focalOrig*width/L.originalWidth;
  const approved=createAIG713StereoCalibration({
   width,height,focalPx:fxScaled,baselineMm,
   calibrationReviewed:true,rectifiedParallelReviewed:true,
   physicallyMeasuredBaseline:true,
   leftSHA256:L.digest,rightSHA256:R.digest
  });
  state('正在搜尋兩張來源影像的真實視差，沒有可靠匹配的區域將留空…');
  await new Promise(resolve=>requestAnimationFrame(resolve));
  const surface=reconstructAIG713StereoSurface(left,right,approved,{
   stride:2,patchRadius:2,minDisparity:2,
   maxDisparity:Math.min(56,Math.floor(width/4)),
   minTextureVariance:45,uniquenessMargin:.12,
   minCorrespondences:32,maxPixelComparisons:95000000
  });
  const {mesh,tex}=makeMesh(surface,left.canvas);
  releaseCandidatePreview();
  cleanupModel();
  model=mesh;texture=tex;scene.add(model);
  const box=new THREE.Box3().setFromObject(model),
   center=box.getCenter(new THREE.Vector3()),
   span=box.getSize(new THREE.Vector3());
  const radius=Math.max(span.length(),1);
  camera.position.copy(center).add(new THREE.Vector3(0,radius*.14,radius*1.65));
  camera.near=Math.max(.0001,radius/10000);
  camera.far=Math.max(1000,radius*300);
  camera.updateProjectionMatrix();
  controls.target.copy(center);controls.update();
  calibration=approved;result=surface;leftCanvas=left.canvas;
  sourceInfo={leftOriginalSHA256:L.digest,rightOriginalSHA256:R.digest,
   originalPixels:[L.originalWidth,L.originalHeight],
   sampledPixels:[width,height],focalPxOriginal:focalOrig,
   baselineMm,physicalCalibrationUserReviewed:true};
  const report={schema:surface.schema,sourceInfo,
   vertices:surface.vertexCount,triangles:surface.triangleCount,
   observedDepthRangeMm:surface.depthMmRange,
   coordinateUnits:'mm',
   outputGLTFUsesMetres:true,physicalScaleDependsOnAccurateBaseline:true,
   missingBacksideIsNotGenerated:true,metricPointAccuracyNotSurveyCertified:true,
   matchedSources:surface.stereoEvidence,
   GLBFromStereoRealTriangles:true};
  proof.textContent=JSON.stringify(report,null,2);
  download.disabled=false;evidence.disabled=false;
  document.dispatchEvent(new CustomEvent('aig713:surface-ready'));
  state('已生成可旋轉的毫米座標真 3D 前表面：'+
   surface.vertexCount+' 個立體頂點、'+surface.triangleCount+
   ' 個三角面。背面及無足夠特徵的區域保持未知。',true);
 }catch(err){
  download.disabled=!result;evidence.disabled=!result;
  state('BLOCKED：'+String(err.message||err)+'。上一份已完成的 3D 模型、深度證據和下載維持可用。');
 }finally{
  L?.bitmap.close();R?.bitmap.close();busy=false;start.disabled=false;
 }
});
download.addEventListener('click',async()=>{
 if(!model||!result)return;
 download.disabled=true;
 try{
  const meterGeometry=model.geometry.clone();
  const position=meterGeometry.getAttribute('position');
  for(let i=0;i<position.count;i++)
   position.setXYZ(i,position.getX(i)/1000,position.getY(i)/1000,position.getZ(i)/1000);
  position.needsUpdate=true;meterGeometry.computeVertexNormals();
  const out=new THREE.Mesh(meterGeometry,model.material);
  out.name='AIG_713_Measured_Stereo_Front_Surface_Gltf_Metres';
  out.userData={
   originalCoordinatesWereMm:true,gltfUnits:'metres',
   sourceLeftSHA256:result.leftSHA256,
   sourceRightSHA256:result.rightSHA256,
   cameraBaselineMm:calibration.baselineMm,
   cameraFocalPxAtSample:calibration.focalPx,
   actualBacksideUnknown:true,realCncMachineOutput:false
  };
  const binary=await new GLTFExporter().parseAsync(out,
   {binary:true,trs:true,onlyVisible:true,maxTextureSize:1024});
  if(!(binary instanceof ArrayBuffer)||binary.byteLength<100)
   throw Error('GLTF_BINARY_EXPORT_MISSING');
  save(binary,'AIG-FastModel-7-13-STEREO-METRIC-FRONT-GLTF-METRES.glb',
   'model/gltf-binary');
  meterGeometry.dispose();
  state('已輸出 glTF 2.0 真 3D：頂點以公尺儲存（1 mm = 0.001 m），來源量測與未知背面標記不變。',true);
 }catch(err){state('BLOCKED：GLB 無法可靠匯出：'+String(err.message||err));}
 finally{download.disabled=false;}
});
evidence.addEventListener('click',()=>{
 if(!result||!sourceInfo)return;
 save(JSON.stringify({
  schema:'AIG_FASTMODEL_7_13_METRIC_STEREO_EVIDENCE',
  sourceInfo,physicalCalibration:calibration,
  reconstructed:{vertices:result.vertexCount,triangles:result.triangleCount,
   depthMmRange:result.depthMmRange,frontWidthMm:result.visibleSurfaceWidthMm,
   observations:result.stereoEvidence},
  aMillimetreIsOnePhysicalMillimetreOnlyConditionalOnMeasuredCameraCalibration:true,
  fullSurfaceAccuracyCertified:false,backfaceUnknown:true,
  notAnAutonomousSinglePhoto1To1Reconstruction:true,
  excludesCNCMachineOutput:true
 },null,2),'AIG-FASTMODEL-7-13-METRIC-3D-PROVENANCE.json','application/json');
});
const heroine714=mountAIG714HeroineScan(()=>result&&leftCanvas&&sourceInfo?{
 surface:result,leftCanvas,sourceInfo,
 imageWidth:leftCanvas.width,imageHeight:leftCanvas.height
}:null);
mountAIG715CandidateStudio(()=>heroine714.getCandidateInputs(),
 renderCandidatePreview,renderAIG23SkinPreview);
window.addEventListener('pagehide',()=>{
 renderer.setAnimationLoop(null);releaseSkinnedPreview();releaseCandidatePreview();cleanupModel();controls.dispose();renderer.dispose();
},{once:true});
