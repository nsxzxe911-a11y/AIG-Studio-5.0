/**
 * Dedicated REAL browser Worker for the Drawing kernel. This runs topology
 * checks off the rendering thread; it never creates a GPU context. 19,200
 * logical slots do not mean 19,200 threads. Actual worker count = 1.
 */
self.addEventListener('message',({data})=>{
 if(data?.kind!=='ANALYZE_REAL_INDEXED_MESHES')return;
 const {token,meshes,chunkSize}=data;
 try{
  if(!Array.isArray(meshes)||meshes.length<1||meshes.length>256||
   !Number.isInteger(chunkSize)||chunkSize<1||chunkSize>100000)
   throw Error('WORKER_INDEXED_MESH_BATCH_INVALID');
  let triangles=0,vertices=0,chunks=0,degenerate=0;
  const groups=[];
  for(const mesh of meshes){
   if(!(mesh.positions instanceof Float32Array)||
    !(mesh.indices instanceof Uint32Array)||
    mesh.positions.length%3||mesh.indices.length%3||
    !mesh.indices.length||!mesh.positions.length)
    throw Error('WORKER_SOURCE_BUFFERS_INVALID');
   const pos=mesh.positions,inds=mesh.indices;
   const vCount=pos.length/3;
   let boundsMin=[Infinity,Infinity,Infinity],
    boundsMax=[-Infinity,-Infinity,-Infinity];
   for(let v=0;v<pos.length;v+=3){
    for(let axis=0;axis<3;axis++){
     const val=pos[v+axis];
     if(!Number.isFinite(val))throw Error('WORKER_VERTEX_NON_FINITE');
     boundsMin[axis]=Math.min(boundsMin[axis],val);
     boundsMax[axis]=Math.max(boundsMax[axis],val);
    }
   }
   for(let i=0;i<inds.length;i+=chunkSize*3){
    const end=Math.min(i+chunkSize*3,inds.length);
    for(let k=i;k<end;k+=3){
     const ia=inds[k],ib=inds[k+1],ic=inds[k+2];
     if(ia>=vCount||ib>=vCount||ic>=vCount)
      throw Error('WORKER_INDEX_OUT_OF_RANGE');
     const a=ia*3,b=ib*3,c=ic*3;
     const x=pos[b]-pos[a],y=pos[b+1]-pos[a+1],z=pos[b+2]-pos[a+2];
     const u=pos[c]-pos[a],v=pos[c+1]-pos[a+1],w=pos[c+2]-pos[a+2];
     const area2=Math.hypot(y*w-z*v,z*u-x*w,x*v-y*u);
     if(area2<1e-11)degenerate++;
    }
    chunks++;
   }
   triangles+=inds.length/3;
   vertices+=vCount;
   groups.push({id:mesh.id,vertices:vCount,triangles:inds.length/3,
    boundsMin,boundsMax});
  }
  self.postMessage({token,kind:'DRAWING_CHECK_FINISHED',
   result:{actualWorkerThreadsUsed:1,actualGpuContextsCreated:0,
    actualSourceTrianglesInspected:triangles,
    actualSourceVerticesInspected:vertices,
    realWorkChunks:chunks,degenerateTriangles:degenerate,
    meshGroupCount:groups.length,
    visiblyContinuousBodyCertified:false,
    structuralMeshGroups:groups}});
 }catch(e){
  self.postMessage({token,kind:'DRAWING_CHECK_FAILED',
   reason:String(e?.message||e)});
 }
});
