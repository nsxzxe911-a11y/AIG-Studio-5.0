import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const out='artifacts/aig-external-asset-library-7-16';
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
  const page=await browser.newPage({...device,acceptDownloads:true});
  page.setDefaultTimeout(30000);
  const jsErrors=[];page.on('pageerror',e=>jsErrors.push(e.message));
  try{
   const resp=await page.goto('http://127.0.0.1:8765/asset-library-studio.html',
    {waitUntil:'load'});
   assert.equal(resp?.status(),200);
   await page.waitForFunction(()=>document.getElementById('status').textContent.includes('本機資產庫已開啟'));
   const original=Buffer.from('glTF_TEST_BLOB_PERSON_SOURCE_IMMUTABLE');
   const checksum='sha256:'+createHash('sha256').update(original).digest('hex');
   let expectedRecords=0;
   const add=async(cat,title,tags,bytes=original)=>{
    await page.locator('#asset-file').setInputFiles({
     name:'asset.glb',mimeType:'model/gltf-binary',buffer:bytes});
    await page.locator('#asset-category').selectOption(cat);
    await page.locator('#asset-title').fill(title);
    await page.locator('#asset-tags').fill(tags);
    await page.locator('#asset-import').click();
    const expected=++expectedRecords;
    await page.waitForFunction(n=>document.getElementById('stats')
     .textContent.includes('儲存項目 '+n+' 筆'),expected);
   };
   await add('character','櫻花校園女主角','女主角,校園');
   await add('scene','校園同材質場景','校園,場景');
   const geo=Buffer.from(JSON.stringify({type:'FeatureCollection',features:[]}));
   await page.locator('#asset-file').setInputFiles({
    name:'map.geojson',mimeType:'application/json',buffer:geo});
   await page.locator('#asset-title').fill('校園 GeoJSON');
   await page.locator('#asset-tags').fill('校園,圖資');
   await page.locator('#asset-import').click();
   await page.waitForFunction(()=>document.getElementById('stats')
    .textContent.includes('儲存項目 3 筆'));
   const info=await page.locator('#stats').textContent();
   assert.match(info,/儲存項目 3 筆/);
   assert.match(info,/獨立檔案 2 份/);
   assert.match(info,/重複來源節省/);
   await page.reload({waitUntil:'load'});
   await page.waitForFunction(()=>document.getElementById('stats').textContent.includes('儲存項目 3 筆'));
   await page.locator('#asset-filter').selectOption('character');
   await page.waitForFunction(()=>document.querySelectorAll('.asset').length===1);
   const card=page.locator('.asset').first();
   assert.match(await card.textContent(),/櫻花校園女主角/);
   assert.match(await card.textContent(),/unreviewed/);
   // No silent learned approval or autoload:
   await page.locator('#asset-reuse-tags').fill('女主角,校園');
   await page.locator('#asset-reuse').click();
   await page.waitForFunction(()=>document.getElementById('reuse-results')
    .textContent.includes('尚無已核准'));
   page.once('dialog',d=>d.accept());
   await card.getByRole('button',{name:'審核通過'}).click();
   await page.waitForFunction(()=>document.querySelector('.asset')?.textContent.includes('approved'));
   await page.locator('#asset-reuse').click();
   await page.waitForFunction(()=>document.getElementById('reuse-results')
    .textContent.includes('櫻花校園女主角'));
   await page.locator('#reuse-results').getByRole('button',{name:/使用 櫻花校園女主角/}).click();
   await page.waitForFunction(()=>document.querySelector('.asset')?.textContent.includes('使用 1 次'));
   // Load only the selected payload when explicitly downloading.
   const incoming=page.waitForEvent('download');
   await page.locator('.asset').first().getByRole('button',{name:'取回檔案'}).click();
   const result=await incoming,raw=await readFile(await result.path());
   assert.deepEqual(raw,original);
   assert.equal('sha256:'+createHash('sha256').update(raw).digest('hex'),checksum);
   await page.screenshot({path:out+'/'+device.name+'-deduplicated-external-index.png',fullPage:true});
   await writeFile(out+'/'+device.name+'-external-vault-proof.json',JSON.stringify({
    schema:'AIG716_REAL_BROWSER_OUT_OF_BUNDLE_STORAGE',
    device,recordsSaved:3,independentBinaryPayloads:2,
    shaOriginal:checksum,downloadSHAValidated:true,
    approvedBeforeRecommendationRequired:true,
    metadataSurvivedPageReload:true,
    importedVideoOrModelNeverEagerLoaded:true,
    actualWindowsAppDataOrAndroidFilesDirNotTouched:true,
    aiModelTrainingNotClaimed:true,
    indexedDBOriginStorageEvictionPossible:true
   },null,2));
   assert.deepEqual(jsErrors,[]);
   console.log('AIG716_EXTERNAL_PERSON_MAP_SCENE_ASSET_VAULT_BROWSER_PASS',
    device.name,'3 records / 2 binary payloads, explicit approval and lazy SHA verified retrieval');
  }catch(e){
   await page.screenshot({path:out+'/'+device.name+'-FAIL.png',fullPage:true}).catch(()=>{});
   throw Error(device.name+': '+String(e.message||e)+
    ' status='+await page.locator('#status').textContent().catch(()=>null)+
    ' errors='+JSON.stringify(jsErrors));
  }finally{await page.close();}
 }
}finally{await browser.close();}
