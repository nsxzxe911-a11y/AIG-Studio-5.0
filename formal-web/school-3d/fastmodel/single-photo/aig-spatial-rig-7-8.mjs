/** AIG FastModel 7.8 — genuine spatial XYZ articulated head-on-neck geometry.
 * Head YAW / PITCH / ROLL rotate actual SDF coordinates around a measured
 * 2D-source-reviewed neck hinge, with continuous 3D neck weighting and
 * bounded hair sway. 3D topology/backside and tissue are STILL ESTIMATED;
 * no verified full anatomy, true hair strand collision or approved heroine.
 */
import {sampleAIG77SDF,auditAIG77Layers,sampleAIG77Masks} from './aig-hair-neck-7-7.mjs';
import {prepareAIG75Pose} from './aig-landmark-rig-7-5.mjs';
import {shadeAIG73Surface,makeAIG73Makeup} from './aig-face-material-7-3.mjs';
export const AIG78_SCHEMA='AIG_FASTMODEL_7_8_SPATIAL_HEAD_NECK_ARTICULATION';
const finite=Number.isFinite,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),mul=(a,n)=>a.map(v=>v*n);
const norm=a=>{const d=Math.hypot(...a);return d>1e-12?mul(a,1/d):[0,0,1]};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const smooth=t=>{const v=clamp(t,0,1);return v*v*(3-2*v);};
function mat(yaw,pitch,roll){
 const cy=Math.cos(yaw),sy=Math.sin(yaw),cx=Math.cos(pitch),sx=Math.sin(pitch),
  cz=Math.cos(roll),sz=Math.sin(roll);
 // Rz(roll)*Ry(yaw)*Rx(pitch), right-handed column-vector transform.
 return [
  [cz*cy,cz*sy*sx-sz*cx,cz*sy*cx+sz*sx],
  [sz*cy,sz*sy*sx+cz*cx,sz*sy*cx-cz*sx],
  [-sy,cy*sx,cy*cx]
 ];
}
const mv=(m,v)=>[dot(m[0],v),dot(m[1],v),dot(m[2],v)];
const transpose=m=>[[m[0][0],m[1][0],m[2][0]],[m[0][1],m[1][1],m[2][1]],[m[0][2],m[1][2],m[2][2]]];
function neckHinge(layers){
 const r=layers.regions,mask=r.neckMask,field=layers.profile.rig.field,[hx,hy]=field.xyBounds;
 let start=r.height,end=0,sumX=0,num=0;
 for(let y=0;y<r.height;y++)for(let x=0;x<r.width;x++){
  if(mask[y*r.width+x]){start=Math.min(start,y);end=Math.max(end,y);sumX+=x;num++;}
 }
 if(num<12||start===end)throw Error('AIG78_NECK_HINGE_SOURCE_INSUFFICIENT');
 const x=(sumX/num/(r.width-1)-.5)*2*hx;
 // Rotation decreases smoothly across top of neck: head rigid above,
 // the lower neck stays in its original 3D local frame.
 const high=(.5-(start-.5)/(r.height-1))*2*hy,
  low=(.5-(end+.5)/(r.height-1))*2*hy;
 if(high-low<field.cellSize)throw Error('AIG78_NECK_BLEND_TOO_SHORT');
 return {pivot:[x,high,0],high,low,neckPixelSpan:end-start+1,
  from:'USER_REVIEWED_2D_NECK_MASK_ESTIMATED_Z'};
}
export function createAIG78SpatialPose(layers,{
 yaw=0,pitch=0,roll=0,hairSway=0,headMotion=1
}={}){
 if(layers?.schema!=='AIG_FASTMODEL_7_7_REVIEWED_HAIR_NECK_SEMANTIC_3D_OCCLUSION'||
 ![yaw,pitch,roll,hairSway,headMotion].every(finite)||
 Math.abs(yaw)>.48||Math.abs(pitch)>.35||Math.abs(roll)>.30||
 Math.abs(hairSway)>.03||headMotion<0||headMotion>1)
  throw Error('AIG78_SPATIAL_POSE_RANGE_OR_SOURCE_INVALID');
 const hinge=neckHinge(layers);
 return {schema:AIG78_SCHEMA,layers,hinge,yaw,pitch,roll,hairSway,headMotion,
  actualXYZArticulation:true,sourceNeckHingeReviewed2D:true,
  trueNeckBoneLocationMeasured3D:false,rigAnatomyCertified:false};
}
function weight(p,hinge){return smooth((p[1]-hinge.low)/(hinge.high-hinge.low));}
function rotateLocal(p,pose,inverse=false){
 const w=weight(p,pose.hinge),theta=inverse?-1:1,
  m=mat(pose.yaw*pose.headMotion*w*theta,
   pose.pitch*pose.headMotion*w*theta,
   pose.roll*pose.headMotion*w*theta);
 // For inverse rotations use the exact transpose of original composed matrix,
 // not negated Euler angles in the same order.
 const mm=inverse?transpose(mat(pose.yaw*pose.headMotion*w,pose.pitch*pose.headMotion*w,
  pose.roll*pose.headMotion*w)):m;
 return add(pose.hinge.pivot,mv(mm,sub(p,pose.hinge.pivot)));
}
export function warpAIG78Spatial(pose,reference){
 if(pose?.schema!==AIG78_SCHEMA||!Array.isArray(reference)||reference.length!==3||
  !reference.every(finite))throw Error('AIG78_WORLD_POINT_INVALID');
 const base=rotateLocal(reference,pose),
  sample=sampleAIG77Masks(pose.layers,reference),
  hairWeight=sample.hair*smooth(weight(reference,pose.hinge));
 return [base[0]+pose.hairSway*hairWeight,base[1],base[2]+pose.hairSway*.4*hairWeight];
}
export function invertAIG78Spatial(pose,world,{iterations=10}={}){
 if(pose?.schema!==AIG78_SCHEMA||!Array.isArray(world)||world.length!==3||
 !world.every(finite)||!Number.isInteger(iterations)||iterations<1||iterations>20)
  throw Error('AIG78_INVERSE_INPUT_INVALID');
 // Blended spatial joint: solve inverse with short fixed-point iterations.
 // Start from world point. Fail-closed if residual remains too large.
 let q=[...world];
 for(let k=0;k<iterations;k++){
  const projected=warpAIG78Spatial(pose,q),err=sub(world,projected);
  q=add(q,mul(err,.70));
 }
 const residual=Math.hypot(...sub(warpAIG78Spatial(pose,q),world));
 return {reference:q,residual,converged:finite(residual)&&residual<=.012};
}
export function sampleAIG78SpatialSDF(pose,expression,point){
 const p=invertAIG78Spatial(pose,point);
 if(!p.converged)return {distance:1,referencePoint:null,converged:false,residual:p.residual};
 const base=sampleAIG77SDF(pose.layers,expression,p.reference);
 return {distance:base.distance,referencePoint:base.sourcePoint,converged:true,residual:p.residual};
}
function jacobian(pose,p,d=.002){
 const der=[];
 for(let axis=0;axis<3;axis++){
  const a=[...p],b=[...p];a[axis]+=d;b[axis]-=d;
  der.push(mul(sub(warpAIG78Spatial(pose,a),warpAIG78Spatial(pose,b)),1/(2*d)));
 }
 return dot(der[0],cross(der[1],der[2]));
}
function maskSamples(pose,type,maximum=30){
 const r=pose.layers.regions,mask=type==='hair'?r.hairMask:r.neckMask,
  count=type==='hair'?r.hairPixels:r.neckPixels,
  field=pose.layers.profile.rig.field,[hx,hy]=field.xyBounds,
  interval=Math.max(1,Math.floor(count/maximum));
 const points=[];let matched=0;
 for(let y=0;y<r.height&&points.length<maximum;y++)
  for(let x=0;x<r.width&&points.length<maximum;x++){
   if(!mask[y*r.width+x])continue;
   if(matched++%interval!==0)continue;
   const q=[(x/(r.width-1)-.5)*2*hx,(.5-y/(r.height-1))*2*hy,field.halfDepth];
   points.push(warpAIG78Spatial(pose,q));
  }
 return points;
}
export function auditAIG78Spatial(pose,expression={}, {grid=6,spacing=.002}={}){
 if(pose?.schema!==AIG78_SCHEMA||!Number.isInteger(grid)||grid<3||grid>14||
  !finite(spacing)||spacing<.0005||spacing>.02)throw Error('AIG78_AUDIT_INPUT_INVALID');
 const parent=auditAIG77Layers(pose.layers,expression,{grid:5});
 const {field}=pose.layers.profile.rig,[hx,hy]=field.xyBounds,
  hinge=pose.hinge;
 let minJacobian=Infinity,maxInverseError=0,maxWorldDisplacement=0,
  folds=0,nonConverged=0,neckSeamJumps=0;
 for(let j=0;j<grid;j++)for(let i=0;i<grid;i++){
  const x=((i+.5)/grid-.5)*2*hx,y=hinge.low+(j+.5)/grid*
  Math.max(.16,hinge.high-hinge.low)*2.5,
   p=[x,y,field.halfDepth],world=warpAIG78Spatial(pose,p),
   determinant=jacobian(pose,p,spacing),back=invertAIG78Spatial(pose,world);
  minJacobian=Math.min(minJacobian,determinant);
  maxInverseError=Math.max(maxInverseError,Math.hypot(...sub(back.reference,p)));
  maxWorldDisplacement=Math.max(maxWorldDisplacement,Math.hypot(...sub(world,p)));
  if(!finite(determinant)||determinant<=.18)folds++;
  if(!back.converged||Math.hypot(...sub(back.reference,p))>.025)nonConverged++;
 }
 for(let i=0;i<grid;i++){
  const x=((i+.5)/grid-.5)*.8*hx;
  const high=[x,hinge.high+.001,field.halfDepth],
   low=[x,hinge.high-.001,field.halfDepth];
  const rotatedDist=Math.hypot(...sub(warpAIG78Spatial(pose,high),warpAIG78Spatial(pose,low)));
  if(rotatedDist>.025)neckSeamJumps++;
 }
 // Bounding-envelope collision check is deliberately conservative; this is
 // not verified per-strand cloth, hair capsule dynamics, or soft tissue contact.
 const hair=maskSamples(pose,'hair'),neck=maskSamples(pose,'neck');
 let closestHairNeck=Infinity;
 for(const a of hair)for(const b of neck)
  closestHairNeck=Math.min(closestHairNeck,Math.hypot(...sub(a,b)));
 const collisionThreshold=field.cellSize*.55;
 const collisionDetected=hair.length<3||neck.length<3||!finite(closestHairNeck)||closestHairNeck<collisionThreshold;
 return {schema:'AIG_FASTMODEL_7_8_SPATIAL_NECK_HAIR_CONTINUITY_GATE',
  passed:parent.passed&&folds===0&&nonConverged===0&&neckSeamJumps===0&&!collisionDetected,
  parent7_7Passed:parent.passed,sampleCount:grid*grid,minimumJacobian:minJacobian,
  foldSamples:folds,nonConvergedSamples:nonConverged,
  maxInverseError,maxWorldDisplacement,neckSeamDiscontinuities:neckSeamJumps,
  sampledHairPoints:hair.length,sampledNeckPoints:neck.length,
  closestHairNeck,collisionThreshold,collisionDetected,
  actualAnimatedXYZ:true,verifiedAnatomicalNeckRig:false,
  actualHairStrandCollisionSolved:false,headBackDepthEstimated:true};
}
function normalAIG78(pose,expr,p){
 const g=[0,0,0],d=.003;
 for(let i=0;i<3;i++){
  const a=[...p],b=[...p];a[i]+=d;b[i]-=d;
  g[i]=sampleAIG78SpatialSDF(pose,expr,a).distance-
    sampleAIG78SpatialSDF(pose,expr,b).distance;
 }
 return norm(g);
}
export function raycastAIG78Spatial(pose,expr,origin,direction,{
 maxSteps=52,maxDistance=4,epsilon=.003}={}){
 if(![origin,direction].every(a=>Array.isArray(a)&&a.length===3&&a.every(finite))||
  Math.hypot(...direction)<1e-9||!Number.isInteger(maxSteps)||maxSteps<8||maxSteps>160||
 !finite(maxDistance)||maxDistance<=0||!finite(epsilon)||epsilon<=0)
  throw Error('AIG78_RAY_INPUT_INVALID');
 const p=prepareAIG75Pose(pose.layers.profile.rig,expr),d=norm(direction);let t=0;
 for(let step=0;step<maxSteps&&t<maxDistance;step++){
  const world=add(origin,mul(d,t)),sample=sampleAIG78SpatialSDF(pose,p,world);
  if(sample.converged&&sample.distance<=epsilon){
   return {hit:true,point:world,referencePoint:sample.referencePoint,
    normal:normalAIG78(pose,p,world),steps:step+1};
  }
  t+=clamp(sample.distance*.30,.003,.07);
 }
 return {hit:false,steps:maxSteps};
}
export function renderAIG78SpatialAvatar(pose,image,{
 expression={},cosmetics={},cameraYaw=0,cameraPitch=0,width=22,height=22,maxSteps=54
}={}){
 if(pose?.schema!==AIG78_SCHEMA||!image||![cameraYaw,cameraPitch].every(finite)||
  Math.abs(cameraPitch)>1.35||![width,height].every(n=>Number.isInteger(n)&&n>=16&&n<=92)||
  width*height>3500||!Number.isInteger(maxSteps)||maxSteps<8||maxSteps>160)
  throw Error('AIG78_RENDER_INPUT_INVALID');
 const p=prepareAIG75Pose(pose.layers.profile.rig,expression),
  gate=auditAIG78Spatial(pose,p,{grid:5});
 if(!gate.passed)throw Error('AIG78_SPATIAL_HEAD_NECK_GATE_BLOCKED');
 const pixels=new Uint8ClampedArray(width*height*4),
  makeup=makeAIG73Makeup(cosmetics),
  eye=[2*Math.sin(cameraYaw)*Math.cos(cameraPitch),
   2*Math.sin(cameraPitch),2*Math.cos(cameraYaw)*Math.cos(cameraPitch)],
  forward=norm(mul(eye,-1)),right=norm(cross(forward,[0,1,0])),
  up=norm(cross(right,forward));
 let hitPixels=0,photoPixels=0,neutralRearPixels=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const at=(y*width+x)*4,dx=((x+.5)/width-.5)*1.45*width/height,
   dy=(.5-(y+.5)/height)*1.45,
   origin=add(eye,add(mul(right,dx),mul(up,dy))),
   ray=raycastAIG78Spatial(pose,p,origin,forward,{maxSteps});
  let rgb=[3,10,19];
  if(ray.hit){
   hitPixels++;
   const shading=shadeAIG73Surface({image,field:pose.layers.profile.rig.field,
    roi:pose.layers.profile.rig.landmarks.roi,makeup,
    point:ray.referencePoint,normal:ray.normal});
   rgb=shading.rgb;
   if(shading.source==='SOURCE_PHOTO_FRONT_PROJECTION')photoPixels++;
   else neutralRearPixels++;
  }
  pixels.set([...rgb,255],at);
 }
 return {schema:'AIG_FASTMODEL_7_8_GENUINE_SPATIAL_XYZ_RAY_RENDER',
  width,height,pixels,hitPixels,photoPixels,neutralRearPixels,
  cameraYaw,cameraPitch,headYaw:pose.yaw,headPitch:pose.pitch,
  headRoll:pose.roll,hairSway:pose.hairSway,quality:gate,
  trueSpatial3DGeometryMoves:true,originalPhotoColorPreserved:true,
  measuredHeadNeck3DAnatomy:false,realHumanAvatarCertified:false,
  truePhysicalHairStrandsSimulated:false,serverMMOImplemented:false};
}
