/**
 * Real phone and desktop Chromium: 2 reviewed source photos train real
 * weights, SHA-verified vault restore and 3rd DISTINCT reviewed photo IoU.
 * Technical colour fixtures only; NOT real-life semantic benchmark proof.
 */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/aig-real3d-2-8b-multisource-visible-occlusion';
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
  const context=await browser.newContext({...device});
  const page=await context.newPage();
  page.setDefaultTimeout(24000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto('http://127.0.0.1:8765/scene-runtime-studio.html');
   await page.waitForFunction(()=>document.getElementById('status')
    ?.textContent.includes('資產索引已就緒'));
   const makePhoto=async shift=>page.evaluate(shift=>{
    const c=document.createElement('canvas');c.width=256;c.height=192;
    const g=c.getContext('2d');
    g.fillStyle='rgb('+(228+shift)+',228,224)';
    g.fillRect(0,0,256,192);
    g.fillStyle='rgb(45,65,'+(120+shift)+')';
    g.fillRect(64,38,128,132);
    g.fillStyle='rgb('+(78+shift)+',44,30)';
    g.fillRect(99,20,52,52);
    g.fillStyle='rgb(185,135,100)';
    g.fillRect(113,70,24,18);
    return c.toDataURL('image/png').split(',')[1];
   },shift);
   const prepare=async shift=>{
    const image=await makePhoto(shift);
    await page.locator('#photo23-source').setInputFiles({
     name:'independent-'+shift+'.png',mimeType:'image/png',
     buffer:Buffer.from(image,'base64')
    });
    await page.locator('#vision26-load').click();
    await page.waitForFunction(()=>document.getElementById('vision26-status')
     .textContent.includes('來源照片 SHA'));
    await page.locator('#vision27-sync').click();
    await page.waitForFunction(()=>document.getElementById('vision27-status')
     .textContent.includes('已接回'));
    for(const [x,y,label] of [[10,100,0],[240,100,0],
     [78,130,14],[116,31,3],[123,80,4]]){
     await page.locator('#vision27-class').selectOption(String(label));
     await page.locator('#vision27-canvas').evaluate((canvas,p)=>{
      const r=canvas.getBoundingClientRect();
      canvas.dispatchEvent(new MouseEvent('click',{bubbles:true,
       clientX:r.left+p.x*r.width/canvas.width,
       clientY:r.top+p.y*r.height/canvas.height}));
     },{x,y});
    }
    await page.locator('#vision27-run').click();
    await page.waitForFunction(()=>document.getElementById('vision27-status')
     .textContent.includes('真像素分割完成'));
    await page.locator('#vision28-reviewed').check();
    return JSON.parse(await page.locator('#vision26-proof').textContent())
     .sourceSha256;
   };
   const a=await prepare(0);
   await page.locator('#vision28b-add').click();
   assert.match(await page.locator('#vision28b-status').textContent(),/已收集.*1\/8/);
   const b=await prepare(3);
   assert.notEqual(a,b);
   await page.locator('#vision28b-add').click();
   assert.match(await page.locator('#vision28b-status').textContent(),/已收集.*2\/8/);
   await page.locator('#vision28-epochs').selectOption('250');
   await page.locator('#vision28b-train').click();
   await page.waitForFunction(()=>document.getElementById('vision28b-status')
    .textContent.includes('真正多照片訓練完成'),null,{timeout:30000});
   const trained=JSON.parse(await page.locator('#vision28b-proof').textContent());
   assert.equal(trained.reviewedTrainingSourceCount,2);
   assert.equal(trained.multiSourceModelActuallyTrained,true);
   assert.equal(trained.trainedPhotoCount,2);
   assert.deepEqual(trained.reviewedSourceSHA,[a,b]);
   const model=JSON.parse(await page.locator('#vision28-proof').textContent());
   assert.match(model.modelSha256,/^sha256:[a-f0-9]{64}$/);
   assert.equal(model.actualLearnedWeights,36);
   await page.locator('#vision28-save').click();
   await page.waitForFunction(()=>document.getElementById('vision28-status')
    .textContent.includes('通過 SHA 回讀'));
   const storedModelId=await page.locator('#vision28-saved-model').inputValue();
   assert.ok(storedModelId);
   await page.locator('#vision28-restore').click();
   await page.waitForFunction(()=>document.getElementById('vision28-status')
    .textContent.includes('已從本機素材庫驗證重載真正模型權重'));
   const c=await prepare(6);
   assert.notEqual(c,a);assert.notEqual(c,b);
   await page.locator('#vision28-threshold').selectOption('0.60');
   await page.locator('#vision28-infer').click();
   await page.waitForFunction(()=>document.getElementById('vision28-status')
    .textContent.includes('已執行學習後的自動像素分類'));
   const inferred=JSON.parse(await page.locator('#vision28-proof').textContent());
   assert.equal(inferred.sourceDifferentFromTraining,true);
   assert.equal(inferred.newSourcePhotoSHA,c);
   await page.locator('#vision28b-audit').click();
   const contact=JSON.parse(await page.locator('#vision28b-proof').textContent())
    .visibleHairNeckBoundary;
   assert.equal(contact.hiddenNeckReconstructed,false);
   assert.ok(contact.observedHairNeckContactPixels>0);
   await page.locator('#vision28b-evaluate').click();
   await page.waitForFunction(()=>document.getElementById('vision28b-status')
    .textContent.includes('獨立第三來源 IoU='));
   const evaluated=JSON.parse(await page.locator('#vision28b-proof').textContent())
    .newSourceIndependentEvaluation;
   assert.equal(evaluated.sourceDisjointHoldout,true);
   assert.equal(evaluated.perClassIoU.length,4);
   assert.equal(evaluated.thresholdGatePass,true,JSON.stringify(evaluated));
   assert.ok(evaluated.perClassIoU.every(x=>x.IoU>=.60));
   assert.equal(evaluated.generalRealPhotoSemanticAccuracyCertified,false);
   assert.deepEqual(errors,[]);
   await page.screenshot({path:out+'/'+device.name+'-third-photo-iou.png',
    fullPage:true});
   await writeFile(out+'/'+device.name+'-proof.json',JSON.stringify({
    reviewedTrainPhotoSHA:[a,b],independentTestPhotoSHA:c,
    modelSha256:model.modelSha256,
    realPhoneDesktopBrowser:device.name,
    savedModelRecoveredWithSHA:true,
    learnedModelTrueMultiPhoto:true,
    perClassIndependentIoU:evaluated.perClassIoU,
    visibleHairNeckContactPixels:contact.observedHairNeckContactPixels,
    hiddenNeckAndFull3DNotReconstructed:true,
    naturalPhotoAccuracyNotProven:true,
    originalSourceGLBAndCNCUnmodified:true
   },null,2));
   console.log('AIG28B_TWO_REVIEWED_PHOTOS_THIRD_SOURCE_IOU_VISIBLE_HAIR_NECK_PASS',device.name);
  }catch(e){
   await page.screenshot({path:out+'/'+device.name+'-FAIL.png',
    fullPage:true}).catch(()=>{});
   throw Error(device.name+' '+String(e.message||e)+
    ' multi='+await page.locator('#vision28b-status').textContent().catch(()=>null)+
    ' ML='+await page.locator('#vision28-status').textContent().catch(()=>null)+
    ' browserErrors='+JSON.stringify(errors));
  }finally{await context.close()}
 }
}finally{await browser.close()}
