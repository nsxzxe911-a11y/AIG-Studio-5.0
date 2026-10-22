/**
 * FastModel 7.12 | CAD-grid-to-physical-3D registration.
 *
 * A *physically present and size-verified* CAD grid/reference plane is observed
 * in both images. At least origin (0,0), X(1,0), Y(0,1), XY(1,1) grid
 * intersections are manually identified in each photo. Known millimetre
 * spacing derives monocular relative 3D model scale and X/Y/Z CAD coordinates.
 *
 * WARNING: drawing a grid over a photo is NOT a physical size measurement.
 * This module never treats decorative/virtual-only overlay as verified scale.
 */
export const AIG712_CAD_GRID_SCHEMA='AIG_FASTMODEL_7_12_PHYSICAL_CAD_GRID_XYZ_MM';
const finite=Number.isFinite;
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
const sub=(a,b)=>a.map((x,i)=>x-b[i]);
const add=(a,b)=>a.map((x,i)=>x+b[i]);
const mul=(a,s)=>a.map(x=>x*s);
const length=a=>Math.hypot(...a);
const unit=a=>mul(a,1/(length(a)||1));
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const mv=(m,v)=>m.map(row=>dot(row,v));
const median=s=>{const sorted=[...s].sort((a,b)=>a-b);return sorted[Math.floor(sorted.length/2)];};
function validPixel(p,c){
 return p&&finite(p.x)&&finite(p.y)&&p.x>=0&&p.x<c.width&&p.y>=0&&p.y<c.height;
}
function isPose(p){
 return p?.schema==='AIG_FASTMODEL_7_12_VERIFIED_RELATIVE_VIDEO_CAMERA_POSE'&&
  p.poseDirectionAndRotationEstimated===true&&
  Array.isArray(p.rotation)&&p.rotation.length===3&&
  p.rotation.every(row=>Array.isArray(row)&&row.length===3&&row.every(finite))&&
  Array.isArray(p.translationDirection)&&p.translationDirection.length===3&&
  p.translationDirection.every(finite);
}
export function createAIG712CADGrid({
 cellMm,referenceMethod='PHYSICAL_CAD_GRID_IN_VIDEO',physicalReferenceReviewed=false,
 matchedSourceReviewed=false,originXmm=0,originYmm=0
}={}){
 if(!finite(cellMm)||cellMm<.001||cellMm>2000||
 !finite(originXmm)||!finite(originYmm)||
 !['PHYSICAL_CAD_GRID_IN_VIDEO','CAD_SCALED_TARGET_CAPTURED_IN_VIDEO'].includes(referenceMethod)||
 !physicalReferenceReviewed||!matchedSourceReviewed)
  throw Error('AIG712_CAD_PHYSICAL_GRID_AND_CELL_MM_REVIEW_REQUIRED');
 return Object.freeze({
  schema:AIG712_CAD_GRID_SCHEMA,cellMm,referenceMethod,
  physicalReferenceReviewed:true,matchedSourceReviewed:true,
  originXmm,originYmm,cellCoordinateSystem:'CAD_X_RIGHT_Y_UP_MM',
  precisionMm:.001,virtualOverlayAloneProvidesScale:false
 });
}
export function triangulateAIG712CADReference(pose,camera,left,right){
 if(!isPose(pose)||camera?.schema!==pose.schema||
 camera.sourceSHA256!==pose.calibrationSourceSHA256||
 !validPixel(left,camera)||!validPixel(right,camera))
  throw Error('AIG712_CAD_CAMERA_OR_SOURCE_MISMATCH');
 const a=[(left.x-camera.cx)/camera.fx,(left.y-camera.cy)/camera.fy,1],
  b=[(right.x-camera.cx)/camera.fx,(right.y-camera.cy)/camera.fy,1],
  ra=mv(pose.rotation,a),t=pose.translationDirection;
 const aa=dot(ra,ra),ab=-dot(ra,b),bb=dot(b,b),
  rhsA=-dot(ra,t),rhsB=dot(b,t),det=aa*bb-ab*ab;
 if(!finite(det)||det<1e-10)throw Error('AIG712_CAD_INSUFFICIENT_PARALLAX');
 const depthA=(rhsA*bb-rhsB*ab)/det,
  depthB=(aa*rhsB-ab*rhsA)/det;
 if(depthA<=0||depthB<=0||!finite(depthA)||!finite(depthB))
  throw Error('AIG712_CAD_CHEIRALITY_INVALID');
 const P=mul(a,depthA),Q=add(mv(pose.rotation,P),t),
  reprojectionError=Math.hypot(P[0]/P[2]-a[0],P[1]/P[2]-a[1],
   Q[0]/Q[2]-b[0],Q[1]/Q[2]-b[1]);
 const parallaxAngleRad=Math.acos(Math.max(-1,Math.min(1,dot(unit(ra),unit(b)))));
 if(!finite(reprojectionError)||reprojectionError>.012||parallaxAngleRad<.004)
  throw Error('AIG712_CAD_REPROJECTION_OR_PARALLAX_BLOCKED');
 return {xyzRelative:P,depthA,depthB,reprojectionError,parallaxAngleRad,
  relativeUnitsOnly:true,actualMillimetresKnown:false};
}
export function calibrateAIG712CADGrid(pose,camera,grid,markers){
 if(!isPose(pose)||camera?.schema!==pose.schema||
 grid?.schema!==AIG712_CAD_GRID_SCHEMA||
 camera.sourceSHA256!==pose.calibrationSourceSHA256||
 !Array.isArray(markers)||markers.length<4||markers.length>40||
 pose.inlierFraction<.60||pose.medianParallaxDegrees<.40)
  throw Error('AIG712_CAD_VERIFIED_POSE_GRID_AND_MARKERS_REQUIRED');
 const found=new Map(),sample=[];
 for(const item of markers){
  if(!item||!Number.isInteger(item.ix)||!Number.isInteger(item.iy)||
   Math.abs(item.ix)>1000||Math.abs(item.iy)>1000||
   !item.reviewed||!validPixel(item.left,camera)||!validPixel(item.right,camera))
   throw Error('AIG712_CAD_REVIEWED_GRID_INTERSECTION_REQUIRED');
  const key=item.ix+','+item.iy;
  if(found.has(key))throw Error('AIG712_CAD_DUPLICATE_GRID_INTERSECTION');
  const point=triangulateAIG712CADReference(pose,camera,item.left,item.right);
  const observation={ix:item.ix,iy:item.iy,
   xyzRelative:point.xyzRelative,
   sourceA:{...item.left},sourceB:{...item.right},
   reprojectionError:point.reprojectionError};
  found.set(key,observation);sample.push(observation);
 }
 for(const key of ['0,0','1,0','0,1','1,1']){
  if(!found.has(key))throw Error('AIG712_CAD_ORIGIN_AND_AXES_REQUIRED');
 }
 const ratios=[],separations=[];
 for(let i=0;i<sample.length;i++)for(let j=i+1;j<sample.length;j++){
  const a=sample[i],b=sample[j],
   mm=Math.hypot(a.ix-b.ix,a.iy-b.iy)*grid.cellMm,
   rel=length(sub(a.xyzRelative,b.xyzRelative));
  if(rel<1e-7||!finite(rel))throw Error('AIG712_CAD_GRID_3D_COLLAPSE_BLOCKED');
  ratios.push(mm/rel);separations.push({mm,relative:rel});
 }
 if(ratios.length<6)throw Error('AIG712_CAD_NOT_ENOUGH_BASELINES');
 const mmPerRelativeUnit=median(ratios);
 const errors=ratios.map(v=>Math.abs(v/mmPerRelativeUnit-1));
 const medianRelativeError=median(errors),maxRelativeError=Math.max(...errors);
 if(!finite(mmPerRelativeUnit)||mmPerRelativeUnit<=0||
 medianRelativeError>.08||maxRelativeError>.24)
  throw Error('AIG712_CAD_GRID_SCALE_INCONSISTENT');
 const o=found.get('0,0').xyzRelative,
  gx=sub(found.get('1,0').xyzRelative,o),
  gy=sub(found.get('0,1').xyzRelative,o),
  ux=unit(gx),orth=sub(gy,mul(ux,dot(gy,ux))),uy=unit(orth),
  uz=unit(cross(ux,uy));
 const axisAngle=Math.abs(dot(unit(gx),unit(gy)));
 if(length(orth)<.1*length(gy)||axisAngle>.20)
  throw Error('AIG712_CAD_GRID_NOT_ORTHOGONAL');
 const pointResiduals=sample.map(x=>{
  const delta=mul(sub(x.xyzRelative,o),mmPerRelativeUnit),
   cadX=dot(delta,ux),cadY=dot(delta,uy),cadZ=dot(delta,uz);
  return {ix:x.ix,iy:x.iy,xyErrorMm:Math.hypot(
   cadX-x.ix*grid.cellMm,cadY-x.iy*grid.cellMm),
   flatnessMm:Math.abs(cadZ)};
 });
 const maxXY= Math.max(...pointResiduals.map(x=>x.xyErrorMm)),
  maxFlatness=Math.max(...pointResiduals.map(x=>x.flatnessMm));
 if(maxXY>Math.max(.02,grid.cellMm*.22)||
  maxFlatness>Math.max(.02,grid.cellMm*.17))
  throw Error('AIG712_CAD_GRID_ORIGIN_ALIGNMENT_OR_PLANARITY_INVALID');
 return {
  schema:AIG712_CAD_GRID_SCHEMA,sourceSHA256:camera.sourceSHA256,
  originRelativeXYZ:[...o],basis:{X:[...ux],Y:[...uy],Z:[...uz]},
  mmPerRelativeUnit,originXmm:grid.originXmm,originYmm:grid.originYmm,
  cellMm:grid.cellMm,physicalReferenceMethod:grid.referenceMethod,
  markerCount:sample.length,pairCount:ratios.length,
  medianRelativeError,maxRelativeError,
  maxXYErrorMm:maxXY,maxPlanarityErrorMm:maxFlatness,
  markerSourceEvidence:sample.map(x=>({ix:x.ix,iy:x.iy,left:x.sourceA,right:x.sourceB,
   reprojectionError:x.reprojectionError})),
  realCadCoordinatesEnabled:true,metricScaleDependsOnReviewedPhysicalGrid:true,
  mereVirtualGridDoesNotCalibratePhoto:true,
  humanBodyGeometryApproved:false,complete3DSurfaceBuilt:false
 };
}
export function mapAIG712RelativeXYZToCAD(calibrated,xyz){
 if(calibrated?.schema!==AIG712_CAD_GRID_SCHEMA||!calibrated.realCadCoordinatesEnabled||
 !Array.isArray(xyz)||xyz.length!==3||!xyz.every(finite))
  throw Error('AIG712_CAD_METRIC_COORDINATE_NOT_VERIFIED');
 const d=mul(sub(xyz,calibrated.originRelativeXYZ),calibrated.mmPerRelativeUnit);
 return {
  xMm:calibrated.originXmm+dot(d,calibrated.basis.X),
  yMm:calibrated.originYmm+dot(d,calibrated.basis.Y),
  zMm:dot(d,calibrated.basis.Z),
  precisionMm:.001,sourceReferenceOnly:true
 };
}


/**
 * CAD 1:2 / 1:4 / 1:10 drawing reduction. Deliberately separate from
 * physical video-grid calibration. A printed/rendered grid at 1:10 has
 * 1/10 the length on the drawing, not 1/10 the *real-world* mm/mesh size.
 * NC/CAM true world XYZ and source calibration NEVER use drawing ratio.
 */
export const AIG712_CAD_DRAWING_SCALE_SCHEMA='AIG_FASTMODEL_7_12_CAD_DRAWING_VIEW_SCALE';
export const AIG712_CAD_DRAWING_SCALES=Object.freeze([
 Object.freeze({label:'1:1',denominator:1,factor:1}),
 Object.freeze({label:'1:2',denominator:2,factor:.5}),
 Object.freeze({label:'1:4',denominator:4,factor:.25}),
 Object.freeze({label:'1:10',denominator:10,factor:.1})
]);
export function createAIG712CADDrawingScale(gridOrCalibrated,{denominator=2}={}){
 const drawingRatio=AIG712_CAD_DRAWING_SCALES.find(x=>x.denominator===denominator);
 if(!drawingRatio||
  gridOrCalibrated?.schema!==AIG712_CAD_GRID_SCHEMA||
  !finite(gridOrCalibrated.cellMm)||gridOrCalibrated.cellMm<=0||
  !gridOrCalibrated.physicalReferenceReviewed&&!gridOrCalibrated.realCadCoordinatesEnabled)
  throw Error('AIG712_CAD_SCALE_REQUIRES_PHYSICAL_GRID_AND_APPROVED_RATIO');
 const grid=gridOrCalibrated.cellMm,
  originXmm=gridOrCalibrated.originXmm??0,originYmm=gridOrCalibrated.originYmm??0;
 return Object.freeze({
  schema:AIG712_CAD_DRAWING_SCALE_SCHEMA,
  ...drawingRatio,
  physicalCellMm:grid,
  drawingCellMm:grid* drawingRatio.factor,
  originXmm,originYmm,
  precisionMm:.001,
  physicallyCalibrated:gridOrCalibrated.realCadCoordinatesEnabled===true,
  physicalCalibrationUnmodified:true,
  trueWorldXYZImmutable:true,
  drawingScaleCannotEstablishPhysicalMeasurement:true,
  metricLabel:'縮尺圖面尺寸；實際物體尺寸不變'
 });
}
export function projectAIG712CADCoordinatesForDrawing(scale,point){
 if(scale?.schema!==AIG712_CAD_DRAWING_SCALE_SCHEMA||
  !point||![point.xMm,point.yMm,point.zMm].every(finite))
  throw Error('AIG712_CAD_DRAWING_POINT_INVALID');
 const ratio=scale.factor;
 return {
  actualMm:{x:point.xMm,y:point.yMm,z:point.zMm},
  plotMm:{
   x:(point.xMm-scale.originXmm)*ratio,
   y:(point.yMm-scale.originYmm)*ratio,
   z:point.zMm*ratio
  },
  reducedCellMm:scale.drawingCellMm,
  dimensionLabelMm:{
   x:point.xMm,y:point.yMm,z:point.zMm
  },
  drawingRatio:scale.label,
  worldMmUnmodified:true
 };
}
export function recoverAIG712CADWorldFromDrawing(scale,drawPoint){
 if(scale?.schema!==AIG712_CAD_DRAWING_SCALE_SCHEMA||!drawPoint||
 ![drawPoint.x,drawPoint.y,drawPoint.z].every(finite))
  throw Error('AIG712_CAD_SCALED_COORDINATE_INVALID');
 return {
  xMm:scale.originXmm+drawPoint.x/scale.factor,
  yMm:scale.originYmm+drawPoint.y/scale.factor,
  zMm:drawPoint.z/scale.factor,
  usedDrawingOnly:true
 };
}
