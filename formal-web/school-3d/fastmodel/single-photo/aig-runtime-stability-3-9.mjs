/**
 * Real3D 3.9: runtime stability gate for the ONE 19,200-slot logical kernel.
 * Thousands of logical shards do not increase physical CPU/GPU cores.
 * Source changes and hide actions invalidate in-flight work; one operation
 * owns the shared viewer at a time. No reset of the user GLB/world scene.
 */
export const AIG39_STABILITY_SCHEMA='AIG_REAL3D_3_9_SINGLE_KERNEL_STABILITY';
const fail=s=>{throw Error('AIG39_'+s)};
const acceptableLabels=new Set(['source-reconstruction','wardrobe-switch','hair-switch']);
export function createAIG39StabilitySession(){
 let active=null,generation=0,completed=0,blocked=0,cancelled=0;
 const snapshot=()=>Object.freeze({
  schema:AIG39_STABILITY_SCHEMA,
  activeJob:active?.label??null,generation,completed,blocked,cancelled,
  physicallyParallel12000CoresVerified:false,
  physicallyParallel19200CoresVerified:false,
  previousGLBAndWorldCleared:false
 });
 return Object.freeze({
  begin(label){
   if(!acceptableLabels.has(label))fail('UNKNOWN_OPERATION');
   if(active){blocked++;fail('OPERATION_ALREADY_IN_PROGRESS')}
   const controller=new AbortController();
   const token=Object.freeze({label,generation:++generation,
    signal:controller.signal});
   active={...token,controller};return token;
  },
  assertCurrent(token){
   if(!token||token.signal?.aborted||!active||
     token.generation!==active.generation){
    fail('STALE_OR_CANCELLED_RENDER_OPERATION');
   }
   return true;
  },
  finish(token){
   this.assertCurrent(token);
   active=null;completed++;
   return snapshot();
  },
  abandon(token){
   if(token&&active?.generation===token.generation){
    active.controller.abort();
    active=null;cancelled++;
    return true;
   }
   return false;
  },
  cancel(){
   if(!active)return false;
   active.controller.abort();
   active=null;cancelled++;
   return true;
  },
  snapshot
 });
}
/** Pure policy: cap actual scheduling lanes and time budget according to the
 * device's available evidence. This is NOT a measured FPS or VRAM claim.
 */
export function planAIG39ConservativeBudget({
 requestedLogicalSlots=19200,hardwareConcurrency=2,
 mobile=false,deviceMemoryGb=null,vertexCount
}={}){
 if(!Number.isInteger(requestedLogicalSlots)||
  requestedLogicalSlots<1||requestedLogicalSlots>120000||
  !Number.isInteger(vertexCount)||vertexCount<1)
   fail('VALID_VERTEX_AND_SLOT_COUNT_REQUIRED');
 const hardwareHint=Number.isFinite(hardwareConcurrency)?
  Math.max(1,Math.min(32,Math.floor(hardwareConcurrency))):2;
 const lowMemory=Number.isFinite(deviceMemoryGb)&&deviceMemoryGb<=2;
 const maxCooperativeLanes=lowMemory?1:mobile?2:4;
 const lanes=Math.min(maxCooperativeLanes,Math.max(1,
  Math.floor(hardwareHint/2)));
 const effectiveSlots=Math.min(vertexCount,requestedLogicalSlots);
 const suggestedYieldIntervalVertices=lowMemory?128:mobile?256:512;
 return Object.freeze({
  schema:AIG39_STABILITY_SCHEMA,
  requestedLogicalSlots,effectiveSlots,
  cappedCooperativeLanes:lanes,
  suggestedYieldIntervalVertices,
  originalImageMeshAndGLBMutationPermitted:false,
  realWebWorkersSpawned:0,hardwareCoreMultiplier:1,
  rendererContextsAllowed:1,measuredFps:null,
  automaticAllWardrobeAssetsLoadAllowed:false
 });
}
