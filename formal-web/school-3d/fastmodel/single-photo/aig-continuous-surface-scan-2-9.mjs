/**
 * AIG Real3D 2.9 — true indexed 3D surface sections and virtual 5-axis
 * inspection. Unlike the old colour-block test this produces curved XYZ
 * triangles and surface normals from source-visible 2D class pixels.
 *
 * One RGB view has no measured depth. Elliptical back/front depth is explicitly
 * PRIOR_INFERRED. 5-axis probes rotate around the GENERATED surface; they
 * are simulated surface inspection samples, NOT radar echoes or real scans.
 * For real 1:1 geometry use measured depth/multi-view calibrated evidence.
 * Source/camera/GLB/NC are NEVER overwritten.
 */
export const AIG29_SCHEMA='AIG_REAL3D_2_9_TRUE_CONTINUOUS_SECTION_SURFACE_5AX_PROBE';
const fail=x=>{throw Error('AIG29_'+x)};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const length=(x,y,z)=>Math.hypot(x,y,z);
const allowed=new Set([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23]);
const MIN_PIXELS=48;
function sourceContract({width,height,labels,pixels,sourceSha256,bodyHeightUnits,depthRatio,radialSegments,sliceStep}){
 if(!Number.isInteger(width)||!Number.isInteger(height)||
  width<128||height<128||width*height>2_000_000||
  !(labels instanceof Uint8Array)||labels.length!==width*height||
  !(pixels instanceof Uint8Array||pixels instanceof Uint8ClampedArray)||
  pixels.length!==width*height*4||
  typeof sourceSha256!=='string'||!/^sha256:[a-f0-9]{64}$/.test(sourceSha256)||
  !Number.isFinite(bodyHeightUnits)||bodyHeightUnits<.5||bodyHeightUnits>3||
  !Number.isFinite(depthRatio)||depthRatio<.25||depthRatio>1.3||
  !Number.isInteger(radialSegments)||radialSegments<16||radialSegments>96||
  radialSegments%4!==0||!Number.isInteger(sliceStep)||sliceStep<1||sliceStep>12)
  fail('SOURCE_BOUND_PIXELS_AND_RESOLUTION_REQUIRED');
}
function profileForClass(labels,width,height,label){
 const rows=[],color=[0,0,0],rowCount=[];
 let top=height,left=width,right=-1,bottom=-1,total=0;
 for(let y=0;y<height;y++){
  let min=width,max=-1,sum=0,count=0;
  for(let x=0;x<width;x++)if(labels[y*width+x]===label){
   min=Math.min(min,x);max=Math.max(max,x);sum+=x;count++;total++;
  }
  if(count){
   top=Math.min(top,y);bottom=Math.max(bottom,y);
   left=Math.min(left,min);right=Math.max(right,max);
   rows.push({y,min,max,mid:sum/count,width:max-min+1,count});
  }
 }
 if(total<MIN_PIXELS||rows.length<5||right-left<3)return null;
 return {label,rows,top,bottom,left,right,total};
}
function interpolate(rows,y){
 if(y<=rows[0].y)return rows[0];
 if(y>=rows[rows.length-1].y)return rows[rows.length-1];
 let lo=0,hi=rows.length-1;
 while(hi-lo>1){const mid=(lo+hi)>>1;if(rows[mid].y<y)lo=mid;else hi=mid}
 const a=rows[lo],b=rows[hi],t=(y-a.y)/(b.y-a.y);
 return {y,min:a.min*(1-t)+b.min*t,max:a.max*(1-t)+b.max*t,
  mid:a.mid*(1-t)+b.mid*t,width:a.width*(1-t)+b.width*t,
  count:a.count*(1-t)+b.count*t};
}
function sourceColor(profile,labels,pixels,width){
 // Use visible source pixels only; this DOES NOT measure back-side albedo.
 const rgb=[0,0,0],idx=[];
 const step=Math.max(1,Math.floor(profile.rows.length/16));
 for(let k=0;k<profile.rows.length;k+=step){
  const row=profile.rows[k];
  const x=clamp(Math.round(row.mid),0,width-1),i=row.y*width+x;
  if(labels[i]===profile.label&&pixels[i*4+3]>128)idx.push(i);
 }
 if(idx.length<3)return [0.45,0.50,0.58];
 for(const i of idx)for(let c=0;c<3;c++)rgb[c]+=pixels[i*4+c]/255;
 return rgb.map(c=>+(c/idx.length).toFixed(5));
}
function verticesAndNormals(positions,indices){
 const normals=new Float32Array(positions.length);
 let zeroArea=0;
 for(let j=0;j<indices.length;j+=3){
  const a=indices[j]*3,b=indices[j+1]*3,c=indices[j+2]*3;
  const ax=positions[b]-positions[a],ay=positions[b+1]-positions[a+1],
   az=positions[b+2]-positions[a+2];
  const bx=positions[c]-positions[a],by=positions[c+1]-positions[a+1],
   bz=positions[c+2]-positions[a+2];
  const nx=ay*bz-az*by,ny=az*bx-ax*bz,nz=ax*by-ay*bx;
  if(length(nx,ny,nz)<1e-10){zeroArea++;continue}
  for(const v of [a,b,c]){
   normals[v]+=nx;normals[v+1]+=ny;normals[v+2]+=nz;
  }
 }
 for(let j=0;j<normals.length;j+=3){
  const d=length(normals[j],normals[j+1],normals[j+2])||1;
  normals[j]/=d;normals[j+1]/=d;normals[j+2]/=d;
 }
 return {normals,zeroArea};
}
function makeSurface(profile,width,height,{bodyHeightUnits,depthRatio,radialSegments,sliceStep},labels,pixels){
 // True 3D world uses x-horizontal, y-height, z-depth. The RGB projection
 // defines visible x and y only. Back and z-depth remain prior-based.
 const profileHeight=Math.max(8,profile.bottom-profile.top+1);
 const ringCount=clamp(Math.ceil(profileHeight/sliceStep)+1,6,400);
 const positions=[],indices=[],ringPoints=[];
 const cos=Math.cos,sin=Math.sin,TAU=Math.PI*2;
 // Class-specific shape section is a geometry prior, not claimed anatomy:
 // limb/hair/head slices remain separate where source class labels differ.
 for(let ring=0;ring<ringCount;ring++){
  const t=ring/(ringCount-1),py=profile.top+t*(profile.bottom-profile.top);
  const p=interpolate(profile.rows,py);
  const outsideTop=Math.min(1,t/.05),outsideBottom=Math.min(1,(1-t)/.05);
  const taper=Math.max(.07,Math.min(outsideTop,outsideBottom));
  const rx=Math.max(.003,p.width/(2*height)*bodyHeightUnits*taper);
  const rz=Math.max(.002,rx*depthRatio);
  const worldX=(p.mid-(width-1)/2)/height*bodyHeightUnits;
  const worldY=((height-1-py)/height)*bodyHeightUnits;
  const idRing=[];
  for(let r=0;r<radialSegments;r++){
   const angle=r*TAU/radialSegments;
   // A continuous oval cross-section, never a box/card.
   const i=positions.length/3;idRing.push(i);
   positions.push(worldX+rx*cos(angle),worldY,rz*sin(angle));
  }
  ringPoints.push(idRing);
 }
 for(let row=0;row<ringCount-1;row++)
  for(let k=0;k<radialSegments;k++){
   const n=(k+1)%radialSegments,a=ringPoints[row][k],
    b=ringPoints[row][n],c=ringPoints[row+1][k],
    d=ringPoints[row+1][n];
   // outward facing triangle orientation
   indices.push(a,b,c,b,d,c);
  }
 // Both section ends must be sealed. Unlike a flat screen card, this
 // represents a finite 3D interior surface. Duplicate cap vertices would
 // create non-manifold seams; index the existing ring instead.
 const topCenter=positions.length/3,top=interpolate(profile.rows,profile.top);
 positions.push((top.mid-(width-1)/2)/height*bodyHeightUnits,
  ((height-1-profile.top)/height)*bodyHeightUnits,0);
 const bottomCenter=positions.length/3,bot=interpolate(profile.rows,profile.bottom);
 positions.push((bot.mid-(width-1)/2)/height*bodyHeightUnits,
  ((height-1-profile.bottom)/height)*bodyHeightUnits,0);
 for(let k=0;k<radialSegments;k++){
  const next=(k+1)%radialSegments;
  indices.push(topCenter,ringPoints[0][next],ringPoints[0][k]);
  const last=ringPoints[ringPoints.length-1];
  indices.push(bottomCenter,last[k],last[next]);
 }
 const {normals,zeroArea}=verticesAndNormals(positions,indices);
 const result={
  sourceLabelId:profile.label,vertexCount:positions.length/3,
  triangleCount:indices.length/3,
  radialSegments,ringCount,surfaceHeightPixels:profileHeight,
  sourceVisiblePixelCount:profile.total,
  sourceVisibleRGB:sourceColor(profile,labels,pixels,width),
  positions:new Float32Array(positions),
  normals,indices:new Uint32Array(indices),
  degeneracyCount:zeroArea,
  depthProvenance:'PRIOR_INFERRED_ELLIPTIC_SECTION_NOT_PHOTOGRAPHIC_DEPTH',
  real3DSurface:true,continuousCrossSections:true,
  indexedEndCapsClosed:true,
  actuallyMeasuredBackSurface:false
 };
 if(zeroArea>0)fail('SURFACE_CONTAINS_DEGENERATE_TRIANGLES');
 return result;
}
export function buildAIG29ContinuousSurface({
 width,height,labels,pixels,sourceSha256,
 bodyHeightUnits=2,depthRatio=.60,radialSegments=48,sliceStep=4
}={}){
 sourceContract({width,height,labels,pixels,sourceSha256,
  bodyHeightUnits,depthRatio,radialSegments,sliceStep});
 const ids=[...new Set(labels)].filter(x=>allowed.has(x)).sort((a,b)=>a-b);
 if(!ids.length||ids.length>16)fail('SOURCE_HAS_NO_USABLE_HUMAN_OR_ENVIRONMENT_CLASSES');
 const surfaces=[];
 for(const id of ids){
  const p=profileForClass(labels,width,height,id);
  if(!p)continue;
  surfaces.push(makeSurface(p,width,height,{
   bodyHeightUnits,depthRatio,radialSegments,sliceStep
  },labels,pixels));
 }
 if(!surfaces.length)fail('NO_ACTUAL_VISIBLE_SILHOUETTE_TO_RECONSTRUCT');
 return {
  schema:AIG29_SCHEMA,sourceSha256,sourceSize:[width,height],
  bodyHeightUnits,bodyHeightUnitsAre:'TECHNICAL_RELATIVE_UNITS',
  sourcePhotoPixelsActuallyUsed:true,semanticClassSourceWasUserOrModelLabel:true,
  measured3DScale:false,measuredDepth:false,
  inferredFrontAndBackDepth:true,sourceImageUnchanged:true,
  originalGLBPreserved:true,noFakeBillboardsOrVoxelCubes:true,
  continuousTriangleCount:surfaces.reduce((v,x)=>v+x.triangleCount,0),
  continuousVertexCount:surfaces.reduce((v,x)=>v+x.vertexCount,0),
  surfaces,releaseAllowed:false
 };
}
/**
 * CNC 5-axis-inspired A/B/C inspection of REAL computed 3D vertices/normals.
 * The virtual probe is normal-offset to each sampled generated surface
 * vertex; A/B are geometric orientation angles, not physical machine encoders.
 * The positions are NOT ultrasound/LIDAR returns or real cutter NC.
 */
export function inspectAIG29FiveAxisSurface(reconstruction,{
 perSurfaceSamples=96,standoff=0.09
}={}){
 if(reconstruction?.schema!==AIG29_SCHEMA||
  !Array.isArray(reconstruction.surfaces)||!reconstruction.surfaces.length||
  !Number.isInteger(perSurfaceSamples)||perSurfaceSamples<8||
  perSurfaceSamples>2000||!Number.isFinite(standoff)||
  standoff<.005||standoff>.5)fail('VERIFIED_MESH_AND_SAFE_INSPECTION_REQUIRED');
 const samples=[],angles=[];
 for(const surface of reconstruction.surfaces){
  const {positions,normals,indices}=surface,vertices=positions.length/3,
   stride=Math.max(1,Math.floor(vertices/perSurfaceSamples));
  for(let i=0;i<vertices;i+=stride){
   const k=i*3,n=[normals[k],normals[k+1],normals[k+2]];
   const l=length(...n);
   if(l<.5)continue;
   const xyz=[positions[k],positions[k+1],positions[k+2]];
   const probeXYZ=xyz.map((v,j)=>v+standoff*n[j]);
   const A=Math.atan2(n[1],Math.hypot(n[0],n[2]))*180/Math.PI;
   const B=Math.atan2(n[0],n[2])*180/Math.PI;
   if(![...probeXYZ,A,B].every(Number.isFinite))
    fail('FIVE_AXIS_NORMAL_IS_NONFINITE');
   samples.push({sourceLabelId:surface.sourceLabelId,
    onGeneratedSurfaceXYZ:xyz,probeXYZ,
    surfaceNormal:n,axisAdeg:+A.toFixed(4),
    axisBdeg:+B.toFixed(4),standoff});
   angles.push(Math.atan2(n[0],n[2]));
  }
 }
 if(samples.length<16)fail('NOT_ENOUGH_REAL_3D_SURFACE_PROBE_POSITIONS');
 const orientations=new Set(angles.map(x=>Math.round(x*36/Math.PI)));
 return {
  schema:'AIG_REAL3D_2_9_VIRTUAL_5AX_GEOMETRIC_SURFACE_INSPECTION',
  sourceSha256:reconstruction.sourceSha256,
  inspectedActualGeneratedSurfaceNormals:true,
  interpolatedPixelsNotMachineEchoes:true,
  calibratedRealWorldDepthAvailable:false,
  actualHardwareScanPerformed:false,
  physicalCNCMachineCommandEmitted:false,
  canFeed5AxisGeometryInspectionDesign:true,
  sampleCount:samples.length,
  uniqueSurfaceNormalOrientationBins:orientations.size,
  probeSamples:samples,releaseAllowed:false
 };
}
