import test from 'node:test';
import assert from 'node:assert/strict';
import {buildAIGReal3DScanNative} from '../aig-real3d-scan-native-mesh.mjs';
import {auditAIGNativeOBJLocalSurface} from '../aig-real3d-local-surface-topology.mjs';
import {auditAIGReal3DSourceGeometryDetail,AIG_REAL3D_SOURCE_DETAIL_SCHEMA}
 from '../aig-real3d-source-geometry-detail.mjs';
const sha='c'.repeat(64);
function fixture({hole=false,reverseFace=false}={}){
 const rings=42,segments=44,v=[],faces=[];
 for(let j=0;j<rings;j++){
  const t=j/(rings-1),r=Math.max(.008,Math.sin(Math.PI*t));
  for(let k=0;k<segments;k++){
   const a=2*Math.PI*k/segments;
   v.push('v '+(.25*r*Math.cos(a)).toFixed(8)+' '+
    t.toFixed(8)+' '+(.15*r*Math.sin(a)).toFixed(8));
  }
 }
 for(let j=0;j<rings-1;j++)for(let k=0;k<segments;k++){
  const a=j*segments+k+1,b=j*segments+(k+1)%segments+1,
   c=(j+1)*segments+k+1,d=(j+1)*segments+(k+1)%segments+1;
  const first=[a,b,d],second=[a,d,c];
  if(reverseFace&&j===34&&k===4)first.reverse();
  if(!(hole&&j===34&&k===4))faces.push('f '+first.join(' '));
  faces.push('f '+second.join(' '));
 }
 v.push('v 0 0 0','v 0 1 0');
 const top=rings*segments+1,bottom=top+1;
 for(let k=0;k<segments;k++){
  const next=(k+1)%segments;
  faces.push('f '+top+' '+(next+1)+' '+(k+1));
  faces.push('f '+bottom+' '+((rings-1)*segments+k+1)+' '+
   ((rings-1)*segments+next+1));
 }
 const p=(j,k)=>{
  const t=j/(rings-1),r=Math.max(.008,Math.sin(Math.PI*t)),
   a=2*Math.PI*k/segments;
  return [Number((.25*r*Math.cos(a)).toFixed(8)),
   Number(t.toFixed(8)),Number((.15*r*Math.sin(a)).toFixed(8))];
 };
 const left=j=>p(j,22),right=j=>p(j,0);
 const landmarks={
  headTop:[0,1,0],chin:p(38,0),noseTip:p(37,11),neckBase:p(34,0),
  leftShoulder:left(30),rightShoulder:right(30),
  leftElbow:left(25),rightElbow:right(25),
  leftWrist:left(20),rightWrist:right(20),
  leftThumbTip:left(16),rightThumbTip:right(16),
  leftIndexTip:left(15),rightIndexTip:right(15),
  pelvis:p(21,0),leftKnee:left(10),rightKnee:right(10),
  leftHeel:left(2),rightHeel:right(2),
  leftToe:left(1),rightToe:right(1)
 };
 return {objText:v.concat(faces).join('\n'),landmarks};
}
const options=(o={})=>({...fixture(o),heightMm:1680,sourceSha256:sha});

function review(optionsInput=options(),method='MANUAL_MODEL'){
 const native=buildAIGReal3DScanNative(optionsInput);
 const localSurface=auditAIGNativeOBJLocalSurface(optionsInput);
 return auditAIGReal3DSourceGeometryDetail({
  scene:native.scene,localSurface,sourceSha256:optionsInput.sourceSha256,
  claimedCaptureMethod:method
 });
}
test('all five real Indexed XYZ neighborhoods report millimeter triangles and measured face bends',()=>{
 const r=review();
 assert.equal(r.schema,AIG_REAL3D_SOURCE_DETAIL_SCHEMA);
 assert.equal(r.regionCount,5);
 assert.equal(r.sourceMeshVertices,1850);
 assert.ok(r.sourceMeshTriangles>3000);
 assert.equal(r.regions[0].regionId,'HEAD_NECK_JOIN');
 assert.ok(r.regions.every(x=>x.originalVerticesInRadius>0));
 assert.ok(r.regions.every(x=>x.actualSourceTrianglesTouchingRadius>0));
 assert.ok(r.regions.every(x=>x.localTriangleMaxEdgeP95Mm>0));
 assert.ok(r.regions.every(x=>Number.isFinite(x.adjacentFaceBendP95Degrees)));
 assert.ok(r.regions.every(x=>x.sourceNormalsAndCurvatureFromActualTriangleXYZ));
 assert.equal(r.claimedCaptureMethod,'MANUAL_MODEL');
 assert.equal(r.sourceOriginIndependentAuthenticationPASS,false);
 assert.equal(r.sourceIsHuman3DScanIndependentlyEstablished,false);
 assert.equal(r.generatedNewSurfaceGeometry,false);
 assert.equal(r.source4KPixelResolutionDoesNotImproveGeometry,true);
 assert.equal(r.naturalHumanAppearancePASS,false);
 assert.equal(r.releasePASS,false);
});
test('one missing real neck triangle is a genuine local junction issue, not a normal shading effect',()=>{
 const r=review(options({hole:true}));
 const neck=r.regions.find(x=>x.regionId==='HEAD_NECK_JOIN');
 assert.ok(neck.originalBoundaryEdgesInRadius>0);
 assert.ok(neck.warningCodes.includes('OPEN_SOURCE_JUNCTION'));
 assert.equal(neck.certifiedHumanHeadNeckHandFootShape,false);
});
test('flipped triangle triggers source face-winding failure independently of GPU lighting',()=>{
 const r=review(options({reverseFace:true}));
 const neck=r.regions[0];
 assert.ok(neck.warningCodes.includes('JUNCTION_WINDING_CONFLICT'));
 assert.equal(neck.anatomicalFineDetailAndFiveDigitsConfirmed,false);
});
test('fake scan origin claim cannot authenticate source or invent five fingers',()=>{
 const r=review(options(),'STRUCTURED_LIGHT');
 assert.equal(r.captureMethodSelfReportedNotIndependentlyVerified,true);
 assert.equal(r.sourceOriginIndependentAuthenticationPASS,false);
 assert.equal(r.generatedAnatomicalFingersOrHair,false);
 assert.equal(r.regions.every(x=>!x.anatomicalFineDetailAndFiveDigitsConfirmed),true);
});
test('wrong provenance hash, fake region ids or mesh count mismatch fail closed',()=>{
 const v=options(),native=buildAIGReal3DScanNative(v);
 const localSurface=auditAIGNativeOBJLocalSurface(v);
 assert.throws(()=>auditAIGReal3DSourceGeometryDetail({
  scene:native.scene,localSurface,sourceSha256:'a'.repeat(64)
 }),/DETAIL_GATE_REAL_OBJ_MESH_AND_LANDMARKS_REQUIRED/);
 assert.throws(()=>auditAIGReal3DSourceGeometryDetail({
  scene:native.scene,localSurface,sourceSha256:sha,
  claimedCaptureMethod:'DEFINITELY_REAL_HUMAN'
 }),/DETAIL_GATE_SOURCE_METHOD_INVALID/);
 assert.throws(()=>auditAIGReal3DSourceGeometryDetail({
  scene:native.scene,localSurface:{...localSurface,originalTriangles:12},
  sourceSha256:sha
 }),/DETAIL_GATE_INDEXED_SOURCE_COUNT_MISMATCH/);
});
