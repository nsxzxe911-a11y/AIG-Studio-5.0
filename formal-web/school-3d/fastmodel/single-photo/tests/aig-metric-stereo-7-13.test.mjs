import test from 'node:test';
import assert from 'node:assert/strict';
import {createAIG713StereoCalibration,reconstructAIG713StereoSurface}
 from '../aig-metric-stereo-7-13.mjs';
const digest=v=>'sha256:'+v.repeat(64);
function texturedStereo(width=112,height=80,shift=8){
 const left=new Uint8ClampedArray(width*height*4),
  right=new Uint8ClampedArray(width*height*4);
 const rnd=(x,y)=>{
  let t=(((x+200)*73856093)^((y+300)*19349663))>>>0;
  t^=t<<13;t^=t>>>17;t^=t<<5;
  return (t>>>0)%256;
 };
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const k=(y*width+x)*4,value=rnd(x,y);
  left.set([value,value,value,255],k);
  const original=x+shift;
  const v=original<width?rnd(original,y):0;
  right.set([v,v,v,255],k);
 }
 return [{width,height,data:left},{width,height,data:right}];
}
const calibration=(w=112,h=80)=>createAIG713StereoCalibration({
 width:w,height:h,focalPx:120,baselineMm:60,
 calibrationReviewed:true,rectifiedParallelReviewed:true,
 physicallyMeasuredBaseline:true,
 leftSHA256:digest('a'),rightSHA256:digest('b')
});
test('7.13 produces true dense-ish 3D positions in physical millimetres from observed disparity',()=>{
 const [left,right]=texturedStereo(),cal=calibration();
 const m=reconstructAIG713StereoSurface(left,right,cal,{
  stride:2,patchRadius:1,minDisparity:4,maxDisparity:12,
  minTextureVariance:20,uniquenessMargin:.06,minCorrespondences:40,
  maxPixelComparisons:90000000
 });
 assert.equal(m.unit,'mm');
 assert.equal(m.oneToOneUnitScale,true);
 assert.ok(m.vertexCount>400,m.vertexCount);
 assert.ok(m.triangleCount>400,m.triangleCount);
 assert.equal(m.positions.length,m.vertexCount*3);
 assert.equal(m.uvs.length,m.vertexCount*2);
 assert.equal(m.indices.length,m.triangleCount*3);
 assert.ok(m.indices.every(i=>i<m.vertexCount));
 assert.equal(m.leftSHA256,cal.leftSHA256);
 assert.equal(m.rightSHA256,cal.rightSHA256);
 const z=[...m.positions].filter((_,i)=>i%3===2).sort((a,b)=>a-b);
 // True Z = f_px(120) * measured baseline(60mm) / 8px = 900 mm.
 assert.ok(Math.abs(z[Math.floor(z.length/2)]-900)<.5,z[Math.floor(z.length/2)]);
 assert.equal(m.backsideReconstructed,false);
 assert.equal(m.hiddenGeometryInvented,false);
 assert.equal(m.worldCADOriginUnknown,true);
 assert.equal(m.physicallyVerifiedIndividualPointAccuracy,false);
});
test('7.13 physical mm scale changes exactly with measured camera baseline, never mesh decimation',()=>{
 const [l,r]=texturedStereo();
 const a=calibration(),b=createAIG713StereoCalibration({
  ...a,baselineMm:120,
  calibrationReviewed:true,rectifiedParallelReviewed:true,physicallyMeasuredBaseline:true
 });
 const opts={stride:2,patchRadius:1,minDisparity:4,maxDisparity:12,
  minTextureVariance:20,uniquenessMargin:.06,minCorrespondences:40};
 const mesh1=reconstructAIG713StereoSurface(l,r,a,opts),
  mesh2=reconstructAIG713StereoSurface(l,r,b,opts);
 assert.equal(mesh1.vertexCount,mesh2.vertexCount);
 assert.equal(mesh1.triangleCount,mesh2.triangleCount);
 const at=15;assert.ok(Math.abs(mesh1.positions[at]*2-mesh2.positions[at])<.0002);
});
test('no physically measured camera baseline or rectified source means no false 1:1',()=>{
 const valid=calibration();
 assert.throws(()=>createAIG713StereoCalibration({...valid,
  physicallyMeasuredBaseline:false}),/PHYSICAL_CALIBRATION_REQUIRED/);
 assert.throws(()=>createAIG713StereoCalibration({...valid,
  rectifiedParallelReviewed:false}),/PHYSICAL_CALIBRATION_REQUIRED/);
 assert.throws(()=>createAIG713StereoCalibration({...valid,
  baselineMm:0}),/PHYSICAL_CALIBRATION_REQUIRED/);
 assert.throws(()=>createAIG713StereoCalibration({...valid,
  rightSHA256:valid.leftSHA256}),/PHYSICAL_CALIBRATION_REQUIRED/);
});
test('uniform or duplicate textured pictures cannot pass as a fake dense stereo model',()=>{
 const c=calibration(),pixels=new Uint8ClampedArray(c.width*c.height*4);
 for(let i=0;i<pixels.length;i+=4)pixels.set([120,120,120,255],i);
 const img={width:c.width,height:c.height,data:pixels};
 assert.throws(()=>reconstructAIG713StereoSurface(img,img,c,{
  stride:2,patchRadius:1,minDisparity:4,maxDisparity:12,minCorrespondences:30
 }),/INSUFFICIENT_UNAMBIGUOUS_STEREO_DEPTH/);
});
test('bounded compute, image bytes, source calibration and grid triangle holes fail closed',()=>{
 const c=calibration(),[l,r]=texturedStereo();
 assert.throws(()=>reconstructAIG713StereoSurface(l,r,c,{
  stride:1,patchRadius:3,minDisparity:1,maxDisparity:60,
  maxPixelComparisons:100000
 }),/STEREO_WORK_LIMIT_EXCEEDED/);
 assert.throws(()=>reconstructAIG713StereoSurface({...l,data:new Uint8Array(32)},r,c),
  /IMAGE_RGBA_SOURCE_INVALID/);
 assert.throws(()=>reconstructAIG713StereoSurface(l,r,{...c,baselineMm:9999,schema:'FAKE'}),
  /CALIBRATED_STEREO_REQUIRED/);
});
