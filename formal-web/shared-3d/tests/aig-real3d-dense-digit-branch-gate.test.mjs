import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {buildAIGReal3DDenseOBJSource}
 from '../aig-real3d-dense-source-obj.mjs';
import {auditAIGReal3DDenseAnatomy}
 from '../aig-real3d-dense-anatomy-review.mjs';
import {auditAIGReal3DDenseFiveDigitBranches,
 AIG_REAL3D_DENSE_DIGIT_BRANCH_SCHEMA}
 from '../aig-real3d-dense-digit-branch-gate.mjs';
/** Explicit NONHUMAN 5-prong industrial solid. Never an anatomical fixture. */
function voxelSolid({separate=true,connected=true}={}){
 const occupied=new Set(),key=(x,y,z)=>[x,y,z].join(',');
 for(let x=0;x<34;x++)for(let y=0;y<12;y++)for(let z=0;z<3;z++)
  occupied.add(key(x,y,z));
 const bins=[2,8,14,20,26];
 for(let x=0;x<34;x++)for(let y=connected?12:13;y<31;y++)
  for(let z=0;z<3;z++)if(!separate||bins.some(v=>x>=v&&x<v+3))
   occupied.add(key(x,y,z));
 const verts=[],faces=[],lookup=new Map();
 function vertex(coords){
  const k=coords.join(',');
  if(!lookup.has(k)){lookup.set(k,verts.length+1);verts.push(coords);}
  return lookup.get(k);
 }
 const sides=[
  {d:[1,0,0],p:(x,y,z)=>[[x+1,y,z],[x+1,y+1,z],[x+1,y+1,z+1],[x+1,y,z+1]]},
  {d:[-1,0,0],p:(x,y,z)=>[[x,y,z],[x,y,z+1],[x,y+1,z+1],[x,y+1,z]]},
  {d:[0,1,0],p:(x,y,z)=>[[x,y+1,z],[x,y+1,z+1],[x+1,y+1,z+1],[x+1,y+1,z]]},
  {d:[0,-1,0],p:(x,y,z)=>[[x,y,z],[x+1,y,z],[x+1,y,z+1],[x,y,z+1]]},
  {d:[0,0,1],p:(x,y,z)=>[[x,y,z+1],[x+1,y,z+1],[x+1,y+1,z+1],[x,y+1,z+1]]},
  {d:[0,0,-1],p:(x,y,z)=>[[x,y,z],[x,y+1,z],[x+1,y+1,z],[x+1,y,z]]}
 ];
 for(const cell of occupied){
  const [x,y,z]=cell.split(',').map(Number);
  for(const side of sides){
   if(occupied.has(key(x+side.d[0],y+side.d[1],z+side.d[2])))continue;
   const ids=side.p(x,y,z).map(vertex);
   faces.push([ids[0],ids[1],ids[2]],[ids[0],ids[2],ids[3]]);
  }
 }
 const objText=verts.map(v=>'v '+v.join(' ')).concat(
  faces.map(f=>'f '+f.join(' '))).join('\n');
 return {objText};
}
function markers(){
 const obj={
  headTop:[15,1,0],chin:[15,1,0],noseTip:[15,1,0],
  neckBase:[15,1,0],leftShoulder:[15,1,0],rightShoulder:[15,1,0],
  leftElbow:[15,1,0],rightElbow:[15,1,0],
  leftWrist:[15,1,0],rightWrist:[15,1,0],
  pelvis:[15,1,0],leftKnee:[15,1,0],rightKnee:[15,1,0],
  leftHeel:[15,1,0],rightHeel:[15,1,0],
  leftToe:[15,1,0],rightToe:[15,1,0]
 };
 const xs=[3,9,15,21,27],names=['ThumbTip','IndexTip','MiddleTip','RingTip','PinkyTip'];
 for(const side of ['left','right'])for(let i=0;i<5;i++)
  obj[side+names[i]]=[xs[i],31,0];
 return obj;
}
function inspect({separate,connected,labels=markers()}={}){
 const {objText}=voxelSolid({separate,connected});
 const sourceSha256=createHash('sha256').update(objText).digest('hex');
 const dense=buildAIGReal3DDenseOBJSource({
  objText,sourceSha256,sourceName:'NONHUMAN_FIVE_PRONG_QA.obj',
  heightMm:1680
 });
 const anatomy=auditAIGReal3DDenseAnatomy({
  sourceGeometry:dense.sourceGeometry,sourceEvidence:dense.evidence,
  sourceSha256,landmarks:labels
 });
 return auditAIGReal3DDenseFiveDigitBranches({
  sourceGeometry:dense.sourceGeometry,sourceEvidence:dense.evidence,
  sourceSha256,anatomy,landmarks:labels
 });
}
test('Actual five separated distal branches of a NONHUMAN welded industrial comb give only technical separation evidence',()=>{
 const out=inspect({separate:true,connected:true});
 assert.equal(out.schema,AIG_REAL3D_DENSE_DIGIT_BRANCH_SCHEMA);
 assert.equal(out.handReports.length,2);
 for(const hand of out.handReports){
  assert.equal(hand.technicalFiveDistalBranchesObserved,true,
   JSON.stringify(hand.reasonCodes));
  assert.equal(hand.originalWristAndTipsIndexConnected,true);
  assert.ok(hand.cutPlanes.some(c=>c.distinctSourceSurfaceComponentsAtFiveTips===5));
  assert.equal(hand.fiveFingerHumanShapeVerified,false);
 }
 assert.equal(out.bothFiveDistalBranchTechnicalObservations,true);
 assert.equal(out.sourceActuallyContainsFiveHumanFingersProven,false);
 assert.equal(out.naturalAppearancePASS,false);
 assert.equal(out.releasePASS,false);
});
test('Five distinct marker coordinates on one continuous planar slab do NOT prove five independent fingers',()=>{
 const out=inspect({separate:false,connected:true});
 for(const hand of out.handReports){
  assert.equal(hand.distinctFiveTipsAnnotated,true);
  assert.equal(hand.originalWristAndTipsIndexConnected,true);
  assert.equal(hand.technicalFiveDistalBranchesObserved,false);
  assert.ok(hand.reasonCodes.includes('FIVE_DISTAL_BRANCHES_NOT_SEPARATED_IN_NATIVE_3D'));
 }
 assert.equal(out.bothFiveDistalBranchTechnicalObservations,false);
 assert.equal(out.releasePASS,false);
});
test('Detached distal rods with no original-index connection to wrist MUST be blocked',()=>{
 const out=inspect({separate:true,connected:false});
 for(const hand of out.handReports){
  assert.equal(hand.originalWristAndTipsIndexConnected,false);
  assert.equal(hand.technicalFiveDistalBranchesObserved,false);
  assert.ok(hand.reasonCodes.includes('FINGERS_NOT_CONNECTED_TO_ORIGINAL_WRIST_SHELL'));
 }
 assert.equal(out.releasePASS,false);
});
test('No native fingertip labels, missing source SHA, or forged topology evidence fail closed',()=>{
 const noLabels=inspect({separate:true,connected:true,labels:null});
 assert.equal(noLabels.handReports[0].missingMarkers.length,6);
 assert.equal(noLabels.bothFiveDistalBranchTechnicalObservations,false);
 const {objText}=voxelSolid({separate:true,connected:true});
 const hash=createHash('sha256').update(objText).digest('hex');
 const dense=buildAIGReal3DDenseOBJSource({
  objText,sourceSha256:hash,sourceName:'NONHUMAN_FIVE_PRONG_QA.obj',
  heightMm:1680
 });
 const anatomy=auditAIGReal3DDenseAnatomy({
  sourceGeometry:dense.sourceGeometry,sourceEvidence:dense.evidence,
  sourceSha256:hash,landmarks:markers()
 });
 assert.throws(()=>auditAIGReal3DDenseFiveDigitBranches({
  sourceGeometry:dense.sourceGeometry,sourceEvidence:dense.evidence,
  sourceSha256:'f'.repeat(64),anatomy,landmarks:markers()
 }),/DENSE_DIGIT_SHA_AND_UNCHANGED_GLOBAL_TRIANGLES_REQUIRED/);
 assert.throws(()=>auditAIGReal3DDenseFiveDigitBranches({
  sourceGeometry:{...dense.sourceGeometry,
   indices:new Uint32Array([0,1,2])},
  sourceEvidence:dense.evidence,sourceSha256:hash,anatomy,landmarks:markers()
 }),/DENSE_DIGIT_SHA_AND_UNCHANGED_GLOBAL_TRIANGLES_REQUIRED/);
});
