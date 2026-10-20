import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {AIG45_SCHEMA,AIG45_POSES,AIG45_MARKERS,AIG45_PACK,
 recognizePose,normalizeMark,auditMarks,reviewPoseSet} from '../aig-calibration-4-5.mjs';
const ref=AIG45_POSES[0];
const status=recognizePose({sha256:ref.sha256,width:ref.width,height:ref.height});
const marks={
 headTop:{x:.5,y:.07},chin:{x:.5,y:.17},
 leftShoulder:{x:.39,y:.25},rightShoulder:{x:.61,y:.25},
 leftHip:{x:.42,y:.53},rightHip:{x:.58,y:.53},
 leftAnkle:{x:.44,y:.9},rightAnkle:{x:.56,y:.9}
};
test('registered 4 generated adult heroine pictures are all front poses NOT orthographic views',()=>{
 assert.equal(AIG45_POSES.length,4);
 assert.equal(new Set(AIG45_POSES.map(p=>p.id)).size,4);
 assert.equal(new Set(AIG45_POSES.map(p=>p.sha256)).size,4);
 assert.ok(AIG45_POSES.every(p=>p.width===1122&&p.height===1402));
 assert.ok(AIG45_POSES.every(p=>p.view==='FRONT_OR_NEAR_FRONT'));
 for(const p of AIG45_POSES){
  const found=recognizePose({sha256:p.sha256,width:p.width,height:p.height});
  assert.equal(found.matched,true);assert.equal(found.matchedRecord,p.id);
  assert.equal(found.orthographicViewEvidence,false);
  assert.equal(found.knownCameraYawDegrees,null);
  assert.equal(found.characterIdentityProvenBySHA,false);
  assert.equal(found.releaseAllowed,false);
 }
 assert.equal(recognizePose({sha256:ref.sha256,width:300,height:300}).matched,false);
 assert.equal(recognizePose({sha256:'b'.repeat(64),width:1122,height:1402}).matched,false);
 assert.equal(recognizePose({sha256:'not-sha',width:1122,height:1402}).matched,false);
});
test('landmark normalization uses real source dimensions and rejects bad pixel positions',()=>{
 assert.deepEqual(normalizeMark({x:561,y:701},1122,1402),{x:.5,y:.5});
 assert.throws(()=>normalizeMark({x:-1,y:22},1122,1402),/OUTSIDE_IMAGE/);
 assert.throws(()=>normalizeMark({x:1,y:1},1,1),/OUTSIDE_IMAGE/);
 assert.throws(()=>normalizeMark({x:NaN,y:200},1122,1402),/OUTSIDE_IMAGE/);
});
test('8 marks derive measured 2D proportions but do not invent unseen full-body geometry',()=>{
 assert.equal(AIG45_MARKERS.length,8);
 const report=auditMarks(status,marks);
 assert.equal(report.schema,AIG45_SCHEMA);
 assert.equal(report.assetId,ref.id);
 assert.equal(report.originalSourceSHA256,ref.sha256);
 assert.ok(report.ratios.apparentShoulderWidthOverBody>0.20);
 assert.ok(report.ratios.apparentShoulderWidthOverBody<0.32);
 assert.equal(report.cameraCalibrationVerified,false);
 assert.equal(report.physicalScaleInMillimeters,false);
 assert.equal(report.estimatedUnknownSurfaceDepth,false);
 assert.equal(report.isOrthographicTurnaround,false);
 assert.equal(report.realHeroineGLBApproved,false);
 assert.equal(report.creditsSpent,0);
 assert.equal(report.releaseAllowed,false);
});
test('reject impossible landmark order, swapped shoulders, cropped and missing feet',()=>{
 assert.throws(()=>auditMarks(status,{...marks,leftShoulder:{x:.8,y:.25}}),/ORDER_OR_CROP/);
 assert.throws(()=>auditMarks(status,{...marks,headTop:{x:.5,y:.74}}),/ORDER_OR_CROP/);
 assert.throws(()=>auditMarks(status,{...marks,leftAnkle:{x:.44,y:.22}}),/ORDER_OR_CROP/);
 assert.throws(()=>auditMarks(status,{...marks,leftHip:{x:.43,y:Infinity}}),/EIGHT_LANDMARKS/);
 assert.throws(()=>auditMarks(status,{...marks,rightAnkle:undefined}),/EIGHT_LANDMARKS/);
 assert.throws(()=>auditMarks(recognizePose({sha256:'c'.repeat(64),width:1122,height:1402}),marks),
  /REGISTERED_SOURCE_REQUIRED/);
});
test('all four identical camera front poses cannot be counted as 4 independent 3D views',()=>{
 const reports=AIG45_POSES.map(p=>auditMarks(recognizePose({sha256:p.sha256,width:p.width,height:p.height}),marks));
 const review=reviewPoseSet(reports);
 assert.equal(review.registeredPhotoCount,4);
 assert.equal(review.distinctValidCameraAngles,1);
 assert.equal(review.actualBackViewCount,0);
 assert.equal(review.sideViewCount,0);
 assert.equal(review.depthTriangulationPermitted,false);
 assert.equal(review.calibrated360Turnaround,false);
 assert.equal(review.noCreditsSpent,true);
 assert.equal(review.releaseAllowed,false);
 assert.equal(review.assetSetId,AIG45_PACK);
 assert.throws(()=>reviewPoseSet([reports[0],reports[0]]),/DUPLICATE/);
 assert.throws(()=>reviewPoseSet([]),/POSE_SET_SIZE/);
});
test('UI actually wires file SHA check, native pixel calibration, eight clicks and download',()=>{
 const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
 const html=read('../index.html'),app=read('../app.mjs');
 for(const id of ['aig45-input','aig45-selector','aig45-canvas','aig45-next-point',
  'aig45-undo','aig45-accept','aig45-export','aig45-status'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(app,/recognizePose\(\{sha256:sha,width:image\.naturalWidth/);
 assert.match(app,/aig45Marks\.push\(normalizeMark/);
 assert.match(app,/auditMarks\(aig45Active\.source/);
 assert.match(app,/reviewPoseSet\(images\)/);
 assert.match(app,/AIG-4\.5-POSE-CALIBRATION-DRAFT-NOT-3D\.json/);
 assert.doesNotMatch(read('../aig-calibration-4-5.mjs'),/fetch\(|MeshyClient|StableFast3D|subprocess\.run/);
});
