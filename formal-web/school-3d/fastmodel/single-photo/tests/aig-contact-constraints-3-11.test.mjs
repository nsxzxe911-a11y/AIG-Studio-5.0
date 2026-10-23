import test from 'node:test';
import assert from 'node:assert/strict';
import {AIG311_CONTACT_SCHEMA,buildAIG311PoseContactProxies,
 resolveAIG311PoseContacts} from '../aig-contact-constraints-3-11.mjs';
function bodyFixture(){
 const p=[],classes=[];
 function add(label,c,r,n=96){
  for(let i=0;i<n;i++){
   const a=i*2.399963229728653,
    z=1-2*(i+.5)/n,side=Math.sqrt(1-z*z);
   p.push(c[0]+r[0]*side*Math.cos(a),
    c[1]+r[1]*z,c[2]+r[2]*side*Math.sin(a));
   classes.push(label);
  }
 }
 add(14,[0,1.15,0],[.22,.31,.13]);
 add(6,[-.30,1.36,0],[.09,.13,.09]);
 add(7,[.30,1.36,0],[.09,.13,.09]);
 add(10,[-.12,.55,0],[.09,.40,.09]);
 add(11,[.12,.55,0],[.09,.40,.09]);
 return {positions:new Float32Array(p),labels:new Uint8Array(classes)};
}
test('actual posed-body source classes produce hair upper torso/shoulder and skirt leg collision proxies',()=>{
 const b=bodyFixture();
 const hair=buildAIG311PoseContactProxies({
  bodyPosed:b.positions,sourceLabels:b.labels,mode:'hair'});
 const skirt=buildAIG311PoseContactProxies({
  bodyPosed:b.positions,sourceLabels:b.labels,mode:'skirt'});
 assert.equal(hair.schema,AIG311_CONTACT_SCHEMA);
 assert.equal(hair.activeProxies.length,3);
 assert.deepEqual(hair.absentRegions,[]);
 assert.equal(skirt.activeProxies.length,2);
 assert.deepEqual(skirt.absentRegions,[]);
 assert.equal(hair.trueFullBodyCollisionProven,false);
});
test('actual hair tail and skirt vertices penetrating posed body are projected out with bounded XYZ corrections',()=>{
 const b=bodyFixture(),bodyBefore=b.positions.slice();
 for(const [mode,points] of [
  ['hair',new Float32Array([0,1.15,-.1, .3,1.36,-.04,
   -.3,1.36,-.04, 2,2,2])],
  ['skirt',new Float32Array([-.12,.55,-.07,.12,.55,-.07,
   -2,2,2])]
 ]){
  const before=points.slice();
  const result=resolveAIG311PoseContacts({
   posedAttachment:points,bodyPosed:b.positions,
   sourceLabels:b.labels,mode,
   maxCorrectionRatio:.08,marginRatio:.006
  });
  assert.equal(result.schema,AIG311_CONTACT_SCHEMA);
  assert.ok(result.actualCollisionCandidateVertices>=2);
  assert.ok(result.actualCorrectedVertices>=2);
  assert.equal(result.inputAttachmentUnmodified,true);
  assert.equal(result.fullSkinAndFabricIntersectionFreeCertified,false);
  assert.equal(result.continuousClothAndHairPhysicsCertified,false);
  assert.ok(result.maximumCorrectionAppliedUnits<=
   result.maximumPermittedCorrectionUnits+.000001);
  assert.notDeepEqual(result.positions,points);
  assert.deepEqual(points,before);
  assert.ok(result.positions.every(Number.isFinite));
 }
 assert.deepEqual(b.positions,bodyBefore);
});
test('severely penetrating attachment is bounded and unresolved collisions remain explicit',()=>{
 const b=bodyFixture(),p=new Float32Array([0,1.15,0]);
 const out=resolveAIG311PoseContacts({
  posedAttachment:p,bodyPosed:b.positions,sourceLabels:b.labels,
  mode:'hair',maxCorrectionRatio:.002
 });
 assert.equal(out.actualCorrectedVertices,1);
 assert.ok(out.remainingCoarseProxyPenetrations>=1);
 assert.equal(out.productionAppearanceAccepted,false);
});
test('absent labelled limb/torso fails safely rather than inventing colliders',()=>{
 const positions=new Float32Array(60*3),labels=new Uint8Array(60);
 for(let i=0;i<60;i++)positions[i*3+1]=i*.01;
 const shell=buildAIG311PoseContactProxies({
  bodyPosed:positions,sourceLabels:labels,mode:'skirt'});
 assert.equal(shell.activeProxies.length,0);
 assert.equal(shell.absentRegions.length,2);
 const before=new Float32Array([0,.2,.1]);
 const out=resolveAIG311PoseContacts({
  posedAttachment:before,bodyPosed:positions,sourceLabels:labels,
  mode:'skirt'});
 assert.equal(out.actualCorrectedVertices,0);
 assert.deepEqual(out.positions,before);
 assert.throws(()=>resolveAIG311PoseContacts({
  posedAttachment:before,bodyPosed:positions,
  sourceLabels:new Uint8Array(1),mode:'skirt'
 }),/AIG311_CONTACT_REAL_POSED_SOURCE_AND_CLASSES_REQUIRED/);
 assert.throws(()=>resolveAIG311PoseContacts({
  posedAttachment:before,bodyPosed:positions,sourceLabels:labels,
  mode:'shirt'
 }),/AIG311_CONTACT_REAL_POSED_SOURCE_AND_CLASSES_REQUIRED/);
});
