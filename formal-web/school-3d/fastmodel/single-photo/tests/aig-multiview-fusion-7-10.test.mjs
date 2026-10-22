import test from 'node:test';
import assert from 'node:assert/strict';
import {
 AIG710_SCHEMA,createAIG710Calibration,triangulateAIG710,createAIG710Fusion,
 addAIG710StereoMatch,summarizeAIG710Fusion,exportAIG710Fusion,importAIG710Fusion
} from '../aig-multiview-fusion-7-10.mjs';

const sourceId='sha256:'+'a'.repeat(64);
const c=createAIG710Calibration({
 width:640,height:480,focalPx:600,baselineMm:60,
 calibrationReviewed:true,rectifiedParallelReviewed:true,sourceId
});
const project=(p)=>{
 const [X,Y,Z]=p;
 return {
  left:{x:320+600*X/Z,y:240-600*Y/Z},
  right:{x:320+600*(X-60)/Z,y:240-600*Y/Z}
 };
};
const framePair=(label,p,ia='frame1',ib='frame2',ta=0,tb=900)=>{
 const obs=project(p);
 return {label,...obs,frameAId:ia,frameBId:ib,timeAMs:ta,timeBMs:tb,reviewed:true};
};
test('7.10 measured baseline and reviewed rectified camera calibration mandatory',()=>{
 assert.equal(c.physicalScaleUnit,'mm');
 assert.equal(c.automaticallySolvedCameraPose,false);
 assert.throws(()=>createAIG710Calibration({width:640,height:480,focalPx:600,baselineMm:60}),/CALIBRATION_REQUIRED/);
 assert.throws(()=>createAIG710Calibration({width:640,height:480,focalPx:600,baselineMm:0,calibrationReviewed:true,rectifiedParallelReviewed:true}),/CALIBRATION_REQUIRED/);
 assert.throws(()=>createAIG710Calibration({width:640,height:480,focalPx:600,baselineMm:60,calibrationReviewed:true,rectifiedParallelReviewed:true,sourceId:'guess'}),/CALIBRATION_REQUIRED/);
});
test('7.10 genuine perspective parallax gives exact 3D world XYZ in mm',()=>{
 for(const world of [[0,0,600],[50,35,850],[-60,-45,1200],[80,12,1500]]){
  const obs=project(world),o=triangulateAIG710(c,obs.left,obs.right);
  assert.ok(Math.hypot(...o.xyzMm.map((v,i)=>v-world[i]))<.0001);
  assert.ok(o.disparityPx>=2);
  assert.ok(o.maxReprojectionErrorPx<.00001);
  assert.ok(o.parallaxAngleRad>.002);
  assert.equal(o.physicallyTriangulated,true);
  assert.equal(o.authenticHumanFaceReconstructed,false);
 }
});
test('7.10 reject frame pairs without enough trustworthy parallax or parallel epipolar position',()=>{
 const obs=project([30,15,800]);
 assert.throws(()=>triangulateAIG710(c,obs.left,{x:obs.left.x+5,y:obs.left.y}),/INSUFFICIENT_OR_NEGATIVE_PARALLAX/);
 assert.throws(()=>triangulateAIG710(c,obs.left,{x:obs.right.x,y:obs.right.y+6}),/EPIPOLAR_ERROR/);
 assert.throws(()=>triangulateAIG710(c,obs.left,{x:obs.left.x-1,y:obs.left.y}),/INSUFFICIENT_OR_NEGATIVE_PARALLAX/);
 assert.throws(()=>triangulateAIG710(c,{x:-5,y:30},obs.right),/OUT_OF_BOUNDS/);
 assert.throws(()=>triangulateAIG710(c,obs.left,obs.right,{maxRangeMm:60}),/DEPTH_RANGE/);
});
test('7.10 incrementally fuse calibrated matches without unbounded data or duplicate source frames',()=>{
 const f=createAIG710Fusion(c,{maxPoints:4,maxObservations:7});
 const o1=addAIG710StereoMatch(f,framePair('leftEye',[-25,35,700]));
 assert.equal(o1.pointCount,1);
 addAIG710StereoMatch(f,framePair('rightEye',[25,35,700]));
 addAIG710StereoMatch(f,framePair('leftEye',[-25.2,35.1,703],'frame3','frame4',2000,2900));
 assert.equal(f.features.get('leftEye').observations,2);
 assert.equal(f.revision,3);
 assert.throws(()=>addAIG710StereoMatch(f,framePair('leftEye',[-25,35,700])),/DUPLICATE/);
 assert.throws(()=>addAIG710StereoMatch(f,framePair('nose',[0,0,630],'frame1','frame1')),/REVIEWED_SOURCE/);
 assert.throws(()=>addAIG710StereoMatch(f,{...framePair('nose',[0,0,630]),reviewed:false}),/REVIEWED_SOURCE/);
 assert.throws(()=>addAIG710StereoMatch(f,framePair('leftEye',[20,40,400],'frame5','frame6',3000,3800)),/INCONSISTENT_3D_TRACK/);
 assert.equal(f.features.size,2);
 const summary=summarizeAIG710Fusion(f);
 assert.equal(summary.sparseXYZPointsReal,true);
 assert.equal(summary.dense3DSurfaceOrMeshBuilt,false);
 assert.equal(summary.fusedWithFastModel78SDF,false);
});
test('7.10 exact provenance JSON restore recomputes XYZ rather than trusting tampered floats',()=>{
 const f=createAIG710Fusion(c);
 addAIG710StereoMatch(f,framePair('nose',[10,0,680]));
 addAIG710StereoMatch(f,framePair('leftEye',[-40,30,725]));
 const out=exportAIG710Fusion(f);
 assert.equal(out.sourceVideoPixelsIncluded,false);
 assert.equal(out.actualDenseMeshOrAnimatedCharacterGenerated,false);
 const restored=importAIG710Fusion(out,{requiredSourceId:sourceId});
 assert.equal(restored.features.size,2);
 assert.ok(Math.abs(restored.features.get('nose').xyzMm[2]-680)<1e-6);
 const bad=structuredClone(out);bad.points[0].xyzMm[2]=100;
 assert.throws(()=>importAIG710Fusion(bad,{requiredSourceId:sourceId}),/TAMPERED/);
 assert.throws(()=>importAIG710Fusion(out,{requiredSourceId:'sha256:'+'b'.repeat(64)}),/SOURCE_OR_SCHEMA_INVALID/);
 const flipped=structuredClone(out);flipped.observations[0].reviewed=true;flipped.observations[0].sourceMatchReviewed=false;
 assert.throws(()=>importAIG710Fusion(flipped,{requiredSourceId:sourceId}),/REVIEWED_SOURCE/);
});
test('7.10 source-specific 3D point budget fails closed under many matches',()=>{
 const f=createAIG710Fusion(c,{maxPoints:2,maxObservations:3});
 addAIG710StereoMatch(f,framePair('a',[-40,10,720]));
 addAIG710StereoMatch(f,framePair('b',[40,10,720]));
 assert.throws(()=>addAIG710StereoMatch(f,framePair('c',[0,0,720])),/POINT_BUDGET/);
 assert.equal(f.features.size,2);
});
