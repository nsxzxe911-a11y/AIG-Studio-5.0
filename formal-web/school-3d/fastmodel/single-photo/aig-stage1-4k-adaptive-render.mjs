/**
 * Real3D Stage1: 4K pixels must be physically rasterized at 3840x2160
 * (or portrait 2160x3840); no CSS upscaling and no separate renderer.
 * Preview is adaptive to real viewport, GPU limit and memory budget.
 */
export const AIG_STAGE1_4K_SCHEMA='AIG_STAGE1_SINGLE_WEBGL_ADAPTIVE_TRUE_4K';
export const AIG_STAGE1_4K_PIXELS=3840*2160;
export const AIG_STAGE1_4K_MODES=Object.freeze({
 landscape:Object.freeze([3840,2160]),
 portrait:Object.freeze([2160,3840])
});
const bad=s=>{throw Error('AIG_STAGE1_4K_'+s)};
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const pos=x=>finite(x)&&x>0;
export function planAIGStage1AdaptivePreview({
 cssWidth,cssHeight,devicePixelRatio=1,
 maxTextureSize=4096,maxRenderbufferSize=maxTextureSize,
 deviceMemoryGB=8,mobile=false,
 mode='adaptive'
}={}){
 if(!pos(cssWidth)||!pos(cssHeight)||!pos(devicePixelRatio)||
  !pos(maxTextureSize)||!pos(maxRenderbufferSize)||
  !['adaptive','quality','economy'].includes(mode))
  bad('VALID_CSS_GPU_AND_PREVIEW_MODE_REQUIRED');
 const lowerMemory=finite(deviceMemoryGB)&&deviceMemoryGB>0&&deviceMemoryGB<=4;
 const pixelBudget=mode==='economy'?2073600:
  lowerMemory||mobile?4147200:AIG_STAGE1_4K_PIXELS;
 const requestedDPR=mode==='economy'?1:Math.min(devicePixelRatio,
  mode==='quality'?2.5:mobile?2:2);
 const maxSide=Math.min(maxTextureSize,maxRenderbufferSize);
 const scale=Math.min(requestedDPR,maxSide/cssWidth,maxSide/cssHeight,
  Math.sqrt(pixelBudget/(cssWidth*cssHeight)));
 if(!pos(scale))bad('NO_VALID_PREVIEW_PIXEL_SCALE');
 const width=Math.max(1,Math.floor(cssWidth*scale));
 const height=Math.max(1,Math.floor(cssHeight*scale));
 return Object.freeze({
  schema:AIG_STAGE1_4K_SCHEMA,mode,
  requestedPixelRatio:requestedDPR,plannedPixelRatio:scale,
  allocatedGPUWidth:width,allocatedGPUHeight:height,
  renderedPixels:width*height,maxPixelsBudget:pixelBudget,
  cssAspect:cssWidth/cssHeight,gpuAspect:width/height,
  actualGpuCSSAspectError:Math.abs(width/height-cssWidth/cssHeight),
  gpuLimitsRespected:width<=maxSide&&height<=maxSide&&
   width*height<=pixelBudget,
  genuineFull4KPreview:width*height>=AIG_STAGE1_4K_PIXELS,
  actualGPUContextCountAdded:0,needsActualBrowserGPUVerification:true,
  automaticQualityDoesNotIncreaseGeometryFidelity:true
 });
}
export function planAIGStage1True4KOutput({
 orientation='landscape',maxTextureSize,maxRenderbufferSize,
 availableMemoryGB=8,rendererAvailable=true
}={}){
 if(!Object.hasOwn(AIG_STAGE1_4K_MODES,orientation)||
  !pos(maxTextureSize)||!pos(maxRenderbufferSize))
  bad('KNOWN_ORIENTATION_AND_GPU_LIMITS_REQUIRED');
 const [width,height]=AIG_STAGE1_4K_MODES[orientation];
 const supported=rendererAvailable===true&&
  width<=maxTextureSize&&height<=maxTextureSize&&
  width<=maxRenderbufferSize&&height<=maxRenderbufferSize&&
  !(finite(availableMemoryGB)&&availableMemoryGB>0&&availableMemoryGB<2);
 return Object.freeze({
  schema:AIG_STAGE1_4K_SCHEMA,orientation,width,height,
  exactly4KPixels:AIG_STAGE1_4K_PIXELS,
  actualNativePixels:width*height,
  gpuTextureLimit:maxTextureSize,gpuRenderbufferLimit:maxRenderbufferSize,
  supportedByReportedLimits:supported,
  noUpsamplingOrSimulated4K:true,renderWithExistingWebGLRenderer:true,
  oneRenderTargetAtATime:true,noExtraGPUContexts:true,
  exactGPUFrameAndPNGReadbackRequired:true,
  failureReason:supported?null:'GPU_OR_MEMORY_CANNOT_PROVE_TRUE_4K',
  sourceMillimeterDimensionsMustNotChange:true
 });
}
export function validateAIGStage1RasterResult({
 expectedWidth,expectedHeight,actualWidth,actualHeight,
 actualPNGWidth,actualPNGHeight
}={}){
 if(![expectedWidth,expectedHeight,actualWidth,actualHeight,
  actualPNGWidth,actualPNGHeight].every(x=>Number.isInteger(x)&&x>0))
  bad('PIXEL_READBACK_DIMENSIONS_REQUIRED');
 const ok=expectedWidth===actualWidth&&expectedHeight===actualHeight&&
  actualWidth===actualPNGWidth&&actualHeight===actualPNGHeight;
 return Object.freeze({schema:AIG_STAGE1_4K_SCHEMA,
  exactPixelContractPASS:ok,reportedPixels:actualWidth*actualHeight,
  verifiedPNGDimensions:[actualPNGWidth,actualPNGHeight],
  refusalToResizeASmallerImageInto4K:true,
  releaseAppearanceGatePASS:false});
}
