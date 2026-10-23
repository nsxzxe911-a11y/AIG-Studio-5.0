/**
 * Stage1 TRUE FRONTAL orthographic camera. Human geometry remains in 0.001mm
 * canonical contract; this module only consumes measured real XYZ bounds.
 *
 * Eye stays exactly on -Z, same X/Y as model's bounds midpoint: NO yaw,
 * pitch, roll, tilted "front" or perspective distortion. Portrait framing
 * uses the actual target aspect, not the CSS parent panel.
 */
import {measureAIGStage1Bounds}
 from './aig-stage1-unified-19200-ratio-core.mjs';
export const AIG_STAGE1_TRUE_FRONT_SCHEMA='AIG_STAGE1_FRONT_ORTHO_ZERO_YAW_NO_DISTORT_V1';
const bad=s=>{throw Error('AIG_STAGE1_FRONT_'+s)};
const finite=n=>Number.isFinite(n)&&typeof n==='number';
export function fitAIGStage1TrueFrontCamera(model,{
 width=1080,height=1920,targetBodyHeight=.82,
 maxBodyWidth=.86
}={}){
 if(!Number.isInteger(width)||!Number.isInteger(height)||
  width<240||height<240||!finite(targetBodyHeight)||
  targetBodyHeight<.72||targetBodyHeight>.86||
  !finite(maxBodyWidth)||maxBodyWidth<.6||maxBodyWidth>.94)
  bad('OUTPUT_SIZE_OR_BODY_MARGIN_INVALID');
 const bounds=measureAIGStage1Bounds(model);
 const bodyHeight=bounds.size[1],bodyWidth=bounds.size[0];
 if(bodyHeight<=0||bodyWidth<=0)bad('BODY_BOUNDING_BOX_INVALID');
 const aspect=width/height;
 const frameHeight=Math.max(
  bodyHeight/targetBodyHeight,
  bodyWidth/(maxBodyWidth*aspect));
 const frameWidth=frameHeight*aspect;
 const center=bounds.center;
 const depth=bounds.size[2];
 const cameraDistance=Math.max(3,bodyHeight*3,depth*5);
 const eye=[center[0],center[1],bounds.min[2]-cameraDistance];
 const target=[center[0],center[1],center[2]];
 const heightFraction=bodyHeight/frameHeight;
 const widthFraction=bodyWidth/frameWidth;
 const errors=[];
 if(heightFraction<.7||heightFraction>.86001)
  errors.push('BODY_HEIGHT_NOT_FULLY_FRAMED');
 if(widthFraction>maxBodyWidth+.001)
  errors.push('BODY_WIDTH_CROPPED');
 if(Math.abs(eye[0]-target[0])>1e-10||
  Math.abs(eye[1]-target[1])>1e-10)
  errors.push('CAMERA_PITCH_OR_YAW_INVALID');
 if(!(eye[2]<bounds.min[2]))errors.push('CAMERA_NOT_IN_FRONT');
 const viewport={width,height,aspect};
 const report={
  schema:AIG_STAGE1_TRUE_FRONT_SCHEMA,
  gender:model.gender,projection:'orthographic',
  view:'front',frontWorldSide:'-Z',
  cameraYawDeg:0,cameraPitchDeg:0,cameraRollDeg:0,
  orthographicBox:{
   left:-frameWidth/2,right:frameWidth/2,
   top:frameHeight/2,bottom:-frameHeight/2,
   near:.01,far:Math.max(40,cameraDistance*8)
  },
  viewport,eye,target,up:[0,1,0],
  cameraDistanceMm:Math.round((target[2]-eye[2])*1000000)/1000,
  bodyHeightMm:Math.round(bodyHeight*1000000)/1000,
  bodyWidthMm:Math.round(bodyWidth*1000000)/1000,
  bodyScreenHeightFraction:bodyHeight/frameHeight,
  bodyScreenWidthFraction:bodyWidth/frameWidth,
  topMarginFraction:(1-heightFraction)/2,
  footMarginFraction:(1-heightFraction)/2,
  targetBodyHeight,
  sourceBoundsMm:bounds.sizeMM,
  sourceAABBCenterMm:bounds.centerMM,
  pixelResizeCannotChangeSourceMm:true,
  actualSourceVerticesMeasured:bounds.actualMeasuredXYZVertices,
  projectedGeometryErrors:errors,
  numericalFrontalFramingPASS:errors.length===0,
  actualGPUImageAndUserVisualReviewStillRequired:true
 };
 return Object.freeze(report);
}
export function auditAIGStage1FrontClip(model,framing){
 if(framing?.schema!==AIG_STAGE1_TRUE_FRONT_SCHEMA)
  bad('FRONTAL_CAMERA_CONTRACT_REQUIRED');
 const {left,right,top,bottom}=framing.orthographicBox;
 const [cx,cy]=framing.target;
 const errors=[];
 let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
 let count=0;
 for(const part of model.parts){
  const xyz=part.geometry.positions;
  for(let i=0;i<xyz.length;i+=3){
   const x=xyz[i]-cx,y=xyz[i+1]-cy;
   if(!finite(x)||!finite(y))bad('ACTUAL_VERTEX_NOT_FINITE');
   minX=Math.min(minX,x);maxX=Math.max(maxX,x);
   minY=Math.min(minY,y);maxY=Math.max(maxY,y);
   count++;
  }
 }
 const dx=Math.min(minX-left,right-maxX)/(right-left);
 const dy=Math.min(minY-bottom,top-maxY)/(top-bottom);
 if(dx<.035)errors.push('REAL_ARM_OR_HAND_CLIPPED');
 if(dy<.04)errors.push('REAL_HEAD_OR_FEET_CLIPPED');
 const ratio=(maxY-minY)/(top-bottom);
 if(ratio<.7||ratio>.861)errors.push('ACTUAL_BODY_FRONTAL_SCALE_INVALID');
 return Object.freeze({
  schema:AIG_STAGE1_TRUE_FRONT_SCHEMA,
  actualVerticesChecked:count,
  minimumHorizontalSafeMarginFraction:dx,
  minimumVerticalSafeMarginFraction:dy,
  actualBodyHeightFraction:ratio,
  originalGeometryChanged:false,
  clipViolations:Object.freeze(errors),
  frontalGeometryClipPASS:errors.length===0,
  realPixelContentStillRequiresGPUCapture:true,
  stage1HumanAppearancePASS:false
 });
}
