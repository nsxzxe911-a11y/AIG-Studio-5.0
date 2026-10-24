/**
 * Source native, global Indexed XYZ incremental vertex normal evaluation.
 * No surface smoothing/subdivision. Matches full per-face area-weighted normals
 * by summing incident ORIGINAL face IDs in the unchanged source order.
 * The source OBJ is read-only. GPU chunk seams are not physical edges.
 */
export const SPARSE_NORMAL_SCHEMA='AIG_REAL3D_GLOBAL_SOURCE_SPARSE_NORMAL_V1';
const fail=x=>{throw Error('REAL3D_SPARSE_NORMAL_'+x);};
const face=(positions,idx,at,out,offset)=>{
 const a=3*idx[3*at],b=3*idx[3*at+1],c=3*idx[3*at+2];
 const ux=positions[b]-positions[a],uy=positions[b+1]-positions[a+1],uz=positions[b+2]-positions[a+2];
 const vx=positions[c]-positions[a],vy=positions[c+1]-positions[a+1],vz=positions[c+2]-positions[a+2];
 out[offset]=uy*vz-uz*vy;out[offset+1]=uz*vx-ux*vz;out[offset+2]=ux*vy-uy*vx;
};
function validSource(positions,indices){
 if(!(positions instanceof Float32Array)||!(indices instanceof Uint32Array)||
  positions.length<9||positions.length%3||indices.length<3||indices.length%3)
  fail('GLOBAL_INDEXED_FLOAT32_SOURCE_REQUIRED');
 for(const n of positions)if(!Number.isFinite(n))fail('NONFINITE_SOURCE');
 for(const k of indices)if(k>=positions.length/3)fail('SOURCE_FACE_INDEX_OUT_OF_BOUNDS');
}
export function createAIGReal3DSparseNormalCache({original,indices}={}){
 validSource(original,indices);
 const n=original.length/3,t=indices.length/3;
 const adjacency=Array.from({length:n},()=>[]);
 const sourceFaceNormals=new Float64Array(t*3);
 for(let k=0;k<t;k++){
  face(original,indices,k,sourceFaceNormals,k*3);
  // Multiple appearances of a vertex on a degenerate face count only once.
  for(const id of new Set([indices[k*3],indices[k*3+1],indices[k*3+2]]))
   adjacency[id].push(k);
 }
 const baseline=new Float64Array(original.length);
 for(let v=0;v<n;v++){
  const off=v*3;let x=0,y=0,z=0;
  for(const k of adjacency[v]){
   x+=sourceFaceNormals[3*k];y+=sourceFaceNormals[3*k+1];z+=sourceFaceNormals[3*k+2];
  }
  const l=Math.hypot(x,y,z)||1;
  baseline[off]=x/l;baseline[off+1]=y/l;baseline[off+2]=z/l;
 }
 return {
  schema:SPARSE_NORMAL_SCHEMA,
  originalPositions:original,originalIndices:indices,
  originalVertexCount:n,originalTriangleCount:t,
  adjacency,sourceFaceNormals,baselineNormals:baseline,
  originalSourceUnmodified:true,
  seamInferenceDisabled:true
 };
}
/** No need to re-add a full mesh's face normals for each pose. */
export function evaluateAIGReal3DSparseNormals({
 cache,posed,changedGlobalVertexIds,outputNormals
}={}){
 if(cache?.schema!==SPARSE_NORMAL_SCHEMA||
  !(posed instanceof Float32Array)||
  posed.length!==cache.originalPositions.length||
  !Array.isArray(changedGlobalVertexIds)||
  !(outputNormals instanceof Float64Array)||
  outputNormals.length!==posed.length)
  fail('SOURCE_CACHE_OR_OUTPUT_INVALID');
 let prev=-1;
 const touchedFaces=new Set();
 for(const id of changedGlobalVertexIds){
  if(!Number.isInteger(id)||id<0||id>=cache.originalVertexCount||id<=prev)
   fail('CHANGED_SOURCE_VERTEX_ORDER_INVALID');
  prev=id;
  for(let d=0;d<3;d++)if(!Number.isFinite(posed[id*3+d]))
   fail('POSED_SOURCE_VERTEX_NONFINITE');
  for(const f of cache.adjacency[id])touchedFaces.add(f);
 }
 const touchedVertices=new Set(),newFaces=new Map();
 for(const k of touchedFaces){
  const arr=new Float64Array(3);
  face(posed,cache.originalIndices,k,arr,0);
  newFaces.set(k,arr);
  for(let i=0;i<3;i++)touchedVertices.add(cache.originalIndices[3*k+i]);
 }
 outputNormals.set(cache.baselineNormals);
 // Adjacent original triangles retain their original order. Recompute only
 // vertices whose incident contribution may differ, including stable anchors.
 for(const id of touchedVertices){
  let x=0,y=0,z=0;
  for(const k of cache.adjacency[id]){
   const normal=newFaces.get(k),at=3*k;
   if(normal){
    x+=normal[0];y+=normal[1];z+=normal[2];
   }else{
    x+=cache.sourceFaceNormals[at];
    y+=cache.sourceFaceNormals[at+1];z+=cache.sourceFaceNormals[at+2];
   }
  }
  const l=Math.hypot(x,y,z)||1,j=3*id;
  outputNormals[j]=x/l;outputNormals[j+1]=y/l;outputNormals[j+2]=z/l;
 }
 return {
  schema:SPARSE_NORMAL_SCHEMA,normals:outputNormals,
  originalSourceVertices:cache.originalVertexCount,
  originalSourceTriangles:cache.originalTriangleCount,
  affectedSourceTriangles:touchedFaces.size,
  recomputedSourceVertexNormals:touchedVertices.size,
  skippedOriginalTriangleRecalculation:cache.originalTriangleCount-touchedFaces.size,
  originalSourceUnmodified:true,notHumanSkinSmoothing:true
 };
}
/** Full independent oracle; used in QA, never replaces original native faces. */
export function calculateAIGReal3DFullSourceNormals({positions,indices}={}){
 validSource(positions,indices);
 const sums=new Float64Array(positions.length),n=indices.length/3;
 const f=new Float64Array(3);
 for(let k=0;k<n;k++){
  face(positions,indices,k,f,0);
  for(let j=0;j<3;j++){
   const at=indices[3*k+j]*3;
   sums[at]+=f[0];sums[at+1]+=f[1];sums[at+2]+=f[2];
  }
 }
 for(let j=0;j<sums.length;j+=3){
  const l=Math.hypot(sums[j],sums[j+1],sums[j+2])||1;
  for(let k=0;k<3;k++)sums[j+k]/=l;
 }
 return sums;
}
