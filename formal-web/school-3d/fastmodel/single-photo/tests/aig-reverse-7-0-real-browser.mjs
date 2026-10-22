/** Real Chromium source-pixel and numerical visual test, NOT full-character approval. */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

const out='artifacts/fastmodel-reverse-7-0';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 for(const device of [
  {name:'phone',viewport:{width:360,height:780},isMobile:true,hasTouch:true},
  {name:'desktop',viewport:{width:1440,height:900}}
 ]){
  const page=await browser.newPage({...device,deviceScaleFactor:1,acceptDownloads:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto('http://127.0.0.1:8765/reverse-lab.html',{waitUntil:'load'});
   assert.equal(await page.locator('#drawing').count(),1);
   assert.equal(await page.locator('#play').isDisabled(),true);
   // PNG bitmap is synthesized with genuine alpha; no real person is claimed.
   const png=await page.evaluate(()=>{
    const c=document.createElement('canvas');c.width=72;c.height=72;
    const ctx=c.getContext('2d');
    ctx.clearRect(0,0,72,72);
    ctx.fillStyle='#20508b';ctx.fillRect(18,10,36,50);
    return c.toDataURL('image/png').split(',')[1];
   });
   await page.locator('#source').setInputFiles({
    name:'SYNTHETIC-FIXTURE-NOT-A-HUMAN.png',mimeType:'image/png',
    buffer:Buffer.from(png,'base64')
   });
   await page.waitForFunction(()=>document.getElementById('status')?.textContent?.includes('已讀取'),null,{timeout:12000});
   await page.locator('#extract').click();
   await page.waitForFunction(()=>document.getElementById('status')?.textContent?.includes('已實際從像素建立'),null,{timeout:12000});
   const before=JSON.parse(await page.locator('#evidence').textContent());
   assert.equal(before.segmentation.coverage,1800/(72*72));
   assert.equal(before.observedContour.outerAreaPx,1800);
   assert.equal(before.physics.steps,0);
   assert.equal(before.physics.realThreeDSkinVerified,false);
   assert.equal(before.verified3DAnimation,false);
   await page.locator('#play').click();
   await page.waitForFunction(()=>{
    try{return JSON.parse(document.getElementById('evidence').textContent).physics.steps>=12;}
    catch(_){return false;}
   },null,{timeout:12000});
   await page.locator('#play').click();
   const after=JSON.parse(await page.locator('#evidence').textContent());
   assert.ok(after.physics.maxDisplacement>0,'real numeric positions actually changed');
   assert.equal(after.physics.claim,'NUMERICAL_2D_SILHOUETTE_ONLY');
   const download=page.waitForEvent('download');
   await page.locator('#export-svg').click();
   const file=await download;
   assert.match(file.suggestedFilename(),/OBSERVED-2D\.svg/);
   assert.deepEqual(errors,[]);
   await page.screenshot({path:out+'/'+device.name+'-real-numerical-contour.png'});
   await writeFile(out+'/'+device.name+'-evidence.json',JSON.stringify({
    device:device.name,viewport:device.viewport,before,after,
    tested:'IMAGE_ALPHA_PIXEL_REVERSE_AND_2D_NUMERICAL_SIM',
    actualHuman3D:false,nativeRelease:false
   },null,2)+'\n');
   console.log('AIG_FASTMODEL_7_0_BROWSER_NUMERICAL_GATE_PASS',device.name,after.physics.steps,after.physics.maxDisplacement);
  }catch(e){
   await page.screenshot({path:out+'/'+device.name+'-FAIL.png'}).catch(()=>{});
   throw new Error(device.name+' '+String(e.message||e)+' browserErrors='+JSON.stringify(errors));
  }finally{await page.close();}
 }
}finally{await browser.close();}
