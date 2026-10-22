/**
 * AIG FastModel 7.13 — real metric front-surface 3D reconstruction from two
 * calibrated RECTIFIED photographs with a physically measured baseline.
 *
 * Stereo corresponds to TRUE measured ray triangulation: Z = fx*baseline/d.
 * One photo cannot provide verified backside, arbitrary unseen hair/head
 * geometry or exact scale. This module never fabricates these surfaces.
 *
 * Input calibration/photographs are locally processed; no network, model
 * upload, external AI inference or CNC machine control.
 */
export const AIG713_SCHEMA='AIG_FASTMODEL_7_13_METRIC_RECTIFIED_STEREO_MESH_MM';
const valid=Number.isFinite;
const checkDigest=s=>typeof s==='string'&&/^sha256:[0-9a-f]{64}$/.test(s);
const err=m=>{throw Error('AIG713_'+m)};
const within=(n,min,max)=>valid(n)&&n>=min&&n<=max;
export function createAIG713StereoCalibration({
 width,height,focalPx,baselineMm,principalX=(width-1)/2,
 principalY=(height-1)/2,
 calibrationReviewed=false,rectifiedParallelReviewed=false,
 physicallyMeasuredBaseline=false,leftSHA256,rightSHA256
}={}){
 if(!Number.isInteger(width)||width<32||width>640||
  !Number.isInteger(height)||height<32||height>480||
  !within(focalPx,15,100000)||!within(baselineMm,.01,100000)||
  !within(principalX,0,width)||!within(principalY,0,height)||
  !calibrationReviewed||!rectifiedParallelReviewed||
  !physicallyMeasuredBaseline||!checkDigest(leftSHA256)||
  !checkDigest(rightSHA256)||leftSHA256===rightSHA256)
  err('REAL_STEREO_PHYSICAL_CALIBRATION_REQUIRED');
 return Object.freeze({
  schema:'AIG_FASTMODEL_7_13_REVIEWED_STEREO_MM_CALIBRATION',
  width,height,focalPx,baselineMm,principalX,principalY,
  leftSHA256,rightSHA256,
  physicalBaselineRequired:true,rectifiedCameraPairRequired:true,
  sourcePairDifferent:true,coordinateSystem:'LEFT_CAMERA_X_RIGHT_Y_UP_Z_FORWARD_MM',
  origin:'LEFT_OPTICAL_CENTRE',globalCADOriginNotInferred:true
 });
}
const checkImage=(im,cal)=>{
 if(!im||im.width!==cal.width||im.height!==cal.height||
  !(im.data instanceof Uint8ClampedArray)&&!(im.data instanceof Uint8Array)||
  im.data.length!==4*cal.width*cal.height)err('IMAGE_RGBA_SOURCE_INVALID');
};
function luminance(img){
 const n=img.width*img.height,d=img.data,out=new Uint8Array(n),alpha=new Uint8Array(n);
 for(let i=0;i<n;i++){
  out[i]=Math.round(.2126*d[4*i]+.7152*d[4*i+1]+.0722*d[4*i+2]);
  alpha[i]=d[4*i+3]>=250?1:0;
 }
 return {grey:out,alpha};
}
function patchCost(A,B,xl,xr,y,w,r){
 let sum=0;
 for(let j=-r;j<=r;j++){
  const row=(y+j)*w;
  for(let i=-r;i<=r;i++)sum+=Math.abs(A[row+xl+i]-B[row+xr+i]);
 }
 return sum;
}
function localTexture(g,x,y,w,r){
 let sum=0,sq=0,n=0;
 for(let j=-r;j<=r;j++)for(let i=-r;i<=r;i++){
  const v=g[(y+j)*w+x+i];sum+=v;sq+=v*v;n++;
 }
 return sq/n-(sum/n)**2;
}
const finite3=p=>p.length===3&&p.every(valid);
export function reconstructAIG713StereoSurface(left,right,cal,{
 stride=2,patchRadius=2,minDisparity=2,maxDisparity=64,
 minTextureVariance=60,uniquenessMargin=.12,
 maxDepthJumpRatio=.11,minCorrespondences=24,
 maxPixelComparisons=90000000
}={}){
 if(cal?.schema!=='AIG_FASTMODEL_7_13_REVIEWED_STEREO_MM_CALIBRATION')
  err('CALIBRATED_STEREO_REQUIRED');
 checkImage(left,cal);checkImage(right,cal);
 const w=cal.width,h=cal.height;
 if(!Number.isInteger(stride)||stride<1||stride>8||
  !Number.isInteger(patchRadius)||patchRadius<1||patchRadius>3||
  !Number.isInteger(minDisparity)||minDisparity<1||
  !Number.isInteger(maxDisparity)||maxDisparity<=minDisparity||
  maxDisparity>Math.min(96,w-2*patchRadius-1)||
  !within(minTextureVariance,1,2000)||
  !within(uniquenessMargin,.01,.6)||
  !within(maxDepthJumpRatio,.005,.5)||
  !Number.isInteger(minCorrespondences)||minCorrespondences<8||
  minCorrespondences>100000||
  !Number.isSafeInteger(maxPixelComparisons)||maxPixelComparisons<100000||
  maxPixelComparisons>500000000)err('BOUNDED_RECONSTRUCTION_SETTINGS_REQUIRED');
 const cols=Math.floor((w-2*patchRadius-1)/stride)+1,
  rows=Math.floor((h-2*patchRadius-1)/stride)+1;
 const possible=cols*rows*(maxDisparity-minDisparity+1)*
  (patchRadius*2+1)**2*2;
 if(possible>maxPixelComparisons)err('STEREO_WORK_LIMIT_EXCEEDED');
 const L=luminance(left),R=luminance(right);
 const pts=new Float32Array(cols*rows*3),
  uvs=new Float32Array(cols*rows*2),
  depths=new Float32Array(cols*rows),confidence=new Float32Array(cols*rows);
 const validGrid=new Uint8Array(cols*rows),gridToVertex=new Int32Array(cols*rows).fill(-1);
 const bestDirection=(A,B,x,y,dir)=>{
  let best=Infinity,second=Infinity,disparity=0;
  for(let d=minDisparity;d<=maxDisparity;d++){
   const target=x+dir*d;
   if(target-patchRadius<0||target+patchRadius>=w)continue;
   const cost=patchCost(A,B,x,target,y,w,patchRadius);
   if(cost<best){second=best;best=cost;disparity=d;}
   else if(cost<second)second=cost;
  }
  return {best,second,d:disparity};
 };
 let accepted=0,lowTexture=0,ambiguous=0,inconsistent=0,noMatches=0;
 for(let gy=0;gy<rows;gy++){
  const y=patchRadius+gy*stride;if(y+patchRadius>=h)continue;
  for(let gx=0;gx<cols;gx++){
   const x=patchRadius+gx*stride;
   if(x+patchRadius>=w)continue;
   const at=gy*cols+gx;
   if(!L.alpha[y*w+x]||
    localTexture(L.grey,x,y,w,patchRadius)<minTextureVariance){lowTexture++;continue;}
   const f=bestDirection(L.grey,R.grey,x,y,-1);
   if(!valid(f.best)||!f.d){noMatches++;continue;}
   const uniqueness=(f.second-f.best)/Math.max(f.second,1);
   if(uniqueness<uniquenessMargin){ambiguous++;continue;}
   const xr=x-f.d;
   if(!R.alpha[y*w+xr]){inconsistent++;continue;}
   const backward=bestDirection(R.grey,L.grey,xr,y,+1);
   if(Math.abs(backward.d-f.d)>1||!valid(backward.best)){
    inconsistent++;continue;
   }
   const z=cal.focalPx*cal.baselineMm/f.d,
    px=(x-cal.principalX)*z/cal.focalPx,
    py=-(y-cal.principalY)*z/cal.focalPx;
   if(!finite3([px,py,z])||z<=0)continue;
   pts.set([px,py,z],at*3);
   uvs.set([x/(w-1),1-y/(h-1)],at*2);
   depths[at]=z;confidence[at]=Math.max(0,Math.min(1,uniqueness));
   validGrid[at]=1;gridToVertex[at]=accepted++;
  }
 }
 if(accepted<minCorrespondences)err('INSUFFICIENT_UNAMBIGUOUS_STEREO_DEPTH');
 const positions=new Float32Array(accepted*3),
  texcoords=new Float32Array(accepted*2),vertexConfidence=new Float32Array(accepted);
 for(let at=0;at<validGrid.length;at++){
  if(!validGrid[at])continue;
  const k=gridToVertex[at];positions.set(pts.subarray(at*3,at*3+3),k*3);
  texcoords.set(uvs.subarray(at*2,at*2+2),k*2);
  vertexConfidence[k]=confidence[at];
 }
 const indices=[],join=(a,b,c)=>{
  if(!validGrid[a]||!validGrid[b]||!validGrid[c])return;
  const zs=[depths[a],depths[b],depths[c]];
  if((Math.max(...zs)-Math.min(...zs))/Math.min(...zs)>maxDepthJumpRatio)return;
  // camera-facing triangle orientation for front surfaces
  const A=gridToVertex[a],B=gridToVertex[b],C=gridToVertex[c];
  const pa=positions.subarray(A*3,A*3+3),pb=positions.subarray(B*3,B*3+3),
   pc=positions.subarray(C*3,C*3+3);
  const ux=pb[0]-pa[0],uy=pb[1]-pa[1],uz=pb[2]-pa[2],
   vx=pc[0]-pa[0],vy=pc[1]-pa[1],vz=pc[2]-pa[2],
   nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
  if(!valid(nz)||Math.hypot(nx,ny,nz)<1e-7)return;
  // Maintain original source image orientation. +/-Z depends on facing.
  if(nz>0)indices.push(A,C,B);else indices.push(A,B,C);
 };
 for(let gy=0;gy<rows-1;gy++)for(let gx=0;gx<cols-1;gx++){
  const a=gy*cols+gx,b=a+1,c=a+cols,d=c+1;
  join(a,c,b);join(b,c,d);
 }
 if(indices.length<minCorrespondences*3/2)
  err('STEREO_SURFACE_TOO_FRAGMENTED_NO_FAKE_MESH');
 let minZ=Infinity,maxZ=-Infinity,minX=Infinity,maxX=-Infinity;
 for(let i=0;i<accepted;i++){
  const x=positions[i*3],z=positions[i*3+2];
  minZ=Math.min(minZ,z);maxZ=Math.max(maxZ,z);
  minX=Math.min(minX,x);maxX=Math.max(maxX,x);
 }
 return Object.freeze({
  schema:AIG713_SCHEMA,positions,uvs:texcoords,
  indices:Uint32Array.from(indices),confidence:vertexConfidence,
  vertexCount:accepted,triangleCount:indices.length/3,
  leftSHA256:cal.leftSHA256,rightSHA256:cal.rightSHA256,
  physicalBaselineMm:cal.baselineMm,focalPx:cal.focalPx,
  unit:'mm',metricScaleFrom:'USER_MEASURED_CAMERA_BASELINE',
  xyzReference:'LEFT_CAMERA_OPTICAL_CENTRE_X_RIGHT_Y_UP_Z_FORWARD',
  leftPhotoTextureUV:true,
  depthMmRange:[minZ,maxZ],visibleSurfaceWidthMm:maxX-minX,
  oneToOneUnitScale:true,
  physicallyVerifiedIndividualPointAccuracy:false,
  backsideReconstructed:false,
  hiddenGeometryInvented:false,
  faceIdentityApproval:false,
  worldCADOriginUnknown:true,
  limitation:'FRONT_CAMERA_VISIBLE_SURFACE_FROM_REVIEWED_CALIBRATED_STEREO',
  stereoEvidence:{sampledGridPoints:cols*rows,
   acceptedMatches:accepted,rejectedLowTexture:lowTexture,
   rejectedAmbiguous:ambiguous,rejectedInconsistent:inconsistent,
   rejectedNoMatch:noMatches,knownCameraBaseline:true}
 });
}
