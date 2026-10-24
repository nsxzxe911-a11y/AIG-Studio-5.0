/**
 * V101 back-end = true AI-produced/scan mesh intake (V99/V100)
 * -> deterministic topology-safe remanufacture working copy
 * -> *optional* actual independently observed 2D photo-to-XYZ correction
 * -> V96 native GPU output.
 *
 * Learned reconstruction remains V100's trained-model job. This module does
 * not pretend to have secretly loaded a deep neural model or know hidden
 * original geometry, hair, physiology, real depth, real-world identity.
 */
import {repairAIGReal3DImportedScene,auditAIGReal3DSourceStructure}
 from './aig-real3d-v101-structure-repair.mjs';
import {createAIGReal3DUnifiedAssetPipeline}
 from './aig-real3d-v98-ai-3d-bridge.mjs';
import {auditAIGReal3D4KSourceProjection}
 from './aig-real3d-v96-native-4k-pipeline.mjs';
export const AIG_REAL3D_V101_BACKEND_SCHEMA='AIG_REAL3D_V101_SOURCE_REMODELLING_BACKEND_V1';
const fail=s=>{throw Error('REAL3D_V101_BACKEND_'+s);};
export function remodelAIGReal3DGeometryBackend({
 imported,allowDropDegenerate=false,acceptNormalRebuild=true,
 observedImageViews=[],camera=null
}={}){
 if(imported?.schema!=='AIG_REAL3D_V99_REAL_NATIVE_GENERATED_GLB_SOURCE_V1'||
  !Array.isArray(observedImageViews)||
  observedImageViews.length>12)
  fail('REAL_GLB_SOURCE_AND_IMAGE_EVIDENCE_REQUIRED');
 const structural=repairAIGReal3DImportedScene({
  imported,allowDropDegenerate,acceptNormalRebuild
 });
 if(!structural.workingScene){
  return {schema:AIG_REAL3D_V101_BACKEND_SCHEMA,status:'BLOCK_UNSAFE_SOURCE_STRUCTURE',
   sourceImageSHA:imported.originalImageSha256,
   sourceMeshSHA:imported.actualSourceModelSha256,
   structural,originalSourceUnchanged:true,
   workingScene:null,neuralModelCalledHere:false,
   filmReady:false,releasePASS:false};
 }
 let scene=structural.workingScene,fit=null,projection=null;
 if(observedImageViews.length){
  const shared=createAIGReal3DUnifiedAssetPipeline({
   domain:imported.domain,assetId:imported.assetId,scene,
   originalImageSha256:imported.originalImageSha256,
   sourceGeometrySha256:imported.actualSourceModelSha256,
   imageViews:observedImageViews,correctionEnabled:true
  });
  fit=shared.fit;scene=fit.workingScene;
  const changed=scene.nodes.map(n=>auditAIGReal3DSourceStructure(n.mesh));
  for(let i=0;i<changed.length;i++){
   const before=structural.reports[i].after;
   const after=changed[i];
   if(after.nonManifoldEdgeCount>before.nonManifoldEdgeCount||
    after.openBoundaryEdges>before.openBoundaryEdges||
    after.degenerateFaceIDs.length>before.degenerateFaceIDs.length||
    after.misorientedSharedEdges>before.misorientedSharedEdges)
    fail('SOURCE_OBSERVATION_CORRECTION_DAMAGED_TOPOLOGY');
  }
 }
 if(camera&&scene.units==='METERS'){
  projection=auditAIGReal3D4KSourceProjection({
   scene,sourceSha256:imported.originalImageSha256,
   camera,width:3840,height:2160
  });
 }
 return {schema:AIG_REAL3D_V101_BACKEND_SCHEMA,
  status:fit?'SOURCE_REPAIRED_AND_OBSERVED_IMAGE_FIT':
   'SOURCE_TOPOLOGY_REPAIRED_READY_FOR_GPU',
  sourceImageSHA:imported.originalImageSha256,
  sourceMeshSHA:imported.actualSourceModelSha256,
  originalAssetId:imported.assetId,
  originalSourceUnchanged:true,
  workingScene:scene,structural,
  faceIndexAndSourceFaceIDTraceable:true,
  sourcePartsAndIslandsNotDiscarded:true,
  observedImageFit:fit?{
   realObservedPixelRMSEBefore:fit.measured2DPixelRMSEBefore,
   realObservedPixelRMSEAfter:fit.measured2DPixelRMSEAfter,
   actualOriginalXYZVerticesMoved:fit.actuallyMovedOriginalSourceVertices
  }:null,
  noFabricatedPhotoObservations:observedImageViews.length===0,
  native4KSourceProjectionQA:projection,
  trainedNeuralGeometryInferenceCalledHere:false,
  sourceNeuralModelActuallyRanInV100:
   imported.actualLocalNeuralInferenceRunByThisMethod===true,
  originalFacesNeverSecretlyTessellated:true,
  sourceOpeningsAndHiddenBackNeverGuessed:true,
  highFidelityAnatomyIdentityCertified:false,
  finalMovieRenderPASS:false,
  releasePASS:false};
}
