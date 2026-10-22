import test from 'node:test';
import assert from 'node:assert/strict';
import {createAIG713StereoCalibration,reconstructAIG713StereoSurface}
 from '../aig-metric-stereo-7-13.mjs';
import {AIG714_LABELS,growAIG714ReviewedColorRegions,
 assembleAIG714HeroineSurface}
 from '../aig-heroine-scan-7-14.mjs';
const w=112,h=80,shift=8;
const texture=(x,y)=>{
 let t=(((x+199)*73856093)^((y+311)*19349663))>>>0;
 t^=t<<13;t^=t>>>17;t^=t<<5;return(t>>>0)%25;
};
function color(x,y){
 const base=y<26?[45,31,23]:y<50?[207,152,116]:[42,77,115],
  diff=texture(x,y)-12;
 return base.map(v=>Math.min(255,Math.max(0,v+diff)));
}
function pair(){
 const a=new Uint8ClampedArray(w*h*4),b=new Uint8ClampedArray(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=4*(y*w+x),l=color(x,y),r=color(x+shift,y);
  a.set([...l,255],i);b.set([...(x+shift<w?r:[0,0,0]),255],i);
 }
 return [{width:w,height:h,data:a},{width:w,height:h,data:b}];
}
const sha=s=>'sha256:'+s.repeat(64);
const calibration=()=>createAIG713StereoCalibration({
 width:w,height:h,focalPx:120,baselineMm:60,
 calibrationReviewed:true,rectifiedParallelReviewed:true,
 physicallyMeasuredBaseline:true,leftSHA256:sha('a'),rightSHA256:sha('b')
});
const opts={stride:2,patchRadius:1,minDisparity:4,maxDisparity:12,
 minTextureVariance:3,uniquenessMargin:.04,minCorrespondences:30};
const seeds=[{label:'HAIR',x:35,y:15,reviewed:true},
 {label:'FACE',x:35,y:38,reviewed:true},
 {label:'JACKET',x:35,y:64,reviewed:true}];
test('7.14 seeds classify reviewed source colors but do not pretend automatic semantics or depth',()=>{
 const [a]=pair();
 const r=growAIG714ReviewedColorRegions(a,seeds,{minRegionPixels:12});
 assert.equal(r.schema,'AIG714_REVIEWED_SEED_RGB_REGION_V1');
 assert.ok(r.counts.HAIR>100);
 assert.ok(r.counts.FACE>100);
 assert.ok(r.counts.JACKET>100);
 assert.equal(r.actualDepthMeasurementProvided,false);
 assert.equal(r.allLabelsMustBeUserReviewed,true);
 assert.equal(r.labels[15*w+35],AIG714_LABELS.HAIR);
 assert.equal(r.labels[38*w+35],AIG714_LABELS.FACE);
 assert.equal(r.labels[64*w+35],AIG714_LABELS.JACKET);
});
test('7.14 combines true 900mm triangulated stereo depth, normals, RGB, labels and confidence',()=>{
 const [a,b]=pair();
 const measured=reconstructAIG713StereoSurface(a,b,calibration(),opts);
 const regions=growAIG714ReviewedColorRegions(a,seeds,{minRegionPixels:12});
 const mesh=assembleAIG714HeroineSurface(measured,a,regions);
 assert.equal(mesh.schema,'AIG_FASTMODEL_7_14_HEROINE_RGB_METRIC_DEPTH_SEMANTIC_SURFACE');
 assert.ok(mesh.physicallyMeasuredVertexCount>60);
 assert.ok(mesh.semanticLabeledMeasuredVertices>30);
 assert.ok(mesh.triangleCount>100);
 assert.equal(mesh.positions.length,measured.positions.length);
 assert.equal(mesh.sourceRGB.length,3*measured.vertexCount);
 assert.equal(mesh.normals.length,3*measured.vertexCount);
 assert.ok([...mesh.normals].every(Number.isFinite));
 assert.ok([...mesh.vertexConfidence].every(v=>v>=0&&v<=1));
 const zs=[];
 for(let i=2;i<mesh.positions.length;i+=3)zs.push(mesh.positions[i]);
 zs.sort((a,b)=>a-b);
 assert.ok(Math.abs(zs[Math.floor(zs.length/2)]-900)<1);
 assert.ok(mesh.partTriangles.HAIR>0,mesh.partTriangles);
 assert.ok(mesh.partTriangles.FACE>0,mesh.partTriangles);
 assert.equal(mesh.noBoneOrSkinWeightsInvented,true);
 assert.equal(mesh.generatedBackside,false);
 assert.equal(mesh.observedColorsAreIlluminatedPhotoRGBNotIntrinsicAlbedo,true);
 assert.equal(mesh.wholeCharacterOneToOneVerified,false);
});
test('7.14 invalid masks, no actual stereo depth and fake region approvals fail closed',()=>{
 const [a]=pair();
 const reviewed=growAIG714ReviewedColorRegions(a,seeds);
 assert.throws(()=>growAIG714ReviewedColorRegions(a,[{...seeds[0],reviewed:false}]),
  /REVIEWED_PART_SEED_REQUIRED/);
 assert.throws(()=>growAIG714ReviewedColorRegions(a,[{...seeds[0],label:'AUTO_AI_UNVERIFIED'}]),
  /REVIEWED_PART_SEED_REQUIRED/);
 assert.throws(()=>assembleAIG714HeroineSurface({schema:'FAKE'},a,reviewed),
  /MEASURED_STEREO_MESH_REQUIRED/);
 const b={...a,width:a.width+1};
 assert.throws(()=>growAIG714ReviewedColorRegions(b,seeds),/RGBA_IMAGE_REQUIRED/);
});
