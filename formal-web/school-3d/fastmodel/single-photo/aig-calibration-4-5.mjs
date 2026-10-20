/** FastModel 4.5: AIG native source-locked pose library and 2D landmark calibration.
 * Does not infer any 3D joint depth / missing orthographic view or face identity.
 * Four saved source PNGs are front/near-front DIFFERENT POSES.
 */
export const AIG45_SCHEMA='AIG_FASTMODEL_4_5_POSE_CALIBRATION_DRAFT';
export const AIG45_PACK='HEROINE_WHITE_STRAPLESS_TWO_PIECE_PONYTAIL_4POSE_20261021';
export const AIG45_POSES=Object.freeze([
 Object.freeze({id:'HEROINE-WS-POSE-01',filename:'HEROINE-WS-POSE-01.png',
 sha256:'3f33a146e0a02fd23737b9fc7e5885b64b9d732e6da09a0585b7fd0d20e1ea43',width:1122,height:1402,
 description:'Poolside standing; arms back',view:'FRONT_OR_NEAR_FRONT'}),
 Object.freeze({id:'HEROINE-WS-POSE-02',filename:'HEROINE-WS-POSE-02.png',
 sha256:'b2c0f8585e55c5f700a8f0d626396baf020f65db36a45d61f0b76bad4cfb03d2',width:1122,height:1402,
 description:'Poolside hand near ponytail',view:'FRONT_OR_NEAR_FRONT'}),
 Object.freeze({id:'HEROINE-WS-POSE-03',filename:'HEROINE-WS-POSE-03.png',
 sha256:'644dea146a55a5249a04feb8fd456bbd7902d8077637a7275d0ae6a96be53e4e',width:1122,height:1402,
 description:'Indoor lounge standing',view:'FRONT_OR_NEAR_FRONT'}),
 Object.freeze({id:'HEROINE-WS-POSE-04',filename:'HEROINE-WS-POSE-04.png',
 sha256:'b141aea9347046dc395579e24a84be8d97a750d574f0b0fe1f2461b9d8d2fae5',width:1122,height:1402,
 description:'Poolside walking/turning',view:'FRONT_OR_NEAR_FRONT'})
]);
export const AIG45_MARKERS=Object.freeze([
 'headTop','chin','leftShoulder','rightShoulder',
 'leftHip','rightHip','leftAnkle','rightAnkle'
]);
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const hex=s=>typeof s==='string'&&/^[0-9a-f]{64}$/.test(s);
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const mid=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
export function recognizePose({sha256,width,height}={}){
 const record=AIG45_POSES.find(p=>sha256===p.sha256);
 return {schema:AIG45_SCHEMA,sourceSHA256:hex(sha256)?sha256:null,
  matchedRecord:record?.id||null,matched:!!(record&&width===record.width&&height===record.height),
  poseOnly:true,orthographicViewEvidence:false,knownCameraYawDegrees:null,
  characterIdentityProvenBySHA:false,photoTo3DComplete:false,
  sourceLibraryPack:AIG45_PACK,releaseAllowed:false};
}
export function normalizeMark({x,y}={},width,height){
 if(!finite(x)||!finite(y)||!Number.isInteger(width)||!Number.isInteger(height)||
    width<32||height<32||x<0||y<0||x>width||y>height)
  throw Error('AIG45_MARK_OUTSIDE_IMAGE');
 return {x:x/width,y:y/height};
}
export function auditMarks(source,marks){
 if(!source?.matched||!AIG45_POSES.some(p=>p.id===source.matchedRecord))
  throw Error('AIG45_REGISTERED_SOURCE_REQUIRED');
 if(!marks||!AIG45_MARKERS.every(k=>
  finite(marks[k]?.x)&&finite(marks[k]?.y)&&marks[k].x>=0&&marks[k].x<=1&&
  marks[k].y>=0&&marks[k].y<=1))
  throw Error('AIG45_EIGHT_LANDMARKS_REQUIRED');
 const a=marks;
 const shoulders=mid(a.leftShoulder,a.rightShoulder);
 const hips=mid(a.leftHip,a.rightHip);
 const ankles=mid(a.leftAnkle,a.rightAnkle);
 const height=ankles.y-a.headTop.y;
 if(!(a.headTop.y<a.chin.y&&a.chin.y<shoulders.y&&shoulders.y<hips.y&&hips.y<ankles.y&&
      height>=.36&&height<=.97&&
      a.leftShoulder.x<a.rightShoulder.x&&a.leftHip.x<a.rightHip.x&&
      a.leftAnkle.x<a.rightAnkle.x))
  throw Error('AIG45_LANDMARK_ORDER_OR_CROP_INVALID');
 const sh=dist(a.leftShoulder,a.rightShoulder);
 const hi=dist(a.leftHip,a.rightHip);
 const face=dist(a.headTop,a.chin);
 if(sh/height<.07||sh/height>.48||hi/height<.07||hi/height>.56||face/height<.045||face/height>.27)
  throw Error('AIG45_PROPORTIONS_IMPLAUSIBLE');
 return {schema:AIG45_SCHEMA,assetId:source.matchedRecord,
  originalSourceSHA256:source.sourceSHA256,
  input2DLandmarks:Object.fromEntries(AIG45_MARKERS.map(k=>[k,{x:+a[k].x.toFixed(6),y:+a[k].y.toFixed(6)}])),
  coordinates:'NORMALIZED_2D_PIXELS_USER_MARKED',
  ratios:{
   apparentHeadHeightOverBody:face/height,
   apparentShoulderWidthOverBody:sh/height,
   apparentHipWidthOverBody:hi/height,
   apparentShoulderToHipOverBody:dist(shoulders,hips)/height,
   apparentHipToAnklesOverBody:dist(hips,ankles)/height,
   observedVisibleHeightFraction:height
  },
  cameraCalibrationVerified:false,physicalScaleInMillimeters:false,
  userMarked2DOnly:true,estimatedUnknownSurfaceDepth:false,
  preciseTrueAnatomicalRatioVerified:false,
  isOrthographicTurnaround:false,
  sourceImageFaceIdentityProven:false,
  realHeroineGLBApproved:false,creditsSpent:0,releaseAllowed:false};
}
// Differences in camera angle, pose and perspective must never be interpreted
// as directly measured cross-photo 3D depth.
export function reviewPoseSet(calibrations){
 if(!Array.isArray(calibrations)||calibrations.length<1||calibrations.length>4)
  throw Error('AIG45_POSE_SET_SIZE');
 const ids=new Set();
 for(const c of calibrations){
  if(c?.schema!==AIG45_SCHEMA||!hex(c.originalSourceSHA256)||
   !AIG45_POSES.some(p=>p.id===c.assetId&&p.sha256===c.originalSourceSHA256)||
    ids.has(c.assetId))throw Error('AIG45_POSE_SET_SOURCE_MISMATCH_OR_DUPLICATE');
  ids.add(c.assetId);
 }
 const values=calibrations.map(c=>c.ratios.apparentShoulderWidthOverBody);
 const spread=Math.max(...values)-Math.min(...values);
 return {schema:AIG45_SCHEMA,assetSetId:AIG45_PACK,
  registeredPhotoCount:calibrations.length,
  distinctValidCameraAngles:1,actualBackViewCount:0,sideViewCount:0,
  shoulderSpanRatioSpread:spread,
  proportionalPoseAgreement:spread<=.06?'2D_MEASUREMENTS_WITHIN_TOLERANCE':'REVIEW_POSE_OR_CAMERA_SCALE',
  depthTriangulationPermitted:false,calibrated360Turnaround:false,
  hiddenBodyInferredNotObserved:true,frontPoseOnly:true,
  useFor3D:'MANUAL_FRONT_PROPORTION_PRIOR_NOT_TRUE_MULTIVIEW_GEOMETRY',
  noCreditsSpent:true,releaseAllowed:false};
}
