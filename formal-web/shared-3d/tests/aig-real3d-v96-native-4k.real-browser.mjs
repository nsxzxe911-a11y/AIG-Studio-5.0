/* V96 Chromium actual native UHD 4K source-geometry GPU screenshot QA.
 * Only 3840x2160 real readPixels; no 1080p canvas rescale.
 * Synthetic image source tests pipeline wiring, not a real human photo.
 */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {readAIGReal3DBrowserBlobBytes}
 from './aig-real3d-browser-blob-bytes.mjs';
const dir='artifacts/aig-real3d-v96-native-4k';
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 '--enable-webgl','--use-gl=angle','--use-angle=swiftshader',
 '--no-sandbox','--disable-dev-shm-usage'
]});
const page=await browser.newPage({acceptDownloads:true,viewport:{width:1450,height:1000}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:8772/shared-3d/aig-real3d-v95-auto-film-lab.html',
  {waitUntil:'domcontentloaded',timeout:30000});
 const src=await page.evaluate(()=>{
  const c=document.createElement('canvas');c.width=256;c.height=256;
  const g=c.getContext('2d');
  g.fillStyle='#111a2c';g.fillRect(0,0,256,256);
  g.fillStyle='#d39e84';g.fillRect(90,24,76,100);
  g.fillStyle='#263747';g.fillRect(73,124,110,132);
  return c.toDataURL('image/png').split(',')[1];
 });
 await page.locator('#photo').setInputFiles({
  name:'V96-QA-NONHUMAN-COLOR-BLOCK.png',mimeType:'image/png',
  buffer:Buffer.from(src,'base64')
 });
 await page.locator('#build').click();
 await page.waitForFunction(()=>{
  const s=document.querySelector('#status')?.textContent??'';
  return s.startsWith('BLOCK')||s.includes('真 WebGL 3D 影格');
 },null,{timeout:30000});
 const status=await page.locator('#status').textContent();
 if(status.startsWith('BLOCK'))throw Error('V96_VISUAL_RUNTIME_BLOCK_'+status);
 await page.locator('#quality4k').click();
 const qa=JSON.parse(await page.locator('#quality-report').textContent());
 assert.equal(qa.output,'UHD_4K');
 assert.equal(qa.plan.nativeFramebufferPixels,8294400);
 assert.equal(qa.outputPixelsAreActual4KIfNativeCaptureSucceeds,false);
 assert.equal(qa.geometricDetail.sourceMaterialTextureResolutionVerified,false);
 // Direct actual native framebuffer proof with source-preserving shared GPU
 // rather than browser download timing. This is not a movie frame sequence.
 const proof=await page.evaluate(async()=>{
  const PIPE=await import('./aig-real3d-v96-native-4k-pipeline.mjs');
  const A=await import('./aig-real3d-v95-ai-orchestrator.mjs');
  const GPU=await import('./aig-real3d-webgl.mjs');
  const img=document.createElement('canvas');img.width=256;img.height=256;
  const g=img.getContext('2d',{willReadFrequently:true});
  g.fillStyle='#111a2c';g.fillRect(0,0,256,256);
  g.fillStyle='#d39e84';g.fillRect(90,24,76,100);
  g.fillStyle='#263747';g.fillRect(73,124,110,132);
  const png=await new Promise(resolve=>img.toBlob(resolve,'image/png'));
  const digest=await crypto.subtle.digest('SHA-256',await png.arrayBuffer());
  const sha=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
  const out=A.runAIGReal3DLocalPortraitToRig({
   rgba:g.getImageData(0,0,256,256).data,width:256,height:256,
   imageSha256:sha,approvedIdentitySha256:'b'.repeat(64)
  });
  if(!out.true3DModelGenerated)throw Error('4K_ORIGINAL_SOURCE_GEOMETRY_MISSING');
  const glCanvas=document.createElement('canvas');
  glCanvas.width=640;glCanvas.height=640;
  const renderer=GPU.createAIG3DRenderer(glCanvas,{quality:'balanced',
   pixelRatio:1,maxTriangles:200000,preserveDrawingBuffer:true,
   background:[.018,.032,.060,1]});
  if(renderer.status!=='READY')throw Error('V96_NATIVE_CHROMIUM_GPU_UNAVAILABLE');
  const originalTriangles=out.candidate.mesh.triangleCount,
   sourceBefore=JSON.stringify(out.candidate.mesh.positions),
   facesBefore=JSON.stringify(out.candidate.mesh.indices);
  renderer.setInspectionMode('LIT');
  renderer.setCamera({projection:'orthographic',yaw:.57,pitch:.19,
   distance:4,focus:[0,.84,0],orthoSpan:2.15});
  try{
   out.candidate.rig.updateGPU(renderer,.5);
   const camera=renderer.getCamera();
   const detail=PIPE.auditAIGReal3D4KSourceProjection({
    scene:out.candidate.rig.workingScene,sourceSha256:sha,camera
   });
   const native=await PIPE.captureAIGReal3DNative4K({
    renderer,scene:out.candidate.rig.workingScene,
    sourceSha256:sha,output:'UHD_4K',workingMemoryMB:256,
    camera,requireSourceDetailPASS:false
   });
   const link=document.createElement('a');link.id='v96-original-4k-gpu';
   link.href=URL.createObjectURL(native.pngBlob);
   link.download='Real3D-V96-NATIVE-3840x2160.png';
   document.body.append(link);
   return {schema:native.schema,width:native.width,height:native.height,
    pixels:native.nativeFramePixels,realGpu:native.trueGPUReadPixels,
    pngSha:native.sha256,sourceImageSha:sha,
    sourceTriangles:originalTriangles,
    trianglesPreserved:originalTriangles===out.candidate.mesh.triangleCount,
    originalSourcePositionsUnmodified:
     sourceBefore===JSON.stringify(out.candidate.mesh.positions),
    originalFaceIdsUnmodified:facesBefore===JSON.stringify(out.candidate.mesh.indices),
    noUpscaling:native.resampledFromSmallerBitmap===false,
    lowPolyDetailBlocked:detail.sourceDetailCandidatePASS===false,
    sourceFacesAdded:detail.originalMeshFacesAdded,
    actual4K24ContinuousFramesEncoded:native.actual24FPSLongFilmPASS,
    identityConfirmed:native.faceIdentityOrAnatomicalAccuracyCertified,
    finalCinemaAccepted:native.releasePASS};
  }finally{renderer.destroy();}
 });
 assert.equal(proof.width,3840);assert.equal(proof.height,2160);
 assert.equal(proof.pixels,8294400);assert.equal(proof.realGpu,true);
 assert.equal(proof.noUpscaling,true);
 assert.equal(proof.trianglesPreserved,true);
 assert.equal(proof.originalSourcePositionsUnmodified,true);
 assert.equal(proof.originalFaceIdsUnmodified,true);
 assert.equal(proof.sourceFacesAdded,0);
 assert.equal(proof.lowPolyDetailBlocked,true);
 assert.equal(proof.finalCinemaAccepted,false);
 const png=await readAIGReal3DBrowserBlobBytes(page,'#v96-original-4k-gpu');
 assert.equal(png.readUInt32BE(0),0x89504e47);
 assert.equal(png.readUInt32BE(16),3840);
 assert.equal(png.readUInt32BE(20),2160);
 assert.equal(createHash('sha256').update(png).digest('hex'),proof.pngSha);
 assert.ok(png.length>12000);
 assert.deepEqual(errors,[]);
 await writeFile(dir+'/V96-REAL-NATIVE-GPU-3840x2160.png',png);
 await writeFile(dir+'/V96-NATIVE-4K-GPU-PROOF.json',JSON.stringify({proof,qa},null,2));
 console.log('AIG_REAL3D_V96_REAL_GPU_3840x2160_SOURCE_NO_UPSCALE_PASS',
  JSON.stringify(proof));
}finally{await browser.close();}
