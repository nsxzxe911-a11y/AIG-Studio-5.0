import test from 'node:test';
import assert from 'node:assert/strict';
import {buildAIG35UnifiedAppearance,adjustAIG35Appearance,
 evaluateAIG35ProjectedSilhouette,AIG35_SCHEMA}
 from '../aig-unified-appearance-3-5.mjs';
function sourceFixture(){
 const width=256,height=384,pixels=new Uint8ClampedArray(width*height*4),
  labels=new Uint8Array(width*height);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  let id=0;
  if(y>9&&y<85&&Math.abs(x-128)<26)id=2;
  else if(y>=85&&y<112&&Math.abs(x-128)<12)id=4;
  else if(y>=112&&y<239&&Math.abs(x-128)<(y<190?53:37))id=14;
  else if(y>=239&&y<376&&Math.abs(x-108)<15)id=10;
  else if(y>=239&&y<376&&Math.abs(x-148)<15)id=11;
  else if(y>=126&&y<225&&Math.abs(x-61)<11)id=6;
  else if(y>=126&&y<225&&Math.abs(x-195)<11)id=7;
  const i=y*width+x;labels[i]=id;
  const rgb=id===2||id===4?[201,146,113]:id===14?
   [42,69,124]:id===10||id===11?[59,79,102]:id?
   [175,130,99]:[12,18,29];
  pixels.set([...rgb,255],i*4);
 }
 return {width,height,pixels,labels,
  sourceSha256:'sha256:'+'a'.repeat(64)};
}
test('one actual source-bound scan chooses a single real SDF body and retains original pixels',()=>{
 const source=sourceFixture(),photoCopy=source.pixels.slice(),
  maskCopy=source.labels.slice();
 const built=buildAIG35UnifiedAppearance({
  source,radialSegments:32,sliceStep:6,resolution:84,blend:.075,
  proportions:{widthScale:1,heightScale:1,depthScale:1,colourGain:1}
 });
 assert.equal(built.schema,AIG35_SCHEMA);
 assert.equal(built.proof.schema,AIG35_SCHEMA);
 assert.equal(built.proof.originalPhotoAndSegmentationUnchanged,true);
 assert.equal(built.reconstruction.manifoldAudit.closedManifold,true);
 assert.equal(built.reconstruction.surfaces.length,1);
 assert.equal(built.reconstruction.sourceSha256,source.sourceSha256);
 assert.ok(built.reconstruction.continuousVertexCount>5000);
 assert.ok(built.proof.matchingRows>=7);
 assert.ok(Number.isFinite(built.proof.source2DEdgeErrorAfterPx));
 assert.ok(built.proof.source2DEdgeErrorAfterPx<=
  built.proof.source2DEdgeErrorBeforePx+.0002);
 assert.deepEqual(source.pixels,photoCopy);
 assert.deepEqual(source.labels,maskCopy);
 assert.equal(built.proof.automaticallyAchieved100PercentLikeness,false);
 assert.equal(built.proof.rearAndOccludedDepthUnknown,true);
 assert.equal(built.proof.releaseAllowed,false);
 const original=built.reconstruction.fusedOnePieceMesh.positions.slice();
 const adjusted=adjustAIG35Appearance(built.reconstruction,{
  widthScale:1.03,heightScale:.98,depthScale:1.12,colourGain:1.15
 });
 assert.equal(adjusted.manifoldAudit.closedManifold,true);
 assert.equal(adjusted.appearanceControls.colourGain,1.15);
 assert.notEqual(adjusted.fusedOnePieceMesh.positions[0],original[0]);
 assert.deepEqual(built.reconstruction.fusedOnePieceMesh.positions,original);
 const measured=evaluateAIG35ProjectedSilhouette(adjusted,source);
 assert.ok(measured.rowsCompared>6);
 assert.equal(measured.visualIdentityApproved,false);
 assert.equal(adjusted.physicalScaleUnverified,true);
 assert.throws(()=>adjustAIG35Appearance(built.reconstruction,{
  widthScale:2}),/SAFE_APPEARANCE_PARAMETER_RANGE_REQUIRED/);
 assert.throws(()=>evaluateAIG35ProjectedSilhouette(built.reconstruction,{
  ...source,sourceSha256:'sha256:'+'b'.repeat(64)
 }),/SAME_PHOTO_AND_HUMAN_REST_MESH_REQUIRED/);
});
test('unobserved source and wrong label mask never become a 100% match',()=>{
 const source=sourceFixture();
 source.labels.fill(0);
 assert.throws(()=>buildAIG35UnifiedAppearance({source,resolution:64}),
  /NO_USABLE_HUMAN_OR_ENVIRONMENT_CLASSES|VISIBLE_PERSON_SILHOUETTE_NOT_PROVEN/);
 const bad=sourceFixture();
 bad.pixels=new Uint8ClampedArray(4);
 assert.throws(()=>buildAIG35UnifiedAppearance({source:bad}),
  /SOURCE_RGBA_MASK_AND_SHA_REQUIRED/);
});
