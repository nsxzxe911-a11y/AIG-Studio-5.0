/** FastModel 7.8 real phone/desktop Chromium source brush and XYZ articulated pose -> human reviewed
 * hair/neck masks -> connected genuine XYZ occlusion. Synthetic shape only:
 * not authentic girl's face, real hair fibers, skin, or hardware FPS proof.
 */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const folder='artifacts/fastmodel-spatial-7-8';await mkdir(folder,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const keys=['leftEye','rightEye','leftBrow','rightBrow','nose','upperLip','lowerLip','mouthLeft','mouthRight','chin'];
const points=[[.405,.349],[.595,.349],[.405,.263],[.595,.263],[.5,.505],[.5,.622],[.5,.676],[.422,.649],[.578,.649],[.5,.809]];
try{
 for(const device of [
  {name:'phone',viewport:{width:360,height:780},isMobile:true,hasTouch:true},
  {name:'desktop',viewport:{width:1440,height:900}}
 ]){
  const page=await browser.newPage({...device,deviceScaleFactor:1,acceptDownloads:true});
  page.setDefaultTimeout(55000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const evidence=async()=>JSON.parse(await page.locator('#evidence').textContent());
  async function atPhoto(u,v){
   await page.locator('#photo').scrollIntoViewIfNeeded();
   return page.locator('#photo').evaluate((c,[u,v])=>{
    const r=c.getBoundingClientRect(),s=Math.min(r.width/c.width,r.height/c.height),
     ox=(r.width-c.width*s)/2,oy=(r.height-c.height*s)/2;
    return {x:ox+u*c.width*s,y:oy+v*c.height*s};
   },[u,v]);
  }
  async function clickPhoto(u,v){await page.locator('#photo').click({position:await atPhoto(u,v)});}
  async function stroke(y,x0,x1){
   await page.locator('#photo').scrollIntoViewIfNeeded();
   const p0=await atPhoto(x0,y),p1=await atPhoto(x1,y),box=await page.locator('#photo').boundingBox();
   if(!box)throw Error('PHOTO_UNMOUNTED');
   await page.mouse.move(box.x+p0.x,box.y+p0.y);
   await page.mouse.down();
   await page.mouse.move(box.x+p1.x,box.y+p1.y,{steps:20});
   await page.mouse.up();
  }
  try{
   await page.goto('http://127.0.0.1:8765/spatial-studio.html',{waitUntil:'load'});
   assert.equal(await page.locator('#confirm').isDisabled(),true);
   const png=await page.evaluate(()=>{
    const canvas=document.createElement('canvas');canvas.width=96;canvas.height=96;
    const c=canvas.getContext('2d');c.clearRect(0,0,96,96);
    c.fillStyle='#a76b54';c.fillRect(22,12,52,72);
    c.fillStyle='#3a2927';c.fillRect(22,12,52,24);
    c.fillStyle='#cd917e';c.fillRect(40,70,16,14);
    c.fillStyle='#583c38';c.fillRect(35,42,7,4);c.fillRect(54,42,7,4);
    return canvas.toDataURL('image/png').split(',')[1];
   });
   await page.locator('#source').setInputFiles({name:'SYNTHETIC-7-7-HAIR-NECK-NOT-A-PERSON.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
   await page.waitForFunction(()=>document.getElementById('status').textContent.includes('照片像素已讀取'),null,{timeout:15000});
   assert.equal(await page.locator('#paint-mode').inputValue(),'landmark');
   for(let i=0;i<keys.length;i++){
    await page.locator('#point').selectOption(keys[i]);await clickPhoto(...points[i]);
   }
   await page.locator('#review').check();
   await page.locator('#confirm').click();
   await page.waitForFunction(()=>document.getElementById('status').textContent.includes('XYZ 表情 Jacobian'),null,{timeout:15000});
   assert.equal(await page.locator('#apply-layers').isDisabled(),true);
   await page.locator('#paint-mode').selectOption('hair');
   await stroke(.23,.30,.68);
   await page.locator('#paint-mode').selectOption('neck');
   await stroke(.79,.45,.55);
   await page.waitForFunction(()=>document.getElementById('layer-status').textContent.includes('頭髮'),null,{timeout:10000});
   await page.locator('#review-layers').check();
   assert.equal(await page.locator('#apply-layers').isEnabled(),true);
   await page.locator('#apply-layers').click();
   await page.waitForFunction(()=>{
    try{const o=JSON.parse(document.getElementById('evidence').textContent);
     return o.quality.passed&&o.quality.parent7_7Passed&&o.render?.rayHits>40;
    }catch{return false;}
   },null,{timeout:55000});
   const initial=await evidence();
   assert.equal(initial.reviewedHairNeckMasks,true);
   assert.ok(initial.userMarkedHairPixels>12);
   assert.ok(initial.userMarkedNeckPixels>12);
   assert.equal(initial.quality.foldSamples,0);
   assert.equal(initial.quality.nonConvergedSamples,0);
   assert.equal(initial.quality.collisionDetected,false);
   assert.equal(initial.neckJointAnatomyVerified,false);
   await page.locator('#view').scrollIntoViewIfNeeded();
   const basePixels=await page.locator('#view').evaluate(c=>c.toDataURL('image/png'));
   await page.locator('#head-yaw').evaluate(el=>{el.value='.24';el.dispatchEvent(new Event('input',{bubbles:true}));});
   await page.waitForFunction(()=>{
    try{const e=JSON.parse(document.getElementById('evidence').textContent);
     return Math.abs(e.spatialPose.yaw-.24)<.01&&e.quality.passed&&Math.abs(e.render.headYaw-.24)<.01;
    }catch{return false;}
   },null,{timeout:42000});
   const changedPixels=await page.locator('#view').evaluate(c=>c.toDataURL('image/png'));
   assert.notEqual(changedPixels,basePixels,'head yaw MUST move actual 3D geometry at constant camera angle');
   await page.locator('#head-pitch').evaluate(el=>{el.value='.14';el.dispatchEvent(new Event('input',{bubbles:true}));});
   await page.waitForFunction(()=>{
    try{const e=JSON.parse(document.getElementById('evidence').textContent);
     return Math.abs(e.spatialPose.pitch-.14)<.01&&e.quality.passed&&Math.abs(e.render.headPitch-.14)<.01;
    }catch{return false;}
   },null,{timeout:42000});
   const afterPitch=await page.locator('#view').evaluate(c=>c.toDataURL('image/png'));
   assert.notEqual(afterPitch,changedPixels,'head pitch MUST move spatial 3D geometry');
   await page.locator('#yaw').evaluate(el=>{el.value='3.14';el.dispatchEvent(new Event('input',{bubbles:true}));});
   await page.locator('#view').scrollIntoViewIfNeeded();
   await page.waitForFunction(()=>{
    try{const o=JSON.parse(document.getElementById('evidence').textContent).render;
      return Math.abs(o.cameraYaw-3.14)<.04&&o.unseenRearPixels>40&&o.frontSourcePixels===0;
    }catch{return false;}
   },null,{timeout:45000});
   const rear=await evidence();assert.equal(rear.referenceCharacterVisuallyApproved,false);
   assert.equal(rear.trueHairStrandCollisionVerified,false);
   assert.deepEqual(errors,[]);
   await page.screenshot({path:folder+'/'+device.name+'-real-xyz-head-turn.png'});
   await writeFile(folder+'/'+device.name+'-evidence.json',JSON.stringify({
    fixture:'SYNTHETIC_NOT_REAL_HUMAN',phoneOrDesktop:device.name,
    initial,rear,trueHairsApproved:false,nativeFPSVerified:false,spatialHeadRotatedWhileCameraStill:true
   },null,2)+'\n');
   console.log('AIG_FASTMODEL_7_8_SPATIAL_HEAD_XYZ_NECK_BROWSER_PASS',device.name,initial.userMarkedHairPixels,initial.userMarkedNeckPixels);
  }catch(e){
   await page.screenshot({path:folder+'/'+device.name+'-FAIL.png'}).catch(()=>{});
   const stat=await page.locator('#status').textContent().catch(()=>null),
    ev=(await page.locator('#evidence').textContent().catch(()=>''))?.slice(0,3000);
   throw Error(device.name+' '+e.message+' status='+stat+' jsErrors='+JSON.stringify(errors)+' evidence='+ev);
  }finally{await page.close();}
 }
}finally{await browser.close();}
