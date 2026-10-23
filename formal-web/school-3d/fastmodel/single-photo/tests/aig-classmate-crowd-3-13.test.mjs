import test from 'node:test';
import assert from 'node:assert/strict';
import {AIG313_SCHEMA,AIG313_COUNTS,createAIG313ClassmateRoster,
 planAIG313CrowdWork,evaluateAIG313FrameSamples,
 summariseAIG313CrowdEvidence} from '../aig-classmate-crowd-3-13.mjs';
const sourceSha='sha256:'+'a'.repeat(64);
test('multiple unique classmates have independent source IDs, GLB SHA, rig/wardrobe metadata; no synthetic identity approval',()=>{
 const roster=createAIG313ClassmateRoster();
 const a=roster.register({characterId:'student-01',displayName:'同學甲',
  assetId:'glb1',sourceSha256:sourceSha});
 const b=roster.register({characterId:'student-02',displayName:'同學乙'});
 assert.notEqual(a.characterId,b.characterId);
 assert.equal(a.assetStatus,'SOURCE_REFERENCE_REGISTERED');
 assert.equal(b.assetStatus,'PENDING_3D_SOURCE');
 assert.equal(a.characterIdentityIndependentlyVerified,false);
 assert.equal(roster.snapshot().sourcedCount,1);
 assert.equal(roster.snapshot().pendingCount,1);
 assert.equal(roster.snapshot().verifiedIndependent3DPeopleRendered,0);
 assert.throws(()=>roster.register({
  characterId:'student-01',displayName:'重覆',assetId:'new',
  sourceSha256:sourceSha
 }),/CHARACTER_ID_ALREADY_PRESENT/);
 assert.throws(()=>roster.register({
  characterId:'student-03',displayName:'尚無來源卻聲稱骨架完成',
  hasVerifiedRig:true
 }),/NO_ASSET_CANNOT_PASS_RIG_ANIMATION_APPEARANCE/);
 assert.throws(()=>roster.register({
  characterId:'student-04',displayName:'來源假 SHA',
  assetId:'glb2',sourceSha256:'sha256:invalid'
 }),/PERSONA_CONTRACT_INVALID/);
});
test('one 19,200 logical task pool per scene, not 19,200 threads for every classmate',()=>{
 for(const n of [4,8,12,24,32,48,64]){
  assert.ok(AIG313_COUNTS.includes(n));
  const s=planAIG313CrowdWork({
   visiblePeople:n,independentActiveRigs:n,
   trianglesPerSource:28120,availableMemoryMiB:384,isMobile:true
  });
  assert.equal(s.submittedTrianglesWithoutLOD,n*28120);
  assert.equal(s.logicalWorkSlotPoolSharedAcrossCharacters,19200);
  assert.equal(s.recommendedPoseUpdatesThisFrame,3);
  assert.equal(s.deferredPoseUpdates,n-3);
  assert.equal(s.suggestedLODCounts.near+s.suggestedLODCounts.middle+
   s.suggestedLODCounts.far,n);
  assert.equal(s.fpsAndVisualIdentityMustBeMeasured,true);
  assert.equal(s.estimatedGpuMemoryMiB,null);
  assert.equal(s.staticInstancingCannotIndependentlyRigCharacters,true);
 }
 assert.throws(()=>planAIG313CrowdWork({
  visiblePeople:65
 }),/VALID_CROWD_WORK_REQUIREMENTS/);
});
function row(visiblePeople,delta){
 const timestamps=Array.from({length:61},(_,i)=>i*delta);
 return evaluateAIG313FrameSamples({
  visiblePeople,geometryTriangles:visiblePeople*28120,
  timestampsMs:timestamps,submitMs:timestamps.map(()=>2),
  drawCalls:timestamps.map(()=>5),environment:'HEADLESS_SOFTWARE_WEBGL',
  targetFps:30
 });
}
test('frame budget uses measured P95, not a fabricated crowd FPS estimate',()=>{
 const one=row(1,16.7),twelve=row(12,28),slow=row(24,45);
 assert.equal(one.actualSamples,60);
 assert.ok(one.medianObservedFps>59);
 assert.equal(one.p95SampleMeetsTarget,true);
 assert.equal(twelve.p95SampleMeetsTarget,true);
 assert.equal(slow.p95SampleMeetsTarget,false);
 assert.equal(slow.softwareWebGLCannotProveHardwarePerformance,true);
 assert.equal(slow.fullCharacterRigMotionIncluded,false);
 assert.equal(slow.supportedIndependentAnimatedCharacterCountCertified,null);
 const summary=summariseAIG313CrowdEvidence([one,twelve,slow]);
 assert.equal(summary.maxTechnicalTestClonesAtTarget,12);
 assert.equal(summary.highestActualTestCount,24);
 assert.equal(summary.actualIndependentClassmateCapacityCertified,false);
});
test('nonmonotonic, missing and fabricated benchmark series cannot pass',()=>{
 assert.throws(()=>evaluateAIG313FrameSamples({
  visiblePeople:8,geometryTriangles:28000,
  timestampsMs:[1,2,1],submitMs:[1,1,1],drawCalls:[1,1,1]
 }),/MEASURED_FRAME_SERIES_REQUIRED/);
 assert.throws(()=>evaluateAIG313FrameSamples({
  visiblePeople:8,geometryTriangles:28000,
  timestampsMs:Array.from({length:30},()=>0),
  submitMs:Array.from({length:30},()=>1),
  drawCalls:Array.from({length:30},()=>1)
 }),/MEASURED_FRAME_SERIES_REQUIRED/);
 assert.deepEqual(summariseAIG313CrowdEvidence([]).testedCounts,[]);
});
