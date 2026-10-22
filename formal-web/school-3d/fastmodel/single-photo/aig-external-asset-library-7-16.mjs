/**
 * FastModel 7.16 — local-first OUT-OF-BUNDLE asset library.
 * Browser: IndexedDB stores binary Blobs and metadata per origin, entirely
 * separate from installed JS/HTML. NOT a folder path on Windows/Android.
 * Native hosts should point a separate file-store at app user-data dir.
 * No external server upload, model training or auto-deletion of masters.
 */
export const AIG716_SCHEMA='AIG_FASTMODEL_7_16_EXTERNAL_ASSET_LIBRARY';
export const AIG716_CATEGORIES=Object.freeze([
 'character','building','map','scene','transition','environment','animation'
]);
export const AIG716_STATUSES=Object.freeze(['unreviewed','approved','rejected']);
const dbName='aig-fastmodel-library-7-16';
const version=1;
const MAX_SINGLE=64*1024*1024,MAX_TOTAL=1024*1024*1024,MAX_ITEMS=12000;
const fail=s=>{throw Error('AIG716_'+s);};
const categoryOk=c=>AIG716_CATEGORIES.includes(c);
const tagOk=s=>typeof s==='string'&&/^[\p{L}\p{N}_-]{1,50}$/u.test(s);
const cleanName=s=>typeof s==='string'?
 s.normalize('NFC').replace(/[\u0000-\u001f<>:"/\\|?*]/g,'_').slice(0,160):'';
const acceptedTypes=new Set([
 'model/gltf-binary','model/gltf+json','application/json',
 'image/png','image/jpeg','image/webp','video/mp4','video/webm',
 'application/octet-stream','text/plain'
]);
const sanitizeText=s=>typeof s==='string'&&s.trim().length>0&&
 s.length<=512?s.trim():null;
const shaHex=buf=>Array.from(new Uint8Array(buf),n=>n.toString(16).padStart(2,'0')).join('');
const txDone=tx=>new Promise((resolve,reject)=>{
 tx.oncomplete=()=>resolve();
 tx.onerror=()=>reject(tx.error||Error('AIG716_TRANSACTION_FAILED'));
 tx.onabort=()=>reject(tx.error||Error('AIG716_TRANSACTION_ABORTED'));
});
const req=r=>new Promise((resolve,reject)=>{
 r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
});
const openDB=()=>new Promise((resolve,reject)=>{
 if(typeof indexedDB==='undefined')return reject(Error('AIG716_INDEXED_DB_UNAVAILABLE'));
 const q=indexedDB.open(dbName,version);
 q.onupgradeneeded=()=>{
  const db=q.result;
  const assets=db.createObjectStore('assets',{keyPath:'id'});
  assets.createIndex('category','category');
  assets.createIndex('sha','sha256');
  assets.createIndex('updatedAt','updatedAt');
  db.createObjectStore('payloads',{keyPath:'sha256'});
  db.createObjectStore('meta',{keyPath:'key'});
 };
 q.onsuccess=()=>resolve(q.result);
 q.onerror=()=>reject(q.error);
 q.onblocked=()=>reject(Error('AIG716_DATABASE_BLOCKED_BY_OTHER_TAB'));
});
const close=db=>{try{db.close()}catch{}};
const iso=()=>new Date().toISOString();
const uid=()=>crypto.randomUUID?.()||('asset-'+Date.now()+'-'+Math.random().toString(16).slice(2));
const cloneAsset=record=>record?Object.freeze({
 id:record.id,title:record.title,category:record.category,
 sha256:record.sha256,bytes:record.bytes,mime:record.mime,
 tags:Object.freeze([...(record.tags||[])]),
 source:record.source,reviewStatus:record.reviewStatus,
 revision:record.revision,reuseCount:record.reuseCount,
 createdAt:record.createdAt,updatedAt:record.updatedAt,
 derivedFrom:record.derivedFrom??null,modelAccuracy:record.modelAccuracy,
 coordinateUnits:record.coordinateUnits
}):null;
function validateMeta({category,title,tags=[],source='USER_LOCAL',
 reviewStatus='unreviewed',derivedFrom=null,
 modelAccuracy='NOT_VERIFIED',coordinateUnits='UNKNOWN'}){
 if(!categoryOk(category))fail('CATEGORY_REQUIRED');
 if(!sanitizeText(title))fail('TITLE_REQUIRED');
 if(!Array.isArray(tags)||tags.length>25||!tags.every(tagOk))
  fail('TAGS_INVALID');
 if(!['USER_LOCAL','GENERATED_DERIVED','CAD_MEASURED','IMPORTED_GEOJSON']
  .includes(source)||!AIG716_STATUSES.includes(reviewStatus)||
  reviewStatus!=='unreviewed'|| // Never silently approve imported data.
  derivedFrom!==null&&!(typeof derivedFrom==='string'&&derivedFrom.length<150)||
  !['NOT_VERIFIED','ESTIMATED','CALIBRATED_MEASURED'].includes(modelAccuracy)||
  !['UNKNOWN','RELATIVE','MM','METRES','WGS84'].includes(coordinateUnits))
  fail('PROVENANCE_OR_REVIEW_INVALID');
 return {category,title:sanitizeText(title),tags:[...new Set(tags)],
  source,reviewStatus,derivedFrom,modelAccuracy,coordinateUnits};
}
function getAll(store){
 return new Promise((resolve,reject)=>{
  const arr=[],cursor=store.openCursor();
  cursor.onerror=()=>reject(cursor.error);
  cursor.onsuccess=()=>{const c=cursor.result;
   if(c){arr.push(c.value);c.continue()}else resolve(arr);
  };
 });
}
export async function openAIG716AssetLibrary(){
 const db=await openDB();
 const api={
  schema:AIG716_SCHEMA,
  async importBlob(blob,opts={}){
   if(!(blob instanceof Blob)||!Number.isSafeInteger(blob.size)||
    blob.size<1||blob.size>MAX_SINGLE)fail('BLOB_MUST_BE_BOUNDED_64MIB');
   const mime=blob.type||'application/octet-stream';
   if(!acceptedTypes.has(mime))fail('UNSUPPORTED_ASSET_MEDIA_TYPE');
   const detail=validateMeta(opts);
   const buf=await blob.arrayBuffer();
   const sha256='sha256:'+shaHex(await crypto.subtle.digest('SHA-256',buf));
   // The full Blob is never copied into the program bundle; if the same
   // source bytes appear in many scenes, store just one payload.
   const records=await api.list({limit:MAX_ITEMS});
   if(records.length>=MAX_ITEMS)fail('ITEM_COUNT_LIMIT_NO_DELETION');
   const existing=await req(db.transaction('payloads','readonly')
    .objectStore('payloads').get(sha256));
   let usedBytes=existing?0:blob.size;
   if(usedBytes){
    const all=await getAll(db.transaction('payloads','readonly')
     .objectStore('payloads'));
    usedBytes+=all.reduce((a,p)=>a+p.bytes,0);
   }
   if(usedBytes>MAX_TOTAL)fail('STORAGE_BUDGET_REACHED_EXPORT_OR_ARCHIVE');
   const id=uid(),now=iso();
   const item={id,...detail,title:cleanName(detail.title),
    sha256,bytes:blob.size,mime,
    createdAt:now,updatedAt:now,revision:1,reuseCount:0,
    learningNote:'ONLY_APPROVED_METADATA_REUSE_NO_MODEL_TRAINING'};
   const tx=db.transaction(['assets','payloads'],'readwrite');
   if(!existing)tx.objectStore('payloads').put({
    sha256,bytes:blob.size,blob:new Blob([buf],{type:mime})
   });
   tx.objectStore('assets').put(item);
   await txDone(tx);return cloneAsset(item);
  },
  async list({category=null,limit=100,reviewStatus=null}={}){
   if(category!==null&&!categoryOk(category)||
    !Number.isInteger(limit)||limit<1||limit>MAX_ITEMS||
    reviewStatus!==null&&!AIG716_STATUSES.includes(reviewStatus))
    fail('QUERY_INVALID');
   const tx=db.transaction('assets','readonly'),store=tx.objectStore('assets');
   const all=await getAll(category?store.index('category'):store);
   return all.filter(x=>!category||x.category===category)
    .filter(x=>!reviewStatus||x.reviewStatus===reviewStatus)
    .sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))
    .slice(0,limit).map(cloneAsset);
  },
  async get(id,{includePayload=false}={}){
   if(typeof id!=='string'||!id||id.length>150)fail('ASSET_ID_REQUIRED');
   const x=await req(db.transaction('assets','readonly')
    .objectStore('assets').get(id));
   if(!x)return null;
   if(!includePayload)return cloneAsset(x);
   const p=await req(db.transaction('payloads','readonly')
    .objectStore('payloads').get(x.sha256));
   if(!p?.blob)fail('MISSING_PAYLOAD_NO_FAKE_RECOVERY');
   return {asset:cloneAsset(x),blob:p.blob};
  },
  async approve(id,{reviewed=false}={}){
   if(reviewed!==true)fail('EXPLICIT_USER_REVIEW_REQUIRED');
   const tx=db.transaction('assets','readwrite'),store=tx.objectStore('assets'),
    entry=await req(store.get(id));
   if(!entry){tx.abort();fail('ASSET_NOT_FOUND')}
   entry.reviewStatus='approved';entry.revision++;
   entry.updatedAt=iso();store.put(entry);
   await txDone(tx);return cloneAsset(entry);
  },
  async suggest({category,tags=[],limit=6}={}){
   if(!categoryOk(category)||!Array.isArray(tags)||!tags.every(tagOk)||
    !Number.isInteger(limit)||limit<1||limit>30)fail('REUSE_QUERY_INVALID');
   const approved=await api.list({category,reviewStatus:'approved',limit:MAX_ITEMS});
   return approved.map(item=>({item,score:tags.filter(t=>item.tags.includes(t)).length*10+
    Math.min(5,item.reuseCount)}))
    .filter(x=>x.score>0)
    .sort((a,b)=>b.score-a.score)
    .slice(0,limit).map(x=>({...x.item,reuseScore:x.score,
     reason:'APPROVED_TAG_MATCH_ONLY_NOT_AI_MODEL_TRAINING'}));
  },
  async recordReuse(id){
   const tx=db.transaction('assets','readwrite'),store=tx.objectStore('assets'),
    entry=await req(store.get(id));
   if(!entry){tx.abort();fail('ASSET_NOT_FOUND')}
   if(entry.reviewStatus!=='approved'){
    tx.abort();fail('UNREVIEWED_ASSET_CANNOT_AUTO_REUSE');
   }
   entry.reuseCount=Math.min(1000000,entry.reuseCount+1);
   entry.revision++;entry.updatedAt=iso();store.put(entry);
   await txDone(tx);return cloneAsset(entry);
  },
  async estimate(){
   const tx=db.transaction(['assets','payloads'],'readonly');
   const [assets,payloads]=await Promise.all([
    getAll(tx.objectStore('assets')),getAll(tx.objectStore('payloads'))
   ]);
   return Object.freeze({schema:AIG716_SCHEMA,assetRecords:assets.length,
    distinctPayloads:payloads.length,
    storedPayloadBytes:payloads.reduce((v,p)=>v+p.bytes,0),
    duplicateBytesAvoided:assets.reduce((a,x)=>a+x.bytes,0)-
     payloads.reduce((v,p)=>v+p.bytes,0),
    embeddedInMainProgramBundle:false,
    alwaysLoadsPayloadsAtStartup:false,
    automaticModelWeightTraining:false,
    permanentStorageGuaranteed:false});
  },
  async requestPersistence(){
   if(typeof navigator==='undefined'||!navigator.storage?.persist)
    return {persistent:false,reason:'STORAGE_PERSISTENCE_API_UNSUPPORTED'};
   const persistent=await navigator.storage.persist();
   return {persistent,reason:persistent?
    'BROWSER_GRANTED_PERSISTENT_ORIGIN_STORAGE':
    'BROWSER_MAY_EVICT_UNDER_STORAGE_PRESSURE_EXPORT_BACKUP'};
  },
  close(){close(db)}
 };
 return Object.freeze(api);
}
