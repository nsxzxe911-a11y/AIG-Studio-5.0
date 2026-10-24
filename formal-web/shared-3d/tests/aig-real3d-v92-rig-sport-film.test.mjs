import test from 'node:test';
import assert from 'node:assert/strict';
import {buildAIGReal3DV92NonhumanQA}
 from '../aig-real3d-v92-qa-fixture.mjs';
test('V92 4418-face test-only source rig and five sports share real contact contract',()=>{
 for(const sport of ['BASEBALL','TENNIS','BASKETBALL','SOCCER','TABLE_TENNIS']){
  const f=buildAIGReal3DV92NonhumanQA({sport});
  assert.equal(f.mesh.triangleCount,4418);
  assert.ok(f.contact.closingSpeedMps>.05);
  assert.equal(f.contact.physicsImpulseApplied,true);
  assert.equal(f.film.contact.trajectory.actorContacts[0].type,'ACTOR_IMPACT');
  assert.equal(f.film.scene.nodes.length,3);
  assert.equal(f.verifiedHumanOrAnimalSkin,false);
  assert.equal(f.film.stats().releasePASS,false);
 }
});
test('V92 actual single GPU scene combines source skinned actor and source 3D ball',()=>{
 const f=buildAIGReal3DV92NonhumanQA({sport:'TENNIS'});
 const original=JSON.stringify(f.mesh),frames=[],updates=[];
 const fake={
  render:s=>{
   frames.push({triangles:s.nodes.reduce((sum,n)=>sum+(n.visible?n.mesh.triangleCount:0),0),
    ball:[...s.nodes[1]?.transform.position??[0,0,0]],
    actorY:s.nodes[0].mesh.positions[10]});
   return {status:'WEBGL_XYZ_TRIANGLES_RENDERED',
    triangles:frames.at(-1).triangles};
  },
  updateMeshVertices:(mesh,{positions,normals,changedVertexIndices})=>{
   updates.push(changedVertexIndices.length);
   for(const idx of changedVertexIndices)for(let i=0;i<3;i++){
    mesh.positions[3*idx+i]=positions[3*idx+i];
    mesh.normals[3*idx+i]=normals[3*idx+i];
   }
   return {originalIndexBufferReused:true,fullGPUBufferReallocation:false,
    positionSubDataCalls:1,normalSubDataCalls:1};
  }
 };
 const a=f.film.renderFrame(fake,0),b=f.film.renderFrame(fake,60),
  c=f.film.renderFrame(fake,f.film.frameCount-1);
 assert.ok(a.actorAndBallRenderedInSameGPUFrame);
 assert.ok(b.trueActorSkinGPUVertexUpdates>0);
 assert.ok(c.triangles>6000);
 assert.ok(updates.some(x=>x>10));
 assert.equal(JSON.stringify(f.mesh),original);
 assert.ok(f.film.stats().actualCombinedGPURenders===3);
 assert.notDeepEqual(a.ballXYZ,c.ballXYZ);
});
test('V92 HALF_WRAP never turns off bone motion or removes 3D triangles',()=>{
 const f=buildAIGReal3DV92NonhumanQA({wrapMode:'HALF_WRAP'});
 const original=JSON.stringify(f.mesh);
 const calls=[],renderer={
  render:s=>({status:'WEBGL_XYZ_TRIANGLES_RENDERED',
   triangles:s.nodes.reduce((x,n)=>x+(n.visible?n.mesh.triangleCount:0),0)}),
  updateMeshVertices:(m,{positions,normals,changedVertexIndices})=>{
   calls.push(changedVertexIndices.length);
   for(const i of changedVertexIndices)for(let j=0;j<3;j++){
    m.positions[3*i+j]=positions[3*i+j];
    m.normals[3*i+j]=normals[3*i+j];
   }
   return {originalIndexBufferReused:true,fullGPUBufferReallocation:false,
    positionSubDataCalls:1,normalSubDataCalls:1};
  }
 };
 f.rig.updateGPU(renderer,0,{showNodes:[]});
 const before=f.rig.sample(0).anchorPoints.racketImpact,
  after=f.rig.sample(.5).anchorPoints.racketImpact;
 assert.notDeepEqual(before,after);
 assert.equal(f.rig.workingScene.nodes[0].visible,false);
 assert.equal(JSON.stringify(f.mesh),original);
 assert.equal(f.rig.stats().fullSkeletonAlwaysEvaluated,true);
});
