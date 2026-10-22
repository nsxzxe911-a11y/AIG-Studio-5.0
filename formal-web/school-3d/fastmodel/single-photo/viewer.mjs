import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {inspectSkinPose,SkinAnomalyMonitor} from './skin-anomaly.mjs';
import {REVIEW_DIRECTIONS,reviewCameraPose,reviewPoseTime} from './heroine-review.mjs';
import {TIMELINE_FRACTIONS,composeTimelineImage} from './timeline-review.mjs';
import {inspectExternalAction,copyCompatibleClips,commitCompatibleClips} from './action-compatibility.mjs';
import {StoryPlayback} from './story-to-animation.mjs';
import {Aig42GpuTimer} from './aig-performance-4-2.mjs';
import {Aig17GLBGpuGovernor} from './aig-glb-gpu-adaptive-1-7.mjs';
import {prepareAIG18StaticInstancing,activateAIG18StaticInstancing} from './aig-static-instancing-1-8.mjs';

export async function parseRiggedGLB(buffer){
 if(!(buffer instanceof ArrayBuffer)||buffer.byteLength>200*1024*1024)throw Error('GLB_SIZE_LIMIT');
 const dv=new DataView(buffer);
 if(buffer.byteLength<20||dv.getUint32(0,true)!==0x46546c67||
    dv.getUint32(4,true)!==2||dv.getUint32(8,true)!==buffer.byteLength||
    dv.getUint32(16,true)!==0x4e4f534a)throw Error('GLB_HEADER_INVALID');
 const len=dv.getUint32(12,true);
 if(len>buffer.byteLength-20||len>16*1024*1024)throw Error('GLB_JSON_INVALID');
 const json=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,20,len)));
 for(const ref of [...(json.buffers||[]),...(json.images||[])])
  if(ref.uri&&!/^data:/i.test(ref.uri))throw Error('GLB_EXTERNAL_ASSETS_NOT_ALLOWED');
 const manager=new THREE.LoadingManager();
 manager.setURLModifier(url=>{
  if(!/^(blob:|data:)/i.test(url))throw Error('GLB_EXTERNAL_ASSETS_NOT_ALLOWED');
  return url;
 });
 return new GLTFLoader(manager).parseAsync(buffer,'');
}
export class AnimationController{
 constructor(root,clips=[]){this.mixer=new THREE.AnimationMixer(root);this.clips=clips;this.index=null;this.paused=false;this.story=null;}
 select(index,{keepStory=false}={}){
  if(!keepStory)this.story?.stop();
  if(!Number.isInteger(index)||!this.clips[index])throw Error('CLIP_INDEX');
  this.mixer.stopAllAction();this.index=index;
  this.mixer.clipAction(this.clips[index]).reset().play();
 }
 startStory(plan,callbacks={}){
  if(this.story?.playing)throw Error('STORY_ALREADY_PLAYING');
  const playback=new StoryPlayback(this,callbacks);
  playback.start(plan);
  this.story=playback;return playback;
 }
 stopStory(){this.story?.stop();}
 update(seconds){
  if(this.paused)return;
  if(this.story?.playing)this.story.update(Math.max(0,seconds));
  else this.mixer.update(Math.max(0,seconds));
 }
 dispose(){this.stopStory();this.mixer.stopAllAction();this.mixer.uncacheRoot(this.mixer.getRoot());}
}
export class PhotoViewer{
 constructor(canvas,onError){
  this.canvas=canvas;this.onError=onError;this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});
  this.originalPreviewPixelRatio=Math.min(devicePixelRatio||1,1.5);
  this.renderer.setPixelRatio(this.originalPreviewPixelRatio);this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1;
  this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#020407');
  this.camera=new THREE.PerspectiveCamera(40,1,.01,1000);this.camera.position.set(0,1,3);
  this.controls=new OrbitControls(this.camera,canvas);this.controls.enableDamping=true;
  this.scene.add(new THREE.HemisphereLight(0xcdeaff,0x242035,1.5));
  const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(2,4,3);this.scene.add(light);
  const pmrem=new THREE.PMREMGenerator(this.renderer),room=new RoomEnvironment();this.env=pmrem.fromScene(room).texture;this.scene.environment=this.env;room.dispose();pmrem.dispose();
  this.resize=new ResizeObserver(()=>this.fitCanvas());this.resize.observe(canvas.parentElement);this.fitCanvas();this.previous=0;this.orbit=false;this.skinProbe=null;this.skinReport=null;this.onFrame=null;this.onAfterRender=null;this.onFrameMeasured=null;this.movieMode=false;this.movieOriginalViewport=null;
  this.gpu17Timer=null;this.gpu17Governor=null;this.gpu17Enabled=false;
  this.gpu17LastSample=null;this.gpu17Frames=0;this.gpu17Status='DISABLED_OR_NO_GL_BUNDLE';
  this.gpu18Instances=null;this.gpu18Status='DISABLED';this.gpu18SkipHiddenFrames=0;
  this.renderer.setAnimationLoop(t=>{try{const dt=this.previous?Math.min(.1,(t-this.previous)/1000):0;this.previous=t;this.animation?.update(dt);
    try{this.onFrame?.(dt,t);}catch(audioError){this.onFrame=null;this.onError('音訊已隔離：'+audioError.message);}
    if(this.skinProbe&&this.model){this.skinProbe.capture(this.model,t,{animationName:this.animation?.clips?.[this.animation?.index]?.name||null});if(this.skinProbe.done)this.skinProbe=null;}
    this.controls.autoRotate=this.orbit;this.controls.update();
    // Animation/story state continues when hidden, but avoid GPU submission
    // when recording, explicit evidence or visual QA is not active.
    if(document.visibilityState==='hidden'&&!this.movieMode&&
      !this.reviewBusy&&!this.skinProbe&&!this.onFrameMeasured&&!this.onAfterRender){
     this.gpu18SkipHiddenFrames++;return;
    }
    const gpuMeasure=this.gpu17Enabled&&this.model&&!this.movieMode&&
      !this.reviewBusy&&!this.actionImportBusy&&document.visibilityState==='visible'&&
      this.gpu17Timer?.supported;
    if(gpuMeasure)this.gpu17Timer.begin();
    const renderStart=performance.now();
    try{this.renderer.render(this.scene,this.camera);}
    finally{if(gpuMeasure)this.gpu17Timer.end();}
    const cpuSubmitMs=performance.now()-renderStart;
    const completedGpuSample=gpuMeasure?this.gpu17Timer.poll():null;
    if(completedGpuSample){
     this.gpu17LastSample=completedGpuSample;
     const decision=this.gpu17Governor.observe(completedGpuSample);
     if(decision.changed){
      const nextRatio=this.originalPreviewPixelRatio*decision.pixelRatioFactor;
      this.renderer.setPixelRatio(nextRatio);
      this.fitCanvas();
      this.gpu17Status=decision.reason;
     }
    }
    this.gpu17Frames++;
    try{this.onFrameMeasured?.({timeMs:t,renderCpuMs:cpuSubmitMs,
     gpuMs:completedGpuSample?.disjoint===false?completedGpuSample.gpuMs:null,
     gpuMeasurementSource:completedGpuSample?.disjoint===false?
       'EXT_disjoint_timer_query_webgl2':null,
     width:this.canvas.width,height:this.canvas.height,
     drawCalls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles,
     visibility:document.visibilityState});}catch(e){this.onFrameMeasured=null;this.onError('5.2 畫面採樣已隔離：'+e.message);}
    try{this.onAfterRender?.(t);}catch(movieError){this.onAfterRender=null;this.onError('錄影已隔離：'+movieError.message);}}catch(e){this.renderer.setAnimationLoop(null);onError(e.message);}});
 }
 /** 1.8 source-safe GPU instancing for repeated genuinely static GLB nodes.
  * Changes only reversible runtime visibility and draw-call representation.
  */
 setStaticInstancingEnabled(enabled){
  if(typeof enabled!=='boolean')throw Error('AIG18_STATIC_INSTANCE_TOGGLE_INVALID');
  if(this.movieMode||this.reviewBusy||this.actionImportBusy||this.skinProbe)
   throw Error('AIG18_STATIC_INSTANCE_RECORDING_OR_QA_LOCK');
  if(!enabled){
   this.gpu18Instances?.restore();this.gpu18Instances=null;
   this.gpu18Status='DISABLED_SOURCE_RESTORED';
   return this.getStaticInstancingReport();
  }
  if(!this.model)throw Error('AIG18_REAL_LOADED_GLB_REQUIRED');
  if(this.gpu18Instances)return this.getStaticInstancingReport();
  const planned=prepareAIG18StaticInstancing(this.model,
   this.animation?.clips||[],{minInstances:3,maxInstancesPerGroup:2048});
  if(!planned.instanceDrawGroups){
   this.gpu18Status='NO_IDENTICAL_SAFE_STATIC_GROUPS_SOURCE_UNCHANGED';
   return this.getStaticInstancingReport({plan:planned});
  }
  this.gpu18Instances=activateAIG18StaticInstancing(planned);
  this.gpu18Status='TRUE_THREE_GPU_INSTANCING_ACTIVE';
  return this.getStaticInstancingReport();
 }
 getStaticInstancingReport({plan=null}={}){
  const state=this.gpu18Instances?.report();
  return Object.freeze({
   schema:'AIG_FASTMODEL_REAL3D_1_8_STATIC_GPU_INSTANCING',
   reason:this.gpu18Status,loadedGLBPresent:!!this.model,
   active:Boolean(state?.active),
   groupedStaticMeshes:state?.groupedStaticMeshes??plan?.groupedStaticMeshes??0,
   instanceDrawGroups:state?.instanceDrawGroups??plan?.instanceDrawGroups??0,
   theoreticalDrawCallsSaved:state?.theoreticalDrawCallsSaved??plan?.theoreticalDrawCallsSaved??0,
   skippedHiddenGPUFrames:this.gpu18SkipHiddenFrames,
   originalGeometryBytesUnchanged:true,
   skinMorphAndAnimationTracksPreserved:true,
   noGeometryDecimation:true,actualFPSGainMeasured:false,
   nativeAndroidWindowsGPUVerified:false
  });
 }
 /**
  * Opt-in on actual loaded GLB only; NEVER changes GLB or animation.
  * A WebGL2 disjoint timer extension is mandatory for automatic decisions.
  */
 setGpuAccelerationEnabled(enabled){
  if(typeof enabled!=='boolean')throw Error('AIG17_GPU_TOGGLE_INVALID');
  if(this.movieMode||this.reviewBusy||this.actionImportBusy)
   throw Error('AIG17_MOVIE_OR_REVIEW_GPU_POLICY_BLOCKED');
  if(enabled&&!this.model)throw Error('AIG17_TRUE_LOADED_GLB_REQUIRED');
  if(!enabled){
   this.gpu17Enabled=false;this.gpu17Timer?.dispose();
   this.gpu17Timer=null;this.gpu17Governor=null;
   this.gpu17Status='DISABLED_RESTORE_ORIGINAL_PREVIEW';
   this.renderer.setPixelRatio(this.originalPreviewPixelRatio);
   this.fitCanvas();
   return this.getGpuAccelerationReport();
  }
  if(this.gpu17Enabled)return this.getGpuAccelerationReport();
  const timer=new Aig42GpuTimer(this.renderer.getContext());
  if(!timer.supported){
   timer.dispose();
   this.gpu17Enabled=false;this.gpu17Status='GPU_TIMER_UNAVAILABLE_NO_QUALITY_DOWNGRADE';
   return this.getGpuAccelerationReport();
  }
  this.gpu17Timer=timer;this.gpu17Governor=new Aig17GLBGpuGovernor();
  this.gpu17Enabled=true;this.gpu17Frames=0;this.gpu17LastSample=null;
  this.gpu17Status='REAL_GPU_TIMER_ACTIVE_AWAIT_VALID_SAMPLES';
  return this.getGpuAccelerationReport();
 }
 getGpuAccelerationReport(){
  return Object.freeze({
   schema:'AIG_FASTMODEL_REAL_GLB_GPU_ADAPTIVE_1_7',
   enabled:this.gpu17Enabled,reason:this.gpu17Status,
   loadedGLBScenePresent:Boolean(this.model),
   loadedAnimationClipCount:this.animation?.clips?.length??0,
   lastGpuSample:this.gpu17LastSample,
   framesObserved:this.gpu17Frames,
   previewPixelRatio:this.renderer.getPixelRatio(),
   gpuTimerSupported:Boolean(this.gpu17Timer?.supported),
   governor:this.gpu17Governor?.report??null,
   liveFramesAreNotNativeFPS:true,
   changesOnlyPreviewPixelRatio:true,
   noGLBMutation:true,syntheticCharacterNotAuthorityApproved:true,
   nativeAndroidWindows60FPSVerified:false
  });
 }
 fitCanvas(){if(this.movieMode)return;const r=this.canvas.parentElement.getBoundingClientRect();this.renderer.setSize(Math.max(1,r.width),Math.max(1,r.height),false);this.camera.aspect=Math.max(1,r.width)/Math.max(1,r.height);this.camera.updateProjectionMatrix();}
 beginMovie1080p(){
  if(this.gpu17Enabled)this.setGpuAccelerationEnabled(false);
  if(this.movieMode||this.reviewBusy||this.actionImportBusy||!this.model||!this.animation)
   throw Error('MOVIE_VIEWER_NOT_READY');
  const size=this.renderer.getSize(new THREE.Vector2());
  this.movieOriginalViewport={size:size.clone(),aspect:this.camera.aspect,pixelRatio:this.renderer.getPixelRatio()};
  try{
   this.movieMode=true;this.renderer.setPixelRatio(1);
   this.renderer.setSize(1920,1080,false);this.camera.aspect=1920/1080;
   this.camera.updateProjectionMatrix();
   return {actualCanvasWidth:this.canvas.width,actualCanvasHeight:this.canvas.height};
  }catch(err){this.endMovie1080p();throw err;}
 }
 endMovie1080p(){
  if(!this.movieMode)return;
  this.movieMode=false;
  const old=this.movieOriginalViewport;this.movieOriginalViewport=null;
  this.onAfterRender=null;
  if(old){
   this.renderer.setPixelRatio(old.pixelRatio);
   this.renderer.setSize(old.size.x,old.size.y,false);
   this.camera.aspect=old.aspect;this.camera.updateProjectionMatrix();
  }
 }
 /**
  * Real3D 1.9 — explicitly release the current working GLB from GPU.
  * Does not erase the IndexedDB original asset, scene-map metadata,
  * the separate heroine depth/rig source, or the reusable renderer.
  */
 unloadCurrent(){
  if(this.movieMode||this.reviewBusy||this.actionImportBusy||
   this.skinProbe||this.animation?.story?.playing)
   throw Error('AIG19_BUSY_ANIMATION_OR_EVIDENCE_BLOCKED');
  if(this.gpu17Enabled)this.setGpuAccelerationEnabled(false);
  if(this.gpu18Instances)this.setStaticInstancingEnabled(false);
  const old=this.model;
  this.animation?.dispose();this.animation=null;
  this.skinProbe=null;this.skinReport=null;this.model=null;
  this.orbit=false;
  this.onFrame=null;
  if(old){
   this.scene.remove(old);
   return {status:'GPU_SCENE_DISPOSE_REQUESTED',
    ...this.release(old),originalGLBDeleted:false};
  }
  return {status:'NO_ACTIVE_GPU_SCENE',originalGLBDeleted:false};
 }
 /**
  * Real3D 2.0 single-renderer multi-source world commit.
  * Call ONLY after source/geometry/scale validation and asset loading.
  * All objects are parented into one source-locked THREE.Group; original
  * GLB buffers stay in the outside-app library, not in this scene graph.
  */
 mountVerifiedWorld(root,{animationClips=[],orbit=false}={}){
  if(!root?.isGroup||root.children.length===0||
   !Array.isArray(animationClips)||typeof orbit!=='boolean)
   throw Error('AIG20_VALIDATED_THREE_SCENE_REQUIRED');
  if(this.movieMode||this.reviewBusy||this.actionImportBusy||
   this.skinProbe||this.animation?.story?.playing)
   throw Error('AIG20_SCENE_SWITCH_DURING_RECORDING_BLOCKED');
  const box=new THREE.Box3().setFromObject(root);
  if(box.isEmpty())throw Error('AIG20_EMPTY_SOURCE_WORLD_BLOCKED');
  const size=box.getSize(new THREE.Vector3()),
   center=box.getCenter(new THREE.Vector3());
  if(![...size,...center].every(Number.isFinite))
   throw Error('AIG20_NONFINITE_WORLD_BOUNDS');
  const radius=Math.max(size.x,size.y,size.z,.01);
  // This workbench has ONE renderer; only the active source group changes.
  if(this.gpu17Enabled)this.setGpuAccelerationEnabled(false);
  if(this.gpu18Instances)this.setStaticInstancingEnabled(false);
  const nextController=new AnimationController(root,animationClips);
  try{
   if(animationClips.length)nextController.select(0);
  }catch(e){nextController.dispose();throw e}
  const old=this.model,oldAnimation=this.animation;
  this.scene.add(root);
  this.model=root;this.animation=nextController;
  this.orbit=orbit;this.skinProbe=null;this.skinReport=null;
  this.camera.position.copy(center).add(
   new THREE.Vector3(radius*.2,radius*.3,radius*1.9));
  this.camera.near=Math.max(.001,radius/1000);
  this.camera.far=Math.max(10,radius*100);
  this.camera.updateProjectionMatrix();
  this.controls.target.copy(center);this.controls.update();
  oldAnimation?.dispose();
  if(old){this.scene.remove(old);this.release(old)}
  return Object.freeze({status:'WORLD_2_0_SINGLE_RENDERER_COMMITTED',
   objects:root.children.length,clipCount:animationClips.length,
   actualMetricProvenanceStillSourceDependent:true});
 }
 async load(buffer,{orbit=false}={}){
  if(this.reviewBusy)throw Error('TIMELINE_REVIEW_IN_PROGRESS');
  if(this.actionImportBusy)throw Error('ACTION_IMPORT_IN_PROGRESS');
  if(this.movieMode)throw Error('MOVIE_RECORDING_IN_PROGRESS');
  const file=await parseRiggedGLB(buffer),box=new THREE.Box3().setFromObject(file.scene);
  if(box.isEmpty()){
   this.release(file.scene);
   throw Error('GLB_EMPTY_SCENE');
  }
  const size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
  if(![...size,...center].every(Number.isFinite)){
   this.release(file.scene);
   throw Error('GLB_NONFINITE_SCENE');
  }
  const controller=new AnimationController(file.scene,file.animations);if(file.animations.length)controller.select(0);
  // Commit only after new file parses and validates. A corrupted GLB must
  // not clear the existing optimizer or remove the last verified scene.
  if(this.gpu17Enabled)this.setGpuAccelerationEnabled(false);
  if(this.gpu18Instances)this.setStaticInstancingEnabled(false);
  const old=this.model;this.animation?.dispose();this.skinProbe=null;this.skinReport=null;this.model=file.scene;this.animation=controller;this.orbit=orbit;
  this.scene.add(file.scene);if(old){this.scene.remove(old);this.release(old);}
  const radius=Math.max(size.x,size.y,size.z,.01);this.camera.position.copy(center).add(new THREE.Vector3(0,radius*.12,radius*1.7));this.camera.near=radius/1000;this.camera.far=radius*100;this.camera.updateProjectionMatrix();this.controls.target.copy(center);this.controls.update();
  return file.animations.map((c,i)=>({index:i,name:c.name||'片段 '+(i+1),duration:c.duration}));
 }
 async importExternalAction(buffer){
  if(!this.model||!this.animation)throw Error('ACTION_TARGET_MODEL_REQUIRED');
  if(this.animation.story?.playing)throw Error('STORY_PREVIEW_IN_PROGRESS');
  if(this.reviewBusy)throw Error('ACTION_REVIEW_IN_PROGRESS');
  if(this.actionImportBusy)throw Error('ACTION_IMPORT_IN_PROGRESS');
  this.actionImportBusy=true;
  const currentModel=this.model,controller=this.animation;
  let file=null;
  try{
   file=await parseRiggedGLB(buffer);
   if(currentModel!==this.model||controller!==this.animation)throw Error('ACTION_TARGET_CHANGED');
   const result=inspectExternalAction(currentModel,file.scene,file.animations);
   if(controller.clips.length+file.animations.length>32)throw Error('ACTION_CLIP_LIBRARY_LIMIT');
   const copied=copyCompatibleClips(file.animations);
   // Animation only. DO NOT add the source GLB mesh to the displayed heroine.
   // This avoids a second translucent head/skin being rendered over the target.
   const commit=commitCompatibleClips(controller,copied);
   this.skinProbe=null;
   return {...result,status:'COMPATIBLE_CLIP_LOADED_SOURCE_QA_ONLY',
    selectedIndex:commit.selectedIndex,importedNames:copied.map(x=>x.name),
    actionClipImported:commit.committed,originalCharacterMeshModified:false};
  }finally{
   if(file?.scene)this.release(file.scene);
   this.actionImportBusy=false;
  }
 }
 async captureTimelineReview({onProgress=()=>{}}={}){
  if(!this.model)throw Error('TIMELINE_MODEL_NOT_LOADED');
  const clip=this.animation?.clips?.[this.animation?.index];
  if(!clip)throw Error('TIMELINE_REAL_ACTION_MISSING');
  if(this.animation.story?.playing)throw Error('STORY_PREVIEW_IN_PROGRESS');
  if(this.reviewBusy)throw Error('TIMELINE_REVIEW_IN_PROGRESS');
  this.reviewBusy=true;
  const currentModel=this.model;
  const wasPaused=this.animation.paused;
  const previousTime=this.animation.mixer.time;
  const previousProbe=this.skinProbe;
  this.skinProbe=null;this.animation.paused=true;
  const samples=[];
  try{
   for(const fraction of TIMELINE_FRACTIONS){
    if(currentModel!==this.model)throw Error('TIMELINE_SOURCE_CHANGED');
    const result=await this.captureHeroineReview({fraction});
    if(result.clipName!==clip.name)throw Error('TIMELINE_CLIP_CHANGED');
    samples.push({...result,fraction});
    onProgress({capturedPoses:samples.length,targetPoses:4,frames:samples.length*4});
   }
   const collage=await composeTimelineImage(samples,{
    imageDecoder:blob=>createImageBitmap(blob),
    canvasFactory:()=>document.createElement('canvas')
   });
   return {image:collage.image,samples,clipName:clip.name,
    frames:collage.frames,sourceGLBModified:false,hardwareFpsProven:false};
  }finally{
   this.animation.mixer.setTime(previousTime);
   this.animation.paused=wasPaused;
   this.skinProbe=previousProbe;
   this.reviewBusy=false;
  }
 }
 async captureHeroineReview({fraction=.5}={}){
  if(!this.model)throw Error('REVIEW_MODEL_NOT_LOADED');
  if(this.animation?.story?.playing)throw Error('STORY_PREVIEW_IN_PROGRESS');
  const clip=this.animation?.clips?.[this.animation.index]||null;
  const {timeSeconds,animated}=reviewPoseTime(clip,fraction);
  // Camera bounds must come from the selected ACTION POSE, not a stale rest pose.
  let bounds=null;
  const previousCamera={position:this.camera.position.clone(),quaternion:this.camera.quaternion.clone(),
    near:this.camera.near,far:this.camera.far,aspect:this.camera.aspect};
  const previousControls={target:this.controls.target.clone(),enabled:this.controls.enabled,
    damping:this.controls.enableDamping,autoRotate:this.controls.autoRotate};
  const previousPaused=this.animation?.paused;
  const previousTime=this.animation?.mixer?.time||0;
  const size=this.renderer.getSize(new THREE.Vector2());
  const tileW=480,tileH=360,contact=document.createElement('canvas');
  contact.width=tileW*2;contact.height=tileH*2;
  const paint=contact.getContext('2d');
  if(!paint)throw Error('REVIEW_2D_CANVAS_UNAVAILABLE');
  const snapshots=[];
  let audit=null;
  try{
   this.controls.enabled=false;
   this.controls.enableDamping=false;this.controls.autoRotate=false;
   if(this.animation){
    this.animation.paused=true;
    if(animated)this.animation.mixer.setTime(timeSeconds);
   }
   this.model.updateMatrixWorld(true);
   bounds=new THREE.Box3().setFromObject(this.model);
   if(bounds.isEmpty())throw Error('REVIEW_EMPTY_MODEL');
   // Save real posed geometry audit at the specific user-selected animation time.
   audit=inspectSkinPose(this.model,{maxTriangles:2400,maxVertices:12000,maxIssues:24});
   this.renderer.setSize(tileW,tileH,false);
   this.camera.aspect=tileW/tileH;
   this.camera.updateProjectionMatrix();
   for(let i=0;i<REVIEW_DIRECTIONS.length;i++){
    const direction=REVIEW_DIRECTIONS[i];
    const pose=reviewCameraPose(bounds,direction.key);
    this.camera.position.copy(pose.position);
    this.camera.near=pose.near;this.camera.far=pose.far;
    this.controls.target.copy(pose.target);
    this.camera.lookAt(pose.target);this.camera.updateProjectionMatrix();
    this.model.updateMatrixWorld(true);
    this.renderer.render(this.scene,this.camera);
    const x=(i%2)*tileW,y=Math.floor(i/2)*tileH;
    paint.drawImage(this.renderer.domElement,x,y,tileW,tileH);
    paint.fillStyle='rgba(2,4,7,.87)';paint.fillRect(x+6,y+6,tileW-12,28);
    paint.fillStyle='#e5f2fc';paint.font='bold 14px sans-serif';
    paint.fillText(pose.label+' · '+timeSeconds.toFixed(3)+'s',x+14,y+25);
    snapshots.push({key:direction.key,label:pose.label,poseTimeSeconds:timeSeconds});
   }
  }finally{
   this.renderer.setSize(size.x,size.y,false);
   this.camera.position.copy(previousCamera.position);
   this.camera.quaternion.copy(previousCamera.quaternion);
   this.camera.near=previousCamera.near;this.camera.far=previousCamera.far;
   this.camera.aspect=previousCamera.aspect;this.camera.updateProjectionMatrix();
   this.controls.target.copy(previousControls.target);
   this.controls.enabled=previousControls.enabled;
   this.controls.enableDamping=previousControls.damping;
   this.controls.autoRotate=previousControls.autoRotate;
   if(this.animation){this.animation.mixer.setTime(previousTime);this.animation.paused=previousPaused;}
   this.controls.update();
   this.renderer.render(this.scene,this.camera);
  }
  const image=await new Promise((resolve,reject)=>contact.toBlob(b=>b?resolve(b):reject(Error('REVIEW_IMAGE_ENCODING_FAILED')),'image/png'));
  return {image,views:snapshots,audit,clipName:clip?.name||null,timeSeconds,
    originalSourceModified:false,deviceGpuFpsMeasured:false};
 }
 startSkinInspection(onUpdate,{frames=12,minIntervalMs=100}={}){
  if(!this.model)throw Error('SKIN_MODEL_NOT_LOADED');
  const initial=inspectSkinPose(this.model,{maxTriangles:1200,maxVertices:4500,maxIssues:16});
  this.skinReport=initial;
  const probe=new SkinAnomalyMonitor({frames,minIntervalMs,onUpdate:summary=>{
    this.skinReport={...initial,poseSampling:summary};
    onUpdate(this.skinReport);
  }});
  this.skinProbe=probe;
  return initial;
 }
 release(root){
  // Shared GLB nodes frequently reference the same geometry, material and
  // texture. Each GPU resource gets ONE disposal request; the immutable
  // source bytes in the external asset vault are never modified.
  const geometries=new Set(),materials=new Set(),textures=new Set(),skeletons=new Set();
  root.traverse(node=>{
   if(node.isSkinnedMesh&&node.skeleton?.dispose)skeletons.add(node.skeleton);
   if(node.geometry?.isBufferGeometry)geometries.add(node.geometry);
   const mats=Array.isArray(node.material)?node.material:
    node.material?[node.material]:[];
   for(const material of mats)if(material){
    materials.add(material);
    for(const value of Object.values(material))
     if(value?.isTexture)textures.add(value);
   }
  });
  for(const geometry of geometries)geometry.dispose();
  for(const material of materials)material.dispose();
  for(const texture of textures)texture.dispose();
  for(const skeleton of skeletons)skeleton.dispose();
  return Object.freeze({uniqueSkeletonsDisposed:skeletons.size,
   uniqueGeometriesDisposed:geometries.size,
   uniqueMaterialsDisposed:materials.size,
   uniqueTexturesDisposed:textures.size,
   actualVRAMFreedBytesUnmeasured:true,
   persistentSourceAssetsPreserved:true});
 }
}
