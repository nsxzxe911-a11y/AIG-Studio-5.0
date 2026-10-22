/** Public Render LIVE source-integrity and NC replay regression, browser only.
 * Never sends CNC machine commands, fake assets are injected in a disposable
 * browser tab and MUST NOT become active UI.
 */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const base='https://aig-dual-formal-runtime.onrender.com';
const dir='artifacts/aig-public-3ax-authority-live';
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 '--no-sandbox','--disable-dev-shm-usage','--enable-webgl',
 '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'
]});
try{
 for(const device of [
  {name:'phone',viewport:{width:360,height:780},isMobile:true,hasTouch:true},
  {name:'landscape',viewport:{width:915,height:412},isMobile:true,hasTouch:true},
  {name:'desktop',viewport:{width:1440,height:900}}
 ]){
  const page=await browser.newPage({...device,deviceScaleFactor:1});
  page.setDefaultTimeout(40000);
  const exceptions=[];page.on('pageerror',e=>exceptions.push(e.message));
  try{
   const response=await page.goto(base+'/3ax-nc-workbench.html?v=8895a7ff',{waitUntil:'load',timeout:40000});
   assert.equal(response?.status(),200);
   const manifestResponse=await page.request.get(base+'/3ax-authority-source.json');
   assert.equal(manifestResponse.status(),200);
   const m=await manifestResponse.json();
   assert.equal(m.mobile.sha256,'4f46a4c1f1ed7c71165108ed13f4809201794c16ebc397987d06d1be1f773e28');
   assert.equal(m.mobile.encoding,'JPEG_JFIF_DESPITE_PNG_FILENAME');
   assert.equal(m.mobile.width,864);assert.equal(m.mobile.height,1536);
   assert.equal(m.desktop.sha256,null);assert.equal(m.machineGeometry.sourceSha256,null);
   await page.waitForFunction(()=>{
    try{
     const ev=JSON.parse(document.getElementById('evidence').textContent);
     return ev.rendered.status==='WEBGL_XYZ_TRIANGLES_RENDERED'&&ev.replay.blockIndex===0;
    }catch{return false;}
   },null,{timeout:40000});
   const before=JSON.parse(await page.locator('#evidence').textContent());
   assert.equal(before.realFanucControllerCommandsSent,0);
   const layout=await page.evaluate(()=>({width:innerWidth,
    documentWidth:document.documentElement.scrollWidth}));
   assert.ok(layout.documentWidth<=layout.width+3);
   assert.equal(await page.locator('#authority-panel').count(),1);
   assert.equal(await page.locator('#authority-preview').isVisible(),false);
   await page.locator('#authority-panel').evaluate(d=>{d.open=true;});
   await page.route('**/visual-authority/mobile/05_3AX.png',route=>
     route.fulfill({status:200,contentType:'image/jpeg',body:Buffer.from('FORGED_AUTHORITY')}));
   await page.locator('#authority-check').click();
   await page.waitForFunction(()=>document.getElementById('authority-status').textContent
    .includes('SOURCE_PNG_BYTE_LENGTH_OR_SIZE_BLOCKED'));
   assert.equal(await page.locator('#authority-preview').isVisible(),false);
   await page.unroute('**/visual-authority/mobile/05_3AX.png');
   await page.locator('#authority-file').setInputFiles({
    name:'05_3AX.png',mimeType:'image/jpeg',buffer:Buffer.from('WRONG_ORIGINAL_JPEG')
   });
   await page.waitForFunction(()=>document.getElementById('authority-status').textContent
    .includes('本機圖片驗證 BLOCKED'));
   assert.equal(await page.locator('#authority-preview').isVisible(),false);
   assert.equal((await page.locator('#evidence').textContent()).includes('AIG_REAL3D_V1_3'),true);
   await page.locator('#next').click();
   await page.waitForFunction(()=>JSON.parse(document.getElementById('evidence').textContent).replay.blockIndex===1);
   await page.locator('#next').click();
   await page.locator('#next').click();
   const after=JSON.parse(await page.locator('#evidence').textContent());
   assert.equal(after.replay.cumulativeRemovedMm3,54);
   assert.equal(after.replay.lastMotion,'G0');
   assert.equal(after.replay.lastRemovedMm3,0);
   assert.equal(after.realFanucControllerCommandsSent,0);
   assert.deepEqual(exceptions,[]);
   await page.screenshot({path:dir+'/'+device.name+'-sha-failclosed-nc-real.png',fullPage:true});
   await writeFile(dir+'/'+device.name+'-proof.json',JSON.stringify({
    device:device.name,renderBase:base,layout,
    approvalSourceId:m.mobile.authorityId,
    rawSourceSHA256:m.mobile.sha256,actualFileEncoding:m.mobile.encoding,
    fakeAuthorityAssetBlocked:true,
    falseAuthorityDisplayPrevented:true,
    numericVoxelG1RemovedMm3:54,numericVoxelG0RemovedMm3:0,
    realMachineCNCCommandsSent:0,
    realNative4kAndMachineModelCertified:false
   },null,2));
   console.log('AIG_PUBLIC_3AX_AUTHORITY_SHA_AND_TRUE_NC_PASS',device.name);
  }catch(e){
   await page.screenshot({path:dir+'/'+device.name+'-FAIL.png',fullPage:true}).catch(()=>{});
   throw Error(device.name+' '+String(e?.message||e)+' pageerrors='+JSON.stringify(exceptions));
  }finally{await page.close();}
 }
}finally{await browser.close();}
