/**
 * Real3D Stage1: strict native-resolution ladder for ONE WebGL renderer.
 *
 * 3K/2K marketing labels are ambiguous: our formal 16:9 presets are
 * 3K=3200x1800 and 2K=2560x1440 (QHD). 1080p=1920x1080.
 * The full render target, PNG IHDR and SHA must match the declared tier.
 * AUTO may select a lower tier; manual tiers MUST NEVER silently downgrade.
 */
export const AIG_STAGE1_RESOLUTION_SCHEMA='AIG_STAGE1_SINGLE_RENDERER_4K_TO_1080P_LADDER_V1';
export const AIG_STAGE1_RESOLUTION_LEVELS=Object.freeze(['4k','3k','2k','1080p']);
export const AIG_STAGE1_RESOLUTION_PRESETS=Object.freeze({
 '4k':Object.freeze([3840,2160]),
 '3k':Object.freeze([3200,1800]),
 '2k':Object.freeze([2560,1440]),
 '1080p':Object.freeze([1920,1080])
});
const invalid=s=>{throw Error('AIG_STAGE1_RESOLUTION_'+s)};
const good=n=>typeof n==='number'&&Number.isFinite(n)&&n>0;
export function planAIGStage1ResolutionLadder({
 requested='auto',orientation='landscape',
 maxTextureSize,maxRenderbufferSize,deviceMemoryGB=8,
 rendererAvailable=true
}={}){
 if(!['auto',...AIG_STAGE1_RESOLUTION_LEVELS].includes(requested)||
  !['landscape','portrait'].includes(orientation)||
  !good(maxTextureSize)||!good(maxRenderbufferSize)||
  !Number.isInteger(maxTextureSize)||!Number.isInteger(maxRenderbufferSize))
  invalid('OUTPUT_RESOLUTION_OR_DEVICE_CAPABILITIES_REQUIRED');
 const limits=Math.min(maxTextureSize,maxRenderbufferSize);
 const memory=good(deviceMemoryGB)?deviceMemoryGB:8;
 const levels=requested==='auto'?AIG_STAGE1_RESOLUTION_LEVELS:
  [requested];
 const candidates=levels.map(level=>{
  const preset=AIG_STAGE1_RESOLUTION_PRESETS[level];
  const [width,height]=orientation==='portrait'?
   [preset[1],preset[0]]:preset;
  const pixels=width*height;
  // Conservative memory guard for 4K/3K on low-memory devices.
  const minMemoryGB=level==='4k'?2:level==='3k'?1.5:1;
  const allowed=rendererAvailable===true&&width<=limits&&
   height<=limits&&memory>=minMemoryGB;
  return Object.freeze({
   level,width,height,pixels,
   supportedByReportedLimits:allowed,
   failureReason:allowed?null:'INSUFFICIENT_GPU_SIZE_OR_MEMORY',
   outputAspect:width/height,
   minimumReportedMemoryGB:minMemoryGB
  });
 });
 const chosen=candidates.find(x=>x.supportedByReportedLimits)??null;
 return Object.freeze({
  schema:AIG_STAGE1_RESOLUTION_SCHEMA,requested,orientation,
  levels: Object.freeze(candidates),
  actualSelectedLevel:chosen?.level??null,
  selectedWidth:chosen?.width??null,
  selectedHeight:chosen?.height??null,
  trueNativeRasterOnly:true,
  manualSelectionNeverDowngrades:requested!=='auto',
  automaticDowngradeExplicit:requested==='auto'&&
   chosen?.level!=='4k'&&chosen!==null,
  isSupported:chosen!==null,
  noNewWebGLRenderer:true,
  noUpscaleFromSmallerFrame:true,
  sourceMMCoordinatesUntouched:true
 });
}
export function verifyAIGStage1ResolutionResult({
 selected,renderTargetWidth,renderTargetHeight,
 pngWidth,pngHeight
}={}){
 if(!selected||![renderTargetWidth,renderTargetHeight,
  pngWidth,pngHeight].every(x=>Number.isInteger(x)&&x>0))
  invalid('TARGET_AND_PNG_DIMENSIONS_REQUIRED');
 const preset=AIG_STAGE1_RESOLUTION_PRESETS[selected.level];
 if(!preset||!['landscape','portrait'].includes(selected.orientation))
  invalid('KNOWN_NATIVE_RESOLUTION_REQUIRED');
 const [expectedWidth,expectedHeight]=
  selected.orientation==='portrait'?[preset[1],preset[0]]:preset;
 const ok=renderTargetWidth===expectedWidth&&
  renderTargetHeight===expectedHeight&&
  pngWidth===expectedWidth&&pngHeight===expectedHeight;
 return Object.freeze({
  schema:AIG_STAGE1_RESOLUTION_SCHEMA,level:selected.level,
  expectedDimensions:Object.freeze([expectedWidth,expectedHeight]),
  rasterDimensions:Object.freeze([renderTargetWidth,renderTargetHeight]),
  actualPNGDimensions:Object.freeze([pngWidth,pngHeight]),
  actualNativePixels:renderTargetWidth*renderTargetHeight,
  authenticResolutionPASS:ok,neverPassResampledImages:true,
  appearanceVisualApprovalPASS:false
 });
}
