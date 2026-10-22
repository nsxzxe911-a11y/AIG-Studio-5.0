import test from 'node:test';
import assert from 'node:assert/strict';
import {reversePhotoMask} from '../aig-reverse-geometry-7-0.mjs';
import {createObservedImplicitVolume} from '../aig-implicit-volume-7-1.mjs';
import {createAIG72VolumeBody,stepAIG72Volume} from '../aig-volumetric-deform-7-2.mjs';
import {AIG73_SCHEMA,flipAIG73RGBA,validateAIG73FaceROI,makeAIG73Makeup,
 shadeAIG73Surface,projectAIG73SourceUV,renderAIG73FaceMaterial} from '../aig-face-material-7-3.mjs';
const size=96, data=new Uint8ClampedArray(size*size*4);
for(let y=0;y<size;y++)for(let x=0;x<size;x++){
 const k=(y*size+x)*4,shape=x>=20&&x<76&&y>=9&&y<87;
 data[k]=shape?165:0;data[k+1]=shape?115:0;data[k+2]=shape?100:0;data[k+3]=shape?255:0;
}
const original={width:size,height:size,data};
const img=flipAIG73RGBA(original),mask=reversePhotoMask(img),field=createObservedImplicitVolume(mask,{maxGrid:96,halfDepth:.13});
const box={x:.25,y:.13,width:.50,height:.70},sha='a'.repeat(64);
const proposal=validateAIG73FaceROI(original,box,{sourceSHA256:sha});
const roi=validateAIG73FaceROI(original,box,{reviewed:true,sourceSHA256:sha});
const makeup=makeAIG73Makeup();
function p(u,v,z=.13){return [(u-.5)*field.gridWidth*field.cellSize,(.5-v)*field.gridHeight*field.cellSize,z];}
test('7.3 source image flip is mathematically reversible; source RGBA never edited',()=>{
 assert.equal(AIG73_SCHEMA.includes('REVIEWED_FACE'),true);
 assert.equal(img.data[0],original.data[(size-1)*size*4]);
 assert.deepEqual(flipAIG73RGBA(img).data,original.data);
 assert.equal(original.data[(30*size+30)*4],165);
 assert.equal(roi.sourceSHA256,sha);
});
test('7.3 cosmetic controls cannot silently pass unreviewed ROI as face landmark detection',()=>{
 assert.equal(proposal.reviewed,false);assert.equal(roi.reviewed,true);
 assert.equal(roi.photoLandmarksVerified,false);
 assert.throws(()=>validateAIG73FaceROI(original,{x:.8,y:.1,width:.7,height:.9}),/ROI_INVALID/);
 assert.throws(()=>validateAIG73FaceROI(original,box,{sourceSHA256:'made-up'}),/SHA_INVALID/);
});
test('7.3 makeup changes actual front-facing photo pixel shading only after reviewed ROI',()=>{
 const point=p(.5,.13+.70*.78),normal=[0,0,1],plain=makeAIG73Makeup({
  foundationStrength:0,blushStrength:0,lipsStrength:0,eyesStrength:0
 });
 const naked=shadeAIG73Surface({image:original,field,roi:proposal,makeup,point,normal});
 const unmade=shadeAIG73Surface({image:original,field,roi,makeup:plain,point,normal});
 const made=shadeAIG73Surface({image:original,field,roi,makeup,point,normal});
 assert.deepEqual(naked.rgb,unmade.rgb);
 assert.notDeepEqual(made.rgb,unmade.rgb);
 assert.ok(made.cosmeticOpacity>.1);
 assert.equal(made.source,'SOURCE_PHOTO_FRONT_PROJECTION');
 assert.equal(projectAIG73SourceUV(field,point)[1]>.6,true);
});
test('7.3 does NOT paste copied photo on unobserved rear face or on transparent pixels',()=>{
 const back=shadeAIG73Surface({image:original,field,roi,makeup,point:p(.5,.5,-.13),normal:[0,0,-1]});
 const side=shadeAIG73Surface({image:original,field,roi,makeup,point:p(.5,.5,0),normal:[1,0,0]});
 assert.equal(back.source,'INFERRED_SIDE_OR_BACK_NEUTRAL');
 assert.equal(side.source,'INFERRED_SIDE_OR_BACK_NEUTRAL');
 assert.equal(back.cosmeticOpacity,0);
 const transparent=shadeAIG73Surface({image:original,field,roi,makeup,point:p(.03,.03),normal:[0,0,1]});
 assert.equal(transparent.source,'SOURCE_ALPHA_TRANSPARENT_NEUTRAL');
});
test('7.3 true SDF ray camera sees photo only in front, approximate backside neutral',()=>{
 const settings={width:72,height:68,maxSteps:76,roi,makeup};
 const front=renderAIG73FaceMaterial(field,original,{...settings,yaw:0});
 const rear=renderAIG73FaceMaterial(field,original,{...settings,yaw:Math.PI});
 assert.ok(front.hitPixels>150);
 assert.ok(front.photoPixels>120);
 assert.ok(front.cosmeticPixels>10);
 assert.ok(rear.inferredPixels>100);
 assert.equal(rear.photoPixels,0);
 assert.equal(front.photorealCharacterApproved,false);
 assert.notDeepEqual(front.pixels,rear.pixels);
});
test('7.3 photo cosmetics follow truly deformed XYZ SDF reference coordinates',()=>{
 const body=createAIG72VolumeBody(field,{nx:4,ny:5,nz:3,gravity:0});
 const first=renderAIG73FaceMaterial(field,original,{roi,makeup,width:48,height:44,maxSteps:80,body});
 for(let i=0;i<15;i++)stepAIG72Volume(body,{gravity:0,tipX:.07,tipZ:.02});
 const second=renderAIG73FaceMaterial(field,original,{roi,makeup,width:48,height:44,maxSteps:80,body});
 assert.ok(first.photoPixels>20);
 assert.ok(second.photoPixels>20);
 assert.equal(second.xyzDeformationSampled,true);
 assert.notDeepEqual(first.pixels,second.pixels);
 assert.equal(second.actualPhotoFaceRecovered3D,false);
});
test('7.3 reject invalid makeup/array and runaway render inputs',()=>{
 assert.throws(()=>makeAIG73Makeup({lips:'#zzz111'}),/COLOR_HEX/);
 assert.throws(()=>makeAIG73Makeup({blushStrength:2}),/MAKEUP_SETTINGS_INVALID/);
 assert.throws(()=>flipAIG73RGBA({width:20,height:20,data:new Uint8Array(3)}),/RGBA_REQUIRED/);
 assert.throws(()=>renderAIG73FaceMaterial(field,original,{width:1000,height:1000}),/RENDER_INPUT/);
});
