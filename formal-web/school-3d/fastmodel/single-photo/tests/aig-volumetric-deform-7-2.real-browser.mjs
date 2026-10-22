import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const folder='artifacts/fastmodel-volumetric-7-2';
await mkdir(folder,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 for(const device of [
  {name:'phone',viewport:{width:360,height:780},isMobile:true,hasTouch:true},
  {name:'desktop',viewport:{width:1440,height:900}}
 ]){
  const page=await browser.newPage({...device,deviceScaleFactor:1,acceptDownloads:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto('http://127.0.0.1:8765/volume-lab.html',{waitUntil:'load'});
   assert.equal(await page.locator('#step').isDisabled(),true);
   const png=await page.evaluate(()=>{
    const c=document.createElement('canvas');c.width=72;c.height=72;
    const c2=c.getContext('2d');c2.clearRect(0,0,72,72);
    c2.fillStyle='#2265b1';c2.fillRect(20,10,32,52);
    return c.toDataURL('image/png').split(',')[1];
   });
   await page.locator('#source').setInputFiles({
    name:'SYNTHETIC-SHAPE-NOT-PERSON.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')
   });
   await page.waitForFunction(()=>document.getElementById('status').textContent.includes('照片已解碼'),null,{timeout:12000});
   await page.locator('#create').click();
   await page.waitForFunction(()=>{
    try{const j=JSON.parse(document.getElementById('evidence').textContent);return j.numerical3D.nodeCount>100&&j.surface?.rayHitPixels>40;}catch{return false;}
   },null,{timeout:28000});
   const before=JSON.parse(await page.locator('#evidence').textContent());
   assert.equal(before.numerical3D.steps,0);
   assert.equal(before.numerical3D.tetraSignedVolumeVerified,true);
   assert.equal(before.realAnatomicalRig,false);
   assert.equal(before.estimatedZThickness,.24);
   await page.locator('#step').click();
   await page.waitForFunction(()=>{
    try{return JSON.parse(document.getElementById('evidence').textContent).numerical3D.steps>=1;}catch{return false;}
   },null,{timeout:28000});
   const stepped=JSON.parse(await page.locator('#evidence').textContent());
   assert.ok(stepped.numerical3D.maxDisplacement>.02);
   assert.equal(stepped.numerical3D.invertedTetraCount,0);
   assert.equal(stepped.surface.realDeformedSurfaceQuery,true);
   const beforeRotation=await page.locator('#volume-view').evaluate(c=>c.toDataURL());
   await page.locator('#yaw').evaluate(e=>{e.value='1.50';e.dispatchEvent(new Event('input',{bubbles:true}));});
   await page.waitForFunction(()=>{
    try{return Math.abs(JSON.parse(document.getElementById('evidence').textContent).surface.rayHitPixels)>40;}catch{return false;}
   },null,{timeout:16000});
   // Check that ray-rendered pixels, not only a UI label, have changed.
   await page.waitForTimeout(550);
   const afterRotation=await page.locator('#volume-view').evaluate(c=>c.toDataURL());
   assert.notEqual(afterRotation,beforeRotation);
   await page.locator('#contact').click();
   await page.waitForFunction(()=>{
    try{return JSON.parse(document.getElementById('evidence').textContent).numerical3D.steps>=2;}catch{return false;}
   },null,{timeout:22000});
   const after=JSON.parse(await page.locator('#evidence').textContent());
   assert.ok(after.numerical3D.collisionProjections>0);
   assert.equal(after.realHumanLikeness,false);
   assert.equal(after.nativeAndroidWindowsVerified,false);
   assert.deepEqual(errors,[]);
   await page.screenshot({path:folder+'/'+device.name+'-3d-volume.png'});
   await writeFile(folder+'/'+device.name+'-evidence.json',JSON.stringify({
    viewport:device.viewport,syntheticSourceOnly:true,before,stepped,after,
    rotatedOutputPixelsChanged:true,realHumanApproved:false,realCNCChanged:false
   },null,2)+'\n');
   console.log('AIG_FASTMODEL_7_2_REAL_XYZ_PBD_BROWSER_PASS',device.name,after.numerical3D.nodeCount,after.numerical3D.tetraCount,after.numerical3D.collisionProjections);
  }catch(e){
   await page.screenshot({path:folder+'/'+device.name+'-failure.png'}).catch(()=>{});
   throw Error(device.name+' '+e.message+' scriptErrors='+JSON.stringify(errors));
  }finally{await page.close();}
 }
}finally{await browser.close();}
