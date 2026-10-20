import test from 'node:test';
import assert from 'node:assert/strict';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {buildPhotoSurface,photoMotion} from '../photo-surface.mjs';
import * as THREE from 'three';
import {parseRiggedGLB,AnimationController} from '../viewer.mjs';

test('photo GLB round trip retains real mesh and quaternion animation, including pause',async()=>{
 globalThis.FileReader=class{readAsArrayBuffer(blob){blob.arrayBuffer().then(value=>{this.result=value;this.onloadend?.();});}};
 const mesh=new THREE.Mesh(buildPhotoSurface(new Uint8Array(16).fill(128),2,2,1),new THREE.MeshBasicMaterial());mesh.name='PhotoSurface';
 const scene=new THREE.Scene();scene.add(mesh);
 const bytes=await new GLTFExporter().parseAsync(scene,{binary:true,animations:[photoMotion()]});
 const file=await parseRiggedGLB(bytes);assert.equal(file.animations.length,1);
 const target=file.scene.getObjectByName('PhotoSurface');assert.ok(target.isMesh);assert.equal(target.geometry.attributes.position.count,4);
 const controller=new AnimationController(file.scene,file.animations);controller.select(0);controller.update(1);assert.ok(target.quaternion.y>.05);
 controller.paused=true;const before=target.quaternion.y;controller.update(.2);assert.equal(target.quaternion.y,before);
 assert.throws(()=>controller.select(99),/CLIP_INDEX/);assert.equal(controller.index,0);
});
test('selected actions apply rotation scale and morph tracks without implicit clip mixing',()=>{
 const root=new THREE.Group(),mesh=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial());mesh.name='subject';mesh.geometry.morphAttributes.position=[mesh.geometry.attributes.position.clone()];mesh.updateMorphTargets();root.add(mesh);
 const clip=new THREE.AnimationClip('all channels',1,[new THREE.VectorKeyframeTrack('subject.position',[0,1],[0,0,0,0,2,0]),new THREE.VectorKeyframeTrack('subject.scale',[0,1],[1,1,1,2,2,2]),new THREE.QuaternionKeyframeTrack('subject.quaternion',[0,1],[0,0,0,1,0,0,1,0]),new THREE.NumberKeyframeTrack('subject.morphTargetInfluences[0]',[0,1],[0,1])]);
 const alternate=new THREE.AnimationClip('alternate',1,[new THREE.VectorKeyframeTrack('subject.position',[0,1],[0,0,0,0,0,0])]);
 const c=new AnimationController(root,[clip,alternate]);c.select(0);c.update(.5);
 assert.equal(mesh.position.y,1);assert.equal(mesh.scale.x,1.5);assert.ok(mesh.quaternion.z>.6);assert.equal(mesh.morphTargetInfluences[0],.5);
 c.select(1);c.update(.5);assert.equal(mesh.position.y,0);assert.equal(mesh.scale.x,1);assert.equal(mesh.morphTargetInfluences[0],0);
});
