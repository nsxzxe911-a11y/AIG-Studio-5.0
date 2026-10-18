/* AIG-II portable-project contract V2.
   Local-only, explicit transfer. No Google token, background network request, or CNC output.
   Web localStorage is NOT the native Android/Windows app's storage. */
(function(root){
"use strict";
const SCHEMA="AIG-PROJECT-TRANSFER-2";
const LEGACY="AIG-WEB-PROJECT-1";
const MAX_SIZE=8*1024*1024;
const FIELDS=Object.freeze({
 project:"aig-project-meta-v1",
 cad:"aig-cad-draft-v1",
 cam:"aig-cam-toolpath-v1",
 stock:"aig-stock-v1",
 assembly:"aig-assembly-v1",
 tools:"aig-tool-table-v1",
 wcs:"aig-wcs-v1",
 connections:"aig-domain-routing-v1",
 "nc-3AX":"aig-code-3AX","nc-4AX":"aig-code-4AX",
 "nc-5AX":"aig-code-5AX","nc-6AX":"aig-code-6AX"
});
const KEYS=Object.values(FIELDS);
const ALLOWED=new Set(KEYS);
const hasOwn=(obj,key)=>Object.prototype.hasOwnProperty.call(obj,key);
function fail(message){throw Error(message)}
function requireHashSupport(){
 if(!root.crypto||!root.crypto.subtle||!root.TextEncoder)fail("目前瀏覽器無法執行 SHA-256 驗證，沒有套用任何資料。");
}
async function sha256(text){
 requireHashSupport();
 const data=new root.TextEncoder().encode(text);
 const result=await root.crypto.subtle.digest("SHA-256",data);
 return Array.from(new Uint8Array(result)).map(x=>x.toString(16).padStart(2,"0")).join("");
}
function readEntries(store){
 const entries={};
 for(const key of KEYS){
  const value=store.getItem(key);
  if(value!==null)entries[key]=value;
 }
 return entries;
}
function validateEntries(input){
 if(!input||typeof input!=="object"||Array.isArray(input))fail("專案內容格式不正確，原有資料未更改。");
 const out={};
 for(const key of Object.keys(input)){
  if(!ALLOWED.has(key))fail("檔案包含未知資料欄位，已阻止匯入。");
  const value=input[key];
  if(typeof value!=="string"||value.length>MAX_SIZE)fail("資料欄位格式或大小不符合規格。");
  out[key]=value;
 }
 if(Object.keys(out).length===0)fail("檔案沒有可匯入的資料。");
 return out;
}
function validateJsonFields(entries){
 for(const [field,key] of Object.entries(FIELDS)){
  const raw=entries[key];
  if(raw==null||field.startsWith("nc-"))continue;
  try{const o=JSON.parse(raw);if(o!==null&&(typeof o!=="object"||Array.isArray(o)))fail("資料欄位格式不正確："+field)}
  catch(e){fail("資料欄位 JSON 無效："+field)}
 }
}
async function exportProject(store,now){
 const entries=readEntries(store);
 if(Object.keys(entries).length===0)fail("目前沒有已儲存的專案內容，請先在 CAD／CAM／NC 工作區儲存。");
 validateJsonFields(entries);
 const exportedAt=new Date(now==null?Date.now():now).toISOString();
 const base={schema:SCHEMA,version:2,product:"AIG-II",exportedAt,revision:0,entries};
 try{
  const m=entries[FIELDS.project]?JSON.parse(entries[FIELDS.project]):null;
  if(m&&Number.isSafeInteger(m.revision)&&m.revision>=0)base.revision=m.revision;
 }catch(_){}
 return {...base,digest:{algorithm:"SHA-256",value:await sha256(JSON.stringify(entries))}};
}
function legacyEntries(obj){
 const out={};
 const map={project:"project",cad:"cad",cam:"cam",stock:"stock",assembly:"assembly",tools:"tools",wcs:"wcs"};
 for(const [key,field] of Object.entries(map)){
  if(hasOwn(obj,field)&&obj[field]!==null&&obj[field]!==undefined)
   out[FIELDS[key]]=JSON.stringify(obj[field]);
 }
 if(obj.nc&&typeof obj.nc==="object"&&!Array.isArray(obj.nc)){
  for(const axis of ["3AX","4AX","5AX","6AX"]){
   if(typeof obj.nc[axis]==="string")out[FIELDS["nc-"+axis]]=obj.nc[axis];
  }
 }
 return out;
}
async function inspectFile(source,store){
 if(typeof source!=="string"||source.length>MAX_SIZE)fail("檔案超過 8 MB 上限或格式不正確。");
 let obj;try{obj=JSON.parse(source)}catch(_){fail("無法解析 JSON，原資料沒有變更。")}
 if(!obj||typeof obj!=="object"||Array.isArray(obj))fail("檔案必須是專案物件。");
 let entries,verified=false;
 if(obj.schema===SCHEMA){
  if(obj.version!==2)fail("不支援的版本，未套用。");
  entries=validateEntries(obj.entries);
  if(obj.digest?.algorithm!=="SHA-256"||!/^[a-f0-9]{64}$/.test(String(obj.digest.value||"")))fail("SHA-256 摘要缺失或格式不符。");
  const digest=await sha256(JSON.stringify(entries));
  if(digest!==obj.digest.value)fail("檔案 SHA-256 不一致，阻止匯入。");
  verified=true;
 }else if(obj.schema===LEGACY){
  entries=validateEntries(legacyEntries(obj));
 }else fail("不支援的專案格式，原資料沒有變更。");
 validateJsonFields(entries);
 const baseline={},conflicts=[];
 for(const [key,value] of Object.entries(entries)){
  const current=store.getItem(key);
  baseline[key]=current;
  if(current!==null&&current!==value)conflicts.push(key);
 }
 return {schema:obj.schema,verified,entries,baseline,conflicts,
  present:Object.keys(entries),exportedAt:String(obj.exportedAt||"未提供"),
  projectName:tryName(entries)};
}
function tryName(entries){
 try{return String(JSON.parse(entries[FIELDS.project]||"{}").name||"未命名專案").slice(0,80)}
 catch(_){return"未命名專案"}
}
function applyFile(plan,store,mode){
 if(!plan||!plan.entries||!plan.baseline)fail("請先檢查檔案。");
 if(mode!=="replace"&&mode!=="keep")fail("請明確選擇衝突處理方式。");
 // Reject concurrent edits after preview so no active work is silently overwritten.
 for(const [key,current] of Object.entries(plan.baseline)){
  if(store.getItem(key)!==current)fail("預覽後本機資料已變更，請重新讀取檔案。");
 }
 const writes={};
 for(const [key,value] of Object.entries(plan.entries)){
  if(!ALLOWED.has(key)||typeof value!=="string")fail("資料不符合合約。");
  if(mode==="keep"&&store.getItem(key)!==null)continue;
  if(store.getItem(key)===value)continue;
  writes[key]=value;
 }
 const keys=Object.keys(writes);
 if(!keys.length)return {changed:0,skipped:Object.keys(plan.entries).length,backupKey:null};
 const before={};
 for(const key of keys)before[key]=store.getItem(key);
 const backupKey="aigii.transfer.backup."+new Date().toISOString().replace(/[:.]/g,"-");
 const backup={schema:"AIG-LOCAL-RESTORE-1",createdAt:new Date().toISOString(),
  original:before,affectedKeys:keys};
 // Backup must be successfully committed BEFORE any imported value is applied.
 try{store.setItem(backupKey,JSON.stringify(backup))}
 catch(_){fail("本機空間不足，無法完成覆蓋前備份；未更改專案。")}
 const changed=[];
 try{
  for(const key of keys){store.setItem(key,writes[key]);changed.push(key)}
 }catch(e){
  for(const key of changed.reverse()){
   try{if(before[key]===null)store.removeItem(key);else store.setItem(key,before[key])}catch(_){}
  }
  fail("寫入失敗，已嘗試還原舊資料。請檢查本機空間及備份。");
 }
 return {changed:changed.length,skipped:Object.keys(plan.entries).length-changed.length,backupKey};
}
function restoreLocalBackup(store,backupKey){
 if(!/^aigii\.transfer\.backup\.[\w-]+$/.test(backupKey))fail("備份識別不正確。");
 const raw=store.getItem(backupKey);
 if(!raw)fail("本機備份不存在。");
 let backup;try{backup=JSON.parse(raw)}catch(_){fail("備份檔案損壞。")}
 if(backup.schema!=="AIG-LOCAL-RESTORE-1"||!Array.isArray(backup.affectedKeys)||!backup.original)fail("備份格式錯誤。");
 for(const key of backup.affectedKeys)if(!ALLOWED.has(key))fail("備份存在未知欄位。");
 const inverse={};
 for(const key of backup.affectedKeys)inverse[key]=store.getItem(key);
 const recoveryKey="aigii.transfer.backup."+new Date(Date.now()+1).toISOString().replace(/[:.]/g,"-");
 store.setItem(recoveryKey,JSON.stringify({schema:"AIG-LOCAL-RESTORE-1",createdAt:new Date().toISOString(),original:inverse,affectedKeys:backup.affectedKeys}));
 for(const key of backup.affectedKeys){if(backup.original[key]===null)store.removeItem(key);else store.setItem(key,backup.original[key])}
 return {restored:backup.affectedKeys.length,recoveryKey};
}
root.AIGProjectTransfer=Object.freeze({SCHEMA,FIELDS,KEYS,MAX_SIZE,sha256,readEntries,
 exportProject,inspectFile,applyFile,restoreLocalBackup,tryName});
})(typeof window!=="undefined"?window:globalThis);
