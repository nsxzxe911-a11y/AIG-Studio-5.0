import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {inspectSkinPose,SkinAnomalyMonitor,SKIN_AUDIT_VERSION} from '../skin-anomaly.mjs';
const tri=()=>new THREE.BufferGeometry().setFromPoints([
 new THREE.Vector3(-.5,-.5,0),new THREE.Vector3(.5,-.5,0),new THREE.Vector3(0,.5,0)]);
function mesh(name,geom=tri()){const m=new THREE.Mesh(geom,new THREE.MeshStandardMaterial());m.name=name;return m;}
test('normal single full-color mesh does not trigger ghost twin triangle warning',()=>{
 const scene=new THREE.Group(),m=mesh('hero');scene.add(m);
 const before=Array.from(m.geometry.attributes.position.array);
 const r=inspectSkinPose(scene);
 assert.equal(r.version,SKIN_AUDIT_VERSION);
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.equal(r.checkedTriangles,1);assert.equal(r.coincidentTrianglePairs,0);
 assert.equal(r.skinnedMeshes,0);
 assert.equal(r.anatomyTagsAvailable,false);
 assert.equal(r.hairNeckBoxOverlap,null);
 assert.equal(r.exactMeshPenetrationTested,false);
 assert.equal(r.originalGLBModified,false);
 assert.deepEqual([...m.geometry.attributes.position.array],before);
});
test('two overlapping skins are detected as potential double face and z-fighting, never automatically welded',()=>{
 const scene=new THREE.Group(),a=mesh('skin-A'),b=mesh('skin-B');
 scene.add(a,b);
 const r=inspectSkinPose(scene);
 assert.equal(r.checkedTriangles,2);
 assert.equal(r.coincidentTrianglePairs,1);
 assert.equal(r.overlappingMeshPairs,1);
 assert.ok(r.issues.some(x=>x.type==='COINCIDENT_TRIANGLE'));
 assert.equal(r.realGPUZFightPixelsVerified,false);
 assert.equal(r.animatedPoseProvenClean,false);
 // Move one mesh out of the overlap: real-world transformed positions matter.
 b.position.z=.025;
 const fresh=inspectSkinPose(scene);
 assert.equal(fresh.coincidentTrianglePairs,0);
});
test('skinned mesh with invalid influence weights is flagged before claiming valid skin',()=>{
 const g=tri();
 g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute([0,0,0,0,0,0,0,0,0,0,0,0],4));
 g.setAttribute('skinWeight',new THREE.Float32BufferAttribute([.4,.4,0,0,.4,.4,0,0,.4,.4,0,0],4));
 const skin=new THREE.SkinnedMesh(g,new THREE.MeshStandardMaterial());
 skin.name='skinned-hero';
 const bone=new THREE.Bone(),root=new THREE.Group();skin.add(bone);
 skin.bind(new THREE.Skeleton([bone]));root.add(skin);
 const r=inspectSkinPose(root);
 assert.equal(r.skinnedMeshes,1);
 assert.ok(r.skinningVertexIssues>0);
 assert.ok(r.issues.some(x=>x.type==='SKIN_WEIGHTS_INVALID'));
 assert.equal(r.originalGLBModified,false);
});
test('explicit hair/neck roles create AABB overlap risk, not actual triangle penetration PASS or FAIL',()=>{
 const root=new THREE.Group(),hair=mesh('hair'),neck=mesh('neck');
 hair.userData.aigAnatomyPart='hair';
 neck.userData.aigAnatomyPart='neck';
 root.add(hair,neck);
 let r=inspectSkinPose(root);
 assert.equal(r.anatomyTagsAvailable,true);
 assert.equal(r.hairNeckBoxOverlap,true);
 assert.equal(r.exactMeshPenetrationTested,false);
 neck.position.x=3;
 r=inspectSkinPose(root);
 assert.equal(r.hairNeckBoxOverlap,false);
});
test('degenerate triangles, transparent depthWrite and test budgets are bounded',()=>{
 const root=new THREE.Group(),collapsed=mesh('collapsed',new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(0,0,0),new THREE.Vector3(0,0,0),new THREE.Vector3(.5,0,0)]));
 collapsed.material.transparent=true;collapsed.material.depthWrite=true;root.add(collapsed);
 const r=inspectSkinPose(root,{maxTriangles:1,maxVertices:3,maxIssues:2});
 assert.equal(r.degenerateTriangles,1);
 assert.ok(r.issues.some(i=>i.type==='TRANSPARENT_DEPTH_WRITE'));
 assert.equal(r.checkedTriangles,1);
 assert.throws(()=>inspectSkinPose(root,{maxTriangles:200000}),/SKIN_AUDIT_BUDGET_INVALID/);
 assert.throws(()=>inspectSkinPose(null),/SKIN_ROOT_REQUIRED/);
});
test('pose monitor reads real scene every bounded sample, highlights suspect frames without changing model',()=>{
 const root=new THREE.Group(),a=mesh('a'),b=mesh('b');root.add(a,b);
 let observed=0;
 const m=new SkinAnomalyMonitor({frames:3,minIntervalMs:50,onUpdate:()=>observed++});
 let s=m.capture(root,100,{animationName:'fight'});
 assert.equal(s.sampledFrames,1);assert.deepEqual(s.possibleOverlapFrames,[0]);
 assert.equal(m.capture(root,120),null);
 b.position.z=.3;
 s=m.capture(root,160,{animationName:'fight'});
 assert.deepEqual(s.possibleOverlapFrames,[0]);
 b.position.z=0;
 s=m.capture(root,230,{animationName:'fight'});
 assert.equal(s.status,'SAMPLED_POSES_REVIEW_REQUIRED');
 assert.deepEqual(s.possibleOverlapFrames,[0,2]);
 assert.equal(s.actualCollisionFreeProven,false);
 assert.equal(observed,3);assert.equal(m.done,true);
 assert.equal(m.capture(root,400),null);
});
test('2.8 viewer and UI have real audit callback, animation sampling and downloadable JSON',()=>{
 const root=new URL('../',import.meta.url),get=n=>fs.readFileSync(new URL(n,root),'utf8');
 const index=get('index.html'),app=get('app.mjs'),viewer=get('viewer.mjs');
 assert.ok(index.includes('id="skin-check"'));
 assert.ok(index.includes('id="skin-check-status"'));
 assert.ok(index.includes('id="skin-check-downloads"'));
 assert.ok(app.includes("view.startSkinInspection("));
 assert.ok(viewer.includes("this.skinProbe.capture(this.model,t"));
 assert.ok(app.includes("new Blob([JSON.stringify(r,null,2)]"));
 assert.ok(app.includes("URL.revokeObjectURL(skinReportUrl)"));
 assert.ok(app.includes('actualCollisionFreeProven')===false); // no misleading UI status
});
