/** AIG FastModel compatibility-first raster policy. NO RT feature can silently enable. */
export const GRAPHICS_POLICY = Object.freeze({
  id: 'AIG_FASTMODEL_RASTER_ONLY_V1',
  renderer: 'WEBGL2_RASTER',
  rayTracingEnabled: false,
  dxrEnabled: false,
  vulkanRayTracingEnabled: false,
  rayQueryEnabled: false,
  pathTracingEnabled: false,
  requiredRTXGPU: false,
  hardwareRayTracingRequired: false,
  defaultResolution: '1920x1080',
  targetFrameMs: 16.67,
  compatibleFallback: 'WEBGL2_RASTER_LOW_LOD',
  windowsNativeDX12Implemented: false,
  androidNativeVulkanImplemented: false,
});
/** Strictly refuses any accidental RT turn-on in future merged policy data. */
export function assertRasterOnly(p=GRAPHICS_POLICY){
  const flags=['rayTracingEnabled','dxrEnabled','vulkanRayTracingEnabled','rayQueryEnabled','pathTracingEnabled','requiredRTXGPU','hardwareRayTracingRequired'];
  if(flags.some(k=>p?.[k]!==false))throw Error('RAY_TRACING_DISABLED_BY_COMPATIBILITY_POLICY');
  if(p.renderer!=='WEBGL2_RASTER')throw Error('ONLY_RASTER_RENDERER_ALLOWED');
  return true;
}