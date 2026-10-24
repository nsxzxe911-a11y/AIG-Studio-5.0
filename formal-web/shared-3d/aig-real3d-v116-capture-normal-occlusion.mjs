/**
 * Real3D V116 - declared scan/capture provenance + actually measured local
 * normal and source-depth discontinuity audit, independent of any AI weights.
 * No fitted skeleton, inferred backside, fake fill, or mesh replacement.
 */
export const AIG_REAL3D_V116_SCHEMA='AIG_REAL3D_V116_DECLARED_CAPTURE_NORMAL_OCCLUSION_QA_V1';
const reject=x=>{throw Error('REAL3D_V116_'+x);};
const sha=s=>typeof s==='string'&&/^[0-9a-f]{64}$/i.test(s);
const finite=Number.isFinite;
const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
const norm=v=>Math.hypot(...v);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],
 a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const difference=(a,b)=>a.map((v,i)=>v-b[i]);
const pct=(values,p)=>{
 if(values.length===0)return null;
 const sorted=[...values].sort((a,b)=>a-b);
 return sorted[Math.min(sorted.length-1,Math.ceil(p*sorted.length)-1)];
};
function validateSource(v,i){
 if(!v||!Number.isInteger(v.width)||!Number.isInteger(v.height)||
  v.width<16||v.height<16||v.width>512||v.height>512||
  !(v.depthValuesMM instanceof Float32Array)||
  v.depthValuesMM.length!==v.width*v.height||
  !v.depthValuesMM.every(x=>finite(x)&&x>=0&&x<=50000)||
  !sha(v.photoSha256)||!sha(v.depthSha256)||
  !v.intrinsics||!v.cameraToWorldMM||
  v.cameraToWorldMM.length!==16||
  !['fxPx','fyPx','cxPx','cyPx'].every(k=>finite(v.intrinsics[k]))||
  !(v.intrinsics.fxPx>0)||!(v.intrinsics.fyPx>0)||
  !v.cameraToWorldMM.every(finite))
  reject('VIEW_'+i+'_CALIBRATED_MEASURED_SOURCE_REQUIRED');
}
function worldPoint(v,x,y){
 if(x<0||y<0||x>=v.width||y>=v.height)return null;
 const depth=v.depthValuesMM[y*v.width+x];
 if(!(depth>0))return null;
 const {fxPx,fyPx,cxPx,cyPx}=v.intrinsics,
  local=[(x-cxPx)*depth/fxPx,(cyPx-y)*depth/fyPx,depth],
  m=v.cameraToWorldMM;
 return [m[0]*local[0]+m[4]*local[1]+m[8]*local[2]+m[12],
  m[1]*local[0]+m[5]*local[1]+m[9]*local[2]+m[13],
  m[2]*local[0]+m[6]*local[1]+m[10]*local[2]+m[14]];
}
function normalAt(v,x,y,depthJumpMM){
 const d=v.depthValuesMM[y*v.width+x];
 if(!(d>0))return null;
 const around=[[x-1,y],[x+1,y],[x,y-1],[x,y+1]];
 const samples=around.map(([a,b])=>worldPoint(v,a,b));
 if(samples.some(p=>p===null))return null;
 const depths=around.map(([a,b])=>v.depthValuesMM[b*v.width+a]);
 if(depths.some(z=>Math.abs(z-d)>depthJumpMM))return null;
 const tangentX=difference(samples[1],samples[0]),
  tangentY=difference(samples[3],samples[2]),
  n=cross(tangentX,tangentY),length=norm(n);
 return length<1e-9?null:n.map(x=>x/length);
}
function project(v,p){
 const m=v.cameraToWorldMM,
  d=[p[0]-m[12],p[1]-m[13],p[2]-m[14]],
  x=m[0]*d[0]+m[1]*d[1]+m[2]*d[2],
  y=m[4]*d[0]+m[5]*d[1]+m[6]*d[2],
  z=m[8]*d[0]+m[9]*d[1]+m[10]*d[2];
 if(!(z>0))return null;
 const {fxPx,fyPx,cxPx,cyPx}=v.intrinsics;
 return {x:fxPx*x/z+cxPx,y:cyPx-fyPx*y/z,z};
}
function validateCapture(v,m,i){
 if(!m||!['SYNTHETIC_FIXTURE','DECLARED_SENSOR_CAPTURE'].includes(m.sourceClass)||
  typeof m.captureId!=='string'||!/^[A-Za-z0-9._-]{4,80}$/.test(m.captureId)||
  typeof m.deviceId!=='string'||!/^[A-Za-z0-9._-]{3,80}$/.test(m.deviceId)||
  typeof m.capturedAtUTC!=='string'||
  !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(m.capturedAtUTC)||
  !finite(Date.parse(m.capturedAtUTC))||
  !sha(m.calibrationDocumentSha256)||
  !['SIMULATED_RAY_DEPTH','MEASURED_DEPTH_SENSOR'].includes(m.depthMethod)||
  m.sourceClass==='SYNTHETIC_FIXTURE'&&m.depthMethod!=='SIMULATED_RAY_DEPTH'||
  m.sourceClass==='DECLARED_SENSOR_CAPTURE'&&m.depthMethod!=='MEASURED_DEPTH_SENSOR'||
  m.photoSha256!==v.photoSha256||m.depthSha256!==v.depthSha256)
  reject('CAPTURE_'+i+'_DECLARED_IDENTITIES_AND_FILE_HASHES_REQUIRED');
 return {captureId:m.captureId,deviceId:m.deviceId,sourceClass:m.sourceClass,
  depthMethod:m.depthMethod,capturedAtUTC:m.capturedAtUTC,
  calibrationDocumentSha256:m.calibrationDocumentSha256,
  photoSha256:v.photoSha256,depthSha256:v.depthSha256};
}
/**
 * Both directions use source pixel center -> opposite camera reprojection.
 * Only true four-neighbor depth measurements produce normals. Out-of-image,
 * missing depth, grazing/discontinuous neighborhoods remain unknown.
 *
 * Even if sourceClass is DECLARED_SENSOR_CAPTURE, metadata is an unverified
 * user assertion, not hardware attestation or photorealistic accuracy proof.
 */
export function auditAIGReal3DV116CaptureNormalAndOcclusion({
 views,captureManifests,v115Receipt,
 sampleStride=2,depthJumpMM=15,maxNormalAngleDeg=12,
 maxPointToPointMM=2,minBidirectionalNormalPairs=32,
 pixelTolerance=.51
}={}){
 if(!Array.isArray(views)||views.length!==2||
  !Array.isArray(captureManifests)||captureManifests.length!==2||
  !v115Receipt||v115Receipt.researchGate!=='PASS_SOURCE_OPEN_EDGE_ATLAS'||
  !sha(v115Receipt.originalGLBSha256)||!sha(v115Receipt.workingGLBSha256)||
  !Number.isInteger(sampleStride)||sampleStride<1||sampleStride>12||
  !finite(depthJumpMM)||depthJumpMM<.1||depthJumpMM>100||
  !finite(maxNormalAngleDeg)||maxNormalAngleDeg<1||maxNormalAngleDeg>45||
  !finite(maxPointToPointMM)||maxPointToPointMM<.01||maxPointToPointMM>20||
  !Number.isInteger(minBidirectionalNormalPairs)||minBidirectionalNormalPairs<12||
  !finite(pixelTolerance)||pixelTolerance<.45||pixelTolerance>1)
  reject('V115_VERIFIED_SOURCE_AND_BOUNDED_NORMAL_GATE_REQUIRED');
 views.forEach(validateSource);
 const captures=captureManifests.map((m,i)=>validateCapture(views[i],m,i));
 if(captures[0].captureId===captures[1].captureId||
  captures[0].photoSha256===captures[1].photoSha256||
  captures[0].depthSha256===captures[1].depthSha256||
  captures[0].calibrationDocumentSha256===captures[1].calibrationDocumentSha256)
  reject('TWO_DISTINCT_CAPTURE_AND_CALIBRATION_SOURCES_REQUIRED');
 if(v115Receipt.unsupportedNewOpenEdges!==0||
  v115Receipt.verifiedOpenEdgeFraction<1||
  v115Receipt.productionReleasePASS!==false)
  reject('ORIGINAL_SEAM_ATLAS_NOT_INDEPENDENTLY_SUPPORTED');
 const directions=[],allAngles=[],allPointErrors=[];
 for(let index=0;index<2;index++){
  const src=views[index],dst=views[1-index],angles=[],errors=[];
  let depthValid=0,borderOfImage=0,adjacentUnknownDepth=0,
   jumpOrOcclusionCandidate=0,projectedOutside=0,
   unavailableNormal=0,missingOtherDepth=0,
   reprojectionUncertain=0,normalPairs=0,
   orientationInverted=0;
  const witnesses=[];
  for(let y=0;y<src.height;y+=sampleStride)for(let x=0;x<src.width;x+=sampleStride){
   const z=src.depthValuesMM[y*src.width+x];
   if(!(z>0))continue;
   depthValid++;
   if(x===0||y===0||x===src.width-1||y===src.height-1)
    borderOfImage++;
   const neighbor=[[x-1,y],[x+1,y],[x,y-1],[x,y+1]];
   if(neighbor.some(([a,b])=>a<0||b<0||a>=src.width||b>=src.height||
     src.depthValuesMM[b*src.width+a]===0))
    adjacentUnknownDepth++;
   else if(neighbor.some(([a,b])=>
    Math.abs(src.depthValuesMM[b*src.width+a]-z)>depthJumpMM))
    jumpOrOcclusionCandidate++;
   const p=worldPoint(src,x,y),n=normalAt(src,x,y,depthJumpMM);
   if(!n){unavailableNormal++;continue;}
   const t=project(dst,p);
   if(!t){projectedOutside++;continue;}
   const tx=Math.round(t.x),ty=Math.round(t.y);
   if(tx<1||ty<1||tx>=dst.width-1||ty>=dst.height-1){
    projectedOutside++;continue;
   }
   if(Math.hypot(t.x-tx,t.y-ty)>pixelTolerance){
    reprojectionUncertain++;continue;
   }
   const other=worldPoint(dst,tx,ty),on=normalAt(dst,tx,ty,depthJumpMM);
   if(!other||!on){missingOtherDepth++;continue;}
   const distance=norm(difference(p,other));
   const signedDot=Math.max(-1,Math.min(1,dot(n,on)));
   const angle=Math.acos(Math.abs(signedDot))*180/Math.PI;
   if(signedDot<0)orientationInverted++;
   angles.push(angle);errors.push(distance);normalPairs++;
   if(witnesses.length<16)witnesses.push({
    source:[x,y],target:[tx,ty],normalAngleDegrees:angle,
    sharedWorldPositionErrorMM:distance,sourceNormal:n,targetNormal:on
   });
  }
  allAngles.push(...angles);allPointErrors.push(...errors);
  directions.push({
   fromCamera:index,toCamera:1-index,sourceMeasuredPixelsSampled:depthValid,
   cameraFrameBoundarySampleCount:borderOfImage,
   adjacentMissingMeasuredDepthCount:adjacentUnknownDepth,
   candidateDiscontinuityOrOcclusionCount:jumpOrOcclusionCandidate,
   normalsUnavailableAtEdgesOrHoles:unavailableNormal,
   projectedOutsideOtherCameraCount:projectedOutside,
   otherCameraDepthMissingOrNormalUnavailable:missingOtherDepth,
   uncertainFractionalPixelMatches:reprojectionUncertain,
   independentlyMeasuredNormalPairs:normalPairs,
   normalAngleP95Deg:pct(angles,.95),normalAngleMaxDeg:angles.length?Math.max(...angles):null,
   sharedPositionErrorP95MM:pct(errors,.95),
   normalsWithOppositeOrientation:orientationInverted,
   witnesses
  });
 }
 const p95Angle=pct(allAngles,.95),
  maxAngle=allAngles.length?Math.max(...allAngles):null,
  p95Distance=pct(allPointErrors,.95),
  maxDistance=allPointErrors.length?Math.max(...allPointErrors):null;
 const enough=directions.every(d=>d.independentlyMeasuredNormalPairs>=minBidirectionalNormalPairs);
 // A large physical depth jump makes normal neighborhoods unavailable.
 // It must be identified as unresolved, not hidden by comparing only the
 // remaining smooth pixels. True occlusion classification needs more views.
 const unreviewedOcclusionCandidates=directions.reduce(
  (sum,d)=>sum+d.candidateDiscontinuityOrOcclusionCount,0);
 const consistent=enough&&unreviewedOcclusionCandidates===0&&
  p95Angle<=maxNormalAngleDeg&&maxAngle<=maxNormalAngleDeg&&
  p95Distance<=maxPointToPointMM&&maxDistance<=maxPointToPointMM;
 const gate=!enough?'BLOCK_INSUFFICIENT_BIDIRECTIONAL_OBSERVED_NORMALS':
  unreviewedOcclusionCandidates>0?'BLOCK_UNREVIEWED_DEPTH_OCCLUSION_CANDIDATES':
  consistent?'PASS_SOURCE_MEASURED_NORMAL_CONTINUITY_ONLY':
  'BLOCK_SOURCE_NORMAL_OR_SPATIAL_DISCONTINUITY';
 const classes=captures.map(c=>c.sourceClass);
 return {
  schema:AIG_REAL3D_V116_SCHEMA,
  inputSourceEvidence:captureManifests.map((_,i)=>captures[i]),
  v115OriginalSha256:v115Receipt.originalGLBSha256,
  v115WorkingSha256:v115Receipt.workingGLBSha256,
  originalTwoViewTopologyPreserved:true,workingGLBUnmodified:true,
  normalAngleToleranceDeg:maxNormalAngleDeg,positionToleranceMM:maxPointToPointMM,
  minimumPairsPerDirection:minBidirectionalNormalPairs,
  bidirectionalNormalPairsTotal:allAngles.length,
  unreviewedDepthDiscontinuityCandidates:unreviewedOcclusionCandidates,
  normalAngleP95Deg:p95Angle,normalAngleMaxDeg:maxAngle,
  matchedWorldPositionP95MM:p95Distance,matchedWorldPositionMaxMM:maxDistance,
  directions,normalAndSurfaceGate:gate,researchGate:consistent?'PASS_COMPUTED_NORMAL_CONTINUITY':'BLOCK',
  boundaryClassification: 'FRAME_EDGE_OR_MISSING_DEPTH_OR_DISCONTINUITY_CANDIDATE_NOT_PROVEN_OCCLUSION',
  independentCameraCaptureAuthenticated:false,
  hardwareDepthSensorEvidenceIndependentlyChecked:false,
  calibrationDocumentContentVerified:false,
  sourceClassIsOnlyDeclaredNotTrusted:true,
  syntheticFixtureUsed:classes.includes('SYNTHETIC_FIXTURE'),
  realScannerGroundTruthGate:'BLOCK_NO_EXTERNAL_CAPTURE_ATTESTATION',
  completeNaturalHumanOrAnimalGeometry:false,
  photo1to1LikenessCertified:false,unknownSurfaceFilled:false,
  sourceMeshesMovedOrWelded:false,productionReleasePASS:false
 };
}
