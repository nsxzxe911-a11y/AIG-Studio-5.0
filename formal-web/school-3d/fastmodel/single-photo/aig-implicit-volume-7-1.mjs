/** FastModel 7.1 original true 3D implicit-field engine (zero third-party inference).
 * Source XY is observed; Z depth explicitly estimated. No verified human anatomy.
 * Supports signed 3D volume, surface normal, conservative ray intersection,
 * real sphere/contact penetration and moving 3D inverse bend geometry.
 */
export const AIG71_SCHEMA='AIG_FASTMODEL_7_1_OBSERVED_2D_TO_EXPLICIT_3D_SDF';
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const add=(a,b)=>a.map((v,i)=>v+b[i]);
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const mul=(a,k)=>a.map(v=>v*k);
const norm=a=>{const m=Math.hypot(...a);return m>1e-12?mul(a,1/m):[0,0,1];};
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export function edt1D(f){
 const n=f.length;if(n<1||n>4096||!Array.from(f).every(finite))throw Error('AIG71_EDT_INPUT_INVALID');
 const v=new Int32Array(n),z=new Float64Array(n+1),d=new Float64Array(n);
 let k=0;z[0]=-Infinity;z[1]=Infinity;
 for(let q=1;q<n;q++){
  let s;
  do{const j=v[k];s=((f[q]+q*q)-(f[j]+j*j))/(2*(q-j));if(s<=z[k])k--;else break;}while(k>=0);
  if(k<0){k=0;v[0]=q;z[0]=-Infinity;z[1]=Infinity;}
  else{k++;v[k]=q;z[k]=s;z[k+1]=Infinity;}
 }
 k=0;
 for(let q=0;q<n;q++){while(z[k+1]<q)k++;d[q]=(q-v[k])**2+f[v[k]];}
 return d;
}
export function distanceField2D(bits,w,h,target){
 if(!(bits instanceof Uint8Array)||bits.length!==w*h||!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||w>512||h>512||![0,1].includes(target))throw Error('AIG71_DISTANCE_GRID_INVALID');
 const tmp=new Float64Array(w*h),out=new Float32Array(w*h);let any=false;
 for(let x=0;x<w;x++){
  const col=new Float64Array(h);
  for(let y=0;y<h;y++){const on=bits[y*w+x]===target;col[y]=on?0:1e10;any||=on;}
  const res=edt1D(col);for(let y=0;y<h;y++)tmp[y*w+x]=res[y];
 }
 if(!any)throw Error('AIG71_EMPTY_TARGET_CLASS');
 for(let y=0;y<h;y++){
  const res=edt1D(tmp.subarray(y*w,(y+1)*w));
  for(let x=0;x<w;x++)out[y*w+x]=Math.sqrt(res[x]);
 }
 return out;
}
export function createObservedImplicitVolume(src,{maxGrid=128,halfDepth=.11}={}){
 const {width:w,height:h,mask}=src||{};
 if(!Number.isInteger(w)||!Number.isInteger(h)||w<16||h<16||w*h>1600000||!(mask instanceof Uint8Array)||mask.length!==w*h||!Number.isInteger(maxGrid)||maxGrid<32||maxGrid>256||!finite(halfDepth)||halfDepth<.015||halfDepth>.8)throw Error('AIG71_MASK_GRID_OR_DEPTH_INVALID');
 const s=Math.min(1,maxGrid/Math.max(w,h)),gw=Math.max(16,Math.round(w*s)),gh=Math.max(16,Math.round(h*s)),bits=new Uint8Array(gw*gh);let occupied=0;
 for(let y=0;y<gh;y++)for(let x=0;x<gw;x++){let ix=Math.min(w-1,Math.floor((x+.5)*w/gw)),iy=Math.min(h-1,Math.floor((y+.5)*h/gh));bits[y*gw+x]=mask[iy*w+ix]?1:0;occupied+=bits[y*gw+x];}
 if(occupied<9||occupied>gw*gh-9)throw Error('AIG71_DOWNSAMPLED_MASK_AMBIGUOUS');
 const fg=distanceField2D(bits,gw,gh,1),bg=distanceField2D(bits,gw,gh,0),unit=1/Math.max(gw,gh),signed=new Float32Array(bits.length);
 for(let i=0;i<bits.length;i++)signed[i]=((bits[i]?-bg[i]:fg[i])+(bits[i]?.5:-.5))*unit;
 return {schema:AIG71_SCHEMA,sourceSHA256:src.sourceSHA256||null,gridWidth:gw,gridHeight:gh,cellSize:unit,halfDepth,xyBounds:[gw*unit/2,gh*unit/2],signed,occupiedCells:occupied,
  observedFrom:'SOURCE_PIXEL_MASK_XY',hiddenZ:'EXPLICIT_ESTIMATE_NOT_OBSERVED',interpolation:'BILINEAR_XY_ANALYTIC_Z',verifiedAnatomicalReconstruction:false,verifiedElasticMaterial:false};
}
function bilinear(g,u,v){
 const w=g.gridWidth,h=g.gridHeight,x=clamp(u,0,w-1),y=clamp(v,0,h-1),a=Math.floor(x),b=Math.floor(y),c=Math.min(w-1,a+1),d=Math.min(h-1,b+1),fx=x-a,fy=y-b;
 return ((1-fx)*g.signed[b*w+a]+fx*g.signed[b*w+c])*(1-fy)+((1-fx)*g.signed[d*w+a]+fx*g.signed[d*w+c])*fy;
}
export function sampleImplicitVolume(g,p,{bend=0}={}){
 if(g?.schema!==AIG71_SCHEMA||!Array.isArray(p)||p.length!==3||!p.every(finite)||!finite(bend)||Math.abs(bend)>.4)throw Error('AIG71_SDF_INPUT_INVALID');
 const [rawX,y,z]=p,x=rawX-bend*(y+.15)**2,[hx,hy]=g.xyBounds;
 const exterior=Math.hypot(Math.max(0,Math.abs(x)-hx),Math.max(0,Math.abs(y)-hy));
 const xy=Math.max(bilinear(g,x/g.cellSize+g.gridWidth/2-.5,y/g.cellSize+g.gridHeight/2-.5),exterior>0?exterior:-Infinity);
 const depth=Math.abs(z)-g.halfDepth;
 return Math.min(Math.max(xy,depth),0)+Math.hypot(Math.max(xy,0),Math.max(depth,0));
}
export function surfaceNormal(g,p,{bend=0,delta=.001}={}){
 if(!finite(delta)||delta<=0||delta>.05)throw Error('AIG71_NORMAL_DELTA_INVALID');
 const o={bend},a=[delta,0,0],b=[0,delta,0],c=[0,0,delta];
 return norm([sampleImplicitVolume(g,add(p,a),o)-sampleImplicitVolume(g,sub(p,a),o),
 sampleImplicitVolume(g,add(p,b),o)-sampleImplicitVolume(g,sub(p,b),o),
 sampleImplicitVolume(g,add(p,c),o)-sampleImplicitVolume(g,sub(p,c),o)]);
}
export function raycastImplicitVolume(g,origin,direction,{bend=0,maxSteps=110,maxDistance=5,epsilon=.0015}={}){
 if(!Array.isArray(origin)||!Array.isArray(direction)||origin.length!==3||direction.length!==3||![...origin,...direction,maxDistance,epsilon].every(finite)||Math.hypot(...direction)<1e-12||maxDistance<=0||epsilon<=0||!Number.isInteger(maxSteps)||maxSteps<1||maxSteps>256)throw Error('AIG71_RAY_INVALID');
 let t=0,steps=0,dir=norm(direction);
 for(;steps<maxSteps&&t<=maxDistance;steps++){
  const p=add(origin,mul(dir,t)),d=sampleImplicitVolume(g,p,{bend});
  if(d<=epsilon)return {hit:true,distance:t,point:p,normal:surfaceNormal(g,p,{bend}),steps:steps+1,sdfResidual:d,source:'NUMERIC_3D_IMPLICIT_INTERSECTION'};
  t+=Math.max(epsilon,d*.7);
 }
 return {hit:false,distance:null,point:null,normal:null,steps,source:'NUMERIC_3D_IMPLICIT_INTERSECTION'};
}
export function probeSphereContact(g,center,radius,{bend=0}={}){
 if(!Array.isArray(center)||center.length!==3||!center.every(finite)||!finite(radius)||radius<=0||radius>1)throw Error('AIG71_PROBE_INVALID');
 const d=sampleImplicitVolume(g,center,{bend}),n=surfaceNormal(g,center,{bend}),depth=Math.max(0,radius-d);
 return {schema:'AIG_FASTMODEL_7_1_GEOMETRIC_3D_SPHERE_PROBE',overlap:depth>0,penetrationDepth:depth,clearance:d-radius,contactNormal:n,nearestSurfacePoint:sub(center,mul(n,d)),correctedCenter:add(center,mul(n,depth)),simulatedMaterialResponse:false};
}
export function renderImplicitVolume(g,{width=192,height=144,yaw=.55,pitch=.2,bend=0,maxSteps=72}={}){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<16||height<16||width*height>100000||![yaw,pitch,bend].every(finite)||Math.abs(pitch)>1.45)throw Error('AIG71_RENDER_INPUT_INVALID');
 const pixels=new Uint8ClampedArray(width*height*4),eye=[2.05*Math.sin(yaw)*Math.cos(pitch),2.05*Math.sin(pitch),2.05*Math.cos(yaw)*Math.cos(pitch)],forward=norm(mul(eye,-1)),right=norm(cross(forward,[0,1,0])),up=norm(cross(right,forward)),light=norm([.4,.8,1]);let hitPixels=0,near=Infinity;
 for(let j=0;j<height;j++)for(let i=0;i<width;i++){
  const p=(j*width+i)*4,dx=((i+.5)/width-.5)*1.5*width/height,dy=(.5-(j+.5)/height)*1.5;
  const start=add(eye,add(mul(right,dx),mul(up,dy))),hit=raycastImplicitVolume(g,start,forward,{bend,maxSteps,maxDistance:4});
  let rgb=[4,11,21];
  if(hit.hit){hitPixels++;near=Math.min(near,hit.distance);const n=hit.normal,l=clamp(.25+.65*Math.max(0,dot(n,light))+.17*Math.pow(1-Math.abs(dot(n,forward)),2),0,1.25);rgb=[Math.round(28+55*l),Math.round(45+139*l),Math.round(69+168*l)];}
  pixels[p]=rgb[0];pixels[p+1]=rgb[1];pixels[p+2]=rgb[2];pixels[p+3]=255;
 }
 return {schema:'AIG_FASTMODEL_7_1_CPU_SDF_RAY_RENDER',width,height,pixels,hitPixels,nearestSurfaceDistance:hitPixels?near:null,yaw,pitch,bend,realSurfaceRayIntersections:true,photorealistic:false};
}
