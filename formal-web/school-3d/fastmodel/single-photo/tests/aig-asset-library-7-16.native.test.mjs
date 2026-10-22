import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,stat,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {resolveAIG716NativePath,createAIG716NativeLibrary}
 from '../aig-native-asset-library-7-16.mjs';
const work=async fn=>{
 const temp=await mkdtemp(join(tmpdir(),'aig716-native-'));
 try{return await fn(temp)}finally{await rm(temp,{recursive:true,force:true})}
};
test('external native Windows user data is never installed under EXE',()=>work(async temp=>{
 const install=join(temp,'Program Files','FastModel');
 const spec=resolveAIG716NativePath({
  platform:'win32',env:{LOCALAPPDATA:join(temp,'Users','AppData','Local')},
  home:temp,installDir:install
 });
 assert.equal(spec.outsideApplicationBinary,true);
 assert.equal(spec.root,resolve(temp,'Users','AppData','Local','AIG','FastModel','Library'));
 assert.equal(spec.root.startsWith(install),false);
 const lib=await createAIG716NativeLibrary(spec);
 const binary=Buffer.from('glTF_____sample_bounded_technical_content');
 const x=await lib.importBuffer(binary,{category:'character',
  title:'櫻花校園女主角',mime:'model/gltf-binary'});
 assert.equal(x.reviewStatus,'unreviewed');
 assert.equal(x.category,'character');
 assert.equal(x.sha256,'sha256:'+createHash('sha256').update(binary).digest('hex'));
 assert.deepEqual(await lib.getBuffer(x.id),binary);
 const y=await lib.importBuffer(binary,{category:'scene',
  title:'校園轉場人物',mime:'model/gltf-binary'});
 assert.equal(y.sha256,x.sha256);
 const stats=await lib.stats();
 assert.equal(stats.assets,2);
 assert.equal(stats.contentBlobs,1);
 assert.equal(stats.bytes,binary.length);
 assert.equal((await lib.list()).length,2);
 assert.ok((await stat(join(spec.root,'metadata','manifest.json'))).size>200);
 assert.equal((await stat(join(spec.root,'objects',x.filename))).size,binary.length);
 const check=JSON.parse(await readFile(join(spec.root,'metadata','manifest.json'),'utf8'));
 assert.equal(check.assets.length,2);
}));
test('Android host filesDir required, and must not be APK/install directory',()=>work(async temp=>{
 assert.throws(()=>resolveAIG716NativePath({
  platform:'android',home:temp,androidAppFilesDir:null
 }),/TRUSTED_APP_DATA_PATH_REQUIRED/);
 const spec=resolveAIG716NativePath({
  platform:'android',home:temp,
  androidAppFilesDir:join(temp,'data','user','0','ai.aig.fastmodel','files'),
  installDir:join(temp,'data','app','base.apk')
 });
 assert.ok(spec.root.includes('/AIG/FastModel/Library'));
 assert.ok(spec.androidRequiresHostFilesDir);
 const lib=await createAIG716NativeLibrary(spec);
 const map=Buffer.from('{"type":"FeatureCollection","features":[]}');
 const x=await lib.importBuffer(map,{category:'map',title:'校園地圖',
  mime:'application/json'});
 assert.equal(x.category,'map');
 assert.deepEqual(await lib.getBuffer(x.id),map);
}));
test('native store refuses invalid source, unsupported MIME, and install-path override',()=>work(async temp=>{
 assert.throws(()=>resolveAIG716NativePath({
  platform:'linux',home:temp,env:{XDG_DATA_HOME:join(temp,'app-bin')},
  installDir:join(temp,'app-bin')
 }),/OUTSIDE_INSTALL_DIRECTORY_REQUIRED/);
 const spec=resolveAIG716NativePath({platform:'linux',
  home:temp,env:{XDG_DATA_HOME:join(temp,'share')}}),
  lib=await createAIG716NativeLibrary(spec);
 await assert.rejects(()=>lib.importBuffer(Buffer.from('xx'),{
  category:'evil',title:'bad',mime:'text/javascript'
 }),/BOUNDED_NATIVE_IMPORT_REQUIRED/);
 await assert.rejects(()=>lib.importBuffer(Buffer.from('xx'),{
  category:'scene',title:'合法場景',mime:'application/x-msdownload'
 }),/BOUNDED_NATIVE_IMPORT_REQUIRED/);
 assert.equal((await lib.list()).length,0);
}));
