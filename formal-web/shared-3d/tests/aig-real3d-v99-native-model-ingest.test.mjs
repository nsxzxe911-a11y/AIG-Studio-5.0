import test from 'node:test';
import assert from 'node:assert/strict';
import {runAIGReal3DV97PhotoConstrainedModel}
 from '../aig-real3d-v97-auto-constrained-model.mjs';
import {exportAIGReal3DV97AnimatedGLB}
 from '../aig-real3d-v97-export-animated-glb.mjs';
import {ingestAIGReal3DNativeGeneratedGLB,sha256AIGReal3DBytes}
 from '../aig-real3d-v99-native-model-ingest.mjs';
import {runAIGReal3DLocalGeometryModel,
 connectAIGReal3DImportedGeometryToUnified4K}
 from '../aig-real3d-v99-ai-inference-adapter.mjs';
const identity='c'.repeat(64);
function img(){
 const width=256,height=256,rgba=new Uint8ClampedArray(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=4*(y*width+x),t=(y-30)/80,
   half=Math.round(31-13*t),hit=y>=30&&y<=110&&Math.abs(x-128)<=half;
  rgba[i]=hit?215:11;rgba[i+1]=hit?145:24;
  rgba[i+2]=hit?108:50;rgba[i+3]=255;
 }
 return {rgba,width,height};
}
async function fixture(){
 const pixels=img(),referenceBytes=new Uint8Array(256);
 for(let i=0;i<referenceBytes.length;i++)referenceBytes[i]=i;
 const sourceSHA=await sha256AIGReal3DBytes(referenceBytes);
 const r=runAIGReal3DV97PhotoConstrainedModel({
  ...pixels,imageSha256:sourceSHA,approvedIdentitySha256:identity});
 assert.ok(r.candidate?.mesh);
 const output=exportAIGReal3DV97AnimatedGLB({
  candidate:r.candidate,sourceImageSha256:sourceSHA});
 const glbBytes=output.bytes;
 return {referenceBytes,sourceSHA,glbBytes,
  glbSHA:await sha256AIGReal3DBytes(glbBytes),original:r.candidate.mesh};
}
test('V99 actual glTF binary 3D POSITION/INDEX/NORMAL original topology, no fake geometry',async()=>{
 const f=await fixture();
 const result=await ingestAIGReal3DNativeGeneratedGLB({
  glbBytes:f.glbBytes,referenceImageBytes:f.referenceBytes,
  declaredImageSha256:f.sourceSHA,declaredGLBSha256:f.glbSHA,
  domain:'PERSON',assetId:'HeroineRealSourceCandidate'
 });
 assert.equal(result.trueBinaryGLBParsed,true);
 assert.equal(result.sourceTriangles,3784);
 assert.equal(result.scene.nodes.length,1);
 assert.deepEqual(result.scene.nodes[0].mesh.indices,f.original.indices);
 assert.equal(result.scene.nodes[0].mesh.positions.length,f.original.positions.length);
 assert.equal(result.perMesh[0].originalDegenerateFaces,0);
 assert.equal(result.perMesh[0].originalFaceIndicesRetained,true);
 assert.equal(result.originalSourceVisualSimilarityMeasured,false);
 assert.equal(result.actualLocalNeuralInferenceRunByThisMethod,false);
 assert.equal(result.ownerApprovedFaceIdentity,false);
 assert.equal(result.releasePASS,false);
});
test('V99 source SHA, output SHA, unsupported GLB and source units cannot be forged',async()=>{
 const f=await fixture();
 await assert.rejects(ingestAIGReal3DNativeGeneratedGLB({
  glbBytes:f.glbBytes,referenceImageBytes:f.referenceBytes,
  declaredImageSha256:'0'.repeat(64),declaredGLBSha256:f.glbSHA
 }),/IMAGE_AND_GENERATED_GLB_SHA_MUST_MATCH_BYTES/);
 const corrupt=f.glbBytes.slice();corrupt[0]=10;
 const newSHA=await sha256AIGReal3DBytes(corrupt);
 await assert.rejects(ingestAIGReal3DNativeGeneratedGLB({
  glbBytes:corrupt,referenceImageBytes:f.referenceBytes,
  declaredImageSha256:f.sourceSHA,declaredGLBSha256:newSHA
 }),/REAL_GLB2_HEADER_INVALID/);
 await assert.rejects(ingestAIGReal3DNativeGeneratedGLB({
  glbBytes:f.glbBytes,referenceImageBytes:f.referenceBytes,
  declaredImageSha256:f.sourceSHA,declaredGLBSha256:f.glbSHA,
  sourceUnits:'AUTO_GUESS'
 }),/SOURCE_IMAGES_MESH_ID_AND_PROVENANCE_REQUIRED/);
});
test('V99 both person and ship use SAME actual native generated mesh import + V98 source IDs + V96 4K audit',async()=>{
 const f=await fixture();
 for(const domain of ['PERSON','SHIP','ANIMAL','ENVIRONMENT','CNC_PART']){
  const r=await ingestAIGReal3DNativeGeneratedGLB({
   glbBytes:f.glbBytes,referenceImageBytes:f.referenceBytes,
   declaredImageSha256:f.sourceSHA,declaredGLBSha256:f.glbSHA,
   domain,assetId:'OriginalAsset'+domain
  });
  const p=connectAIGReal3DImportedGeometryToUnified4K({
   imported:r,camera:{projection:'orthographic',yaw:0,pitch:0,
    focus:[0,.84,0],orthoSpan:2.15,distance:4,fovDeg:55}});
  assert.equal(p.shared.record.assetId,'OriginalAsset'+domain);
  assert.equal(p.shared.record.sourceGeometrySha256,f.glbSHA);
  assert.equal(p.detail.sourceTriangles,3784);
  assert.equal(p.sourceModelNotConvertedToV95Proxy,true);
  assert.equal(p.releasePASS,false);
 }
});
test('V99 real local provider callback and SHA-bound model weight adapter do not falsely claim neural inference',async()=>{
 const f=await fixture(),weights=new Uint8Array(512);
 for(let k=0;k<weights.length;k++)weights[k]=k%251;
 const weightSHA=await sha256AIGReal3DBytes(weights);
 let called=0;
 const proof=await runAIGReal3DLocalGeometryModel({
  imageBytes:f.referenceBytes,weightsBytes:weights,
  expectedImageSHA256:f.sourceSHA,expectedWeightsSHA256:weightSHA,
  providerId:'FAKE_TEST_PROVIDER_NOT_AI',
  provider:async req=>{
   called++;
   assert.equal(req.sourceImageSha256,f.sourceSHA);
   assert.equal(req.modelWeightsSha256,weightSHA);
   return {glbBytes:f.glbBytes};
  }
 });
 assert.equal(called,1);
 assert.equal(proof.providerCallbackExecuted,true);
 assert.equal(proof.actualNeuralInferenceProvenByIndependentRuntime,false);
 assert.equal(proof.trainedNeuralModelValidityIndependentlyVerified,false);
 assert.equal(proof.imported.sourceTriangles,3784);
 assert.equal(proof.releasePASS,false);
 await assert.rejects(runAIGReal3DLocalGeometryModel({
  imageBytes:f.referenceBytes,weightsBytes:weights,
  expectedImageSHA256:f.sourceSHA,expectedWeightsSHA256:'f'.repeat(64),
  providerId:'TEST_PROVIDER',
  provider:async()=>{throw Error('CALL_WITH_FAKE_WEIGHTS_NOT_ALLOWED');}
 }),/MODEL_WEIGHTS_OR_INPUT_SOURCE_HASH_MISMATCH/);
});
