import test from 'node:test';
import assert from 'node:assert/strict';
import {AIG715_SCHEMA,editAIG715Joint}
 from '../aig-heroine-candidate-7-15.mjs';
import {AIG23_SCHEMA,buildAIG23DeformationPlan,verifyAIG23Plan}
 from '../aig-heroine-deform-2-3.mjs';
const digest='sha256:'+'f'.repeat(64);
const joints=()=>[
 {name:'chest',parent:'spine',x:.5,y:.38,confirmed:false},
 {name:'neck',parent:'chest',x:.5,y:.26,confirmed:false},
 {name:'head',parent:'neck',x:.5,y:.16,confirmed:false}
];
function candidate(){
 const mesh=(name,coords)=>({
  positions:new Float32Array(coords.flat()),
  uv:new Float32Array([0,0,1,0,0,1,1,0,0,1,1,1]),
  rgb:new Uint8Array([100,30,50,100,30,50,100,30,50,
   80,90,100,80,90,100,80,90,100]),
  confidence:new Float32Array([.3,.3,.3,.3,.3,.3]),
  triangles:2,category:name==='JACKET'?
   'INDEPENDENT_CLOTH_DRAFT':'SEPARATE_CHARACTER_SURFACE'
 });
 const group={
  HAIR:mesh('HAIR',[
   [-.1,.35,.18],[.1,.35,.18],[-.1,.22,.18],
   [.1,.35,.18],[-.1,.22,.18],[.1,.22,.18]]),
  FACE:mesh('FACE',[
   [-.06,.3,.24],[.06,.3,.24],[-.06,.16,.24],
   [.06,.3,.24],[-.06,.16,.24],[.06,.16,.24]]),
  JACKET:mesh('JACKET',[
   [-.17,.12,-.01],[.17,.12,-.01],[-.17,-.17,-.01],
   [.17,.12,-.01],[-.17,-.17,-.01],[.17,-.17,-.01]])
 };
 return {
  schema:AIG715_SCHEMA,sourceDigest:digest,skeletonCandidate:joints(),
  geometryGroups:group,depth_estimated:{units:'NORMALIZED_RELATIVE_NOT_MM'},
  depth_measured:{units:'MM_LEFT_CAMERA_DEPTH'},
  estimatedAndMeasuredStoredSeparately:true
 };
}
test('2.3 source-locked automatic draft has real normalized vertex skin influences and preserves distinct materials',()=>{
 const src=candidate(),hairCopy=src.geometryGroups.HAIR.positions.slice(),
  plan=buildAIG23DeformationPlan(src);
 assert.equal(plan.schema,AIG23_SCHEMA);
 assert.equal(plan.meshes,3);
 assert.equal(plan.vertexCount,18);
 assert.deepEqual(plan.reviewRequired,['chest','neck','head']);
 assert.equal(plan.originalGeometryColorPreserved,true);
 assert.equal(plan.geometryUnits,'SINGLE_IMAGE_RELATIVE_NOT_MM');
 assert.equal(plan.onlyObservedFrontSurface,true);
 assert.equal(plan.noAutomaticHumanWalkOrJump,true);
 for(const [name,g] of Object.entries(plan.groups)){
  assert.equal(g.skinIndex.length,g.vertexCount*4);
  assert.equal(g.skinWeight.length,g.vertexCount*4);
  for(let i=0;i<g.vertexCount;i++){
   const off=i*4;
   assert.equal(g.skinIndex[off+2],0);
   assert.equal(g.skinWeight[off+2],0);
   assert.ok(Math.abs(g.skinWeight[off]+g.skinWeight[off+1]-1)<1e-5);
   assert.ok(g.skinWeight[off]>=0&&g.skinWeight[off]<=1);
  }
 }
 assert.deepEqual(src.geometryGroups.HAIR.positions,hairCopy,
  'original 7.15 mesh RGB/positions never mutated by 2.3 skin plan');
 assert.equal(verifyAIG23Plan(plan,src),true);
});
test('2.3 reviewed skeleton can require confirmed head-neck-chest without blocking automatic draft',()=>{
 const src=candidate();
 assert.throws(()=>buildAIG23DeformationPlan(src,{requireConfirmed:true}),
  /HEAD_NECK_CHEST_USER_CONFIRMED_JOINTS_REQUIRED/);
 const reviewed={...src,skeletonCandidate:joints().map(j=>({...j,confirmed:true}))};
 const plan=buildAIG23DeformationPlan(reviewed,{requireConfirmed:true});
 assert.deepEqual(plan.reviewRequired,[]);
 assert.equal(plan.joints.every(j=>j.userConfirmed),true);
});
test('2.3 source/rig scale fails closed for degenerate/inverted and mismatched topology',()=>{
 const src=candidate();
 assert.throws(()=>buildAIG23DeformationPlan({...src,sourceDigest:'invalid'}),
  /SOURCE_DIGEST/);
 assert.throws(()=>buildAIG23DeformationPlan(src,{headAngleDegrees:40}),
  /BOUNDED_ACTION/);
 const inverted={...src,skeletonCandidate:src.skeletonCandidate.map(j=>
  j.name==='head'?{...j,y:.8}:j)};
 assert.throws(()=>buildAIG23DeformationPlan(inverted),/AXIS_NOT_ANATOMICALLY_ORDERED/);
 const wrong={...src,geometryGroups:{HAIR:{...src.geometryGroups.HAIR,uv:new Float32Array(1)}}};
 assert.throws(()=>buildAIG23DeformationPlan(wrong),/TOPOLOGY_OR_VERTEX_COLOR_MISMATCH/);
 const plan=buildAIG23DeformationPlan(src);
 const moved={...src,skeletonCandidate:src.skeletonCandidate.map(j=>
  j.name==='head'?{...j,x:.61}:j)};
 assert.throws(()=>verifyAIG23Plan(plan,moved),/RIG_CANDIDATE_CHANGED_REBUILD_REQUIRED/);
});
