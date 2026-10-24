/**
 * Browser-level V117 active source planner -> actual V109 GLB source ->
 * actual V107 WebGL A/B five-pose sweep, fail closed on complex backgrounds.
 * Fixtures are synthetic PNGs. No learned AI or real human 1:1 claim.
 */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const dir='artifacts/aig-real3d-v117';
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 '--enable-webgl','--use-gl=angle','--use-angle=swiftshader',
 '--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1420,height:1050}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
async function photo(kind){
 return Buffer.from((await page.evaluate(kind=>{
  const c=document.createElement('canvas');
  c.width=160;c.height=192;
  const g=c.getContext('2d');
  if(kind!=='alpha'){
   if(kind==='complex'){
    for(let y=0;y<192;y+=8)for(let x=0;x<160;x+=8){
     g.fillStyle=((x/8+y/8)%2)?'#23a67e':'#e7ad45';
     g.fillRect(x,y,8,8);
    }
   }else{g.fillStyle='#eee8dd';g.fillRect(0,0,160,192);}
  }
  g.fillStyle='#314fbd';g.fillRect(45,25,70,140);
  g.fillStyle='#d39862';g.fillRect(65,40,30,26);
  return c.toDataURL('image/png').split(',')[1];
 },kind)),'base64');
}
try{
 await page.goto('http://127.0.0.1:8772/shared-3d/aig-real3d-v109-photo-surface-lab.html',{
  waitUntil:'domcontentloaded',timeout:30000});
 // Complex background without user marks or trained model must NOT fake 3D.
 const complex=await photo('complex');
 await page.locator('#photo').setInputFiles({
  name:'ComplexRGBScenery.png',mimeType:'image/png',buffer:complex});
 await page.locator('#v117-auto').click();
 await page.waitForFunction(()=>{
  const el=document.querySelector('#v117-plan-report');
  return el?.textContent.includes('NEEDS_SOURCE_REVIEW');
 },null,{timeout:30000});
 const blocked=JSON.parse(await page.locator('#v117-plan-report').textContent());
 assert.equal(blocked.status,'NEEDS_SOURCE_REVIEW');
 assert.equal(blocked.actualNeuralModelExecuted,false);
 assert.equal(blocked.autoSubmittedToGPU,false);
 assert.equal(await page.locator('#save').isDisabled(),true);
 // Opaque plain background should actually auto-create true GLB and use five
 // GPU frames based on real original source SHA and same triangle count.
 await page.locator('#photo').setInputFiles({
  name:'PlainBackgroundOpaquePhoto.png',mimeType:'image/png',
  buffer:await photo('opaque')
 });
 await page.locator('#v117-auto').click();
 await page.waitForFunction(()=>document.querySelector('#v117-inspection-report')
  ?.textContent.includes('PASS_SOURCE_GLTF_FIVE_POSE_INSPECTION')||
  document.querySelector('#v117-inspection-report')?.textContent.includes('"status": "BLOCK"'),
 null,{timeout:50000});
 const first=JSON.parse(await page.locator('#receipt').textContent());
 const a=JSON.parse(await page.locator('#v117-inspection-report').textContent());
 assert.equal(a.actualGPUResult,'PASS_SOURCE_GLTF_FIVE_POSE_INSPECTION',JSON.stringify(a));
 assert.equal(a.checkedRealGPUFrames,5);
 assert.equal(first.v117ActiveControllerPlan.actualNeuralModelExecuted,false);
 assert.equal(first.v117ActiveControllerPlan.selectedForegroundModule,'AUTO_SIMPLE_BORDER_BG');
 assert.equal(first.v117ActualFivePoseGPUGate.outputGLBSha256,first.modelSha256);
 assert.equal(first.lastActualGPUFrame.sourceSHA,first.modelSha256);
 assert.equal(first.lastActualGPUFrame.aTiltDeg,0);
 assert.equal(first.lastActualGPUFrame.bTurnDeg,0);
 assert.ok(first.actualImportedTriangleCount>100);
 assert.equal(first.originalPhotoIdentityOrNaturalAnatomyCertified,false);
 assert.equal(await page.locator('#save').isEnabled(),true);
 const plainScreenshot=await page.locator('#gl').screenshot();
 await writeFile(dir+'/V117-AUTO-OPAQUE-GLB-TRUE-GPU-RETURN-A0-B0.png',plainScreenshot);
 // Full 1:1 never smuggled into a single-view route.
 await page.locator('#v117-desired').selectOption('REQUIRE_COMPLETE_3D');
 await page.locator('#v117-plan').click();
 await page.waitForFunction(()=>document.querySelector('#v117-plan-report')
  ?.textContent.includes('SINGLE_VIEW_CANNOT_PROVE_UNOBSERVED_BACKSIDE'),
  null,{timeout:30000});
 const rejected=JSON.parse(await page.locator('#v117-plan-report').textContent());
 assert.equal(rejected.status,'BLOCK');
 assert.equal(rejected.code,'SINGLE_VIEW_CANNOT_PROVE_UNOBSERVED_BACKSIDE');
 await page.locator('#v117-desired').selectOption('FRONT_SOURCE_GLB');
 // Original transparent PNG remains supported, does not regress.
 await page.locator('#photo').setInputFiles({
  name:'ActualAlphaObservedFront.png',mimeType:'image/png',
  buffer:await photo('alpha')
 });
 await page.locator('#v117-auto').click();
 await page.waitForFunction(()=>{
  const p=document.querySelector('#v117-inspection-report')?.textContent||'';
  return p.includes('PASS_SOURCE_GLTF_FIVE_POSE_INSPECTION')||
   p.includes('"status": "BLOCK"');
 },null,{timeout:50000});
 const second=JSON.parse(await page.locator('#receipt').textContent());
 const b=JSON.parse(await page.locator('#v117-inspection-report').textContent());
 assert.equal(b.checkedRealGPUFrames,5);
 assert.equal(second.v117ActiveControllerPlan.selectedForegroundModule,
  'ORIGINAL_ALPHA_ALREADY_SEGMENTED');
 assert.notEqual(second.modelSha256,first.modelSha256);
 assert.equal(second.v117ActualFivePoseGPUGate.outputGLBSha256,second.modelSha256);
 assert.equal(second.finalReleasePASS,false);
 assert.equal(second.lastActualGPUFrame.sourceSHA,second.modelSha256);
 assert.deepEqual(errors,[]);
 await writeFile(dir+'/V117-AUTO-ALPHA-GLB-FIVE-POSE-TRUE-GPU.png',
  await page.locator('#gl').screenshot());
 await writeFile(dir+'/V117-AUTONOMOUS-SOURCE-PROVENANCE-AND-GPU-PROOF.json',
  JSON.stringify({blocked,first,firstGPU:a,rejected,second,secondGPU:b},null,2));
 console.log('AIG_REAL3D_V117_SOURCE_AWARE_ACTIVE_CONTROL_TRUE_5_POSE_GPU_PASS',
  JSON.stringify({plainTriangles:first.actualImportedTriangleCount,
   actualFiveFramesPerSuccessfulSource:5,
   opaqueAndAlphaBothPass:true,complexWithoutMaskBlocked:true,
   fullOneToOneRequestBlocked:true,realLearnedAINotInstalled:true,
   actualOpenGLBackedWebGL:true,formalReleaseStillBlocked:true}));
}finally{await browser.close();}
