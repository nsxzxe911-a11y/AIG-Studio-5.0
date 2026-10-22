import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/aig-real3d-world-scene-2-0';
await mkdir(out,{recursive:true});
function triangleGLB(name,xShift=0){
 const positions=new Float32Array([
  xShift-.45,-.3,0,xShift+.45,-.3,0,xShift,.85,0]);
 const indices=new Uint16Array([0,1,2]),binary=Buffer.alloc(44);
 Buffer.from(positions.buffer).copy(binary,0);
 Buffer.from(indices.buffer).copy(binary,36);
 const gltf={asset:{version:'2.0',generator:'AIG20 technical test NOT real heroine'},
  buffers:[{byteLength:44}],bufferViews:[
   {buffer:0,byteOffset:0,byteLength:36,target:34962},
   {buffer:0,byteOffset:36,byteLength:6,target:34963}],
  accessors:[
   {bufferView:0,componentType:5126,count:3,type:'VEC3',
    min:[xShift-.45,-.3,0],max:[xShift+.45,.85,0]},
   {bufferView:1,componentType:5123,count:3,type:'SCALAR'}],
  meshes:[{primitives:[{attributes:{POSITION:0},indices:1}]}],
  nodes:[{mesh:0,name}],scenes:[{nodes:[0]}],scene:0};
 const raw=Buffer.from(JSON.stringify(gltf)),pad=(raw.length+3)&~3;
 const json=Buffer.alloc(pad,0x20);raw.copy(json);
 const total=12+8+pad+8+44,result=Buffer.alloc(total);
 result.write('glTF');result.writeUInt32LE(2,4);
 result.writeUInt32LE(total,8);result.writeUInt32LE(pad,12);
 result.write('JSON',16);json.copy(result,20);
 const off=20+pad;result.writeUInt32LE(44,off);
 result.write('BIN\0',off+4,'binary');binary.copy(result,off+8);
 return result;
}
const browser=await chromium.launch({headless:true,args:[
 '--no-sandbox','--disable-dev-shm-usage','--enable-webgl',
 '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'
]});
try{
 for(const device of [
  {name:'phone',viewport:{width:390,height:844},isMobile:true,hasTouch:true},
  {name:'desktop',viewport:{width:1280,height:900}}
 ]){
  const context=await browser.newContext({...device,acceptDownloads:true});
  const page=await context.newPage();page.setDefaultTimeout(45000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto('http://127.0.0.1:8765/asset-library-studio.html',
    {waitUntil:'load'});
   await page.waitForFunction(()=>document.getElementById('status')
    .textContent.includes('本機資產庫已開啟'));
   let count=0;
   async function importAsset(name,mime,category,title,bytes,tags){
    await page.locator('#asset-file').setInputFiles({name,mimeType:mime,buffer:bytes});
    await page.locator('#asset-category').selectOption(category);
    await page.locator('#asset-title').fill(title);
    await page.locator('#asset-tags').fill(tags);
    await page.locator('#asset-import').click();
    count++;
    await page.waitForFunction(n=>document.getElementById('stats')
     .textContent.includes('儲存項目 '+n+' 筆'),count);
   }
   await importAsset('heroine.glb','model/gltf-binary','character',
    '女主角來源模型（測試非真人）',triangleGLB('HeroineTechnical',0),'女主角,來源');
   await importAsset('campus.glb','model/gltf-binary','building',
    '校園建築來源（測試）',triangleGLB('CampusGeometry',1.8),'建築,校園');
   const map=Buffer.from(JSON.stringify({
    schema:'AIG_FASTMODEL_7_12_SOURCE_SCENE_MAP_DATA',revision:1,
    map:{id:'campus-map',coordinateMode:'LOCAL_RELATIVE',
     metresPerUnit:null,sourceLabel:'TECHNICAL_MAP_FIXTURE_NOT_GEO_SURVEY',
     sourceRights:'USER_TEST_FIXTURE',geoOrigin:null,
     features:[{id:'building_1',category:'building',
      name:'有來源的校園建築平面',sourceFrameId:null,
      measuredHeightM:null,heightReviewed:false,
      geometry:{type:'Polygon',coordinates:[[
       [0,0],[10,0],[10,5],[0,5],[0,0]
      ]]}}]},
    originalPhotosOrVideosIncluded:false,actual3DMeshCreated:false
   }));
   await importAsset('map.geojson','application/json','map',
    '校園來源地圖 JSON（測試）',map,'地圖,校園');
   await page.goto('http://127.0.0.1:8765/scene-runtime-studio.html',
    {waitUntil:'load'});
   await page.waitForFunction(()=>document.querySelectorAll('#world-asset option').length===3);
   // one shared viewport; no GPU context before load.
   assert.match(await page.locator('#metrics').textContent(),/GPU 未啟動/);
   const choose=async(id,name)=>{
    const opt=page.locator('#'+id+' option').filter({hasText:name});
    const value=await opt.getAttribute('value');
    assert.ok(value);
    await page.locator('#'+id).selectOption(value);
   };
   await choose('world-map','校園來源地圖');
   await page.locator('#world-new').click();
   await page.waitForFunction(()=>{
    const st=document.getElementById('world-status')?.textContent||'';
    return st.includes('已建立來源座標一致的空白世界場景')&&
      !document.getElementById('world-add').disabled;
   },null,{timeout:12000});
   await choose('world-asset','女主角來源模型');
   await page.locator('#world-x').fill('0');
   await page.locator('#world-add').click();
   await page.waitForFunction(()=>{
    try{
     const doc=JSON.parse(document.getElementById('world-proof').textContent);
     return doc.objects.length===1&&doc.objects[0].node==='node-1'&&
      doc.objects[0].category==='character'&&
      !document.getElementById('world-add').disabled;
    }catch{return false}
   },null,{timeout:12000});
   await choose('world-asset','校園建築來源');
   await page.locator('#world-x').fill('3.5');
   await page.locator('#world-add').click();
   await page.waitForFunction(()=>{
    try{
     const doc=JSON.parse(document.getElementById('world-proof').textContent);
     return doc.objects.length===2&&doc.objects[1].node==='node-2'&&
      doc.objects[1].category==='building'&&
      doc.objects[1].xyz[0]===3.5&&
      !document.getElementById('world-add').disabled;
    }catch{return false}
   },null,{timeout:12000});
   const before=JSON.parse(await page.locator('#world-proof').textContent());
   assert.equal(before.objects.length,2);
   assert.equal(before.sourceMode,'LOCAL_RELATIVE');
   assert.ok(before.sourceMap.startsWith('sha256:'));
   await page.locator('#world-preview').click();
   await page.waitForFunction(()=>document.getElementById('world-status')
    .textContent.includes('已自動保存'),null,{timeout:30000});
   const status=JSON.parse(await page.locator('#metrics').textContent());
   assert.equal(status.activeWorld,before.id);
   assert.equal(status.modelObjects,2);
   assert.equal(status.viewerContexts,1);
   assert.equal(status.map.features,1);
   assert.match(await page.locator('#world-map-caption').textContent(),/1 個來源圖徵/);
   assert.equal(status.gpuVRAMBytesVerified,false);
   // Camera keys added to same already-loaded Three scene, no reparse.
   await page.locator('#world-time').fill('0');
   await page.locator('#world-camera-position').fill('0,2,7');
   await page.locator('#world-key-add').click();
   await page.waitForFunction(()=>document.getElementById('world-proof')
    .textContent.includes('"keyId": "camera-1"'));
   await page.locator('#world-time').fill('2');
   await page.locator('#world-camera-position').fill('2,2,6');
   await page.locator('#world-key-add').click();
   await page.waitForFunction(()=>document.getElementById('world-proof')
    .textContent.includes('"keyId": "camera-2"'));
   await page.locator('#world-scrub').evaluate(el=>{el.value='1';el.dispatchEvent(new Event('input',{bubbles:true}));});
   assert.match(await page.locator('#world-status').textContent(),/預覽真實相機軌跡/);
   await page.locator('#world-play').click();
   await page.waitForFunction(()=>document.getElementById('world-status')
    .textContent.includes('正在以同一個'),null,{timeout:5000});
   await page.locator('#world-pause').click();
   await page.waitForFunction(()=>document.querySelectorAll('#world-saved option').length>=4);
   // Invalid third model does not destroy successful two-model GPU world.
   const goodId=before.id;
   await page.screenshot({path:out+'/'+device.name+'-two-source-world.png',fullPage:true});
   await page.goto('http://127.0.0.1:8765/asset-library-studio.html',
    {waitUntil:'load'});
   await page.waitForFunction(()=>document.getElementById('stats')
    .textContent.includes('儲存項目 6 筆'));
   count=6;
   await importAsset('corrupt.glb','model/gltf-binary','building',
    '破損 GLB 來源（需阻擋）',Buffer.from('this is not a gltf2'),'錯誤,來源');
   await page.goto('http://127.0.0.1:8765/scene-runtime-studio.html',
    {waitUntil:'load'});
   await page.waitForFunction(()=>document.querySelectorAll('#world-saved option').length>1);
   await choose('world-saved','櫻花校園場景');
   await page.locator('#world-load').click();
   await page.waitForFunction(()=>document.getElementById('world-status')
    .textContent.includes('已從外部素材庫讀取'));
   await page.locator('#world-preview').click();
   await page.waitForFunction(()=>document.getElementById('world-status')
    .textContent.includes('已自動保存'),null,{timeout:30000});
   assert.equal(JSON.parse(await page.locator('#metrics').textContent()).activeWorld,goodId);
   await choose('world-asset','破損 GLB 來源');
   await page.locator('#world-add').click();
   await page.locator('#world-preview').click();
   await page.waitForFunction(()=>document.getElementById('world-status')
    .textContent.includes('BLOCKED'),null,{timeout:18000});
   assert.equal(JSON.parse(await page.locator('#metrics').textContent()).activeWorld,goodId);
   await page.locator('#scene-unload').click();
   await page.waitForFunction(()=>document.getElementById('status')
    .textContent.includes('已卸載整個 2.0'));
   assert.match(await page.locator('#metrics').textContent(),/GPU 未啟動/);
   assert.deepEqual(errors,[]);
   await writeFile(out+'/'+device.name+'-world-composition-evidence.json',JSON.stringify({
    schema:'AIG_REAL3D_2_0_PHONE_DESKTOP_SOURCE_WORLD_BROWSER',
    device:device.name,worldId:goodId,sourceAssetCount:2,
    mapSourceReadOnly:true,relativeUnitsNotPhysicalMetres:true,
    cameraKeyframes:2,actualThreeRendererContextsPerPage:1,
    corruptThirdAssetDoesNotClearOldWorld:true,
    originalIndexedDBModelsPersisted:true,
    actualUserHeroineNotScanned:true,noNativeGpuFpsProven:true
   },null,2));
   console.log('AIG20_ACTUAL_TWO_GLTF_WORLD_CAMERA_MAP_BROWSER_PASS',device.name);
  }catch(error){
   await page.screenshot({path:out+'/'+device.name+'-FAIL.png',fullPage:true}).catch(()=>{});
   throw Error(device.name+' '+String(error.message||error)+
    ' world='+await page.locator('#world-status').textContent().catch(()=>null)+
    ' errors='+JSON.stringify(errors));
  }finally{await context.close()}
 }
}finally{await browser.close()}
