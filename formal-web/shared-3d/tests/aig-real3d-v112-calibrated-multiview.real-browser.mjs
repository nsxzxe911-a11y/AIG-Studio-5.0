/**
 * V112 true Chromium WebGL: two independently encoded PNGs + calibrated
 * actual metric-depth arrays, 3 landmarks, native two-material GLB, V107 AB.
 * Synthetic planar fixture proves the pipeline, NOT captured human depth.
 */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const dir='artifacts/aig-real3d-v112';
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 '--enable-webgl','--use-gl=angle','--use-angle=swiftshader',
 '--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1400,height:1030}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const world=x=>[1,0,0,0,0,1,0,0,0,0,1,0,x,0,0,1];
try{
 await page.goto('http://127.0.0.1:8772/shared-3d/aig-real3d-v112-calibrated-multiview-lab.html',
  {waitUntil:'domcontentloaded',timeout:30000});
 const p=await page.evaluate(()=>{
  function png(n){
   const c=document.createElement('canvas');c.width=32;c.height=32;
   const g=c.getContext('2d');g.fillStyle=n?'#c7855d':'#4386c3';
   g.fillRect(0,0,32,32);
   g.fillStyle=n?'#ffdb7e':'#77d6f1';g.fillRect(8,5,17,21);
   return c.toDataURL('image/png').split(',')[1];
  }
  return [png(0),png(1)];
 });
 for(let i=0;i<2;i++){
  await page.locator('#v112-photo-'+i).setInputFiles({
   name:'MeasuredColorCamera'+i+'.png',mimeType:'image/png',
   buffer:Buffer.from(p[i],'base64')
  });
  const d={width:32,height:32,depthUnit:'MM',measuredWithDepthSensor:true,
   captureSourceId:'INDEPENDENT_DEPTH_FIXTURE_'+i,
   valuesMM:Array(32*32).fill(1000)};
  await page.locator('#v112-depth-'+i).setInputFiles({
   name:'MeasuredDepthCamera'+i+'.json',mimeType:'application/json',
   buffer:Buffer.from(JSON.stringify(d))
  });
 }
 const calibration={
  views:[0,20].map(tx=>({
   intrinsics:{fxPx:100,fyPx:100,cxPx:15.5,cyPx:15.5},
   cameraToWorldMM:world(tx)})),
  correspondences:[
   {x0:10,y0:10,x1:8,y1:10},
   {x0:22,y0:10,x1:20,y1:10},
   {x0:10,y0:22,x1:8,y1:22}
  ],step:2,maxSurfaceEdgeMM:35,maxCorrespondenceRmsMM:1
 };
 await page.locator('#v112-calibration').fill(JSON.stringify(calibration,null,2));
 // This is a synthetic sensor benchmark, not proof of external calibration.
 await page.locator('#v112-build').click();
 await page.waitForFunction(()=>document.querySelector('#status')
  ?.textContent.includes('V112_CALIBRATED_PHYSICAL_DEPTH_DECLARATION_NOT_CONFIRMED'));
 assert.match(await page.locator('#status').textContent(),/BLOCK/);
 await page.locator('#v112-calibration-confirm').check();
 await page.locator('#v112-build').click();
 await page.waitForFunction(()=>{
  const t=document.querySelector('#status')?.textContent||'';
  return t.includes('V112 真 WebGL 顯示兩片來源幾何')||t.startsWith('BLOCK');
 },null,{timeout:45000});
 const base=JSON.parse(await page.locator('#v112-report').textContent());
 assert.equal(base.viewCount,2,JSON.stringify(base));
 assert.equal(base.cameraBaselineMM,20);
 assert.equal(base.sharedLandmarksChecked,3);
 assert.equal(base.landmarkRegistrationRmsMM,0);
 assert.equal(base.trueNativeImportedTriangles,base.observedTriangleCount);
 assert.ok(base.trueNativeImportedTriangles>500);
 assert.equal(base.sourceMeshTopology,
  'TWO_REGISTERED_OBSERVED_SURFACE_PATCHES_NOT_WATERTIGHT');
 assert.equal(base.unknownBacksideKeptUnknown,true);
 assert.equal(base.externalDepthCalibrationEvidenceVerified,false);
 assert.equal(base.actualGPU.drawStatus,'WEBGL_XYZ_TRIANGLES_RENDERED');
 assert.equal(base.actualGPU.aTiltDeg,0);
 assert.equal(base.actualGPU.bTurnDeg,0);
 assert.equal(base.full1to1ReleaseGate,'BLOCK_UNOBSERVED_AND_UNCERTIFIED_SURFACES');
 assert.equal(base.v113OverlapSeamAndMaterial.geometryOverlapStatus,
  'PASS_OBSERVED_DEPTH_SEAM_ONLY');
 assert.equal(base.v113OverlapSeamAndMaterial.overlapRmsMM,0);
 assert.equal(base.v113OverlapSeamAndMaterial.directionCount,2);
 assert.equal(base.v113OverlapSeamAndMaterial.researchGate,
  'PASS_OBSERVED_SEAM_CONSISTENCY');
 assert.equal(base.v113OverlapSeamAndMaterial.materialDifferenceStatus,
  'WARN_RAW_COLOR_DIFFERENCE_EXPOSURE_OR_MATERIAL');
 const diagnostic=await page.locator('#v113-seam-mask').screenshot();
 await writeFile(dir+'/V113-SYNTHETIC-MEASURED-SEAM-HEATMAP.png',diagnostic);
 const neutral=await page.locator('#v112-gl').screenshot();
 await writeFile(dir+'/V112-TWO-CALIBRATED-SOURCE-VIEWS-A0-B0.png',neutral);
 await page.evaluate(()=>{
  for(const [key,value] of [
   ['v112-a','90'],['v112-b','120'],['v112-slice','75']
  ]){
   const el=document.getElementById(key);
   el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));
  }
 });
 const posed=JSON.parse(await page.locator('#v112-report').textContent());
 assert.equal(posed.actualGPU.aTiltDeg,90);
 assert.equal(posed.actualGPU.bTurnDeg,120);
 assert.equal(posed.actualGPU.progress,.75);
 assert.equal(posed.actualGPU.actualSourceSHA,base.actualModelSourceSha256);
 const tilted=await page.locator('#v112-gl').screenshot();
 assert.notDeepEqual(neutral,tilted);
 await writeFile(dir+'/V112-A90-B120-75PC-TWO-OBSERVED-SURFACES.png',tilted);
 await page.locator('#v112-reset').click();
 const reset=JSON.parse(await page.locator('#v112-report').textContent());
 assert.equal(reset.actualGPU.aTiltDeg,0);
 assert.equal(reset.actualGPU.bTurnDeg,0);
 assert.equal(reset.actualGPU.progress,1);
 assert.equal(reset.actualModelSourceSha256,base.actualModelSourceSha256);
 // A sparse 9mm depth outlier not included among shared landmarks must be
 // caught by V113 dense bidirectional surface overlap -- V112 point Gate alone
 // would still certify the three unchanged landmark pairs.
 const inconsistentDepth={width:32,height:32,depthUnit:'MM',
  measuredWithDepthSensor:true,captureSourceId:'INDEPENDENT_DEPTH_FIXTURE_1',
  valuesMM:Array(32*32).fill(1000)};
 inconsistentDepth.valuesMM[14*32+14]=1009;
 await page.locator('#v112-depth-1').setInputFiles({
  name:'MeasuredDepthCamera1Outlier.json',mimeType:'application/json',
  buffer:Buffer.from(JSON.stringify(inconsistentDepth))
 });
 await page.locator('#v112-build').click();
 await page.waitForFunction(()=>document.querySelector('#status')
  ?.textContent.includes('V113_BLOCK_OVERLAP_SURFACE_DEPTH_CONTRADICTION'),
  null,{timeout:30000});
 const v113Rejected=JSON.parse(await page.locator('#v112-report').textContent());
 assert.equal(v113Rejected.status,'BLOCK');
 // Restore source depth and prove new Gate does not contaminate next source.
 inconsistentDepth.valuesMM[14*32+14]=1000;
 await page.locator('#v112-depth-1').setInputFiles({
  name:'MeasuredDepthCamera1Restored.json',mimeType:'application/json',
  buffer:Buffer.from(JSON.stringify(inconsistentDepth))
 });
 // Deliberate incorrect camera pose must cause BLOCK without a fake scene.
 calibration.views[1].cameraToWorldMM=world(70);
 await page.locator('#v112-calibration').fill(JSON.stringify(calibration));
 await page.locator('#v112-build').click();
 await page.waitForFunction(()=>document.querySelector('#status')
  ?.textContent.includes('CAMERA_WORLD_ALIGNMENT_OR_LANDMARK_DEPTH_CONTRADICTED'));
 assert.match(await page.locator('#status').textContent(),/BLOCK/);
 const refused=JSON.parse(await page.locator('#v112-report').textContent());
 assert.equal(refused.status,'BLOCK');
 await writeFile(dir+'/V112-SOURCE-POSE-GLB-GPU-AND-BLOCK-RECEIPT.json',
  JSON.stringify({base,posed,reset,v113Rejected,refused},null,2));
 assert.deepEqual(errors,[]);
 console.log('AIG_REAL3D_V112_TWO_CALIBRATED_DEPTH_VIEWS_LANDMARKS_TRUE_WEBGL_5AX_PASS',
  JSON.stringify({triangles:base.observedTriangleCount,
   landmarks:base.sharedLandmarksChecked,
   maxRegistrationResidualMM:base.landmarkRegistrationMaxMM,
   wrongCalibrationBlocked:true,V113DenseLocalOutlierBlocked:true,
   V113ColorSeamWarnedNotRecolored:true,
   syntheticDepthFixtureNotRealScan:true,
   human1to1ModelNotCertified:true}));
}finally{await browser.close();}
