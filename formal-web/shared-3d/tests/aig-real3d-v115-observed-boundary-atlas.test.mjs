import test from 'node:test';
import assert from 'node:assert/strict';
import {sha256AIGReal3DBytes} from '../aig-real3d-v99-native-model-ingest.mjs';
import {buildAIGReal3DV112CalibratedMultiViewGLB}
 from '../aig-real3d-v112-calibrated-multiview.mjs';
import {deduplicateAIGReal3DV114VerifiedOverlapGLB}
 from '../aig-real3d-v114-verified-overlap-dedup.mjs';
import {auditAIGReal3DV115ObservedBoundaryAtlas}
 from '../aig-real3d-v115-observed-boundary-atlas.mjs';
const hash=i=>i.repeat(64),mat=x=>[1,0,0,0,0,1,0,0,0,0,1,0,x,0,0,1];
function src(){
 const makePhoto=()=>{const rgba=new Uint8ClampedArray(32*32*4);
  for(let k=0;k<1024;k++)rgba.set([90,140,192,255],k*4);
  return rgba;};
 const png=n=>{const bytes=new Uint8Array(128);
  bytes.set([137,80,78,71,13,10,26,10]);bytes.fill(n,8);return bytes;};
 const base={width:32,height:32,depthMeasuredAndCalibrated:true,
  intrinsics:{fxPx:100,fyPx:100,cxPx:15.5,cyPx:15.5},
  depthValuesMM:new Float32Array(1024).fill(1000)};
 return {views:[
  {...base,photoRGBA:makePhoto(),imagePNGBytes:png(13),
   photoSha256:hash('a'),depthSha256:hash('c'),cameraToWorldMM:mat(0)},
  {...base,photoRGBA:makePhoto(),imagePNGBytes:png(21),
   photoSha256:hash('b'),depthSha256:hash('d'),cameraToWorldMM:mat(20)}
 ],correspondences:[
  {x0:10,y0:10,x1:8,y1:10},
  {x0:22,y0:10,x1:20,y1:10},
  {x0:10,y0:22,x1:8,y1:22}
 ],step:2,maxSurfaceEdgeMM:35};
}
async function setup(){
 const a=src();
 const original=buildAIGReal3DV112CalibratedMultiViewGLB(a).glbBytes;
 const originalGLBSha256=await sha256AIGReal3DBytes(original);
 const copy=deduplicateAIGReal3DV114VerifiedOverlapGLB({
  glbBytes:original,sourceGLBSha256:originalGLBSha256,
  views:a.views
 });
 const workingGLBSha256=await sha256AIGReal3DBytes(copy.glbBytes);
 return {originalGLBBytes:original,workingGLBBytes:copy.glbBytes,
  originalGLBSha256,workingGLBSha256,views:a.views,copy};
}
test('V115 original XYZ/UV/bin unchanged, open edge atlas measures new seams against independent source',async()=>{
 const a=await setup();
 const before=[Uint8Array.from(a.originalGLBBytes),
  Uint8Array.from(a.workingGLBBytes)];
 const r=await auditAIGReal3DV115ObservedBoundaryAtlas(a);
 assert.equal(r.researchGate,'PASS_SOURCE_OPEN_EDGE_ATLAS',JSON.stringify(r));
 assert.equal(r.measuredOpenSeamTopologyGate,
  'PASS_ALL_NEW_OPEN_EDGES_MEASURED_BY_OTHER_VIEW');
 assert.ok(r.newOpenEdgesCreatedByOverlapRemoval>0);
 assert.equal(r.newOpenEdgesCreatedByOverlapRemoval,
  r.newOpenEdgesSupportedByFirstMeasuredCamera);
 assert.equal(r.unsupportedNewOpenEdges,0);
 assert.equal(r.verifiedOpenEdgeFraction,1);
 assert.ok(r.verifiedOpenEdgeLengthMM>0);
 assert.ok(r.workingOpenEdgesPerCamera[1]>r.originalOpenEdgesPerCamera[1]);
 assert.equal(r.workingTrianglesPerCamera[0],r.originalTrianglesPerCamera[0]);
 assert.ok(r.workingTrianglesPerCamera[1]<r.originalTrianglesPerCamera[1]);
 assert.equal(r.verifiedHuman1to1,false);
 assert.equal(r.productionReleasePASS,false);
 assert.equal(r.unknownBacksideFilled,false);
 assert.equal(r.geometryWelded,false);
 assert.equal(r.originalMaterialAndUVUnmodified,true);
 assert.equal(r.untouchedOriginalBINBytesVerified,true);
 assert.deepEqual([...a.originalGLBBytes],[...before[0]]);
 assert.deepEqual([...a.workingGLBBytes],[...before[1]]);
});
test('V115 physically unsupported newly exposed edge must fail even if original V114 had passed',async()=>{
 const a=await setup();
 const other=new Float32Array(a.views[0].depthValuesMM);
 // Every first-view reprojected point has no measured corroboration.
 other.fill(0);
 a.views[0]={...a.views[0],depthValuesMM:other};
 const r=await auditAIGReal3DV115ObservedBoundaryAtlas(a);
 assert.equal(r.researchGate,'BLOCK');
 assert.equal(r.measuredOpenSeamTopologyGate,
  'BLOCK_NEW_OPEN_SEAM_WITHOUT_MEASURED_COVERAGE');
 assert.ok(r.unsupportedNewOpenEdges>0);
 assert.equal(r.verifiedHuman1to1,false);
});
test('V115 incorrect file SHA, binary edits and false original evidence must fail closed',async()=>{
 const a=await setup();
 await assert.rejects(auditAIGReal3DV115ObservedBoundaryAtlas({
  ...a,workingGLBSha256:hash('e')}),/GLB_BYTES_DO_NOT_MATCH_SOURCE_HASH/);
 const bad=Uint8Array.from(a.workingGLBBytes);
 bad[bad.length-5]^=7;
 await assert.rejects(auditAIGReal3DV115ObservedBoundaryAtlas({
  ...a,workingGLBBytes:bad}),/GLB_BYTES_DO_NOT_MATCH_SOURCE_HASH/);
 await assert.rejects(auditAIGReal3DV115ObservedBoundaryAtlas({
  ...a,originalGLBSha256:a.workingGLBSha256}),
  /DISTINCT_HASHED_SOURCE_AND_WORKING_COPY_REQUIRED|GLB_BYTES_DO_NOT_MATCH_SOURCE_HASH/);
});
test('V115 red/green source material disagreement means boundary not verified, not invented texture repair',async()=>{
 const a=await setup();
 const changed=new Uint8ClampedArray(a.views[0].photoRGBA);
 for(let k=0;k<1024;k++)changed.set([252,14,18,255],k*4);
 a.views[0]={...a.views[0],photoRGBA:changed};
 const r=await auditAIGReal3DV115ObservedBoundaryAtlas(a);
 assert.equal(r.researchGate,'BLOCK');
 assert.ok(r.unsupportedEdgeReasons.SOURCE_COLOR_DISAGREEMENT>0);
 assert.equal(r.originalMaterialAndUVUnmodified,true);
});
