/** Real browser: local NC text -> actual G1 erosion per click, reverse
 * re-evaluation, and GPU stock pixel changes. Synthetic NC, never machine.
 */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const dir='artifacts/aig-real3d-replay-v1-3';
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 '--no-sandbox','--disable-dev-shm-usage','--enable-webgl',
 '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'
]});
try{
 for(const device of [
  {name:'phone',viewport:{width:360,height:780},isMobile:true,hasTouch:true},
  {name:'desktop',viewport:{width:1440,height:900}}
 ]){
  const page=await browser.newPage({...device,deviceScaleFactor:1});
  page.setDefaultTimeout(40000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const evidence=async()=>JSON.parse(await page.locator('#evidence').textContent());
  try{
   await page.goto('http://127.0.0.1:8765/shared-3d/aig-real3d-replay-lab.html',
    {waitUntil:'load'});
   await page.waitForFunction(()=>{
    try{const e=JSON.parse(document.getElementById('evidence').textContent);
     return e.replay.blockIndex===0&&e.rendered.status==='WEBGL_XYZ_TRIANGLES_RENDERED';
    }catch{return false;}
   });
   const initial=await evidence();
   assert.equal(initial.replay.cumulativeRemovedMm3,0);
   assert.equal(initial.replay.totalBlocks,3);
   assert.equal(initial.realFanucControllerCommandsSent,0);
   assert.equal(await page.locator('#next').isEnabled(),true);
   const before=await page.locator('#view').evaluate(c=>c.toDataURL('image/png'));
   await page.locator('#next').click();
   await page.waitForFunction(()=>{
    try{return JSON.parse(document.getElementById('evidence').textContent).replay.blockIndex===1;}
    catch{return false;}
   });
   const first=await evidence();
   assert.equal(first.replay.lastMotion,'G1');
   assert.ok(first.replay.cumulativeRemovedMm3>0);
   const firstPixels=await page.locator('#view').evaluate(c=>c.toDataURL('image/png'));
   assert.notEqual(before,firstPixels,'actual voxel boundary changes GPU image');
   await page.locator('#next').click();
   const second=await evidence();
   assert.equal(second.replay.blockIndex,2);
   assert.ok(second.replay.cumulativeRemovedMm3>=first.replay.cumulativeRemovedMm3);
   await page.locator('#next').click();
   const third=await evidence();
   assert.equal(third.replay.blockIndex,3);
   assert.equal(third.replay.finished,true);
   assert.equal(third.replay.lastMotion,'G0');
   assert.equal(third.replay.lastRemovedMm3,0);
   assert.equal(third.replay.cumulativeRemovedMm3,second.replay.cumulativeRemovedMm3);
   assert.equal(await page.locator('#next').isDisabled(),true);
   await page.locator('#prev').click();
   await page.waitForFunction(()=>{
    try{return JSON.parse(document.getElementById('evidence').textContent).replay.blockIndex===2;}
    catch{return false;}
   });
   const prev=await evidence();
   assert.equal(prev.replay.cumulativeRemovedMm3,second.replay.cumulativeRemovedMm3);
   await page.locator('#block').evaluate(input=>{
    input.value='0';
    input.dispatchEvent(new Event('change',{bubbles:true}));
   });
   await page.locator('#block').dispatchEvent('change');
   await page.waitForFunction(()=>{
    try{return JSON.parse(document.getElementById('evidence').textContent).replay.blockIndex===0;}
    catch{return false;}
   });
   assert.equal((await evidence()).replay.cumulativeRemovedMm3,0);
   await page.locator('#simulate').click();
   await page.waitForFunction(()=>{
    try{return JSON.parse(document.getElementById('evidence').textContent).replay.finished;}
    catch{return false;}
   },null,{timeout:30000});
   const final=await evidence();
   assert.equal(final.replay.cumulativeRemovedMm3,third.replay.cumulativeRemovedMm3);
   assert.equal(final.realFanucControllerCommandsSent,0);
   assert.equal(final.true0001MmPrecision,false);
   assert.ok(final.rendered.triangles>100);
   assert.ok(final.rendered.allocatedFramePixels<=680000);
   await page.locator('#nc').fill('G21 G90 G54\nG43 Z2 H1\nM30');
   assert.equal(await page.locator('#next').isDisabled(),true);
   await page.locator('#parse').click();
   assert.match(await page.locator('#status').textContent(),/BLOCKED/);
   assert.equal(await page.locator('#next').isDisabled(),true);
   assert.deepEqual(errors,[]);
   await page.screenshot({path:dir+'/'+device.name+'-true-single-block-xyz.png',fullPage:true});
   await writeFile(dir+'/'+device.name+'-replay-proof.json',JSON.stringify({
    device:device.name,source:'synthetic limited NC fixture, not Fanuc approved',
    actualWebGLAndNumericalStock:true,initial:first.replay,
    intermediate:second.replay,finish:final.replay,
    blockIndexAfterRewind:prev.replay.blockIndex,
    sourceEditInvalidatesReplay:true,
    unsupportedG43CorrectlyBlocked:true,
    nativeAPKAndEXENotCertified:true
   },null,2)+'\n');
   console.log('AIG_REAL3D_V1_3_SINGLE_BLOCK_REPLAY_BROWSER_PASS',
    device.name,final.replay.cumulativeRemovedMm3);
  }catch(e){
   await page.screenshot({path:dir+'/'+device.name+'-FAIL.png',fullPage:true}).catch(()=>{});
   const stat=await page.locator('#status').textContent().catch(()=>null);
   const proof=(await page.locator('#evidence').textContent().catch(()=>''))?.slice(0,1800);
   throw Error(device.name+' '+e.message+' status='+stat+' proof='+proof+
    ' pageerrors='+JSON.stringify(errors));
  }finally{await page.close();}
 }
}finally{await browser.close();}
