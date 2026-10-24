import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const path='artifacts/aig-real3d-v109';
await mkdir(path,{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 '--enable-webgl','--use-gl=angle','--use-angle=swiftshader',
 '--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1360,height:1000}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:8772/shared-3d/aig-real3d-v109-photo-surface-lab.html',
  {waitUntil:'domcontentloaded'});
 const png=Buffer.from((await page.evaluate(()=>{
  const canvas=document.createElement('canvas');
  canvas.width=160;canvas.height=192;
  const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,160,192);
  ctx.fillStyle='#d3a78b';
  ctx.beginPath();ctx.ellipse(80,94,39,64,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#593f3d';ctx.fillRect(62,43,36,16);
  return canvas.toDataURL('image/png').split(',')[1];
 })),'base64');
 await page.locator('#photo').setInputFiles({
  name:'ObservedFrontAlpha.png',mimeType:'image/png',buffer:png
 });
 await page.locator('#build').click();
 await page.waitForFunction(()=>{
  const text=document.querySelector('#status')?.textContent??'';
  return text.includes('真 GLB 表面已進行五軸 GPU')||text.startsWith('BLOCK');
 },null,{timeout:30000});
 const baseline=await page.evaluate(()=>JSON.parse(
  document.querySelector('#receipt').textContent));
 assert.ok(!('error' in baseline),JSON.stringify(baseline));
 assert.equal(baseline.mode,'ALPHA_ONLY_FLAT_FRONT_2_5D');
 assert.ok(baseline.actualImportedTriangleCount>12);
 assert.equal(baseline.lastActualGPUFrame.status,'WEBGL_XYZ_TRIANGLES_RENDERED');
 assert.equal(baseline.lastActualGPUFrame.aTiltDeg,0);
 assert.equal(baseline.lastActualGPUFrame.bTurnDeg,0);
 assert.equal(baseline.originalPhotoIdentityOrNaturalAnatomyCertified,false);
 assert.equal(baseline.multiView1to1Gate,'BLOCK_INDEPENDENT_BACK_SIDE_AND_DEPTH_NOT_VERIFIED');
 const screenshot1=await page.locator('#gl').screenshot();
 await writeFile(path+'/V109-ALPHA-SOURCE-ORIGINAL-GPU.png',screenshot1);
 await page.locator('#a').fill('90');
 await page.locator('#b').fill('90');
 await page.locator('#progress').fill('75');
 const tilted=await page.evaluate(()=>JSON.parse(
  document.querySelector('#receipt').textContent));
 assert.equal(tilted.lastActualGPUFrame.aTiltDeg,90);
 assert.equal(tilted.lastActualGPUFrame.bTurnDeg,90);
 assert.equal(tilted.lastActualGPUFrame.sourceHeightProgress,.75);
 assert.equal(tilted.lastActualGPUFrame.gpuClipEnabled,true);
 const screenshot2=await page.locator('#gl').screenshot();
 await writeFile(path+'/V109-5AX-A90-B90-SOURCE-75PCT-GPU.png',screenshot2);
 assert.notDeepEqual(screenshot1,screenshot2);
 await page.locator('#reset').click();
 const reset=await page.evaluate(()=>JSON.parse(
  document.querySelector('#receipt').textContent));
 assert.equal(reset.lastActualGPUFrame.aTiltDeg,0);
 assert.equal(reset.lastActualGPUFrame.bTurnDeg,0);
 assert.equal(reset.lastActualGPUFrame.gpuClipEnabled,false);
 assert.equal(reset.modelSha256,baseline.modelSha256);
 assert.equal(reset.lastActualGPUFrame.sourceSHA,baseline.modelSha256);
 await writeFile(path+'/V109-GLB-SHA-AND-PIXEL-EVIDENCE.json',
  JSON.stringify({baseline,tilted,reset},null,2));
 assert.deepEqual(errors,[]);
 console.log('AIG_REAL3D_V109_PHOTO_ALPHA_GLTF_GPU_5AX_SOURCE_PROVENANCE_PASS',
  JSON.stringify({triangles:baseline.actualImportedTriangleCount,
   sourceIoU:baseline.foregroundReprojectionIoU,
   modelSha256:baseline.modelSha256,
   observedBacksideNeverClaimed:true}));
}finally{await browser.close();}
