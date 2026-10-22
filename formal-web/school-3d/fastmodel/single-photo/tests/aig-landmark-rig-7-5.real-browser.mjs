/** Real Chromium phone/desktop synthetic photo -> 10 manual XY clicks ->
 * explicit review -> real 3D SDF geometric morph and safe no-rear-photo.
 * Synthetic data cannot certify actual user heroine likeness or true facial anatomy.
 */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/fastmodel-landmarks-7-5';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const keys=['leftEye','rightEye','leftBrow','rightBrow','nose','upperLip','lowerLip','mouthLeft','mouthRight','chin'];
const points=[[.405,.349],[.595,.349],[.405,.263],[.595,.263],[.5,.505],[.5,.622],[.5,.676],[.422,.649],[.578,.649],[.5,.809]];
try{
 for(const device of [
  {name:'phone',viewport:{width:360,height:780},isMobile:true,hasTouch:true},
  {name:'desktop',viewport:{width:1440,height:900}}
 ]){
  const page=await browser.newPage({...device,deviceScaleFactor:1,acceptDownloads:true});
  page.setDefaultTimeout(45000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const report=async()=>JSON.parse(await page.locator('#evidence').textContent());
  try{
   await page.goto('http://127.0.0.1:8765/landmark-studio.html',{waitUntil:'load'});
   assert.equal(await page.locator('#confirm').isDisabled(),true);
   const base64=await page.evaluate(()=>{
    const c=document.createElement('canvas');c.width=96;c.height=96;
    const ctx=c.getContext('2d');ctx.clearRect(0,0,96,96);
    ctx.fillStyle='#af816a';ctx.fillRect(22,12,52,72);
    ctx.fillStyle='#755247';ctx.fillRect(36,41,7,4);ctx.fillRect(53,41,7,4);
    ctx.fillStyle='#ad4c68';ctx.fillRect(42,69,13,5);
    return c.toDataURL('image/png').split(',')[1];
   });
   await page.locator('#source').setInputFiles({
    name:'SYNTHETIC-IMAGE-USER-REVIEW-FIXTURE-NOT-A-PERSON.png',mimeType:'image/png',
    buffer:Buffer.from(base64,'base64')
   });
   await page.waitForFunction(()=>document.getElementById('status')?.textContent.includes('照片像素已讀取'),null,{timeout:15000});
   for(let i=0;i<keys.length;i++){
    await page.locator('#point').selectOption(keys[i]);
    const xy=await page.locator('#photo').evaluate((canvas,p)=>{
     const r=canvas.getBoundingClientRect(),scale=Math.min(r.width/canvas.width,r.height/canvas.height);
     const ox=(r.width-canvas.width*scale)/2,oy=(r.height-canvas.height*scale)/2;
     return {x:ox+p[0]*canvas.width*scale,y:oy+p[1]*canvas.height*scale};
    },points[i]);
    await page.locator('#photo').click({position:xy});
   }
   assert.equal(await page.locator('#confirm').isDisabled(),true);
   await page.locator('#review').check();
   assert.equal(await page.locator('#confirm').isEnabled(),true);
   await page.locator('#confirm').click();
   console.log('AIG75_CONFIRM_DIAGNOSTIC',device.name,await page.locator('#status').textContent(),await page.locator('#evidence').textContent());
   await page.waitForFunction(()=>{
    try{const p=JSON.parse(document.getElementById('evidence').textContent);return p.quality.passed&&p.render?.rayHits>65;}
    catch{return false;}
   },null,{timeout:45000});
   const atRest=await report();
   assert.equal(Object.keys(atRest.marked2DLandmarks).length,10);
   assert.equal(atRest.origin,'USER_CLICKED_2D_NOT_AUTOMATIC_FACE_RECOGNITION');
   assert.equal(atRest.quality.foldOrInversionSamples,0);
   assert.equal(atRest.actualOnlineGameServer,false);
   const before=await page.locator('#view').evaluate(c=>c.toDataURL());
   await page.locator('#jawOpen').evaluate(el=>{el.value='1';el.dispatchEvent(new Event('input',{bubbles:true}));});
   await page.waitForFunction(()=>{
    try{const p=JSON.parse(document.getElementById('evidence').textContent);return p.expression.jawOpen===1&&p.quality.maxDisplacement>.002;}
    catch{return false;}
   },null,{timeout:45000});
   const after=await page.locator('#view').evaluate(c=>c.toDataURL());
   assert.notEqual(after,before,'real XYZ facial geometry changes rendered pixels');
   await page.locator('#yaw').evaluate(el=>{el.value='3.14';el.dispatchEvent(new Event('input',{bubbles:true}));});
   await page.locator('#view').scrollIntoViewIfNeeded();
   await page.waitForFunction(()=>{
    try{const r=JSON.parse(document.getElementById('evidence').textContent).render;return Math.abs(r.cameraYaw-3.14)<.02&&r.estimatedNeutralRearPixels>70&&r.originalFrontPhotoPixels===0;}
    catch{return false;}
   },null,{timeout:45000,polling:200});
   const rear=await report();
   assert.equal(rear.hairNeckLikenessVerified,false);
   assert.equal(rear.nativeAndroidWindowsVerified,false);
   assert.deepEqual(errors,[]);
   await page.screenshot({path:out+'/'+device.name+'-user-marked-3d-rig.png'});
   await writeFile(out+'/'+device.name+'-evidence.json',JSON.stringify({
    device:device.name,fixture:'SYNTHETIC_RGBA_NOT_REAL_FACE',manualPoints:true,atRest,rear,
    actualHuman3DFaceApproved:false,realMMOOnline:false
   },null,2)+'\n');
   console.log('AIG_FASTMODEL_7_5_MANUAL_LANDMARK_3D_FACE_JACOBIAN_BROWSER_PASS',device.name,atRest.render.rayHits,rear.render.estimatedNeutralRearPixels);
  }catch(e){
   await page.screenshot({path:out+'/'+device.name+'-FAIL.png'}).catch(()=>{});
   const diag={status:await page.locator('#status').textContent().catch(()=>null),evidence:(await page.locator('#evidence').textContent().catch(()=>''))?.slice(0,2500),marked:await page.locator('#point-status').textContent().catch(()=>null)};
   throw Error(device.name+' '+e.message+' jsErrors='+JSON.stringify(errors)+' diagnostic='+JSON.stringify(diag));
  }finally{await page.close();}
 }
}finally{await browser.close();}
