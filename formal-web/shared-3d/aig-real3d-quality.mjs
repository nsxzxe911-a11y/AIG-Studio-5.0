/**
 * Real3D 1.1: source geometry unchanged, hardware MSAA when WebGL actually
 * supports it, plus adaptive SSAA render buffer (CSS downsampling).
 *
 * One physical display pixel still emits one resulting RGB(A) color.
 * Multi-samples are blended coverage/lighting information, not more display
 * pixels. No fabricated mirror reflection, 10-bit HDR, 4x/8x MSAA claim.
 */
export const AIG3D_QUALITY_PRESETS=Object.freeze({
  performance:Object.freeze({label:'效能｜1×',scale:1,maxFramePixels:450000}),
  balanced:Object.freeze({label:'平衡｜1.25×',scale:1.25,maxFramePixels:1050000}),
  smooth:Object.freeze({label:'圓滑｜1.75×',scale:1.75,maxFramePixels:2000000}),
  ultra:Object.freeze({label:'高畫質｜2.25×',scale:2.25,maxFramePixels:3100000})
});
export function getAIG3DQuality(name='balanced'){
  if(typeof name!=='string'||!Object.hasOwn(AIG3D_QUALITY_PRESETS,name))
    throw Error('AIG3D_QUALITY_PRESET_UNSUPPORTED');
  return {id:name,...AIG3D_QUALITY_PRESETS[name]};
}
export function resolveAIG3DFrameBudget({
  cssWidth,cssHeight,preset='balanced',deviceLimit=4096,
  maxFramePixels=null
}={}){
  const q=getAIG3DQuality(preset);
  if(![cssWidth,cssHeight,deviceLimit].every(Number.isFinite)||
   cssWidth<=0||cssHeight<=0||cssWidth>16384||cssHeight>16384||
   !Number.isInteger(deviceLimit)||deviceLimit<256||deviceLimit>32768||
   maxFramePixels!==null&&(!Number.isInteger(maxFramePixels)||
    maxFramePixels<100000||maxFramePixels>3100000))
    throw Error('AIG3D_QUALITY_FRAME_BUDGET_INVALID');
  const budget=Math.min(q.maxFramePixels,maxFramePixels??q.maxFramePixels),
    targetWidth=Math.max(1,Math.round(cssWidth*q.scale)),
    targetHeight=Math.max(1,Math.round(cssHeight*q.scale)),
    cap=Math.min(1,deviceLimit/targetWidth,deviceLimit/targetHeight,
       Math.sqrt(budget/(targetWidth*targetHeight))),
    width=Math.max(1,Math.floor(targetWidth*cap)),
    height=Math.max(1,Math.floor(targetHeight*cap)),
    actualScale=Math.min(width/cssWidth,height/cssHeight);
  return {quality:preset,targetScale:q.scale,effectiveScale:actualScale,
    width,height,allocatedPixels:width*height,maxFramePixels:budget,
    cappedBySafety:cap<.99999,colorOutput:'RGBA_BROWSER_FRAMEBUFFER',
    enabledTechniques:['MSAA_IF_CONTEXT_REPORTS_SUPPORTED','SSAA_WITH_CSS_DOWNSAMPLING'],
    mirrorReflectionCalculated:false,rayTracingEnabled:false};
}
