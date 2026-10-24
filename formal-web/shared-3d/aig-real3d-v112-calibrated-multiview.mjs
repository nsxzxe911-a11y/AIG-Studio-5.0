/**
 * V112 FastModel Real3D: two INDEPENDENT calibrated color + metric-depth
 * observations registered into one real GLB world coordinate frame.
 * This is multi-view OBSERVED-SURFACE ASSEMBLY, not watertight fusion,
 * learned single-photo depth, anatomy completion or 1:1 certification.
 */
export const AIG_REAL3D_V112_SCHEMA='AIG_REAL3D_V112_CALIBRATED_TWO_VIEW_OBSERVED_XYZ_GLB_V1';
const fail=x=>{throw Error('REAL3D_V112_'+x);};
const finite=Number.isFinite,sha=s=>typeof s==='string'&&/^[0-9a-f]{64}$/i.test(s);
const png=b=>b instanceof Uint8Array&&b.length>=64&&
 [137,80,78,71,13,10,26,10].every((v,i)=>b[i]===v);
const pad4=n=>(n+3)&~3;
const buf=x=>new Uint8Array(x.buffer,x.byteOffset,x.byteLength);
function validateMatrix(m){
 if(!Array.isArray(m)||m.length!==16||!m.every(finite)||
  [m[3],m[7],m[11],m[15]].some((x,i)=>Math.abs(x-(i===3?1:0))>1e-10))
  fail('CAMERA_TO_WORLD_MATRIX_MUST_BE_AFFINE');
 const axes=[[m[0],m[1],m[2]],[m[4],m[5],m[6]],[m[8],m[9],m[10]]];
 for(let i=0;i<3;i++){
  if(Math.abs(Math.hypot(...axes[i])-1)>1e-6)fail('CAMERA_ROTATION_NOT_UNIT');
  for(let j=i+1;j<3;j++)if(Math.abs(axes[i].reduce((s,v,k)=>s+v*axes[j][k],0))>1e-6)
   fail('CAMERA_ROTATION_NON_ORTHOGONAL');
 }
 const [a,b,c]=axes,det=a[0]*(b[1]*c[2]-b[2]*c[1])-
  b[0]*(a[1]*c[2]-a[2]*c[1])+c[0]*(a[1]*b[2]-a[2]*b[1]);
 if(Math.abs(det-1)>1e-6)fail('CAMERA_ROTATION_REFLECTED_OR_INVALID');
}
function worldPoint(v,x,y){
 const d=v.depthValuesMM[y*v.width+x];
 if(!finite(d)||d<=0||d>50000)return null;
 const {fxPx,fyPx,cxPx,cyPx}=v.intrinsics;
 const local=[(x-cxPx)*d/fxPx,(cyPx-y)*d/fyPx,d];
 const m=v.cameraToWorldMM;
 return [
  m[0]*local[0]+m[4]*local[1]+m[8]*local[2]+m[12],
  m[1]*local[0]+m[5]*local[1]+m[9]*local[2]+m[13],
  m[2]*local[0]+m[6]*local[1]+m[10]*local[2]+m[14]
 ];
}
function validateView(v,index){
 if(!v||!Number.isInteger(v.width)||!Number.isInteger(v.height)||
  v.width<16||v.height<16||v.width>512||v.height>512||
  !png(v.imagePNGBytes)||v.imagePNGBytes.length>12e6||
  !sha(v.photoSha256)||!sha(v.depthSha256)||v.photoSha256===v.depthSha256||
  v.depthMeasuredAndCalibrated!==true||
  !(v.depthValuesMM instanceof Float32Array)||
  v.depthValuesMM.length!==v.width*v.height||
  !v.depthValuesMM.every(x=>finite(x)&&x>=0&&x<=50000)||
  !v.intrinsics||!['fxPx','fyPx','cxPx','cyPx'].every(k=>finite(v.intrinsics[k]))||
  v.intrinsics.fxPx<1||v.intrinsics.fyPx<1||
  v.intrinsics.fxPx>1e6||v.intrinsics.fyPx>1e6||
  Math.abs(v.intrinsics.cxPx)>1e6||Math.abs(v.intrinsics.cyPx)>1e6)
  fail('VIEW_'+index+'_NEEDS_REAL_COLOR_DEPTH_SHA_CALIBRATION');
 validateMatrix(v.cameraToWorldMM);
}
function worldDistance(a,b){return Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);}
function glb(json,binary){
 const j=new TextEncoder().encode(JSON.stringify(json)),jLen=pad4(j.length),bLen=pad4(binary.length);
 const out=new Uint8Array(12+8+jLen+8+bLen),v=new DataView(out.buffer);
 v.setUint32(0,0x46546c67,true);v.setUint32(4,2,true);v.setUint32(8,out.length,true);
 v.setUint32(12,jLen,true);v.setUint32(16,0x4e4f534a,true);
 out.fill(32,20,20+jLen);out.set(j,20);
 const off=20+jLen;
 v.setUint32(off,bLen,true);v.setUint32(off+4,0x004e4942,true);
 out.set(binary,off+8);return out;
}
function makePatch(view,step,maxEdgeMM){
 const w=view.width,h=view.height,
  xs=[],ys=[];
 for(let x=0;x<w;x+=step)xs.push(x);
 for(let y=0;y<h;y+=step)ys.push(y);
 if(xs.at(-1)!==w-1)xs.push(w-1);
 if(ys.at(-1)!==h-1)ys.push(h-1);
 const pos=[],uv=[],indices=[],idMap=new Map();
 const vertex=(x,y)=>{
  const k=y*w+x;
  if(idMap.has(k))return idMap.get(k);
  const p=worldPoint(view,x,y);
  if(!p)return -1;
  const id=pos.length/3;idMap.set(k,id);
  pos.push(p[0]/1000,p[1]/1000,p[2]/1000);
  uv.push(x/(w-1),1-y/(h-1));return id;
 };
 let invalidDepthCells=0,occlusionGapCells=0;
 for(let row=0;row<ys.length-1;row++)for(let col=0;col<xs.length-1;col++){
  const a=worldPoint(view,xs[col],ys[row]),
   b=worldPoint(view,xs[col+1],ys[row]),
   c=worldPoint(view,xs[col],ys[row+1]),
   d=worldPoint(view,xs[col+1],ys[row+1]);
  if(!a||!b||!c||!d){invalidDepthCells++;continue;}
  // Reject high-discontinuity cells: never stitch across an occlusion.
  if([worldDistance(a,b),worldDistance(a,c),worldDistance(b,d),
   worldDistance(c,d),worldDistance(b,c)].some(x=>x>maxEdgeMM)){
   occlusionGapCells++;continue;
  }
  const tl=vertex(xs[col],ys[row]),tr=vertex(xs[col+1],ys[row]),
   bl=vertex(xs[col],ys[row+1]),br=vertex(xs[col+1],ys[row+1]);
  indices.push(tl,bl,tr,tr,bl,br);
 }
 if(indices.length<36)fail('OBSERVED_PATCH_TOO_SMALL_NO_REAL_TRIANGLES');
 const normal=new Float32Array(pos.length);
 for(let i=0;i<indices.length;i+=3){
  const ia=indices[i]*3,ib=indices[i+1]*3,ic=indices[i+2]*3;
  const ab=[0,1,2].map(j=>pos[ib+j]-pos[ia+j]),
   ac=[0,1,2].map(j=>pos[ic+j]-pos[ia+j]),
   cr=[ab[1]*ac[2]-ab[2]*ac[1],
    ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];
  if(Math.hypot(...cr)<1e-14)fail('DEPTH_PATCH_DEGENERATE_TRIANGLE');
  for(const p of [ia,ib,ic])for(let j=0;j<3;j++)normal[p+j]+=cr[j];
 }
 for(let k=0;k<normal.length;k+=3){
  const len=Math.hypot(normal[k],normal[k+1],normal[k+2]);
  if(len<1e-14)fail('DEPTH_PATCH_INVALID_VERTEX_NORMAL');
  for(let j=0;j<3;j++)normal[k+j]/=len;
 }
 const coords=[0,1,2].map(i=>pos.filter((_,j)=>j%3===i));
 return {positions:new Float32Array(pos),normals:normal,
  uvs:new Float32Array(uv),indices:new Uint32Array(indices),
  min:coords.map(x=>Math.min(...x)),max:coords.map(x=>Math.max(...x)),
  invalidDepthCells,occlusionGapCells,vertices:pos.length/3,triangles:indices.length/3};
}
/**
 * Each pair is a trusted corresponding visible physical point, independently
 * measured in BOTH images. The calibration itself is not externally proven.
 */
export function buildAIGReal3DV112CalibratedMultiViewGLB({
 views,correspondences,step=2,maxSurfaceEdgeMM=35,
 maxCorrespondenceRmsMM=1
}={}){
 if(!Array.isArray(views)||views.length!==2||
  !Number.isInteger(step)||step<1||step>12||
  !finite(maxSurfaceEdgeMM)||maxSurfaceEdgeMM<.1||maxSurfaceEdgeMM>500||
  !finite(maxCorrespondenceRmsMM)||maxCorrespondenceRmsMM<.001||
  maxCorrespondenceRmsMM>20)
  fail('TWO_CALIBRATED_VIEWS_AND_BOUNDED_MESH_SAMPLING_REQUIRED');
 views.forEach(validateView);
 if(views[0].photoSha256===views[1].photoSha256||
  views[0].depthSha256===views[1].depthSha256)
  fail('TWO_INDEPENDENT_PHOTO_AND_DEPTH_SOURCES_REQUIRED');
 const m0=views[0].cameraToWorldMM,m1=views[1].cameraToWorldMM,
  cameraBaselineMM=Math.hypot(m0[12]-m1[12],m0[13]-m1[13],m0[14]-m1[14]);
 const rotationDifferent=[0,1,2,4,5,6,8,9,10].some(i=>Math.abs(m0[i]-m1[i])>.01);
 if(cameraBaselineMM<1&&!rotationDifferent)
  fail('TWO_VIEWS_SAME_CAMERA_POSE_NOT_MULTI_VIEW');
 if(!Array.isArray(correspondences)||correspondences.length<3||
  correspondences.length>32)
  fail('THREE_TRUE_SHARED_LANDMARKS_REQUIRED');
 const pts=[],residuals=[],seen=new Set();
 for(const a of correspondences){
  if(!a||![a.x0,a.y0,a.x1,a.y1].every(Number.isInteger)||
   a.x0<0||a.x0>=views[0].width||a.y0<0||a.y0>=views[0].height||
   a.x1<0||a.x1>=views[1].width||a.y1<0||a.y1>=views[1].height)
   fail('LANDMARK_PIXEL_COORDINATES_OUT_OF_BOUNDS');
  const key=[a.x0,a.y0,a.x1,a.y1].join(',');
  if(seen.has(key))fail('DUPLICATE_LANDMARK');
  seen.add(key);
  const p=worldPoint(views[0],a.x0,a.y0),
   q=worldPoint(views[1],a.x1,a.y1);
  if(!p||!q)fail('LANDMARK_DEPTH_NOT_MEASURED');
  pts.push(p);
  residuals.push(worldDistance(p,q));
 }
 // Three non-collinear shared observations prove more than one 3D point.
 const a=pts[0],ab=pts[1].map((x,i)=>x-a[i]),ac=pts[2].map((x,i)=>x-a[i]);
 const area2=Math.hypot(ab[1]*ac[2]-ab[2]*ac[1],
  ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]);
 if(area2<1)fail('SHARED_LANDMARKS_COLLINEAR_CANNOT_REGISTER');
 const rmsMM=Math.sqrt(residuals.reduce((s,d)=>s+d*d,0)/residuals.length);
 const maxMM=Math.max(...residuals);
 if(rmsMM>maxCorrespondenceRmsMM||maxMM>maxCorrespondenceRmsMM*2)
  fail('CAMERA_WORLD_ALIGNMENT_OR_LANDMARK_DEPTH_CONTRADICTED');
 const patches=views.map(v=>makePatch(v,step,maxSurfaceEdgeMM));
 let totalTriangles=patches.reduce((s,p)=>s+p.triangles,0);
 if(totalTriangles>200000)fail('GPU_TRIANGLE_SOURCE_BUDGET');
 const parts=[],bufferViews=[],accessors=[],images=[],materials=[],textures=[],meshes=[],nodes=[];
 let offset=0;
 function append(data){
  offset=pad4(offset);
  const viewIndex=bufferViews.length;
  bufferViews.push({buffer:0,byteOffset:offset,byteLength:data.byteLength});
  parts.push({offset,data});offset+=data.byteLength;return viewIndex;
 }
 function accessor(view,type,componentType,count,min,max){
  const a={bufferView:view,componentType,count,type};
  if(min)a.min=min;if(max)a.max=max;
  accessors.push(a);return accessors.length-1;
 }
 for(let i=0;i<views.length;i++){
  const v=views[i],p=patches[i];
  const position=accessor(append(buf(p.positions)),'VEC3',5126,p.vertices,p.min,p.max),
   normal=accessor(append(buf(p.normals)),'VEC3',5126,p.vertices),
   uv=accessor(append(buf(p.uvs)),'VEC2',5126,p.vertices),
   indices=accessor(append(buf(p.indices)),'SCALAR',5125,p.indices.length);
  const imageView=append(v.imagePNGBytes);
  images.push({bufferView:imageView,mimeType:'image/png'});
  textures.push({sampler:0,source:i});
  materials.push({name:'ActualObservedView'+i,doubleSided:true,
   pbrMetallicRoughness:{baseColorFactor:[1,1,1,1],
    baseColorTexture:{index:i,texCoord:0},metallicFactor:0,roughnessFactor:.8}});
  meshes.push({name:'MeasuredDepthSurface'+i,
   primitives:[{attributes:{POSITION:position,NORMAL:normal,TEXCOORD_0:uv},
    indices,material:i,mode:4}]});
  nodes.push({mesh:i,name:'SourceView'+i+'_MeasuredSurface'});
 }
 const payload=new Uint8Array(pad4(offset));
 for(const p of parts)payload.set(p.data,p.offset);
 const doc={asset:{version:'2.0',generator:'AIG Real3D V112 measured multiview partial source'},
  buffers:[{byteLength:offset}],bufferViews,accessors,images,
  samplers:[{magFilter:9729,minFilter:9729,wrapS:33071,wrapT:33071}],
  textures,materials,meshes,nodes,scenes:[{nodes:[0,1]}],scene:0};
 const glbBytes=glb(doc,payload);
 if(glbBytes.byteLength>35e6)fail('V99_REAL_GLB_INPUT_BUDGET');
 return {glbBytes,receipt:{
  schema:AIG_REAL3D_V112_SCHEMA,
  viewCount:2,cameraBaselineMM,rotationDifferent,
  photoSourceSha256:views.map(v=>v.photoSha256),
  independentDepthSourceSha256:views.map(v=>v.depthSha256),
  sourceColorAndDepthDeclaredCalibratedNotExternallyCertified:true,
  sharedLandmarksChecked:correspondences.length,
  landmarkRegistrationRmsMM:rmsMM,landmarkRegistrationMaxMM:maxMM,
  calibrationConsistencyThresholdMM:maxCorrespondenceRmsMM,
  sourceUnits:'METERS_GLB_FROM_MM_INPUT',observedTriangleCount:totalTriangles,
  observedSurfacePatches:patches.map((p,i)=>({
   index:i,vertices:p.vertices,triangles:p.triangles,
   depthGapCellsSkipped:p.invalidDepthCells,
   occlusionEdgeCellsSkipped:p.occlusionGapCells})),
  sourceMeshTopology:'TWO_REGISTERED_OBSERVED_SURFACE_PATCHES_NOT_WATERTIGHT',
  sameWorldCoordinates:true,fullSurfaceWeldingPerformed:false,
  unobservedFacesEstimated:false,unknownBacksideKeptUnknown:true,
  neuralWeightsExecuted:false,sourceTexturesEmbedded:true,
  externalDepthCalibrationEvidenceVerified:false,
  multiViewIdentityLikenessCertified:false,
  full1to1ReleaseGate:'BLOCK_UNOBSERVED_AND_UNCERTIFIED_SURFACES',
  productionCNCControlsChanged:false,releasePASS:false
 }};
}
