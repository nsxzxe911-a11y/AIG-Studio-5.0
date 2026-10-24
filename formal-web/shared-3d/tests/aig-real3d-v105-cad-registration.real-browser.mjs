/**
 * Real Chromium WebGL: actual 12-triangle multi-part source GLB, with one
 * deliberately reversed source face. AI source is not faked; it is a
 * deterministic structural repair test, not a generated real heroine face.
 */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const dir='artifacts/aig-real3d-v105-register';
await mkdir(dir,{recursive:true});
function originalGLB(){
 const base=[
  {n:[0,0,1],v:[[-1,-2,3],[1,-2,3],[1,2,3],[-1,2,3]]},
  {n:[0,0,-1],v:[[1,-2,-3],[-1,-2,-3],[-1,2,-3],[1,2,-3]]},
  {n:[1,0,0],v:[[1,-2,3],[1,-2,-3],[1,2,-3],[1,2,3]]},
  {n:[-1,0,0],v:[[-1,-2,-3],[-1,-2,3],[-1,2,3],[-1,2,-3]]},
  {n:[0,1,0],v:[[-1,2,3],[1,2,3],[1,2,-3],[-1,2,-3]]},
  {n:[0,-1,0],v:[[-1,-2,-3],[1,-2,-3],[1,-2,3],[-1,-2,3]]}
 ];
 const positions=[],normals=[],indices=[];
 for(let i=0;i<base.length;i++){
  const f=base[i],v0=positions.length/3;
  for(const p of f.v){positions.push(...p);normals.push(...f.n);}
  indices.push(v0,v0+1,v0+2,v0,v0+2,v0+3);
 }
 const p=new Float32Array(positions),n=new Float32Array(normals),
  idx=new Uint16Array(indices),
  pByte=new Uint8Array(p.buffer),nByte=new Uint8Array(n.buffer),
  iByte=new Uint8Array(idx.buffer),
  binary=new Uint8Array(pByte.length+nByte.length+iByte.length);
 binary.set(pByte);binary.set(nByte,pByte.length);binary.set(iByte,pByte.length+nByte.length);
 const gltf={asset:{version:'2.0'},buffers:[{byteLength:binary.length}],
  bufferViews:[
   {buffer:0,byteOffset:0,byteLength:pByte.length},
   {buffer:0,byteOffset:pByte.length,byteLength:nByte.length},
   {buffer:0,byteOffset:pByte.length+nByte.length,byteLength:iByte.length}],
  accessors:[
   {bufferView:0,componentType:5126,count:24,type:'VEC3'},
   {bufferView:1,componentType:5126,count:24,type:'VEC3'},
   {bufferView:2,componentType:5123,count:36,type:'SCALAR'}],
  meshes:[{primitives:[{attributes:{POSITION:0,NORMAL:1},indices:2,mode:4}]}],
  scenes:[{nodes:[0]}],nodes:[{mesh:0}],scene:0};
 const json=new TextEncoder().encode(JSON.stringify(gltf)),
  jsonLen=Math.ceil(json.length/4)*4,binLen=Math.ceil(binary.length/4)*4;
 const out=new Uint8Array(12+8+jsonLen+8+binLen),dv=new DataView(out.buffer);
 dv.setUint32(0,0x46546c67,true);dv.setUint32(4,2,true);
 dv.setUint32(8,out.byteLength,true);
 dv.setUint32(12,jsonLen,true);dv.setUint32(16,0x4e4f534a,true);
 out.fill(32,20,20+jsonLen);out.set(json,20);
 const off=20+jsonLen;
 dv.setUint32(off,binLen,true);dv.setUint32(off+4,0x004e4942,true);
 out.set(binary,off+8);
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
  name:'V105-OBSERVED-CAD-METRIC-TEST.png',mimeType:'image/png',buffer:Buffer.from(source)
 });
 await page.locator('#mesh-file').setInputFiles({
  name:'V105-TRUE-BOX-INDEXED-GLB.glb',
  mimeType:'model/gltf-binary',buffer:Buffer.from(binary)
 });
 await page.locator('#v104-units').selectOption('MM');
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


 assert.equal(await page.locator('#v105-compare').isEnabled(),true);
 const sourceSHA=createHash('sha256').update(binary).digest('hex');
 const top=JSON.parse(await page.locator('#v104-report').textContent());
 assert.equal(top.originalIndexedTriangles,12);
 assert.equal(top.requestedFace,'TOP');
 const shifted=[[-.72,-3.22],[1.28,-3.22],[1.28,2.78],[-.72,2.78]];
 await page.locator('#v104-cad-outline').fill(JSON.stringify(shifted));
 await page.locator('#v105-compare').click();
 let report=JSON.parse(await page.locator('#v105-report').textContent());
 assert.equal(report.status,'BLOCK_AI_ESTIMATED_TOP_CANNOT_REGISTER');
 assert.equal(report.sourceVisibility,'AI_ESTIMATED');
 assert.equal(report.workingCopyAvailable,false);
 assert.equal(report.sourceGeometryUnchanged,true);
 assert.equal(report.originalGLBSha256,sourceSHA);
 assert.ok(report.originalRasterIoU>=0);
 assert.ok(report.bestRasterIoU>=report.originalRasterIoU);
 await page.locator('#v104-cad-observed').check();
 await page.locator('#v105-compare').click();
 report=JSON.parse(await page.locator('#v105-report').textContent());
 assert.equal(report.status,'OBSERVED_SILHOUETTE_COMPARISON_ONLY_NOT_AUTHORIZED');
 assert.equal(report.workingCopyAvailable,false);
 assert.ok(report.bestRasterIoU>report.originalRasterIoU+.025);
 await page.locator('#v105-authorize').check();
 await page.locator('#v105-compare').click();
 report=JSON.parse(await page.locator('#v105-report').textContent());
 assert.equal(report.status,'CAD_XY_REGISTRATION_WORKING_COPY_READY');
 assert.equal(report.workingCopyAvailable,true);
 assert.equal(report.explicitlyAuthorized,true);
 assert.equal(report.observedHeightOrBackFaceCertified,false);
 assert.equal(report.releasePASS,false);
 assert.ok(report.measuredRasterIoUImprovement>=.025);
 const actualGPUStatus=await page.locator('#status').textContent();
 assert.ok(actualGPUStatus.includes('V105 實測 CAD XY 定位工作副本'),
  'V105_GPU_WORKING_COPY_NOT_RENDERED_'+actualGPUStatus);
 const gpuReceipt=JSON.parse(await page.locator('#proof').textContent());
 assert.equal(gpuReceipt.actualGLBSourceSHA,sourceSHA);
 assert.equal(gpuReceipt.sourceFaceCount,12);
 assert.equal(gpuReceipt.V101ActiveTriangleCount,12);
 // Real V104 source refresh must preserve manually entered CAD polygon.
 const preserved=await page.locator('#v104-cad-outline').inputValue();
 assert.equal(preserved,JSON.stringify(shifted));
 const png=await page.locator('#v105-compare-canvas').screenshot();
 await writeFile(dir+'/V105-CAD-SILHOUETTE-IOU-ALIGNED.png',png);
 await writeFile(dir+'/V105-TRUE-MESH-REGISTRATION-QA.json',JSON.stringify({
  originalModelGLBSHA:sourceSHA,
  sourceTriCount:12,cadObservedOnlyWithExplicitCheckbox:true,
  alignmentComparison:report,
  nativeGPUReRenderedWorkingMesh:true,
  originalMeshSourceUnchanged:true,
  learnedAIModelInferenceWasNotCalled:true,
  hiddenSidePhotoAuthenticityCertified:false,
  releasePASS:false
 },null,2));
 assert.deepEqual(errors,[]);
 console.log('AIG_REAL3D_V105_REAL_CAD_SILHOUETTE_REGISTRATION_GPU_PASS',
  JSON.stringify({triangles:12,originalGLBSHA:sourceSHA,
   originalIoU:report.originalRasterIoU,
   improvedIoU:report.bestRasterIoU,
   xyMM:report.proposedTranslationCNCmm,realGPUWorkingCopy:true,
   sourceGLBNoReconstruction:true,releasePASS:false}));
}finally{await browser.close();}
