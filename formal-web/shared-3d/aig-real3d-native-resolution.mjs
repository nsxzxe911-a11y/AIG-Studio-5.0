/**
 * AIG Real3D native (NEVER UPSCALED) GPU image presets, separate from
 * canonical 1080x1920 comparison images and original mesh triangle count.
 */
export const AIG_REAL3D_NATIVE_RESOLUTION_SCHEMA='AIG_REAL3D_RESOLUTION_PROFILE_NATIVE_OUTPUT_V1';
export const AIG_REAL3D_PRESETS=Object.freeze({
 '1080P':{short:1080,long:1920,label:'1080p'},
 '2K':{short:1440,long:2560,label:'2K'},
 'PHONE_1440_3088':{short:1440,long:3088,label:'Android 1440×3088'},
 '4K':{short:2160,long:3840,label:'4K UHD'}
});
const ok=n=>Number.isFinite(n)&&n>0;
const bytes=n=>Math.round(n/1048576*10)/10;
export function planAIGReal3DNativeResolution({
 preset='AUTO',orientation='portrait',
 gpuLimit=0,deviceMemoryGB=null,devicePixelRatio=1,
 autoCssWidth=360,autoCssHeight=800
}={}){
 if(!['portrait','landscape'].includes(orientation)||
 !Number.isFinite(gpuLimit)||gpuLimit<0||
 !(deviceMemoryGB===null||ok(deviceMemoryGB))||
 !ok(devicePixelRatio)||devicePixelRatio>8||
 !ok(autoCssWidth)||!ok(autoCssHeight))
  throw Error('REAL3D_RESOLUTION_INPUT_INVALID');
 if(preset!=='AUTO'&&!AIG_REAL3D_PRESETS[preset])
  throw Error('REAL3D_RESOLUTION_PRESET_INVALID');
 // Device RAM is a weak signal, not a guarantee of GPU memory availability.
 // AUTO never selects >2K; expensive 4K needs explicit user intent.
 const choose=preset!=='AUTO'?preset:(
  deviceMemoryGB!==null&&deviceMemoryGB>=4&&
  Math.min(autoCssWidth,autoCssHeight)*devicePixelRatio>=1050&&
  gpuLimit>=2560?'2K':'1080P');
 const entry=AIG_REAL3D_PRESETS[choose];
 const width=orientation==='portrait'?entry.short:entry.long;
 const height=orientation==='portrait'?entry.long:entry.short;
 const pixels=width*height;
 // One RGBA readback, one vertically flipped RGBA, native 2D PNG canvas,
 // GPU RGBA silhouette mask plus depth and default framebuffer.
 // Estimation only; real driver overhead may be higher.
 const estimatedPeakBytes=pixels*25;
 const limitReasons=[];
 if(gpuLimit<Math.max(width,height))
  limitReasons.push('GPU_TEXTURE_OR_RENDERBUFFER_LIMIT');
 if(pixels>9_000_000)
  limitReasons.push('NATIVE_CAPTURE_TOTAL_PIXEL_BUDGET');
 if(pixels>3_200_000&&deviceMemoryGB!==null&&deviceMemoryGB<4)
  limitReasons.push('LOW_DEVICE_MEMORY');
 if(choose==='4K'&&deviceMemoryGB!==null&&deviceMemoryGB<8)
  limitReasons.push('4K_REQUIRES_HIGH_MEMORY_DEVICE');
 return {
  schema:AIG_REAL3D_NATIVE_RESOLUTION_SCHEMA,
  requestedPreset:preset,selectedPreset:choose,orientation,
  width,height,pixels,
  gpuLimit,deviceMemoryGB,
  approximatePeakCaptureMemoryMiB:bytes(estimatedPeakBytes),
  permitted:limitReasons.length===0,limitReasons,
  nativeGPUReadbackRequired:true,noUpscaling:true,
  standardSevenPassQaDimensionsUnchanged:{width:1080,height:1920},
  geometryVertexAndTriangleCountsUnchanged:true,
  resolutionCannotReconstructMissing3DAnatomy:true,
  native4KNotGuaranteedWithoutGpuProbe:true
 };
}
