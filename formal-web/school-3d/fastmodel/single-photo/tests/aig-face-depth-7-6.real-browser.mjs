/** FastModel 7.6 actual Chromium phone and desktop verified XY -> explicitly
 * estimated Z source depth -> 3D front/profile pixel evidence.
 * Synthetic fixture, NEVER evidence of recovered real human face or native 60FPS.
 */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const folder='artifacts/fastmodel-depth-7-6';await mkdir(folder,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const keys=['leftEye','rightEye','leftBrow','rightBrow','nose','upperLip','lowerLip','mouthLeft','mouthRight','chin'];
const points=[[.405,.349],[.595,.349],[.405,.263],[.595,.263],[.5,.505],[.5,.622],[.5,.676],[.422,.649],[.578,.649],[.5,.809]];
try{
 for(const d of [{name:'phone',viewport:{width:360,height:780},isMobile:true,hasTouch:true},
  {name:'desktop',viewport:{width:1440,height:900}}]){
  const page=await browser.newPage({...d,deviceScaleFactor:1,acceptDownloads:true});
  page.setDefaultTimeout(50000);const errs=[];page.on('pageerror',e=>errs.push(e.message));
  const data=async()=>JSON.parse(await page.locator('#evidence').textContent());
  try{
   await page.goto('http://127.0.0.1:8765/depth-studio.html',{waitUntil:'load'});
   assert.equal(await page.locator('#confirm').isDisabled(),true);
   const png=await page.evaluate(()=>{
    const c=document.createElement('canvas');c.width=96;c.height=96;
    const ctx=c.getContext('2d');ctx.clearRect(0,0,96,96);
    ctx.fillStyle='#aa8066';ctx.fillRect(22,12,52,72);
    ctx.fillStyle='#624838';ctx.fillRect(36,41,7,4);ctx.fillRect(53,41,7,4);
    ctx.fillStyle='#bc5978';ctx.fillRect(42,69,13,5);
    return c.toDataURL('image/png').split(',')[1];
   });
   await page.locator('#source').setInputFiles({
    name:'SYNTHETIC-7-6-FIXTURE-NOT-PERSON.png',mimeType:'image/png',
    buffer:Buffer.from(png,'base64')
   });
   await page.waitForFunction(()=>document.getElementById('status')?.textContent.includes('照片像素已讀取'),null,{timeout:15000});
   for(let i=0;i<keys.length;i++){
    await page.locator('#point').selectOption(keys[i]);
    const coordinate=await page.locator('#photo').evaluate((cv,point)=>{
     const r=cv.getBoundingClientRect(),ratio=Math.min(r.width/cv.width,r.height/cv.height),
      offX=(r.width-cv.width*ratio)/2,offY=(r.height-cv.height*ratio)/2;
     return {x:offX+point[0]*cv.width*ratio,y:offY+point[1]*cv.height*ratio};
    },points[i]);
    await page.locator('#photo').click({position:coordinate});
   }
   assert.equal(await page.locator('#confirm').isDisabled(),true);
   await page.locator('#review').check();await page.locator('#confirm').click();
   await page.waitForFunction(()=>{
    try{const t=JSON.parse(document.getElementById('evidence').textContent);return t.depthZJacobian.passed&&t.facialXYJacobian.passed&&t.render?.rayHits>40;}catch{return false;}
   },null,{timeout:45000});
   const initial=await data();
   assert.equal(Object.keys(initial.marked2DLandmarks).length,10);
   assert.equal(initial.measuredTrueFacialDepth,false);
   assert.equal(initial.depthMode,'SINGLE_PHOTO_UNOBSERVED_Z_PRIOR');
   const prior=await page.locator('#view').evaluate(cv=>cv.toDataURL('image/png'));
   await page.locator('#yaw').evaluate(e=>{e.value='1.25';e.dispatchEvent(new Event('input',{bubbles:true}));});
   await page.waitForFunction(()=>{
    try{return Math.abs(JSON.parse(document.getElementById('evidence').textContent).render.cameraYaw-1.25)<.04;}catch{return false;}
   },null,{timeout:25000});
   const sideBefore=await page.locator('#view').evaluate(cv=>cv.toDataURL('image/png'));
   assert.notEqual(sideBefore,prior);
   await page.locator('#nose-depth').evaluate(e=>{e.value='.066';e.dispatchEvent(new Event('input',{bubbles:true}));});
   await page.waitForFunction(()=>{
    try{const t=JSON.parse(document.getElementById('evidence').textContent);return t.depthSettings.nose===.066&&t.depthZJacobian.passed;}catch{return false;}
   },null,{timeout:25000});
   const sideAfter=await page.locator('#view').evaluate(cv=>cv.toDataURL('image/png'));
   assert.notEqual(sideBefore,sideAfter,'actual XYZ depth change must update rendered camera pixels');
   await page.locator('#yaw').evaluate(e=>{e.value='3.14';e.dispatchEvent(new Event('input',{bubbles:true}));});
   await page.locator('#view').scrollIntoViewIfNeeded();
   await page.waitForFunction(()=>{
    try{const e=JSON.parse(document.getElementById('evidence').textContent).render;return e.estimatedNeutralRearPixels>40&&e.originalFrontPhotoPixels===0&&Math.abs(e.cameraYaw-3.14)<.03;}catch{return false;}
   },null,{timeout:35000});
   const rear=await data();
   assert.equal(rear.hairNeckOcclusionApproved,false);
   assert.equal(rear.realAnatomical3DHeadApproved,false);
   assert.deepEqual(errs,[]);
   await page.screenshot({path:folder+'/'+d.name+'-depth-estimated-XYZ.png'});
   await writeFile(folder+'/'+d.name+'-evidence.json',JSON.stringify({
    device:d.name,syntheticSource:true,actualHumanDepthCertified:false,
    initial,rear,profilePixelChanged:true,noseDepthControlChangedReal3DPixels:true
   },null,2)+'\n');
   console.log('AIG_FASTMODEL_7_6_REVIEWED_XY_ESTIMATED_Z_3D_BROWSER_PASS',d.name,initial.render.rayHits,rear.render.estimatedNeutralRearPixels);
  }catch(e){
   await page.screenshot({path:folder+'/'+d.name+'-FAIL.png'}).catch(()=>{});
   const stat=await page.locator('#status').textContent().catch(()=>null),
    evidence=(await page.locator('#evidence').textContent().catch(()=>''))?.slice(0,3500);
   throw Error(d.name+' '+e.message+' jsErrors='+JSON.stringify(errs)+' status='+stat+' evidence='+evidence);
  }finally{await page.close();}
 }
}finally{await browser.close();}
