/**
 * Real3D high-density LOCAL OBJ intake, read-only.
 *
 * Unlike the legacy 110k/180k importer this preserves true source triangles
 * and packs them into <65535-vertex mesh nodes (WebGL1 without uint-index ext).
 * No decimation/subdivision/sculpting/automatic anatomy.
 */
import {createAIG3DMesh,createAIG3DScene,addAIG3DNode}
 from './aig-real3d-core.mjs';
export const AIG_REAL3D_DENSE_SOURCE_SCHEMA='AIG_REAL3D_RAW_DENSE_OBJ_CHUNKED_INTAKE_V1';
const LIMITS=Object.freeze({
 maxTextBytes:50_000_000,maxLines:1_600_000,
 maxVertices:350_000,maxTriangles:700_000,
 maxChunkUniqueVertices:52_000,maxChunkTriangles:95_000
});
const fail=x=>{throw Error('AIG_REAL3D_DENSE_'+x);};
const keyIndex=(raw,count)=>{
 if(!/^-?\d+$/.test(raw))fail('BAD_FACE_VERTEX_INDEX');
 const v=Number(raw);
 if(!Number.isSafeInteger(v)||v===0||Math.abs(v)>count)
  fail('BAD_FACE_VERTEX_INDEX');
 return v<0?count+v:v-1;
};
const vecCross=(a,b)=>[
 a[1]*b[2]-a[2]*b[1],
 a[2]*b[0]-a[0]*b[2],
 a[0]*b[1]-a[1]*b[0]
];
export function buildAIGReal3DDenseOBJSource({
 objText,sourceSha256,sourceName='local-dense.obj',
 heightMm,upAxis='Y'
}={}){
 if(typeof objText!=='string'||objText.length<64||
  objText.length>LIMITS.maxTextBytes)
  fail('SOURCE_SIZE_INVALID');
 if(!/^[0-9a-f]{64}$/i.test(sourceSha256??'')||
  typeof sourceName!=='string'||!sourceName.toLowerCase().endsWith('.obj')||
  sourceName.length>180)
  fail('SOURCE_FILE_NAME_OR_SHA_REQUIRED');
 if(!Number.isInteger(heightMm)||heightMm<900||heightMm>2200||
  !['Y','Z'].includes(upAxis))fail('CALIBRATED_HEIGHT_AND_UP_AXIS_REQUIRED');
 const verts=[],index=[],lines=objText.split(/\r?\n/);
 if(lines.length>LIMITS.maxLines)fail('SOURCE_LINE_BUDGET');
 // Maintain OBJ vertex indexing exactly (including negative face notation).
 for(const sourceLine of lines){
  const line=sourceLine.trim();
  if(!line||line[0]==='#')continue;
  const t=line.split(/\s+/);
  if(t[0]==='v'){
   if(t.length<4||t.length>5)fail('SOURCE_VERTEX_FIELDS');
   const p=t.slice(1,4).map(Number);
   if(!p.every(v=>Number.isFinite(v)&&Math.abs(v)<1e6))
    fail('SOURCE_XYZ_NONFINITE');
   const transformed=upAxis==='Z'?[p[0],p[2],-p[1]]:p;
   verts.push(...transformed);
   if(verts.length/3>LIMITS.maxVertices)fail('MAX_SOURCE_VERTICES');
  }else if(t[0]==='f'){
   if(t.length<4||t.length>65)fail('SOURCE_FACE_FIELDS');
   const ids=t.slice(1).map(x=>keyIndex(x.split('/')[0],verts.length/3));
   if(new Set(ids).size!==ids.length)fail('SOURCE_FACE_DUPLICATE_VERTEX');
   for(let i=1;i<ids.length-1;i++){
    index.push(ids[0],ids[i],ids[i+1]);
    if(index.length/3>LIMITS.maxTriangles)fail('MAX_SOURCE_TRIANGLES');
   }
  }
  // No external URL, image, MTL or scripting/remote fetch.
 }
 const vertexCount=verts.length/3,triangleCount=index.length/3;
 if(vertexCount<4||triangleCount<4)fail('EMPTY_SOURCE_SURFACE');
 const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
 for(let i=0;i<verts.length;i+=3)
  for(let k=0;k<3;k++){
   lo[k]=Math.min(lo[k],verts[i+k]);hi[k]=Math.max(hi[k],verts[i+k]);
  }
 const height=hi[1]-lo[1];if(height<1e-9)fail('ZERO_SOURCE_HEIGHT');
 const scale=heightMm/1000/height;
 const originalWorld=new Float32Array(verts.length),
  normalSums=new Float64Array(verts.length);
 for(let i=0;i<verts.length;i+=3){
  originalWorld[i]=(verts[i]-(lo[0]+hi[0])/2)*scale;
  originalWorld[i+1]=(verts[i+1]-lo[1])*scale;
  originalWorld[i+2]=(verts[i+2]-(lo[2]+hi[2])/2)*scale;
 }
 let degenerateTriangles=0;
 for(let k=0;k<index.length;k+=3){
  const a=index[k]*3,b=index[k+1]*3,c=index[k+2]*3;
  const ab=[0,1,2].map(j=>originalWorld[b+j]-originalWorld[a+j]);
  const ac=[0,1,2].map(j=>originalWorld[c+j]-originalWorld[a+j]);
  const n=vecCross(ab,ac),nn=Math.hypot(...n);
  if(nn<1e-11){degenerateTriangles++;continue;}
  for(const off of [a,b,c])for(let j=0;j<3;j++)normalSums[off+j]+=n[j];
 }
 if(degenerateTriangles>0)fail('DEGENERATE_SOURCE_TRIANGLES');
 const normalWorld=new Float32Array(verts.length);
 for(let i=0;i<normalWorld.length;i+=3){
  const l=Math.hypot(normalSums[i],normalSums[i+1],normalSums[i+2])||1;
  for(let k=0;k<3;k++)normalWorld[i+k]=normalSums[i+k]/l;
 }
 const scene=createAIG3DScene({
  id:'real3dDenseNativeLocal',consumer:'FastModel',units:'METERS',
  source:'UNAUTHENTICATED_LOCAL_RAW_OBJ_DENSE_SOURCE'
 });
 let countChunk=0,indices=[],positions=[],normals=[],globalVertexIds=[],lookup=new Map(),
  emittedTriangles=0,emittedVertices=0,nonemptyChunks=0;
 const flush=()=>{
  if(!indices.length)return;
  const mesh=createAIG3DMesh({
   positions,normals,indices,
   provenance:'DENSE_ORIGINAL_SOURCE_SHA_'+sourceSha256
  });
  const node=addAIG3DNode(scene,{
   id:'denseIndexedChunk'+String(countChunk+1),kind:'character',mesh,
   material:{baseColor:[.79,.66,.57,1],roughness:.87,metallic:0,
    doubleSided:true},
   source:'RAW_HIGH_DENSITY_OBJ_SOURCE_NOT_AUTHENTICATED_HUMAN'
  });
  // Original global IDs only: required for reversible, independent posed copies.
  // This array is metadata; it does not change GPU indices or triangles.
  node.sourceGlobalVertexIds=Uint32Array.from(globalVertexIds);
  emittedTriangles+=indices.length/3;
  emittedVertices+=positions.length/3;
  nonemptyChunks++;countChunk++;
  positions=[];normals=[];indices=[];globalVertexIds=[];lookup=new Map();
 };
 const sourceIndexChunks=[];
 for(let k=0;k<index.length;k+=3){
  const ids=index.slice(k,k+3);
  const missing=ids.filter(x=>!lookup.has(x)).length;
  if(indices.length/3>=LIMITS.maxChunkTriangles||
    lookup.size+missing>LIMITS.maxChunkUniqueVertices)flush();
  const face=[];
  for(const globalVertex of ids){
   let localIndex=lookup.get(globalVertex);
   if(localIndex===undefined){
    localIndex=lookup.size;lookup.set(globalVertex,localIndex);
    globalVertexIds.push(globalVertex);
    const at=globalVertex*3;
    positions.push(originalWorld[at],originalWorld[at+1],originalWorld[at+2]);
    normals.push(normalWorld[at],normalWorld[at+1],normalWorld[at+2]);
   }
   face.push(localIndex);
  }
  indices.push(...face);
 }
 flush();
 if(!nonemptyChunks||emittedTriangles!==triangleCount)
  fail('SOURCE_TRIANGLE_LOSS_DURING_CHUNKING');
 const boundsMm={
  heightMm,
  widthMm:Math.round((hi[0]-lo[0])*scale*100000)/100,
  depthMm:Math.round((hi[2]-lo[2])*scale*100000)/100
 };
 const evidence={
  schema:AIG_REAL3D_DENSE_SOURCE_SCHEMA,
  sourceSha256,sourceName,heightMm,upAxis,
  originalVertexCount:vertexCount,originalTriangleCount:triangleCount,
  renderedTriangleCount:emittedTriangles,
  gpuChunkCount:nonemptyChunks,gpuChunkVerticesIncludingSharedBoundaries:emittedVertices,
  maxChunkUniqueVertices:LIMITS.maxChunkUniqueVertices,
  allOriginalSourceTriangleIndicesPreserved:true,
  chunkingCreatesOnlyDuplicateVertexReferencesNotNewShape:true,
  noSourceTopologyDecimation:true,noSyntheticSubdivision:true,
  sourceCoordinatesNotOverwritten:true,
  sourceIndependentHumanScanAuthenticityVerified:false,
  fourViewReferenceRequired:true,
  originalHumanGeometryReviewed:false,
  pendingLocalTopologyAndFiveAreaDetailedInspection:true,
  bboxMillimeters:boundsMm,
  releasePASS:false
 };
 // Original GLOBAL index space is retained separately from GPU chunking.
 // Downstream QA MUST use this immutable-by-contract view rather than node
 // indices (chunk seams are not physical seams). No new triangles are created.
 const sourceGeometry={
  positions:originalWorld,
  indices:Uint32Array.from(index),
  rotatedSourceBoundsMin:lo.slice(),
  rotatedSourceBoundsMax:hi.slice(),
  metersPerRawUnit:scale,
  originalGlobalIndexSpace:true,
  noChunkBoundarySeamInference:true
 };
 return {scene,evidence,sourceGeometry,releasePASS:false};
}
