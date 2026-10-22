/** FastModel 7.5 — source-anchored reviewed 2D photo feature landmarks
 * drive a genuine 3D SDF facial deformation field and world-space ray normals.
 * Landmarks are USER-MARKED XY only, Z and face anatomy remain estimated.
 * No automatic identification, photogrammetric facial reconstruction, FEM,
 * production blend-shapes, approved character likeness or networked MMO.
 */
import {sampleImplicitVolume} from './aig-implicit-volume-7-1.mjs';
import {shadeAIG73Surface,makeAIG73Makeup} from './aig-face-material-7-3.mjs';
import {createAIG74Expression} from './aig-avatar-rig-7-4.mjs';
export const AIG75_SCHEMA='AIG_FASTMODEL_7_5_REVIEWED_XY_LANDMARK_3D_FACIAL_RIG';
export const AIG75_KEYS=Object.freeze(['leftEye','rightEye','leftBrow','rightBrow','nose','upperLip','lowerLip','mouthLeft','mouthRight','chin']);
const finite=Number.isFinite,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const norm=v=>{const d=Math.hypot(...v);return d>1e-12?v.map(x=>x/d):[0,0,1];};
const dot=(a,b)=>a.reduce((v,x,i)=>v+x*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const add=(a,b)=>a.map((v,i)=>v+b[i]);
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const scale=(a,v)=>a.map(x=>x*v);
export function suggestAIG75GuidePoints(roi){
 if(!roi||!['x','y','width','height'].every(k=>finite(roi[k]))||roi.width<.12||roi.height<.16||
  roi.x<0||roi.y<0||roi.x+roi.width>1||roi.y+roi.height>1)throw Error('AIG75_ROI_INVALID');
 const template={
  leftEye:[.33,.37],rightEye:[.67,.37],leftBrow:[.33,.26],rightBrow:[.67,.26],
  nose:[.50,.57],upperLip:[.50,.72],lowerLip:[.50,.79],
  mouthLeft:[.36,.755],mouthRight:[.64,.755],chin:[.50,.96]
 };
 const out={};for(const key of AIG75_KEYS){
  const [u,v]=template[key];out[key]=[roi.x+roi.width*u,roi.y+roi.height*v];
 }
 return {points:out,reviewed:false,origin:'UNVERIFIED_GUIDE_POINTS_NOT_IMAGE_DETECTION'};
}
export function createAIG75ReviewedLandmarks({roi,points,reviewed=false,sourceSHA256=null}={}){
 if(!roi?.reviewed||!['x','y','width','height'].every(k=>finite(roi[k]))||
  roi.width<.12||roi.height<.16||roi.x<0||roi.y<0||roi.x+roi.width>1||roi.y+roi.height>1||
  !points||typeof points!=='object'||Array.isArray(points)||
  Object.keys(points).length!==AIG75_KEYS.length||AIG75_KEYS.some(k=>!Object.hasOwn(points,k))||
  !reviewed)throw Error('AIG75_USER_REVIEW_AND_COMPLETE_LANDMARKS_REQUIRED');
 if(sourceSHA256!==null&&!/^[a-f0-9]{64}$/i.test(sourceSHA256))throw Error('AIG75_SOURCE_SHA_INVALID');
 const copy={};
 for(const key of AIG75_KEYS){
  const p=points[key];
  if(!Array.isArray(p)||p.length!==2||!p.every(finite)||p[0]<roi.x||p[0]>roi.x+roi.width||
   p[1]<roi.y||p[1]>roi.y+roi.height)throw Error('AIG75_LANDMARK_OUTSIDE_REVIEWED_ROI');
  copy[key]=[p[0],p[1]];
 }
 const p=copy,eyeY=Math.max(p.leftEye[1],p.rightEye[1]),browY=Math.max(p.leftBrow[1],p.rightBrow[1]);
 if(!(p.leftEye[0]+.03*roi.width<p.rightEye[0]&&p.leftBrow[0]<p.rightBrow[0]&&
  p.mouthLeft[0]+.03*roi.width<p.mouthRight[0]&&
  browY<Math.min(p.leftEye[1],p.rightEye[1])&&
  eyeY<p.nose[1]&&p.nose[1]<p.upperLip[1]&&
  p.upperLip[1]<p.lowerLip[1]&&p.lowerLip[1]<p.chin[1]&&
  p.mouthLeft[1]>eyeY&&p.mouthRight[1]>eyeY))throw Error('AIG75_FEATURE_TOPOLOGY_INVALID');
 return {schema:AIG75_SCHEMA,revision:1,points:copy,roi:{
  x:roi.x,y:roi.y,width:roi.width,height:roi.height,reviewed:true
 },reviewed:true,sourceSHA256:sourceSHA256?.toLowerCase()||null,
  origin:'USER_REVIEWED_2D_PIXEL_LOCATIONS',zDepthMeasured:false,
  faceIdentityVerified:false,facialBoneAnatomyVerified:false};
}
export function createAIG75Rig(field,landmarks,{strength=.55}={}){
 if(field?.schema!=='AIG_FASTMODEL_7_1_OBSERVED_2D_TO_EXPLICIT_3D_SDF'||
  landmarks?.schema!==AIG75_SCHEMA||!landmarks.reviewed||
  !finite(strength)||strength<0||strength>1)throw Error('AIG75_RIG_INPUT_INVALID');
 const [hx,hy]=field.xyBounds,fw=landmarks.roi.width*2*hx,fh=landmarks.roi.height*2*hy;
 const handles={};for(const key of AIG75_KEYS){
  const p=landmarks.points[key];
  handles[key]=[(p[0]-.5)*2*hx,(.5-p[1])*2*hy,field.halfDepth];
 }
 return {schema:AIG75_SCHEMA,field,landmarks,handles,strength,faceWidth:fw,faceHeight:fh,
  actual3DSurface:true,sourceLandmarksIn2D:true,observedFaceDepth:false};
}
function handleDelta(rig,expr,key){
 const h=rig.faceHeight,w=rig.faceWidth,s=rig.strength,dx=w*.068*s,dy=h*.095*s,dz=rig.field.halfDepth*.26*s;
 switch(key){
  case 'mouthLeft':return [-dx*expr.smile,dy*expr.smile-dy*.22*expr.jawOpen,dz*.25*expr.jawOpen];
  case 'mouthRight':return [dx*expr.smile,dy*expr.smile-dy*.22*expr.jawOpen,dz*.25*expr.jawOpen];
  case 'upperLip':return [0,dy*.10*expr.jawOpen,dz*.20*expr.jawOpen];
  case 'lowerLip':return [0,-dy*.78*expr.jawOpen,dz*.65*expr.jawOpen];
  case 'chin':return [0,-dy*.84*expr.jawOpen,-dz*.15*expr.jawOpen];
  case 'leftEye':return [0,-dy*.20*expr.blinkLeft,-dz*.74*expr.blinkLeft];
  case 'rightEye':return [0,-dy*.20*expr.blinkRight,-dz*.74*expr.blinkRight];
  case 'leftBrow':return [0,dy*.58*expr.browRaise,dz*.08*expr.browRaise];
  case 'rightBrow':return [0,dy*.58*expr.browRaise,dz*.08*expr.browRaise];
  default:return [0,0,0];
 }
}
/** Prepare a pose ONCE per frame: precompute active 3D handle deltas/radii.
 * Ray marching then avoids normalizing expression and recomputing 10 delta maps
 * on every inverse iteration/pixel. Compiled pose is tied to this exact rig.
 */
export function prepareAIG75Pose(rig,expression={}){
 if(rig?.schema!==AIG75_SCHEMA)throw Error('AIG75_POSE_RIG_REQUIRED');
 if(expression?._aig75Prepared===true){
  if(expression.rig!==rig)throw Error('AIG75_CROSS_RIG_POSE_BLOCKED');
  return expression;
 }
 const expr=createAIG74Expression(expression),handles=[];
 for(const key of AIG75_KEYS){
  const delta=handleDelta(rig,expr,key);
  if(Math.abs(delta[0])+Math.abs(delta[1])+Math.abs(delta[2])<1e-12)continue;
  const rx=key.includes('Brow')?rig.faceWidth*.20:rig.faceWidth*.16,
   ry=key==='chin'?rig.faceHeight*.20:rig.faceHeight*.115;
  handles.push({anchor:rig.handles[key],delta,rx2:1/(rx*rx),ry2:1/(ry*ry)});
 }
 return {_aig75Prepared:true,rig,expression:expr,handles};
}
export function warpAIG75World(rig,expression,point){
 if(rig?.schema!==AIG75_SCHEMA||!Array.isArray(point)||point.length!==3||!point.every(finite))throw Error('AIG75_WORLD_POINT_INVALID');
 const pose=prepareAIG75Pose(rig,expression),halfDepth=rig.field.halfDepth;
 const zFade=clamp((point[2]+halfDepth)/(.85*halfDepth),0,1);
 if(zFade===0||pose.handles.length===0)return [...point];
 const shifts=[0,0,0];let maxWeight=0;
 for(const handle of pose.handles){
  const dx=point[0]-handle.anchor[0],dy=point[1]-handle.anchor[1];
  const weight=Math.exp(-2*(dx*dx*handle.rx2+dy*dy*handle.ry2))*zFade;
  maxWeight+=weight;
  shifts[0]+=weight*handle.delta[0];
  shifts[1]+=weight*handle.delta[1];
  shifts[2]+=weight*handle.delta[2];
 }
 const attenuation=maxWeight>1?1/maxWeight:1;
 return [point[0]+shifts[0]*attenuation,point[1]+shifts[1]*attenuation,point[2]+shifts[2]*attenuation];
}
export function inverseAIG75World(rig,expression,world,{iterations=7}={}){
 if(!Array.isArray(world)||world.length!==3||!world.every(finite)||
 !Number.isInteger(iterations)||iterations<1||iterations>14)throw Error('AIG75_INVERSE_INVALID');
 const pose=prepareAIG75Pose(rig,expression);
 let p=[...world];
 for(let i=0;i<iterations;i++){const projected=warpAIG75World(rig,pose,p);p=add(p,sub(world,projected));}
 return p;
}
export function sampleAIG75SDF(rig,expression,world){
 const ref=inverseAIG75World(rig,expression,world);
 return {distance:sampleImplicitVolume(rig.field,ref),referencePoint:ref,threeD:true};
}
export function normalAIG75SDF(rig,expression,point,delta=.002){
 if(!finite(delta)||delta<=0||delta>.02)throw Error('AIG75_NORMAL_DELTA_INVALID');
 const v=[];
 for(let axis=0;axis<3;axis++){
  const a=[...point],b=[...point];a[axis]+=delta;b[axis]-=delta;
  v.push(sampleAIG75SDF(rig,expression,a).distance-sampleAIG75SDF(rig,expression,b).distance);
 }
 return norm(v);
}
export function auditAIG75Rig(rig,expression,{grid=6,delta=.002}={}){
 if(rig?.schema!==AIG75_SCHEMA||!Number.isInteger(grid)||grid<3||grid>12||
  !finite(delta)||delta<=0||delta>.02)throw Error('AIG75_AUDIT_INPUT_INVALID');
 const expr=prepareAIG75Pose(rig,expression),land=rig.landmarks.roi,
  [hx,hy]=rig.field.xyBounds;
 let minJacobian=Infinity,maxDisplacement=0,invalid=0;
 for(let y=0;y<grid;y++)for(let x=0;x<grid;x++){
  const u=land.x+land.width*(x+.5)/grid,v=land.y+land.height*(y+.5)/grid;
  const p=[(u-.5)*2*hx,(.5-v)*2*hy,rig.field.halfDepth*.75],out=warpAIG75World(rig,expr,p),
   dx=[],dy=[],dz=[];
  for(let k=0;k<3;k++){
   const a=[...p],b=[...p];a[k]+=delta;b[k]-=delta;
   const derivative=scale(sub(warpAIG75World(rig,expr,a),warpAIG75World(rig,expr,b)),1/(2*delta));
   if(k===0)dx.push(...derivative);else if(k===1)dy.push(...derivative);else dz.push(...derivative);
  }
  const determinant=dot(dx,cross(dy,dz));minJacobian=Math.min(minJacobian,determinant);
  maxDisplacement=Math.max(maxDisplacement,Math.hypot(...sub(out,p)));
  if(!finite(determinant)||determinant<=.2)invalid++;
 }
 return {schema:'AIG_FASTMODEL_7_5_3D_LANDMARK_RIG_QUALITY',
  sampleCount:grid*grid,minJacobian,maxDisplacement,
  foldOrInversionSamples:invalid,passed:invalid===0,landmarkOrigin:rig.landmarks.origin,
  realImageFeatureLocations:'USER_REVIEWED_XY',true3dGeometryDeformed:true,
  real3dFaceShapeRecovered:false,anatomicalFacialRigApproved:false};
}
export function raycastAIG75(rig,expression,origin,direction,{maxSteps=104,epsilon=.0019,maxDistance=4}={}){
 if(![origin,direction].every(v=>Array.isArray(v)&&v.length===3&&v.every(finite))||
  Math.hypot(...direction)<1e-9||!Number.isInteger(maxSteps)||maxSteps<10||maxSteps>230||
  !finite(epsilon)||epsilon<=0||!finite(maxDistance)||maxDistance<=0)throw Error('AIG75_RAY_INPUT_INVALID');
 const pose=prepareAIG75Pose(rig,expression),dir=norm(direction);let t=0;
 for(let step=0;step<maxSteps&&t<=maxDistance;step++){
  const p=add(origin,scale(dir,t)),result=sampleAIG75SDF(rig,pose,p);
  if(result.distance<=epsilon)return {hit:true,point:p,referencePoint:result.referencePoint,
    normal:normalAIG75SDF(rig,pose,p),steps:step+1,distance:t};
  t+=clamp(result.distance*.40,.002,.08);
 }
 return {hit:false,point:null,referencePoint:null,normal:null,distance:null,steps:maxSteps};
}
export function renderAIG75LandmarkAvatar(rig,image,{expression={},cosmetics={},width=56,height=56,yaw=0,pitch=0,maxSteps=100}={}){
 if(rig?.schema!==AIG75_SCHEMA||!image||![width,height].every(n=>Number.isInteger(n)&&n>=16&&n<=160)||
  width*height>10000||![yaw,pitch].every(finite)||Math.abs(pitch)>1.35)throw Error('AIG75_RENDER_INPUT_INVALID');
 const pose=prepareAIG75Pose(rig,expression),expr=pose.expression,quality=auditAIG75Rig(rig,pose,{grid:5});
 if(!quality.passed)throw Error('AIG75_INVERTED_FACE_GEOMETRY_BLOCKED');
 const makeup=makeAIG73Makeup(cosmetics),pixels=new Uint8ClampedArray(width*height*4),
  eye=[2*Math.sin(yaw)*Math.cos(pitch),2*Math.sin(pitch),2*Math.cos(yaw)*Math.cos(pitch)],
  forward=norm(scale(eye,-1)),right=norm(cross(forward,[0,1,0])),up=norm(cross(right,forward));
 let hitPixels=0,photoPixels=0,neutralRearPixels=0,makeupPixels=0;
 for(let j=0;j<height;j++)for(let i=0;i<width;i++){
  const at=(j*width+i)*4,dx=((i+.5)/width-.5)*1.45*width/height,dy=(.5-(j+.5)/height)*1.45,
   origin=add(eye,add(scale(right,dx),scale(up,dy))),
   result=raycastAIG75(rig,pose,origin,forward,{maxSteps});
  let rgb=[3,10,19];
  if(result.hit){
   hitPixels++;
   const shaded=shadeAIG73Surface({image,field:rig.field,roi:rig.landmarks.roi,
    makeup,point:result.referencePoint,normal:result.normal});
   rgb=shaded.rgb;
   if(shaded.source==='SOURCE_PHOTO_FRONT_PROJECTION'){photoPixels++;if(shaded.cosmeticOpacity>.02)makeupPixels++;}
   else neutralRearPixels++;
  }
  pixels.set([...rgb,255],at);
 }
 return {schema:'AIG_FASTMODEL_7_5_LANDMARK_ANCHORED_XYZ_RENDER',
  width,height,pixels,hitPixels,photoPixels,neutralRearPixels,makeupPixels,expression:expr,cameraYaw:yaw,cameraPitch:pitch,
  quality,sourceDepthEstimated:true,landmarksManuallyReviewed:true,
  truePhotographic3DHeadRecovered:false,actualMultiplayerServer:false};
}
