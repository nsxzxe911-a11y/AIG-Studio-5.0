import test from 'node:test';
import assert from 'node:assert/strict';
import {createAIG3DMesh,createAIG3DScene,addAIG3DNode}
 from '../aig-real3d-core.mjs';
import {AIG_REAL3D_V92_RIG_SCHEMA,createAIGReal3DRigWrap,
 simulateAIGReal3DRigSportContact}
 from '../aig-real3d-rig-wrap-contact.mjs';
const sourceSha='a'.repeat(64),r=.0335;
function makeFixture(){
 const mesh=createAIG3DMesh({
  positions:[-.4,1.1,0,.4,1.1,0,.4,2,0,-.4,2,0],
  normals:[0,0,1,0,0,1,0,0,1,0,0,1],
  indices:[0,1,2,0,2,3],provenance:'SOURCE_AUTHORED_NONHUMAN_ARTICULATED_SURFACE'});
 const scene=createAIG3DScene({id:'v92src',consumer:'FastModel',units:'METERS',
  source:'MANUALLY_AUTHORED_NONHUMAN_ANIMATED_RIG_TEST'});
 addAIG3DNode(scene,{id:'originalArm',mesh,kind:'character',
  source:'ORIGINAL_NONHUMAN_VERTEX_SOURCE'});
 const rig={schema:AIG_REAL3D_V92_RIG_SCHEMA,sourceSha256:sourceSha,
  nodeRigs:[{nodeId:'originalArm',joints:[
   {id:'root',parentId:null,bindPivot:[0,1,0],axis:[0,0,1],minDeg:-10,maxDeg:10},
   {id:'wrist',parentId:'root',bindPivot:[-r,1,0],axis:[0,0,1],
    minDeg:-15,maxDeg:15}
  ],weights:[
   [{jointId:'root',weight:1}], [{jointId:'root',weight:1}],
   [{jointId:'wrist',weight:1}], [{jointId:'wrist',weight:1}]
  ]}],
  anchors:[{id:'rightHand',actorId:'actor1',jointId:'wrist',
   apparatus:'RACKET',bindPoint:[-r,2,0]}]};
 const frames=[{timeSec:0,anglesDeg:{root:0,wrist:6}},
  {timeSec:.5,anglesDeg:{root:0,wrist:0}},
  {timeSec:1,anglesDeg:{root:0,wrist:-6}}];
 return {scene,rig,frames,mesh};
}
function build(opts={}){
 const s=makeFixture();return {...s,wrap:createAIGReal3DRigWrap({
  sourceScene:s.scene,manifest:s.rig,sourceSha256:sourceSha,
  keyframes:s.frames,...opts})};
}
test('V92 original topology remains immutable while real joint rotations skin vertices',()=>{
 const {wrap,mesh,scene}=build(),original=JSON.stringify(mesh);
 const early=wrap.pose(0),center=wrap.pose(.5),late=wrap.pose(1);
 assert.equal(wrap.boneCount,2);
 assert.deepEqual(early.meshes.originalArm.indices,mesh.indices);
 assert.notDeepEqual(early.meshes.originalArm.positions,center.meshes.originalArm.positions);
 assert.notDeepEqual(center.meshes.originalArm.positions,late.meshes.originalArm.positions);
 assert.equal(JSON.stringify(mesh),original);
 assert.notEqual(wrap.workingScene.nodes[0].mesh,mesh);
 assert.equal(scene.nodes[0].mesh,mesh);
 assert.equal(wrap.stats().originalSourceNeverWritten,true);
});
test('V92 FULL and HALF modes compute identical complete rig poses and hidden joint anchors',()=>{
 const a=build({wrapMode:'FULL_WRAP'}).wrap,
  b=build({wrapMode:'HALF_WRAP'}).wrap;
 assert.deepEqual(a.pose(.28).meshes,b.pose(.28).meshes);
 assert.deepEqual(a.anchorAt('rightHand',.37),b.anchorAt('rightHand',.37));
 assert.equal(b.stats().fullSkeletonAlwaysEvaluated,true);
});
test('V92 actual hand/racket position and finite-difference velocity generate V91 ball impulse',()=>{
 const {wrap}=build();
 const result=simulateAIGReal3DRigSportContact({
  rig:wrap,anchorId:'rightHand',sport:'TENNIS',
  impactTimeSec:.5,initialPosition:[0,2,0],
  durationSec:.85,airDensity:0,gravity:0,surfaces:[]
 });
 assert.ok(result.contactDistanceErrorM<1e-8);
 assert.ok(result.closingSpeedMps>.05);
 assert.equal(result.event.type,'IMPACT');
 assert.equal(result.event.actorId,'actor1');
 assert.equal(result.event.apparatus,'RACKET');
 assert.ok(result.sourceDerivedSurfaceVelocity[0]>.05);
 assert.equal(result.physicsImpulseApplied,true);
 assert.ok(result.trajectory.frames.at(-1).position[0]>0);
 assert.equal(result.releasePASS,undefined);
 assert.equal(result.trajectory.diagnostics.releasePASS,false);
});
test('V92 working GPU delta uses original index buffers, never mutates original input mesh',()=>{
 const {wrap,mesh}=build(),original=JSON.stringify(mesh),draws=[];
 const gpu={
  render:scene=>{
   draws.push(scene.nodes.map(n=>({v:n.visible,
    p:n.mesh.positions[6],q:n.mesh.positions[9]})));
   return {status:'WEBGL_XYZ_TRIANGLES_RENDERED',triangles:2};
  },
  updateMeshVertices:(m,{positions,normals,changedVertexIndices})=>{
   for(const i of changedVertexIndices)for(let k=0;k<3;k++){
    m.positions[3*i+k]=positions[3*i+k];
    m.normals[3*i+k]=normals[3*i+k];
   }
   return {originalIndexBufferReused:true,fullGPUBufferReallocation:false,
    positionSubDataCalls:1,normalSubDataCalls:1};
  }
 };
 wrap.updateGPU(gpu,0);
 wrap.updateGPU(gpu,.5);
 assert.equal(JSON.stringify(mesh),original);
 assert.ok(wrap.stats().gpuSubDataCalls>0);
 assert.equal(wrap.stats().real3DFramesRendered,2);
 assert.notDeepEqual(draws[1],draws[2]);
});
test('V92 source provenance and missing weights, cycles, limits are hard BLOCK',()=>{
 const s=makeFixture(),base={sourceScene:s.scene,manifest:s.rig,
  sourceSha256:sourceSha,keyframes:s.frames};
 assert.throws(()=>createAIGReal3DRigWrap({...base,sourceSha256:'b'.repeat(64)}),
  /SOURCE_RIG_OR_FRAMES_MISMATCH/);
 const m=structuredClone(s.rig);m.nodeRigs[0].weights[3]=[{jointId:'wrist',weight:.7}];
 assert.throws(()=>createAIGReal3DRigWrap({...base,manifest:m}),
  /VERTEX_WEIGHTS_MUST_SUM_ONE/);
 const altered=structuredClone(s.rig);altered.nodeRigs[0].joints[1].axis=[0,0,0];
 assert.throws(()=>createAIGReal3DRigWrap({...base,manifest:altered}),
  /JOINT_PARENT_AXIS_OR_LIMIT_INVALID/);
 const wrongFrame=structuredClone(s.frames);wrongFrame[2].anglesDeg.wrist=90;
 assert.throws(()=>createAIGReal3DRigWrap({...base,keyframes:wrongFrame}),
  /JOINT_ANGLE_LIMIT_VIOLATION/);
});
test('V92 impossible unobserved contact is not fabricated',()=>{
 const {wrap}=build();
 assert.throws(()=>simulateAIGReal3DRigSportContact({
  rig:wrap,anchorId:'rightHand',sport:'TENNIS',
  impactTimeSec:.5,initialPosition:[1,2,0],
  durationSec:.8,airDensity:0,gravity:0,surfaces:[]}),
 /RIG_BALL_SURFACE_CONTACT_DISTANCE_BLOCK/);
 assert.throws(()=>simulateAIGReal3DRigSportContact({
  rig:wrap,anchorId:'rightHand',sport:'SOCCER',
  impactTimeSec:.5,initialPosition:[0,2,0],
  durationSec:.8,airDensity:0,gravity:0,surfaces:[]}),
 /RIG_BALL_SURFACE_CONTACT_DISTANCE_BLOCK/);
});
