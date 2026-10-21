import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';
const out=process.env.AIG_UI_SCREENSHOTS||'artifacts/fastmodel-compact-ui';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:[
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
  await page.screenshot({path:out+'/'+device.name+'-01-create.png'});
  // Tests real user interactions on original callbacks rather than just
  // checking HTML placeholders. Text-only 2D needs no photo or cloud.
  await page.locator('#aig65-story').fill('女主角轉頭，微笑。');
  await page.locator('#aig65-mode').selectOption('2D');
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
  await page.waitForFunction(()=>!document.querySelector('#aig-unified-panel-output').hidden,
   {timeout:5000});
  if(await page.locator('#aig65-play').isDisabled())throw Error('AIG_COMPACT_PLAY_CALLBACK_NOT_READY');
  await page.screenshot({path:out+'/'+device.name+'-02-output.png'});
  await page.locator('#aig-unified-tab-model').click();
  if(!await page.locator('#aig64-single-build').isVisible())
   throw Error('AIG_COMPACT_3D_CONTROL_HIDDEN');
  await page.locator('#aig-unified-tab-advanced').click();
  if(!await page.locator('#aig4-build').isVisible())
   throw Error('AIG_COMPACT_LEGACY_FUNCTION_MISSING');
  await page.locator('#aig-unified-tab-create').click();
  if(!await page.locator('#aig65-image').isVisible())
   throw Error('AIG_COMPACT_RETURN_TO_EDIT_BROKEN');
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
  await page.locator('#aig65-story').fill('她微笑，抬頭看著天空。');
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
  await page.waitForTimeout(250);
  await page.locator('#aig65-stop').click();
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
  await page.screenshot({path:out+'/'+device.name+'-04-recorded-no-wav.png'});
  console.log('AIG 6.9.2 no WAV real '+device.name+' PASS',JSON.stringify({
    wavInputs:0,selected:'AUTO',source:'synthetic PNG NOT heroine',
    generated:true,played:true,recordedBlob:true,videoUrl:blobVideo.slice(0,12)
  }));
  console.log('AIG compact real Chromium '+device.name+' PASS',JSON.stringify(evidence));
  await page.close();
 }
 if(failures.length)throw Error('AIG_BROWSER_JS_ERRORS: '+failures.join(' | '));
}finally{await browser.close();}
