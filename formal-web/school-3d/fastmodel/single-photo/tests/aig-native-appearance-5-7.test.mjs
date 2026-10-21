import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {AnimationMixer,Vector3} from 'three';
import {generateAIG57SchoolHeroineTechnical,AIG57_SCHEMA,AIG57_PARTS}
 from '../aig-native-appearance-5-7.mjs';
import {generateAIG56NativeHumanoid} from '../aig-native-body-5-6.mjs';
import {auditAIG50FullBody} from '../aig-fullbody-5-0.mjs';
import {auditAIG51PosedSeamsAndHair} from '../aig-seam-contact-5-1.mjs';
const source='d'.repeat(64);
const scaffold=()=>({
 sourceSHA256:source,meshType:'CLOSED_ELLIPTICAL_SECTION_VOLUME',
 autoRiggingAvailable:false,unseenSurfacesInferred:true,releaseAllowed:false,
 proportions:{widthHeightRatio:.50,ratiosByImageHeight:Array.from({length:11},(_,i)=>({
  atHeight:i/10,widthRatio:.23,centerRatio:.50,source:'OBSERVED_FRONT_SILHOUETTE'}))}
});
const hash=x=>createHash('sha256').update(x).digest('hex');
const parse=async x=>await new GLTFLoader().parseAsync(x.bytes.buffer,'');
test('5.7 genuinely creates 7 independent volumetric uniformly skinned accessory glTF meshes with school clothes and 5 inherited clips',async()=>{
 const out=generateAIG57SchoolHeroineTechnical(scaffold()),gltf=await parse(out);
 assert.equal(out.schema,AIG57_SCHEMA);
 assert.equal(out.sourceImageSHA256,source);
 assert.equal(out.skinnedMeshCount,9);
 assert.equal(out.extraParts.length,7);
 assert.equal(out.totalAnimationClips,5);
 assert.equal(gltf.animations.length,5);
 assert.equal(out.actualFaceSurfaceMesh,true);
 assert.equal(out.actualUniformSurfaceMesh,true);
 assert.equal(out.actualPleatedSkirtMesh,true);
 assert.equal(out.ponytailActualWeightedStrands,true);
 assert.equal(out.releaseAllowed,false);
 assert.equal(out.originalPhotoFaceMatched,false);
 const meshes=[];gltf.scene.traverse(n=>{if(n.isSkinnedMesh)meshes.push(n)});
 assert.equal(meshes.length,9);
 for(const name of AIG57_PARTS){
  const m=meshes.find(x=>x.name===name);
  assert.ok(m,'missing '+name);
  assert.equal(m.skeleton.bones.length,17);
  assert.ok(m.geometry.index.count>=18);
  assert.ok(m.geometry.getAttribute('normal'));
  assert.ok(m.geometry.getAttribute('color'));
  for(const id of ['skinIndex','skinWeight'])assert.ok(m.geometry.getAttribute(id));
  const pos=m.geometry.getAttribute('position'),weight=m.geometry.getAttribute('skinWeight');
  let minZ=Infinity,maxZ=-Infinity;
  for(let i=0;i<pos.count;i++){
   minZ=Math.min(minZ,pos.getZ(i));maxZ=Math.max(maxZ,pos.getZ(i));
   const sum=weight.getX(i)+weight.getY(i)+weight.getZ(i)+weight.getW(i);
   assert.ok(Math.abs(sum-1)<.001,'invalid skin '+name+' '+i);
  }
  assert.ok(maxZ-minZ>.002,'3D depth, not 2D photographic plane: '+name);
 }
});
test('5.7 preserves every original 5.6 skin vertex and four original clip names; new pose moves real ponytail strands',async()=>{
 const base=generateAIG56NativeHumanoid(scaffold()),b=await parse(base);
 const dressed=generateAIG57SchoolHeroineTechnical(scaffold()),g=await parse(dressed);
 assert.deepEqual(g.animations.slice(0,4).map(x=>x.name),b.animations.map(x=>x.name));
 const body=name=>{let result;name.scene.traverse(n=>{if(n.isSkinnedMesh&&/FULLBODY/.test(n.name))result=n});return result;};
 const baseB=body(b),newB=body(g);
 assert.ok(baseB&&newB);
 const attrs=['position','skinIndex','skinWeight'];
 for(const att of attrs){
  assert.deepEqual(Array.from(newB.geometry.getAttribute(att).array),
   Array.from(baseB.geometry.getAttribute(att).array),att);
 }
 assert.deepEqual(Array.from(newB.geometry.index.array),Array.from(baseB.geometry.index.array));
 const strand=(()=>{let result;g.scene.traverse(n=>{if(n.isSkinnedMesh&&n.name===AIG57_PARTS[6])result=n});return result})();
 const mixer=new AnimationMixer(g.scene),action=mixer.clipAction(g.animations[4]);action.play();
 const p=new Vector3(),before=[],after=[];
 const take=dest=>{
  g.scene.updateMatrixWorld(true);
  for(let i=0;i<strand.geometry.getAttribute('position').count;i++){
   strand.getVertexPosition(i,p);dest.push(p.x,p.y,p.z);
  }
 };
 mixer.setTime(0);take(before);mixer.setTime(.75);take(after);
 let moved=0;
 for(let i=0;i<before.length;i+=3)
  if(Math.hypot(after[i]-before[i],after[i+1]-before[i+1],after[i+2]-before[i+2])>1e-5)moved++;
 assert.ok(moved>5,'real skinned strand-follow deformation');
});
test('5.7 passes existing 5.0 anatomical skeleton Gate, and checks 5.1 independently rather than falsely approving hair physics',async()=>{
 const o=generateAIG57SchoolHeroineTechnical(scaffold()),g=await parse(o);
 const evidence=await auditAIG50FullBody(g,{sourceSHA256:hash(o.bytes)});
 assert.equal(evidence.outcome,'STRUCTURAL_QA_PASS_ONLY');
 assert.equal(evidence.skinnedMeshCount,9);
 const contacts=await auditAIG51PosedSeamsAndHair(g,{sourceSHA256:hash(o.bytes),aig50Report:evidence,maxClips:1});
 assert.equal(contacts.posesChecked,5);
 assert.equal(contacts.releaseAllowed,false);
 assert.equal(contacts.continuousTimeCollisionFreeProven,false);
 assert.equal(contacts.hairAlphaOrStrandPhysicsVerified,false);
});
test('5.7 is strictly source-bound, deterministic, no external inference, no heroine fake approval',()=>{
 const one=generateAIG57SchoolHeroineTechnical(scaffold());
 assert.equal(hash(one.bytes),hash(generateAIG57SchoolHeroineTechnical(scaffold()).bytes));
 const bad=[s=>s.sourceSHA256='bad',s=>s.releaseAllowed=true,
  s=>s.proportions.widthHeightRatio=NaN];
 for(const modify of bad){
  const copy=scaffold();modify(copy);
  assert.throws(()=>generateAIG57SchoolHeroineTechnical(copy),/AIG56_/);
 }
 const code=fs.readFileSync(new URL('../aig-native-appearance-5-7.mjs',import.meta.url),'utf8');
 for(const flag of ['individualLikenessVerified:false','releaseAllowed:false',
   'plaidIsProceduralColorsNotRecoveredClothTexture:true','ponytailDynamicsAreKeyframedNotPhysics:true'])
  assert.ok(code.includes(flag),flag);
});
test('5.7 RGB true button, stable IDs, visual SHA and independent 5.6/5.5 plus A/V retained',()=>{
 const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
 const html=read('index.html'),app=read('app.mjs');
 for(const id of ['aig57-build','aig57-report','aig57-status'])
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 for(const id of ['aig57-build','aig57-report'])
  assert.ok(app.includes("$('"+id+"').addEventListener('click'"));
 assert.ok(app.includes('generateAIG57SchoolHeroineTechnical(scaffold)'));
 assert.ok(app.includes('auditAIG50FullBody(parsed,'));
 assert.ok(app.includes('aig57RefreshEnabled()'));
 assert.ok(app.includes('AIG-5.7-NATIVE-SCHOOL-UNIFORM-SKINNED-TECHNICAL.glb'));
 assert.ok(app.includes('generateAIG56NativeHumanoid('));
 assert.ok(app.includes('generateAIG55NativeHumanoid('));
 assert.ok(app.includes('new MovieWorkspace('));
 assert.ok(app.includes('generateVoiceBatch('));
});
