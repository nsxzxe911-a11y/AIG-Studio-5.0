import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {generateAIG55NativeHumanoid,AIG55_BONES,AIG55_SCHEMA} from '../aig-native-humanoid-5-5.mjs';
import {auditAIG50FullBody} from '../aig-fullbody-5-0.mjs';
import {auditAIG51PosedSeamsAndHair} from '../aig-seam-contact-5-1.mjs';
const source='a'.repeat(64);
const scaffold=()=>({
 sourceSHA256:source,meshType:'CLOSED_ELLIPTICAL_SECTION_VOLUME',
 autoRiggingAvailable:false,unseenSurfacesInferred:true,releaseAllowed:false,
 sideSourceSHA256:null,
 proportions:{widthHeightRatio:.48,ratiosByImageHeight:Array.from({length:11},(_,i)=>({
  atHeight:i/10,widthRatio:.25,centerRatio:.5,source:'OBSERVED_FRONT_SILHOUETTE'
 }))}});
const digest=x=>createHash('sha256').update(x).digest('hex');
test('5.5 native generator builds genuine GLB 2.0 with skinned articulated anatomy, 17 bones, four clips',async()=>{
 const result=generateAIG55NativeHumanoid(scaffold());
 assert.equal(result.schema,AIG55_SCHEMA);
 assert.equal(result.boneCount,17);
 assert.equal(AIG55_BONES.length,17);
 assert.equal(result.animationClipNames.length,4);
 assert.ok(result.bytes.byteLength>1000);
 assert.ok(result.bytes.byteLength<4*1024*1024);
 assert.equal(Buffer.from(result.bytes.subarray(0,4)).toString(),'glTF');
 const parsed=await new GLTFLoader().parseAsync(result.bytes.buffer,'');
 const skinned=[];parsed.scene.traverse(n=>{if(n.isSkinnedMesh)skinned.push(n);});
 assert.equal(skinned.length,2);
 assert.equal(parsed.animations.length,4);
 assert.ok(skinned.some(n=>n.name.includes('FULLBODY')));
 assert.ok(skinned.some(n=>n.name.includes('Ponytail')));
 for(const mesh of skinned){
  assert.ok(mesh.skeleton.bones.length===17);
  const g=mesh.geometry;
  assert.ok(g.index.count/3>10);
  for(const att of ['position','skinIndex','skinWeight'])assert.ok(g.hasAttribute(att));
 }
 assert.equal(result.photoReconstructedTrue3d,false);
 assert.equal(result.originalHeroineFaceTexturePresent,false);
 assert.equal(result.formalHeroineApproved,false);
 assert.equal(result.releaseAllowed,false);
});
test('5.5 real GLTFLoader skin feeds original 5.0 true fullbody structural QA',async()=>{
 const result=generateAIG55NativeHumanoid(scaffold());
 const parsed=await new GLTFLoader().parseAsync(result.bytes.buffer,'');
 const report=await auditAIG50FullBody(parsed,{sourceSHA256:digest(result.bytes)});
 assert.equal(report.schema,'AIG_FASTMODEL_5_0_FULLBODY_SHOULDER_NECK_QA_DRAFT');
 assert.equal(report.sourceSHA256,digest(result.bytes));
 assert.equal(report.outcome,'STRUCTURAL_QA_PASS_ONLY',JSON.stringify({
  missing:report.missingBones,weights:report.rolesWithoutActualVertexWeights,
  topology:report.hierarchyProblems,bridged:report.shoulderNeckHeadActualSharedIndexedComponent,
  motion:report.poseReports
 }));
 assert.equal(report.missingBones.length,0);
 assert.equal(report.animationHasRealSkinnedVertexMotion,true);
 assert.equal(report.shoulderNeckHeadActualSharedIndexedComponent,true);
 assert.equal(report.releaseAllowed,false);
});
test('5.5 source inputs are bounded and missing native validated silhouette is never invented',()=>{
 const variants=[
  s=>{s.sourceSHA256='wrong';},
  s=>{s.meshType='PRETEND_REAL_HEROINE';},
  s=>{s.autoRiggingAvailable=true;},
  s=>{s.releaseAllowed=true;},
  s=>{s.proportions.widthHeightRatio=Infinity;},
  s=>{s.proportions.ratiosByImageHeight=[];}
 ];
 for(const bad of variants){
  const s=scaffold();bad(s);
  assert.throws(()=>generateAIG55NativeHumanoid(s),/AIG55_/);
 }
 const one=generateAIG55NativeHumanoid(scaffold());
 const two=generateAIG55NativeHumanoid(scaffold());
 assert.equal(digest(one.bytes),digest(two.bytes));
});
test('5.5 finite-pose real hair and shoulder test remains independent and cannot grant full release',async()=>{
 const result=generateAIG55NativeHumanoid(scaffold());
 const parsed=await new GLTFLoader().parseAsync(result.bytes.buffer,'');
 const sha=digest(result.bytes);
 const v50=await auditAIG50FullBody(parsed,{sourceSHA256:sha});
 assert.equal(v50.outcome,'STRUCTURAL_QA_PASS_ONLY');
 // 5.1 separately verifies joint deformation and hair/body triangle contacts.
 // A future character may need weld and collision correction without failing build.
 const v51=await auditAIG51PosedSeamsAndHair(parsed,{
  sourceSHA256:sha,aig50Report:v50,
  maxClips:1,sampleFractions:[0,.25,.5,.75,1]
 });
 assert.equal(v51.schema,'AIG_FASTMODEL_5_1_POSED_SEAM_HAIR_BODY_QA_DRAFT');
 assert.ok(v51.posesChecked>=5);
 assert.equal(v51.releaseAllowed,false);
 assert.equal(v51.formalHeroineApproved,false);
});
test('5.5 RGB button generates actual GLB via real callback and loops into true GLTF and 5.0 audit',()=>{
 const read=name=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');
 const app=read('app.mjs'),html=read('index.html');
 for(const id of ['aig55-build','aig55-report','aig55-status'])
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 assert.ok(app.includes('generateAIG55NativeHumanoid('));
 assert.ok(app.includes("$('aig55-build').addEventListener('click'"));
 assert.ok(app.includes('parseRiggedGLB('));
 assert.ok(app.includes('auditAIG50FullBody('));
 assert.ok(app.includes('AIG-5.5-NATIVE-HUMANOID-SKINNED-TECHNICAL.glb'));
 assert.ok(app.includes('aig55Scaffold='));
 assert.ok(app.includes('new MovieWorkspace('));
 assert.ok(app.includes('generateVoiceBatch('));
});
