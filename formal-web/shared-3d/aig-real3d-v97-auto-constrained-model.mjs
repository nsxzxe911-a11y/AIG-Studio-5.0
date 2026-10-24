/**
 * V97 single-image contour-constrained 3D candidate. Actual pixel-derived
 * silhouette is applied to Indexed XYZ before six-joint skinning.
 * The V95 body prior remains estimated; not identity/photogrammetry/ML 1:1.
 */
import {analyzeAIGReal3DPortraitPixels}
 from './aig-real3d-v95-photo-vision.mjs';
import {buildAIGReal3DProvisionalBody}
 from './aig-real3d-v95-provisional-rig.mjs';
import {extractAIGReal3DObservedFaceSilhouette}
 from './aig-real3d-v97-portrait-silhouette.mjs';
export const AIG_REAL3D_V97_SCHEMA='AIG_REAL3D_V97_IMAGE_CONSTRAINED_3D_ACTOR_V1';
const fail=x=>{throw Error('REAL3D_V97_'+x);};
export function runAIGReal3DV97PhotoConstrainedModel({
 rgba,width,height,imageSha256,approvedIdentitySha256,
 approvedIdentitySourcePresent=false,faceLandmarks=null,
 wrapMode='FULL_WRAP'
}={}){
 if(!/^[a-f0-9]{64}$/i.test(imageSha256??'')||
  !/^[a-f0-9]{64}$/i.test(approvedIdentitySha256??''))
  fail('ORIGINAL_FACE_SHA_REQUIRED');
 const vision=analyzeAIGReal3DPortraitPixels({
  rgba,width,height,imageSha256,faceLandmarks
 });
 if(vision.result!=='INFERRED_MODEL_CANDIDATE_ONLY')
  return {schema:AIG_REAL3D_V97_SCHEMA,state:'BLOCK_FACE_NOT_FOUND',
   imageSha256,vision,candidate:null,sourceHeroineIdentityVerified:false,
   actualFaceContourFitImprovementMeasured:false,releasePASS:false};
 const silhouette=extractAIGReal3DObservedFaceSilhouette({
  rgba,width,height,imageSha256,faceBox:vision.faceBox
 });
 const observed=silhouette.result==='OBSERVED_MASK_WITH_INFERRED_3D_CONTOUR';
 const candidate=buildAIGReal3DProvisionalBody({
  vision,approvedIdentitySha256,sourceImageSha256:imageSha256,
  approvedIdentitySourcePresent,wrapMode,
  silhouetteEvidence:observed?silhouette:null
 });
 return {schema:AIG_REAL3D_V97_SCHEMA,imageSha256,
  state:observed?'IMAGE_CONSTRAINED_INFERRED_3D_CANDIDATE':
   'INFERRED_3D_WITHOUT_RELIABLE_CONTOUR_FIT',
  vision,silhouette,candidate,actualColorMaskObserved:observed,
  actualHeadVerticesMoved:candidate.observedColorContourFit?.actuallyMovedHeadVertices??0,
  contourErrorBefore:candidate.observedColorContourFit?.before??null,
  contourErrorAfter:candidate.observedColorContourFit?.after??null,
  actualFaceContourFitImprovementMeasured:observed&&
   candidate.observedColorContourFit?.after<candidate.observedColorContourFit?.before,
  originalImageSHAStable:true,
  sourceHeroineIdentityVerified:false,
  verifiedFullBodyAnatomy:false,
  AITrainedFaceRecoveryModelLoaded:false,
  final3DFacialLikenessCertified:false,
  inferredBackAndBodyStillUnobserved:true,
  real3DSkinnedTriangles:candidate.realIndexed3DTriangles,
  real3DAnimatedJoints:candidate.realSkinnedJoints,
  releasePASS:false};
}
