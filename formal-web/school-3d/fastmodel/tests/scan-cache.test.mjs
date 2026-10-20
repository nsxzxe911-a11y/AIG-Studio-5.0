import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {SCAN_CACHE_LIMITS,scanTopologyBytes,createScanDerivedCache} from '../web/scan-cache.mjs';
import {paintScanOverlay} from '../web/scan-overlay.mjs';
const eye=(x=0)=>Float32Array.from([1,0,0,0,0,1,0,0,0,0,1,0,x,0,0,1]);
const file=()=>({g:{nodes:[{},{}],skins:[{joints:[0]}]}});
const topology=(geometry='bones')=>({status:'SOURCE_READY',geometry,density:'eco',
 bones:[{parent:0,child:1,role:'head'}],inverse:[[eye()]],surfaces:[],
 omitted:0,realSource:true});
const view=file=>({file,angle:0,zoom:1,zoomFactor:1,width:1920,height:1080,center:[0,0,0]});
const depth=()=>({status:'SAMPLED_SOURCE_TRIANGLE_DEPTH',width:4,height:4,grid:new Float32Array(16),triangles:1});
function canvas(){
 const ctx={setTransform(){},clearRect(){},save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},setLineDash(){}};
 return {width:0,height:0,clientWidth:600,clientHeight:400,getContext:()=>ctx};
}
test('real topology MISS then HIT for exact file and density; GLB changes invalidate without touching source',()=>{
 const a=file(),b=file(),before=JSON.stringify(a),cache=createScanDerivedCache({limitBytes:4096});
 assert.equal(cache.getTopology(a,{geometry:'bones',density:'eco'}),null);
 const t=topology();
 assert.equal(cache.putTopology(a,t,{geometry:'bones',density:'eco',buildMs:1.25}),true);
 assert.strictEqual(cache.getTopology(a,{geometry:'bones',density:'eco'}),t);
 assert.equal(cache.getTopology(a,{geometry:'bones',density:'detail'}),null);
 let s=cache.stats();
 assert.equal(s.byLayer.skeleton.hit,1);assert.equal(s.byLayer.skeleton.miss,2);
 assert.equal(s.hitRate,1/3);assert.ok(s.bytes>0);
 assert.equal(s.measuredGpuSpeedup,false);
 assert.equal(s.previousBuildMsReference,1.25);
 assert.equal(JSON.stringify(a),before);
 cache.useSource(b);assert.equal(cache.getTopology(b,{geometry:'bones',density:'eco'}),null);
 assert.equal(cache.stats().reason,'GLB_SOURCE_CHANGED');
 assert.ok(cache.stats().invalidations>=2);
});
test('depth cache exact FLOAT MATRIX values and full camera signature; animated pose cannot stale hit',()=>{
 const f=file(),cache=createScanDerivedCache({limitBytes:4096}),v=view(f),t=topology('all'),pose=[eye(),eye()];
 assert.equal(cache.getDepth({file:f,view:v,topology:t,world:pose}),null);
 assert.equal(cache.putDepth({file:f,view:v,topology:t,world:pose,depth:depth(),buildMs:3.5}),true);
 assert.ok(cache.getDepth({file:f,view:v,topology:t,world:pose}));
 pose[0][12]=0.125;assert.equal(cache.getDepth({file:f,view:v,topology:t,world:pose}),null);
 // Renderer reuses the same Float32Array objects; comparing references would incorrectly hit.
 assert.equal(cache.putDepth({file:f,view:v,topology:t,world:pose,depth:depth()}),true);
 assert.ok(cache.getDepth({file:f,view:v,topology:t,world:pose}));
 const rotated={...v,angle:0.35};
 assert.equal(cache.getDepth({file:f,view:rotated,topology:t,world:pose}),null);
 const resized={...v,width:1280};assert.equal(cache.getDepth({file:f,view:resized,topology:t,world:pose}),null);
 assert.equal(cache.getDepth({file:f,view:v,topology:t,density:'detail',world:pose}),null);
 assert.equal(cache.getDepth({file:f,view:v,topology:topology('all'),world:pose}),null);
 const s=cache.stats();
 assert.equal(s.byLayer.depth.hit,2);
 assert.ok(s.byLayer.depth.miss>=5);
 assert.equal(s.sourceGLBUnchanged,true);
});
test('memory pressure evicts ONLY derived depth and contour, never bones/source/head',()=>{
 const f=file(),c=createScanDerivedCache({limitBytes:4096}),v=view(f),t=topology('all'),bones=topology();
 c.putTopology(f,bones,{density:'eco',geometry:'bones'});
 c.putTopology(f,t,{density:'eco',geometry:'all'});
 c.putDepth({file:f,view:v,topology:t,world:[eye()],depth:depth()});
 const before=JSON.stringify(f),prev=c.stats().bytes;
 const freed=c.relievePressure();
 assert.ok(freed>0);assert.ok(c.stats().bytes<prev);
 assert.strictEqual(c.getTopology(f,{density:'eco',geometry:'bones'}),bones);
 assert.equal(c.getTopology(f,{density:'eco',geometry:'all'}),null);
 assert.equal(c.getDepth({file:f,view:v,topology:t,world:[eye()]}),null);
 assert.equal(JSON.stringify(f),before);
 assert.equal(c.stats().status,'MISS_DEPTH');
 assert.ok(c.stats().evictions>=1);
});
test('manual safe clear, source invalidate and oversized geometry cannot force cached model deletion',()=>{
 const f=file(),c=createScanDerivedCache({limitBytes:1024}),bone=topology();
 assert.ok(scanTopologyBytes(bone)>0);
 c.putTopology(f,bone,{density:'eco',geometry:'bones'});
 const big={...topology('all'),surfaces:[{
  positions:new Float32Array(5000),joints:new Uint16Array(2000),
  weights:new Float32Array(2000),indices:new Uint32Array(2000),edges:[{a:0,b:1}]
 }]};
 assert.equal(c.putTopology(f,big,{density:'eco',geometry:'all'}),false);
 assert.strictEqual(c.getTopology(f,{density:'eco',geometry:'bones'}),bone);
 assert.equal(c.clearDerived('USER_CLEAR'),0);
 assert.strictEqual(c.getTopology(f,{density:'eco',geometry:'bones'}),bone);
 c.invalidate('SOURCE_WORKING_COPY_EDIT');
 assert.equal(c.getTopology(f,{density:'eco',geometry:'bones'}),null);
 assert.equal(c.stats().reason,'SOURCE_WORKING_COPY_EDIT');
 assert.throws(()=>createScanDerivedCache({limitBytes:12}),/SCAN_CACHE_LIMIT_INVALID/);
});
test('optional depth and contour insertion cannot evict protected cached joint skeleton',()=>{
 const f=file(),cache=createScanDerivedCache({limitBytes:1024});
 const bones=topology('bones');
 assert.equal(cache.putTopology(f,bones,{geometry:'bones',density:'eco'}),true);
 const depthCandidate={status:'SAMPLED_SOURCE_TRIANGLE_DEPTH',width:8,height:8,
   grid:new Float32Array(64),triangles:2};
 // Each optional insert is below the limit individually but exceeds it
 // when combined with the protected bone topology.
 const d=cache.putDepth({file:f,view:view(f),topology:topology('all'),
   world:[eye()],depth:depthCandidate});
 assert.equal(d,false);
 assert.strictEqual(cache.getTopology(f,{geometry:'bones',density:'eco'}),bones);
 const contour={...topology('all'),surfaces:[{
   positions:new Float32Array(60),joints:new Uint16Array(40),
   weights:new Float32Array(40),indices:new Uint16Array(40),edges:[{a:0,c:1,faces:[0]}]
 }]};
 assert.ok(scanTopologyBytes(contour)<1024);
 assert.equal(cache.putTopology(f,contour,{geometry:'all',density:'eco'}),false);
 assert.strictEqual(cache.getTopology(f,{geometry:'bones',density:'eco'}),bones);
 assert.equal(cache.stats().byLayer.skeleton.hit,2);
 assert.equal(cache.stats().bytes,scanTopologyBytes(bones));
 assert.equal(cache.stats().sourceGLBUnchanged,true);
});
test('real canvas source-depth cache first MISS then HIT, on pose change MISS',()=>{
 const f=file(),c=createScanDerivedCache({limitBytes:8192}),v=view(f);
 const surf={skin:0,role:'neck',positions:Float32Array.from([0,0,-1,.2,0,-1,0,.2,-1]),
  joints:Uint16Array.from(Array(12).fill(0)),weights:Float32Array.from([1,0,0,0,1,0,0,0,1,0,0,0]),
  indices:Uint32Array.from([0,1,2]),edges:[{a:0,c:1,faces:[0]},{a:1,c:2,faces:[0]},{a:2,c:0,faces:[0]}]};
 const t={status:'SOURCE_READY',geometry:'all',bones:[{parent:0,child:1,role:'head-neck'}],surfaces:[surf],inverse:[[eye()]]};
 const world=[eye(),eye()];
 const o={mode:'bones-outline',density:'eco',depthMode:'sampled',derivedCache:c};
 const first=paintScanOverlay(canvas(),v,t,world,o);
 const second=paintScanOverlay(canvas(),v,t,world,o);
 assert.equal(first.sampledDepthTriangles,1);
 assert.equal(second.sampledDepthTriangles,1);
 assert.equal(c.stats().byLayer.depth.hit,1);
 world[0][12]=.01;
 paintScanOverlay(canvas(),v,t,world,o);
 assert.equal(c.stats().byLayer.depth.hit,1);
 assert.ok(c.stats().byLayer.depth.miss>=2);
});
test('cache UI, honest human labels, model invalidation, exporter and standalone packer are wired',()=>{
 const root=new URL('../',import.meta.url),read=p=>fs.readFileSync(new URL(p,root),'utf8');
 const main=read('web/main.mjs'),html=read('web/index.html'),pack=read('tools/build_standalone.py');
 for(const id of ['scan-cache-status','scan-cache-clear'])assert.ok(html.includes('id="'+id+'"'),id);
 assert.ok(main.includes("scanCache.getTopology(f,{density,geometry:topologyKind})"));
 assert.ok(main.includes("scanCache.putTopology(f,created,"));
 assert.ok(main.includes("scanCache.relievePressure()"));
 assert.ok(main.includes("scanCache.clearDerived('USER_CLEAR')"));
 assert.ok(main.includes('derivedCache:scanCache'));
 assert.ok(main.includes('scanCache:scanCache.stats()'));
 assert.ok(main.includes('scanCache.useSource(view.file)'));
 assert.ok(main.includes('scanCache.useSource(f)'));
 assert.ok(pack.includes('scan-cache.mjs'));
 assert.ok(pack.includes("'\\n'+turbo+'\\n'+scanCache+'\\n'+scanOverlay"));
});
