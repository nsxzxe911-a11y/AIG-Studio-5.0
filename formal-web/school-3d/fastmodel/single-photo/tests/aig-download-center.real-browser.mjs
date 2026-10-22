/**
 * AIG new download center - actual Chromium responsive & local-only backup.
 * Test does NOT certify real installation package / machining or upload to cloud.
 */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const base='http://127.0.0.1:8765/';
const dir='artifacts/aig-new-download-center';
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 for(const device of [
  {name:'phone',viewport:{width:360,height:780},isMobile:true,hasTouch:true},
  {name:'landscape',viewport:{width:915,height:412},isMobile:true,hasTouch:true},
  {name:'desktop',viewport:{width:1440,height:900}}
 ]){
  const page=await browser.newPage({...device,acceptDownloads:true,deviceScaleFactor:1});
  page.setDefaultTimeout(25000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   const res=await page.goto(base+'aig-download-center.html',{waitUntil:'load'});
   assert.equal(res?.status(),200);
   assert.match(await page.title(),/新版下載與版本中心/);
   assert.equal(await page.locator('.quick').count(),3);
   assert.equal(await page.locator('.cards .card').count(),4);
   assert.equal(await page.locator('a[href="./cloud-builder.html"]').count(),1);
   assert.equal((await page.request.get(base+'cloud-builder.html')).status(),200);
   assert.equal((await page.request.get(base+'qa-artifacts-manifest.json')).status(),200);
   const layout=await page.evaluate(()=>{
     const rect=q=>{const b=document.querySelector(q).getBoundingClientRect();
       return{x:b.x,y:b.y,width:b.width,height:b.height};};
     return {vw:innerWidth,docW:document.documentElement.scrollWidth,
       android:rect('.quick'),backup:rect('#backup')};
   });
   assert.ok(layout.docW<=layout.vw+3,'horizontal overflow: '+JSON.stringify(layout));
   assert.ok(layout.backup.width>200);
   // Fake fixture only; browser Backup button must not send it to any network.
   await page.evaluate(()=>{
     localStorage.setItem('AIG-CAD-WORKING-TEST','G1 X2 Y3');
     localStorage.setItem('AIG-NC-DRAFT-TEST','G21 G90 G54\nG0 X0 Y0\nM30');
     localStorage.setItem('AIG-AUTH-TOKEN-WORKING','SECRET_MUST_NOT_EXPORT');
   });
   const old=await page.evaluate(()=>Object.fromEntries([
     'AIG-CAD-WORKING-TEST','AIG-NC-DRAFT-TEST','AIG-AUTH-TOKEN-WORKING'
   ].map(k=>[k,localStorage.getItem(k)])));
   const [download]=await Promise.all([
     page.waitForEvent('download'),
     page.locator('#export-local').click()
   ]);
   assert.equal(download.suggestedFilename(),'AIG-local-CNC-drafts-backup.json');
   const data=JSON.parse(await readFile(await download.path(),'utf8'));
   assert.equal(data.schema,'AIG_WEB_LEGACY_LOCAL_DRAFT_BACKUP');
   assert.equal(data.drafts['AIG-CAD-WORKING-TEST'],old['AIG-CAD-WORKING-TEST']);
   assert.equal(data.drafts['AIG-NC-DRAFT-TEST'],old['AIG-NC-DRAFT-TEST']);
   assert.equal(Object.prototype.hasOwnProperty.call(data.drafts,'AIG-AUTH-TOKEN-WORKING'),false);
   const after=await page.evaluate(()=>Object.fromEntries([
     'AIG-CAD-WORKING-TEST','AIG-NC-DRAFT-TEST','AIG-AUTH-TOKEN-WORKING'
   ].map(k=>[k,localStorage.getItem(k)])));
   assert.deepEqual(after,old,'Backup must not mutate existing project or secret state');
   assert.match(await page.locator('#export-status').textContent(),/原內容保留/);
   assert.equal(await page.locator('.advanced').evaluate(x=>x.open),false);
   assert.deepEqual(errors,[]);
   await page.screenshot({path:dir+'/'+device.name+'-new-download-center.png',fullPage:true});
   await writeFile(dir+'/'+device.name+'-proof.json',JSON.stringify({
     device:device.name,layout,
     threeProjectQADirectoryShown:true,buildAndDownloadLinksReal:true,
     localStorageOriginalCopiesUntouched:true,
     credentialNamedEntriesExcluded:true,
     downloadedJSONBackupCreated:true,realAPKEXENativeReleased:false
   },null,2));
   console.log('AIG_NEW_DOWNLOAD_CENTER_REAL_BROWSER_PASS',device.name);
  }catch(e){
   await page.screenshot({path:dir+'/'+device.name+'-FAIL.png',fullPage:true}).catch(()=>{});
   throw Error(device.name+' '+String(e.message||e)+' errors='+JSON.stringify(errors));
  }finally{await page.close();}
 }
}finally{await browser.close();}
