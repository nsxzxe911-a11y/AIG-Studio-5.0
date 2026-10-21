import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true,
 executablePath:process.env.AIG_CHROMIUM_EXECUTABLE||undefined,
 args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage();
 await page.goto('http://127.0.0.1:8765/index.html');
 await page.locator('#aig-unified-tabs').waitFor();
 const bytes=Buffer.from(await page.evaluate(()=>{
  const canvas=document.createElement('canvas');canvas.width=200;canvas.height=300;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#acf';ctx.fillRect(0,0,200,300);
  ctx.fillStyle='#e74';ctx.fillRect(40,50,120,180);
  return canvas.toDataURL().split(',')[1];
 }),'base64');
 await page.locator('#aig65-image').setInputFiles({name:'synthetic-camera.png',mimeType:'image/png',buffer:bytes});
 await page.locator('#aig65-story').fill('鏡頭推近照片');
 await page.locator('#aig65-duration').fill('2');
 await page.evaluate(()=>{
  const original=window.createImageBitmap;
  window.createImageBitmap=(...args)=>new Promise((resolve,reject)=>{
   window.releaseImageDecode=()=>{window.createImageBitmap=original;original(...args).then(resolve,reject);};
  });
 });
 await page.locator('#aig65-build').click();
 await page.waitForFunction(()=>typeof window.releaseImageDecode==='function');
 assert.equal(await page.locator('#aig65-mode').isDisabled(),true,'source controls must lock during image decoding');
 assert.equal(await page.locator('#aig65-image').isDisabled(),true);
 await page.evaluate(()=>window.releaseImageDecode());
 await page.waitForFunction(()=>document.querySelector('#aig693-progress').getAttribute('data-aig-state')==='complete');
 await page.locator('#aig65-record').click();
 await page.waitForFunction(()=>document.querySelector('#aig65-video').src.startsWith('blob:'),null,{timeout:15000});
 await page.waitForFunction(()=>!document.querySelector('#aig65-report').disabled);
 async function report(){
  const pending=page.waitForEvent('download');await page.locator('#aig65-report').click();
  const download=await pending;return JSON.parse(await readFile(await download.path(),'utf8'));
 }
 assert.ok((await report()).actualRealMediaRecorderResult?.actualBytes>0);
 await page.locator('#aig-unified-tab-create').click();
 await page.locator('#aig65-story').fill('鏡頭拉遠照片');
 await page.locator('#aig65-build').click();
 await page.waitForFunction(()=>document.querySelector('#aig693-progress').getAttribute('data-aig-state')==='complete');
 assert.equal((await report()).actualRealMediaRecorderResult,null,'a new plan must never inherit previous movie evidence');
 assert.equal(await page.locator('#aig65-downloads a').count()>0,true,'previous actual movie downloads must remain');
 console.log('Generation source lock and independent per-plan media evidence PASS');
}finally{await browser.close();}
