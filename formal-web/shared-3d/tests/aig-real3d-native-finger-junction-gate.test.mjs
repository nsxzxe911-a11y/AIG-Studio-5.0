import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {buildAIGReal3DDenseOBJSource}
 from '../aig-real3d-dense-source-obj.mjs';
import {auditAIGReal3DDenseAnatomy}
 from '../aig-real3d-dense-anatomy-review.mjs';
import {auditAIGReal3DDenseFiveDigitBranches}
 from '../aig-real3d-dense-digit-branch-gate.mjs';
import {auditAIGReal3DFingerJointSurface,AIG_REAL3D_FINGER_JUNCTION_SCHEMA}
 from '../aig-real3d-native-finger-junction-gate.mjs';
const allMarkers=(a,b,c)=>{
 const marks={};
 for(const key of ['headTop','chin','noseTip','neckBase',
  'leftShoulder','rightShoulder','leftElbow','rightElbow','leftWrist',
  'rightWrist','pelvis','leftKnee','rightKnee','leftHeel','rightHeel',
  'leftToe','rightToe'])marks[key]=a;
 for(const side of ['left','right'])for(const finger of [
  'Thumb','Index','Middle','Ring','Pinky']){
  marks[side+finger+'Base']=a;marks[side+finger+'Middle']=b;
  marks[side+finger+'Tip']=c;
 }
 return marks;
};
function cube({open=false}={}){
 const points=[[0,0,0],[1,0,0],[1,1,0],[0,1,0],
  [0,0,1],[1,0,1],[1,1,1],[0,1,1]];
 // Coherently oriented 6 sides. Drop TOP side to make an ORIGINAL source
 // open seam at the finger root, not an invented GPU partition seam.
 const quads=[
  [0,3,2,1],[4,5,6,7],[0,1,5,4],[1,2,6,5],
  [2,3,7,6],[3,0,4,7]
 ];
 const lines=points.map(p=>'v '+p.join(' '));
 quads.forEach((q,i)=>{
  if(open&&i===4)return;
  lines.push('f '+[q[0],q[1],q[2]].map(x=>x+1).join(' '),
   'f '+[q[0],q[2],q[3]].map(x=>x+1).join(' '));
 });
 return lines.join('\n');
}
function plane(){
 const source=[];
 for(let y=0;y<=4;y++)for(let x=0;x<=4;x++)source.push('v '+x+' '+y+' 0');
 for(let y=0;y<4;y++)for(let x=0;x<4;x++){
  const a=y*5+x+1,b=a+1,c=a+5,d=c+1;
  source.push('f '+a+' '+b+' '+d,'f '+a+' '+d+' '+c);
 }
 return source.join('\n');
}
function setup(sourceText,landmarks){
 const sourceSha256=createHash('sha256').update(sourceText).digest('hex');
 const dense=buildAIGReal3DDenseOBJSource({
  objText:sourceText,sourceSha256,sourceName:'NONHUMAN_JOINT_QA.obj',heightMm:1680
 });
 const anatomy=auditAIGReal3DDenseAnatomy({
  sourceGeometry:dense.sourceGeometry,sourceEvidence:dense.evidence,
  sourceSha256,landmarks
 });
 const digitBranching=auditAIGReal3DDenseFiveDigitBranches({
  sourceGeometry:dense.sourceGeometry,sourceEvidence:dense.evidence,
  sourceSha256,anatomy,landmarks
 });
 const run=opts=>auditAIGReal3DFingerJointSurface({
  sourceGeometry:dense.sourceGeometry,sourceEvidence:dense.evidence,
  sourceSha256,anatomy,digitBranching,landmarks,...opts
 });
 return {dense,sourceSha256,anatomy,digitBranching,run};
}
test('Original open finger-base seam is visible in true indexed XYZ, unlike GPU chunk seams',()=>{
 const labels=allMarkers([0,1,0],[0,0,0],[1,0,0]);
 const solid=setup(cube(),labels).run();
 const open=setup(cube({open:true}),labels).run();
 assert.equal(solid.schema,AIG_REAL3D_FINGER_JUNCTION_SCHEMA);
 assert.equal(solid.fingersReported,10);
 assert.equal(solid.fingers[0].palmRootRegion.sourceOpenEdges,0);
 assert.equal(open.fingers[0].palmRootRegion.sourceOpenEdges>0,true);
 assert.ok(open.fingers[0].warningCodes.includes('JOINT_OR_PALM_ORIGINAL_OPEN_SEAM'));
 assert.equal(open.naturalFingerAndPalmAnatomyPASS,false);
 assert.equal(open.releasePASS,false);
});
test('Bent coordinate labels on a perfectly flat nonhuman plane cannot fake physically curved joints',()=>{
 const p=setup(plane(),allMarkers([1,1,0],[2,2,0],[3,2,0])).run();
 const first=p.fingers[0];
 assert.equal(first.middleJointRegion.unsignedAdjacentFaceNormalDeltaP95Degrees,0);
 assert.ok(first.declaredMarkerBendDegrees>20);
 assert.ok(first.warningCodes.includes('BENT_MARKERS_WITHOUT_MEASURABLE_LOCAL_SURFACE_BEND'));
 assert.equal(first.sourceFingerArticulationIndependentlyVerified,false);
 assert.equal(p.animationRigPASS,false);
 assert.equal(p.releasePASS,false);
});
test('No supplemental 20 root/mid annotations remains explicit BLOCK and does not invent joints',()=>{
 const p=setup(cube(),null).run();
 assert.equal(p.fingersReported,10);
 assert.equal(p.requiredAdditionalSourceMarkers,20);
 assert.equal(p.missingAdditionalSourceMarkers.length,20);
 assert.equal(p.fingersWithTechnicalWarnings,10);
 assert.equal(p.technicalSurfaceMetricsObservable,false);
 assert.equal(p.actualJointMotionNotEstablishedFromStaticMesh,true);
 assert.equal(p.releasePASS,false);
});
test('Invalid provenance or source triangle shape is rejected before original-3D diagnosis',()=>{
 const labels=allMarkers([0,1,0],[0,0,0],[1,0,0]);
 const s=setup(cube(),labels);
 assert.throws(()=>s.run({sourceSha256:'0'.repeat(64)}),
  /FINGER_JUNCTION_VERIFIED_GLOBAL_ORIGINAL_SOURCE_REQUIRED/);
 assert.throws(()=>s.run({sourceGeometry:{
  ...s.dense.sourceGeometry,indices:new Uint32Array([0,1,2])
 }}),/FINGER_JUNCTION_VERIFIED_GLOBAL_ORIGINAL_SOURCE_REQUIRED/);
});
