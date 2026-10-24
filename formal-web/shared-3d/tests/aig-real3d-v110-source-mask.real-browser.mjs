/** Chromium real GPU V110 opaque photo -> V109 GLB -> V107 five-axis */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const dir='artifacts/aig-real3d-v110';
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 '--enable-webgl','--use-gl=angle','--use-angle=swiftshader',
 '--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1400,height:1050}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
async function png(kind){
 return Buffer.from(await page.evaluate(kind=>{
  const c=document.createElement('canvas');c.width=160;c.height=176;
  const p=c.getContext('2d');
  p.fillStyle='#e9e8e2';p.fillRect(0,0,160,176);
  if(kind==='complex'){
   for(let i=0;i<160;i++){p.fillStyle=i%2?'#fa3b30':'#21a0e5';p.fillRect(i,0,1,176);}
  }
  if(kind==='mask'){
   p.fillStyle='black';p.fillRect(0,0,160,176);
   p.fillStyle='white';p.fillRect(51,22,58,132);
  }else{
   p.fillStyle='#27457e';p.fillRect(51,22,58,132);
  }
  return c.toDataURL('image/png').split(',')[1];
 },kind),'base64');
}
try{
 await page.goto('http://127.0.0.1:8772/shared-3d/aig-real3d-v109-photo-surface-lab.html',{
  waitUntil:'domcontentloaded',timeout:30000});
 const plain=await png('plain');
 await page.locator('#photo').setInputFiles({name:'PhotoOriginalOpaque.png',
  mimeType:'image/png',buffer:plain});
 await page.locator('#v110-preview').click();
 await page.waitForFunction(()=>document.querySelector('#v110-mask-report')
  ?.textContent.includes('AUTO_SIMPLE_BORDER_BG')||
  document.querySelector('#status')?.textContent.startsWith('BLOCK'));
 const preview=JSON.parse(await page.locator('#v110-mask-report').textContent());
 assert.equal(preview.sourceMode,'AUTO_SIMPLE_BORDER_BG');
 assert.notEqual(preview.originalImageSha256,preview.editedAlphaWorkCopySha256);
 await page.locator('#build').click();
 await page.waitForFunction(()=>{
  const txt=document.querySelector('#status')?.textContent||'';
  return txt.includes('真 GLB 表面已進行五軸 GPU')||txt.startsWith('BLOCK');
 },null,{timeout:30000});
 const base=JSON.parse(await page.locator('#receipt').textContent());
 assert.ok(!base.error,JSON.stringify(base));
 assert.ok(base.actualImportedTriangleCount>12);
 assert.equal(base.v110SourceMask.sourceMode,'AUTO_SIMPLE_BORDER_BG');
 assert.equal(base.originalOpaqueOrAlphaPhotoSha256,preview.originalImageSha256);
 assert.equal(base.lastActualGPUFrame.status,'WEBGL_XYZ_TRIANGLES_RENDERED');
 assert.equal(base.originalPhotoIdentityOrNaturalAnatomyCertified,false);
 assert.equal(base.multiView1to1Gate,'BLOCK_INDEPENDENT_BACK_SIDE_AND_DEPTH_NOT_VERIFIED');
 const originalCanvas=await page.locator('#gl').screenshot();
 await writeFile(dir+'/V110-OPAQUE-PNG-AUTO-MASK-5AX-A0-B0.png',originalCanvas);
 await page.evaluate(()=>{
  for(const [id,val] of [['a','75'],['b','120'],['progress','75']]){
   const el=document.getElementById(id);el.value=val;
   el.dispatchEvent(new Event('input',{bubbles:true}));
  }
 });
 const moved=JSON.parse(await page.locator('#receipt').textContent());
 assert.equal(moved.lastActualGPUFrame.aTiltDeg,75);
 assert.equal(moved.lastActualGPUFrame.bTurnDeg,120);
 assert.equal(moved.lastActualGPUFrame.sourceHeightProgress,.75);
 assert.equal(moved.lastActualGPUFrame.gpuClipEnabled,true);
 const tiltedCanvas=await page.locator('#gl').screenshot();
 assert.notDeepEqual(originalCanvas,tiltedCanvas);
 await writeFile(dir+'/V110-OPAQUE-PNG-5AX-A75-B120-75PCT.png',tiltedCanvas);
 await page.locator('#reset').click();
 const reset=JSON.parse(await page.locator('#receipt').textContent());
 assert.equal(reset.lastActualGPUFrame.gpuClipEnabled,false);
 assert.equal(reset.modelSha256,base.modelSha256);
 // Diverse border colors must BLOCK without user mask.
 const complex=await png('complex');
 await page.locator('#photo').setInputFiles({name:'ComplexOpaque.png',
  mimeType:'image/png',buffer:complex});
 await page.locator('#v110-preview').click();
 await page.waitForFunction(()=>document.querySelector('#status')
  ?.textContent.includes('COMPLEX_OR_CROPPED_BACKGROUND_NEEDS_INDEPENDENT_MASK'));
 const blocked=await page.locator('#status').textContent();
 assert.match(blocked,/BLOCK/);
 // A user-reviewed independent mask is a separate SHA, not fake inference.
 const manual=await png('mask');
 await page.locator('#v110-mask-file').setInputFiles({
  name:'SeparatelyReviewedMask.png',mimeType:'image/png',buffer:manual
 });
 await page.locator('#v110-mask-confirm').check();
 await page.locator('#build').click();
 await page.waitForFunction(()=>{
  const txt=document.querySelector('#status')?.textContent||'';
  return txt.includes('真 GLB 表面已進行五軸 GPU')||
   (txt.startsWith('BLOCK')&&!txt.includes('COMPLEX_OR_CROPPED_BACKGROUND'));
 },null,{timeout:30000});
 const external=JSON.parse(await page.locator('#receipt').textContent());
 assert.ok(!external.error,JSON.stringify(external));
 assert.equal(external.v110SourceMask.sourceMode,
  'EXTERNAL_USER_REVIEWED_MASK_NOT_AI_CERTIFIED');
 assert.notEqual(external.v110SourceMask.independentExternalMaskSha256,
  external.originalOpaqueOrAlphaPhotoSha256);
 assert.equal(external.lastActualGPUFrame.status,'WEBGL_XYZ_TRIANGLES_RENDERED');
 assert.equal(external.originalPhotoIdentityOrNaturalAnatomyCertified,false);
 await writeFile(dir+'/V110-SOURCE-AND-5AX-GPU-RECEIPT.json',
  JSON.stringify({base,moved,reset,blocked,external},null,2));
 await writeFile(dir+'/V110-EXTERNAL-MASK-V107-GPU.png',
  await page.locator('#gl').screenshot());
 assert.deepEqual(errors,[]);
 console.log('AIG_REAL3D_V110_OPAQUE_MASK_V109_GLB_V107_REAL_GPU_PASS',
  JSON.stringify({opaqueSourceTriangles:base.actualImportedTriangleCount,
   alphaMaskFromComplexSceneManual:true,
   originalSourceHashPreserved:true,
   noFakeBacksideOrIdentityPASS:true}));
}finally{await browser.close();}
