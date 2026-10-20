import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRig,jointPositions,poseUniforms,limbField,Aig43RigController,Aig43PatchCache,
 makeLimbPatch,AIG43_PARTS} from '../aig-hybrid-4-3.mjs';
import {createImplicitScene,AigImplicitRenderer} from '../aig-sdf-4-1.mjs';
const scaffold={
 schema:'AIG_FASTMODEL_NATIVE_4_0_GEOMETRIC_VOLUME_DRAFT',
 sourceSHA256:'8'.repeat(64),proportions:{
 ratiosByImageHeight:Array.from({length:11},(_,i)=>({atHeight:i/10,
 widthRatio:[.18,.22,.28,.32,.30,.28,.33,.42,.30,.13,.1][i],
 centerRatio:.5}))}
};
test('rig source pinned and all body proportions labeled unverified',()=>{
 const rig=createRig(scaffold);
 assert.equal(rig.sourceSHA256,scaffold.sourceSHA256);
 assert.equal(rig.metadata.inferredUnknownAnatomy,true);
 assert.equal(rig.metadata.sourceLandmarksVerified,false);
 assert.equal(rig.metadata.photorealHeroineApproved,false);
 assert.equal(rig.metadata.realSkinWeightsPresent,false);
 assert.equal(rig.metadata.noCreditsSpent,true);
 assert.equal(rig.metadata.releaseAllowed,false);
 assert.throws(()=>createRig({...scaffold,sourceSHA256:'invalid'}),/SCAFFOLD_REQUIRED/);
 assert.throws(()=>createRig({...scaffold,
  proportions:{ratiosByImageHeight:[...scaffold.proportions.ratiosByImageHeight.slice(0,10),
  {widthRatio:Infinity}]}}),/BAD_PROPORTIONS/);
});
test('editable bounded limb pose and elbow/knee endpoints are continuous capsule geometry',()=>{
 const ctrl=new Aig43RigController(createRig(scaffold));
 assert.deepEqual(Object.keys(jointPositions(ctrl.rig)).sort(),[...AIG43_PARTS].sort());
 assert.equal(ctrl.setAngle('leftArm',30).changed,true);
 assert.equal(ctrl.setAngle('leftArm',30).changed,false);
 assert.equal(ctrl.partRevisions.leftArm,1);
 assert.equal(ctrl.partRevisions.rightArm,0);
 const p=jointPositions(ctrl.rig).leftArm;
 assert.ok(limbField(p.pivot,ctrl.rig,'leftArm')<0,'joint should be filled');
 const uniforms=poseUniforms(ctrl.rig);
 assert.equal(uniforms.arms.length,12);
 assert.equal(uniforms.legs.length,12);
 assert.ok(uniforms.arms.every(Number.isFinite));
 assert.ok(uniforms.legs.every(Number.isFinite));
 assert.throws(()=>ctrl.setAngle('rightLeg',80),/JOINT_LIMIT/);
 assert.throws(()=>ctrl.setAngle('leftLeg',NaN),/JOINT_LIMIT/);
 assert.throws(()=>ctrl.setAngle('head',0),/JOINT_LIMIT/);
 ctrl.reset('leftArm');assert.equal(ctrl.rig.angles.leftArm,0);
});
test('part cache only regenerates changed limb; unrelated mesh still same reference',()=>{
 const ctrl=new Aig43RigController(createRig(scaffold)),cache=new Aig43PatchCache();
 const first=Object.fromEntries(AIG43_PARTS.map(part=>[part,cache.get(ctrl,part).mesh]));
 for(const [part,mesh] of Object.entries(first)){
  assert.ok(mesh.vertices.length>20);
  assert.ok(mesh.indices.length>15);
  assert.equal(mesh.isTechnicalPatch,true);
  assert.equal(mesh.skinned,false);
  assert.equal(mesh.photorealApproved,false);
  assert.equal(cache.get(ctrl,part).mesh,mesh);
 }
 assert.equal(cache.report().hits,4);
 ctrl.setAngle('rightArm',20);
 assert.notEqual(cache.get(ctrl,'rightArm').mesh,first.rightArm);
 for(const other of ['leftArm','leftLeg','rightLeg']){
  const result=cache.get(ctrl,other);
  assert.equal(result.cacheHit,true);
  assert.equal(result.mesh,first[other]);
 }
 assert.equal(cache.report().entries,4);
 assert.equal(cache.report().misses,5);
 const ctrlOther=new Aig43RigController(createRig({...scaffold,sourceSHA256:'9'.repeat(64)}));
 cache.get(ctrlOther,'leftArm');
 assert.equal(cache.report().entries,1);
 assert.equal(cache.report().sourceSHA256,'9'.repeat(64));
 cache.invalidateAll();assert.equal(cache.report().entries,0);
});
test('GPU draws move limbs by uniforms, not glBuffer upload or shader rebuild',()=>{
 const calls=[];
 const gl={
  VERTEX_SHADER:1,FRAGMENT_SHADER:2,COMPILE_STATUS:3,LINK_STATUS:4,
  ARRAY_BUFFER:5,STATIC_DRAW:6,FLOAT:7,TRIANGLE_STRIP:8,
  createShader:()=>({}),shaderSource:()=>{},compileShader:()=>{},
  getShaderParameter:()=>true,getShaderInfoLog:()=>'',deleteShader:()=>{},
  createProgram:()=>({}),attachShader:()=>{},linkProgram:()=>{},
  getProgramParameter:()=>true,getProgramInfoLog:()=>'',createBuffer:()=>{calls.push('buffer');return {};},
  bindBuffer:()=>{},bufferData:()=>calls.push('upload'),
  getAttribLocation:()=>0,getUniformLocation:(p,name)=>name,
  viewport:()=>{},useProgram:()=>{},enableVertexAttribArray:()=>{},
  vertexAttribPointer:()=>{},uniform2f:()=>{},uniform1f:()=>{},
  uniform4f:()=>{},uniform3fv:(name,array)=>calls.push({name,vals:Array.from(array)}),
  drawArrays:()=>calls.push('draw'),deleteBuffer:()=>{},deleteProgram:()=>{}
 };
 const canvas={clientWidth:640,clientHeight:400,width:0,height:0,
  getContext:name=>name==='webgl2'?gl:null};
 const renderer=new AigImplicitRenderer(canvas,createImplicitScene(scaffold));
 const ctrl=new Aig43RigController(createRig(scaffold));
 renderer.setRigPose(poseUniforms(ctrl.rig));renderer.draw(0);
 const original=calls.filter(x=>typeof x==='object'&&x.name==='uArmJoints[0]').at(-1).vals;
 ctrl.setAngle('leftArm',30);
 renderer.setRigPose(poseUniforms(ctrl.rig));
 renderer.draw(Math.PI/4);
 const moved=calls.filter(x=>typeof x==='object'&&x.name==='uArmJoints[0]').at(-1).vals;
 assert.notDeepEqual(moved,original);
 assert.equal(calls.filter(x=>x==='buffer').length,1);
 assert.equal(calls.filter(x=>x==='upload').length,1);
 assert.equal(calls.filter(x=>x==='draw').length,2);
 assert.throws(()=>renderer.setRigPose({arms:new Float32Array(2),legs:new Float32Array(12)}),
  /RIG_POSE_INVALID/);
 renderer.dispose();
});
test('UI has connected part callbacks and no third-party fallback',()=>{
 const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
 const html=read('../index.html'),app=read('../app.mjs'),
  lib=read('../aig-hybrid-4-3.mjs');
 for(const id of ['aig43-part','aig43-angle','aig43-reset','aig43-cache'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(app,/new Aig43RigController/);
 assert.match(app,/new Aig43PatchCache/);
 assert.match(app,/setRigPose\(poseUniforms\(aig43Controller\.rig\)\)/);
 assert.match(app,/aig43-angle'\)\.addEventListener\('input'/);
 assert.match(app,/aig43Cache\?\.invalidateAll\(\)/);
 assert.doesNotMatch(lib,/MeshyClient|StableFast3D|fetch\(|subprocess\.run/);
});
