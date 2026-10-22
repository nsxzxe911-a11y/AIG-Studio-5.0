/** Real phone/desktop Chromium: decode a LOCAL video, seek source A and B,
 * click corresponding pixels and physically triangulate calibrated sparse XYZ.
 * Fixture is synthetic. No claim of automated video camera tracking, dense
 * surface reconstruction, real heroine identity or native GPU performance.
 */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const folder='artifacts/fastmodel-multiview-7-10';await mkdir(folder,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 for(const device of [
  {name:'phone',viewport:{width:360,height:780},isMobile:true,hasTouch:true},
  {name:'desktop',viewport:{width:1440,height:900}}
 ]){
  const page=await browser.newPage({...device,deviceScaleFactor:1,acceptDownloads:true});
  page.setDefaultTimeout(45000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const point=async(which,x,y)=>{
   const c=page.locator('#frame-'+which);
   await c.scrollIntoViewIfNeeded();
   const at=await c.evaluate((el,p)=>{
    const r=el.getBoundingClientRect();
    return {x:p[0]*r.width/el.width,y:p[1]*r.height/el.height};
   },[x,y]);
   await c.click({position:at});
  };
  try{
   await page.goto('http://127.0.0.1:8765/multiview-studio.html',{waitUntil:'load'});
   assert.equal(await page.locator('#add').isDisabled(),true);
   const base64=await page.evaluate(async()=>{
    const c=document.createElement('canvas');c.width=320;c.height=240;
    const ctx=c.getContext('2d'),src=c.captureStream(15),parts=[];
    const media=new MediaRecorder(src,{mimeType:'video/webm;codecs=vp8',
      videoBitsPerSecond:600000});
    media.ondataavailable=e=>{if(e.data.size)parts.push(e.data);};
    const done=new Promise(resolve=>media.onstop=()=>resolve(new Blob(parts,{type:'video/webm'})));
    media.start();
    for(let i=0;i<50;i++){
     ctx.fillStyle='#030f1d';ctx.fillRect(0,0,320,240);
     for(let y=0;y<12;y++)for(let x=0;x<16;x++){
      ctx.fillStyle=((x+y+Math.floor(i/10))%2)?'#7a96a8':'#f3df91';
      ctx.fillRect(x*20,y*20,20,20);
     }
     ctx.fillStyle='#df7596';ctx.beginPath();
     ctx.arc(i<25?178:148,120,13,0,Math.PI*2);ctx.fill();
     await new Promise(resolve=>setTimeout(resolve,52));
    }
    media.stop();const blob=await done;src.getTracks().forEach(t=>t.stop());
    return new Promise((resolve,reject)=>{
     const f=new FileReader();f.onload=()=>resolve(String(f.result).split(',')[1]);
     f.onerror=()=>reject(f.error);f.readAsDataURL(blob);
    });
   });
   const video=Buffer.from(base64,'base64');
   assert.ok(video.length>2000);
   await page.locator('#source').setInputFiles({
    name:'SYNTHETIC-RECTIFIED-TWO-CAMERA-FIXTURE.webm',
    mimeType:'video/webm',buffer:video
   });
   await page.waitForFunction(()=>!document.getElementById('capture-a').disabled&&
    document.getElementById('video').videoWidth===320,null,{timeout:18000});
   await page.locator('#time-a').fill('.15');
   await page.locator('#time-b').fill('1.50');
   await page.locator('#capture-a').click();
   await page.waitForFunction(()=>document.getElementById('label-a').textContent.includes('來源時刻'),
    null,{timeout:20000});
   await page.locator('#capture-b').click();
   await page.waitForFunction(()=>document.getElementById('label-b').textContent.includes('來源時刻'),
    null,{timeout:20000});
   assert.equal(await page.locator('#add').isDisabled(),true);
   await page.locator('#focal').fill('240');
   await page.locator('#baseline').fill('60');
   await page.locator('#calibrated').check();
   await page.locator('#rectified').check();
   await page.locator('#feature').fill('nose');
   await point('a',180,120);await point('b',150,120);
   assert.equal(await page.locator('#add').isEnabled(),true);
   await page.locator('#add').click();
   await page.waitForFunction(()=>{
    const v=JSON.parse(document.getElementById('evidence').textContent);
    return v.pointCount===1&&v.observationCount===1;
   });
   let stat=JSON.parse(await page.locator('#evidence').textContent());
   assert.equal(stat.framePoseAutomaticallySolved,false);
   assert.equal(stat.fusedWithFastModel78SDF,false);
   assert.equal(stat.dense3DSurfaceOrMeshBuilt,false);
   assert.equal(stat.sparseXYZPointsReal,true);
   await page.locator('#feature').fill('leftEye');
   await point('a',190,100);await point('b',160,100);
   await page.locator('#add').click();
   await page.waitForFunction(()=>JSON.parse(document.getElementById('evidence').textContent).pointCount===2);
   // Negative parallax must be BLOCKED without increasing model revision.
   await page.locator('#feature').fill('bad');
   await point('a',90,110);await point('b',140,110);
   await page.locator('#add').click();
   assert.match(await page.locator('#status').textContent(),/BLOCKED/);
   assert.equal(JSON.parse(await page.locator('#evidence').textContent()).pointCount,2);
   const dl=page.waitForEvent('download');
   await page.locator('#save').click();
   const output=await dl,memo=JSON.parse((await readFile(await output.path())).toString());
   assert.equal(memo.points.length,2);
   assert.equal(memo.observations.length,2);
   assert.equal(memo.sourceVideoPixelsIncluded,false);
   assert.ok(memo.calibration.sourceId.startsWith('sha256:'));
   const z=memo.points.find(p=>p.label==='nose').xyzMm[2];
   assert.ok(z>300&&z<1000);
   await page.locator('#clear').click();
   assert.equal(JSON.parse(await page.locator('#evidence').textContent()).status,'NO_CALIBRATED_XYZ_POINTS');
   await page.locator('#restore').setInputFiles({
    name:'source-verified-3d-reconstruction.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(memo))
   });
   await page.waitForFunction(()=>JSON.parse(document.getElementById('evidence').textContent).pointCount===2);
   stat=JSON.parse(await page.locator('#evidence').textContent());
   assert.equal(stat.pointCount,2);
   assert.equal(stat.trueHumanAnatomyVerified,false);
   assert.deepEqual(errors,[]);
   await page.screenshot({path:folder+'/'+device.name+'-calibrated-video-xyz.png'});
   await writeFile(folder+'/'+device.name+'-evidence.json',JSON.stringify({
    device:device.name,syntheticFixture:true,videoActuallyDecoded:true,
    correspondenceUserClicked:true,calibrationProvidedByTest:true,
    measuredTrueHumanCameraRig:false,threeDPointsReprojectedFromSource:true,
    fullCharacterModelRecovered:false,xyzMm:memo.points.map(p=>({label:p.label,xyz:p.xyzMm})),
    summary:stat
   },null,2)+'\n');
   console.log('AIG_FASTMODEL_7_10_SOURCE_VIDEO_STEREO_3D_BROWSER_PASS',device.name,
    stat.pointCount,z.toFixed(3));
  }catch(e){
   await page.screenshot({path:folder+'/'+device.name+'-FAIL.png'}).catch(()=>{});
   const status=await page.locator('#status').textContent().catch(()=>null);
   const labels=await Promise.all(['a','b'].map(x=>page.locator('#label-'+x).textContent().catch(()=>null)));
   const stat=(await page.locator('#evidence').textContent().catch(()=>''))?.slice(0,1200);
   throw Error(device.name+' '+e.message+' status='+status+' labels='+JSON.stringify(labels)+
    ' evidence='+stat+' pageerrors='+JSON.stringify(errors));
  }finally{await page.close();}
 }
}finally{await browser.close();}
