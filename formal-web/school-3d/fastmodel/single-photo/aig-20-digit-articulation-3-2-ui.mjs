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
const $=id=>document.getElementById(id);
const KNOWN=new Map(AIG32_DIGITS.map(v=>[v.id,v]));
export function installAIG32DigitControls({
 getFusedScan,getBodyPose=()=>null
}={}){
 if(typeof getFusedScan!=='function'||typeof getBodyPose!=='function'||
  !$('digits32-build')||!$('digits32-proof'))
  throw Error('AIG32_SHARED_3D_DIGIT_UI_CONTRACT_REQUIRED');
 let rig=null,group=null,sourceSha=null,generated=null;
 const poses={},meshes=new Map();
 const status=(msg,bad=false)=>{
  $('digits32-status').textContent=(bad?'BLOCKED：':'')+msg;
  $('digits32-status').style.color=bad?'#ffc89d':'#b9eee7';
 };
 const disposeGeometry=()=>{
  if(!group)return;
  group.parent?.remove(group);
  for(const mesh of meshes.values()){
   mesh.geometry.dispose();mesh.material.dispose();
  }
  meshes.clear();group=null;
 };
 const reset=()=>{
  disposeGeometry();rig=null;sourceSha=null;generated=null;
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
  const next=poseAIG32AllDigits(rig,poses,{
   radialSegments:16,ringsPerPhalanx:5
  });
  if(!next.meshes.length)throw Error('目前沒有任何可見的手臂或腿部來源，不能虛構 20 根手指腳趾');
  const newGroup=new THREE.Group();
  newGroup.name='AIG32_TWENTY_TRUE_3D_SOURCE_ANCHORED_DIGIT_SURFACES';
  const created=new Map();
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
   s.mesh.parent.add(newGroup);
  }catch(e){
   newGroup.parent?.remove(newGroup);
   for(const mesh of created.values()){
    mesh.geometry.dispose();mesh.material.dispose();
   }
   throw e;
  }
  disposeGeometry();group=newGroup;meshes.clear();
  for(const [id,mesh] of created)meshes.set(id,mesh);
  generated=next;
  for(const d of AIG32_DIGITS){
   const disabled=next.blockedMissingSourceDigits.includes(d.id);
   const input=$('digits32-curl-'+d.id);
   input.disabled=disabled;
   $('digits32-value-'+d.id).textContent=disabled?'無來源':input.value+'%';
  }
  refreshChoice();reportProof();
  status('已在同一個 WebGL 工作區產生 '+next.generatedActual3DDigits+
   '/20 根真正立體指趾、'+next.generatedActual3DPhalanges+
   '/56 段可動指節；GPU 三角面 '+next.actualCurved3DTriangleCount+
   '。每根都有獨立彎曲。'+(next.blockedMissingSourceDigits.length?
    '缺乏肢體來源而停用：'+next.blockedMissingSourceDigits.length+' 根。':
    '雙手雙腳來源錨點均存在。')+
    '指趾的長度與外形仍為幾何推估，不是實測。');
 };
 const update=()=>{
  if(!group?.parent){status('請先按 01 產生真正的指趾曲面');return}
  try{commit()}catch(e){status(String(e.message||e),true)}
 };
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
  get proof(){return generated},
  clear:reset
 };
}
