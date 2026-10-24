/**
 * AIG Real3D V89 — source-locked calibrated multi-photo -> UV atlas.
 * No invented unseen sides, camera solve, geometry edit, inpainting or SDF.
 * This module computes software depth from supplied ORIGINAL indexed faces,
 * then accepts photo samples only when a texel is front-facing and visible.
 * Camera calibration is user-supplied, not independently authenticated.
 * Atlas pixels are bottom-to-top rows for WebGL typed-array upload (v=0 row 0).
 */
export const AIG_REAL3D_V89_ATLAS_SCHEMA='AIG_REAL3D_V89_OBSERVED_MULTIVIEW_ATLAS_V1';
export const AIG_REAL3D_V89_VIEW_SCHEMA='AIG_REAL3D_V89_CALIBRATED_PHOTO_VIEW_V1';
const bad=x=>{throw Error('REAL3D_V89_'+x);};
const finite=Number.isFinite;
const sha=x=>typeof x==='string'&&/^[a-f0-9]{64}$/i.test(x);
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const len=v=>Math.hypot(...v);
const vec=v=>Array.isArray(v)&&v.length===3&&v.every(finite);
const bary=(x,y,a,b,c)=>{
 const den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);
 if(Math.abs(den)<1e-12)return null;
 const w0=((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(y-c[1]))/den;
 const w1=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(y-c[1]))/den;
 const w2=1-w0-w1;
 return Math.min(w0,w1,w2)>=-1e-9?[w0,w1,w2]:null;
};
function validateView(view,sourceSha256){
 if(view?.schema!==AIG_REAL3D_V89_VIEW_SCHEMA||
  view.sourceSha256!==sourceSha256||!sha(view.imageSha256)||
  typeof view.id!=='string'||!/^[a-z][a-z0-9_-]{0,31}$/i.test(view.id))
  bad('VIEW_SOURCE_OR_SHA_INVALID');
 const im=view.image,c=view.camera;
 if(!im||!Number.isInteger(im.width)||!Number.isInteger(im.height)||
  im.width<4||im.width>512||im.height<4||im.height>512||
  !Array.isArray(im.pixels)||im.pixels.length!==im.width*im.height*4||
  !im.pixels.every(v=>Number.isInteger(v)&&v>=0&&v<=255))
  bad('PHOTO_RGBA_INVALID');
 if(!c||!vec(c.position)||!vec(c.right)||!vec(c.up)||!vec(c.forward)||
  ![c.fx,c.fy,c.cx,c.cy,c.near].every(finite)||
  c.fx<=0||c.fy<=0||c.fx>1e5||c.fy>1e5||
  c.near<0.001||c.near>10||
  c.cx<0||c.cx>im.width||c.cy<0||c.cy>im.height||
  [c.right,c.up,c.forward].some(v=>Math.abs(len(v)-1)>0.01)||
  Math.abs(dot(c.right,c.up))>0.01||
  Math.abs(dot(c.right,c.forward))>0.01||
  Math.abs(dot(c.up,c.forward))>0.01||
  dot(cross(c.right,c.up),c.forward)>-0.99)
  bad('CALIBRATED_CAMERA_ORIENTATION_INVALID');
 return {view,image:im,c};
}
function projection(point,c){
 const ray=sub(point,c.position),z=dot(ray,c.forward);
 if(z<=c.near)return null;
 return [c.cx+c.fx*dot(ray,c.right)/z,
  c.cy-c.fy*dot(ray,c.up)/z,z];
}
function zbufferFor(mesh,view,budget){
 const {width,height}=view.image,c=view.c;
 const z=new Float64Array(width*height);z.fill(Infinity);
 let raster=0,triangles=0;
 for(let k=0;k<mesh.indices.length;k+=3){
  const ids=mesh.indices.slice(k,k+3);
  const xyz=ids.map(i=>mesh.positions.slice(i*3,i*3+3));
  const p=xyz.map(v=>projection(v,c));
  // Without clipping the near plane, a partially visible source face
  // could incorrectly expose a hidden back surface. Fail closed.
  if(p.some(x=>!x))bad('NEAR_PLANE_SOURCE_CLIPPING_NOT_SUPPORTED');
  const a=[p[0][0],p[0][1]],b=[p[1][0],p[1][1]],
   d=[p[2][0],p[2][1]];
  const xmin=Math.max(0,Math.floor(Math.min(a[0],b[0],d[0]))),
   xmax=Math.min(width-1,Math.ceil(Math.max(a[0],b[0],d[0]))),
   ymin=Math.max(0,Math.floor(Math.min(a[1],b[1],d[1]))),
   ymax=Math.min(height-1,Math.ceil(Math.max(a[1],b[1],d[1])));
  if(xmax<xmin||ymax<ymin)continue;
  raster+=(xmax-xmin+1)*(ymax-ymin+1);
  if(raster>budget)bad('PHOTO_DEPTH_RASTER_WORK_BUDGET');
  for(let y=ymin;y<=ymax;y++)for(let x=xmin;x<=xmax;x++){
   const w=bary(x+.5,y+.5,a,b,d);
   if(!w)continue;
   const depth=1/(w[0]/p[0][2]+w[1]/p[1][2]+w[2]/p[2][2]);
   const idx=y*width+x;
   if(depth<z[idx])z[idx]=depth;
  }
  triangles++;
 }
 return {z,triangles};
}
export function buildAIGReal3DMultiViewAtlas({
 mesh,uvCoordinates,sourceSha256,uvManifestSourceSha256,
 views,atlasSize=128,minimumFacing=0.12,depthTolerance=0.008
}={}){
 if(!mesh?.actualXYZTriangles||!Array.isArray(mesh.positions)||
  !Array.isArray(mesh.normals)||!Array.isArray(mesh.indices)||
  !Number.isInteger(mesh.vertexCount)||!Number.isInteger(mesh.triangleCount)||
  mesh.triangleCount<1||mesh.triangleCount>100000||
  mesh.indices.length!==mesh.triangleCount*3||
  mesh.positions.length!==mesh.vertexCount*3||
  mesh.normals.length!==mesh.vertexCount*3||
  !mesh.positions.every(finite)||!mesh.normals.every(finite)||
  !mesh.indices.every(id=>Number.isInteger(id)&&id>=0&&id<mesh.vertexCount)||
  !sha(sourceSha256)||uvManifestSourceSha256!==sourceSha256||
  !Array.isArray(uvCoordinates)||uvCoordinates.length!==mesh.vertexCount*2||
  !uvCoordinates.every(x=>finite(x)&&x>=0&&x<=1)||
  !Number.isInteger(atlasSize)||atlasSize<8||atlasSize>256||
  !finite(minimumFacing)||minimumFacing<0||minimumFacing>1||
  !finite(depthTolerance)||depthTolerance<0||depthTolerance>0.1||
  !Array.isArray(views)||views.length<1||views.length>6)
  bad('SOURCE_UV_VIEW_OR_BUDGET_INVALID');
 const validated=views.map(view=>validateView(view,sourceSha256));
 if(new Set(validated.map(x=>x.view.id)).size!==views.length)
  bad('DUPLICATED_SOURCE_PHOTO_ID');
 const depth=validated.map(x=>zbufferFor(mesh,x,20_000_000));
 const size=atlasSize,n=size*size,atlas=new Array(n*4).fill(0),
  mask=new Array(n*4).fill(0),owner=new Int32Array(n).fill(-1),
  ownershipXYZ=new Float64Array(n*3),hits=Array(views.length).fill(0);
 let uvWork=0,uvSurface=0,observed=0,occluded=0,backface=0,outside=0;
 for(let tri=0;tri<mesh.indices.length;tri+=3){
  const ids=mesh.indices.slice(tri,tri+3);
  const xyz=ids.map(i=>mesh.positions.slice(i*3,i*3+3));
  const u=ids.map(i=>uvCoordinates.slice(i*2,i*2+2));
  const area=(u[1][0]-u[0][0])*(u[2][1]-u[0][1])-
   (u[2][0]-u[0][0])*(u[1][1]-u[0][1]);
  if(Math.abs(area)<1e-10)bad('DEGENERATE_OR_MISSING_SOURCE_UV');
  const nrm=ids.map(i=>mesh.normals.slice(i*3,i*3+3));
  const xa=u.map(v=>[v[0]*size,v[1]*size]);
  const xmin=Math.max(0,Math.floor(Math.min(...xa.map(v=>v[0])))),
   xmax=Math.min(size-1,Math.ceil(Math.max(...xa.map(v=>v[0])))),
   ymin=Math.max(0,Math.floor(Math.min(...xa.map(v=>v[1])))),
   ymax=Math.min(size-1,Math.ceil(Math.max(...xa.map(v=>v[1]))));
  uvWork+=(xmax-xmin+1)*(ymax-ymin+1);
  if(uvWork>15_000_000)bad('UV_ATLAS_RASTER_WORK_BUDGET');
  for(let y=ymin;y<=ymax;y++)for(let x=xmin;x<=xmax;x++){
   const w=bary(x+.5,y+.5,xa[0],xa[1],xa[2]);
   if(!w)continue;
   const idx=y*size+x,point=[0,0,0],normal=[0,0,0];
   for(let j=0;j<3;j++)for(let d=0;d<3;d++){
    point[d]+=w[j]*xyz[j][d];normal[d]+=w[j]*nrm[j][d];
   }
   if(owner[idx]!==-1){
    if(len(sub(point,Array.from(ownershipXYZ.slice(idx*3,idx*3+3))))>1e-5)
     bad('SOURCE_UV_OVERLAPPING_SURFACES');
    continue;
   }
   if(len(normal)<1e-8)bad('SOURCE_NORMAL_NOT_DERIVABLE');
   const normalLen=len(normal);
   for(let d=0;d<3;d++)normal[d]/=normalLen;
   owner[idx]=tri/3;
   for(let d=0;d<3;d++)ownershipXYZ[idx*3+d]=point[d];
   uvSurface++;
   let weight=0,rgb=[0,0,0],validViews=0;
   for(let vi=0;vi<validated.length;vi++){
    const {image,c}=validated[vi],p=projection(point,c);
    if(!p){outside++;continue;}
    const px=Math.floor(p[0]),py=Math.floor(p[1]);
    if(px<0||px>=image.width||py<0||py>=image.height){outside++;continue;}
    const facing=dot(normal,sub(c.position,point))/len(sub(c.position,point));
    if(facing<minimumFacing){backface++;continue;}
    const nearest=depth[vi].z[py*image.width+px];
    if(!finite(nearest)||Math.abs(p[2]-nearest)>
     depthTolerance+0.002*p[2]){occluded++;continue;}
    const photoIndex=(py*image.width+px)*4,a=image.pixels[photoIndex+3]/255;
    if(a<0.98)continue;
    const confidence=facing*facing*a;
    for(let d=0;d<3;d++)rgb[d]+=confidence*image.pixels[photoIndex+d];
    weight+=confidence;validViews++;hits[vi]++;
   }
   const off=idx*4;
   if(weight>0){
    for(let d=0;d<3;d++)atlas[off+d]=Math.min(255,Math.round(rgb[d]/weight));
    atlas[off+3]=255;observed++;
    const confidenceByte=Math.round(255*validViews/validated.length);
    mask[off]=mask[off+1]=mask[off+2]=confidenceByte;mask[off+3]=255;
   }else{
    // Bright magenta = UNKNOWN, not a fabricated reconstruction.
    atlas[off]=255;atlas[off+1]=0;atlas[off+2]=255;atlas[off+3]=255;
    mask[off]=mask[off+1]=mask[off+2]=0;mask[off+3]=255;
   }
  }
 }
 if(!uvSurface)bad('NO_ATLAS_SURFACE_TEXELS');
 if(!observed)bad('NO_VISIBLE_SOURCE_PHOTO_PIXELS');
 const unchanged=mesh.positions.length===mesh.vertexCount*3&&
  mesh.indices.length===mesh.triangleCount*3;
 return {
  schema:AIG_REAL3D_V89_ATLAS_SCHEMA,sourceSha256,
  albedoImage:{width:size,height:size,pixels:atlas},
  observationMask:{width:size,height:size,pixels:mask},
  evidence:{
   originalTriangles:mesh.triangleCount,originalVertices:mesh.vertexCount,
   sourceGeometryReferencedNotModified:unchanged,
   atlasSize:size,uvSurfaceTexels:uvSurface,
   observedSurfaceTexels:observed,unknownSurfaceTexels:uvSurface-observed,
   observedCoveragePercent:Math.round(10000*observed/uvSurface)/100,
   contributorPhotoIds:validated.map(({view})=>view.id),
   observedSampleCountsByPhoto:hits,
   occludedSamplesRejected:occluded,backfacingSamplesRejected:backface,
   outOfFrameSamplesRejected:outside,
   explicitUnknownMagentaNotInvented:true,
   cameraCalibrationIndependentlyVerified:false,
   photoToScanPhysicalAccuracyVerified:false,
   singlePhotoFull3DRecoveryPASS:false,productionReleasePASS:false
  }
 };
}
