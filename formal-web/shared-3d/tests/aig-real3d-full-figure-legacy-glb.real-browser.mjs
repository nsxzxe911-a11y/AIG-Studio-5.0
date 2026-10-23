/**
 * Legacy human technical reference roundtrip QA.
 * Use existing, user-REJECTED 3D full-body source ONLY to diagnose complete
 * XYZ figure visibility after GLB binary export -> import -> true GPU render.
 * NEVER certify human appearance, skin, face, fingertips or 1:1 likeness.
 */
import {chromium} from 'playwright';
import {createAIGReal3DHumanScene}
 from '../aig-real3d-human-bridge.mjs';
import {mkdir,readFile,copyFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
function toGLB(gender){
 const model=createAIGReal3DHumanScene({gender});
 const source=model.scene.nodes;
 const buffers=[],views=[],accessors=[],meshes=[],nodes=[],materials=[];
 let offset=0;
 function push(data,target){
  const raw=Buffer.from(data.buffer,data.byteOffset,data.byteLength);
  if(offset%4){const p=4-offset%4;buffers.push(Buffer.alloc(p));offset+=p;}
  const id=views.length;
  views.push({buffer:0,byteOffset:offset,byteLength:raw.length,target});
  buffers.push(raw);offset+=raw.length;
  return id;
 }
 for(let n=0;n<source.length;n++){
  const entry=source[n],mesh=entry.mesh;
  const vb=push(new Float32Array(mesh.positions),34962);
  const ib=push(new Uint32Array(mesh.indices),34963);
  const posId=accessors.length;
  accessors.push({bufferView:vb,componentType:5126,
   count:mesh.positions.length/3,type:'VEC3'});
  const indexId=accessors.length;
  accessors.push({bufferView:ib,componentType:5125,
   count:mesh.indices.length,type:'SCALAR'});
  materials.push({pbrMetallicRoughness:{
   baseColorFactor:entry.material.baseColor,
   metallicFactor:0,roughnessFactor:.85}});
  meshes.push({name:entry.id,primitives:[{
   attributes:{POSITION:posId},indices:indexId,material:n}]});
  nodes.push({name:entry.id,mesh:n});
 }
 const bin=Buffer.concat(buffers),json={
  asset:{version:'2.0',
   generator:'AIG Rejected LEGACY technical full-body pipeline fixture'},
  buffers:[{byteLength:bin.length}],
  bufferViews:views,accessors,meshes,nodes,materials,
  scenes:[{nodes:nodes.map((_,i)=>i)}],scene:0
 };
 const j=Buffer.from(JSON.stringify(json)),
  padded=Buffer.concat([j,Buffer.alloc((4-j.length%4)%4,32)]);
 const total=12+8+padded.length+8+bin.length;
 const out=Buffer.alloc(total);
 out.writeUInt32LE(0x46546c67,0);
 out.writeUInt32LE(2,4);out.writeUInt32LE(total,8);
 out.writeUInt32LE(padded.length,12);
 out.writeUInt32LE(0x4e4f534a,16);
 padded.copy(out,20);
 const at=20+padded.length;
 out.writeUInt32LE(bin.length,at);
 out.writeUInt32LE(0x004e4942,at+4);
 bin.copy(out,at+8);
 return {out,partCount:source.length,
  sourceTriangles:source.reduce((n,s)=>n+s.mesh.triangleCount,0)};
}
const folder='artifacts/aig-real3d-full-human-legacy-qa-not-accepted';
await mkdir(folder,{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 '--enable-webgl','--use-gl=angle','--use-angle=swiftshader',
 '--no-sandbox','--disable-dev-shm-usage'
]});
const page=await browser.newPage({
 viewport:{width:1460,height:940},acceptDownloads:true});
const errors=[],results=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:8772/shared-3d/aig-real3d-scan-native-lab.html',{
  waitUntil:'domcontentloaded',timeout:30000});
 for(const gender of ['female','male']){
  const glb=toGLB(gender);
  await page.locator('#source-obj').setInputFiles({
   name:'LEGACY_REJECTED_'+gender+'_TECHNICAL_FULL_BODY.glb',
   mimeType:'model/gltf-binary',buffer:glb.out});
  await page.locator('#source-height').fill(gender==='female'?'1680':'1780');
  await page.locator('#load-source').click();
  await page.waitForFunction(()=>{
   const s=document.querySelector('#status'),btn=document.querySelector('#load-source');
   return !btn.disabled&&(s.dataset.ready==='true'||s.textContent.startsWith('BLOCK'));
  },null,{timeout:200000});
  const status=await page.locator('#status').textContent();
  assert.equal(await page.locator('#status').getAttribute('data-ready'),'true',status);
  const p=JSON.parse(await page.locator('#proof').textContent());
  assert.equal(p.schema,'AIG_REAL3D_NATIVE_GLB_STATIC_MESH_V1');
  assert.equal(p.primitiveCount,glb.partCount);
  assert.equal(p.actualTriangles,glb.sourceTriangles);
  assert.equal(p.separateSourcePrimitivesPreserved,glb.partCount);
  assert.equal(p.allFourNativeGPUPhotos,true);
  assert.equal(p.stage1ReleasePASS,false);
  assert.equal(p.humanShapeAndFaceVisuallyApproved,false);
  assert.equal(p.originalGLBTexturesApplied,false);
  assert.equal(p.originalGLBSkinningAnimated,false);
  assert.equal(p.captures.length,4);
  const photos=[];
  for(let i=0;i<p.captures.length;i++){
   const item=p.captures[i],fig=page.locator('#gallery figure').nth(i);
   const promise=page.waitForEvent('download');
   await fig.locator('a').click();
   const download=await promise;
   const b=await readFile(await download.path());
   assert.equal(b.readUInt32BE(0),0x89504e47);
   assert.equal(b.readUInt32BE(16),1080);
   assert.equal(b.readUInt32BE(20),1920);
   const sha=createHash('sha256').update(b).digest('hex');
   assert.equal(item.sha256,sha);
   const name=gender+'-'+item.id+'-LEGACY-BODY-TRUE-GPU.png';
   await copyFile(await download.path(),folder+'/'+name);
   photos.push({view:item.id,name,sha256:sha});
  }
  await page.screenshot({path:folder+'/'+gender+'-workbench.png',
   fullPage:true,timeout:60000});
  results.push({gender,primitiveCount:glb.partCount,
   triangles:p.actualTriangles,allBodyParts3DUploaded:true,
   actualFourViewsFromSourceGLB:true,
   photographs:photos,naturalFigureAppearanceApproved:false});
 }
 assert.deepEqual(errors,[]);
 await writeFile(folder+'/manifest.json',JSON.stringify({
  schema:'REAL3D_FULL_FIGURE_LEGACY_ROUNDTRIP_QA',
  intent:'prove head trunk arms legs feet technical meshes are actually rendered',
  technicalSourceWasPreviouslyRejectedByUser:true,
  noNewHumanGeneratorCreated:true,
  trueNaturalHumanAppearancePASS:false,
  missingNaturalFaceAndFingers:true,
  scanOriginVerified:false,
  materialTextureSkinAnimationReady:false,
  releasePASS:false,
  results
 },null,2));
 console.log('REAL3D_FULL_TECHNICAL_BODY_GLB_8_GPU_PHOTOS_PASS_NOT_NATURAL_HUMAN');
}catch(e){
 console.error('REAL3D_FULL_TECHNICAL_BODY_GLB_BLOCK',e.stack||String(e));
 process.exitCode=1;
 await page.screenshot({path:folder+'/FAILED.png',fullPage:true}).catch(()=>{});
}finally{await browser.close();}
