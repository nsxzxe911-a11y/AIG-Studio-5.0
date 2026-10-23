import {chromium} from 'playwright';
import {mkdir,copyFile,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

const root='artifacts/aig-real3d-template-morph-actual-gpu';
await mkdir(root,{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 '--enable-webgl','--use-gl=angle','--use-angle=swiftshader',
 '--no-sandbox','--disable-dev-shm-usage'
]});
const page=await browser.newPage({viewport:{width:1360,height:860},
 deviceScaleFactor:1,acceptDownloads:true});
const errors=[],screens=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:8771/shared-3d/aig-real3d-template-lab.html',{
  waitUntil:'domcontentloaded',timeout:30000});
 await page.locator('#compare').click();
 await page.waitForFunction(()=>{
  const status=document.querySelector('#state')?.textContent||'';
  return document.querySelector('#state')?.dataset.ok==='true'||
   status.startsWith('程式／真幾何／GPU BLOCK');
 },null,{timeout:250000});
 const status=await page.locator('#state').textContent();
 assert.equal(await page.locator('#state').getAttribute('data-ok'),'true',
  'Real A/B renderer must not claim success when blocked: '+status);
 const p=JSON.parse(await page.locator('#proof').textContent());
 assert.equal(p.schema,'AIG_REAL3D_SINGLE_CAGE_ANATOMICAL_TEMPLATE_V1');
 assert.equal(p.completed,4);
 assert.equal(p.expected,4);
 assert.equal(p.stage1HumanNaturalProportionsPASS,false);
 for(const gender of ['female','male'])
 for(const method of ['template-morph','subdivision']){
  const card=page.locator(
   '#gallery figure[data-real3d-gender="'+gender+
   '"][data-real3d-surface-method="'+method+'"]');
  assert.equal(await card.count(),1,'true unique method and sex');
  await page.waitForFunction(([g,m])=>{
   const img=document.querySelector(
    '#gallery figure[data-real3d-gender="'+g+
    '"][data-real3d-surface-method="'+m+'"] img');
   return img?.complete&&img.naturalWidth===1080&&img.naturalHeight===1920;
  },[gender,method],{timeout:25000});
  const rec=p.candidates.find(x=>x.gender===gender&&x.method===method);
  assert.equal(rec.geometry.actualConnectedComponents,1);
  assert.equal(rec.geometry.nonManifoldEdges,0);
  assert.equal(rec.geometry.topologyContinuousPASS,true);
  assert.equal(rec.geometry.naturalHumanAppearancePASS,false);
  assert.equal(rec.actualCpuWorker,1);
  assert.equal(rec.sharedGpuRenderPass,1);
  assert.equal(rec.dualLogicalWorkSlots,19200);
  assert.equal(rec.trueFramebufferReadback,true);
  assert.equal(rec.frameWidth,1080);assert.equal(rec.frameHeight,1920);
  const dl=page.waitForEvent('download',{timeout:30000});
  await card.locator('a').click();
  const download=await dl;
  const file=await download.path();
  const png=await readFile(file);
  assert.equal(png.readUInt32BE(0),0x89504e47);
  assert.equal(png.readUInt32BE(16),1080);
  assert.equal(png.readUInt32BE(20),1920);
  const sha=createHash('sha256').update(png).digest('hex');
  assert.equal(sha,rec.sha256);
  const name=gender+'-'+method+'-FRONT-1080x1920-ACTUAL-GPU.png';
  await copyFile(file,root+'/'+name);
  screens.push({gender,method,name,sha256:sha,
   nativePixels:[1080,1920],actualGpu:true,
   stage1HumanAppearancePASS:false});
 }
 assert.equal(new Set(screens.map(s=>s.sha256)).size,4);
 assert.deepEqual(errors,[]);
 await page.screenshot({path:root+'/AIG-REAL3D-TEMPLATE-SUBDIVISION-4UP-WORKBENCH.png',
  fullPage:true,timeout:60000});
 await writeFile(root+'/manifest.json',JSON.stringify({
  schema:'AIG_REAL3D_SINGLE_CAGE_ANATOMICAL_TEMPLATE_V1',
  fourTrueGPUImages:screens,
  oldSdfMetaballRetired:true,
  duplicateDemoModelUsed:false,
  actual19200DrawingRenderingPipeline:true,
  visuallyApproved:false,
  releasePASS:false
 },null,2));
 console.log('REAL3D_TEMPLATE_MORPH_SUBDIVISION_4_GPU_SNAPSHOTS_PASS');
}catch(e){
 console.error('REAL3D_TEMPLATE_GPU_FAIL',e.stack||String(e));
 await page.screenshot({path:root+'/FAILED-TEMPLATE-MORPH.png',
  fullPage:true,timeout:30000}).catch(()=>{});
 process.exitCode=1;
}finally{await browser.close();}
