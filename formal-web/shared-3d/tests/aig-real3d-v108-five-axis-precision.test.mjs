import test from 'node:test';
import assert from 'node:assert/strict';
import {createAIG3DScene,createAIG3DBox,createAIG3DCylinder,
 addAIG3DNode} from '../aig-real3d-core.mjs';
import {auditAIGReal3DV108FiveAxisPrecision}
 from '../aig-real3d-v108-five-axis-precision.mjs';
const sha='b'.repeat(64);
function sceneFor(mesh,units='MM',position=[0,0,0]){
 const scene=createAIG3DScene({id:'V108PrecisionSource',consumer:'FastModel',
  units,source:'AUTHORIZED_SOURCE_STANDIN_TEST_ONLY'});
 addAIG3DNode(scene,{id:'realSourceMesh',mesh,
  source:'REAL_INDEXED_XYZ_FIXTURE_NOT_AUTHENTIC_PERSON',
  transform:{position}});
 return scene;
}
test('V108 full -180..180 A / 0..360 B in 15 deg produces 625 true poses and sub-0.001 mm roundtrip',()=>{
 const scene=sceneFor(createAIG3DBox([2,4,6],'V108_ORIGINAL_12_FACE_FIXTURE'));
 const original=JSON.stringify(scene);
 const audit=auditAIGReal3DV108FiveAxisPrecision({scene,sourceGLBSha256:sha});
 assert.equal(audit.angleSweep.aSamples,25);
 assert.equal(audit.angleSweep.bSamples,25);
 assert.equal(audit.posesChecked,625);
 assert.ok(audit.positionsChecked>=625*8);
 assert.equal(audit.geometryMathGate,'PASS');
 assert.equal(audit.failures.length,0);
 assert.ok(audit.maxRoundtripMm<.001);
 assert.ok(audit.maxIndependentPoseDeltaMm<.001);
 assert.ok(audit.maxPivotDeltaMm<.001);
 assert.ok(audit.maxRadialLengthDeltaMm<.001);
 assert.ok(audit.maxDeterminantDelta<1e-8);
 assert.equal(audit.sourceTriangles,12);
 assert.equal(audit.complexSourceEvidenceGate,'BLOCK_DEMONSTRATION_ONLY_12_TRIANGLE_SOURCE');
 assert.equal(audit.imageGeometryReconstructionGate,
  'BLOCK_NO_MATCHED_INDEPENDENT_PHOTO_OR_MULTI_VIEW_MEASUREMENT');
 assert.equal(audit.releasePASS,false);
 assert.equal(JSON.stringify(scene),original);
});
test('V108 real multi-surface XYZ indexed cylinder cannot be called likeness PASS by face count',()=>{
 const source=createAIG3DCylinder({radius:6,height:25,segments:48,
  provenance:'V108_MANY_TRIANGLES_NO_ANATOMY_CLAIM'});
 const scene=sceneFor(source,'MM',[125,68,-31]);
 const before=JSON.stringify(scene);
 const audit=auditAIGReal3DV108FiveAxisPrecision({scene,sourceGLBSha256:sha});
 assert.ok(audit.sourceTriangles>12);
 assert.equal(audit.geometryMathGate,'PASS');
 assert.equal(audit.complexSourceEvidenceGate,'BLOCK_EXTERNAL_SOURCE_QUALITY_UNVERIFIED');
 assert.equal(audit.geometryAppearanceIoU,null);
 assert.equal(audit.sourcePhotoOrNaturalAnatomyPASS,false);
 assert.equal(audit.releasePASS,false);
 assert.ok(audit.maxRoundtripMm<.001);
 assert.equal(JSON.stringify(scene),before);
});
test('V108 METERS source is always measured in mm at the release threshold',()=>{
 const mesh=createAIG3DCylinder({radius:.013,height:.17,segments:24,
  provenance:'V108_METER_REAL_SOURCE_LENGTH'});
 const scene=sceneFor(mesh,'METERS',[2,.1,-.2]);
 const audit=auditAIGReal3DV108FiveAxisPrecision({scene,sourceGLBSha256:sha});
 assert.equal(audit.sourceUnits,'METERS');
 assert.equal(audit.precisionThresholdMm,.001);
 assert.equal(audit.geometryMathGate,'PASS');
 assert.ok(audit.maxIndependentPoseDeltaMm<.001);
 assert.ok(audit.maxRoundtripMm<.001);
});
test('V108 rejects fake angle resolution or invalid source SHA, no silent PASS',()=>{
 const scene=sceneFor(createAIG3DBox([2,4,6]));
 assert.throws(()=>auditAIGReal3DV108FiveAxisPrecision({
  scene,sourceGLBSha256:sha,stepDeg:90}),/REQUIRED_15_DEG_SWEEP/);
 assert.throws(()=>auditAIGReal3DV108FiveAxisPrecision({
  scene,sourceGLBSha256:'not-sha'}),/SOURCE_SHA_OR_UNITS_REQUIRED/);
});
