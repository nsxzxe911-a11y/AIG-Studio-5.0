import test from 'node:test';
import assert from 'node:assert/strict';
import {planAIGReal3DNative4K,auditAIGReal3D4KSourceProjection,
 captureAIGReal3DNative4K}
 from '../aig-real3d-v96-native-4k-pipeline.mjs';
import {createAIG3DScene,createAIG3DMesh,addAIG3DNode}
 from '../aig-real3d-core.mjs';
const sha='f'.repeat(64);
const camera={projection:'orthographic',yaw:0,pitch:0,distance:4,
 focus:[0,0,0],orthoSpan:2.4,fovDeg:55};
function surface(n=24,scale=1){
 const points=[],normals=[],indices=[];
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  let px=(x/(n-1)-.5)*scale,py=(y/(n-1)-.5)*scale,
   pz=Math.sin(x*Math.PI*2/(n-1))*.025;
  points.push(px,py,pz);normals.push(0,0,1);
 }
 for(let y=0;y<n-1;y++)for(let x=0;x<n-1;x++){
  const k=y*n+x;
  indices.push(k,k+1,k+n,k+1,k+n+1,k+n);
 }
 const scene=createAIG3DScene({id:'v96originalSurface',
  consumer:'FastModel',units:'METERS',
  source:'NONHUMAN_SOURCE_ORIGIN_QA_3D'});
 const mesh=createAIG3DMesh({positions:points,normals,indices,
  provenance:'V96_QA_SURFACE_NOT_A_HUMAN_SCAN'});
 addAIG3DNode(scene,{id:'sample',mesh,kind:'object',
  source:'TRUE_INDEXED_GEOMETRY_QA_ONLY'});
 return {scene,mesh};
}
test('V96 native UHD_4K is exactly 3840×2160 not upscaled 1080p',()=>{
 const p=planAIGReal3DNative4K();
 assert.equal(p.width,3840);
 assert.equal(p.height,2160);
 assert.equal(p.nativeFramebufferPixels,8294400);
 assert.equal(p.cpuGpuRGBABytesPerBuffer,33177600);
 assert.equal(p.hardwareBudgetPASS,true);
 assert.equal(p.outputResampledFromSmallerBitmap,false);
 assert.equal(p.realHDR10,false);assert.equal(p.truePBRLightingCertified,false);
 assert.equal(p.actualGPUFPS,null);assert.equal(p.releasePASS,false);
});
test('V96 4K hardware caps strictly block and do not silently fall back to scaled 1080p',()=>{
 assert.equal(planAIGReal3DNative4K({gpuLimit:2048}).hardwareBudgetPASS,false);
 assert.equal(planAIGReal3DNative4K({maxFramePixels:3100000}).hardwareBudgetPASS,false);
 assert.equal(planAIGReal3DNative4K({estimatedWorkingMemoryMB:32}).hardwareBudgetPASS,false);
 assert.equal(planAIGReal3DNative4K({output:'UHD_2K'}).nativeFramebufferPixels,3686400);
 assert.equal(planAIGReal3DNative4K({output:'FULL_HD'}).nativeFramebufferPixels,2073600);
 assert.throws(()=>planAIGReal3DNative4K({output:'FAKE_8K'}),/HARDWARE_OUTPUT_OR_SOURCE_BUDGET_INVALID/);
});
test('V96 projected actual source triangle screen-space edges flag low-poly/underspecified 4K',()=>{
 const {scene,mesh}=surface(12,2);
 const before=JSON.stringify(mesh);
 const p=auditAIGReal3D4KSourceProjection({scene,sourceSha256:sha,camera});
 assert.equal(p.width,3840);
 assert.equal(p.sourceTriangles,242);
 assert.ok(p.maxSourceEdgePixels>20);
 assert.equal(p.sourceDetailCandidatePASS,false);
 assert.equal(p.originalMeshFacesAdded,0);
 assert.equal(JSON.stringify(mesh),before);
});
test('V96 dense geometry source can pass projected edge budget without changing triangles',()=>{
 const {scene,mesh}=surface(150,.20);
 const p=auditAIGReal3D4KSourceProjection({scene,sourceSha256:sha,camera});
 assert.equal(p.sourceTriangles,44402);
 assert.equal(p.sourceDetailCandidatePASS,true);
 assert.equal(p.sourceEdgesAbove4KDetailLimit,0);
 assert.equal(p.sourceMaterialTextureResolutionVerified,false);
 assert.equal(p.native4KHumanVisualAcceptancePASS,false);
 assert.equal(mesh.indices.length,44402*3);
});
test('V96 no fake external hash or invalid original meshes',()=>{
 const {scene}=surface();
 assert.throws(()=>auditAIGReal3D4KSourceProjection({
  scene,sourceSha256:'not-a-sha',camera}),/SOURCE_GEOMETRY_CAMERA_OR_RESOLUTION_INVALID/);
 assert.throws(()=>auditAIGReal3D4KSourceProjection({
  scene,sourceSha256:sha,camera:{...camera,orthoSpan:0}}),
 /SOURCE_GEOMETRY_CAMERA_OR_RESOLUTION_INVALID/);
});
test('V96 rejected native-4K renderer cannot produce a false 4K PNG',async()=>{
 const {scene}=surface();
 await assert.rejects(()=>captureAIGReal3DNative4K({
  renderer:{status:'READY',getGpuLimit:()=>2048},
  scene,sourceSha256:sha
 }),/NATIVE_FRAMEBUFFER_MEMORY_OR_HARDWARE_BLOCK/);
});
