/**
 * Real3D V90: import original OBJ face-corner vt without manual UV sidecars.
 *
 * Match original v/f triangulation and each dense OBJ chunk's source-global
 * vertex IDs. Do NOT change source faces/coordinates. When a source vertex
 * has differing UVs on adjacent faces, a separate DISPLAY-ONLY seam mesh
 * duplicates that vertex. In that case new GPU position/index buffers ARE
 * required: never claim zero reuploads across a UV seam.
 */
import {createAIG3DMesh} from './aig-real3d-core.mjs';
export const AIG_REAL3D_V90_OBJ_VT_SCHEMA='AIG_REAL3D_V90_SOURCE_OBJ_VT_SEAM_BRIDGE_V1';
const fail=code=>{throw Error('REAL3D_V90_VT_'+code);};
const sha=s=>typeof s==='string'&&/^[0-9a-f]{64}$/i.test(s);
const vindex=(s,n)=>{
 if(!/^-?[0-9]+$/.test(s))fail('OBJ_INVALID_FACE_INDEX');
 const i=Number(s);
 if(!Number.isSafeInteger(i)||i===0||Math.abs(i)>n)fail('OBJ_FACE_INDEX_OUT_OF_RANGE');
 return i<0?n+i:i-1;
};
function collectOBJFaceCorners(text){
 if(typeof text!=='string'||text.length>50_000_000||text.length<24)
  fail('OBJ_SOURCE_TEXT_BUDGET');
 const lines=text.split(/\r?\n/);
 if(lines.length>1_600_000)fail('OBJ_LINE_BUDGET');
 let v=0,vt=0,hasUV=0,triangles=[];
 const coords=[];
 for(const line of lines){
  const s=line.trim();if(!s||s.startsWith('#'))continue;
  const a=s.split(/\s+/);
  if(a[0]==='v'){
   if(a.length<4||a.length>5||a.slice(1,4).some(x=>!Number.isFinite(Number(x))))
    fail('OBJ_INVALID_V_POSITION');
   v++;if(v>350000)fail('OBJ_MAX_VERTICES');
  }else if(a[0]==='vt'){
   if(a.length<3||a.length>4)fail('OBJ_INVALID_VT');
   const uv=a.slice(1,3).map(Number);
   if(uv.some(x=>!Number.isFinite(x)||x<0||x>1))
    fail('OBJ_UV_OUTSIDE_SINGLE_ATLAS');
   coords.push(uv);vt++;if(vt>700000)fail('OBJ_MAX_UVS');
  }else if(a[0]==='f'){
   if(a.length<4||a.length>65)fail('OBJ_INVALID_FACE');
   const face=a.slice(1).map(part=>{
    const parts=part.split('/');
    if(parts.length<2||!parts[1])fail('OBJ_FACE_CORNER_VT_MISSING');
    const vi=vindex(parts[0],v),ti=vindex(parts[1],vt);
    return {vi,ti};
   });
   if(new Set(face.map(x=>x.vi)).size!==face.length)
    fail('OBJ_DUPLICATE_FACE_VERTEX');
   for(let j=1;j+1<face.length;j++){
    triangles.push(face[0],face[j],face[j+1]);hasUV++;
    if(hasUV>700000)fail('OBJ_MAX_TRIANGLES');
   }
  }
 }
 if(!v||!vt||!hasUV)fail('OBJ_VT_TRIANGLES_REQUIRED');
 return {triangles,coords,sourceVertexCount:v,sourceTriangleCount:hasUV};
}
export function connectAIGReal3DOBJFaceUV({
 objText,sourceSha256,verifiedObjSha256,dense
}={}){
 if(!sha(sourceSha256)||verifiedObjSha256!==sourceSha256||
  !dense?.scene||dense.scene.schema!=='AIG_REAL3D_SCENE_V1'||
  !Array.isArray(dense.scene.nodes)||!dense.scene.nodes.length)
  fail('ORIGINAL_SOURCE_SHA_OR_SCENE_MISMATCH');
 const parsed=collectOBJFaceCorners(objText);
 const nodes=dense.scene.nodes,sourceFaceCount=nodes.reduce((s,n)=>
  s+n.mesh.triangleCount,0);
 if(parsed.sourceTriangleCount!==sourceFaceCount)fail('SOURCE_FACE_COUNT_MISMATCH');
 let offset=0,duplicateVertices=0,geometryReuploads=0;
 const transformedNodes=nodes.map(node=>{
  const src=node.mesh,ids=node.sourceGlobalVertexIds;
  if(!ids||ids.length!==src.vertexCount||!Array.isArray(src.positions)||
   !Array.isArray(src.normals)||!Array.isArray(src.indices))
   fail('DENSE_SOURCE_GLOBAL_VERTEX_IDS_MISSING');
  const nodeFaceCount=src.triangleCount,seen=new Map(),
   pos=[],norm=[],uv=[],indices=[],originalRefs=[];
  for(let tri=0;tri<nodeFaceCount;tri++){
   for(let c=0;c<3;c++){
    const originalLocal=src.indices[tri*3+c];
    const sourceGlobal=ids[originalLocal];
    const expected=parsed.triangles[(offset+tri)*3+c];
    if(!expected||expected.vi!==sourceGlobal)
     fail('OBJ_ORIGINAL_FACE_ORDER_MISMATCH');
    const key=String(originalLocal)+':'+String(expected.ti);
    let local=seen.get(key);
    if(local===undefined){
     local=pos.length/3;seen.set(key,local);
     pos.push(...src.positions.slice(originalLocal*3,originalLocal*3+3));
     norm.push(...src.normals.slice(originalLocal*3,originalLocal*3+3));
     uv.push(...parsed.coords[expected.ti]);
     originalRefs.push(originalLocal);
    }
    indices.push(local);
   }
  }
  offset+=nodeFaceCount;
  // Explicitly prove triangles are IDENTICAL XYZ per face-corner. This is
  // topology-equivalent display geometry, not new anatomical source.
  for(let k=0;k<indices.length;k++){
   const original=src.indices[k]*3,remapped=indices[k]*3;
   for(let d=0;d<3;d++)
    if(src.positions[original+d]!==pos[remapped+d])
     fail('SOURCE_TRIANGLE_XYZ_CHANGED');
  }
  // If original vertex is never shared under a different UV, preserve the
  // existing VBO/EBO by mapping UV directly onto the original source mesh.
  const originalUV=new Array(src.vertexCount*2),mapped=new Set();
  let seam=false;
  for(let k=0;k<originalRefs.length;k++){
   const id=originalRefs[k],s=id*2,t=k*2;
   if(mapped.has(id)){
    if(originalUV[s]!==uv[t]||originalUV[s+1]!==uv[t+1])seam=true;
   }else{
    mapped.add(id);originalUV[s]=uv[t];originalUV[s+1]=uv[t+1];
   }
  }
  if(mapped.size!==src.vertexCount)fail('UNREFERENCED_SOURCE_VERTEX');
  const working=seam?createAIG3DMesh({
   positions:pos,normals:norm,indices,
   provenance:'V90_DISPLAY_SEAM_FROM_'+sourceSha256
  }):src;
  if(working.vertexCount>65535)fail('SEAM_DISPLAY_CHUNK_EXCEEDS_WEBGL_INDEX_BUDGET');
  if(seam)geometryReuploads++;
  duplicateVertices+=Math.max(0,working.vertexCount-src.vertexCount);
  return {nodeId:node.id,originalMesh:src,uvMesh:working,
   uvCoordinates:seam?uv:originalUV,
   sourceTriangleCount:src.triangleCount,
   displayTriangleCount:working.triangleCount,
   originalIndexedTrianglesIdenticalXYZ:true,
   originalVertexCount:src.vertexCount,
   displayVertexCount:working.vertexCount,
   UVSeamRequiresNewPositionNormalIndexGPUUpload:seam};
 });
 if(offset!==parsed.sourceTriangleCount)fail('UNCONSUMED_SOURCE_FACES');
 return {schema:AIG_REAL3D_V90_OBJ_VT_SCHEMA,sourceSha256,
  nodes:transformedNodes,actualChunks:transformedNodes.length,
  originalTriangles:sourceFaceCount,
  displayTriangles:transformedNodes.reduce((s,n)=>s+n.displayTriangleCount,0),
  uvSeamAdditionalVertices:duplicateVertices,
  gpuChunksRequiringNewGeometryBuffers:geometryReuploads,
  originalSourceGeometryImmutable:true,independentPhotoMatchValidated:false,
  sourceVtIsNotAutoUVUnwrap:true,actualMovieRenderingVerified:false,
  releasePASS:false};
}
