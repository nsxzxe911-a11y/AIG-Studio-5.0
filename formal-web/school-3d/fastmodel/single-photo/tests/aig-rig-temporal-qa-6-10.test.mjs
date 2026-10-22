import test from 'node:test';
import assert from 'node:assert/strict';
import {AIG45_POSES,recognizePose,auditMarks} from '../aig-calibration-4-5.mjs';
import {normalizePoseSet} from '../aig-head-neck-4-6.mjs';
import {buildAIG47Draft} from '../aig-welded-4-7.mjs';
import {buildAIG48Draft,exportAIG48GLB} from '../aig-skin-motion-4-8.mjs';
import {AIG_RIG_TEMPORAL_SCHEMA,auditAigRealGlbTemporalMotion}
 from '../aig-rig-temporal-qa-6-10.mjs';

function actualTechnicalGlb(){
 const sample=AIG45_POSES[0];
 const marks={headTop:{x:.5,y:.07},chin:{x:.5,y:.17},
  leftShoulder:{x:.39,y:.25},rightShoulder:{x:.61,y:.25},
  leftHip:{x:.42,y:.53},rightHip:{x:.58,y:.53},
  leftAnkle:{x:.44,y:.90},rightAnkle:{x:.56,y:.90}};
 const measured=normalizePoseSet([auditMarks(recognizePose({
  sha256:sample.sha256,width:sample.width,height:sample.height}),marks)]);
 return exportAIG48GLB(buildAIG48Draft(buildAIG47Draft(measured))).bytes;
}
test('6.10 real technical GLB skinned vertices move continuously across actual timeline; not a full-body certification',async()=>{
 const source=actualTechnicalGlb();
 const report=await auditAigRealGlbTemporalMotion(source,{sampleHz:30});
 assert.equal(report.schema,AIG_RIG_TEMPORAL_SCHEMA);
 assert.equal(report.actualGlbParsed,true);
 assert.equal(report.actualSkinnedMeshes,2);
 assert.equal(report.realAnimationClipCount,3);
 assert.equal(report.sceneAnimationVerified,true);
 assert.equal(report.boneCoverage.head,true);
 assert.equal(report.fullBodyBoneCoverage,false);
 assert.equal(report.fullBodyCharacterApproved,false);
 assert.equal(report.fullBodyMotionVerified,false);
 assert.equal(report.visualIdentityMatched,false);
 assert.equal(report.hairCollisionVerified,false);
 assert.equal(report.sourceFpsDeviceVerified,false);
 for(const clip of report.sampledClips){
  assert.ok(clip.frameCount>=50,'Must inspect real frames beyond 5 keyframe snapshots');
  assert.ok(clip.totalDeformationMmOrModelUnits>1e-5,clip.clip);
  assert.ok(clip.maxPerFrameChange>0);
  assert.ok(clip.changedFrameIntervals>=2);
  assert.equal(clip.finiteSkinPositions,true);
  assert.equal(clip.fullBodyValidated,false);
 }
});
test('6.10 fake non-GLB, invalid sampling rate or sample budget fails closed',async()=>{
 await assert.rejects(auditAigRealGlbTemporalMotion(new Uint8Array([1,2,3])),
  /REAL_GLB_REQUIRED/);
 const b=actualTechnicalGlb();
 await assert.rejects(auditAigRealGlbTemporalMotion(b,{sampleHz:120}),
  /BOUNDED_SAMPLING_REQUIRED/);
 await assert.rejects(auditAigRealGlbTemporalMotion(b,{maxVerticesPerMesh:1}),
  /BOUNDED_SAMPLING_REQUIRED/);
});
