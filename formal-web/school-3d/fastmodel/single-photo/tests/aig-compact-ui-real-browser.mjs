import {chromium} from 'playwright';
import {readFileSync} from 'node:fs';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.env.AIG_UI_SCREENSHOTS||'artifacts/fastmodel-compact-ui';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.AIG_CHROMIUM_EXECUTABLE||undefined,args:[
 '--no-sandbox','--disable-dev-shm-usage',
 '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'
]});
const failures=[];
try{
 for(const device of [{name:'phone',viewport:{width:360,height:780},isMobile:true,hasTouch:true},
  {name:'desktop',viewport:{width:1440,height:900}}]){
  const page=await browser.newPage({...device,deviceScaleFactor:1});
  page.on('pageerror',e=>{failures.push(device.name+': '+e.message);console.log('AIG Browser page error:',e.message);});
  page.on('requestfailed',r=>console.log('AIG Browser failed request:',r.url(),r.failure()?.errorText));
  page.on('response',r=>{if(r.status()>=400)console.log('AIG Browser HTTP',r.status(),r.url());});
  try{
  const url=process.env.AIG_UI_TEST_URL||'http://127.0.0.1:8765/index.html';
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
  try{await page.waitForSelector('#aig-unified-tabs',{timeout:16000});}
  catch(e){
   console.log('AIG SHELL DIAGNOSTICS:',JSON.stringify({
    device:device.name,url:page.url(),title:await page.title(),
    tabCount:await page.locator('#aig-unified-tabs').count(),
    status:await page.locator('#status').textContent().catch(()=>null),
    body:await page.locator('body').innerText().then(t=>t.slice(0,450)).catch(()=>null),
    errors:failures,
    scriptSources:await page.evaluate(()=>[...document.scripts].map(s=>s.src)),
    uiProbe:await page.evaluate(()=>({
     generation:!!document.getElementById('generation'),
     appScript:!!document.querySelector('script[src="/app.js"]'),
     appError:!!document.querySelector('#aig65-build')
    }))
   }));throw e;
  }
  const controls=await page.evaluate(()=>{
   const spec=[
    ['aig65-build','FASTM.CREATE.BUILD','ANIMATION.BUILD'],
    ['aig65-play','FASTM.OUTPUT.PLAY','ANIMATION.PLAY'],
    ['aig65-stop','FASTM.OUTPUT.STOP','ANIMATION.STOP'],
    ['aig65-record','FASTM.OUTPUT.RECORD','MOVIE.RECORD'],
    ['aig68-review','FASTM.OUTPUT.REVIEW','MOVIE.REVIEW'],
    ['aig65-report','FASTM.OUTPUT.REPORT','EVIDENCE.REPORT']
   ];
   return spec.map(([id,button,command])=>{
    const el=document.getElementById(id);
    return {id,ok:!!el&&el.dataset.aigButtonId===button&&
     el.dataset.aigCommandId===command&&el.tagName==='BUTTON'};
   });
  });
  if(controls.length!==6||controls.some(x=>!x.ok))
   throw Error('FASTM_REAL_COMMAND_ID_NOT_BOUND_TO_EXISTING_CALLBACK '+JSON.stringify(controls));
  const evidence=await page.evaluate(()=>{
   const q=x=>document.querySelector(x);
   return {
    tabs:[...document.querySelectorAll('#aig-unified-tabs [role="tab"]')]
     .map(x=>({id:x.id,selected:x.getAttribute('aria-selected')})),
    canvasInStage:q('.workspace #aig65-canvas')!==null,
    originalView:q('.workspace #view')!==null,
    originalControls:['aig65-build','aig65-play','aig65-record',
      'aig68-review','aig64-single-build','local-glb','movie-record']
       .every(id=>document.querySelectorAll('#'+id).length===1),
    createVisible:!q('#aig-unified-panel-create').hidden,
    outputHidden:q('#aig-unified-panel-output').hidden,
    fixedViewport:getComputedStyle(document.body).overflow==='hidden',
    screenshotWidth:document.documentElement.scrollWidth,
    windowWidth:window.innerWidth
   };
  });
  if(evidence.tabs.length!==4||evidence.tabs[0].selected!=='true'||
     !evidence.canvasInStage||!evidence.originalView||
     !evidence.originalControls||!evidence.createVisible||
     !evidence.outputHidden||!evidence.fixedViewport||
     evidence.screenshotWidth>evidence.windowWidth+2)
   throw Error('AIG_COMPACT_UI_LAYOUT_FAILED '+JSON.stringify({device:device.name,evidence}));
  // Measure REAL rendered CSS on phone and desktop, not just theme strings
  // in documentation. Keep full viewport and original command callbacks.
  const rgb=await page.evaluate(()=>{
   const root=getComputedStyle(document.documentElement);
   const color=k=>root.getPropertyValue('--aig-rgb-'+k).trim().toLowerCase();
   return {
    background:color('background'),panel:color('panel'),text:color('text'),
    accent:color('accent'),cutting:color('cutting'),rapid:color('rapid'),
    warning:color('warning'),alarm:color('alarm'),disabled:color('disabled'),
    asideBg:getComputedStyle(document.querySelector('aside')).backgroundColor,
    selectedBorder:getComputedStyle(
     document.querySelector('#aig-unified-tabs [aria-selected="true"]')).borderTopColor,
    bodyBg:getComputedStyle(document.body).backgroundColor
   };
  });
  const expectedRGB={background:'#020407',panel:'#07111b',text:'#f4fbff',
   accent:'#27e9ff',cutting:'#33f39b',rapid:'#ff4da6',warning:'#ffb326',
   alarm:'#ff465f',disabled:'#54606a'};
  if(Object.entries(expectedRGB).some(([k,v])=>rgb[k]!==v)||
    rgb.bodyBg!=='rgb(2, 4, 7)'||rgb.asideBg!=='rgb(7, 17, 27)'||
    rgb.selectedBorder!=='rgb(39, 233, 255)')
   throw Error('AIG_THREE_PROJECT_RGB_GLASS_PARITY_FAILED '+
    JSON.stringify({device:device.name,rgb}));
  console.log('AIG_RGB_FORMAL_THEME_BROWSER_PASS',device.name,JSON.stringify(rgb));
  await page.screenshot({path:out+'/'+device.name+'-01-create.png'});
  // Tests real user interactions on original callbacks rather than just
  // checking HTML placeholders. Text-only 2D needs no photo or cloud.
  await page.locator('#aig65-story').fill('鏡頭緩慢推近照片。');
  // Reproduce actual Android screenshot: invalid/empty duration and
  // unexpectedly unselected mode. Valid browser normalization must repair
  // the form BEFORE calling the existing animation planner.
  await page.evaluate(()=>{
   document.getElementById('aig65-mode').selectedIndex=-1;
   document.getElementById('aig65-duration').value='';
  });
  if(!await page.locator('#aig693-progress').isVisible())
   throw Error('AIG693_REAL_PROGRESS_MISSING');
  const order=await page.evaluate(()=>{
   const a=document.getElementById('aig65-duration'),
    b=document.getElementById('aig65-build'),
    c=document.getElementById('aig-unified-auto-sound');
   return !!(a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING)&&
    !!(b.compareDocumentPosition(c)&Node.DOCUMENT_POSITION_FOLLOWING);
  });
  if(!order)throw Error('AIG693_REQUIRED_FORM_BELOW_OPTIONAL_AUDIO');
  await page.locator('#aig65-build').click();
  await page.waitForTimeout(900);
  console.log('AIG AFTER REAL BUILD CLICK',JSON.stringify({
   device:device.name,
   status:await page.locator('#aig65-status').innerText(),
   model:await page.locator('#aig65-mode').inputValue(),
   outputVisible:await page.locator('#aig-unified-panel-output').isVisible(),
   playDisabled:await page.locator('#aig65-play').isDisabled(),
   errors:failures
  }));
  await page.waitForFunction(()=>{
   const t=document.querySelector('#aig65-status')?.textContent||'';
   return t.includes('AUTO 選定')||t.includes('BLOCKED');
  },{timeout:15000});
  const buildStatus=await page.locator('#aig65-status').innerText();
  if(buildStatus.includes('BLOCKED'))throw Error('AIG_COMPACT_USER_BUILD_BLOCKED '+buildStatus);
  if(await page.locator('#aig65-mode').inputValue()!=='AUTO'||
     await page.locator('#aig65-duration').inputValue()!=='8')
   throw Error('AIG693_MOBILE_MODE_DURATION_NOT_RESTORED');
  const progress=await page.locator('#aig693-progress').evaluate(el=>({
   value:el.getAttribute('aria-valuenow'),state:el.getAttribute('data-aig-state'),
   text:el.textContent
  }));
  if(progress.value!=='4'||progress.state!=='complete')
   throw Error('AIG693_SOURCE_GENERATED_BUT_PROGRESS_STUCK '+JSON.stringify(progress));
  await page.screenshot({path:out+'/'+device.name+'-02a-restored-mode-8-seconds.png'});
  await page.waitForFunction(()=>!document.querySelector('#aig-unified-panel-output').hidden,
   {timeout:5000});
  if(await page.locator('#aig65-play').isDisabled())throw Error('AIG_COMPACT_PLAY_CALLBACK_NOT_READY');
  await page.screenshot({path:out+'/'+device.name+'-02-output.png'});
  await page.locator('#aig-unified-tab-model').click();
  if(!await page.locator('#aig-unified-stage-info').isVisible()||
     await page.locator('#view').isVisible()||
     !await page.locator('#aig-unified-import-glb').isVisible()||
     !await page.locator('#aig-unified-model-back').isVisible())
   throw Error('AIG694_3D_TECHNICAL_AVATAR_MISREPRESENTED_AS_APPROVED');
  await page.screenshot({path:out+'/'+device.name+'-05-no-fake-3d-model.png'});
  // Real cross-product control: import local CNC proof, verify SHA, render
  // moving pixels in the model workspace. NEVER send CNC machine commands.
  const motionFile=readFileSync(new URL('../fixtures/aig-readonly-motion-3ax.json',import.meta.url));
  await page.locator('#aig-cnc-motion-file').setInputFiles({
   name:'AIG-CNC-READONLY-MOTION.json',mimeType:'application/json',buffer:motionFile
  });
  const motionLoad=page.locator('#aig-cnc-motion-load');
  const motionPlay=page.locator('#aig-cnc-motion-play');
  const motionStop=page.locator('#aig-cnc-motion-stop');
  await motionLoad.click();
  await page.waitForFunction(()=>document.querySelector('#aig-cnc-motion-status')?.
   textContent.includes('驗證通過'),null,{timeout:7000});
  if(await motionPlay.isDisabled()||
     !await page.locator('#aig-cnc-motion-canvas').isVisible())
   throw Error('AIG_READONLY_CNC_IMPORT_NOT_CONNECTED');
  const sampleMotion=()=>page.locator('#aig-cnc-motion-canvas').evaluate(c=>{
   const out=document.createElement('canvas');out.width=256;out.height=144;
   const ctx=out.getContext('2d',{willReadFrequently:true});
   ctx.drawImage(c,0,0,256,144);
   return Array.from(ctx.getImageData(0,0,256,144).data);
  });
  await motionPlay.click();
  await page.waitForTimeout(110);
  const motionA=await sampleMotion();
  await page.waitForTimeout(720);
  const motionB=await sampleMotion();
  const motionChanged=motionA.filter((v,i)=>Math.abs(v-motionB[i])>20).length;
  if(motionChanged<12)throw Error('AIG_CNC_MODEL_PLAY_BUTTON_BUT_NO_REAL_PIXEL_MOTION '+
   motionChanged);
  // The 1.4s fixture can naturally finish during CI pixel sampling.
  // Re-play the real callback if needed; then stop while capture is active.
  if(await motionStop.isDisabled())await motionPlay.click();
  await motionStop.click({timeout:4000});
  const stopped=await page.locator('#aig-cnc-motion-status').innerText();
  if(!stopped.includes('沒有發送任何 CNC 指令')||await motionPlay.isDisabled())
   throw Error('AIG_CNC_PREVIEW_STOP_DID_NOT_RETAIN_READONLY_STATE');
  await page.screenshot({path:out+'/'+device.name+'-05b-readonly-cnc-motion-verified.png'});
  // Tampered source is blocked, not painted as CNC machine output.
  const tampered=JSON.parse(motionFile.toString('utf8'));
  tampered.data=tampered.data.replace('20.000','21.000');
  await page.locator('#aig-cnc-motion-file').setInputFiles({
   name:'AIG-CNC-TAMPERED.json',mimeType:'application/json',
   buffer:Buffer.from(JSON.stringify(tampered))
  });
  await motionLoad.click();
  await page.waitForFunction(()=>{
   const status=document.querySelector('#aig-cnc-motion-status')?.textContent||'';
   return status.includes('BLOCKED')&&status.includes('TAMPERED_SHA256');
  },null,{timeout:10000});
  const rejected=await page.locator('#aig-cnc-motion-status').innerText();
  if(!rejected.includes('BLOCKED')||!rejected.includes('TAMPERED_SHA256')||
     !await motionPlay.isDisabled()||
     await page.locator('#aig-cnc-motion-canvas').isVisible())
   throw Error('AIG_CNC_TAMPERED_MOTION_DID_NOT_FAIL_CLOSED '+rejected);
  console.log('AIG_READONLY_CNC_MOTION_REAL_BROWSER_PASS',device.name,
   JSON.stringify({pixelValuesChanged:motionChanged,sourceShaVerified:true,
    tamperedBlocked:true,machineCommandsSent:false,humanRigCertified:false}));

  await page.locator('#aig-unified-model-technical summary').click();
  if(!await page.locator('#aig64-single-build').isVisible())
   throw Error('AIG694_LEGACY_TECHNICAL_GENERATOR_MISSING');
  await page.locator('#aig-unified-tab-advanced').click();
  if(!await page.locator('#aig4-build').isVisible())
   throw Error('AIG_COMPACT_LEGACY_FUNCTION_MISSING');
  await page.locator('#aig-unified-tab-create').click();
  if(!await page.locator('#aig65-image').isVisible())
   throw Error('AIG_COMPACT_RETURN_TO_EDIT_BROKEN');
  // Explicit 3D without a verified matching GLB clip must report the
  // limitation, not masquerade as real person animation or a mute button.
  await page.locator('#aig65-story').fill('女主角在校園走路');
  await page.locator('#aig65-mode').selectOption('3D');
  await page.locator('#aig65-build').click();
  await page.locator('#aig695-need-real-3d').waitFor({state:'visible',timeout:10000});
  const blocked=await page.locator('#aig65-status').innerText();
  if(!blocked.includes('缺少可匹配的 3D GLB')||
     !await page.locator('#aig695-switch-auto').isVisible())
   throw Error('AIG695_TRUE_3D_MISSING_CLIPS_NOT_EXPLAINED '+blocked);
  await page.screenshot({path:out+'/'+device.name+'-06-real-3d-unavailable-no-fake-success.png'});
  // User authorizes a separate photographic camera motion mode explicitly.
  await page.locator('#aig695-switch-auto').click();
  await page.waitForFunction(()=>
   (document.querySelector('#aig65-status')?.textContent||'').includes('AUTO 選定'),
   null,{timeout:13000});
  if(await page.locator('#aig65-mode').inputValue()!=='2D')
   throw Error('AIG695_MANUAL_PHOTO_FALLBACK_NOT_BOUND');
  await page.locator('#aig-unified-tab-create').click();
  // Real file/no-WAV regression on phone AND desktop: the normal AUTO path
  // must create image animation, actually play it and record it to Blob
  // without a user-supplied audio file.
  const syntheticPNG=Buffer.from(await page.evaluate(()=>{
    const c=document.createElement('canvas');c.width=240;c.height=320;
    const ctx=c.getContext('2d');
    ctx.fillStyle='#e5f6fa';ctx.fillRect(0,0,240,320);
    ctx.fillStyle='#484c67';ctx.fillRect(48,100,144,190);
    ctx.fillStyle='#cfae92';ctx.beginPath();ctx.ellipse(120,85,42,52,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#39253a';ctx.beginPath();ctx.arc(120,52,48,Math.PI,Math.PI*2);ctx.fill();
    return c.toDataURL('image/png').split(',')[1];
  }),'base64');
  await page.locator('#aig65-image').setInputFiles({
   name:'6-9-2-SYNTHETIC-NOT-HEROINE.png',mimeType:'image/png',buffer:syntheticPNG
  });
  await page.locator('#aig65-story').fill('鏡頭緩慢推近照片中的天空。');
  await page.locator('#aig65-mode').selectOption('AUTO');
  await page.locator('#aig65-duration').fill('2');
  if(await page.locator('#aig67-voice').evaluate(el=>el.files.length)!==0)
   throw Error('AIG692_WAV_NOT_OPTIONAL');
  await page.locator('#aig65-build').click();
  await page.waitForFunction(()=>{
   const t=document.querySelector('#aig65-status')?.textContent||'';
   return t.includes('AUTO 選定')||t.includes('BLOCKED');
  },null,{timeout:15000});
  const noWavBuilt=await page.locator('#aig65-status').innerText();
  if(noWavBuilt.includes('BLOCKED')||await page.locator('#aig65-play').isDisabled())
   throw Error('AIG692_PHOTO_AUTO_NO_WAV_FAILED '+noWavBuilt);
  if(!await page.locator('#aig-unified-panel-output').isVisible())
   throw Error('AIG692_NO_WAV_OUTPUT_TAB_NOT_OPENED');
  await page.locator('#aig65-play').click();
  await page.waitForFunction(()=>{
   const t=document.querySelector('#aig65-status')?.textContent||'';
   return t.includes('正在播放')||t.includes('BLOCKED');
  },null,{timeout:10000});
  const playing=await page.locator('#aig65-status').innerText();
  if(playing.includes('BLOCKED'))throw Error('AIG692_PLAY_WITHOUT_AUDIO_FILE_BLOCKED '+playing);
  // Actual pixel frame differences, NOT just Play button presence.
  // This detects source Canvas motion and explicitly does not certify
  // articulated human walking, punching or facial identity.
  const samplePixels=()=>page.locator('#aig65-canvas').evaluate(canvas=>{
   const probe=document.createElement('canvas');probe.width=64;probe.height=36;
   const ctx=probe.getContext('2d',{willReadFrequently:true});
   ctx.drawImage(canvas,0,0,64,36);
   return Array.from(ctx.getImageData(0,0,64,36).data);
  });
  const sampleA=await samplePixels();
  await page.waitForTimeout(700);
  const sampleB=await samplePixels();
  const changed=sampleA.filter((v,i)=>Math.abs(v-sampleB[i])>12).length;
  if(changed<80)throw Error('AIG695_PLAYING_BUT_CANVAS_PIXEL_FRAMES_NEARLY_IDENTICAL '+changed);
  console.log('AIG actual PHOTO camera pixel-frame motion',device.name,
   JSON.stringify({differentRGBAValues:changed,valuesSampled:sampleA.length,
    actualHumanLimbAnimationVerified:false}));
  // A 2-second clip can reach its real end before the second screenshot
  // is sampled. Stop only if still running; natural completion is valid.
  // Playback may finish between isEnabled and a delayed Playwright click.
  // Use the REAL STOP callback in a single browser task, or recognize that
  // natural completion already disabled this control.
  const stopResult=await page.evaluate(()=>{
   const button=document.getElementById('aig65-stop');
   if(!button||button.disabled)return 'NATURAL_COMPLETION';
   button.click();return 'REAL_STOP_CALLBACK';
  });
  console.log('AIG_ANIMATION_STOP_TRANSITION',device.name,stopResult);
  await page.waitForFunction(()=>!document.querySelector('#aig65-record').disabled,
   null,{timeout:10000});
  await page.screenshot({path:out+'/'+device.name+'-03-photo-no-wav-playing.png'});
  await page.locator('#aig65-record').click();
  await page.waitForFunction(()=>{
   const t=document.querySelector('#aig65-status')?.textContent||'';
   return document.querySelector('#aig65-video').src.startsWith('blob:')||
    t.includes('BLOCKED');
  },null,{timeout:20000});
  const recordedNoWav=await page.locator('#aig65-status').innerText();
  const blobVideo=await page.locator('#aig65-video').getAttribute('src');
  if(!blobVideo?.startsWith('blob:')||recordedNoWav.includes('BLOCKED'))
   throw Error('AIG692_VIDEO_WITHOUT_WAV_FAILED '+recordedNoWav);
  // The recorder returning a Blob does not prove that browsers can decode
  // moving video. Decode the *recorded WebM*, sample two frames and compare.
  const decoded=await page.evaluate(async()=>{
   const v=document.querySelector('#aig65-video');
   v.muted=true;v.playsInline=true;v.preload='auto';
   const bounded=(promise,ms,label)=>Promise.race([promise,
    new Promise((_,reject)=>setTimeout(()=>reject(Error(label)),ms))]);
   if(v.readyState<2)await bounded(new Promise((resolve,reject)=>{
    v.addEventListener('loadeddata',resolve,{once:true});
    v.addEventListener('error',()=>reject(Error('ENCODED_VIDEO_DECODER_ERROR')),{once:true});
   }),6000,'ENCODED_VIDEO_LOAD_TIMEOUT');
   if(v.videoWidth<128||v.videoHeight<72)throw Error('VIDEO_HAS_NO_DECODABLE_PIXELS');
   await bounded(v.play(),5000,'ENCODED_VIDEO_CANNOT_PLAY');
   const c=document.createElement('canvas');c.width=64;c.height=36;
   const ctx=c.getContext('2d',{willReadFrequently:true});
   const sample=()=>{ctx.drawImage(v,0,0,64,36);
    return Array.from(ctx.getImageData(0,0,64,36).data);};
   await new Promise(resolve=>setTimeout(resolve,180));
   const t0=v.currentTime,first=sample();
   await new Promise(resolve=>setTimeout(resolve,650));
   const t1=v.currentTime,second=sample();v.pause();
   const n=first.reduce((acc,v,i)=>acc+(Math.abs(v-second[i])>9?1:0),0);
   return {width:v.videoWidth,height:v.videoHeight,timeA:t0,timeB:t1,
    changedRGBA:n,pixelsCompared:first.length,codecConfirmed:true,
    humanJointAnimationCertified:false};
  });
  if(decoded.timeB<=decoded.timeA+0.1||decoded.changedRGBA<20)
   throw Error('AIG_FASTMODEL_ENCODED_VIDEO_STATIC_OR_INVALID '+JSON.stringify(decoded));
  console.log('FASTMODEL_REAL_ENCODED_VIDEO_DECODED_MOVING_FRAMES',device.name,JSON.stringify(decoded));
  await page.screenshot({path:out+'/'+device.name+'-04-recorded-no-wav.png'});
  console.log('AIG 6.9.2 no WAV real '+device.name+' PASS',JSON.stringify({
    wavInputs:0,selected:'AUTO',source:'synthetic PNG NOT heroine',
    generated:true,played:true,recordedBlob:true,videoUrl:blobVideo.slice(0,12)
  }));
  console.log('AIG compact real Chromium '+device.name+' PASS',JSON.stringify(evidence));
  // Real phone+desktop local single upper-body photo → 17-bone base
  // GLB → click true full-body action → inspect downloaded 7-clip GLB.
  await page.locator('#aig-unified-tab-model').click();
  if(!await page.locator('#aig64-single-build').isVisible()||
     !await page.locator('#aig64-single-motion-upgrade').isVisible())
   throw Error('AIG_PRIMARY_REAL_FULLBODY_BUTTONS_HIDDEN_IN_TECHNICAL_DISCLOSURE');
  const encoded=await page.evaluate(()=>{
   const c=document.createElement('canvas');c.width=320;c.height=480;
   const x=c.getContext('2d');x.fillStyle='#eeebe6';x.fillRect(0,0,320,480);
   x.fillStyle='#443536';
   x.beginPath();x.ellipse(160,110,39,70,0,0,Math.PI*2);x.fill();
   x.beginPath();x.ellipse(160,291,85,145,0,0,Math.PI*2);x.fill();
   return c.toDataURL('image/png').split(',')[1];
  });
  await page.locator('#aig64-single-photo').setInputFiles({
   name:'SYNTHETIC_CI_UPPERBODY.png',mimeType:'image/png',
   buffer:Buffer.from(encoded,'base64')});
  await page.locator('#aig64-single-build').click();
  await page.waitForFunction(()=>{
   const t=document.getElementById('aig64-single-status')?.textContent||'';
   return t.includes('BLOCKED')||(!document.getElementById(
    'aig64-single-motion-upgrade').disabled&&t.includes('17 骨'));
  },null,{timeout:45000});
  const status=page.locator('#aig64-single-status');
  if((await status.innerText()).includes('BLOCKED'))
   throw Error('AIG_ONE_PHOTO_BASE_GLB_BLOCKED '+await status.innerText());
  await page.locator('#aig64-single-motion-upgrade').click();
  await page.waitForFunction(()=>{
   const t=document.getElementById('aig64-single-status')?.textContent||'';
   return t.includes('BLOCKED')||t.includes('7 段真 GLB');
  },null,{timeout:45000});
  if((await status.innerText()).includes('BLOCKED')||
     await page.locator('#aig64-single-download').isDisabled())
   throw Error('AIG_REAL_BILATERAL_LIMB_CONTROL_BLOCKED '+await status.innerText());
  await page.evaluate(()=>{
   const old=URL.createObjectURL.bind(URL);
   URL.createObjectURL=blob=>{window.__aigTrue7ClipBlob=blob;return old(blob);};
  });
  await page.locator('#aig64-single-download').click();
  const finalGlb=await page.evaluate(async()=>{
   const blob=window.__aigTrue7ClipBlob;if(!blob)return null;
   const buf=await blob.arrayBuffer(),v=new DataView(buf);
   const gltf=JSON.parse(new TextDecoder().decode(
    new Uint8Array(buf,20,v.getUint32(12,true))));
   return {size:buf.byteLength,magic:v.getUint32(0,true),
    clips:gltf.animations?.length,skinnedBones:gltf.skins?.[0]?.joints?.length,
    meshes:gltf.meshes?.length,motionSchema:gltf.extras?.motionSchema,
    release:gltf.extras?.releaseAllowed};
  });
  if(finalGlb?.magic!==0x46546c67||finalGlb.clips!==7||
     finalGlb.skinnedBones!==17||finalGlb.meshes!==9||
     finalGlb.release!==false||
     finalGlb.motionSchema!=='AIG_FASTMODEL_REAL_TECHNICAL_FULLBODY_MOTION_V1')
   throw Error('AIG_REAL_DOWNLOAD_SEVEN_CLIP_GLB_INVALID '+JSON.stringify(finalGlb));
  await page.screenshot({path:out+'/'+device.name+'-06-real-3d-body-motion.png'});
  console.log('AIG_REAL_ONE_PHOTO_FULLBODY_MOTION_BROWSER_PASS',device.name,
   JSON.stringify({bytes:finalGlb.size,clips:7,bones:17,meshes:9,
    realBothArmsAndLegs:true,photoIdentityCertified:false}));
  // Same original bytes, different declared species: never substitute human
  // bones/GLB for actual animals or plants. Verify real report Blob+schema.
  for(const selected of ['PLANT','ANIMAL']){
   await page.locator('#aig64-subject-kind').selectOption(selected);
   if(!await page.locator('#aig64-single-download').isDisabled())
    throw Error('AIG612_STALE_HUMAN_GLB_AFTER_BIO_DOMAIN_CHANGE');
   await page.locator('#aig64-single-build').click();
   await page.waitForFunction(domain=>{
    const t=document.querySelector('#aig64-single-status')?.textContent||'';
    return t.includes('BLOCKED')||t.includes('照片分析已完成');
   },selected,{timeout:15000});
   const status=await page.locator('#aig64-single-status').innerText();
   if(!status.includes('照片分析已完成')||
      !await page.locator('#aig64-single-download').isDisabled()||
      !await page.locator('#aig64-single-motion-upgrade').isDisabled()||
      await page.locator('#aig64-single-report').isDisabled())
    throw Error('AIG612_FALSE_'+selected+'_GLB_OR_NO_REAL_EVIDENCE '+status);
   await page.evaluate(()=>window.__aigTrue7ClipBlob=null);
   await page.locator('#aig64-single-report').click();
   const obs=await page.evaluate(async()=>{
    const blob=window.__aigTrue7ClipBlob;
    return blob?JSON.parse(await blob.text()):null;
   });
   if(obs?.schema!=='AIG_FASTMODEL_6_12_REAL_PIXEL_OBSERVATION'||
      obs?.requestedDomain!==selected ||
      obs?.observedPixels?.domain!==selected ||
      obs?.humanSkeletonMayNotBeSubstituted!==true ||
      obs?.actualAnimalOrPlant3DModelProduced!==false ||
      obs?.releaseAllowed!==false ||
      !Array.isArray(obs?.observedPixels?.measuredForegroundMedianRGB))
    throw Error('AIG612_EVIDENCE_NOT_ACTUAL_BOUNDED_PIXEL_DATA '+selected);
   console.log('AIG612_TRUE_'+selected+'_PIXEL_ANALYSIS_ONLY_BROWSER_PASS',
    device.name,JSON.stringify({
     domain:selected,rgb:obs.observedPixels.measuredForegroundMedianRGB,
     humanSkeletonGenerated:false,evidenceJsonDownloaded:true
    }));
  }
  }catch(error){
   // Synthetic CI fixture only; do not capture private uploaded portraits.
   const ids=['aig65-build','aig65-play','aig65-stop','aig65-record',
    'aig-cnc-motion-load','aig-cnc-motion-play','aig-cnc-motion-stop'];
   const diagnostic=await page.evaluate(ids=>({
    controls:ids.map(id=>{const el=document.getElementById(id);
     return {id,exists:!!el,disabled:el?.disabled??null,
      visible:!!el&&getComputedStyle(el).display!=='none'};}),
    animationStatus:document.getElementById('aig65-status')?.textContent?.slice(0,220),
    motionStatus:document.getElementById('aig-cnc-motion-status')?.textContent?.slice(0,220),
    activeTab:[...document.querySelectorAll('#aig-unified-tabs [aria-selected="true"]')]
     .map(x=>x.id),
    canvasReady:!document.getElementById('aig-cnc-motion-canvas')?.hidden
   }),ids).catch(e=>({captureError:String(e)}));
   const evidence={schema:'AIG_UI_FAILURE_EVIDENCE_V1',device:device.name,
    viewport:device.viewport,errorCode:error?.name||'UNKNOWN',
    message:String(error?.message||error).slice(0,900),
    diagnostic,jsErrors:failures.slice(-8),
    status:'FAIL_REQUIRES_TRIAGE',releaseCertified:false};
   await writeFile(out+'/'+device.name+'-failure-evidence.json',
    JSON.stringify(evidence,null,2)+'\n')
    .catch(e=>console.error('AIG_EVIDENCE_WRITE_BLOCKED',e.message));
   await page.screenshot({path:out+'/'+device.name+'-failure.png',fullPage:false})
    .catch(e=>console.error('AIG_FAILURE_SCREENSHOT_BLOCKED',e.message));
   console.error('AIG_UI_FAILURE_EVIDENCE',JSON.stringify(evidence));
   throw error;
  }finally{await page.close();}
 }
 if(failures.length)throw Error('AIG_BROWSER_JS_ERRORS: '+failures.join(' | '));
}finally{await browser.close();}
