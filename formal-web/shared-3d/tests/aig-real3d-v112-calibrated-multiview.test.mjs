import test from 'node:test';
import assert from 'node:assert/strict';
import {buildAIGReal3DV112CalibratedMultiViewGLB}
 from '../aig-real3d-v112-calibrated-multiview.mjs';
const sha=i=>String(i).repeat(64);
const mat=x=>[1,0,0,0,0,1,0,0,0,0,1,0,x,0,0,1];
function input(){
 const png=new Uint8Array(128);png.set([137,80,78,71,13,10,26,10]);png.fill(22,8);
 const depth=new Float32Array(32*32).fill(1000);
 const base={width:32,height:32,imagePNGBytes:png,
  depthMeasuredAndCalibrated:true,depthValuesMM:depth,
  intrinsics:{fxPx:100,fyPx:100,cxPx:15.5,cyPx:15.5}};
 const views=[
  {...base,photoSha256:sha('a'),depthSha256:sha('c'),cameraToWorldMM:mat(0)},
  {...base,photoSha256:sha('b'),depthSha256:sha('d'),cameraToWorldMM:mat(20)}
 ];
 const correspondences=[
  {x0:10,y0:10,x1:8,y1:10},
  {x0:22,y0:10,x1:20,y1:10},
  {x0:10,y0:22,x1:8,y1:22}
 ];
 return {views,correspondences,step:2,maxSurfaceEdgeMM:35};
}
function unpack(b){
 const d=new DataView(b.buffer,b.byteOffset,b.byteLength);
 assert.equal(d.getUint32(0,true),0x46546c67);
 assert.equal(d.getUint32(4,true),2);
 assert.equal(d.getUint32(8,true),b.length);
 const n=d.getUint32(12,true),head=JSON.parse(
  new TextDecoder().decode(b.slice(20,20+n)).trim());
 return {head,offset:20+n+8};
}
test('V112 true two independent metric-depth observations share millimeter world frame in original GLB',()=>{
 const source=input(),before=source.views.map(v=>[...v.depthValuesMM]);
 const {glbBytes,receipt}=buildAIGReal3DV112CalibratedMultiViewGLB(source);
 const {head,offset}=unpack(glbBytes);
 assert.equal(receipt.viewCount,2);
 assert.equal(receipt.sharedLandmarksChecked,3);
 assert.equal(receipt.landmarkRegistrationRmsMM,0);
 assert.equal(receipt.landmarkRegistrationMaxMM,0);
 assert.equal(receipt.cameraBaselineMM,20);
 assert.equal(receipt.sameWorldCoordinates,true);
 assert.equal(receipt.unknownBacksideKeptUnknown,true);
 assert.equal(receipt.multiViewIdentityLikenessCertified,false);
 assert.equal(receipt.externalDepthCalibrationEvidenceVerified,false);
 assert.equal(receipt.full1to1ReleaseGate,'BLOCK_UNOBSERVED_AND_UNCERTIFIED_SURFACES');
 assert.equal(receipt.releasePASS,false);
 assert.ok(receipt.observedTriangleCount>100);
 assert.equal(head.meshes.length,2);
 assert.equal(head.materials.length,2);
 assert.equal(head.images.length,2);
 assert.equal(head.nodes.length,2);
 assert.equal(head.accessors.length,8);
 assert.equal(head.accessors[0].componentType,5126);
 assert.equal(head.accessors[3].componentType,5125);
 for(let i=0;i<2;i++){
  const view=head.bufferViews[head.images[i].bufferView],image=glbBytes.slice(
   offset+view.byteOffset,offset+view.byteOffset+view.byteLength);
  assert.deepEqual([...image],[...source.views[i].imagePNGBytes]);
  assert.deepEqual([...source.views[i].depthValuesMM],before[i]);
 }
});
test('V112 conflicting view calibration, wrong shared landmarks, or duplicate source hashes BLOCK',()=>{
 const x=input();
 assert.throws(()=>buildAIGReal3DV112CalibratedMultiViewGLB({...x,
  views:[x.views[0],{...x.views[1],cameraToWorldMM:mat(50)}]}),
  /CAMERA_WORLD_ALIGNMENT_OR_LANDMARK_DEPTH_CONTRADICTED/);
 assert.throws(()=>buildAIGReal3DV112CalibratedMultiViewGLB({...x,
  views:[x.views[0],{...x.views[1],photoSha256:sha('a')}]}),
  /TWO_INDEPENDENT_PHOTO_AND_DEPTH_SOURCES_REQUIRED/);
 assert.throws(()=>buildAIGReal3DV112CalibratedMultiViewGLB({...x,
  views:[x.views[0],{...x.views[1],depthMeasuredAndCalibrated:false}]}),
  /NEEDS_REAL_COLOR_DEPTH_SHA_CALIBRATION/);
 assert.throws(()=>buildAIGReal3DV112CalibratedMultiViewGLB({...x,
  correspondences:x.correspondences.slice(0,2)}),
  /THREE_TRUE_SHARED_LANDMARKS_REQUIRED/);
 assert.throws(()=>buildAIGReal3DV112CalibratedMultiViewGLB({...x,
  correspondences:[x.correspondences[0],x.correspondences[0],x.correspondences[1]]}),
  /DUPLICATE_LANDMARK/);
});
test('V112 depth occlusion and unknown pixel are skipped, never stitched or AI-filled',()=>{
 const x=input(),b=new Float32Array(x.views[0].depthValuesMM);
 b[0]=0;
 const a=buildAIGReal3DV112CalibratedMultiViewGLB({...x,
  views:[{...x.views[0],depthValuesMM:b},x.views[1]]});
 assert.ok(a.receipt.observedSurfacePatches[0].depthGapCellsSkipped>=1);
 assert.equal(a.receipt.unobservedFacesEstimated,false);
 const extreme=new Float32Array(x.views[0].depthValuesMM);
 extreme[4+4*32]=3000;
 const q=buildAIGReal3DV112CalibratedMultiViewGLB({...x,
  views:[{...x.views[0],depthValuesMM:extreme},x.views[1]]});
 assert.ok(q.receipt.observedSurfacePatches[0].occlusionEdgeCellsSkipped>=1);
});
test('V112 invalid handedness and physically indistinguishable cameras do not pass as multi-view',()=>{
 const x=input();
 assert.throws(()=>buildAIGReal3DV112CalibratedMultiViewGLB({...x,
  views:[x.views[0],{...x.views[1],cameraToWorldMM:mat(0)}]}),
  /TWO_VIEWS_SAME_CAMERA_POSE/);
 const reflection=[-1,0,0,0,0,1,0,0,0,0,1,0,20,0,0,1];
 assert.throws(()=>buildAIGReal3DV112CalibratedMultiViewGLB({...x,
  views:[x.views[0],{...x.views[1],cameraToWorldMM:reflection}]}),
  /CAMERA_ROTATION_REFLECTED_OR_INVALID/);
});
