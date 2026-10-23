import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const dest='artifacts/aig-stage1-adult-male-female-swim-geometry';
await mkdir(dest,{recursive:true});
const hash=buf=>createHash('sha256').update(buf).digest('hex');
const views=['front','profile','rear','quarter45'];
const devices=[
 {name:'phone',viewport:{width:390,height:844},mobile:true},
 {name:'desktop',viewport:{width:1440,height:900},mobile:false}
];
const browser=await chromium.launch({headless:true,args:[
 '--enable-webgl','--use-gl=angle','--use-angle=swiftshader',
 '--disable-web-security','--no-sandbox'
]});
let failure=false;
try{
 for(const device of devices){
  const context=await browser.newContext({
   viewport:device.viewport,isMobile:device.mobile,
   deviceScaleFactor:1,hasTouch:device.mobile
  });
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const output=[];
  try{
   await page.goto('http://127.0.0.1:8765/scene-runtime-studio.html',
    {waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>/已就緒/.test(
    document.getElementById('status')?.textContent??''),null,{timeout:30000});
   for(const gender of ['male','female']){
    await page.locator('#stage1-gender').selectOption(gender);
    await page.locator('#stage1-start').dispatchEvent('click');
    await page.waitForFunction(g=>{
     const proof=JSON.parse(document.getElementById('stage1-proof').textContent);
     return proof.activeSceneRendered===true&&proof.modelGender===g&&
      proof.submittedFrameCount>=2;
    },gender,{timeout:25000});
    const state=JSON.parse(await page.locator('#stage1-proof').textContent());
    assert.equal(state.actualStage1SourceSchema,
     'AIG_STAGE1_ADULT_MALE_FEMALE_ANATOMY_V1');
    assert.equal(state.sharedExistingWebGLRenderer,true);
    assert.equal(state.automaticGeometryGate,true);
    assert.equal(state.realAnatomicalJointCount,21);
    assert.ok(state.realTriangleCount>4800);
    assert.equal(state.noHairOrSchoolClothing,true);
    assert.equal(state.fullSkinnedBlendWeightsVerified,false);
    assert.equal(state.stage1PASS,false);
    assert.equal(state.garmentType,
     gender==='male'?'fitted-briefs':'fitted-one-piece');
    let seen=new Set();
    for(const view of views){
     await page.locator('#stage1-'+view).dispatchEvent('click');
     await page.waitForFunction(v=>JSON.parse(
      document.getElementById('stage1-proof').textContent
     ).currentCameraView===v,view);
     // Real frame after camera settles: screenshot ONLY existing WebGL.
     await page.evaluate(()=>new Promise(resolve=>
      requestAnimationFrame(()=>requestAnimationFrame(resolve))));
     const png=await page.locator('#viewport').screenshot({
      animations:'disabled',timeout:16000
     });
     assert.ok(png.byteLength>7000,'unexpected blank screenshot');
     const sha=hash(png);
     assert.equal(seen.has(sha),false,
      'REAL CAMERA VIEWS REPEATED: '+gender+' '+view);
     seen.add(sha);
     const name=device.name+'-'+gender+'-'+view+'-ACTUAL-WEBGL.png';
     await writeFile(dest+'/'+name,png);
     output.push({gender,view,name,sha256:sha,
      byteLength:png.length});
    }
    assert.equal(seen.size,4);
    await page.locator('#stage1-capture').dispatchEvent('click');
    await page.waitForFunction(g=>
     document.querySelectorAll('[data-stage1-gallery-gender="'+g+'"] img').length===4,
     gender,{timeout:25000});
    assert.equal(await page.locator('[data-stage1-gallery-gender="'+gender+'"] img').count(),4);
   }
   await page.locator('#stage1-close').dispatchEvent('click');
   await page.waitForFunction(()=>JSON.parse(
    document.getElementById('stage1-proof').textContent
   ).activeSceneRendered===false);
   const manifest={
    schema:'AIG_STAGE1_ADULT_MALE_FEMALE_TRUE_WEBGL_8_VIEWS',
    device:device.name,
    sourceType:'PARAMETRIC_ADULT_ANATOMY_TECHNICAL_REFERENCE',
    falseClaimsRejected:['approved female heroine','real human scan',
     'fully skin-weighted animation','no remaining intersections'],
    twoIndependentModelProfiles:true,
    maleGarment:'fitted-briefs',femaleGarment:'fitted-one-piece',
    originalGLBSourcePreserved:true,
    trueWebGLCanvasSnapshots:output,
    userVisualReviewPassed:false,
    stage1FinalPASS:false
   };
   assert.equal(output.length,8);
   await writeFile(dest+'/'+device.name+'-STAGE1-MANIFEST.json',
    JSON.stringify(manifest,null,2));
   console.log('AIG_STAGE1_EIGHT_REAL_SNAPSHOTS',device.name,
    output.map(x=>x.gender+':'+x.view+':'+x.sha256.slice(0,8)).join(' '));
  }catch(e){
   failure=true;
   await page.screenshot({path:dest+'/'+device.name+'-FAIL-PAGE.png',
    fullPage:true,timeout:20000}).catch(()=>{});
   console.error('AIG_STAGE1_FAIL',device.name,String(e.stack||e));
  }finally{
   await context.close();
  }
  if(errors.length){
   console.error('PAGE_ERRORS',device.name,errors.slice(0,8));
   failure=true;
  }
 }
}finally{await browser.close()}
if(failure)process.exitCode=1;
