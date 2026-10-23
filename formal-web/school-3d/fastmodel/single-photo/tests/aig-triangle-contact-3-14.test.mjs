import test from 'node:test';
import assert from 'node:assert/strict';
import {AIG314_CONTACT_SCHEMA,buildAIG314BodyTriangleGrid,
 resolveAIG314TriangleContacts}
 from '../aig-triangle-contact-3-14.mjs';

function realTriangleBody(label=14){
 // One actual indexed 3D sheet with nonzero y extent and positive-Z normal.
 const vertices=new Float32Array([
  -.25,0,0,.25,0,0,-.25,1.4,0,.25,1.4,0
 ]);
 return {vertices,indices:new Uint32Array([0,1,2,1,3,2]),
  labels:new Uint8Array(4).fill(label)};
}
test('actual posed SOURCE BODY TRIANGLES contact hair and skirt, not a coarse sphere',()=>{
 for(const [mode,label] of [['hair',14],['skirt',10]]){
  const b=realTriangleBody(label),before=b.vertices.slice();
  const grid=buildAIG314BodyTriangleGrid({
   bodyPosed:b.vertices,bodyIndices:b.indices,sourceLabels:b.labels,mode
  });
  assert.equal(grid.schema,AIG314_CONTACT_SCHEMA);
  assert.equal(grid.actualSourceBodyTriangles,2);
  const garment=new Float32Array([
    0,.7,-.001, .08,.7,.007, 9,.7,-.003
  ]);
  const out=resolveAIG314TriangleContacts({
   posedAttachment:garment,bodyPosed:b.vertices,bodyIndices:b.indices,
   sourceLabels:b.labels,mode,grid,clearanceRatio:.002,
   maxCorrectionRatio:.03
  });
  assert.equal(out.actualPosedBodyTrianglesInGrid,2);
  assert.ok(out.actualTriangleContactCandidates>=1);
  assert.ok(out.actualProjectedAttachmentVertices>=1);
  assert.ok(out.sourceTriangleChecks>0);
  assert.ok(out.positions[2]>garment[2]);
  assert.equal(out.positions[8],garment[8]); // far point untouched
  assert.deepEqual(garment,new Float32Array([
    0,.7,-.001, .08,.7,.007, 9,.7,-.003
  ]));
  assert.deepEqual(b.vertices,before);
  assert.equal(out.continuousTriangleTriangleCCDProven,false);
  assert.equal(out.zeroSkirtHairSelfIntersectionProven,false);
 }
});
test('contact correction is bounded for deeper penetration and discloses unresolved shifts',()=>{
 const b=realTriangleBody();
 const garment=new Float32Array([0,.7,-.04]);
 const out=resolveAIG314TriangleContacts({
  posedAttachment:garment,bodyPosed:b.vertices,bodyIndices:b.indices,
  sourceLabels:b.labels,mode:'hair',
  maxCorrectionRatio:.005
 });
 assert.ok(out.actualProjectedAttachmentVertices>=1);
 assert.ok(out.maximumAppliedCorrectionUnits<=out.perVertexCorrectionLimitUnits+1e-8);
 assert.ok(out.unresolvedBoundedDisplacements>=1);
});
test('missing source-class triangles fail visible proof, do not synthesize a collider',()=>{
 const b=realTriangleBody(0);
 const result=resolveAIG314TriangleContacts({
  posedAttachment:new Float32Array([0,.7,-.001]),
  bodyPosed:b.vertices,bodyIndices:b.indices,sourceLabels:b.labels,
  mode:'skirt'
 });
 assert.equal(result.actualPosedBodyTrianglesInGrid,0);
 assert.equal(result.actualProjectedAttachmentVertices,0);
 assert.equal(result.positions[2],-.0010000000474974513);
});
test('misindexed, invalid or exceeding resource budget cannot clear the source',()=>{
 const b=realTriangleBody();
 assert.throws(()=>buildAIG314BodyTriangleGrid({
  bodyPosed:b.vertices,bodyIndices:new Uint32Array([99,1,2]),
  sourceLabels:b.labels,mode:'hair'
 }),/AIG314_TRIANGLE_INDEXED_REAL_POSENORMAL_CLASS_DATA_REQUIRED/);
 assert.throws(()=>buildAIG314BodyTriangleGrid({
  bodyPosed:b.vertices,bodyIndices:b.indices,
  sourceLabels:b.labels,mode:'hair',maxGridReferences:100
 }),/AIG314_TRIANGLE_GRID_BUDGET_INVALID|AIG314_TRIANGLE_SPATIAL_GRID_MEMORY_BUDGET_REACHED/);
 assert.throws(()=>resolveAIG314TriangleContacts({
  posedAttachment:new Float32Array([NaN,1,0]),
  bodyPosed:b.vertices,bodyIndices:b.indices,sourceLabels:b.labels,
  mode:'hair'
 }),/AIG314_TRIANGLE_VALID_ATTACHMENT_AND_CONTACT_LIMITS_REQUIRED/);
});
