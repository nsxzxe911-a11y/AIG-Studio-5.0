/** Real desktop and mobile browser Gate: source-linked measured 2D mm,
 * neutral RGB preview and external semantic label provenance. No fake 1:1 3D.
 */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/aig-real3d-2-6-measure-colour-semantic';
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
  page.setDefaultTimeout(20000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto('http://127.0.0.1:8765/scene-runtime-studio.html');
   await page.waitForFunction(()=>document.getElementById('status')
    ?.textContent.includes('資產索引已就緒'));
   const base64=await page.evaluate(()=>{
    const c=document.createElement('canvas');
    c.width=640;c.height=480;
    const g=c.getContext('2d');
    g.fillStyle='#c0bbb1';g.fillRect(0,0,640,480);
    g.fillStyle='rgb(130,114,99)';g.fillRect(80,80,70,70);
    g.strokeStyle='#202125';g.strokeRect(40,40,400,200);
    return c.toDataURL('image/png').split(',')[1];
   });
   await page.locator('#photo23-source').setInputFiles({
    name:'measured-reference-fixture.png',mimeType:'image/png',
    buffer:Buffer.from(base64,'base64')
   });
   await page.locator('#vision26-load').click();
   await page.waitForFunction(()=>{
    const t=document.getElementById('vision26-status').textContent;
    return t.includes('來源照片 SHA');
   });
   const source=JSON.parse(await page.locator('#vision26-proof').textContent());
   assert.match(source.sourceSha256,/^sha256:[0-9a-f]{64}$/);
   const px=async(x,y)=>page.locator('#vision26-canvas').evaluate((c,{x,y})=>{
    const r=c.getBoundingClientRect();
    c.dispatchEvent(new MouseEvent('click',{
     clientX:r.left+x*r.width/c.width,
     clientY:r.top+y*r.height/c.height,bubbles:true
    }));
   },{x,y});
   await page.locator('#vision26-width-mm').fill('200');
   await page.locator('#vision26-height-mm').fill('100');
   await page.locator('#vision26-check-x').fill('100');
   await page.locator('#vision26-check-y').fill('50');
   for(const p of [[40,40],[440,40],[440,240],[40,240],[240,140]])
    await px(...p);
   await page.locator('#vision26-calibrate').click();
   await page.waitForFunction(()=>document.getElementById('vision26-status')
    .textContent.includes('毫米校正 PASS'));
   const m=JSON.parse(await page.locator('#vision26-proof').textContent()).metric;
   assert.equal(m.calibratedSourcePlaneOnly,true);
   assert.equal(m.hiddenPersonDimensionsMeasured,false);
   assert.equal(m.independentResidualMm,0);
   await page.locator('#vision26-pick').selectOption('query');
   await px(140,90);
   const query=JSON.parse(await page.locator('#vision26-proof').textContent())
    .lastMeasuredSourcePlaneMm;
   assert.ok(Math.abs(query.planeMm[0]-50)<1e-5);
   assert.ok(Math.abs(query.planeMm[1]-25)<1e-5);
   await page.locator('#vision26-pick').selectOption('neutral');
   await px(110,110);
   await page.locator('#vision26-color-run').click();
   await page.waitForFunction(()=>document.getElementById('vision26-status')
    .textContent.includes('線性光'));
   const colour=JSON.parse(await page.locator('#vision26-proof').textContent()).color;
   assert.equal(colour.calibratedDisplayICCVerified,false);
   assert.equal(colour.sourcePixelsPreserved,true);
   const mask={
    width:128,height:128,sourceSha256:source.sourceSha256,
    producer:'MODEL_INFERENCE',
    modelSha256:'sha256:'+'b'.repeat(64),
    humanReviewed:false,
    regions:[{id:1,className:'person',confidence:.96}],
    runs:[[1,128*128]]
   };
   await page.locator('#vision26-label-file').setInputFiles({
    name:'source-mask.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(mask))
   });
   await page.locator('#vision26-label-import').click();
   const semantic=JSON.parse(await page.locator('#vision26-proof').textContent()).semantic;
   assert.equal(semantic.automaticSemanticModelExecutedHere,false);
   assert.equal(semantic.proofStatus,'UNREVIEWED_2D_LABELS_ONLY');
   await page.locator('#vision26-save').click();
   await page.waitForFunction(()=>document.getElementById('vision26-status')
    .textContent.includes('衍生證據已入本機素材庫'));
   assert.deepEqual(errors,[]);
   const proof={
    device:device.name,sourceSha256:source.sourceSha256,
    calibratedPlanarMm:true,notTrueFullBodyDepth:true,
    neutralLinearRGBWithoutSourceMutation:true,
    labelsFromExternalSourceOnly:true,
    originalGLBAndMoviePreserved:true,nativeDeviceFPSNotMeasured:true
   };
   await writeFile(out+'/'+device.name+'-evidence.json',JSON.stringify(proof,null,2));
   await page.screenshot({path:out+'/'+device.name+'-2-6-vision.png',fullPage:true});
   console.log('AIG26_PHONE_DESKTOP_REAL_SOURCE_MEASURED_MM_COLOUR_SEMANTIC_PASS',device.name);
  }catch(error){
   await page.screenshot({path:out+'/'+device.name+'-FAIL.png',fullPage:true}).catch(()=>{});
   throw Error(device.name+': '+String(error.message||error)+
    ' status='+await page.locator('#vision26-status').textContent().catch(()=>null)+
    ' browserErrors='+JSON.stringify(errors));
  }finally{await context.close()}
 }
}finally{await browser.close()}
