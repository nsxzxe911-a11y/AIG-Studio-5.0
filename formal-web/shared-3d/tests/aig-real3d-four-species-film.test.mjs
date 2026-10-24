import test from 'node:test';
import assert from 'node:assert/strict';
import {buildAIGReal3DV93FourSpeciesQA}
 from '../aig-real3d-v93-qa-fixture.mjs';
import {createAIGReal3DFourSpeciesFilm}
 from '../aig-real3d-four-species-film.mjs';

test('V93 real 3D rig + source attachments + V91 sport ball share one scene',()=>{
 for(const species of ['HUMAN','QUADRUPED','BIRD','FISH']){
  const q=buildAIGReal3DV93FourSpeciesQA({species});
  const film=createAIGReal3DFourSpeciesFilm({
   secondary:q.engine,sportFilm:q.prior.film});
  assert.equal(film.scene.nodes.length,4);
  assert.equal(film.sportFilm.rig,q.engine.rig);
  assert.equal(film.frameCount,q.prior.film.frameCount);
  assert.equal(film.stats().releasePASS,false);
 }
});
test('V93 true indexed actor plus flexible source geometry plus ball, preserved original meshes',()=>{
 const q=buildAIGReal3DV93FourSpeciesQA({species:'BIRD'});
 const film=createAIGReal3DFourSpeciesFilm({
  secondary:q.engine,sportFilm:q.prior.film});
 const originalPatch=JSON.stringify(q.attachmentSource),
  originalSkin=JSON.stringify(q.prior.mesh);
 let renderCalls=0,updated=0;
 const renderer={
  render(scene){
   renderCalls++;
   return {status:'WEBGL_XYZ_TRIANGLES_RENDERED',
    triangles:scene.nodes.reduce((x,n)=>x+(n.visible?n.mesh.triangleCount:0),0)};
  },
  updateMeshVertices(mesh,{positions,normals,changedVertexIndices}){
   updated+=changedVertexIndices.length;
   for(const i of changedVertexIndices)for(let a=0;a<3;a++){
    mesh.positions[i*3+a]=positions[i*3+a];
    mesh.normals[i*3+a]=normals[i*3+a];
   }
   return {originalIndexBufferReused:true,fullGPUBufferReallocation:false,
    positionSubDataCalls:1,normalSubDataCalls:1};
  }
 };
 const a=film.renderFrame(renderer,0);
 const b=film.renderFrame(renderer,Math.floor(film.frameCount/2));
 const c=film.renderFrame(renderer,film.frameCount-1);
 assert.equal(a.sourceBodyAndAttachmentsAndBallOneFrame,true);
 assert.equal(b.originalActorJoints,2);
 assert.equal(c.attachmentsRealSourceTriangles,288);
 assert.ok(c.triangles>7000);
 assert.notDeepEqual(a.indexedXYZBallPosition,c.indexedXYZBallPosition);
 assert.ok(updated>0);
 assert.ok(renderCalls>=3);
 assert.equal(film.stats().actualCompleteGPUMovieFrames,3);
 assert.equal(JSON.stringify(q.attachmentSource),originalPatch);
 assert.equal(JSON.stringify(q.prior.mesh),originalSkin);
});
test('V93 HALF_WRAP never discards source joints when attached tip culled',()=>{
 const q=buildAIGReal3DV93FourSpeciesQA({species:'FISH',wrapMode:'HALF_WRAP'});
 const film=createAIGReal3DFourSpeciesFilm({
  secondary:q.engine,sportFilm:q.prior.film});
 const fakes={
  render:scene=>({status:'WEBGL_XYZ_TRIANGLES_RENDERED',
   triangles:scene.nodes.reduce((x,n)=>x+(n.visible?n.mesh.triangleCount:0),0)}),
  updateMeshVertices:(m,{positions,normals,changedVertexIndices})=>{
   for(const i of changedVertexIndices)for(let k=0;k<3;k++){
    m.positions[i*3+k]=positions[i*3+k];
    m.normals[i*3+k]=normals[i*3+k];
   }
   return {originalIndexBufferReused:true,fullGPUBufferReallocation:false,
    positionSubDataCalls:1,normalSubDataCalls:1};
  }
 };
 const frame=film.renderFrame(fakes,60,{visibleAttachments:[]});
 assert.equal(frame.originalActorJoints,2);
 assert.equal(q.engine.scene.nodes.find(n=>n.id==='V93testAttachment').visible,false);
 assert.equal(q.engine.stats().allBonesCalculatedInFULLandHALF,true);
});
