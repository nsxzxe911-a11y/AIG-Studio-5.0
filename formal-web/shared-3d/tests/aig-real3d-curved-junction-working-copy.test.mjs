import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {parseAIGScanNativeOBJ,buildAIGReal3DScanNative}
 from '../aig-real3d-scan-native-mesh.mjs';
import {createAIGReal3DCurvedJunctionWorkingCopy,AIG_REAL3D_CURVED_PATCH_SCHEMA}
 from '../aig-real3d-curved-junction-working-copy.mjs';
const sha='c'.repeat(64);
function fixture({hole=false,reverseFace=false}={}){
 const rings=42,segments=44,v=[],faces=[];
 for(let j=0;j<rings;j++){
  const t=j/(rings-1),r=Math.max(.008,Math.sin(Math.PI*t));
  for(let k=0;k<segments;k++){
   const a=2*Math.PI*k/segments;
   v.push('v '+(.25*r*Math.cos(a)).toFixed(8)+' '+
    t.toFixed(8)+' '+(.15*r*Math.sin(a)+(j===34 && k===5 ? 0.0012 : 0)).toFixed(8));
  }
 }
 for(let j=0;j<rings-1;j++)for(let k=0;k<segments;k++){
  const a=j*segments+k+1,b=j*segments+(k+1)%segments+1,
   c=(j+1)*segments+k+1,d=(j+1)*segments+(k+1)%segments+1;
  const first=[a,b,d],second=[a,d,c];
  if(reverseFace&&j===34&&k===4)first.reverse();
  if(!(hole&&j===34&&k===4)){
   faces.push('f '+first.join(' '));
   faces.push('f '+second.join(' '));
  }
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


const make=(o={hole:true},extras={})=>{
 const v=options(o),sourceSha256=createHash('sha256').update(v.objText).digest('hex');
 return createAIGReal3DCurvedJunctionWorkingCopy({
  ...v,sourceName:'NONHUMAN_CURVED_TEST.obj',
  sourceSha256,authorizeWorkingCopy:true,...extras
 });
};
test('real four-edge NONPLANAR quad hole is patched to an immutable candidate, not a fake flat face',()=>{
 const before=options({hole:true}).objText,original=parseAIGScanNativeOBJ(before);
 const out=make();
 assert.equal(out.schema,AIG_REAL3D_CURVED_PATCH_SCHEMA);
 assert.equal(out.sourceVertices,original.original.length);
 assert.equal(out.sourceTriangles,original.indices.length/3);
 assert.equal(out.addedSourceVertices,1);
 assert.equal(out.addedSourceTriangles,4);
 assert.equal(out.holeBoundaryVertexIDs.length,4);
 assert.ok(out.boundaryNonplanarityMm>.01);
 assert.ok(out.boundaryNonplanarityMm<=3);
 assert.ok(out.centerNormalCorrectionMm<=1.5);
 assert.ok(out.worstAddedToOriginalFaceBendDegrees<=55);
 assert.ok(out.minimumNewFaceAreaMm2>1);
 assert.equal(out.originalFacesAndVerticesNotChanged,true);
 assert.equal(out.candidateSourceTopologyClosed,true);
 assert.equal(out.newSourceGeometryIsInterpolatedApproximationNotMeasured,true);
 assert.equal(out.realHumanShapePASS,false);
 assert.equal(out.releasePASS,false);
 assert.ok(out.workingCopyCandidateObjText.startsWith(before+'\n'));
 const after=parseAIGScanNativeOBJ(out.workingCopyCandidateObjText);
 assert.deepEqual(after.original.slice(0,original.original.length),original.original);
 assert.deepEqual(after.indices.slice(0,original.indices.length),original.indices);
 assert.equal(after.original.length,original.original.length+1);
 const checked=buildAIGReal3DScanNative({
  objText:out.workingCopyCandidateObjText,
  heightMm:1680,sourceName:'candidate.obj',sourceSha256:'a'.repeat(64)
 });
 assert.equal(checked.evidence.openEdges,0);
 assert.equal(checked.evidence.nonManifoldEdges,0);
 assert.equal(checked.evidence.degenerateTriangles,0);
});
test('one triangle hole and closed model remain governed by old planar mode / block',()=>{
 assert.throws(()=>make({hole:false}),/REAL3D_CURVED_PATCH_ONLY_ONE_FOUR_TO_EIGHT_EDGE_HOLE_SUPPORTED/);
 const obj=options({hole:true}).objText;
 const lines=obj.split('\n');
 const vertexCount=lines.filter(x=>x.startsWith('v ')).length;
 assert.ok(vertexCount>1500);
});
test('safety gate rejects sharp/too-large/nonplanar loops, malformed evidence and unwarranted automatic changes',()=>{
 assert.throws(()=>make({hole:true},{authorizeWorkingCopy:false}),
  /REAL3D_CURVED_PATCH_EXPLICIT_USER_WORKING_COPY_ACTION_REQUIRED/);
 assert.throws(()=>make({hole:true},{sourceSha256:'no-sha'}),
  /REAL3D_CURVED_PATCH_ORIGINAL_OBJ_SHA_REQUIRED/);
 assert.throws(()=>make({hole:true},{maxHoleDiameterMm:10}),
  /REAL3D_CURVED_PATCH_HOLE_TOO_LARGE/);
 assert.throws(()=>make({hole:true},{maxNonplanarityMm:.01}),
  /REAL3D_CURVED_PATCH_SURFACE_TOO_NONPLANAR_TO_INFER/);
 assert.throws(()=>make({hole:true},{maxFaceBendDegrees:90}),
  /REAL3D_CURVED_PATCH_SAFETY_LIMITS_INVALID/);
});
