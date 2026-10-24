/**
 * Original-global Indexed OBJ -> stable WebGL cache nodes.
 * GPU positions/normals updated with bufferSubData, index VBO never re-uploaded.
 * This is GPU upload optimization, NOT source CPU mesh rebuilding optimization.
 * Same scene, matching nodes, identical original triangle topology mandatory.
 */
export const AIG_REAL3D_GPU_DELTA_SCHEMA='AIG_REAL3D_SOURCE_GPU_BUFFER_SUBDATA_V1';
const fail=s=>{throw Error('REAL3D_GPU_DELTA_'+s);};
const matchesTopology=(a,b)=>{
 if(!a||!b||a.vertexCount!==b.vertexCount||
  a.triangleCount!==b.triangleCount||
  a.indices?.length!==b.indices?.length)return false;
 for(let i=0;i<a.indices.length;i++)
  if(a.indices[i]!==b.indices[i])return false;
 return true;
};
export function applyAIGReal3DSourceMeshDelta({renderer,liveScene,nextScene}={}){
 if(typeof renderer?.updateMeshVertices!=='function'||
  liveScene?.schema!=='AIG_REAL3D_SCENE_V1'||
  nextScene?.schema!=='AIG_REAL3D_SCENE_V1'||
  !Array.isArray(liveScene.nodes)||!Array.isArray(nextScene.nodes)||
  liveScene.nodes.length!==nextScene.nodes.length||
  liveScene.nodes.length===0)fail('SCENE_OR_GPU_API_REQUIRED');
 let changedOriginalLocalVertices=0,subDataCalls=0,unchangedNodes=0,changedNodes=0;
 const updates=[];
 // Preflight ALL nodes before touching any GPU buffer to avoid partial failure.
 for(let i=0;i<liveScene.nodes.length;i++){
  const old=liveScene.nodes[i],fresh=nextScene.nodes[i];
  if(old.id!==fresh.id||!matchesTopology(old.mesh,fresh.mesh)||
   old.mesh.positions.length!==fresh.mesh.positions.length||
   old.mesh.normals.length!==fresh.mesh.normals.length||
   old.mesh.positions.length!==old.mesh.normals.length||
   old.mesh.provenance!==fresh.mesh.provenance||
   old.mesh.positions.some(x=>!Number.isFinite(x))||
   fresh.mesh.positions.some(x=>!Number.isFinite(x))||
   fresh.mesh.normals.some(x=>!Number.isFinite(x)))
   fail('ORIGINAL_INDEXED_SOURCE_TOPOLOGY_MISMATCH');
  const changed=[];
  for(let k=0;k<old.mesh.vertexCount;k++){
   const a=old.mesh.positions,b=fresh.mesh.positions,
    c=old.mesh.normals,d=fresh.mesh.normals,j=3*k;
   if(a[j]!==b[j]||a[j+1]!==b[j+1]||a[j+2]!==b[j+2]||
    c[j]!==d[j]||c[j+1]!==d[j+1]||c[j+2]!==d[j+2])
    changed.push(k);
  }
  updates.push({old:old.mesh,fresh:fresh.mesh,changed});
 }
 for(const u of updates){
  if(!u.changed.length){unchangedNodes++;continue;}
  const result=renderer.updateMeshVertices(u.old,{
   positions:u.fresh.positions,normals:u.fresh.normals,
   changedVertexIndices:u.changed
  });
  if(!result.originalIndexBufferReused||result.fullGPUBufferReallocation)
   fail('INDEX_BUFFER_REUSED_REQUIRED');
  changedNodes++;changedOriginalLocalVertices+=result.changedVertexCount;
  subDataCalls+=result.positionSubDataCalls+result.normalSubDataCalls;
 }
 return {
  schema:AIG_REAL3D_GPU_DELTA_SCHEMA,
  originalSourceTopologyPreserved:true,
  reusedOriginalIndexGPUBuffers:true,
  reusedPositionNormalGPUBuffers:true,
  changedOriginalLocalVertices,
  gpuBufferSubDataCalls:subDataCalls,
  nodesReused:liveScene.nodes.length,
  gpuNodesActuallyUpdated:changedNodes,
  unchangedNodesSkipped:unchangedNodes,
  fullGPUVertexBuffersReallocated:false,
  originalOBJUnmodified:true,
  cpuSourceSceneStillRebuiltForEachFrame:true,
  sourceAnatomicalHumanVerified:false,
  noClaimOfMeasuredAndroidWindowsFPS:true,
  releasePASS:false
 };
}
