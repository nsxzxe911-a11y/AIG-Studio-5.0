import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {inspectSkinPose,SkinAnomalyMonitor} from './skin-anomaly.mjs';
import {REVIEW_DIRECTIONS,reviewCameraPose,reviewPoseTime} from './heroine-review.mjs';
import {TIMELINE_FRACTIONS,composeTimelineImage} from './timeline-review.mjs';
import {inspectExternalAction,copyCompatibleClips} from './action-compatibility.mjs';

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
 constructor(root,clips=[]){this.mixer=new THREE.AnimationMixer(root);this.clips=clips;this.index=null;this.paused=false;}
 select(index){
  if(!Number.isInteger(index)||!this.clips[index])throw Error('CLIP_INDEX');
  this.mixer.stopAllAction();this.index=index;
  this.mixer.clipAction(this.clips[index]).reset().play();
 }
 update(seconds){if(!this.paused)this.mixer.update(Math.max(0,seconds));}
 dispose(){this.mixer.stopAllAction();this.mixer.uncacheRoot(this.mixer.getRoot());}
}
export class PhotoViewer{
 constructor(canvas,onError){
  this.canvas=canvas;this.onError=onError;this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});
  this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1;
  this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#020407');
  this.camera=new THREE.PerspectiveCamera(40,1,.01,1000);this.camera.position.set(0,1,3);
  this.controls=new OrbitControls(this.camera,canvas);this.controls.enableDamping=true;
  this.scene.add(new THREE.HemisphereLight(0xcdeaff,0x242035,1.5));
  const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(2,4,3);this.scene.add(light);
  const pmrem=new THREE.PMREMGenerator(this.renderer),room=new RoomEnvironment();this.env=pmrem.fromScene(room).texture;this.scene.environment=this.env;room.dispose();pmrem.dispose();
  this.resize=new ResizeObserver(()=>this.fitCanvas());this.resize.observe(canvas.parentElement);this.fitCanvas();this.previous=0;this.orbit=false;this.skinProbe=null;this.skinReport=null;
  this.renderer.setAnimationLoop(t=>{try{const dt=this.previous?Math.min(.1,(t-this.previous)/1000):0;this.previous=t;this.animation?.update(dt);
    if(this.skinProbe&&this.model){this.skinProbe.capture(this.model,t,{animationName:this.animation?.clips?.[this.animation?.index]?.name||null});if(this.skinProbe.done)this.skinProbe=null;}
    this.controls.autoRotate=this.orbit;this.controls.update();this.renderer.render(this.scene,this.camera);}catch(e){this.renderer.setAnimationLoop(null);onError(e.message);}});
 }
 fitCanvas(){const r=this.canvas.parentElement.getBoundingClientRect();this.renderer.setSize(Math.max(1,r.width),Math.max(1,r.height),false);this.camera.aspect=Math.max(1,r.width)/Math.max(1,r.height);this.camera.updateProjectionMatrix();}
 async load(buffer,{orbit=false}={}){
  if(this.reviewBusy)throw Error('TIMELINE_REVIEW_IN_PROGRESS');
  if(this.actionImportBusy)throw Error('ACTION_IMPORT_IN_PROGRESS');
  const file=await parseRiggedGLB(buffer),box=new THREE.Box3().setFromObject(file.scene);
  if(box.isEmpty())throw Error('GLB_EMPTY_SCENE');
  const size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
  if(![...size,...center].every(Number.isFinite))throw Error('GLB_NONFINITE_SCENE');
  const controller=new AnimationController(file.scene,file.animations);if(file.animations.length)controller.select(0);
  const old=this.model;this.animation?.dispose();this.skinProbe=null;this.skinReport=null;this.model=file.scene;this.animation=controller;this.orbit=orbit;
  this.scene.add(file.scene);if(old){this.scene.remove(old);this.release(old);}
  const radius=Math.max(size.x,size.y,size.z,.01);this.camera.position.copy(center).add(new THREE.Vector3(0,radius*.12,radius*1.7));this.camera.near=radius/1000;this.camera.far=radius*100;this.camera.updateProjectionMatrix();this.controls.target.copy(center);this.controls.update();
  return file.animations.map((c,i)=>({index:i,name:c.name||'片段 '+(i+1),duration:c.duration}));
 }
 async importExternalAction(buffer){
  if(!this.model||!this.animation)throw Error('ACTION_TARGET_MODEL_REQUIRED');
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
   const firstIndex=controller.clips.length;
   controller.clips.push(...copied);
   controller.select(firstIndex);
   this.skinProbe=null;
   return {...result,status:'COMPATIBLE_CLIP_LOADED_SOURCE_QA_ONLY',
    selectedIndex:firstIndex,importedNames:copied.map(x=>x.name),
    actionClipImported:true,originalCharacterMeshModified:false};
  }finally{
   if(file?.scene)this.release(file.scene);
   this.actionImportBusy=false;
  }
 }
 async captureTimelineReview({onProgress=()=>{}}={}){
  if(!this.model)throw Error('TIMELINE_MODEL_NOT_LOADED');
  const clip=this.animation?.clips?.[this.animation?.index];
  if(!clip)throw Error('TIMELINE_REAL_ACTION_MISSING');
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
 release(root){const textures=new Set();root.traverse(n=>{n.geometry?.dispose();for(const m of (Array.isArray(n.material)?n.material:[n.material]))if(m){for(const value of Object.values(m))if(value?.isTexture)textures.add(value);m.dispose();}});textures.forEach(t=>t.dispose());}
}
