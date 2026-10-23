import test from 'node:test';
import assert from 'node:assert/strict';
import {deformAIG39AttachedGarment,AIG39_GARMENT_POSE_SCHEMA}
 from '../aig-garment-pose-follow-3-9.mjs';

test('source-vertex anchored independent 3D clothing moves when the real body joint moves',()=>{
 const bodyRest=new Float32Array([
  0,0,0, 1,0,0, 0,1,0, 1,1,0
 ]);
 const bodyPosed=new Float32Array([
  0,0,0, 1,0,0, -.2,1.1,.3, .8,1.1,.3
 ]);
 const garmentRest=new Float32Array([
  0,.02,.04, 1,.02,.04, 0,1.02,.04, 1,1.02,.04
 ]);
 const original=garmentRest.slice(),base=bodyRest.slice(),posed=bodyPosed.slice();
 const binding=new Uint32Array([0,1,2,3]);
 const outcome=deformAIG39AttachedGarment({
  garmentRest,bodyRest,bodyPosed,sourceVertexIndices:binding
 });
 assert.equal(outcome.schema,AIG39_GARMENT_POSE_SCHEMA);
 assert.equal(outcome.actualGarmentVerticesMoved,2);
 assert.equal(outcome.garmentVertexCount,4);
 assert.ok(outcome.maxSourceAnchorDisplacement>.3);
 assert.deepEqual(Array.from(outcome.positions.slice(6,9)),
  Array.from(new Float32Array([-.2,1.12,.34])));
 assert.deepEqual(garmentRest,original);
 assert.deepEqual(bodyRest,base);
 assert.deepEqual(bodyPosed,posed);
 assert.equal(outcome.trueWardrobeFollowsActualRig,true);
 assert.equal(outcome.clothSelfCollisionVerified,false);
 assert.equal(outcome.accurateSkirtHemPhysicsVerified,false);
 const reset=deformAIG39AttachedGarment({
  garmentRest,bodyRest,bodyPosed:bodyRest,sourceVertexIndices:binding
 });
 assert.deepEqual(reset.positions,garmentRest);
});
test('missing anchors, wrong model, non-finite pose or mismatched geometry fail closed',()=>{
 const rest=new Float32Array([0,0,0,1,1,1]);
 const garmentRest=new Float32Array([0,0,.05]);
 const valid=new Uint32Array([0]);
 assert.throws(()=>deformAIG39AttachedGarment({
  garmentRest,bodyRest:rest,bodyPosed:rest,
  sourceVertexIndices:new Uint32Array([99])
 }),/SOURCE_VERTEX_INDEX_OUTSIDE_BODY/);
 assert.throws(()=>deformAIG39AttachedGarment({
  garmentRest,bodyRest:rest,bodyPosed:new Float32Array(3),
  sourceVertexIndices:valid
 }),/ATTACHMENT_AND_BODY_GEOMETRY_REQUIRED/);
 const inf=new Float32Array(rest);inf[0]=Infinity;
 assert.throws(()=>deformAIG39AttachedGarment({
  garmentRest,bodyRest:rest,bodyPosed:inf,sourceVertexIndices:valid
 }),/NONFINITE_BODY_POSE/);
});
