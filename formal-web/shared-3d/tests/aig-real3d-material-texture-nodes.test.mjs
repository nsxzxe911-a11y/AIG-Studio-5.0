import test from 'node:test';
import assert from 'node:assert/strict';
import {createAIG3DBox,createAIG3DScene,addAIG3DNode}
 from '../aig-real3d-core.mjs';
import {compileAIGReal3DTextureNodes,applyAIGReal3DTextureNodes,
 AIG_REAL3D_V88_TEXTURE_SCHEMA}
 from '../aig-real3d-material-texture-nodes.mjs';
const sha='a'.repeat(64),uvSha='b'.repeat(64);
const source=createAIG3DBox([1,1,1],'NONHUMAN_ORIGINAL_CUBE_UV_SOURCE'),
 uv=Array.from({length:6},()=>[0,0,1,0,1,1,0,1]).flat(),
 albedo={width:4,height:4,pixels:Array.from({length:16},(_,i)=>
  [i%2?40:235,i%2?150:40,120,255]).flat()},
 normal={width:4,height:4,pixels:Array.from({length:16},(_,i)=>
  [128,i%2?155:128,247,255]).flat()};
test('V88 map metadata adds UV+tangent working channels without changing source XYZ/normal/indices',()=>{
 const pos=JSON.stringify(source.positions),ind=JSON.stringify(source.indices);
 const m=compileAIGReal3DTextureNodes({
  mesh:source,uvCoordinates:uv,sourceSha256:sha,
  uvSourceSha256:uvSha,uvManifestSourceSha256:sha,
  albedoImage:albedo,normalImage:normal,normalStrength:.85,
  clearcoat:.35
 });
 assert.equal(m.schema,AIG_REAL3D_V88_TEXTURE_SCHEMA);
 assert.equal(m.originalXYZPositionsAndFacesReferencedNotModified,true);
 assert.equal(m.originalVertexAndTriangleCountPreserved,true);
 assert.equal(m.mappedMesh.positions,source.positions);
 assert.equal(m.mappedMesh.indices,source.indices);
 assert.equal(m.mappedMesh.normals,source.normals);
 assert.equal(m.mappedMesh.originalSourceGeometryMesh,source);
 assert.equal(m.mappedMesh.uvs.length,source.vertexCount*2);
 assert.equal(m.mappedMesh.tangents.length,source.vertexCount*4);
 assert.ok(m.mappedMesh.tangents.every(Number.isFinite));
 assert.ok(m.mappedMesh.tangents.filter((_,i)=>i%4===3)
  .every(v=>Math.abs(v)===1));
 assert.deepEqual(JSON.stringify(source.positions),pos);
 assert.deepEqual(JSON.stringify(source.indices),ind);
 assert.equal(m.material.trueTangentSpaceNormalBasis,true);
 assert.equal(m.material.physicalSpectralRenderingVerified,undefined);
 assert.equal(m.fullFilmicPBRPhysicallyCertified,false);
});
test('V88 native material nodes attach to a working scene on only selected node',()=>{
 const scene=createAIG3DScene({
  id:'nonhuman_texture_qa',consumer:'FastModel',units:'METERS',
  source:'NONHUMAN_ORIGINAL_SOURCE_QA'
 });
 addAIG3DNode(scene,{id:'source_mesh',kind:'character',mesh:source});
 const mapped=compileAIGReal3DTextureNodes({
  mesh:source,uvCoordinates:uv,sourceSha256:sha,
  uvSourceSha256:uvSha,uvManifestSourceSha256:sha,
  albedoImage:albedo,normalImage:normal
 });
 const out=applyAIGReal3DTextureNodes({
  scene,nodeId:'source_mesh',mapped
 });
 assert.equal(out.nodes[0].mesh.positions,scene.nodes[0].mesh.positions);
 assert.equal(out.nodes[0].mesh.indices,scene.nodes[0].mesh.indices);
 assert.equal(out.nodes[0].material.aigTextureNodes.sourceSha256,sha);
 assert.equal(scene.nodes[0].material.aigTextureNodes,undefined);
});
test('Faked UV, missing normal texture, degenerate UV triangles and malformed RGBA fail closed',()=>{
 const input={mesh:source,uvCoordinates:uv,sourceSha256:sha,
  uvSourceSha256:uvSha,uvManifestSourceSha256:sha,albedoImage:albedo};
 const invalidSHA=()=>compileAIGReal3DTextureNodes({
  ...input,uvManifestSourceSha256:'c'.repeat(64)
 });
 assert.throws(invalidSHA,/REAL3D_V88_TEXTURE_SOURCE_SHA_UV_OR_MATERIAL_INVALID/);
 assert.throws(()=>compileAIGReal3DTextureNodes({
  ...input,normalStrength:1
 }),/REAL3D_V88_TEXTURE_NORMAL_MAP_REQUIRED_FOR_STRENGTH/);
 assert.throws(()=>compileAIGReal3DTextureNodes({
  ...input,uvCoordinates:new Array(source.vertexCount*2).fill(0),
  normalStrength:0
 }),/REAL3D_V88_TEXTURE_SOURCE_UV_DEGENERATE_TRIANGLE_0/);
 assert.throws(()=>compileAIGReal3DTextureNodes({
  ...input,normalStrength:0,albedoImage:{width:4,height:4,pixels:[2]}
 }),/REAL3D_V88_TEXTURE_INVALID_ALBEDO_RGBA_IMAGE/);
 assert.throws(()=>compileAIGReal3DTextureNodes({
  ...input,normalStrength:0,clearcoat:12
 }),/REAL3D_V88_TEXTURE_SOURCE_SHA_UV_OR_MATERIAL_INVALID/);
});
