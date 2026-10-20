/** AIG FastModel Stability 1.1 — pure deterministic policy; no OS process killing,
 * no unsaved mesh eviction, no disk deletion, no false GPU-utilization percentage.
 * GPU latency is UNKNOWN without GPU timer-query evidence; CPU is JS submit time only.
 */
const MiB=1024*1024;
const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
const finite=(x)=>Number.isFinite(x)&&x>=0;
export function makeBudgets({deviceMemoryGiB=4,targetFps=60,override={}}={}){
  const mem=clamp(finite(deviceMemoryGiB)&&deviceMemoryGiB>0?deviceMemoryGiB:4,1,32);
  const fps=clamp(finite(targetFps)&&targetFps>0?targetFps:60,15,120);
  const b={targetFrameMs:1000/fps, // CPU and GPU run overlapped; the sum of each budget isn't a serial pipeline
    cpuSubmitMs:3, gpuTargetMs:10, cpuCacheBytes:Math.round(clamp(mem*32,32,256)*MiB),
    gpuWorkingSetEstimateBytes:Math.round(clamp(mem*64,64,512)*MiB),
    maxSingleUploadBytes:16*MiB, minDiskReserveBytes:256*MiB,
    softHeapRatio:0.78,hardHeapRatio:0.90, maxDiskRatio:0.90,
    minWriteRateBytesPerSec:1*MiB};
  for(const [k,v] of Object.entries(override)){
    if(!(k in b)||!finite(v))throw new RangeError('invalid budget override '+k);
    b[k]=v;
  }
  if(!(b.softHeapRatio>0&&b.softHeapRatio<b.hardHeapRatio&&b.hardHeapRatio<=1))throw new RangeError('invalid heap thresholds');
  return Object.freeze(b);
}
export class RebuildableCache {
  constructor({limitBytes=64*MiB}={}){if(!finite(limitBytes))throw RangeError('cache limit');this.limitBytes=limitBytes;this.items=new Map();this.bytes=0;this.clock=0;this.totalEvictedBytes=0;}
  put({key,bytes,release,dirty=false,protectedItem=false,kind='derived'}){
    if(typeof key!=='string'||!key||!finite(bytes)||typeof release!=='function')throw new TypeError('cache entry invalid');
    if(this.items.has(key))throw Error('cache key must be unique');
    // A dirty or protected entry MUST NOT be admitted into a releasable cache.
    if(dirty||protectedItem||kind==='working-copy'||kind==='recovery'||kind==='source')throw Error('authoritative data cannot enter eviction cache');
    this.items.set(key,{key,bytes,release,kind,last:++this.clock});this.bytes+=bytes;
    this.evictTo(this.limitBytes);return this.items.has(key);
  }
  get(key){const x=this.items.get(key);if(x)x.last=++this.clock;return x||null;}
  evictTo(targetBytes=0){if(!finite(targetBytes))throw RangeError('target bytes');let cleared=0,errors=[];
    for(const x of [...this.items.values()].sort((a,b)=>a.last-b.last)){
      if(this.bytes<=targetBytes)break;
      try{x.release();this.items.delete(x.key);this.bytes-=x.bytes;cleared+=x.bytes;this.totalEvictedBytes+=x.bytes;}
      catch(e){errors.push({key:x.key,error:String(e)});} // failure never drops ownership or pretends to free memory
    }
    return {freedBytes:cleared,remainingBytes:this.bytes,errors};
  }
}
export class ResourceGovernor {
  constructor({budgets=makeBudgets(),cache=new RebuildableCache({limitBytes:budgets.cpuCacheBytes})}={}){
    this.b=budgets;this.cache=cache;this.samples=[];this.slowStreak=0;this.fastStreak=0;this.pressureStreak=0;
    this.status='normal';this.normalStreak=0;this.recommendedScale=1;this.lastEviction={freedBytes:0,remainingBytes:0,errors:[]};
    this.lastCpuMs=null;this.lastGpuMs=null;this.gpuMeasured=false;
  }
  sampleMemory({heapUsedBytes=null,heapLimitBytes=null,cpuDerivedBytes=null,gpuAllocatedEstimateBytes=null}={}){
    const reliable=finite(heapUsedBytes)&&finite(heapLimitBytes)&&heapLimitBytes>0;
    const heapRatio=reliable?heapUsedBytes/heapLimitBytes:null;
    const derivedRatio=finite(cpuDerivedBytes)?cpuDerivedBytes/this.b.cpuCacheBytes:null;
    const gpuEstimateRatio=finite(gpuAllocatedEstimateBytes)?gpuAllocatedEstimateBytes/this.b.gpuWorkingSetEstimateBytes:null;
    const hard=(heapRatio!==null&&heapRatio>=this.b.hardHeapRatio)||(derivedRatio!==null&&derivedRatio>=1)||(gpuEstimateRatio!==null&&gpuEstimateRatio>=1);
    const soft=(heapRatio!==null&&heapRatio>=this.b.softHeapRatio)||(derivedRatio!==null&&derivedRatio>=0.8)||(gpuEstimateRatio!==null&&gpuEstimateRatio>=0.8);
    this.pressureStreak=soft?this.pressureStreak+1:0;this.normalStreak=soft?0:this.normalStreak+1;
    if(hard||this.pressureStreak>=2){this.status=hard?'critical':'pressure';this.lastEviction=this.cache.evictTo(hard?0:Math.min(Math.round(this.cache.bytes*.70),Math.round(this.b.cpuCacheBytes*.50)));this.recommendedScale=Math.min(this.recommendedScale,.75);}
    else if(!soft&&this.status!=='normal')this.status=this.normalStreak>=60?'normal':'recovering';
    return {status:this.status,heapRatio,heapRatioMeasured:reliable,derivedRatio,gpuEstimateRatio,gpuRatioMeasured:false,
      freedBytes:this.lastEviction.freedBytes,cacheBytes:this.cache.bytes,qualityScale:this.recommendedScale};
  }
  recordFrame({frameMs,cpuSubmitMs,gpuMs=null}={}){
    if(!finite(frameMs)||frameMs>5000||!finite(cpuSubmitMs))throw RangeError('bad frame timing');
    this.lastCpuMs=cpuSubmitMs;this.gpuMeasured=gpuMs!==null;this.lastGpuMs=null;
    if(gpuMs!==null){if(!finite(gpuMs))throw RangeError('bad GPU timing');this.lastGpuMs=gpuMs;}
    this.samples.push(frameMs);if(this.samples.length>120)this.samples.shift();
    const slow=frameMs>this.b.targetFrameMs*1.20||cpuSubmitMs>this.b.cpuSubmitMs*1.6||(gpuMs!==null&&gpuMs>this.b.gpuTargetMs*1.2);
    if(slow){this.slowStreak++;this.fastStreak=0;}else{this.fastStreak++;this.slowStreak=0;}
    if(this.slowStreak>=18){this.recommendedScale=Math.max(.5,this.recommendedScale-.25);this.slowStreak=0;}
    if(this.fastStreak>=180&&this.status==='normal'){this.recommendedScale=Math.min(1,this.recommendedScale+.25);this.fastStreak=0;}
    const sorted=[...this.samples].sort((a,b)=>a-b);
    return {targetFrameMs:this.b.targetFrameMs,p95FrameMs:sorted.length?sorted[Math.ceil(sorted.length*.95)-1]:null,
      cpuSubmitMs:this.lastCpuMs,gpuMs:this.gpuMeasured?this.lastGpuMs:null,gpuMeasured:this.gpuMeasured,
      resolutionScale:this.recommendedScale,status:this.status};
  }
  estimateUploadAllowed({bytes,allocatedEstimateBytes=0}={}){
    if(!finite(bytes)||!finite(allocatedEstimateBytes))return {allowed:false,reason:'BAD_INPUT'};
    if(bytes>this.b.maxSingleUploadBytes)return {allowed:false,reason:'SPLIT_UPLOAD',chunkBytes:this.b.maxSingleUploadBytes};
    if(bytes+allocatedEstimateBytes>this.b.gpuWorkingSetEstimateBytes)return {allowed:false,reason:'GPU_BUDGET',chunkBytes:0};
    return {allowed:true,reason:'OK',chunkBytes:bytes};
  }
}
export class DiskPressureGuard {
  constructor(budgets=makeBudgets()){this.b=budgets;this.last=null;}
  // Observations are hints (StorageManager estimate may not be a filesystem-wide value).
  preflight({quotaBytes,usageBytes,plannedWriteBytes=0,measuredWriteBytesPerSec=null}={}){
    if(!finite(quotaBytes)||quotaBytes<=0||!finite(usageBytes)||!finite(plannedWriteBytes))return {allowed:false,reason:'STORAGE_UNKNOWN',canKeepEditingInMemory:true};
    const free=quotaBytes-usageBytes,ratio=usageBytes/quotaBytes;
    if(free-plannedWriteBytes<this.b.minDiskReserveBytes||ratio>this.b.maxDiskRatio)return {allowed:false,reason:'LOW_STORAGE',canKeepEditingInMemory:true,freeBytes:free};
    if(measuredWriteBytesPerSec!==null&&(!finite(measuredWriteBytesPerSec)||measuredWriteBytesPerSec<this.b.minWriteRateBytesPerSec))return {allowed:false,reason:'SLOW_DISK_DEFER_EXPORT',canKeepEditingInMemory:true,freeBytes:free};
    return {allowed:true,reason:'OK',canKeepEditingInMemory:true,freeBytes:free};
  }
}