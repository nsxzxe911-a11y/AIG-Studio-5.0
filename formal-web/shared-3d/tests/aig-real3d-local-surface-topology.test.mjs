import test from 'node:test';
import assert from 'node:assert/strict';
import {auditAIGNativeOBJLocalSurface,AIG_REAL3D_LOCAL_SURFACE_QA_SCHEMA}
 from '../aig-real3d-local-surface-topology.mjs';
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
test('5 source marker bounded areas are REAL indexed OBJ surface evidence, no anatomy PASS',()=>{
 const a=auditAIGNativeOBJLocalSurface(options());
 assert.equal(a.schema,AIG_REAL3D_LOCAL_SURFACE_QA_SCHEMA);
 assert.equal(a.regionCount,5);
 assert.deepEqual(a.regions.map(x=>x.id),[
  'HEAD_NECK_JOIN','LEFT_HAND_SURFACE','RIGHT_HAND_SURFACE',
  'LEFT_FOOT_SURFACE','RIGHT_FOOT_SURFACE'
 ]);
 assert.equal(a.sourceLandmarkMeshAuditPASS,true);
 assert.equal(a.sourceGeometryGatePASS,true);
 assert.equal(a.globallyOpenEdges,0);
 assert.equal(a.globallyConnectedComponents,1);
 assert.ok(a.regions.every(x=>x.neighborhoodVertices>1&&x.neighborhoodEdges>1));
 assert.ok(a.regions.every(x=>x.markerNearestVertexReferences.every(k=>k.surfaceOffsetMm<.01)));
 assert.ok(a.regions.every(x=>x.humanAnatomicalNaturalnessVerified===false));
 assert.ok(a.regions.every(x=>x.fiveFingersOrFiveToesConfirmed===false));
 assert.equal(a.originalSourceVerticesChanged,false);
 assert.equal(a.trianglesAddedOrSmoothed,false);
 assert.equal(a.provenanceIndependentlyAuthenticated,false);
 assert.equal(a.releasePASS,false);
});
test('Actual missing neck triangle is detected as open local boundary with measured position',()=>{
 const bad=auditAIGNativeOBJLocalSurface(options({hole:true}));
 assert.equal(bad.sourceLandmarkMeshAuditPASS,true);
 assert.equal(bad.sourceGeometryGatePASS,false);
 assert.ok(bad.globallyOpenEdges>0);
 const near=bad.regions[0];
 assert.ok(near.openEdges>0,JSON.stringify(near));
 assert.ok(near.anomalyCodes.includes('NEARBY_OPEN_EDGES'));
 assert.ok(near.anomalyWorldPositionSamples.length>0);
 assert.equal(bad.releasePASS,false);
});
test('Reversed indexed face near neck flags inconsistent winding with original triangles',()=>{
 const bad=auditAIGNativeOBJLocalSurface(options({reverseFace:true}));
 assert.ok(bad.regions[0].inconsistentFaceWindingEdges>0,
  JSON.stringify(bad.regions[0]));
 assert.ok(bad.regions[0].anomalyCodes.includes('INCONSISTENT_FACE_WINDING'));
 assert.equal(bad.trianglesAddedOrSmoothed,false);
 assert.equal(bad.releasePASS,false);
});
test('Missing native labels, fake hash or missing physical height block local QA',()=>{
 assert.throws(()=>auditAIGNativeOBJLocalSurface({...options(),landmarks:null}),
  /LOCAL_SURFACE_LANDMARKS_REQUIRED/);
 assert.throws(()=>auditAIGNativeOBJLocalSurface({...options(),sourceSha256:'fake'}),
  /LOCAL_SURFACE_REAL_SOURCE_SHA_REQUIRED/);
 assert.throws(()=>auditAIGNativeOBJLocalSurface({...options(),heightMm:0}),
  /MEASURED_HEIGHT_REQUIRED/);
 assert.throws(()=>auditAIGNativeOBJLocalSurface({...options(),landmarks:{headTop:[0,1,0]}}),
  /LOCAL_SURFACE_SOURCE_LANDMARK_MESH_AUDIT_BLOCK/);
});
