/* V99 Playwright real browser binary GLB intake from V97 known source output.
 * Synthetic image ONLY tests source pipeline. No AI weights => NO AI claim.
 */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
const folder='artifacts/aig-real3d-v99-native';
await mkdir(folder,{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 '--enable-webgl','--use-gl=angle','--use-angle=swiftshader',
 '--no-sandbox','--disable-dev-shm-usage'
]});
const page=await browser.newPage({acceptDownloads:true,viewport:{width:1500,height:950}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:8772/shared-3d/aig-real3d-v99-native-source-lab.html',{
  waitUntil:'domcontentloaded',timeout:30000
 });
 const payload=await page.evaluate(async()=>{
  const V=await import('./aig-real3d-v97-auto-constrained-model.mjs');
  const E=await import('./aig-real3d-v97-export-animated-glb.mjs');
  const c=document.createElement('canvas');c.width=256;c.height=256;
  const g=c.getContext('2d',{willReadFrequently:true});
  g.fillStyle='#071629';g.fillRect(0,0,256,256);
  g.fillStyle='#dc9770';
  for(let y=30;y<=110;y++){
   const half=Math.round(31-13*((y-30)/80));
   g.fillRect(128-half,y,2*half+1,1);
  }
  const blob=await new Promise(resolve=>c.toBlob(resolve,'image/png'));
  const img=new Uint8Array(await blob.arrayBuffer());
  const digest=await crypto.subtle.digest('SHA-256',img);
  const sha=Array.from(new Uint8Array(digest),
   b=>b.toString(16).padStart(2,'0')).join('');
  const candidate=V.runAIGReal3DV97PhotoConstrainedModel({
   rgba:g.getImageData(0,0,256,256).data,width:256,height:256,
   imageSha256:sha,approvedIdentitySha256:'c'.repeat(64)
  });
  if(!candidate.candidate)throw Error('V99_QA_SOURCE_CANDIDATE_MISSING');
  const output=E.exportAIGReal3DV97AnimatedGLB({
   candidate:candidate.candidate,sourceImageSha256:sha});
  const binary=output.bytes;
  const b64=u=>{let s='';for(let i=0;i<u.length;i+=8000)
   s+=String.fromCharCode(...u.subarray(i,i+8000));
   return btoa(s);
  };
  return {image:b64(img),glb:b64(binary),sha,
   triangles:candidate.real3DSkinnedTriangles};
 });
 assert.equal(payload.triangles,3784);
 await page.locator('#reference').setInputFiles({
  name:'V99-QA-NONHUMAN-REFERENCE.png',mimeType:'image/png',
  buffer:Buffer.from(payload.image,'base64')
 });
 await page.locator('#mesh-file').setInputFiles({
  name:'V99-ACTUAL-V97-ANIMATED-GLTF2.glb',mimeType:'model/gltf-binary',
  buffer:Buffer.from(payload.glb,'base64')
 });
 await page.locator('#import').click();
 await page.waitForFunction(()=>{
  const t=document.querySelector('#status')?.textContent??'';
  return t.includes('已從真正 GLB')||t.startsWith('BLOCK');
 },null,{timeout:30000});
 const status=await page.locator('#status').textContent();
 if(status.startsWith('BLOCK'))throw Error('V99_GLTF_GPU_IMPORT_BLOCK: '+status+
  ' pageerrors='+JSON.stringify(errors));
 const proof=JSON.parse(await page.locator('#proof').textContent());
 assert.equal(proof.schema,'AIG_REAL3D_V99_REAL_NATIVE_GENERATED_GLB_SOURCE_V1');
 assert.equal(proof.originalImageSHA,payload.sha);
 assert.equal(proof.sourceFaceCount,3784);
 assert.equal(proof.realMeshes,1);
 assert.equal(proof.sourceSHAAndModelBytesVerified,true);
 assert.equal(proof.actuallyExecutedLocalAIModel,false);
 assert.equal(proof.actualNeuralModelWeightsInstalled,false);
 assert.equal(proof.finalCinemaQualityPASS,false);
 for(const view of ['#front','#side','#back','#oblique'])
  await page.locator(view).click();
 await page.locator('#quality').click();
 assert.ok((await page.locator('#status').textContent()).includes('4K 幾何'));
 const downloadPromise=page.waitForEvent('download',{timeout:90000});
 await page.locator('#png4k').click();
 const download=await downloadPromise;
 const image=await readFile(await download.path());
 assert.equal(image.readUInt32BE(0),0x89504e47);
 assert.equal(image.readUInt32BE(16),3840);
 assert.equal(image.readUInt32BE(20),2160);
 const actual=JSON.parse(await page.locator('#proof').textContent());
 assert.equal(actual.actualNativeGPUReadback,true);
 assert.equal(actual.realSource4KPNG_SHA,createHash('sha256').update(image).digest('hex'));
 await writeFile(folder+'/V99-REAL-GLB-SOURCE-NATIVE-4K.png',image);
 await writeFile(folder+'/V99-SOURCE-GLB-4K-AUDIT.json',JSON.stringify({
  ...actual,syntheticQANotRealFace:true},null,2));
 assert.deepEqual(errors,[]);
 console.log('AIG_REAL3D_V99_NATIVE_AI_OUTPUT_GLB_IMPORT_GPU_4K_PASS',JSON.stringify({
  originalSourceImageSHA:payload.sha,realSourceGLBSHA:actual.actualGLBSourceSHA,
  originalTriangles:actual.sourceFaceCount,
  nativeWidth:actual.actualNativeGPUFrameWidth,
  nativeHeight:actual.actualNativeGPUFrameHeight,
  originalMeshWasNotReplacedByLowPolyProxy:true,
  actualNeuralWeightsDeployed:false,
  formalFilmQualityPASS:false}));
}finally{await browser.close();}
