/**
 * Real3D V101 — source-aware structural reconstruction / healing.
 *
 * This back-end changes ACTUAL Indexed XYZ triangle topology only where
 * source evidence supports a deterministic repair. Not a renderer effect:
 * - diagnose degenerate/duplicate/isolated/unoriented/nonmanifold faces;
 * - orient adjacent surface triangles consistently (without guessing inside);
 * - optionally exclude only zero-area faces with original face-ID mapping;
 * - recompute normal vectors in an independent Working Copy;
 * - keep all source nodes/part groups, islands, openings and vertex positions.
 *
 * No SDF/Metaball/Template Morph/Subdivision or fabricated hidden sides.
 * "AI" neural inference is NOT claimed by this deterministic safety stage.
 */
import {createAIG3DMesh} from './aig-real3d-core.mjs';
export const AIG_REAL3D_V101_SCHEMA='AIG_REAL3D_V101_ORIGINAL_SOURCE_STRUCTURAL_REPAIR_V1';
const fail=s=>{throw Error('REAL3D_V101_'+s);};
const key=(a,b)=>a<b?a+':'+b:b+':'+a;
const sub=(a,b)=>a.map((x,i)=>x-b[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const length=v=>Math.hypot(...v);
function checkMesh(mesh){
 if(!mesh?.actualXYZTriangles||!Array.isArray(mesh.positions)||
  !Array.isArray(mesh.indices)||!Array.isArray(mesh.normals)||
  mesh.positions.length!==mesh.vertexCount*3||
  mesh.indices.length!==mesh.triangleCount*3||
  mesh.normals.length!==mesh.positions.length||
  mesh.triangleCount<1||mesh.triangleCount>250000||
  !mesh.positions.every(Number.isFinite)||
  !mesh.normals.every(Number.isFinite)||
  mesh.indices.some(x=>!Number.isInteger(x)||x<0||x>=mesh.vertexCount))
  fail('ACTUAL_INDEXED_XYZ_SOURCE_REQUIRED');
}
function coord(mesh,id){return mesh.positions.slice(id*3,id*3+3);}
function faceArea(mesh,tri){
 const [a,b,c]=tri.map(i=>coord(mesh,i));
 return .5*length(cross(sub(b,a),sub(c,a)));
}
function tolerance(mesh){
 let min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
 for(let k=0;k<mesh.positions.length;k+=3)for(let j=0;j<3;j++){
  min[j]=Math.min(min[j],mesh.positions[k+j]);
  max[j]=Math.max(max[j],mesh.positions[k+j]);
 }
 const diagonal=Math.hypot(...min.map((v,i)=>max[i]-v));
 return Math.max(1e-20,diagonal*diagonal*1e-14);
}
function scan(mesh,discardedFaceIDs=new Set()){
 checkMesh(mesh);
 const edgeMap=new Map(),triangles=[],areaTol=tolerance(mesh);
 const duplicateMap=new Map(),duplicateFaceIDs=[],degenerateFaceIDs=[];
 let totalArea=0;
 for(let f=0;f<mesh.triangleCount;f++){
  const tri=mesh.indices.slice(f*3,f*3+3),
   area=faceArea(mesh,tri);
  const degenerate=new Set(tri).size!==3||area<=areaTol;
  if(degenerate)degenerateFaceIDs.push(f);
  totalArea+=area;
  const canonical=[...tri].sort((a,b)=>a-b).join(':');
  if(duplicateMap.has(canonical))duplicateFaceIDs.push(f);
  else duplicateMap.set(canonical,f);
  triangles.push({tri,area,degenerate,originalFaceID:f});
  if(degenerate)continue;
  for(let e=0;e<3;e++){
   const from=tri[e],to=tri[(e+1)%3],k=key(from,to);
   if(!edgeMap.has(k))edgeMap.set(k,[]);
   edgeMap.get(k).push({face:f,from,to});
  }
 }
 const adjacency=Array.from({length:mesh.triangleCount},()=>[]);
 let conflictEdges=0,manifoldErrors=0,boundary=0;
 const nonmanifoldEdges=[];
 for(const [edge,incident] of edgeMap){
  if(incident.length===1){boundary++;continue;}
  if(incident.length>2){manifoldErrors++;nonmanifoldEdges.push(edge);continue;}
  const a=incident[0],b=incident[1],opposite=a.from===b.to&&a.to===b.from;
  if(!opposite)conflictEdges++;
  adjacency[a.face].push({to:b.face,invert:!opposite});
  adjacency[b.face].push({to:a.face,invert:!opposite});
 }
 const visited=new Set(),components=[];
 for(let f=0;f<mesh.triangleCount;f++){
  if(triangles[f].degenerate||visited.has(f))continue;
  const queue=[f],faces=[];visited.add(f);
  for(let i=0;i<queue.length;i++){
   const here=queue[i];faces.push(here);
   for(const adj of adjacency[here])if(!visited.has(adj.to)){
    visited.add(adj.to);queue.push(adj.to);
   }
  }
  components.push({originalFaceCount:faces.length,
   firstSourceFaceID:faces[0]});
 }
 return {schema:'AIG_REAL3D_V101_SOURCE_MESH_DIAGNOSIS_V1',
  sourceTriangles:mesh.triangleCount,sourceVertices:mesh.vertexCount,
  degenerateFaceIDs,duplicateFaceIDs,
  openBoundaryEdges:boundary,nonManifoldEdgeCount:manifoldErrors,
  nonManifoldEdges:nonmanifoldEdges.slice(0,120),
  misorientedSharedEdges:conflictEdges,disconnectedFaceIslands:components.length,
  sourceComponentManifest:components,
  originalSurfaceArea:totalArea,areaTolerance:areaTol,
  sourceHasKnownOpenings:boundary>0,
  physicalSemanticPartLabelsKnown:false,
  sourceRealWorldScaleMeasured:false,
  faceIDsPreservedUnlessExplicitDegenerateRemoval:true,
  sourceSurfaceWatertight:boundary===0&&manifoldErrors===0,
  detailOrAnatomicalTruthCertified:false,
  edgeMap,adjacency,triangles};
}
export function auditAIGReal3DSourceStructure(mesh){
 const {edgeMap,adjacency,triangles,...data}=scan(mesh);
 return data;
}
function orient(mesh,sourceScan,dropDegenerate){
 const flags=new Map(),unresolved=new Set(),flipped=[];
 for(let f=0;f<mesh.triangleCount;f++){
  const item=sourceScan.triangles[f];
  if(item.degenerate)continue;
  if(flags.has(f))continue;
  const queue=[f];flags.set(f,false);
  for(let j=0;j<queue.length;j++){
   const here=queue[j],flag=flags.get(here);
   for(const {to,invert} of sourceScan.adjacency[here]){
    const want=Boolean(flag)!==Boolean(invert);
    if(!flags.has(to)){flags.set(to,want);queue.push(to);}
    else if(flags.get(to)!==want)unresolved.add(key(here,to));
   }
  }
 }
 if(unresolved.size)fail('NON_ORIENTABLE_SURFACE_CONFLICT_BLOCK');
 const faceIDs=[],indices=[];
 for(let f=0;f<mesh.triangleCount;f++){
  const {tri,degenerate}=sourceScan.triangles[f];
  if(degenerate&&dropDegenerate)continue;
  if(flags.get(f)===true){
   indices.push(tri[0],tri[2],tri[1]);flipped.push(f);
  }else indices.push(...tri);
  faceIDs.push(f);
 }
 return {indices,faceIDs,flipped};
}
function rebuildNormals(mesh,indices){
 const normals=new Array(mesh.positions.length).fill(0);
 for(let f=0;f<indices.length;f+=3){
  const tri=indices.slice(f,f+3);
  const a=coord(mesh,tri[0]),b=coord(mesh,tri[1]),c=coord(mesh,tri[2]),
   n=cross(sub(b,a),sub(c,a));
  for(const v of tri)for(let k=0;k<3;k++)
   normals[v*3+k]+=n[k];
 }
 for(let v=0;v<mesh.vertexCount;v++){
  const k=v*3,n=normals.slice(k,k+3),size=length(n);
  if(size<=1e-20){
   const original=mesh.normals.slice(k,k+3),len=length(original);
   for(let j=0;j<3;j++)normals[k+j]=len>1e-20?original[j]/len:(j===1?1:0);
  }else for(let j=0;j<3;j++)normals[k+j]=n[j]/size;
 }
 return normals;
}
export function repairAIGReal3DSourceMesh({
 mesh,allowDropDegenerate=false,maxRemovedFraction=.02,
 strictNoNewOpenings=true,acceptNormalRebuild=true
}={}){
 checkMesh(mesh);
 if(typeof allowDropDegenerate!=='boolean'||
  !Number.isFinite(maxRemovedFraction)||maxRemovedFraction<0||
  maxRemovedFraction>.1||typeof strictNoNewOpenings!=='boolean'||
  typeof acceptNormalRebuild!=='boolean')
  fail('REPAIR_GATES_INVALID');
 const original=scan(mesh);
 if(original.nonManifoldEdgeCount>0)
  return {schema:AIG_REAL3D_V101_SCHEMA,status:'BLOCK_NONMANIFOLD_SOURCE',
   before:auditAIGReal3DSourceStructure(mesh),workingMesh:null,
   sourceMeshWasNeverMutated:true,actualMLModelUsed:false,releasePASS:false};
 if(original.duplicateFaceIDs.length>0)
  return {schema:AIG_REAL3D_V101_SCHEMA,status:'BLOCK_DUPLICATE_SOURCE_FACES_REQUIRE_AUTHORITY',
   before:auditAIGReal3DSourceStructure(mesh),workingMesh:null,
   sourceMeshWasNeverMutated:true,actualMLModelUsed:false,releasePASS:false};
 if(original.degenerateFaceIDs.length&&!allowDropDegenerate)
  return {schema:AIG_REAL3D_V101_SCHEMA,status:'BLOCK_EXPLICIT_DEGENERATE_REPAIR_APPROVAL_REQUIRED',
   before:auditAIGReal3DSourceStructure(mesh),workingMesh:null,
   sourceMeshWasNeverMutated:true,actualMLModelUsed:false,releasePASS:false};
 if(original.degenerateFaceIDs.length/mesh.triangleCount>maxRemovedFraction)
  return {schema:AIG_REAL3D_V101_SCHEMA,status:'BLOCK_REMOVED_FACE_BUDGET_EXCEEDED',
   before:auditAIGReal3DSourceStructure(mesh),workingMesh:null,
   sourceMeshWasNeverMutated:true,actualMLModelUsed:false,releasePASS:false};
 let oriented;
 try{oriented=orient(mesh,original,allowDropDegenerate);}
 catch(e){return {schema:AIG_REAL3D_V101_SCHEMA,status:String(e.message),
  before:auditAIGReal3DSourceStructure(mesh),workingMesh:null,
  sourceMeshWasNeverMutated:true,releasePASS:false};}
 // A real UV textured GLB must NEVER lose authored UV/tangent data during
 // backend remodelling. If winding flips, original tangent orientation may
 // change and needs independent source evidence; BLOCK rather than silently
 // generating corrupted normal-mapped skin/clothes or a fake texture layout.
 if(mesh.uvs||mesh.tangents){
  if(!Array.isArray(mesh.uvs)||!Array.isArray(mesh.tangents)||
   mesh.uvs.length!==mesh.vertexCount*2||
   mesh.tangents.length!==mesh.vertexCount*4)
   fail('TEXTURED_SOURCE_UV_TANGENT_CONTRACT_INVALID');
  if(oriented.flipped.length)
   return {schema:AIG_REAL3D_V101_SCHEMA,
    status:'BLOCK_SOURCE_TEXTURE_TANGENT_REORIENTATION_NEEDS_EVIDENCE',
    before:auditAIGReal3DSourceStructure(mesh),workingMesh:null,
    sourceMeshWasNeverMutated:true,originalUVAndNormalsUntouched:true,
    releasePASS:false};
 }
 const normals=acceptNormalRebuild?
  rebuildNormals(mesh,oriented.indices):[...mesh.normals];
 const workingMesh=createAIG3DMesh({
  positions:mesh.positions,normals,indices:oriented.indices,
  provenance:'V101_SOURCE_TOPOLOGY_CORRECTED_WORKING_COPY'
 });
 if(mesh.uvs&&mesh.tangents){
  workingMesh.uvs=[...mesh.uvs];
  workingMesh.tangents=[...mesh.tangents];
 }
 const after=scan(workingMesh);
 // Do not silently create open edges, islands, non-manifold connections or
 // degenerate faces while "repairing". A hole cannot be inferred from the
 // original image and therefore is never synthesized here.
 if(after.nonManifoldEdgeCount>0||
  after.misorientedSharedEdges>original.misorientedSharedEdges||
  after.degenerateFaceIDs.length>original.degenerateFaceIDs.length||
  strictNoNewOpenings&&after.openBoundaryEdges>original.openBoundaryEdges||
  after.disconnectedFaceIslands>original.disconnectedFaceIslands)
  return {schema:AIG_REAL3D_V101_SCHEMA,status:'BLOCK_REPAIR_WORSENED_SOURCE_STRUCTURE',
   before:auditAIGReal3DSourceStructure(mesh),
   after:auditAIGReal3DSourceStructure(workingMesh),
   workingMesh:null,sourceMeshWasNeverMutated:true,releasePASS:false};
 const didChange=oriented.flipped.length>0||
  oriented.faceIDs.length!==mesh.triangleCount||acceptNormalRebuild;
 return {schema:AIG_REAL3D_V101_SCHEMA,
  status:after.misorientedSharedEdges===0?'STRUCTURE_REPAIR_WORKING_COPY_READY':
   'BLOCK_UNRESOLVED_ORIENTATION',
  before:auditAIGReal3DSourceStructure(mesh),
  after:auditAIGReal3DSourceStructure(workingMesh),
  workingMesh:after.misorientedSharedEdges===0?workingMesh:null,
  originalToWorkingFaceIDs:oriented.faceIDs,
  flippedOriginalFaceIDs:oriented.flipped,
  removedOriginalDegenerateFaceIDs:allowDropDegenerate?
   original.degenerateFaceIDs:[],
  originalVertexXYZNotMoved:true,
  originalMeshNormalsAndFacesNotMutated:true,
  originalUVAndTangentsPreservedIfSourceValidated:Boolean(mesh.uvs),
  sourceMeshWasNeverMutated:true,sourceOpeningsNeverFabricated:true,
  originalMaterialsAndUVsNotValidated:true,
  sourceDisconnectedPartsRetained:true,
  actualMLModelUsed:false,geometricalFixActuallyMade:didChange,
  anatomicallyRealisticFaceOrHairCertified:false,
  autoApprovedSourceAuthority:false,releasePASS:false};
}
export function repairAIGReal3DImportedScene({
 imported,allowDropDegenerate=false,acceptNormalRebuild=true
}={}){
 if(imported?.schema!=='AIG_REAL3D_V99_REAL_NATIVE_GENERATED_GLB_SOURCE_V1'||
  !imported.scene?.nodes?.length)fail('REAL_V99_SOURCE_IMPORT_REQUIRED');
 const reports=imported.scene.nodes.map(n=>({
  nodeId:n.id,...repairAIGReal3DSourceMesh({
   mesh:n.mesh,allowDropDegenerate,acceptNormalRebuild
  })
 }));
 const failed=reports.filter(r=>r.workingMesh===null);
 if(failed.length)return {schema:'AIG_REAL3D_V101_SOURCE_SCENE_REMODEL_V1',
  status:'BLOCK_UNSAFE_TOPOLOGY_OR_UNVERIFIED_SOURCE',
  failedNodeIds:failed.map(x=>x.nodeId),reports,workingScene:null,
  importedV99SourceUnmodified:true,releasePASS:false};
 const nodes=imported.scene.nodes.map((n,i)=>({
  ...n,mesh:reports[i].workingMesh,source:'V101_ACTUAL_SOURCE_REPAIRED_WORKING_COPY'
 }));
 return {schema:'AIG_REAL3D_V101_SOURCE_SCENE_REMODEL_V1',
  status:'WORKING_SCENE_READY_FOR_GPU',
  reports,workingScene:{...imported.scene,nodes,
   revision:(imported.scene.revision??0)+1},
  originalSourceSha256:imported.actualSourceModelSha256,
  originalImageSha256:imported.originalImageSha256,
  originalAssetId:imported.assetId,
  originalNodeIdsPreserved:true,importedV99SourceUnmodified:true,
  semanticComponentLabelsIndependentlyVerified:false,
  originalModelAppearanceCertified:false,
  sourceImageOrMLWeightsIndependentlyMeasured:false,
  releasePASS:false};
}
