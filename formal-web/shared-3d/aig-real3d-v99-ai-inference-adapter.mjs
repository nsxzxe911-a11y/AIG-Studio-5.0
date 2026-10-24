/**
 * V99 strict on-device model execution adapter contract.
 * Only if actual local provider callback AND SHA-verified weight bytes exist
 * can 'providerCallbackExecuted' be true. THIS DOES NOT claim that supplied
 * bytes form valid trained weights or that geometry is photorealistic.
 * No third-party cloud, no fake output, no AIG image_gen backend access.
 */
import {ingestAIGReal3DNativeGeneratedGLB,sha256AIGReal3DBytes}
 from './aig-real3d-v99-native-model-ingest.mjs';
import {createAIGReal3DUnifiedAssetPipeline}
 from './aig-real3d-v98-ai-3d-bridge.mjs';
import {auditAIGReal3D4KSourceProjection}
 from './aig-real3d-v96-native-4k-pipeline.mjs';
export const AIG_REAL3D_V99_ADAPTER_SCHEMA='AIG_REAL3D_V99_LOCAL_MODEL_INFERENCE_ADAPTER_V1';
const fail=x=>{throw Error('REAL3D_V99_MODEL_ADAPTER_'+x);};
const sha=x=>typeof x==='string'&&/^[a-f0-9]{64}$/i.test(x);
function byte(x){
 return x instanceof Uint8Array?x:x instanceof ArrayBuffer?new Uint8Array(x):null;
}
export async function runAIGReal3DLocalGeometryModel({
 imageBytes,weightsBytes,expectedImageSHA256,expectedWeightsSHA256,
 provider,providerId,domain='PERSON',assetId='SourceImageCandidate',
 maximumModelBytes=200_000_000
}={}){
 const source=byte(imageBytes),weights=byte(weightsBytes);
 if(!source||!weights||source.length<32||weights.length<64||
  weights.length>maximumModelBytes||maximumModelBytes>300_000_000||
  !sha(expectedImageSHA256)||!sha(expectedWeightsSHA256)||
  typeof provider!=='function'||!/^[A-Za-z][A-Za-z0-9_-]{2,80}$/.test(providerId??''))
  fail('VERIFIED_MODEL_WEIGHTS_LOCAL_PROVIDER_AND_IMAGE_REQUIRED');
 const [actualImage,actualWeights]=await Promise.all([
  sha256AIGReal3DBytes(source),sha256AIGReal3DBytes(weights)]);
 if(actualImage!==expectedImageSHA256||actualWeights!==expectedWeightsSHA256)
  fail('MODEL_WEIGHTS_OR_INPUT_SOURCE_HASH_MISMATCH');
 // Local, explicit provider function. No network or model host claims.
 // A forged provider can still output invented geometry. This receipt only
 // verifies the actual bytes and code path; semantic AI quality is separate.
 const reply=await provider({
  sourceImageBytes:source,modelWeightsBytes:weights,
  sourceImageSha256:actualImage,modelWeightsSha256:actualWeights});
 const output=byte(reply?.glbBytes);
 if(!output||output.length<128)fail('ACTUAL_NATIVE_GLB_MODEL_OUTPUT_MISSING');
 const outputSHA=await sha256AIGReal3DBytes(output);
 const imported=await ingestAIGReal3DNativeGeneratedGLB({
  glbBytes:output,referenceImageBytes:source,
  declaredImageSha256:actualImage,declaredGLBSha256:outputSHA,
  domain,assetId,outputOrigin:'LOCAL_MODEL_OUTPUT',sourceUnits:'METERS'
 });
 return {schema:AIG_REAL3D_V99_ADAPTER_SCHEMA,providerId,imported,
  sourceImageSHA256:actualImage,actualModelWeightsSHA256:actualWeights,
  generatedModelSHA256:outputSHA,
  sourceModelBytesActuallyHashed:true,
  providerCallbackExecuted:true,
  actualNeuralInferenceProvenByIndependentRuntime:false,
  trainedNeuralModelValidityIndependentlyVerified:false,
  originalImageFaceLikenessMeasured:false,
  trustworthyRealWorldGeometryCertified:false,
  noCloudProviderInvokedByAdapter:true,
  officialCharacterApproved:false,releasePASS:false};
}
export function connectAIGReal3DImportedGeometryToUnified4K({
 imported,camera,assetId=imported?.assetId,views=[]
}={}){
 if(imported?.schema!=='AIG_REAL3D_V99_REAL_NATIVE_GENERATED_GLB_SOURCE_V1'||
  !imported.scene||!Array.isArray(views))
  fail('REAL_SOURCE_MODEL_REQUIRED');
 const shared=createAIGReal3DUnifiedAssetPipeline({
  domain:imported.domain,assetId,scene:imported.scene,
  originalImageSha256:imported.originalImageSha256,
  sourceGeometrySha256:imported.actualSourceModelSha256,
  imageViews:views
 });
 let detail=null;
 if(imported.sourceUnits==='METERS'&&camera)
  detail=auditAIGReal3D4KSourceProjection({
   scene:imported.scene,sourceSha256:imported.originalImageSha256,
   camera,width:3840,height:2160,maxSourceEdgePx:20});
 return {schema:'AIG_REAL3D_V99_TRUE_GLTF_TO_4K_BRIDGE_V1',
  imported,shared,detail,
  trueSourceIndexedXYZPreserved:true,
  sourceModelNotConvertedToV95Proxy:true,
  sourceModelIsNotIdentityCertified:true,
  fourKSourceEdgeQualityCandidatePASS:detail?.sourceDetailCandidatePASS??null,
  sourceIdentityApproved:false,releasePASS:false};
}
