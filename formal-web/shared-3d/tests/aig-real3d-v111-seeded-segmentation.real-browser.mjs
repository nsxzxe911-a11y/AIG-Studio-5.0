/** Chromium true GLB-GPU integration for user-seeded complex opaque RGB source */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const dir='artifacts/aig-real3d-v111';
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 '--enable-webgl','--use-gl=angle','--use-angle=swiftshader',
 '--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1420,height:1040}});
const jsErrors=[];page.on('pageerror',e=>jsErrors.push(e.message));
try{
 await page.goto('http://127.0.0.1:8772/shared-3d/aig-real3d-v109-photo-surface-lab.html',
  {waitUntil:'domcontentloaded',timeout:30000});
 const png=Buffer.from(await page.evaluate(()=>{
  const c=document.createElement('canvas');c.width=160;c.height=176;
  const g=c.getContext('2d');
  for(let y=0;y<176;y+=8)for(let x=0;x<160;x+=8){
   g.fillStyle=((x/8+y/8)%2)?'#25ae60':'#d6b641';
   g.fillRect(x,y,8,8);
  }
  g.fillStyle='#3753b5';g.fillRect(50,20,60,66);
  g.fillStyle='#bf4f7b';g.fillRect(50,86,60,68);
  return c.toDataURL('image/png').split(',')[1];
 }), 'base64');
 await page.locator('#photo').setInputFiles({name:'Complex-Checkered-Background-Real-RGB.png',
  mimeType:'image/png',buffer:png});
 await page.waitForFunction(()=>document.querySelector('#v111-count')
  ?.textContent.includes('主體 0 點／背景 0 點'));
 await page.locator('#v111-enable').check();
 // The marker canvas is backed by the actual 160 x 176 source pixels.
 async function seed(x,y,kind){
  await page.locator('#v111-kind').selectOption(kind);
  const b=await page.locator('#v111-source-canvas').boundingBox();
  assert.ok(b&&b.width>0&&b.height>0);
  await page.locator('#v111-source-canvas').click({position:{
   x:(x+.5)*b.width/160,y:(y+.5)*b.height/176
  }});
 }
 await page.locator('#v110-preview').click();
 await page.waitForFunction(()=>document.querySelector('#status')
  ?.textContent.includes('AT_LEAST_TWO_AND_MAX_EIGHTY_SOURCE_SEEDS'));
 assert.match(await page.locator('#status').textContent(),/BLOCK/);
 await seed(66,34,'foreground');await seed(71,116,'foreground');
 await seed(5,4,'background');await seed(18,4,'background');
 assert.match(await page.locator('#v111-count').textContent(),/主體 2 點／背景 2 點/);
 await page.locator('#v110-preview').click();
 await page.waitForFunction(()=>{
  const txt=document.querySelector('#status')?.textContent||'';
  return txt.includes('V110 前景預覽完成')||
   txt.includes('前景模型／來源預覽完成')||txt.startsWith('BLOCK');
 },null,{timeout:30000});
 let preview=JSON.parse(await page.locator('#v110-mask-report').textContent());
 assert.equal(preview.sourceMode,'INTERACTIVE_COLOR_CONNECTED_NOT_NEURAL_AI');
 assert.equal(preview.foregroundSeedCount,2);
 assert.equal(preview.backgroundSeedCount,2);
 assert.equal(preview.actualNeuralForegroundSegmentationRun,false);
 const imageReceipt=await page.locator('#v110-mask-preview').screenshot();
 await writeFile(dir+'/V111-SOURCE-COMPLEX-BG-USER-SEEDED-ALPHA.png',imageReceipt);
 await page.locator('#build').click();
 await page.waitForFunction(()=>{
  const txt=document.querySelector('#status')?.textContent||'';
  return txt.includes('真 GLB 表面已進行五軸 GPU')||txt.startsWith('BLOCK');
 },null,{timeout:30000});
 const result=JSON.parse(await page.locator('#receipt').textContent());
 assert.ok(!result.error,JSON.stringify(result));
 assert.equal(result.v110SourceMask.v111UserSeededSegmentation,true);
 assert.equal(result.v110SourceMask.sourceMode,'INTERACTIVE_COLOR_CONNECTED_NOT_NEURAL_AI');
 assert.equal(result.v110SourceMask.foregroundSeedCount,2);
 assert.ok(result.actualImportedTriangleCount>12);
 assert.equal(result.lastActualGPUFrame.status,'WEBGL_XYZ_TRIANGLES_RENDERED');
 assert.equal(result.multiView1to1Gate,'BLOCK_INDEPENDENT_BACK_SIDE_AND_DEPTH_NOT_VERIFIED');
 const neutral=await page.locator('#gl').screenshot();
 await writeFile(dir+'/V111-ORIGINAL-5AX-A0-B0-SOURCE-GPU.png',neutral);
 await page.evaluate(()=>{
  for(const [id,v] of [['a','90'],['b','120'],['progress','65']]){
   const element=document.getElementById(id);
   element.value=v;element.dispatchEvent(new Event('input',{bubbles:true}));
  }
 });
 const tilted=JSON.parse(await page.locator('#receipt').textContent());
 assert.equal(tilted.lastActualGPUFrame.aTiltDeg,90);
 assert.equal(tilted.lastActualGPUFrame.bTurnDeg,120);
 assert.equal(tilted.lastActualGPUFrame.sourceHeightProgress,.65);
 assert.equal(tilted.lastActualGPUFrame.gpuClipEnabled,true);
 const shifted=await page.locator('#gl').screenshot();
 assert.notDeepEqual(neutral,shifted);
 await writeFile(dir+'/V111-A90-B120-PARTIAL-GPU.png',shifted);
 await page.locator('#reset').click();
 const restored=JSON.parse(await page.locator('#receipt').textContent());
 assert.equal(restored.modelSha256,result.modelSha256);
 assert.equal(restored.lastActualGPUFrame.aTiltDeg,0);
 assert.equal(restored.lastActualGPUFrame.bTurnDeg,0);
 assert.equal(restored.lastActualGPUFrame.gpuClipEnabled,false);
 await writeFile(dir+'/V111-COMPLEX-SOURCE-MARKUP-GLB-SHA-5AX-GPU.json',
  JSON.stringify({preview,result,tilted,restored},null,2));
 assert.deepEqual(jsErrors,[]);
 console.log('AIG_REAL3D_V111_SEEDED_COMPLEX_PHOTO_TO_V109_GLB_V107_TRUE_GPU_PASS',
  JSON.stringify({sourceTriangles:result.actualImportedTriangleCount,
   originalPhotoSha256:result.originalOpaqueOrAlphaPhotoSha256,
   sourceMaskOnlyGeometry:true,realBacksideReconstructed:false}));
}finally{await browser.close();}
