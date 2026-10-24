/**
 * Real3D V114: conservative source-triangle overlap de-duplication.
 * This only excludes redundant triangles of the SECOND calibrated view from
 * an independent GLB working copy; it does not move, weld, fill or invent.
 */
import {auditAIGReal3DV113TwoViewOverlap}
 from './aig-real3d-v113-overlap-seam.mjs';
export const AIG_REAL3D_V114_SCHEMA='AIG_REAL3D_V114_OBSERVED_OVERLAP_TRIANGLE_DEDUP_V1';
const fail=s=>{throw Error('REAL3D_V114_'+s);};
const sha=s=>typeof s==='string'&&/^[0-9a-f]{64}$/i.test(s);
const pad4=n=>(n+3)&~3;
function decodeGLB(bytes){
 if(!(bytes instanceof Uint8Array)||bytes.length<64||bytes.length>35000000)
  fail('ORIGINAL_GLB_BYTES_REQUIRED');
 const dv=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 if(dv.getUint32(0,true)!==0x46546c67||dv.getUint32(4,true)!==2||
  dv.getUint32(8,true)!==bytes.length)
  fail('GLB_HEADER_VERSION_LENGTH_INVALID');
 const jlen=dv.getUint32(12,true);
 if(jlen<24||jlen>bytes.length-32||dv.getUint32(16,true)!==0x4e4f534a)
  fail('GLB_JSON_CHUNK_INVALID');
 const binPos=20+jlen;
 if(binPos+8>bytes.length||dv.getUint32(binPos+4,true)!==0x004e4942)
  fail('GLB_BIN_CHUNK_INVALID');
 const binLen=dv.getUint32(binPos,true);
 if(binPos+8+binLen!==bytes.length)fail('GLB_BIN_LENGTH_MISMATCH');
 let doc;try{doc=JSON.parse(new TextDecoder().decode(bytes.slice(20,20+jlen)));}
 catch{fail('GLB_SCHEMA_INVALID_JSON');}
 if(doc?.asset?.version!=='2.0'||doc?.buffers?.length!==1||
  !Array.isArray(doc?.bufferViews)||!Array.isArray(doc?.accessors)||
  doc.meshes?.length!==2||doc.images?.length!==2||
  doc.materials?.length!==2||doc.nodes?.length!==2)
  fail('V112_TWO_OBSERVED_MESHES_REQUIRED');
 const body=bytes.slice(binPos+8);
 const viewOf=a=>{
  const acc=doc.accessors[a],bv=doc.bufferViews[acc?.bufferView];
  if(!bv||bv.buffer!==0||!Number.isInteger(bv.byteOffset)||
   !Number.isInteger(bv.byteLength)||bv.byteOffset<0||
   bv.byteOffset+bv.byteLength>body.length)
   fail('GLB_ACCESSOR_BUFFER_VIEW_OUT_OF_BOUNDS');
  return {acc,bv};
 };
 function data(accId,type,componentType,components){
  const {acc,bv}=viewOf(accId);
  if(acc.type!==type||acc.componentType!==componentType||
   !Number.isInteger(acc.count)||acc.count<1||acc.byteOffset||
   bv.byteLength<acc.count*components*4)
   fail('GLB_SOURCE_ACCESSOR_UNEXPECTED_FORMAT');
  const d=new DataView(body.buffer,body.byteOffset+bv.byteOffset,
   acc.count*components*4),values=[];
  for(let i=0;i<acc.count*components;i++)
   values.push(componentType===5126?d.getFloat32(i*4,true):d.getUint32(i*4,true));
  return values;
 }
 const getMesh=i=>{
  const p=doc.meshes[i]?.primitives?.[0];
  if(!p||p.mode!==4||p.material!==i||p.attributes?.POSITION==null||
    p.attributes?.TEXCOORD_0==null||p.indices==null)
    fail('V112_MESH_ATTRIBUTES_INDEXED_TRIANGLES_REQUIRED');
  const positions=data(p.attributes.POSITION,'VEC3',5126,3),
   normals=data(p.attributes.NORMAL,'VEC3',5126,3),
   uv=data(p.attributes.TEXCOORD_0,'VEC2',5126,2),
   indices=data(p.indices,'SCALAR',5125,1);
  if(positions.length/3!==uv.length/2||
   positions.length!==normals.length||indices.length%3||
   indices.some(n=>n>=positions.length/3))
   fail('GLB_SOURCE_VERTEX_INDEX_CORRUPTION');
  return {positions,normals,uv,indices,indicesAccessorId:p.indices};
 };
 return {doc,body,first:getMesh(0),second:getMesh(1)};
}
function project(view,xyzMM){
 const m=view.cameraToWorldMM;
 const dx=xyzMM[0]-m[12],dy=xyzMM[1]-m[13],dz=xyzMM[2]-m[14],
  x=m[0]*dx+m[1]*dy+m[2]*dz,
  y=m[4]*dx+m[5]*dy+m[6]*dz,
  z=m[8]*dx+m[9]*dy+m[10]*dz;
 if(z<=0)return null;
 const t=view.intrinsics;
 return {x:t.fxPx*x/z+t.cxPx,y:t.cyPx-t.fyPx*y/z,z};
}
function colorDiff(a,offsetA,b,offsetB){
 return Math.hypot(
  a[offsetA]-b[offsetB],a[offsetA+1]-b[offsetB+1],
  a[offsetA+2]-b[offsetB+2])/Math.sqrt(3);
}
/**
 * Calculate stable per-vertex UV tangent from ALL the untouched original
 * triangles BEFORE de-duplication. A V99 import cannot infer tangents for
 * vertices no longer referenced by the compacted triangle index list.
 * This adds a glTF TANGENT attribute -- not a new source surface or mesh.
 */
function originalSourceTangents(mesh){
 const {positions,normals,uv,indices}=mesh,n=positions.length/3,
  accumulated=new Float64Array(n*3),tangents=new Float32Array(n*4);
 for(let k=0;k<indices.length;k+=3){
  const a=indices[k],b=indices[k+1],c=indices[k+2];
  const du1=uv[b*2]-uv[a*2],dv1=uv[b*2+1]-uv[a*2+1],
   du2=uv[c*2]-uv[a*2],dv2=uv[c*2+1]-uv[a*2+1];
  const det=du1*dv2-du2*dv1;
  if(Math.abs(det)<1e-12)continue;
  for(let axis=0;axis<3;axis++){
   const ab=positions[b*3+axis]-positions[a*3+axis],
    ac=positions[c*3+axis]-positions[a*3+axis],
    value=(ab*dv2-ac*dv1)/det;
   for(const i of [a,b,c])accumulated[i*3+axis]+=value;
  }
 }
 for(let i=0;i<n;i++){
  const no=normals.slice(i*3,i*3+3),vec=[
   accumulated[i*3],accumulated[i*3+1],accumulated[i*3+2]];
  const normalProjection=no.reduce((sum,v,j)=>sum+v*vec[j],0);
  const ortho=vec.map((v,j)=>v-no[j]*normalProjection),
   length=Math.hypot(...ortho);
  if(length<1e-10)fail('SOURCE_UV_TANGENT_EVIDENCE_DEGENERATE');
  for(let j=0;j<3;j++)tangents[i*4+j]=ortho[j]/length;
  tangents[i*4+3]=1;
 }
 return new Uint8Array(tangents.buffer);
}
function repackGLB(doc,bytes){
 const json=new TextEncoder().encode(JSON.stringify(doc)),
  jLen=pad4(json.length),bLen=pad4(bytes.length);
 const out=new Uint8Array(12+8+jLen+8+bLen),d=new DataView(out.buffer);
 d.setUint32(0,0x46546c67,true);d.setUint32(4,2,true);
 d.setUint32(8,out.length,true);d.setUint32(12,jLen,true);
 d.setUint32(16,0x4e4f534a,true);
 out.fill(32,20,20+jLen);out.set(json,20);
 const b=20+jLen;d.setUint32(b,bLen,true);
 d.setUint32(b+4,0x004e4942,true);out.set(bytes,b+8);
 return out;
}
/**
 * Safety: V113 must PASS first. V114 only removes 2nd-view triangle if each
 * vertex has trustworthy first-view projected measured depth AND raw color.
 * No Gltf POSITION/UV/NORMAL/material/image is changed, and source BIN bytes
 * are a prefix of the new BIN. Unknown/occluded second-view faces are kept.
 */
export function deduplicateAIGReal3DV114VerifiedOverlapGLB({
 glbBytes,sourceGLBSha256,views,
 depthToleranceMM=2,pixelTolerance=.51,
 maxRawColorDifference=38,minimumTrianglesRemoved=1
}={}){
 if(!sha(sourceGLBSha256)||!Array.isArray(views)||views.length!==2||
  !Number.isFinite(depthToleranceMM)||depthToleranceMM<.001||depthToleranceMM>20||
  !Number.isFinite(pixelTolerance)||pixelTolerance<.45||pixelTolerance>1||
  !Number.isFinite(maxRawColorDifference)||maxRawColorDifference<1||
  maxRawColorDifference>150||
  !Number.isInteger(minimumTrianglesRemoved)||minimumTrianglesRemoved<1)
  fail('DECLARED_SOURCE_SHA_VIEWS_AND_SAFE_THRESHOLDS_REQUIRED');
 const v113=auditAIGReal3DV113TwoViewOverlap({
  views,sourceGLBSha256,depthToleranceMM,pixelTolerance,
  maxColorSeamMean:maxRawColorDifference
 });
 if(v113.researchGate!=='PASS_OBSERVED_SEAM_CONSISTENCY')
  fail('INDEPENDENT_DEPTH_OVERLAP_GATE_'+v113.geometryOverlapStatus);
 const {doc,body,first,second}=decodeGLB(glbBytes);
 const beforeFirst=first.indices.length/3,beforeSecond=second.indices.length/3;
 const r=views[0],v=views[1],redundant=new Uint8Array(second.positions.length/3);
 let candidates=0,match=0,unknown=0,colorConflicts=0;
 for(let k=0;k<redundant.length;k++){
  const world=second.positions.slice(k*3,k*3+3).map(x=>x*1000);
  const reproj=project(r,world);
  if(!reproj){unknown++;continue;}
  const tx=Math.round(reproj.x),ty=Math.round(reproj.y);
  if(tx<0||ty<0||tx>=r.width||ty>=r.height||
   Math.hypot(tx-reproj.x,ty-reproj.y)>pixelTolerance){unknown++;continue;}
  const observed=r.depthValuesMM[ty*r.width+tx];
  if(!observed||Math.abs(observed-reproj.z)>depthToleranceMM){unknown++;continue;}
  candidates++;
  const u=second.uv[k*2],vv=second.uv[k*2+1];
  const x1=Math.round(u*(v.width-1)),y1=Math.round((1-vv)*(v.height-1));
  if(x1<0||y1<0||x1>=v.width||y1>=v.height){
   unknown++;continue;
  }
  const delta=colorDiff(r.photoRGBA,(ty*r.width+tx)*4,
   v.photoRGBA,(y1*v.width+x1)*4);
  if(delta>maxRawColorDifference){colorConflicts++;continue;}
  redundant[k]=1;match++;
 }
 const keep=[];
 let removed=0,keptBecauseUnknown=0;
 for(let i=0;i<second.indices.length;i+=3){
  const tri=second.indices.slice(i,i+3);
  if(tri.every(id=>redundant[id]===1))removed++;
  else{keep.push(...tri);keptBecauseUnknown++;}
 }
 if(removed<minimumTrianglesRemoved)
  fail('NO_SAFELY_REDUNDANT_SOURCE_TRIANGLES_TO_INTEGRATE');
 if(keep.length<36)fail('ALL_SECOND_SOURCE_TRIANGLES_REMOVED_NO_INDEPENDENT_COVERAGE');
 const newIndexBytes=new Uint8Array(new Uint32Array(keep).buffer);
 const tangentBytes=originalSourceTangents(second);
 const offset=pad4(body.length),
  tangentOffset=pad4(offset+newIndexBytes.length),
  payload=new Uint8Array(tangentOffset+tangentBytes.length);
 payload.set(body);payload.set(newIndexBytes,offset);
 payload.set(tangentBytes,tangentOffset);
 const idxId=second.indicesAccessorId;
 const newBV=doc.bufferViews.length;
 doc.bufferViews.push({buffer:0,byteOffset:offset,byteLength:newIndexBytes.length});
 doc.accessors[idxId].bufferView=newBV;
 doc.accessors[idxId].count=keep.length;
 const tangentBV=doc.bufferViews.length;
 doc.bufferViews.push({buffer:0,byteOffset:tangentOffset,byteLength:tangentBytes.length});
 const tangentAccessorId=doc.accessors.length;
 doc.accessors.push({bufferView:tangentBV,componentType:5126,
  count:second.positions.length/3,type:'VEC4'});
 doc.meshes[1].primitives[0].attributes.TANGENT=tangentAccessorId;
 doc.buffers[0].byteLength=payload.length;
 const copy=repackGLB(doc,payload);
 if(copy.length>35e6)fail('SOURCE_WORKING_COPY_MAX_35MB');
 return {glbBytes:copy,receipt:{
  schema:AIG_REAL3D_V114_SCHEMA,originalSourceGLBSha256:sourceGLBSha256,
  v113GeometryGate:v113.geometryOverlapStatus,
  v113RawColorGate:v113.materialDifferenceStatus,
  originalFirstViewTriangles:beforeFirst,
  originalSecondViewTriangles:beforeSecond,
  firstViewTrianglesAfter:beforeFirst,
  secondViewTrianglesAfter:keep.length/3,
  totalTrianglesBefore:beforeFirst+beforeSecond,
  totalTrianglesAfter:beforeFirst+keep.length/3,
  observedRedundantSecondViewTrianglesExcluded:removed,
  uniqueSecondViewTrianglesKept:keptBecauseUnknown,
  secondViewVerticesWithVerifiedCrossViewCorrespondence:match,
  secondViewVerticesUnobservedInFirstView:unknown,
  secondViewVerifiedDepthButColorMismatchVertices:colorConflicts,
  firstViewSourceMeshUnchanged:true,
  secondViewXYZAndUVUnchanged:true,
  originalTopologySupportedUVTangentsAdded:true,
  originalSourceTriangleTangentsUsedBeforeDedup:true,
  allOriginalBINBytesPrefixPreserved:true,
  bothOriginalEmbeddedPNGsPreserved:true,
  bothOriginalMaterialsPreserved:true,
  unobservedSurfaceGenerated:false,
  verticesMovedOrSmoothed:false,
  topologyWeldedAcrossSeam:false,
  materialTextureRepainted:false,
  independentPhysicalCaptureValidation:false,
  completeHumanOrAnimalPhoto1to1:false,
  fullReleaseGate:'BLOCK_REAL_SCAN_AND_WATERTIGHT_GROUND_TRUTH',
  workingCopyOnly:true,productionReleasePASS:false
 }};
}
