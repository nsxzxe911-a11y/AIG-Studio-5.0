import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewAIGReal3DSourceEnvelope,compareAIGReal3DSourceEnvelopes}
 from '../aig-real3d-source-envelope-review.mjs';
const geom={
 boundingMeters:{widthX:0.840,depthZ:0.504,heightY:1.680}
},broken='a'.repeat(64),intact='b'.repeat(64);
test('The real synthetic capsule screenshot is 840mm wide vs 504mm deep; not a human',()=>{
 const x=reviewAIGReal3DSourceEnvelope({
  geometry:geom,sourceName:'SYNTHETIC_NONHUMAN_CAPSULE.obj',
  sourceSha256:broken
 });
 assert.deepEqual(x.boundingMillimeters,{
  frontMaxWidthX:840,heightY:1680,sideMaxDepthZ:504
 });
 assert.equal(x.ratios.frontMaxWidthToHeight,.5);
 assert.equal(x.ratios.sideMaxDepthToHeight,.3);
 assert.equal(x.ratios.frontMaxWidthToSideDepth,1.6667);
 assert.equal(x.wideFrontEnvelopeNeedsPoseAndReferenceReview,true);
 assert.equal(x.fixtureExplicitlySyntheticNonhuman,true);
 assert.equal(x.geometryWasModified,false);
 assert.equal(x.noInferenceOfBMIOrFatness,true);
 assert.equal(x.humanAppearancePASS,false);
 assert.equal(x.releasePASS,false);
});
test('A different native source with identical cross-section is not fixed silhouette',()=>{
 const a=reviewAIGReal3DSourceEnvelope({
  geometry:geom,sourceName:'SYNTHETIC_NONHUMAN_BROKEN.obj',sourceSha256:broken
 });
 const b=reviewAIGReal3DSourceEnvelope({
  geometry:geom,sourceName:'SYNTHETIC_NONHUMAN_FIXED_TOPOLOGY.obj',sourceSha256:intact
 });
 const change=compareAIGReal3DSourceEnvelopes(a,b);
 assert.equal(change.sameVisibleBoundingEnvelopeAcrossSources,true);
 assert.deepEqual(change.deltaMillimeters,{
  frontMaxWidthX:0,heightY:0,sideMaxDepthZ:0
 });
 assert.equal(change.sourceTopologyRepairDoesNotImplyBodyProportionsChanged,true);
 assert.equal(change.humanNaturalAppearancePASS,false);
});
test('Wide upper envelope is only a warning; cannot mislabel outstretched pose as obesity',()=>{
 const x=reviewAIGReal3DSourceEnvelope({
  geometry:{boundingMeters:{widthX:1.2,heightY:1.65,depthZ:.28}},
  sourceName:'person-arms-extended.obj',sourceSha256:intact
 });
 assert.equal(x.wideFrontEnvelopeNeedsPoseAndReferenceReview,true);
 assert.equal(x.fixtureExplicitlySyntheticNonhuman,false);
 assert.equal(x.envelopeIsBoundingBoxNotAnatomicalShoulderOrWaist,true);
 assert.equal(x.noInferenceOfBMIOrFatness,true);
 assert.equal(x.humanAppearancePASS,false);
});
test('Invalid or unverified source inputs must not produce fake ratios',()=>{
 assert.throws(()=>reviewAIGReal3DSourceEnvelope({
  geometry:{boundingMeters:{widthX:0,heightY:1.7,depthZ:.22}},
  sourceName:'bad.obj',sourceSha256:intact
 }),/SOURCE_ENVELOPE_ORIGINAL_XYZ_REQUIRED/);
 assert.throws(()=>reviewAIGReal3DSourceEnvelope({
  geometry:geom,sourceName:'bad.obj',sourceSha256:'unhashed'
 }),/SOURCE_ENVELOPE_SOURCE_SHA_REQUIRED/);
 const a=reviewAIGReal3DSourceEnvelope({
  geometry:geom,sourceName:'a.obj',sourceSha256:intact
 });
 assert.throws(()=>compareAIGReal3DSourceEnvelopes(a,a),
  /ENVELOPE_COMPARE_TWO_INDEPENDENT_SOURCES_REQUIRED/);
});
