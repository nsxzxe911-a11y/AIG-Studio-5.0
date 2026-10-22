/**
 * FastModel Real3D 1.9 — bounded on-demand scene lifecycle.
 *
 * Source of truth: AIG 7.16 immutable IndexedDB content-addressed originals.
 * The cache holds only transient decoded/undecoded GLB bytes in RAM; the
 * Three.js viewer owns *one* active scene and its GPU resources. No duplicate
 * renderer, invisible preload, deletion of an approved model, or fake VRAM.
 *
 * A scene switch is serialized and generation-gated to prevent late loads
 * from replacing a newer user's selection. Failed replacement preserves the
 * last valid viewer model (Viewer.load is transactional).
 */
export const AIG19_SCHEMA='AIG_FASTMODEL_REAL3D_1_9_SCENE_LIFECYCLE';
const MAX_BYTES=256*1024*1024;
const GLB_MIME='model/gltf-binary';
const CATS=new Set(['character','building','scene','environment']);
const fail=code=>{throw Error('AIG19_'+code)};
const goodId=s=>typeof s==='string'&&s.length>0&&s.length<=150;
const isSha=s=>typeof s==='string'&&/^sha256:[a-f0-9]{64}$/.test(s);
function checkMeta(meta,id){
 if(!meta||meta.id!==id||!isSha(meta.sha256)||
  !CATS.has(meta.category)||meta.mime!==GLB_MIME||
  !Number.isSafeInteger(meta.bytes)||meta.bytes<20||
  meta.bytes>64*1024*1024)fail('GLB_SOURCE_METADATA_INVALID');
}
function checkGLB(bytes){
 if(!(bytes instanceof ArrayBuffer)||bytes.byteLength<20||
  bytes.byteLength>64*1024*1024)fail('BOUNDED_GLTF2_BINARY_REQUIRED');
 const d=new DataView(bytes);
 if(d.getUint32(0,true)!==0x46546c67||d.getUint32(4,true)!==2||
  d.getUint32(8,true)!==bytes.byteLength)fail('GLTF2_HEADER_INVALID');
}
export class AIG19SceneRuntime{
 constructor({library,viewer,budgetBytes=48*1024*1024,maxEntries=4}={}){
  if(!library||typeof library.get!=='function'||
   !viewer||typeof viewer.load!=='function'||typeof viewer.unloadCurrent!=='function'||
   !Number.isSafeInteger(budgetBytes)||budgetBytes<1024*1024||
   budgetBytes>MAX_BYTES||
   !Number.isInteger(maxEntries)||maxEntries<1||maxEntries>32)
   fail('LIBRARY_VIEWER_AND_BUDGET_REQUIRED');
  this.library=library;this.viewer=viewer;
  this.budgetBytes=budgetBytes;this.maxEntries=maxEntries;
  this._cache=new Map();this._queue=Promise.resolve();
  this._serial=0;this._generation=0;this._active=null;
  this._hits=0;this._misses=0;this._evictions=0;
  this._closed=false;this._lastError=null;
 }
 _cachedBytes(){let sum=0;for(const p of this._cache.values())sum+=p.bytes.byteLength;return sum;}
 _trim(){
  while(this._cache.size>this.maxEntries||this._cachedBytes()>this.budgetBytes){
   const item=[...this._cache.entries()].sort((a,b)=>a[1].stamp-b[1].stamp)[0];
   if(!item)break;
   this._cache.delete(item[0]);this._evictions++;
  }
 }
 async _loadBytes(id,meta){
  const hit=this._cache.get(id);
  if(hit&&hit.sha===meta.sha256&&hit.bytes.byteLength===meta.bytes){
   hit.stamp=++this._serial;this._hits++;return hit.bytes;
  }
  this._misses++;
  // Source store verifies its SHA-256 again when materializing the Blob.
  const got=await this.library.get(id,{includePayload:true});
  if(!got?.blob||got.asset?.sha256!==meta.sha256)fail('SOURCE_CHANGED_DURING_LOAD');
  const buffer=await got.blob.arrayBuffer();
  if(buffer.byteLength!==meta.bytes)fail('SOURCE_SIZE_MISMATCH');
  checkGLB(buffer);
  // Do not retain oversized binaries; they can still render directly.
  if(buffer.byteLength<=this.budgetBytes){
   this._cache.set(id,{sha:meta.sha256,bytes:buffer,stamp:++this._serial});
   this._trim();
  }
  return buffer;
 }
 async activate(id,{orbit=false}={}){
  if(this._closed)fail('RUNTIME_CLOSED');
  if(!goodId(id)||typeof orbit!=='boolean')fail('ASSET_SELECTION_INVALID');
  const generation=++this._generation;
  // Reject non-GLB media up front; maps and video have their own engines.
  const meta=await this.library.get(id);
  if(!meta)fail('SOURCE_NOT_FOUND');
  checkMeta(meta,id);
  // Reopening the same unchanged GLB should not parse/re-upload an entire
  // GPU model again. Preserve current camera and animation pose.
  if(this._active?.id===id&&this._active.sha256===meta.sha256){
   return {status:'ALREADY_ACTIVE_NO_REPARSE',asset:{...this._active},
    clips:[],preservedGpuSceneAndCamera:true};
  }
  const bytes=await this._loadBytes(id,meta);
  if(generation!==this._generation)return {status:'SUPERSEDED_BEFORE_GPU_LOAD'};
  const task=async()=>{
   if(this._closed||generation!==this._generation)
    return {status:'SUPERSEDED_BEFORE_GPU_LOAD'};
   try{
    const clips=await this.viewer.load(bytes,{orbit});
    // No later switch can commit out of order: all viewer mutations run
    // within the serialized promise queue.
    this._active={id,sha256:meta.sha256,category:meta.category,
     title:meta.title,reviewStatus:meta.reviewStatus,
     clips:clips.length};
    this._lastError=null;
    return {status:'ACTIVE_SOURCE_BOUND_GPU_SCENE',asset:{...this._active},
     clips:clips.map(x=>({...x})),supersededAfterCommit:
      generation!==this._generation};
   }catch(error){
    this._lastError=String(error.message||error);
    // The viewer never removed its previous valid GLB on parse failure.
    throw error;
   }
  };
  const r=this._queue.then(task);
  this._queue=r.then(()=>undefined,()=>undefined);
  return r;
 }
 async unload({dropCpuCache=false}={}){
  if(this._closed)return {status:'RUNTIME_CLOSED'};
  const generation=++this._generation;
  const r=this._queue.then(()=>{
   if(generation!==this._generation)return {status:'SUPERSEDED'};
   this.viewer.unloadCurrent();
   this._active=null;
   if(dropCpuCache)this.clearCache();
   return {status:'GPU_SCENE_RELEASED_SOURCE_BLOB_PRESERVED'};
  });
  this._queue=r.then(()=>undefined,()=>undefined);
  return r;
 }
 clearCache(){
  if(this._closed)fail('RUNTIME_CLOSED');
  this._cache.clear();
  return {status:'ONLY_TRANSIENT_RAM_CACHE_CLEARED',
   originalApprovedIndexedDBAssetsPreserved:true};
 }
 async close(){
  if(this._closed)return;
  ++this._generation;await this._queue;
  // Do not destroy the shared renderer or original persistent library;
  // caller owns their lifecycle. Explicit close clears transient CPU RAM.
  this._cache.clear();this._closed=true;
 }
 stats(){
  return Object.freeze({
   schema:AIG19_SCHEMA,active:this._active?{...this._active}:null,
   cachedSourceCount:this._cache.size,cachedCPUBytes:this._cachedBytes(),
   maxCachedBytes:this.budgetBytes,maxCacheEntries:this.maxEntries,
   cacheHits:this._hits,cacheMisses:this._misses,evictions:this._evictions,
   lastLoadError:this._lastError,
   cpuMemoryBudgetIsNotActualVRAM:true,oneActiveGPUScene:true,
   originalStoredAssetBlobsNeverDeleted:true,
   approvedSourceAndDerivedAssetStaySeparate:true,
   gpuDisposalRequestedByViewer:true,actualGpuMemoryNotDirectlyMeasured:true,
   closed:this._closed
  });
 }
}
