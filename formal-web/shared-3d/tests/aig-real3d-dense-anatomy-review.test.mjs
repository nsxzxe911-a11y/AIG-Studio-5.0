import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {buildAIGReal3DDenseOBJSource}
 from '../aig-real3d-dense-source-obj.mjs';
import {auditAIGReal3DDenseAnatomy,reviewAIGReal3DDenseFourView,
 AIG_REAL3D_DENSE_ANATOMY_SCHEMA}
 from '../aig-real3d-dense-anatomy-review.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
function nonHumanFixture(){
 const rings=140,segments=400,source=[];
 const v=(j,k)=>{
  const y=j/(rings-1),a=k*2*Math.PI/segments,r=.12+.025*Math.sin(y*Math.PI);
  return [(r*Math.cos(a)).toFixed(7),y.toFixed(7),
   (r*.7*Math.sin(a)).toFixed(7)];
 };
 for(let j=0;j<rings;j++)for(let k=0;k<segments;k++)
  source.push('v '+v(j,k).join(' '));
 for(let j=0;j<rings-1;j++)for(let k=0;k<segments;k++){
  const a=j*segments+k+1,b=j*segments+(k+1)%segments+1,
   c=(j+1)*segments+k+1,d=(j+1)*segments+(k+1)%segments+1;
  source.push('f '+a+' '+b+' '+d,'f '+a+' '+d+' '+c);
 }
 return {objText:source.join('\n'),v};
}
function fakeLabels(v){
 const dict={
  headTop:[136,0],chin:[125,25],noseTip:[130,10],neckBase:[119,50],
  leftShoulder:[110,160],rightShoulder:[110,30],
  leftElbow:[94,160],rightElbow:[94,30],
  leftWrist:[75,160],rightWrist:[75,30],
  leftThumbTip:[75,164],leftIndexTip:[75,170],
  rightThumbTip:[75,34],rightIndexTip:[75,40],
  pelvis:[65,60],leftKnee:[34,100],rightKnee:[34,250],
  leftHeel:[5,100],rightHeel:[5,250],leftToe:[2,92],rightToe:[2,240],
  leftMiddleTip:[75,175],leftRingTip:[75,180],leftPinkyTip:[75,185],
  rightMiddleTip:[75,45],rightRingTip:[75,50],rightPinkyTip:[75,55]
 };
 return Object.fromEntries(Object.entries(dict).map(([key,indices])=>
  [key,v(...indices).map(Number)]));
}
const fixture=nonHumanFixture(),sourceSha256=sha(fixture.objText);
const dense=buildAIGReal3DDenseOBJSource({
 objText:fixture.objText,sourceSha256,
 sourceName:'NONHUMAN_MESH_CYLINDER.obj',heightMm:1680
});
test('56k ORIGINAL indexed vertices pass through dense GPU chunks without inventing chunk seam cracks',()=>{
 assert.equal(dense.evidence.originalVertexCount,56000);
 assert.equal(dense.evidence.originalTriangleCount,111200);
 assert.ok(dense.scene.nodes.length>1);
 assert.equal(dense.sourceGeometry.indices.length,111200*3);
 const out=auditAIGReal3DDenseAnatomy({
  sourceGeometry:dense.sourceGeometry,sourceEvidence:dense.evidence,
  sourceSha256,landmarks:fakeLabels(fixture.v)
 });
 assert.equal(out.schema,AIG_REAL3D_DENSE_ANATOMY_SCHEMA);
 assert.equal(out.originalVertices,56000);
 assert.equal(out.originalTriangles,111200);
 assert.equal(out.gpuChunksExcludedFromTopologyAnalysis,true);
 assert.equal(out.requiredBase21LandmarksPresent,true);
 assert.equal(out.requiredExtraSixFingertipsPresent,true);
 assert.equal(out.regions.length,5);
 assert.equal(out.regions[0].openEdges,0);
 assert.equal(out.regions[0].nonManifoldEdges,0);
 assert.equal(out.regions[0].markerIndexConnectedComponents,1);
 assert.equal(out.regions[1].fingerEvidence.fiveNamedTipsProvided,true);
 assert.equal(out.regions[1].fingerEvidence.naturalFiveFingersCertified,false);
 assert.equal(out.independentlyVerifiedTrueHumanScan,false);
 assert.equal(out.releasePASS,false);
});
test('Absent original 27-point sidecar is explicit BLOCK, not inferred from high mesh density',()=>{
 const out=auditAIGReal3DDenseAnatomy({
  sourceGeometry:dense.sourceGeometry,sourceEvidence:dense.evidence,
  sourceSha256
 });
 assert.equal(out.requiredBase21LandmarksPresent,false);
 assert.equal(out.missingRequiredMarkers.length,27);
 assert.equal(out.regionsRequiringReview,5);
 assert.equal(out.localGeometryCanBeInspected,false);
 assert.equal(out.releasePASS,false);
});
test('Real GPU angle evidence is distinct from actual four-image contour comparison',()=>{
 const anatomy=auditAIGReal3DDenseAnatomy({
  sourceGeometry:dense.sourceGeometry,sourceEvidence:dense.evidence,
  sourceSha256,landmarks:fakeLabels(fixture.v)
 });
 const angles=['front','side','back','threeQuarter'];
 const four=reviewAIGReal3DDenseFourView({
  sourceSha256,anatomy,
  viewRecords:angles.map((angle,i)=>({
   angle,gpuSha256:String(i+1).repeat(64),referenceSha256:null,
   width:1080,height:1920,iou:null
  }))
 });
 assert.equal(four.fourRealGPUViewsCaptured,true);
 assert.equal(four.fourReferenceContoursCompared,false);
 assert.deepEqual(four.missingValidatedReferenceComparisons,angles);
 assert.equal(four.naturalAppearancePASS,false);
 assert.equal(four.releasePASS,false);
 assert.throws(()=>reviewAIGReal3DDenseFourView({
  sourceSha256:'a'.repeat(64),anatomy,viewRecords:[]
 }),/DENSE_ANATOMY_FOURVIEW_SOURCE_AND_ANATOMY_REQUIRED/);
 assert.throws(()=>reviewAIGReal3DDenseFourView({
  sourceSha256,anatomy,viewRecords:[{
   angle:'front',gpuSha256:'b'.repeat(64),width:1080,height:1920,iou:1.3
  }]
 }),/DENSE_ANATOMY_FOURVIEW_RECORD_INVALID/);
});
