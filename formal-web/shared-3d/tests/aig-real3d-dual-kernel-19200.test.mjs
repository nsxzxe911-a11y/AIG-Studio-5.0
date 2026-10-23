import test from 'node:test';
import assert from 'node:assert/strict';
import {AIG_REAL3D_LOGICAL_BUDGET,inspectAIGReal3DSource,
 planAIGReal3DDual19200,executeAIGReal3DDual19200}
 from '../aig-real3d-dual-kernel-19200.mjs';
import {createAIG3DBox,createAIG3DScene,addAIG3DNode}
 from '../aig-real3d-core.mjs';

function source(){
 const scene=createAIG3DScene({id:'test-human',consumer:'FastModel',
  units:'METERS',source:'TEST_ONLY_PROCEDURAL_NOT_APPROVED'});
 addAIG3DNode(scene,{id:'torso',kind:'character',mesh:createAIG3DBox([1,2,.6]),
  source:'UNIT_TEST_NOT_REAL_HUMAN'});
 return {scene};
}
const stats=inspectAIGReal3DSource(source());
test('exact 19200 logical slots, BOTH unique work kernels, one existing WebGL context',()=>{
 const p=planAIGReal3DDual19200({sourceStats:stats,method:'auto',
  hardwareConcurrency:8,deviceMemoryGB:8,capabilities:{webgl:true},
  resolution:'preview'});
 assert.equal(AIG_REAL3D_LOGICAL_BUDGET,19200);
 assert.equal(p.totalLogicalWorkSlots,19200);
 assert.equal(p.drawingKernel.id,'DRAW_CPU_GEOMETRY');
 assert.equal(p.renderingKernel.id,'RENDER_EXISTING_GPU');
 assert.equal(p.drawingKernel.reservedSlots+p.renderingKernel.reservedSlots,19200);
 assert.equal(p.drawingKernel.queueRange[1],p.renderingKernel.queueRange[0]);
 assert.equal(p.renderingKernel.queueRange[1],19200);
 assert.equal(p.policy.actualPhysicalNewCores,0);
 assert.equal(p.renderingKernel.extraWebGLContextsCreated,0);
 assert.equal(p.renderingKernel.sharedWebGLContextCount,1);
 assert.equal(p.dispatchAllowed,true);
 assert.equal(p.drawingKernel.selectedMethod,'existing-mesh');
 assert.equal(p.policy.appearanceApproved,false);
});
test('auto adjusts allocation for workload, 1080p/4K, slow GPU, phone RAM',()=>{
 const big={sourceType:'indexed-scene',realWorkUnits:200000,
  actualSourceVertexCount:40000};
 const small={sourceType:'indexed-scene',realWorkUnits:20,
  actualSourceVertexCount:24};
 const p=sourceStats=>planAIGReal3DDual19200({
  sourceStats,method:'auto',hardwareConcurrency:8,
  capabilities:{webgl:true,maxRenderbufferSize:8192}
 });
 const a=p(big),b=p(small);
 assert.ok(a.drawingKernel.reservedSlots>b.drawingKernel.reservedSlots);
 const heavy=planAIGReal3DDual19200({
  sourceStats:small,hardwareConcurrency:8,deviceMemoryGB:8,
  recentFrameMs:43,resolution:'4k',
  capabilities:{webgl:true,maxRenderbufferSize:8192}
 });
 assert.ok(heavy.renderingKernel.reservedSlots>b.renderingKernel.reservedSlots);
 const phone=planAIGReal3DDual19200({
  sourceStats:big,hardwareConcurrency:8,deviceMemoryGB:2,
  resolution:'preview',mobile:true,capabilities:{webgl:true}
 });
 assert.ok(phone.drawingKernel.cooperativeCpuLanes<=2);
 assert.ok(phone.drawingKernel.reservedSlots<=11520);
 assert.equal(phone.totalLogicalWorkSlots,19200);
});
test('SDF/Metaball/Template are NEVER claimed to exist unless real methods installed',()=>{
 const p=planAIGReal3DDual19200({
  sourceStats:{sourceType:'photo-pixels',realWorkUnits:20000},
  method:'auto',capabilities:{webgl:true},hardwareConcurrency:4});
 assert.equal(p.dispatchAllowed,false);
 assert.ok(p.limitationReasons.includes('SELECTED_SURFACE_ALGORITHM_NOT_INSTALLED'));
 const sdf=planAIGReal3DDual19200({
  sourceStats:{sourceType:'photo-pixels',realWorkUnits:20000},
  method:'auto',registeredAlgorithms:['sdf'],
  capabilities:{webgl:true},hardwareConcurrency:4});
 assert.equal(sdf.drawingKernel.selectedMethod,'sdf');
 assert.equal(sdf.dispatchAllowed,true);
});
test('when GPU missing or native 4K impossible, render pipeline BLOCKS',()=>{
 const p=planAIGReal3DDual19200({
  sourceStats:stats,capabilities:{webgl:false},hardwareConcurrency:2
 });
 assert.equal(p.dispatchAllowed,false);
 assert.ok(p.limitationReasons.includes('REAL_WEBGL_RENDERER_REQUIRED'));
 const four=planAIGReal3DDual19200({
  sourceStats:stats,resolution:'4k',hardwareConcurrency:4,
  deviceMemoryGB:2,capabilities:{webgl:true,maxRenderbufferSize:2048}
 });
 assert.equal(four.dispatchAllowed,false);
 assert.ok(four.limitationReasons.includes('NATIVE_4K_GPU_CAPABILITY_NOT_CONFIRMED'));
});
test('real chunks validate indices then call the SAME GPU once, no fake cores',async()=>{
 const src=source();
 let frames=0,yields=0;
 const renderer={status:'READY',getCamera:()=>({yaw:0}),
  render:s=>{
   frames++;
   assert.strictEqual(s,src.scene);
   return {status:'WEBGL_XYZ_TRIANGLES_RENDERED',triangles:12}
  }};
 const result=await executeAIGReal3DDual19200({
  source:src,renderer,hardwareConcurrency:4,
  yieldControl:async()=>{yields++}
 });
 assert.equal(result.verifiedPipelineTraversal,true);
 assert.equal(result.metrics.drawingVisitedTriangles,12);
 assert.ok(result.metrics.drawingChunks>=1);
 assert.equal(result.metrics.renderPasses,1);
 assert.equal(frames,1);
 assert.equal(result.plan.totalLogicalWorkSlots,19200);
 assert.equal(result.appearanceVisuallyApproved,false);
});
test('fail-closed geometry gate refuses rendering and preserves source',async()=>{
 const src=source();let rendered=false;
 const renderer={status:'READY',getCamera:()=>({}),
  render:()=>{rendered=true;}};
 await assert.rejects(executeAIGReal3DDual19200({
  source:src,renderer,
  shouldAcceptGeometry:()=>false
 }),/GEOMETRY_APPEARANCE_GATE_BLOCKED/);
 assert.equal(rendered,false);
 assert.ok(src.scene.nodes.length);
});
test('aborted drawing refuses GPU; invalid real indexed mesh refuses acceptance',async()=>{
 const src=source(),abort=new AbortController();
 abort.abort();let renders=0;
 const renderer={status:'READY',getCamera:()=>({}),
  render:()=>{renders++;}};
 await assert.rejects(executeAIGReal3DDual19200({
  source:src,renderer,signal:abort.signal
 }),/CANCELLED_BEFORE_DRAWING/);
 assert.equal(renders,0);
 src.scene.nodes[0].mesh.indices[0]=99999;
 await assert.rejects(executeAIGReal3DDual19200({
  source:src,renderer
 }),/REAL_SOURCE_TRIANGLE_INDEX_INVALID/);
 assert.equal(renders,0);
});
test('source categorizer detects photo, human or real source mesh; refuses ambiguous',()=>{
 const photo={photo:{pixels:new Uint8Array(400),width:10,height:10}};
 assert.equal(inspectAIGReal3DSource(photo).sourceType,'photo-pixels');
 const model={parts:[{geometry:{
  positions:new Float32Array([0,0,0,1,0,0,0,1,0]),
  indices:new Uint32Array([0,1,2])}}],originCoordinates:{units:'mm'}};
 const m=inspectAIGReal3DSource({model});
 assert.equal(m.sourceType,'human-parts');
 assert.equal(m.hasSourceBoundMillimeters,true);
 assert.throws(()=>inspectAIGReal3DSource({...photo,...source()}),
  /EXACTLY_ONE_SOURCE_FORMAT_REQUIRED/);
});

test('separate actual CPU drawing Worker proof and GPU rendering are both mandatory',async()=>{
 const src=source();let frames=0,workers=0;
 const renderer={status:'READY',getCamera:()=>({}),render:()=>{
  frames++;
  return {status:'WEBGL_XYZ_TRIANGLES_RENDERED',triangles:12};
 }};
 const out=await executeAIGReal3DDual19200({
  source:src,renderer,
  drawingWorkerFactory:async ({scene,plan})=>{
   workers++;
   assert.strictEqual(scene,src.scene);
   assert.equal(plan.totalLogicalWorkSlots,19200);
   return {actualWorkerThreadsUsed:1,actualGpuContextsCreated:0,
    actualSourceTrianglesInspected:12,actualSourceVerticesInspected:24,
    realWorkChunks:3,degenerateTriangles:0};
  }
 });
 assert.equal(workers,1);
 assert.equal(frames,1);
 assert.equal(out.metrics.actualCpuWorkersUsed,1);
 assert.equal(out.metrics.renderPasses,1);
 assert.equal(out.metrics.drawingVisitedTriangles,12);
});
test('CPU worker cannot falsely return less source geometry or extra GPU contexts',async()=>{
 const src=source();let frames=0;
 const renderer={status:'READY',getCamera:()=>({}),
  render:()=>{frames++;return {status:'WEBGL_XYZ_TRIANGLES_RENDERED',triangles:12}}};
 for(const bad of [
  {actualWorkerThreadsUsed:1,actualGpuContextsCreated:1,
   actualSourceTrianglesInspected:12},
  {actualWorkerThreadsUsed:1,actualGpuContextsCreated:0,
   actualSourceTrianglesInspected:11}
 ]){
  await assert.rejects(executeAIGReal3DDual19200({
   source:src,renderer,drawingWorkerFactory:async()=>bad
  }),/REAL_DRAWING_WORKER_INTEGRITY_FAILED/);
 }
 assert.equal(frames,0);
});
test('real source body requires an installed geometry-to-scene converter, not fake automatic drawing',()=>{
 const model={parts:[{geometry:{
  positions:new Float32Array([0,0,0,1,0,0,0,1,0]),
  indices:new Uint32Array([0,1,2])}}]};
 const s=inspectAIGReal3DSource({model});
 const p=planAIGReal3DDual19200({
  sourceStats:s,hardwareConcurrency:4,capabilities:{webgl:true}
 });
 assert.equal(p.dispatchAllowed,false);
 assert.equal(p.drawingKernel.methodInstalled,false);
 assert.ok(p.limitationReasons.includes('SELECTED_SURFACE_ALGORITHM_NOT_INSTALLED'));
});
