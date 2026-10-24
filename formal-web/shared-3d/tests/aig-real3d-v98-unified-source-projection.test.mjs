import test from 'node:test';
import assert from 'node:assert/strict';
import {createAIG3DScene,createAIG3DBox,addAIG3DNode}
 from '../aig-real3d-core.mjs';
import {createAIGReal3DUnifiedSource,evaluateAIGReal3DUnifiedReprojection,
 projectAIGReal3DToImage,buildAIGReal3DProjectedWireframe}
 from '../aig-real3d-v98-unified-source-projection.mjs';
import {fitAIGReal3DObservedMultiViewAnchors}
 from '../aig-real3d-v98-projection-fit.mjs';
import {createAIGReal3DUnifiedAssetPipeline,runAIGReal3DUnifiedPortrait,
 evaluateAIGReal3DUnified4KSource}
 from '../aig-real3d-v98-ai-3d-bridge.mjs';
const sha='a'.repeat(64),sha2='b'.repeat(64),authority='c'.repeat(64);
function sample(domain='SHIP'){
 const scene=createAIG3DScene({id:'v98asset',consumer:'FastModel',units:'METERS',
  source:'REAL_EXPLICIT_ORIGINAL_SOURCE_NONHUMAN_QA'});
 const mesh=createAIG3DBox([.65,.65,.65],
  'SOURCE_SHA_BOUND_NONHUMAN_ORIGINAL_CUBE_TEST');
 addAIG3DNode(scene,{id:'assetBody',mesh,kind:domain==='PERSON'?'character':'object',
  source:'EXPLICIT_REAL_TRIANGLES_NONHUMAN_ORIGINAL'});
 return {scene,mesh};
}
const cam=(yaw=0)=>({projection:'orthographic',yaw,pitch:0,
 focus:[0,0,0],orthoSpan:2,distance:4,fovDeg:55});
function buildViews(scene,{includeSide=true,inferSide=false,shift=[.007,.006,.005]}={}){
 const views=[];
 for(const [key,camera,imageSha,visibility] of [
  ['front',cam(0),sha,'OBSERVED'],
  ['side',cam(Math.PI/2),sha2,inferSide?'AI_ESTIMATED':'OBSERVED']
 ]){
  if(key==='side'&&!includeSide)continue;
  const anchors=[];
  for(const vertexIndex of [0,1,2]){
   const original=projectAIGReal3DToImage({
    scene,nodeId:'assetBody',vertexIndex,camera,width:256,height:256});
   // Projection of known offset: front sees x/y, side sees -z/y.
   const width=128,dx=(key==='front'?shift[0]:-shift[2])*width,
    dy=-shift[1]*width;
   anchors.push({nodeId:'assetBody',vertexIndex,
    xPx:original.xPx+dx,yPx:original.yPx+dy,confidence:1});
  }
  views.push({viewId:key,imageSha256:imageSha,width:256,height:256,
   camera,sourceVisibility:visibility,landmarkSource:'USER_MARKED',
   anchors});
 }
 return views;
}
test('V98 ONE SHA-locked source schema is shared by person, animal, ship, environment, CNC',()=>{
 for(const domain of ['PERSON','ANIMAL','SHIP','ENVIRONMENT','CNC_PART']){
  const {scene}=sample(domain);
  const r=createAIGReal3DUnifiedAssetPipeline({
   assetId:'Asset'+domain,domain,scene,originalImageSha256:sha,
   sourceGeometrySha256:sha2,
   imageViews:buildViews(scene,{includeSide:false}),
   projectedViewId:'front'});
  assert.equal(r.record.domain,domain);
  assert.equal(r.record.stableAssetIdentity,'Asset'+domain);
  assert.equal(r.sourceGeometryNodes[0].sourceTriangles,12);
  assert.equal(r.projected.actual3DIndexedSourceProjection,true);
  assert.ok(r.projected.edges.length>0);
  assert.equal(r.baseline.independentObservedAnchorCount,3);
  assert.equal(r.sourceMeshesModified,false);
  assert.equal(r.releasePASS,false);
 }
});
test('V98 real camera 3D to 2D pixel anchors produce nonzero measured reprojection',()=>{
 const {scene}=sample(),views=buildViews(scene);
 const record=createAIGReal3DUnifiedSource({
  assetId:'StarshipLocked',domain:'SHIP',scene,
  originalImageSha256:sha,imageViews:views});
 const a=evaluateAIGReal3DUnifiedReprojection({record});
 assert.equal(a.independentObservedAnchorCount,6);
 assert.ok(a.observedRMSEPixels>0.4);
 assert.equal(a.AIInferredAnchorsExcludedFromGroundTruth,0);
 assert.equal(a.views.length,2);
 assert.equal(a.inferredSideBackCertified,false);
 const projection=projectAIGReal3DToImage({
  scene,nodeId:'assetBody',vertexIndex:0,camera:cam(),
  width:256,height:256});
 assert.ok(Number.isFinite(projection.xPx));
 assert.ok(Number.isFinite(projection.yPx));
});
test('V98 observed paired 2D front/side anchors correct TRUE original XYZ without changing unseen vertices or triangle IDs',()=>{
 const {scene,mesh}=sample(),before=JSON.stringify(mesh);
 const record=createAIGReal3DUnifiedSource({
  assetId:'StarshipLocked',domain:'SHIP',scene,
  originalImageSha256:sha,imageViews:buildViews(scene)});
 const fitted=fitAIGReal3DObservedMultiViewAnchors({record});
 assert.equal(fitted.actuallyMovedOriginalSourceVertices,3);
 assert.ok(fitted.measured2DPixelRMSEAfter<fitted.measured2DPixelRMSEBefore*.05);
 assert.equal(fitted.independentlyObservedCameraViews,2);
 assert.equal(fitted.originalSourceMeshesUntouched,true);
 assert.equal(fitted.singlePhoto3DDepthCertified,false);
 assert.equal(fitted.originalMeshTriangleIndicesNeverChanged,true);
 assert.equal(JSON.stringify(mesh),before);
 const working=fitted.workingScene.nodes[0].mesh;
 assert.deepEqual(working.indices,mesh.indices);
 assert.deepEqual(working.positions.slice(3*3),mesh.positions.slice(3*3));
 assert.ok(Math.abs(working.positions[2]-mesh.positions[2])>.001);
 assert.equal(fitted.releasePASS,false);
});
test('V98 predicted AI side/back is NEVER ground truth for fitting or source depth',()=>{
 const {scene}=sample();
 const record=createAIGReal3DUnifiedSource({
  assetId:'SourceOnly',domain:'SHIP',scene,
  originalImageSha256:sha,imageViews:buildViews(scene,{inferSide:true})});
 const a=evaluateAIGReal3DUnifiedReprojection({record});
 assert.equal(a.independentObservedAnchorCount,3);
 assert.equal(a.AIInferredAnchorsExcludedFromGroundTruth,3);
 const f=fitAIGReal3DObservedMultiViewAnchors({record});
 assert.equal(f.independentlyObservedCameraViews,1);
 assert.equal(f.singlePhoto3DDepthCertified,false);
 assert.equal(f.sourcePhotoErrorActuallyImproved,true);
});
test('V98 missing observed images, inverted inputs, forged vertices and source ID changes BLOCK',()=>{
 const {scene}=sample();
 const inferred=buildViews(scene,{inferSide:true});
 inferred[0].sourceVisibility='AI_ESTIMATED';
 const rec=createAIGReal3DUnifiedSource({
  assetId:'NoObservation',domain:'SHIP',scene,
  originalImageSha256:sha,imageViews:inferred});
 assert.throws(()=>fitAIGReal3DObservedMultiViewAnchors({record:rec}),
 /INSUFFICIENT_OBSERVED_PHOTO_LANDMARKS/);
 const wrong=buildViews(scene);
 wrong[0].anchors[0].vertexIndex=100000;
 assert.throws(()=>createAIGReal3DUnifiedSource({
  assetId:'BadSource',domain:'SHIP',scene,
  originalImageSha256:sha,imageViews:wrong}),
 /OBSERVATION_VERTEX_OR_PIXEL_INVALID/);
 assert.throws(()=>createAIGReal3DUnifiedSource({
  assetId:'ReplaceHeroine',domain:'PERSON',scene,
  originalImageSha256:'not-a-sha'}),
 /ASSET_ID_DOMAIN_SOURCE_SHA_REQUIRED/);
});
function portrait(){
 const width=256,height=256,rgba=new Uint8ClampedArray(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const k=(y*width+x)*4;
  const t=(y-25)/90,half=Math.round(34-9*t),
   face=y>=25&&y<115&&Math.abs(x-128)<=half;
  rgba[k]=face?215:11;rgba[k+1]=face?145:23;
  rgba[k+2]=face?105:50;rgba[k+3]=255;
 }
 return {rgba,width,height,imageSha256:sha};
}
test('V98 actual original photo→V97 real 3D skin→V96 native 4K source is ONE source contract, without fake identity',()=>{
 const r=runAIGReal3DUnifiedPortrait({
  ...portrait(),approvedIdentitySha256:authority});
 assert.equal(r.status,'V98_SOURCE_SHARED_INFERRED_CHARACTER_WORKING_COPY');
 assert.equal(r.record.domain,'PERSON');
 assert.equal(r.record.originalImageSha256,sha);
 assert.equal(r.realModelHasOriginalIndexed3D,true);
 assert.equal(r.v97.real3DAnimatedJoints,6);
 assert.equal(r.identityApprovedAsActualHeroine,false);
 assert.equal(r.workingScene,undefined);
 const projection=evaluateAIGReal3DUnified4KSource({
  pipeline:r,sourceSha256:sha,camera:{
   projection:'orthographic',yaw:0,pitch:0,focus:[0,.84,0],
   distance:4,orthoSpan:2.15,fovDeg:55}});
 assert.equal(projection.width,3840);
 assert.equal(projection.sourceTriangles,3784);
 assert.equal(projection.releasePASS,false);
 assert.equal(r.releasePASS,false);
});
