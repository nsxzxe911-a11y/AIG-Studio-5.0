/**
 * AIG Real3D V1: project only user-provided, mesh-audited OBJ landmarks
 * to the EXACT fixed orthographic camera used by shared WebGL.
 * This is 3D point projection, not image-based human identification,
 * anatomy inference, shape generation or geometry modification.
 */
import {parseAIGScanNativeOBJ} from './aig-real3d-scan-native-mesh.mjs';
import {validateAIGReal3DLandmarkSidecar} from './aig-real3d-source-review-gate.mjs';
import {validateAIGInspectionCapturePlan} from './aig-real3d-render-inspection.mjs';
export const AIG_NATIVE_LANDMARK_PROJECTION_SCHEMA='AIG_REAL3D_SOURCE_OBJ_ORTHO_LANDMARK_PROJECTION_V1';
const ANGLES=['front','side','back','threeQuarter'];
const MUST=['headTop','chin','noseTip','neckBase','leftShoulder',
 'rightShoulder','leftElbow','rightElbow','leftWrist','rightWrist',
 'leftThumbTip','rightThumbTip','leftIndexTip','rightIndexTip',
 'pelvis','leftKnee','rightKnee','leftHeel','rightHeel','leftToe','rightToe'];
const SHA=/^[a-f0-9]{64}$/i;
const mapAxis=(p,axis)=>axis==='Z'?[p[0],p[2],-p[1]]:[...p];
const round=v=>Math.round(v*1000)/1000;
/** Measured, localized bounding box of imported OBJ; no body part inference. */
export function projectAIGNativeOBJLandmarks({
 objText,landmarks,heightMm,upAxis='Y',angle='front',
 width=1080,height=1920,sourceSha256,landmarkAuditComplete=false
}={}){
 if(!SHA.test(sourceSha256??''))throw Error('ANATOMY_ORIGINAL_SOURCE_SHA_REQUIRED');
 if(!Number.isInteger(heightMm)||heightMm<900||heightMm>2200)
  throw Error('ANATOMY_MEASURED_HEIGHT_REQUIRED');
 if(!['Y','Z'].includes(upAxis)||!ANGLES.includes(angle))
  throw Error('ANATOMY_AXIS_OR_VIEW_INVALID');
 if(!Number.isInteger(width)||!Number.isInteger(height)||
   width<320||height<320||width*height>3200000)
  throw Error('ANATOMY_VIEWPORT_INVALID');
 // Enforce the existing actual OBJ nearest-vertex / landmark-order audit.
 if(landmarkAuditComplete!==true)
  throw Error('ANATOMY_NATIVE_MESH_LANDMARK_AUDIT_BLOCK');
 const check=validateAIGReal3DLandmarkSidecar(landmarks);
 if(!check.allRequiredNamesPresent||!check.points)
  throw Error('ANATOMY_MISSING_REQUIRED_21_REAL_XYZ_LANDMARKS');
 const {original}=parseAIGScanNativeOBJ(objText);
 const rotated=original.map(p=>mapAxis(p,upAxis));
 const low=[Infinity,Infinity,Infinity],high=[-Infinity,-Infinity,-Infinity];
 for(const p of rotated)for(let k=0;k<3;k++){
  low[k]=Math.min(low[k],p[k]);high[k]=Math.max(high[k],p[k]);
 }
 const span=high[1]-low[1];
 if(span<1e-8)throw Error('ANATOMY_SOURCE_HEIGHT_ZERO');
 const H=heightMm/1000,scale=H/span;
 const c=validateAIGInspectionCapturePlan({heightMeters:H,angle,mode:'ALBEDO'}).camera;
 const yaw=c.yaw,focus=c.focus;
 const right=[Math.cos(yaw),0,-Math.sin(yaw)];
 const points={};
 for(const name of MUST){
  const a=mapAxis(check.points[name],upAxis);
  const world=[
   (a[0]-(low[0]+high[0])/2)*scale,
   (a[1]-low[1])*scale,
   (a[2]-(low[2]+high[2])/2)*scale
  ];
  const centered=world.map((v,i)=>v-focus[i]);
  const cameraX=centered[0]*right[0]+centered[2]*right[2];
  const cameraY=centered[1]; // Renderer pitch fixed at 0 for anatomy
  const px=width/2+height*cameraX/c.orthoSpan;
  const py=height/2-height*cameraY/c.orthoSpan;
  points[name]={x:round(px),y:round(py),worldMeters:world.map(round),
   onCanvas:px>=0&&px<width&&py>=0&&py<height,
   sourceCoordinatesUsedVerbatim:true};
 }
 return {
  schema:AIG_NATIVE_LANDMARK_PROJECTION_SCHEMA,
  angle,width,height,sourceSha256,
  measuredHeightMm:heightMm,upAxis,projection:'ORTHOGRAPHIC_SHARED_GPU_CAMERA',
  cameraYaw:c.yaw,cameraFocus:c.focus,cameraOrthoSpan:c.orthoSpan,
  labelsFromUserSuppliedNativeOBJOnly:true,
  markerPixelPositions:points,
  projectedLabelCount:Object.keys(points).length,
  noPhotoKeypointDetection:true,notHumanAppearanceApproval:true,
  originalXYZNeverModified:true
 };
}
/**
 * Get vertically aligned signed silhouette coverage error in regions
 * delimited by actual source landmark Y coordinates. This is NOT precise
 * segmented-body shape matching: it averages existing 12 height bands.
 */
export function summarizeAIGLandmarkHeightRegions({projection,profile}={}){
 if(projection?.schema!==AIG_NATIVE_LANDMARK_PROJECTION_SCHEMA||
 profile?.schema!=='AIG_REAL3D_12_BAND_IMAGE_COVERAGE_DELTA_V1'||
 !Array.isArray(profile.bands)||profile.bands.length!==12)
  throw Error('ANATOMY_REGION_SOURCE_DATA_MISSING');
 const p=projection.markerPixelPositions;
 const regions=[
  {id:'HEAD_TO_NECK',from:'headTop',to:'neckBase'},
  {id:'SHOULDER_TO_PELVIS',from:'leftShoulder',to:'pelvis'},
  {id:'PELVIS_TO_KNEE',from:'pelvis',to:'leftKnee'},
  {id:'KNEE_TO_HEEL',from:'leftKnee',to:'leftHeel'}
 ];
 return {
  schema:'AIG_REAL3D_MARKER_ALIGNED_SILHOUETTE_BAND_REVIEW_V1',
  angle:projection.angle,sourceSha256:projection.sourceSha256,
  segments:regions.map(region=>{
   const top=Math.max(0,Math.min(projection.height,
    Math.min(p[region.from].y,p[region.to].y)));
   const bottom=Math.max(0,Math.min(projection.height,
    Math.max(p[region.from].y,p[region.to].y)));
   let weight=0,coverageDelta=0,centerDelta=0,centerWeight=0;
   for(const b of profile.bands){
    const overlap=Math.max(0,Math.min(bottom,b.endYExclusive)-
     Math.max(top,b.startY));
    if(!overlap)continue;
    weight+=overlap;
    coverageDelta+=overlap*b.signedCoverageDeltaPx;
    if(b.imageCentroidXDeltaPx!==null){
     centerWeight+=overlap;centerDelta+=overlap*b.imageCentroidXDeltaPx;
    }
   }
   return {
    ...region,topPx:round(top),bottomPx:round(bottom),
    supportingPixelRows:round(weight),
    meanSignedCoverageDeltaPxPerRow:weight?round(coverageDelta/weight):null,
    meanCentroidXDeltaPx:centerWeight?round(centerDelta/centerWeight):null,
    onlyMarkerBoundedHeightNotAnatomicalRegionSegmentation:true
   };
  }),
  sourceAnatomyWasNotInferredFromPixels:true,
  regionsAreApproximatedFrom12Bands:true,
  noAutomaticApproval:true,releasePASS:false
 };
}
