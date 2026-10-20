import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GRAPHICS_POLICY,assertRasterOnly} from '../web/graphics-policy.mjs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
test('single canonical policy forbids all RT modes with no RTX hardware requirement',()=>{
 assert.equal(assertRasterOnly(),true);
 assert.equal(GRAPHICS_POLICY.renderer,'WEBGL2_RASTER');
 for(const key of ['rayTracingEnabled','dxrEnabled','vulkanRayTracingEnabled','rayQueryEnabled','pathTracingEnabled','requiredRTXGPU','hardwareRayTracingRequired']) assert.equal(GRAPHICS_POLICY[key],false);
 assert.equal(Object.isFrozen(GRAPHICS_POLICY),true);
});
test('incorrect future raster modes fail closed',()=>{
 assert.throws(()=>assertRasterOnly({...GRAPHICS_POLICY,rayQueryEnabled:true}),/RAY_TRACING_DISABLED/);
 assert.throws(()=>assertRasterOnly({...GRAPHICS_POLICY,renderer:'DXR'}),/ONLY_RASTER/);
});
test('actual view and UI report canonical raster-only policy; no fake switch',()=>{
 const r=read('../web/renderer.mjs'),main=read('../web/main.mjs'),html=read('../web/index.html');
 assert.match(r,/assertRasterOnly\(GRAPHICS_POLICY\)/);
 assert.match(r,/getContext\('webgl2'/);
 assert.match(r,/gl\.drawElements/);
 assert.match(html,/id="raytrace-status"/);
 assert.match(main,/光線追蹤：關閉/);
 assert.match(main,/renderPolicy:GRAPHICS_POLICY/);
 assert.doesNotMatch(html,/id="enable-raytracing"/);
});
test('offline packer shares exactly one policy in front of renderer',()=>{
 const p=read('../tools/build_standalone.py');
 assert.match(p,/graphics-policy\.mjs/);
 assert.match(p,/graphics-policy\.mjs/);
 const payload=p.slice(p.indexOf("payload='<script>"));
 for(const token of ['+graphics+', '+surface+', '+render+', '+main+'])assert.ok(payload.includes(token),token);
 assert.ok(payload.indexOf('+graphics+')<payload.indexOf('+surface+'));
 assert.ok(payload.indexOf('+surface+')<payload.indexOf('+render+'));
 assert.ok(payload.indexOf('+render+')<payload.indexOf('+main+'));
 assert.doesNotMatch(p,/render-policy\.mjs/);
});