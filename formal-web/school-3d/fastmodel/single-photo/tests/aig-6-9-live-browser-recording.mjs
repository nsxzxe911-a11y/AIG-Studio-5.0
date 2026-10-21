/**
 * FastModel 6.9: REAL Chromium UI / encoded video smoke QA.
 * Synthetic source PNG and synthesized test WAV are never user heroine proof.
 * Invoked only by the separate browser-video workflow, not the Source Gate.
 */
import {chromium} from 'playwright';
import {spawnSync} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
const base=process.env.AIG69_BASE_URL||'http://127.0.0.1:8765/dist/index.html';
const out=path.resolve(process.env.AIG69_OUTPUT||'artifacts/fastmodel-6-9-browser-SYNTHETIC-NOT-APPROVED');
await mkdir(out,{recursive:true});
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const wav=(seconds=2,sampleRate=16000)=>{
 const count=Math.round(seconds*sampleRate);
 const b=Buffer.alloc(44+count*2);
 b.write('RIFF',0);b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);
 b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);
 b.writeUInt32LE(sampleRate,24);b.writeUInt32LE(sampleRate*2,28);
 b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);
 b.write('data',36);b.writeUInt32LE(count*2,40);
 for(let i=0;i<count;i++){
  const t=i/sampleRate;
  const env=t<.2||t>seconds-.2?0:(.24+.18*Math.sin(t*2*Math.PI)**2);
  b.writeInt16LE(Math.round(22000*env*Math.sin(t*2*Math.PI*220)),44+i*2);
 }
 return b;
};
const safeJSON=async filename=>JSON.parse(await readFile(path.join(out,filename),'utf8'));
const fail=(code,details)=>{throw Error(code+': '+JSON.stringify(details||{}));};
let browser,stage='BOOT',report={schema:'AIG_FASTMODEL_6_9_CHROMIUM_ACTUAL_CAPTURE_QA',
 srcType:'SYNTHETIC_CANVAS_PNG_AND_SYNTHESIZED_WAV_NOT_APPROVED_HEROINE',
 actualUserHeroineGLB:false,actualHeroineMovie:false,
 actualHumanInspectionPassed:false,formalReleaseAllowed:false,
 nativeAndroidWindowsFPSVerified:false};
const log=[];
try{
 browser=await chromium.launch({headless:true,args:[
  '--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required'
 ]});
 const context=await browser.newContext({viewport:{width:1440,height:900},
  acceptDownloads:true,permissions:[]});
 const page=await context.newPage();
 page.on('pageerror',e=>log.push('PAGE_ERROR: '+e.message));
 page.on('console',m=>{if(m.type()==='error')log.push('CONSOLE_ERROR: '+m.text().slice(0,240));});
 stage='LOAD_REAL_FASTMODEL_UI';
 await page.goto(base,{waitUntil:'domcontentloaded',timeout:30000});
 await page.locator('#aig65-build').waitFor({state:'visible',timeout:12000});
 for(const id of ['aig65-image','aig67-voice','aig65-build','aig65-record',
  'aig68-review','aig65-video'])if(await page.locator('#'+id).count()!==1)
  fail('AIG69_RGB_UI_MISSING',id);
 // The source test picture is a freshly generated local synthetic silhouette,
 // not a stored or user-approved character asset.
 const pngB64=await page.evaluate(()=>{
  const c=document.createElement('canvas');c.width=480;c.height=640;
  const x=c.getContext('2d');
  x.fillStyle='#e3f3f6';x.fillRect(0,0,480,640);
  x.fillStyle='#273753';
  x.beginPath();x.ellipse(240,150,65,75,0,0,Math.PI*2);x.fill();
  x.fillRect(188,219,104,95);
  x.beginPath();x.moveTo(240,275);x.lineTo(120,525);
  x.lineTo(360,525);x.closePath();x.fill();
  x.fillStyle='#f3d2bf';x.fillRect(199,110,82,100);
  x.fillStyle='#364558';x.fillRect(208,150,12,7);x.fillRect(259,150,12,7);
  x.fillRect(225,187,30,5);
  return c.toDataURL('image/png').split(',')[1];
 });
 const png=Buffer.from(pngB64,'base64'),audio=wav(2);
 await writeFile(path.join(out,'SOURCE-SYNTHETIC-NOT-HEROINE.png'),png);
 await writeFile(path.join(out,'TEST-TONE-NOT-HUMAN-VOICE.wav'),audio);
 report.sourcePhotoSHA256=sha(png);report.sourceWavSHA256=sha(audio);
 stage='BUILD_REAL_2D_RGB_UI';
 await page.locator('#aig65-image').setInputFiles({
  name:'SOURCE-SYNTHETIC-NOT-HEROINE.png',mimeType:'image/png',buffer:png});
 await page.locator('#aig67-voice').setInputFiles({
  name:'TEST-TONE-NOT-HUMAN-VOICE.wav',mimeType:'audio/wav',buffer:audio});
 await page.locator('#aig65-story').fill('她轉頭，微笑。');
 await page.locator('#aig65-mode').selectOption('2D');
 await page.locator('#aig65-duration').fill('2.5');
 await page.locator('#aig65-build').click();
 await page.waitForFunction(()=>!document.querySelector('#aig65-play').disabled||
  document.querySelector('#aig65-status').textContent.includes('BLOCKED'),
  {timeout:15000});
 const built=await page.locator('#aig65-status').innerText();
 if(/BLOCKED/.test(built)||await page.locator('#aig65-record').isDisabled())
  fail('AIG69_SOURCE_BUILD_FAILED',built);
 await page.locator('#aig65-canvas').screenshot({
  path:path.join(out,'01-REAL-BROWSER-2D-CANVAS-PREVIEW-NOT-HEROINE.png')});
 stage='RECORD_REAL_MEDIARECORDER';
 await page.locator('#aig65-record').click();
 await page.waitForFunction(()=>document.querySelector('#aig65-status').textContent.includes('正在錄製')||
  document.querySelector('#aig65-status').textContent.includes('BLOCKED'),
 {timeout:12000});
 const afterClick=await page.locator('#aig65-status').innerText();
 if(/BLOCKED/.test(afterClick))fail('AIG69_BROWSER_MEDIARECORDER_REJECTED',afterClick);
 await page.waitForFunction(()=>document.querySelector('#aig65-video').src.startsWith('blob:')||
  document.querySelector('#aig65-status').textContent.includes('BLOCKED'),
 {timeout:35000});
 const recordedStatus=await page.locator('#aig65-status').innerText();
 if(!await page.locator('#aig65-video').getAttribute('src')||
    /BLOCKED/.test(recordedStatus))
  fail('AIG69_VIDEO_NOT_ENCODED',recordedStatus);
 stage='DOWNLOAD_ACTUAL_CHROMIUM_VIDEO';
 const anchors=page.locator('#aig65-downloads a[download]');
 await anchors.first().waitFor({timeout:10000});
 const movieLink=page.locator('#aig65-downloads a[download$=".webm"],#aig65-downloads a[download$=".mp4"]').first();
 if(await movieLink.count()!==1)fail('AIG69_ACTUAL_VIDEO_DOWNLOAD_MISSING',recordedStatus);
 const fileName=await movieLink.getAttribute('download');
 const dlPromise=page.waitForEvent('download',{timeout:15000});
 await movieLink.click();
 const download=await dlPromise;
 const videoPath=path.join(out,fileName);
 await download.saveAs(videoPath);
 const bytes=await readFile(videoPath);
 if(bytes.length<3000)fail('AIG69_ENCODED_FILE_TOO_SMALL',{bytes:bytes.length});
 report.actualBrowserMediaRecorderBytes=bytes.length;
 report.actualEncodedFileSHA256=sha(bytes);
 report.actualContainerFilename=fileName;
 stage='CHECK_REAL_BROWSER_DECODING';
 await page.locator('#aig68-review').click();
 await page.waitForFunction(()=>!document.querySelector('#aig68-review').disabled,
  {timeout:15000});
 const browserStatus=await page.locator('#aig68-status').innerText();
 report.browserPlaybackStatus=browserStatus;
 // Independently inspect output bytes instead of assuming target Canvas size
 // is the encoded pixel resolution or that attached audio tracks are muxed.
 stage='FFPROBE_ACTUAL_OUTPUT_STREAMS';
 const probe=spawnSync('ffprobe',['-v','error','-show_entries',
  'format=duration,format_name:stream=index,codec_type,codec_name,width,height,sample_rate,channels,duration',
  '-of','json',videoPath],{encoding:'utf8',timeout:15000});
 if(probe.status!==0)fail('AIG69_FFPROBE_FAILED',{stderr:probe.stderr});
 const ff=JSON.parse(probe.stdout);
 report.ffprobe=ff;
 const streams=ff.streams||[];
 const vid=streams.find(s=>s.codec_type==='video');
 if(!vid||vid.width!==1920||vid.height!==1080)
  fail('AIG69_REAL_ENCODED_RESOLUTION_NOT_1080P',streams);
 report.realEncoded1920x1080Verified=true;
 report.encodedVideoCodec=vid.codec_name;
 report.muxedAudioStreamDetected=streams.some(s=>s.codec_type==='audio');
 report.actualAudioAudibilityInspected=false;
 report.actualAudioVideoLipSyncMeasured=false;
 report.recordedChromiumNotAndroidWindows=true;
 // Preserve actual video + source + images regardless of downstream QA.
 await page.screenshot({path:path.join(out,'02-REAL-BROWSER-FASTMODEL-6-9-STATUS-NOT-HEROINE.png'),fullPage:false});
 await writeFile(path.join(out,'CONSOLE-ERRORS.txt'),log.join('\n'));
 report.sourceGateSeparateFromBrowserGate=true;
 report.actualVideoCapturedInHeadlessChromium=true;
 report.actualHeroineVideoApproved=false;
 report.browserObservedAt=new Date().toISOString();
 if(!report.muxedAudioStreamDetected)fail('AIG69_WAV_AUDIO_STREAM_NOT_MUXED',streams);
 stage='PASS_REAL_BROWSER_SYNTHETIC';
 report.browserSyntheticGate='PASS';
} catch(err){
 report.browserSyntheticGate='FAIL';
 report.failedStage=stage;report.error=String(err?.stack||err);
 await writeFile(path.join(out,'BROWSER-FAILURE.txt'),report.error);
 throw err;
} finally{
 await writeFile(path.join(out,'FASTMODEL-6-9-REAL-BROWSER-NOT-HEROINE-QA.json'),JSON.stringify(report,null,2));
 await browser?.close().catch(()=>{});
}
console.log('AIG 6.9 real Chromium synthetic browser QA:',JSON.stringify({
 bytes:report.actualBrowserMediaRecorderBytes,encoded1080p:report.realEncoded1920x1080Verified,
 muxedAudio:report.muxedAudioStreamDetected,status:report.browserSyntheticGate
}));
