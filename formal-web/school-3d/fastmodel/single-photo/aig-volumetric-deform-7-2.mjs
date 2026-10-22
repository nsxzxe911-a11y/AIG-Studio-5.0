/** AIG FastModel 7.2: original 3D position-based dynamics lattice for
 * the explicitly estimated 7.1 SDF solid. Truly moves XYZ nodes and
 * enforces edge and tetrahedral signed volume constraints. NOT human skin,
 * calibrated FEM, approved inverse scan or anatomical rigging.
 */
import {sampleImplicitVolume} from './aig-implicit-volume-7-1.mjs';
export const AIG72_SCHEMA='AIG_FASTMODEL_7_2_3D_TETRA_PBD_SOURCE_DRAFT';
const finite=Number.isFinite;
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const sum=(a,b)=>a.map((x,i)=>x+b[i]);
const scale=(a,s)=>a.map(x=>x*s);
const len=a=>Math.hypot(...a);
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const volume=(a,b,c,d)=>dot(sub(b,a),cross(sub(c,a),sub(d,a)))/6;
function cellIndex(i,j,k,nx,ny){return i+nx*(j+ny*k);}
export function createAIG72VolumeBody(field,{nx=5,ny=7,nz=4,gravity=.22,edgeStiffness=.53,volumeStiffness=.74,damping=.985}={}){
 if(!field||!Array.isArray(field.xyBounds)||field.signed===undefined||![nx,ny,nz].every(x=>Number.isInteger(x)&&x>=3&&x<=10)||nx*ny*nz>512||![gravity,edgeStiffness,volumeStiffness,damping].every(finite)||gravity<0||gravity>8||edgeStiffness<0||edgeStiffness>1||volumeStiffness<0||volumeStiffness>1||damping<0||damping>1)
 throw Error('AIG72_LATTICE_CONFIG_INVALID');
 // The XY image is observed; this complete Z extent is explicitly estimated.
 const [hx,hy]=field.xyBounds,hz=field.halfDepth;
 if(![hx,hy,hz].every(x=>finite(x)&&x>0))throw Error('AIG72_FIELD_EXTENT_INVALID');
 const rest=[],positions=[],previous=[],inverseMass=[];
 for(let k=0;k<nz;k++)for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
  const p=[-hx+2*hx*i/(nx-1),-hy+2*hy*j/(ny-1),-hz+2*hz*k/(nz-1)];
  rest.push(p);positions.push([...p]);previous.push([...p]);inverseMass.push(j===ny-1?0:1);
 }
 const edgeMap=new Set(),edges=[],tetra=[];
 const addEdge=(i,j)=>{
  const key=Math.min(i,j)+','+Math.max(i,j);
  if(edgeMap.has(key))return;edgeMap.add(key);
  edges.push([i,j,len(sub(rest[i],rest[j]))]);
 };
 // Regular grid cell partition: six well-oriented tetrahedra share 0->7.
 for(let k=0;k<nz-1;k++)for(let j=0;j<ny-1;j++)for(let i=0;i<nx-1;i++){
  const n=(a,b,c)=>cellIndex(i+a,j+b,k+c,nx,ny);
  const v=[n(0,0,0),n(1,0,0),n(0,1,0),n(1,1,0),n(0,0,1),n(1,0,1),n(0,1,1),n(1,1,1)];
  for(const face of [[0,1,3,7],[0,3,2,7],[0,2,6,7],[0,6,4,7],[0,4,5,7],[0,5,1,7]]){
   const ids=face.map(idx=>v[idx]),v0=volume(...ids.map(idx=>rest[idx]));
   if(v0<=0)throw Error('AIG72_INVALID_TETRA_REST_ORIENTATION');
   tetra.push({ids,restVolume:v0});
   for(let a=0;a<4;a++)for(let b=a+1;b<4;b++)addEdge(ids[a],ids[b]);
  }
 }
 return {schema:AIG72_SCHEMA,field,dimensions:[nx,ny,nz],rest,positions,previous,inverseMass,edges,tetra,gravity,edgeStiffness,volumeStiffness,damping,time:0,steps:0,pose:{tipX:0,tipZ:0},domain:[hx,hy,hz],sourceObserved:'SOURCE_2D_MASK_ONLY',unobservedDepth:'ESTIMATED_Z',anatomicalSkinVerified:false};
}
export function stepAIG72Volume(body,{dt=1/60,iterations=5,tipX=0,tipZ=0,sphere=null}={}){
 if(body?.schema!==AIG72_SCHEMA||!finite(dt)||dt<=0||dt>1/30||!Number.isInteger(iterations)||iterations<1||iterations>20||![tipX,tipZ].every(finite)||Math.abs(tipX)>.15||Math.abs(tipZ)>.15)
 throw Error('AIG72_STEP_INVALID');
 const collision=sphere||null;
 if(collision&&(!Array.isArray(collision.center)||collision.center.length!==3||!collision.center.every(finite)||!finite(collision.radius)||collision.radius<=0||collision.radius>1))throw Error('AIG72_SPHERE_INVALID');
 const {positions:p,previous:old,inverseMass:w,rest}=body;
 for(let i=0;i<p.length;i++){
  if(w[i]===0){const r=rest[i];p[i]=[r[0]+tipX,r[1],r[2]+tipZ];old[i]=[...p[i]];continue;}
  const q=p[i],before=old[i],vx=(q[0]-before[0])*body.damping,vy=(q[1]-before[1])*body.damping,vz=(q[2]-before[2])*body.damping;
  old[i]=[...q];q[0]+=vx;q[1]+=vy-body.gravity*dt*dt;q[2]+=vz;
 }
 let activeContacts=0;
 for(let iter=0;iter<iterations;iter++){
  for(const [a,b,L] of body.edges){
   const pa=p[a],pb=p[b],delta=sub(pb,pa),d=len(delta),mass=w[a]+w[b];
   if(d<1e-10||mass===0)continue;
   const factor=(d-L)*body.edgeStiffness/(d*mass);
   for(let axis=0;axis<3;axis++){pa[axis]+=delta[axis]*factor*w[a];pb[axis]-=delta[axis]*factor*w[b];}
  }
  for(const tet of body.tetra){
   const [a,b,c,d]=tet.ids,[pa,pb,pc,pd]=[p[a],p[b],p[c],p[d]],ab=sub(pb,pa),ac=sub(pc,pa),ad=sub(pd,pa);
   const current=dot(ab,cross(ac,ad))/6,gb=scale(cross(ac,ad),1/6),gc=scale(cross(ad,ab),1/6),gd=scale(cross(ab,ac),1/6),ga=scale(sum(sum(gb,gc),gd),-1);
   const indices=[a,b,c,d],grad=[ga,gb,gc,gd];
   let denom=0;for(let k=0;k<4;k++)denom+=w[indices[k]]*dot(grad[k],grad[k]);
   if(denom<1e-16)continue;
   const factor=-(current-tet.restVolume)*body.volumeStiffness/denom;
   for(let k=0;k<4;k++)if(w[indices[k]])for(let axis=0;axis<3;axis++)p[indices[k]][axis]+=factor*w[indices[k]]*grad[k][axis];
  }
  if(collision){
   for(let i=0;i<p.length;i++)if(w[i]){
    const delta=sub(p[i],collision.center),d=len(delta);
    if(d<collision.radius){
     const normal=d>1e-10?scale(delta,1/d):[0,1,0];
     p[i]=sum(collision.center,scale(normal,collision.radius));
     activeContacts++;
    }
   }
  }
  // Kinematic top surface is a prescribed control, not detected bone motion.
  const [nx,ny,nz]=body.dimensions;
  for(let k=0;k<nz;k++)for(let i=0;i<nx;i++){const at=cellIndex(i,ny-1,k,nx,ny),r=rest[at];p[at]=[r[0]+tipX,r[1],r[2]+tipZ];}
 }
 if(!p.every(v=>v.every(finite)))throw Error('AIG72_NONFINITE_POSE_BLOCKED');
 body.steps++;body.time+=dt;body.pose={tipX,tipZ};body.lastContacts=activeContacts;
 return auditAIG72Volume(body);
}
export function auditAIG72Volume(body){
 if(body?.schema!==AIG72_SCHEMA)throw Error('AIG72_BODY_REQUIRED');
 let minRatio=Infinity,maxRatio=-Infinity,meanRatioError=0,negative=0;
 for(const tet of body.tetra){
  const ratio=volume(...tet.ids.map(i=>body.positions[i]))/tet.restVolume;
  if(!finite(ratio))throw Error('AIG72_NONFINITE_TETRA');
  minRatio=Math.min(minRatio,ratio);maxRatio=Math.max(maxRatio,ratio);meanRatioError+=Math.abs(ratio-1);
  if(ratio<=0)negative++;
 }
 let maxDisplacement=0,meanDisplacement=0;
 for(let i=0;i<body.positions.length;i++){
  const d=len(sub(body.positions[i],body.rest[i]));
  maxDisplacement=Math.max(maxDisplacement,d);meanDisplacement+=d;
 }
 return {schema:'AIG_FASTMODEL_7_2_NUMERICAL_3D_DEFORMATION_EVIDENCE',steps:body.steps,nodeCount:body.positions.length,tetraCount:body.tetra.length,edgeCount:body.edges.length,
  maxDisplacement,meanDisplacement:meanDisplacement/body.positions.length,minSignedVolumeRatio:minRatio,maxSignedVolumeRatio:maxRatio,meanVolumeRatioError:meanRatioError/body.tetra.length,
  invertedTetraCount:negative,collisionProjections:body.lastContacts||0,pose:{...body.pose},
  physics:'EXPERIMENTAL_3D_POSITION_BASED_TETRA_VOLUME_CONSTRAINTS',materialParametersCalibrated:false,anatomicalSkinVerified:false,simulationStable:negative===0};
}
function displacementAt(body,p){
 const [nx,ny,nz]=body.dimensions,[hx,hy,hz]=body.domain;
 const u=clamp((p[0]+hx)/(2*hx)*(nx-1),0,nx-1),v=clamp((p[1]+hy)/(2*hy)*(ny-1),0,ny-1),w=clamp((p[2]+hz)/(2*hz)*(nz-1),0,nz-1);
 const x=Math.min(nx-2,Math.floor(u)),y=Math.min(ny-2,Math.floor(v)),z=Math.min(nz-2,Math.floor(w)),tx=u-x,ty=v-y,tz=w-z;
 const d=[0,0,0];
 for(let a=0;a<2;a++)for(let b=0;b<2;b++)for(let c=0;c<2;c++){
  const id=cellIndex(x+a,y+b,z+c,nx,ny),mass=(a?tx:1-tx)*(b?ty:1-ty)*(c?tz:1-tz);
  for(let axis=0;axis<3;axis++)d[axis]+=(body.positions[id][axis]-body.rest[id][axis])*mass;
 }
 return d;
}
export function sampleAIG72DeformedVolume(body,p,{inverseIterations=5}={}){
 if(body?.schema!==AIG72_SCHEMA||!Array.isArray(p)||p.length!==3||!p.every(finite)||!Number.isInteger(inverseIterations)||inverseIterations<1||inverseIterations>12)throw Error('AIG72_SAMPLE_INVALID');
 // Inverse trilinear deformation approximately solves X+displacement(X)=p.
 let q=[...p];for(let t=0;t<inverseIterations;t++){const displacement=displacementAt(body,q);q=sub(p,displacement);}
 return {signedDistance:sampleImplicitVolume(body.field,q),referencePoint:q,queryPoint:[...p],
   inverseMappingApproximate:true,quality:'EXPERIMENTAL_INVERSE_WARP_NOT_TRUE_DEFORMED_SDF'};
}
export function raycastAIG72Volume(body,origin,direction,{maxSteps=110,maxDistance=5,epsilon=.0017}={}){
 if(body?.schema!==AIG72_SCHEMA||![origin,direction].every(a=>Array.isArray(a)&&a.length===3&&a.every(finite))||len(direction)<1e-9||![maxDistance,epsilon].every(finite)||maxDistance<=0||epsilon<=0||!Number.isInteger(maxSteps)||maxSteps<1||maxSteps>280)throw Error('AIG72_RAY_INPUT_INVALID');
 let t=0,lastT=0,previous=Infinity,dir=scale(direction,1/len(direction)),steps=0;
 while(steps++<maxSteps&&t<=maxDistance){
  const point=sum(origin,scale(dir,t)),d=sampleAIG72DeformedVolume(body,point).signedDistance;
  if(d<epsilon){
   let a=lastT,b=t;
   if(t>0&&previous>0)for(let s=0;s<8;s++){const mid=(a+b)/2,dm=sampleAIG72DeformedVolume(body,sum(origin,scale(dir,mid))).signedDistance;if(dm>0)a=mid;else b=mid;}
   const distance=t>0&&previous>0?b:t,hit=sum(origin,scale(dir,distance));
   return {hit:true,point:hit,distance,normal:normalAIG72Volume(body,hit),steps,source:'DEFORMED_XYZ_SDF_SURFACE_RAY'};
  }
  previous=d;lastT=t;t+=clamp(d*.44,.0025,.07);
 }
 return {hit:false,point:null,distance:null,normal:null,steps,source:'DEFORMED_XYZ_SDF_SURFACE_RAY'};
}
export function normalAIG72Volume(body,p,{delta=.0018}={}){
 if(!finite(delta)||delta<=0||delta>.02)throw Error('AIG72_NORMAL_INPUT_INVALID');
 const gradient=[0,0,0];
 for(let axis=0;axis<3;axis++){
  const a=[...p],b=[...p];a[axis]+=delta;b[axis]-=delta;
  gradient[axis]=sampleAIG72DeformedVolume(body,a).signedDistance-sampleAIG72DeformedVolume(body,b).signedDistance;
 }
 const l=len(gradient);return l>1e-10?scale(gradient,1/l):[0,0,1];
}
export function renderAIG72DeformedVolume(body,{width=72,height=56,yaw=.65,pitch=.12,maxSteps=95}={}){
 if(body?.schema!==AIG72_SCHEMA||![width,height].every(x=>Number.isInteger(x)&&x>=16&&x<=180)||width*height>12000||![yaw,pitch].every(finite)||Math.abs(pitch)>1.45)throw Error('AIG72_RENDER_INPUT_INVALID');
 const pixels=new Uint8ClampedArray(width*height*4),eye=[2.05*Math.sin(yaw)*Math.cos(pitch),2.05*Math.sin(pitch),2.05*Math.cos(yaw)*Math.cos(pitch)],forward=scale(eye,-1/len(eye)),
 right=(a=>scale(a,1/len(a)))(cross(forward,[0,1,0])),up=(a=>scale(a,1/len(a)))(cross(right,forward)),light=(a=>scale(a,1/len(a)))([.5,.7,1]);
 let hits=0;for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const id=(y*width+x)*4,dx=((x+.5)/width-.5)*1.5*width/height,dy=(.5-(y+.5)/height)*1.5,start=sum(eye,sum(scale(right,dx),scale(up,dy)));
  const hit=raycastAIG72Volume(body,start,forward,{maxSteps,maxDistance:4});
  let rgb=[4,10,19];
  if(hit.hit){hits++;const diffuse=clamp(.3+.68*Math.max(0,dot(hit.normal,light)),0,1);rgb=[Math.round(28+38*diffuse),Math.round(58+145*diffuse),Math.round(76+122*diffuse)];}
  pixels[id]=rgb[0];pixels[id+1]=rgb[1];pixels[id+2]=rgb[2];pixels[id+3]=255;
 }
 return {schema:'AIG_FASTMODEL_7_2_DEFORMED_RAY_RENDER',width,height,pixels,hitPixels:hits,yaw,pitch,realDeformedFieldQuery:true,realHumanSkin:false};
}
