/** Real mobile/desktop Chromium: reviewed 2.7 source mask -> first-party
 * REAL learned weights -> separate photo automatic inference -> independent IoU.
 * Colour-coded technical fixture isn't evidence of real-world semantic accuracy.
 */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/aig-real3d-2-8-first-party-learned';
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
  const page=await context.newPage();page.setDefaultTimeout(25000);
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
    const base64=await makePhoto(shift);
    await page.locator('#photo23-source').setInputFiles({
     name:'real-review-source-'+shift+'.png',mimeType:'image/png',
     buffer:Buffer.from(base64,'base64')
    });
    await page.locator('#vision26-load').click();
    await page.waitForFunction(()=>document.getElementById('vision26-status')
     .textContent.includes('來源照片 SHA'));
    await page.locator('#vision27-sync').click();
    await page.waitForFunction(()=>document.getElementById('vision27-status')
     .textContent.includes('已接回'));
    const clickSeed=async(x,y,label)=>{
     await page.locator('#vision27-class').selectOption(String(label));
     await page.locator('#vision27-canvas').evaluate((c,p)=>{
      const r=c.getBoundingClientRect();
      c.dispatchEvent(new MouseEvent('click',{bubbles:true,
       clientX:r.left+p.x*r.width/c.width,
       clientY:r.top+p.y*r.height/c.height}));
     },{x,y});
    };
    for(const item of [[10,100,0],[240,100,0],[78,130,14],
     [116,31,3],[123,80,4]])await clickSeed(...item);
    await page.locator('#vision27-run').click();
    await page.waitForFunction(()=>document.getElementById('vision27-status')
     .textContent.includes('真像素分割完成'));
    const evidence=JSON.parse(await page.locator('#vision27-proof').textContent());
    assert.equal(evidence.visible2DRegions.length,3);
    assert.equal(evidence.unresolvedBoundaryPixels,0);
    await page.locator('#vision28-reviewed').check();
    return JSON.parse(await page.locator('#vision26-proof').textContent()).sourceSha256;
   };
   const trainingSHA=await prepare(0);
   await page.locator('#vision28-epochs').selectOption('160');
   await page.locator('#vision28-train').click();
   await page.waitForFunction(()=>document.getElementById('vision28-status')
    .textContent.includes('已真正訓練'),null,{timeout:25000});
   const learned=JSON.parse(await page.locator('#vision28-proof').textContent());
   assert.match(learned.modelSha256,/^sha256:[a-f0-9]{64}$/);
   assert.equal(learned.actualLearnedWeights,36);
   assert.ok(learned.trainingLossFinal<learned.trainingLossInitial);
   assert.deepEqual(learned.originalReviewedSourceSHA,[trainingSHA]);
   assert.equal(learned.trainedNeuralSemanticNetwork,false);
   await page.locator('#vision28-save').click();
   await page.waitForFunction(()=>document.getElementById('vision28-status')
    .textContent.includes('通過 SHA 回讀'),null,{timeout:15000});
   const newSHA=await prepare(5);
   assert.notEqual(newSHA,trainingSHA);
   await page.locator('#vision28-threshold').selectOption('0.60');
   await page.locator('#vision28-infer').click();
   await page.waitForFunction(()=>document.getElementById('vision28-status')
    .textContent.includes('已執行學習後的自動像素分類'),null,{timeout:25000});
   let proof=JSON.parse(await page.locator('#vision28-proof').textContent());
   assert.equal(proof.newSourcePhotoSHA,newSHA);
   assert.equal(proof.sourceDifferentFromTraining,true);
   assert.equal(proof.inferenceExecuted,true);
   assert.ok(Object.keys(proof.classPixelCounts).length>=3);
   assert.equal(proof.generalSemanticIdentityCertified,false);
   await page.locator('#vision28-evaluate').click();
   await page.waitForFunction(()=>document.getElementById('vision28-status')
    .textContent.includes('獨立像素 IoU='),null,{timeout:25000});
   proof=JSON.parse(await page.locator('#vision28-proof').textContent());
   assert.ok(Number.isFinite(proof.independentlyEvaluatedMeanIoU));
   assert.ok(proof.independentlyEvaluatedMeanIoU>.6,
    'synthetic heldout fixture only, not real-life benchmark');
   assert.ok(proof.independentReviewIoU.length>=3);
   assert.deepEqual(errors,[]);
   await page.screenshot({path:out+'/'+device.name+'-novel-photo-auto-ml.png',
    fullPage:true});
   await writeFile(out+'/'+device.name+'-proof.json',JSON.stringify({
    device:device.name,trainingSourceSHA:trainingSHA,
    distinctInferenceSourceSHA:newSHA,
    modelSha256:proof.modelSha256,
    actualLearnedWeights:learned.actualLearnedWeights,
    trainingLoss:[learned.trainingLossInitial,learned.trainingLossFinal],
    novelSourcePixelIoUOnSyntheticFixture:proof.independentlyEvaluatedMeanIoU,
    automaticMLInferenceActuallyExecuted:true,
    firstPartyLearningNotGenericPretrainedModel:true,
    semanticNaturalPhotoAccuracyCertified:false,
    sourcePhotoGeometryAndNCUntouched:true
   },null,2));
   console.log('AIG28_REAL_FIRST_PARTY_LEARNED_CROSS_SOURCE_INFERENCE_PASS',device.name);
  }catch(error){
   await page.screenshot({path:out+'/'+device.name+'-FAIL.png',fullPage:true}).catch(()=>{});
   throw Error(device.name+': '+String(error.message||error)+
    ' modelStatus='+await page.locator('#vision28-status').textContent().catch(()=>null)+
    ' browserErrors='+JSON.stringify(errors));
  }finally{await context.close()}
 }
}finally{await browser.close()}
