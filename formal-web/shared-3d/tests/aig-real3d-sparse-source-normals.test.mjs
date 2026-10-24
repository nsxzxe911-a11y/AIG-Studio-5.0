import test from 'node:test';
import assert from 'node:assert/strict';
import {createAIGReal3DSparseNormalCache,evaluateAIGReal3DSparseNormals,
 calculateAIGReal3DFullSourceNormals,SPARSE_NORMAL_SCHEMA}
 from '../aig-real3d-sparse-source-normals.mjs';
// No SDF, Metaball or subdivision. Five source GLOBAL vertices, four faces.
const original=new Float32Array([
 0,0,0,1,0,0,1,1,0,0,1,0,.5,.5,.4
]);
const triangles=new Uint32Array([
 0,1,4,1,2,4,2,3,4,3,0,4
]);
const compare=(a,b)=>{
 assert.equal(a.length,b.length);
 for(let i=0;i<a.length;i++)
  assert.ok(Math.abs(a[i]-b[i])<1e-14,'original global normal component '+i);
};
test('One native original triangle adjacency cache matches full recalculation across real deformation frames',()=>{
 const prior=Array.from(original),idx=Array.from(triangles),
  cache=createAIGReal3DSparseNormalCache({original,indices:triangles}),
  normalScratch=new Float64Array(original.length);
 assert.equal(cache.schema,SPARSE_NORMAL_SCHEMA);
 compare(cache.baselineNormals,calculateAIGReal3DFullSourceNormals({
  positions:original,indices:triangles}));
 for(const k of [0,.025,-.12,.11]){
  const posed=new Float32Array(original);posed[14]+=.1*k;
  posed[13]+=k;
  const result=evaluateAIGReal3DSparseNormals({
   cache,posed,changedGlobalVertexIds:[4],outputNormals:normalScratch
  });
  compare(result.normals,calculateAIGReal3DFullSourceNormals({
   positions:posed,indices:triangles
  }));
  assert.equal(result.sourceTrianglesRecomputed,undefined);
  assert.equal(result.affectedSourceTriangles,4);
  assert.equal(result.recomputedSourceVertexNormals,5);
  assert.equal(result.originalSourceTriangles,4);
 }
 assert.deepEqual(Array.from(original),prior);
 assert.deepEqual(Array.from(triangles),idx);
});
test('Sparse normals skip unrelated original faces, preserve unmoved anchor normals exactly',()=>{
 const original=new Float32Array([
  0,0,0,1,0,0,0,1,0,
  4,0,0,5,0,0,4,1,0
 ]);
 const indices=new Uint32Array([0,1,2,3,4,5]),
  cache=createAIGReal3DSparseNormalCache({original,indices:indices}),
  out=new Float64Array(original.length),
  posed=new Float32Array(original);
 posed[8]=.4;
 const proof=evaluateAIGReal3DSparseNormals({
  cache,posed,changedGlobalVertexIds:[2],outputNormals:out
 });
 compare(out,calculateAIGReal3DFullSourceNormals({positions:posed,indices}));
 assert.equal(proof.affectedSourceTriangles,1);
 assert.equal(proof.skippedOriginalTriangleRecalculation,1);
 assert.deepEqual(Array.from(out.slice(9)),Array.from(cache.baselineNormals.slice(9)));
 assert.deepEqual(Array.from(original),[0,0,0,1,0,0,0,1,0,4,0,0,5,0,0,4,1,0]);
});
test('Malformed global vertex indices, mutated source bounds or invalid buffers BLOCK',()=>{
 const cache=createAIGReal3DSparseNormalCache({original,indices:triangles}),
  normals=new Float64Array(original.length);
 assert.throws(()=>evaluateAIGReal3DSparseNormals({
  cache,posed:new Float32Array(original),changedGlobalVertexIds:[4,4],
  outputNormals:normals
 }),/REAL3D_SPARSE_NORMAL_CHANGED_SOURCE_VERTEX_ORDER_INVALID/);
 assert.throws(()=>evaluateAIGReal3DSparseNormals({
  cache,posed:new Float32Array(original),changedGlobalVertexIds:[5],
  outputNormals:normals
 }),/REAL3D_SPARSE_NORMAL_CHANGED_SOURCE_VERTEX_ORDER_INVALID/);
 assert.throws(()=>evaluateAIGReal3DSparseNormals({
  cache,posed:new Float32Array(original),changedGlobalVertexIds:[1],
  outputNormals:new Float64Array(2)
 }),/REAL3D_SPARSE_NORMAL_SOURCE_CACHE_OR_OUTPUT_INVALID/);
 assert.throws(()=>createAIGReal3DSparseNormalCache({
  original,indices:new Uint32Array([0,1,55])
 }),/REAL3D_SPARSE_NORMAL_SOURCE_FACE_INDEX_OUT_OF_BOUNDS/);
});
