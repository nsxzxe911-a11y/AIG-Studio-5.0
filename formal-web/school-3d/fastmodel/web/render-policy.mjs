// AIG Cinema raster-first contract — no ray tracing required or activated.
// Native DX12/Vulkan are NOT implemented here; do not report native GPU status.
export const RENDER_POLICY = Object.freeze({
  renderer: 'WEBGL2_RASTER',
  rayTracing: false,
  pathTracing: false,
  dxr: false,
  rtHardwareRequired: false,
  fallbackRequired: true,
  lights: 'BASIC_UNLIT_TEXTURE_PREVIEW',
  visualAuthorityApproved: false,
  mobileHardwareVerified: false,
  windowsHardwareVerified: false,
});
export function enforceRasterPolicy(options={}) {
  if(options.rayTracing===true || options.pathTracing===true || options.dxr===true)
    throw new Error('AIG_RAY_TRACING_DISABLED: 目前預覽只允許無光追光柵化。');
  return RENDER_POLICY;
}