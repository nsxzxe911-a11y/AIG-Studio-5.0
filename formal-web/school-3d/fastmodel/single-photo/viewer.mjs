import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';

export async function parseRiggedGLB(buffer){
 if(!(buffer instanceof ArrayBuffer)||buffer.byteLength>200*1024*1024)throw Error('GLB_SIZE_LIMIT');
 const data=new DataView(buffer);
 if(buffer.byteLength<20||data.getUint32(0,true)!==0x46546c67||data.getUint32(4,true)!==2||data.getUint32(8,true)!==buffer.byteLength||data.getUint32(16,true)!==0x4e4f534a)throw Error('GLB_HEADER_INVALID');
 const jsonLength=data.getUint32(12,true);if(jsonLength>buffer.byteLength-20)throw Error('GLB_JSON_INVALID');
 const json=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,20,jsonLength)));
 for(const asset of [...(json.buffers||[]),...(json.images||[])])if(asset.uri&&!/^data:/.test(asset.uri))throw Error('GLB_EXTERNAL_ASSETS_NOT_ALLOWED');
 const manager=new THREE.LoadingManager();manager.setURLModifier(url=>{if(!/^(blob:|data:)/.test(url))throw Error('GLB_EXTERNAL_ASSETS_NOT_ALLOWED');return url;});
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
  this.resize=new ResizeObserver(()=>this.fitCanvas());this.resize.observe(canvas.parentElement);this.fitCanvas();this.previous=0;this.orbit=false;
  this.renderer.setAnimationLoop(t=>{try{const dt=this.previous?Math.min(.1,(t-this.previous)/1000):0;this.previous=t;this.animation?.update(dt);this.controls.autoRotate=this.orbit;this.controls.update();this.renderer.render(this.scene,this.camera);}catch(e){this.renderer.setAnimationLoop(null);onError(e.message);}});
 }
 fitCanvas(){const r=this.canvas.parentElement.getBoundingClientRect();this.renderer.setSize(Math.max(1,r.width),Math.max(1,r.height),false);this.camera.aspect=Math.max(1,r.width)/Math.max(1,r.height);this.camera.updateProjectionMatrix();}
 async load(buffer,{orbit=false}={}){
  const file=await parseRiggedGLB(buffer),box=new THREE.Box3().setFromObject(file.scene);
  if(box.isEmpty())throw Error('GLB_EMPTY_SCENE');
  const size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
  if(![...size,...center].every(Number.isFinite))throw Error('GLB_NONFINITE_SCENE');
  const controller=new AnimationController(file.scene,file.animations);if(file.animations.length)controller.select(0);
  const old=this.model;this.animation?.dispose();this.model=file.scene;this.animation=controller;this.orbit=orbit;
  this.scene.add(file.scene);if(old){this.scene.remove(old);this.release(old);}
  const radius=Math.max(size.x,size.y,size.z,.01);this.camera.position.copy(center).add(new THREE.Vector3(0,radius*.12,radius*1.7));this.camera.near=radius/1000;this.camera.far=radius*100;this.camera.updateProjectionMatrix();this.controls.target.copy(center);this.controls.update();
  return file.animations.map((c,i)=>({index:i,name:c.name||'片段 '+(i+1),duration:c.duration}));
 }
 release(root){const textures=new Set();root.traverse(n=>{n.geometry?.dispose();for(const m of (Array.isArray(n.material)?n.material:[n.material]))if(m){for(const value of Object.values(m))if(value?.isTexture)textures.add(value);m.dispose();}});textures.forEach(t=>t.dispose());}
}
