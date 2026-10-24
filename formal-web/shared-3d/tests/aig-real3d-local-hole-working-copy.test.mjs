import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {parseAIGScanNativeOBJ,buildAIGReal3DScanNative}
 from '../aig-real3d-scan-native-mesh.mjs';
import {createAIGReal3DOBJLocalPatchWorkingCopy,AIG_REAL3D_LOCAL_PATCH_SCHEMA}
 from '../aig-real3d-local-hole-working-copy.mjs';
import {auditAIGReal3DSceneCrossSections}
 from '../aig-real3d-native-body-cross-sections.mjs';
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

const make=(opts={},settings={})=>{
 const v=options(opts),sourceSha256=createHash('sha256').update(v.objText).digest('hex');
 return createAIGReal3DOBJLocalPatchWorkingCopy({
  ...v,sourceSha256,authorizeWorkingCopy:true,...settings
 });
};
test('Repair ONE real removed indexed triangle in isolated immutable source working copy',()=>{
 const source=options({hole:true}),originalText=source.objText;
 const out=make({hole:true});
 assert.equal(out.schema,AIG_REAL3D_LOCAL_PATCH_SCHEMA);
 assert.equal(out.addedFaceCount,1);
 assert.equal(out.repairedSourceBoundaryEdges,3);
 assert.equal(out.reconstructedLoopEvidence.length,1);
 assert.equal(out.sourceOriginalVertices,out.candidateVertices);
 assert.equal(out.verifiedCandidateTopologyClosed,true);
 assert.equal(out.existingFacesChanged,false);
 assert.equal(out.existingVerticesChanged,false);
 assert.equal(out.sourceModelNotOverwritten,true);
 assert.equal(out.realHumanAppearanceVerified,false);
 assert.equal(out.autoReleasePASS,false);
 assert.equal(source.objText,originalText);
 assert.ok(out.workingCopyCandidateObjText.startsWith(originalText+'\n'));
 const before=parseAIGScanNativeOBJ(originalText);
 const after=parseAIGScanNativeOBJ(out.workingCopyCandidateObjText);
 assert.deepEqual(after.original,before.original);
 assert.deepEqual(after.indices.slice(0,before.indices.length),before.indices);
 assert.equal(after.indices.length,before.indices.length+3);
 const reviewed=buildAIGReal3DScanNative({
  objText:out.workingCopyCandidateObjText,heightMm:1680,upAxis:'Y',
  sourceName:'working-copy.obj',sourceSha256:'b'.repeat(64)
 });
 assert.equal(reviewed.evidence.openEdges,0);
 assert.equal(reviewed.evidence.nonManifoldEdges,0);
 const shape=auditAIGReal3DSceneCrossSections({
  scene:reviewed.scene,sourceSha256:'b'.repeat(64),sourceName:'NONHUMAN.obj'
 });
 assert.equal(shape.oneClosedLowerMassFlag,true);
 assert.equal(shape.releasePASS,false);
});
test('An intact source is NOT patched and may not pretend to have changed',()=>{
 assert.throws(()=>make(),/REAL3D_LOCAL_PATCH_NO_OPEN_BOUNDARY_TO_REPAIR/);
});
test('Hard safety limits reject unsafe geometry and prevent automatic body fabrication',()=>{
 assert.throws(()=>make({hole:true},{maximumHoleDiameterMm:5}),
  /REAL3D_LOCAL_PATCH_HOLE_EXCEEDS_ALLOWED_DIAMETER/);
 assert.throws(()=>make({reverseFace:true}),
  /REAL3D_LOCAL_PATCH_NONMANIFOLD_OR_WINDING_SOURCE_BLOCK/);
 assert.throws(()=>make({hole:true},{authorizeWorkingCopy:false}),
  /REAL3D_LOCAL_PATCH_EXPLICIT_WORKING_COPY_REQUEST_REQUIRED/);
 assert.throws(()=>make({hole:true},{sourceSha256:'unverified'}),
  /REAL3D_LOCAL_PATCH_SOURCE_SHA_REQUIRED/);
 assert.throws(()=>make({hole:true},{maximumHoles:0}),
  /REAL3D_LOCAL_PATCH_PATCH_BOUNDS_INVALID/);
});
