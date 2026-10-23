/**
 * Isolated, comparatively low-memory browser test: one real 1080x1920 GPU
 * WebGL FRONT capture for each adult, not a 45 degree shot or AI image.
 * User appearance acceptance remains BLOCK regardless of PASS here.
 */
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const dir='artifacts/aig-stage1-true-front-orthographic';
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 '--enable-webgl','--use-gl=angle','--use-angle=swiftshader',
 '--no-sandbox','--disable-dev-shm-usage'
]});
const page=await browser.newPage({
 viewport:{width:1200,height:850},acceptDownloads:true,
 deviceScaleFactor:1
});
const issues=[];
page.on('pageerror',e=>issues.push(e.message));
const names=['male','female'],results=[];
try{
 await page.goto('http://127.0.0.1:8765/scene-runtime-studio.html',{
  waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>
  /已就緒/.test(document.querySelector('#status')?.textContent||''),
  null,{timeout:30000});
 await page.locator('#stage1-photo-front-both').dispatchEvent('click');
 await page.waitForFunction(()=>
  document.querySelectorAll('[data-stage1-real-front-gender]').length===2,
  null,{timeout:90000});
 for(const gender of names){
  const item=page.locator('[data-stage1-real-front-gender="'+gender+'"]');
  assert.equal(await item.count(),1);
  const img=item.locator('img');
  await page.waitForFunction(g=>{
   const img=document.querySelector(
    '[data-stage1-real-front-gender="'+g+'"] img');
   return img?.complete&&img.naturalWidth===1080&&
    img.naturalHeight===1920;
  },gender,{timeout:18000});
  const download=page.waitForEvent('download',{timeout:18000});
  await item.locator('a').click();
  const d=await download;
  const file=await d.path();
  const bytes=await readFile(file);
  assert.ok(bytes.length>12000,'real PNG empty '+gender);
  assert.equal(bytes.readUInt32BE(0),0x89504e47);
  assert.equal(bytes.readUInt32BE(16),1080);
  assert.equal(bytes.readUInt32BE(20),1920);
  const sha=createHash('sha256').update(bytes).digest('hex');
  const fileName='FRONT-ORTHO-'+gender+'-1080x1920-ACTUAL-WEBGL.png';
  await copyFile(file,dir+'/'+fileName);
  results.push({gender,view:'front',yawDeg:0,pitchDeg:0,
   projection:'orthographic',width:1080,height:1920,sha256:sha,
   sizeBytes:bytes.length,file:fileName,
   actualRendererPixelEvidence:true,visuallyApproved:false});
 }
 assert.equal(new Set(results.map(x=>x.sha256)).size,2,
  'male/female front shots must depict distinct real sources');
 assert.equal(await page.locator('#stage1-photo-front-status').getAttribute(
  'data-error'),'false');
 const proof=JSON.parse(await page.locator('#stage1-proof').textContent());
 assert.equal(proof.trueFrontPhotoSource.gender,'female');
 assert.equal(proof.trueFrontPhotoSource.view,'front');
 assert.equal(proof.trueFrontPhotoSource.projection,'orthographic');
 assert.equal(proof.trueFrontPhotoSource.cameraYawDeg,0);
 assert.equal(proof.trueFrontPhotoSource.cameraPitchDeg,0);
 assert.equal(proof.trueFrontPhotoSource.actualGPUFramebufferAndPixelsRead,true);
 assert.equal(proof.trueFrontPhotoSource.sourceXYZClipAudit.frontalGeometryClipPASS,true);
 assert.equal(proof.trueFrontPhotoSource.stage1ReleasePASS,false);
 assert.equal(proof.stage1PASS,false);
 await writeFile(dir+'/FRONT-ONLY-MANIFEST.json',JSON.stringify({
  schema:'AIG_STAGE1_FRONT_ORTHO_ZERO_YAW_NO_DISTORT_V1',
  source:'real native WebGL GPU renderTarget readback (not page screenshot)',
  maleBodyMm:1780,femaleBodyMm:1680,
  sharedOriginalRenderer:true,approvedSourceAppearance:false,
  actualFrontImages:results,
  mandatoryVisualGate:'BLOCK',
  fourAngleGateNotSubstitutedByFrontOnly:true
 },null,2));
 console.log('AIG_REAL_FRONT_WEBGL_MALE_FEMALE_PNG_PASS',results.map(x=>
  x.gender+' '+x.sha256.slice(0,10)+' '+x.sizeBytes).join(' / '));
 if(issues.length)throw Error('BROWSER_PAGE_ERRORS '+issues.join(' ; '));
}catch(e){
 console.error('AIG_REAL_FRONT_FAIL',e.stack||String(e));
 await page.screenshot({path:dir+'/FRONT-FAIL-WORKPAGE.png',
  fullPage:true,timeout:20000}).catch(()=>{});
 process.exitCode=1;
}finally{
 await browser.close();
}
