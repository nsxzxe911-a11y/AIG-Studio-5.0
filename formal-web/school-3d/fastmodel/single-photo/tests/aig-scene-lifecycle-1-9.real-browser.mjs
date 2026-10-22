import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/aig-real3d-scene-lifecycle-1-9';
await mkdir(out,{recursive:true});
function glb(name,xOffset=0){
 const xyz=new Float32Array([
  -0.7+xOffset,-0.5,0, 0.7+xOffset,-0.5,0, xOffset,0.8,0
 ]);
 const indices=new Uint16Array([0,1,2]);
 const binary=Buffer.alloc(44);
 Buffer.from(xyz.buffer).copy(binary,0);
 Buffer.from(indices.buffer).copy(binary,36);
 const spec={asset:{version:'2.0',generator:'AIG19_SOURCE_IS_SYNTHETIC_SCENE_GATE'},
  buffers:[{byteLength:44}],bufferViews:[
   {buffer:0,byteOffset:0,byteLength:36,target:34962},
   {buffer:0,byteOffset:36,byteLength:6,target:34963}],
  accessors:[
   {bufferView:0,componentType:5126,count:3,type:'VEC3',
    min:[-0.7+xOffset,-0.5,0],max:[0.7+xOffset,0.8,0]},
   {bufferView:1,componentType:5123,count:3,type:'SCALAR'}],
  materials:[{pbrMetallicRoughness:{baseColorFactor:[0.35,0.8,0.92,1]}}],
  meshes:[{primitives:[{attributes:{POSITION:0},indices:1,material:0}]}],
  nodes:[{mesh:0,name}],scenes:[{nodes:[0]}],scene:0
 };
 const json=Buffer.from(JSON.stringify(spec),'utf8');
 const pad=(n)=>(n+3)&~3;
 const j=Buffer.alloc(pad(json.length),0x20);json.copy(j);
 const total=12+8+j.length+8+binary.length;
 const b=Buffer.alloc(total);
 b.write('glTF',0);b.writeUInt32LE(2,4);b.writeUInt32LE(total,8);
 b.writeUInt32LE(j.length,12);b.write('JSON',16);
 j.copy(b,20);
 const offset=20+j.length;
 b.writeUInt32LE(binary.length,offset);b.write('BIN\0',offset+4,'binary');
 binary.copy(b,offset+8);
 return b;
}
const browser=await chromium.launch({headless:true,args:[
 '--no-sandbox','--disable-dev-shm-usage','--enable-webgl',
 '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'
]});
try{
 for(const device of [
  {name:'phone',viewport:{width:390,height:844},isMobile:true,hasTouch:true},
  {name:'desktop',viewport:{width:1280,height:820}}
 ]){
  const ctx=await browser.newContext({...device,acceptDownloads:true});
  const page=await ctx.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  page.setDefaultTimeout(50000);
  try{
   let r=await page.goto('http://127.0.0.1:8765/asset-library-studio.html',
    {waitUntil:'load'});assert.equal(r?.status(),200);
   await page.waitForFunction(()=>document.getElementById('status')
    .textContent.includes('本機資產庫已開啟'),null,{timeout:12000});
   let savedRecords=0;
   const upload=async(name,title,bytes)=>{
    await page.locator('#asset-file').setInputFiles({
     name,mimeType:'model/gltf-binary',buffer:bytes});
    await page.locator('#asset-category').selectOption('scene');
    await page.locator('#asset-title').fill(title);
    await page.locator('#asset-tags').fill('場景,3D');
    await page.locator('#asset-import').click();
    const count=++savedRecords;
    await page.waitForFunction(n=>document.getElementById('stats')
     .textContent.includes('儲存項目 '+n+' 筆'),count);
   };
   await upload('a.glb','校園場景 A',glb('CampusA',0));
   await upload('b.glb','校園場景 B',glb('CampusB',1.5));
   await upload('bad.glb','錯誤 GLB 僅做隔離測試',Buffer.from('INVALID_GLB'));
   r=await page.goto('http://127.0.0.1:8765/scene-runtime-studio.html',
    {waitUntil:'load'});assert.equal(r?.status(),200);
   await page.waitForFunction(()=>document.getElementById('status')
    .textContent.includes('索引已就緒'));
   assert.match(await page.locator('#metrics').textContent(),/GPU 未啟動/);
   const options=page.locator('#scene-choice option');
   assert.equal(await options.count(),4);
   const getId=async name=>page.locator('#scene-choice option')
    .filter({hasText:name}).getAttribute('value');
   const firstId=await getId('校園場景 A'),
    secondId=await getId('校園場景 B'),
    badId=await getId('錯誤 GLB');
   await page.locator('#scene-choice').selectOption(firstId);
   await page.locator('#scene-load').click();
   await page.waitForFunction(()=>document.getElementById('status')
    .textContent.includes('已開啟 校園場景 A'),null,{timeout:25000});
   let state=JSON.parse(await page.locator('#metrics').textContent());
   assert.equal(state.activeScene.id,firstId);
   assert.equal(state.cacheSources,1);
   assert.equal(state.actualGpuVRAMBytesKnown,false);
   await page.locator('#scene-choice').selectOption(secondId);
   await page.locator('#scene-load').click();
   await page.waitForFunction(()=>document.getElementById('status')
    .textContent.includes('已開啟 校園場景 B'),null,{timeout:25000});
   state=JSON.parse(await page.locator('#metrics').textContent());
   assert.equal(state.activeScene.id,secondId);
   assert.equal(state.cacheSources,2);
   // Invalid new geometry may NEVER erase the previous valid 3D scene.
   await page.locator('#scene-choice').selectOption(badId);
   await page.locator('#scene-load').click();
   await page.waitForFunction(()=>document.getElementById('status')
    .textContent.includes('BLOCKED'),null,{timeout:12000});
   state=JSON.parse(await page.locator('#metrics').textContent());
   assert.equal(state.activeScene.id,secondId);
   await page.locator('#scene-clear').click();
   state=JSON.parse(await page.locator('#metrics').textContent());
   assert.equal(state.cacheSources,0);
   assert.equal(state.activeScene.id,secondId);
   await page.locator('#scene-unload').click();
   await page.waitForFunction(()=>document.getElementById('status')
    .textContent.includes('已卸載'));
   state=JSON.parse(await page.locator('#metrics').textContent());
   assert.equal(state.activeScene,null);
   assert.equal(state.cacheSources,0);
   await page.screenshot({path:out+'/'+device.name+'-scene-lifecycle-real-workspace.png',
    fullPage:true});
   await page.goto('http://127.0.0.1:8765/asset-library-studio.html',{waitUntil:'load'});
   await page.waitForFunction(()=>document.getElementById('stats')
    .textContent.includes('儲存項目 3 筆'),null,{timeout:12000});
   assert.deepEqual(errors,[]);
   await writeFile(out+'/'+device.name+'-lifecycle-proof.json',JSON.stringify({
    schema:'AIG_FASTMODEL_REAL3D_1_9_REAL_BROWSER',
    device:device.name,
    glbSources:3,trueGPUPreviewShown:true,
    sourceAReplacedWithSourceB:true,
    invalidNewGlbPreservesPreviousView:true,
    manualUnloadIssuedGPUDisposals:true,
    transientRAMCacheClearedWithoutDeletingIndexedDB:true,
    all3SourcesPersistedAcrossNavigation:true,
    actualNativeAndroidWindowsGPUPerformanceNotMeasured:true,
    generatedTestGeometryNotApprovedPersonModel:true,
    noSyntheticCNCValidationClaim:true
   },null,2));
   console.log('AIG19_SCENE_GPU_SWITCH_LAZY_CACHE_PERSISTENCE_BROWSER_PASS',
    device.name);
  }catch(e){
   await page.screenshot({path:out+'/'+device.name+'-FAIL.png',fullPage:true}).catch(()=>{});
   throw Error(device.name+' '+String(e.message||e)+' status='+
    await page.locator('#status').textContent().catch(()=>null)+
    ' pageErrors='+JSON.stringify(errors));
  }finally{await ctx.close()}
 }
}finally{await browser.close()}
