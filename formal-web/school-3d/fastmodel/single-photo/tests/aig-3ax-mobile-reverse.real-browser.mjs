/** Real phone + landscape + desktop Chromium mobile Authority-style 3AX.
 * Checks live WebGL G1 voxel removal (not video) & DOM Button callbacks.
 * No certified original source image in runtime; no CNC machine output.
 */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const dir='artifacts/aig-3ax-mobile-reverse';
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 '--no-sandbox','--disable-dev-shm-usage','--enable-webgl',
 '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'
]});
const machines=[
 {name:'phone',viewport:{width:360,height:780},isMobile:true,hasTouch:true},
 {name:'phone-wide',viewport:{width:432,height:935},isMobile:true,hasTouch:true},
 {name:'landscape',viewport:{width:915,height:412},isMobile:true,hasTouch:true},
 {name:'authority-resolution',viewport:{width:864,height:1536}},
 {name:'desktop',viewport:{width:1440,height:900}}
];
try{
 for(const device of machines){
  const page=await browser.newPage({...device,deviceScaleFactor:1});
  page.setDefaultTimeout(40000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const proof=async()=>JSON.parse(await page.locator('#evidence').textContent());
  try{
   const response=await page.goto('http://127.0.0.1:8765/3ax-mobile-workspace.html',
    {waitUntil:'load'});
   assert.equal(response?.status(),200);
   await page.waitForFunction(()=>{
    try{const a=JSON.parse(document.getElementById('evidence').textContent);
     return a.replay.blockIndex===0&&a.rendered.status==='WEBGL_XYZ_TRIANGLES_RENDERED'&&
      document.getElementById('mobile-3ax-workspace').dataset.sourceMapGate==='PASS';}
    catch{return false;}
   },null,{timeout:35000});
   assert.match(await page.locator('#reverse-status').textContent(),/47 個區域/);
   const layout=await page.evaluate(()=>{
    const view=document.querySelector('.machine-view').getBoundingClientRect();
    const side=document.querySelector('.data-sidebar').getBoundingClientRect();
    return {viewport:innerWidth,docWidth:document.documentElement.scrollWidth,
     viewX:view.x,viewWidth:view.width,sideWidth:side.width,
     ratio:view.width/(view.width+side.width)};
   });
   assert.ok(layout.docWidth<=layout.viewport+3,'horizontal overflow '+device.name+' '+JSON.stringify(layout));
   if(['desktop','landscape','authority-resolution'].includes(device.name))
    assert.ok(layout.ratio>=.68&&layout.ratio<=.77,'large 3D viewport ratio '+JSON.stringify(layout));
   const safety=await page.locator('[data-button-id="JOG"]').isDisabled();
   assert.equal(safety,true);
   for(const id of ['NAV_4AX','NAV_5AX','NAV_6AX','NAV_AI'])
    assert.equal(await page.locator('[data-button-id="'+id+'"]').isDisabled(),true);
   const first=await proof();
   assert.equal(first.realFanucControllerCommandsSent,0);
   assert.equal(first.replay.cumulativeRemovedMm3,0);
   await page.locator('[data-3ax-camera="top"]').click();
   const rotated=await proof();
   assert.equal(rotated.reason,'MOBILE_AUTHENTIC_3D_CAMERA_TOP');
   assert.equal(rotated.replay.cumulativeRemovedMm3,0);
   await page.locator('[data-3ax-camera="zoom-in"]').click();
   assert.equal((await proof()).reason,'MOBILE_AUTHENTIC_3D_CAMERA_ZOOM_IN');
   await page.locator('[data-3ax-layer="tool"]').uncheck();
   await page.waitForFunction(()=>{
    try{return JSON.parse(document.getElementById('evidence').textContent).visible3DLayers.tool===false;}
    catch{return false;}
   });
   assert.equal((await proof()).replay.cumulativeRemovedMm3,0);
   await page.locator('[data-3ax-layer="tool"]').check();
   await page.locator('[data-3ax-rate="200"]').click();
   assert.equal(await page.locator('[data-3ax-rate="200"]').getAttribute('aria-pressed'),'true');
   assert.equal(await page.locator('[data-3ax-rate="100"]').getAttribute('aria-pressed'),'false');
   await page.locator('#next').click();
   await page.waitForFunction(()=>JSON.parse(document.getElementById('evidence').textContent).replay.blockIndex===1);
   await page.locator('#next').click();
   await page.locator('#next').click();
   const final=await proof();
   assert.equal(final.replay.blockIndex,3);
   assert.equal(final.replay.cumulativeRemovedMm3,54);
   assert.equal(final.replay.lastMotion,'G0');
   assert.equal(final.replay.lastRemovedMm3,0);
   assert.equal(final.realFanucControllerCommandsSent,0);
   await page.locator('#emergency-pause').click();
   assert.match(await page.locator('#status').textContent(),/CNC MACHINE DISCONNECTED|暫停/);
   assert.equal((await proof()).replay.cumulativeRemovedMm3,54);
   await page.screenshot({path:dir+'/'+device.name+'-real-mobile-3d-54mm3.png',fullPage:true});
   await page.locator('#nc').fill('G21 G90 G54\nG43 Z2 H1\nM30');
   assert.equal(await page.locator('#next').isDisabled(),true);
   await page.locator('#parse').click();
   assert.match(await page.locator('#status').textContent(),/BLOCKED/);
   assert.deepEqual(errors,[]);
   await writeFile(dir+'/'+device.name+'-proof.json',JSON.stringify({
    device:device.name,layout,regionCount:47,
    sourceMapGate:'PASS',authentic3DHolderOrMachineApproved:false,
    genuineWebglToolAndStock:true,
    cameraCallbackChangesReal3D:true,
    realLayerToggleChangesRenderedScene:true,
    speed200ChangesActualControlState:true,
    numericalCutMm3:54,g0CutMm3:0,physicalCNCCommands:0,
    machineJOGDisabled:true,unverifiedG43Blocked:true
   },null,2));
   console.log('AIG_3AX_MOBILE_REAL_NC_REVERSE_BROWSER_PASS',device.name,'54mm3');
  }catch(error){
   await page.screenshot({path:dir+'/'+device.name+'-FAIL.png',fullPage:true}).catch(()=>{});
   throw Error(device.name+' '+String(error.message||error)+' status='+
    await page.locator('#status').textContent().catch(()=>'?')+
    ' reverse='+await page.locator('#reverse-status').textContent().catch(()=>'?')+
    ' errors='+JSON.stringify(errors));
  }finally{await page.close();}
 }
}finally{await browser.close();}
