import test from 'node:test';
import assert from 'node:assert/strict';
import {buildAIGStage1AdultAnatomy}
 from '../aig-real3d-human-anatomy.mjs';
import {createAIGHumanImplicitField,
 extractAIGReal3DIsosurface,buildAIGReal3DImplicitScene,
 AIG_IMPLICIT_SURFACE_SCHEMA}
 from '../aig-real3d-implicit-human-surfaces.mjs';
import {auditAIG3DScene} from '../aig-real3d-core.mjs';

for(const gender of ['male','female']){
 test('ACTUAL SDF / Metaball have one closed, indexed body for '+gender,async()=>{
  const source=buildAIGStage1AdultAnatomy(gender);
  const old=source.parts[0].geometry.positions.slice();
  const results=[];
  for(const method of ['sdf','metaball']){
   const field=createAIGHumanImplicitField(source,{method});
   assert.equal(field.schema,AIG_IMPLICIT_SURFACE_SCHEMA);
   assert.equal(field.sourceGender,gender);
   assert.ok(field.actualAnalyticPrimitives>=17);
   assert.ok(field.actualSourceJointCount>=21);
   // Unlike a new name on the old hard joints, both methods evaluate a
   // different true mathematical field at arbitrary continuous 3D points.
   const here=field.sample([0,source.heightMeters*.70,0]);
   const outside=field.sample([source.heightMeters*2,0,0]);
   assert.ok(Number.isFinite(here)&&here<0,method+' torso inside');
   assert.ok(outside>0,method+' outside');
   const out=extractAIGReal3DIsosurface(field,{resolution:'standard'});
   assert.equal(out.method,method);
   assert.equal(out.evidence.surfaceConnectedComponents,1);
   assert.equal(out.evidence.nonManifoldEdges,0);
   assert.equal(out.evidence.actualContinuousSurfaceTopologicalPASS,true);
   assert.equal(out.evidence.anatomicalVisualAppearancePASS,false);
   assert.ok(out.evidence.extractedTriangleCount>5000);
   assert.ok(out.evidence.uniqueSurfaceVertices>3000);
   assert.equal(out.indices.length%3,0);
   assert.ok(out.indices.every(x=>x>=0&&x<out.positions.length/3));
   assert.ok(out.positions.every(Number.isFinite));
   assert.ok(out.normals.every(x=>Number.isFinite(x)&&Math.abs(x)<=1.00001));
   const built=await buildAIGReal3DImplicitScene({
    source:{model:source},method,resolution:'standard'
   });
   assert.equal(built.scene.nodes.length,1,'no old disconnected anatomical parts');
   assert.equal(built.oneSurfaceMesh,true);
   assert.equal(built.releasePASS,false);
   assert.equal(built.scene.nodes[0].id,'continuousHumanSurface');
   assert.equal(auditAIG3DScene(built.scene).triangleCount,
    out.evidence.extractedTriangleCount);
   results.push(out.evidence.extractedTriangleCount);
  }
  assert.notEqual(results[0],results[1],
   'independent SDF and metaball must not return duplicate old geometry');
  assert.deepEqual(source.parts[0].geometry.positions,old,
   'original adult indexed source remains immutable');
 });
}
test('bad methods/source/stop signal fail closed',()=>{
 const source=buildAIGStage1AdultAnatomy('female');
 assert.throws(()=>createAIGHumanImplicitField(source,{method:'template-morph'}),
  /ALGORITHM_NOT_IMPLEMENTED/);
 const s=createAIGHumanImplicitField(source,{method:'sdf'});
 assert.throws(()=>extractAIGReal3DIsosurface(s,{resolution:'supersampled'}),
  /SCALAR_FIELD_AND_RESOLUTION_REQUIRED/);
 const controller=new AbortController();controller.abort();
 assert.throws(()=>extractAIGReal3DIsosurface(s,{signal:controller.signal}),
  /CANCELLED_DURING_ISOSURFACE/);
});
