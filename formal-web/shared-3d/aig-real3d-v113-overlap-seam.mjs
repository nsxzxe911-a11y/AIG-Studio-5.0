/**
 * Real3D V113: independent overlap projection consistency audit for two
 * CALIBRATED observed-depth surfaces; preserve their original GLB meshes.
 * NOT mesh welding, guessing unseen faces, material recoloring, or human 1:1.
 */
export const AIG_REAL3D_V113_SCHEMA='AIG_REAL3D_V113_BIDIRECTIONAL_OBSERVED_SEAM_AND_MATERIAL_GATE_V1';
const fail=x=>{throw Error('REAL3D_V113_'+x);};
const number=Number.isFinite;
const isSha=x=>typeof x==='string'&&/^[a-f0-9]{64}$/i.test(x);
const rgba=x=>x instanceof Uint8ClampedArray||x instanceof Uint8Array;
function point(view,x,y){
 const d=view.depthValuesMM[y*view.width+x];
 if(!number(d)||d<=0||d>50000)return null;
 const {fxPx,fyPx,cxPx,cyPx}=view.intrinsics;
 const [px,py,pz]=[(x-cxPx)*d/fxPx,(cyPx-y)*d/fyPx,d];
 const m=view.cameraToWorldMM;
 return [m[0]*px+m[4]*py+m[8]*pz+m[12],
  m[1]*px+m[5]*py+m[9]*pz+m[13],
  m[2]*px+m[6]*py+m[10]*pz+m[14]];
}
function project(view,world){
 const m=view.cameraToWorldMM,
  dx=world[0]-m[12],dy=world[1]-m[13],dz=world[2]-m[14],
  cx=m[0]*dx+m[1]*dy+m[2]*dz,
  cy=m[4]*dx+m[5]*dy+m[6]*dz,
  cz=m[8]*dx+m[9]*dy+m[10]*dz;
 if(cz<=0||!number(cz))return null;
 const {fxPx,fyPx,cxPx,cyPx}=view.intrinsics;
 return {x:fxPx*cx/cz+cxPx,y:cyPx-fyPx*cy/cz,z:cz};
}
function colorDifference(a,ix,b,jx){
 const i=ix*4,j=jx*4;
 return Math.hypot(a[i]-b[j],a[i+1]-b[j+1],a[i+2]-b[j+2])/Math.sqrt(3);
}
function percentile(values,p){
 if(!values.length)return null;
 const sorted=[...values].sort((a,b)=>a-b);
 return sorted[Math.min(sorted.length-1,Math.ceil(values.length*p)-1)];
}
function checkView(v,i){
 if(!v||!Number.isInteger(v.width)||!Number.isInteger(v.height)||
  v.width<16||v.height<16||v.width>512||v.height>512||
  !(v.depthValuesMM instanceof Float32Array)||
  v.depthValuesMM.length!==v.width*v.height||
  !v.depthValuesMM.every(x=>number(x)&&x>=0&&x<=50000)||
  !rgba(v.photoRGBA)||v.photoRGBA.length!==v.width*v.height*4||
  !isSha(v.photoSha256)||!isSha(v.depthSha256)||
  !v.intrinsics||!v.cameraToWorldMM||v.cameraToWorldMM.length!==16)
  fail('VIEW_'+i+'_NEEDS_ORIGINAL_RGBA_SOURCE_DEPTH_AND_CALIBRATION');
}
/**
 * Depth mismatch is measured along the TARGET camera ray after world pose.
 * Nearest-pixel correspondence is only accepted within half-pixel tolerance.
 * Geometry PASS means projected observed surfaces agree, NOT an exact mesh
 * junction or verified true scanner calibration.
 */
export function auditAIGReal3DV113TwoViewOverlap({
 views,sourceGLBSha256,sampleStride=2,
 pixelTolerance=0.51,depthToleranceMM=2,
 minimumOverlapPairs=24,minCoverageFraction=.1,
 maxColorSeamMean=38
}={}){
 if(!Array.isArray(views)||views.length!==2||!isSha(sourceGLBSha256)||
  !Number.isInteger(sampleStride)||sampleStride<1||sampleStride>16||
  !number(pixelTolerance)||pixelTolerance<.45||pixelTolerance>1||
  !number(depthToleranceMM)||depthToleranceMM<.001||depthToleranceMM>20||
  !Number.isInteger(minimumOverlapPairs)||minimumOverlapPairs<12||
  !number(minCoverageFraction)||minCoverageFraction<=0||minCoverageFraction>.8||
  !number(maxColorSeamMean)||maxColorSeamMean<5||maxColorSeamMean>150)
  fail('TWO_SOURCES_BOUNDED_TOLERANCES_AND_GLB_SHA_REQUIRED');
 views.forEach(checkView);
 if(views[0].photoSha256===views[1].photoSha256||
  views[0].depthSha256===views[1].depthSha256)
  fail('INDEPENDENT_COLOR_AND_DEPTH_SHAS_REQUIRED');
 const before=views.map(v=>({
  pixels:[...v.photoRGBA],depth:[...v.depthValuesMM]}));
 const results=[],allDelta=[],allColor=[];
 for(let direction=0;direction<2;direction++){
  const src=views[direction],target=views[1-direction];
  const deltas=[],colors=[],witness=[],
   mismatchPixels=new Uint8Array(src.width*src.height);
  let validSamples=0,behindCamera=0,outsideFrame=0,nonCoincident=0,
   missingDepth=0,uncertainPixels=0;
  for(let y=0;y<src.height;y+=sampleStride)for(let x=0;x<src.width;x+=sampleStride){
   const p=point(src,x,y);
   if(!p)continue;
   validSamples++;
   const q=project(target,p);
   if(!q){behindCamera++;continue;}
   const tx=Math.round(q.x),ty=Math.round(q.y);
   if(tx<0||ty<0||tx>=target.width||ty>=target.height){
    outsideFrame++;continue;
   }
   const errorPX=Math.hypot(q.x-tx,q.y-ty);
   if(errorPX>pixelTolerance){uncertainPixels++;continue;}
   const measured=target.depthValuesMM[ty*target.width+tx];
   if(measured<=0||!number(measured)){missingDepth++;continue;}
   const depthDeltaMM=Math.abs(q.z-measured);
   const c=colorDifference(src.photoRGBA,y*src.width+x,
    target.photoRGBA,ty*target.width+tx);
   deltas.push(depthDeltaMM);
   colors.push(c);
   if(depthDeltaMM>depthToleranceMM){
    nonCoincident++;
    mismatchPixels[y*src.width+x]=1;
   }
   // Genuine measured world XYZ witness retains source pixel coordinates.
   if(witness.length<12)witness.push({
    sourceXY:[x,y],targetXY:[tx,ty],
    targetPixelReprojectionResidualPX:errorPX,
    targetCameraDepthResidualMM:depthDeltaMM,
    perChannelRMSColorDifference:c
   });
  }
  const pairCount=deltas.length,matched=validSamples?pairCount/validSamples:0;
  const rmsMM=pairCount?Math.sqrt(deltas.reduce((s,x)=>s+x*x,0)/pairCount):null;
  const meanColorDifference=pairCount?
   colors.reduce((s,x)=>s+x,0)/pairCount:null;
  results.push({
   direction,originalViewPhotoSha256:src.photoSha256,
   oppositeViewPhotoSha256:target.photoSha256,
   sourcePixelsSampled:validSamples,overlapPairs:pairCount,
   overlapFraction:matched,behindCamera,outsideFrame,
   missingTargetDepthCells:missingDepth,uncertainReprojectionPixels:uncertainPixels,
   depthResidualRmsMM:rmsMM,depthResidualP95MM:percentile(deltas,.95),
   depthResidualMaximumMM:deltas.length?Math.max(...deltas):null,
   depthResidualAboveToleranceCount:nonCoincident,
   rawColorRmsMean:meanColorDifference,
   rawColorRmsP95:percentile(colors,.95),
   witness,mismatchPixels
  });
  allDelta.push(...deltas);allColor.push(...colors);
 }
 const overlapRmsMM=allDelta.length?
  Math.sqrt(allDelta.reduce((s,v)=>s+v*v,0)/allDelta.length):null,
  overlapP95MM=percentile(allDelta,.95),
  overlapMaxMM=allDelta.length?Math.max(...allDelta):null,
  colorMean=allColor.length?
   allColor.reduce((s,v)=>s+v,0)/allColor.length:null;
 const coverageOK=results.every(r=>r.overlapPairs>=minimumOverlapPairs&&
  r.overlapFraction>=minCoverageFraction);
 // Symmetric gate: average RMS alone cannot hide localized misregistration.
 const geometryOK=coverageOK&&overlapRmsMM<=depthToleranceMM&&
  overlapP95MM<=depthToleranceMM&&
  results.every(r=>r.depthResidualAboveToleranceCount===0);
 const immutable=views.every((v,i)=>
  v.photoRGBA.length===before[i].pixels.length&&
  v.depthValuesMM.length===before[i].depth.length&&
  v.photoRGBA.every((c,k)=>c===before[i].pixels[k])&&
  v.depthValuesMM.every((d,k)=>d===before[i].depth[k]));
 if(!immutable)fail('ORIGINAL_CAMERA_COLOR_OR_DEPTH_MUTATED');
 const materialStatus=!coverageOK?'BLOCK_INSUFFICIENT_COMMON_PHOTO_PIXELS':
  colorMean>maxColorSeamMean?'WARN_RAW_COLOR_DIFFERENCE_EXPOSURE_OR_MATERIAL':
  'CONSISTENT_RAW_COLOR_SAMPLES_NOT_MATERIAL_FIDELITY_CERTIFIED';
 const geometryStatus=!coverageOK?'BLOCK_INSUFFICIENT_MEASURED_OVERLAP':
  geometryOK?'PASS_OBSERVED_DEPTH_SEAM_ONLY':
  'BLOCK_OVERLAP_SURFACE_DEPTH_CONTRADICTION';
 const report=results.map(({mismatchPixels,...rest})=>rest);
 return {
  schema:AIG_REAL3D_V113_SCHEMA,sourceGLBSha256,
  photoSourceSha256:views.map(v=>v.photoSha256),
  measuredDepthSourceSha256:views.map(v=>v.depthSha256),
  directionCount:2,overlapPairsTotal:allDelta.length,
  depthThresholdMM:depthToleranceMM,pixelTolerance,
  pairFractionThreshold:minCoverageFraction,
  overlapRmsMM,overlapP95MM,overlapMaxMM,
  rawPhotoColorSeamMean:colorMean,
  materialDifferenceStatus:materialStatus,
  geometryOverlapStatus:geometryStatus,
  directions:report,
  originalSourceArraysImmutable:immutable,
  originalGLBUnmodified:true,
  geometrySeamAutomaticallyWelded:false,
  overlapTrianglesCulled:false,
  newUnobservedSurfaceGenerated:false,
  sourceRawRGBMayDifferByExposure:true,
  calibratedDepthPhysicalAccuracyNotExternallyCertified:true,
  naturalHumanOrAnimalLikenessNotCertified:true,
  full1to1ReleaseGate:'BLOCK_UNOBSERVED_SURFACE_AND_REAL_WORLD_GROUND_TRUTH',
  researchGate:geometryOK?'PASS_OBSERVED_SEAM_CONSISTENCY':'BLOCK',
  productionReleasePASS:false,
  diagnostics:{
   width:views[0].width,height:views[0].height,
   firstViewMismatchMask:results[0].mismatchPixels,
   secondViewMismatchMask:results[1].mismatchPixels
  }
 };
}
