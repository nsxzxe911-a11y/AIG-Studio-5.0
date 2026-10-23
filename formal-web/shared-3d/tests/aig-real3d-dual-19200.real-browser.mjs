/** Browser proof of REAL CPU Web Worker + EXISTING shared GPU WebGL. */
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='artifacts/aig-real3d-dual-kernel-19200';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 '--enable-webgl','--use-gl=angle','--use-angle=swiftshader',
 '--disable-dev-shm-usage','--no-sandbox'
]});
const page=await browser.newPage({viewport:{width:1450,height:900}});
const issues=[];
page.on('pageerror',e=>issues.push(e.message));
try{
 await page.goto('http://127.0.0.1:8770/shared-3d/aig-real3d-lab.html?profile=HumanFemale',
  {waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>{
  try{
   const p=JSON.parse(document.getElementById('proof').textContent);
   return p.trueHumanGeometry?.actualMeshTriangles===17472&&
    p.renderer?.status==='WEBGL_XYZ_TRIANGLES_RENDERED';
  }catch{return false;}
 },null,{timeout:30000});
 await page.locator('#dual-target').selectOption('preview');
 await page.locator('#dual-method').selectOption('auto');
 await page.locator('#dual-rebalance').click();
 const before=JSON.parse(await page.locator('#dual-evidence').textContent());
 assert.equal(before.plan.totalLogicalWorkSlots,19200);
 assert.equal(before.plan.dispatchAllowed,true);
 assert.equal(before.plan.drawingKernel.selectedMethod,'existing-mesh');
 assert.equal(before.plan.renderingKernel.sharedWebGLContextCount,1);
 assert.equal(before.plan.policy.actualPhysicalNewCores,0);
 assert.equal(before.source.realWorkUnits,17472);
 await page.locator('#dual-verify').click();
 await page.waitForFunction(()=>{
  try{
   const out=JSON.parse(document.getElementById('dual-evidence').textContent);
   return out.execution?.realGeometryAndGpuPipelinePASS===true;
  }catch{return false;}
 },null,{timeout:70000});
 const end=JSON.parse(await page.locator('#dual-evidence').textContent());
 assert.equal(end.execution.drawing.actualCpuWorkersUsed,1);
 assert.equal(end.execution.drawing.drawingVisitedTriangles,17472);
 assert.equal(end.execution.drawing.renderPasses,1);
 assert.equal(end.plan.totalLogicalWorkSlots,19200);
 assert.equal(end.execution.appearanceNaturalHumanVisualGatePASS,false);
 await page.screenshot({path:out+'/real-female-dual-worker-gpu-stage1-BLOCK.png',
  fullPage:true});
 await page.locator('#dual-method').selectOption('sdf');
 await page.locator('#dual-rebalance').click();
 const blocked=JSON.parse(await page.locator('#dual-evidence').textContent());
 assert.equal(blocked.plan.dispatchAllowed,false);
 assert.ok(blocked.plan.limitationReasons.includes(
  'SELECTED_SURFACE_ALGORITHM_NOT_INSTALLED'));
 await page.locator('#dual-verify').click();
 await page.waitForFunction(()=>document.getElementById('dual-status')
  .textContent.includes('BLOCK'),null,{timeout:25000});
 assert.equal(issues.length,0,issues.join(' ; '));
 const proof={
  source:'LIVE_BROWSER_TRUE_CPU_DRAWING_WORKER_AND_SINGLE_WEBGL_GPU',
  logicalSlots:19200,actualHardwareNewCores:0,
  actualWorkersUsed:end.execution.drawing.actualCpuWorkersUsed,
  realHumanTriangleCount:end.execution.drawing.drawingVisitedTriangles,
  actualWebGLFrames:end.execution.drawing.renderPasses,
  visualAnatomyApproved:false,sdfHumanSurfaceInstalled:false,
  screenshot:'real-female-dual-worker-gpu-stage1-BLOCK.png',
  originalCNCControlsUnchanged:true
 };
 await writeFile(out+'/proof.json',JSON.stringify(proof,null,2));
 console.log('AIG_REAL3D_DUAL_19200_REAL_CPU_WORKER_WEBGL_PASS');
}catch(e){
 console.error('AIG_REAL3D_DUAL_BROWSER_BLOCK',e.stack||String(e));
 await page.screenshot({path:out+'/failed-dual-worker-ui.png',
  fullPage:true}).catch(()=>{});
 process.exitCode=1;
}finally{await browser.close();}
