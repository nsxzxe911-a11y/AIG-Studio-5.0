/** Browser evidence: real NC source text -> fail-closed parse -> real WebGL
 * bounded voxel G1 removal with visible 3D geometry change. Synthetic NC
 * fixture only; definitely not a verified Fanuc NC program or real machine.
 */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const dir='artifacts/aig-real3d-nc-v1-2';await mkdir(dir,{recursive:true});
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
  page.setDefaultTimeout(27000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const proof=async()=>JSON.parse(await page.locator('#evidence').textContent());
  const pix=()=>page.locator('#view').evaluate(c=>c.toDataURL('image/png'));
  try{
   await page.goto('http://127.0.0.1:8765/shared-3d/aig-real3d-nc-lab.html',{waitUntil:'load'});
   await page.waitForFunction(()=>{
    try{
     const x=JSON.parse(document.getElementById('evidence').textContent);
     return x.rendered.status==='WEBGL_XYZ_TRIANGLES_RENDERED'&&x.removedMm3===0;
    }catch{return false;}
   },null,{timeout:17000});
   assert.equal(await page.locator('#simulate').isDisabled(),true);
   const original=await pix();
   await page.locator('#parse').click();
   await page.waitForFunction(()=>!document.getElementById('simulate').disabled);
   let info=await proof();
   assert.equal(info.parsed.feedSegments,2);
   assert.equal(info.parsed.rapidSegments,1);
   assert.equal(info.machineCommandsSent,0);
   assert.equal(info.removedMm3,0);
   assert.ok(info.rendered.allocatedFramePixels<=780000);
   await page.locator('#simulate').click();
   await page.waitForFunction(()=>{
    try{return JSON.parse(document.getElementById('evidence').textContent).removedMm3>0;}
    catch{return false;}
   },null,{timeout:20000});
   info=await proof();
   assert.equal(info.stockMeshChangedAfterG1Feed,true);
   assert.equal(info.G0NeverCuts,true);
   assert.equal(info.machineCommandsSent,0);
   assert.equal(info.completeFanucNCParsing,false);
   assert.ok(info.removedMm3>10);
   const altered=await pix();
   assert.notEqual(original,altered);
   await page.locator('#nc').fill([
    'G21 G90 G54','S2000 M3','G0 X0 Y0 Z10',
    'G83 Z-5 Q2 F150','M30'
   ].join('\n'));
   assert.equal(await page.locator('#simulate').isDisabled(),true);
   await page.locator('#parse').click();
   assert.match(await page.locator('#status').textContent(),/BLOCKED/);
   assert.equal(await page.locator('#simulate').isDisabled(),true);
   await page.locator('#reset').click();
   await page.waitForFunction(()=>{
    try{return JSON.parse(document.getElementById('evidence').textContent).removedMm3===0;}
    catch{return false;}
   });
   await page.screenshot({path:dir+'/'+device.name+'-real-source-nc-webgl.png',fullPage:true});
   await writeFile(dir+'/'+device.name+'-evidence.json',JSON.stringify({
    device:device.name,
    localNCWorkingCopyActuallyParsed:true,
    G83OrUnsupportedCNCCommandBlocked:true,
    workingCopyWasNeverMachineExecutable:true,
    G0NeverRemoves:true,
    G1ChangesActualVoxelOccupancy:true,
    removedMm3:info.removedMm3,
    GLPixelsChangedOnActualVoxelRemoval:original!==altered,
    nativeAPKEXEAndFanucNotTested:true
   },null,2)+'\n');
   assert.deepEqual(errors,[]);
   console.log('AIG_REAL3D_1_2_LIMITED_NC_G0_G1_TRUE_VOXEL_BROWSER_PASS',
    device.name,info.removedMm3,info.rendered.triangles);
  }catch(e){
   await page.screenshot({path:dir+'/'+device.name+'-FAIL.png',fullPage:true}).catch(()=>{});
   const status=await page.locator('#status').textContent().catch(()=>null);
   const trace=(await page.locator('#evidence').textContent().catch(()=>null))?.slice(0,1000);
   throw Error(device.name+' '+e.message+' status='+status+
    ' evidence='+trace+' errors='+JSON.stringify(errors));
  }finally{await page.close();}
 }
}finally{await browser.close();}
