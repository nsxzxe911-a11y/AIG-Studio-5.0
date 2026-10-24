/* Native Chromium Real3D V92: original 4418 triangulated skin + sphere in same GPU frame. */
import {chromium} from 'playwright';
import {mkdir,readFile,copyFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {readAIGReal3DBrowserBlobBytes} from './aig-real3d-browser-blob-bytes.mjs';
const dir='artifacts/aig-real3d-v92-source-rig-sport-film';
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 '--enable-webgl','--use-gl=angle','--use-angle=swiftshader',
 '--no-sandbox','--disable-dev-shm-usage'
]});
const page=await browser.newPage({acceptDownloads:true,viewport:{width:1200,height:900}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:8772/shared-3d/aig-real3d-rig-sport-film-lab.html',
  {waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('V92 真 3D'),
  null,{timeout:30000});
 assert.equal(await page.locator('#v92-play').isDisabled(),false);
 const result=await page.evaluate(async()=>{
  const QA=await import('./aig-real3d-v92-qa-fixture.mjs');
  const GPU=await import('./aig-real3d-webgl.mjs');
  const check=QA.buildAIGReal3DV92NonhumanQA({sport:'TENNIS',
   wrapMode:'FULL_WRAP'});
  const original=JSON.stringify(check.mesh.positions)+JSON.stringify(check.mesh.indices);
  const c=document.createElement('canvas');c.width=640;c.height=640;
  const renderer=GPU.createAIG3DRenderer(c,{quality:'balanced',pixelRatio:1,
   maxTriangles:18000,background:[.02,.035,.06,1]});
  if(renderer.status!=='READY')throw Error('V92_REAL_SOURCE_GPU_REQUIRED');
  renderer.setInspectionMode('LIT');
  renderer.setCamera({projection:'orthographic',yaw:.35,pitch:.18,
   focus:[0,1.55,0],orthoSpan:2.6,distance:4});
  try{
   const first=check.film.renderFrame(renderer,0);
   const before=await renderer.captureNativePNG(check.film.scene,{width:640,height:640});
   const buffers=renderer.getGPUResourceAccounting();
   const last=check.film.renderFrame(renderer,check.film.frameCount-1);
   const after=await renderer.captureNativePNG(check.film.scene,{width:640,height:640});
   const afterBuffers=renderer.getGPUResourceAccounting();
   const a=document.createElement('a');a.id='v92-qa-download';
   a.href=URL.createObjectURL(after.blob);a.download='V92-NONHUMAN-SKINNED-SPORT-GPU.png';
   document.body.appendChild(a);
   return {sourceOriginalTriangles:check.mesh.triangleCount,
    realRenderedCombinedTriangles:last.triangles,
    before:before.sha256,after:after.sha256,
    realGPUReadbackBefore:before.genuineGpuReadback,
    realGPUReadbackAfter:after.genuineGpuReadback,
    trueSkinGPUIncrementalUploads:afterBuffers.bufferSubDataUpdates-buffers.bufferSubDataUpdates,
    newFullGPUUploadsBetweenFrames:afterBuffers.fullBufferDataUploads-buffers.fullBufferDataUploads,
    originalSourceVerticesAndIndicesUnmodified:
     JSON.stringify(check.mesh.positions)+JSON.stringify(check.mesh.indices)===original,
    actorAndBallSimultaneouslyDrawn:last.actorAndBallRenderedInSameGPUFrame,
    fullActorSkeletonCount:last.actorJointsFullySampled,
    proofHasExternalRealSourceScan:false,
    independentlyCalibratedSportsContact:false,releasePASS:false};
  }finally{renderer.destroy();}
 });
 assert.equal(result.sourceOriginalTriangles,4418);
 assert.ok(result.realRenderedCombinedTriangles>6000);
 assert.equal(result.realGPUReadbackBefore,true);
 assert.equal(result.realGPUReadbackAfter,true);
 assert.notEqual(result.before,result.after);
 assert.ok(result.trueSkinGPUIncrementalUploads>0);
 assert.equal(result.newFullGPUUploadsBetweenFrames,0);
 assert.equal(result.originalSourceVerticesAndIndicesUnmodified,true);
 assert.equal(result.actorAndBallSimultaneouslyDrawn,true);
 assert.equal(result.fullActorSkeletonCount,2);
 const bytes=await readAIGReal3DBrowserBlobBytes(page,'#v92-qa-download');
 assert.equal(bytes.readUInt32BE(0),0x89504e47);
 assert.equal(bytes.readUInt32BE(16),640);
 assert.equal(bytes.readUInt32BE(20),640);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),result.after);
 await writeFile(dir+'/V92-NONHUMAN-SKINNED-SPORT-GPU.png',bytes);
 const support=await page.evaluate(()=>({
  realRecorder:typeof MediaRecorder==='function',
  vp8:typeof MediaRecorder==='function'&&
   MediaRecorder.isTypeSupported('video/webm;codecs=vp8'),
  captureStream:typeof HTMLCanvasElement.prototype.captureStream==='function'
 }));
 let movie={status:'ENCODER_UNAVAILABLE_BLOCK',support};
 if(support.realRecorder&&support.vp8&&support.captureStream){
  await page.locator('#v92-webm').click();
  await page.locator('#v92-download a[href^="blob:"]').waitFor({timeout:90000});
  const data=await readAIGReal3DBrowserBlobBytes(page,'#v92-download a');
  assert.ok(data.length>256);
  assert.equal(data.readUInt32BE(0),0x1a45dfa3);
  await writeFile(dir+'/V92-NONHUMAN-RIG-SPORT-FILM.webm',data);
  movie={status:'REAL_WEBM_BYTES',bytes:data.length,
   sha256:createHash('sha256').update(data).digest('hex'),
   independentlyDecodedAndFPSVerified:false};
 }
 await writeFile(dir+'/V92-RIG-CONTACT-GPU-MOVIE-EVIDENCE.json',
  JSON.stringify({result,movie},null,2));
 assert.deepEqual(errors,[]);
 console.log('AIG_REAL3D_V92_RIG_ACTOR_BALL_SOURCE_NATIVE_GPU_PASS',
  JSON.stringify({result,movie}));
}finally{await browser.close();}
