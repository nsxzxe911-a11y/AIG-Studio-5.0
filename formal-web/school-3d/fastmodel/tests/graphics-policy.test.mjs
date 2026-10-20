import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GRAPHICS_POLICY,assertRasterOnly} from '../web/graphics-policy.mjs';
const read = p=>readFileSync(new URL(p,import.meta.url),'utf8');
test('ray tracing / DXR / Vulkan RT / ray queries are OFF by default',()=>{
  assert.equal(assertRasterOnly(),true);
  for(const k of ['rayTracingEnabled','dxrEnabled','vulkanRayTracingEnabled','rayQueryEnabled','pathTracingEnabled','requiredRTXGPU','hardwareRayTracingRequired']) assert.equal(GRAPHICS_POLICY[k],false,k);
  assert.equal(GRAPHICS_POLICY.renderer,'WEBGL2_RASTER');
});
test('future ray tracing cannot silently turn on',()=>{
  for(const k of ['rayTracingEnabled','dxrEnabled','vulkanRayTracingEnabled','rayQueryEnabled','pathTracingEnabled','requiredRTXGPU','hardwareRayTracingRequired']){
    assert.throws(()=>assertRasterOnly({...GRAPHICS_POLICY,[k]:true}),/RAY_TRACING_DISABLED/);
  }
});
test('fails closed on missing or unknown runtime mode',()=>{
  assert.throws(()=>assertRasterOnly({...GRAPHICS_POLICY,rayQueryEnabled:undefined}),/RAY_TRACING_DISABLED/);
  assert.throws(()=>assertRasterOnly({...GRAPHICS_POLICY,renderer:'WEBGPU_RAYTRACED'}),/ONLY_RASTER/);
});
test('actual WebGL2 renderer checks policy and has no RT extension dependency',()=>{
  const r=read('../web/renderer.mjs');
  assert.match(r,/assertRasterOnly\(GRAPHICS_POLICY\)/);
  assert.match(r,/canvas\.getContext\('webgl2'/);
  assert.doesNotMatch(r,/getExtension\(['"](?:WEBGL_ray_tracing|WEBGL_ray_query|VK_KHR_ray_tracing_pipeline)/);
});
test('quality panel shows real fixed no-RT state and original resolutions unchanged',()=>{
  const h=read('../web/index.html'),m=read('../web/main.mjs');
  assert.match(h,/id="raytrace-status"/);
  assert.match(m,/光線追蹤：關閉/);
  for(const k of ['1920x1080','2560x1440','3840x2160'])assert.match(h,new RegExp(k));
});
test('offline packer embeds the guard before renderer or application',()=>{
  const p=read('../tools/build_standalone.py');
  assert.match(p,/graphics-policy\.mjs/);
  assert.match(p,/resolution\+'\\n'\+graphics\+'\\n'\+edges\+'\\n'\+render/);
});