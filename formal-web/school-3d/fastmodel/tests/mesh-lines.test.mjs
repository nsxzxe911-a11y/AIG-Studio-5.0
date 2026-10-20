import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {buildEdgeIndex,wireCap,WIRE_MODES,WIRE_DENSITIES,adaptiveWireStep} from '../web/mesh-lines.mjs';
import {FastModelView} from '../web/renderer.mjs';
import {decodeGLB,buildBatches} from '../web/fastmodel-data.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const small=Uint32Array.from([0,1,2,2,1,3]);
test('four true UX modes, three bounded density settings',()=>{
 assert.deepEqual([...WIRE_MODES],['off','boundary','edit','full']);assert.deepEqual([...WIRE_DENSITIES],['eco','balanced','detail']);
 assert.equal(wireCap('off','eco'),0);assert.ok(wireCap('full','eco')<wireCap('full','detail'));
 assert.throws(()=>wireCap('unbounded','detail'));assert.throws(()=>wireCap('full','ultra'));
});
test('shared triangle edge is deduped once (5 total)',()=>{
 const r=buildEdgeIndex(small,{mode:'full',maxLines:20});assert.equal(r.segments,5);
 const keys=[];for(let i=0;i<r.indices.length;i+=2){const a=r.indices[i],b=r.indices[i+1];keys.push(`${a}:${b}`);}
 assert.equal(new Set(keys).size,5);assert.ok(keys.includes('1:2'));
});
test('boundary means open topological edges (4), not fake silhouette',()=>{
 const r=buildEdgeIndex(small,{mode:'boundary',maxLines:20});assert.equal(r.segments,4);
 assert.equal(Array.from(r.indices).some((x,i,a)=>i%2===0&&x===1&&a[i+1]===2),false);
});
test('edit selection selects triangles touching first vertex range',()=>{
 const triangles=Uint32Array.from([0,1,2,20,21,22,40,41,42]);
 assert.equal(buildEdgeIndex(triangles,{mode:'edit',editVertices:4,maxLines:20}).segments,3);
});
test('zero and invalid budgets fail closed',()=>{
 assert.equal(buildEdgeIndex(small,{mode:'full',maxLines:0}).segments,0);
 assert.throws(()=>buildEdgeIndex(small,{mode:'full',maxLines:16000}));
 assert.throws(()=>buildEdgeIndex(new Uint32Array([1,2]),{mode:'full'}));
 assert.throws(()=>buildEdgeIndex(small,{mode:'unknown'}));
});
test('large index source uses bounded topology scan and deterministic output',()=>{
 const N=60000,raw=new Uint32Array(N*3);
 for(let t=0;t<N;t++){raw[t*3]=t;raw[t*3+1]=t+1;raw[t*3+2]=t+2;}
 const a=buildEdgeIndex(raw,{mode:'full',maxLines:950,maxTriangles:5000});
 const b=buildEdgeIndex(raw,{mode:'full',maxLines:950,maxTriangles:5000});
 assert.ok(a.segments<=950);assert.equal(a.sampled,true);assert.deepEqual(a.indices,b.indices);
});
test('GPU adaptive line hiding needs repeated lag, then restores on stability',()=>{
 let state={suppressed:false,hot:0,cool:0};state=adaptiveWireStep(state,29);assert.equal(state.suppressed,false);
 state=adaptiveWireStep(state,30);assert.equal(state.suppressed,true);
 for(let i=0;i<3;i++)state=adaptiveWireStep(state,12);
 assert.equal(state.suppressed,true);state=adaptiveWireStep(state,12);assert.equal(state.suppressed,false);
});
test('no fabricated p95 or GPU usage',()=>{
 const state={suppressed:false,hot:1,cool:0};assert.deepEqual(adaptiveWireStep(state,NaN),state);
});
test('switching wire options uploads bounded EBO and keeps source mesh',()=>{
 let n=0;const deleted=[],uploads=[];
 const gl={ELEMENT_ARRAY_BUFFER:1,STATIC_DRAW:2,createBuffer(){return {id:++n};},deleteBuffer(b){deleted.push(b.id);},bindBuffer(){},bufferData(_target,a){uploads.push(a.byteLength);},bindVertexArray(){}};
 const e={skin:0,material:0,lineSource:small,lineIB:null,lineCount:0,ib:{id:42}};
 const v={gl,entries:[e],gpuAllocatedEstimateBytes:500,wireStats:{segments:0,drawCalls:0,gpuBytes:0},clearWireBuffers:FastModelView.prototype.clearWireBuffers,countWireStats:FastModelView.prototype.countWireStats};
 const r=FastModelView.prototype.setWireMode.call(v,'full','eco');assert.equal(r.segments,5);assert.equal(uploads.length,1);assert.equal(e.lineCount,10);assert.equal(v.gpuAllocatedEstimateBytes,540);
 const r2=FastModelView.prototype.setWireMode.call(v,'off','eco');assert.equal(r2.segments,0);assert.equal(e.lineIB,null);assert.deepEqual(deleted,[1]);assert.equal(v.gpuAllocatedEstimateBytes,500);
});
test('no line buffers when source geometry was not yet loaded',()=>{
 const v={gl:{},entries:[],gpuAllocatedEstimateBytes:0,wireStats:{segments:0,drawCalls:0,gpuBytes:0},clearWireBuffers:FastModelView.prototype.clearWireBuffers,countWireStats:FastModelView.prototype.countWireStats};
 const x=FastModelView.prototype.setWireMode.call(v,'boundary','balanced');assert.equal(x.segments,0);assert.equal(v.wireMode,'boundary');
});
test('actual candidate heroine GLB mesh topology lines stay bounded',()=>{
 const bytes=fs.readFileSync(process.env.AIG_FASTMODEL_GLB||path.join(root,'assets/phase17-visual-NOT-APPROVED.glb'));
 const ab=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length);
 const source=decodeGLB(ab),batches=buildBatches(source,'full').batches;
 assert.ok(batches.length>0);
 const body=batches.find(x=>x.skin===0);assert.ok(body);
 const r=buildEdgeIndex(body.indices,{mode:'full',maxLines:1200});
 assert.ok(r.segments>0 && r.segments<=1200);
});
test('UI default no auxiliary grid; line mode input is wired, draw call real',()=>{
 const h=fs.readFileSync(path.join(root,'web/index.html'),'utf8'),m=fs.readFileSync(path.join(root,'web/main.mjs'),'utf8'),r=fs.readFileSync(path.join(root,'web/renderer.mjs'),'utf8');
 for(const id of ['mesh-lines','mesh-density','helper-grid','meshline-status'])assert.match(h,new RegExp(`id="${id}"`));
 assert.match(h,/value="off" selected/);assert.match(m,/setWireMode/);assert.match(r,/gl\.drawElements\(gl\.LINES/);
 assert.match(r,/gl\.bufferSubData/);assert.match(r,/inverseBindCache/);assert.match(r,/this\.drawEntries/);
});