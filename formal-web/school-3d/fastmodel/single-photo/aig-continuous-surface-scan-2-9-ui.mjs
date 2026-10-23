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
  disposeGroup(overlay);overlay=null;probeLines=null;
  scan=null;rendererSource=null;drawProof=null;scanStamp=null;
  appearanceProof=null;core36Proof=null;lighting36Proof=null;
  wardrobe37Proof=null;wardrobe37Layer=null;body37Proof=null;
  motion39Proof=null;lastPose39=null;
  if(restore36Lighting){restore36Lighting();restore36Lighting=null}
  const label=$('scan36-visible');
  if(label)label.textContent='尚未建立 3D 曲面；原照片與其他 GLB 保留。';
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
 const apply39BodyPose=(value)=>{
  if(!scan?.manifoldAudit?.closedManifold||!overlay?.parent||
   !wardrobe37Layer?.parent||!scan.sourceSha256)
   return null;
  const base=scan.fusedOnePieceMesh;
  if(!(value?.positions instanceof Float32Array)||
   value.positions.length!==base.positions.length)
   throw Error('3.9 服裝與人體關節來源不一致，保留原衣物網格');
  const prepared=[];
  for(const mesh of wardrobe37Layer.children){
   if(!mesh.isMesh)continue;
   const result=deformAIG39AttachedGarment({
    garmentRest:mesh.userData.immutableGarmentRestPositions,
    bodyRest:base.positions,bodyPosed:value.positions,
    sourceVertexIndices:mesh.userData.sourceBodyVertexIndices
   });
   prepared.push({mesh,result});
  }
  // Commit only after EVERY attached garment validates against this body.
  for(const {mesh,result} of prepared){
   const geo=mesh.geometry;
   geo.setAttribute('position',
    new THREE.BufferAttribute(result.positions,3));
   geo.computeVertexNormals();geo.computeBoundingSphere();
   geo.attributes.position.needsUpdate=true;
   geo.attributes.normal.needsUpdate=true;
  }
  lastPose39=value;
  motion39Proof={
   actualGarmentMeshesFollowingRig:prepared.length,
   realGarmentVerticesMoved:prepared.reduce(
    (s,x)=>s+x.result.actualGarmentVerticesMoved,0),
   originalBodyRestAndClothesUnchanged:true,
   clothPhysicsAndCollisionStillNotCertified:true,
   sourceSha256:scan.sourceSha256,
   bodyRestGeometryIdentityPreserved:true
  };
  $('scan37-status').textContent='3.9 真骨架同步：'+
   motion39Proof.actualGarmentMeshesFollowingRig+' 件獨立 3D 衣物；'+
   motion39Proof.realGarmentVerticesMoved+' 個衣物頂點隨人體實際關節位移。'+
   '布料碰撞與裙擺物理尚未通過。';
  proof();
  return motion39Proof;
 };
 const update37Wardrobe=()=>{
  if(!scan||!overlay?.parent||!rendererSource)
   throw Error('請先建立來源真 3D 人體素模，再選每日服裝');
  if(rendererSource.movieMode||rendererSource.reviewBusy)
   throw Error('共用畫面正在錄影或檢查，暫停服裝更新');
  const outfitId=$('scan37-outfit').value;
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
   motion39Proof=null;lastPose39=null;
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
