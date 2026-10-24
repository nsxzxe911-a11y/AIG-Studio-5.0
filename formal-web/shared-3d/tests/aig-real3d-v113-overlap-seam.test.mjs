import test from 'node:test';
import assert from 'node:assert/strict';
import {auditAIGReal3DV113TwoViewOverlap}
 from '../aig-real3d-v113-overlap-seam.mjs';
const SHA=i=>i.repeat(64);
const camera=x=>[1,0,0,0,0,1,0,0,0,0,1,0,x,0,0,1];
const rgba=(color,w=32,h=32)=>{
 const b=new Uint8ClampedArray(w*h*4);
 for(let i=0;i<w*h;i++)b.set([...color,255],i*4);
 return b;
};
function fixture(){
 const common={width:32,height:32,
  intrinsics:{fxPx:100,fyPx:100,cxPx:15.5,cyPx:15.5},
  depthValuesMM:new Float32Array(32*32).fill(1000)};
 return {sourceGLBSha256:SHA('f'),
  views:[
   {...common,cameraToWorldMM:camera(0),photoSha256:SHA('a'),
    depthSha256:SHA('c'),photoRGBA:rgba([90,150,200])},
   {...common,cameraToWorldMM:camera(20),photoSha256:SHA('b'),
    depthSha256:SHA('d'),photoRGBA:rgba([90,150,200])}
  ]};
}
test('V113 true bidirectional projected world XYZ agrees within mm on same observed planar fixture',()=>{
 const src=fixture();
 const before=src.views.map(v=>[...v.depthValuesMM]);
 const r=auditAIGReal3DV113TwoViewOverlap(src);
 assert.equal(r.researchGate,'PASS_OBSERVED_SEAM_CONSISTENCY');
 assert.equal(r.geometryOverlapStatus,'PASS_OBSERVED_DEPTH_SEAM_ONLY');
 assert.equal(r.materialDifferenceStatus,
  'CONSISTENT_RAW_COLOR_SAMPLES_NOT_MATERIAL_FIDELITY_CERTIFIED');
 assert.ok(r.overlapPairsTotal>=300);
 assert.equal(r.overlapRmsMM,0);
 assert.equal(r.overlapP95MM,0);
 assert.equal(r.overlapMaxMM,0);
 assert.equal(r.rawPhotoColorSeamMean,0);
 assert.ok(r.directions.every(d=>d.overlapPairs>=150));
 assert.ok(r.directions.every(d=>d.depthResidualAboveToleranceCount===0));
 assert.equal(r.productionReleasePASS,false);
 assert.equal(r.geometrySeamAutomaticallyWelded,false);
 assert.equal(r.newUnobservedSurfaceGenerated,false);
 assert.deepEqual(src.views.map(v=>[...v.depthValuesMM]),before);
 assert.equal(r.diagnostics.firstViewMismatchMask.length,32*32);
});
test('V113 detects depth outlier outside sparse landmarks even if V112 landmark points could pass',()=>{
 const src=fixture(),damaged=new Float32Array(src.views[1].depthValuesMM);
 damaged[14*32+14]=1009;src.views[1]={...src.views[1],depthValuesMM:damaged};
 const r=auditAIGReal3DV113TwoViewOverlap(src);
 assert.equal(r.researchGate,'BLOCK');
 assert.equal(r.geometryOverlapStatus,'BLOCK_OVERLAP_SURFACE_DEPTH_CONTRADICTION');
 assert.ok(r.overlapMaxMM>=9);
 assert.ok(r.directions.some(d=>d.depthResidualAboveToleranceCount>0));
 assert.ok([...r.diagnostics.firstViewMismatchMask,
  ...r.diagnostics.secondViewMismatchMask].some(Boolean));
});
test('V113 material exposure is a WARN, not fabricated texture correction or a geometry fault',()=>{
 const src=fixture();
 src.views[1]={...src.views[1],photoRGBA:rgba([225,35,31])};
 const r=auditAIGReal3DV113TwoViewOverlap(src);
 assert.equal(r.researchGate,'PASS_OBSERVED_SEAM_CONSISTENCY');
 assert.equal(r.materialDifferenceStatus,
  'WARN_RAW_COLOR_DIFFERENCE_EXPOSURE_OR_MATERIAL');
 assert.ok(r.rawPhotoColorSeamMean>38);
 assert.equal(r.originalGLBUnmodified,true);
 assert.equal(r.naturalHumanOrAnimalLikenessNotCertified,true);
});
test('V113 no overlap, duplicate source SHA or impossible calibration must never PASS',()=>{
 const a=fixture();
 a.views[1]={...a.views[1],cameraToWorldMM:camera(1200)};
 const r=auditAIGReal3DV113TwoViewOverlap(a);
 assert.equal(r.geometryOverlapStatus,'BLOCK_INSUFFICIENT_MEASURED_OVERLAP');
 assert.equal(r.researchGate,'BLOCK');
 const b=fixture();
 b.views[1]={...b.views[1],photoSha256:SHA('a')};
 assert.throws(()=>auditAIGReal3DV113TwoViewOverlap(b),/INDEPENDENT_COLOR_AND_DEPTH_SHAS_REQUIRED/);
 const c=fixture();
 assert.throws(()=>auditAIGReal3DV113TwoViewOverlap({...c,
  sourceGLBSha256:'not-a-sha'}),/TWO_SOURCES_BOUNDED_TOLERANCES/);
});
test('V113 depth unknown, occlusion and image outside are excluded from correspondence count',()=>{
 const x=fixture();
 const incomplete=new Float32Array(x.views[0].depthValuesMM);
 for(let y=0;y<32;y++)for(let col=0;col<14;col++)
  incomplete[y*32+col]=0;
 x.views[0]={...x.views[0],depthValuesMM:incomplete};
 const r=auditAIGReal3DV113TwoViewOverlap(x);
 assert.equal(r.researchGate,'PASS_OBSERVED_SEAM_CONSISTENCY');
 assert.ok(r.directions.some(d=>d.missingTargetDepthCells>0));
 assert.ok(r.overlapPairsTotal>100);
});
