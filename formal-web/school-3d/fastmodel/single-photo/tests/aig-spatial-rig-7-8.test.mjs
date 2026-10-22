import test from 'node:test';
import assert from 'node:assert/strict';
import {createObservedImplicitVolume} from '../aig-implicit-volume-7-1.mjs';
import {suggestAIG75GuidePoints,createAIG75ReviewedLandmarks,createAIG75Rig} from '../aig-landmark-rig-7-5.mjs';
import {createAIG76DepthProfile} from '../aig-face-depth-7-6.mjs';
import {createAIG77ReviewedRegions,createAIG77Layers} from '../aig-hair-neck-7-7.mjs';
import {AIG78_SCHEMA,createAIG78SpatialPose,warpAIG78Spatial,invertAIG78Spatial,
 sampleAIG78SpatialSDF,auditAIG78Spatial,raycastAIG78Spatial,renderAIG78SpatialAvatar
} from '../aig-spatial-rig-7-8.mjs';
const w=96,h=96,fg=new Uint8Array(w*h),hair=new Uint8Array(w*h),neck=new Uint8Array(w*h),
 rgba=new Uint8ClampedArray(w*h*4);
for(let y=0;y<h;y++)for(let x=0;x<w;x++){
 const k=y*w+x,inside=x>=22&&x<74&&y>=12&&y<84;
 fg[k]=inside?1:0;
 if(inside&&y<34)hair[k]=1;
 if(inside&&x>=40&&x<56&&y>=72)neck[k]=1;
 rgba.set(inside?(y<34?[57,42,31,255]:y>=72?[151,110,98,255]:[185,141,118,255]):[0,0,0,0],4*k);
}
const field=createObservedImplicitVolume({width:w,height:h,mask:fg},{maxGrid:96,halfDepth:.13}),
 roi={x:.27,y:.14,width:.46,height:.67,reviewed:true},
 reviewed=createAIG75ReviewedLandmarks({roi,points:suggestAIG75GuidePoints(roi).points,
  reviewed:true,sourceSHA256:'f'.repeat(64)}),
 rig=createAIG75Rig(field,reviewed),profile=createAIG76DepthProfile(rig),
 masks=createAIG77ReviewedRegions({width:w,height:h,foregroundMask:fg,hairMask:hair,neckMask:neck,reviewed:true}),
 layers=createAIG77Layers(profile,masks,{hairLift:.035,neckSetback:.018}),
 image={width:w,height:h,data:rgba};
const dist=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
test('7.8 user-reviewed neck source becomes genuine articulated local 3D spatial pivot',()=>{
 const pose=createAIG78SpatialPose(layers,{yaw:.24,pitch:.16,roll:.12});
 assert.equal(pose.schema,AIG78_SCHEMA);
 assert.equal(pose.sourceNeckHingeReviewed2D,true);
 assert.equal(pose.trueNeckBoneLocationMeasured3D,false);
 assert.ok(pose.hinge.high>pose.hinge.low);
 assert.ok(pose.hinge.neckPixelSpan>8);
 assert.equal(pose.rigAnatomyCertified,false);
});
test('7.8 actually rotates hair/head XYZ with yaw pitch roll, not merely moves camera',()=>{
 const rest=createAIG78SpatialPose(layers),turn=createAIG78SpatialPose(layers,{yaw:.28,pitch:.16,roll:.11,hairSway:.014});
 const p=[.08,.19,.13],a=warpAIG78Spatial(rest,p),b=warpAIG78Spatial(turn,p);
 assert.ok(dist(a,b)>.025);
 assert.ok(Math.abs(b[0]-a[0])>.01);
 assert.ok(Math.abs(b[1]-a[1])>.008);
 assert.ok(Math.abs(b[2]-a[2])>.008);
 const low=[.015,turn.hinge.low-.06,0],off=warpAIG78Spatial(turn,low);
 assert.ok(dist(low,off)<.001,'lower neck anchor must not detach');
 assert.ok(dist(p,warpAIG78Spatial(turn,p))>dist(low,off));
});
test('7.8 blended 3D neck keeps inverse ray reference stable and avoids fold',()=>{
 const pose=createAIG78SpatialPose(layers,{yaw:.26,pitch:.16,roll:.08,hairSway:.009});
 const check=auditAIG78Spatial(pose,{jawOpen:.4,smile:.4},{grid:6});
 assert.equal(check.parent7_7Passed,true);
 assert.equal(check.passed,true);
 assert.equal(check.foldSamples,0);
 assert.equal(check.nonConvergedSamples,0);
 assert.equal(check.neckSeamDiscontinuities,0);
 assert.equal(check.collisionDetected,false);
 assert.ok(check.minimumJacobian>.18);
 const p=[.03,pose.hinge.high+.015,.13],world=warpAIG78Spatial(pose,p),
  inverse=invertAIG78Spatial(pose,world);
 assert.equal(inverse.converged,true);
 assert.ok(dist(p,inverse.reference)<.012);
 assert.equal(sampleAIG78SpatialSDF(pose,{},world).converged,true);
});
test('7.8 turn head in model space creates actually different front ray pixels',()=>{
 const a=renderAIG78SpatialAvatar(createAIG78SpatialPose(layers),image,
  {width:22,height:22,maxSteps:60}),
  b=renderAIG78SpatialAvatar(createAIG78SpatialPose(layers,{yaw:.32,pitch:.13,roll:.09,hairSway:.008}),image,
  {width:22,height:22,maxSteps:60});
 assert.ok(a.hitPixels>25&&b.hitPixels>25);
 assert.notDeepEqual(a.pixels,b.pixels);
 assert.equal(b.quality.passed,true);
 assert.equal(b.trueSpatial3DGeometryMoves,true);
 assert.equal(b.realHumanAvatarCertified,false);
 assert.equal(b.truePhysicalHairStrandsSimulated,false);
});
test('7.8 original front photograph cannot reappear on unseen back of 3D head',()=>{
 const pose=createAIG78SpatialPose(layers,{yaw:.20});
 const rear=renderAIG78SpatialAvatar(pose,image,
  {cameraYaw:Math.PI,width:22,height:22,maxSteps:60});
 assert.ok(rear.neutralRearPixels>25);
 assert.equal(rear.photoPixels,0);
 const ray=raycastAIG78Spatial(pose,{},[0,0,1],[0,0,-1]);
 assert.equal(ray.hit,true);assert.equal(ray.referencePoint.length,3);
});
test('7.8 reject unreviewed layer, excessive twist and unbounded compute',()=>{
 assert.throws(()=>createAIG78SpatialPose(null),/POSE_RANGE_OR_SOURCE/);
 assert.throws(()=>createAIG78SpatialPose(layers,{yaw:2}),/POSE_RANGE_OR_SOURCE/);
 assert.throws(()=>createAIG78SpatialPose(layers,{hairSway:1}),/POSE_RANGE_OR_SOURCE/);
 assert.throws(()=>invertAIG78Spatial(createAIG78SpatialPose(layers),[NaN,0,0]),/INVERSE_INPUT/);
 assert.throws(()=>renderAIG78SpatialAvatar(createAIG78SpatialPose(layers),image,
  {width:200,height:200}),/RENDER_INPUT/);
});
