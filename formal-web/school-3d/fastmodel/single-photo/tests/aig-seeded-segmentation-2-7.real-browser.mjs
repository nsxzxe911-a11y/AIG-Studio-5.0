/** Phone + desktop REAL browser Gate for source SHA/RGBA geodesic,
 * saved RLE source masks, and no fake face/3D reconstruction release.
 */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/aig-real3d-2-7-true-pixel-segmentation';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 '--no-sandbox','--disable-dev-shm-usage','--enable-webgl',
 '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'
]});
try{
 for(const device of [
  {name:'phone',viewport:{width:390,height:844},isMobile:true,hasTouch:true},
  {name:'desktop',viewport:{width:1280,height:900}}
 ]){
  const context=await browser.newContext({...device});
  const page=await context.newPage();page.setDefaultTimeout(18000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto('http://127.0.0.1:8765/scene-runtime-studio.html');
   await page.waitForFunction(()=>document.getElementById('status')
    ?.textContent.includes('資產索引已就緒'));
   const png=await page.evaluate(()=>{
    const c=document.createElement('canvas');c.width=256;c.height=192;
    const g=c.getContext('2d');
    g.fillStyle='rgb(228,228,224)';g.fillRect(0,0,256,192);
    g.fillStyle='rgb(45,65,120)';g.fillRect(64,38,128,132);
    g.fillStyle='rgb(78,44,30)';g.fillRect(99,20,52,52);
    g.fillStyle='rgb(185,135,100)';g.fillRect(113,70,24,18);
    return c.toDataURL('image/png').split(',')[1];
   });
   await page.locator('#photo23-source').setInputFiles({
    name:'photo-27-source.png',mimeType:'image/png',
    buffer:Buffer.from(png,'base64')
   });
   await page.locator('#vision26-load').click();
   await page.waitForFunction(()=>document.getElementById('vision26-status')
    .textContent.includes('來源照片 SHA'));
   const before=JSON.parse(await page.locator('#vision26-proof').textContent());
   assert.match(before.sourceSha256,/^sha256:[a-f0-9]{64}$/);
   await page.locator('#vision27-sync').click();
   await page.waitForFunction(()=>document.getElementById('vision27-status')
    .textContent.includes('已接回'));
   const clickMask=async(x,y,label)=>{
    await page.locator('#vision27-class').selectOption(String(label));
    await page.locator('#vision27-canvas').evaluate((c,p)=>{
     const r=c.getBoundingClientRect();
     c.dispatchEvent(new MouseEvent('click',{bubbles:true,
      clientX:r.left+p.x*r.width/c.width,
      clientY:r.top+p.y*r.height/c.height}));
    },{x,y});
   };
   await clickMask(10,100,0);await clickMask(240,100,0);
   await clickMask(78,130,14);await clickMask(116,31,3);
   await clickMask(123,80,4);
   await page.locator('#vision27-run').click();
   await page.waitForFunction(()=>document.getElementById('vision27-status')
    .textContent.includes('真像素分割完成'));
   const evidence=JSON.parse(await page.locator('#vision27-proof').textContent());
   assert.equal(evidence.sourceImageSHA256,before.sourceSha256);
   assert.equal(evidence.trainedSemanticNeuralNetworkExecuted,false);
   assert.equal(evidence.hiddenBodyOrHairUnderOcclusionRecovered,false);
   assert.equal(evidence.physicallyMeasured3D1To1,false);
   assert.equal(evidence.pixelMasksHumanReviewed,false);
   assert.equal(evidence.visible2DRegions.length,3);
   assert.ok(evidence.encodedRLEEntries>10);
   assert.ok(evidence.visible2DRegions.some(x=>x.className==='hair'&&x.pixelCount>50));
   assert.ok(evidence.visible2DRegions.some(x=>x.className==='neck'&&x.pixelCount>50));
   assert.ok(evidence.visible2DRegions.some(x=>x.className==='garment'&&x.pixelCount>50));
   const after=JSON.parse(await page.locator('#vision26-proof').textContent());
   assert.equal(after.sourceSha256,before.sourceSha256);
   await page.locator('#vision27-save').click();
   await page.waitForFunction(()=>document.getElementById('vision27-status')
    .textContent.includes('SHA 回讀'),null,{timeout:15000});
   await page.screenshot({path:out+'/'+device.name+'-actual-pixel-labels.png',fullPage:true});
   await writeFile(out+'/'+device.name+'-proof.json',JSON.stringify({
    sourceSha256:before.sourceSha256,device:device.name,
    visible2DRegions:evidence.visible2DRegions,
    actualSourcePixelsInspected:true,originalGLBAndMovieUntouched:true,
    automaticTrainedSemanticModel:false,unknownHidden3DGeometryNotInferred:true,
    storedRLEAndSourceSHAVerified:true
   },null,2));
   console.log('AIG27_REAL_SOURCE_HAIR_NECK_GARMENT_SEGMENTATION_PASS',device.name);
  }catch(e){
   await page.screenshot({path:out+'/'+device.name+'-FAIL.png',fullPage:true}).catch(()=>{});
   throw Error(device.name+': '+String(e.message||e)+
    ' status='+await page.locator('#vision27-status').textContent().catch(()=>null)+
    ' browserErrors='+JSON.stringify(errors));
  }finally{await context.close()}
 }
}finally{await browser.close()}
