import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {RENDER_POLICY,enforceRasterPolicy} from '../web/render-policy.mjs';
const read=(p)=>readFileSync(new URL(p,import.meta.url),'utf8');

test('raster-only is locked OFF without RTX requirement',()=>{
 assert.equal(RENDER_POLICY.renderer,'WEBGL2_RASTER');
 for(const key of ['rayTracing','pathTracing','dxr','rtHardwareRequired'])assert.equal(RENDER_POLICY[key],false,key);
 assert.equal(enforceRasterPolicy(),RENDER_POLICY);
 assert.equal(Object.isFrozen(RENDER_POLICY),true);
});
test('attempt to enable any ray or path tracing is refused without changing policy',()=>{
 for(const option of ['rayTracing','pathTracing','dxr'])assert.throws(()=>enforceRasterPolicy({[option]:true}),/RAY_TRACING_DISABLED/);
 assert.equal(RENDER_POLICY.rayTracing,false);
});
test('real WebGL2 raster and no DXR are wired, not a decorative toggle',()=>{
 const renderer=read('../web/renderer.mjs'),main=read('../web/main.mjs'),html=read('../web/index.html');
 assert.match(renderer,/this\.renderPolicy=enforceRasterPolicy\(\)/);
 assert.match(renderer,/getContext\('webgl2'/);
 assert.match(renderer,/gl\.drawElements/);
 assert.match(html,/id="raster-only"/);
 assert.match(html,/光線追蹤：關閉（OFF）/);
 assert.match(main,/renderPolicy:RENDER_POLICY/);
});
test('offline bundler includes the exact render policy without ESM imports',()=>{
 const pack=read('../tools/build_standalone.py');
 assert.match(pack,/render_policy=/);
 assert.match(pack,/\+render_policy\+/);
 assert.match(pack,/import \{enforceRasterPolicy\}/);
});