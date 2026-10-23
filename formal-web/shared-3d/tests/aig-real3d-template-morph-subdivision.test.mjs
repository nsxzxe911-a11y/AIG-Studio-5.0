import test from 'node:test';
import assert from 'node:assert/strict';
import {buildAIGReal3DTemplateMorph,buildAIGReal3DTemplateScene,
 AIG_TEMPLATE_MORPH_SCHEMA}
 from '../aig-real3d-anatomical-template-morph.mjs';
import {buildAIGStage1AdultAnatomy}
 from '../aig-real3d-human-anatomy.mjs';
import {auditAIG3DScene}
 from '../aig-real3d-core.mjs';

for(const gender of ['male','female']){
 test('genuine one-cage template and subdivision geometry, '+gender,async()=>{
  let previous=null;
  for(const method of ['template-morph','subdivision']){
   const b=buildAIGReal3DTemplateMorph({gender,method});
   assert.equal(b.appearance.schema,AIG_TEMPLATE_MORPH_SCHEMA);
   assert.equal(b.appearance.method,method);
   assert.equal(b.appearance.gender,gender);
   assert.equal(b.appearance.actualConnectedComponents,1);
   assert.equal(b.appearance.nonManifoldEdges,0);
   assert.equal(b.appearance.topologyContinuousPASS,true);
   assert.equal(b.appearance.naturalHumanAppearancePASS,false);
   assert.equal(b.appearance.photoIdentityReconstructed,false);
   assert.equal(b.appearance.bodySegmentsNotIndependent,true);
   assert.ok(b.appearance.actualTriangles>8000);
   assert.ok(b.appearance.explicitHumanLandmarks>100);
   assert.equal(b.indices.length/3,b.appearance.actualTriangles);
   assert.equal(b.positions.length,b.normals.length);
   assert.ok(b.indices.every(i=>i>=0&&i<b.positions.length/3));
   assert.ok(b.positions.every(Number.isFinite));
   if(previous)assert.ok(b.indices.length>previous.indices.length*5,
    'Subdivision is true additional topology, not a renamed method');
   previous=b;
   const source={model:buildAIGStage1AdultAnatomy(gender),
    heightMm:gender==='male'?1780:1680,build:50};
   const compiled=await buildAIGReal3DTemplateScene({source,method});
   assert.equal(compiled.scene.nodes.length,1);
   assert.equal(compiled.scene.nodes[0].id,'singleAnatomicalTemplate');
   assert.equal(compiled.geometryEvidence.actualConnectedComponents,1);
   assert.equal(auditAIG3DScene(compiled.scene).triangleCount,
    b.appearance.actualTriangles);
   assert.equal(compiled.releasePASS,false);
  }
 });
}
test('width and height controls actually change native XYZ vertices',()=>{
 const lean=buildAIGReal3DTemplateMorph({
  gender:'female',method:'template-morph',heightMm:1580,build:0
 });
 const heavy=buildAIGReal3DTemplateMorph({
  gender:'female',method:'template-morph',heightMm:1840,build:100
 });
 assert.notDeepEqual(lean.positions,heavy.positions);
 const height=b=>Math.max(...b.positions.filter((_,i)=>i%3===1));
 assert.ok(height(heavy)>height(lean));
 const extents=b=>Math.max(...b.positions.filter((_,i)=>i%3===0))-
  Math.min(...b.positions.filter((_,i)=>i%3===0));
 assert.ok(extents(heavy)>extents(lean));
 assert.equal(lean.appearance.stage1ReleasePASS,false);
 assert.equal(heavy.appearance.stage1ReleasePASS,false);
});
test('foot contour is planar near Y0 instead of circular metaball spheres',()=>{
 const b=buildAIGReal3DTemplateMorph({gender:'male'});
 const ys=b.positions.filter((_,i)=>i%3===1);
 assert.ok(Math.min(...ys)<=.004);
 assert.ok(Math.min(...ys)>=-1e-4);
 assert.ok(b.appearance.handsFeetScalpContoursFromLandmarks);
});
test('invalid method, wrong gender and unsupported morphology are blocked',()=>{
 assert.throws(()=>buildAIGReal3DTemplateMorph({gender:'other'}),/GENDER/);
 assert.throws(()=>buildAIGReal3DTemplateMorph({method:'sdf'}),/METHOD/);
 assert.throws(()=>buildAIGReal3DTemplateMorph({heightMm:700}),/MORPH_PARAMETER_RANGE/);
 assert.throws(()=>buildAIGReal3DTemplateMorph({build:500}),/MORPH_PARAMETER_RANGE/);
});
