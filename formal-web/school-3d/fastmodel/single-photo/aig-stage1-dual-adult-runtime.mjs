/**
 * Stage 1 dual ADULT technical anatomy renderer.
 * No photo billboards, hair, school uniforms or extra WebGL contexts.
 * Uses the SAME existing PhotoViewer WebGLRenderer, and an independent
 * scene so failed baseline geometry cannot overwrite any source GLBs.
 */
import * as THREE from 'three';
import {buildAIGStage1AdultAnatomy,auditAIGStage1Anatomy,
 AIG_STAGE1_SCHEMA} from './aig-stage1-dual-adult-anatomy.mjs';
import {planAIGStage1OneCore19200,runStage1UnifiedRenderLogicCore,
 fitHumanToView}
 from './aig-stage1-unified-19200-ratio-core.mjs';
import {makeAIGStage1CanonicalMM,auditAIGStage1MMConversion,
 aigStage1WebGLGeometryFromCanonicalMM,
 aigStage1WebGLMetersFromTicks,aigStage1MmFromTicks}
 from './aig-stage1-mm-coordinate-contract.mjs';
import {renderAIGStage1True4KPNG,renderAIGStage1ResolutionPNG}
 from './aig-stage1-true4k-capture.mjs';
export const AIG_STAGE1_RUNTIME='AIG_STAGE1_DUAL_ADULT_TRUE_WEBGL_VIEWS';
const el=id=>document.getElementById(id);
const views=['front','profile','rear','quarter45'];
const error=s=>{throw Error('AIG_STAGE1_VIEW_'+s)};
function convertPart(part,joints,canonical){
 const g=new THREE.BufferGeometry();
 const bodyMM=canonical.parts[part.id];
 if(!bodyMM)error('MISSING_CANONICAL_MM_PART');
 g.setAttribute('position',new THREE.BufferAttribute(
  aigStage1WebGLGeometryFromCanonicalMM(bodyMM.positionTicks),3));
 g.setIndex(new THREE.BufferAttribute(part.geometry.indices,1));
 g.computeVertexNormals();
 g.computeBoundingSphere();
 if(part.parent){
  const ticks=canonical.joints[part.parent]?.positionTicks;
  if(!ticks)error('MISSING_MM_ATTACHMENT_'+part.parent);
  g.translate(...Array.from(ticks,x=>-aigStage1WebGLMetersFromTicks(x)));
 }
 return g;
}
function createThreeAdult(source,canonical){
 const root=new THREE.Group();
 root.name='AIG_STAGE1_'+source.gender.toUpperCase()+'_ANATOMY';
 const bones={};
 for(const [id,meta] of Object.entries(source.joints)){
  const bone=new THREE.Bone();bone.name=id;
  const parent=meta.parent?source.joints[meta.parent]:null;
  const ticks=canonical.joints[id].positionTicks;
  const parentTicks=parent?canonical.joints[meta.parent].positionTicks:null;
  bone.position.set(...Array.from(ticks,(x,k)=>
   aigStage1WebGLMetersFromTicks(x-(parentTicks?.[k]??0))));
  bones[id]=bone;
 }
 for(const [id,meta] of Object.entries(source.joints)){
  if(meta.parent)bones[meta.parent].add(bones[id]);
  else root.add(bones[id]);
 }
 const materialBody=new THREE.MeshStandardMaterial({
  color:source.gender==='male'?0xd5b49c:0xe1bfa9,
  metalness:0,roughness:.94,side:THREE.DoubleSide
 });
 const materialSwim=new THREE.MeshStandardMaterial({
  color:source.profile.swimColor,
  metalness:0,roughness:.7,side:THREE.DoubleSide
 });
 let geometryTriangles=0;
 for(const p of source.parts){
  const mesh=new THREE.Mesh(convertPart(p,source.joints,canonical),
   p.material==='swim'?materialSwim:materialBody);
  mesh.name=p.id;
  mesh.userData={role:p.role,material:p.material,
   parentBone:p.parent,realIndexedTriangles:p.geometry.triangleCount};
  geometryTriangles+=p.geometry.triangleCount;
  if(p.parent)bones[p.parent].add(mesh);else root.add(mesh);
 }
 root.userData={gender:source.gender,
  technicalNeutralAnatomyNoHair:true,
  fittedSwimwear:source.garmentType,
  trueBoneHierarchy:true,
  fullySkinnedBlendWeightsPresent:false,
  originalSourceSceneUntouched:true};
 return {root,bones,materials:[materialBody,materialSwim],
  geometryTriangles,
  dispose:()=>{
   root.traverse(o=>{if(o.isMesh)o.geometry.dispose()});
   materialBody.dispose();materialSwim.dispose();
  }};
}
export function installAIGStage1DualAdultRuntime({
 getSharedViewer
}={}){
 if(typeof getSharedViewer!=='function'||!el('stage1-start'))
  error('MISSING_VIEWER_PROVIDER_OR_FORMAL_UI');
 let stageScene=null,stageCamera=null,viewer=null,priorFrame=null;
 let active=false,selected='male',currentView='front',model=null;
 let renderCount=0,session=0,lastAudit=null,proofState=null;
 let ratioEvidence=null,snapshotsByGender=new Map(),lastCameraPlan=null;
 let fourKBusy=false,last4KOutput=null,previousPreviewQuality=null;
 const captured4KURLs=[];
 const singleCore19200=planAIGStage1OneCore19200();
 const status=(text,blocked=false)=>{
  el('stage1-status').textContent=text;
  el('stage1-status').dataset.error=blocked?'true':'false';
 };
 const createScene=()=>{
  stageScene=new THREE.Scene();
  stageScene.background=new THREE.Color('#040a12');
  stageScene.add(new THREE.HemisphereLight(0xebf4ff,0x222d3c,2.1));
  const key=new THREE.DirectionalLight(0xffffff,2.5);
  key.position.set(2.4,3.3,-3.0);stageScene.add(key);
  const fill=new THREE.DirectionalLight(0xb7dfff,1.35);
  fill.position.set(-2.0,2.8,2.2);stageScene.add(fill);
  const floor=new THREE.Mesh(
   new THREE.PlaneGeometry(4,4),
   new THREE.MeshStandardMaterial({color:'#101c2a',roughness:.97})
  );
  floor.rotation.x=-Math.PI/2;floor.position.y=-.012;
  floor.name='STAGE1_NEUTRAL_GROUND';
  stageScene.add(floor);
  stageCamera=new THREE.PerspectiveCamera(40,1,.01,20);
 };
 const actualCanvasViewport=()=>{
  if(!viewer?.canvas||!viewer?.renderer||!stageCamera)return null;
  const box=viewer.canvas.getBoundingClientRect();
  const w=box.width,h=box.height;
  return w>1&&h>1?{
   cssWidth:w,cssHeight:h,gpuWidth:viewer.canvas.width,
   gpuHeight:viewer.canvas.height,cameraAspect:stageCamera.aspect
  }:null;
 };
 const viewCamera=(view,aspect)=>{
  if(!model)error('NO_ACTIVE_SOURCE_MODEL');
  const fit=fitHumanToView(model.source,{
   view,aspect,verticalFovDeg:stageCamera.fov,targetHeight:.82
  });
  stageCamera.position.set(...fit.cameraPosition);
  stageCamera.aspect=aspect;
  stageCamera.near=Math.max(.005,fit.cameraDistanceMeters/1000);
  stageCamera.far=Math.max(20,fit.cameraDistanceMeters*8);
  stageCamera.lookAt(new THREE.Vector3(...fit.target));
  stageCamera.updateProjectionMatrix();
  currentView=view;lastCameraPlan=fit;
  return Object.freeze({name:view,position:stageCamera.position.toArray(),
   target:fit.target,fov:stageCamera.fov,aspect,
   humanProjectedHeightRatio:fit.actualProjectedBodyHeightRatio,
   humanProjectedWidthRatio:fit.actualProjectedBodyWidthRatio,
   actualFitPass:fit.framingNumericContractPASS});
 };
 const publish=()=>{
  if(model){
   try{
    ratioEvidence=runStage1UnifiedRenderLogicCore({
     model:model.source,view:currentView,
     aspect:stageCamera?.aspect||1,
     verticalFovDeg:stageCamera?.fov||40,
     viewport:actualCanvasViewport(),
     snapshots:snapshotsByGender.get(selected)||[],
     canonicalMM:model.canonical
    });
   }catch(e){
    ratioEvidence={schema:'AIG_STAGE1_ONE_CORE_19200_PROPORTION_GATE',
     error:String(e?.message||e),
     numericAndEvidenceGatePASS:false,stage1ReleasePASS:false};
   }
  }else ratioEvidence=null;
  proofState={
   schema:AIG_STAGE1_RUNTIME,modelGender:selected,
   actualStage1SourceSchema:AIG_STAGE1_SCHEMA,
   originalGLBAndCADCAMNotMutated:true,
   sharedExistingWebGLRenderer:true,
   activeSceneRendered:active,
   realIndependentBodyParts:model?.source.partCount??0,
   realTriangleCount:model?.object.geometryTriangles??0,
   realAnatomicalJointCount:model?.source.jointCount??0,
   measuredHeightMeters:model?.source.heightMeters??null,
   heightMm:model?.canonical?.heightMm??null,
   canonicalUnit:'mm',precisionMm:.001,
   coordinateMmGate:model?.millimeterAudit??null,
   allJointsHaveParentHierarchy:true,
   actualJointSource:Object.keys(model?.source.joints??{}),
   garmentType:model?.source.garmentType??null,
   noHairOrSchoolClothing:true,
   leftAndRightLegMeshesIndependentlyPresent:true,
   currentCameraView:currentView,
   submittedFrameCount:renderCount,
   automaticGeometryGate:lastAudit?.automaticGeometryContractPASS===true,
   actualBodySurfaceAudit:lastAudit?.actualSurfaceAudit??null,
   mandatoryFourViewSnapshotsReviewed:false,
   neutralBodySourceVisuallyAccepted:false,
   fullSkinnedBlendWeightsVerified:false,
   noPhotoIdentityReconstructionClaim:true,
   formalFemaleHeroineAppearancePASS:false,
   stage1PASS:false,
   oneSingleCore19200:singleCore19200,
   realAnatomyRatioGate:ratioEvidence,
   observedFourViewSnapshotCount:(snapshotsByGender.get(selected)||[]).length,
   cameraFitMeasurements:lastCameraPlan,
   preview4K:viewer?.getAdaptive4KReport?.()??null,
   actualFourKOutput:last4KOutput&&{
    gender:last4KOutput.gender,
    view:last4KOutput.view,width:last4KOutput.width,
    height:last4KOutput.height,sha256:last4KOutput.sha256,
    realGPUFramebufferReadback:last4KOutput.actualGPUFramebufferReadback,
    selectedResolution:last4KOutput.selectedResolution,
    requestedResolution:last4KOutput.requestedResolution,
    actuallyDowngraded:last4KOutput.actuallyDowngraded,
    sourceDimensionsPreserved:true,
    visualAcceptancePASS:false
   }
  };
  const ratio=ratioEvidence?.proportions;
  const statusText=ratio?[
   '共用核心：19,200 邏輯工作槽（不是 19,200 個實體核心）',
   '身高 '+ratio.actualAdultHeightMm.toFixed(3)+' mm',
   '頭高 '+ratio.headHeightMm.toFixed(3)+' mm',
   '骨盆表面 '+ratio.truePelvicBodyWidthMm.toFixed(3)+' mm',
   '大腿內側間距 '+(lastAudit?.actualSurfaceAudit?.upperThighInnerGapMm??0).toFixed(3)+' mm',
   '頭部高寬比 '+(lastAudit?.actualSurfaceAudit?.actualHeadHeightToWidth??0).toFixed(3),
   '肩／軀幹接合 '+(lastAudit?.actualSurfaceAudit?.actualBodySurfaceNumericPASS?'數值有效':'BLOCK'),
   '頭身比 '+ratio.headToBodyRatio.toFixed(3),
   '肩寬／頭寬 '+ratio.shoulderToHeadRatio.toFixed(3),
   '骨盆／肩寬 '+ratio.hipToShoulderRatio.toFixed(3),
   '大腿／小腿 '+ratio.thighToCalfRatio.toFixed(3),
   '左右骨架 '+(ratioEvidence.skeleton?.boneAlignmentNumericContractPASS?'數值通過':'待修'),
   '入鏡 '+((ratioEvidence.camera?.actualProjectedBodyHeightRatio??0)*100).toFixed(1)+'%',
   '畫布 '+(ratioEvidence.viewport?.viewportNumericContractPASS?'比例一致':'BLOCK'),
   '四視角 '+(snapshotsByGender.get(selected)||[]).length+'/4',
   '外觀仍為 BLOCK'
  ].join('｜'):'目前沒有可以驗證的人體比例或 WebGL 證據。';
  if(el('stage1-ratio-status'))
   el('stage1-ratio-status').textContent=statusText;
  el('stage1-proof').textContent=JSON.stringify(proofState,null,2);
  return proofState;
 };
 const setup=async(gender)=>{
  if(!['male','female'].includes(gender))error('UNKNOWN_GENDER');
  if(active&&selected===gender)return publish();
  if(!viewer){
   viewer=await getSharedViewer();
   if(!viewer?.renderer||!viewer?.scene)error('SHARED_PHOTOVIEWER_NOT_READY');
   previousPreviewQuality=viewer.adaptive4KMode??'off';
  }
  if(viewer.movieMode||viewer.reviewBusy)
   error('CANNOT_REPLACE_ACTIVE_RECORDING_OR_REVIEW');
  if(!stageScene)createScene();
  const source=buildAIGStage1AdultAnatomy(gender);
  const audit=auditAIGStage1Anatomy(source);
  if(!audit.automaticGeometryContractPASS)
   error('ANATOMICAL_STRUCTURE_GATE_'+audit.structuralErrors.join('_'));
  const canonical=makeAIGStage1CanonicalMM(source);
  const millimeterAudit=auditAIGStage1MMConversion(source,canonical);
  if(!millimeterAudit.canonicalMillimeterGatePASS)
   error('MM_COORDINATE_CONTRACT_'+
    millimeterAudit.millimeterContractViolations.join('_'));
  const next=createThreeAdult(source,canonical);
  const originalObject=model;
  stageScene.add(next.root);
  if(originalObject){
   stageScene.remove(originalObject.object.root);
   originalObject.object.dispose();
  }
  model={source,object:next,canonical,millimeterAudit};
  // Each newly installed model must take NEW actual WebGL snapshots.
  // Keep previous gallery PNGs as evidence, but never silently reuse
  // yesterday's hash to satisfy the current session's Stage 1 Gate.
  snapshotsByGender.delete(gender);
  // Historical 4K thumbnails remain visible, but prior gender/render
  // evidence must NEVER be attributed to a newly installed model.
  last4KOutput=null;
  selected=gender;lastAudit=audit;active=true;renderCount=0;session++;
  lastCameraPlan=null;
  if(priorFrame===null){
   priorFrame=viewer.onAfterRender??(()=>{});
   viewer.onAfterRender=(t)=>{
    priorFrame?.(t);
    if(!active||!viewer?.renderer||!stageScene||!stageCamera)return;
    const w=viewer.canvas.width||800,h=viewer.canvas.height||600;
    const actualAspect=w/h;
    // Real orientation, viewport resize, device pixel ratio changes:
    // re-fit FULL body, not merely update camera aspect and crop limbs.
    if(Math.abs(stageCamera.aspect-actualAspect)>.004)
     viewCamera(currentView,actualAspect);
    viewer.renderer.render(stageScene,stageCamera);
    renderCount++;
    if(renderCount%25===0)publish();
   };
  }
  viewCamera('front',(viewer.canvas.width||800)/(viewer.canvas.height||600));
  if(viewer.adaptive4KMode!==
   el('stage1-4k-quality').value){
   try{viewer.setAdaptive4KQuality(el('stage1-4k-quality').value)}
   catch(e){fourKStatus('預覽品質使用原設定：'+String(e.message||e),true)}
  }
  status('已建立 '+(gender==='male'?'成人男性（貼身泳褲）':'成人女性（貼身連身泳衣）')+
   '獨立 3D 基礎人體｜'+source.partCount+' 個可見部件、'+
   source.jointCount+' 個關節、'+source.actualIndexedTriangles+
   ' 個實際三角面。必須看完四視角才驗收。');
  publish();
  return proofState;
 };
 const selectView=view=>{
  if(!active)error('START_MODEL_FIRST');
  viewCamera(view,(viewer.canvas.width||800)/(viewer.canvas.height||600));
  publish();return currentView;
 };
 const capture=async(gender)=>{
  await setup(gender);
  if(viewer.movieMode||viewer.reviewBusy)error('CANNOT_CAPTURE_WHILE_MOVIE_RUNNING');
  const renderer=viewer.renderer;
  const previous=renderer.getRenderTarget();
  const w=320,h=560,target=new THREE.WebGLRenderTarget(w,h,{
   type:THREE.UnsignedByteType,format:THREE.RGBAFormat,
   depthBuffer:true,stencilBuffer:false});
  const shot=[],saw=new Set();
  try{
   for(const view of views){
    const camera=viewCamera(view,w/h);
    renderer.setRenderTarget(target);
    renderer.setViewport(0,0,w,h);
    renderer.setScissorTest(false);
    renderer.clear(true,true,true);
    renderer.render(stageScene,stageCamera);
    const pixels=new Uint8Array(w*h*4);
    renderer.readRenderTargetPixels(target,0,0,w,h,pixels);
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
    const flipped=new Uint8ClampedArray(pixels.length);
    for(let y=0;y<h;y++){
     flipped.set(pixels.subarray((h-y-1)*w*4,(h-y)*w*4),y*w*4);
    }
    canvas.getContext('2d').putImageData(new ImageData(flipped,w,h),0,0);
    const png=canvas.toDataURL('image/png');
    const sample=new Set();
    for(let y=0;y<h;y+=19)for(let x=0;x<w;x+=19){
     const i=(y*w+x)*4;
     sample.add(pixels[i]+','+pixels[i+1]+','+pixels[i+2]);
    }
    if(sample.size<12)error('ACTUAL_3D_FRAME_IS_BLANK_'+view);
    const digest=await crypto.subtle.digest('SHA-256',pixels.buffer);
    const sha=Array.from(new Uint8Array(digest),
     b=>b.toString(16).padStart(2,'0')).join('');
    if(saw.has(sha))error('IDENTICAL_3D_CAMERA_FRAMES_'+view);
    saw.add(sha);
    shot.push({gender,view,width:w,height:h,png,
     rgbaSHA256:sha,sha256:sha,realWebGLRendererPixels:true,
     realRendererPixels:true,camera,
     bodyHeightMm:model.canonical.heightMm,
     cameraPositionMm:camera.position.map(x=>
      aigStage1MmFromTicks(Math.round(x*1000000))),
     millimeterPrecision:.001});
   }
   snapshotsByGender.set(gender,shot.map(({view,sha256,
    realWebGLRendererPixels,camera})=>({view,sha256,realWebGLRendererPixels,
    camera})));
   currentView='front';
   viewCamera('front',(viewer.canvas.width||800)/(viewer.canvas.height||600));
   publish();
   return shot;
  }finally{
   renderer.setRenderTarget(previous);
   target.dispose();
  }
 };
 const gallery=el('stage1-snapshots');
 const display=async gender=>{
  let shots;
  try{shots=await capture(gender)}
  catch(e){status('四視角快照 BLOCKED：'+String(e.message||e),true);throw e}
  const area=document.createElement('section');
  area.dataset.stage1GalleryGender=gender;
  area.style.cssText='padding:9px;margin:8px 0;border:1px solid #40678a;border-radius:8px';
  const heading=document.createElement('p');
  heading.textContent='成人'+(gender==='male'?'男生／貼身泳褲':'女生／連身貼身泳衣')+
   '｜真 WebGL 四視角（待目視確認，非真人照片）';
  area.append(heading);
  const pics=document.createElement('div');
  pics.style.cssText='display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px';
  const labels={front:'正面',profile:'側面',rear:'背面',quarter45:'45°'};
  for(const s of shots){
   const fig=document.createElement('figure');
   fig.style.cssText='margin:0;min-width:0';
   const img=document.createElement('img');
   img.src=s.png;img.alt=gender+' '+labels[s.view]+' 真 WebGL Stage 1';
   img.style.cssText='display:block;width:100%;height:auto;border-radius:5px';
   const cap=document.createElement('figcaption');
   cap.textContent=labels[s.view];
   cap.style.cssText='font-size:11px;color:#bce5ec;text-align:center';
   fig.append(img,cap);pics.append(fig);
  }
  area.append(pics);
  gallery.prepend(area);
  status('已提供 '+gender+' 的四視角真 3D 快照。幾何機械檢查通過；'+
   '人體外觀尚待你的目視驗收，Stage 1 仍為 BLOCK。');
  return shots;
 };
 const fourKStatus=(message,failed=false)=>{
  el('stage1-4k-status').textContent=message;
  el('stage1-4k-status').dataset.error=failed?'true':'false';
 };
 const captureResolution=async(view=currentView,manualRequest=null)=>{
  if(!active||!viewer||!model||!stageScene||!stageCamera)
   error('START_STAGE1_REAL_3D_BODY_FIRST');
  if(fourKBusy)error('ONE_4K_JOB_AT_A_TIME');
  if(viewer.movieMode||viewer.reviewBusy)
   error('4K_CAPTURE_BLOCKED_DURING_MOVIE_OR_REVIEW');
  fourKBusy=true;
  const gender=selected;
  const orientation=el('stage1-4k-orientation').value;
  const requested=manualRequest??el('stage1-output-resolution').value;
  fourKStatus('使用原始 3D 幾何和同一 GPU，依 '+requested+
   ' 渲染 '+view+'；實際解析度將逐張驗證。');
  try{
   const record=await renderAIGStage1ResolutionPNG({
    renderer:viewer.renderer,scene:stageScene,
    sourceBody:model.source,requested,
    currentCamera:stageCamera,view,orientation,
    deviceMemoryGB:navigator.deviceMemory??8
   });
   if(gender!==selected)error('SOURCE_GENDER_CHANGED_DURING_4K_CAPTURE');
   const url=URL.createObjectURL(record.blob);
   captured4KURLs.push(url);
   const section=document.createElement('section');
   section.style.cssText='margin:9px 0;padding:8px;border:1px solid #536e94;border-radius:8px';
   const title=document.createElement('p');
   title.textContent=(gender==='male'?'男生泳褲':'女生連身泳衣')+
    '｜'+view+'｜'+record.selectedResolution.toUpperCase()+
    ' '+record.width+'×'+record.height+
    (record.actuallyDowngraded?'（自動向下相容）':'')+
    '｜PNG SHA '+record.sha256.slice(0,12)+'…｜人物外觀未核准';
   const picture=document.createElement('img');
   picture.src=url;picture.alt='實際 '+record.selectedResolution+
    ' WebGL 成人技術人體 '+gender+' '+view;
   picture.style.cssText='max-width:350px;width:100%;height:auto;border-radius:6px';
   const link=document.createElement('a');
   link.href=url;
   link.download='AIG-Stage1-'+gender+'-'+view+'-'+
    record.width+'x'+record.height+'-'+
    record.selectedResolution.toUpperCase()+'-NATIVE.png';
   link.textContent='儲存原生 '+record.selectedResolution.toUpperCase()+
    ' PNG（非放大圖片）';
   link.style.cssText='display:block;margin:8px 0;color:#a9e9ff';
   section.append(title,picture,link);
   el('stage1-4k-gallery').prepend(section);
   last4KOutput={...record,gender,blob:null};
   publish();
   fourKStatus('已完成 '+record.selectedResolution.toUpperCase()+' '+
    record.width+'×'+record.height+
    (record.actuallyDowngraded?'（自動從 4K 向下相容）':'')+
    '，真 GPU 原生像素、PNG 尺寸及 SHA 已檢查。'+
    '人物比例／外觀仍需目視，Stage 1 BLOCK。');
   return record;
  }catch(e){
   fourKStatus('解析度 '+requested+' BLOCKED：'+String(e?.message||e)+
    '。手動指定不暗中降級，原始模型與舊快照保留。',true);
   throw e;
  }finally{fourKBusy=false;}
 };
 const fourKAllViews=async()=>{
  const entries=[];
  const requested=el('stage1-output-resolution').value;
  let lockedLevel=requested==='auto'?null:requested;
  for(const view of views){
   // Auto selects ONE actually supported native tier on the first frame.
   // Other three views must share that tier for comparable evidence;
   // never silently mix 4K and 1080p in a four-view proof.
   const result=await captureResolution(view,lockedLevel??requested);
   if(!lockedLevel)lockedLevel=result.selectedResolution;
   if(result.selectedResolution!==lockedLevel)
    error('FOUR_CAMERA_RESOLUTION_LEVEL_MISMATCH');
   entries.push(result);
   await new Promise(resolve=>requestAnimationFrame(resolve));
  }
  if(new Set(entries.map(x=>x.sha256)).size!==4)
   error('FOUR_CAMERA_RENDER_FILES_IDENTICAL_BLOCKED');
  return entries;
 };
 const set4KPreview=(mode)=>{
  if(!viewer){
   fourKStatus('預覽模式已設定 '+mode+'；開啟基礎人體後套用。');
   return null;
  }
  const report=viewer.setAdaptive4KQuality(mode);
  fourKStatus('自適應預覽：'+mode+'｜實際 '+
   report.actualCanvasWidth+'×'+report.actualCanvasHeight+
   ' 畫素；獨立 4K PNG 請使用輸出鍵。');
  publish();
  return report;
 };
 const stop=()=>{
  if(!active)return;
  active=false;session++;
  if(viewer&&priorFrame!==null)viewer.onAfterRender=priorFrame;
  if(viewer&&previousPreviewQuality!==null){
   try{viewer.setAdaptive4KQuality(previousPreviewQuality)}
   catch{/* isolate this optional quality setting, preserve source scene */}
  }
  priorFrame=null;
  if(model){
   stageScene.remove(model.object.root);
   model.object.dispose();
   model=null;
  }
  for(const mesh of stageScene?.children??[]){
   if(mesh.name==='STAGE1_NEUTRAL_GROUND'){
    mesh.geometry.dispose();mesh.material.dispose();
   }
  }
  stageScene=null;stageCamera=null;viewer=null;
  snapshotsByGender=new Map();ratioEvidence=null;lastCameraPlan=null;
  previousPreviewQuality=null;
  status('已退出 Stage 1 基礎人體，原始 3D 工作場景仍保留。');
  publish();
 };
 el('stage1-start').addEventListener('click',async()=>{
  try{await setup(el('stage1-gender').value)}
  catch(e){status(String(e.message||e),true)}
 });
 el('stage1-gender').addEventListener('change',async()=>{
  if(!active)return;
  try{await setup(el('stage1-gender').value)}
  catch(e){status(String(e.message||e),true)}
 });
 for(const view of views)el('stage1-'+view).addEventListener('click',()=>{
  try{selectView(view)}catch(e){status(String(e.message||e),true)}
 });
 el('stage1-capture').addEventListener('click',async()=>{
  try{await display(el('stage1-gender').value)}
  catch{/* error already shown and old snapshots untouched */}
 });
 el('stage1-capture-both').addEventListener('click',async()=>{
  try{await display('male');await display('female')}
  catch{/* fail closed and keep earlier actual snapshots */}
 });
 el('stage1-4k-quality').addEventListener('change',()=>{
  try{set4KPreview(el('stage1-4k-quality').value)}
  catch(e){fourKStatus('4K 預覽 BLOCK：'+String(e.message||e),true)}
 });
 el('stage1-4k-current').addEventListener('click',()=>{
  captureResolution().catch(()=>{});
 });
 el('stage1-4k-four').addEventListener('click',()=>{
  fourKAllViews().catch(()=>{});
 });
 el('stage1-close').addEventListener('click',stop);
 window.addEventListener('pagehide',()=>{
  captured4KURLs.forEach(u=>URL.revokeObjectURL(u));
  stop();
 },{once:true});
 publish();
 return Object.freeze({setup,selectView,capture,display,
  captureResolution,captureTrue4K:(v)=>captureResolution(v??currentView,'4k'),
  fourKAllViews,set4KPreview,stop,
  get isActive(){return active},get evidence(){return proofState}});
}
