import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {AIG59_SCHEMA,AIG59_PROFILES,chooseAIG59NonRegressingIndex,
 runAIG59BoundedAutoFit} from '../aig-auto-fit-5-9.mjs';
import {AIG58_SCHEMA} from '../aig-appearance-fit-5-8.mjs';
import {auditAIG50FullBody} from '../aig-fullbody-5-0.mjs';

const src='7'.repeat(64),fingerprint=x=>createHash('sha256').update(x).digest('hex');
const source=()=>({sourceSHA256:src,
 meshType:'CLOSED_ELLIPTICAL_SECTION_VOLUME',autoRiggingAvailable:false,
 unseenSurfacesInferred:true,releaseAllowed:false,
 proportions:{widthHeightRatio:.49,
  ratiosByImageHeight:Array.from({length:11},(_,i)=>({
   atHeight:i/10,widthRatio:.23,centerRatio:.5,source:'OBSERVED_FRONT_SILHOUETTE'
  }))}});
const makeAudit=(skirt,hair,sha,clipNames=['A','B'])=>({
 schema:AIG58_SCHEMA,sourceSHA256:sha,posesChecked:clipNames.length*5,
 skirtBodyConfirmedTriangleContacts:skirt,hairBodyConfirmedTriangleContacts:hair,
 clips:clipNames.map((name,j)=>({
  name,samples:[0,.25,.5,.75,1].map((fraction,i)=>({
   fraction,skirtBodyTriangleContacts:j===0&&i===0?skirt:0,
   hairBodyTriangleContacts:j===0&&i===0?hair:0
  }))
 }))
});
const record=(id,skirt,hair,props={})=>({
 glbSHA256:id.repeat(64),skirtExpansion:1.16+id.charCodeAt(0)%5*.01,
 hairBackClearance:.046+id.charCodeAt(0)%5*.003,
 audit:makeAudit(skirt,hair,id.repeat(64),props.names)
});
test('5.9 actual data-based policy selects nonregressing paired skirt/hair counts, never optimizes by hiding one worsening dimension',()=>{
 const examples=[record('a',9,7),record('b',5,6),record('c',2,12),record('d',5,5)];
 const decision=chooseAIG59NonRegressingIndex(examples);
 assert.equal(decision.index,3);
 assert.equal(decision.baseline.skirt,9);
 assert.equal(decision.baseline.hair,7);
 assert.equal(decision.selected.skirt,5);
 assert.equal(decision.selected.hair,5);
 assert.equal(decision.releaseAllowed,false);
 const unchanged=[record('a',1,0),record('b',0,2),record('c',1,1)];
 assert.equal(chooseAIG59NonRegressingIndex(unchanged).index,0);
});
test('5.9 strict evidence: clipped pose lists, foreign model SHA, missing real sample and fraudulent totals BLOCK',()=>{
 const c=[record('a',3,4),record('b',2,4)];
 for(const mutate of [
  q=>{q[1].audit.sourceSHA256='c'.repeat(64);},
  q=>{q[1].audit.clips[0].samples.pop();},
  q=>{q[1].audit.clips[0].samples[1].fraction=.5;},
  q=>{q[1].audit.clips[1].name='OtherAction';},
  q=>{q[1].audit.hairBodyConfirmedTriangleContacts=0;},
  q=>{q[1].glbSHA256='bogus';}
 ]){
  const a=structuredClone(c);mutate(a);
  assert.throws(()=>chooseAIG59NonRegressingIndex(a),/AIG59_/);
 }
});
test('5.9 real bounded auto-fit produces true GLBs, SAT scores, full five-clip comparison and unchanged 17 bone rig',async()=>{
 const progress=[];
 const result=await runAIG59BoundedAutoFit(source(),{
  parseGLB:bytes=>new GLTFLoader().parseAsync(bytes,''),
  hashBytes:async bytes=>fingerprint(bytes),
  profiles:AIG59_PROFILES.slice(0,3),
  onProgress:s=>progress.push(s)
 });
 assert.equal(result.schema,AIG59_SCHEMA);
 assert.equal(result.sourceImageSHA256,src);
 assert.ok(result.bytes instanceof Uint8Array);
 assert.equal(fingerprint(result.bytes),result.selectedGLBSHA256);
 assert.equal(result.profileCandidates.length,3);
 assert.equal(result.exactPosesPerFullEvaluation,25);
 assert.ok(progress.length>=4);
 assert.equal(result.full25PoseSelected.glbSHA256,result.selectedGLBSHA256);
 assert.ok(result.actualMeasuredSkirtDelta<=0);
 assert.ok(result.actualMeasuredHairDelta<=0);
 assert.equal(result.full25PoseSelected.perClip.length,5);
 assert.equal(result.photoFaceLandmarkMeasurementAvailable,false);
 assert.equal(result.continuousMotionCollisionFreeProven,false);
 assert.equal(result.releaseAllowed,false);
 const gltf=await new GLTFLoader().parseAsync(result.bytes.buffer,'');
 const qa=await auditAIG50FullBody(gltf,{sourceSHA256:result.selectedGLBSHA256});
 assert.equal(qa.outcome,'STRUCTURAL_QA_PASS_ONLY');
 assert.equal(qa.clipsAvailable,5);
 assert.equal(qa.skinnedMeshCount,9);
});
test('5.9 fails closed on altered baseline, bad source, missing loaders and profile size budget',async()=>{
 const runtime={parseGLB:bytes=>new GLTFLoader().parseAsync(bytes,''),
  hashBytes:async bytes=>fingerprint(bytes)};
 const good=source();
 await assert.rejects(runAIG59BoundedAutoFit(good,{...runtime,profiles:[
  {skirtExpansion:1.22,hairBackClearance:.065},
  {skirtExpansion:1.30,hairBackClearance:.09}]}),/AIG59_5_8_BASELINE_REQUIRED/);
 await assert.rejects(runAIG59BoundedAutoFit(good,{...runtime,profiles:AIG59_PROFILES.slice(0,1)}),
  /AIG59_RUNTIME_OR_PROFILES_INVALID/);
 await assert.rejects(runAIG59BoundedAutoFit({...good,sourceSHA256:'bad'},{
  ...runtime,profiles:AIG59_PROFILES.slice(0,2)}),/AIG56_/);
});
test('5.9 RGB controls have real generator and pose-check callbacks, 16-view actual WebGL, SHA, 5.8/5.7 and A/V retained',()=>{
 const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
 const html=read('index.html'),app=read('app.mjs');
 for(const id of ['aig59-build','aig59-report','aig59-capture','aig59-status'])
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 for(const id of ['aig59-build','aig59-report','aig59-capture'])
  assert.ok(app.includes("$('"+id+"').addEventListener('click'"));
 assert.ok(app.includes('runAIG59BoundedAutoFit(scaffold,'));
 assert.ok(app.includes('await view.captureTimelineReview()'));
 assert.ok(app.includes('sourceSha!==aig59Report.selectedGLBSHA256'));
 assert.ok(app.includes('AIG-5.9-AUTO-FIT-SKINNED-SCHOOL-UNIFORM-TECHNICAL.glb'));
 assert.ok(app.includes('new MovieWorkspace('));
 assert.ok(app.includes('generateVoiceBatch('));
 assert.ok(app.includes('generateAIG58FittedTechnical(scaffold)'));
 assert.ok(read('aig-native-appearance-5-7.mjs').includes('generateAIG57SchoolHeroineTechnical'));
});
