/** AIG FastModel 7.6: source-constrained editable facial DEPTH PRIOR.
 * 7.5 supplies user-reviewed true XY landmark points. 7.6 supplies smooth,
 * bounded, explicitly ESTIMATED Z protrusions. No stereo/depth scan evidence.
 * Inverse mapping of Z plus 7.5 XYZ expressions returns ORIGINAL photo UV.
 * No fabricated hair, backside face, production skin or anatomical head claim.
 */
import {sampleAIG75SDF,prepareAIG75Pose,auditAIG75Rig} from './aig-landmark-rig-7-5.mjs';
import {shadeAIG73Surface,makeAIG73Makeup} from './aig-face-material-7-3.mjs';
export const AIG76_SCHEMA='AIG_FASTMODEL_7_6_REVIEWED_XY_ESTIMATED_DEPTH_PRIORS';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const finite=Number.isFinite;
const add=(a,b)=>a.map((v,i)=>v+b[i]),mul=(a,x)=>a.map(v=>v*x);
const norm=a=>{const l=Math.hypot(...a);return l>1e-12?mul(a,1/l):[0,0,1]};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export function createAIG76DepthSettings({nose=.025,eyeSockets=.009,lips=.014,chin=.008,
 bridge=.010,globalDepthScale=1}={}){
 if(![nose,eyeSockets,lips,chin,bridge].every(x=>finite(x)&&x>=0&&x<=.07)||
  !finite(globalDepthScale)||globalDepthScale<0||globalDepthScale>1.5)throw Error('AIG76_DEPTH_SETTINGS_INVALID');
 return {nose,eyeSockets,lips,chin,bridge,globalDepthScale,
  mode:'ESTIMATED_FROM_SINGLE_PHOTO_NO_DEPTH_SENSOR',depthConfidence:'LOW',
  sourceDepthMeasured:false};
}
function gauss(q,center,rx,ry){
 const x=(q[0]-center[0])/rx,y=(q[1]-center[1])/ry;
 return Math.exp(-2.5*(x*x+y*y));
}
export function createAIG76DepthProfile(rig,settings={}){
 if(rig?.schema!=='AIG_FASTMODEL_7_5_REVIEWED_XY_LANDMARK_3D_FACIAL_RIG'||
  !rig.landmarks?.reviewed||!rig.field?.xyBounds)throw Error('AIG76_REVIEWED_RIG_REQUIRED');
 const opts=createAIG76DepthSettings(settings),fw=rig.faceWidth,fh=rig.faceHeight;
 // Coordinates anchor to 2D reviewed feature positions, never to invented features.
 const specs=[
  ['nose',opts.nose,rig.handles.nose,fw*.21,fh*.17],
  ['bridge',opts.bridge,[rig.handles.nose[0],(rig.handles.nose[1]+rig.handles.leftBrow[1]+rig.handles.rightBrow[1])/3,rig.field.halfDepth],fw*.17,fh*.24],
  ['leftEye',-opts.eyeSockets,rig.handles.leftEye,fw*.18,fh*.11],
  ['rightEye',-opts.eyeSockets,rig.handles.rightEye,fw*.18,fh*.11],
  ['upperLip',opts.lips*.65,rig.handles.upperLip,fw*.20,fh*.10],
  ['lowerLip',opts.lips,rig.handles.lowerLip,fw*.20,fh*.10],
  ['chin',opts.chin,rig.handles.chin,fw*.34,fh*.19]
 ];
 return {schema:AIG76_SCHEMA,rig,settings:opts,
  contributions:specs.filter(([,d])=>Math.abs(d)>0).map(([name,d,p,rx,ry])=>({
   name,depth:d*opts.globalDepthScale,x:p[0],y:p[1],
   invRx2:1/(rx*rx),invRy2:1/(ry*ry)
  })),measurement:'USER_REVIEWED_XY_ONLY_Z_ESTIMATED',
  confirmedPhotogrammetricDepth:false,headNeckMeshVerified:false,sourceImageImmutable:true};
}
export function depthAIG76At(profile,x,y){
 if(profile?.schema!==AIG76_SCHEMA||![x,y].every(finite))throw Error('AIG76_DEPTH_QUERY_INVALID');
 let z=0;
 for(const spec of profile.contributions){
  const dx=x-spec.x,dy=y-spec.y;
  z+=spec.depth*Math.exp(-2.5*(dx*dx*spec.invRx2+dy*dy*spec.invRy2));
 }
 return z;
}
function surfaceWeight(z,h){
 // Zero on unseen backside, smooth rise to 1 near observed front surface.
 return clamp((z+h)/(h*2),0,1)**3;
}
export function deformAIG76Depth(profile,point){
 if(!Array.isArray(point)||point.length!==3||!point.every(finite))throw Error('AIG76_POINT_INVALID');
 const h=profile.rig.field.halfDepth;
 return [point[0],point[1],point[2]+depthAIG76At(profile,point[0],point[1])*surfaceWeight(point[2],h)];
}
export function undoAIG76Depth(profile,world,{iterations=9}={}){
 if(!Array.isArray(world)||world.length!==3||!world.every(finite)||!Number.isInteger(iterations)||iterations<1||iterations>16)throw Error('AIG76_INVERSE_INVALID');
 const [x,y,z]=world,h=profile.rig.field.halfDepth,d=depthAIG76At(profile,x,y);
 let refZ=z;
 for(let i=0;i<iterations;i++)refZ=z-d*surfaceWeight(refZ,h);
 return [x,y,refZ];
}
export function sampleAIG76Face(profile,expression,point){
 if(!Array.isArray(point)||point.length!==3||!point.every(finite))throw Error('AIG76_SAMPLE_INVALID');
 const pose=prepareAIG75Pose(profile.rig,expression);
 const preDepth=undoAIG76Depth(profile,point);
 const result=sampleAIG75SDF(profile.rig,pose,preDepth);
 return {distance:result.distance,referencePoint:result.referencePoint,
  measuredSource:'MANUALLY_REVIEWED_XY',estimatedUnseenDepth:true};
}
function normalAIG76(profile,pose,world,delta=.003){
 const coords=[];
 for(let axis=0;axis<3;axis++){
  const a=[...world],b=[...world];a[axis]+=delta;b[axis]-=delta;
  coords.push(sampleAIG76Face(profile,pose,a).distance-sampleAIG76Face(profile,pose,b).distance);
 }
 return norm(coords);
}
export function auditAIG76Depth(profile,expression={}, {grid=7,step=.002}={}){
 if(profile?.schema!==AIG76_SCHEMA||!Number.isInteger(grid)||grid<3||grid>16||
  !finite(step)||step<.0005||step>.02)throw Error('AIG76_AUDIT_SETTINGS_INVALID');
 const pose=prepareAIG75Pose(profile.rig,expression);
 const roi=profile.rig.landmarks.roi,[hx,hy]=profile.rig.field.xyBounds,h=profile.rig.field.halfDepth;
 let minZDerivative=Infinity,minDepth=Infinity,maxDepth=-Infinity,maxRoundtripError=0,folds=0;
 for(let j=0;j<grid;j++)for(let i=0;i<grid;i++){
  const x=((roi.x+roi.width*(i+.5)/grid)-.5)*hx*2,
   y=(.5-(roi.y+roi.height*(j+.5)/grid))*hy*2;
  const d=depthAIG76At(profile,x,y);minDepth=Math.min(minDepth,d);maxDepth=Math.max(maxDepth,d);
  for(const z of [-h,0,h]){
   const a=deformAIG76Depth(profile,[x,y,z+step])[2],b=deformAIG76Depth(profile,[x,y,z-step])[2],
    derivative=(a-b)/(2*step);
   minZDerivative=Math.min(minZDerivative,derivative);
   if(!finite(derivative)||derivative<=.25)folds++;
   const world=deformAIG76Depth(profile,[x,y,z]),ref=undoAIG76Depth(profile,world);
   maxRoundtripError=Math.max(maxRoundtripError,Math.abs(ref[2]-z));
  }
 }
 const pass=folds===0&&maxRoundtripError<=.003;
 return {schema:'AIG_FASTMODEL_7_6_DEPTH_PRIOR_JACOBIAN_GATE',
  sampleCount:grid*grid*3,minZDerivative,minDepth,maxDepth,maxRoundtripError,
  folds,passed:pass,expressionPoseVerified:pose._aig75Prepared===true,
  sourceXYLandmarksReviewed:true,trueMeasured3DDepth:false,
  photoCharacterIdentityVerified:false};
}
export function raycastAIG76Face(profile,pose,eye,direction,{maxSteps=84,maxDistance=4,epsilon=.002}={}){
 if(!Array.isArray(eye)||eye.length!==3||!eye.every(finite)||!Array.isArray(direction)||direction.length!==3||!direction.every(finite)||
  Math.hypot(...direction)<1e-9||!Number.isInteger(maxSteps)||maxSteps<8||maxSteps>180||
  !finite(maxDistance)||maxDistance<=0||!finite(epsilon)||epsilon<=0)throw Error('AIG76_RAY_INPUT_INVALID');
 const p=prepareAIG75Pose(profile.rig,pose),dir=norm(direction);
 let t=0;
 for(let j=0;j<maxSteps&&t<maxDistance;j++){
  const world=add(eye,mul(dir,t)),result=sampleAIG76Face(profile,p,world);
  if(result.distance<=epsilon){
   return {hit:true,point:world,referencePoint:result.referencePoint,
    normal:normalAIG76(profile,p,world),distance:t,steps:j+1};
  }
  t+=clamp(result.distance*.34,.0025,.07);
 }
 return {hit:false,point:null,referencePoint:null,normal:null,distance:null,steps:maxSteps};
}
export function renderAIG76DepthAvatar(profile,image,{expression={},cosmetics={},width=34,height=32,maxSteps=78,yaw=0,pitch=0}={}){
 if(profile?.schema!==AIG76_SCHEMA||!image||!Number.isInteger(width)||!Number.isInteger(height)||
 width<16||height<16||width*height>10000||![yaw,pitch].every(finite)||Math.abs(pitch)>1.35||
 !Number.isInteger(maxSteps)||maxSteps<8||maxSteps>180)throw Error('AIG76_RENDER_INPUT_INVALID');
 const pose=prepareAIG75Pose(profile.rig,expression),facialGate=auditAIG75Rig(profile.rig,pose,{grid:5}),audit=auditAIG76Depth(profile,pose,{grid:5});
 if(!audit.passed||!facialGate.passed)throw Error('AIG76_DEPTH_OR_FACE_FOLD_BLOCKED');
 const makeup=makeAIG73Makeup(cosmetics),pixels=new Uint8ClampedArray(width*height*4);
 const eye=[2*Math.sin(yaw)*Math.cos(pitch),2*Math.sin(pitch),2*Math.cos(yaw)*Math.cos(pitch)],
  fwd=norm(mul(eye,-1)),right=norm(cross(fwd,[0,1,0])),up=norm(cross(right,fwd));
 let hitPixels=0,photoPixels=0,neutralRearPixels=0,cosmeticPixels=0;
 for(let j=0;j<height;j++)for(let i=0;i<width;i++){
  const at=(j*width+i)*4,dx=((i+.5)/width-.5)*1.45*width/height,dy=(.5-(j+.5)/height)*1.45,
   origin=add(eye,add(mul(right,dx),mul(up,dy))),
   ray=raycastAIG76Face(profile,pose,origin,fwd,{maxSteps});
  let rgb=[3,10,19];
  if(ray.hit){
   hitPixels++;
   const shaded=shadeAIG73Surface({image,field:profile.rig.field,
    roi:profile.rig.landmarks.roi,makeup,point:ray.referencePoint,normal:ray.normal});
   rgb=shaded.rgb;
   if(shaded.source==='SOURCE_PHOTO_FRONT_PROJECTION'){photoPixels++;if(shaded.cosmeticOpacity>.02)cosmeticPixels++;}
   else neutralRearPixels++;
  }
  pixels.set([...rgb,255],at);
 }
 return {schema:'AIG_FASTMODEL_7_6_DEPTH_AWARE_3D_RAY_RENDER',
  width,height,pixels,hitPixels,photoPixels,neutralRearPixels,cosmeticPixels,cameraYaw:yaw,cameraPitch:pitch,
  audit,facialGate,sourcePhotoFaceFrontOnly:true,estimatedHeadDepth:true,
  measuredPhotoGeometryZ:false,hairNeckContinuityApproved:false,realCharacterAppearanceApproved:false};
}
