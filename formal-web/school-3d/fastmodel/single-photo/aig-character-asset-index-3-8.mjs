/**
 * Real3D 3.8 — tiny source-safe manifest index for large wardrobes,
 * hairstyles and accessories. NO asset bytes/GPU geometries are loaded here.
 * The visible outfit/hair is a separate runtime attachment; no alterations
 * to the source photo, character body mesh, body rig or original GLB.
 */
export const AIG38_ASSET_SCHEMA='AIG_REAL3D_3_8_LAZY_CHARACTER_ASSET_INDEX';
export const AIG38_ROLE_SLOTS=Object.freeze([
 'outfit','upper','outer','lower','fullbody','legwear','footwear',
 'bag','hat','eyewear','earrings','neckwear','wrist','handheld','hair'
]);
const roles=new Set(AIG38_ROLE_SLOTS);
const allowedStatus=new Set(['installed','pending','blocked']);
const idPattern=/^[a-z0-9][a-z0-9._:-]{1,127}$/;
const fail=code=>{throw Error('AIG38_'+code)};
const normalize=s=>(String(s??'')).trim().toLocaleLowerCase('zh-Hant');
function cleanRecord(raw){
 if(!raw||!idPattern.test(raw.id)||!roles.has(raw.slot)||
  typeof raw.title!=='string'||!raw.title.trim()||
  raw.title.length>160||!allowedStatus.has(raw.status)||
  !Number.isInteger(raw.version)||raw.version<1)
  fail('INVALID_ASSET_MANIFEST');
 if(raw.estimatedGpuBytes!==undefined&&
  (!Number.isInteger(raw.estimatedGpuBytes)||
   raw.estimatedGpuBytes<0||
   raw.estimatedGpuBytes>2_147_483_647))
  fail('INVALID_GPU_BUDGET_ESTIMATE');
 const tags=raw.tags??[];
 if(!Array.isArray(tags)||tags.length>16||tags.some(
  t=>typeof t!=='string'||!t||t.length>50))
  fail('INVALID_TAGS');
 // A URI is merely a trusted registry reference, not fetched by this index.
 if(raw.assetRef!==undefined&&(!idPattern.test(raw.assetRef)))
  fail('INVALID_SOURCE_ASSET_REFERENCE');
 return Object.freeze({
  id:raw.id,title:raw.title.trim(),slot:raw.slot,
  status:raw.status,version:raw.version,
  tags:Object.freeze([...tags]),
  assetRef:raw.assetRef??null,
  estimatedGpuBytes:raw.estimatedGpuBytes??null,
  humanReviewed:raw.humanReviewed===true
 });
}
/**
 * In-memory manifest metadata only. Frontend pages render a small window,
 * never thousands of thumbnails/meshes. Full-body and upper/lower garment
 * layers are mutually exclusive; one hair asset per character.
 */
export class AIG38CharacterAssetIndex{
 constructor({maxVisibleAssets=12,maxEstimatedGpuBytes=96*1024*1024}={}){
  if(!Number.isInteger(maxVisibleAssets)||maxVisibleAssets<1||
   maxVisibleAssets>32||!Number.isInteger(maxEstimatedGpuBytes)||
   maxEstimatedGpuBytes<1024)fail('INVALID_RUNTIME_LIMITS');
  this.records=new Map();this.active=new Map();
  this.maxVisibleAssets=maxVisibleAssets;
  this.maxEstimatedGpuBytes=maxEstimatedGpuBytes;
 }
 register(record){
  const item=cleanRecord(record),before=this.records.get(item.id);
  if(before&&item.version<=before.version)
   fail('ASSET_VERSION_MUST_INCREASE');
  this.records.set(item.id,item);
  return Object.freeze({registered:item.id,metadataCount:this.records.size,
   sourceBytesLoaded:0,gpuGeometryLoaded:0});
 }
 page({slot=null,query='',offset=0,limit=16,installedOnly=false}={}){
  if(slot!==null&&!roles.has(slot)||typeof query!=='string'||
   query.length>128||!Number.isInteger(offset)||offset<0||
   !Number.isInteger(limit)||limit<1||limit>48)
   fail('INVALID_PAGE_ARGUMENTS');
  const needle=normalize(query),matched=[];
  for(const asset of this.records.values()){
   if(slot&&asset.slot!==slot||installedOnly&&asset.status!=='installed')
    continue;
   if(needle&&!normalize(asset.title+' '+asset.id+' '+asset.tags.join(' ')).includes(needle))
    continue;
   matched.push(asset);
  }
  // Deterministic browsing; no full-size images/GPU meshes allocated.
  matched.sort((a,b)=>a.slot.localeCompare(b.slot)||a.id.localeCompare(b.id));
  return Object.freeze({schema:AIG38_ASSET_SCHEMA,
   totalMatched:matched.length,totalIndexed:this.records.size,
   offset,pageSize:Math.min(limit,48),items:Object.freeze(
    matched.slice(offset,offset+limit)),
   actualSourceMeshesLoadedByIndex:0,
   currentActiveIds:Object.freeze([...this.active.keys()])});
 }
 /** Pure dry-run; actual renderer must separately attach loaded GLBs/meshes.
  * Replacement is transactional: a conflicting item is only removed after
  * all checks pass. Unknown GPU estimates fail closed under a tight budget.
  */
 planWear(assetId,{allowUnknownSize=false}={}){
  const item=this.records.get(assetId);
  if(!item)fail('ASSET_NOT_INDEXED');
  if(item.status!=='installed'||!item.assetRef)
   fail('REAL_ASSET_NOT_INSTALLED');
  if(item.estimatedGpuBytes===null&&!allowUnknownSize)
   fail('GPU_COST_MUST_BE_KNOWN');
  const next=new Map(this.active),exclusive=new Set(['hair','outfit','fullbody']);
  if(exclusive.has(item.slot))for(const [id,old] of next){
   if(old.slot===item.slot)next.delete(id);
  }
  if(item.slot==='fullbody'){
   for(const [id,old] of next)if(['upper','lower','outfit'].includes(old.slot))
    next.delete(id);
  }
  if(['upper','lower','outfit'].includes(item.slot)){
   for(const [id,old] of next)if(old.slot==='fullbody')next.delete(id);
  }
  if(item.slot==='outfit'){
   for(const [id,old] of next)if(['upper','lower'].includes(old.slot))
    next.delete(id);
  }
  if(['upper','lower'].includes(item.slot)){
   for(const [id,old] of next)if(old.slot==='outfit'||old.slot===item.slot)
    next.delete(id);
  }
  // Accessories default one per slot, but independent accessory slots stay.
  if(!['hair','outfit','fullbody','upper','lower'].includes(item.slot))
   for(const [id,old] of next)if(old.slot===item.slot)next.delete(id);
  next.set(item.id,item);
  const usage=[...next.values()].reduce((total,a)=>
   total+(a.estimatedGpuBytes??this.maxEstimatedGpuBytes+1),0);
  if(next.size>this.maxVisibleAssets||usage>this.maxEstimatedGpuBytes)
   fail('ACTIVE_ASSET_GPU_OR_COUNT_BUDGET_BLOCKED');
  return Object.freeze({schema:AIG38_ASSET_SCHEMA,
   proposedAssetIds:Object.freeze([...next.keys()]),
   removedAssetIds:Object.freeze([...this.active.keys()].filter(
    id=>!next.has(id))),
   estimatedGpuBytes:usage,availableGpuBudgetBytes:this.maxEstimatedGpuBytes,
   bodyMeshWillChange:false,photoWillChange:false,
   renderingAssetActuallyAttached:false});
 }
 /** Commit index only after the frontend loads + validates the real mesh.
  * Does not itself prove collision, bone bindings, or screen rendering.
  */
 commitWear(assetId,realMeshReady=false){
  if(realMeshReady!==true)fail('REAL_MESH_LOAD_REQUIRED');
  const planned=this.planWear(assetId);
  this.active=new Map(planned.proposedAssetIds.map(
   id=>[id,this.records.get(id)]));
  return Object.freeze({...planned,activeIndexCommitted:true,
   bodyMeshWillChange:false});
 }
 remove(assetId){
  if(!this.active.has(assetId))return false;
  this.active.delete(assetId);return true;
 }
 snapshot(){
  return Object.freeze({schema:AIG38_ASSET_SCHEMA,
   totalIndexed:this.records.size,activeCount:this.active.size,
   activeIds:Object.freeze([...this.active.keys()]),
   indexedAssetsAreMetadataNotLoadedMeshes:true,
   actualGpuAssetMemoryMeasured:false,
   bodySourceAndRigUnmodified:true});
 }
}
export function createAIG38CharacterCatalog(){
 const index=new AIG38CharacterAssetIndex();
 for(const [id,title] of [
  ['uniform','校園制服套裝'],['casual','日常便服套裝'],
  ['sport','運動服套裝']
 ]){
  index.register({id:'procedural:'+id,slot:'outfit',title,
   status:'installed',version:1,assetRef:'real3d:procedural:'+id,
   tags:['現有技術版','可更換'],estimatedGpuBytes:2*1024*1024,
   humanReviewed:false});
 }
 for(const [id,title] of [
  ['long','長髮'],['ponytail','馬尾'],['short','短髮'],
  ['twintails','雙馬尾'],['bangs','瀏海變體']
 ]){
  index.register({id:'planned:'+id,slot:'hair',title,
   status:'pending',version:1,tags:['尚未有可用的真 3D 資產']});
 }
 return index;
}
