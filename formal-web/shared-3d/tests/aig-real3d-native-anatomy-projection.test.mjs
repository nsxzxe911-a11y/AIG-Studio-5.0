import test from 'node:test';
import assert from 'node:assert/strict';
import {buildAIGReal3DScanNative} from '../aig-real3d-scan-native-mesh.mjs';
import {projectAIGNativeOBJLandmarks,summarizeAIGLandmarkHeightRegions,
 AIG_NATIVE_LANDMARK_PROJECTION_SCHEMA}
 from '../aig-real3d-native-anatomy-projection.mjs';
const sha='d'.repeat(64);
function sampleOBJ(){
 const vs=[],faces=[],rings=42,segments=44;
 for(let j=0;j<rings;j++){
  const t=j/(rings-1),r=Math.max(.008,Math.sin(Math.PI*t));
  for(let k=0;k<segments;k++){
   const a=2*Math.PI*k/segments;
   vs.push('v '+(.25*r*Math.cos(a)).toFixed(8)+' '+
    t.toFixed(8)+' '+(.15*r*Math.sin(a)).toFixed(8));
  }
 }
 for(let j=0;j<rings-1;j++)for(let k=0;k<segments;k++){
  const a=j*segments+k+1,b=j*segments+(k+1)%segments+1,
   c=(j+1)*segments+k+1,d=(j+1)*segments+(k+1)%segments+1;
  faces.push('f '+a+' '+b+' '+d,'f '+a+' '+d+' '+c);
 }
 vs.push('v 0 0 0','v 0 1 0');
 const top=rings*segments+1,bottom=top+1;
 for(let k=0;k<segments;k++){
  const next=(k+1)%segments;
  faces.push('f '+top+' '+(next+1)+' '+(k+1));
  faces.push('f '+bottom+' '+((rings-1)*segments+k+1)+' '+
   ((rings-1)*segments+next+1));
 }
 const points=vs.slice(0,rings*segments).map(x=>x.split(' ').slice(1).map(Number));
 const pick=(j,k)=>points[j*segments+k],left=j=>pick(j,22),right=j=>pick(j,0);
 return {objText:vs.concat(faces).join('\n'),landmarks:{
  headTop:[0,1,0],chin:pick(3,0),noseTip:pick(4,11),
  neckBase:pick(7,0),leftShoulder:left(11),rightShoulder:right(11),
  leftElbow:left(16),rightElbow:right(16),
  leftWrist:left(22),rightWrist:right(22),
  leftThumbTip:left(25),rightThumbTip:right(25),
  leftIndexTip:left(26),rightIndexTip:right(26),
  pelvis:pick(21,0),leftKnee:left(31),rightKnee:right(31),
  leftHeel:left(39),rightHeel:right(39),
  leftToe:left(40),rightToe:right(40)
 }};
}
const fixture=sampleOBJ();
const audit=buildAIGReal3DScanNative({
 objText:fixture.objText,heightMm:1680,landmarks:fixture.landmarks,
 sourceSha256:sha
}).evidence;
test('Native OBJ source landmarks must actually validate against native mesh',()=>{
 assert.equal(audit.landmarkAudit.complete,true,JSON.stringify(audit.landmarkAudit));
 assert.equal(audit.geometryPASS,true);
 assert.equal(audit.sourceNotProvenHumanScan,true);
 assert.equal(audit.authenticityVerified,false);
 const p=projectAIGNativeOBJLandmarks({
  ...fixture,heightMm:1680,sourceSha256:sha,
  landmarkAuditComplete:audit.landmarkAudit.complete
 });
 assert.equal(p.schema,AIG_NATIVE_LANDMARK_PROJECTION_SCHEMA);
 assert.equal(p.projectedLabelCount,21);
 assert.equal(p.angle,'front');
 assert.ok(p.markerPixelPositions.headTop.y<p.markerPixelPositions.chin.y);
 assert.ok(p.markerPixelPositions.chin.y<p.markerPixelPositions.neckBase.y);
 assert.equal(p.markerPixelPositions.pelvis.onCanvas,true);
 assert.equal(p.labelsFromUserSuppliedNativeOBJOnly,true);
 assert.equal(p.notHumanAppearanceApproval,true);
 assert.equal(p.originalXYZNeverModified,true);
});
test('Camera projection reproduces the 4 GPU orthographic yaw directions',()=>{
 const pp=['front','side','back','threeQuarter'].map(angle=>
  projectAIGNativeOBJLandmarks({
   ...fixture,heightMm:1680,sourceSha256:sha,angle,
   landmarkAuditComplete:true
  }));
 assert.deepEqual(pp.map(p=>p.cameraYaw),[Math.PI,Math.PI/2,0,Math.PI*1.25]);
 assert.ok(pp.every(p=>p.width===1080&&p.height===1920&&
  p.markerPixelPositions.headTop.onCanvas));
 assert.ok(pp[0].markerPixelPositions.leftShoulder.x>
  pp[0].markerPixelPositions.rightShoulder.x,
  'Front camera yaws 180 degrees, so projected image left/right mirrors world X');
 assert.ok(pp[2].markerPixelPositions.leftShoulder.x<
  pp[2].markerPixelPositions.rightShoulder.x);
 assert.equal(pp[1].markerPixelPositions.headTop.x,540);
});
test('Only validated native marker metadata can unlock localized region labels',()=>{
 assert.throws(()=>projectAIGNativeOBJLandmarks({
  ...fixture,heightMm:1680,sourceSha256:sha
 }),/ANATOMY_NATIVE_MESH_LANDMARK_AUDIT_BLOCK/);
 assert.throws(()=>projectAIGNativeOBJLandmarks({
  ...fixture,heightMm:1680,sourceSha256:sha,landmarkAuditComplete:true,
  landmarks:{headTop:[0,1,0]}
 }),/ANATOMY_MISSING_REQUIRED_21_REAL_XYZ_LANDMARKS/);
 assert.throws(()=>projectAIGNativeOBJLandmarks({
  ...fixture,heightMm:1680,sourceSha256:'unverified',landmarkAuditComplete:true
 }),/ANATOMY_ORIGINAL_SOURCE_SHA_REQUIRED/);
});
test('Marker Y regions weight the existing measured 12-band pixel statistics',()=>{
 const projection=projectAIGNativeOBJLandmarks({
  ...fixture,heightMm:1680,sourceSha256:sha,landmarkAuditComplete:true
 });
 const bands=Array.from({length:12},(_,i)=>({
  startY:i*160,endYExclusive:(i+1)*160,
  signedCoverageDeltaPx:i===3?18:2,
  imageCentroidXDeltaPx:i===3?-5:0
 }));
 const result=summarizeAIGLandmarkHeightRegions({projection,profile:{
  schema:'AIG_REAL3D_12_BAND_IMAGE_COVERAGE_DELTA_V1',bands
 }});
 assert.equal(result.segments.length,4);
 assert.deepEqual(result.segments.map(s=>s.id),[
  'HEAD_TO_NECK','SHOULDER_TO_PELVIS','PELVIS_TO_KNEE','KNEE_TO_HEEL'
 ]);
 assert.ok(result.segments.every(s=>s.supportingPixelRows>0));
 assert.ok(result.segments.some(s=>s.meanSignedCoverageDeltaPxPerRow>2));
 assert.equal(result.regionsAreApproximatedFrom12Bands,true);
 assert.equal(result.releasePASS,false);
});
test('Z-Up calibrated import and projection retains same positions',()=>{
 const rz=fixture.objText.split('\n').map(row=>{
  if(!row.startsWith('v '))return row;
  const [tag,x,y,z]=row.split(' ');
  return [tag,x,(-Number(z)).toFixed(8),y].join(' ');
 }).join('\n');
 const zm=Object.fromEntries(Object.entries(fixture.landmarks).map(([k,p])=>
  [k,[p[0],-p[2],p[1]]]));
 const native=buildAIGReal3DScanNative({
  objText:rz,heightMm:1680,upAxis:'Z',landmarks:zm,sourceSha256:sha
 });
 assert.equal(native.evidence.landmarkAudit.complete,true);
 const a=projectAIGNativeOBJLandmarks({
  ...fixture,heightMm:1680,sourceSha256:sha,landmarkAuditComplete:true
 });
 const b=projectAIGNativeOBJLandmarks({
  objText:rz,landmarks:zm,heightMm:1680,upAxis:'Z',
  sourceSha256:sha,landmarkAuditComplete:true
 });
 for(const k of Object.keys(a.markerPixelPositions)){
  assert.ok(Math.abs(a.markerPixelPositions[k].x-b.markerPixelPositions[k].x)<.01,k);
  assert.ok(Math.abs(a.markerPixelPositions[k].y-b.markerPixelPositions[k].y)<.01,k);
 }
});
