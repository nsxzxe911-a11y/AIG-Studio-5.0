import test from 'node:test';
import assert from 'node:assert/strict';
import {buildAIG314HeroineSourceHair,AIG314_HAIR_SOURCE_SCHEMA,
 AIG314_REAR_HAIR_PROFILE}
 from '../aig-heroine-hair-silhouette-3-14.mjs';
import {deformAIG39AttachedGarment}
 from '../aig-garment-pose-follow-3-9.mjs';
function fakeLabelledHead(){
 const points=[],ids=[];
 for(let j=0;j<6;j++)for(let k=0;k<32;k++){
  const a=k*Math.PI*2/32;
  points.push(.15*Math.cos(a),1.46+j*.075,.12*Math.sin(a));
  ids.push(2);
 }
 return {positions:new Float32Array(points),
  vertexSourceLabelIds:new Uint8Array(ids)};
}
test('user-source rear-view rows yield real separately indexed non-planar long hairstyle',()=>{
 const h=fakeLabelledHead(),orig=h.positions.slice();
 const result=buildAIG314HeroineSourceHair(h);
 assert.equal(result.schema,AIG314_HAIR_SOURCE_SCHEMA);
 assert.equal(result.style,'authority-long');
 assert.equal(result.actualOriginalRearHairRowsMeasured,17);
 assert.equal(AIG314_REAR_HAIR_PROFILE.length,17);
 assert.equal(result.realIndependentHairMeshes,1);
 assert.ok(result.realIndependent3DTriangles>700);
 assert.equal(result.sourceWidthEstimatedFromRealBackView,true);
 assert.equal(result.sideAndHiddenHairDepthIsInferredNotScanned,true);
 assert.equal(result.sourceHairGroomAndIndividualStrandsApproved,false);
 const hair=result.segments[0];
 assert.ok(hair.positions instanceof Float32Array);
 assert.ok(hair.indices instanceof Uint32Array);
 assert.ok(hair.positions.every(Number.isFinite));
 assert.ok(hair.sourceVertexIndices.every(i=>i<h.positions.length/3));
 assert.equal(hair.positions.length/3,hair.sourceVertexIndices.length);
 const minZ=Math.min(...Array.from({length:hair.positions.length/3},
  (_,i)=>hair.positions[3*i+2]));
 const maxZ=Math.max(...Array.from({length:hair.positions.length/3},
  (_,i)=>hair.positions[3*i+2]));
 assert.ok(maxZ-minZ>.03);
 assert.deepEqual(h.positions,orig);
});
test('source rear silhouette actually follows head joint movement via shared rig',()=>{
 const shell=fakeLabelledHead(),hair=buildAIG314HeroineSourceHair(shell).segments[0];
 const posed=new Float32Array(shell.positions);
 for(let i=0;i<posed.length;i+=3){
  posed[i]+=.1;posed[i+1]+=.03;
 }
 const result=deformAIG39AttachedGarment({
  garmentRest:hair.positions,
  bodyRest:shell.positions,
  bodyPosed:posed,
  sourceVertexIndices:hair.sourceVertexIndices
 });
 assert.ok(result.actualGarmentVerticesMoved>100);
 assert.equal(result.restGarmentUnchanged,true);
 const reset=deformAIG39AttachedGarment({
  garmentRest:hair.positions,
  bodyRest:shell.positions,
  bodyPosed:shell.positions,
  sourceVertexIndices:hair.sourceVertexIndices
 });
 assert.deepEqual(reset.positions,hair.positions);
});
test('hair without source-labeled real head or wrong authority SHA is BLOCKED',()=>{
 const h=fakeLabelledHead();
 assert.throws(()=>buildAIG314HeroineSourceHair(h,{
  sourceReferenceSha256:'0'.repeat(64)
 }),/AIG314_HAIR_VERIFIED_REFERENCE_AND_SOURCE_HEAD_GEOMETRY_REQUIRED/);
 h.vertexSourceLabelIds.fill(14);
 assert.throws(()=>buildAIG314HeroineSourceHair(h),
  /AIG314_HAIR_HEAD_SILHOUETTE_EVIDENCE_INSUFFICIENT/);
});
