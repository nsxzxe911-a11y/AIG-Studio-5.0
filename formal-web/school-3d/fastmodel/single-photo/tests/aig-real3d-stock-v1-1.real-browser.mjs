import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

const dir='artifacts/aig-shared-real3d-stock-v1-1';
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 '--no-sandbox','--disable-dev-shm-usage',
 '--enable-webgl','--use-gl=angle','--use-angle=swiftshader',
 '--enable-unsafe-swiftshader'
]});
try{
 for(const device of [
  {name:'phone',viewport:{width:360,height:780},isMobile:true,hasTouch:true},
  {name:'desktop',viewport:{width:1440,height:900}}
 ]){
  const page=await browser.newPage({...device,deviceScaleFactor:1});
  page.setDefaultTimeout(23000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const evidence=()=>page.locator('#proof').evaluate(e=>JSON.parse(e.textContent));
  const screen=()=>page.locator('#view').evaluate(e=>e.toDataURL('image/png'));
  try{
   await page.goto('http://127.0.0.1:8765/shared-3d/aig-real3d-stock-lab.html',{waitUntil:'load'});
   await page.waitForFunction(()=>{
    try{
     const d=JSON.parse(document.getElementById('proof').textContent);
     return d.render.status==='WEBGL_XYZ_TRIANGLES_RENDERED'&&d.stock.originalMm3===576;
    }catch{return false;}
   },null,{timeout:16000});
   const initial=await evidence();
   assert.equal(initial.stock.removedMm3,0);
   assert.equal(initial.stock.remainingMm3,576);
   assert.equal(initial.ncFeedRateAndAxisKinematicsVerified,false);
   assert.ok(initial.render.allocatedFramePixels<=780000);
   const original=await screen();
   await page.locator('#rapid').click();
   const rapid=await evidence();
   assert.equal(rapid.lastAction.safeRapidDoesNotRemoveStock,true);
   assert.equal(rapid.stock.removedMm3,0);
   assert.equal(rapid.stock.revision,0);
   await page.locator('#feed').click();
   await page.waitForFunction(()=>{
    try{return JSON.parse(document.getElementById('proof').textContent).stock.removedMm3===92;}
    catch{return false;}
   },null,{timeout:12000});
   const cut=await evidence();
   assert.equal(cut.stock.removedCells,736);
   assert.equal(cut.stock.remainingMm3,484);
   assert.equal(cut.stock.originalMm3,
    cut.stock.remainingMm3+cut.stock.removedMm3);
   assert.equal(cut.lastAction.motion,'G1');
   assert.equal(cut.render.status,'WEBGL_XYZ_TRIANGLES_RENDERED');
   assert.equal(cut.render.removalNotImplemented,true,
    'Legacy renderer does not itself calculate volume; new stock core does');
   assert.equal(cut.liveFanucMachineConnection,false);
   const changed=await screen();
   assert.notEqual(original,changed,
    'real GPU stock surface must change after source 3D occupancy feed cut');
   await page.locator('#feed').click();
   const next=await evidence();
   assert.ok(next.stock.removedMm3>=92);
   assert.ok(next.stock.remainingCells<initial.stock.remainingCells);
   assert.equal(next.history.filter(x=>x.motion==='G1').length,2);
   await page.locator('#reset').click();
   await page.waitForFunction(()=>{
    try{return JSON.parse(document.getElementById('proof').textContent).stock.removedMm3===0;}
    catch{return false;}
   },null,{timeout:14000});
   const reset=await evidence();
   assert.equal(reset.stock.remainingMm3,576);
   assert.equal(reset.stock.removedCells,0);
   await page.screenshot({path:dir+'/'+device.name+'-true-3d-numerical-voxel.png',fullPage:true});
   assert.deepEqual(errors,[]);
   await writeFile(dir+'/'+device.name+'-evidence.json',JSON.stringify({
    device:device.name,source:'SYNTHETIC_MM_VOXEL_FIXTURE',
    gpuWebGLActuallyRendered:true,
    g0DidNotRemoveMaterial:true,
    g1ActualVoxelMm3Removed:cut.stock.removedMm3,
    voxelGridMm:cut.stock.voxelMm,
    regenerated3DBoundaryTriangles:cut.render.triangles,
    alteredGPUCanvasPixels:original!==changed,
    physicalFanucNCNotTested:true,
    realNativeDeviceFPSNotMeasured:true
   },null,2)+'\n');
   console.log('AIG_SHARED_REAL3D_V1_1_VOXEL_G1_G0_TRUE_3D_BROWSER_PASS',
    device.name,cut.stock.removedMm3,cut.render.triangles);
  }catch(e){
   await page.screenshot({path:dir+'/'+device.name+'-FAIL.png',fullPage:true}).catch(()=>{});
   const proof=(await page.locator('#proof').textContent().catch(()=>''))?.slice(0,1100);
   throw Error(device.name+' '+e.message+' proof='+proof+' errors='+JSON.stringify(errors));
  }finally{await page.close();}
 }
}finally{await browser.close();}
