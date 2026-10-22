/** Isolated production-site new 3AX HTML smoke: real SwiftShader WebGL
 * stock, NC callbacks, import/export, source guards and responsive layout.
 * Does NOT claim real Fanuc, verified Authority CNC machine, or native GPU.
 */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const dir='artifacts/aig-new-3ax-web';
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 '--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--use-gl=angle',
 '--use-angle=swiftshader','--enable-unsafe-swiftshader'
]});
const url='http://127.0.0.1:8765/3ax-nc-workbench.html';
try{
 for(const device of [
  {name:'desktop',viewport:{width:1440,height:900}},
  {name:'phone',viewport:{width:360,height:780},isMobile:true,hasTouch:true},
  {name:'landscape',viewport:{width:915,height:412},isMobile:true,hasTouch:true}
 ]){
  const page=await browser.newPage({...device,deviceScaleFactor:1});
  page.setDefaultTimeout(40000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const evidence=async()=>JSON.parse(await page.locator('#evidence').textContent());
  try{
   const res=await page.goto(url,{waitUntil:'load'});
   assert.equal(res?.status(),200);
   await page.waitForFunction(()=>{
    try{const e=JSON.parse(document.getElementById('evidence').textContent);
     return e.rendered.status==='WEBGL_XYZ_TRIANGLES_RENDERED'&&e.replay.blockIndex===0;}
    catch{return false;}
   },null,{timeout:35000});
   const first=await evidence();
   assert.equal(first.replay.cumulativeRemovedMm3,0);
   assert.ok(first.rendered.triangles>100);
   assert.equal(first.realFanucControllerCommandsSent,0);
   assert.equal(await page.locator('#next').isEnabled(),true);
   assert.ok((await page.locator('#axis-x').textContent()).includes('-6'));
   const sizes=await page.evaluate(()=>{
    const s=document.querySelector('.workspace').getBoundingClientRect();
    const p=document.querySelector('.viewport-panel').getBoundingClientRect();
    const c=document.querySelector('.controls').getBoundingClientRect();
    return {viewport:innerWidth,document:document.documentElement.scrollWidth,
      workspace:s.width,panel:p.width,controls:c.width};
   });
   assert.ok(sizes.document<=sizes.viewport+3,'horizontal overflow on '+device.name+': '+JSON.stringify(sizes));
   if(device.name==='desktop'){
    const frac=sizes.panel/(sizes.panel+sizes.controls);
    assert.ok(frac>=.65&&frac<=.75,'3D viewport requires roughly 70% desktop width, got '+frac);
   }
   // Source verification is separate from numeric stock and never provides
   // fake buttons, fake machine geometry or a revoked 438 screenshot.
   assert.equal(await page.locator('#authority-panel').count(),1);
   assert.equal(await page.locator('#authority-preview').isVisible(),false);
   await page.locator('#authority-panel').evaluate(e=>{e.open=true;});
   await page.route('**/visual-authority/mobile/05_3AX.png',route=>
    route.fulfill({status:200,contentType:'image/png',body:Buffer.from('FORGED_PREVIEW_IMAGE')}));
   await page.locator('#authority-check').click();
   await page.waitForFunction(()=>document.getElementById('authority-status').textContent
    .includes('SOURCE_PNG_BYTE_LENGTH_OR_SIZE_BLOCKED'));
   assert.equal(await page.locator('#authority-preview').isVisible(),false);
   await page.unroute('**/visual-authority/mobile/05_3AX.png');
   await page.locator('#authority-file').setInputFiles({
    name:'05_3AX.png',mimeType:'image/png',buffer:Buffer.from('REVOKED_OR_UNVERIFIED')
   });
   await page.waitForFunction(()=>document.getElementById('authority-status').textContent
    .includes('本機圖片驗證 BLOCKED'));
   assert.equal(await page.locator('#authority-preview').isVisible(),false);
   assert.equal((await evidence()).replay.cumulativeRemovedMm3,0,
    'visual Authority verification must never mutate numeric CNC stock');
   const before=await page.locator('#view').evaluate(c=>c.toDataURL('image/png'));
   await page.locator('#next').click();
   await page.waitForFunction(()=>JSON.parse(document.getElementById('evidence').textContent).replay.blockIndex===1);
   const a=await evidence();
   assert.ok(a.replay.cumulativeRemovedMm3>0,'G1 must numerically remove stock');
   const after=await page.locator('#view').evaluate(c=>c.toDataURL('image/png'));
   assert.notEqual(before,after,'real GPU stock image must reflect cut');
   await page.locator('#next').click();
   await page.locator('#next').click();
   const final=await evidence();
   assert.equal(final.replay.blockIndex,3);
   assert.equal(final.replay.cumulativeRemovedMm3,54);
   assert.equal(final.replay.lastMotion,'G0');
   assert.equal(final.replay.lastRemovedMm3,0);
   assert.equal(final.realFanucControllerCommandsSent,0);
   const camBefore=await page.locator('#evidence').textContent();
   await page.locator('#camera').click();
   const camAfter=await page.locator('#evidence').textContent();
   assert.equal(JSON.parse(camAfter).replay.cumulativeRemovedMm3,54);
   assert.notEqual(camBefore,camAfter,'camera button must use real callback');
   await page.locator('#prev').click();
   await page.waitForFunction(()=>JSON.parse(document.getElementById('evidence').textContent).replay.blockIndex===2);
   await page.screenshot({path:dir+'/'+device.name+'-functional-workspace.png',fullPage:true});
   const saved=await Promise.all([
    page.waitForEvent('download',{timeout:10000}),
    page.locator('#export-nc').click()
   ]);
   assert.equal(saved[0].suggestedFilename(),'AIG-3AX-NC-WORKING-COPY.nc');
   const edited='G21 G90 G54\nG43 Z2 H1\nM30';
   await page.locator('#nc-upload').setInputFiles({name:'unsafe.nc',
    mimeType:'text/plain',buffer:Buffer.from(edited)});
   await page.waitForFunction(()=>document.getElementById('nc').value.includes('G43'));
   assert.equal(await page.locator('#next').isDisabled(),true);
   await page.locator('#parse').click();
   assert.match(await page.locator('#status').textContent(),/BLOCKED/);
   assert.equal(await page.locator('#next').isDisabled(),true);
   // Local-first must persist the source NC, NEVER a fabricated cut result.
   await page.waitForFunction(()=>{
    const s=localStorage.getItem('AIG_V2_3AX_NC_WORKING_COPY_LOCAL');
    if(!s)return false;
    try{return JSON.parse(s).source.includes('G43');}catch{return false;}
   });
   await page.reload({waitUntil:'load'});
   await page.waitForFunction(()=>document.getElementById('nc').value.includes('G43'));
   assert.equal(await page.locator('#nc').inputValue(),edited);
   assert.equal(await page.locator('#next').isDisabled(),true,
    'recovered NC source must never silently reuse stale numerical stock');
   await page.locator('#parse').click();
   assert.match(await page.locator('#status').textContent(),/BLOCKED/);
   // One-tab or two-tab conflicting writes cannot silently replace old NC.
   await page.evaluate(()=>{
    const key='AIG_V2_3AX_NC_WORKING_COPY_LOCAL';
    const s=JSON.parse(localStorage.getItem(key));
    s.revision+=1;s.source='G21 G90 G54\nS1900 M3\nG0 X0 Y0 Z5\nM5\nM30';
    localStorage.setItem(key,JSON.stringify(s));
   });
   await page.locator('#nc').fill('G21 G90 G54\nG43 Z1 H1\nM30');
   await page.waitForFunction(()=>document.getElementById('file-message').textContent.includes('另一分頁'));
   assert.equal((await page.evaluate(()=>JSON.parse(
    localStorage.getItem('AIG_V2_3AX_NC_WORKING_COPY_LOCAL')).source)).includes('G43'),false);
   assert.deepEqual(errors,[]);
   await page.screenshot({path:dir+'/'+device.name+'-local-recovery-and-conflict-blocked.png',fullPage:true});
   await writeFile(dir+'/'+device.name+'-evidence.json',JSON.stringify({
    scope:'Real3D 1.3 limited read-only NC + new independent web layout',
    device:device.name,sizes,removedMm3:54,realWebGL:true,
    originalNCMutatedBySimulation:false,actualMachineCommandsSent:0,
    localFileImportAndExport:true,authoritySourceFailClosed:true,
    noUnverifiedOriginalAsRuntimeSkin:true,localNCReloadRecoveryVerified:true,
    conflictingNCWriteBlocked:true,unsupportedFanucG43Blocked:true,
    productionAuthorityModelApproved:false,nativeAPKEXEApproved:false
   },null,2));
   console.log('AIG_NEW_3AX_WEB_REAL_NC_WORKSPACE_BROWSER_PASS',device.name,'54mm3');
  }catch(e){
   await page.screenshot({path:dir+'/'+device.name+'-FAIL.png',fullPage:true}).catch(()=>{});
   throw Error(device.name+' '+e.message+' runtime='+
    await page.locator('#status').textContent().catch(()=>'?')+
    ' pageerrors='+JSON.stringify(errors));
  }finally{await page.close();}
 }
}finally{await browser.close();}
