import test from 'node:test';
import assert from 'node:assert/strict';
import {createAIG3DMesh} from '../aig-real3d-core.mjs';
import {buildAIGReal3DMultiViewAtlas,AIG_REAL3D_V89_VIEW_SCHEMA,
 AIG_REAL3D_V89_ATLAS_SCHEMA} from '../aig-real3d-multiview-projection.mjs';
const source='a'.repeat(64),photoA='b'.repeat(64),photoB='c'.repeat(64);
const front=[-1,-1,0,1,-1,0,1,1,0,-1,1,0],
 back=[1,-1,-.2,-1,-1,-.2,-1,1,-.2,1,1,-.2];
const mesh=createAIG3DMesh({
 positions:[...front,...back],
 normals:[...Array(4).fill([0,0,1]).flat(),
  ...Array(4).fill([0,0,-1]).flat()],
 indices:[0,1,2,0,2,3,4,5,6,4,6,7],
 provenance:'V89_NONHUMAN_TWO_INDEPENDENT_SOURCE_PLANES'
});
const uv=[0,0,.5,0,.5,1,0,1, .5,0,1,0,1,1,.5,1];
const makeView=(id,z,color,sha256)=>({
 schema:AIG_REAL3D_V89_VIEW_SCHEMA,id,sourceSha256:source,
 imageSha256:sha256,
 image:{width:64,height:64,pixels:Array.from({length:64*64},()=>[...color,255]).flat()},
 camera:{position:[0,0,z],right:[Math.sign(z),0,0],
  up:[0,1,0],forward:[0,0,-Math.sign(z)],
  fx:38,fy:38,cx:32,cy:32,near:0.01}
});
const a=makeView('front',3,[230,18,30],photoA),
 b=makeView('back',-3,[20,30,235],photoB);
const options={mesh,uvCoordinates:uv,sourceSha256:source,
 uvManifestSourceSha256:source,atlasSize:32};
test('V89 only observed front photo marks unobserved rear magenta',()=>{
 const originalXYZ=JSON.stringify(mesh.positions),
  originalIndex=JSON.stringify(mesh.indices);
 const output=buildAIGReal3DMultiViewAtlas({...options,views:[a]});
 assert.equal(output.schema,AIG_REAL3D_V89_ATLAS_SCHEMA);
 const r=output.evidence;
 assert.ok(r.observedSurfaceTexels>0&&r.unknownSurfaceTexels>0);
 assert.ok(r.observedCoveragePercent>30&&r.observedCoveragePercent<70);
 assert.deepEqual(output.albedoImage.pixels.slice((8*32+8)*4,(8*32+8)*4+3),
  [230,18,30]);
 assert.deepEqual(output.albedoImage.pixels.slice((8*32+24)*4,(8*32+24)*4+3),
  [255,0,255]);
 assert.equal(JSON.stringify(mesh.positions),originalXYZ);
 assert.equal(JSON.stringify(mesh.indices),originalIndex);
 assert.equal(r.photoToScanPhysicalAccuracyVerified,false);
 assert.equal(r.singlePhotoFull3DRecoveryPASS,false);
});
test('V89 second calibrated rear view fills rear, without filling unobserved by default',()=>{
 const r=buildAIGReal3DMultiViewAtlas({...options,views:[a,b]});
 assert.equal(r.evidence.unknownSurfaceTexels,0);
 assert.equal(r.evidence.observedCoveragePercent,100);
 assert.deepEqual(r.albedoImage.pixels.slice((8*32+24)*4,(8*32+24)*4+3),
  [20,30,235]);
 assert.equal(r.evidence.contributorPhotoIds.length,2);
 assert.ok(r.evidence.observedSampleCountsByPhoto.every(x=>x>0));
});
test('V89 rejects wrong provenance, unsafe camera, UV overlap and missing camera data',()=>{
 assert.throws(()=>buildAIGReal3DMultiViewAtlas({...options,views:[a],
  uvManifestSourceSha256:'f'.repeat(64)}),/V89_SOURCE_UV_VIEW_OR_BUDGET_INVALID/);
 assert.throws(()=>buildAIGReal3DMultiViewAtlas({...options,views:[{
  ...a,imageSha256:'unverified'}]}),/V89_VIEW_SOURCE_OR_SHA_INVALID/);
 assert.throws(()=>buildAIGReal3DMultiViewAtlas({...options,views:[{
  ...a,camera:{...a.camera,right:[0,1,0]}}]}),
  /V89_CALIBRATED_CAMERA_ORIENTATION_INVALID/);
 assert.throws(()=>buildAIGReal3DMultiViewAtlas({...options,views:[a],
  uvCoordinates:[...uv.slice(0,8),...uv.slice(0,8)]}),
  /V89_SOURCE_UV_OVERLAPPING_SURFACES/);
 assert.throws(()=>buildAIGReal3DMultiViewAtlas({...options,views:[a],
  uvCoordinates:new Array(mesh.vertexCount*2).fill(0)}),
  /V89_DEGENERATE_OR_MISSING_SOURCE_UV/);
 assert.throws(()=>buildAIGReal3DMultiViewAtlas({...options,views:[a,a]}),
  /V89_DUPLICATED_SOURCE_PHOTO_ID/);
});
test('V89 depth z-buffer rejects fully invisible lower source surface',()=>{
 const occluded=buildAIGReal3DMultiViewAtlas({...options,views:[a]});
 assert.ok(occluded.evidence.unknownSurfaceTexels>0);
 assert.ok(occluded.evidence.observedSampleCountsByPhoto[0]>0);
 const hidden=occluded.observationMask.pixels.slice((8*32+24)*4,(8*32+24)*4+4);
 assert.deepEqual(hidden,[0,0,0,255]);
});
