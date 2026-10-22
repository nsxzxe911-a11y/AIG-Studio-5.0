import test from 'node:test';
import assert from 'node:assert/strict';
import {createAIG16GpuResidency,AIG16_GPU_RESIDENCY_SCHEMA}
 from '../../../../shared-3d/aig-real3d-gpu-budget-1-6.mjs';

test('Real3D 1.6 finite residency rejects invalid limits and oversized sources',()=>{
 assert.throws(()=>createAIG16GpuResidency({maxResidentBytes:0}),/BUDGET_INVALID/);
 assert.throws(()=>createAIG16GpuResidency({maxResidentBytes:129*1024*1024}),/BUDGET_INVALID/);
 const p=createAIG16GpuResidency({maxResidentBytes:1024*1024});
 p.beginFrame();
 assert.throws(()=>p.reserve({},1024*1024+1,()=>({}),()=>{}),/OVER_BUDGET/);
 assert.equal(p.stats().residentBytes,0);
});
test('replay cache hits avoid reupload and preserve exact mesh identity',()=>{
 const r=createAIG16GpuResidency({maxResidentBytes:1024*1024});
 const k={},resource={gpuBuffer:'source-X'},disposed=[];
 r.beginFrame();
 assert.equal(r.reserve(k,400000,()=>resource,x=>disposed.push(x)),resource);
 assert.equal(r.reserve(k,400000,()=>{throw Error('DUPLICATE_UPLOAD');},()=>{}),resource);
 assert.equal(r.stats().uploads,1);
 assert.equal(r.stats().residentBytes,400000);
 assert.equal(r.stats().schema,AIG16_GPU_RESIDENCY_SCHEMA);
 assert.equal(r.stats().nativeGpuFpsVerified,false);
 assert.equal(r.release(k),true);
 assert.equal(r.release(k),false);
 assert.equal(disposed.length,1);assert.equal(r.stats().residentBytes,0);
});
test('budget eviction protects all source meshes in the current render frame',()=>{
 const cache=createAIG16GpuResidency({maxResidentBytes:1024*1024});
 const a={},b={},c={},deleted=[];
 const make=k=>({id:k});
 const d=v=>deleted.push(v.id);
 cache.beginFrame();
 const av=cache.reserve(a,400000,()=>make('a'),d);
 cache.reserve(b,400000,()=>make('b'),d);
 assert.throws(()=>cache.reserve(c,400000,()=>make('c'),d),/ACTIVE_SCENE/);
 assert.equal(cache.stats().residentBytes,800000);
 assert.deepEqual(deleted,[]);
 cache.beginFrame();
 assert.equal(cache.get(b)?.id,'b');
 cache.reserve(c,400000,()=>make('c'),d);
 assert.deepEqual(deleted,['a']);
 assert.equal(cache.get(b)?.id,'b');
 assert.equal(cache.stats().evictions,1);
 assert.equal(cache.stats().residentBytes,800000);
 assert.equal(av.id,'a'); // immutable CPU source stays unchanged
 cache.clear();
 assert.deepEqual(deleted,['a','b','c']);
 assert.equal(cache.stats().activeMeshBuffers,0);
 assert.equal(cache.stats().residentBytes,0);
});
test('failure in buffer creator never increments planned resident VRAM',()=>{
 const p=createAIG16GpuResidency({maxResidentBytes:1024*1024});
 p.beginFrame();
 assert.throws(()=>p.reserve({},25000,()=>{throw Error('WEBGL_CONTEXT_LOST');},()=>{}),/WEBGL_CONTEXT_LOST/);
 assert.equal(p.stats().residentBytes,0);
 assert.equal(p.stats().uploads,0);
});
