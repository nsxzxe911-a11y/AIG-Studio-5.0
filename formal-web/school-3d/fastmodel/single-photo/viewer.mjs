import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {inspectSkinPose,SkinAnomalyMonitor} from './skin-anomaly.mjs';

export async function parseRiggedGLB(buffer){
 if(!(buffer instanceof ArrayBuffer)||buffer.byteLength>200*1024*1024)throw Error('GLB_SIZE_LIMIT');
 return new GLTFLoader().parseAsync(buffer,'');
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
