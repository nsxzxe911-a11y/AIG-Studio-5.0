import test from 'node:test';
import assert from 'node:assert/strict';
import {createObservedImplicitVolume} from '../aig-implicit-volume-7-1.mjs';
import {
 AIG74_SCHEMA,AIG74_CHANNELS,createAIG74AvatarPreset,parseAIG74AvatarPreset,
 createAIG74Expression,evaluateAIG74Clip,warpAIG74FacePoint,
 inverseAIG74FacePoint,sampleAIG74ExpressionVolume,raycastAIG74Expression,
 renderAIG74Avatar
} from '../aig-avatar-rig-7-4.mjs';
const width=96,height=96,mask=new Uint8Array(width*height),data=new Uint8ClampedArray(width*height*4);
for(let y=0;y<height;y++)for(let x=0;x<width;x++){
 const fg=x>=22&&x<74&&y>=12&&y<84,k=(y*width+x)*4;mask[y*width+x]=fg?1:0;
 data[k]=fg?180:0;data[k+1]=fg?135:0;data[k+2]=fg?118:0;data[k+3]=fg?255:0;
}
const source={width,height,data},field=createObservedImplicitVolume({width,height,mask},{maxGrid:96,halfDepth:.13}),
 faceROI={x:.27,y:.14,width:.46,height:.67,reviewed:true},sourceSHA256='f'.repeat(64);
test('7.4 game-avatar preset is source-anchored, JSON roundtrip and contains zero private image pixels',()=>{
 const p=createAIG74AvatarPreset({sourceSHA256,faceROI,name:'Game hero',expression:{smile:.4}});
 const json=JSON.stringify(p),roundtrip=parseAIG74AvatarPreset(json,sourceSHA256);
 assert.equal(p.schema,AIG74_SCHEMA);assert.deepEqual(roundtrip,p);
 assert.equal(p.faceLandmarksMeasured,false);assert.equal(p.anatomicalFaceReconstructionVerified,false);
 assert.equal(p.networkProfileSynced,false);
 assert.ok(!json.includes('"data"'));assert.ok(!json.includes('"pixels"'));assert.ok(json.length<3000);
 assert.deepEqual(AIG74_CHANNELS,['jawOpen','smile','blinkLeft','blinkRight','browRaise']);
});
test('7.4 preset rejects unreviewed face box, spoofed photo source and oversized JSON import',()=>{
 assert.throws(()=>createAIG74AvatarPreset({sourceSHA256,faceROI:{...faceROI,reviewed:false}}),/PRESET_SOURCE_OR_REVIEW/);
 const valid=createAIG74AvatarPreset({sourceSHA256,faceROI});
 assert.throws(()=>parseAIG74AvatarPreset(JSON.stringify(valid),'e'.repeat(64)),/PHOTO_SHA_MISMATCH/);
 assert.throws(()=>parseAIG74AvatarPreset('a'.repeat(16001),sourceSHA256),/JSON_BUDGET/);
 assert.throws(()=>createAIG74AvatarPreset({sourceSHA256,faceROI,expression:{ghostEye:1}}),/EXPRESSION_CHANNEL/);
 assert.throws(()=>createAIG74AvatarPreset({sourceSHA256,faceROI,makeup:{secret:'x'}}),/PRESET_MAKEUP/);
});
test('7.4 expression engine is bounded and clip evaluation deterministic',()=>{
 const closed=createAIG74Expression(),blinking=evaluateAIG74Clip('blink',.13),talk=evaluateAIG74Clip('talk',.31);
 assert.equal(closed.jawOpen,0);assert.ok(blinking.blinkLeft>.95);assert.equal(blinking.blinkRight,blinking.blinkLeft);
 assert.ok(talk.jawOpen>.2);assert.deepEqual(evaluateAIG74Clip('talk',.31),talk);
 assert.throws(()=>createAIG74Expression({smile:2}),/EXPRESSION_RANGE/);
 assert.throws(()=>evaluateAIG74Clip('unknown',0),/CLIP_OR_TIME_INVALID/);
});
test('7.4 anatomy claims remain blocked while world-space XYZ surface visibly deforms',()=>{
 const rest={jawOpen:0},active={jawOpen:1},world=[0,-.22,.13],
  a=sampleAIG74ExpressionVolume(field,faceROI,rest,world),
  b=sampleAIG74ExpressionVolume(field,faceROI,active,world),
  point=[.02,-.22,.1];
 assert.ok(Math.abs(a.signedDistance-b.signedDistance)>.002);
 const forward=warpAIG74FacePoint(field,faceROI,{jawOpen:1,smile:.5},point);
 const inverse=inverseAIG74FacePoint(field,faceROI,{jawOpen:1,smile:.5},forward);
 assert.ok(Math.hypot(...inverse.map((v,i)=>v-point[i]))<.002);
 assert.ok(Math.abs(forward[1]-point[1])>.01);
 assert.equal(a.anatomicalSkinVerified,false);
 const r0=raycastAIG74Expression(field,faceROI,{},[0,-.22,1],[0,0,-1]);
 const r1=raycastAIG74Expression(field,faceROI,{jawOpen:1},[0,-.22,1],[0,0,-1]);
 assert.equal(r0.hit,true);assert.equal(r1.hit,true);
 assert.ok(Math.abs(r0.point[2]-r1.point[2])>.01);
});
test('7.4 camera ray traced results differ after face morph and rotation, no second back face',()=>{
 const props={faceROI,width:48,height:44,maxSteps:82};
 const a=renderAIG74Avatar(field,source,{...props,yaw:0,expression:{}});
 const b=renderAIG74Avatar(field,source,{...props,yaw:0,expression:{jawOpen:1,smile:.8,blinkLeft:1,blinkRight:1,browRaise:.6}});
 const rear=renderAIG74Avatar(field,source,{...props,yaw:Math.PI,expression:{smile:.9}});
 assert.ok(a.hits>120);assert.ok(b.hits>120);
 assert.notDeepEqual(a.pixels,b.pixels);
 assert.ok(rear.estimatedRearPixels>120);assert.equal(rear.sourcePhotoPixels,0);
 assert.equal(a.anatomicalFacialRigApproved,false);assert.equal(a.actualMMOServer,false);
});
test('7.4 malformed coordinates / invalid camera budgets fail safely',()=>{
 assert.throws(()=>inverseAIG74FacePoint(field,faceROI,{},[Infinity,0,0]),/INVERSE_INPUT/);
 assert.throws(()=>raycastAIG74Expression(field,faceROI,{},[0,0,1],[0,0,0]),/RAY_INVALID/);
 assert.throws(()=>renderAIG74Avatar(field,source,{faceROI,width:300,height:300}),/RENDER_INPUT/);
});
