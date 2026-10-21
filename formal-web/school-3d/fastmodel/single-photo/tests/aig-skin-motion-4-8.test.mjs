import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {AIG45_POSES,recognizePose,auditMarks} from '../aig-calibration-4-5.mjs';
import {normalizePoseSet,meshTopology} from '../aig-head-neck-4-6.mjs';
import {buildAIG47Draft,exportAIG47GLB} from '../aig-welded-4-7.mjs';
import {AIG48_SCHEMA,buildAIG48Draft,exportAIG48GLB,auditAIG48Poses} from '../aig-skin-motion-4-8.mjs';

const marks={headTop:{x:.5,y:.07},chin:{x:.5,y:.17},
 leftShoulder:{x:.39,y:.25},rightShoulder:{x:.61,y:.25},
 leftHip:{x:.42,y:.53},rightHip:{x:.58,y:.53},
 leftAnkle:{x:.44,y:.90},rightAnkle:{x:.56,y:.90}};
function source(){
 const p=AIG45_POSES[0];
 return normalizePoseSet([auditMarks(recognizePose({
  sha256:p.sha256,width:p.width,height:p.height}),marks)]);
}
const original=()=>buildAIG47Draft(source());

test('4.8 skin source is exactly SHA-bound original 4.7 mesh; no original geometry or export mutation',()=>{
 const a=original(),before=a.parts.map(p=>Array.from(p.positions));
 const glb47=exportAIG47GLB(a).bytes;
 const rig=buildAIG48Draft(a);
 assert.equal(rig.schema,AIG48_SCHEMA);
 assert.deepEqual(rig.sourceSHA256,a.sourceSHA256);
 assert.deepEqual(rig.parts.map(x=>x.name),['headNeck','ponytail']);
 assert.deepEqual(rig.parts.map(p=>Array.from(p.positions)),before);
 assert.deepEqual([...exportAIG47GLB(a).bytes],[...glb47]);
 assert.equal(rig.joins,a.headNeckJoinRingVertices);
 for(const p of rig.parts)assert.equal(meshTopology(p).closed,true);
 assert.equal(rig.releaseAllowed,false);
 assert.equal(rig.fullBodyRig,false);
 assert.throws(()=>buildAIG48Draft({...a,sourceSHA256:[]}),/SOURCE_REQUIRED/);
 assert.throws(()=>buildAIG48Draft({...a,headNeckSharedVertexJoin:false}),/SOURCE_REQUIRED/);
});
test('4.8 every actual vertex has finite normalized skin weights, correctly indexed',()=>{
 const rig=buildAIG48Draft(original());
 assert.equal(rig.boneNames.length,5);
 for(let k=0;k<2;k++){
  const count=rig.parts[k].positions.length/3;
  const w=rig.skins[k].weights,j=rig.skins[k].joints;
  assert.equal(w.length,4*count);assert.equal(j.length,4*count);
  for(let i=0;i<count;i++){
   const sum=w[4*i]+w[4*i+1]+w[4*i+2]+w[4*i+3];
   assert.ok(Math.abs(sum-1)<1e-6);
   for(let b=0;b<4;b++)assert.ok(Number.isFinite(w[4*i+b])&&
    w[4*i+b]>=0&&j[4*i+b]<5);
  }
 }
});
test('4.8 actual GLB binary roundtrip creates two skinned meshes, one rig and three named motion clips',async()=>{
 const draft=buildAIG48Draft(original()),out=exportAIG48GLB(draft);
 assert.equal(out.container,'glb');assert.equal(out.skinnedMeshCount,2);
 assert.equal(out.animationClips,3);assert.equal(out.releaseAllowed,false);
 const dv=new DataView(out.bytes.buffer);
 assert.equal(dv.getUint32(0,true),0x46546c67);
 assert.equal(dv.getUint32(8,true),out.bytes.length);
 const l=dv.getUint32(12,true);
 const json=JSON.parse(new TextDecoder().decode(out.bytes.slice(20,20+l)));
 assert.equal(json.asset.version,'2.0');assert.equal(json.skins.length,1);
 assert.deepEqual(json.skins[0].joints,[2,3,4,5,6]);
 assert.equal(json.extras.validForFormalCharacterRelease,false);
 assert.deepEqual(json.extras.originalSourceSHA256,draft.sourceSHA256);
 assert.equal(json.animations.length,3);
 const loaded=await new GLTFLoader().parseAsync(out.bytes.buffer,'');
 const skinned=[];loaded.scene.traverse(node=>{if(node.isSkinnedMesh)skinned.push(node);});
 assert.equal(skinned.length,2);
 assert.equal(loaded.animations.length,3);
 for(const mesh of skinned){
  assert.equal(mesh.skeleton.bones.length,5);
  assert.ok(mesh.geometry.getAttribute('skinIndex'));
  assert.ok(mesh.geometry.getAttribute('skinWeight'));
 }
 assert.deepEqual(loaded.animations.map(x=>x.name),draft.animationNames);
});
test('4.8 each animation actually deforms skinned geometry across sampled poses without collapsed/NaN triangles',async()=>{
 const qa=await auditAIG48Poses(buildAIG48Draft(original()));
 assert.equal(qa.glbRoundtrip,true);
 assert.equal(qa.actualThreeJsSkinnedMeshes,2);
 assert.equal(qa.sampledClips.length,3);
 assert.ok(qa.minSampledTriangleArea>1e-10);
 for(const clip of qa.sampledClips){
  assert.equal(clip.frameCount,5);
  assert.ok(clip.maxVertexDisplacement>0.00001,clip.clip);
  assert.equal(clip.actualSkinnedVertices.length,2);
 }
 assert.equal(qa.exactHairMeshIntersectionVerified,false);
 assert.equal(qa.native60FpsVerified,false);
 assert.equal(qa.releaseAllowed,false);
});
test('4.8 UI controls, source invalidation and existing 4.7 and 3.4 AV paths are all wired',()=>{
 const read=x=>fs.readFileSync(new URL(x,import.meta.url),'utf8');
 const html=read('../index.html'),app=read('../app.mjs');
 for(const id of ['aig48-build','aig48-download','aig48-evidence','aig48-status'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.ok(app.includes("import {AIG48_SCHEMA,buildAIG48Draft,exportAIG48GLB,auditAIG48Poses}"));
 assert.ok(app.includes('auditAIG48Poses(rig)'));
 assert.ok(app.includes('aig48Reset('));
 assert.ok(app.includes('AIG-4.8-skinned-motion-TECHNICAL-NOT-HEROINE.glb'));
 assert.ok(app.includes("$('aig47-download').addEventListener"));
 assert.ok(app.includes("new MovieWorkspace("));
 assert.ok(app.includes('exportAIG47GLB(aig47Draft)'));
 const [major,minor]=JSON.parse(read('../package.json')).version.split('.').map(Number);
 assert.ok(major>4||(major===4&&minor>=8),'version must be >=4.8, never downgraded');
});
