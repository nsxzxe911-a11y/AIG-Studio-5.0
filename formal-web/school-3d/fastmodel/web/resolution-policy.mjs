/** AIG FastModel Cinema 1.2: explicit user-requested 16:9 render target.
 * QHD is marketed as "2K" here; DCI 2K (2048x1080) is a different standard.
 * This policy does not claim actual native device support or 60 FPS.
 */
export const RESOLUTION_PRESETS=Object.freeze({
  '1280x720':Object.freeze({width:1280,height:720,short:'720p',label:'省電'}),
  '1920x1080':Object.freeze({width:1920,height:1080,short:'1080p',label:'Full HD'}),
  '2560x1440':Object.freeze({width:2560,height:1440,short:'2K / QHD',label:'2K / QHD'}),
  '3840x2160':Object.freeze({width:3840,height:2160,short:'4K / UHD',label:'4K / UHD'})
});
export const FRAMEBUFFER_BYTES_PER_PIXEL=12; // conservative double color 8 B + depth/stencil 4 B; VRAM not measurable
export function framebufferEstimateBytes(width,height){
 if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<=0||height<=0)throw new RangeError('invalid resolution');
 return width*height*FRAMEBUFFER_BYTES_PER_PIXEL;
}
export function checkRenderTarget({width,height,maxRenderbufferSize,maxViewportWidth,maxViewportHeight,gpuBudgetBytes=Infinity,existingGpuBytes=0}={}){
 if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<640||height<360)
  return {allowed:false,reason:'RESOLUTION_INVALID'};
 if(!Number.isInteger(maxRenderbufferSize)||maxRenderbufferSize<1||!Number.isInteger(maxViewportWidth)||maxViewportWidth<1||!Number.isInteger(maxViewportHeight)||maxViewportHeight<1)
  return {allowed:false,reason:'GPU_LIMITS_UNAVAILABLE'};
 if(width>maxRenderbufferSize||height>maxRenderbufferSize||width>maxViewportWidth||height>maxViewportHeight)
  return {allowed:false,reason:'GPU_DIMENSION_LIMIT'};
 const bytes=framebufferEstimateBytes(width,height);
 if(!Number.isFinite(existingGpuBytes)||existingGpuBytes<0||!(gpuBudgetBytes>0))return {allowed:false,reason:'MEMORY_BUDGET_UNKNOWN'};
 // Do not use more than 70% of the app's estimated GPU budget for model + target buffers.
 if(Number.isFinite(gpuBudgetBytes)&&bytes+existingGpuBytes>gpuBudgetBytes*.70)
  return {allowed:false,reason:'FRAMEBUFFER_MEMORY_BUDGET',framebufferEstimateBytes:bytes};
 return {allowed:true,reason:'OK',framebufferEstimateBytes:bytes};
}