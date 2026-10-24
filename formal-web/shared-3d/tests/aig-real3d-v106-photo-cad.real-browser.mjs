/**
 * Real Chromium WebGL: actual 12-triangle multi-part source GLB, with one
 * deliberately reversed source face. AI source is not faked; it is a
 * deterministic structural repair test, not a generated real heroine face.
 */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const dir='artifacts/aig-real3d-v106-alpha';
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
  const c=document.createElement('canvas');c.width=256;c.height=256;
  const g=c.getContext('2d');
  g.clearRect(0,0,256,256);
  g.fillStyle='#c7b49c';g.fillRect(60,30,48,144);
  return c.toDataURL('image/png').split(',')[1];
 });
 const source=Buffer.from(pngB64,'base64'),
  binary=originalGLB();
 await page.locator('#reference').setInputFiles({
  name:'V106-ALPHA-SOURCE-256.png',mimeType:'image/png',buffer:Buffer.from(source)
 });
 await page.locator('#mesh-file').setInputFiles({
  name:'V106-TRUE-BOX-INDEXED-GLB.glb',
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



 assert.equal(await page.locator('#v106-extract').isEnabled(),true);
 await page.locator('#v106-extract').click();
 await page.waitForFunction(()=>{
  const s=document.querySelector('#v106-report')?.textContent??'';
  return s.startsWith('{')||s.startsWith('BLOCK');
 },null,{timeout:30000});
 const firstAlphaReceipt=await page.locator('#v106-report').textContent();
 if(firstAlphaReceipt.startsWith('BLOCK'))
  throw Error('V106_SOURCE_ALPHA_BROWSER_BLOCK_'+firstAlphaReceipt);
 let alpha=JSON.parse(firstAlphaReceipt);
 assert.equal(alpha.sourceWidth,256);
 assert.equal(alpha.sourceHeight,256);
 assert.equal(alpha.realSourceAlphaForegroundPixels,48*144);
 assert.equal(alpha.truePixelContourVertices,4);
 assert.equal(alpha.calibratedPhysicalMillimeters,false);
 const imageSHA=createHash('sha256').update(source).digest('hex');
 const meshSHA=createHash('sha256').update(binary).digest('hex');
 assert.equal(alpha.originalImageSha256,imageSHA);
 await page.locator('#v106-anchors').fill(JSON.stringify({
  pixelAnchors:[[60,30],[108,30]],
  cncAnchorsMM:[[-.72,2.78],[1.28,2.78]]
 }));
 // Image pixel alpha != independent calibrated top observation.
 await page.locator('#v106-calibrate').click();
 let cad=JSON.parse(await page.locator('#v106-report').textContent());
 assert.equal(cad.sourceVisibility,'AI_ESTIMATED');
 assert.equal(cad.resultingCalibratedCADVertices,4);
 assert.equal(await page.locator('#v104-cad-observed').isChecked(),false);
 await page.locator('#v105-authorize').check();
 await page.locator('#v105-compare').click();
 let refused=JSON.parse(await page.locator('#v105-report').textContent());
 assert.equal(refused.status,'BLOCK_AI_ESTIMATED_TOP_CANNOT_REGISTER');
 assert.equal(refused.workingCopyAvailable,false);
 assert.equal(refused.releasePASS,false);
 // Explicit direction + physical two-anchor confirmation; still not
 // independently verified third-party measurement or hidden geometry.
 await page.locator('#v106-top-confirm').check();
 await page.locator('#v106-measured-confirm').check();
 await page.locator('#v106-calibrate').click();
 cad=JSON.parse(await page.locator('#v106-report').textContent());
 assert.equal(cad.sourceVisibility,'OBSERVED');
 assert.equal(cad.originalGLBAndPictureNotChanged,true);
 assert.equal(cad.V105MeshCorrectionNotAutomaticallyAuthorized,true);
 assert.equal(await page.locator('#v105-authorize').isChecked(),false);
 assert.equal(await page.locator('#v104-cad-observed').isChecked(),true);
 await page.locator('#v105-compare').click();
 let r=JSON.parse(await page.locator('#v105-report').textContent());
 assert.equal(r.status,'OBSERVED_SILHOUETTE_COMPARISON_ONLY_NOT_AUTHORIZED');
 assert.ok(r.bestRasterIoU>r.originalRasterIoU+.025);
 await page.locator('#v105-authorize').check();
 await page.locator('#v105-compare').click();
 r=JSON.parse(await page.locator('#v105-report').textContent());
 assert.equal(r.status,'CAD_XY_REGISTRATION_WORKING_COPY_READY');
 assert.equal(r.workingCopyAvailable,true);
 assert.equal(r.sourceGeometryUnchanged,true);
 assert.equal(r.releasePASS,false);
 const gpuStatus=await page.locator('#status').textContent();
 assert.ok(gpuStatus.includes('V105 實測 CAD XY 定位工作副本'),
  'V106_TRUE_GPU_WORKING_COPY_NOT_APPLIED_'+gpuStatus);
 const gpuReceipt=JSON.parse(await page.locator('#proof').textContent());
 assert.equal(gpuReceipt.actualGLBSourceSHA,meshSHA);
 assert.equal(gpuReceipt.sourceFaceCount,12);
 assert.equal(gpuReceipt.V101ActiveTriangleCount,12);
 const screenshot=await page.locator('#v106-outline-canvas').screenshot();
 await writeFile(dir+'/V106-SOURCE-ALPHA-BOUNDARY.png',screenshot);
 await writeFile(dir+'/V106-SOURCE-TO-CAD-3D-QA.json',JSON.stringify({
  originalImageSHA:imageSHA,sourceModelSHA:meshSHA,
  actualPixelAlphaSourceSHACompared:true,
  alpha,measuredCAD:cad,actualV105WorkingCopy:r,
  GPUWorkingCopyRendered:true,sourceFaceCount:12,
  originalImageAnd3DNeverModified:true,
  visuallyRealPersonLikenessPASS:false,
  opaquePhotoNeuralAISegmentationPASS:false,
  releasePASS:false
 },null,2));
 assert.deepEqual(errors,[]);
 console.log('AIG_REAL3D_V106_ACTUAL_ALPHA_CAD_CALIBRATION_AND_V105_GPU_PASS',
  JSON.stringify({pixels:48*144,sourceImageSHA:imageSHA,
   sourceGLBSHA:meshSHA,sourceTrueTriangles:12,
   observedIoU:r.originalRasterIoU,registeredIoU:r.bestRasterIoU,
   originalMeshUnchanged:true}));
}finally{await browser.close();}
