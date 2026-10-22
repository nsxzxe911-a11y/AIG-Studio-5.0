/** Playwright evidence: locally sourced avatar editor. Synthetic facial swatch,
 * NOT user likeness, anatomy quality, server multiplayer or native 60 FPS.
 */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/fastmodel-avatar-7-4';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 for(const device of [
  {name:'phone',viewport:{width:360,height:780},isMobile:true,hasTouch:true},
  {name:'desktop',viewport:{width:1440,height:900}}
 ]){
  const page=await browser.newPage({...device,deviceScaleFactor:1,acceptDownloads:true});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const report=async()=>JSON.parse(await page.locator('#evidence').textContent());
  try{
   await page.goto('http://127.0.0.1:8765/avatar-studio.html',{waitUntil:'load'});
   assert.equal(await page.locator('#play-clip').isDisabled(),true);
   const png=await page.evaluate(()=>{
    const c=document.createElement('canvas');c.width=96;c.height=96;
    const x=c.getContext('2d');x.clearRect(0,0,96,96);
    x.fillStyle='#b68e72';x.fillRect(22,12,52,72);
    x.fillStyle='#85584a';x.fillRect(32,36,10,5);x.fillRect(56,36,10,5);
    x.fillStyle='#b45072';x.fillRect(42,69,14,4);
    return c.toDataURL('image/png').split(',')[1];
   });
   await page.locator('#source').setInputFiles({name:'SYNTHETIC_GAME_AVATAR_NOT_ACTUAL_FACE.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
   await page.waitForFunction(()=>document.getElementById('status').textContent.includes('已讀取'),null,{timeout:15000});
   await page.locator('#confirm').click();
   await page.locator('#build').click();
   await page.waitForFunction(()=>{
    try{return JSON.parse(document.getElementById('evidence').textContent).render.hitPixels>100;}
    catch{return false;}
   },null,{timeout:38000});
   const neutral=await report();
   assert.equal(neutral.faceBoxReviewed,true);
   assert.equal(neutral.expression.jawOpen,0);
   assert.equal(neutral.actualMMONetworking,false);
   assert.equal(neutral.actualHumanFaceDepthVerified,false);
   const screenshotBefore=await page.locator('#screen').evaluate(c=>c.toDataURL('image/png'));
   await page.locator('#jawOpen').evaluate(e=>{e.value='1';e.dispatchEvent(new Event('input',{bubbles:true}));});
   await page.waitForFunction(()=>{
    try{return JSON.parse(document.getElementById('evidence').textContent).expression.jawOpen===1;}
    catch{return false;}
   },null,{timeout:40000});
   const changed=await page.locator('#screen').evaluate(c=>c.toDataURL('image/png'));
   assert.notEqual(changed,screenshotBefore,'jaw morph should change 3D rendered pixels');
   await page.locator('#yaw').evaluate(e=>{e.value='3.14';e.dispatchEvent(new Event('input',{bubbles:true}));});
   await page.waitForFunction(()=>{
    try{const x=JSON.parse(document.getElementById('evidence').textContent).render;return x.neutralSideBackPixels>100&&x.frontPhotoPixels===0;}
    catch{return false;}
   },null,{timeout:45000});
   const rear=await report();
   await page.locator('#yaw').evaluate(e=>{e.value='0';e.dispatchEvent(new Event('input',{bubbles:true}));});
   await page.locator('#smile').evaluate(e=>{e.value='.8';e.dispatchEvent(new Event('input',{bubbles:true}));});
   await page.waitForFunction(()=>{
    try{return JSON.parse(document.getElementById('evidence').textContent).expression.smile===.8;}
    catch{return false;}
   },null,{timeout:40000});
   await page.locator('#avatar-name').fill('AIG Game Hero');
   const downloadPromise=page.waitForEvent('download');
   await page.locator('#save-preset').click();
   const download=await downloadPromise,buf=await readFile(await download.path());
   assert.ok(buf.length>200);
   const saved=JSON.parse(buf.toString('utf8'));
   assert.equal(saved.name,'AIG Game Hero');
   assert.equal(saved.expression.smile,.8);
   assert.ok(/^[0-9a-f]{64}$/.test(saved.sourceSHA256));
   assert.equal(saved.networkProfileSynced,false);
   assert.ok(!('data' in saved)&&!('pixels' in saved));
   await page.locator('#reset-expression').click();
   await page.locator('#load-preset').setInputFiles({name:'AIG-Avatar-Preset.json',mimeType:'application/json',buffer:buf});
   await page.waitForFunction(()=>{
    try{return JSON.parse(document.getElementById('evidence').textContent).expression.smile===.8;}
    catch{return false;}
   },null,{timeout:40000});
   await page.locator('#clip').selectOption('talk');
   await page.locator('#play-clip').click();
   await page.waitForFunction(()=>Number(document.getElementById('jawOpen').value)>.2,null,{timeout:20000});
   await page.locator('#play-clip').click();
   assert.deepEqual(errors,[]);
   await page.screenshot({path:out+'/'+device.name+'-source-anchored-avatar.png'});
   await writeFile(out+'/'+device.name+'-evidence.json',JSON.stringify({
    syntheticSourceOnly:true,device:device.name,neutral,rear,localPresetRoundtrip:true,
    gameServerConnected:false,anatomicalFaceCertified:false
   },null,2)+'\n');
   console.log('AIG_FASTMODEL_7_4_GAME_AVATAR_TRUE_3D_FACE_MORPH_BROWSER_PASS',device.name,neutral.render.hitPixels,rear.render.neutralSideBackPixels);
  }catch(e){
   await page.screenshot({path:out+'/'+device.name+'-FAIL.png'}).catch(()=>{});
   throw Error(device.name+' '+e.message+' browserErrors='+JSON.stringify(errors));
  }finally{await page.close();}
 }
}finally{await browser.close();}
