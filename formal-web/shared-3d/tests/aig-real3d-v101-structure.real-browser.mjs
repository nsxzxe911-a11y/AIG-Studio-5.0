/**
 * Real Chromium WebGL: actual 12-triangle multi-part source GLB, with one
 * deliberately reversed source face. AI source is not faked; it is a
 * deterministic structural repair test, not a generated real heroine face.
 */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const dir='artifacts/aig-real3d-v101-structure';
await mkdir(dir,{recursive:true});
function originalGLB(){
 const base=[[1,1,1],[-1,-1,1],[-1,1,-1],[1,-1,-1]],
  faces=[[0,2,1],[0,1,3],[0,3,2],[1,2,3]],
  positions=[],normals=[],indices=[];
 for(let c=0;c<3;c++){
  const offset=positions.length/3;
  for(const p of base){positions.push(p[0]*.13+(c-1)*.45,p[1]*.13,p[2]*.13);
   normals.push(0,1,0);}
  for(let f=0;f<4;f++){
   const arr=[...faces[f]];
   if(c===0&&f===0)[arr[1],arr[2]]=[arr[2],arr[1]];
   indices.push(...arr.map(x=>x+offset));
  }
 }
 const p=new Float32Array(positions),n=new Float32Array(normals),
  idx=new Uint16Array(indices),
  pByte=new Uint8Array(p.buffer),nByte=new Uint8Array(n.buffer),
  iByte=new Uint8Array(idx.buffer);
 const binary=new Uint8Array(pByte.length+nByte.length+iByte.length);
 binary.set(pByte);binary.set(nByte,pByte.length);binary.set(iByte,pByte.length+nByte.length);
 const gltf={asset:{version:'2.0'},
  buffers:[{byteLength:binary.length}],
  bufferViews:[
   {buffer:0,byteOffset:0,byteLength:pByte.length},
   {buffer:0,byteOffset:pByte.length,byteLength:nByte.length},
   {buffer:0,byteOffset:pByte.length+nByte.length,byteLength:iByte.length}],
  accessors:[
   {bufferView:0,componentType:5126,count:positions.length/3,type:'VEC3'},
   {bufferView:1,componentType:5126,count:normals.length/3,type:'VEC3'},
   {bufferView:2,componentType:5123,count:indices.length,type:'SCALAR'}],
  meshes:[{primitives:[{attributes:{POSITION:0,NORMAL:1},indices:2,mode:4}]}],
  scenes:[{nodes:[0]}],nodes:[{mesh:0}],scene:0};
 const json=new TextEncoder().encode(JSON.stringify(gltf)),
  jsonSize=Math.ceil(json.length/4)*4,binSize=Math.ceil(binary.length/4)*4;
 const out=new Uint8Array(12+8+jsonSize+8+binSize),
  dv=new DataView(out.buffer);
 dv.setUint32(0,0x46546c67,true);dv.setUint32(4,2,true);
 dv.setUint32(8,out.byteLength,true);
 dv.setUint32(12,jsonSize,true);dv.setUint32(16,0x4e4f534a,true);
 out.fill(32,20,20+jsonSize);out.set(json,20);
 const b=20+jsonSize;
 dv.setUint32(b,binSize,true);dv.setUint32(b+4,0x004e4942,true);
 out.set(binary,b+8);
 return out;
}
const browser=await chromium.launch({headless:true,args:[
 '--enable-webgl','--use-gl=angle','--use-angle=swiftshader',
 '--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({acceptDownloads:true,viewport:{width:1350,height:950}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:8772/shared-3d/aig-real3d-v99-native-source-lab.html',{
  waitUntil:'domcontentloaded',timeout:30000
 });
 const pngB64=await page.evaluate(()=>{
  const c=document.createElement('canvas');c.width=384;c.height=640;
  const g=c.getContext('2d');
  g.clearRect(0,0,384,640);
  g.fillStyle='#c7b49c';g.fillRect(120,72,145,500);
  return c.toDataURL('image/png').split(',')[1];
 });
 const source=Buffer.from(pngB64,'base64'),
  binary=originalGLB();
 await page.locator('#reference').setInputFiles({
  name:'V101-QA-NOT-HUMAN-SOURCE.png',mimeType:'image/png',buffer:Buffer.from(source)
 });
 await page.locator('#mesh-file').setInputFiles({
  name:'V101-ACTUAL-INDEXED-GLB-REVERSE-FACE.glb',
  mimeType:'model/gltf-binary',buffer:Buffer.from(binary)
 });
 await page.locator('#import').click();
 await page.waitForFunction(()=>{
  const s=document.querySelector('#status')?.textContent??'';
  return s.startsWith('BLOCK')||s.includes('已從真正 GLB');
 },null,{timeout:30000});
 const initial=await page.locator('#status').textContent();
 if(initial.startsWith('BLOCK'))throw Error('V101_SOURCE_IMPORT_BLOCK_'+initial);
 const manifest=JSON.parse(await page.locator('#proof').textContent());
 assert.equal(manifest.sourceFaceCount,12);
 assert.equal(manifest.realMeshes,1);
 await page.locator('#repair101').click();
 await page.waitForFunction(()=>{
  const s=document.querySelector('#status')?.textContent??'';
  return s.includes('V102：修整後真 3D')||s.includes('V101 結構修整')||s.startsWith('BLOCK');
 },null,{timeout:30000});
 const status=await page.locator('#status').textContent();
 if(status.startsWith('BLOCK'))throw Error('V101_BACKEND_REPAIR_BLOCK_'+status);
 const repaired=JSON.parse(await page.locator('#v101-report').textContent());
 assert.equal(repaired.schema,'AIG_REAL3D_V101_SOURCE_REMODELLING_BACKEND_V1');
 assert.equal(repaired.nodeReports[0].status,'STRUCTURE_REPAIR_WORKING_COPY_READY');
 assert.ok(repaired.nodeReports[0].originalWindingConflicts>0);
 assert.equal(repaired.nodeReports[0].repairedWindingConflicts,0);
 assert.ok(repaired.nodeReports[0].invertedOriginalFaceIDs.length>0);
 assert.equal(repaired.nodeReports[0].originalTriangles,12);
 assert.equal(repaired.nodeReports[0].revisedTriangles,12);
 assert.equal(repaired.nodeReports[0].originalDisconnectedComponents,3);
 assert.equal(repaired.nodeReports[0].workingDisconnectedComponents,3);
 assert.equal(repaired.trainedNeuralRepairModelActuallyCalled,false);
 // Snapshot native GPU 4K before/after from the SAME original GLB source.
 const download=async()=>{
  const pending=page.waitForEvent('download',{timeout:90000});
  await page.locator('#png4k').click();
  const result=await pending;
  const bytes=await readFile(await result.path());
  assert.equal(bytes.readUInt32BE(0),0x89504e47);
  assert.equal(bytes.readUInt32BE(16),3840);
  assert.equal(bytes.readUInt32BE(20),2160);
  return bytes;
 };
 await page.locator('#original101').click();
 const originalPng=await download();
 await page.locator('#remodel101').click();
 const revisedPng=await download();
 const sourceSHA=createHash('sha256').update(binary).digest('hex');
 const final=JSON.parse(await page.locator('#proof').textContent());
 assert.equal(final.actualGLBSourceSHA,sourceSHA);
 assert.equal(final.V101ShowingRepairedWorkingCopy,true);
 assert.equal(final.sourceFaceCount,12);
 assert.equal(final.actualNativeGPUReadback,true);
 assert.equal(final.V101ActiveTriangleCount,12);
 const originalHash=createHash('sha256').update(originalPng).digest('hex'),
  repairedHash=createHash('sha256').update(revisedPng).digest('hex');
 assert.notEqual(originalHash,repairedHash);
 assert.equal(final.realSource4KPNG_SHA,repairedHash);
 assert.deepEqual(errors,[]);
 await writeFile(dir+'/V101-SOURCE-BEFORE-REAL-4K.png',originalPng);
 await writeFile(dir+'/V101-REMODEL-AFTER-REAL-4K.png',revisedPng);
 const receipt={
  sourceModelGLBSHA:sourceSHA,originalGPU4KSHA:originalHash,
  repairedGPU4KSHA:repairedHash,
  native4KSourcePNGSize:originalPng.length,
  native4KWorkingPNGSize:revisedPng.length,
  trueNative4KPixelDifference:true,
  trueBackendFaceOrientationCorrection:true,
  originalIndexedSourceFaceCount:12,
  actualNeuralModelInvoked:false,
  facialIdentityRealismCertified:false,
  sourceAuthorityReleasePASS:false,
  ...repaired
 };
 await writeFile(dir+'/V101-SOURCE-BACKEND-GPU-QUALITY.json',
  JSON.stringify(receipt,null,2));
 console.log('AIG_REAL3D_V101_ACTUAL_SOURCE_REPAIR_AND_4K_GPU_PASS',
  JSON.stringify({originalWindingConflicts:repaired.nodeReports[0].originalWindingConflicts,
   correctedWindingConflicts:0,
   true4KOriginalSHA:originalHash,
   true4KRepairedSHA:repairedHash,
   originalSourceMeshSHAUnchanged:true}));
}finally{await browser.close();}
