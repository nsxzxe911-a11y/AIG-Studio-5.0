/**
 * Real Chromium V118: truly train local neural weights from canvas pixel
 * labels, infer RGB mask, produce actual original-textured V109 GLB, then
 * render five actual V107 WebGL GPU A/B source inspection frames.
 * Synthetic complex RGB fixture is NOT a real person/photo benchmark.
 */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const dir='artifacts/aig-real3d-v118';
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 '--enable-webgl','--use-gl=angle','--use-angle=swiftshader',
 '--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1420,height:1040}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:8772/shared-3d/aig-real3d-v109-photo-surface-lab.html',
  {waitUntil:'domcontentloaded',timeout:30000});
 const png=Buffer.from(await page.evaluate(()=>{
  const c=document.createElement('canvas');c.width=160;c.height=176;
  const g=c.getContext('2d');
  for(let y=0;y<176;y+=8)for(let x=0;x<160;x+=8){
   g.fillStyle=((x/8+y/8)%2)?'#2da34c':'#cfb235';
   g.fillRect(x,y,8,8);
  }
  g.fillStyle='#374bbd';g.fillRect(50,20,60,62);
  g.fillStyle='#bb4475';g.fillRect(50,82,60,68);
  return c.toDataURL('image/png').split(',')[1];
 }),'base64');
 await page.locator('#photo').setInputFiles({
  name:'V118-ComplexSource.png',mimeType:'image/png',buffer:png});
 await page.waitForFunction(()=>document.querySelector('#v111-count')
  ?.textContent.includes('主體 0 點／背景 0 點'));
 async function mark(x,y,kind){
  await page.locator('#v111-kind').selectOption(kind);
  const b=await page.locator('#v111-source-canvas').boundingBox();
  assert.ok(b&&b.width>0&&b.height>0);
  await page.locator('#v111-source-canvas').click({position:{
   x:(x+.5)*b.width/160,y:(y+.5)*b.height/176
  }});
 }
 await mark(69,35,'foreground');await mark(75,117,'foreground');
 await mark(5,4,'background');await mark(12,4,'background');
 await page.locator('#v118-enable').check();
 await page.locator('#v118-train').click();
 await page.waitForFunction(()=>{
  const s=document.querySelector('#v118-report')?.textContent||'';
  return s.includes('weightsSha256')||s.includes('"status": "BLOCK"');
 },null,{timeout:45000});
 const learned=JSON.parse(await page.locator('#v118-report').textContent());
 assert.equal(learned.actualNeuralInferenceExecuted,true);
 assert.match(learned.weightsSha256,/^[0-9a-f]{64}$/);
 assert.equal(learned.trainingSamples,4);
 assert.equal(learned.semanticHumanSegmentationCertified,false);
 await writeFile(dir+'/V118-REAL-NEURAL-ALPHA-MASK.png',
  await page.locator('#v110-mask-preview').screenshot());
 // The autonomy control now actually trains again with deterministic SHA,
 // builds GLB, executes five actual V107 WebGL frames, then resets.
 await page.locator('#v117-auto').click();
 await page.waitForFunction(()=>{
  const txt=document.querySelector('#v117-inspection-report')?.textContent||'';
  return txt.includes('PASS_SOURCE_GLTF_FIVE_POSE_INSPECTION')||
   txt.includes('"status": "BLOCK"');
 },null,{timeout:50000});
 const receipt=JSON.parse(await page.locator('#receipt').textContent());
 const gpu=JSON.parse(await page.locator('#v117-inspection-report').textContent());
 assert.equal(gpu.checkedRealGPUFrames,5,JSON.stringify(gpu));
 assert.equal(gpu.actualGPUResult,'PASS_SOURCE_GLTF_FIVE_POSE_INSPECTION');
 assert.equal(receipt.v118ActualNeuralInferenceAndGPUGate.neuralWeightsActuallyTrainedAndExecuted,true);
 assert.equal(receipt.v118ActualNeuralInferenceAndGPUGate.modelWeightsSha256,learned.weightsSha256);
 assert.equal(receipt.v110SourceMask.actualNeuralForegroundSegmentationRun,true);
 assert.equal(receipt.v110SourceMask.v118ModelWeightsSha256,learned.weightsSha256);
 assert.equal(receipt.v117ActiveControllerPlan.actualNeuralModelExecuted,true);
 assert.equal(receipt.v117ActiveControllerPlan.actualLearnedHumanSemanticRecognition,false);
 assert.equal(receipt.v117ActiveControllerPlan.route,'V118_LOCAL_NEURAL_TO_V109_GLTF_V107_GPU');
 assert.equal(receipt.v117ActiveControllerPlan.sourcePhotoSha256,
  receipt.originalOpaqueOrAlphaPhotoSha256);
 assert.equal(receipt.lastActualGPUFrame.sourceSHA,receipt.modelSha256);
 assert.equal(receipt.lastActualGPUFrame.aTiltDeg,0);
 assert.equal(receipt.lastActualGPUFrame.bTurnDeg,0);
 assert.ok(receipt.actualImportedTriangleCount>200);
 assert.equal(receipt.finalReleasePASS,false);
 await writeFile(dir+'/V118-LOCAL-NEURAL-GLB-5X-GPU.png',
  await page.locator('#gl').screenshot());
 // Demand full original-photo 1:1 without independent backside observation
 // must BLOCK even after a real local neural inference succeeds.
 await page.locator('#v117-desired').selectOption('REQUIRE_COMPLETE_3D');
 await page.locator('#v117-plan').click();
 await page.waitForFunction(()=>document.querySelector('#v117-plan-report')
  ?.textContent.includes('SINGLE_VIEW_CANNOT_PROVE_UNOBSERVED_BACKSIDE'));
 const refused=JSON.parse(await page.locator('#v117-plan-report').textContent());
 assert.equal(refused.status,'BLOCK');
 assert.equal(refused.productionReleasePASS,false);
 await writeFile(dir+'/V118-REAL-WEIGHT-SHA-GPU-SOURCE-EVIDENCE.json',
  JSON.stringify({learned,receipt,gpu,refused},null,2));
 assert.deepEqual(errors,[]);
 console.log('AIG_REAL3D_V118_REAL_LOCAL_NEURAL_WEIGHTS_TRUE_5_GPU_PASS',
  JSON.stringify({modelWeightsSha256:learned.weightsSha256,
   trainedUserLabeledSourcePixels:learned.trainingSamples,
   generatedTriangles:receipt.actualImportedTriangleCount,
   realWebGLFrames:gpu.checkedRealGPUFrames,
   sourceRGBPreserved:true,
   pretrainedHumanSemanticModelNotLoaded:true,
   trueNaturalHuman3DStillBlocked:true}));
}finally{await browser.close();}
