import test from 'node:test';
import assert from 'node:assert/strict';
import {createObservedImplicitVolume} from '../aig-implicit-volume-7-1.mjs';
import {suggestAIG75GuidePoints,createAIG75ReviewedLandmarks,createAIG75Rig} from '../aig-landmark-rig-7-5.mjs';
import {createAIG76DepthProfile} from '../aig-face-depth-7-6.mjs';
import {AIG77_SCHEMA,createAIG77ReviewedRegions,createAIG77Layers,sampleAIG77Masks,
 deformAIG77Layers,undoAIG77Layers,sampleAIG77SDF,auditAIG77Layers,
 raycastAIG77,renderAIG77PhotoLayers} from '../aig-hair-neck-7-7.mjs';
const w=96,h=96,fg=new Uint8Array(w*h),hair=new Uint8Array(w*h),
 neck=new Uint8Array(w*h),rgba=new Uint8ClampedArray(w*h*4);
for(let y=0;y<h;y++)for(let x=0;x<w;x++){
 const index=y*w+x,k=index*4,inside=x>=22&&x<74&&y>=12&&y<84;
 fg[index]=inside?1:0;
 if(inside&&y<34)hair[index]=1;
 if(inside&&x>=40&&x<56&&y>=72)neck[index]=1;
 rgba.set(inside?(y<34?[57,42,31,255]:y>=72?[151,110,98,255]:[185,141,118,255]):[0,0,0,0],k);
}
const field=createObservedImplicitVolume({width:w,height:h,mask:fg},{maxGrid:96,halfDepth:.13}),
 roi={x:.27,y:.14,width:.46,height:.67,reviewed:true},
 points=suggestAIG75GuidePoints(roi).points,
 landmark=createAIG75ReviewedLandmarks({roi,points,reviewed:true,sourceSHA256:'e'.repeat(64)}),
 rig=createAIG75Rig(field,landmark),profile=createAIG76DepthProfile(rig),
 create=(mask=fg,hairMask=hair,neckMask=neck)=>createAIG77ReviewedRegions({
  width:w,height:h,foregroundMask:mask,hairMask,neckMask,reviewed:true,sourceSHA256:'e'.repeat(64)
 }),
 regions=create(),layers=createAIG77Layers(profile,regions,{hairLift:.040,neckSetback:.024});
function xyz(x,y,z=.13){const [hx,hy]=field.xyBounds;return [(x/w-.5)*2*hx,(.5-y/h)*2*hy,z];}
test('7.7 original RGB photo masks are independently reviewed and stay immutable',()=>{
 assert.equal(regions.schema,AIG77_SCHEMA);assert.equal(regions.reviewed,true);
 assert.equal(regions.hairAndNeckTrueZObserved,false);
 assert.ok(regions.hairPixels>100);assert.ok(regions.neckPixels>100);
 assert.equal(regions.sourceConnectionPixels,regions.neckPixels);
 assert.ok(regions.headNeckBoundaryPixels>2);
 assert.equal(regions.sourceSHA256,'e'.repeat(64));
 assert.equal(rgba[(20*w+30)*4],57);
 const different=layers.regions.hairMask;different[20*w+30]=0;
 assert.equal(hair[20*w+30],1,'source segmentation mask is not overwritten by editable working copy');
});
test('7.7 detached or overlapping hair-neck, unsupported source, and unreviewed masks BLOCK',()=>{
 assert.throws(()=>createAIG77ReviewedRegions({width:w,height:h,foregroundMask:fg,hairMask:hair,neckMask:neck}),/REVIEW_REQUIRED/);
 const duplicated=new Uint8Array(neck);duplicated[20*w+30]=1;
 assert.throws(()=>create(fg,hair,duplicated),/OVERLAP_BLOCKED/);
 const detached=new Uint8Array(fg);
 for(let x=0;x<w;x++)detached[65*w+x]=0;
 assert.throws(()=>create(detached),/DISCONNECTED_SOURCE/);
 const invalidHair=new Uint8Array(hair);invalidHair[0]=1;
 assert.throws(()=>create(fg,invalidHair,neck),/OUTSIDE_SOURCE_FOREGROUND/);
 assert.throws(()=>createAIG77Layers(profile,regions,{hairLift:10}),/LAYER_SETTINGS_INVALID/);
});
test('7.7 real XYZ layer has hair above source skin and neck recessed behind it',()=>{
 const top=xyz(40,23),bottom=xyz(48,78);
 const qHair=sampleAIG77Masks(layers,top),qNeck=sampleAIG77Masks(layers,bottom);
 assert.ok(qHair.hair>.9);assert.ok(qNeck.neck>.9);
 const h1=deformAIG77Layers(layers,top),n1=deformAIG77Layers(layers,bottom);
 assert.ok(h1[2]-top[2]>.03,'hair strands represented as estimated outer Z layer');
 assert.ok(n1[2]-bottom[2]<-.015,'neck is physically set behind face reference');
 const recovered=undoAIG77Layers(layers,h1);
 assert.ok(Math.abs(recovered[2]-top[2])<.0001);
 assert.equal(deformAIG77Layers(layers,[top[0],top[1],-field.halfDepth])[2],-field.halfDepth);
});
test('7.7 3D anti-fold quality tracks connected original photo regions and skin source',()=>{
 const q=auditAIG77Layers(layers,{smile:.7,jawOpen:.6},{grid:8});
 assert.equal(q.passed,true);assert.equal(q.faceGatePassed,true);assert.equal(q.depthGatePassed,true);
 assert.equal(q.sourceNeckConnected,true);
 assert.equal(q.invalidZSamples,0);assert.ok(q.minimumZDerivative>.25);
 assert.ok(q.maxInverseError<.003);
 assert.equal(q.realHairFibrePhysicsVerified,false);
 assert.equal(q.actualSkinContactVerified,false);
 assert.equal(q.trueAnatomicalHeadNeckApproved,false);
});
test('7.7 source hair and neck Z depth changes actual signed distance and front camera pixels',()=>{
 const hairP=xyz(40,23,.13),flat=createAIG77Layers(profile,regions,{hairLift:0,neckSetback:0}),
  a=sampleAIG77SDF(flat,{},[hairP[0],hairP[1],.146]),
  b=sampleAIG77SDF(layers,{},[hairP[0],hairP[1],.146]);
 assert.ok(Math.abs(a.distance-b.distance)>.004);
 const image={width:w,height:h,data:rgba},opts={width:25,height:24,maxSteps:67,yaw:.43};
 const r0=renderAIG77PhotoLayers(flat,image,opts),r1=renderAIG77PhotoLayers(layers,image,opts);
 assert.ok(r0.hitPixels>35&&r1.hitPixels>35);
 assert.notDeepEqual(r0.pixels,r1.pixels,'changing photo-hair world-Z alters rendered output');
 assert.equal(r1.estimatedHairAndNeckZ,true);
 assert.equal(r1.referenceCharacterVisuallyApproved,false);
});
test('7.7 backside NEVER mirrors source hair, face or neck onto invisible surface',()=>{
 const image={width:w,height:h,data:rgba};
 const back=renderAIG77PhotoLayers(layers,image,{width:25,height:24,yaw:Math.PI,maxSteps:68});
 assert.ok(back.neutralRearPixels>35);
 assert.equal(back.photoPixels,0);assert.equal(back.hairHits,0);assert.equal(back.neckHits,0);
 assert.equal(back.trueHairStrandsOrMusclesReconstructed,false);
 const ray=raycastAIG77(layers,{},[0,0,1],[0,0,-1]);
 assert.equal(ray.hit,true);assert.equal(ray.referencePoint.length,3);
});
test('7.7 memory budgets, invalid type and non-finite world positions are blocked',()=>{
 assert.throws(()=>createAIG77ReviewedRegions({width:10000,height:10000}),/REGION_DIMENSION/);
 assert.throws(()=>deformAIG77Layers(layers,[Infinity,0,0]),/MASK_QUERY/);
 assert.throws(()=>undoAIG77Layers(layers,[0,NaN,0]),/INVERSE_INVALID/);
 assert.throws(()=>renderAIG77PhotoLayers(layers,{width:w,height:h,data:rgba},{width:300,height:300}),/RENDER_INVALID/);
});
