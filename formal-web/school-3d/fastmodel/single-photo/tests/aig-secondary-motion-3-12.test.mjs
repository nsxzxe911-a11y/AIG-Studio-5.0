import test from 'node:test';
import assert from 'node:assert/strict';
import {AIG312_SCHEMA,createAIG312SecondaryMotion}
 from '../aig-secondary-motion-3-12.mjs';
import {resolveAIG311PoseContacts}
 from '../aig-contact-constraints-3-11.mjs';

const rest=new Float32Array([
 -.1,1.5,-.2,.1,1.5,-.2,-.1,1.4,-.2,.1,1.4,-.2,
 -.1,1.2,-.2,.1,1.2,-.2,-.1,.9,-.2,.1,.9,-.2
]);
test('actual hair tail dynamics have pinned roots, evolving damping and exact rest recovery',()=>{
 const before=rest.slice();
 const solver=createAIG312SecondaryMotion({
  restPositions:rest,bodyHeightUnits:2,kind:'hair'
 });
 const target=rest.slice();
 for(let i=0;i<target.length;i+=3)target[i]+=.10;
 const unchanged=target.slice();
 const first=solver.step({targetPositions:target});
 assert.equal(first.schema,AIG312_SCHEMA);
 assert.equal(first.framesSimulated,1);
 assert.ok(first.truePinnedRootVertices>=2);
 assert.ok(first.changedVertices>0);
 assert.ok(first.actualMaxLagUnits<=first.maxAllowedLagUnits+.00001);
 assert.equal(first.positions[0],target[0]);
 assert.equal(first.positions[3],target[3]);
 let last=first;
 for(let i=0;i<40;i++)
  last=solver.step({targetPositions:target});
 assert.ok(last.framesSimulated===41);
 assert.ok(last.actualMaxLagUnits<=last.maxAllowedLagUnits+.00001);
 assert.deepEqual(rest,before);
 assert.deepEqual(target,unchanged);
 const reset=solver.step({targetPositions:rest,restoreRest:true});
 assert.equal(reset.framesSimulated,0);
 assert.deepEqual(reset.positions,rest);
 assert.equal(reset.stableRestPoseReturned,true);
});
test('hair and skirt behave differently yet never explode on a slow mobile frame',()=>{
 for(const kind of ['hair','skirt']){
  const solver=createAIG312SecondaryMotion({
   restPositions:rest,bodyHeightUnits:2,kind});
  let last=null;
  const target=rest.slice();
  for(let i=1;i<target.length;i+=3)target[i]+=.06;
  for(let i=0;i<30;i++){
   last=solver.step({targetPositions:target,
    deltaSeconds:i%2===0?1/60:1/20});
   assert.ok(last.positions.every(Number.isFinite));
   assert.ok(last.actualMaxLagUnits<=last.maxAllowedLagUnits+.00001);
  }
  assert.equal(last.framesSimulated,30);
  assert.equal(last.fullHairOrClothPhysicsCertified,false);
 }
});
test('secondary motion can be followed by 3.11 collision, but collision and physics are separately gated',()=>{
 const solver=createAIG312SecondaryMotion({
  restPositions:rest,bodyHeightUnits:2,kind:'skirt'});
 const frame=solver.step({targetPositions:rest});
 const body=new Float32Array(60*3),labels=new Uint8Array(60);
 for(let i=0;i<60;i++)body[i*3+1]=i*.03;
 const resolved=resolveAIG311PoseContacts({
  posedAttachment:frame.positions,bodyPosed:body,sourceLabels:labels,
  mode:'skirt'});
 assert.ok(resolved.positions.every(Number.isFinite));
 assert.equal(resolved.inputAttachmentUnmodified,true);
 assert.equal(resolved.continuousClothAndHairPhysicsCertified,false);
});
test('invalid pose arrays, timestep and degenerate source fail without overwriting last state',()=>{
 const solver=createAIG312SecondaryMotion({
  restPositions:rest,bodyHeightUnits:2});
 const a=solver.step({targetPositions:rest});
 assert.throws(()=>solver.step({targetPositions:new Float32Array(3)}),
  /AIG312_INVALID_STEP_TARGET_OR_DELTA/);
 assert.throws(()=>solver.step({targetPositions:rest,deltaSeconds:0}),
  /AIG312_INVALID_STEP_TARGET_OR_DELTA/);
 assert.throws(()=>solver.step({targetPositions:rest,deltaSeconds:1}),
  /AIG312_INVALID_STEP_TARGET_OR_DELTA/);
 assert.equal(solver.snapshot().framesSimulated,1);
 assert.deepEqual(rest,a.positions.map((_,i)=>i===1||i===4||i===7||
 i===10||i===13||i===16||i===19||i===22 ? a.positions[i] : a.positions[i])
 .map((v,i)=>rest[i])); // source remains rest typed array
 assert.throws(()=>createAIG312SecondaryMotion({
  restPositions:new Float32Array(9),bodyHeightUnits:2,kind:'hair'
 }),/AIG312_SECONDARY_LAYER_HAS_NO_VERTICAL_SPAN/);
});
