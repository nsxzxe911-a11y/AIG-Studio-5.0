/** Four REAL GPU front-view 1080x1920 PNG: male/female × SDF/metaball. */
import {chromium} from 'playwright';
import {mkdir,copyFile,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

const root='artifacts/aig-real3d-sdf-metaball-genuine-gpu';
await mkdir(root,{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 '--enable-webgl','--use-gl=angle','--use-angle=swiftshader',
 '--no-sandbox','--disable-dev-shm-usage'
]});
const page=await browser.newPage({
 viewport:{width:1450,height:920},deviceScaleFactor:1,acceptDownloads:true
});
const errors=[],files=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:8770/shared-3d/aig-real3d-surface-lab.html',{
  waitUntil:'domcontentloaded',timeout:30000});
 await page.locator('#grid-quality').selectOption('standard');
 await page.locator('#compare').click();
 await page.waitForFunction(()=>{
  const text=document.querySelector('#state')?.textContent||'';
  const count=document.querySelectorAll('#gallery figure').length;
  return (document.querySelector('#state')?.dataset.ok==='true'&&count===4)||
   text.startsWith('幾何或 GPU BLOCK');
 },null,{timeout:200000});
 const state=await page.locator('#state').textContent();
 assert.ok(!state.includes('BLOCK：')&&!state.includes('GPU BLOCK'),state);
 const proof=JSON.parse(await page.locator('#proof').textContent());
 assert.equal(proof.realCompleted,4);
 assert.equal(proof.expected,4);
 assert.equal(proof.sameNativeCameraAndPNG,true);
 assert.equal(proof.automaticHumanApproval,false);
 for(const gender of ['female','male'])
  for(const method of ['sdf','metaball']){
   const f=page.locator(
    '#gallery figure[data-real3d-gender="'+gender+'"][data-real3d-surface-method="'+method+'"]');
   assert.equal(await f.count(),1);
   const p=proof.candidates.find(x=>x.gender===gender&&x.method===method);
   assert.ok(p,'candidate proof missing');
   assert.equal(p.geometry.surfaceConnectedComponents,1);
   assert.equal(p.geometry.nonManifoldEdges,0);
   assert.equal(p.geometry.actualContinuousSurfaceTopologicalPASS,true);
   assert.equal(p.realGPUPixelsRead,true);
   assert.equal(p.bodyAppearanceVisualApproval,false);
   assert.equal(p.cpuWork.actualCpuWorkersUsed,1);
   assert.equal(p.cpuWork.renderPasses,1);
   assert.ok(p.geometry.extractedTriangleCount>5000);
   const image=f.locator('img');
   await page.waitForFunction(([gender,method])=>{
    const img=document.querySelector(
     '#gallery figure[data-real3d-gender="'+gender+
     '"][data-real3d-surface-method="'+method+'"] img');
    return img?.complete&&img.naturalWidth===1080&&img.naturalHeight===1920;
   },[gender,method],{timeout:25000});
   const dl=page.waitForEvent('download',{timeout:25000});
   await f.locator('a').click();
   const download=await dl;
   const bytes=await readFile(await download.path());
   assert.equal(bytes.readUInt32BE(0),0x89504e47);
   assert.equal(bytes.readUInt32BE(16),1080);
   assert.equal(bytes.readUInt32BE(20),1920);
   const sha=createHash('sha256').update(bytes).digest('hex');
   assert.equal(p.sha256,sha);
   const filename=gender+'-'+method+'-TRUE-GPU-FRONT-1080x1920.png';
   await copyFile(await download.path(),root+'/'+filename);
   files.push({gender,method,filename,sha256:sha,pixels:[1080,1920],
    triangles:p.geometry.extractedTriangleCount,
    connectedComponents:p.geometry.surfaceConnectedComponents,
    appearanceVisuallyApproved:false});
  }
 assert.equal(new Set(files.map(x=>x.sha256)).size,4,
  'four independent rendered images not one fake screenshot');
 assert.deepEqual(errors,[]);
 await page.screenshot({path:root+'/webgl-4up-actual-comparison.png',
  fullPage:true,timeout:60000});
 await writeFile(root+'/manifest.json',JSON.stringify({
  schema:'AIG_REAL3D_SDF_METABALL_TRUE_ISOSURFACE_V1',
  actualWebGLRenderer:true,actualCpuWorker:true,
  sameNative1080x1920AndFrontCamera:true,
  sourceMaleFemaleIsOriginalStage1JointGeometry:true,
  visualNaturalBodyAcceptance:false,stage1ReleasePASS:false,
  candidateImages:files
 },null,2));
 console.log('REAL_SDF_METABALL_4_TRUE_WEBGL_BODY_SNAPSHOTS_PASS');
}catch(e){
 console.error('REAL_SDF_METABALL_GPU_BLOCK',e.stack||String(e));
 await page.screenshot({path:root+'/FAILED-A-B-WORKSPACE.png',
  fullPage:true,timeout:30000}).catch(()=>{});
 process.exitCode=1;
}finally{
 await browser.close();
}
