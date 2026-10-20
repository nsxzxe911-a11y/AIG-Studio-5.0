import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {PatchBuffer,decodeGLB,readAccessor,buildBatches} from '../web/fastmodel-data.mjs';
const bin=fs.readFileSync(process.env.AIG_FASTMODEL_GLB || new URL('../assets/phase17-visual-NOT-APPROVED.glb',import.meta.url));const glb=decodeGLB(bin.buffer.slice(bin.byteOffset,bin.byteOffset+bin.byteLength));
test('original phase17 GLB binary parsed',()=>{assert.equal(glb.g.meshes.length,111);assert.equal(glb.g.skins.length,2);assert.equal(glb.g.animations.length,4);});
test('all glTF accessors in bounds',()=>{for(const m of glb.g.meshes)for(const p of m.primitives){assert.ok(readAccessor(glb,p.attributes.POSITION).length>0);assert.ok(readAccessor(glb,p.indices).length>0);}});
test('original 551 draw calls shrink to fewer than 20 geometry batches',()=>{const out=buildBatches(glb,'full');assert.equal(out.primitives,551);assert.ok(out.drawCalls<=20);assert.ok(out.vertices>30000);assert.ok(out.indices>150000);});
test('mobile preview keeps all unknown/untagged skin1 anatomy and source visible',()=>{
 const o=buildBatches(glb,'preview'),full=buildBatches(glb,'full');
 assert.ok(o.drawCalls<=full.drawCalls);assert.ok(o.vertices>5000);
 // No skin-index-only geometry removal is permitted: no explicit extras => no skip.
 const allowed=glb.g.materials?.some(m=>m.extras?.aigOptionalRenderDetail===true);
 if(!allowed){assert.equal(o.skipped,0);assert.equal(o.vertices,full.vertices);}
});
test('preview refuses to skip explicit neck geometry even with optional tagged material',()=>{
 const original=glb.g.nodes.find(n=>n.mesh!==undefined&&n.skin===1);
 assert.ok(original,'Source synthetic GLB should include a skin1 mesh');
 const copy={...glb,g:JSON.parse(JSON.stringify(glb.g))};
 copy.g.nodes=[{...JSON.parse(JSON.stringify(original)),extras:{aigAnatomyPart:'neck'}}];
 const p=copy.g.meshes[original.mesh].primitives[0],mat=p.material??0;
 if(!copy.g.materials?.length)copy.g.materials=[{}];
 copy.g.materials[mat]={...copy.g.materials[mat],extras:{aigOptionalRenderDetail:true,aigOptionalGroup:'fine-hair'}};
 const out=buildBatches(copy,'preview');
 assert.equal(out.skipped,0);assert.ok(out.vertices>0);
});

test('atomic invalid patch cannot change a vertex',()=>{let p=new PatchBuffer(new Float32Array(300));p.consumeDirty();assert.throws(()=>p.patch(new Uint32Array([0,101]),new Float32Array(6)));assert.equal(p.revision,0);assert.equal(p.consumeDirty().length,0);});
test('coalescing patch positions keeps others untouched',()=>{let p=new PatchBuffer(new Float32Array(300));p.consumeDirty();p.patch(new Uint32Array([5,6,7]),new Float32Array([1,2,3,4,5,6,7,8,9]));assert.deepEqual(p.consumeDirty(),[[5,8]]);assert.equal(p.positions[0],0);assert.equal(p.positions[5*3],1);});
test('reject altered/truncated GLB and nonfinite patch',()=>{let b=bin.buffer.slice(bin.byteOffset,bin.byteOffset+bin.byteLength);assert.throws(()=>decodeGLB(b.slice(0,100)));const p=new PatchBuffer(new Float32Array(30));p.consumeDirty();assert.throws(()=>p.patch([1],new Float32Array([1,NaN,3])));});