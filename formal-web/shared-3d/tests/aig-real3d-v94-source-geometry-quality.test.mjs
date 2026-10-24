import test from 'node:test';
import assert from 'node:assert/strict';
import {createAIG3DMesh,createAIG3DScene,addAIG3DNode}
 from '../aig-real3d-core.mjs';
import {auditAIGReal3DOriginalStructure}
 from '../aig-real3d-v94-source-structure-audit.mjs';
import {auditAIGReal3DAnimatedSourceTopology}
 from '../aig-real3d-v94-dynamic-topology-gate.mjs';
import {evaluateAIGReal3DCinemaGeometryFirst}
 from '../aig-real3d-v94-cinema-quality-budget.mjs';
const source='a'.repeat(64),external='b'.repeat(64);
function cuboid(){
 const positions=[
  -1,-1,-1,1,-1,-1,1,1,-1,-1,1,-1,
  -1,-1,1,1,-1,1,1,1,1,-1,1,1
 ],normals=Array.from({length:8},()=>[0,0,1]).flat();
 const indices=[
  0,2,1,0,3,2,4,5,6,4,6,7,
  0,1,5,0,5,4,3,7,6,3,6,2,
  1,2,6,1,6,5,0,4,7,0,7,3
 ];
 return createAIG3DMesh({positions,normals,indices,
  provenance:'ORIGINAL_AUTHORED_NONHUMAN_CLOSED_INDEXED_CUBE_SOURCE'});
}
function scene(mesh=cuboid()){
 const scene=createAIG3DScene({id:'v94qa',consumer:'FastModel',
  units:'METERS',source:'NONHUMAN_ORIGINAL_INDEXED_SOURCE_GEOMETRY_QA'});
 addAIG3DNode(scene,{id:'hull',mesh,kind:'object',
  source:'SOURCE_SHA_BOUND_NONHUMAN_MESH'});
 return scene;
}
function part(closedSurfaceRequired=true){
 return [{id:'hullPart',nodeId:'hull',parentPartId:null,
  role:'SHELL',closedSurfaceRequired}];
}
function structure(opts={}){
 return auditAIGReal3DOriginalStructure({
  scene:scene(),sourceSha256:source,parts:part(),...opts});
}
function observation(kind,more={}){
 return {kind,partId:'hullPart',evidenceSha256:external,
  toleranceMm:.01,...more};
}
test('V94 original 12 triangles indexed source has actual closed topology, dimensions and measured thickness',()=>{
 const mesh=cuboid(),snapshot=JSON.stringify(mesh);
 const report=structure({observations:[
  observation('DIMENSION',{axis:0,measuredMm:2000}),
  observation('THICKNESS',{sourceVertexIds:[0,4],measuredMm:2000}),
  observation('POINT_3D',{sourceVertexIds:[0],measuredXYZMeters:[-1,-1,-1]})
 ]});
 assert.equal(report.sourceTopologyGatePASS,true);
 assert.equal(report.measuredOriginalDepthAndThicknessPASS,undefined);
 assert.equal(report.measurementsWithinTolerance,true);
 assert.equal(report.originalTriangleCount,12);
 assert.equal(report.originalTrianglesAdded,0);
 assert.equal(report.originalTrianglesRemoved,0);
 const p=report.parts[0].geometry;
 assert.equal(p.openSourceIndexedEdges,0);
 assert.equal(p.nonManifoldSourceEdges,0);
 assert.equal(p.adjacentFaceOrientationConflicts,0);
 assert.equal(p.indexedTopologyWatertight,true);
 assert.deepEqual(p.dimensionsMeters,[2,2,2]);
 assert.equal(p.sourceConnectedFaceIslands,1);
 assert.equal(report.precision1to1IndependentlyCertified,false);
 assert.equal(JSON.stringify(mesh),snapshot);
});
test('V94 open source mesh does not become synthetic closed 3D geometry',()=>{
 const mesh=createAIG3DMesh({positions:[0,0,0,1,0,0,1,1,0,0,1,0],
  normals:Array.from({length:4},()=>[0,0,1]).flat(),
  indices:[0,1,2,0,2,3],
  provenance:'ORIGINAL_SOURCE_SINGLE_OBSERVED_SURFACE'});
 const strict=auditAIGReal3DOriginalStructure({
  scene:scene(mesh),parts:part(),sourceSha256:source});
 assert.equal(strict.parts[0].geometry.openSourceIndexedEdges,4);
 assert.equal(strict.parts[0].geometry.indexedTopologyWatertight,false);
 assert.equal(strict.sourceTopologyGatePASS,false);
 const allowed=auditAIGReal3DOriginalStructure({
  scene:scene(mesh),parts:part(false),sourceSha256:source});
 assert.equal(allowed.sourceTopologyGatePASS,true);
 assert.equal(allowed.precision1to1IndependentlyCertified,false);
 assert.equal(allowed.parts[0].geometry.openSourceIndexedEdges,4);
});
test('V94 source face winding/duplicate/invalid hierarchy/synthetic reference are blocked',()=>{
 const m=cuboid(),idx=[...m.indices];
 idx[0]=idx[1];const invalid=createAIG3DMesh({
  positions:m.positions,normals:m.normals,indices:idx,
  provenance:'INVALID_COINCIDENT_ORIGINAL_TRIANGLE_QA'});
 assert.throws(()=>auditAIGReal3DOriginalStructure({
  scene:scene(invalid),sourceSha256:source,parts:part()}),
 /DEGENERATE_FACE_SOURCE_INDICES/);
 assert.throws(()=>structure({parts:[{...part()[0],parentPartId:'unknown'}]}),
 /PART_HIERARCHY_OR_SOURCE_NODE_INVALID/);
 assert.throws(()=>structure({sourceSha256:'incorrect'}),
 /SCENE_SHA_PARTS_BUDGET_INVALID/);
 assert.throws(()=>structure({observations:[
  observation('THICKNESS',{sourceVertexIds:[0,0],measuredMm:10})]}),
 /THICKNESS_POINT_PAIR_INVALID/);
});
test('V94 wrong source dimensions are measured FAIL rather than corrected by smoothing',()=>{
 const report=structure({observations:[observation('DIMENSION',{
  axis:1,measuredMm:2250,toleranceMm:.001
 })]});
 assert.equal(report.measurementsWithinTolerance,false);
 assert.equal(report.observationChecks[0].comparisonPASS,false);
 assert.equal(report.originalTrianglesAdded,0);
});
function animation(opts={}){
 const m=cuboid(),step=(d)=>m.positions.map((v,i)=>
  i%3===2?v+d:v);
 const frames=[{timeSec:0,positions:[...m.positions]},
  {timeSec:.1,positions:step(.01)},
  {timeSec:.2,positions:step(.03)}];
 return auditAIGReal3DAnimatedSourceTopology({
  originalMesh:m,sourceSha256:source,frames,...opts});
}
test('V94 real source triangle motion has stable normals, edge lengths and frame continuity',()=>{
 const a=animation();
 assert.equal(a.sourceMotionGeometryGatePASS,true);
 assert.equal(a.actualXYZMotionObserved,true);
 assert.equal(a.originalIndexedTrianglesPreserved,true);
 assert.equal(a.originalTriangleCount,12);
 assert.equal(a.maximumRelativeFaceArea,1);
 assert.equal(a.sourceFacesAdded,0);
 assert.equal(a.filmContinuityCertified,false);
 assert.deepEqual(a.temporalSpikeFrames,[]);
});
test('V94 sudden motion spike, face collapse or rewritten topology blocks movie quality',()=>{
 assert.equal(animation({limits:{
  maxRelativeEdgeStretch:.3,maxRelativeEdgeCompression:.35,
  minRelativeFaceArea:.08,maxRelativeFaceArea:3,
  maxFrameVertexStepMeters:.005,maxChangedFaceFraction:1,
  faceNormalFlipDotTolerance:-.85
 }}).sourceMotionGeometryGatePASS,false);
 const m=cuboid(),pose=[...m.positions];
 pose[3]=pose[0];pose[4]=pose[1];pose[5]=pose[2];
 const ruined=auditAIGReal3DAnimatedSourceTopology({
  originalMesh:m,sourceSha256:source,frames:[
   {timeSec:0,positions:[...m.positions]},
   {timeSec:.1,positions:pose}]});
 assert.equal(ruined.sourceMotionGeometryGatePASS,false);
 assert.ok(ruined.collapsedOriginalSourceFaceCandidates.length>0);
 assert.throws(()=>auditAIGReal3DAnimatedSourceTopology({
  originalMesh:m,sourceSha256:source,frames:[
   {timeSec:0,positions:[...m.positions]},
   {timeSec:.1,positions:[...pose],indices:m.indices.map((x,i)=>i===0?3:x)}]}),
 /FRAME_TIMING_OR_SOURCE_INDEX_MISMATCH/);
});
const channels=resolution=>[
 {channel:'ALBEDO',sourceImageSHA:external,widthPx:resolution,heightPx:resolution,
  sourceUVVerified:true},
 {channel:'METALLIC_ROUGHNESS',sourceImageSHA:external,widthPx:resolution,heightPx:resolution,
  sourceUVVerified:true},
 {channel:'TANGENT_NORMAL',sourceImageSHA:external,widthPx:resolution,heightPx:resolution,
  sourceUVVerified:true}
];
test('V94 material geometry-first: real structure + temporal motion + source textures still not cinema-certified',()=>{
 const sourceReport=structure({observations:[
  observation('THICKNESS',{sourceVertexIds:[0,4],measuredMm:2000})]});
 const cinema=evaluateAIGReal3DCinemaGeometryFirst({
  structure:sourceReport,motion:animation(),
  materialParts:[{partId:'hullPart',channels:channels(4096)}],
  shot:{widthPx:1920,heightPx:1080,cameraOrthoSpanMeters:3,
   maxProjectedSourceEdgePx:18,minTextureTexelsPerScreenPixel:1}
 });
 assert.equal(cinema.sourceGeometryGatePASS,true);
 assert.equal(cinema.measuredOriginalDepthAndThicknessPASS,true);
 assert.equal(cinema.originalPoseTopologyAndContinuityPASS,true);
 assert.equal(cinema.declaredMaterialSourcesPASS,true);
 assert.equal(cinema.cinemaTextureBudgetEstimatedPASS,true);
 assert.equal(cinema.partShotDiagnostics[0].sourceEdgeProjectionCalibrated,false);
 assert.equal(cinema.finalCinemaQualityPASS,false);
 assert.equal(cinema.releasePASS,false);
});
test('V94 poor material resolution and missing source UV cannot masquerade as accurate 3D',()=>{
 const report=evaluateAIGReal3DCinemaGeometryFirst({
  structure:structure(),
  materialParts:[{partId:'hullPart',channels:channels(64)}],
  shot:{widthPx:3840,heightPx:2160,cameraOrthoSpanMeters:1,
   maxProjectedSourceEdgePx:12,minTextureTexelsPerScreenPixel:1}
 });
 assert.equal(report.declaredMaterialSourcesPASS,true);
 assert.equal(report.cinemaTextureBudgetEstimatedPASS,false);
 assert.equal(report.measuredOriginalDepthAndThicknessPASS,false);
 assert.equal(report.filmCloseupGeometryDetailPASS,false);
 const bad=evaluateAIGReal3DCinemaGeometryFirst({
  structure:structure(),
  materialParts:[{partId:'hullPart',channels:channels(4096).map(c=>({
   ...c,sourceUVVerified:false}))}],
  shot:{widthPx:1920,heightPx:1080,cameraOrthoSpanMeters:2,
   maxProjectedSourceEdgePx:18,minTextureTexelsPerScreenPixel:1}
 });
 assert.equal(bad.declaredMaterialSourcesPASS,false);
});
