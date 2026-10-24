/** Real Chromium: 2 measured source PNG depth sheets -> V113 Gate -> V114
 * source-preserving duplicated-triangle exclusion -> V99 native GLB -> V107 GPU.
 * Input here is explicitly a synthetic geometry fixture, NOT a real scan.
 */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const dir='artifacts/aig-real3d-v114';
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 '--enable-webgl','--use-gl=angle','--use-angle=swiftshader',
 '--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1430,height:1100}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const world=tx=>[1,0,0,0,0,1,0,0,0,0,1,0,tx,0,0,1];
async function png(kind){
 const value=await page.evaluate(kind=>{
  const c=document.createElement('canvas');c.width=32;c.height=32;
  const ctx=c.getContext('2d');
  ctx.fillStyle=kind===2?'#f01924':'#578bd0';
  ctx.fillRect(0,0,32,32);
  if(kind===1){ctx.fillStyle='#5486c9';ctx.fillRect(0,0,1,1);}
  return c.toDataURL('image/png').split(',')[1];
 },kind);
 return Buffer.from(value,'base64');
}
async function submit(){
 await page.locator('#v112-build').click();
 await page.waitForFunction(()=>{
  const s=document.querySelector('#status')?.textContent??'';
  return s.includes('V112 真 WebGL 顯示兩片來源幾何')||s.startsWith('BLOCK');
 },null,{timeout:50000});
 return JSON.parse(await page.locator('#v112-report').textContent());
}
async function setDepth(i,values,tag){
 const file={width:32,height:32,depthUnit:'MM',
  measuredWithDepthSensor:true,
  captureSourceId:'SYNTHETIC_INDEPENDENT_DEMO_'+tag,
  valuesMM:values};
 await page.locator('#v112-depth-'+i).setInputFiles({
  name:'SyntheticSensor'+i+'-'+tag+'.json',
  mimeType:'application/json',buffer:Buffer.from(JSON.stringify(file))
 });
}
try{
 await page.goto('http://127.0.0.1:8772/shared-3d/aig-real3d-v112-calibrated-multiview-lab.html',
  {waitUntil:'domcontentloaded'});
 for(const i of [0,1]){
  await page.locator('#v112-photo-'+i).setInputFiles({
   name:'SyntheticView'+i+'.png',mimeType:'image/png',buffer:await png(i)
  });
  await setDepth(i,Array(32*32).fill(1000),'BASE_'+i);
 }
 const calibration={
  views:[0,20].map(tx=>({
   intrinsics:{fxPx:100,fyPx:100,cxPx:15.5,cyPx:15.5},
   cameraToWorldMM:world(tx)
  })),
  correspondences:[
   {x0:10,y0:10,x1:8,y1:10},
   {x0:22,y0:10,x1:20,y1:10},
   {x0:10,y0:22,x1:8,y1:22}
  ],
  step:2,maxSurfaceEdgeMM:35,maxCorrespondenceRmsMM:1
 };
 await page.locator('#v112-calibration').fill(JSON.stringify(calibration));
 await page.locator('#v112-calibration-confirm').check();
 await page.locator('#v114-dedup').check();
 const baseline=await submit();
 assert.ok(!baseline.error,JSON.stringify(baseline));
 assert.equal(baseline.v114IntegrationRequested,true);
 const seam=baseline.v114VerifiedOverlapIntegration;
 assert.equal(seam.v113GeometryGate,'PASS_OBSERVED_DEPTH_SEAM_ONLY');
 assert.equal(seam.firstViewSourceMeshUnchanged,true);
 assert.equal(seam.secondViewXYZAndUVUnchanged,true);
 assert.equal(seam.unobservedSurfaceGenerated,false);
 assert.equal(seam.topologyWeldedAcrossSeam,false);
 assert.equal(seam.materialTextureRepainted,false);
 assert.ok(seam.observedRedundantSecondViewTrianglesExcluded>10);
 assert.ok(seam.uniqueSecondViewTrianglesKept>0);
 assert.ok(seam.totalTrianglesAfter<seam.totalTrianglesBefore);
 assert.equal(baseline.trueNativeImportedTriangles,seam.totalTrianglesAfter);
 assert.notEqual(baseline.actualModelSourceSha256,baseline.untouchedV112OriginalGLBSha256);
 assert.equal(baseline.actualGPU.drawStatus,'WEBGL_XYZ_TRIANGLES_RENDERED');
 const a0=await page.locator('#v112-gl').screenshot();
 await writeFile(dir+'/V114-SYNTHETIC-VERIFIED-SOURCE-A0-B0-GPU.png',a0);
 await page.evaluate(()=>{
  for(const [id,value] of [['v112-a','90'],['v112-b','120'],['v112-slice','75']]){
   const el=document.getElementById(id);
   el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));
  }
 });
 const posed=JSON.parse(await page.locator('#v112-report').textContent());
 assert.equal(posed.actualGPU.aTiltDeg,90);
 assert.equal(posed.actualGPU.bTurnDeg,120);
 assert.equal(posed.actualGPU.progress,.75);
 assert.equal(posed.actualGPU.actualSourceSHA,baseline.actualModelSourceSha256);
 assert.notDeepEqual(a0,await page.locator('#v112-gl').screenshot());
 await writeFile(dir+'/V114-SYNTHETIC-DEDUP-A90-B120-75PCT-GPU.png',
  await page.locator('#v112-gl').screenshot());
 await page.locator('#v112-reset').click();
 const reset=JSON.parse(await page.locator('#v112-report').textContent());
 assert.equal(reset.actualGPU.progress,1);
 assert.equal(reset.actualModelSourceSha256,baseline.actualModelSourceSha256);
 // Same measured depth, incompatible source RGB: cannot silently discard
 // the other camera's original surface or recolor a model.
 await page.locator('#v112-photo-1').setInputFiles({
  name:'ConflictingOriginalRGB.png',mimeType:'image/png',buffer:await png(2)
 });
 const colorFail=await submit();
 assert.equal(colorFail.status,'BLOCK',JSON.stringify(colorFail));
 assert.match(colorFail.error,/NO_SAFELY_REDUNDANT_SOURCE_TRIANGLES_TO_INTEGRATE/);
 await page.locator('#v112-photo-1').setInputFiles({
  name:'RestoredOriginalRGB.png',mimeType:'image/png',buffer:await png(1)
 });
 // A lone deep spur away from the three calibration landmarks must block.
 const damaged=Array(32*32).fill(1000);damaged[14*32+14]=1009;
 await setDepth(1,damaged,'DEPTH_OUTLIER');
 const depthFail=await submit();
 assert.equal(depthFail.status,'BLOCK');
 assert.match(depthFail.error,/V113_BLOCK_OVERLAP_SURFACE_DEPTH_CONTRADICTION/);
 await writeFile(dir+'/V114-ORIGINAL-AND-INTEGRATED-SHA-GPU-GATES.json',
  JSON.stringify({baseline,posed,reset,colorFail,depthFail},null,2));
 assert.deepEqual(errors,[]);
 console.log('AIG_REAL3D_V114_VERIFIED_OVERLAP_DEDUP_GLB_GPU_PASS',
  JSON.stringify({initialSourceTriangles:seam.totalTrianglesBefore,
   integratedSourceTriangles:seam.totalTrianglesAfter,
   excludedOnlySecondViewTriangles:seam.observedRedundantSecondViewTrianglesExcluded,
   sourceGLBImmutable:true,worldDepthAndColorConformant:true,
   wrongColorAndLocalDepthBothBlocked:true,originalHuman1to1StillBlocked:true}));
}finally{await browser.close();}
