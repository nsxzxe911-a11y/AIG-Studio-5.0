/**
 * AIG Real3D 1.6 — finite GPU residency for independently sourced meshes.
 * This module does not change XYZ, triangles, animation state or materials.
 * Allocation is exact planned bytes; when the active scene exceeds budget,
 * fail closed rather than silently deleting visible mesh or claiming FPS.
 */
export const AIG16_GPU_RESIDENCY_SCHEMA='AIG_REAL3D_V1_6_GPU_RESIDENCY';
const MAX=128*1024*1024,MIN=1*1024*1024;
export function createAIG16GpuResidency({maxResidentBytes=32*1024*1024}={}){
 if(!Number.isSafeInteger(maxResidentBytes)||maxResidentBytes<MIN||maxResidentBytes>MAX)
  throw Error('AIG16_GPU_RESIDENCY_BUDGET_INVALID');
 let frame=0,bytes=0,peakBytes=0,uploads=0,evictions=0,explicitReleases=0;
 const resident=new Map();
 function beginFrame(){frame++;return frame;}
 function get(key){
  const r=resident.get(key);
  if(!r)return null;
  r.lastFrame=frame;
  return r.value;
 }
 function evict(key,reason){
  const r=resident.get(key);
  if(!r)return false;
  // Remove before disposing so reentrancy cannot double-charge memory.
  resident.delete(key);bytes-=r.bytes;
  r.dispose(r.value);
  if(reason==='budget')evictions++;
  else explicitReleases++;
  return true;
 }
 function reserve(key,size,make,dispose){
  if(key===null||typeof key!=='object'||!Number.isSafeInteger(size)||
   size<=0||size>maxResidentBytes||typeof make!=='function'||
   typeof dispose!=='function')
   throw Error('AIG16_GPU_UPLOAD_OVER_BUDGET_OR_INVALID');
  const old=get(key);
  if(old!==null)return old;
  // Protect any mesh already consumed in this frame. No invisible
  // downgrade/reuse of active scene data to appear faster.
  while(bytes+size>maxResidentBytes){
   let oldest=null,age=Infinity;
   for(const [candidate,r] of resident)if(r.lastFrame<frame&&r.lastFrame<age){
    oldest=candidate;age=r.lastFrame;
   }
   if(!oldest)throw Error('AIG16_GPU_ACTIVE_SCENE_RESIDENCY_BUDGET_BLOCKED');
   evict(oldest,'budget');
  }
  // The factory owns transactional GL buffer creation/partial cleanup.
  const value=make();
  resident.set(key,{value,bytes:size,dispose,lastFrame:frame});
  bytes+=size;peakBytes=Math.max(peakBytes,bytes);uploads++;
  return value;
 }
 function release(key){return evict(key,'explicit');}
 function clear(){
  // Release all resources even if one WebGL delete throws (best effort on
  // context loss). Normal caller must invoke while a valid GL context exists.
  for(const key of [...resident.keys()])release(key);
 }
 function stats(){return Object.freeze({
  schema:AIG16_GPU_RESIDENCY_SCHEMA,
  frame,activeMeshBuffers:resident.size,residentBytes:bytes,
  peakResidentBytes:peakBytes,maxResidentBytes,
  uploads,evictions,explicitReleases,
  gpuWorkloadMeasured:false,nativeGpuFpsVerified:false
 });}
 return Object.freeze({beginFrame,get,reserve,release,clear,stats});
}
