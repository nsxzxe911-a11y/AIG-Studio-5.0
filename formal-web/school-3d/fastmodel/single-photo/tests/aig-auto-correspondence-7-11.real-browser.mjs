/** Real Chromium phone & desktop: source-decoded WebM -> automatically
 * detected bidirectional source image matches -> explicit user review ->
 * existing physically calibrated 7.10 XYZ reconstruction and tamper-proof JSON.
 * Synthetic visual test, not real person recovery or automatic camera pose.
 */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const dir='artifacts/fastmodel-auto-correspondence-7-11';await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 for(const device of [
  {name:'phone',viewport:{width:360,height:780},isMobile:true,hasTouch:true},
  {name:'desktop',viewport:{width:1440,height:900}}
 ]){
  const page=await browser.newPage({...device,deviceScaleFactor:1,acceptDownloads:true});
  page.setDefaultTimeout(45000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto('http://127.0.0.1:8765/tracking-studio.html',{waitUntil:'load'});
   assert.equal(await page.locator('#apply-auto').isDisabled(),true);
   // Real WebM generated from a temporally changing camera stream; every
   // unique rasterized texture patch shifts left 18px at second viewpoint.
   const base64=await page.evaluate(async()=>{
    const w=320,h=240,canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
    const ctx=canvas.getContext('2d'),base=document.createElement('canvas');
    base.width=w;base.height=h;const b=base.getContext('2d');
    let seed=1757;
    function rand(){seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;}
    b.fillStyle='#17202c';b.fillRect(0,0,w,h);
    for(let i=0;i<25;i++){
     const x=35+(i%5)*50,y=30+Math.floor(i/5)*43;
     for(let dy=-9;dy<=9;dy++)for(let dx=-9;dx<=9;dx++){
      const v=30+Math.floor(rand()*210);
      b.fillStyle='rgb('+v+','+Math.floor(v*.72)+','+(255-v)+')';
      b.fillRect(x+dx,y+dy,1,1);
     }
    }
    const source=canvas.captureStream(15),parts=[];
    const recorder=new MediaRecorder(source,{
     mimeType:'video/webm;codecs=vp8',videoBitsPerSecond:2600000
    });
    recorder.ondataavailable=e=>{if(e.data.size)parts.push(e.data);};
    const done=new Promise(resolve=>recorder.onstop=()=>resolve(new Blob(parts,{type:'video/webm'})));
    recorder.start();
    for(let i=0;i<57;i++){
     ctx.fillStyle='#17202c';ctx.fillRect(0,0,w,h);
     ctx.drawImage(base,i<26?0:-18,0);
     await new Promise(resolve=>setTimeout(resolve,48));
    }
    recorder.stop();
    const video=await done;source.getTracks().forEach(t=>t.stop());
    return new Promise((resolve,reject)=>{
     const fr=new FileReader();
     fr.onload=()=>resolve(String(fr.result).split(',')[1]);
     fr.onerror=()=>reject(fr.error);
     fr.readAsDataURL(video);
    });
   });
   const buffer=Buffer.from(base64,'base64');
   assert.ok(buffer.length>5000);
   await page.locator('#source').setInputFiles({
    name:'SYNTHETIC-CALIBRATED-7-11-AUTO-FEATURE-VIDEO.webm',
    mimeType:'video/webm',buffer
   });
   await page.waitForFunction(()=>!document.getElementById('capture-a').disabled,null,{timeout:15000});
   await page.locator('#time-a').fill('.15');await page.locator('#time-b').fill('1.80');
   await page.locator('#capture-a').click();
   await page.waitForFunction(()=>document.getElementById('label-a').textContent.includes('來源時刻'));
   await page.locator('#capture-b').click();
   await page.waitForFunction(()=>document.getElementById('label-b').textContent.includes('來源時刻'));
   await page.locator('#max-candidates').selectOption('120');
   await page.locator('#patch-threshold').selectOption('.50');
   await page.locator('#propose').click();
   await page.waitForFunction(()=>Number(document.getElementById('auto-candidates').querySelectorAll('input[type="checkbox"]').length)>=5,
    null,{timeout:16000});
   const proposed=await page.locator('#auto-candidates input[type=checkbox]').count();
   assert.ok(proposed>=5);
   assert.equal(await page.locator('#apply-auto').isDisabled(),true);
   const selects=page.locator('#auto-candidates input[type=checkbox]');
   for(let i=0;i<Math.min(6,proposed);i++)await selects.nth(i).check();
   await page.locator('#focal').fill('240');
   await page.locator('#baseline').fill('60');
   await page.locator('#calibrated').check();
   await page.locator('#rectified').check();
   assert.equal(await page.locator('#apply-auto').isDisabled(),true);
   await page.locator('#review-auto').check();
   assert.equal(await page.locator('#apply-auto').isEnabled(),true);
   await page.locator('#apply-auto').click();
   await page.waitForFunction(()=>{
    try{return JSON.parse(document.getElementById('evidence').textContent).pointCount>=3;}
    catch{return false;}
   },null,{timeout:15000});
   const summary=JSON.parse(await page.locator('#evidence').textContent());
   assert.equal(summary.sparseXYZPointsReal,true);
   assert.equal(summary.framePoseAutomaticallySolved,false);
   assert.equal(summary.dense3DSurfaceOrMeshBuilt,false);
   const down=page.waitForEvent('download');
   await page.locator('#save').click();
   const dl=await down,memory=JSON.parse((await readFile(await dl.path())).toString());
   assert.ok(memory.observations.length>=3);
   assert.equal(memory.sourceVideoPixelsIncluded,false);
   assert.ok(memory.points.every(p=>p.xyzMm[2]>250&&p.xyzMm[2]<2000));
   await page.locator('#clear').click();
   assert.equal(JSON.parse(await page.locator('#evidence').textContent()).status,'NO_CALIBRATED_XYZ_POINTS');
   await page.locator('#restore').setInputFiles({
    name:'same-source-auto-xyz.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(memory))
   });
   await page.waitForFunction(()=>{
    try{return JSON.parse(document.getElementById('evidence').textContent).pointCount>=3;}
    catch{return false;}
   },null,{timeout:12000});
   assert.deepEqual(errors,[]);
   await page.screenshot({path:dir+'/'+device.name+'-source-auto-XYZ.png'});
   await writeFile(dir+'/'+device.name+'-evidence.json',JSON.stringify({
    device:device.name,fixture:'SYNTHETIC_NOT_HUMAN',
    videoActuallyDecoded:true,autoCandidateCount:proposed,
    manuallyReviewedSourceAndCamera:true,
    cameraPoseAutomaticallySolved:false,
    actualDenseCharacterGenerated:false,
    sourcePixelsUploaded:false,summary,
    xyzMm:memory.points.map(p=>({label:p.label,xyz:p.xyzMm}))
   },null,2)+'\n');
   console.log('AIG_FASTMODEL_7_11_AUTO_PIXEL_TRACK_STEREO_XYZ_BROWSER_PASS',
    device.name,proposed,summary.pointCount);
  }catch(e){
   await page.screenshot({path:dir+'/'+device.name+'-FAIL.png'}).catch(()=>{});
   const status=await page.locator('#status').textContent().catch(()=>null),
    proposal=await page.locator('#proposal-status').textContent().catch(()=>null),
    report=(await page.locator('#evidence').textContent().catch(()=>''))?.slice(0,900);
   throw Error(device.name+' '+e.message+' status='+status+' proposal='+proposal+
    ' evidence='+report+' pageerrors='+JSON.stringify(errors));
  }finally{await page.close();}
 }
}finally{await browser.close();}
