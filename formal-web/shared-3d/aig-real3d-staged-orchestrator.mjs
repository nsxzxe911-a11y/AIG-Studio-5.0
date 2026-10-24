/**
 * V83: Real3D SOURCE geometry -> explicit FK pose -> sampled contact/swept
 * risk -> genuine indexed WebGL delta draw. A bounded, strictly ordered
 * coordinator, NOT a synthesized human or a CNC physical safety controller.
 *
 * Source inputs are existing, previously audited original GLOBAL Indexed OBJ
 * triangle buffers and three genuine source-native FK pose frames. Neither
 * CPU workers nor GPU draw may infer/add/smooth a person's anatomy.
 */
import {createAIGReal3DPersistentVPU}
 from './aig-real3d-persistent-vpu.mjs';
import {inspectAIGReal3DStrainSerial}
 from './aig-real3d-quad-strain-pool.mjs';
import {applyAIGReal3DSourceMeshDelta}
 from './aig-real3d-gpu-delta-source.mjs';
import {AIG_REAL3D_THREE_JOINT_SCHEMA}
 from './aig-real3d-three-joint-swept-motion.mjs';
export const AIG_REAL3D_V83_SCHEMA='AIG_REAL3D_V83_SOURCE_MULTIMODULE_ORCHESTRATOR_V1';
const die=x=>{throw Error('REAL3D_V83_'+x);};
const validSHA=s=>typeof s==='string'&&/^[a-f0-9]{64}$/i.test(s);
const safeNumber=x=>typeof x==='number'&&Number.isFinite(x);
const fixed=n=>Math.round(n*1000)/1000;
const milliseconds=()=>performance.now();
function chooseWorkers({requestedWorkers,faceCount,hardwareConcurrency}){
 if(!['AUTO',1,2,4].includes(requestedWorkers)||
  !Number.isInteger(hardwareConcurrency)||hardwareConcurrency<0||
  hardwareConcurrency>1024)die('WORKER_CONFIGURATION_INVALID');
 if(requestedWorkers!=='AUTO')return requestedWorkers;
 const capability=hardwareConcurrency||1;
 return faceCount>=2048&&capability>=4?4:
  faceCount>=512&&capability>=2?2:1;
}
function compareStrain(actual,expected){
 if(actual.inspectedOriginalTriangles!==undefined&&
  (!Number.isInteger(actual.inspectedOriginalTriangles)||
   actual.inspectedOriginalTriangles<0))die('SOURCE_FACE_DIAGNOSTIC_INVALID');
 for(const key of ['changedSourceTriangles','invertedSourceTriangles',
  'nearlyCollapsedSourceTriangles'])
  if(actual[key]!==expected?.[key])die('SOURCE_FK_STRAIN_PARITY_'+key);
 for(const key of ['maxSourceEdgeStretchPercent',
  'maxSourceEdgeCompressionPercent'])
  if(!safeNumber(actual[key])||!safeNumber(expected?.[key])||
   Math.abs(actual[key]-expected[key])>.0031)
   die('SOURCE_FK_STRAIN_PARITY_'+key);
}
function checkSource(options){
 const {sourceSha256,original,indices,triangleOffsets,frameEvidence,
  posedSources,poseScenes,gpuFrameEvidence}=options;
 if(!validSHA(sourceSha256)||
  !(original instanceof Float32Array)||original.length<9||
  original.length%3||
  !(indices instanceof Uint32Array)||indices.length<6000||
  indices.length%3||
  !(triangleOffsets instanceof Uint32Array)||
  triangleOffsets.length<1||
  !Array.isArray(frameEvidence)||frameEvidence.length<3||
  !Array.isArray(posedSources)||posedSources.length!==3||
  !Array.isArray(poseScenes)||poseScenes.length!==3||
  !Array.isArray(gpuFrameEvidence)||gpuFrameEvidence.length!==3)
  die('AUTHENTIC_SOURCE_AND_THREE_GPU_POSES_REQUIRED');
 if(original.some(x=>!safeNumber(x))||
  indices.some(x=>x>=original.length/3)|| 
  posedSources.some(p=>!(p instanceof Float32Array)||
   p.length!==original.length||p.some(x=>!safeNumber(x)))||
  poseScenes.some(scene=>scene?.schema!=='AIG_REAL3D_SCENE_V1'||
   !Array.isArray(scene.nodes)||!scene.nodes.length))
  die('GLOBAL_INDEXED_GEOMETRY_INVALID');
 let lastOffset=-3;
 for(const offset of triangleOffsets){
  if(offset%3||offset+2>=indices.length||offset<=lastOffset)
   die('ORIGINAL_AFFECTED_FACE_ORDER_INVALID');
  lastOffset=offset;
 }
 const total=indices.length/3;
 for(const [i,gpu] of gpuFrameEvidence.entries()){
  if(!Number.isInteger(gpu?.sampleIndex)||
   !validSHA(gpu?.sha256)||gpu.width!==1080||gpu.height!==1920||
   gpu.sourceTriangles!==total)
   die('EXISTING_NATIVE_GPU_FRAME_EVIDENCE_INVALID');
  const frame=frameEvidence.find(f=>f.sampleIndex===gpu.sampleIndex);
  if(!frame||frame.deformation?.changedSourceTriangles===undefined||
   !frame.contact)die('GPU_FRAME_SOURCE_FK_NOT_MATCHED');
  if(poseScenes[i].nodes.some(n=>!n.mesh||
   !Array.isArray(n.mesh.indices)||!Array.isArray(n.mesh.positions)||
   !Array.isArray(n.mesh.normals)))die('GPU_INDEXED_SOURCE_SCENE_MISSING');
 }
 const indexes=gpuFrameEvidence.map(x=>x.sampleIndex);
 if(indexes.some((v,i)=>i&&v<=indexes[i-1]))
  die('GPU_FRAME_SOURCE_ORDER_INVALID');
 for(const frame of frameEvidence){
  if(!Number.isInteger(frame.sampleIndex)||frame.sampleIndex<0||
   !frame.contact||!frame.deformation||
   frame.sampleIndex>0&&frame.sweptRiskFromPriorSample===undefined)
   die('SOURCE_CONTACT_AND_SWEPT_EVIDENCE_REQUIRED');
 }
 // Verify source GPU nodes have a stable indexed topology. Actual
 // bufferSubData validates exact arrays again before every GPU mutation.
 const live=poseScenes[0],faces=live.nodes.reduce((s,n)=>s+n.mesh.triangleCount,0);
 if(faces!==total||poseScenes.some(s=>
  s.nodes.length!==live.nodes.length||
  s.nodes.some((node,i)=>{
   const a=live.nodes[i],b=node.mesh,c=a.mesh;
   return node.id!==a.id||b?.provenance!==c.provenance||
    b.vertexCount!==c.vertexCount||
    b.indices.length!==c.indices.length||
    b.indices.some((x,k)=>x!==c.indices[k]);
  })))die('GPU_SOURCE_TRIANGLE_TOPOLOGY_MISMATCH');
 const sourcePositionsBefore=original.slice(),sourceIndicesBefore=indices.slice();
 return {total,sourcePositionsBefore,sourceIndicesBefore};
}
function contactStage(evidence){
 const frames=evidence,possible=frames.some(x=>
  x.sweptRiskFromPriorSample?.intervalNeedsNarrowerSamplingOrFurtherCollisionReview===true),
  incomplete=frames.some(x=>x.contact?.budgetExhausted===true||
   x.sweptRiskFromPriorSample?.budgetExhausted===true),
  observed=frames.some(x=>x.contact?.observedContactAtSample===true),
  severeStrain=frames.some(x=>
   x.deformation.invertedSourceTriangles>0||
   x.deformation.nearlyCollapsedSourceTriangles>0);
 return {stage:'SAMPLED_CONTACT_AND_SWEPT_RISK',
  originalSourceFramesChecked:frames.length,
  observedSampledSourceIntersections:observed,
  possibleSweptCollisionIntervals:possible,
  contactBudgetIncomplete:incomplete,
  invertedOrCollapsedOriginalTriangles:severeStrain,
  continuousTimeCollisionFreeGuaranteed:false,
  anatomicalHumanMotionValidated:false,
  independentSafetyGate:'BLOCK',
  technicalDiagnosticsCollected:true};
}
/** Runs actual source stages sequentially; GPU owner is transferred to this
 * method and ALWAYS destroyed in finally even after error/abort.
 * Caller must not use the renderer after orchestration returns.
 */
export async function coordinateAIGReal3DStages({
 sourceSha256,original,indices,triangleOffsets,
 frameEvidence,posedSources,poseScenes,gpuFrameEvidence,
 renderer,requestedWorkers='AUTO',virtualLanes=16,
 hardwareConcurrency=typeof navigator==='undefined'?0:
  (navigator.hardwareConcurrency??0),
 workerFactory=null,abortSignal=null,
 maxPacketBytes=32*1024*1024,
 maxOwnedGPUBufferCount=128
}={}){
 if(!renderer||typeof renderer.render!=='function'||
  typeof renderer.updateMeshVertices!=='function'||
  typeof renderer.getGPUResourceAccounting!=='function'||
  typeof renderer.releaseMesh!=='function'||
  typeof renderer.destroy!=='function'||
  ![4,8,16].includes(virtualLanes)||
  !Number.isInteger(maxOwnedGPUBufferCount)||
  maxOwnedGPUBufferCount<3||maxOwnedGPUBufferCount>256)
  die('REAL_GPU_RENDERER_AND_BUDGET_REQUIRED');
 let workerPool=null,liveScene=null,afterCleanup=null,closedWorkers=null,
  ended=false;
 const trace=[],stages=[],workerResults=[],renderResults=[],
  t0=milliseconds();
 try{
  if(abortSignal?.aborted)die('ABORTED');
  const validated=checkSource({
   sourceSha256,original,indices,triangleOffsets,
   frameEvidence,posedSources,poseScenes,gpuFrameEvidence
  });
  const {total,sourceIndicesBefore,sourcePositionsBefore}=validated;
  const stageTime=milliseconds();
  trace.push('ORIGINAL_INDEXED_GEOMETRY');
  stages.push({stage:trace.at(-1),sourceSha256,
   originalSourceTriangles:total,
   activeAffectedOriginalTriangles:triangleOffsets.length,
   originalGlobalIndexSpacePreserved:true,
   fullSourceTriangleTopologyVerified:true});
  const count=chooseWorkers({requestedWorkers,
   faceCount:triangleOffsets.length,hardwareConcurrency});
  const selected=triangleOffsets.length<256?1:count;
  const modes={workerSlots:selected,virtualLanes,
   fallbackToSerial:selected===1,
   actualBrowserHardwareConcurrency:hardwareConcurrency,
   physicalCPUCoresNotCreated:true};
  if(selected>1)workerPool=createAIGReal3DPersistentVPU({
   physicalWorkers:selected,virtualLanes,maxBatches:3,
   maxPacketBytes,workerFactory
  });
  // Phase 2: each pre-audited genuine parent->child FK ORIGINAL source
  // pose gets its own independent original triangle strain parity.
  for(let i=0;i<3;i++){
   if(abortSignal?.aborted)die('ABORTED');
   const posed=posedSources[i],f=frameEvidence.find(x=>
    x.sampleIndex===gpuFrameEvidence[i].sampleIndex);
   const strain=workerPool?
    (await workerPool.runBatch({
     original,posed,indices,triangleOffsets,sourceSha256,abortSignal
    })).sourceIndexedGeometryResult:
    inspectAIGReal3DStrainSerial({
     original,posed,indices,triangleOffsets
    });
   compareStrain(strain,f.deformation);
   workerResults.push({frameSampleIndex:f.sampleIndex,
    checkedOriginalTriangles:strain.inspectedOriginalTriangles,
    sourceFKStrainParity:true,
    processingMode:workerPool?'PERSISTENT_REAL_WORKERS':'SERIAL_SMALL_WORKLOAD',
    changedOriginalTriangles:strain.changedSourceTriangles});
  }
  trace.push('SOURCE_FK_POSE');
  stages.push({stage:trace.at(-1),
   originalSourcePosesVerified:workerResults.length,
   ...modes,sourceStrainAlignedToSampledJointFK:true,
   workerCreations:workerPool?.stats().actualWorkerObjectsCreated??0,
   workerTasksDone:workerPool?.stats().virtualTasksCompleted??0,
   mathStageWallMs:fixed(milliseconds()-stageTime)});
  if(abortSignal?.aborted)die('ABORTED');
  // Phase 3: use real sampled contact and swept evidence; NEVER clear
  // safety on absence of sampled crossings or incomplete search.
  trace.push('SAMPLED_CONTACT_AND_SWEPT_RISK');
  stages.push(contactStage(frameEvidence));
  // Phase 4: actual WebGL GPU indexed source geometry across three
  // poses with SAME GPU allocations and changed vertex updates.
  trace.push('GENUINE_GPU_FRAMES');
  liveScene=structuredClone(poseScenes[0]);
  if(liveScene===poseScenes[0])die('LIVE_GPU_SCENE_NOT_OWNED');
  const gpuStart=milliseconds();
  let allocated=null;
  for(let i=0;i<poseScenes.length;i++){
   if(abortSignal?.aborted)die('ABORTED');
   const update=i?applyAIGReal3DSourceMeshDelta({
    renderer,liveScene,nextScene:poseScenes[i]
   }):null;
   const rendered=renderer.render(liveScene);
   if(rendered?.status!=='WEBGL_XYZ_TRIANGLES_RENDERED'||
    rendered.triangles!==total)die('NATIVE_ORIGINAL_GPU_DRAW_BLOCKED');
   const accounted=renderer.getGPUResourceAccounting();
   if(!Number.isInteger(accounted?.activeTrackedOwnedGPUBufferCount)||
    accounted.activeTrackedOwnedGPUBufferCount<3||
    accounted.activeTrackedOwnedGPUBufferCount>maxOwnedGPUBufferCount)
    die('GPU_OWNED_BUFFER_BUDGET_EXCEEDED');
   if(allocated){
    if(accounted.totalOwnedGPUBuffersCreated!==allocated.totalOwnedGPUBuffersCreated||
     accounted.fullBufferDataUploads!==allocated.fullBufferDataUploads||
     accounted.fullBufferBytesUploaded!==allocated.fullBufferBytesUploaded||
     !update?.reusedOriginalIndexGPUBuffers||
     update.fullGPUVertexBuffersReallocated)
     die('GPU_BUFFER_REALLOCATION_BETWEEN_POSES');
   }else allocated=accounted;
   renderResults.push({sampleIndex:gpuFrameEvidence[i].sampleIndex,
    originalSourceTrianglesRendered:rendered.triangles,
    originalNativePNG_SHAFromPriorCertifiedCapture:gpuFrameEvidence[i].sha256,
    frameReusedOriginalGPUBuffers:i>0,
    incrementalBufferSubDataCalls:update?.gpuBufferSubDataCalls??0,
    trackedGPUBufferCount:accounted.activeTrackedOwnedGPUBufferCount});
  }
  stages.push({stage:trace.at(-1),actualGPUOriginalIndexedDraws:renderResults.length,
   native1080x1920PNG_SHAFromPreviouslyVerifiedFrames:
    gpuFrameEvidence.map(f=>f.sha256),
   firstFrameCreatedGPUBufferCount:allocated.activeTrackedOwnedGPUBufferCount,
   GPUBufferAllocationGrowthAcrossFrames:0,
   trueGPURenderAndDeltaPerformedNow:true,
   nativePNGsWereNotRecapturedInThisStage:true,
   measuredSubmissionWallMs:fixed(milliseconds()-gpuStart)});
  if(original.some((x,i)=>x!==sourcePositionsBefore[i])||
   indices.some((x,i)=>x!==sourceIndicesBefore[i]))
   die('SOURCE_OBJ_POSITION_OR_INDEX_CHANGED');
  ended=true;
  return {schema:AIG_REAL3D_V83_SCHEMA,sourceSha256,
   stages,stageOrder:trace,workerResults,gpuDraws:renderResults,
   totalWallMs:fixed(milliseconds()-t0),
   requestedWorkers,selectedWorkers:selected,
   actualRealWorkerCreations:workerPool?
    workerPool.stats().realWebWorkersCreated:0,
   virtualTasksExecuted:workerPool?.stats().virtualTasksCompleted??0,
   originalSourceXYZAndFaceIndicesUnmodified:true,
   originalGPUIndexBufferReused:true,
   sampledCollisionCannotProveSafety:true,
   naturalHumanBodyValidated:false,
   realDeviceStableFPSAndThermalPASS:false,
   overallReleasePASS:false};
 }finally{
  // Worker and renderer ownership remains bounded even after a failure.
  if(workerPool)closedWorkers=workerPool.close('V83_STAGE_FINALLY');
  if(liveScene){
   try{renderer.releaseMesh(liveScene.nodes[0].mesh);}
   catch{/* destroy below closes all owned buffers */}
  }
  try{renderer.destroy();afterCleanup=renderer.getGPUResourceAccounting();}
  catch{/* upstream exception will still propagate */}
  // Validate resource teardown on otherwise successful runs.
  if(ended&&(!afterCleanup?.rendererDestroyed||
   afterCleanup.ownedGPUBufferAllocationBalance!==0||
   afterCleanup.activeTrackedOwnedGPUBufferCount!==0||
   (workerPool!==null&&closedWorkers?.liveWorkerObjects!==0)))
   die('GPU_OR_WORKER_TEARDOWN_INCOMPLETE');
 }
}
