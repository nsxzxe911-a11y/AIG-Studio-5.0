import test from 'node:test';
import assert from 'node:assert/strict';
import {createObservedImplicitVolume} from '../aig-implicit-volume-7-1.mjs';
import {
 AIG75_SCHEMA,AIG75_KEYS,suggestAIG75GuidePoints,createAIG75ReviewedLandmarks,
 createAIG75Rig,warpAIG75World,inverseAIG75World,sampleAIG75SDF,
 auditAIG75Rig,raycastAIG75,renderAIG75LandmarkAvatar
} from '../aig-landmark-rig-7-5.mjs';
const w=96,h=96,mask=new Uint8Array(w*h),rgba=new Uint8ClampedArray(w*h*4);
for(let y=0;y<h;y++)for(let x=0;x<w;x++){
 const fg=x>=22&&x<74&&y>=12&&y<84,k=(y*w+x)*4;mask[y*w+x]=fg?1:0;
 rgba.set(fg?[175,132,118,255]:[0,0,0,0],k);
}
const field=createObservedImplicitVolume({width:w,height:h,mask},{maxGrid:96,halfDepth:.13}),
 source={width:w,height:h,data:rgba},roi={x:.27,y:.14,width:.46,height:.67,reviewed:true},
 sha='f'.repeat(64),guide=suggestAIG75GuidePoints(roi);
const reviewed=createAIG75ReviewedLandmarks({roi,points:guide.points,reviewed:true,sourceSHA256:sha});
const rig=createAIG75Rig(field,reviewed);
test('7.5 guides are explicitly unverified until user reviews all 10 actual photo XY points',()=>{
 assert.equal(guide.reviewed,false);assert.equal(AIG75_KEYS.length,10);
 assert.equal(guide.origin,'UNVERIFIED_GUIDE_POINTS_NOT_IMAGE_DETECTION');
 assert.equal(reviewed.schema,AIG75_SCHEMA);assert.equal(reviewed.zDepthMeasured,false);
 assert.equal(reviewed.origin,'USER_REVIEWED_2D_PIXEL_LOCATIONS');
 assert.equal(reviewed.faceIdentityVerified,false);
});
test('7.5 image landmark topology and invalid review fail closed',()=>{
 assert.throws(()=>createAIG75ReviewedLandmarks({roi,points:guide.points,reviewed:false,sourceSHA256:sha}),/USER_REVIEW/);
 assert.throws(()=>createAIG75ReviewedLandmarks({roi,points:{...guide.points,leftEye:[-1,.4]},reviewed:true}),/LANDMARK_OUTSIDE/);
 const swapped={...guide.points,leftEye:guide.points.rightEye,rightEye:guide.points.leftEye};
 assert.throws(()=>createAIG75ReviewedLandmarks({roi,points:swapped,reviewed:true}),/FEATURE_TOPOLOGY/);
 assert.throws(()=>createAIG75ReviewedLandmarks({roi,points:guide.points,reviewed:true,sourceSHA256:'abc'}),/SOURCE_SHA/);
});
test('7.5 true XYZ registered handle inverse maps back to original source geometry',()=>{
 const point=[0,-.18,.115],expr={jawOpen:.9,smile:.8};
 const newPoint=warpAIG75World(rig,expr,point),recovered=inverseAIG75World(rig,expr,newPoint);
 assert.ok(Math.hypot(...newPoint.map((x,i)=>x-point[i]))>.001);
 assert.ok(Math.hypot(...recovered.map((x,i)=>x-point[i]))<.003);
 assert.equal(sampleAIG75SDF(rig,expr,newPoint).threeD,true);
});
test('7.5 jacobian gate catches invalid fold and must not claim photoreal human pass',()=>{
 const idle=auditAIG75Rig(rig,{}),stress=auditAIG75Rig(rig,{
  jawOpen:1,smile:1,blinkLeft:1,blinkRight:1,browRaise:1
 });
 assert.ok(idle.minJacobian>.99);assert.equal(idle.maxDisplacement,0);
 assert.ok(stress.minJacobian>.2);assert.equal(stress.foldOrInversionSamples,0);
 assert.equal(stress.passed,true);assert.equal(stress.real3dFaceShapeRecovered,false);
 assert.equal(stress.anatomicalFacialRigApproved,false);
});
test('7.5 real XYZ surface ray and photo-material render changes under expression',()=>{
 const neutral=renderAIG75LandmarkAvatar(rig,source,{width:42,height:42,maxSteps:85}),
  action=renderAIG75LandmarkAvatar(rig,source,{
   width:42,height:42,maxSteps:85,expression:{jawOpen:1,smile:1,browRaise:1,blinkLeft:1,blinkRight:1}
  });
 assert.ok(neutral.hitPixels>100);assert.ok(action.hitPixels>100);
 assert.notDeepEqual(neutral.pixels,action.pixels);
 assert.equal(action.quality.passed,true);
 assert.equal(action.truePhotographic3DHeadRecovered,false);
 const ray=raycastAIG75(rig,{jawOpen:.8},[0,-.2,1],[0,0,-1]);
 assert.equal(ray.hit,true);assert.equal(ray.referencePoint.length,3);
});
test('7.5 rotating to rear never clones an unobserved second face',()=>{
 const rear=renderAIG75LandmarkAvatar(rig,source,{
  width:42,height:42,maxSteps:85,yaw:Math.PI,expression:{smile:1}
 });
 assert.ok(rear.neutralRearPixels>100);
 assert.equal(rear.photoPixels,0);
 assert.equal(rear.actualMultiplayerServer,false);
});
test('7.5 rejects nonfinite points, unsafe geometry budgets and invalid expression',()=>{
 assert.throws(()=>createAIG75Rig(field,reviewed,{strength:3}),/RIG_INPUT/);
 assert.throws(()=>inverseAIG75World(rig,{},[NaN,0,0]),/INVERSE_INVALID/);
 assert.throws(()=>raycastAIG75(rig,{},[0,0,1],[0,0,0]),/RAY_INPUT/);
 assert.throws(()=>renderAIG75LandmarkAvatar(rig,source,{width:400,height:200}),/RENDER_INPUT/);
 assert.throws(()=>auditAIG75Rig(rig,{smile:2}),/EXPRESSION_RANGE/);
});
