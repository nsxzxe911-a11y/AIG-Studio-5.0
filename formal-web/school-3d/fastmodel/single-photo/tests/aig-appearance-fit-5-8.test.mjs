import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {AIG58_SCHEMA,generateAIG58FittedTechnical,auditAIG58RealPoseContacts}
 from '../aig-appearance-fit-5-8.mjs';
import {generateAIG57SchoolHeroineTechnical,AIG57_PARTS}
 from '../aig-native-appearance-5-7.mjs';
import {auditAIG50FullBody} from '../aig-fullbody-5-0.mjs';
const sha='6'.repeat(64),digest=x=>createHash('sha256').update(x).digest('hex');
const source=()=>({sourceSHA256:sha,meshType:'CLOSED_ELLIPTICAL_SECTION_VOLUME',
 autoRiggingAvailable:false,unseenSurfacesInferred:true,releaseAllowed:false,
 proportions:{widthHeightRatio:.50,ratiosByImageHeight:Array.from({length:11},(_,i)=>({
  atHeight:i/10,widthRatio:.25,centerRatio:.5,source:'OBSERVED_FRONT_SILHOUETTE'}))}});
const parsed=async result=>await new GLTFLoader().parseAsync(result.bytes.buffer,'');
function byName(gltf,name){
 let found;gltf.scene.traverse(n=>{if(n.isSkinnedMesh&&n.name===name)found=n});
 assert.ok(found,'missing '+name);return found;
}
test('5.8 changes genuine indexed skinned 3D skirt/hair vertices, preserving original rigged body and all five clips',async()=>{
 const base=await parsed(generateAIG57SchoolHeroineTechnical(source()));
 const fit=generateAIG58FittedTechnical(source()),current=await parsed(fit);
 assert.equal(fit.schema,AIG58_SCHEMA);
 assert.equal(fit.skinnedMeshCount,9);
 assert.equal(fit.animationClipCount,5);
 assert.ok(fit.adjustedSkirtVertices>120);
 assert.ok(fit.adjustedHairVertices>30);
 assert.equal(fit.sourceImageSHA256,sha);
 assert.equal(fit.releaseAllowed,false);
 assert.deepEqual(current.animations.map(c=>c.name),base.animations.map(c=>c.name));
 const skB=byName(base,AIG57_PARTS[3]),skF=byName(current,AIG57_PARTS[3]);
 const hairB=byName(base,AIG57_PARTS[6]),hairF=byName(current,AIG57_PARTS[6]);
 const bodyB=Array.from(base.scene.children).find(x=>x.isSkinnedMesh&&/FULLBODY/.test(x.name))||
 (()=>{let m;base.scene.traverse(n=>{if(n.isSkinnedMesh&&/FULLBODY/.test(n.name))m=n});return m})();
 const bodyF=byName(current,bodyB.name);
 for(const k of ['position','skinIndex','skinWeight']){
  assert.deepEqual(Array.from(bodyF.geometry.getAttribute(k).array),
   Array.from(bodyB.geometry.getAttribute(k).array),k);
 }
 assert.deepEqual(Array.from(bodyB.geometry.index.array),Array.from(bodyF.geometry.index.array));
 const b=skB.geometry.getAttribute('position'),a=skF.geometry.getAttribute('position');
 let skirtDifferent=0,hemChanged=0,waistFixed=0;
 for(let i=0;i<a.count;i++){
  if(Math.hypot(b.getX(i)-a.getX(i),b.getZ(i)-a.getZ(i))>1e-5){
   skirtDifferent++;if(a.getY(i)<.83)hemChanged++;
  }else if(a.getY(i)>1.114)waistFixed++;
 }
 assert.ok(skirtDifferent>150&&hemChanged>40&&waistFixed>20);
 const h0=hairB.geometry.getAttribute('position'),h1=hairF.geometry.getAttribute('position');
 let extra=0;
 for(let i=0;i<h0.count;i++)if(h1.getZ(i)>h0.getZ(i)+1e-6)extra++;
 assert.ok(extra>40);
 for(const mesh of [skF,hairF]){
  const p=mesh.geometry.getAttribute('position'),n=mesh.geometry.getAttribute('normal');
  assert.ok(n&&n.count===p.count);
  const wi=mesh.geometry.getAttribute('skinWeight');
  for(let i=0;i<wi.count;i++){
   const sum=wi.getX(i)+wi.getY(i)+wi.getZ(i)+wi.getW(i);
   assert.ok(Math.abs(sum-1)<1e-3);
  }
 }
});
test('5.8 retains real GLTF fullbody structure, original Source SHA and animation without pretending to match reference face',async()=>{
 const a=generateAIG58FittedTechnical(source());
 assert.equal(digest(a.bytes),digest(generateAIG58FittedTechnical(source()).bytes));
 const gltf=await parsed(a);
 const result=await auditAIG50FullBody(gltf,{sourceSHA256:digest(a.bytes)});
 assert.equal(result.outcome,'STRUCTURAL_QA_PASS_ONLY');
 assert.equal(result.skinnedMeshCount,9);
 assert.equal(result.clipsAvailable,5);
 assert.equal(a.actualSourceFaceLandmarksMatched,false);
 assert.equal(a.independentHairAndFabricPhysics,false);
 assert.equal(a.zeroCollisionGuaranteed,false);
 assert.equal(a.releaseAllowed,false);
});
test('5.8 actually pose-samples skinned skirt/body and multiple hair/body triangle intersections, with risk visible not hidden',async()=>{
 const a=generateAIG58FittedTechnical(source()),gltf=await parsed(a);
 const risk=await auditAIG58RealPoseContacts(gltf,{sourceSHA256:digest(a.bytes),maxClips:2});
 assert.equal(risk.schema,AIG58_SCHEMA);
 assert.equal(risk.sourceSHA256,digest(a.bytes));
 assert.equal(risk.posesChecked,10);
 assert.equal(risk.clips.length,2);
 assert.ok(risk.exactTrianglePairsTested>=0);
 assert.ok(Number.isInteger(risk.skirtBodyConfirmedTriangleContacts));
 assert.ok(Number.isInteger(risk.hairBodyConfirmedTriangleContacts));
 assert.equal(risk.releaseAllowed,false);
 assert.equal(risk.continuousTimeContactFreeProven,false);
 assert.equal(risk.actualFabricAndHairDynamicsVerified,false);
 assert.equal(risk.outcome,risk.sampledBodyGarmentAndHairContactFree?
  'DISCRETE_TRIANGLE_SURFACE_QA_PASS_ONLY':'CONTACT_RISK_BLOCKED');
});
test('5.8 rejects forged inputs, too large clearance values and source identity shortcuts',async()=>{
 const s=source();
 for(const settings of [{skirtExpansion:1},{skirtExpansion:2},{hairBackClearance:0},
  {hairBackClearance:.20}]){
  assert.throws(()=>generateAIG58FittedTechnical(s,settings),/AIG58_FIT_POLICY_BOUNDS/);
 }
 assert.throws(()=>generateAIG58FittedTechnical({...s,sourceSHA256:'bad'}),/AIG56_/);
 const r=generateAIG58FittedTechnical(s),gltf=await parsed(r);
 await assert.rejects(auditAIG58RealPoseContacts(gltf,{sourceSHA256:'bad'}),/AIG58_GLTF_SOURCE/);
 await assert.rejects(auditAIG58RealPoseContacts(gltf,{sourceSHA256:digest(r.bytes),maxClips:6}),/AIG58_GLTF_SOURCE/);
});
test('5.8 RGB has unique real callback, GLB SHA, 5.0+ source audit and original A/V code unchanged',()=>{
 const read=f=>fs.readFileSync(new URL('../'+f,import.meta.url),'utf8');
 const html=read('index.html'),app=read('app.mjs');
 for(const id of ['aig58-build','aig58-report','aig58-status'])
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 assert.ok(app.includes("$('aig58-build').addEventListener('click'"));
 assert.ok(app.includes("$('aig58-report').addEventListener('click'"));
 assert.ok(app.includes('generateAIG58FittedTechnical(scaffold)'));
 assert.ok(app.includes('auditAIG58RealPoseContacts('));
 assert.ok(app.includes('auditAIG50FullBody(parsed,'));
 assert.ok(app.includes('parseRiggedGLB(bytes.buffer)'));
 assert.ok(app.includes('aig58RefreshEnabled()'));
 assert.ok(app.includes('AIG-5.8-POSE-FITTED-SCHOOL-UNIFORM-TECHNICAL.glb'));
 assert.ok(app.includes('generateAIG57SchoolHeroineTechnical('));
 assert.ok(app.includes('new MovieWorkspace('));
 assert.ok(app.includes('generateVoiceBatch('));
});
