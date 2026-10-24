import test from 'node:test';
import assert from 'node:assert/strict';
import {sha256AIGReal3DBytes} from '../aig-real3d-v99-native-model-ingest.mjs';
import {buildAIGReal3DV112CalibratedMultiViewGLB} from '../aig-real3d-v112-calibrated-multiview.mjs';
import {deduplicateAIGReal3DV114VerifiedOverlapGLB}
 from '../aig-real3d-v114-verified-overlap-dedup.mjs';
import {auditAIGReal3DV115ObservedBoundaryAtlas}
 from '../aig-real3d-v115-observed-boundary-atlas.mjs';
import {auditAIGReal3DV116CaptureNormalAndOcclusion}
 from '../aig-real3d-v116-capture-normal-occlusion.mjs';
const SHA=c=>c.repeat(64);
const mat=x=>[1,0,0,0,0,1,0,0,0,0,1,0,x,0,0,1];
function model(){
 const rgba=new Uint8ClampedArray(32*32*4);
 for(let i=0;i<1024;i++)rgba.set([92,151,181,255],i*4);
 const png=k=>{const p=new Uint8Array(128);
  p.set([137,80,78,71,13,10,26,10]);p.fill(k,8);return p;};
 const shared={width:32,height:32,depthMeasuredAndCalibrated:true,
  intrinsics:{fxPx:100,fyPx:100,cxPx:15.5,cyPx:15.5},
  depthValuesMM:new Float32Array(1024).fill(1000)};
 const views=[
  {...shared,photoRGBA:Uint8ClampedArray.from(rgba),
   imagePNGBytes:png(10),photoSha256:SHA('a'),
   depthSha256:SHA('c'),cameraToWorldMM:mat(0)},
  {...shared,photoRGBA:Uint8ClampedArray.from(rgba),
   imagePNGBytes:png(12),photoSha256:SHA('b'),
   depthSha256:SHA('d'),cameraToWorldMM:mat(20)}
 ];
 const correspondences=[
  {x0:10,y0:10,x1:8,y1:10},
  {x0:22,y0:10,x1:20,y1:10},
  {x0:10,y0:22,x1:8,y1:22}
 ];
 const captureManifests=views.map((v,i)=>({
  sourceClass:'SYNTHETIC_FIXTURE',depthMethod:'SIMULATED_RAY_DEPTH',
  captureId:'FIXTURE_CAPTURE_'+i,deviceId:'BENCH_CAM_'+i,
  capturedAtUTC:'2026-10-25T00:00:0'+i+'Z',
  photoSha256:v.photoSha256,depthSha256:v.depthSha256,
  calibrationDocumentSha256:SHA(i?'f':'e')
 }));
 return {views,correspondences,captureManifests};
}
async function build(){
 const a=model();
 const source=buildAIGReal3DV112CalibratedMultiViewGLB({
  views:a.views,correspondences:a.correspondences,step:2,maxSurfaceEdgeMM:35
 });
 const sourceSHA=await sha256AIGReal3DBytes(source.glbBytes);
 const work=deduplicateAIGReal3DV114VerifiedOverlapGLB({
  glbBytes:source.glbBytes,sourceGLBSha256:sourceSHA,views:a.views
 });
 const workingSHA=await sha256AIGReal3DBytes(work.glbBytes);
 const v115=await auditAIGReal3DV115ObservedBoundaryAtlas({
  views:a.views,originalGLBBytes:source.glbBytes,workingGLBBytes:work.glbBytes,
  originalGLBSha256:sourceSHA,workingGLBSha256:workingSHA
 });
 assert.equal(v115.researchGate,'PASS_SOURCE_OPEN_EDGE_ATLAS');
 return {views:a.views,captureManifests:a.captureManifests,v115Receipt:v115};
}
test('V116 measured plane has bidirectional real normals, distinct manifest SHAs, no invented anatomy',async()=>{
 const a=await build(),before=a.views.map(v=>Array.from(v.depthValuesMM));
 const r=auditAIGReal3DV116CaptureNormalAndOcclusion(a);
 assert.equal(r.researchGate,'PASS_COMPUTED_NORMAL_CONTINUITY',JSON.stringify(r));
 assert.equal(r.normalAndSurfaceGate,'PASS_SOURCE_MEASURED_NORMAL_CONTINUITY_ONLY');
 assert.equal(r.normalAngleP95Deg,0);
 assert.equal(r.matchedWorldPositionMaxMM,0);
 assert.ok(r.bidirectionalNormalPairsTotal>200);
 assert.ok(r.directions.every(d=>d.independentlyMeasuredNormalPairs>=32));
 assert.equal(r.independentCameraCaptureAuthenticated,false);
 assert.equal(r.hardwareDepthSensorEvidenceIndependentlyChecked,false);
 assert.equal(r.syntheticFixtureUsed,true);
 assert.equal(r.photo1to1LikenessCertified,false);
 assert.equal(r.realScannerGroundTruthGate,'BLOCK_NO_EXTERNAL_CAPTURE_ATTESTATION');
 assert.equal(r.productionReleasePASS,false);
 assert.deepEqual(a.views.map(v=>Array.from(v.depthValuesMM)),before);
});
test('V116 local non-landmark depth change blocks true measured normal or geometry',async()=>{
 const a=await build(),arr=new Float32Array(a.views[1].depthValuesMM);
 arr[14*32+14]=1050;a.views[1]={...a.views[1],depthValuesMM:arr};
 const r=auditAIGReal3DV116CaptureNormalAndOcclusion(a);
 assert.equal(r.researchGate,'BLOCK');
 assert.equal(r.normalAndSurfaceGate,'BLOCK_UNREVIEWED_DEPTH_OCCLUSION_CANDIDATES');
 assert.ok(r.unreviewedDepthDiscontinuityCandidates>0);
 assert.ok(r.directions.some(d=>d.candidateDiscontinuityOrOcclusionCount>0));
});
test('V116 loss of independent opposite depth becomes BLOCK rather than unknown surface completion',async()=>{
 const a=await build();
 const arr=new Float32Array(a.views[0].depthValuesMM);arr.fill(0);
 a.views[0]={...a.views[0],depthValuesMM:arr};
 const r=auditAIGReal3DV116CaptureNormalAndOcclusion(a);
 assert.equal(r.researchGate,'BLOCK');
 assert.equal(r.normalAndSurfaceGate,'BLOCK_INSUFFICIENT_BIDIRECTIONAL_OBSERVED_NORMALS');
 assert.ok(r.directions.some(d=>d.otherCameraDepthMissingOrNormalUnavailable>0));
 assert.equal(r.unknownSurfaceFilled,false);
});
test('V116 synthetic cannot masquerade as sensor capture; declared hardware still never certified',async()=>{
 const a=await build();
 a.captureManifests[0]={...a.captureManifests[0],sourceClass:'DECLARED_SENSOR_CAPTURE'};
 assert.throws(()=>auditAIGReal3DV116CaptureNormalAndOcclusion(a),
  /CAPTURE_0_DECLARED_IDENTITIES_AND_FILE_HASHES_REQUIRED/);
 const b=await build();
 b.captureManifests=b.captureManifests.map(m=>({...m,
  sourceClass:'DECLARED_SENSOR_CAPTURE',depthMethod:'MEASURED_DEPTH_SENSOR'}));
 const r=auditAIGReal3DV116CaptureNormalAndOcclusion(b);
 assert.equal(r.researchGate,'PASS_COMPUTED_NORMAL_CONTINUITY');
 assert.equal(r.syntheticFixtureUsed,false);
 assert.equal(r.independentCameraCaptureAuthenticated,false);
 assert.equal(r.calibrationDocumentContentVerified,false);
 assert.equal(r.productionReleasePASS,false);
});
test('V116 rejects reused calibration, forged photo SHA and insufficient V115 provenance',async()=>{
 const a=await build();
 a.captureManifests[1]={...a.captureManifests[1],
  calibrationDocumentSha256:a.captureManifests[0].calibrationDocumentSha256};
 assert.throws(()=>auditAIGReal3DV116CaptureNormalAndOcclusion(a),
  /TWO_DISTINCT_CAPTURE_AND_CALIBRATION_SOURCES_REQUIRED/);
 const b=await build();
 b.captureManifests[1]={...b.captureManifests[1],photoSha256:SHA('e')};
 assert.throws(()=>auditAIGReal3DV116CaptureNormalAndOcclusion(b),
  /CAPTURE_1_DECLARED_IDENTITIES_AND_FILE_HASHES_REQUIRED/);
 const c=await build();
 c.v115Receipt={...c.v115Receipt,unsupportedNewOpenEdges:1};
 assert.throws(()=>auditAIGReal3DV116CaptureNormalAndOcclusion(c),
  /ORIGINAL_SEAM_ATLAS_NOT_INDEPENDENTLY_SUPPORTED/);
});
