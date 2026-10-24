import test from 'node:test';
import assert from 'node:assert/strict';
import {auditAIGReal3DCurvedSixDirections,AIG_REAL3D_CURVED_SIX_DIRECTION_SCHEMA}
 from '../aig-real3d-curved-six-direction-depth.mjs';
const sha='a'.repeat(64);
export function makeNonhumanEllipsoid({rings=16,segments=24,omitSide=false,reverse=false}={}){
 const v=[0,.9,0],ind=[];
 for(let j=1;j<rings;j++){
  const phi=Math.PI*j/rings;
  for(let k=0;k<segments;k++){
   const theta=Math.PI*2*k/segments;
   v.push(.45*Math.sin(phi)*Math.cos(theta),
    .9*Math.cos(phi),.28*Math.sin(phi)*Math.sin(theta));
  }
 }
 const bottom=v.length/3;v.push(0,-.9,0);
 const idx=(j,k)=>1+(j-1)*segments+(k+segments)%segments;
 // Top pole, side strips and bottom pole: all original triangles outward.
 for(let k=0;k<segments;k++)ind.push(0,idx(1,k+1),idx(1,k));
 for(let j=1;j<rings-1;j++)for(let k=0;k<segments;k++){
  const a=idx(j,k),b=idx(j,k+1),
   c=idx(j+1,k),d=idx(j+1,k+1);
  if(!omitSide)ind.push(a,b,d,a,d,c);
 }
 for(let k=0;k<segments;k++)ind.push(idx(rings-1,k),idx(rings-1,k+1),bottom);
 if(reverse)for(let i=0;i<ind.length;i+=3)
  [ind[i+1],ind[i+2]]=[ind[i+2],ind[i+1]];
 return {positions:new Float32Array(v),indices:new Uint32Array(ind)};
}
test('Source curved ellipsoid has true six original directions and near/far depth layers with zero fabricated surface',()=>{
 const input=makeNonhumanEllipsoid();
 const original=Array.from(input.positions),faces=Array.from(input.indices);
 const r=auditAIGReal3DCurvedSixDirections({
  ...input,sourceSha256:sha,gridSize:24
 });
 assert.equal(r.schema,AIG_REAL3D_CURVED_SIX_DIRECTION_SCHEMA);
 assert.equal(r.sixDirectionalGeometryProjections.length,6);
 assert.equal(r.sixDirectionsHaveOriginalSourceSurfaceGeometry,true);
 assert.ok(r.sixDirectionalGeometryProjections.every(v=>
  v.originalGeometryCoveredPixels>0&&
  v.actualSourceFacingOriginalTriangles>0&&
  v.pixelsWithDistinctNearFarDepth>0&&
  v.nearestOriginalDepthMillimetersPerPixel.length===576));
 assert.equal(r.originalSourceTopology.openEdges,0);
 assert.equal(r.originalSourceTopology.nonManifoldEdges,0);
 assert.equal(r.originalSourceTopology.windingConflicts,0);
 assert.ok(r.enclosedSignedVolumeFromOriginalTrianglesCubicMeters>0);
 assert.equal(r.realClosedCurvedSourceSurfaceGatePASS,true);
 assert.equal(r.hasAuthenticatedSixScanDirectionObservations,false);
 assert.ok(r.sixDirectionalGeometryProjections.every(v=>
  v.scannerEvidenceStatus==='UNKNOWN_NO_VIEW_SCAN_PROVENANCE'));
 assert.equal(r.inferredUnobservedSurfaceCount,0);
 assert.deepEqual(Array.from(input.positions),original);
 assert.deepEqual(Array.from(input.indices),faces);
});
test('Only original top and bottom caps cannot invent four curved side surfaces',()=>{
 const r=auditAIGReal3DCurvedSixDirections({
  ...makeNonhumanEllipsoid({omitSide:true}),
  sourceSha256:sha,gridSize:24
 });
 assert.equal(r.realClosedCurvedSourceSurfaceGatePASS,false);
 assert.ok(r.originalSourceTopology.openEdges>0);
 assert.equal(r.attemptedMissingSurfaceFabrication,false);
 assert.equal(r.hasAuthenticatedSixScanDirectionObservations,false);
});
test('User-declared view coverage SHA can be inspected but cannot masquerade as authenticated scanner provenance',()=>{
 const input=makeNonhumanEllipsoid();
 const r=auditAIGReal3DCurvedSixDirections({
  ...input,sourceSha256:sha,gridSize:16,
  scanEvidence:{
   schema:'AIG_REAL3D_USER_DECLARED_VIEW_COVERAGE_V1',
   sourceSha256:sha,
   observedByDirection:{FRONT_POS_Z:[2,4,6]}
  }
 });
 const f=r.sixDirectionalGeometryProjections.find(x=>x.direction==='FRONT_POS_Z'),
  back=r.sixDirectionalGeometryProjections.find(x=>x.direction==='BACK_NEG_Z');
 assert.equal(f.userDeclaredObservedTriangleCount,3);
 assert.equal(f.scannerEvidenceStatus,'USER_DECLARED_NOT_INDEPENDENTLY_AUTHENTICATED');
 assert.equal(f.externallyAuthenticatedScanObservation,false);
 assert.equal(back.scannerEvidenceStatus,'UNKNOWN_NO_VIEW_SCAN_PROVENANCE');
 assert.equal(r.hasAuthenticatedSixScanDirectionObservations,false);
 assert.throws(()=>auditAIGReal3DCurvedSixDirections({
  ...input,sourceSha256:sha,scanEvidence:{
   schema:'AIG_REAL3D_USER_DECLARED_VIEW_COVERAGE_V1',
   sourceSha256:'f'.repeat(64),observedByDirection:{}
  }
 }),/REAL3D_CURVED_SIX_SCAN_EVIDENCE_SOURCE_SHA_OR_SCHEMA_MISMATCH/);
});
test('Inverted original curved winding rejects outward solid, even if projections appear to contain six sides',()=>{
 const r=auditAIGReal3DCurvedSixDirections({
  ...makeNonhumanEllipsoid({reverse:true}),sourceSha256:sha
 });
 assert.equal(r.sixDirectionsHaveOriginalSourceSurfaceGeometry,true);
 assert.equal(r.realClosedCurvedSourceSurfaceGatePASS,false);
 assert.ok(r.enclosedSignedVolumeFromOriginalTrianglesCubicMeters<0);
});
test('Broken edge, no 3D thickness, invalid index and unavailable bounded geometry FAIL',()=>{
 const input=makeNonhumanEllipsoid();
 const missing=new Uint32Array(input.indices.slice(3));
 const r=auditAIGReal3DCurvedSixDirections({
  positions:input.positions,indices:missing,sourceSha256:sha
 });
 assert.equal(r.realClosedCurvedSourceSurfaceGatePASS,false);
 assert.ok(r.originalSourceTopology.openEdges>0);
 assert.throws(()=>auditAIGReal3DCurvedSixDirections({
  ...input,sourceSha256:sha,maxOriginalTriangles:5
 }),/REAL3D_CURVED_SIX_SOURCE_TRIANGLE_BUDGET/);
 const wrong=new Uint32Array(input.indices);wrong[1]=999999;
 assert.throws(()=>auditAIGReal3DCurvedSixDirections({
  positions:input.positions,indices:wrong,sourceSha256:sha
 }),/REAL3D_CURVED_SIX_SOURCE_GLOBAL_TRIANGLE_INDEX_INVALID/);
 assert.throws(()=>auditAIGReal3DCurvedSixDirections({
  ...input,sourceSha256:sha,gridSize:7
 }),/REAL3D_CURVED_SIX_ORIGINAL_SOURCE_AND_BOUNDED_GRID_REQUIRED/);
});
