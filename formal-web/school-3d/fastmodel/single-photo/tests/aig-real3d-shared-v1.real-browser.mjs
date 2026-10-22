/** True browser WebGL execution on mobile and desktop (software GPU accepted).
 * Evidence requires compiled shaders, real 3D indexed triangle raster and
 * actual changed canvas pixels for camera/mesh manipulation.
 */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const dir='artifacts/aig-shared-real3d-v1';
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 '--no-sandbox','--disable-dev-shm-usage',
 '--enable-webgl','--use-gl=angle','--use-angle=swiftshader',
 '--enable-unsafe-swiftshader'
]});
try{
 for(const d of [
  {name:'phone',viewport:{width:360,height:780},isMobile:true,hasTouch:true},
  {name:'desktop',viewport:{width:1440,height:900}}
 ]){
  const page=await browser.newPage({...d,deviceScaleFactor:1});
  page.setDefaultTimeout(25000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto('http://127.0.0.1:8765/shared-3d/aig-real3d-lab.html',{waitUntil:'load'});
   await page.waitForFunction(()=>{
    try{
     const e=JSON.parse(document.getElementById('proof').textContent);
     return e.renderer.status==='WEBGL_XYZ_TRIANGLES_RENDERED'&&e.renderer.triangles>100;
    }catch{return false;}
   },null,{timeout:20000});
   const first=JSON.parse(await page.locator('#proof').textContent());
   assert.equal(first.readOnly,true);
   assert.equal(first.noNCCommandsSent,true);
   assert.equal(first.materialRemovalMm3,null);
   assert.equal(first.renderer.actualStockRemovedMm3,null);
   assert.equal(first.renderer.removalNotImplemented,true);
   assert.ok(first.renderer.allocatedFramePixels<=first.renderer.maxFramePixels,
    'Android GPU canvas pixel budget must block excessive frame allocation');
   assert.equal(first.renderer.feed,3);
   const getPix=()=>page.locator('#view').evaluate(c=>{
    const gl=c.getContext('webgl2')||c.getContext('webgl');
    const px=new Uint8Array(4),x=Math.floor(c.width/2),y=Math.floor(c.height/2);
    gl.readPixels(x,y,1,1,gl.RGBA,gl.UNSIGNED_BYTE,px);
    return Array.from(px);
   });
   const original=await page.locator('#view').screenshot();
   await page.locator('#front').click();
   await page.waitForFunction(()=>{
    try{return JSON.parse(document.getElementById('proof').textContent)
      .renderer.cameraProjection==='orthographic';}catch{return false;}
   });
   const changed=await page.locator('#view').screenshot();
   assert.notDeepEqual(original,changed,'Real GPU projection must change rendered pixels');
   await page.locator('#profile').selectOption('FastModel');
   await page.waitForFunction(()=>{
    try{const e=JSON.parse(document.getElementById('proof').textContent);
     return e.sceneProfile==='FastModel'&&e.renderer.nodes===4&&e.renderer.feed===0;
    }catch{return false;}
   });
   const fast=JSON.parse(await page.locator('#proof').textContent());
   assert.equal(fast.audit.units,'RELATIVE');
   assert.equal(fast.audit.verifiedNCFeedOrStockRemoval,false);
   const preMove=await page.locator('#view').screenshot();
   await page.locator('#spindle-y').evaluate(e=>{
    e.value='.7';e.dispatchEvent(new Event('input',{bubbles:true}));
   });
   await page.waitForFunction(()=>{
    try{return JSON.parse(document.getElementById('proof').textContent).audit.revision>=5;}
    catch{return false;}
   },null,{timeout:5000});
   const afterMove=await page.locator('#view').screenshot();
   assert.notDeepEqual(preMove,afterMove,'Actual world XYZ building movement changes 3D pixels');
   await page.locator('#profile').selectOption('5AX');
   await page.waitForFunction(()=>{
    try{const e=JSON.parse(document.getElementById('proof').textContent);
     return e.sceneProfile==='5AX'&&e.renderer.triangles>=240;
    }catch{return false;}
   });
   const five=JSON.parse(await page.locator('#proof').textContent());
   assert.equal(five.noNCCommandsSent,true);
   assert.equal(five.cncKinematicsMapped,false);
   await page.screenshot({path:dir+'/'+d.name+'-shared-real3d-webgl.png',fullPage:true});
   await writeFile(dir+'/'+d.name+'-shared-real3d-evidence.json',
    JSON.stringify({device:d.name,
     actualGLRender:true,source:'procedural demonstration only',
     initial:first,FastModel:fast,fiveAX:five,
     GPUCanvasChangedOnCameraSwitch:!original.equals(changed),
     GPUCanvasChangedOnGeometryTransform:!preMove.equals(afterMove),
     noMaterialRemovalOrCNCCommands:true,
     actualNativeAPKAndEXEVerified:false},null,2)+'\n');
   assert.deepEqual(errors,[]);
   console.log('AIG_SHARED_REAL3D_V1_TRUE_WEBGL_XYZ_PHONE_DESKTOP_PASS',
    d.name,first.renderer.triangles,fast.renderer.triangles,five.renderer.triangles);
  }catch(e){
   await page.screenshot({path:dir+'/'+d.name+'-FAIL.png',fullPage:true}).catch(()=>{});
   const status=await page.locator('#status').textContent().catch(()=>null);
   const proof=(await page.locator('#proof').textContent().catch(()=>null))?.slice(0,1500);
   throw Error(d.name+' '+e.message+' status='+status+' proof='+proof+
    ' pageerrors='+JSON.stringify(errors));
  }finally{await page.close();}
 }
}finally{await browser.close();}
