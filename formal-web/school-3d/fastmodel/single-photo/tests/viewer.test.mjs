import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import * as THREE from 'three';
import {parseRiggedGLB,AnimationController} from '../viewer.mjs';

test('real GLTFLoader imports synthetic binary skinned geometry and AnimationMixer moves exported translation',async()=>{
 const p=spawnSync('python',['-c',"import sys;sys.path.insert(0,'tests');from test_pipeline import fixture_glb;sys.stdout.buffer.write(fixture_glb())"],{cwd:new URL('..',import.meta.url)});
 assert.equal(p.status,0,p.stderr?.toString());
 const bytes=p.stdout;const file=await parseRiggedGLB(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
 let skinned=0;file.scene.traverse(n=>{if(n.isSkinnedMesh)skinned++;});
 assert.equal(skinned,1);assert.equal(file.animations.length,1);
 const controller=new AnimationController(file.scene,file.animations);controller.select(0);
 const target=file.scene.children[1];controller.update(.5);assert.ok(target.position.y>.2);
 controller.paused=true;const before=target.position.y;controller.update(.2);assert.equal(target.position.y,before);
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
