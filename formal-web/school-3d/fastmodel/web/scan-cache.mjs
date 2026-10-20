/** FastModel 2.5 — bounded and reversible DISPLAY-ONLY derived scan cache.
 * Identity of the current loaded GLB is matched by object reference; application
 * must call useSource() or invalidate() after in-place source edits. Never cache
 * unsaved working-copy/source geometry as releasable entries.
 * Animation matrices are copied and compared VALUE-by-VALUE (renderer reuses arrays).
 */
export const SCAN_CACHE_LIMITS=Object.freeze({mobile:8*1048576,desktop:32*1048576});
const finite=n=>Number.isFinite(n)&&n>=0;
const size=n=>Math.max(0,Math.ceil(n));
export function scanTopologyBytes(t){
 if(!t||typeof t!=='object')return 0;
 let total=(t.bones?.length||0)*64+(t.inverse||[]).reduce((n,skin)=>n+skin.reduce((s,m)=>s+(m?.byteLength||64),0),0);
 for(const p of t.surfaces||[]){
  for(const field of ['positions','joints','weights','indices'])total+=p[field]?.byteLength||0;
  total+=(p.edges?.length||0)*48;
 }
 return size(total+256);
}
function snapshotWorld(world){
 if(!Array.isArray(world)||world.length>4096)return null;
 const list=[];let bytes=0;
 for(const mat of world){
  if(!mat||mat.length!==16||!Array.from(mat).every(Number.isFinite))return null;
  const v=Float32Array.from(mat);list.push(v);bytes+=v.byteLength;
 }
 return {matrices:list,bytes};
}
function identicalWorld(snapshot,world){
 if(!snapshot||snapshot.length!==world?.length)return false;
 for(let i=0;i<world.length;i++){
  const old=snapshot[i],now=world[i];
  if(!now||old.length!==now.length)return false;
  for(let j=0;j<old.length;j++)if(!Object.is(old[j],now[j]))return false;
 }
 return true;
}
function viewSignature(view){
 if(!view)return null;
 const values=[view.angle||0,view.zoom,view.zoomFactor,
  view.width,view.height,...(view.center||[])];
 if(values.length!==8||values.some(x=>!Number.isFinite(x)))return null;
 return values.join('|');
}
export function createScanDerivedCache({limitBytes=SCAN_CACHE_LIMITS.mobile}={}){
 if(!Number.isInteger(limitBytes)||limitBytes<1024||limitBytes>134217728)throw Error('SCAN_CACHE_LIMIT_INVALID');
 let currentSource=null,currentGeneration=0,bytes=0,clock=0;
 const items=new Map(),counts={
  skeleton:{hit:0,miss:0},contour:{hit:0,miss:0},depth:{hit:0,miss:0}
 };
 let evictions=0,invalidations=0,evictedBytes=0,lastReason='NEW',lastEvent='EMPTY';
 let lastBuildMs=null,lastLookupMs=null,knownBuildReferenceMs=0;
 const topologyKey=(geometry,density)=>geometry+':'+density;
 const kindFor=g=>g==='bones'?'skeleton':'contour';
 function evict(where='all',except=null){
  const eligible=[...items.entries()].filter(([key,item])=>key!==except&&(where==='all'||item.kind===where||
    (where==='pressure'&&item.kind!=='skeleton')));
  const order={depth:0,contour:1,skeleton:2};
  eligible.sort((a,b)=>(order[a[1].kind]-order[b[1].kind])||(a[1].last-b[1].last));
  let released=0;
  for(const [key,item] of eligible){
   items.delete(key);bytes-=item.bytes;released+=item.bytes;evictions++;evictedBytes+=item.bytes;
   if(where==='pressure'&&bytes<=limitBytes*.35)break;
  }
  return released;
 }
 function reserve(n,except=null){
  if(n>limitBytes)return false;
  if(bytes+n<=limitBytes)return true;
  const eligible=[...items.entries()].filter(([key])=>key!==except);
  const order={depth:0,contour:1,skeleton:2};
  eligible.sort((a,b)=>(order[a[1].kind]-order[b[1].kind])||(a[1].last-b[1].last));
  for(const [key,item] of eligible){
   items.delete(key);bytes-=item.bytes;evictions++;evictedBytes+=item.bytes;
   if(bytes+n<=limitBytes)return true;
  }
  return bytes+n<=limitBytes;
 }
 function invalidate(reason='EXPLICIT_INVALIDATE'){
  const released=evict('all');currentGeneration++;invalidations++;
  lastReason=reason;lastEvent='INVALIDATED';lastBuildMs=null;lastLookupMs=null;
  return released;
 }
 function useSource(file){
  if(!file||typeof file!=='object')throw Error('SCAN_CACHE_SOURCE_REQUIRED');
  if(file===currentSource)return false;
  invalidate('GLB_SOURCE_CHANGED');currentSource=file;return true;
 }
 function getTopology(file,{density='balanced',geometry='bones'}={}){
  useSource(file);const kind=kindFor(geometry),key='topo:'+topologyKey(geometry,density);
  const item=items.get(key);
  if(item){item.last=++clock;counts[kind].hit++;lastEvent='HIT_'+kind.toUpperCase();return item.value;}
  counts[kind].miss++;lastEvent='MISS_'+kind.toUpperCase();return null;
 }
 function putTopology(file,topology,{density='balanced',geometry='bones',buildMs=null}={}){
  useSource(file);
  const key='topo:'+topologyKey(geometry,density),n=scanTopologyBytes(topology);
  if(!topology||!['bones','all'].includes(geometry))throw Error('SCAN_CACHE_TOPOLOGY_INVALID');
  if(items.has(key)){const old=items.get(key);items.delete(key);bytes-=old.bytes;}
  if(!reserve(n)){lastEvent='SKIP_OVER_BUDGET';return false;}
  items.set(key,{kind:kindFor(geometry),last:++clock,bytes:n,value:topology});
  bytes+=n;if(finite(buildMs)){lastBuildMs=buildMs;knownBuildReferenceMs=buildMs;}
  lastEvent='STORE_'+kindFor(geometry).toUpperCase();return true;
 }
 function depthKey(view,topology,density){
  return viewSignature(view)+'#'+density+'#'+(topology?.geometry||'all');
 }
 function getDepth({file,view,topology,density='balanced',world}={}){
  const start=typeof performance!=='undefined'&&performance.now?performance.now():0;
  useSource(file);
  const item=items.get('depth');
  const signature=depthKey(view,topology,density);
  const ok=!!item&&!!signature&&item.topology===topology&&item.signature===signature&&
    identicalWorld(item.pose,world);
  const now=typeof performance!=='undefined'&&performance.now?performance.now():0;lastLookupMs=+(now-start).toFixed(3);
  if(ok){item.last=++clock;counts.depth.hit++;lastEvent='HIT_DEPTH';return item.value;}
  counts.depth.miss++;lastEvent='MISS_DEPTH';return null;
 }
 function putDepth({file,view,topology,density='balanced',world,depth,buildMs=null}={}){
  useSource(file);
  const snap=snapshotWorld(world),signature=depthKey(view,topology,density);
  if(!snap||!signature||!depth?.grid||!Number.isFinite(depth.width)||!Number.isFinite(depth.height)){
   lastEvent='SKIP_UNSAFE_DEPTH';return false;
  }
  const n=size(depth.grid.byteLength+snap.bytes+384);
  const old=items.get('depth');
  if(old){items.delete('depth');bytes-=old.bytes;}
  if(!reserve(n)){lastEvent='SKIP_OVER_BUDGET';return false;}
  items.set('depth',{kind:'depth',last:++clock,bytes:n,value:depth,
    pose:snap.matrices,signature,topology});
  bytes+=n;
  if(finite(buildMs)){lastBuildMs=buildMs;knownBuildReferenceMs=buildMs;}
  lastEvent='STORE_DEPTH';return true;
 }
 function clearDerived(reason='USER_CLEAR'){
  const released=evict('pressure');invalidations++;lastReason=reason;
  lastEvent=released?'DERIVED_EVICTED':'DERIVED_ALREADY_EMPTY';return released;
 }
 function relievePressure(){
  const released=clearDerived('MEMORY_PRESSURE');
  lastEvent=released?'PRESSURE_EVICTION':'PRESSURE_NO_DERIVED_CACHE';return released;
 }
 function setLimitBytes(next){
  if(!Number.isInteger(next)||next<1024||next>134217728)throw Error('SCAN_CACHE_LIMIT_INVALID');
  limitBytes=next;
  if(bytes>limitBytes)relievePressure();
 }
 function stats(){
  const copy={};for(const [key,v] of Object.entries(counts))copy[key]={...v};
  const hits=Object.values(counts).reduce((a,b)=>a+b.hit,0),misses=Object.values(counts).reduce((a,b)=>a+b.miss,0);
  return {status:lastEvent,reason:lastReason,bytes:Math.max(0,bytes),limitBytes,
   bytesApproximate:true,hits,misses,hitRate:((hits+misses)?hits/(hits+misses):0),
   byLayer:copy,evictions,evictedBytes,invalidations,generation:currentGeneration,
   lastBuildMs,lastLookupMs,previousBuildMsReference:knownBuildReferenceMs,
   measuredGpuSpeedup:false,sourceGLBUnchanged:true};
 }
 return {useSource,invalidate,getTopology,putTopology,getDepth,putDepth,
  relievePressure,clearDerived,setLimitBytes,stats,get source(){return currentSource;}};
}
