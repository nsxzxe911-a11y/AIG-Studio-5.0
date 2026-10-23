/**
 * Actually builds & records Star Journey storyboard cinema footage.
 * Procedural 2D scene art, NOT AI-made characters/film.
 */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const folder='artifacts/aig-starjourney-local-storyboard-cinema-v2';
await mkdir(folder,{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 '--enable-webgl','--use-gl=angle','--use-angle=swiftshader',
 '--no-sandbox','--disable-dev-shm-usage'
]});
const page=await browser.newPage({viewport:{width:1570,height:940},acceptDownloads:true});
const errs=[];page.on('pageerror',e=>errs.push(e.message));
async function downloadFromClick(selector,fileName){
 const dl=page.waitForEvent('download',{timeout:120000});
 await page.locator(selector).click();
 const item=await dl,bytes=await readFile(await item.path());
 assert.ok(bytes.length>100);
 await copyFile(await item.path(),folder+'/'+fileName);
 return bytes;
}
try{
 await page.goto('http://127.0.0.1:8765/fastmodel/cinema-engine/',{
  waitUntil:'domcontentloaded',timeout:30000
 });
 assert.equal(await page.locator('#story-export').isDisabled(),true);
 await page.locator('#story-sample').click();
 assert.match(await page.locator('#story-script').inputValue(),/星際之旅/);
 await page.locator('#story-plan').click();
 const label=await page.locator('#story-stats').textContent();
 assert.match(label,/幕／/);
 assert.match(label,/程式繪製 2D/);
 assert.equal(await page.locator('#stage-mode').textContent(),'CINEMA');
 assert.match(await page.locator('#preview-flag').textContent(),/非 AI/);
 const planBytes=await downloadFromClick('#story-export','STARJOURNEY-REAL-STORYBOARD.json');
 const plan=JSON.parse(planBytes.toString('utf8'));
 assert.ok(plan.shots.length>=4);
 assert.equal(plan.engine,'LOCAL_RULES_NO_GENERATIVE_AI');
 assert.equal(plan.realHuman3DGenerated,false);
 assert.equal(plan.shots.length,await page.locator('#timeline-clips button').count());
 assert.equal(plan.shots[0].visualKey,'GATE');
 // No imported image files. The pixels here MUST be created by
 // the runtime Canvas 2D scene renderer and change across shot types.
 const front=await downloadFromClick('#still-button','SHOT-01-GATE-TRUE-CANVAS.png');
 assert.equal(front.readUInt32BE(0),0x89504e47);
 assert.equal(front.readUInt32BE(16),960);
 assert.equal(front.readUInt32BE(20),540);
 await page.locator('#timeline-clips button').nth(2).click();
 const other=await downloadFromClick('#still-button','SHOT-03-TRUE-CANVAS.png');
 assert.notEqual(createHash('sha256').update(front).digest('hex'),
  createHash('sha256').update(other).digest('hex'),
  'Different storyboard scenes MUST produce truly different rendered image pixels');
 await page.screenshot({path:folder+'/desktop-multishot-real-rgb-runtime.png',fullPage:true});
 assert.equal(await page.locator('#asset-count').textContent(),String(plan.shots.length));
 assert.deepEqual(errs,[]);
 assert.ok(await page.evaluate(()=>typeof MediaRecorder!=='undefined'&&
  typeof HTMLCanvasElement.prototype.captureStream==='function'&&
  MediaRecorder.isTypeSupported('video/webm')));
 const webm=await downloadFromClick('#export-webm','STARJOURNEY-REAL-LOCAL-STORYBOARD-VIDEO.webm');
 assert.equal(webm.readUInt32BE(0),0x1a45dfa3);
 assert.ok(webm.length>10000);
 assert.ok(webm.includes(Buffer.from('V_VP9'))||webm.includes(Buffer.from('V_VP8')));
 // Mobile: script editor in controls, existing three-tab authority intact.
 const mobile=await browser.newPage({viewport:{width:390,height:844},
  deviceScaleFactor:1,isMobile:true,hasTouch:true});
 mobile.on('pageerror',e=>errs.push(e.message));
 await mobile.goto('http://127.0.0.1:8765/fastmodel/cinema-engine/',{
  waitUntil:'domcontentloaded',timeout:30000});
 await mobile.locator('[data-mobile-tab="CONTROL"]').click();
 assert.equal(await mobile.locator('#story-options').isVisible(),true);
 await mobile.locator('#story-sample').click();
 await mobile.locator('#story-plan').click();
 assert.match(await mobile.locator('#story-stats').textContent(),/幕／/);
 await mobile.screenshot({path:folder+'/mobile-script-planner-control.png',
  fullPage:true});
 await mobile.locator('[data-mobile-tab="STAGE"]').click();
 await mobile.screenshot({path:folder+'/mobile-storyboard-preview.png',
  fullPage:true});
 await mobile.locator('[data-mobile-tab="TIMELINE"]').click();
 assert.equal(await mobile.locator('#timeline-clips .clip').count(),plan.shots.length);
 await mobile.screenshot({path:folder+'/mobile-storyboard-timeline.png',
  fullPage:true});
 await mobile.close();
 assert.deepEqual(errs,[]);
 const manifest={
  schema:'AIG_STARJOURNEY_STORYBOARD_GPU_SCREEN_AND_WEBM_QA_V2',
  scriptEngine:'LOCAL_RULES_NO_LLM',
  desktopMobileApprovedAuthoritiesPreserved:true,
  shotsRendered:plan.shots.length,durationSeconds:plan.totalDurationSec,
  realCanvasMultiShotDistinctSHA:true,
  firstShotSHA256:createHash('sha256').update(front).digest('hex'),
  laterShotSHA256:createHash('sha256').update(other).digest('hex'),
  actualRealWebMBytes:webm.length,
  realWebmSHA256:createHash('sha256').update(webm).digest('hex'),
  actualHumanPhotoTo3dReconstruction:false,
  aiVoiceGeneration:false,generatedAIImages:false,
  uploadedSources:false,
  finalMovieAppearanceApproved:false,
  deployedRenderLive:false
 };
 await writeFile(folder+'/proof.json',JSON.stringify(manifest,null,2));
 console.log('STARJOURNEY_SCRIPT_TO_ACTUAL_MULTISHOT_CANVAS_WEBM_PASS');
}catch(e){
 console.error('STARJOURNEY_STORYBOARD_GATE_BLOCK',e.stack||String(e));
 process.exitCode=1;
 await page.screenshot({path:folder+'/FAILED.png',fullPage:true}).catch(()=>{});
}finally{await browser.close();}
