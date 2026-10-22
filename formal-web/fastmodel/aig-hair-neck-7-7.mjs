/** AIG FastModel 7.7 — manually reviewed photo hair/neck masks drive
 * separate front-Z displacement and source-photo ray occlusion. This is
 * genuine world XYZ SDF motion, not source-image "wiggle" or a fabricated head.
 * Hidden hair roots, scalp, body neck muscles, skin mechanics and unseen
 * back-of-head volume remain NOT RECOVERED. No auto semantic detection claims.
 */
import {sampleAIG76Face,auditAIG76Depth} from './aig-face-depth-7-6.mjs';
import {auditAIG75Rig,prepareAIG75Pose} from './aig-landmark-rig-7-5.mjs';
import {shadeAIG73Surface,makeAIG73Makeup,projectAIG73SourceUV} from './aig-face-material-7-3.mjs';

export const AIG77_SCHEMA='AIG_FASTMODEL_7_7_REVIEWED_HAIR_NECK_SEMANTIC_3D_OCCLUSION';
const finite=Number.isFinite,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const norm=v=>{const d=Math.hypot(...v);return d>1e-12?v.map(x=>x/d):[0,0,1];};
const add=(a,b)=>a.map((x,i)=>x+b[i]);
const mul=(a,k)=>a.map(x=>x*k);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];

function shape(mask,w,h,label){
 if(!(mask instanceof Uint8Array)||mask.length!==w*h||!Array.from(mask).every(x=>x===0||x===1))
  throw Error('AIG77_'+label+'_BINARY_MASK_INVALID');
}
export function createAIG77ReviewedRegions({
 width,height,foregroundMask,hairMask,neckMask,reviewed=false,sourceSHA256=null
}={}){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<32||height<32||width*height>600000)
  throw Error('AIG77_REGION_DIMENSION_INVALID');
 for(const [key,v] of [['FOREGROUND',foregroundMask],['HAIR',hairMask],['NECK',neckMask]])
  shape(v,width,height,key);
 if(!reviewed)throw Error('AIG77_SEMANTIC_REGION_REVIEW_REQUIRED');
 if(sourceSHA256!==null&&!/^[a-f0-9]{64}$/i.test(sourceSHA256))
  throw Error('AIG77_SOURCE_SHA_INVALID');
 let hairPixels=0,neckPixels=0,neckHeadTouch=0,
 hairY=0,neckY=0,first=-1;
 const n=width*height;
 for(let i=0;i<n;i++){
  const hair=hairMask[i],neck=neckMask[i];
  if((hair||neck)&&!foregroundMask[i])throw Error('AIG77_REGION_OUTSIDE_SOURCE_FOREGROUND');
  if(hair&&neck)throw Error('AIG77_REGION_OVERLAP_BLOCKED');
  if(hair){hairPixels++;hairY+=Math.floor(i/width);if(first<0)first=i;}
  if(neck){neckPixels++;neckY+=Math.floor(i/width);}
 }
 if(hairPixels<12||neckPixels<12||first<0)throw Error('AIG77_SEMANTIC_REGION_TOO_SMALL');
 if(hairY/hairPixels>=neckY/neckPixels)throw Error('AIG77_HAIR_NECK_ORDER_INVALID');
 // Validate connected head+neck *source* pixels. This prevents detached neck
 // islands being airbrushed into an apparently continuous model.
 const visited=new Uint8Array(n),queue=new Int32Array(n);
 let front=0,back=0,connectedNeckPixels=0;
 queue[back++]=first;visited[first]=1;
 while(front<back){
  const i=queue[front++],x=i%width,y=Math.floor(i/width);
  if(neckMask[i])connectedNeckPixels++;
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
   if(!dx&&!dy)continue;
   const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=width||yy>=height)continue;
   const j=yy*width+xx;
   if(foregroundMask[j]&&!visited[j]){visited[j]=1;queue[back++]=j;}
  }
 }
 if(connectedNeckPixels!==neckPixels)throw Error('AIG77_HAIR_NECK_DISCONNECTED_SOURCE_BLOCKED');
 for(let i=0;i<n;i++)if(neckMask[i]){
  const x=i%width,y=Math.floor(i/width);
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
   if(!dx&&!dy)continue;
   const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=width||yy>=height)continue;
   const j=yy*width+xx;
   if(foregroundMask[j]&&!neckMask[j]){neckHeadTouch++;dy=2;break;}
  }
 }
 if(neckHeadTouch<2)throw Error('AIG77_NO_HEAD_NECK_TOUCH_BOUNDARY');
 return {schema:AIG77_SCHEMA,width,height,foregroundMask:new Uint8Array(foregroundMask),
  hairMask:new Uint8Array(hairMask),neckMask:new Uint8Array(neckMask),
  reviewed:true,hairPixels,neckPixels,sourceConnectionPixels:connectedNeckPixels,
  headNeckBoundaryPixels:neckHeadTouch,sourceSHA256:sourceSHA256?.toLowerCase()||null,
  source:'USER_REVIEWED_2D_SEMANTIC_MASKS',hairAndNeckTrueZObserved:false,
  realHairsReconstructed:false,physicalSkinContactVerified:false};
}
export function createAIG77Layers(profile,regions,{
 hairLift=.035,neckSetback=.018,opacity=.9
}={}){
 if(profile?.schema!=='AIG_FASTMODEL_7_6_REVIEWED_XY_ESTIMATED_DEPTH_PRIORS'||
  regions?.schema!==AIG77_SCHEMA||!regions.reviewed||
  ![hairLift,neckSetback,opacity].every(finite)||
  hairLift<0||hairLift>.08||neckSetback<0||neckSetback>.06||opacity<0||opacity>1)
  throw Error('AIG77_LAYER_SETTINGS_INVALID');
 return {schema:AIG77_SCHEMA,profile,regions,hairLift,neckSetback,opacity,
  worldGeometry:true,faceOriginalTexturePreserved:true,hiddenGeometryIsEstimated:true};
}
function at(mask,width,height,u,v){
 const x=clamp(u,0,1)*(width-1),y=clamp(v,0,1)*(height-1),
  x0=Math.floor(x),y0=Math.floor(y),x1=Math.min(width-1,x0+1),y1=Math.min(height-1,y0+1),
  fx=x-x0,fy=y-y0;
 return ((1-fx)*mask[y0*width+x0]+fx*mask[y0*width+x1])*(1-fy)+
  ((1-fx)*mask[y1*width+x0]+fx*mask[y1*width+x1])*fy;
}
export function sampleAIG77Masks(layers,point){
 if(layers?.schema!==AIG77_SCHEMA||!Array.isArray(point)||point.length!==3||!point.every(finite))
  throw Error('AIG77_MASK_QUERY_INVALID');
 const [u,v]=projectAIG73SourceUV(layers.profile.rig.field,point),r=layers.regions;
 // Mutually exclusive binary photo classes are blurred only by bilinear UV.
 return {hair:at(r.hairMask,r.width,r.height,u,v),
  neck:at(r.neckMask,r.width,r.height,u,v),u,v};
}
function zWeight(z,h){return clamp((z+h)/(2*h),0,1)**3;}
export function deformAIG77Layers(layers,point){
 const mask=sampleAIG77Masks(layers,point),h=layers.profile.rig.field.halfDepth;
 const delta=(layers.hairLift*mask.hair-layers.neckSetback*mask.neck)*layers.opacity;
 return [point[0],point[1],point[2]+delta*zWeight(point[2],h)];
}
export function undoAIG77Layers(layers,point,{iterations=8}={}){
 if(!Array.isArray(point)||point.length!==3||!point.every(finite)||
  !Number.isInteger(iterations)||iterations<1||iterations>14)throw Error('AIG77_INVERSE_INVALID');
 const h=layers.profile.rig.field.halfDepth,mask=sampleAIG77Masks(layers,point),
  delta=(layers.hairLift*mask.hair-layers.neckSetback*mask.neck)*layers.opacity;
 let z=point[2];
 for(let i=0;i<iterations;i++)z=point[2]-delta*zWeight(z,h);
 return [point[0],point[1],z];
}
export function sampleAIG77SDF(layers,pose,world){
 const beforeLayer=undoAIG77Layers(layers,world);
 const src=sampleAIG76Face(layers.profile,pose,beforeLayer);
 return {distance:src.distance,sourcePoint:src.referencePoint,worldPoint:world,
  photoLayerSource:'REVIEWED_2D_MASK',rearTrueHeadGeometryObserved:false};
}
export function auditAIG77Layers(layers,expression={}, {grid=7,epsilon=.002}={}){
 if(layers?.schema!==AIG77_SCHEMA||!Number.isInteger(grid)||grid<3||grid>16||
  !finite(epsilon)||epsilon<.0005||epsilon>.02)throw Error('AIG77_AUDIT_INPUT_INVALID');
 const pose=prepareAIG75Pose(layers.profile.rig,expression),
  faceGate=auditAIG75Rig(layers.profile.rig,pose,{grid:5}),
  depthGate=auditAIG76Depth(layers.profile,pose,{grid:5});
 const {rig}=layers.profile,[hx,hy]=rig.field.xyBounds,h=rig.field.halfDepth,r=layers.regions;
 let minDerivative=Infinity,maxInverseError=0,negativeDerivativeCount=0,hairDominance=0,
  neckSetbackCount=0,coveredHair=0,coveredNeck=0;
 for(let y=0;y<grid;y++)for(let x=0;x<grid;x++){
  const u=(x+.5)/grid,v=(y+.5)/grid,
   q=[(u-.5)*2*hx,(.5-v)*2*hy,h];
  const masks=sampleAIG77Masks(layers,q);
  const hairBoundaryAt=deformAIG77Layers(layers,q)[2];
  if(masks.hair>.6){coveredHair++;if(hairBoundaryAt>=h)hairDominance++;}
  if(masks.neck>.6){coveredNeck++;if(hairBoundaryAt<=h)neckSetbackCount++;}
  for(const z of [-h,0,h]){
   const p=[q[0],q[1],z],a=deformAIG77Layers(layers,[q[0],q[1],z+epsilon])[2],
    b=deformAIG77Layers(layers,[q[0],q[1],z-epsilon])[2],
    derivative=(a-b)/(2*epsilon);
   minDerivative=Math.min(minDerivative,derivative);
   if(!finite(derivative)||derivative<=.25)negativeDerivativeCount++;
   const out=deformAIG77Layers(layers,p),restored=undoAIG77Layers(layers,out);
   maxInverseError=Math.max(maxInverseError,Math.abs(restored[2]-z));
  }
 }
 const pass=faceGate.passed&&depthGate.passed&&negativeDerivativeCount===0&&
  maxInverseError<.003&&r.sourceConnectionPixels===r.neckPixels;
 return {schema:'AIG_FASTMODEL_7_7_HAIR_NECK_3D_GEOMETRY_GATE',
  passed:pass,faceGatePassed:faceGate.passed,depthGatePassed:depthGate.passed,
  sampleCount:grid*grid*3,minimumZDerivative:minDerivative,
  invalidZSamples:negativeDerivativeCount,maxInverseError,
  hairPixels:r.hairPixels,neckPixels:r.neckPixels,
  sourceNeckConnected:r.sourceConnectionPixels===r.neckPixels,
  headNeckBoundaryPixels:r.headNeckBoundaryPixels,
  hairDominanceSampleCount:hairDominance,neckRecessSampleCount:neckSetbackCount,
  sampledHairPoints:coveredHair,sampledNeckPoints:coveredNeck,
  regionOrigin:r.source,realHairFibrePhysicsVerified:false,actualSkinContactVerified:false,
  trueAnatomicalHeadNeckApproved:false};
}
function surfaceNormal(layers,pose,p,epsilon=.003){
 const g=[0,0,0];
 for(let i=0;i<3;i++){
  const a=[...p],b=[...p];a[i]+=epsilon;b[i]-=epsilon;
  g[i]=sampleAIG77SDF(layers,pose,a).distance-sampleAIG77SDF(layers,pose,b).distance;
 }
 return norm(g);
}
export function raycastAIG77(layers,pose,origin,direction,{maxSteps=66,maxDistance=4,epsilon=.0025}={}){
 if(![origin,direction].every(a=>Array.isArray(a)&&a.length===3&&a.every(finite))||
  Math.hypot(...direction)<1e-9||!Number.isInteger(maxSteps)||maxSteps<8||maxSteps>160||
  !finite(maxDistance)||maxDistance<=0||!finite(epsilon)||epsilon<=0)
  throw Error('AIG77_RAY_INPUT_INVALID');
 const p=prepareAIG75Pose(layers.profile.rig,pose),d=norm(direction);
 let t=0;
 for(let j=0;j<maxSteps&&t<maxDistance;j++){
  const point=add(origin,mul(d,t)),hit=sampleAIG77SDF(layers,p,point);
  if(hit.distance<=epsilon){
   return {hit:true,point,referencePoint:hit.sourcePoint,
    normal:surfaceNormal(layers,p,point),steps:j+1};
  }
  t+=clamp(hit.distance*.33,.0025,.065);
 }
 return {hit:false,steps:maxSteps};
}
export function renderAIG77PhotoLayers(layers,image,{
 expression={},cosmetics={},yaw=0,pitch=0,width=24,height=24,maxSteps=64
}={}){
 if(layers?.schema!==AIG77_SCHEMA||!image||![yaw,pitch].every(finite)||
  Math.abs(pitch)>1.35||![width,height].every(x=>Number.isInteger(x)&&x>=16&&x<=100)||
  width*height>5200||!Number.isInteger(maxSteps)||maxSteps<8||maxSteps>160)
  throw Error('AIG77_RENDER_INVALID');
 const pose=prepareAIG75Pose(layers.profile.rig,expression),quality=auditAIG77Layers(layers,pose,{grid:5});
 if(!quality.passed)throw Error('AIG77_HEAD_NECK_GEOMETRY_GATE_BLOCKED');
 const pixels=new Uint8ClampedArray(width*height*4),makeup=makeAIG73Makeup(cosmetics),
  eye=[2*Math.sin(yaw)*Math.cos(pitch),2*Math.sin(pitch),2*Math.cos(yaw)*Math.cos(pitch)],
  fwd=norm(mul(eye,-1)),right=norm(cross(fwd,[0,1,0])),up=norm(cross(right,fwd));
 let hitPixels=0,photoPixels=0,neutralRearPixels=0,hairHits=0,neckHits=0,facialHits=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const at=(y*width+x)*4,dx=((x+.5)/width-.5)*1.45*width/height,
   dy=(.5-(y+.5)/height)*1.45,origin=add(eye,add(mul(right,dx),mul(up,dy))),
   hit=raycastAIG77(layers,pose,origin,fwd,{maxSteps});
  let rgb=[3,10,19];
  if(hit.hit){
   hitPixels++;
   const shade=shadeAIG73Surface({image,field:layers.profile.rig.field,
    roi:layers.profile.rig.landmarks.roi,makeup,point:hit.referencePoint,normal:hit.normal});
   rgb=shade.rgb;
   if(shade.source==='SOURCE_PHOTO_FRONT_PROJECTION'){
    photoPixels++;
    const region=sampleAIG77Masks(layers,hit.referencePoint);
    if(region.hair>.45)hairHits++;
    else if(region.neck>.45)neckHits++;
    else facialHits++;
   }else neutralRearPixels++;
  }
  pixels.set([...rgb,255],at);
 }
 return {schema:'AIG_FASTMODEL_7_7_SOURCE_SEMANTIC_3D_OCCLUSION_RENDER',
  width,height,pixels,hitPixels,photoPixels,neutralRearPixels,hairHits,neckHits,
  facialHits,cameraYaw:yaw,quality,estimatedHairAndNeckZ:true,
  trueHairStrandsOrMusclesReconstructed:false,referenceCharacterVisuallyApproved:false};
}
