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
  console.log('AIG compact real Chromium '+device.name+' PASS',JSON.stringify(evidence));
  await page.close();
 }
 if(failures.length)throw Error('AIG_BROWSER_JS_ERRORS: '+failures.join(' | '));
}finally{await browser.close();}
