/**
 * Browser-side ONE Worker bridge (DRAW), sharing no WebGL context.
 * Caller can retry on main thread only if Worker API is absent; failures
 * from an actual Worker are fail-closed rather than concealed.
 */
export const AIG_REAL3D_WORKER_SCHEMA='AIG_REAL3D_DRAWING_WORKER_REAL_TOPOLOGY_V1';
export async function runAIG3DIndexedDrawingWorker({scene,plan,signal}={}){
 if(typeof Worker!=='function')
  throw Error('AIG_REAL3D_WORKER_API_NOT_AVAILABLE');
 if(!Array.isArray(scene?.nodes)||!scene.nodes.length||
  plan?.drawingKernel?.reservedSlots<1)
  throw Error('AIG_REAL3D_WORKER_SOURCE_OR_BUDGET_MISSING');
 if(signal?.aborted)throw Error('AIG_REAL3D_WORKER_CANCELLED');
 const meshes=scene.nodes.map(node=>{
  const p=node.mesh?.positions,i=node.mesh?.indices;
  if(!Array.isArray(p)||!Array.isArray(i))
   throw Error('AIG_REAL3D_WORKER_EXPECTS_REAL_INDEXED_SCENE');
  return {id:node.id,positions:new Float32Array(p),
   indices:new Uint32Array(i)};
 });
 const chunkSize=Math.max(8,Math.ceil(
  meshes.reduce((a,m)=>a+m.indices.length/3,0)/
  Math.min(plan.drawingKernel.reservedSlots,192)));
 const worker=new Worker(
  new URL('./aig-real3d-dual-drawing-worker.mjs',import.meta.url),
  {type:'module',name:'AIG-Real3D-DRAW-CPU'});
 let abortListener=null;
 try{
  return await new Promise((resolve,reject)=>{
   const fail=e=>{reject(Error('AIG_REAL3D_WORKER_'+String(e?.message||e)))};
   worker.onerror=fail;
   worker.onmessage=e=>{
    if(e.data?.token!==1)return;
    if(e.data.kind==='DRAWING_CHECK_FAILED')
     return fail(Error(e.data.reason||'DRAWING_GATE_FAILED'));
    if(e.data.kind!=='DRAWING_CHECK_FINISHED')
     return fail(Error('UNRECOGNIZED_CPU_WORKER_RESULT'));
    const result=e.data.result;
    if(result.actualWorkerThreadsUsed!==1||
     result.actualGpuContextsCreated!==0||
     !Number.isInteger(result.actualSourceTrianglesInspected))
     return fail(Error('WORKER_RESULT_CONTRACT_INVALID'));
    resolve(result);
   };
   abortListener=()=>reject(Error('AIG_REAL3D_WORKER_CANCELLED'));
   signal?.addEventListener('abort',abortListener,{once:true});
   const transfers=meshes.flatMap(m=>[
    m.positions.buffer,m.indices.buffer]);
   worker.postMessage({token:1,kind:'ANALYZE_REAL_INDEXED_MESHES',
    chunkSize,meshes},transfers);
  });
 }finally{
  signal?.removeEventListener('abort',abortListener);
  worker.terminate();
 }
}
