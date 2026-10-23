/** Real3D 3.2 20 independently poseable actual 3D curved fingers/toes.
 * Controls and geometry use the existing THREE shared renderer. Source
 * geometry/GLB/NC are never overwritten. Phantom digits from a missing
 * limb are BLOCKED. All generated individual digit geometry is inferred,
 * NOT a photo-measured finger/toe, even with source-visible palms/feet.
 */
import * as THREE from 'three';
import {aig26SRGBToLinear} from './aig-vision-metric-color-2-6.mjs';
import {makeAIG32DigitRig,poseAIG32AllDigits,
 AIG32_DIGITS,AIG32_SCHEMA} from './aig-20-digit-articulation-3-2.mjs';
import {aig33PrepareImplicitGroups,AIG33_SCHEMA}
 from './aig-implicit-digit-field-3-3.mjs';
import {makeAIG33ImplicitSkinLayer,AIG33_SHADER_SCHEMA}
 from './aig-implicit-digit-raymarch-3-3.mjs';
import {constrainAIG34DigitPoseToPhoto,AIG34_SCHEMA}
 from './aig-photo-digit-silhouette-3-4.mjs';
const $=id=>document.getElementById(id);
const KNOWN=new Map(AIG32_DIGITS.map(v=>[v.id,v]));
export function installAIG32DigitControls({
 getFusedScan,getBodyPose=()=>null,
 getPhotoDigitConstraints=()=>[],getOriginalPhoto=()=>null
}={}){
 if(typeof getFusedScan!=='function'||typeof getBodyPose!=='function'||
  !$('digits32-build')||!$('digits32-proof'))
  throw Error('AIG32_SHARED_3D_DIGIT_UI_CONTRACT_REQUIRED');
 let rig=null,group=null,sourceSha=null,generated=null,focusProof=null;
 let implicitField=null,actualSurfaceMode=null;
 const poses={},meshes=new Map();
 const status=(msg,bad=false)=>{
  $('digits32-status').textContent=(bad?'BLOCKED：':'')+msg;
  $('digits32-status').style.color=bad?'#ffc89d':'#b9eee7';
 };
 const disposeGeometry=()=>{
  // Detail inspection may temporarily isolate implicit skin.
  // ALWAYS restore the old body visibility without deleting its geometry.
  const current=getFusedScan();
  if(current?.mesh?.isMesh)current.mesh.visible=true;
  if(!group)return;
  group.parent?.remove(group);
  for(const mesh of meshes.values()){
   mesh.geometry.dispose();mesh.material.dispose();
  }
  meshes.clear();group=null;
 };
 const reset=()=>{
  disposeGeometry();rig=null;sourceSha=null;generated=null;
  focusProof=null;implicitField=null;actualSurfaceMode=null;
  for(const k of Object.keys(poses))delete poses[k];
  for(const d of AIG32_DIGITS){
   const slider=$('digits32-curl-'+d.id);
   slider.value='0';slider.disabled=false;
   $('digits32-value-'+d.id).textContent='0%';
  }
  refreshChoice();
  reportProof();
 };
 const reportProof=()=>{
  $('digits32-proof').textContent=JSON.stringify({
   schema:AIG32_SCHEMA,sourceSha256:sourceSha,
   definedFingers:10,definedToes:10,
   definedTotalDigits:20,definedPhalanxSegments:56,
   actual3DRenderedDigitMeshes:generated?.generatedActual3DDigits??0,
   actual3DRenderedPhalanges:generated?.generatedActual3DPhalanges??0,
   actual3DIndexedTriangles:generated?.actualCurved3DTriangleCount??0,
   livingWebGLSceneShared:!!group?.parent,
   selectedSurfaceEngine:$('digits33-render-mode').value,
   displayedSurfaceEngine:actualSurfaceMode,
   analyticImplicitField:implicitField?.schema??null,
   photo34ConstraintSchema:AIG34_SCHEMA,
   verifiedSource2DPhotoTipsApplied:generated?.sourcePhotoConstraintsActuallyApplied??0,
   sourceXYConstrainedGroupCount:generated?.constrainedGroupCount??0,
   sourcePixelsAppliedWithDepthStillUnknown:generated?.surfaceSourceEvidence??null,
   actualAnalyticalCapsuleCount:implicitField?.actualImplicitCapsuleCount??0,
   realSDFRasterGroupCount:implicitField?.implicitGroupCount??0,
   fourBoundedProxyBoxesUsedOnlyForPixelCoverage:actualSurfaceMode==='GLSL3_IMPLICIT_SDF',
   visibleDigitSurfaceFromTriangleMeshes:actualSurfaceMode==='MESH_COMPAT_3_2',
   implicitFragmentShaderDepthWrites:actualSurfaceMode==='GLSL3_IMPLICIT_SDF',
   fullNaturalSkinTextureAndNailsApproved:false,
   mobileSustainedFPSCertified:false,
   actualSharedCameraFocus:focusProof,
   sourceVisiblePalmsFeet:rig?Object.fromEntries(Object.entries(
    rig.sourceAnchors).map(([k,v])=>[k,v?.observedPartLabel??false])):null,
   realIndividualFingerScanMeasurements:0,
   missingSourceDigitIds:generated?.blockedMissingSourceDigits??[],
   sourceDigitCounts:rig?.modelActualDigitRootCount??0,
   handFeetGeometrySourceMode:'INFERRED_PER_DIGIT_CONTOUR_FROM_VISIBLE_BODY_ROOTS',
   perDigitActualJoint3DAndPose:generated?.digitSummary??[],
   originalSource3DBodyAndGLBUntouched:true,
   all20PhysicallyMeasured:false,
   handFingerSelfCollisionVerified:false,
   feetToeSelfCollisionVerified:false,
   attachedPrintSafeManifoldVerified:false,
   photorealisticDetailsApproved:false,
   releaseAllowed:false
  },null,2);
 };
 const bodySource=()=>{
  const s=getFusedScan();
  if(!s?.report?.manifoldAudit?.closedManifold||!s.mesh?.isMesh||
   !s.viewer?.renderer||!s.mesh.parent||
   s.report.sourceSha256!==s.activeSourceSha256||
   s.viewer.movieMode||s.viewer.reviewBusy)
   throw Error('須先建立真實 3.0 融合人體與 SHA；不能在錄影期間更動');
  const latest=getBodyPose();
  if(latest?.sourceSha256!==undefined&&
   latest.sourceSha256!==s.report.sourceSha256)
   throw Error('3.1 姿勢來源 SHA 與 3.0 人體不一致');
  const f=s.report;
  const sourceFused=latest?.positions?{
   ...f,fusedOnePieceMesh:{...f.fusedOnePieceMesh,
    positions:latest.positions}
  }:f;
  return {s,sourceFused};
 };
 function poseFor(d){
  const p=poses[d.id];
  return p??{jointAnglesDegrees:Array(d.phalanges).fill(0),spread:0};
 }
 function chosenPalette(d,source){
  const sourceAnchor=rig.sourceAnchors[d.side+(d.type==='hand'?'Hand':'Foot')];
  const palette=source.fusedOnePieceMesh.sourceClassColorRGB;
  const rgb=palette[sourceAnchor?.effectiveRootSourceLabel]??[
   .62,.51,.43];
  return rgb.map(v=>aig26SRGBToLinear(
   Math.max(.07,Math.min(.95,Number(v)||.4))));
 }
 function geometryFrom(item){
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.BufferAttribute(item.positions,3));
  geo.setIndex(new THREE.BufferAttribute(item.indices,1));
  geo.computeVertexNormals();geo.computeBoundingSphere();
  return geo;
 }
 const refreshChoice=()=>{
  const id=$('digits32-choice').value,d=KNOWN.get(id);
  if(!d)return;
  const p=poseFor(d);
  $('digits32-spread').value=String(p.spread);
  const parts=p.jointAnglesDegrees;
  for(let j=0;j<3;j++){
   const v=$('digits32-joint-'+j);
   v.disabled=j>=d.phalanges;
   v.value=String(parts[j]??0);
  }
 };
 const commit=({reanchor=false}={})=>{
  const {s,sourceFused}=bodySource();
  if(reanchor||!rig||sourceSha!==s.report.sourceSha256){
   rig=makeAIG32DigitRig(sourceFused);
   sourceSha=s.report.sourceSha256;
  }
  const wantsImplicit=$('digits33-render-mode').value==='IMPLICIT_SDF';
  let next=poseAIG32AllDigits(rig,poses,{
   radialSegments:16,ringsPerPhalanx:5
  });
  if(!next.meshes.length)
   throw Error('目前沒有任何可見的手臂或腿部來源，不能虛構 20 根手指腳趾');
  const sourceConstraints=getPhotoDigitConstraints();
  if(wantsImplicit&&Array.isArray(sourceConstraints)&&sourceConstraints.length){
   const photo=getOriginalPhoto();
   if(photo?.sha!==s.report.sourceSha256)
    throw Error('3.4 照片 SHA 與原 3D 模型不一致');
   next=constrainAIG34DigitPoseToPhoto({
    result:next,rig,constraints:sourceConstraints,
    photoWidth:photo.width,photoHeight:photo.height
   });
  }
  let newGroup,newField=null,mode;
  const created=new Map();
  if(wantsImplicit){
   // Real3D 3.3 REQUIRES actual WebGL2 fragment depth. Never quietly
   // claim direct implicit skin when only 3.2 triangle fallback runs.
   const context=s.viewer.renderer.getContext();
   if(typeof context?.texImage3D!=='function')
    throw Error('3.3 真 SDF 渲染需要 WebGL2；可手動選 3.2 相容模式');
   newField=aig33PrepareImplicitGroups(next,rig,{
    quality:$('digits33-quality').value
   });
   const linearColours={};
   for(const part of newField.parts){
    const matchingDigit=KNOWN.get(
     part.side+(part.type==='hand'?'Hand':'Foot')+'index');
    linearColours[part.group]=chosenPalette(matchingDigit,sourceFused);
   }
   newGroup=makeAIG33ImplicitSkinLayer(newField,linearColours);
   mode='GLSL3_IMPLICIT_SDF';
   for(const m of newGroup.children)created.set(m.name,m);
  }else{
   // Nondefault, explicitly marked legacy compatibility mode.
   newGroup=new THREE.Group();
   newGroup.name='AIG32_LEGACY_TRIANGULATED_DIGIT_SURFACES';
   mode='MESH_COMPAT_3_2';
   try{
    for(const item of next.meshes){
     const digit=KNOWN.get(item.id);
     const geometry=geometryFrom(item);
     const linear=chosenPalette(digit,sourceFused);
     const material=new THREE.MeshStandardMaterial({
      color:new THREE.Color(...linear),roughness:.78,metalness:0,
      side:THREE.DoubleSide
     });
     const mesh=new THREE.Mesh(geometry,material);
     mesh.name='AIG32_DIGIT_'+item.id;
     mesh.userData={
      digitId:item.id,phalanges:item.phalanxCount,
      originalSourceSHA256:sourceSha,
      userHasNotMeasuredDigitDimensions:true,
      actual3DVertexCount:item.realCurved3DVertexCount,
      individuallyPosedRealPhalanges:item.phalanxCount
     };
     newGroup.add(mesh);created.set(item.id,mesh);
    }
   }catch(e){
    for(const mesh of created.values()){
     mesh.geometry.dispose();mesh.material.dispose();
    }
    throw e;
   }
  }
  try{s.mesh.parent.add(newGroup)}
  catch(e){
   for(const mesh of created.values()){
    mesh.geometry.dispose();mesh.material.dispose();
   }
   throw e;
  }
  // Atomic swap only after source contract, shader group, and scene attach.
  disposeGeometry();group=newGroup;meshes.clear();
  for(const [id,mesh] of created)meshes.set(id,mesh);
  implicitField=newField;actualSurfaceMode=mode;
  generated=next;
  if(mode==='GLSL3_IMPLICIT_SDF'&&focusProof?.requestedSourcePart&&
   focusProof.requestedSourcePart!=='body'){
   s.mesh.visible=false;
   for(const mesh of newGroup.children)
    mesh.visible=mesh.name.endsWith('_'+focusProof.requestedSourcePart);
  }
  for(const d of AIG32_DIGITS){
   const disabled=next.blockedMissingSourceDigits.includes(d.id);
   const input=$('digits32-curl-'+d.id);
   input.disabled=disabled;
   $('digits32-value-'+d.id).textContent=disabled?'無來源':input.value+'%';
  }
  refreshChoice();reportProof();
  const descriptor=actualSurfaceMode==='GLSL3_IMPLICIT_SDF'?
   ('GPU 直接 Ray Marching SDF：'+implicitField.implicitGroupCount+
    ' 組有機曲面、'+implicitField.actualImplicitCapsuleCount+
    ' 段解析距離場，指趾外觀不使用三角網線') :
   ('舊 3.2 相容網格：'+next.actualCurved3DTriangleCount+' 三角面');
  $('digits33-status').textContent='實際渲染：'+descriptor+
   '；人體真實皮膚細節、3D 量測與手機持續 FPS 仍未獲核准。';
  status('成功接入 '+next.generatedActual3DDigits+'/20 根、'+
   next.generatedActual3DPhalanges+'/56 指節；'+descriptor+'。'+
   (next.blockedMissingSourceDigits.length?
    '來源未見的指趾停用 '+next.blockedMissingSourceDigits.length+' 根。':'')+
   '未量測的手腳尺寸保持推估標示。');
 };
 const update=()=>{
  if(!group?.parent){status('請先按 01 產生真正的指趾曲面');return}
  try{commit()}catch(e){status(String(e.message||e),true)}
 };
 const focusPart=key=>{
  if(!group?.parent||!rig||!generated)
   throw Error('請先建立有來源 SHA 的實際 3D 指趾');
  const {s}=bodySource();
  const v=s.viewer;
  let target,position;
  if(key==='body'){
   const src=s.report.fusedOnePieceMesh.positions;
   const bbox=new THREE.Box3().setFromArray(src);
   const center=bbox.getCenter(new THREE.Vector3());
   const height=bbox.getSize(new THREE.Vector3()).y;
   target=[center.x,center.y,center.z];
   position=[center.x,center.y,center.z+Math.max(1.45,height*1.28)];
  }else{
   const anchor=rig.sourceAnchors[key];
   if(!anchor)throw Error('此手腳缺少可見來源錨點，禁止假造特寫');
   const h=rig.anchoredBodyHeightRelativeUnits;
   target=anchor.xyz.map((v,i)=>v+(
    i===1&&key.includes('Hand')?-.045*h:
     i===2&&key.includes('Foot')?.04*h:0));
   // The new 3.3 palm/sole implicit field is wider than 3.2 tube proxies.
   // Frame ALL five digits, not a zoomed-in unrecognizable coloured blob.
   position=[target[0]+.018*h,target[1]+
    (key.includes('Foot')?.17*h:.06*h),
    target[2]+(key.includes('Foot')?.78*h:.70*h)];
  }
  // For hands/feet closeups the crude 3.0 solid frequently occludes
  // every analytic finger inside the source-derived wrist/ankle.
  // Isolate ONLY in explicit part-inspection view; returning to BODY restores
  // full scene, original mesh unchanged, never a fake source measurement.
  if(actualSurfaceMode==='GLSL3_IMPLICIT_SDF'&&group){
   const isolate=key!=='body';
   s.mesh.visible=!isolate;
   for(const part of group.children)
    part.visible=!isolate||part.name.endsWith('_'+key);
  }else{s.mesh.visible=true}
  v.orbit=false;
  v.controls.autoRotate=false;
  v.controls.target.set(...target);
  v.camera.position.set(...position);
  v.camera.up.set(0,1,0);
  v.camera.lookAt(v.controls.target);
  v.controls.update();
  focusProof={
   requestedSourcePart:key,
   exactRealCameraPosition:position,
   exactRealCameraTarget:target,
   singleExistingWebGLRenderer:true,
   originalPhotoGLBNCUntouched:true,
   detailIsInferredUnlessPerDigitDepthMeasured:true,
   deliberatelyIsolatedDetailView:key!=='body',
   originalBodyRestoredWhenLeavingDetail:true
  };
  reportProof();
  status(key==='body'?'已恢復正面全身 3D 工作視角。':
   '已在原 WebGL 相機放大 '+key+
   ' 實際獨立指趾曲面；尚未證明是實測皮膚與指甲。');
 };
 for(const key of ['leftHand','rightHand','leftFoot','rightFoot','body'])
  $('digits32-focus-'+key).addEventListener('click',()=>{
   try{focusPart(key)}catch(e){status(String(e.message||e),true)}
  });
 for(const input of ['digits33-render-mode','digits33-quality'])
  $(input).addEventListener('change',()=>{
   if(group?.parent)update();
  });
 $('digits32-build').addEventListener('click',()=>{
  try{commit({reanchor:true})}catch(e){status(String(e.message||e),true)}
 });
 $('digits32-remove').addEventListener('click',()=>{
  reset();status('已移除 20 根獨立指趾暫存預覽；人體、原 GLB、3.0 與 3.1 均保留。');
 });
 $('digits32-reset').addEventListener('click',()=>{
  for(const p of Object.keys(poses))delete poses[p];
  for(const d of AIG32_DIGITS){
   $('digits32-curl-'+d.id).value='0';
   $('digits32-value-'+d.id).textContent='0%';
  }
  refreshChoice();update();
 });
 for(const digit of AIG32_DIGITS){
  $('digits32-curl-'+digit.id).addEventListener('input',()=>{
   const p=poseFor(digit),fraction=Number(
    $('digits32-curl-'+digit.id).value)/100;
   poses[digit.id]={...p,
    jointAnglesDegrees:Array(digit.phalanges).fill(0)
     .map((_,j)=>Math.round(fraction*(
      digit.type==='hand'?[65,80,70][j]:[40,60,50][j])))};
   $('digits32-value-'+digit.id).textContent=
    $('digits32-curl-'+digit.id).value+'%';
   if($('digits32-choice').value===digit.id)refreshChoice();
   update();
  });
 }
 $('digits32-choice').addEventListener('change',refreshChoice);
 for(const key of ['spread','joint-0','joint-1','joint-2']){
  $('digits32-'+key).addEventListener('input',()=>{
   const d=KNOWN.get($('digits32-choice').value);if(!d)return;
   const p=poseFor(d);
   const next={spread:Number($('digits32-spread').value),
    jointAnglesDegrees:[...p.jointAnglesDegrees]};
   if(key.startsWith('joint-')){
    const i=Number(key.at(-1));
    if(i>=d.phalanges)return;
    next.jointAnglesDegrees[i]=Number($('digits32-'+key).value);
   }
   poses[d.id]=next;
   update();
  });
 }
 $('photo23-source').addEventListener('change',()=>{
  reset();status('更換來源照片已隔離上一個來源的指趾預覽，不影響本機 GLB。');
 });
 $('scan29-hide').addEventListener('click',()=>{
  reset();status('原 3D 曲面已移除，因此指趾來源也清除。');
 });
 refreshChoice();reportProof();
 return {
  refreshFromHeadBodyPose(){
   if(!group?.parent)return;
   try{commit({reanchor:true})}
   catch(e){status('3.1 身體姿勢改變後，指趾同步遭阻擋：'+String(e.message||e),true)}
  },
  refreshFromPhotoContours(){
   if(!group?.parent)return;
   try{commit()}
   catch(e){status('3.4 照片輪廓接入失敗：'+String(e.message||e),true)}
  },
  get proof(){return generated},
  clear:reset
 };
}
