import test from 'node:test';
import assert from 'node:assert/strict';
import {buildAIGReal3DDenseEvidencePacket,AIG_REAL3D_DENSE_EVIDENCE_SCHEMA}
 from '../aig-real3d-dense-source-evidence.mjs';
const sha='a'.repeat(64),evidence={
 schema:'AIG_REAL3D_RAW_DENSE_OBJ_CHUNKED_INTAKE_V1',
 sourceSha256:sha,sourceName:'source.obj',originalVertexCount:120000,
 originalTriangleCount:235000,renderedTriangleCount:235000,
 gpuChunkCount:4,noSourceTopologyDecimation:true
};
const refs=['front','side','back','threeQuarter'].map((angle,i)=>({
 angle,name:angle+'.png',sha256:String(i+1).repeat(64),
 width:1080,height:1920
}));
test('Four independent original photo SHA records are bound to SAME original OBJ, not identity certification',()=>{
 const r=buildAIGReal3DDenseEvidencePacket({
  sourceEvidence:evidence,sourceSha256:sha,referenceImages:refs,
  sourceOrigin:'claimed local scan',claimedMethod:'STRUCTURED_LIGHT',
  authorizedByClaimant:true
 });
 assert.equal(r.schema,AIG_REAL3D_DENSE_EVIDENCE_SCHEMA);
 assert.equal(r.completeFourViewReferenceSet,true);
 assert.equal(r.noMeshDecimation,true);
 assert.equal(r.originalTriangleCount,r.gpuRenderedTriangles);
 assert.equal(r.referenceImages.length,4);
 assert.equal(r.sourceHumanScanVerified,false);
 assert.equal(r.identicalPersonAcrossViewsNotProven,true);
 assert.equal(r.referencePhotosMatchedToMesh,false);
 assert.equal(r.releasePASS,false);
});
test('Missing images stay incomplete; self declaration alone cannot certify true human',()=>{
 const r=buildAIGReal3DDenseEvidencePacket({
  sourceEvidence:evidence,sourceSha256:sha,
  referenceImages:refs.slice(0,1),authorizedByClaimant:true
 });
 assert.equal(r.completeFourViewReferenceSet,false);
 assert.deepEqual(r.missingAngles,['side','back','threeQuarter']);
 assert.equal(r.sourceDeclaration.originAuthenticatedByIndependentEvidence,false);
});
test('Forged source SHA or duplicate angles must be blocked',()=>{
 assert.throws(()=>buildAIGReal3DDenseEvidencePacket({
  sourceEvidence:evidence,sourceSha256:'b'.repeat(64),referenceImages:refs
 }),/DENSE_EVIDENCE_VERIFIED_OBJ_REQUIRED/);
 assert.throws(()=>buildAIGReal3DDenseEvidencePacket({
  sourceEvidence:evidence,sourceSha256:sha,referenceImages:[refs[0],refs[0]]
 }),/DENSE_EVIDENCE_REFERENCE_FILE_INVALID/);
});
