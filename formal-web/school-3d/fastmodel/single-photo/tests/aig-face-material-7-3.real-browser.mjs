/** Actual Chromium proof of source photo vs reviewed 3D cosmetics (synthetic-only).
 * No human identity/real skin claims. Screenshot output is NOT character approval.
 */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const folder='artifacts/fastmodel-face-makeup-7-3';await mkdir(folder,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 for(const device of [
  {name:'phone',viewport:{width:360,height:780},isMobile:true,hasTouch:true},
  {name:'desktop',viewport:{width:1440,height:900}}
 ]){
  const page=await browser.newPage({...device,deviceScaleFactor:1,acceptDownloads:true}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const evidence=async()=>JSON.parse(await page.locator('#evidence').textContent());
  try{
   await page.goto('http://127.0.0.1:8765/face-material-lab.html',{waitUntil:'load'});
   assert.equal(await page.locator('#build').isDisabled(),true);
   const png=await page.evaluate(()=>{
    const c=document.createElement('canvas');c.width=96;c.height=96;
    const x=c.getContext('2d');x.clearRect(0,0,96,96);
    x.fillStyle='#af806b';x.fillRect(20,9,56,78);
    x.fillStyle='#674437';x.fillRect(28,32,11,6);x.fillRect(57,32,11,6);
    x.fillStyle='#ba7387';x.fillRect(40,72,16,5);
    return c.toDataURL('image/png').split(',')[1];
   });
   await page.locator('#source').setInputFiles({name:'SYNTHETIC-FACE-REGION-NOT-HUMAN.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
   await page.waitForFunction(()=>document.getElementById('status').textContent.includes('已讀取真實來源像素'),null,{timeout:12000});
   await page.locator('#build').click();
   await page.waitForFunction(()=>{
    try{const o=JSON.parse(document.getElementById('evidence').textContent);return o.renderEvidence?.photoFrontPixels>100;}catch{return false;}
   },null,{timeout:30000});
   const unreviewed=await evidence();
   assert.equal(unreviewed.faceROI.reviewed,false);
   assert.equal(unreviewed.renderEvidence.makeupPixels,0);
   assert.ok(unreviewed.renderEvidence.photoFrontPixels>100);
   await page.locator('#confirm').click();
   await page.waitForFunction(()=>{
    try{const r=JSON.parse(document.getElementById('evidence').textContent);return r.faceROI.reviewed&&r.renderEvidence.makeupPixels>5;}catch{return false;}
   },null,{timeout:30000});
   const confirmed=await evidence();
   const madeScreen=await page.locator('#screen').evaluate(c=>c.toDataURL('image/png'));
   await page.locator('#clear').click();
   await page.waitForFunction(()=>{
    try{return JSON.parse(document.getElementById('evidence').textContent).renderEvidence.makeupPixels===0;}catch{return false;}
   },null,{timeout:20000});
   const noMakeupScreen=await page.locator('#screen').evaluate(c=>c.toDataURL('image/png'));
   assert.notEqual(madeScreen,noMakeupScreen,'makeup physically changes 3D projected output pixels');
   await page.locator('#lips-strength').evaluate(el=>{el.value='.9';el.dispatchEvent(new Event('input',{bubbles:true}));});
   await page.waitForFunction(()=>{
    try{return JSON.parse(document.getElementById('evidence').textContent).renderEvidence.makeupPixels>0;}catch{return false;}
   },null,{timeout:20000});
   await page.locator('#yaw').evaluate(el=>{el.value='3.14';el.dispatchEvent(new Event('input',{bubbles:true}));});
   await page.waitForFunction(()=>{
    try{const r=JSON.parse(document.getElementById('evidence').textContent);return r.renderEvidence.inferredRearOrSidePixels>100&&r.renderEvidence.photoFrontPixels===0;}catch{return false;}
   },null,{timeout:30000});
   const rear=await evidence();
   assert.equal(rear.realistic3DHumanFaceRecovered,false);
   assert.equal(rear.riggedFacialAnimation,false);
   await page.locator('#yaw').evaluate(el=>{el.value='0';el.dispatchEvent(new Event('input',{bubbles:true}));});
   await page.locator('#deform').check();
   await page.waitForFunction(()=>{
    try{const r=JSON.parse(document.getElementById('evidence').textContent);return r.isActualXYZDeformed&&r.renderEvidence.photoFrontPixels>15;}catch{return false;}
   },null,{timeout:45000});
   const deformed=await evidence();
   assert.equal(deformed.faceROI.reviewed,true);
   assert.equal(deformed.nativeAndroidWindowsVerified,false);
   assert.deepEqual(errors,[]);
   await page.screenshot({path:folder+'/'+device.name+'-original-photo-3d-makeup.png'});
   await writeFile(folder+'/'+device.name+'-evidence.json',JSON.stringify({
    device:device.name,syntheticSourceOnly:true,unreviewed,confirmed,rear,deformed,
    makeupPixelsDifferFromOriginal:true,noCopiedFaceOnBack:true,realHuman3DSkinApproved:false
   },null,2)+'\n');
   console.log('AIG_FASTMODEL_7_3_PHOTO_MAKEUP_3D_BROWSER_PASS',device.name,confirmed.renderEvidence.makeupPixels,rear.renderEvidence.inferredRearOrSidePixels);
  }catch(e){
   await page.screenshot({path:folder+'/'+device.name+'-failure.png'}).catch(()=>{});
   throw Error(device.name+' '+e.message+' JS_ERRORS='+JSON.stringify(errors));
  }finally{await page.close();}
 }
}finally{await browser.close();}
