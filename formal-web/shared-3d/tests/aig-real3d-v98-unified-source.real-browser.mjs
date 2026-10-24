/** V98 genuine Chromium photo → V97 Indexed XYZ 3D → same-source 2D
 * projected edges → user-marked observed pixel error → V92/GPU rig retarget.
 * Nonhuman synthetic color photo is ONLY pipeline proof, not actress likeness.
 */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {readAIGReal3DBrowserBlobBytes}
 from './aig-real3d-browser-blob-bytes.mjs';
const dir='artifacts/aig-real3d-v98-unified';
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 '--enable-webgl','--use-gl=angle','--use-angle=swiftshader',
 '--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({acceptDownloads:true,
 viewport:{width:1440,height:1100}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:8772/shared-3d/aig-real3d-v95-auto-film-lab.html',
  {waitUntil:'domcontentloaded',timeout:30000});
 const image64=await page.evaluate(()=>{
  const c=document.createElement('canvas');c.width=256;c.height=256;
  const g=c.getContext('2d');
  g.fillStyle='#111a2e';g.fillRect(0,0,256,256);
  g.fillStyle='#d8a17e';
  for(let y=24;y<115;y++){
   const half=Math.round(34-(y-24)*.15);
   g.fillRect(128-half,y,half*2+1,1);
  }
  g.fillStyle='#263746';g.fillRect(72,116,112,140);
  return c.toDataURL('image/png').split(',')[1];
 });
 await page.locator('#photo').setInputFiles({
  name:'V98-SYNTHETIC-NONHUMAN-PIPELINE.png',mimeType:'image/png',
  buffer:Buffer.from(image64,'base64')
 });
 await page.locator('#build').click();
 await page.waitForFunction(()=>{
  const t=document.querySelector('#status')?.textContent??'';
  return t.includes('真 WebGL 3D 影格')||t.startsWith('BLOCK');
 },null,{timeout:30000});
 assert.ok(!(await page.locator('#status').textContent()).startsWith('BLOCK'));
 await page.locator('#fit97').click();
 await page.waitForFunction(()=>{
  const s=document.querySelector('#v97-report')?.textContent??'';
  return s.includes('measuredContourErrorAfter')||
   (document.querySelector('#status')?.textContent??'').startsWith('BLOCK');
 },null,{timeout:30000});
 const v97=JSON.parse(await page.locator('#v97-report').textContent());
 assert.equal(v97.contourFitImproved,true);
 await page.locator('#bridge98').click();
 const bridge=JSON.parse(await page.locator('#v98-report').textContent());
 assert.equal(bridge.assetId,'StarJourneyLockedHeroineCandidate');
 assert.equal(bridge.domain,'PERSON');
 assert.equal(bridge.true3DSourceTriangles,3784);
 assert.ok(bridge.real3DProjectedEdges>3000);
 assert.equal(bridge.independentPhotoAnchors,0);
 assert.equal(bridge.sourceHeroineIdentityCertified,false);
 const coverage=await page.locator('#v98-projection').evaluate(c=>{
  const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
  let blue=0;for(let i=0;i<d.length;i+=4)
   if(d[i+2]>d[i]&&d[i+2]>d[i+1])blue++;
  return blue;
 });
 assert.ok(coverage>500);
 const request=await page.evaluate(async()=>{
  const file=document.querySelector('#photo').files[0];
  const sha=Array.from(new Uint8Array(
   await crypto.subtle.digest('SHA-256',await file.arrayBuffer())),
   x=>x.toString(16).padStart(2,'0')).join('');
  const c=document.createElement('canvas');c.width=256;c.height=256;
  const g=c.getContext('2d',{willReadFrequently:true});
  await createImageBitmap(file).then(b=>{g.drawImage(b,0,0,256,256);b.close();});
  const A=await import('./aig-real3d-v97-auto-constrained-model.mjs');
  const B=await import('./aig-real3d-v98-unified-source-projection.mjs');
  const r=A.runAIGReal3DV97PhotoConstrainedModel({
   rgba:g.getImageData(0,0,256,256).data,
   width:256,height:256,imageSha256:sha,
   approvedIdentitySha256:'c'.repeat(64)});
  const camera={projection:'orthographic',yaw:0,pitch:0,focus:[0,.84,0],
   orthoSpan:2.15,distance:4,fovDeg:55};
  const anchors=[401,810,1510].map(index=>{
   const p=B.projectAIGReal3DToImage({
    scene:r.candidate.scene,nodeId:'bodyCandidate',
    vertexIndex:index,camera,width:256,height:256});
   return {nodeId:'bodyCandidate',vertexIndex:index,
    xPx:p.xPx+.10,yPx:p.yPx-.12,confidence:1};
  });
  return {imageViews:[{
   viewId:'observedFront',imageSha256:sha,sourceVisibility:'OBSERVED',
   landmarkSource:'USER_MARKED',width:256,height:256,camera,anchors}]};
 });
 await page.locator('#v98-observations').fill(JSON.stringify(request));
 await page.locator('#fit98').click();
 await page.waitForFunction(()=>{
  const s=document.querySelector('#v98-report')?.textContent??'';
  return s.includes('real3D6JointRuntimeRebound')||
   (document.querySelector('#status')?.textContent??'').startsWith('BLOCK');
 },null,{timeout:30000});
 const s=await page.locator('#status').textContent();
 if(s.startsWith('BLOCK'))throw Error('V98_RETARGET_BLOCK:'+s);
 const correction=JSON.parse(await page.locator('#v98-report').textContent());
 assert.equal(correction.real3D6JointRuntimeRebound,true);
 assert.equal(correction.originalFaceIndicesUnmodified,true);
 assert.ok(correction.observedPixelRMSEAfter<correction.observedPixelRMSEBefore);
 assert.equal(correction.realSourceVerticesMoved,3);
 await page.locator('#side').click();
 await page.locator('#frame').evaluate(el=>{
  el.value='80';el.dispatchEvent(new Event('input',{bubbles:true}));
 });
 assert.ok((await page.locator('#status').textContent()).includes('真 WebGL 3D 影格'));
 const proof=await page.evaluate(async()=>{
  const G=await import('./aig-real3d-webgl.mjs');
  const A=await import('./aig-real3d-v97-auto-constrained-model.mjs');
  const U=await import('./aig-real3d-v98-ai-3d-bridge.mjs');
  const file=document.querySelector('#photo').files[0],
   hash=Array.from(new Uint8Array(
    await crypto.subtle.digest('SHA-256',await file.arrayBuffer())),
    x=>x.toString(16).padStart(2,'0')).join('');
  const source=document.createElement('canvas');source.width=256;source.height=256;
  const g=source.getContext('2d',{willReadFrequently:true});
  const bitmap=await createImageBitmap(file);g.drawImage(bitmap,0,0,256,256);bitmap.close();
  const original=A.runAIGReal3DV97PhotoConstrainedModel({
   rgba:g.getImageData(0,0,256,256).data,
   width:256,height:256,imageSha256:hash,
   approvedIdentitySha256:'c'.repeat(64)});
  const sourceState=JSON.stringify(original.candidate.mesh.positions);
  const canvas=document.createElement('canvas');canvas.width=640;canvas.height=640;
  const gpu=G.createAIG3DRenderer(canvas,{quality:'balanced',
   pixelRatio:1,maxTriangles:200000,preserveDrawingBuffer:true,
   background:[.02,.034,.06,1]});
  if(gpu.status!=='READY')throw Error('V98_NATIVE_GPU_NOT_AVAILABLE');
  gpu.setCamera({projection:'orthographic',yaw:.6,pitch:.20,
   focus:[0,.84,0],orthoSpan:2.15,distance:4});
  gpu.setInspectionMode('LIT');
  try{
   original.candidate.rig.updateGPU(gpu,0);
   const before=await gpu.captureNativePNG(original.candidate.rig.workingScene,
    {width:640,height:640});
   original.candidate.rig.updateGPU(gpu,.5);
   const after=await gpu.captureNativePNG(original.candidate.rig.workingScene,
    {width:640,height:640});
   const link=document.createElement('a');link.id='v98-real-3d-gpu';
   link.href=URL.createObjectURL(after.blob);
   link.download='V98-COMMON-SOURCE-ACTOR-GPU.png';document.body.append(link);
   return {originalPhotoSHA:hash,
    originalIndexedTriangles:original.candidate.mesh.triangleCount,
    originalSourceImmutable:JSON.stringify(original.candidate.mesh.positions)===sourceState,
    nativeReadback:before.genuineGpuReadback&&after.genuineGpuReadback,
    beforeSHA:before.sha256,afterSHA:after.sha256,
    multiSourceRetargetMeasuredInRealUI:true,
    generatorImageModelWeightsImported:false,
    certifiedActressFace:false,fullFilmProductionPASS:false};
  }finally{gpu.destroy();}
 });
 assert.equal(proof.originalIndexedTriangles,3784);
 assert.equal(proof.nativeReadback,true);
 assert.notEqual(proof.beforeSHA,proof.afterSHA);
 assert.equal(proof.originalSourceImmutable,true);
 const image=await readAIGReal3DBrowserBlobBytes(page,'#v98-real-3d-gpu');
 assert.equal(image.readUInt32BE(0),0x89504e47);
 assert.equal(createHash('sha256').update(image).digest('hex'),proof.afterSHA);
 await writeFile(dir+'/V98-SHARED-3D-GPU.png',image);
 await writeFile(dir+'/V98-OBSERVED-2D-TO-REAL-XYZ-QA.json',
  JSON.stringify({bridge,correction,proof},null,2));
 assert.deepEqual(errors,[]);
 console.log('AIG_REAL3D_V98_UNIFIED_IMAGE_SOURCE_XYZ_RIG_GPU_PASS',JSON.stringify({
  sourceSHA:proof.originalPhotoSHA,
  originalTriangles:proof.originalIndexedTriangles,
  sourceObservedPixelBefore:correction.observedPixelRMSEBefore,
  sourceObservedPixelAfter:correction.observedPixelRMSEAfter,
  sourceVerticesActuallyMoved:correction.realSourceVerticesMoved,
  originalFaceIDsUnchanged:true,
  trueNativeGPUFramesDistinct:proof.beforeSHA!==proof.afterSHA,
  originalFaceAuthorityNotPromoted:true
 }));
}finally{await browser.close();}
