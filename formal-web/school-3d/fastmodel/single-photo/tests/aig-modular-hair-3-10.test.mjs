import test from 'node:test';
import assert from 'node:assert/strict';
import {buildAIG310ModularHair,AIG310_HAIR_SCHEMA,AIG310_HAIR_STYLES}
 from '../aig-modular-hair-3-10.mjs';
import {deformAIG39AttachedGarment}
 from '../aig-garment-pose-follow-3-9.mjs';
function sampleHead(){
 const n=160,p=new Float32Array(n*3),labels=new Uint8Array(n);
 for(let i=0;i<n;i++){
  const ring=Math.floor(i/32),angle=(i%32)*Math.PI*2/32;
  const factor=1+.3*Math.sin(ring*.7);
  p[i*3]=Math.cos(angle)*.15*factor;
  p[i*3+1]=1.4+ring*.09;
  p[i*3+2]=Math.sin(angle)*.12*factor;
  labels[i]=2;
 }
 return {positions:p,vertexSourceLabelIds:labels};
}
test('separate source-head-anchored short/long/pony/twins real 3D meshes, no baked face',()=>{
 const shell=sampleHead();
 const saved=shell.positions.slice();
 assert.ok(AIG310_HAIR_STYLES.includes('twintails'));
 for(const style of ['short','long','ponytail','twintails']){
  const result=buildAIG310ModularHair(shell,{style});
  assert.equal(result.schema,AIG310_HAIR_SCHEMA);
  assert.equal(result.style,style);
  assert.ok(result.realIndependentHairMeshes>0);
  assert.ok(result.realIndependent3DTriangles>100);
  assert.equal(result.sourceBodyUntouched,true);
  assert.equal(result.actualApprovedHeroineHairGroom,false);
  assert.equal(result.tailMotionPhysicsCertified,false);
  for(const segment of result.segments){
   assert.ok(segment.positions instanceof Float32Array);
   assert.ok(segment.indices instanceof Uint32Array);
   assert.ok(segment.sourceVertexIndices instanceof Uint32Array);
   assert.equal(segment.positions.length/3,segment.sourceVertexIndices.length);
   assert.ok(segment.sourceVertexIndices.every(i=>i<shell.positions.length/3));
   assert.ok(segment.positions.every(Number.isFinite));
  }
 }
 assert.deepEqual(shell.positions,saved);
});
test('actual head joint moves independent hair vertex geometry but does not alter source',()=>{
 const rest=sampleHead(),pose=rest.positions.slice();
 for(let i=0;i<pose.length;i+=3){
  pose[i]+=.12;pose[i+2]-=.09;
 }
 const hair=buildAIG310ModularHair(rest,{style:'ponytail'});
 let moved=0;
 for(const p of hair.segments){
  const output=deformAIG39AttachedGarment({
   garmentRest:p.positions,bodyRest:rest.positions,bodyPosed:pose,
   sourceVertexIndices:p.sourceVertexIndices
  });
  moved+=output.actualGarmentVerticesMoved;
  assert.equal(output.clothSelfCollisionVerified,false);
  assert.equal(output.trueWardrobeFollowsActualRig,true);
  const reset=deformAIG39AttachedGarment({
   garmentRest:p.positions,bodyRest:rest.positions,bodyPosed:rest.positions,
   sourceVertexIndices:p.sourceVertexIndices
  });
  assert.deepEqual(reset.positions,p.positions);
 }
 assert.ok(moved>100);
});
test('missing source head never generates imaginary natural hairstyle or falsely loads it',()=>{
 assert.equal(buildAIG310ModularHair(null,{style:'none'}).realIndependentHairMeshes,0);
 assert.throws(()=>buildAIG310ModularHair(sampleHead(),{style:'braids'}),
  /AIG310_HAIR_INVALID_HAIR_STYLE_OR_COLOUR/);
 const p=new Float32Array(15),id=new Uint8Array(5).fill(14);
 assert.throws(()=>buildAIG310ModularHair({
  positions:p,vertexSourceLabelIds:id
 },{style:'short'}),/AIG310_HAIR_NOT_ENOUGH_VISIBLE_HEAD_GEOMETRY/);
});
