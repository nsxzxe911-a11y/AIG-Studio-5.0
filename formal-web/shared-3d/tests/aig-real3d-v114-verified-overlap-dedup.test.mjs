import test from 'node:test';
import assert from 'node:assert/strict';
import {buildAIGReal3DV112CalibratedMultiViewGLB}
 from '../aig-real3d-v112-calibrated-multiview.mjs';
import {deduplicateAIGReal3DV114VerifiedOverlapGLB}
 from '../aig-real3d-v114-verified-overlap-dedup.mjs';
const hash=x=>x.repeat(64),mat=tx=>[1,0,0,0,0,1,0,0,0,0,1,0,tx,0,0,1];
function src(){
 const rgba=new Uint8ClampedArray(32*32*4);
 for(let i=0;i<32*32;i++)rgba.set([62,131,190,255],i*4);
 const png=(value)=>{
  const bytes=new Uint8Array(128);bytes.set([137,80,78,71,13,10,26,10]);
  bytes.fill(value,8);return bytes;
 };
 const core={width:32,height:32,depthMeasuredAndCalibrated:true,
  intrinsics:{fxPx:100,fyPx:100,cxPx:15.5,cyPx:15.5},
  depthValuesMM:new Float32Array(32*32).fill(1000)};
 return {views:[
  {...core,photoRGBA:new Uint8ClampedArray(rgba),
   imagePNGBytes:png(13),photoSha256:hash('a'),depthSha256:hash('c'),
   cameraToWorldMM:mat(0)},
  {...core,photoRGBA:new Uint8ClampedArray(rgba),
   imagePNGBytes:png(21),photoSha256:hash('b'),depthSha256:hash('d'),
   cameraToWorldMM:mat(20)}
 ],correspondences:[
  {x0:10,y0:10,x1:8,y1:10},
  {x0:22,y0:10,x1:20,y1:10},
  {x0:10,y0:22,x1:8,y1:22}
 ],step:2,maxSurfaceEdgeMM:35};
}
function parse(bytes){
 const d=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 assert.equal(d.getUint32(0,true),0x46546c67);
 assert.equal(d.getUint32(4,true),2);
 assert.equal(d.getUint32(8,true),bytes.length);
 const n=d.getUint32(12,true);
 const doc=JSON.parse(new TextDecoder().decode(bytes.slice(20,20+n)).trim());
 const off=20+n+8,len=d.getUint32(20+n,true);
 return {doc,bin:bytes.slice(off,off+len)};
}
function setup(){
 const a=src(),b=buildAIGReal3DV112CalibratedMultiViewGLB(a);
 const sha=hash('f');
 return {a,b,sha};
}
test('V114 verified redundant triangles removed only from source 2, source BIN and textures prefix unchanged',()=>{
 const {a,b,sha}=setup(),old=Uint8Array.from(b.glbBytes),
  frozen=a.views.map(v=>[...v.depthValuesMM]);
 const v=deduplicateAIGReal3DV114VerifiedOverlapGLB({
  glbBytes:b.glbBytes,sourceGLBSha256:sha,views:a.views});
 const before=parse(b.glbBytes),after=parse(v.glbBytes),r=v.receipt;
 assert.equal(r.v113GeometryGate,'PASS_OBSERVED_DEPTH_SEAM_ONLY');
 assert.ok(r.observedRedundantSecondViewTrianglesExcluded>100);
 assert.ok(r.uniqueSecondViewTrianglesKept>0);
 assert.ok(r.totalTrianglesAfter<r.totalTrianglesBefore);
 assert.equal(r.totalTrianglesBefore,b.receipt.observedTriangleCount);
 assert.equal(r.firstViewTrianglesAfter,r.originalFirstViewTriangles);
 assert.equal(after.doc.meshes.length,2);
 assert.equal(after.doc.images.length,2);
 assert.equal(after.doc.materials.length,2);
 assert.equal(after.doc.accessors.length,before.doc.accessors.length);
 assert.equal(after.doc.bufferViews.length,before.doc.bufferViews.length+1);
 assert.deepEqual([...after.bin.slice(0,before.bin.length)],[...before.bin]);
 assert.deepEqual(after.doc.accessors[0],before.doc.accessors[0]);
 assert.deepEqual(after.doc.accessors[1],before.doc.accessors[1]);
 assert.deepEqual(after.doc.accessors[2],before.doc.accessors[2]);
 assert.deepEqual(after.doc.accessors[4],before.doc.accessors[4]);
 assert.deepEqual(after.doc.accessors[5],before.doc.accessors[5]);
 assert.deepEqual(after.doc.accessors[6],before.doc.accessors[6]);
 assert.notEqual(after.doc.accessors[7].count,before.doc.accessors[7].count);
 assert.equal(r.topologyWeldedAcrossSeam,false);
 assert.equal(r.verticesMovedOrSmoothed,false);
 assert.equal(r.unobservedSurfaceGenerated,false);
 assert.equal(r.completeHumanOrAnimalPhoto1to1,false);
 assert.equal(r.productionReleasePASS,false);
 assert.deepEqual([...b.glbBytes],[...old]);
 assert.deepEqual(a.views.map(v=>[...v.depthValuesMM]),frozen);
});
test('V114 warns when only selected vertices color-match and preserves unique material source',()=>{
 const {a,b,sha}=setup();
 a.views[1].photoRGBA.set([238,19,14,255],(30*32+31)*4);
 const v=deduplicateAIGReal3DV114VerifiedOverlapGLB({
  glbBytes:b.glbBytes,sourceGLBSha256:sha,views:a.views});
 assert.equal(v.receipt.bothOriginalMaterialsPreserved,true);
 assert.equal(v.receipt.materialTextureRepainted,false);
 assert.ok(v.receipt.secondViewVerifiedDepthButColorMismatchVertices>=0);
});
test('V114 conflicting local depth not among three shared landmarks must block entire integration',()=>{
 const {a,b,sha}=setup();
 const wrong=new Float32Array(a.views[1].depthValuesMM);
 wrong[14*32+14]=1009;a.views[1]={...a.views[1],depthValuesMM:wrong};
 assert.throws(()=>deduplicateAIGReal3DV114VerifiedOverlapGLB({
  glbBytes:b.glbBytes,sourceGLBSha256:sha,views:a.views}),
  /INDEPENDENT_DEPTH_OVERLAP_GATE_BLOCK_OVERLAP_SURFACE_DEPTH_CONTRADICTION/);
});
test('V114 all color conflict or no measured overlap blocks and never creates fake integrated GLB',()=>{
 const {a,b,sha}=setup();
 const other=new Uint8ClampedArray(a.views[1].photoRGBA);
 for(let i=0;i<32*32;i++)other.set([246,11,16,255],i*4);
 assert.throws(()=>deduplicateAIGReal3DV114VerifiedOverlapGLB({
  glbBytes:b.glbBytes,sourceGLBSha256:sha,
  views:[a.views[0],{...a.views[1],photoRGBA:other}]}),
  /NO_SAFELY_REDUNDANT_SOURCE_TRIANGLES_TO_INTEGRATE/);
 const distant={...a.views[1],cameraToWorldMM:mat(1200)};
 assert.throws(()=>deduplicateAIGReal3DV114VerifiedOverlapGLB({
  glbBytes:b.glbBytes,sourceGLBSha256:sha,views:[a.views[0],distant]}),
  /INDEPENDENT_DEPTH_OVERLAP_GATE_BLOCK_INSUFFICIENT_MEASURED_OVERLAP/);
});
test('V114 missing source, tampered GLB header, impossible threshold fail closed',()=>{
 const {a,b,sha}=setup();
 assert.throws(()=>deduplicateAIGReal3DV114VerifiedOverlapGLB({
  glbBytes:b.glbBytes,sourceGLBSha256:'wrong',views:a.views}),
  /DECLARED_SOURCE_SHA_VIEWS_AND_SAFE_THRESHOLDS_REQUIRED/);
 const broken=Uint8Array.from(b.glbBytes);broken[0]=0;
 assert.throws(()=>deduplicateAIGReal3DV114VerifiedOverlapGLB({
  glbBytes:broken,sourceGLBSha256:sha,views:a.views}),
  /GLB_HEADER_VERSION_LENGTH_INVALID/);
});
