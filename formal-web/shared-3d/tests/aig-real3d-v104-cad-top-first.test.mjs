import test from 'node:test';
import assert from 'node:assert/strict';
import {createAIG3DScene,createAIG3DBox,addAIG3DNode}
 from '../aig-real3d-core.mjs';
import {AIG_REAL3D_V104_FACES,auditAIGReal3DV104Axes,
 convertAIGReal3DCNCToWorld,convertAIGReal3DWorldToCNC,
 createAIGReal3DTopCADObservation,createAIGReal3DTopFirstInspector}
 from '../aig-real3d-v104-cad-top-first.mjs';
const sourceSHA='a'.repeat(64);
function cube(units='MM'){
 const scene=createAIG3DScene({id:'RealCNCSource',consumer:'AIG-Studio-5.0',
  units,source:'V104_SOURCE_REAL_INDEXED_CUBE_QA'});
 const scale=units==='METERS'?.001:1;
 addAIG3DNode(scene,{id:'realWorkpiece',kind:'stock',
  mesh:createAIG3DBox([2*scale,4*scale,6*scale],
   'V104_ACTUAL_INDEXED_SIX_SIDED_WORKPIECE'),
  source:'SOURCE_TRUE_INDEXED_CNC_WORKPIECE'});
 return scene;
}
test('V104 CNC Z-up -> Real3D Y-up is a right-handed THREE axis rotation, not 18D',()=>{
 const a=auditAIGReal3DV104Axes();
 assert.equal(a.faces.length,6);
 assert.equal(a.worldCoordinateDegreesOfFreedom,3);
 assert.equal(a.sixViewsEachWithThreeCoordinates,18);
 assert.equal(a.physicallyEighteenDimensions,false);
 assert.equal(a.rightHandedBasisPASS,true);
 assert.equal(a.cncMasterOriginMM[0],0);
 assert.equal(a.faces[0].id,'TOP');
 assert.deepEqual(convertAIGReal3DCNCToWorld([10,20,30],{sceneUnits:'MM'}),[10,30,-20]);
 assert.deepEqual(convertAIGReal3DWorldToCNC([10,30,-20],{sceneUnits:'MM'}),[10,20,30]);
 assert.deepEqual(convertAIGReal3DCNCToWorld([1000,2000,3000],{sceneUnits:'METERS'}),
  [1,3,-2]);
 assert.deepEqual(convertAIGReal3DWorldToCNC([1,3,-2],{sceneUnits:'METERS'}),
  [1000,2000,3000]);
 assert.deepEqual(AIG_REAL3D_V104_FACES.find(x=>x.id==='BOTTOM').normal,[0,-1,0]);
});
test('V104 TOP eager, remaining FIVE truly lazy with exactly one indexed XYZ scene',()=>{
 const s=cube(),before=JSON.stringify(s);
 const inspector=createAIGReal3DTopFirstInspector({scene:s,sourceGeometrySHA:sourceSHA,resolution:24});
 const initial=inspector.audit();
 assert.equal(initial.actualFacesGenerated,1);
 assert.equal(initial.pendingFaces.length,5);
 assert.equal(initial.oneModelSourceForAllFaces,true);
 assert.equal(inspector.top.faceId,'TOP');
 assert.equal(inspector.top.occupancy>0.85,true);
 assert.equal(inspector.originalTrueTriangleCount,12);
 assert.deepEqual(inspector.originalXYZBoundsInCNCmm,{min:[-1,-3,-2],max:[1,3,2]});
 assert.deepEqual(inspector.top.sourceXYZPlaneBounds.min,[-1,-3,-2]);
 assert.deepEqual(inspector.top.sourceXYZPlaneBounds.max,[1,3,2]);
 assert.equal(inspector.top.frontMostSourceDepth,undefined);
 assert.ok(inspector.top.visibleDepthRange.max===2);
 const right=inspector.requestFace('RIGHT');
 assert.equal(right.cncBdeg,90);
 assert.equal(right.basedOnOneRealXYZScene,true);
 assert.equal(inspector.audit().actualFacesGenerated,2);
 inspector.requestFace('RIGHT');
 assert.equal(inspector.audit().cacheHits,1);
 assert.equal(inspector.audit().actualFacesGenerated,2);
 const whole=inspector.fullSixFaceSummary();
 assert.equal(inspector.audit().actualFacesGenerated,6);
 assert.equal(whole.perFace.length,6);
 assert.equal(whole.realSpatialDimensions,3);
 assert.equal(whole.sixTimesThreeProjectionChannels,18);
 assert.equal(whole.releasePASS,false);
 assert.equal(JSON.stringify(s),before);
});
test('V104 exact same physical cube bounds in MM and METERS and same six-face view',()=>{
 const mm=createAIGReal3DTopFirstInspector({scene:cube('MM'),sourceGeometrySHA:sourceSHA,
  resolution:32});
 const m=createAIGReal3DTopFirstInspector({scene:cube('METERS'),sourceGeometrySHA:sourceSHA,
  resolution:32});
 assert.deepEqual(mm.originalXYZBoundsInCNCmm,m.originalXYZBoundsInCNCmm);
 assert.equal(mm.top.occupancy,m.top.occupancy);
 for(const face of ['FRONT','BACK','LEFT','RIGHT','BOTTOM']){
  const a=mm.requestFace(face),b=m.requestFace(face);
  assert.ok(a.hitPixels>0);
  assert.equal(a.hitPixels,b.hitPixels);
 }
});
test('V104 observed CAD XY outline comparison is evidence-bound; matching box is NOT identity or full silhouette PASS',()=>{
 const observed=createAIGReal3DTopCADObservation({
  assetId:'WorkpieceCAD',imageSha256:sourceSHA,
  sourceVisibility:'OBSERVED',
  verticesXYmm:[[-1,-3],[1,-3],[1,3],[-1,3]],
  actualTopPlaneHeightMM:2});
 const inspector=createAIGReal3DTopFirstInspector({
  scene:cube(),sourceGeometrySHA:sourceSHA,resolution:24,
  observedTopCAD:observed});
 assert.deepEqual(inspector.topCADComparison.absoluteBoxEdgeErrorsMM,[0,0,0,0]);
 assert.equal(inspector.topCADComparison.observedHeightCertified,true);
 assert.equal(inspector.topCADComparison.independentPhotoSilhouetteSimilarityCertified,false);
 assert.equal(observed.sourceBottomFaceKnown,false);
 assert.equal(observed.approvedFor3DGeometryGeneration,false);
 const summary=inspector.fullSixFaceSummary();
 assert.equal(summary.independentlyObservedFaceCount,1);
 assert.equal(summary.missingSideAndBottomGroundTruthBlocked,true);
 assert.equal(summary.noFabricatedReverseAnatomy,true);
});
test('V104 one AI estimated top view is NOT independently observed 3D',()=>{
 const estimated=createAIGReal3DTopCADObservation({
  imageSha256:sourceSHA,sourceVisibility:'AI_ESTIMATED',
  verticesXYmm:[[-1,-3],[1,-3],[1,3],[-1,3]],actualTopPlaneHeightMM:2
 });
 assert.equal(estimated.actual3DHeightObserved,false);
 const six=createAIGReal3DTopFirstInspector({
  scene:cube(),sourceGeometrySHA:sourceSHA,observedTopCAD:estimated
 }).fullSixFaceSummary();
 assert.equal(six.independentlyObservedFaceCount,0);
 assert.equal(six.releasePASS,false);
});
test('V104 missing source geometry, bad CAD evidence and stale CAD revisions BLOCK',()=>{
 assert.throws(()=>createAIGReal3DTopFirstInspector({
  scene:cube(),sourceGeometrySHA:'not-sha'}),/TOP_FIRST_SOURCE_SHA_AND_ORIGIN_REQUIRED/);
 assert.throws(()=>createAIGReal3DTopCADObservation({
  imageSha256:sourceSHA,verticesXYmm:[[0,0],[1,1],[2,2]]
 }),/TOP_CAD_OUTLINE_AREA_ZERO/);
 assert.throws(()=>createAIGReal3DTopFirstInspector({
  scene:{schema:'FAKE_2D_IMAGE',units:'METERS',nodes:[]},sourceGeometrySHA:sourceSHA
 }),/INDEXED_SOURCE_SCENE_REQUIRED/);
 const s=cube(),v=createAIGReal3DTopFirstInspector({scene:s,sourceGeometrySHA:sourceSHA});
 s.revision++;
 assert.throws(()=>v.requestFace('BACK'),/SOURCE_REVISION_CHANGED_REBUILD_INSPECTOR/);
 assert.throws(()=>v.fullSixFaceSummary(),/SOURCE_REVISION_CHANGED_REBUILD_INSPECTOR/);
});
