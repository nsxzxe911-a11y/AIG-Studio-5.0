import test from 'node:test';
import assert from 'node:assert/strict';
import {createObservedImplicitVolume} from '../aig-implicit-volume-7-1.mjs';
import {suggestAIG75GuidePoints,createAIG75ReviewedLandmarks,createAIG75Rig} from '../aig-landmark-rig-7-5.mjs';
import {AIG76_SCHEMA,createAIG76DepthSettings,createAIG76DepthProfile,depthAIG76At,
 deformAIG76Depth,undoAIG76Depth,sampleAIG76Face,auditAIG76Depth,
 raycastAIG76Face,renderAIG76DepthAvatar} from '../aig-face-depth-7-6.mjs';
const w=96,h=96,mask=new Uint8Array(w*h),rgba=new Uint8ClampedArray(w*h*4);
for(let y=0;y<h;y++)for(let x=0;x<w;x++){
 const fg=x>=22&&x<74&&y>=12&&y<84,k=(y*w+x)*4;
 mask[y*w+x]=fg?1:0;rgba.set(fg?[174,135,116,255]:[0,0,0,0],k);
}
const image={width:w,height:h,data:rgba},
 field=createObservedImplicitVolume({width:w,height:h,mask},{maxGrid:96,halfDepth:.13}),
 roi={x:.27,y:.14,width:.46,height:.67,reviewed:true},
 points=suggestAIG75GuidePoints(roi).points,
 lm=createAIG75ReviewedLandmarks({roi,points,reviewed:true,sourceSHA256:'f'.repeat(64)}),
 rig=createAIG75Rig(field,lm);
test('7.6 photo XY is reviewed but Z depth explicitly estimated and adjustable',()=>{
 const p=createAIG76DepthProfile(rig);
 assert.equal(p.schema,AIG76_SCHEMA);
 assert.equal(p.confirmedPhotogrammetricDepth,false);
 assert.equal(p.settings.sourceDepthMeasured,false);
 assert.equal(p.measurement,'USER_REVIEWED_XY_ONLY_Z_ESTIMATED');
 assert.equal(p.headNeckMeshVerified,false);
 assert.ok(p.contributions.some(x=>x.name==='nose'));
 assert.equal(lm.zDepthMeasured,false);
});
test('7.6 nose and lip depth move physically different 3D surface points, not skin tint',()=>{
 const nose=rig.handles.nose,p=[nose[0],nose[1],field.halfDepth];
 const baseline=createAIG76DepthProfile(rig,{nose:0,bridge:0,eyeSockets:0,lips:0,chin:0});
 const active=createAIG76DepthProfile(rig,{nose:.045,bridge:.01,eyeSockets:.012,lips:.026,chin:.015});
 const z0=deformAIG76Depth(baseline,p)[2],z1=deformAIG76Depth(active,p)[2];
 assert.ok(z1-z0>.03);
 assert.ok(depthAIG76At(active,p[0],p[1])>depthAIG76At(baseline,p[0],p[1]));
 const upper=rig.handles.upperLip;
 assert.ok(deformAIG76Depth(active,[upper[0],upper[1],field.halfDepth])[2]>z0);
 assert.equal(deformAIG76Depth(active,[p[0],p[1],-field.halfDepth])[2],-field.halfDepth);
});
test('7.6 inverse Z displacement is stable with submillimeter-esque normalized tolerance',()=>{
 const profile=createAIG76DepthProfile(rig);
 let maxError=0;
 for(const z of [-.13,-.08,0,.07,.13]){
  for(const key of ['nose','leftEye','upperLip','chin']){
   const p=[rig.handles[key][0],rig.handles[key][1],z];
   const transformed=deformAIG76Depth(profile,p),restored=undoAIG76Depth(profile,transformed);
   maxError=Math.max(maxError,...p.map((n,i)=>Math.abs(n-restored[i])));
  }
 }
 assert.ok(maxError<.0002);
 const q=auditAIG76Depth(profile,{jawOpen:1,blinkLeft:1,smile:1},{grid:6});
 assert.equal(q.passed,true);assert.equal(q.folds,0);
 assert.ok(q.minZDerivative>.25);assert.ok(q.maxRoundtripError<.003);
 assert.equal(q.trueMeasured3DDepth,false);
});
test('7.6 depth shape is not same as flat field under real XYZ ray/signed-distance sampling',()=>{
 const nose=rig.handles.nose,p=[nose[0],nose[1],field.halfDepth];
 const flat=createAIG76DepthProfile(rig,{globalDepthScale:0});
 const depth=createAIG76DepthProfile(rig,{nose:.05,globalDepthScale:1});
 const probe=[p[0],p[1],p[2]+.02];
 assert.ok(Math.abs(sampleAIG76Face(flat,{},probe).distance-sampleAIG76Face(depth,{},probe).distance)>.003);
 const eye=[nose[0],nose[1],1],dir=[0,0,-1];
 const hit0=raycastAIG76Face(flat,{},eye,dir),hit1=raycastAIG76Face(depth,{},eye,dir);
 assert.equal(hit0.hit,true);assert.equal(hit1.hit,true);
 assert.ok(hit1.point[2]>hit0.point[2]+.01);
});
test('7.6 actual front and profile camera pixels respond to changed Z shape',()=>{
 const src={width:96,height:96,data:rgba},flat=createAIG76DepthProfile(rig,{globalDepthScale:0}),
  sculpt=createAIG76DepthProfile(rig,{nose:.06,bridge:.02,eyeSockets:.012,globalDepthScale:1});
 const opts={width:26,height:26,maxSteps:65,yaw:.8};
 const a=renderAIG76DepthAvatar(flat,src,opts),b=renderAIG76DepthAvatar(sculpt,src,opts);
 assert.ok(a.hitPixels>35&&b.hitPixels>35);assert.notDeepEqual(a.pixels,b.pixels);
 assert.equal(b.estimatedHeadDepth,true);
 assert.equal(b.measuredPhotoGeometryZ,false);
 assert.equal(b.realCharacterAppearanceApproved,false);
 const rear=renderAIG76DepthAvatar(sculpt,src,{...opts,yaw:Math.PI});
 assert.ok(rear.neutralRearPixels>35);assert.equal(rear.photoPixels,0);
});
test('7.6 refuse fabricated anatomy and unsafe depth or sampling budget',()=>{
 assert.throws(()=>createAIG76DepthSettings({nose:-.01}),/DEPTH_SETTINGS_INVALID/);
 assert.throws(()=>createAIG76DepthSettings({globalDepthScale:3}),/DEPTH_SETTINGS_INVALID/);
 assert.throws(()=>createAIG76DepthProfile(null),/REVIEWED_RIG_REQUIRED/);
 assert.throws(()=>undoAIG76Depth(createAIG76DepthProfile(rig),[Infinity,0,0]),/INVERSE_INVALID/);
 assert.throws(()=>renderAIG76DepthAvatar(createAIG76DepthProfile(rig),image,{width:500,height:50}),/RENDER_INPUT_INVALID/);
});
