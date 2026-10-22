import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/aig-real3d-map-actor-2-1';
await mkdir(out,{recursive:true});
// A genuinely valid GLTF2 animated GLB technical fixture, not the user's
// approved heroine. Two independent translation clip names.
function glbAnimatedActor(){
 const vertex=new Float32Array([-.2,0,0,.2,0,0,0,.9,0]);
 const indices=new Uint16Array([0,1,2]);
 const times=new Float32Array([0,1]);
 const movement=new Float32Array([0,0,0,.18,0,0]);
 const all=Buffer.alloc(36+8+8+24);
 Buffer.from(vertex.buffer).copy(all,0);
 Buffer.from(indices.buffer).copy(all,36);
 Buffer.from(times.buffer).copy(all,44);
 Buffer.from(movement.buffer).copy(all,52);
 const gltf={asset:{version:'2.0',generator:'Real3D2.1 true source clip technical fixture'},
  buffers:[{byteLength:all.length}],bufferViews:[
   {buffer:0,byteOffset:0,byteLength:36,target:34962},
   {buffer:0,byteOffset:36,byteLength:6,target:34963},
   {buffer:0,byteOffset:44,byteLength:8},
   {buffer:0,byteOffset:52,byteLength:24}],
  accessors:[
   {bufferView:0,componentType:5126,count:3,type:'VEC3',min:[-.2,0,0],max:[.2,.9,0]},
   {bufferView:1,componentType:5123,count:3,type:'SCALAR'},
   {bufferView:2,componentType:5126,count:2,type:'SCALAR',min:[0],max:[1]},
   {bufferView:3,componentType:5126,count:2,type:'VEC3',
    min:[0,0,0],max:[.18,0,0]}],
  meshes:[{primitives:[{attributes:{POSITION:0},indices:1}]}],
  nodes:[{mesh:0,name:'OriginalActorNode'}],scenes:[{nodes:[0]}],scene:0,
  animations:[{name:'source-short-step',samplers:[{
   input:2,output:3,interpolation:'LINEAR'}],
   channels:[{sampler:0,target:{node:0,path:'translation'}}]},
   {name:'walk',samplers:[{
    input:2,output:3,interpolation:'LINEAR'}],
    channels:[{sampler:0,target:{node:0,path:'translation'}}]}]};
 const json=Buffer.from(JSON.stringify(gltf));
 const p=(json.length+3)&~3,j=Buffer.alloc(p,0x20);json.copy(j);
 const length=12+8+p+8+all.length,b=Buffer.alloc(length);
 b.write('glTF',0);b.writeUInt32LE(2,4);b.writeUInt32LE(length,8);
 b.writeUInt32LE(p,12);b.write('JSON',16);j.copy(b,20);
 const off=20+p;b.writeUInt32LE(all.length,off);
 b.write('BIN\0',off+4,'binary');all.copy(b,off+8);
 return b;
}
function buildingGLB(){
 const pos=new Float32Array([-.4,0,0,.4,0,0,0,.8,0]);
 const idx=new Uint16Array([0,1,2]);const bin=Buffer.alloc(44);
 Buffer.from(pos.buffer).copy(bin,0);Buffer.from(idx.buffer).copy(bin,36);
 const gltf={asset:{version:'2.0'},buffers:[{byteLength:44}],
  bufferViews:[{buffer:0,byteOffset:0,byteLength:36,target:34962},
   {buffer:0,byteOffset:36,byteLength:6,target:34963}],
  accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3',
   min:[-.4,0,0],max:[.4,.8,0]},
   {bufferView:1,componentType:5123,count:3,type:'SCALAR'}],
  meshes:[{primitives:[{attributes:{POSITION:0},indices:1}]}],
  nodes:[{mesh:0,name:'VerifiedBuildingSource'}],scenes:[{nodes:[0]}],scene:0};
 const raw=Buffer.from(JSON.stringify(gltf)),p=(raw.length+3)&~3,
  j=Buffer.alloc(p,0x20);raw.copy(j);
 const size=12+8+p+8+44,b=Buffer.alloc(size);
 b.write('glTF',0);b.writeUInt32LE(2,4);b.writeUInt32LE(size,8);
 b.writeUInt32LE(p,12);b.write('JSON',16);j.copy(b,20);
 const off=20+p;b.writeUInt32LE(44,off);
 b.write('BIN\0',off+4,'binary');bin.copy(b,off+8);
 return b;
}
const map=Buffer.from(JSON.stringify({
 schema:'AIG_FASTMODEL_7_12_SOURCE_SCENE_MAP_DATA',
 revision:1,map:{id:'campus',coordinateMode:'LOCAL_RELATIVE',
  metresPerUnit:null,sourceLabel:'TECHNICAL_FIXTURE_NOT_SURVEY',
  sourceRights:'USER_TEST',geoOrigin:null,
  features:[{id:'school',category:'building',name:'known-footprint',
   sourceFrameId:null,measuredHeightM:null,heightReviewed:false,
   geometry:{type:'Polygon',coordinates:[[
    [10,20],[30,20],[30,40],[10,40],[10,20]
   ]]}}]
 },actual3DMeshCreated:false
}));
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
   await page.goto('http://127.0.0.1:8765/asset-library-studio.html');
   await page.waitForFunction(()=>document.getElementById('status')
    .textContent.includes('本機資產庫已開啟'));
   let count=0;
   async function put(file,type,category,title,buffer){
    await page.locator('#asset-file').setInputFiles({
     name:file,mimeType:type,buffer});
    await page.locator('#asset-category').selectOption(category);
    await page.locator('#asset-title').fill(title);
    await page.locator('#asset-tags').fill('場景,來源');
    await page.locator('#asset-import').click();
    await page.waitForFunction(n=>document.getElementById('stats')
     .textContent.includes('儲存項目 '+n+' 筆'),++count);
   }
   await put('actor.glb','model/gltf-binary','character',
    '帶原始動畫的角色測試模型',glbAnimatedActor());
   await put('building.glb','model/gltf-binary','building',
    '建築真 GLB',buildingGLB());
   await put('map.json','application/json','map','校園真 XY 地圖',map);
   await page.goto('http://127.0.0.1:8765/scene-runtime-studio.html');
   await page.waitForFunction(()=>document.querySelectorAll('#world-asset option').length===3);
   const choose=async(id,word)=>{
    const opt=page.locator('#'+id+' option').filter({hasText:word});
    const val=await opt.getAttribute('value');assert.ok(val,id+' '+word);
    await page.locator('#'+id).selectOption(val);
   };
   await choose('world-map','校園真 XY 地圖');
   await page.locator('#world-new').click();
   await choose('world-asset','角色測試模型');
   await page.locator('#world-add').click();
   await choose('world-asset','建築真 GLB');
   await page.locator('#world-add').click();
   const before=JSON.parse(await page.locator('#world-proof').textContent());
   assert.equal(before.objects.length,2);
   await page.locator('#world-preview').click();
   await page.waitForFunction(()=>document.getElementById('world-status')
    .textContent.includes('已自動保存'),null,{timeout:30000});
   await page.waitForFunction(()=>document.querySelectorAll('#world-actor-clip option').length>=2);
   assert.match(await page.locator('#world-actor-clip').textContent(),/source-short-step/);
   await page.locator('#world-actor-play').click();
   assert.match(await page.locator('#world-actor-status').textContent(),/正在播放/);
   await page.locator('#world-actor-pause').click();
   assert.match(await page.locator('#world-actor-status').textContent(),/已暫停角色/);
   await choose('world-align-object','node-2');
   await choose('world-map-feature','school');
   await page.locator('#world-align-offset-x').fill('2');
   await page.locator('#world-align-offset-z').fill('-1');
   await page.locator('#world-align').click();
   await page.waitForFunction(()=>document.getElementById('world-status')
    .textContent.includes('已自動保存'),null,{timeout:10000});
   const after=JSON.parse(await page.locator('#world-proof').textContent());
   assert.deepEqual(after.objects[1].xyz,[22,0,29]);
   assert.equal(after.objects[1].sourceSHA,before.objects[1].sourceSHA);
   assert.deepEqual(after.objects[1].scale,before.objects[1].scale);
   assert.equal(JSON.parse(await page.locator('#metrics').textContent()).modelObjects,2);
   // Real3D 2.2: only a real named GLTF animation "walk" can satisfy
   // this user-written walking cue; authored camera + text subtitles.
   await page.locator('#world-time').fill('0');
   await page.locator('#world-camera-position').fill('0,2,7');
   await page.locator('#world-key-add').click();
   await page.waitForFunction(()=>document.getElementById('world-proof')
    .textContent.includes('"keyId": "camera-1"'));
   await page.locator('#world-time').fill('1');
   await page.locator('#world-camera-position').fill('2,2,6');
   await page.locator('#world-key-add').click();
   await page.waitForFunction(()=>document.getElementById('world-proof')
    .textContent.includes('"keyId": "camera-2"'));
   await page.locator('#story-text').fill('0秒 node-1：跑步');
   await page.locator('#story-compile').click();
   assert.match(await page.locator('#story-status').textContent(),
    /BLOCKED/,'run is not a real source clip, never hallucinate');
   await page.locator('#story-text').fill(
    '0秒 node-1：走路\n1秒 鏡頭：校門口\n1秒 字幕：今天要去學校');
   await page.locator('#story-compile').click();
   await page.waitForFunction(()=>document.getElementById('story-play').disabled===false);
   const storyboard=JSON.parse(await page.locator('#story-proof').textContent());
   assert.equal(storyboard.ready,true);
   assert.equal(storyboard.events.length,3);
   assert.equal(storyboard.events[0].clipName,'walk');
   assert.equal(storyboard.generatedMotion,false);
   assert.equal(storyboard.generatedVoice,false);
   await page.locator('#story-save').click();
   await page.waitForFunction(()=>document.getElementById('story-status')
    .textContent.includes('已另存劇本'),null,{timeout:12000});
   await page.locator('#story-play').click();
   await page.waitForFunction(()=>document.getElementById('story-status')
    .textContent.includes('開始播放'),null,{timeout:5000});
   await page.waitForFunction(()=>document.getElementById('story-subtitle')
    .textContent.includes('今天要去學校'),null,{timeout:5000});
   await page.locator('#story-stop').click();
   assert.match(await page.locator('#story-status').textContent(),/劇情已停止/);
   // Source-bound script remains reusable after stopping without any
   // change to the approved map XY or original loaded GLB.
   assert.equal(JSON.parse(await page.locator('#world-proof').textContent())
    .objects[1].sourceSHA,before.objects[1].sourceSHA);
   await page.screenshot({path:out+'/'+device.name+'-source-aligned-actor-clips.png',
    fullPage:true});
   assert.deepEqual(errors,[]);
   await writeFile(out+'/'+device.name+'-proof.json',JSON.stringify({
    schema:'AIG_REAL3D_2_1_TECHNICAL_GLTF_SOURCE_AND_MAP',
    device:device.name,actorsFromOriginalGLB:true,
    sourceClipName:'source-short-step',
    buildingWorldXZ:[22,29],heightNotInvented:true,
    selectedMapXYBoundsCentre:[20,30],
    originalAssetSHAUnchanged:true,geometryReuploadForAlignment:0,
    source3DIsNotApprovedUserHeroine:true,
    nativeS23WindowsFPSNotProven:true
   },null,2));
   console.log('AIG21_TRUE_GLTF_SOURCE_MOTION_AND_MAP_ANCHOR_BROWSER_PASS',
    device.name);
  }catch(e){
   await page.screenshot({path:out+'/'+device.name+'-FAIL.png',fullPage:true}).catch(()=>{});
   throw Error(device.name+' '+String(e.message||e)+' source='+
    await page.locator('#world-status').textContent().catch(()=>null)+
    ' actor='+await page.locator('#world-actor-status').textContent().catch(()=>null)+
    ' browserErrors='+JSON.stringify(errors));
  }finally{await context.close()}
 }
}finally{await browser.close()}
