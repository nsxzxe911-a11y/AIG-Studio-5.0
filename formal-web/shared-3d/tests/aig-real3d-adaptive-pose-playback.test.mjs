import test from 'node:test';
import assert from 'node:assert/strict';
import {createAIGReal3DFrameGovernor,benchmarkAIGReal3DNativePosePlayback}
 from '../aig-real3d-adaptive-pose-playback.mjs';
import {createAIG3DScene,createAIG3DMesh,addAIG3DNode}
 from '../aig-real3d-core.mjs';
test('AUTO 30/60/90/120: genuine slow frames downgrade and long healthy interval recovers',()=>{
 const g=createAIGReal3DFrameGovernor({mode:'AUTO',initialHz:90});
 for(let t=100;t<800;t+=50){
  assert.equal(g.choose(t).draw,true);
  g.observe({renderWallMs:18});
 }
 assert.equal(g.snapshot().targetHz,30);
 assert.ok(g.snapshot().downshifts>=2);
 for(let i=0;i<50;i++){
  const a=g.choose(1000+i*35);
  if(a.draw)g.observe({renderWallMs:1});
 }
 assert.ok(g.snapshot().upshifts>0);
 assert.equal(g.snapshot().sourceAnatomyHumanPASS,false);
 assert.equal(g.snapshot().continuousNativeAnimationFPSCertified,false);
});
test('Invisible tabs and critical browser heap pressure never render, thermal without sensor remains UNKNOWN',()=>{
 const g=createAIGReal3DFrameGovernor({mode:120});
 assert.equal(g.choose(100,{visibility:'hidden'}).reason,'DOCUMENT_HIDDEN');
 assert.equal(g.choose(200,{heapUsedBytes:94,heapLimitBytes:100}).reason,'CRITICAL_HEAP_PAUSE');
 assert.equal(g.choose(300,{heapUsedBytes:85,heapLimitBytes:100}).reason,'CRITICAL_HEAP_PAUSE');
 const recovered=g.choose(400,{heapUsedBytes:74,heapLimitBytes:100});
 g.choose(430,{heapUsedBytes:88,heapLimitBytes:100});
 assert.equal(recovered.draw,true);
 assert.ok(g.snapshot().downshifts>=1);
 assert.equal(g.snapshot().actualDeviceTemperatureCelsius,null);
 assert.equal(g.snapshot().thermalSensorAccessible,false);
 assert.equal(g.snapshot().thermalProtectionCertified,false);
 assert.throws(()=>g.choose(500,{heapUsedBytes:-1}),/REAL3D_PLAYBACK_INVALID_FRAME_OBSERVATION/);
});
function makeScene(z){
 const scene=createAIG3DScene({id:'NONHUMAN_SOURCE_SCENE',
  consumer:'FastModel',units:'METERS',source:'NONHUMAN_ORIGINAL_GPU_SOURCE'});
 const count=1005,positions=[],normals=[],indices=[];
 for(let i=0;i<count;i++){
  const a=2*Math.PI*i/count;
  positions.push(Math.cos(a),Math.sin(a),z+(i%7)*.001);
  normals.push(0,0,1);
 }
 // 2,002 triangles of original indexed NONHUMAN fan.
 for(let i=1;i<1002;i++)indices.push(0,i,i+1,0,i+1,(i+2)%count);
 const mesh=createAIG3DMesh({positions,normals,indices,
  provenance:'NONHUMAN_INDEXED_SOURCE_SHA_QA'});
 addAIG3DNode(scene,{id:'real_original_source_0',mesh,kind:'character',
  material:{baseColor:[.5,.5,.5,1],roughness:.9,metallic:0}});
 return scene;
}
test('Real rAF governed GPU-source scenes reuse a single index buffer; do not invent 60FPS',async()=>{
 const scenes=[makeScene(0),makeScene(.06)];
 let timestamp=0,calls=0;
 const renderer={
  render(scene){calls++;return {status:'WEBGL_XYZ_TRIANGLES_RENDERED',
   triangles:scene.nodes[0].mesh.triangleCount};},
  updateMeshVertices(mesh,args){
   for(const i of args.changedVertexIndices)for(let k=0;k<3;k++){
    mesh.positions[i*3+k]=args.positions[i*3+k];
    mesh.normals[i*3+k]=args.normals[i*3+k];
   }
   return {originalIndexBufferReused:true,fullGPUBufferReallocation:false,
    changedVertexCount:args.changedVertexIndices.length,
    positionSubDataCalls:1,normalSubDataCalls:1};
  }
 };
 const result=await benchmarkAIGReal3DNativePosePlayback({
  renderer,poseScenes:scenes,mode:60,rafCallbacks:36,
  requestFrame:resolve=>resolve((timestamp+=16.667)),
  readVisibility:()=> 'visible',readMemory:()=>({used:null,limit:null})
 });
 assert.equal(result.schema,'AIG_REAL3D_SOURCE_POSE_ADAPTIVE_RAF_BUDGET_V1');
 assert.ok(result.actualSourceIndexedDraws>1);
 assert.ok(result.actualSourceIndexedDraws<=36);
 assert.equal(result.gpuOriginalIndexReusedForEveryDelta,true);
 assert.ok(result.gpuBufferSubDataCalls>0);
 assert.equal(result.sourcePoseSceneCount,2);
 assert.equal(result.releasePASS,false);
 assert.equal(result.fullAnimation60_90_120FPSGatePASS,false);
 assert.ok(calls>1);
});
test('No GPU scenes or forged renderer cannot produce a playback success',async()=>{
 await assert.rejects(benchmarkAIGReal3DNativePosePlayback({
  renderer:null,poseScenes:[makeScene(0),makeScene(.1)]
 }),/REAL3D_PLAYBACK_ACTUAL_GPU_POSE_SCENES_AND_RAF_REQUIRED/);
 assert.throws(()=>createAIGReal3DFrameGovernor({mode:'240'}),
  /REAL3D_PLAYBACK_INVALID_TARGET_HZ/);
});
