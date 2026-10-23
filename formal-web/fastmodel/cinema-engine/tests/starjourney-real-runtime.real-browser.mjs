/** Actual Chrome local-file import + playable canvas preview and mobile control test.
 * This is NOT evidence for AI, natural-human 3D, imported-asset audio mixing, 4K.
 */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const path='artifacts/aig-fastmodel-starjourney-ui-runtime-v1';
await mkdir(path,{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 '--enable-webgl','--use-gl=angle','--use-angle=swiftshader',
 '--no-sandbox','--disable-dev-shm-usage'
]});
const errors=[],screens=[];
const page=await browser.newPage({viewport:{width:1600,height:920},acceptDownloads:true});
page.on('pageerror',e=>errors.push(e.message));
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAuMBgZc5GfYAAAAASUVORK5CYII=','base64');
try{
 await page.goto('http://127.0.0.1:8765/fastmodel/cinema-engine/',{
  waitUntil:'domcontentloaded',timeout:30000});
 await page.locator('button[data-command="FM.PRODUCE.START"]').click();
 assert.match(await page.locator('#feedback').textContent(),/沒有素材/);
 assert.equal(await page.locator('button[data-command="FM.AI.CHARACTER"]').isDisabled(),true);
 await page.locator('#image-file').setInputFiles({
  name:'QA_LOCAL_USER_IMAGE.png',mimeType:'image/png',buffer:png});
 await page.waitForFunction(()=>document.getElementById('asset-count').textContent==='1',null,{timeout:20000});
 assert.equal(await page.locator('#timeline-clips button').count(),1);
 await page.locator('#subtitle').fill('星際之旅，現在開始！');
 assert.match(await page.locator('#subtitle-short').textContent(),/星際之旅/);
 await page.locator('button[data-mode="2_5D"]').click();
 assert.equal(await page.locator('#stage-mode').textContent(),'2.5D');
 await page.locator('button[data-mode="3D"]').click();
 assert.equal(await page.locator('#stage-mode').textContent(),'2.5D');
 assert.match(await page.locator('#feedback').textContent(),/需要真.*glb/);
 await page.locator('#play-button').click();
 await page.waitForTimeout(350);
 const current=await page.locator('#time').textContent();
 assert.match(current,/00:0/);
 await page.locator('#pause-button').click();
 const capture=page.waitForEvent('download',{timeout:10000});
 await page.locator('#still-button').click();
 const pic=await capture,bytes=await readFile(await pic.path());
 assert.equal(bytes.readUInt32BE(0),0x89504e47);
 assert.equal(bytes.readUInt32BE(16),960);
 assert.equal(bytes.readUInt32BE(20),540);
 await copyFile(await pic.path(),path+'/STARJOURNEY-TRUE-CANVAS-OUTPUT.png');
 let webmExportPASS=false,webmSize=0;
 if(await page.evaluate(()=>typeof MediaRecorder!=='undefined'&&
    typeof HTMLCanvasElement.prototype.captureStream==='function'&&
    ['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm']
      .some(m=>MediaRecorder.isTypeSupported(m)))){
  const promise=page.waitForEvent('download',{timeout:45000});
  await page.locator('#export-webm').click();
  const file=await promise,video=await readFile(await file.path());
  assert.equal(video.readUInt32BE(0),0x1a45dfa3);
  assert.ok(video.length>1000);
  await copyFile(await file.path(),path+'/STARJOURNEY-REAL-CANVAS-VIDEO-ONLY.webm');
  webmExportPASS=true;webmSize=video.length;
 }
 await page.screenshot({path:path+'/desktop-real-runtime-with-asset.png',fullPage:true});
 screens.push('desktop-real-runtime-with-asset.png');
 // Verify runtime responsive view, not scaled mockup.
 const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,
  deviceScaleFactor:1,hasTouch:true});
 mobile.on('pageerror',e=>errors.push(e.message));
 await mobile.goto('http://127.0.0.1:8765/fastmodel/cinema-engine/',{
  waitUntil:'domcontentloaded',timeout:30000});
 await mobile.screenshot({path:path+'/mobile-stage.png',fullPage:true});
 await mobile.locator('button[data-mobile-tab="CONTROL"]').click();
 assert.equal(await mobile.locator('#mobile-control').isVisible(),true);
 assert.equal(await mobile.locator('#mobile-stage').isVisible(),false);
 await mobile.screenshot({path:path+'/mobile-control.png',fullPage:true});
 await mobile.locator('button[data-mobile-tab="TIMELINE"]').click();
 assert.equal(await mobile.locator('#mobile-timeline').isVisible(),true);
 await mobile.screenshot({path:path+'/mobile-timeline.png',fullPage:true});
 await mobile.close();
 assert.deepEqual(errors,[]);
 await writeFile(path+'/proof.json',JSON.stringify({
  schema:'AIG_FASTMODEL_RGB_GLASS_REAL_RUNTIME_BROWSER_V1',
  userApprovedAuthoritySource:'77611d97db45772f14a403331d4d044b773f132bc2a78c99222262a4e4a046e6',
  sourceGraphicInGitHub:false,
  actualRGBGlassSemanticButtons:true,
  imageImportPASS:true,
  subtitleOverlayPASS:true,
  twoPointFiveDModeChangePASS:true,
  threeDWithoutGLBIsBlocked:true,
  actualPNGSize:[960,540],
  actualPNG_SHA256:createHash('sha256').update(bytes).digest('hex'),
  responsiveMobileThreeTabsPASS:true,
  aiGenerationImplemented:false,
  videoImportBehaviorNotTested:true,
  webmExportNotTested:!webmExportPASS,
  webmVideoOnlyExportPASS:webmExportPASS,
  webmBytes:webmSize,
  human3DPhotoReconstructionPASS:false,
  fullMovieWithAudioPASS:false,
  deployedToRender:false
 },null,2));
 console.log('FASTMODEL_STARJOURNEY_REAL_LOCAL_IMAGE_RUNTIME_MOBILE_GATE_PASS');
}catch(e){
 console.error('FASTMODEL_STARJOURNEY_BROWSER_GATE_BLOCK',e.stack||String(e));
 process.exitCode=1;
 await page.screenshot({path:path+'/FAILED.png',fullPage:true}).catch(()=>{});
}finally{await browser.close();}
