import test from 'node:test';
import assert from 'node:assert/strict';
import {buildAIG29ContinuousSurface}
 from '../aig-continuous-surface-scan-2-9.mjs';
import {buildAIG30FusedSDF}
 from '../aig-fused-manifold-surface-3-0.mjs';
import {makeAIG32DigitRig,poseAIG32AllDigits,
 AIG32_DIGITS,AIG32_SCHEMA}
 from '../aig-20-digit-articulation-3-2.mjs';
const SHA='sha256:'+'c'.repeat(64);
function source(){
 const width=256,height=384,pixels=new Uint8ClampedArray(width*height*4),
  labels=new Uint8Array(width*height);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  let label=0;
  if(y>9&&y<85&&Math.abs(x-128)<26)label=2;
  else if(y>=85&&y<112&&Math.abs(x-128)<12)label=4;
  else if(y>=112&&y<239&&Math.abs(x-128)<(y<190?53:37))label=14;
  else if(y>=239&&y<376&&Math.abs(x-108)<15)label=10;
  else if(y>=239&&y<376&&Math.abs(x-148)<15)label=11;
  else if(y>=126&&y<225&&Math.abs(x-61)<11)label=6;
  else if(y>=126&&y<225&&Math.abs(x-195)<11)label=7;
  const k=y*width+x;labels[k]=label;
  pixels.set(label?[170,128,105,255]:[18,21,32,255],k*4);
 }
 return {width,height,pixels,labels,sourceSha256:SHA};
}
function sourceBody(){
 return buildAIG30FusedSDF(buildAIG29ContinuousSurface({
  ...source(),radialSegments:32,sliceStep:6
 }),{resolution:84,blend:.075});
}
test('3.2 truly defines 10 fingers + 10 toes (20) and 56 individually articulated phalanx links',()=>{
 const body=sourceBody(),original=new Float32Array(
  body.fusedOnePieceMesh.positions),originalIndices=new Uint32Array(
  body.fusedOnePieceMesh.indices);
 const rig=makeAIG32DigitRig(body),result=poseAIG32AllDigits(rig);
 assert.equal(AIG32_DIGITS.length,20);
 assert.equal(new Set(AIG32_DIGITS.map(d=>d.id)).size,20);
 assert.equal(rig.definedDigitCount,20);
 assert.equal(rig.definedPhalanxCount,56);
 assert.equal(result.generatedActual3DDigits,20);
 assert.equal(result.generatedActual3DPhalanges,56);
 assert.equal(result.blockedMissingSourceDigits.length,0);
 assert.equal(result.meshes.length,20);
 assert.ok(result.actualCurved3DTriangleCount>8000);
 assert.deepEqual(result.meshes.map(d=>d.type).filter(x=>x==='hand').length,10);
 assert.deepEqual(result.meshes.map(d=>d.type).filter(x=>x==='foot').length,10);
 assert.equal(result.sourceSha256,SHA);
 for(const digit of result.meshes){
  assert.equal(digit.positions instanceof Float32Array,true);
  assert.equal(digit.indices instanceof Uint32Array,true);
  assert.ok(digit.positions.length>50);
  assert.ok(digit.indices.every(i=>i<digit.positions.length/3));
  assert.ok(digit.positions.every(Number.isFinite));
  assert.equal(digit.sourceVisibleIndividualDigitMeasured,false);
  assert.equal(digit.anatomicalSurfaceFromMeasuredFingers,false);
  assert.equal(digit.previewOnly,true);
  assert.equal(digit.phalanxCount,digit.id.endsWith('thumb')?2:3);
 }
 assert.deepEqual(body.fusedOnePieceMesh.positions,original);
 assert.deepEqual(body.fusedOnePieceMesh.indices,originalIndices);
 assert.equal(result.realMeasured1to1,false);
 assert.equal(result.physical3DPrintabilityVerified,false);
});
test('3.2 individual fingers and toes have real independent 3D bends, tips move, other 19 remain at rest',()=>{
 const rig=makeAIG32DigitRig(sourceBody()),rest=poseAIG32AllDigits(rig);
 const poses={
  leftHandindex:{jointAnglesDegrees:[20,45,15],spread:11},
  rightFootlittle:{jointAnglesDegrees:[14,25,10],spread:-8}
 };
 const bent=poseAIG32AllDigits(rig,poses);
 assert.equal(bent.generatedActual3DDigits,20);
 for(const {id} of AIG32_DIGITS){
  const a=rest.digitSummary.find(x=>x.id===id),
   b=bent.digitSummary.find(x=>x.id===id);
  if(id==='leftHandindex'||id==='rightFootlittle'){
   assert.notDeepEqual(a.actualTipXYZ,b.actualTipXYZ);
   assert.ok(b.jointAnglesDegrees.some(angle=>angle>0));
  }else assert.deepEqual(a.actualTipXYZ,b.actualTipXYZ,
   'other digits must not follow another finger/toe rotation: '+id);
 }
 assert.throws(()=>poseAIG32AllDigits(rig,{
  rightFootindex:{jointAnglesDegrees:[20,100,20],spread:0}
 }),/PER_PHALANX_FLEXION_OUTSIDE_PREVIEW_0_TO_85/);
 assert.throws(()=>poseAIG32AllDigits(rig,{
  leftHandthumb:{jointAnglesDegrees:[40,20,5],spread:0}
 }),/PER_PHALANX_FLEXION_OUTSIDE_PREVIEW_0_TO_85/);
 assert.throws(()=>poseAIG32AllDigits(rig,{
  rightHandindex:{jointAnglesDegrees:[20,30,40],spread:40}
 }),/DIGIT_SPREAD_LIMIT_25_DEGREES/);
 assert.throws(()=>poseAIG32AllDigits(rig,{
  invented22ndDigit:{jointAnglesDegrees:[20,20,20],spread:0}
 }),/UNKNOWN_DIGIT_OR_MALFORMED_POSE/);
});
test('3.2 source-poor 3D body cannot fabricate scanned hand and foot digits',()=>{
 const body=sourceBody(),mesh=body.fusedOnePieceMesh;
 mesh.vertexSourceLabelIds=new Uint8Array(mesh.vertexSourceLabelIds);
 for(let i=0;i<mesh.vertexSourceLabelIds.length;i++)
  if([6,7,8,9,10,11,12,13].includes(mesh.vertexSourceLabelIds[i]))
   mesh.vertexSourceLabelIds[i]=14;
 const rig=makeAIG32DigitRig(body),pose=poseAIG32AllDigits(rig);
 assert.equal(rig.definedDigitCount,20,'manifest preserved');
 assert.equal(pose.generatedActual3DDigits,0);
 assert.equal(pose.blockedMissingSourceDigits.length,20);
 assert.equal(pose.all20RenderedOnlyIfFourHandFootRootZonesAvailable,false);
 assert.ok(rig.missingSourceParts.length===4);
});
test('3.2 parental body position changes move actual digits by source vertex reattachment',()=>{
 const body=sourceBody(),original=body.fusedOnePieceMesh.positions;
 const rig=makeAIG32DigitRig(body);
 const originalTip=poseAIG32AllDigits(rig).digitSummary
  .find(x=>x.id==='leftHandmiddle').actualTipXYZ;
 const moved=new Float32Array(original);
 const ids=body.fusedOnePieceMesh.vertexSourceLabelIds;
 for(let i=0;i<ids.length;i++)if(ids[i]===6){
  moved[i*3]+=0.12;moved[i*3+1]+=0.08;
 }
 const changed={
  ...body,fusedOnePieceMesh:{
   ...body.fusedOnePieceMesh,positions:moved
  }
 };
 const attached=makeAIG32DigitRig(changed);
 const newTip=poseAIG32AllDigits(attached).digitSummary
  .find(x=>x.id==='leftHandmiddle').actualTipXYZ;
 assert.ok(newTip[0]-originalTip[0]>.1,
  'finger roots follow independently posed source arm');
 assert.ok(newTip[1]-originalTip[1]>.06);
 assert.deepEqual(body.fusedOnePieceMesh.positions,original);
});
