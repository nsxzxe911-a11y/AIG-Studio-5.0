/**
 * FastModel Real3D V117 local evidence-driven active reconstruction controller.
 * The planner actually runs V110/V111 source-image classification and
 * returns an executable route to existing real GLB and V107 GPU modules.
 * NO NEURAL/LLM MODEL WEIGHTS ARE LOADED: do not label this as learned AI
 * inference. Unknown depth, unknown backside, or complex segmentation fail
 * closed; user-confirmed masks/marks are a separate provenance tier.
 */
import {extractAIGReal3DV110Foreground}
 from './aig-real3d-v110-source-mask.mjs';
import {segmentAIGReal3DV111FromUserSeeds}
 from './aig-real3d-v111-seeded-segmentation.mjs';

export const AIG_REAL3D_V117_SCHEMA='AIG_REAL3D_V117_SOURCE_EVIDENCE_ACTIVE_ORCHESTRATOR_V1';
const reject=s=>{throw Error('REAL3D_V117_'+s);};
const sha=s=>typeof s==='string'&&/^[0-9a-f]{64}$/i.test(s);
const bytes=x=>x instanceof Uint8Array||x instanceof Uint8ClampedArray;
const safe=(source,w,h,hash)=>{
 if(!bytes(source)||!Number.isInteger(w)||!Number.isInteger(h)||
  w<16||h<16||w>1024||h>1024||
  source.length!==w*h*4||!sha(hash))
  reject('ACTUAL_SOURCE_PIXELS_DIMENSIONS_AND_SHA_REQUIRED');
};
const errorMessage=e=>String(e?.message??e).slice(0,450);
/**
 * No future untrusted AI response can override the geometry/release gate.
 * A confirmed mask must be a separately hashed user-reviewed file and user
 * marks must be actual original pixel coordinates.
 */
export function planAIGReal3DV117PhotoReconstruction({
 rgba,width,height,sourcePhotoSha256,
 externalMaskRGBA=null,externalMaskSha256=null,
 externalMaskConfirmed=false,externalMaskMode='LUMINANCE',
 foregroundSeeds=[],backgroundSeeds=[],
 depthSourceSha256=null,depthMeasurementDeclared=false,
 sourceWidthMM=100,widthPhysicallyMeasured=false,
 desiredOutput='FRONT_SOURCE_GLB'
}={}){
 safe(rgba,width,height,sourcePhotoSha256);
 if(!['FRONT_SOURCE_GLB','REQUIRE_COMPLETE_3D'].includes(desiredOutput))
  reject('UNKNOWN_OUTPUT_COMMAND');
 if(!Number.isFinite(sourceWidthMM)||sourceWidthMM<1||sourceWidthMM>20000||
  typeof widthPhysicallyMeasured!=='boolean'||
  !Array.isArray(foregroundSeeds)||!Array.isArray(backgroundSeeds))
  reject('PHYSICAL_SIZE_AND_SOURCE_MARKS_MALFORMED');
 if(externalMaskRGBA!==null&&(foregroundSeeds.length||backgroundSeeds.length))
  return {schema:AIG_REAL3D_V117_SCHEMA,status:'BLOCK',
   code:'CONFLICTING_MASK_AND_USER_SEEDS',
   nextAction:'選擇一種已核對的遮罩來源，不可同時混合',
   actualNeuralModelExecuted:false,releasePASS:false};
 if(desiredOutput==='REQUIRE_COMPLETE_3D')
  return {schema:AIG_REAL3D_V117_SCHEMA,status:'BLOCK',
   code:'SINGLE_VIEW_CANNOT_PROVE_UNOBSERVED_BACKSIDE',
   nextAction:'請使用 V112～V116 多視角與獨立量測深度工作區',
   actualNeuralModelExecuted:false,releasePASS:false};
 if(depthSourceSha256!==null&&(!sha(depthSourceSha256)||
  depthSourceSha256===sourcePhotoSha256||
  depthMeasurementDeclared!==true))
  return {schema:AIG_REAL3D_V117_SCHEMA,status:'BLOCK',
   code:'INDEPENDENT_DEPTH_EVIDENCE_REQUIRED',
   nextAction:'請確認獨立深度來源 SHA 與量測證據',
   actualNeuralModelExecuted:false,releasePASS:false};
 if(depthSourceSha256===null&&depthMeasurementDeclared===true)
  return {schema:AIG_REAL3D_V117_SCHEMA,status:'BLOCK',
   code:'DEPTH_SOURCE_MISSING',
   nextAction:'未上傳深度來源，請取消實測確認或提供深度文件',
   actualNeuralModelExecuted:false,releasePASS:false};
 let mode,mask,evidence,sourceConfidence;
 try{
  if(foregroundSeeds.length||backgroundSeeds.length){
   const result=segmentAIGReal3DV111FromUserSeeds({
    rgba,width,height,imageSha256:sourcePhotoSha256,
    foregroundSeeds,backgroundSeeds
   });
   mode='V111_USER_SEEDED_COMPLEX_BACKGROUND';
   mask=result.originalWorkingRGBA;
   evidence={foregroundPixels:result.foregroundPixelCount,
    foregroundFraction:result.foregroundFraction,
    uncertainBoundaryFraction:result.uncertainBoundaryFraction,
    sourceColorPreserved:result.originalSourceRGBPreserved,
    foregroundSeeds:result.seedForegroundCount,
    backgroundSeeds:result.seedBackgroundCount,
    sourceMode:result.segmentationMode};
   sourceConfidence='USER_INTERACTIVE_UNVERIFIED';
  }else{
   const result=extractAIGReal3DV110Foreground({
    rgba,width,height,imageSha256:sourcePhotoSha256,
    externalMaskRGBA,externalMaskSha256,externalMaskConfirmed,
    externalMaskMode
   });
   mode=result.sourceMode;
   mask=result.maskedRGBA;
   evidence={foregroundPixels:result.foreground,
    foregroundFraction:result.foregroundFraction,
    uncertainBoundaryFraction:result.fractionAmbiguousSourceBoundary,
    sourceColorPreserved:result.originalImageColorPixelsPreserved,
    sourceMode:result.sourceMode,
    externalMaskSha256:externalMaskSha256??null};
   sourceConfidence=externalMaskRGBA!==null?
    'EXTERNAL_USER_REVIEWED_UNVERIFIED':
    mode==='ORIGINAL_ALPHA_ALREADY_SEGMENTED'?
     'ORIGINAL_SOURCE_ALPHA_UNVERIFIED':
     'DETERMINISTIC_SIMPLE_BACKGROUND';
  }
 }catch(e){
  const issue=errorMessage(e);
  return {schema:AIG_REAL3D_V117_SCHEMA,status:'NEEDS_SOURCE_REVIEW',
   code:'SOURCE_MASK_OR_SUBJECT_CONFIDENCE_BLOCK',
   diagnostic:issue,
   nextAction:issue.includes('COMPLEX')||issue.includes('COLOR')?
    '複雜背景：請在 V111 標記主體與背景，或上傳另一份人工確認遮罩':
    '請檢查主體完整、輪廓沒有碰框與前景/背景標記是否合理',
   actualNeuralModelExecuted:false,
   autoSubmittedToGPU:false,releasePASS:false};
 }
 // Reconfirm pixel colors cannot silently be repainted.
 if(!evidence.sourceColorPreserved)reject('ORIGINAL_PIXEL_COLOR_MUTATED');
 for(let i=0;i<width*height;i++)for(let c=0;c<3;c++)
  if(mask[i*4+c]!==rgba[i*4+c])
   reject('SOURCE_PIXEL_RGB_MUST_REMAIN_IDENTICAL');
 const alpha=Array.from({length:width*height},(_,i)=>mask[i*4+3]);
 const visible=alpha.filter(x=>x>16).length;
 if(visible<128||visible>width*height*.97)
  return {schema:AIG_REAL3D_V117_SCHEMA,status:'BLOCK',
   code:'VISIBLE_SUBJECT_ALPHA_INVALID',actualNeuralModelExecuted:false,
   releasePASS:false};
 const stagedGeometry=depthSourceSha256?
  'OBSERVED_VISIBLE_DEPTH_ONLY_NO_UNKNOWN_BACKSIDE':
  'FLAT_FRONT_ONLY_2_5D';
 return {
  schema:AIG_REAL3D_V117_SCHEMA,status:'READY_FOR_TRUE_GLB_GPU',
  route:'V109_SOURCE_PNG_GLTF_THEN_V107_5AX_GPU',
  selectedForegroundModule:mode,
  sourceEvidenceTier:sourceConfidence,
  sourcePhotoSha256,
  dimensions:[width,height],
  sourceWidthMM,widthPhysicallyMeasured,
  declaredIndependentDepthSha256:depthSourceSha256,
  geometryType:stagedGeometry,
  proposedGPUPoseSweep:[
   {a:0,b:0,progress:1},
   {a:90,b:0,progress:1},
   {a:0,b:90,progress:1},
   {a:90,b:90,progress:1},
   {a:45,b:180,progress:.5}
  ],
  realPixelClassificationPerformed:true,
  actualNeuralModelExecuted:false,
  actualLLMReasoningOrLearnedWeightsExecuted:false,
  neuralModelId:null,neuralWeightsSha256:null,
  userReviewOfSourceStillRequired:true,
  sourceCoverage:evidence,
  sourceRGBAColorPreserved:true,
  automaticallyRecognizedHumanAnatomy:false,
  fullyAutomaticComplexBackgroundRecognition:false,
  originalPhoto1to1LikenessNotCertified:true,
  unobservedBacksideRemainsUnknown:true,
  productionReleasePASS:false,
  // Typed image data is UI-private and must not be included in audit JSON.
  workingRGBA:mask
 };
}
const poseKey=p=>[p.a,p.b,p.progress].join(':');
/** Validate 5 different GPU frames after the caller has truly rendered each. */
export function verifyAIGReal3DV117RealGPUInspection({
 plan,modelSha256,sourceTriangles,actualFrames
}={}){
 if(!plan||plan.status!=='READY_FOR_TRUE_GLB_GPU'||
  !sha(modelSha256)||!Number.isInteger(sourceTriangles)||sourceTriangles<12||
  !Array.isArray(actualFrames))
  reject('REAL_GLTF_SOURCE_AND_GPU_RESULT_REQUIRED');
 const expected=plan.proposedGPUPoseSweep;
 if(actualFrames.length!==expected.length)
  reject('FIVE_ACTUAL_GPU_POSE_FRAMES_REQUIRED');
 let valid=0;
 for(let i=0;i<expected.length;i++){
  const a=actualFrames[i],p=expected[i];
  if(!a||a.status!=='WEBGL_XYZ_TRIANGLES_RENDERED'||
   a.triangles!==sourceTriangles||a.sourceSHA!==modelSha256||
   a.aTiltDeg!==p.a||a.bTurnDeg!==p.b||
   Math.abs(a.sourceHeightProgress-p.progress)>1e-6||
   a.gpuClipEnabled!==(p.progress<1))
   reject('GPU_POSE_'+i+'_WRONG_SOURCE_OR_FAKED_STATE');
  valid++;
 }
 return {
  schema:'AIG_REAL3D_V117_GPU_FIVE_POSE_SOURCE_AUTHORITY_V1',
  originalSourcePhotoSha256:plan.sourcePhotoSha256,
  outputGLBSha256:modelSha256,
  checkedRealGPUFrames:valid,
  checkedPoseIDs:expected.map(p=>poseKey(p)),
  actualGPUResult:'PASS_SOURCE_GLTF_FIVE_POSE_INSPECTION',
  frontSurfaceOnlyOrMeasuredVisibleDepth:plan.geometryType,
  humanFaceOrBody3DMatchCertified:false,
  fullyAutonomousNeuralInferencePerformed:false,
  allFiveActualFramesProvided:true,
  productionReleasePASS:false
 };
}
