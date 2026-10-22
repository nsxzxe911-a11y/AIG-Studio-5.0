import test from 'node:test';
import assert from 'node:assert/strict';
import {AIG19SceneRuntime,AIG19_SCHEMA} from '../aig-scene-lifecycle-1-9.mjs';
const sha=n=>'sha256:'+String(n).repeat(64);
function glb(bytes=56){
 const b=new ArrayBuffer(bytes),d=new DataView(b);
 d.setUint32(0,0x46546c67,true);d.setUint32(4,2,true);
 d.setUint32(8,bytes,true);d.setUint32(12,0,true);
 d.setUint32(16,0x4e4f534a,true);return b;
}
function fixtures(files=[
 {id:'a',title:'女主角',category:'character',bytes:56},
 {id:'b',title:'校園建築',category:'building',bytes:56},
 {id:'c',title:'場景',category:'scene',bytes:56}
]){
 const getCalls={metadata:0,payload:0},items=new Map();
 for(let i=0;i<files.length;i++){
  const x=files[i],buffer=glb(x.bytes);
  items.set(x.id,{item:{
   id:x.id,sha256:sha(i+1),title:x.title,bytes:x.bytes,
   mime:'model/gltf-binary',category:x.category,
   reviewStatus:i===0?'approved':'unreviewed'
  },blob:new Blob([buffer],{type:'model/gltf-binary'})});
 }
 const library={
  async get(id,{includePayload=false}={}){
   if(includePayload)getCalls.payload++;
   else getCalls.metadata++;
   const x=items.get(id);
   if(!x)return null;
   return includePayload?{asset:{...x.item},blob:x.blob}:{...x.item};
  }
 };
 const calls={loaded:[],unloaded:0};
 const viewer={
  async load(buffer){
   assert.equal(new DataView(buffer).getUint32(0,true),0x46546c67);
   calls.loaded.push(buffer.byteLength);
   return [{name:'source-animation',duration:1,index:0}];
  },
  unloadCurrent(){calls.unloaded++;return {status:'GPU_DISPOSAL_CALLED'}}
 };
 return {library,viewer,items,calls,getCalls};
}
test('1.9 loads one verified GLB scene at a time, original vault never deleted',async()=>{
 const x=fixtures(),rt=new AIG19SceneRuntime({library:x.library,viewer:x.viewer});
 const first=await rt.activate('a');
 assert.equal(first.status,'ACTIVE_SOURCE_BOUND_GPU_SCENE');
 const same=await rt.activate('a');
 assert.equal(same.status,'ALREADY_ACTIVE_NO_REPARSE');
 assert.equal(same.preservedGpuSceneAndCamera,true);
 assert.deepEqual(x.calls.loaded,[56],'identical SHA does not reload GPU');
 assert.equal(first.asset.title,'女主角');
 const second=await rt.activate('b');
 assert.equal(second.asset.category,'building');
 assert.equal(rt.stats().active.id,'b');
 assert.equal(rt.stats().cacheMisses,2);
 assert.equal(rt.stats().maxCacheEntries,4);
 assert.deepEqual(x.calls.loaded,[56,56]);
 await rt.activate('a');
 assert.equal(rt.stats().cacheHits,1);
 assert.equal(x.getCalls.payload,2,'same sha source reuses bounded CPU binary');
 assert.equal(x.items.size,3,'original indexed DB sources are untouched');
 assert.equal(rt.stats().actualGpuMemoryNotDirectlyMeasured,true);
 const done=await rt.unload();
 assert.equal(done.status,'GPU_SCENE_RELEASED_SOURCE_BLOB_PRESERVED');
 assert.equal(x.calls.unloaded,1);
 assert.equal(rt.stats().active,null);
 assert.equal(x.items.size,3);
});
test('1.9 bounded cache evicts old CPU sources, no source deletion',async()=>{
 const x=fixtures([{id:'a',title:'人物',category:'character',bytes:700000},
 {id:'b',title:'建築',category:'building',bytes:700000},
 {id:'c',title:'校園',category:'scene',bytes:700000}]);
 const rt=new AIG19SceneRuntime({library:x.library,viewer:x.viewer,
  budgetBytes:1024*1024,maxEntries:2});
 for(const id of ['a','b','c'])await rt.activate(id);
 assert.ok(rt.stats().cachedCPUBytes<=1024*1024);
 assert.ok(rt.stats().evictions>=2);
 assert.equal(rt.stats().cachedSourceCount,1);
 assert.equal(x.items.size,3);
 assert.deepEqual(x.calls.loaded,[700000,700000,700000]);
});
test('1.9 invalid replacement preserves last visible/active scene metadata',async()=>{
 const x=fixtures(),orig=x.viewer.load;
 x.viewer.load=async(buffer)=>{
  if(buffer.byteLength===80)throw Error('BAD_GLTF_MESH');
  return orig(buffer);
 };
 x.items.get('b').item.bytes=80;x.items.get('b').blob=
  new Blob([glb(80)],{type:'model/gltf-binary'});
 const rt=new AIG19SceneRuntime({library:x.library,viewer:x.viewer});
 await rt.activate('a');
 await assert.rejects(()=>rt.activate('b'),/BAD_GLTF_MESH/);
 assert.equal(rt.stats().active.id,'a');
 assert.equal(rt.stats().lastLoadError,'BAD_GLTF_MESH');
 assert.equal(x.calls.unloaded,0);
});
test('1.9 slow stale source cannot overtake newest selected scene',async()=>{
 const x=fixtures(),oldGet=x.library.get;
 x.library.get=async(id,opts={})=>{
  if(id==='a'&&opts.includePayload)await new Promise(r=>setTimeout(r,35));
  return oldGet(id,opts);
 };
 const rt=new AIG19SceneRuntime({library:x.library,viewer:x.viewer});
 const slow=rt.activate('a');await new Promise(r=>setTimeout(r,3));
 const newSelection=rt.activate('b');
 assert.equal((await newSelection).status,'ACTIVE_SOURCE_BOUND_GPU_SCENE');
 assert.equal((await slow).status,'SUPERSEDED_BEFORE_GPU_LOAD');
 assert.equal(rt.stats().active.id,'b');
 assert.deepEqual(x.calls.loaded,[56]);
});
test('1.9 rejects maps/video/nonGLB and incorrect source metadata',async()=>{
 const x=fixtures();
 x.items.set('map',{item:{
  id:'map',title:'地圖',category:'map',sha256:sha(4),bytes:56,
  mime:'application/json'},blob:new Blob(['{}'],{type:'application/json'})});
 const rt=new AIG19SceneRuntime({library:x.library,viewer:x.viewer});
 assert.throws(()=>new AIG19SceneRuntime({library:x.library,viewer:x.viewer,budgetBytes:0}),
  /LIBRARY_VIEWER_AND_BUDGET_REQUIRED/);
 await assert.rejects(()=>rt.activate('map'),/GLB_SOURCE_METADATA_INVALID/);
 await assert.rejects(()=>rt.activate('../bad'),/SOURCE_NOT_FOUND/);
 const s=rt.clearCache();
 assert.equal(s.originalApprovedIndexedDBAssetsPreserved,true);
 assert.equal(rt.stats().active,null);
});
test('1.9 close clears transient RAM without writing files and blocks late reuse',async()=>{
 const x=fixtures(),rt=new AIG19SceneRuntime({library:x.library,viewer:x.viewer});
 await rt.activate('a');await rt.close();
 assert.equal(rt.stats().closed,true);
 assert.equal(rt.stats().cachedCPUBytes,0);
 assert.equal(x.items.size,3);
 await assert.rejects(()=>rt.activate('b'),/RUNTIME_CLOSED/);
});
