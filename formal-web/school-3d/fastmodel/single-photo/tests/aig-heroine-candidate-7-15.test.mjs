import test from 'node:test';
import assert from 'node:assert/strict';
import {growAIG714ReviewedColorRegions} from '../aig-heroine-scan-7-14.mjs';
import {buildAIG715HeroineCandidate,editAIG715Joint,
 summarizeAIG715Candidate,AIG715_SCHEMA}
 from '../aig-heroine-candidate-7-15.mjs';
const w=96,h=96;
function scene(){
 const bytes=new Uint8ClampedArray(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const c=y<30?[35,35,45]:y<58?[211,155,120]:[47,77,115],
   i=4*(y*w+x);
  bytes.set([...c,255],i);
 }
 const im={width:w,height:h,data:bytes};
 const seeds=[
  {label:'HAIR',x:45,y:12,reviewed:true},
  {label:'FACE',x:45,y:43,reviewed:true},
  {label:'JACKET',x:45,y:77,reviewed:true}
 ];
 const mask=growAIG714ReviewedColorRegions(im,seeds,{
  maxSeedDistance:38,maxNeighborDistance:30,maxFractionPerSeed:.38,
  minRegionPixels:20
 });
 return {im,mask};
}
test('7.15-A makes real, independently editable hair/face/clothing geometry, not static plan only',()=>{
 const {im,mask}=scene();
 const copy=Uint8Array.from(mask.labels);
 const p=buildAIG715HeroineCandidate(im,mask,{gridStep:4});
 assert.equal(p.schema,AIG715_SCHEMA);
 assert.ok(p.geometryGroups.HAIR?.triangles>15);
 assert.ok(p.geometryGroups.FACE?.triangles>15);
 assert.ok(p.geometryGroups.JACKET?.triangles>15);
 assert.equal(p.geometryGroups.JACKET.category,'INDEPENDENT_CLOTH_DRAFT');
 assert.equal(p.geometryGroups.HAIR.category,'SEPARATE_CHARACTER_SURFACE');
 assert.equal(p.geometryGroups.HAIR.positions.length,p.geometryGroups.HAIR.triangles*9);
 assert.equal(p.geometryGroups.FACE.uv.length,p.geometryGroups.FACE.triangles*6);
 assert.deepEqual(mask.labels,copy,'mask RGB source never rewritten');
 assert.equal(p.depth_estimated.source_type,'SINGLE_IMAGE_ESTIMATE');
 assert.equal(p.depth_estimated.units,'NORMALIZED_RELATIVE_NOT_MM');
 assert.ok(p.depth_estimated.validPixels>100);
 assert.equal(p.depth_measured.validPixels,0);
 assert.equal(p.depth_measured.source_type,'CALIBRATED_STEREO_MEASURED');
 assert.ok(Number.isNaN(p.depth_measured.values[20*w+20]),'unknown mm is NaN, not zero');
 assert.equal(p.hiddenBodyBacksideNotConstructed,true);
 assert.equal(p.realHumanOneToOneVerified,false);
});
test('7.15-A keeps stereo measured millimetres in a distinct immutable channel',()=>{
 const {im,mask}=scene();
 const stereo={schema:'AIG_FASTMODEL_7_13_METRIC_RECTIFIED_STEREO_MESH_MM',
  vertexCount:3,uvs:new Float32Array([
   45/(w-1),1-43/(h-1),
   46/(w-1),1-43/(h-1),
   45/(w-1),1-44/(h-1)
  ]),positions:new Float32Array([0,0,823.25,1,0,824,0,1,823.5]),
  confidence:new Float32Array([.82,.76,.8]),
  leftSHA256:'sha256:'+'a'.repeat(64),
  rightSHA256:'sha256:'+'b'.repeat(64)};
 const p=buildAIG715HeroineCandidate(im,mask,{gridStep:4,stereo});
 const at=43*w+45;
 assert.equal(p.depth_measured.valid[at],1);
 assert.equal(p.depth_measured.values[at],823.25);
 assert.equal(p.depth_measured.units,'MM_LEFT_CAMERA_DEPTH');
 assert.ok(Number.isFinite(p.depth_estimated.values[at]));
 assert.notEqual(p.depth_measured.values[at],p.depth_estimated.values[at]);
 assert.equal(p.depth_measured.sourceStereoCalibrationTrusted,true);
 assert.equal(p.depth_measured.leftSHA256,stereo.leftSHA256);
 assert.equal(summarizeAIG715Candidate(p).depthMeasured.validPixels,3);
});
test('7.15-A adjustable neck and head coordinates preserve other editable joints',()=>{
 const {im,mask}=scene();
 const first=buildAIG715HeroineCandidate(im,mask);
 const revised=editAIG715Joint(first,'neck',{x:.44,y:.3,confirmed:true});
 const old=first.skeletonCandidate.find(j=>j.name==='neck'),
  now=revised.skeletonCandidate.find(j=>j.name==='neck');
 assert.equal(old.x,.5);assert.equal(now.x,.44);
 assert.equal(now.y,.3);assert.equal(now.confirmed,true);
 assert.equal(now.depthSource,'USER_PLACED_2D_NOT_MEASURED_3D');
 assert.equal(revised.skeletonCandidate.length,17);
 assert.equal(revised.geometryGroups.JACKET,first.geometryGroups.JACKET);
 assert.throws(()=>editAIG715Joint(revised,'fake',{x:.2,y:.3}),/VALID_EDITABLE_JOINT_REQUIRED/);
 assert.throws(()=>editAIG715Joint(revised,'head',{x:200,y:.3}),/VALID_EDITABLE_JOINT_REQUIRED/);
});
test('7.15-A malformed unreviewed masks, invented stereo source and invalid units block',()=>{
 const {im,mask}=scene();
 assert.throws(()=>buildAIG715HeroineCandidate(im,{...mask,schema:'FAKE'}),
  /REVIEWED_SOURCE_RGB_AND_MASK_REQUIRED/);
 assert.throws(()=>buildAIG715HeroineCandidate(im,mask,{stereo:{schema:'FAKE'}}),
  /UNTRUSTED_STEREO_MEASUREMENT_BLOCKED/);
 assert.throws(()=>buildAIG715HeroineCandidate(im,mask,{gridStep:0}),
  /BOUNDED_RECONSTRUCTION_SETTINGS_REQUIRED/);
 assert.throws(()=>buildAIG715HeroineCandidate(im,mask,{sourceDigest:'sha256:123'}),
  /BOUNDED_RECONSTRUCTION_SETTINGS_REQUIRED/);
});
