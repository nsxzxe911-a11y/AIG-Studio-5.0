import test from 'node:test';
import assert from 'node:assert/strict';
import {createAIGReal3DHumanScene,AIG_REAL3D_HUMAN_LIVE_SCHEMA}
 from '../aig-real3d-human-bridge.mjs';
import {auditAIG3DScene} from '../aig-real3d-core.mjs';

for(const gender of ['male','female']){
 for(const age of ['child','adult','middle','elder']){
  test(gender+' '+age+' real XYZ human indexed mesh, no tree boxes, still visual BLOCK',()=>{
   const result=createAIGReal3DHumanScene({gender,age,build:50});
   const a=result.appearance,scene=result.scene;
   assert.equal(a.schema,AIG_REAL3D_HUMAN_LIVE_SCHEMA);
   assert.equal(a.gender,gender);assert.equal(a.age,age);
   assert.equal(scene.units,'METERS');
   assert.equal(a.releasePASS,false);
   assert.equal(a.visuallyNaturalAnatomyApproved,false);
   assert.equal(a.actualMeshTriangles,auditAIG3DScene(scene).triangleCount);
   assert.ok(a.actualMeshTriangles>3000);
   assert.ok(a.actualMeshVertices>1000);
   assert.ok(a.bodyParts>=17);
   assert.ok(scene.nodes.every(n=>n.kind==='character'));
   assert.ok(scene.nodes.every(n=>n.mesh.actualXYZTriangles===true));
   assert.ok(scene.nodes.every(n=>n.mesh.normals.length===n.mesh.positions.length));
   assert.ok(scene.nodes.every(n=>n.mesh.indices.every(x=>
    Number.isInteger(x)&&x<n.mesh.vertexCount)));
   assert.ok(Math.abs(a.footGroundMm)<=1);
   assert.equal(result.readOnly,true);
   assert.equal(result.sourceKind,'ACTUAL_STAGE1_3D_INDEXED_ANATOMY_TECHNICAL');
  });
 }
}
test('male/female are two independent geometry sources, not the same dummy box',()=>{
 const m=createAIGReal3DHumanScene({gender:'male'});
 const f=createAIGReal3DHumanScene({gender:'female'});
 assert.notEqual(m.appearance.heightMm,f.appearance.heightMm);
 assert.notEqual(m.scene.nodes[0].mesh.bounds.max[1],
  f.scene.nodes[0].mesh.bounds.max[1]);
 assert.ok(m.scene.nodes.some(x=>x.id==='human_swimBriefs'));
 assert.ok(f.scene.nodes.some(x=>x.id==='human_onePieceSwim'));
 assert.ok(!m.scene.nodes.some(x=>x.id==='building'||x.id==='treeCrown'));
});
test('height and body build are actual vertex geometry morph, not a fake slider',()=>{
 const a=createAIGReal3DHumanScene({heightMm:1650,build:5});
 const b=createAIGReal3DHumanScene({heightMm:2050,build:95});
 assert.equal(a.appearance.heightMm,1650);
 assert.equal(b.appearance.heightMm,2050);
 const meshA=a.scene.nodes.find(x=>x.id==='human_torso').mesh;
 const meshB=b.scene.nodes.find(x=>x.id==='human_torso').mesh;
 assert.ok(meshA.bounds.max[1]<meshB.bounds.max[1]);
 assert.ok(meshA.bounds.max[0]<meshB.bounds.max[0],
  'fat body geometry must really widen');
 assert.notDeepEqual(meshA.positions,meshB.positions);
 assert.equal(a.appearance.releasePASS,false);
 assert.equal(b.appearance.releasePASS,false);
});
test('invalid age, height and excessive body morph are refused',()=>{
 assert.throws(()=>createAIGReal3DHumanScene({age:'baby'}),/HUMAN_AGE/);
 assert.throws(()=>createAIGReal3DHumanScene({heightMm:3000}),/HUMAN_HEIGHT_MM/);
 assert.throws(()=>createAIGReal3DHumanScene({gender:'other'}),/HUMAN_GENDER/);
 assert.throws(()=>createAIGReal3DHumanScene({build:200}),/HUMAN_BODY_BUILD_RANGE/);
});
