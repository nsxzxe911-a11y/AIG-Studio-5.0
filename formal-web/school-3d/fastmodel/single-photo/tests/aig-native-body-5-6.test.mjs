import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {generateAIG56NativeHumanoid,AIG56_SCHEMA,AIG56_BONES,
 verifyClosedIndexManifold} from '../aig-native-body-5-6.mjs';
import {auditAIG50FullBody} from '../aig-fullbody-5-0.mjs';
import {auditAIG51PosedSeamsAndHair} from '../aig-seam-contact-5-1.mjs';
const sha='e'.repeat(64);
const scaffold=()=>({sourceSHA256:sha,meshType:'CLOSED_ELLIPTICAL_SECTION_VOLUME',
 autoRiggingAvailable:false,unseenSurfacesInferred:true,releaseAllowed:false,
 proportions:{widthHeightRatio:.49,ratiosByImageHeight:Array.from({length:11},(_,i)=>({
  atHeight:i/10,widthRatio:.21,centerRatio:.5,source:'OBSERVED_FRONT_SILHOUETTE'
 }))}});
const hash=x=>createHash('sha256').update(x).digest('hex');
test('5.6 produces real indexed oriented closed human-body skin GLB and retains 17 bones/four true quaternion clips',async()=>{
 const d=generateAIG56NativeHumanoid(scaffold());
 assert.equal(d.schema,AIG56_SCHEMA);
 assert.equal(d.fullyWatertightJunctionsVerified,true);
 assert.equal(d.indexedSurfaceClosureVerified,true);
 assert.equal(d.orphanedPatchInteriorVerticesPruned,12);
 assert.ok(d.bodyManifoldEdges>1000);
 assert.ok(d.bodyTriangleCount>900);
 assert.equal(d.boneCount,17);
 assert.equal(AIG56_BONES.length,17);
 assert.equal(d.animationClipNames.length,4);
 assert.equal(d.originalHeroineFaceTexturePresent,false);
 assert.equal(d.surfaceSelfIntersectionsExcluded,false);
 assert.equal(d.formalHeroineApproved,false);
 assert.equal(d.releaseAllowed,false);
 const gltf=await new GLTFLoader().parseAsync(d.bytes.buffer,'');
 const skins=[];gltf.scene.traverse(n=>{if(n.isSkinnedMesh)skins.push(n)});
 assert.equal(skins.length,2);
 assert.equal(gltf.animations.length,4);
 const body=skins.find(n=>/FULLBODY/.test(n.name));
 assert.ok(body);
 assert.equal(body.skeleton.bones.length,17);
 const ids=Array.from(body.geometry.index.array);
 const topology=verifyClosedIndexManifold(ids,body.geometry.getAttribute('position').count);
 assert.equal(topology.openBoundaryEdges,0);
 assert.equal(topology.connectedIndexedComponents,1);
 assert.equal(topology.indexedVertices,body.geometry.getAttribute('position').count);
 assert.ok(body.geometry.getAttribute('skinWeight').count>250);
 assert.ok(body.geometry.getAttribute('skinIndex').count>250);
});
test('5.6 exact actual GLTFLoader 5.0 fullbody bone/skin and moved pose QA',async()=>{
 const d=generateAIG56NativeHumanoid(scaffold());
 const parsed=await new GLTFLoader().parseAsync(d.bytes.buffer,'');
 const result=await auditAIG50FullBody(parsed,{sourceSHA256:hash(d.bytes)});
 assert.equal(result.outcome,'STRUCTURAL_QA_PASS_ONLY',JSON.stringify({
  bones:result.missingBones,topology:result.hierarchyProblems,poses:result.poseReports
 }));
 assert.equal(result.shoulderNeckHeadActualSharedIndexedComponent,true);
 assert.equal(result.animationHasRealSkinnedVertexMotion,true);
 assert.equal(result.releaseAllowed,false);
});
test('5.6 independently samples real shoulder/hair collision; a skin PASS is not a safety PASS',async()=>{
 const d=generateAIG56NativeHumanoid(scaffold()),parsed=await new GLTFLoader().parseAsync(d.bytes.buffer,'');
 const verified=await auditAIG50FullBody(parsed,{sourceSHA256:hash(d.bytes)});
 assert.equal(verified.outcome,'STRUCTURAL_QA_PASS_ONLY');
 const next=await auditAIG51PosedSeamsAndHair(parsed,{sourceSHA256:hash(d.bytes),aig50Report:verified,
  maxClips:1,sampleFractions:[0,.25,.5,.75,1]});
 assert.equal(next.schema,'AIG_FASTMODEL_5_1_POSED_SEAM_HAIR_BODY_QA_DRAFT');
 assert.ok(next.posesChecked>=5);
 assert.equal(next.releaseAllowed,false);
 assert.equal(next.continuousTimeCollisionFreeProven,false);
});
test('5.6 reject non-manifold primitives, bad triangles, false source, and keep 5.5 separate',()=>{
 assert.throws(()=>verifyClosedIndexManifold([0,1,2],3),/AIG56_INDEX_INPUT_INVALID/);
 // Ten individually closed tetrahedra have no open edges but are not
 // a single human mesh. Must reject instead of returning a fake seam PASS.
 const tetra=[[0,2,1],[0,1,3],[0,3,2],[1,2,3]];
 const disjoint=[];
 for(let x=0;x<10;x++)for(const face of tetra)disjoint.push(...face.map(i=>i+x*4));
 assert.throws(()=>verifyClosedIndexManifold(disjoint,40),/AIG56_INDEX_BODY_DISCONNECTED/);
 assert.throws(()=>generateAIG56NativeHumanoid({...scaffold(),releaseAllowed:true}),/AIG56_/);
 const d=generateAIG56NativeHumanoid(scaffold()),d2=generateAIG56NativeHumanoid(scaffold());
 assert.equal(hash(d.bytes),hash(d2.bytes));
 const legacy=fs.readFileSync(new URL('../aig-native-humanoid-5-5.mjs',import.meta.url),'utf8');
 assert.ok(legacy.includes('export function generateAIG55NativeHumanoid('));
});
test('5.6 RGB button and real callbacks coexist with all audio/dialogue and 5.0-5.5 workflows',()=>{
 const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
 const app=read('app.mjs'),html=read('index.html');
 for(const id of ['aig56-build','aig56-report','aig56-status'])
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 assert.ok(app.includes("$('aig56-build').addEventListener('click'"));
 assert.ok(app.includes("$('aig56-report').addEventListener('click'"));
 assert.ok(app.includes('generateAIG56NativeHumanoid('));
 assert.ok(app.includes('auditAIG50FullBody('));
 assert.ok(app.includes('parseRiggedGLB('));
 assert.ok(app.includes('aig54Report'));
 assert.ok(app.includes('new MovieWorkspace('));
 assert.ok(app.includes('generateVoiceBatch('));
 assert.ok(app.includes('generateAIG55NativeHumanoid('));
});
