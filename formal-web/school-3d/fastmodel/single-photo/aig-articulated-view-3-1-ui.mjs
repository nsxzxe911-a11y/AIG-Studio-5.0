/**
 * 3.1 REAL head/neck + body articulation of ONE existing SDF WebGL mesh.
 * Reuses PhotoViewer camera, THREE geometry and PBR. No second renderer.
 * Camera can orbit ±180; human neck has separate conservative pose limits.
 * All original source, indices, colours, GLBs and movie tracks untouched.
 */
import * as THREE from 'three';
import {makeAIG31HeadBodyRig,poseAIG31FusedMesh,
 cameraAIG31Orbit,AIG31_JOINT_LIMITS,AIG31_SCHEMA}
 from './aig-articulated-view-3-1.mjs';
const $=id=>document.getElementById(id);
const JOINT_KEYS=Object.keys(AIG31_JOINT_LIMITS);
const message=e=>String(e?.message||e);
export function installAIG31HeadBodyControls({getFusedScan,onPoseApplied}={}){
 if(typeof getFusedScan!=='function'||!$('rig31-activate')||
  !$('rig31-camera-front'))throw Error('AIG31_FORMAL_WEBGL_JOINT_UI_REQUIRED');
 let rig=null,attachedMesh=null,sourceSha=null,pose=null,
  cameraProof=null,headFocus=false,renderWork=false;
 const status=(text,bad=false)=>{
  $('rig31-status').textContent=(bad?'BLOCKED：':'')+text;
  $('rig31-status').style.color=bad?'#ffd29a':'#b5f0e4';
 };
 const cameraStatus=(text,bad=false)=>{
  $('rig31-camera-status').textContent=(bad?'BLOCKED：':'')+text;
  $('rig31-camera-status').style.color=bad?'#ffd29a':'#b5eaf2';
 };
 const active=()=>{
  const s=getFusedScan();
  if(!s?.report?.manifoldAudit?.closedManifold||
   !s.mesh?.isMesh||!s.viewer?.scene||
   !s.mesh.parent||s.viewer.movieMode||s.viewer.reviewBusy||
   s.activeSourceSha256!==s.report.sourceSha256)
   throw Error('須先建立同來源 SHA、單一封閉 3D 曲面；錄影／驗證期間不可改模型');
  return s;
 };
 const refreshProof=()=>{
  const s=getFusedScan();
  $('rig31-proof').textContent=JSON.stringify({
   schema:AIG31_SCHEMA,originalPhotoSHA256:sourceSha,
   source3DManifoldVerified:s?.report?.manifoldAudit?.closedManifold??false,
   actualHeadNeckSeparateDeformation:!!rig,
   actualSourceVertexMoved:pose?.actualMovedVertexCount??0,
   headAffectedVertexCount:pose?.headActualMovedVertices??0,
   neckAffectedVertexCount:pose?.neckActualMovedVertices??0,
   armAffectedVertexCount:pose?.armActualMovedVertices??0,
   exactDegrees:pose?.poseAnglesDegrees??null,
   originalRestMeshIndicesUnchanged:pose?.originalIndicesUnchanged??null,
   perJointVertexCounts:rig?.affectedVertices??null,
   rigJointCount:rig?.jointCount??0,
   sourceInferredJointCenters:rig?.anchorMetadata?.pivots??null,
   currentCamera:cameraProof,
   fullCameraAzimuthLeftRight180:true,
   neckPhysical180RotationAllowed:false,
   originalPhotoAndGLBAndCNCUntouched:true,
   fullPhysicalAnatomyMeasured:false,
   sourceRGBBackDepthStillInferred:true,
   posedSurfaceSelfIntersectionsCertified:false,
   realPhysiologicalNeckROMCertified:false,
   facialExpressionAndDetailedHandsVerified:false,
   aestheticReleaseAllowed:false
  },null,2);
 };
 const detach=()=>{
  rig=null;attachedMesh=null;sourceSha=null;pose=null;headFocus=false;
  renderWork=false;refreshProof();
 };
 const attach=()=>{
  const s=active();
  if(rig&&attachedMesh===s.mesh&&sourceSha===s.report.sourceSha256)
   return {s,rig};
  const fresh=makeAIG31HeadBodyRig(s.report);
  rig=fresh;attachedMesh=s.mesh;
  sourceSha=s.report.sourceSha256;pose=null;
  // Existing 3.0 typed array and original user source are not modified:
  // at first pose replace only THIS PREVIEW geometry's working attribute.
  for(const name of JOINT_KEYS){
   const input=$('rig31-'+name);
   const compact=$('rig31-stage-'+name);
   if(compact)compact.value=input.value;
   input.disabled=!rig.anchorMetadata.pivots[name]||
    rig.affectedVertices[name]<10;
   if(compact)compact.disabled=input.disabled;
   if(input.disabled){input.value='0';
    if(compact)compact.value='0';
    $('rig31-value-'+name).textContent='無來源'}
   else $('rig31-value-'+name).textContent=input.value+'°';
  }
  refreshProof();return {s,rig};
 };
 const renderPose=()=>{
  if(!rig)return;
  const s=active();
  if(attachedMesh!==s.mesh||sourceSha!==s.report.sourceSha256){
   detach();throw Error('舊 3D 曲面來源已失效，請重新啟用關節');
  }
  const angles=Object.fromEntries(JOINT_KEYS.map(k=>[
   k,Number($('rig31-'+k).value)
  ]));
  const value=poseAIG31FusedMesh(rig,angles);
  // Allocate a new GPU working attribute: the verified watertight REST
  // geometry and its source SHA/indices remain unchanged. The posed shape
  // shares topology but may self-intersect; never call it print-certified.
  const geo=attachedMesh.geometry;
  geo.setAttribute('position',new THREE.BufferAttribute(value.positions,3));
  geo.computeVertexNormals();geo.computeBoundingSphere();
  geo.attributes.position.needsUpdate=true;
  geo.attributes.normal.needsUpdate=true;
  pose=value;refreshProof();
  // First-party Real3D 3.2 attachment: keep real finger/toe roots on the
  // newly posed wrist/ankle sources; failures are reported in 3.2 UI.
  if(typeof onPoseApplied==='function')onPoseApplied(value);
  status('真正的 3D 頂點關節變形：'+value.actualMovedVertexCount+
   ' 點；頭部 '+value.headActualMovedVertices+
   '、頸部 '+value.neckActualMovedVertices+
   '、手臂 '+value.armActualMovedVertices+
   '。模型原圖及 GLB 未修改；未核准關節自碰撞／外觀品質。');
 };
 const queuePose=()=>{
  if(renderWork)return;
  renderWork=true;
  requestAnimationFrame(()=>{
   renderWork=false;
   try{renderPose()}catch(e){status(message(e),true)}
  });
 };
 const centerOfBody=()=>{
  const s=active(),arr=s.report.fusedOnePieceMesh.positions;
  const box=new THREE.Box3().setFromArray(arr);
  return {center:box.getCenter(new THREE.Vector3()),
   min:box.min,max:box.max,size:box.getSize(new THREE.Vector3())};
 };
 const applyCamera=(az,elev,focus=headFocus)=>{
  const s=active(),bounds=centerOfBody();
  const target=focus&&rig?
   [rig.anchorMetadata.skull.x,
    rig.anchorMetadata.skull.y,
    rig.anchorMetadata.skull.z]:
   [bounds.center.x,bounds.center.y,bounds.center.z];
  const radius=focus&&rig?
   Math.max(.32,.65*(rig.anchorMetadata.skull.maxY-
    rig.anchorMetadata.skull.minY)*3):
   Math.max(1.5,bounds.size.y*1.3);
  const desired=cameraAIG31Orbit({
   target,azimuthDegrees:az,elevationDegrees:elev,radius
  });
  const viewer=s.viewer;
  viewer.orbit=false;
  viewer.controls.autoRotate=false;
  viewer.controls.target.set(...desired.target);
  viewer.camera.position.set(...desired.position);
  viewer.camera.up.set(0,1,0);
  viewer.camera.lookAt(viewer.controls.target);
  viewer.controls.update();
  headFocus=focus;
  cameraProof={
   ...desired,focus:focus?'HEAD':'BODY',
   sameExistingWebGLCamera:true,
   actualGLBAndBodyJointsNotRotated:true
  };
  $('rig31-camera-azimuth').value=String(az);
  $('rig31-camera-elevation').value=String(elev);
  cameraStatus('3D 相機：'+(focus?'頭部':'全身')+
   '，水平 '+az+'°、上下 '+elev+
   '°；左右 180° 僅轉鏡頭，不會扭斷脖子。');
  refreshProof();
 };
 $('rig31-stage-activate').addEventListener('click',()=>{
  $('rig31-activate').click();
 });
 for(const name of ['headYaw','neckYaw']){
  const compact=$('rig31-stage-'+name),main=$('rig31-'+name);
  compact.addEventListener('input',()=>{
   main.value=compact.value;
   main.dispatchEvent(new Event('input',{bubbles:true}));
  });
 }
 $('rig31-activate').addEventListener('click',()=>{
  try{
   const s=attach();
   queuePose();status('真實 3D 曲面關節已接入：'+s.rig.jointCount+
    ' 個關節，其中來源未拍到的手／腿將停用；頭部與頸部分開控制。');
  }catch(e){status(message(e),true)}
 });
 $('rig31-reset').addEventListener('click',()=>{
  try{
   const s=attach();
   for(const key of JOINT_KEYS){
    $('rig31-'+key).value='0';
    const compact=$('rig31-stage-'+key);
    if(compact)compact.value='0';
    $('rig31-value-'+key).textContent=$('rig31-'+key).disabled?'無來源':'0°';
   }
   renderPose();status('16 關節已恢復來源姿態，原 3D 曲面和素材均保留。');
  }catch(e){status(message(e),true)}
 });
 for(const name of JOINT_KEYS){
  const input=$('rig31-'+name);
  input.addEventListener('input',()=>{
   $('rig31-value-'+name).textContent=input.value+'°';
   const compact=$('rig31-stage-'+name);
   if(compact)compact.value=input.value;
   if(!rig){status('請先建立 3.0 曲面並按 01 啟用真正關節');return}
   queuePose();
  });
 }
 $('rig31-camera-azimuth').addEventListener('input',()=>{
  try{applyCamera(Number($('rig31-camera-azimuth').value),
   Number($('rig31-camera-elevation').value))}catch(e){cameraStatus(message(e),true)}
 });
 $('rig31-camera-elevation').addEventListener('input',()=>{
  try{applyCamera(Number($('rig31-camera-azimuth').value),
   Number($('rig31-camera-elevation').value))}catch(e){cameraStatus(message(e),true)}
 });
 const views={
  front:[0,0,false],left:[-90,0,false],right:[90,0,false],
  back:[180,0,false],top:[0,87,false],underside:[0,-87,false]
 };
 for(const [name,[az,elev,focus]] of Object.entries(views))
  $('rig31-camera-'+name).addEventListener('click',()=>{
   try{applyCamera(az,elev,focus)}catch(e){cameraStatus(message(e),true)}
  });
 $('rig31-focus-head').addEventListener('click',()=>{
  try{
   if(!rig)attach();
   applyCamera(Number($('rig31-camera-azimuth').value),
    Number($('rig31-camera-elevation').value),true);
  }catch(e){cameraStatus(message(e),true)}
 });
 $('rig31-focus-body').addEventListener('click',()=>{
  try{applyCamera(Number($('rig31-camera-azimuth').value),
   Number($('rig31-camera-elevation').value),false)}
  catch(e){cameraStatus(message(e),true)}
 });
 $('scan29-hide').addEventListener('click',detach);
 $('photo23-source').addEventListener('change',detach);
 refreshProof();return {get rig(){return rig},get pose(){return pose}};
}
