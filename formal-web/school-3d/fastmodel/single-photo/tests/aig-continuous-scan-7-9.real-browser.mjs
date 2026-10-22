/** Real Chromium phone + desktop local video decode/continuous frame scanning
 * and fake-permission real getUserMedia media-device API, no remote uploads.
 * Synthetic video does NOT prove 3D learning or original heroine fidelity.
 */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const dir='artifacts/fastmodel-continuous-7-9';await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 '--no-sandbox','--disable-dev-shm-usage',
 '--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream'
]});
try{
 for(const spec of [
  {name:'phone',viewport:{width:360,height:780},isMobile:true,hasTouch:true},
  {name:'desktop',viewport:{width:1440,height:900}}
 ]){
  const page=await browser.newPage({...spec,deviceScaleFactor:1,acceptDownloads:true});
  page.setDefaultTimeout(36000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const numeric=async id=>Number(await page.locator('#'+id).textContent());
  try{
   await page.goto('http://127.0.0.1:8765/continuous-studio.html',{waitUntil:'load'});
   await page.context().grantPermissions(['camera'],{origin:'http://127.0.0.1:8765'});
   assert.equal(await page.locator('#video-start').isDisabled(),true);
   assert.equal(await page.locator('#camera-start').isEnabled(),true);
   // Generate a local, DECODABLE WebM through MediaRecorder; do not mock scan.
   const base64=await page.evaluate(async()=>{
    const cv=document.createElement('canvas');cv.width=96;cv.height=96;
    const ctx=cv.getContext('2d'),stream=cv.captureStream(15),bits=[];
    const recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8',
     videoBitsPerSecond:400000});
    recorder.ondataavailable=e=>{if(e.data.size)bits.push(e.data);};
    const completed=new Promise(resolve=>recorder.onstop=()=>resolve(new Blob(bits,{type:'video/webm'})));
    recorder.start();
    for(let i=0;i<34;i++){
     ctx.fillStyle='#04090d';ctx.fillRect(0,0,96,96);
     for(let y=0;y<8;y++)for(let x=0;x<8;x++){
      ctx.fillStyle=((x+y+Math.floor(i/3))%2===0)?'#f2e1a9':'#193e59';
      ctx.fillRect(x*12,y*12,12,12);
     }
     ctx.fillStyle='#f2bc77';ctx.fillRect((i*3)%58+8,23,30,38);
     await new Promise(r=>setTimeout(r,58));
    }
    recorder.stop();
    const blob=await completed;
    stream.getTracks().forEach(t=>t.stop());
    return new Promise((resolve,reject)=>{
     const reader=new FileReader();
     reader.onload=()=>resolve(String(reader.result).split(',')[1]);
     reader.onerror=()=>reject(reader.error);
     reader.readAsDataURL(blob);
    });
   });
   const sourceBuffer=Buffer.from(base64,'base64');
   assert.ok(sourceBuffer.length>1200);
   await page.locator('#file').setInputFiles({
    name:'LOCAL-SYNTHETIC-CONTINUOUS-VIDEO-TEST.webm',
    mimeType:'video/webm',buffer:sourceBuffer});
   await page.waitForFunction(()=>!document.getElementById('video-start').disabled,null,{timeout:15000});
   await page.locator('#video-start').click();
   await page.waitForFunction(()=>Number(document.getElementById('seen').textContent)>=3,null,{timeout:30000});
   await page.waitForFunction(()=>Number(document.getElementById('accepted').textContent)>=1,null,{timeout:30000});
   await page.waitForFunction(()=>{
    const evidence=JSON.parse(document.getElementById('evidence').textContent);
    return evidence.state==='stopped'||evidence.framesSeen>=10;
   },null,{timeout:35000});
   const before=JSON.parse(await page.locator('#evidence').textContent());
   assert.ok(before.framesSeen>=3);
   assert.ok(before.framesAccepted>=1);
   assert.equal(before.cameraPoseSolvedAutomatically,false);
   assert.equal(before.full3DHeadRecovered,false);
   assert.equal(before.offlineNoUpload,true);
   if(before.state==='scanning'){
    await page.locator('#pause').click();
    const paused=JSON.parse(await page.locator('#evidence').textContent());
    assert.equal(paused.state,'paused');
    await page.locator('#pause').click();
   }
   // Retain checkpoint proof by explicit local JSON download.
   await page.waitForFunction(()=>!document.getElementById('save').disabled);
   const down=page.waitForEvent('download');
   await page.locator('#save').click();
   const file=await down,buf=await readFile(await file.path()),memo=JSON.parse(buf.toString('utf8'));
   assert.ok(memo.keyframes.length>=1);
   assert.ok(memo.sourceId?.startsWith('sha256:'));
   assert.equal(memo.originalVideoFramesSaved,false);
   assert.equal(memo.actual3DModelLearned,false);
   assert.ok(!JSON.stringify(memo).includes('"data"'));
   if(await page.locator('#stop').isEnabled())await page.locator('#stop').click();
   await page.locator('#load').setInputFiles({
    name:'same-video-memory.json',mimeType:'application/json',buffer:buf});
   await page.waitForFunction(()=>{
    try{const s=JSON.parse(document.getElementById('evidence').textContent);
     return s.state==='paused'&&s.cacheSize>=1;}catch{return false;}
   },null,{timeout:12000});
   const restored=JSON.parse(await page.locator('#evidence').textContent());
   assert.equal(restored.cameraPoseSolvedAutomatically,false);
   // Real browser media device path, with Chromium synthetic camera fixture.
   await page.locator('#camera-start').click();
   await page.waitForFunction(()=>{
    const v=document.getElementById('video');
    return v.srcObject instanceof MediaStream&&
     v.srcObject.getVideoTracks().some(t=>t.readyState==='live');
   },null,{timeout:15000});
   await page.waitForFunction(()=>Number(document.getElementById('seen').textContent)>=3,null,{timeout:24000});
   const camera=JSON.parse(await page.locator('#evidence').textContent());
   assert.equal(camera.mode,'camera');
   assert.equal(camera.cameraPoseSolvedAutomatically,false);
   await page.locator('#stop').click();
   const privacy=await page.locator('#video').evaluate(v=>!v.srcObject||
    v.srcObject.getTracks().every(t=>t.readyState==='ended'));
   assert.equal(privacy,true);
   assert.deepEqual(errors,[]);
   await page.screenshot({path:dir+'/'+spec.name+'-video-camera-scan.png'});
   await writeFile(dir+'/'+spec.name+'-scan-evidence.json',JSON.stringify({
    device:spec.name,actualDecodedLocalVideo:true,actualGetUserMediaAPI:true,
    syntheticFixtureOnly:true,before,restored,camera,
    sourceVideoUploaded:false,trueMultiView3DReconstructionVerified:false
   },null,2)+'\n');
   console.log('AIG_FASTMODEL_7_9_VIDEO_CAMERA_CONTINUOUS_KEYFRAME_BROWSER_PASS',
    spec.name,before.framesSeen,before.framesAccepted,camera.framesSeen);
  }catch(error){
   await page.screenshot({path:dir+'/'+spec.name+'-FAIL.png'}).catch(()=>{});
   const status=await page.locator('#status').textContent().catch(()=>null),
    evidence=(await page.locator('#evidence').textContent().catch(()=>null))?.slice(0,3000);
   throw Error(spec.name+' '+error.message+' status='+status+' evidence='+evidence+
    ' pageerrors='+JSON.stringify(errors));
  }finally{await page.close();}
 }
}finally{await browser.close();}
