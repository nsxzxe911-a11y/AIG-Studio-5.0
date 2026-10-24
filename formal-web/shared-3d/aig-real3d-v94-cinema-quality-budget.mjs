/**
 * V94 actual source model vs cinematic shot resolution budget.
 * Material texture channels are evidence only, NOT invented geometry detail.
 * Does not render new pixels or falsely certify PBR/physical accuracy.
 */
import {AIG_REAL3D_V94_STRUCTURE_SCHEMA}
 from './aig-real3d-v94-source-structure-audit.mjs';
import {AIG_REAL3D_V94_MOTION_SCHEMA}
 from './aig-real3d-v94-dynamic-topology-gate.mjs';
export const AIG_REAL3D_V94_CINEMA_SCHEMA=
 'AIG_REAL3D_V94_GEOMETRY_FIRST_CINEMATIC_BUDGET_V1';
const bad=s=>{throw Error('REAL3D_V94_CINEMA_'+s);};
const sha=s=>typeof s==='string'&&/^[a-f0-9]{64}$/i.test(s);
const finite=Number.isFinite;
export const AIG_REAL3D_V94_MATERIAL_CHANNELS=Object.freeze([
 'ALBEDO','METALLIC_ROUGHNESS','TANGENT_NORMAL','AMBIENT_OCCLUSION',
 'HEIGHT','CLEARCOAT','EMISSIVE']);
export function evaluateAIGReal3DCinemaGeometryFirst({
 structure,motion=null,materialParts=[],shot={
  widthPx:1920,heightPx:1080,cameraOrthoSpanMeters:2.4,
  maxProjectedSourceEdgePx:18,minTextureTexelsPerScreenPixel:1
 }
}={}){
 if(structure?.schema!==AIG_REAL3D_V94_STRUCTURE_SCHEMA||
  motion!==null&&(motion.schema!==AIG_REAL3D_V94_MOTION_SCHEMA||
   motion.sourceSha256!==structure.sourceSha256)||
  !Array.isArray(materialParts)||materialParts.length>64||
  !shot||!Number.isInteger(shot.widthPx)||shot.widthPx<64||shot.widthPx>7680||
  !Number.isInteger(shot.heightPx)||shot.heightPx<64||shot.heightPx>4320||
  !finite(shot.cameraOrthoSpanMeters)||shot.cameraOrthoSpanMeters<=0||
  !finite(shot.maxProjectedSourceEdgePx)||shot.maxProjectedSourceEdgePx<.1||
  !finite(shot.minTextureTexelsPerScreenPixel)||
  shot.minTextureTexelsPerScreenPixel<.1)
  bad('SOURCE_SHOT_PARAMS_INVALID');
 const reports=new Map(structure.parts.map(p=>[p.partId,p]));
 const assigned=new Set(),pixelsPerMeter=shot.heightPx/shot.cameraOrthoSpanMeters;
 const material=materialParts.map((p,i)=>{
  if(typeof p?.partId!=='string'||!reports.has(p.partId)||
   assigned.has(p.partId)||!Array.isArray(p.channels)||
   p.channels.length<1||p.channels.length>7)
   bad('SOURCE_MATERIAL_MISMATCH_'+i);
  assigned.add(p.partId);
  const uniq=new Set(),channelReports=p.channels.map((c,j)=>{
   if(!AIG_REAL3D_V94_MATERIAL_CHANNELS.includes(c?.channel)||
    uniq.has(c.channel)||!sha(c.sourceImageSHA)||
    !Number.isInteger(c.widthPx)||c.widthPx<2||c.widthPx>8192||
    !Number.isInteger(c.heightPx)||c.heightPx<2||c.heightPx>8192||
    typeof c.sourceUVVerified!=='boolean')
    bad('MATERIAL_SOURCE_CHANNEL_INVALID_'+i+'_'+j);
   uniq.add(c.channel);
   const dimensions=reports.get(p.partId).geometry.dimensionsMeters,
    maxPartSize=Math.max(...dimensions);
   const texelDensity=Math.min(c.widthPx,c.heightPx)/Math.max(maxPartSize,1e-8),
    neededDensity=pixelsPerMeter*shot.minTextureTexelsPerScreenPixel;
   return {channel:c.channel,imageSha256:c.sourceImageSHA,
    widthPx:c.widthPx,heightPx:c.heightPx,
    sourceUVVerified:c.sourceUVVerified,
    estimatedMinTexelsPerMeter:Math.round(texelDensity),
    requiredScreenTexelsPerMeter:Math.round(neededDensity),
    conservativeResolutionBudgetPASS:texelDensity>=neededDensity,
    noTruePhysicalBRDFCertification:true};
  });
  const present=new Set(channelReports.map(x=>x.channel));
  const hasBase=present.has('ALBEDO'),
   hasRoughness=present.has('METALLIC_ROUGHNESS'),
   hasNormal=present.has('TANGENT_NORMAL'),
   sourceUVOK=channelReports.every(c=>c.sourceUVVerified);
  // Strict film candidate requires source-based base/roughness/normal channels.
  // Declared shader/material channels alone don't prove final optical quality.
  return {partId:p.partId,channels:channelReports,
   missingMandatoryChannels:['ALBEDO','METALLIC_ROUGHNESS','TANGENT_NORMAL']
    .filter(x=>!present.has(x)),
   materialSourceGatePASS:hasBase&&hasRoughness&&hasNormal&&sourceUVOK,
   cinemaTextureResolutionEstimatePASS:channelReports.every(c=>
    c.conservativeResolutionBudgetPASS),
   sourceGeometryNotImprovedByTexture:true};
 });
 const parts=structure.parts.map(part=>{
  const screenLongestSizePx=Math.max(...part.geometry.dimensionsMeters)*pixelsPerMeter;
  // True maximum triangle edge projection needs source vertex geometry and
  // camera pose. Never claim a shot closeup geometry pass using AABB only.
  return {partId:part.partId,role:part.role,
   approximateMaxAABBDimensionInShotPx:Math.round(screenLongestSizePx),
   originalIndexedTriangleCount:part.geometry.rawIndexedTriangles,
   rawIndexedTopologyPASS:part.sourceTopologyPASS,
   normalOrCreaseReviewRequired:part.geometryQualityNeedsHumanReview,
   silhouetteCurveErrorPx:null,
   sourceEdgeProjectionCalibrated:false,
   independentlyMeasuredDepthAccuracy:false,
   partScreenGeometryResolutionPASS:false};
 });
 return {schema:AIG_REAL3D_V94_CINEMA_SCHEMA,
  sourceSha256:structure.sourceSha256,
  outputWidthPx:shot.widthPx,outputHeightPx:shot.heightPx,
  cameraOrthoSpanMeters:shot.cameraOrthoSpanMeters,
  sourceGeometryGatePASS:structure.sourceTopologyGatePASS,
  measuredOriginalDepthAndThicknessPASS:structure.measurementsWithinTolerance,
  originalPoseTopologyAndContinuityPASS:motion?.sourceMotionGeometryGatePASS??false,
  declaredMaterialSourcesPASS:assigned.size===reports.size&&material.every(m=>
   m.materialSourceGatePASS),
  cinemaTextureBudgetEstimatedPASS:material.length>0&&material.every(m=>
   m.cinemaTextureResolutionEstimatePASS),
  partShotDiagnostics:parts,materialDiagnostics:material,
  noSourceGeometryFabrication:true,
  GPURealTimeMeasuredFPS:null,
  independentlyVerifiedPBROptics:false,
  independentlyVerifiedPhotoSilhouetteMatch:false,
  filmCloseupGeometryDetailPASS:false,
  finalCinemaQualityPASS:false,releasePASS:false};
}
