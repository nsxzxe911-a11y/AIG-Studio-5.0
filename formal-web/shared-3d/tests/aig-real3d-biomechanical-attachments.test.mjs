import test from 'node:test';
import assert from 'node:assert/strict';
import {AIG_REAL3D_V93_SPECIES,AIG_REAL3D_V93_KINDS,
 createAIGReal3DBiomechanicalAttachments}
 from '../aig-real3d-biomechanical-attachments.mjs';
import {buildAIGReal3DV93FourSpeciesQA}
 from '../aig-real3d-v93-qa-fixture.mjs';

test('V93 one four-species engine with real source-authored 3D attachment faces',()=>{
 assert.deepEqual(AIG_REAL3D_V93_SPECIES,
  ['HUMAN','QUADRUPED','BIRD','FISH']);
 for(const species of AIG_REAL3D_V93_SPECIES){
  const fixture=buildAIGReal3DV93FourSpeciesQA({species});
  const {engine,attachmentSource}=fixture;
  assert.ok(AIG_REAL3D_V93_KINDS.includes(engine.kinds[0]));
  assert.equal(engine.sourceAttachmentCount,1);
  assert.equal(attachmentSource.triangleCount,288);
  assert.equal(fixture.explicitlyNONHUMAN_QA,true);
  assert.equal(engine.stats().independentAnimalScanVerified,false);
  const original=JSON.stringify(attachmentSource);
  const a=engine.pose(0),b=engine.pose(.5),c=engine.pose(1);
  assert.notDeepEqual(a.attachments.testAttachment.positions,
   c.attachments.testAttachment.positions);
  assert.ok(Math.abs(engine.secondaryAt('testAttachment',.5))>1e-6);
  assert.equal(JSON.stringify(attachmentSource),original);
  assert.deepEqual(a.attachments.testAttachment.indices,attachmentSource.indices);
  assert.ok(b.attachments.testAttachment.normals.every(Number.isFinite));
 }
});
test('V93 all roots PINNED by bones while flexible tips spring independently',()=>{
 const f=buildAIGReal3DV93FourSpeciesQA({species:'BIRD'});
 const {engine,manifest}=f,source=manifest.items[0].mesh;
 const q=engine.pose(.37).attachments.testAttachment;
 const rigid=engine.rig.sample(.37).worlds.get('wrist');
 const apply=(t,p)=>t.basis.map(row=>row.reduce((s,v,i)=>s+v*p[i],0))
  .map((v,i)=>v+t.shift[i]);
 for(const i of manifest.items[0].pinnedVertices){
  const expected=apply(rigid,source.positions.slice(i*3,i*3+3));
  const got=q.positions.slice(i*3,i*3+3);
  for(let k=0;k<3;k++)assert.ok(Math.abs(got[k]-expected[k])<1e-8);
 }
 assert.notDeepEqual(q.positions.slice(-3),
  source.positions.slice(-3));
});
test('V93 physical spring responds to authored flow rather than just moving a texture',()=>{
 const calm=buildAIGReal3DV93FourSpeciesQA({species:'FISH',flowSpeed:0});
 const flowing=buildAIGReal3DV93FourSpeciesQA({species:'FISH',flowSpeed:2});
 const a=calm.engine.secondaryAt('testAttachment',.6),
  b=flowing.engine.secondaryAt('testAttachment',.6);
 assert.ok(Math.abs(a-b)>.001);
 assert.equal(flowing.engine.stats().originalSourceTopologyImmutable,true);
 assert.equal(flowing.engine.stats().highFidelityHairFeatherClothFluidVerified,false);
});
test('V93 HALF_WRAP keeps same full skeleton and all source attachment physics',()=>{
 const full=buildAIGReal3DV93FourSpeciesQA({species:'QUADRUPED',wrapMode:'FULL_WRAP'});
 const half=buildAIGReal3DV93FourSpeciesQA({species:'QUADRUPED',wrapMode:'HALF_WRAP'});
 assert.deepEqual(full.engine.pose(.6),half.engine.pose(.6));
 assert.equal(half.engine.stats().allBonesCalculatedInFULLandHALF,true);
});
test('V93 source mismatch, unpinned roots and invalid hinge/stiffness are blocked',()=>{
 const {prior,manifest}=buildAIGReal3DV93FourSpeciesQA({species:'HUMAN'});
 const opts={rig:prior.rig,manifest};
 const clone=()=>structuredClone(manifest);
 const mismatch=clone();mismatch.sourceSha256='f'.repeat(64);
 assert.throws(()=>createAIGReal3DBiomechanicalAttachments({...opts,manifest:mismatch}),
  /SOURCE_SPECIES_OR_MANIFEST_MISMATCH/);
 const noPin=clone();noPin.items[0].flexWeights[0]=.25;
 assert.throws(()=>createAIGReal3DBiomechanicalAttachments({...opts,manifest:noPin}),
  /ATTACHMENT_PINNED_ROOT_OR_FLEX_INVALID/);
 const axis=clone();axis.items[0].hingeAxis=[0,0,0];
 assert.throws(()=>createAIGReal3DBiomechanicalAttachments({...opts,manifest:axis}),
  /ATTACHMENT_SOURCE_WEIGHTS_OR_HINGE_INVALID/);
 const noFlow=clone();noFlow.items[0].stiffness=-2;
 assert.throws(()=>createAIGReal3DBiomechanicalAttachments({...opts,manifest:noFlow}),
  /ATTACHMENT_SOURCE_WEIGHTS_OR_HINGE_INVALID/);
});
test('V93 combined GPU 3D actor and flex surfaces use bufferSubData without rebuilding original indices',()=>{
 const f=buildAIGReal3DV93FourSpeciesQA({species:'BIRD',wrapMode:'HALF_WRAP'});
 const original=JSON.stringify(f.attachmentSource),
  originalSkin=JSON.stringify(f.prior.mesh);
 let calls=0,updates=0;
 const fake={
  render(scene){
   calls++;
   const count=scene.nodes.reduce((s,n)=>s+(n.visible?n.mesh.triangleCount:0),0);
   return {status:'WEBGL_XYZ_TRIANGLES_RENDERED',triangles:count};
  },
  updateMeshVertices(mesh,{positions,normals,changedVertexIndices}){
   updates+=changedVertexIndices.length;
   for(const i of changedVertexIndices)for(let k=0;k<3;k++){
    mesh.positions[i*3+k]=positions[i*3+k];
    mesh.normals[i*3+k]=normals[i*3+k];
   }
   return {originalIndexBufferReused:true,fullGPUBufferReallocation:false,
    positionSubDataCalls:1,normalSubDataCalls:1};
  }
 };
 f.engine.renderFrame(fake,0);
 const r=f.engine.renderFrame(fake,.5,{visibleAttachmentIds:[]});
 assert.equal(r.originalSkeletonJointsStillAllAnimated,2);
 assert.ok(calls>=3);
 assert.ok(updates>0);
 assert.equal(JSON.stringify(f.attachmentSource),original);
 assert.equal(JSON.stringify(f.prior.mesh),originalSkin);
 assert.equal(f.engine.stats().productionPASS,false);
 assert.equal(f.engine.scene.nodes.at(-1).visible,false);
});
