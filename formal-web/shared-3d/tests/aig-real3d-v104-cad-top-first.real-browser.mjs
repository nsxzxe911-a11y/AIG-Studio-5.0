/**
 * Real Chromium WebGL: actual 12-triangle multi-part source GLB, with one
 * deliberately reversed source face. AI source is not faked; it is a
 * deterministic structural repair test, not a generated real heroine face.
 */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const dir='artifacts/aig-real3d-v104-cad';
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
  name:'V104-QA-NOT-HUMAN-SOURCE.png',mimeType:'image/png',buffer:Buffer.from(source)
 });
 await page.locator('#mesh-file').setInputFiles({
  name:'V104-CNC-TOP-TRUE-INDEXED-GLB.glb',
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

 // V104 initial top-first generated exactly one original-geometry view.
 assert.equal(await page.locator('#v104-top').isEnabled(),true);
 let report=JSON.parse(await page.locator('#v104-report').textContent());
 assert.equal(report.requestedFace,'TOP');
 assert.equal(report.originalIndexedTriangles,12);
 assert.equal(report.workPerformedOnDemand.actualFacesGenerated,1);
 assert.equal(report.workPerformedOnDemand.pendingFaces.length,5);
 assert.equal(report.releasePASS,false);
 const sourceSHA=createHash('sha256').update(binary).digest('hex');
 assert.equal(report.sourceGeometrySha256,sourceSHA);
 assert.equal(report.missingFacePhotoIsNotRealGroundTruth,true);
 await page.locator('#v104-right').click();
 report=JSON.parse(await page.locator('#v104-report').textContent());
 assert.equal(report.requestedFace,'RIGHT');
 assert.equal(report.axes.normal[0],1);
 assert.equal(report.workPerformedOnDemand.actualFacesGenerated,2);
 await page.locator('#v104-right').click();
 report=JSON.parse(await page.locator('#v104-report').textContent());
 assert.equal(report.workPerformedOnDemand.actualFacesGenerated,2);
 // The UI displays the precomputed TOP through one cached lookup before
 // the repeated RIGHT click: two cache hits, zero extra faces rebuilt.
 assert.equal(report.workPerformedOnDemand.cacheHits,2);
 const before=await page.locator('#v104-depth-canvas').screenshot();
 // Do not label an automatically inferred second view as measured image.
 await page.locator('#v104-back').click();
 const back=JSON.parse(await page.locator('#v104-report').textContent());
 assert.equal(back.workPerformedOnDemand.actualFacesGenerated,3);
 assert.equal(back.releasePASS,false);
 const after=await page.locator('#v104-depth-canvas').screenshot();
 assert.notEqual(createHash('sha256').update(before).digest('hex'),
  createHash('sha256').update(after).digest('hex'));
 await page.locator('#v104-summary').click();
 const six=JSON.parse(await page.locator('#v104-report').textContent());
 assert.equal(six.perFace.length,6);
 assert.equal(six.originalTriangleCount,12);
 assert.equal(six.sixTimesThreeProjectionChannels,18);
 assert.equal(six.realSpatialDimensions,3);
 assert.equal(six.independentlyObservedFaceCount,0);
 assert.equal(six.missingSideAndBottomGroundTruthBlocked,true);
 // User-given CAD XY values remain AI_ESTIMATED until user confirms they
 // were directly observed/measured. Just box extent match is not likeness.
 await page.locator('#v104-cad-outline').fill(
  JSON.stringify([[-130,-130],[130,-130],[130,130],[-130,130]]));
 await page.locator('#v104-cad-compare').click();
 const cad=JSON.parse(await page.locator('#v104-report').textContent());
 assert.equal(cad.originalTopObservationType,'AI_ESTIMATED');
 assert.equal(cad.topPlaneHeightNotMeasured,true);
 assert.equal(cad.onDemandFacesGenerated,1);
 assert.equal(cad.real3DHasNotBeenReshapedToFakeCADMatch,true);
 assert.equal(cad.releasePASS,false);
 const finalScreenshot=await page.locator('#v104-depth-canvas').screenshot();
 await writeFile(dir+'/V104-CAD-TOP-REAL-XYZ-DEPTH.png',finalScreenshot);
 await writeFile(dir+'/V104-SIX-FACE-SOURCE-GATE.json',
  JSON.stringify({
   sourceSha256:sourceSHA,
   sourceFaceCount:12,
   topWasActuallyCalculatedFirst:true,
   otherFacesOnlyOnDemand:true,
   six,annotatedCAD:cad,
   actualNeuralAIReconstructionRun:false,
   unknownSidesWereNotMeasured:false,
   unobservedFaceReconstructionPASS:false,
   releasePASS:false
  },null,2));
 assert.deepEqual(errors,[]);
 console.log('AIG_REAL3D_V104_CNC_CAD_TOP_FIRST_LAZY_SIX_FACE_CHROMIUM_PASS',
  JSON.stringify({faces:six.perFace.length,
   sourceTriangles:six.originalTriangleCount,
   independentFaceGroundTruthCount:six.independentlyObservedFaceCount,
   sixteenBitDepthOrGPUNotClaimed:true,
   actualOneIndexedXYZSource:true,
   sourceSha256:sourceSHA}));
}finally{await browser.close();}
