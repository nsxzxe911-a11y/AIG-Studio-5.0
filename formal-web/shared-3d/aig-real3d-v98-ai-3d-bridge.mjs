/**
 * V98 actual common 2D/3D source orchestration.
 * Person: reuses V97 photo-constrained real XYZ and six-joint animator.
 * Ship/environment/animal/CNC: accepts original source meshes ONLY.
 * Optional image-model observations are an INPUT ADAPTER, not a fake trained
 * image generation model or an image_gen service inside the runtime.
 */
import {runAIGReal3DV97PhotoConstrainedModel}
 from './aig-real3d-v97-auto-constrained-model.mjs';
import {createAIGReal3DUnifiedSource,evaluateAIGReal3DUnifiedReprojection,
 buildAIGReal3DProjectedWireframe}
 from './aig-real3d-v98-unified-source-projection.mjs';
import {fitAIGReal3DObservedMultiViewAnchors}
 from './aig-real3d-v98-projection-fit.mjs';
import {auditAIGReal3D4KSourceProjection}
 from './aig-real3d-v96-native-4k-pipeline.mjs';
export const AIG_REAL3D_V98_BRIDGE_SCHEMA='AIG_REAL3D_V98_SHARED_VISUAL_2D_3D_4K_BRIDGE_V1';
const fail=x=>{throw Error('REAL3D_V98_BRIDGE_'+x);};
export function createAIGReal3DUnifiedAssetPipeline({
 domain,assetId,scene,originalImageSha256,
 approvedIdentitySha256=null,sourceGeometrySha256=null,
 imageViews=[],projectedViewId=null,
 correctionEnabled=false
}={}){
 const record=createAIGReal3DUnifiedSource({
  domain,assetId,scene,originalImageSha256,approvedIdentitySha256,
  sourceGeometrySha256,imageViews
 });
 const baseline=evaluateAIGReal3DUnifiedReprojection({record});
 const fit=correctionEnabled?fitAIGReal3DObservedMultiViewAnchors({record}):null;
 const workingScene=fit?.workingScene??scene,
  projected=projectedViewId===null?null:buildAIGReal3DProjectedWireframe({
   record,scene:workingScene,viewId:projectedViewId});
 return {schema:AIG_REAL3D_V98_BRIDGE_SCHEMA,record,baseline,fit,
  scene:workingScene,projected,
  shared3DSourceScene:scene,
  sourceGeometryNodes:record.nodeSourceManifest,
  usableForDomains:['PERSON','ANIMAL','SHIP','ENVIRONMENT','CNC_PART'],
  importedActualAIImageWeights:false,
  trainedMultiviewReconstructionModelActuallyCalled:false,
  2DImagePixelsGeneratedByAIGEngine:false,
  originalIdentityFaceStillLocked:true,
  sourceMeshesModified:false,
  runtimeReal3DGeometryAvailable:true,
  canSendWorkingCopyToV96Native4K:true,
  sourceAIInferredBackDoesNotProveDepth:true,
  releasePASS:false};
}
export function runAIGReal3DUnifiedPortrait({
 rgba,width,height,imageSha256,approvedIdentitySha256,
 assetId='StarJourneyLockedHeroineCandidate',
 imageViews=[],faceLandmarks=null,wrapMode='FULL_WRAP'
}={}){
 const v97=runAIGReal3DV97PhotoConstrainedModel({
  rgba,width,height,imageSha256,approvedIdentitySha256,
  approvedIdentitySourcePresent:false,faceLandmarks,wrapMode
 });
 if(!v97.candidate)return {schema:AIG_REAL3D_V98_BRIDGE_SCHEMA,
  status:'BLOCK_UNRELIABLE_PORTRAIT',v97,releasePASS:false};
 const record=createAIGReal3DUnifiedAssetPipeline({
  assetId,domain:'PERSON',
  scene:v97.candidate.scene,
  originalImageSha256:imageSha256,
  approvedIdentitySha256,
  imageViews
 });
 return {...record,
  status:'V98_SOURCE_SHARED_INFERRED_CHARACTER_WORKING_COPY',
  faceContourActuallyFitted:v97.actualFaceContourFitImprovementMeasured,
  v97,
  certifiedHumanFace:false,
  realModelHasOriginalIndexed3D:v97.candidate.mesh.actualXYZTriangles,
  readyForNative4KTechnicalPreview:true,
  identityApprovedAsActualHeroine:false,
  releasePASS:false};
}
export function evaluateAIGReal3DUnified4KSource({
 pipeline,sourceSha256,camera
}={}){
 if(pipeline?.schema!==AIG_REAL3D_V98_BRIDGE_SCHEMA||
  !pipeline?.scene||sourceSha256!==pipeline.record.originalImageSha256)
  fail('SOURCE_LOCK_AND_TRUE_3D_REQUIRED');
 return auditAIGReal3D4KSourceProjection({
  scene:pipeline.scene,sourceSha256,camera,
  width:3840,height:2160
 });
}
