/* Chromium actual true 3D candidate from one image, joint motion GPU pixels,
 * SHA and honest identity status. Never claim photo 1:1 or full movie.
 */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {readAIGReal3DBrowserBlobBytes}
 from './aig-real3d-browser-blob-bytes.mjs';
const dir='artifacts/aig-real3d-v95-photo-to-3d';
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 '--enable-webgl','--use-gl=angle','--use-angle=swiftshader',
 '--no-sandbox','--disable-dev-shm-usage'
]});
const page=await browser.newPage({acceptDownloads:true,
 viewport:{width:1250,height:950}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:8772/shared-3d/aig-real3d-v95-auto-film-lab.html',
  {waitUntil:'domcontentloaded',timeout:30000});
 const img=await page.evaluate(()=>{
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
  const g=canvas.getContext('2d');
  g.fillStyle='#091629';g.fillRect(0,0,256,256);
  g.fillStyle='#d38f70';g.fillRect(93,24,70,96);
  g.fillStyle='#202837';g.fillRect(70,120,116,136);
  return canvas.toDataURL('image/png').split(',')[1];
 });
 const sourcePNG=Buffer.from(img,'base64');
 await page.locator('#photo').setInputFiles({
  name:'synthetic-portrait-NONHUMAN-QA.png',mimeType:'image/png',buffer:sourcePNG
 });
 await page.locator('#build').click();
 await page.waitForFunction(()=>{
  const status=document.querySelector('#status')?.textContent??'';
  return status.includes('真 WebGL 3D 影格')||status.startsWith('BLOCK');
 },null,{timeout:30000});
 const status=await page.locator('#status').textContent();
 if(status.startsWith('BLOCK'))throw Error('V95_PROTOTYPE_BLOCK:+status+
  '; pageerrors='+JSON.stringify(errors));
 const panel=JSON.parse(await page.locator('#evidence').textContent());
 assert.equal(panel.pipeline,'AIG_REAL3D_V95_LOCAL_AUTO_3D_MOVIE_PIPELINE_V1');
 assert.equal(panel.visualFaceIdentityActuallyVerified,false);
 assert.equal(panel.trainedAIModelActuallyInvoked,false);
 assert.equal(panel.fullBodyHeightActuallyMeasured,false);
 assert.ok(panel.actualIndexed3DTriangles>2000);
 assert.equal(panel.actualJointCount,6);
 await page.locator('#side').click();
 await page.locator('#frame').evaluate(el=>{
  el.value='80';el.dispatchEvent(new Event('input',{bubbles:true}));
 });
 const progress=JSON.parse(await page.locator('#evidence').textContent());
 assert.ok(progress.currentMotionSeconds>=.6);
 await page.locator('#plan').click();
 assert.ok((await page.locator('#status').textContent()).includes('190272'));
 // Native screen is not sufficient: reconstruct the same deterministic
 // pixels and take real GPU readbacks of two genuine animated indexed poses.
 const proof=await page.evaluate(async()=>{
  const A=await import('./aig-real3d-v95-ai-orchestrator.mjs');
  const GPU=await import('./aig-real3d-webgl.mjs');
  const c=document.createElement('canvas');c.width=640;c.height=640;
  const sr=document.createElement('canvas');sr.width=256;sr.height=256;
  const g=sr.getContext('2d',{willReadFrequently:true});
  g.fillStyle='#091629';g.fillRect(0,0,256,256);
  g.fillStyle='#d38f70';g.fillRect(93,24,70,96);
  g.fillStyle='#202837';g.fillRect(70,120,116,136);
  const png=await new Promise(resolve=>sr.toBlob(resolve,'image/png'));
  const bytes=await png.arrayBuffer();
  const sourceSHA=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),
   b=>b.toString(16).padStart(2,'0')).join('');
  const data=g.getImageData(0,0,256,256).data;
  const result=A.runAIGReal3DLocalPortraitToRig({
   rgba:data,width:256,height:256,imageSha256:sourceSHA,
   approvedIdentitySha256:'b'.repeat(64)
  });
  if(!result.true3DModelGenerated)throw Error('NO_TRUE_SOURCE_3D_GEOMETRY');
  const renderer=GPU.createAIG3DRenderer(c,{quality:'balanced',
   pixelRatio:1,maxTriangles:200000,background:[.025,.042,.06,1]});
  if(renderer.status!=='READY')throw Error('V95_NATIVE_GPU_NOT_READY');
  renderer.setInspectionMode('LIT');
  renderer.setCamera({projection:'orthographic',yaw:.30,pitch:.17,
   focus:[0,.84,0],orthoSpan:2.15,distance:4});
  try{
   const mesh=result.candidate.mesh;
   const originalPositions=JSON.stringify(mesh.positions),
    originalIndices=JSON.stringify(mesh.indices);
   result.candidate.rig.updateGPU(renderer,0);
   const before=await renderer.captureNativePNG(
    result.candidate.rig.workingScene,{width:640,height:640});
   const accounting=renderer.getGPUResourceAccounting();
   result.candidate.rig.updateGPU(renderer,.5);
   const after=await renderer.captureNativePNG(
    result.candidate.rig.workingScene,{width:640,height:640});
   const later=renderer.getGPUResourceAccounting();
   const a=document.createElement('a');a.id='v95-real-gpu-source-png';
   a.href=URL.createObjectURL(after.blob);
   a.download='V95-NONHUMAN-AUTO-3D-PROXY.png';
   document.body.append(a);
   return {schema:result.schema,sourceSHA,
    trueSourceXYZTriangles:mesh.triangleCount,
    trueSkinnedJointCount:result.candidate.rig.boneCount,
    sourceGeometryUnmodified:originalPositions===JSON.stringify(mesh.positions)&&
     originalIndices===JSON.stringify(mesh.indices),
    nativeGPUbefore:before.genuineGpuReadback,
    nativeGPUafter:after.genuineGpuReadback,
    shaBefore:before.sha256,shaAfter:after.sha256,
    fullBufferReuploads:later.fullBufferDataUploads-accounting.fullBufferDataUploads,
    incrementalVertexUpdates:later.bufferSubDataUpdates-accounting.bufferSubDataUpdates,
    authenticHumanIdentityPASS:false,measuredBodyShapePASS:false,
    photoBasedTrainedAIModelUsed:false,
    fullMovieEncoded:false,releasePASS:false};
  }finally{renderer.destroy();}
 });
 assert.ok(proof.trueSourceXYZTriangles>2000);
 assert.equal(proof.trueSkinnedJointCount,6);
 assert.equal(proof.nativeGPUbefore,true);
 assert.equal(proof.nativeGPUafter,true);
 assert.notEqual(proof.shaBefore,proof.shaAfter);
 assert.equal(proof.sourceGeometryUnmodified,true);
 assert.equal(proof.fullBufferReuploads,0);
 assert.ok(proof.incrementalVertexUpdates>0);
 const image=await readAIGReal3DBrowserBlobBytes(page,'#v95-real-gpu-source-png');
 assert.equal(image.readUInt32BE(0),0x89504e47);
 assert.equal(image.readUInt32BE(16),640);
 assert.equal(image.readUInt32BE(20),640);
 assert.equal(createHash('sha256').update(image).digest('hex'),proof.shaAfter);
 assert.deepEqual(errors,[]);
 await writeFile(dir+'/V95-AUTO-INFERRED-3D-GPU.png',image);
 await writeFile(dir+'/V95-AUTO-3D-SOURCE-GATE.json',JSON.stringify({proof,panel},null,2));
 console.log('AIG_REAL3D_V95_LOCAL_AUTOMATED_INFERRED_TRUE_3D_GPU_PASS',
  JSON.stringify(proof));
}finally{await browser.close();}
