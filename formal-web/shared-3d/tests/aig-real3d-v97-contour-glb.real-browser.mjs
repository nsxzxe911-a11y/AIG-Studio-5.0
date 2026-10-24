/** V97 actual Chromium: upload original color image, source contour-fit,
 * six-joint 3D WebGL, genuine animated binary GLB and source SHA.
 * Synthetic QA portrait is NOT user heroine or a natural-face realism proof.
 */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {readAIGReal3DBrowserBlobBytes}
 from './aig-real3d-browser-blob-bytes.mjs';
const folder='artifacts/aig-real3d-v97-photo-constrained';
await mkdir(folder,{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 '--enable-webgl','--use-gl=angle','--use-angle=swiftshader',
 '--no-sandbox','--disable-dev-shm-usage'
]});
const page=await browser.newPage({acceptDownloads:true,viewport:{width:1360,height:950}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:8772/shared-3d/aig-real3d-v95-auto-film-lab.html',{
  waitUntil:'domcontentloaded',timeout:30000});
 const image64=await page.evaluate(()=>{
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#101b32';ctx.fillRect(0,0,256,256);
  ctx.fillStyle='#d7956c';
  for(let y=30;y<=110;y++){
   const t=(y-30)/80,half=Math.round(31-13*t);
   ctx.fillRect(128-half,y,2*half+1,1);
  }
  ctx.fillStyle='#243245';ctx.fillRect(75,111,106,144);
  return canvas.toDataURL('image/png').split(',')[1];
 });
 await page.locator('#photo').setInputFiles({
  name:'V97-NONHUMAN-QA-COLOR-CONTOUR.png',mimeType:'image/png',
  buffer:Buffer.from(image64,'base64')
 });
 await page.locator('#build').click();
 await page.waitForFunction(()=>{
  const t=document.querySelector('#status')?.textContent??'';
  return t.startsWith('BLOCK')||t.includes('真 WebGL 3D 影格');
 },null,{timeout:30000});
 if((await page.locator('#status').textContent()).startsWith('BLOCK'))
  throw Error('V97_V95_BASELINE_SOURCE_BLOCK');
 await page.locator('#fit97').click();
 await page.waitForFunction(()=>{
  const p=document.querySelector('#v97-report')?.textContent??'';
  return p.includes('measuredContourErrorAfter')||
   (document.querySelector('#status')?.textContent??'').startsWith('BLOCK');
 },null,{timeout:30000});
 const text=await page.locator('#v97-report').textContent();
 if(!text.includes('measuredContourErrorAfter'))
  throw Error('V97_REAL_IMAGE_FIT_BLOCK: '+await page.locator('#status').textContent()+
   ' pageerrors='+JSON.stringify(errors));
 const report=JSON.parse(text);
 assert.equal(report.actualColorMaskObserved,true);
 assert.ok(report.realOriginalHeadVerticesMoved>100);
 assert.ok(report.measuredContourErrorAfter<report.measuredContourErrorBefore);
 assert.equal(report.contourFitImproved,true);
 assert.equal(report.source3DTriangles,3784);
 assert.equal(report.rigJoints,6);
 assert.equal(report.heroineIdentityPersonallyVerified,false);
 const downloadPromise=page.waitForEvent('download',{timeout:30000});
 await page.locator('#glb97').click();
 const download=await downloadPromise;
 assert.match(download.suggestedFilename(),/\.glb$/);
 const glb=await readFile(await download.path()),dv=new DataView(
  glb.buffer,glb.byteOffset,glb.byteLength);
 assert.equal(dv.getUint32(0,true),0x46546c67);
 assert.equal(dv.getUint32(4,true),2);
 assert.equal(dv.getUint32(8,true),glb.length);
 const jsonSize=dv.getUint32(12,true);
 const gltf=JSON.parse(new TextDecoder().decode(glb.subarray(20,20+jsonSize)));
 assert.equal(gltf.meshes[0].primitives[0].targets.length,3);
 assert.equal(gltf.animations[0].channels[0].target.path,'weights');
 assert.equal(gltf.extras.nativeGlTFBones,false);
 assert.equal(gltf.extras.sourceIdentityFaceStillBlocked,true);
 await writeFile(folder+'/V97-PHOTO-CONSTRAINED-MOVING-3D-CANDIDATE.glb',glb);
 const proof=await page.evaluate(async()=>{
  const A=await import('./aig-real3d-v97-auto-constrained-model.mjs');
  const G=await import('./aig-real3d-webgl.mjs');
  const src=document.createElement('canvas');src.width=256;src.height=256;
  const ctx=src.getContext('2d',{willReadFrequently:true});
  ctx.fillStyle='#101b32';ctx.fillRect(0,0,256,256);
  ctx.fillStyle='#d7956c';
  for(let y=30;y<=110;y++){
   const t=(y-30)/80,h=Math.round(31-13*t);
   ctx.fillRect(128-h,y,2*h+1,1);
  }
  ctx.fillStyle='#243245';ctx.fillRect(75,111,106,144);
  const image=await new Promise(resolve=>src.toBlob(resolve,'image/png'));
  const digest=await crypto.subtle.digest('SHA-256',await image.arrayBuffer());
  const SHA=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
  const input=ctx.getImageData(0,0,256,256).data;
  const result=A.runAIGReal3DV97PhotoConstrainedModel({
   rgba:input,width:256,height:256,imageSha256:SHA,
   approvedIdentitySha256:'b'.repeat(64)});
  const sourceMesh=result.candidate.mesh,faces=JSON.stringify(sourceMesh.indices),
   positions=JSON.stringify(sourceMesh.positions);
  const canvas=document.createElement('canvas');
  canvas.width=640;canvas.height=640;
  const renderer=G.createAIG3DRenderer(canvas,{quality:'balanced',
   pixelRatio:1,maxTriangles:200000,preserveDrawingBuffer:true,
   background:[.02,.036,.06,1]});
  if(renderer.status!=='READY')throw Error('V97_NO_TRUE_WEBGL_GPU');
  renderer.setInspectionMode('LIT');
  renderer.setColorPipeline('FILM_SDR');
  renderer.setCamera({projection:'orthographic',yaw:.37,pitch:.2,
   focus:[0,.84,0],orthoSpan:2.15,distance:4});
  try{
   result.candidate.rig.updateGPU(renderer,0);
   const before=await renderer.captureNativePNG(
    result.candidate.rig.workingScene,{width:640,height:640});
   const acc=renderer.getGPUResourceAccounting();
   result.candidate.rig.updateGPU(renderer,.5);
   const after=await renderer.captureNativePNG(
    result.candidate.rig.workingScene,{width:640,height:640});
   const updated=renderer.getGPUResourceAccounting();
   const link=document.createElement('a');
   link.id='v97-actual-face-constrained-gpu';
   link.href=URL.createObjectURL(after.blob);
   link.download='V97-CONSTRAINED-NATIVE-GPU.png';
   document.body.append(link);
   return {sourceSha256:SHA,
    beforePNG:before.sha256,afterPNG:after.sha256,
    trueGPUReadback:before.genuineGpuReadback&&after.genuineGpuReadback,
    originalIndexedTriangleCount:sourceMesh.triangleCount,
    originalSourceMeshImmutable:faces===JSON.stringify(sourceMesh.indices)&&
     positions===JSON.stringify(sourceMesh.positions),
    unchangedOriginalBufferReuploads:
     updated.fullBufferDataUploads-acc.fullBufferDataUploads,
    realGPUDeltaUploads:
     updated.bufferSubDataUpdates-acc.bufferSubDataUpdates,
    silhouetteLossBefore:result.contourErrorBefore,
    silhouetteLossAfter:result.contourErrorAfter,
    highFidelityFaceCertified:false};
  }finally{renderer.destroy();}
 });
 assert.equal(proof.trueGPUReadback,true);
 assert.equal(proof.originalIndexedTriangleCount,3784);
 assert.notEqual(proof.beforePNG,proof.afterPNG);
 assert.equal(proof.originalSourceMeshImmutable,true);
 assert.equal(proof.unchangedOriginalBufferReuploads,0);
 assert.ok(proof.realGPUDeltaUploads>0);
 const png=await readAIGReal3DBrowserBlobBytes(
  page,'#v97-actual-face-constrained-gpu');
 assert.equal(png.readUInt32BE(0),0x89504e47);
 assert.equal(createHash('sha256').update(png).digest('hex'),proof.afterPNG);
 await writeFile(folder+'/V97-GENUINE-CONSTRAINED-3D-GPU.png',png);
 await writeFile(folder+'/V97-REAL-PHOTO-CONTOUR-TO-GLB-GPU-PROOF.json',
  JSON.stringify({report,proof,glbSHA:createHash('sha256').update(glb).digest('hex')},null,2));
 assert.deepEqual(errors,[]);
 console.log('AIG_REAL3D_V97_ORIGINAL_IMAGE_CONTOUR_TRUE_3D_GLB_GPU_PASS',JSON.stringify(proof));
}finally{await browser.close();}
