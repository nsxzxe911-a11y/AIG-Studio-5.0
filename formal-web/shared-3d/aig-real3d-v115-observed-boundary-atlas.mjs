/**
 * Real3D V115 -- measured-source boundary atlas for V114 GLB working copies.
 * Source and work GLBs remain unchanged. Genuine open edges are NOT filled.
 * A newly exposed edge is acceptable only when it is visibly supported by
 * the other camera's measured depths and original RGB, not by guessing.
 */
import {sha256AIGReal3DBytes} from './aig-real3d-v99-native-model-ingest.mjs';
export const AIG_REAL3D_V115_SCHEMA='AIG_REAL3D_V115_VERIFIED_OPEN_BOUNDARY_ATLAS_V1';
const fail=s=>{throw Error('REAL3D_V115_'+s);};
const sha=s=>typeof s==='string'&&/^[a-f0-9]{64}$/i.test(s);
const finite=Number.isFinite;
function read(bytes){
 if(!(bytes instanceof Uint8Array)||bytes.length<64||bytes.length>35e6)
  fail('SOURCE_GLB_BYTES_REQUIRED');
 const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 if(v.getUint32(0,true)!==0x46546c67||v.getUint32(4,true)!==2||
  v.getUint32(8,true)!==bytes.length||v.getUint32(16,true)!==0x4e4f534a)
  fail('SOURCE_GLB_HEADER_INVALID');
 const j=v.getUint32(12,true),binAt=20+j;
 if(j<16||binAt+8>bytes.length||v.getUint32(binAt+4,true)!==0x004e4942||
  binAt+8+v.getUint32(binAt,true)!==bytes.length)
  fail('SOURCE_GLB_CHUNKS_INVALID');
 let doc;try{doc=JSON.parse(new TextDecoder().decode(bytes.slice(20,20+j)));}
 catch{fail('SOURCE_GLB_JSON_INVALID');}
 const bin=bytes.slice(binAt+8);
 if(doc?.asset?.version!=='2.0'||doc?.meshes?.length!==2||
  doc?.images?.length!==2||doc?.materials?.length!==2||
  !Array.isArray(doc?.accessors)||!Array.isArray(doc?.bufferViews))
  fail('V112_TWO_MEASURED_SOURCE_SURFACES_REQUIRED');
 function accessor(id,type,componentType,ncomp){
  const a=doc.accessors[id],b=doc.bufferViews[a?.bufferView];
  if(!a||!b||a.type!==type||a.componentType!==componentType||
   !Number.isInteger(a.count)||a.count<1||
   a.sparse||a.byteOffset||b.byteStride||b.buffer!==0||
   !Number.isInteger(b.byteOffset)||!Number.isInteger(b.byteLength)||
   b.byteOffset<0||b.byteLength<a.count*ncomp*4||
   b.byteOffset+b.byteLength>bin.byteLength)
   fail('SOURCE_ACCESSOR_UNEXPECTED_OR_UNBOUNDED');
  const view=new DataView(bin.buffer,bin.byteOffset+b.byteOffset,a.count*ncomp*4);
  const out=new Array(a.count*ncomp);
  for(let i=0;i<out.length;i++)out[i]=componentType===5126?
   view.getFloat32(i*4,true):view.getUint32(i*4,true);
  if(!out.every(finite))fail('SOURCE_VERTEX_NONFINITE');
  return out;
 }
 const meshes=[0,1].map(i=>{
  const m=doc.meshes[i]?.primitives?.[0];
  if(!m||m.mode!==4||m.material!==i||
   m.attributes?.POSITION==null||m.attributes?.TEXCOORD_0==null||
   m.indices==null)fail('SOURCE_INDEXED_TRIANGLE_MATERIAL_REQUIRED');
  const positions=accessor(m.attributes.POSITION,'VEC3',5126,3),
   uvs=accessor(m.attributes.TEXCOORD_0,'VEC2',5126,2),
   indices=accessor(m.indices,'SCALAR',5125,1);
  if(indices.length%3!==0||indices.some(k=>k<0||k>=positions.length/3)||
   uvs.length/2!==positions.length/3)
   fail('TRIANGLE_INDEX_OR_UV_SOURCE_INVALID');
  return {positions,uvs,indices};
 });
 return {doc,bin,meshes};
}
function topology(mesh){
 const {positions,indices}=mesh,edgeMap=new Map(),used=new Set();
 let degenerate=0;
 const vector=i=>positions.slice(i*3,i*3+3);
 for(let k=0;k<indices.length;k+=3){
  const [a,b,c]=indices.slice(k,k+3);
  for(const n of [a,b,c])used.add(n);
  const p=vector(a),q=vector(b),r=vector(c);
  const u=q.map((x,i)=>x-p[i]),v=r.map((x,i)=>x-p[i]);
  const cr=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],
   u[0]*v[1]-u[1]*v[0]];
  if(Math.hypot(...cr)<1e-14)degenerate++;
  for(const [from,to] of [[a,b],[b,c],[c,a]]){
   const key=Math.min(from,to)+':'+Math.max(from,to);
   let e=edgeMap.get(key);
   if(!e){e={from:Math.min(from,to),to:Math.max(from,to),
    count:0,orientationSum:0};edgeMap.set(key,e);}
   e.count++;e.orientationSum+=(from<to)?1:-1;
  }
 }
 const boundaries=new Map(),nonManifold=[],badWinding=[];
 let boundaryLengthMM=0;
 for(const [key,e] of edgeMap){
  if(e.count>2)nonManifold.push(key);
  if(e.count===2&&e.orientationSum!==0)badWinding.push(key);
  if(e.count===1){
   boundaries.set(key,e);
   const p=vector(e.from),q=vector(e.to);
   boundaryLengthMM+=Math.hypot(...p.map((x,j)=>(x-q[j])*1000));
  }
 }
 return {triangles:indices.length/3,vertices:positions.length/3,
  orphanVertices:positions.length/3-used.size,
  boundaryEdges:boundaries,boundaryLengthMM,
  nonManifoldEdges:nonManifold,badWindingEdges:badWinding,
  zeroAreaTriangles:degenerate};
}
function worldProjection(view,p){
 const m=view.cameraToWorldMM,
  dx=p[0]-m[12],dy=p[1]-m[13],dz=p[2]-m[14],
  x=m[0]*dx+m[1]*dy+m[2]*dz,
  y=m[4]*dx+m[5]*dy+m[6]*dz,
  z=m[8]*dx+m[9]*dy+m[10]*dz;
 if(!(z>0))return null;
 const {fxPx,fyPx,cxPx,cyPx}=view.intrinsics;
 return {x:fxPx*x/z+cxPx,y:cyPx-fyPx*y/z,z};
}
function verifyWorldPoint(posMM,uv,source,target,tol,pixelTol,colorTol){
 const q=worldProjection(target,posMM);
 if(!q)return {ok:false,reason:'BEHIND_OTHER_CAMERA'};
 const tx=Math.round(q.x),ty=Math.round(q.y);
 if(tx<0||ty<0||tx>=target.width||ty>=target.height)
  return {ok:false,reason:'NOT_VISIBLE_IN_OTHER_VIEW'};
 const pixelError=Math.hypot(q.x-tx,q.y-ty);
 if(pixelError>pixelTol)return {ok:false,reason:'PIXEL_CORRESPONDENCE_NOT_EXACT'};
 const measured=target.depthValuesMM[ty*target.width+tx];
 if(!(measured>0)||Math.abs(measured-q.z)>tol)
  return {ok:false,reason:'NO_MATCHING_MEASURED_DEPTH'};
 const ix=Math.round(uv[0]*(source.width-1)),
  iy=Math.round((1-uv[1])*(source.height-1));
 if(ix<0||iy<0||ix>=source.width||iy>=source.height)
  return {ok:false,reason:'SOURCE_UV_OUT_OF_RANGE'};
 const a=source.photoRGBA,b=target.photoRGBA,
  p=(iy*source.width+ix)*4,t=(ty*target.width+tx)*4;
 const col=Math.hypot(a[p]-b[t],a[p+1]-b[t+1],a[p+2]-b[t+2])/Math.sqrt(3);
 if(col>colorTol)return {ok:false,reason:'SOURCE_COLOR_DISAGREEMENT'};
 return {ok:true,colorRms:col,depthMM:Math.abs(measured-q.z)};
}
/**
 * Both GLB binary SHAs are independently recomputed, then source binary is
 * verified as an exact prefix of the non-destructive working copy. Checks
 * untouched first mesh, both source textures/materials, and second mesh XYZ/UV.
 *
 * The new open boundary edges created by dropping duplicate second-camera
 * faces must remain backed by measured matching first-camera depth + photo.
 * No topology repair, no mesh welding, no invented backside.
 */
export async function auditAIGReal3DV115ObservedBoundaryAtlas({
 originalGLBBytes,workingGLBBytes,originalGLBSha256,workingGLBSha256,
 views,depthToleranceMM=2,pixelTolerance=.51,maxRawColorDifference=38,
 minimumVerifiedNewEdgeFraction=1
}={}){
 if(!sha(originalGLBSha256)||!sha(workingGLBSha256)||
  originalGLBSha256===workingGLBSha256||
  !Array.isArray(views)||views.length!==2||
  !finite(depthToleranceMM)||depthToleranceMM<.001||depthToleranceMM>20||
  !finite(pixelTolerance)||pixelTolerance<.45||pixelTolerance>1||
  !finite(maxRawColorDifference)||maxRawColorDifference<1||
  maxRawColorDifference>150||
  !finite(minimumVerifiedNewEdgeFraction)||minimumVerifiedNewEdgeFraction<.8||
  minimumVerifiedNewEdgeFraction>1)
  fail('DISTINCT_HASHED_SOURCE_AND_WORKING_COPY_REQUIRED');
 if(await sha256AIGReal3DBytes(originalGLBBytes)!==originalGLBSha256||
    await sha256AIGReal3DBytes(workingGLBBytes)!==workingGLBSha256)
  fail('GLB_BYTES_DO_NOT_MATCH_SOURCE_HASH');
 const original=read(originalGLBBytes),working=read(workingGLBBytes);
 if(working.bin.length<=original.bin.length||
  original.bin.some((v,i)=>v!==working.bin[i]))
  fail('ORIGINAL_GLB_BINARY_MUST_REMAIN_IMMUTABLE_PREFIX');
 for(const key of ['images','materials','textures','samplers']){
  if(JSON.stringify(original.doc[key])!==JSON.stringify(working.doc[key]))
   fail('ORIGINAL_SOURCE_TEXTURE_OR_MATERIAL_CHANGED');
 }
 for(let i=0;i<2;i++){
  for(const key of ['positions','uvs']){
   const a=original.meshes[i][key],b=working.meshes[i][key];
   if(a.length!==b.length||a.some((v,k)=>v!==b[k]))
    fail('SOURCE_XYZ_UV_VERTEX_REMAPPED');
  }
 }
 if(original.meshes[0].indices.length!==working.meshes[0].indices.length||
  original.meshes[0].indices.some((v,i)=>v!==working.meshes[0].indices[i]))
  fail('FIRST_SOURCE_CAMERA_MESH_CHANGED');
 // Working second-camera faces must be a monotonically ordered subset.
 const base=original.meshes[1].indices,keep=working.meshes[1].indices;
 let j=0;
 for(let i=0;i<base.length&&j<keep.length;i+=3)
  if(base[i]===keep[j]&&base[i+1]===keep[j+1]&&base[i+2]===keep[j+2])j+=3;
 if(j!==keep.length||keep.length>=base.length)
  fail('SECOND_SOURCE_FACES_NOT_SAFE_ORDERED_SUBSET');
 const origTopo=original.meshes.map(topology),
  workTopo=working.meshes.map(topology);
 if([...origTopo,...workTopo].some(t=>t.nonManifoldEdges.length||
  t.badWindingEdges.length||t.zeroAreaTriangles))
  fail('NON_MANIFOLD_REVERSED_OR_ZERO_AREA_SOURCE_TRIANGLES');
 const initialEdges=origTopo[1].boundaryEdges;
 const created=[...workTopo[1].boundaryEdges].filter(([key])=>!initialEdges.has(key));
 if(created.length<1)fail('NO_NEW_SOURCE_VERIFIED_OVERLAP_BOUNDARIES');
 const source=views[1],target=views[0],mesh=working.meshes[1];
 let supported=0,unsupported=0,supportedLengthMM=0,
  unsupportedLengthMM=0;
 const reasons={},witness=[];
 const getVertex=k=>({
  xyzMM:mesh.positions.slice(k*3,k*3+3).map(x=>x*1000),
  uv:mesh.uvs.slice(k*2,k*2+2)});
 for(const [key,edge] of created){
  const a=getVertex(edge.from),b=getVertex(edge.to);
  const midpoint={xyzMM:a.xyzMM.map((v,i)=>(v+b.xyzMM[i])/2),
   uv:a.uv.map((v,i)=>(v+b.uv[i])/2)};
  const checks=[a,midpoint,b].map(p=>verifyWorldPoint(p.xyzMM,p.uv,source,target,
   depthToleranceMM,pixelTolerance,maxRawColorDifference));
  const lengthMM=Math.hypot(...a.xyzMM.map((v,i)=>v-b.xyzMM[i]));
  const ok=checks.every(x=>x.ok);
  if(ok){supported++;supportedLengthMM+=lengthMM;}
  else{
   unsupported++;unsupportedLengthMM+=lengthMM;
   for(const c of checks.filter(x=>!x.ok))reasons[c.reason]=(reasons[c.reason]||0)+1;
  }
  if(witness.length<16)witness.push({
   secondCameraOriginalEdgeVertexIds:[edge.from,edge.to],
   lengthMM,supportedByCamera0MeasuredSource:ok,
   unsupportedReasons:checks.filter(x=>!x.ok).map(x=>x.reason)});
 }
 const fraction=supported/created.length;
 const topologyStatus=fraction>=minimumVerifiedNewEdgeFraction?
  'PASS_ALL_NEW_OPEN_EDGES_MEASURED_BY_OTHER_VIEW':
  'BLOCK_NEW_OPEN_SEAM_WITHOUT_MEASURED_COVERAGE';
 return {
  schema:AIG_REAL3D_V115_SCHEMA,
  originalGLBSha256,workingGLBSha256,
  originalTrianglesPerCamera:origTopo.map(t=>t.triangles),
  workingTrianglesPerCamera:workTopo.map(t=>t.triangles),
  originalOpenEdgesPerCamera:origTopo.map(t=>t.boundaryEdges.size),
  workingOpenEdgesPerCamera:workTopo.map(t=>t.boundaryEdges.size),
  originalOpenEdgeLengthsMM:origTopo.map(t=>t.boundaryLengthMM),
  workingOpenEdgeLengthsMM:workTopo.map(t=>t.boundaryLengthMM),
  workingUnreferencedVerticesPerCamera:workTopo.map(t=>t.orphanVertices),
  newOpenEdgesCreatedByOverlapRemoval:created.length,
  newOpenEdgesSupportedByFirstMeasuredCamera:supported,
  unsupportedNewOpenEdges:unsupported,
  verifiedOpenEdgeFraction:fraction,
  verifiedOpenEdgeLengthMM:supportedLengthMM,
  unsupportedOpenEdgeLengthMM:unsupportedLengthMM,
  unsupportedEdgeReasons:reasons,
  newOpenEdgeSourceWitness:witness,
  measuredOpenSeamTopologyGate:topologyStatus,
  bothOriginalSourcePNGsUnmodified:true,
  untouchedOriginalBINBytesVerified:true,
  originalMaterialAndUVUnmodified:true,
  sourceCameraXYZUnmodified:true,
  missingOrOutsideCoverageLeftUnknown:true,
  geometryWelded:false,unknownBacksideFilled:false,
  verifiedRealScannerCalibration:false,verifiedHuman1to1:false,
  productionReleasePASS:false,
  researchGate:topologyStatus.startsWith('PASS')?'PASS_SOURCE_OPEN_EDGE_ATLAS':'BLOCK'
 };
}
