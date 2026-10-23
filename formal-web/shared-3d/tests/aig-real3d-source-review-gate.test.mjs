import test from 'node:test';
import assert from 'node:assert/strict';
import {buildAIGReal3DSourceReview,validateAIGReal3DLandmarkSidecar} from '../aig-real3d-source-review-gate.mjs';
const sha='a'.repeat(64);
const inputs={
 sourceName:'source-synthetic-not-human.obj',sourceSha256:sha,
 sourceBytes:5011,heightMm:1680,upAxis:'Y',
 evidence:{geometryPASS:true,sourceSha256:sha,actualVertices:5000,
  actualTriangles:9600,landmarkAudit:{complete:false,errors:['ANATOMY_MISSING']}},
 declaredOrigin:'Local authored synthetic mesh fixture',
 declaredMethod:'MANUAL_MODEL',userClaimsAuthorized:true,
 captureProofs:['front','side','back','threeQuarter'].map(angle=>({
  angle,mode:'BROWN_VOLUME',sha256:'b'.repeat(64),width:1080,height:1920
 }))
};
test('Correct OBJ XYZ and complete 4 camera captures are NOT human authenticity',()=>{
 const r=buildAIGReal3DSourceReview(inputs);
 assert.equal(r.schema,'AIG_REAL3D_BROWN_SOURCE_REVIEW_V1');
 assert.equal(r.computedEvidence.nativeMeshGeometryGatePASS,true);
 assert.equal(r.computedEvidence.fourRealGpuOrthographicAnglesCaptured,true);
 assert.equal(r.computedEvidence.labeledAnatomyValidatedAgainstMesh,false);
 assert.equal(r.readyForHumanReferenceReview,false);
 assert.equal(r.sourceDeclaration.provenanceAuthenticatedByIndependentEvidence,false);
 assert.equal(r.personAuthenticityVerified,false);
 assert.equal(r.naturalAppearancePASS,false);
 assert.equal(r.releasePASS,false);
 assert.equal(r.releaseStatus,'BLOCK_PENDING_INDEPENDENT_SOURCE_AND_HUMAN_VISUAL_REVIEW');
});
test('GLB raw scene may render, but no OBJ anatomy landmarks inferred',()=>{
 const r=buildAIGReal3DSourceReview({...inputs,sourceName:'source.glb',
  evidence:{renderGeometryPASS:true,sourceSha256:sha,actualVertices:10000,actualTriangles:15000}});
 assert.equal(r.computedEvidence.nativeMeshGeometryGatePASS,true);
 assert.equal(r.computedEvidence.labeledAnatomyValidatedAgainstMesh,false);
 assert.equal(r.releasePASS,false);
});
test('Self declaration and false anatomy landmark metadata cannot force verified human',()=>{
 const landmarks=Object.fromEntries([
  'headTop','chin','noseTip','neckBase','leftShoulder','rightShoulder',
  'leftElbow','rightElbow','leftWrist','rightWrist','leftThumbTip',
  'rightThumbTip','leftIndexTip','rightIndexTip','pelvis',
  'leftKnee','rightKnee','leftHeel','rightHeel','leftToe','rightToe'
 ].map(k=>[k,[1,1,1]]));
 assert.equal(validateAIGReal3DLandmarkSidecar(landmarks).allRequiredNamesPresent,true);
 const r=buildAIGReal3DSourceReview({...inputs,landmarkSidecar:landmarks,
  evidence:{...inputs.evidence,landmarkAudit:{complete:true}}});
 assert.equal(r.readyForHumanReferenceReview,true);
 assert.equal(r.personAuthenticityVerified,false);
 assert.equal(r.naturalAppearancePASS,false);
 assert.equal(r.releasePASS,false);
});
test('Invalid provenance / missing GPU angles fail closed',()=>{
 assert.throws(()=>buildAIGReal3DSourceReview({...inputs,sourceSha256:'UNHASHED'}),/SOURCE_MISSING_REAL_SHA256/);
 assert.throws(()=>buildAIGReal3DSourceReview({...inputs,heightMm:0}),/SOURCE_MEASURED_HEIGHT/);
 assert.throws(()=>buildAIGReal3DSourceReview({...inputs,sourceName:'guess.fbx'}),/SOURCE_FILE_NAME_OR_FORMAT/);
 assert.throws(()=>buildAIGReal3DSourceReview({...inputs,upAxis:'X'}),/SOURCE_UP_AXIS/);
 const a=buildAIGReal3DSourceReview({...inputs,captureProofs:[]});
 assert.equal(a.computedEvidence.fourRealGpuOrthographicAnglesCaptured,false);
 assert.ok(a.gateIssues.includes('FOUR_ANGLE_GPU_CAPTURE_PENDING'));
 const b=buildAIGReal3DSourceReview({...inputs,evidence:{...inputs.evidence,sourceSha256:'b'.repeat(64)}});
 assert.equal(b.computedEvidence.checksumMatchesNativeIntake,false);
 assert.ok(b.gateIssues.includes('HASH_EVIDENCE_MISMATCH'));
 assert.throws(()=>validateAIGReal3DLandmarkSidecar([]),/SOURCE_LANDMARK_DOCUMENT_FORMAT/);
});
