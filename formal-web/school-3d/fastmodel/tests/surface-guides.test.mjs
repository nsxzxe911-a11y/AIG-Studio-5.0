import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {SURFACE_GUIDES,surfaceGuideId,isPatchVertex,guideNeedsWireGeometry} from '../web/surface-guides.mjs';
import {FastModelView} from '../web/renderer.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('three safe surface modes, clean by default, no extra line geometry',()=>{
 assert.deepEqual([...SURFACE_GUIDES],['clean','edit-tint','soft-contrast']);
 assert.equal(surfaceGuideId('clean'),0);assert.equal(surfaceGuideId('edit-tint'),1);assert.equal(surfaceGuideId('soft-contrast'),2);
 for(const m of SURFACE_GUIDES)assert.equal(guideNeedsWireGeometry(m),false);
 assert.throws(()=>surfaceGuideId('full-wire'));assert.throws(()=>guideNeedsWireGeometry('bogus'));
});
test('edit tint shows exactly genuine first 256 patched vertices of editable batch',()=>{
 for(let i=0;i<256;i++)assert.equal(isPatchVertex(i,true,'edit-tint'),true);
 for(const i of [-1,256,1024,1.2])assert.equal(isPatchVertex(i,true,'edit-tint'),false);
 for(const mode of ['clean','soft-contrast'])assert.equal(isPatchVertex(7,true,mode),false);
 assert.equal(isPatchVertex(3,false,'edit-tint'),false);
});
test('switching surface highlight never creates buffers or deletes mesh',()=>{
 let called=0;const g={createBuffer(){called++;},deleteBuffer(){called++;}};
 const fake={gl:g,entries:[{vb:42,ib:43}],surfaceGuide:'clean'};
 const r=FastModelView.prototype.setSurfaceGuide.call(fake,'edit-tint');
 assert.deepEqual(r,{mode:'edit-tint',extraDrawCalls:0,extraLineBuffers:0,preservesMesh:true});
 assert.equal(fake.entries[0].vb,42);assert.equal(called,0);
 assert.throws(()=>FastModelView.prototype.setSurfaceGuide.call(fake,'invalid'));assert.equal(fake.surfaceGuide,'edit-tint');
});
test('WebGL2 raster fragment adds color glow without extra gl.LINES pass',()=>{
 const s=read('web/renderer.mjs');
 assert.match(s,/gl_VertexID<256/);assert.match(s,/fEditWeight/);
 assert.match(s,/surfaceGuide==1/);assert.match(s,/surfaceGuide==2/);
 assert.match(s,/this\.surfaceGuide==='edit-tint'&&b\.editable/);
 assert.match(s,/gl\.uniform1i\(this\.u\.surfaceGuide/);
 assert.match(s,/if\(this\.wireMode!=='off'/);
});
test('black RGB interface defaults clean, advanced topology panel collapsed',()=>{
 const s=read('web/index.html');const m=read('web/main.mjs');
 assert.match(s,/id="surface-guide"/);assert.match(s,/value="clean" selected/);
 assert.match(s,/<details id="advanced-wire"/);
 assert.doesNotMatch(s,/<details id="advanced-wire"[^>]* open/);
 assert.match(s,/id="mesh-lines"/);assert.match(s,/value="off" selected/);
 assert.match(m,/setSurfaceGuide/);assert.match(m,/surfaceInspection:/);
 assert.match(s,/#020407/);
});
test('single HTML packer includes mode engine alongside existing GLB & skin',()=>{
 const p=read('tools/build_standalone.py');
 assert.match(p,/surface-guides\.mjs/);assert.match(p,/surface='?/);
 assert.match(p,/\+surface\+/);
 assert.match(p,/import \{surfaceGuideId\}/);
});