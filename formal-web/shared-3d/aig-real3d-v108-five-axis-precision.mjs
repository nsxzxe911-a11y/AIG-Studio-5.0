/**
 * Real3D V108 / Third project: independent, deterministic virtual 5AX
 * geometry precision audit. This is NOT CNC motion certification and cannot
 * turn a 12-triangle fixture into a scanned person.
 */
import {getAIG3DWorldMatrix, transformAIG3DPoint}
 from './aig-real3d-core.mjs';
import {auditAIGReal3DV107Source,planAIGReal3DV107FiveAxis}
 from './aig-real3d-v107-five-axis-foot-head.mjs';

export const AIG_REAL3D_V108_SCHEMA='AIG_REAL3D_V108_5AX_INDEPENDENT_MM_PRECISION_GATE_V1';
const THRESHOLD_MM=0.001;
const length3=a=>Math.hypot(a[0],a[1],a[2]);
const sub=(a,b)=>a.map((x,i)=>x-b[i]);
const near=(a,b,tolerance=1e-9)=>Math.abs(a-b)<=tolerance;

function independentPose(p,pivot,aDeg,bDeg){
 // Independent oracle: first child B around local Y, then parent A around X.
 const a=aDeg*Math.PI/180,b=bDeg*Math.PI/180,
  ca=Math.cos(a),sa=Math.sin(a),cb=Math.cos(b),sb=Math.sin(b);
 const [x,y,z]=sub(p,pivot),bx=cb*x+sb*z,bz=-sb*x+cb*z;
 return [pivot[0]+bx,
  pivot[1]+ca*y-sa*bz,
  pivot[2]+sa*y+ca*bz];
}
function inverseRigidPoint(matrix,p){
 // Matrix is 4x4 column-major; inverse R of rigid stage equals transpose R.
 const dx=p[0]-matrix[12],dy=p[1]-matrix[13],dz=p[2]-matrix[14];
 return [matrix[0]*dx+matrix[1]*dy+matrix[2]*dz,
  matrix[4]*dx+matrix[5]*dy+matrix[6]*dz,
  matrix[8]*dx+matrix[9]*dy+matrix[10]*dz];
}
function determinant(m){
 const a=m[0],b=m[4],c=m[8],
       d=m[1],e=m[5],f=m[9],
       g=m[2],h=m[6],i=m[10];
 return a*(e*i-f*h)-b*(d*i-f*g)+c*(d*h-e*g);
}
function sampledWorldVertices(scene){
 const points=[];
 for(const node of scene.nodes){
  if(node.visible===false)continue;
  const matrix=getAIG3DWorldMatrix(scene,node.id);
  const mesh=node.mesh,count=mesh.vertexCount;
  // Source samples include both ends and are derived from actual indexed XYZ,
  // never a separately invented high-resolution replacement surface.
  const n=Math.min(count,64);
  for(let i=0;i<n;i++){
   const vertex=Math.floor(i*(count-1)/Math.max(1,n-1))*3;
   points.push(transformAIG3DPoint(matrix,
    mesh.positions.slice(vertex,vertex+3)));
  }
 }
 if(points.length<2)throw Error('REAL3D_V108_SOURCE_WORLD_VERTEX_SAMPLES_REQUIRED');
 return points;
}
export function auditAIGReal3DV108FiveAxisPrecision({
 scene,sourceGLBSha256,stepDeg=15
}={}){
 if(stepDeg!==15)throw Error('REAL3D_V108_REQUIRED_15_DEG_SWEEP');
 const original=JSON.stringify(scene);
 const sourceAudit=auditAIGReal3DV107Source(scene,sourceGLBSha256);
 const points=sampledWorldVertices(scene);
 const pivot=sourceAudit.originalPivotWorld;
 const mm=sourceAudit.units==='METERS'?1000:1;
 let positionsChecked=0,posesChecked=0,
  maxRoundtripMm=0,maxIndependentPoseDeltaMm=0,
  maxRadialLengthDeltaMm=0,maxPivotDeltaMm=0,
  maxDeterminantDelta=0,maxClipPlaneDeltaMm=0;
 const allPositions=[];
 for(let a=-180;a<=180;a+=15)allPositions.push(a);
 const bPositions=[];
 for(let b=0;b<=360;b+=15)bPositions.push(b);
 const sourceHeights=[0,.25,.5,.75,1];
 const initialTriangles=sourceAudit.trueIndexedSourceTriangles;
 const failures=[];
 for(const a of allPositions)for(const b of bPositions){
  const plan=planAIGReal3DV107FiveAxis({
   scene,sourceGLBSha256,sourceAudit,
   aTiltDeg:a,bTurnDeg:b,footHeadProgress:1});
  posesChecked++;
  const m=plan.modelStageMatrix;
  const detError=Math.abs(determinant(m)-1);
  maxDeterminantDelta=Math.max(maxDeterminantDelta,detError);
  const movedPivot=transformAIG3DPoint(m,pivot);
  maxPivotDeltaMm=Math.max(maxPivotDeltaMm,length3(sub(movedPivot,pivot))*mm);
  for(const p of points){
   const moved=transformAIG3DPoint(m,p),
    independent=independentPose(p,pivot,a,b),
    restored=inverseRigidPoint(m,moved);
   maxIndependentPoseDeltaMm=Math.max(maxIndependentPoseDeltaMm,
    length3(sub(moved,independent))*mm);
   maxRoundtripMm=Math.max(maxRoundtripMm,
    length3(sub(restored,p))*mm);
   maxRadialLengthDeltaMm=Math.max(maxRadialLengthDeltaMm,
    Math.abs(length3(sub(moved,pivot))-length3(sub(p,pivot)))*mm);
   positionsChecked++;
  }
  // Full 100% must not be cut by a source-Y shader. Actual GPU baseline
  // comparison is a separate browser gate, never inferred from this test.
  if(plan.progress!==1||plan.sourceGeometryUnmodified!==true)
   failures.push('POSE_DID_NOT_PRESERVE_FULL_ORIGINAL_SOURCE');
 }
 for(const progress of sourceHeights){
  const plan=planAIGReal3DV107FiveAxis({
   scene,sourceGLBSha256,sourceAudit,
   aTiltDeg:90,bTurnDeg:90,footHeadProgress:progress});
  const expected=sourceAudit.originalHeightMinY+
   progress*(sourceAudit.originalHeightMaxY-sourceAudit.originalHeightMinY);
  maxClipPlaneDeltaMm=Math.max(maxClipPlaneDeltaMm,
   Math.abs(plan.clipSourceYMax-expected)*mm);
  if(!near(plan.progress,progress)||plan.clipSourceYMin!==sourceAudit.originalHeightMinY)
   failures.push('SOURCE_HEIGHT_CLIP_INCONSISTENT');
 }
 const originalUnchanged=JSON.stringify(scene)===original;
 if(!originalUnchanged)failures.push('ORIGINAL_SOURCE_MUTATED');
 if(maxRoundtripMm>THRESHOLD_MM)failures.push('ROUNDTRIP_GT_0_001MM');
 if(maxIndependentPoseDeltaMm>THRESHOLD_MM)failures.push('INDEPENDENT_POSE_GT_0_001MM');
 if(maxRadialLengthDeltaMm>THRESHOLD_MM)failures.push('RIGID_RADIUS_GT_0_001MM');
 if(maxPivotDeltaMm>THRESHOLD_MM)failures.push('PIVOT_GT_0_001MM');
 if(maxClipPlaneDeltaMm>THRESHOLD_MM)failures.push('CLIP_HEIGHT_GT_0_001MM');
 if(maxDeterminantDelta>1e-8)failures.push('ROTATION_DETERMINANT_NOT_ONE');
 if(initialTriangles!==sourceAudit.trueIndexedSourceTriangles)
  failures.push('SOURCE_TRIANGLE_COUNT_CHANGED');
 const geometryMathGate=failures.length===0?'PASS':'BLOCK';
 return {
  schema:AIG_REAL3D_V108_SCHEMA,
  sourceGLBSha256,sourceSceneRevision:sourceAudit.sourceSceneRevision,
  sourceUnits:sourceAudit.units,sourceTriangles:initialTriangles,
  trianglesAreNotAppearanceQualityMetric:true,
  sampledVertices:points.length,posesChecked,positionsChecked,
  angleSweep:{aMinDeg:-180,aMaxDeg:180,bMinDeg:0,bMaxDeg:360,
   stepDeg:15,aSamples:allPositions.length,bSamples:bPositions.length},
  clipping:{fractions:sourceHeights,
   anchoredToSourcePreRotationY:true,full100PercentGPUClippingMustBeDisabled:true},
  precisionThresholdMm:THRESHOLD_MM,
  maxRoundtripMm,maxIndependentPoseDeltaMm,maxRadialLengthDeltaMm,
  maxPivotDeltaMm,maxClipPlaneDeltaMm,maxDeterminantDelta,
  originalUnchanged,geometryMathGate,failures,
  complexSourceEvidenceGate:initialTriangles<=12?
   'BLOCK_DEMONSTRATION_ONLY_12_TRIANGLE_SOURCE':'BLOCK_EXTERNAL_SOURCE_QUALITY_UNVERIFIED',
  geometryAppearanceIoU:null,
  imageGeometryReconstructionGate:'BLOCK_NO_MATCHED_INDEPENDENT_PHOTO_OR_MULTI_VIEW_MEASUREMENT',
  sourcePhotoOrNaturalAnatomyPASS:false,
  cpuPoseMathOnlyNotGPUImageEvidence:true,
  realCNCMachineSafetyCertification:false,
  releasePASS:false
 };
}
