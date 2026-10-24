/**
 * V102 dedicated off-main-thread geometry remodelling Worker.
 * Rendering/canvas stays on UI, CPU source topology audit happens here.
 * A snapshot is posted only when remodelling really completes.
 * This does NOT magically parallelize GPU rendering or neural AI itself.
 */
import {remodelAIGReal3DGeometryBackend}
 from './aig-real3d-v101-backend-orchestrator.mjs';
const validSHA=x=>typeof x==='string'&&/^[a-f0-9]{64}$/i.test(x);
self.addEventListener('message',event=>{
 const request=event.data;
 const jobId=request?.jobId;
 try{
  if(!Number.isInteger(jobId)||jobId<1||
   request?.type!=='REMODEL_SOURCE'||
   request?.imported?.schema!=='AIG_REAL3D_V99_REAL_NATIVE_GENERATED_GLB_SOURCE_V1'||
   !validSHA(request.sourceSHA)||
   request.imported.actualSourceModelSha256!==request.sourceSHA)
   throw Error('V102_ORIGINAL_SOURCE_WORKER_CONTRACT_BLOCK');
  const result=remodelAIGReal3DGeometryBackend({
   imported:request.imported,allowDropDegenerate:false,
   acceptNormalRebuild:true,observedImageViews:[],camera:request.camera
  });
  self.postMessage({type:'REMODEL_RESULT',jobId,
   sourceSHA:request.sourceSHA,result});
 }catch(error){
  self.postMessage({type:'REMODEL_BLOCK',jobId,
   reason:String(error?.message??error)});
 }
});
