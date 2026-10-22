/**
 * FastModel 7.10 — physically triangulated sparse 3D observations from TWO
 * verified, RECTIFIED camera positions. Requires known focal length (pixels),
 * measured horizontal translation (mm), unchanged intrinsics, frame-specific
 * matched features and user-confirmed calibration. No monocular guesswork.
 *
 * World: camera A at [0,0,0] looking +Z, camera B at [+baseline,0,0],
 * both with image X right, Y down, same optical axes. World Y is up.
 * The resulting sparse XYZ observations are real geometric triangulation
 * conditional on calibration, NOT a dense humanoid surface or rig.
 */
export const AIG710_SCHEMA='AIG_FASTMODEL_7_10_CALIBRATED_SPARSE_MULTIVIEW_XYZ';
const fin=Number.isFinite;
function checkId(v){return typeof v==='string'&&v.length>=1&&v.length<=96&&/^[a-zA-Z0-9:_./-]+$/.test(v);}
function checkSha(s){return typeof s==='string'&&/^sha256:[a-f0-9]{64}$/.test(s);}
export function createAIG710Calibration({
 width,height,focalPx,baselineMm,calibrationReviewed=false,
 rectifiedParallelReviewed=false,sourceId=null,principalX=null,principalY=null
}={}){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<32||height<32||width*height>1600000||
 !fin(focalPx)||focalPx<20||focalPx>25000||!fin(baselineMm)||baselineMm<=0||baselineMm>20000||
 !calibrationReviewed||!rectifiedParallelReviewed||
 principalX!==null&&(!fin(principalX)||principalX<0||principalX>width)||
 principalY!==null&&(!fin(principalY)||principalY<0||principalY>height)||
 sourceId!==null&&!checkSha(sourceId))
  throw Error('AIG710_VERIFIED_RECTIFIED_STEREO_CALIBRATION_REQUIRED');
 return Object.freeze({schema:'AIG710_CALIBRATED_PARALLEL_STEREO',
  width,height,focalPx,baselineMm,
  principalX:principalX??width/2,principalY:principalY??height/2,
  calibrationReviewed:true,rectifiedParallelReviewed:true,sourceId,
  imageAxes:'X_RIGHT_Y_DOWN_CAMERA_LOOKS_POSITIVE_Z',physicalScaleUnit:'mm',
  intrinsicsVerifiedByUserOnly:true,automaticallySolvedCameraPose:false});
}
function point(p,c){
 if(!p||![p.x,p.y].every(fin)||p.x<0||p.y<0||p.x>=c.width||p.y>=c.height)
  throw Error('AIG710_PIXEL_POINT_OUT_OF_BOUNDS');
 return [p.x,p.y];
}
export function triangulateAIG710(calibration,left,right,{
 minDisparityPx=2,maxVerticalErrorPx=2.5,maxRangeMm=12000
}={}){
 if(calibration?.schema!=='AIG710_CALIBRATED_PARALLEL_STEREO'||
 ![minDisparityPx,maxVerticalErrorPx,maxRangeMm].every(fin)||
 minDisparityPx<.5||minDisparityPx>40||
 maxVerticalErrorPx<.1||maxVerticalErrorPx>8||maxRangeMm<=1||maxRangeMm>200000)
  throw Error('AIG710_TRIANGULATION_CONFIG_INVALID');
 const [lx,ly]=point(left,calibration),[rx,ry]=point(right,calibration);
 const disparity=lx-rx,epipolarError=Math.abs(ly-ry);
 if(epipolarError>maxVerticalErrorPx)throw Error('AIG710_EPIPOLAR_ERROR_BLOCKED');
 if(disparity<minDisparityPx)throw Error('AIG710_INSUFFICIENT_OR_NEGATIVE_PARALLAX');
 const z=calibration.focalPx*calibration.baselineMm/disparity;
 if(!fin(z)||z>maxRangeMm||z<calibration.baselineMm*.15)
  throw Error('AIG710_DEPTH_RANGE_OR_BASELINE_BLOCKED');
 const x=(lx-calibration.principalX)*z/calibration.focalPx;
 const y=(calibration.principalY-(ly+ry)/2)*z/calibration.focalPx;
 const reprojection={
  left:{x:calibration.principalX+calibration.focalPx*x/z,
    y:calibration.principalY-calibration.focalPx*y/z},
  right:{x:calibration.principalX+calibration.focalPx*(x-calibration.baselineMm)/z,
    y:calibration.principalY-calibration.focalPx*y/z}
 };
 const maxReprojectionError=Math.max(Math.hypot(lx-reprojection.left.x,ly-reprojection.left.y),
  Math.hypot(rx-reprojection.right.x,ry-reprojection.right.y));
 if(maxReprojectionError>maxVerticalErrorPx||!fin(maxReprojectionError))
  throw Error('AIG710_REPROJECTION_GATE_BLOCKED');
 // Baseline/angular parallax is observable only if the camera geometry is valid.
 const angleRad=Math.atan2(disparity,calibration.focalPx);
 if(angleRad<.002)throw Error('AIG710_PARALLAX_ANGLE_INSUFFICIENT');
 // Approximate one-pixel depth sensitivity, NOT a statistical calibration CI.
 const depthSensitivityMm=calibration.focalPx*calibration.baselineMm/
  (disparity*disparity);
 return {xyzMm:[x,y,z],disparityPx:disparity,parallaxAngleRad:angleRad,
  epipolarErrorPx:epipolarError,maxReprojectionErrorPx:maxReprojectionError,
  approxDepthPerPixelMm:depthSensitivityMm,
  source:'USER_VERIFIED_RECTIFIED_STEREO_PAIR',
  physicallyTriangulated:true,authenticHumanFaceReconstructed:false,
  calibratedCameraAssumption:true};
}
export function createAIG710Fusion(calibration,{maxPoints=128,maxObservations=256}={}){
 if(calibration?.schema!=='AIG710_CALIBRATED_PARALLEL_STEREO'||
 !Number.isInteger(maxPoints)||maxPoints<2||maxPoints>512||
 !Number.isInteger(maxObservations)||maxObservations<2||maxObservations>1024)
  throw Error('AIG710_FUSION_CONFIG_INVALID');
 return {schema:AIG710_SCHEMA,calibration,maxPoints,maxObservations,
  features:new Map(),observations:[],rejected:0,accepted:0,revision:0,
  denseSurfaceBuilt:false,photoHumanIdentityVerified:false,
  trueFullVideoCameraTracking:false};
}
function observedTime(v){
 if(!fin(v)||v<0||v>86400000)throw Error('AIG710_VIDEO_TIME_INVALID');
 return v;
}
export function addAIG710StereoMatch(fusion,{
 label,frameAId,frameBId,timeAMs,timeBMs,left,right,reviewed=false
}={}){
 if(fusion?.schema!==AIG710_SCHEMA||!reviewed||
 !checkId(label)||!checkId(frameAId)||!checkId(frameBId)||
 frameAId===frameBId||fusion.observations.length>=fusion.maxObservations)
  throw Error('AIG710_REVIEWED_SOURCE_MATCH_REQUIRED');
 const ta=observedTime(timeAMs),tb=observedTime(timeBMs);
 if(ta===tb)throw Error('AIG710_DISTINCT_SOURCE_FRAMES_REQUIRED');
 const key=frameAId+'|'+frameBId+'|'+label;
 if(fusion.observations.some(x=>x.uniqueKey===key))
  throw Error('AIG710_DUPLICATE_OBSERVATION_BLOCKED');
 let tri;
 try{tri=triangulateAIG710(fusion.calibration,left,right);}
 catch(err){fusion.rejected++;throw err;}
 const current=fusion.features.get(label);
 if(current){
  // Re-fusing a point after changes in the subject/camera rig silently
  // corrupts geometry. Reject physically inconsistent re-observations.
  const diff=Math.hypot(...tri.xyzMm.map((v,i)=>v-current.xyzMm[i]));
  const maxDiff=Math.max(3,current.xyzMm[2]*.04);
  if(diff>maxDiff){fusion.rejected++;throw Error('AIG710_INCONSISTENT_3D_TRACK_BLOCKED');}
 }else if(fusion.features.size>=fusion.maxPoints)throw Error('AIG710_3D_POINT_BUDGET_BLOCKED');
 const confidenceWeight=Math.min(8,Math.max(.1,tri.disparityPx/8))/
  (1+tri.maxReprojectionErrorPx);
 const prevWeight=current?.weightSum||0;
 const xyz=current?tri.xyzMm.map((v,i)=>
  (current.xyzMm[i]*prevWeight+v*confidenceWeight)/(prevWeight+confidenceWeight)):
  tri.xyzMm;
 fusion.features.set(label,{
  label,xyzMm:xyz,weightSum:prevWeight+confidenceWeight,
  observations:(current?.observations||0)+1,
  maximumReprojectionErrorPx:Math.max(current?.maximumReprojectionErrorPx||0,
   tri.maxReprojectionErrorPx),
  lowestParallaxAngleRad:Math.min(current?.lowestParallaxAngleRad??Infinity,tri.parallaxAngleRad),
  physicallyTriangulated:true,source2DReviewRequired:true
 });
 fusion.observations.push({uniqueKey:key,label,frameAId,frameBId,timeAMs:ta,timeBMs:tb,
  left:{x:left.x,y:left.y},right:{x:right.x,y:right.y},
  xyzMm:[...tri.xyzMm],disparityPx:tri.disparityPx,
  epipolarErrorPx:tri.epipolarErrorPx,
  approxDepthPerPixelMm:tri.approxDepthPerPixelMm,
  maxReprojectionErrorPx:tri.maxReprojectionErrorPx,
  sourceId:fusion.calibration.sourceId,
  cameraCalibrationReviewed:true,sourceMatchReviewed:true});
 fusion.accepted++;fusion.revision++;
 return {revision:fusion.revision,label,xyzMm:[...xyz],
  pointCount:fusion.features.size,observationCount:fusion.observations.length,
  triangulation:tri};
}
export function summarizeAIG710Fusion(fusion){
 if(fusion?.schema!==AIG710_SCHEMA)throw Error('AIG710_FUSION_INVALID');
 const feats=Array.from(fusion.features.values());
 let minZ=Infinity,maxZ=-Infinity;
 for(const p of feats){minZ=Math.min(minZ,p.xyzMm[2]);maxZ=Math.max(maxZ,p.xyzMm[2]);}
 return {schema:AIG710_SCHEMA,revision:fusion.revision,
  pointCount:feats.length,observationCount:fusion.observations.length,
  accepted:fusion.accepted,rejected:fusion.rejected,
  depthRangeMm:feats.length?[minZ,maxZ]:null,
  sourceId:fusion.calibration.sourceId,
  physicalUnits:'mm_ONLY_IF_CALIBRATION_AND_RECTIFICATION_CORRECT',
  framePoseAutomaticallySolved:false,stereoAssumptionsUserReviewed:true,
  sparseXYZPointsReal:true,dense3DSurfaceOrMeshBuilt:false,
  trueHumanAnatomyVerified:false,unseenBodyAndHairReconstructed:false,
  fusedWithFastModel78SDF:false};
}
export function exportAIG710Fusion(fusion){
 const info=summarizeAIG710Fusion(fusion);
 return {schema:AIG710_SCHEMA,revision:1,calibration:{...fusion.calibration},
  points:Array.from(fusion.features.values()).map(x=>({
   ...x,xyzMm:[...x.xyzMm]})),
  observations:fusion.observations.map(x=>({...x,
   left:{...x.left},right:{...x.right},xyzMm:[...x.xyzMm]})),
  summary:info,sourceVideoPixelsIncluded:false,
  actualDenseMeshOrAnimatedCharacterGenerated:false};
}
export function importAIG710Fusion(snapshot,{requiredSourceId=null}={}){
 if(!snapshot||snapshot.schema!==AIG710_SCHEMA||snapshot.revision!==1||
 !Array.isArray(snapshot.observations)||!Array.isArray(snapshot.points)||
 snapshot.observations.length>256||snapshot.points.length>128||
 requiredSourceId!==null&&snapshot.calibration?.sourceId!==requiredSourceId)
  throw Error('AIG710_FUSION_IMPORT_SOURCE_OR_SCHEMA_INVALID');
 const c=createAIG710Calibration(snapshot.calibration);
 const f=createAIG710Fusion(c,{maxPoints:Math.max(2,snapshot.points.length),
  maxObservations:Math.max(2,snapshot.observations.length)});
 // Never trust uploaded XYZ. Recalculate from source correspondence geometry.
 for(const obs of snapshot.observations){
  addAIG710StereoMatch(f,{
   label:obs.label,frameAId:obs.frameAId,frameBId:obs.frameBId,
   timeAMs:obs.timeAMs,timeBMs:obs.timeBMs,left:obs.left,right:obs.right,
   reviewed:obs.sourceMatchReviewed===true
  });
 }
 if(f.features.size!==snapshot.points.length)throw Error('AIG710_POINT_COUNT_MISMATCH');
 for(const p of snapshot.points){
  const recalculated=f.features.get(p.label);
  if(!recalculated||!Array.isArray(p.xyzMm)||p.xyzMm.length!==3||
   !p.xyzMm.every(fin)||Math.hypot(...p.xyzMm.map((v,i)=>v-recalculated.xyzMm[i]))>.005)
   throw Error('AIG710_3D_POINTS_SOURCE_TAMPERED');
 }
 return f;
}
