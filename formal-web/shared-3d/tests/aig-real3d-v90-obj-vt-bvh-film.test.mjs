import test from 'node:test';
import assert from 'node:assert/strict';
import {createAIG3DMesh,createAIG3DScene,addAIG3DNode}
 from '../aig-real3d-core.mjs';
import {connectAIGReal3DOBJFaceUV}
 from '../aig-real3d-obj-vt-source-bridge.mjs';
import {buildAIGReal3DMultiChunkBVH,selectAIGReal3DSurfaceCoverage}
 from '../aig-real3d-multichunk-bvh.mjs';
import {createAIGReal3DDynamicFilmTimeline}
 from '../aig-real3d-dynamic-film-timeline.mjs';
const sha='a'.repeat(64);
const mesh=createAIG3DMesh({
 positions:[-1,-1,0,1,-1,0,1,1,0,-1,1,0],
 normals:[0,0,1,0,0,1,0,0,1,0,0,1],
 indices:[0,1,2,0,2,3],
 provenance:'ORIGINAL_V90_NONHUMAN_SOURCE'
});
function sourceScene(){
 const scene=createAIG3DScene({id:'v90test',consumer:'FastModel',
  source:'ORIGINAL_NONHUMAN',units:'METERS'});
 const node=addAIG3DNode(scene,{id:'part',kind:'character',mesh,
  material:{doubleSided:true}});
 node.sourceGlobalVertexIds=Uint32Array.from([0,1,2,3]);
 return scene;
}
const uvFace=(seam=false)=>[
 'v -1 -1 0','v 1 -1 0','v 1 1 0','v -1 1 0',
 'vt 0 0','vt 1 0','vt 1 1','vt 0 1','vt .25 .25',
 'f 1/1 2/2 3/3',`f 1/${seam?5:1} 3/3 4/4`
].join('\n');
test('V90 source original OBJ vt direct UV with original EBO and no reupload',()=>{
 const scene=sourceScene(),p=mesh.positions.join(','),idx=mesh.indices.join(',');
 const out=connectAIGReal3DOBJFaceUV({objText:uvFace(),
  sourceSha256:sha,verifiedObjSha256:sha,dense:{scene}});
 assert.equal(out.actualChunks,1);
 assert.equal(out.originalTriangles,2);
 assert.equal(out.uvSeamAdditionalVertices,0);
 assert.equal(out.nodes[0].uvMesh,mesh);
 assert.equal(out.gpuChunksRequiringNewGeometryBuffers,0);
 assert.deepEqual(out.nodes[0].uvCoordinates,[0,0,1,0,1,1,0,1]);
 assert.equal(mesh.positions.join(','),p);
 assert.equal(mesh.indices.join(','),idx);
});
test('V90 UV seam duplicates working display corners only and preserves original faces',()=>{
 const scene=sourceScene(),original=JSON.stringify(mesh);
 const out=connectAIGReal3DOBJFaceUV({objText:uvFace(true),
  sourceSha256:sha,verifiedObjSha256:sha,dense:{scene}});
 assert.equal(out.gpuChunksRequiringNewGeometryBuffers,1);
 assert.equal(out.uvSeamAdditionalVertices,1);
 assert.equal(out.nodes[0].displayTriangleCount,2);
 assert.equal(out.nodes[0].UVSeamRequiresNewPositionNormalIndexGPUUpload,true);
 assert.equal(out.nodes[0].originalIndexedTrianglesIdenticalXYZ,true);
 assert.equal(JSON.stringify(mesh),original);
});
test('V90 OBJ rejects wrong SHA, missing vt, flipped face order, UV outside atlas',()=>{
 const base={objText:uvFace(),sourceSha256:sha,
  verifiedObjSha256:sha,dense:{scene:sourceScene()}};
 assert.throws(()=>connectAIGReal3DOBJFaceUV({...base,
  verifiedObjSha256:'b'.repeat(64)}),/V90_VT_ORIGINAL_SOURCE_SHA_OR_SCENE_MISMATCH/);
 assert.throws(()=>connectAIGReal3DOBJFaceUV({...base,
  objText:base.objText.replace('f 1\/1 2\/2 3\/3','f 1 2 3')}),
  /V90_VT_OBJ_FACE_CORNER_VT_MISSING/);
 assert.throws(()=>connectAIGReal3DOBJFaceUV({...base,
  objText:base.objText.replace('f 1\/1 2\/2 3\/3','f 2\/2 1\/1 3\/3')}),
  /V90_VT_OBJ_ORIGINAL_FACE_ORDER_MISMATCH/);
 assert.throws(()=>connectAIGReal3DOBJFaceUV({...base,
  objText:base.objText.replace('vt 1 0','vt 1.2 0')}),
  /V90_VT_OBJ_UV_OUTSIDE_SINGLE_ATLAS/);
});
test('V90 global two-chunk BVH rejects hidden back chunk in HALF_VISIBLE',()=>{
 const scene=sourceScene();
 const back=createAIG3DMesh({positions:mesh.positions.map((x,i)=>
  i%3===2?-.5:x),normals:mesh.normals,indices:mesh.indices,
  provenance:'ORIGINAL_BACK_SOURCE'});
 addAIG3DNode(scene,{id:'rear',kind:'character',mesh:back,
  material:{doubleSided:false}});
 const bvh=buildAIGReal3DMultiChunkBVH({scene,leafSize:2});
 const ray=bvh.raycast({origin:[0,0,4],target:[0,0,-.5]});
 assert.equal(ray.occluded,true);
 assert.equal(ray.blockingNodeId,'part');
 const full=selectAIGReal3DSurfaceCoverage({
  bvh,cameraPosition:[0,0,4],mode:'FULL_SURFACE'});
 const half=selectAIGReal3DSurfaceCoverage({
  bvh,cameraPosition:[0,0,4],mode:'HALF_VISIBLE'});
 assert.deepEqual(full.includedSourceNodeIds,['part','rear']);
 assert.deepEqual(half.includedSourceNodeIds,['part']);
 assert.deepEqual(half.skippedSourceNodeIds,['rear']);
 assert.equal(half.fasterThanFullRenderingMeasured,false);
 assert.equal(bvh.originalFaces,4);
});
test('V90 real per-vertex keyframe interpolation and reusable working-copy GPU buffers',()=>{
 const scene=sourceScene(),original=JSON.stringify(scene.nodes[0].mesh);
 const pose=(change)=>({positions:mesh.positions.map((x,i)=>
  i===2?x+change:x),normals:[...mesh.normals]});
 const timeline=createAIGReal3DDynamicFilmTimeline({
  sourceScene:scene,keyframes:[{timeMs:0,poses:{part:pose(0)}},
   {timeMs:1000,poses:{part:pose(.5)}}],fps:24
 });
 const a=timeline.sample(500);
 assert.ok(Math.abs(a.part.positions[2]-.25)<1e-8);
 const calls=[];
 const fakeRenderer={
  render:()=>({status:'WEBGL_XYZ_TRIANGLES_RENDERED',triangles:2}),
  updateMeshVertices:(working,{positions,normals,changedVertexIndices})=>{
   calls.push(changedVertexIndices);
   for(const id of changedVertexIndices)for(let d=0;d<3;d++){
    working.positions[3*id+d]=positions[3*id+d];
    working.normals[3*id+d]=normals[3*id+d];
   }
   return {originalIndexBufferReused:true,fullGPUBufferReallocation:false,
    positionSubDataCalls:1,normalSubDataCalls:1};
  }
 };
 timeline.draw(fakeRenderer,0);
 timeline.draw(fakeRenderer,500);
 timeline.draw(fakeRenderer,1000);
 assert.equal(timeline.snapshot().real3DFramesRendered,3);
 assert.equal(timeline.snapshot().indexBufferReuploads,0);
 assert.equal(calls.length,2);
 assert.equal(JSON.stringify(scene.nodes[0].mesh),original);
 assert.equal(timeline.snapshot().animatedMovieEncoded,false);
});
