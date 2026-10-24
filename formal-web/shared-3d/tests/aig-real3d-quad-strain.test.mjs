import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectAIGQuadStrainPacket,mergeAIGQuadStrainResults} from '../aig-real3d-quad-strain-task.mjs';
import {packAIGQuadSourceTriangles,inspectAIGReal3DStrainSerial,runAIGReal3DQuadStrain}
 from '../aig-real3d-quad-strain-pool.mjs';
const indices=new Uint32Array([0,1,2,3,4,5,6,7,8,9,10,11]);
const original=new Float32Array([
 0,0,0,1,0,0,0,1,0,
 0,0,2,1,0,2,0,1,2,
 0,0,4,1,0,4,0,1,4,
 0,0,6,1,0,6,0,1,6
]);
test('Four compact original Indexed-XYZ triangles partition and merge to exactly the serial result',()=>{
 const posed=new Float32Array(original);
 posed[3]+=0.2;posed[12]+=0.1;
 posed[18]=1;posed[21]=0;posed[24]=0; // inverted or flattened face
 const offsets=new Uint32Array([0,3,6,9]);
 const packed=packAIGQuadSourceTriangles({original,posed,indices,triangleOffsets:offsets});
 assert.equal(packed.length,72);
 const serial=inspectAIGReal3DStrainSerial({original,posed,indices,triangleOffsets:offsets});
 const pieces=Array.from({length:4},(_,i)=>inspectAIGQuadStrainPacket(
  packed.subarray(i*18,(i+1)*18)));
 assert.deepEqual(mergeAIGQuadStrainResults(pieces),serial);
 assert.equal(serial.inspectedOriginalTriangles,4);
 assert.ok(serial.changedSourceTriangles>0);
});
test('When native Web Worker is absent, fallback is honest serial and does not pretend to have four physical cores',async()=>{
 const out=await runAIGReal3DQuadStrain({
  original,posed:new Float32Array(original),indices,
  triangleOffsets:new Uint32Array([0,3,6,9]),forceFour:true
 });
 assert.equal(out.actualWorkerLanes,0);
 assert.equal(out.selectedMode,'SERIAL_SMALL_JOB_OR_UNSUPPORTED');
 assert.equal(out.parallelEquivalentToSerial,true);
 assert.equal(out.twoTimesFasterClaimSupported,false);
});
test('Untrusted triangle offsets, mismatched original XYZ and duplicates BLOCK',()=>{
 assert.throws(()=>packAIGQuadSourceTriangles({
  original,posed:new Float32Array(original),indices,
  triangleOffsets:new Uint32Array([3,0])}),/QUAD_SOURCE_TRIANGLE_OFFSETS_INVALID/);
 assert.throws(()=>packAIGQuadSourceTriangles({
  original,posed:new Float32Array(9),indices,
  triangleOffsets:new Uint32Array([0])}),/QUAD_ORIGINAL_INDEXED_SOURCE_REQUIRED/);
 assert.throws(()=>packAIGQuadSourceTriangles({
  original,posed:new Float32Array(original),
  indices:new Uint32Array([0,1,999]),triangleOffsets:new Uint32Array([0])
 }),/QUAD_SOURCE_TRIANGLE_INDEX_OUT_OF_RANGE/);
});
