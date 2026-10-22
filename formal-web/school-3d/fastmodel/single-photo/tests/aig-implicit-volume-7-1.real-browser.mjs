/** Chromium operational proof: local PNG -> true 3D depth / camera rotation / penetration.
 * Uses synthetic RGBA image; NOT a real portrait likeness or skeletal approval.
 */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const folder='artifacts/fastmodel-implicit-7-1';await mkdir(folder,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 for(const device of [
  {name:'phone',viewport:{width:360,height:780},isMobile:true,hasTouch:true},
  {name:'desktop',viewport:{width:1440,height:900}}
 ]){
  const page=await browser.newPage({...device,deviceScaleFactor:1});
  let faults=[];page.on('pageerror',e=>faults.push(e.message));
  try{
   await page.goto('http://127.0.0.1:8765/implicit-lab.html',{waitUntil:'load'});
   assert.equal(await page.locator('#probe').isDisabled(),true);
   const png=await page.evaluate(()=>{
    const c=document.createElement('canvas');c.width=96;c.height=96;const ctx=c.getContext('2d');
    ctx.clearRect(0,0,96,96);ctx.fillStyle='#2269b9';ctx.fillRect(28,20,40,56);
    return c.toDataURL('image/png').split(',')[1];
   });
   await page.locator('#source').setInputFiles({name:'SYNTHETIC-FIXTURE-NOT-A-CHARACTER.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
   await page.waitForFunction(()=>document.getElementById('status').textContent.includes('真實照片已解碼'),null,{timeout:12000});
   await page.locator('#build').click();
   await page.waitForFunction(()=>{
    try{const r=JSON.parse(document.getElementById('evidence').textContent);return r.surfaceRayHitPixels>30;}catch{return false;}
   },null,{timeout:18000});
   const front=JSON.parse(await page.locator('#evidence').textContent());
   assert.equal(front.zThickness,.26);
   assert.equal(front.unobservedDepth,'EXPLICIT_ESTIMATE_NOT_OBSERVED');
   assert.equal(front.anatomyVerified,false);
   assert.ok(front.surfaceRayHitPixels>30);
   const starting=await page.locator('#screen').evaluate(canvas=>canvas.toDataURL('image/png'));
   await page.locator('#yaw').evaluate(e=>{e.value='1.57';e.dispatchEvent(new Event('input',{bubbles:true}));});
   await page.waitForFunction(()=>{try{return Math.abs(JSON.parse(document.getElementById('evidence').textContent).camera.yaw-1.57)<.01;}catch{return false;}},null,{timeout:16000});
   const rotated=await page.locator('#screen').evaluate(canvas=>canvas.toDataURL('image/png'));
   assert.notEqual(starting,rotated,'actual 3D view should change');
   await page.locator('#probe').click();
   const after=JSON.parse(await page.locator('#evidence').textContent());
   assert.ok(after.contact.penetrationDepth>0);
   assert.equal(after.skeletal3DCharacterVerified,false);
   assert.deepEqual(faults,[]);
   await page.screenshot({path:folder+'/'+device.name+'-implicit-volume.png'});
   await writeFile(folder+'/'+device.name+'-measurements.json',JSON.stringify({device:device.name,source:'SYNTHETIC_RGBA_NOT_PORTRAIT',front,after,rotatedPixelsDiffer:true,trueHuman3D:false},null,2)+'\n');
   console.log('AIG_FASTMODEL_7_1_REAL_3D_SDF_BROWSER_PASS',device.name,front.surfaceRayHitPixels,after.contact.penetrationDepth);
  }catch(e){
   await page.screenshot({path:folder+'/'+device.name+'-failure.png'}).catch(()=>{});
   throw Error(device.name+' '+e.message+' errors='+JSON.stringify(faults));
  }finally{await page.close();}
 }
}finally{await browser.close();}
