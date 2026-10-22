import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {prepareAIG18StaticInstancing,activateAIG18StaticInstancing}
 from '../aig-static-instancing-1-8.mjs';

const staticScene=(n=8)=>{
 const root=new THREE.Group();root.name='Stage';
 const geometry=new THREE.BoxGeometry(1,.4,1);
 const material=new THREE.MeshStandardMaterial({color:0x00bbdd});
 for(let i=0;i<n;i++){
  const m=new THREE.Mesh(geometry,material);
  m.name='tree-static-'+i;m.position.set(i*2,0,-i);
  root.add(m);
 }
 return {root,geometry,material};
};
test('1.8 implements real InstancedMesh batching without touching original mesh bytes',()=>{
 const {root,geometry,material}=staticScene();
 const before=Array.from(geometry.attributes.position.array);
 const plan=prepareAIG18StaticInstancing(root,[]);
 assert.equal(plan.nodeCountInspected,9);
 assert.equal(plan.groupedStaticMeshes,8);
 assert.equal(plan.instanceDrawGroups,1);
 assert.equal(plan.theoreticalDrawCallsSaved,7);
 const active=activateAIG18StaticInstancing(plan);
 const inst=root.children.find(x=>x.isInstancedMesh);
 assert.ok(inst);assert.equal(inst.count,8);
 assert.equal(root.children.filter(x=>x.isMesh&&!x.isInstancedMesh&&x.visible).length,0);
 const world=new THREE.Matrix4(),translation=new THREE.Vector3();
 inst.getMatrixAt(5,world);translation.setFromMatrixPosition(world);
 assert.deepEqual(translation.toArray(),[10,0,-5]);
 assert.deepEqual(Array.from(geometry.attributes.position.array),before);
 assert.equal(active.report().geometriesDisposedByOptimizer,false);
 assert.equal(active.restore(),true);assert.equal(active.restore(),false);
 assert.equal(root.children.filter(x=>x.isMesh&&x.visible).length,8);
 assert.equal(root.children.includes(inst),false);
 assert.deepEqual(Array.from(geometry.attributes.position.array),before);
 geometry.dispose();material.dispose();
});
test('1.8 refuses any animated mesh or ancestor, including explicitly tagged static meshes',()=>{
 const {root,geometry,material}=staticScene(5);
 const child=root.children[0];child.userData.aigStaticInstanceSafe=true;
 const clip=new THREE.AnimationClip('SceneMove',2,[
  new THREE.VectorKeyframeTrack('Stage.position',[0,2],[0,0,0,1,0,0])
 ]);
 const plan=prepareAIG18StaticInstancing(root,[clip]);
 assert.equal(plan.groupedStaticMeshes,0);
 assert.equal(plan.instanceDrawGroups,0);
 assert.equal(root.children.filter(x=>x.visible).length,5);
 geometry.dispose();material.dispose();
});
test('1.8 only static-author-tagged environment meshes can batch near animated character',()=>{
 const {root,geometry,material}=staticScene(6);
 const animatedHero=new THREE.Mesh(new THREE.BoxGeometry(1,2,1),new THREE.MeshStandardMaterial());
 animatedHero.name='Hero';root.add(animatedHero);
 for(const mesh of root.children)if(mesh!==animatedHero)mesh.userData.aigStaticInstanceSafe=true;
 const clip=new THREE.AnimationClip('Walk',2,[
  new THREE.VectorKeyframeTrack('Hero.position',[0,2],[0,0,0,0,1,0])
 ]);
 const planned=prepareAIG18StaticInstancing(root,[clip]);
 assert.equal(planned.groupedStaticMeshes,6);
 const active=activateAIG18StaticInstancing(planned);
 assert.equal(animatedHero.visible,true);
 assert.equal(animatedHero.position.y,0);
 assert.equal(root.children.find(x=>x.isInstancedMesh).count,6);
 active.restore();
 geometry.dispose();material.dispose();
 animatedHero.geometry.dispose();animatedHero.material.dispose();
});
test('1.8 morph, skinned, animated singletons and transparent/material-shader meshes never batch',()=>{
 const {root,geometry,material}=staticScene(3);
 for(const n of root.children)n.material=new THREE.MeshStandardMaterial({transparent:true,opacity:.5});
 assert.equal(prepareAIG18StaticInstancing(root,[]).instanceDrawGroups,0);
 const skinned=new THREE.SkinnedMesh(geometry,material);
 const skinned2=new THREE.SkinnedMesh(geometry,material);
 const skinned3=new THREE.SkinnedMesh(geometry,material);
 root.add(skinned,skinned2,skinned3);
 assert.equal(prepareAIG18StaticInstancing(root,[]).instanceDrawGroups,0);
 geometry.dispose();material.dispose();
});
test('1.8 leaves GLB source untouched on invalid policy and disallowed animation paths',()=>{
 const {root}=staticScene();
 assert.throws(()=>prepareAIG18StaticInstancing(root,[],{maxInstancesPerGroup:0}),/OPTIONS_INVALID/);
 const clip=new THREE.AnimationClip('ambiguous',1,[{
  name:'invalid/slash/Node.rotation',times:[0],values:[0,0,0,1]
 }]);
 assert.throws(()=>prepareAIG18StaticInstancing(root,[clip]),/AMBIGUOUS_ANIMATION_TRACK/);
 assert.equal(root.children.length,8);
});
