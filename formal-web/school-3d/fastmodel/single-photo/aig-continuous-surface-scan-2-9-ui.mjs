/** AIG Real3D 2.9: actual XYZ BufferGeometry in EXISTING PhotoViewer WebGL.
 * No additional renderer/canvas, no changes to the source GLB/world actor,
 * no fake radar echo, no inferred full-body physical 1:1 certification.
 */
import * as THREE from 'three';
import {planAIG36UnifiedCore,colourAIG36VertexShards,
 fitAIG36Camera,selectAIG36Lighting}
 from './aig-unified-120-core-3-6.mjs';
import {inspectAIG30FusedFiveAxisSurface}
 from './aig-fused-manifold-surface-3-0.mjs';
import {buildAIG35UnifiedAppearance}
 from './aig-unified-appearance-3-5.mjs';
import {buildAIG37Outfit,separateAIG37BodyColours}
 from './aig-modular-outfits-3-7.mjs';
import {createAIG38CharacterCatalog}
 from './aig-character-asset-index-3-8.mjs';
import {createAIG39StabilitySession,planAIG39ConservativeBudget}
 from './aig-runtime-stability-3-9.mjs';
import {deformAIG39AttachedGarment}
 from './aig-garment-pose-follow-3-9.mjs';
import {buildAIG310ModularHair}
 from './aig-modular-hair-3-10.mjs';
import {buildAIG314HeroineSourceHair}
 from './aig-heroine-hair-silhouette-3-14.mjs';
import {resolveAIG311PoseContacts}
 from './aig-contact-constraints-3-11.mjs';
import {createAIG312SecondaryMotion}
 from './aig-secondary-motion-3-12.mjs';
import {buildAIG314BodyTriangleGrid,resolveAIG314TriangleContacts}
 from './aig-triangle-contact-3-14.mjs';
import {getAIG314VerifiedAuthorityPalette,
 applyAIG314ObservedPaletteToBody}
 from './aig-heroine-authority-3-14.mjs';
import {auditAIG314ActualTriangleIntersections}
 from './aig-triangle-intersection-audit-3-14.mjs';
const $=id=>document.getElementById(id);
export function installAIG29ContinuousScan({
 getImage,getSegmentation,getSharedViewer,getBodyPose=()=>null
}={}){
 if(typeof getImage!=='function'||typeof getSegmentation!=='function'||
  typeof getSharedViewer!=='function'||!$('scan29-build'))
  throw Error('AIG29_FORMAL_3D_SCAN_CONTRACT_REQUIRED');
 let overlay=null,scan=null,probeLines=null,rendererSource=null;
 let drawProof=null,scanStamp=null,appearanceProof=null;
 let core36Proof=null,lighting36Proof=null,restore36Lighting=null;
 let wardrobe37Proof=null,wardrobe37Layer=null,body37Proof=null;
 let motion39Proof=null,lastPose39=null;
 let hair310Layer=null,hair310Proof=null;
 let contact311Proof=null,motion312Proof=null,contact314Proof=null;
 let poseGrid314=null,poseGrid314Source=null;
 let heroine314Proof=null,triangleIntersect314Proof=null;
 const dynamics312=new Map();
 let simulation312Frame=null,simulation312Id=0;
 const cancelSimulation312=()=>{
  simulation312Id++;
  if(simulation312Frame!==null){
   cancelAnimationFrame(simulation312Frame);
   simulation312Frame=null;
  }
 };
 const wardrobe38=createAIG38CharacterCatalog();
 const stability39=createAIG39StabilitySession();
 let browse38Offset=0;
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
  cancelSimulation312();dynamics312.clear();
  disposeGroup(overlay);overlay=null;probeLines=null;
  scan=null;rendererSource=null;drawProof=null;scanStamp=null;
  appearanceProof=null;core36Proof=null;lighting36Proof=null;
  wardrobe37Proof=null;wardrobe37Layer=null;body37Proof=null;
  motion39Proof=null;lastPose39=null;
  hair310Layer=null;hair310Proof=null;contact311Proof=null;
  motion312Proof=null;contact314Proof=null;
  poseGrid314=null;poseGrid314Source=null;
  heroine314Proof=null;triangleIntersect314Proof=null;
  if(restore36Lighting){restore36Lighting();restore36Lighting=null}
  const label=$('scan36-visible');
  if(label)label.textContent='尚未建立 3D 曲面；原照片與其他 GLB 保留。';
  if($('scan312-motion-status'))
   $('scan312-motion-status').textContent='3.12 動態已結束；原人物來源與其他 GLB 保留。';
 };
 const proof=()=>{
  $('scan29-proof').textContent=JSON.stringify({
   schema:'AIG_REAL3D_2_9_ACTUAL_SHARED_THREE_WEBGL_PROOF',
   originalSourcePhotoSHA:scan?.sourceSha256??null,
   original2DImageSize:scan?.sourceSize??null,
   genuine3DMeshes:scan?.surfaces.length??0,
   realFusedSingleManifold:scan?.manifoldAudit?.closedManifold??false,
   visualAppearanceReleasePassed:scan?.aestheticHumanReviewPassed??false,
   unifiedReal35AppearancePipeline:appearanceProof,
   unifiedReal36OneKernel120LogicalSlots:core36Proof,
   real36Lighting:lighting36Proof,
   real38LazyAssetIndex:wardrobe38.snapshot(),
   real39RuntimeStability:stability39.snapshot(),
   real39GarmentActuallyFollowingBodyPose:motion39Proof,
   real310RemovableHair:hair310Proof,
   real311CoarseRealContactConstraints:contact311Proof,
   real314ActualTriangleContact:contact314Proof,
   real314HeroineApprovedVisualReferenceFit:heroine314Proof,
   real314ExactBodyGarmentTriangleIntersections:triangleIntersect314Proof,
   real312ContinuousSecondaryMovement:motion312Proof,
   real310OneKernel19200LogicalWorkProfile:core36Proof?{
    configuredLogicalSlots:core36Proof.plan.logicalSlotsConfigured,
    actualDispatchedVertexShards:core36Proof.vertexColourWork.effectiveSlotsUsed,
    actualSourceVertices:core36Proof.vertexColourWork.actualVerticesColoured,
    logicalShardsUpperBoundByVertexCount:true,
    sameSharedWebGLContext:true,
    physical19200CpuGpuCoresProven:false,
    actualRenderingPerformanceGainMeasured:false
   }:null,
   real37ScalableCoreAndWardrobe:core36Proof?.plan?.schema===
    'AIG_REAL3D_3_7_ONE_KERNEL_SCALABLE_LOGICAL_SHARDS'?{
     selectedLogicalSlots:core36Proof.plan.logicalSlotsConfigured,
     effectiveLogicalSlots:core36Proof.vertexColourWork.effectiveSlotsUsed,
     wardrobe:wardrobe37Proof,bodyProxy:body37Proof
    }:null,
   visualReleaseBlocker:scan?.visualReleaseGate??'NOT_EVALUATED',
   physical3DPrintScaleCertified:scan?.production3DPrintApproved??false,
   actualSourceManifoldAudit:scan?.manifoldAudit??null,
   unifiedSDFGridCells:scan?.gridCellCount??null,
   userSelectedSmoothFusionWidth:scan?.signedDistanceFusionWidth??null,
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
   actualSensorEchoMeasured:false,
   geometricVirtualProbeOnly:true,
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
 function drawSourceReference(data){
  const canvas=$('scan36-source-preview');
  if(!canvas)return false;
  const ctx=canvas.getContext('2d');
  if(!ctx)return false;
  const temp=document.createElement('canvas');
  temp.width=data.width;temp.height=data.height;
  temp.getContext('2d').putImageData(new ImageData(
   new Uint8ClampedArray(data.pixels),data.width,data.height),0,0);
  const scale=Math.min(canvas.width/data.width,canvas.height/data.height);
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(temp,(canvas.width-data.width*scale)/2,
   (canvas.height-data.height*scale)/2,
   data.width*scale,data.height*scale);
  return true;
 }
 function fitExistingViewer(viewer,group){
  group.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(group);
  if(bounds.isEmpty())throw Error('3D 曲面範圍為空，禁止切到空畫面');
  const center=bounds.getCenter(new THREE.Vector3());
  const size=bounds.getSize(new THREE.Vector3());
  const fit=fitAIG36Camera({width:Math.max(size.x,.001),
   height:Math.max(size.y,.001),depth:Math.max(size.z,.001),
   verticalFovDeg:viewer.camera.fov,aspect:viewer.camera.aspect});
  viewer.controls.target.copy(center);
  viewer.camera.position.set(center.x,
   center.y+size.y*.04,center.z+fit.distance);
  viewer.camera.near=fit.near;viewer.camera.far=fit.far;
  viewer.camera.updateProjectionMatrix();
  viewer.camera.lookAt(center);viewer.controls.update();
  return {sizeXYZ:[size.x,size.y,size.z],
   distance:fit.distance,cameraFitFromRealMesh:true};
 }
 function apply36Lighting(viewer,group,requested){
  if(restore36Lighting){restore36Lighting();restore36Lighting=null}
  const selected=selectAIG36Lighting(requested,core36Proof?.plan);
  const key=viewer.scene.children.find(o=>o.isDirectionalLight);
  const renderer=viewer.renderer,shadowBefore=renderer.shadowMap.enabled;
  const lightBefore=key?.castShadow??false,previousRoughness=[];
  group.traverse(o=>{
   if(!o.isMesh)return;
   previousRoughness.push({mesh:o,roughness:o.material.roughness,
    cast:o.castShadow,receive:o.receiveShadow});
   o.material.roughness=requested==='soft'?.88:
    requested==='balanced'?.76:.58;
   o.castShadow=selected.shadows;o.receiveShadow=selected.shadows;
  });
  if(key)key.castShadow=selected.shadows;
  renderer.shadowMap.enabled=selected.shadows;
  restore36Lighting=()=>{
   renderer.shadowMap.enabled=shadowBefore;
   if(key)key.castShadow=lightBefore;
   for(const e of previousRoughness){
    e.mesh.castShadow=e.cast;e.mesh.receiveShadow=e.receive;
    e.mesh.material.roughness=e.roughness;
   }
  };
  return {...selected,existingDirectionalLight:!!key,
   actualShadowMapActive:!!key&&selected.shadows,
   physicalRayTracingVerified:false};
 }
 function refresh38Browser(){
  const slot=$('scan38-slot').value,
   query=$('scan38-query').value;
  const requested=wardrobe38.page({
   slot:slot==='all'?null:slot,query,
   offset:browse38Offset,limit:8
  });
  if(browse38Offset>=requested.totalMatched&&browse38Offset){
   browse38Offset=Math.max(0,8*Math.floor(
    Math.max(0,requested.totalMatched-1)/8));
   return refresh38Browser();
  }
  const container=$('scan38-items');
  container.replaceChildren();
  for(const item of requested.items){
   const row=document.createElement('div');
   row.setAttribute('role','listitem');
   row.style.cssText='padding:5px 0;border-bottom:1px solid #1b4253';
   const installed=item.status==='installed';
   row.textContent=(installed?'● 已有技術幾何：':'○ 待製作真 3D 資產：')+
    item.title+' ['+item.id+']';
   row.style.color=installed?'#b8efe0':'#b5c6d0';
   container.append(row);
  }
  $('scan38-prev').disabled=browse38Offset===0;
  $('scan38-next').disabled=browse38Offset+8>=requested.totalMatched;
  $('scan38-status').textContent='目錄索引 '+requested.totalIndexed+
   ' 筆，本篩選 '+requested.totalMatched+' 筆；第 '+
   (requested.totalMatched?browse38Offset+1:0)+'–'+
   Math.min(browse38Offset+8,requested.totalMatched)+
   ' 筆。單次畫面最多 8 筆；實際穿戴 '+wardrobe38.active.size+
   ' 套，未載入資產一律不佔用 GPU 網格。';
 }
 const record38Wear=(outfitId,meshReady)=>{
  const current=wardrobe38.snapshot().activeIds;
  if(outfitId==='body-proxy'){
   for(const id of current)if(id.startsWith('procedural:'))
    wardrobe38.remove(id);
  }else{
   const id='procedural:'+outfitId;
   // Reject before allocating/committing the renderer if the manifest
   // claims an uninstalled asset or breaches the GPU budget.
   wardrobe38.planWear(id);
   wardrobe38.commitWear(id,meshReady);
  }
  refresh38Browser();
 }
 function prepareWardrobe37(shell,bodyHeightUnits,outfitId){
  const result=buildAIG37Outfit(shell,{bodyHeightUnits,outfitId});
  const layer=new THREE.Group();
  layer.name='AIG37_INTERCHANGEABLE_OUTFIT_LAYER_NOT_THE_BODY';
  layer.userData={originalPhotoUntouched:true,
   outfitId,actualSeparateGarmentMeshes:result.garmentMeshCount};
  for(const piece of result.pieces){
   const geo=new THREE.BufferGeometry();
   geo.setAttribute('position',
    new THREE.BufferAttribute(piece.geometry.positions,3));
   geo.setAttribute('normal',
    new THREE.BufferAttribute(piece.geometry.normals,3));
   geo.setIndex(new THREE.BufferAttribute(piece.geometry.indices,1));
   const mesh=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({
    color:piece.color,roughness:piece.roughness,metalness:0,
    side:THREE.DoubleSide
   }));
   mesh.name='AIG37_CLOTHING_'+piece.name;
   mesh.userData={role:piece.role,generatedSurface:true,
    notSourceMeasuredTailoredGarment:true,
    sourceBodyVertexIndices:piece.geometry.sourceVertexIndices,
    immutableGarmentRestPositions:piece.geometry.positions};
   layer.add(mesh);
  }
  return {layer,result};
 }
 function prepare310Hair(shell,style){
  const hair=style==='authority-long'?
   buildAIG314HeroineSourceHair(shell):
   buildAIG310ModularHair(shell,{style});
  const layer=new THREE.Group();
  layer.name='AIG310_REAL_SEPARATE_HAIR_GEOMETRY';
  layer.userData={style,actualMeshCount:hair.realIndependentHairMeshes,
   originalFaceAndBodyGeometryUntouched:true,
   heroineHairLikenessNotValidated:true};
  for(const piece of hair.segments){
   const geo=new THREE.BufferGeometry();
   geo.setAttribute('position',new THREE.BufferAttribute(piece.positions,3));
   geo.setIndex(new THREE.BufferAttribute(piece.indices,1));
   geo.computeVertexNormals();geo.computeBoundingSphere();
   const mesh=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({
    color:piece.colour,metalness:0,roughness:.85,side:THREE.DoubleSide
   }));
   mesh.name='AIG310_HAIR_'+piece.name;
   mesh.userData={sourceBodyVertexIndices:piece.sourceVertexIndices,
    immutableGarmentRestPositions:piece.positions,
    sourceHeadAnchored:true,sourceFaceRemainsUnchanged:true};
   layer.add(mesh);
  }
  return {layer,hair};
 }
 const update310Hair=()=>{
  if(!scan?.manifoldAudit?.closedManifold||!overlay?.parent||
   !rendererSource||rendererSource.movieMode||rendererSource.reviewBusy)
   throw Error('請先建立可顯示的來源人體模型；錄影或驗收時不更換髮型');
  const style=$('scan310-hair').value;
  cancelSimulation312();dynamics312.clear();
  const next=prepare310Hair(scan.fusedOnePieceMesh,style);
  const prev=hair310Layer;
  overlay.add(next.layer);hair310Layer=next.layer;
  hair310Proof={
   schema:next.hair.schema,style,
   actualIndependentHairMeshes:next.hair.realIndependentHairMeshes,
   realIndependent3DTriangles:next.hair.realIndependent3DTriangles??0,
   true3DMeshAttachmentsAdded:next.layer.children.filter(x=>x.isMesh).length,
   technicalGeometryNotHeroineApproved:true,
   originalBodyMeshReconstructed:false,
   physicallyAccurateStrandsAndCollisions:false
  };
  try{
   const pose=getBodyPose?.();
   if(pose?.positions instanceof Float32Array&&
    pose.positions.length===scan.fusedOnePieceMesh.positions.length)
    apply39BodyPose(pose);
   fitExistingViewer(rendererSource,overlay);
   lighting36Proof=apply36Lighting(rendererSource,overlay,
    $('scan36-light')?.value||'balanced');
  }catch(e){
   hair310Layer=prev;disposeGroup(next.layer);throw e;
  }
  disposeGroup(prev);
  $('scan310-hair-status').textContent=style==='none'?
   '沒有附加新髮型，保留來源頭部。':
   '已切換 '+style+'：'+hair310Proof.actualIndependentHairMeshes+
   ' 個獨立真 3D 技術髮型網格，跟隨頭骨移動；尚未有真髮絲物理。';
  proof();
 };
 const audit314ActualTriangles=()=>{
  if(!scan?.manifoldAudit?.closedManifold||!overlay?.parent||
   !rendererSource||rendererSource.movieMode||rendererSource.reviewBusy)
   throw Error('需要先產生真 3D 人體，再驗證髮型／裙擺三角面');
  const base=scan.fusedOnePieceMesh,pose=getBodyPose?.();
  const actualBody=pose?.positions instanceof Float32Array&&
   pose.positions.length===base.positions.length?
   pose.positions:base.positions;
  const attachments=[];
  for(const mesh of wardrobe37Layer?.children??[])
   if(mesh.isMesh&&mesh.name.includes('PLEATED_UNIFORM_SKIRT'))
    attachments.push({
     mode:'skirt',name:mesh.name,
     positions:new Float32Array(mesh.geometry.attributes.position.array),
     indices:new Uint32Array(mesh.geometry.index.array)
    });
  for(const mesh of hair310Layer?.children??[])
   if(mesh.isMesh&&mesh.name.includes('HAIR_FOLLOW_TAILS'))
    attachments.push({
     mode:'hair',name:mesh.name,
     positions:new Float32Array(mesh.geometry.attributes.position.array),
     indices:new Uint32Array(mesh.geometry.index.array)
    });
  if(!attachments.length)throw Error('尚無真 3D 裙擺或長髮束可供三角面驗證');
  triangleIntersect314Proof=auditAIG314ActualTriangleIntersections({
   bodyPosed:actualBody,bodyIndices:base.indices,
   sourceLabels:base.vertexSourceLabelIds,attachments
  });
  const verdict=triangleIntersect314Proof;
  $('scan314-contact-status').textContent=
   '已實際比對 '+verdict.exactTrianglePairsTested+' 對真三角面；'+
   verdict.confirmedBodyClothHairTriangleIntersections+
   ' 對發生幾何交錯。'+
   (verdict.sampledContactRiskDetected?'穿模仍存在，BLOCK。':
    verdict.sampledSourceDataComplete?'此姿勢離散樣本無交錯，仍需動態全程驗證。':
    '缺少來源人體區域，不能判定 PASS。');
  proof();return verdict;
 };
 const apply314HeroineColourFit=()=>{
  if(!scan?.manifoldAudit?.closedManifold||!overlay?.parent||
   !rendererSource||rendererSource.movieMode||rendererSource.reviewBusy)
   throw Error('需要先有可見真 3D 人體模型；錄影中不可更改');
  const authority=getAIG314VerifiedAuthorityPalette();
  const shell=scan.fusedOnePieceMesh;
  const base=overlay.children.find(x=>x.name===
   'AIG30_ONE_PIECE_FUSED_HUMANOID_CURVED_SURFACE');
  if(!base?.isMesh||!base.geometry.getAttribute('color'))
   throw Error('3.14 找不到可驗證來源分類的真 3D 人體頂點');
  if(!base.userData.base314Colours)
   base.userData.base314Colours=
    new Float32Array(base.geometry.getAttribute('color').array);
  const recolour=applyAIG314ObservedPaletteToBody({
   colours:base.userData.base314Colours,
   sourceClassIds:shell.vertexSourceLabelIds,authority
  });
  if(recolour.actualRecolouredVertices<15)
   throw Error('來源分割沒有足夠的人臉／頭髮／布料頂點，拒絕假擬合');
  base.geometry.setAttribute('color',new THREE.BufferAttribute(
   recolour.colours,3));
  const garmentParts=[],hairParts=[];
  const change=(group,role,color)=>{
   if(!group?.parent)return;
   for(const mesh of group.children){
    if(!mesh.isMesh||!role(mesh.name))continue;
    mesh.material.color.setRGB(
     color[0],color[1],color[2],THREE.SRGBColorSpace
    );
    mesh.material.needsUpdate=true;
    return mesh.name;
   }
  };
  if($('scan37-outfit').value==='uniform'){
   for(const [fn,color] of [
    [n=>n.includes('UNIFORM_JACKET'),authority.palette.blazer.srgb01],
    [n=>n.includes('PLEATED_UNIFORM_SKIRT'),authority.palette.skirt.srgb01]
   ]){
    const name=change(wardrobe37Layer,fn,color);
    if(name)garmentParts.push(name);
   }
  }
  if($('scan310-hair').value!=='none'){
   for(const mesh of hair310Layer?.children??[]){
    if(!mesh.isMesh)continue;
    const colour=authority.palette.hair.srgb01;
    mesh.material.color.setRGB(
     colour[0],colour[1],colour[2],THREE.SRGBColorSpace
    );
    mesh.material.needsUpdate=true;
    hairParts.push(mesh.name);
   }
  }
  heroine314Proof={
   schema:'AIG_REAL3D_3_14_HEROINE_APPROVED_REFERENCE_LEDGER',
   approvedReferenceSheetSHA256:authority.verifiedApprovedSheetSHA256,
   actualBodyVertexColoursChanged:recolour.actualRecolouredVertices,
   actualIndependentUniformMeshesRecoloured:garmentParts.length,
   actualIndependentHairMeshesRecoloured:hairParts.length,
   actualFaceEyeNoseMouth3DShapeMatched:false,
   actualHairStyleSilhouetteMatched:false,
   realPlaidFabricAndBowUVCreated:false,
   frontProfileRear3DShapeCompared:false,
   noOriginalSourcePixelsStoredOrUploaded:true,
   sourceBodyMeshTopologyAndRigPreserved:true,
   realUserApprovedHeroineAppearancePASS:false,
   requiredNext:'Source-registered face geometry, hairstyle and cloth textures'
  };
  $('scan314-authority-status').textContent=
   '已根據核准展示圖 SHA 的實際色彩樣本調整 '+
   heroine314Proof.actualBodyVertexColoursChanged+' 個真 3D 頂點、'+
   garmentParts.length+' 件制服與 '+hairParts.length+
   ' 件髮型技術網格。臉部幾何／髮絲／格紋尚未重建，正式外觀 FAIL。';
  proof();
  return heroine314Proof;
 };
 const apply39BodyPose=(value,{secondaryTick=false}={})=>{
  if(!secondaryTick)triangleIntersect314Proof=null;
  if(!scan?.manifoldAudit?.closedManifold||!overlay?.parent||
   !wardrobe37Layer?.parent||!scan.sourceSha256)
   return null;
  const base=scan.fusedOnePieceMesh;
  if(!secondaryTick)cancelSimulation312();
  if(!(value?.positions instanceof Float32Array)||
   value.positions.length!==base.positions.length)
   throw Error('3.9 服裝與人體關節來源不一致，保留原衣物網格');
  const prepared=[];
  const exactMeasured=[];
  const dynamicsMeasured=[];
  if(poseGrid314Source!==value.positions){
   poseGrid314=null;poseGrid314Source=value.positions;
  }
  const bodyMoving=Number(value.actualMovedVertexCount)>0;
  for(const mesh of [
   ...wardrobe37Layer.children,...(hair310Layer?.children??[])
  ]){
   if(!mesh.isMesh)continue;
   const result=deformAIG39AttachedGarment({
    garmentRest:mesh.userData.immutableGarmentRestPositions,
    bodyRest:base.positions,bodyPosed:value.positions,
    sourceVertexIndices:mesh.userData.sourceBodyVertexIndices
   });
   const mode=mesh.name.includes('HAIR_FOLLOW_TAILS')?'hair':
    mesh.name.includes('PLEATED_UNIFORM_SKIRT')?'skirt':null;
   // Static/rest poses must recover the true immutable rest garment. A
   // collision proxy is only active on an actually moved body pose.
   let dynamicResult=null;
   if(mode){
    let sim=dynamics312.get(mesh);
    if(!sim){
     sim=createAIG312SecondaryMotion({
      restPositions:mesh.userData.immutableGarmentRestPositions,
      bodyHeightUnits:scan.bodyHeightUnits,kind:mode
     });
     dynamics312.set(mesh,sim);
    }
    dynamicResult=sim.step({
     targetPositions:result.positions,deltaSeconds:1/60,
     restoreRest:!bodyMoving
    });
    dynamicsMeasured.push({mesh,mode,result:dynamicResult});
   }
   const dynamicPositions=dynamicResult?.positions??result.positions;
   const contact=mode&&bodyMoving?resolveAIG311PoseContacts({
    posedAttachment:dynamicPositions,bodyPosed:value.positions,
    sourceLabels:base.vertexSourceLabelIds,mode,
    maxCorrectionRatio:.06,marginRatio:.005,passes:2
   }):null;
   let finalPositions=contact?.positions??dynamicPositions;
   if(mode&&bodyMoving){
    try{
     if(!poseGrid314)poseGrid314=new Map();
     if(!poseGrid314.has(mode)){
      poseGrid314.set(mode,buildAIG314BodyTriangleGrid({
       bodyPosed:value.positions,bodyIndices:base.indices,
       sourceLabels:base.vertexSourceLabelIds,mode
      }));
     }
     const exact=resolveAIG314TriangleContacts({
      posedAttachment:finalPositions,
      bodyPosed:value.positions,bodyIndices:base.indices,
      sourceLabels:base.vertexSourceLabelIds,mode,
      grid:poseGrid314.get(mode),
      maxCorrectionRatio:.027,clearanceRatio:.002
     });
     exactMeasured.push({mode,exact});
     finalPositions=exact.positions;
    }catch(e){
     // Continue displaying LAST valid body and previous coarse corrections.
     exactMeasured.push({mode,error:String(e?.message||e)});
    }
   }
   prepared.push({mesh,result,contact,positions:finalPositions});
  }
  // Commit only after EVERY attached garment validates against this body.
  for(const {mesh,result,positions} of prepared){
   const geo=mesh.geometry;
   geo.setAttribute('position',
    new THREE.BufferAttribute(positions,3));
   geo.computeVertexNormals();geo.computeBoundingSphere();
   geo.attributes.position.needsUpdate=true;
   geo.attributes.normal.needsUpdate=true;
  }
  lastPose39=value;
  contact314Proof={
   schema:'AIG_REAL3D_3_14_SOURCE_BODY_TRIANGLE_CONTACT',
   actualProcessedTriangleMeshes:exactMeasured.filter(x=>x.exact).length,
   actualSourceTriangleChecks:exactMeasured.reduce(
    (s,x)=>s+(x.exact?.sourceTriangleChecks??0),0),
   actualTriangleProjectedVertices:exactMeasured.reduce(
    (s,x)=>s+(x.exact?.actualProjectedAttachmentVertices??0),0),
   unresolvedBoundedTriangleDisplacements:exactMeasured.reduce(
    (s,x)=>s+(x.exact?.unresolvedBoundedDisplacements??0),0),
   collisionSourceErrors:exactMeasured.filter(x=>x.error).map(x=>x.error),
   originalFaceSourceAndRestGeometriesPreserved:true,
   exactDiscreteTriangleCheckNotFullCCD:true,
   completeCollisionFreeNotCertified:true
  };
  motion312Proof={
   schema:'AIG_REAL3D_3_12_FIXED_STEP_SECONDARY_HAIR_SKIRT',
   actuallySimulatedIndependentMeshes:dynamicsMeasured.length,
   actualSecondaryVertices:dynamicsMeasured.reduce(
    (s,x)=>s+x.result.changedVertices,0),
   simulatedFrames:dynamicsMeasured.length?
    Math.max(...dynamicsMeasured.map(x=>x.result.framesSimulated)):0,
   maxMeasuredSecondaryLagUnits:dynamicsMeasured.length?
    Math.max(...dynamicsMeasured.map(x=>x.result.actualMaxLagUnits)):0,
   actuallyPinnedRootVertices:dynamicsMeasured.reduce(
    (s,x)=>s+(x.result.truePinnedRootVertices??0),0),
   rootsPinnedToRealBodyPose:dynamicsMeasured.every(
    x=>(x.result.truePinnedRootVertices??1)>0||
       x.result.stableRestPoseReturned===true),
   originalRestAndSourceArraysUnchanged:true,
   actualFrameSequenceDrivenBySingleRenderer:true,
   fullHairStrandAndFabricPhysicsCertified:false,
   underlyingPoseHasMovedVertices:bodyMoving
  };
  const measured311=prepared.filter(x=>x.contact);
  contact311Proof={
   schema:'AIG_REAL3D_3_11_REAL_POSE_CONTACT_PROXY',
   actuallyProcessedSeparateMeshes:measured311.length,
   actualContactCandidates:measured311.reduce(
    (s,x)=>s+x.contact.actualCollisionCandidateVertices,0),
   actualCorrected3DVertices:measured311.reduce(
    (s,x)=>s+x.contact.actualCorrectedVertices,0),
   remainingCoarseProxyPenetrations:measured311.reduce(
    (s,x)=>s+x.contact.remainingCoarseProxyPenetrations,0),
   missingSourceRegions:[...new Set(measured311.flatMap(
    x=>x.contact.unavailableSourceRegions))],
   originalBodyAndRestGarmentUnmodified:true,
   fullSelfCollisionOrNaturalPhysicsCertified:false,
   safeRestPoseRecovery:Number(value.actualMovedVertexCount)===0
  };
  motion39Proof={
   actualGarmentMeshesFollowingRig:prepared.filter(x=>
    x.mesh.parent===wardrobe37Layer).length,
   realGarmentVerticesMoved:prepared.filter(x=>
    x.mesh.parent===wardrobe37Layer).reduce(
    (s,x)=>s+x.result.actualGarmentVerticesMoved,0),
   actualHairMeshesFollowingRig:prepared.filter(x=>
    x.mesh.parent===hair310Layer).length,
   realHairVerticesMoved:prepared.filter(x=>
    x.mesh.parent===hair310Layer).reduce(
    (s,x)=>s+x.result.actualGarmentVerticesMoved,0),
   originalBodyRestAndClothesUnchanged:true,
   clothPhysicsAndCollisionStillNotCertified:true,
   sourceSha256:scan.sourceSha256,
   bodyRestGeometryIdentityPreserved:true
  };
  if($('scan312-motion-status'))
   $('scan312-motion-status').textContent='3.12 真 3D 次級動態：'+
    motion312Proof.simulatedFrames+' 個運算影格，'+
    motion312Proof.actualSecondaryVertices+' 個髮型／裙擺頂點具有彈性位移；'+
    '粗略接觸修正 '+contact311Proof.actualCorrected3DVertices+
    ' 點、真三角面修正 '+contact314Proof.actualTriangleProjectedVertices+
    ' 點；未解決 '+contact314Proof.unresolvedBoundedTriangleDisplacements+
    ' 點。尚未通過完整布料物理驗收。';
  $('scan37-status').textContent='3.9 真骨架同步：'+
   motion39Proof.actualGarmentMeshesFollowingRig+' 件獨立 3D 衣物；'+
   motion39Proof.realGarmentVerticesMoved+' 個衣物頂點、'+
   motion39Proof.realHairVerticesMoved+' 個髮型頂點隨人體真正關節位移。'+
   '3.11 實際接觸修正 '+contact311Proof.actualCorrected3DVertices+
   ' 點，剩餘粗略碰撞 '+contact311Proof.remainingCoarseProxyPenetrations+
   ' 點。這不是完整布料或髮絲物理驗收。';
  proof();
  // Bounded settling on the same WebGL viewer. Never spawn new renderers or
  // endless background tasks; source or wardrobe switches cancel this work.
  if(!secondaryTick&&bodyMoving&&dynamicsMeasured.length){
   const generation=simulation312Id;
   const originalOverlay=overlay,originalScan=scan;
   let frames=0;
   const settle=()=>{
    simulation312Frame=null;
    if(generation!==simulation312Id||
     overlay!==originalOverlay||scan!==originalScan||
     !overlay?.parent||!rendererSource?.renderer||
     rendererSource.movieMode||rendererSource.reviewBusy)return;
    try{
     apply39BodyPose(value,{secondaryTick:true});
     frames++;
     if(frames<18)
      simulation312Frame=requestAnimationFrame(settle);
    }catch(e){
     status('3.12 次級動態已隔離：'+String(e?.message||e),true);
    }
   };
   simulation312Frame=requestAnimationFrame(settle);
  }
  return motion39Proof;
 };
 const update37Wardrobe=()=>{
  if(!scan||!overlay?.parent||!rendererSource)
   throw Error('請先建立來源真 3D 人體素模，再選每日服裝');
  if(rendererSource.movieMode||rendererSource.reviewBusy)
   throw Error('共用畫面正在錄影或檢查，暫停服裝更新');
  const outfitId=$('scan37-outfit').value;
  cancelSimulation312();dynamics312.clear();
  if(outfitId!=='body-proxy')
   wardrobe38.planWear('procedural:'+outfitId);
  const next=prepareWardrobe37(scan.fusedOnePieceMesh,
   scan.bodyHeightUnits,outfitId);
  const previous=wardrobe37Layer;
  overlay.add(next.layer);
  try{record38Wear(outfitId,true)}
  catch(error){
   disposeGroup(next.layer);
   throw error;
  }
  wardrobe37Layer=next.layer;
  wardrobe37Proof={...next.result,pieces:next.result.pieces.map(
   item=>({role:item.role,name:item.name,
    triangleCount:item.geometry.triangleCount})),
   sourcePhotoUnmodified:true,bodySourceMeshNeverRescanned:true,
   outfitsUsedAsSeparateMesh:true,sourceSha256:scan.sourceSha256};
  disposeGroup(previous);
  fitExistingViewer(rendererSource,overlay);
  lighting36Proof=apply36Lighting(rendererSource,overlay,
   $('scan36-light')?.value||'balanced');
  if(typeof getBodyPose==='function'){
   const pose=getBodyPose();
   if(pose?.positions instanceof Float32Array&&
    pose.positions.length===scan.fusedOnePieceMesh.positions.length)
    apply39BodyPose(pose);
  }
  $('scan37-status').textContent='已套用 '+outfitId+'：'+
   wardrobe37Proof.garmentMeshCount+' 個獨立真 3D 服裝元件，人體幾何未重建或修改。'+
   '目前是程序化衣型，不是女主角真實裁縫版。';
  proof();
 };
 const buildPreview=async(token)=>{
  stability39.assertCurrent(token);
  const data=source(),radialSegments=Number($('scan29-radial').value),
   sliceStep=Number($('scan29-step').value),
   depthRatio=Number($('scan29-depth').value);
  status('正在從真正來源輪廓建立 XYZ 曲面、法線與 PBR 材質…');
  await new Promise(resolve=>setTimeout(resolve,0));
  // ONE unified photo -> 2.9 sections -> 3.0 fused SDF -> source XY
  // silhouette comparison / safe correction / editable appearance.
  const unified=buildAIG35UnifiedAppearance({
   source:data,radialSegments,sliceStep,depthRatio,
   resolution:Number($('scan30-resolution').value),
   blend:Number($('scan30-blend').value),
   proportions:{
    widthScale:Number($('aig35-width').value),
    heightScale:Number($('aig35-height').value),
    depthScale:Number($('aig35-depth').value),
    colourGain:Number($('aig35-colour').value)
   }
  });
  const reconstruction=unified.reconstruction;
  const newAppearanceProof=unified.proof;
  if(!reconstruction.manifoldAudit.closedManifold||
   reconstruction.surfaces.length!==1)
   throw Error('單一人體曲面未符合連通封閉 Gate，保留原 3D 場景');
  const viewer=await getSharedViewer();
  stability39.assertCurrent(token);
  if(!viewer?.scene||!viewer.renderer||viewer.movieMode||
   viewer.reviewBusy||viewer.renderer.getContext()?.isContextLost?.())
   throw Error('唯一共用 WebGL 核心不可用，保留上次成功模型');
  const plan=planAIG36UnifiedCore({
   requestedLogicalSlots:Number($('scan37-slot-count').value),
   hardwareConcurrency:navigator.hardwareConcurrency??2,
   deviceMemoryGb:navigator.deviceMemory??null,
   mobile:matchMedia('(pointer:coarse)').matches,
   gpuContextAvailable:true,
   rayTracingRequested:$('scan36-light')?.value==='raytrace'
  });
  const resource39=planAIG39ConservativeBudget({
   requestedLogicalSlots:plan.logicalSlotsConfigured,
   hardwareConcurrency:navigator.hardwareConcurrency??2,
   deviceMemoryGb:navigator.deviceMemory??null,
   mobile:matchMedia('(pointer:coarse)').matches,
   vertexCount:reconstruction.fusedOnePieceMesh.vertexCount
  });
  const group=new THREE.Group();
  group.name='AIG30_ONE_FUSED_WATERTIGHT_SDF_SOURCE_SURFACE';
  group.userData={sourceSha256:data.sourceSha256,
   estimatedRearDepth:true,original3DGLBUntouched:true};
  for(const shell of reconstruction.surfaces){
   const geometry=new THREE.BufferGeometry();
   geometry.setAttribute('position',new THREE.BufferAttribute(shell.positions,3));
   geometry.setAttribute('normal',new THREE.BufferAttribute(shell.normals,3));
   geometry.setIndex(new THREE.BufferAttribute(shell.indices,1));
   const shaded=await colourAIG36VertexShards({
    shell,source:data,bodyHeightUnits:reconstruction.bodyHeightUnits,
    colourGain:newAppearanceProof.finalControls.colourGain,plan,
    signal:token.signal
   });
   stability39.assertCurrent(token);
   const bodyColours=separateAIG37BodyColours(shaded.colours,shell);
   geometry.setAttribute('color',
    new THREE.BufferAttribute(bodyColours.colours,3));
   body37Proof={neutralMannequinVertices:bodyColours.neutralizedVertices,
    clothingDyeNotBakedIntoBody:true,
    originalObservedSkinMayRemainOnFaceAndArms:true,
    underClothesAnatomyEstimatedOnly:true};
   group.userData.core36Shaded=shaded;
   geometry.computeBoundingSphere();
   const material=new THREE.MeshStandardMaterial({
    vertexColors:true,roughness:.76,metalness:0,
    side:THREE.FrontSide
   });
   const mesh=new THREE.Mesh(geometry,material);
   mesh.name='AIG30_ONE_PIECE_FUSED_HUMANOID_CURVED_SURFACE';
   mesh.userData={sourceClassIDs:shell.originalPhotoSilhouetteSources,
    genuinelySingleIndexedSurface:true,unknownBackDepth:true,
    actualTriangleCount:shell.triangleCount};
   group.add(mesh);
  }
  let stagedWardrobe=null;
  try{
   stagedWardrobe=prepareWardrobe37(reconstruction.fusedOnePieceMesh,
    reconstruction.bodyHeightUnits,$('scan37-outfit').value);
   group.add(stagedWardrobe.layer);
  }catch(e){
   // Clothing errors never remove a successfully reconstructed base body.
   const safe=prepareWardrobe37(reconstruction.fusedOnePieceMesh,
    reconstruction.bodyHeightUnits,'body-proxy');
   stagedWardrobe=safe;
   $('scan37-status').textContent='服裝暫時隔離：'+String(e.message||e)+
    '；已保留中性人體素模。';
  }
  let stagedHair=null;
  try{
   stagedHair=prepare310Hair(reconstruction.fusedOnePieceMesh,
    $('scan310-hair').value);
   group.add(stagedHair.layer);
  }catch(e){
   stagedHair=prepare310Hair(reconstruction.fusedOnePieceMesh,'none');
   group.add(stagedHair.layer);
   $('scan310-hair-status').textContent='髮型來源不足：'+
    String(e.message||e)+'；保留原始人物，不產生假髮。';
  }
  // Stage geometry and get a real GPU frame BEFORE swapping out the
  // previous successful model. Failure/cancellation does not replace it.
  stability39.assertCurrent(token);
  const oldCamera={
   position:viewer.camera.position.clone(),target:viewer.controls.target.clone(),
   near:viewer.camera.near,far:viewer.camera.far
  };
  let stageCommitted=false;
  try{
   viewer.scene.add(group);
   stability39.assertCurrent(token);
   const cameraFit=fitExistingViewer(viewer,group);
   await new Promise(resolve=>requestAnimationFrame(()=>
    requestAnimationFrame(resolve)));
   stability39.assertCurrent(token);
   if(viewer.renderer.getContext()?.isContextLost?.()||
    viewer.renderer.info.render.triangles<=0)
    throw Error('3D 渲染未提交有效面片；保留上次成功模型');
   if(getImage()?.sha!==data.sourceSha256)
    throw Error('照片來源已變更，拒絕寫入過期重建成果');
   // Commit is synchronous: no source change can interleave during swap.
   if(stagedWardrobe.result.outfitId!=='body-proxy')
    wardrobe38.planWear('procedural:'+stagedWardrobe.result.outfitId);
   record38Wear(stagedWardrobe.result.outfitId,true);
   const prev=overlay;
   overlay=group;scan=reconstruction;rendererSource=viewer;
   wardrobe37Layer=stagedWardrobe.layer;
   hair310Layer=stagedHair.layer;
   hair310Proof={
    schema:stagedHair.hair.schema,style:stagedHair.hair.style,
    actualIndependentHairMeshes:stagedHair.hair.realIndependentHairMeshes,
    realIndependent3DTriangles:stagedHair.hair.realIndependent3DTriangles??0,
    true3DMeshAttachmentsAdded:stagedHair.layer.children.filter(x=>x.isMesh).length,
    technicalGeometryNotHeroineApproved:true,
    originalBodyMeshReconstructed:false,
    physicallyAccurateStrandsAndCollisions:false
   };
   cancelSimulation312();dynamics312.clear();
   motion39Proof=null;lastPose39=null;contact311Proof=null;
   contact314Proof=null;poseGrid314=null;poseGrid314Source=null;
   heroine314Proof=null;triangleIntersect314Proof=null;
   motion312Proof=null;
   appearanceProof=newAppearanceProof;
   probeLines=null;scanStamp=scan.sourceSha256;
   wardrobe37Proof={...stagedWardrobe.result,
    pieces:stagedWardrobe.result.pieces.map(item=>({
     role:item.role,name:item.name,
     triangleCount:item.geometry.triangleCount
    })),sourcePhotoUnmodified:true,bodySourceMeshNeverRescanned:true,
    outfitsUsedAsSeparateMesh:true,sourceSha256:data.sourceSha256};
   core36Proof={
    plan,stabilityBudget:resource39,vertexColourWork:{
     actualVerticesColoured:group.userData.core36Shaded.actualVerticesColoured,
     completedIdenticalKernelSlots:group.userData.core36Shaded.completedIdenticalKernelSlots,
     effectiveSlotsUsed:group.userData.core36Shaded.effectiveSlotsUsed,
     trueParallelCPUWorkers:0},
    cameraFit,sourceReferenceVisible:drawSourceReference(data),
    realModelShownOnExistingCanvas:true,
    imagePlaneErrorPx:newAppearanceProof.source2DEdgeErrorAfterPx,
    headFaceHairClothesLikenessUserApproved:false,
    appearanceGatePassed:false,rayTracingHardwareEnabled:false,
    releaseAllowed:false
   };
   lighting36Proof=apply36Lighting(viewer,group,
    $('scan36-light')?.value||'balanced');
   drawProof={
    realActiveWebGLContext:!viewer.renderer.getContext()?.isContextLost?.(),
    actualDrawCalls:viewer.renderer.info.render.calls,
    actualSubmittedTriangles:viewer.renderer.info.render.triangles,
    expectedMinimumCurvedTriangles:scan.continuousTriangleCount,
    originalViewerRendererReused:true,
    compositorNotBillboard:true
   };
   $('scan310-hair-status').textContent=hair310Proof.style==='none'?
    '沒有附加新髮型，保留原始頭部。':
    '已建立 '+hair310Proof.style+' 3D 技術髮型，共 '+
    hair310Proof.actualIndependentHairMeshes+' 件可跟隨頭骨的獨立幾何。';
   $('scan37-status').textContent='目前服裝：'+
    stagedWardrobe.result.outfitId+'；'+
    stagedWardrobe.result.garmentMeshCount+' 件真正獨立 3D 衣物。'+
    '原照片／中性人體基礎幾何均保留；尚未驗證衣物貼合。';
   const visible=!!overlay.parent&&
    drawProof.realActiveWebGLContext&&drawProof.actualSubmittedTriangles>0;
   $('scan36-visible').textContent=visible?
    '已在同一個真 WebGL 視窗提交 '+drawProof.actualSubmittedTriangles+
    ' 個三角面；'+core36Proof.plan.logicalSlotsConfigured+
    ' 個已配置邏輯工作槽，實際完成 '+
    core36Proof.vertexColourWork.completedIdenticalKernelSlots+
    ' 個真著色分塊。工作槽非實體 CPU/GPU，亦非外觀驗收。':
    '顯示證據不足：請查看 WebGL／相機診斷；保留原來源與 GLB。';
   // Only after completing actual visibility evidence may old geometry go.
   stageCommitted=true;
   disposeGroup(prev);
   proof();
   status('3.0 網格連通／封閉驗收 PASS；3.5 統一外觀引擎已建立真實 3D 曲面，採用 '+
    unified.selectedMode+'；照片 XY 輪廓平均誤差 '+
    unified.proof.source2DEdgeErrorAfterPx+' px（只評估可見 2D 輪廓）。'+
    '原照片色彩仍取自來源像素；臉／髮／服裝擬真與隱藏深度尚未通過，'+
    '不得宣稱 100% 相似或解除動畫外觀 Gate。');
  }catch(e){
   if(!stageCommitted){
    // Roll back staged scene and camera; preserve the old model if it is
    // still relevant to the selected photo.
    disposeGroup(group);
    if(overlay?.parent){
     viewer.camera.position.copy(oldCamera.position);
     viewer.controls.target.copy(oldCamera.target);
     viewer.camera.near=oldCamera.near;
     viewer.camera.far=oldCamera.far;
     viewer.camera.updateProjectionMatrix();
     viewer.controls.update();
    }
   }
   throw e;
  }
 };
 $('scan29-build').addEventListener('click',async()=>{
  let token=null;
  try{
   token=stability39.begin('source-reconstruction');
   $('scan29-build').disabled=true;
   await buildPreview(token);
   stability39.finish(token);
   proof();
  }catch(e){
   stability39.abandon(token);
   status(String(e.message||e),true);
  }finally{$('scan29-build').disabled=false}
 });
 $('scan38-query').addEventListener('input',()=>{
  browse38Offset=0;refresh38Browser();
 });
 $('scan38-slot').addEventListener('change',()=>{
  browse38Offset=0;refresh38Browser();
 });
 $('scan38-prev').addEventListener('click',()=>{
  browse38Offset=Math.max(0,browse38Offset-8);
  refresh38Browser();
 });
 $('scan38-next').addEventListener('click',()=>{
  browse38Offset+=8;refresh38Browser();
 });
 $('scan314-audit-triangle').addEventListener('click',()=>{
  try{audit314ActualTriangles()}
  catch(e){
   triangleIntersect314Proof=null;
   $('scan314-contact-status').textContent=
    '檢測尚未通過：'+String(e?.message||e)+
    '；不把缺少證據當成零碰撞。';
   proof();
  }
 });
 $('scan314-apply-reference').addEventListener('click',()=>{
  try{apply314HeroineColourFit()}
  catch(e){
   $('scan314-authority-status').textContent=
    '未套用：'+String(e?.message||e)+
    '；原人物及正式來源保留。';
  }
 });
 $('scan310-hair').addEventListener('change',()=>{
  let token=null;
  try{
   token=stability39.begin('hair-switch');
   update310Hair();
   stability39.finish(token);proof();
  }catch(e){
   stability39.abandon(token);
   $('scan310-hair-status').textContent=
    '髮型切換失敗：'+String(e.message||e)+'。原髮型仍保留。';
   status(String(e.message||e),true);
  }
 });
 $('scan37-outfit').addEventListener('change',()=>{
  let token=null;
  try{
   token=stability39.begin('wardrobe-switch');
   update37Wardrobe();
   stability39.finish(token);
   proof();
  }catch(e){
   stability39.abandon(token);
   $('scan37-status').textContent='服裝未套用：'+String(e.message||e)+
    '。已保留上一套衣服與人體模型。';
   status(String(e.message||e),true);
  }
 });
 $('scan36-fit').addEventListener('click',()=>{
  try{
   if(!overlay?.parent||!rendererSource)
    throw Error('尚無可置中的來源模型，請先掃描');
   core36Proof.cameraFit=fitExistingViewer(rendererSource,overlay);
   proof();
   status('已依真 3D 外框重新置中，使用原共用相機。');
  }catch(e){status(String(e.message||e),true)}
 });
 $('scan36-light').addEventListener('change',()=>{
  try{
   if(!overlay?.parent||!rendererSource){
    $('scan36-visible').textContent='燈光選項已儲存；建立模型後套用。';
    return;
   }
   lighting36Proof=apply36Lighting(rendererSource,overlay,
    $('scan36-light').value);
   proof();
   status('已套用 '+lighting36Proof.active+
    '；硬體光追尚未啟用，單一渲染器保持不變。');
  }catch(e){status(String(e.message||e),true)}
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
   const inspection=inspectAIG30FusedFiveAxisSurface(scan,{
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
   lines.name='AIG30_ONE_PIECE_SURFACE_VIRTUAL_5AX_AB_NORMALS';
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
  stability39.cancel();
  removeOverlay();proof();
  status('已移除 3.0 融合曲面預覽，原 GLB 動畫／場景／NC 核心保持不變。');
 });
 $('photo23-source').addEventListener('change',()=>{
  stability39.cancel();
  removeOverlay();proof();
  status('照片來源已變更，3.0 暫存融合曲面失效；原 3D 世界未刪除。');
 });
 refresh38Browser();
 proof();return {
  get report(){return scan},
  get mesh(){return overlay?.children?.find(
   object=>object.isMesh&&object.name==='AIG30_ONE_PIECE_FUSED_HUMANOID_CURVED_SURFACE')??null},
  get viewer(){return overlay?.parent?rendererSource:null},
  get activeSourceSha256(){return scanStamp},
  clear:removeOverlay,
  applyBodyPose:apply39BodyPose,
  get latestGarmentMotionProof(){return motion39Proof}
 };
}
