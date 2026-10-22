/**
 * FastModel 7.16 native OS USER-DATA library.
 * Node/desktop adapter only; never bundle into a browser script.
 *
 * Actual Android should supply context.getFilesDir()/... (outside APK),
 * Windows uses %LOCALAPPDATA%, Linux XDG_DATA_HOME. No executable path,
 * cwd, web static assets or app installation folder is a writable data root.
 */
import {homedir} from 'node:os';
import {resolve,join,sep,dirname} from 'node:path';
import {mkdir,readFile,writeFile,rename,open,stat} from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
export const AIG716_NATIVE_SCHEMA='AIG_FASTMODEL_7_16_USERDATA_NATIVE_LIBRARY';
const err=s=>{throw Error('AIG716_NATIVE_'+s)};
const pathInside=(child,parent)=>child===parent||child.startsWith(parent+sep);
const validRoot=s=>typeof s==='string'&&s.trim().length>1&&s.length<1024;
const categories=new Set(['character','building','map','scene',
 'transition','environment','animation']);
export function resolveAIG716NativePath({
 platform=process.platform,env=process.env,home=homedir(),
 androidAppFilesDir=null,installDir=null
}={}){
 let parent=null;
 if(platform==='win32')parent=env.LOCALAPPDATA||
  (validRoot(home)?join(home,'AppData','Local'):null);
 else if(platform==='android')parent=androidAppFilesDir;
 else if(platform==='linux'||platform==='darwin')
  parent=env.XDG_DATA_HOME||join(home,'.local','share');
 else err('UNSUPPORTED_PLATFORM');
 if(!validRoot(parent)||!resolve(parent).startsWith(resolve(home))&&
  platform!=='android')err('TRUSTED_APP_DATA_PATH_REQUIRED');
 const root=resolve(parent,'AIG','FastModel','Library');
 if(installDir&&pathInside(root,resolve(installDir)))
  err('OUTSIDE_INSTALL_DIRECTORY_REQUIRED');
 if(root===resolve('/')||root===resolve('.'))err('INVALID_DATA_ROOT');
 return Object.freeze({schema:AIG716_NATIVE_SCHEMA,root,
  relativeFolders:Object.freeze(['characters','buildings','maps',
   'scenes','transitions','environments','animations','metadata','objects']),
  outsideApplicationBinary:true,androidRequiresHostFilesDir:platform==='android'
 });
}
const legal=s=>typeof s==='string'&&/^[a-zA-Z0-9_-]{1,64}$/.test(s);
const mimeExt={
 'image/png':'.png','image/jpeg':'.jpg','image/webp':'.webp',
 'model/gltf-binary':'.glb','application/json':'.json',
 'video/mp4':'.mp4','video/webm':'.webm',
 'application/octet-stream':'.bin'
};
async function atomicWrite(file,contents){
 const tmp=file+'.tmp-'+randomUUID();
 try{
  const f=await open(tmp,'wx',0o600);
  try{await f.writeFile(contents);await f.sync();}finally{await f.close()}
  await rename(tmp,file);
 }catch(e){await import('node:fs/promises').then(f=>f.unlink(tmp)).catch(()=>{});
  throw e;
 }
}
export async function createAIG716NativeLibrary(rootSpec){
 if(rootSpec?.schema!==AIG716_NATIVE_SCHEMA||
  !rootSpec.outsideApplicationBinary||!validRoot(rootSpec.root))
  err('RESOLVED_APP_DATA_DIR_REQUIRED');
 const base=resolve(rootSpec.root);
 for(const folder of rootSpec.relativeFolders)await mkdir(join(base,folder),{
  recursive:true,mode:0o700});
 const manifestPath=join(base,'metadata','manifest.json');
 async function index(){
  try{
   const bytes=await readFile(manifestPath,'utf8');
   const doc=JSON.parse(bytes);
   if(doc.schema!==AIG716_NATIVE_SCHEMA||!Array.isArray(doc.assets))
    err('INVALID_METADATA_MANIFEST');
   return doc;
  }catch(e){
   if(e?.code==='ENOENT')return {schema:AIG716_NATIVE_SCHEMA,revision:0,assets:[]};
   throw e;
  }
 }
 const folderFor={
  character:'characters',building:'buildings',map:'maps',scene:'scenes',
  transition:'transitions',environment:'environments',animation:'animations'
 };
 return Object.freeze({
  schema:AIG716_NATIVE_SCHEMA,root:base,
  async importBuffer(data,{category,title,mime,source='USER_LOCAL'}={}){
   if(!Buffer.isBuffer(data)||data.length<1||data.length>64*1024*1024||
    !categories.has(category)||!legal(title?.replace(/ /g,'_')||'')||
    !mimeExt[mime]||!['USER_LOCAL','GENERATED_DERIVED'].includes(source))
    err('BOUNDED_NATIVE_IMPORT_REQUIRED');
   const sha='sha256:'+createHash('sha256').update(data).digest('hex'),
    filename=sha.slice(7)+mimeExt[mime],
    target=join(base,'objects',filename),current=await index();
   if(current.assets.length>=12000)err('ASSET_RECORD_LIMIT_REACHED');
   const match=current.assets.find(x=>x.sha256===sha);
   if(!match){
    const total=current.assets.reduce((a,b)=>a+b.bytes,0)+data.length;
    if(total>1024*1024*1024)err('STORAGE_QUOTA_EXPORT_ARCHIVE');
    // Existing objects are immutable, never write over already stored data.
    try{
     const fh=await open(target,'wx',0o600);
     try{await fh.writeFile(data);await fh.sync();}finally{await fh.close()}
    }catch(e){if(e?.code!=='EEXIST')throw e}
   }
   const item={id:randomUUID(),category,title,sha256:sha,filename,
    mime,bytes:data.length,source,reviewStatus:'unreviewed',
    relativeGroup:folderFor[category],revision:1,createdAt:new Date().toISOString()};
   // Storing flat index avoids copying multi-GB GLB payloads to every scene.
   const next={schema:AIG716_NATIVE_SCHEMA,
    revision:current.revision+1,assets:[...current.assets,item]};
   await atomicWrite(manifestPath,JSON.stringify(next,null,2));
   return Object.freeze({...item});
  },
  async list(){return (await index()).assets.map(x=>({...x}));},
  async getBuffer(id){
   const item=(await index()).assets.find(x=>x.id===id);
   if(!item)err('ASSET_NOT_FOUND');
   if(!/^[a-f0-9]{64}\.(png|jpg|webp|glb|json|mp4|webm|bin)$/.test(item.filename))
    err('PATH_TRAVERSAL_PROTECTION');
   const bytes=await readFile(join(base,'objects',item.filename));
   if('sha256:'+createHash('sha256').update(bytes).digest('hex')!==item.sha256)
    err('DIGEST_MISMATCH_PAYLOAD_MUST_NOT_BE_USED');
   return bytes;
  },
  async stats(){
   const all=(await index()).assets,unique=new Map();
   for(const x of all)unique.set(x.sha256,x.bytes);
   return {assets:all.length,contentBlobs:unique.size,
    bytes:[...unique.values()].reduce((a,b)=>a+b,0),
    outsideApplicationBinary:true,
    lazySourceRead:true,backgroundModelTraining:false};
  }
 });
}
