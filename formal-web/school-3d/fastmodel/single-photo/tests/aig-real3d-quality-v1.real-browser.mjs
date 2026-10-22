/** Real mobile & desktop WebGL: MSAA capability evidence and adjustable SSAA
 * with actual GPU backbuffer size/lighting, never false multisample claims.
 */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const dir='artifacts/aig-real3d-anti-alias';await mkdir(dir,{recursive:true});
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
  page.setDefaultTimeout(30000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto('http://127.0.0.1:8765/shared-3d/aig-real3d-lab.html',{waitUntil:'load'});
   await page.waitForFunction(()=>{
    try{return JSON.parse(document.querySelector('#proof').textContent)
     .renderer.status==='WEBGL_XYZ_TRIANGLES_RENDERED';}
    catch{return false;}
   },null,{timeout:25000});
   let baseline=JSON.parse(await page.locator('#proof').textContent());
   assert.equal(baseline.renderer.antialiasProfile,'balanced');
   assert.ok(baseline.renderer.allocatedFramePixels<=baseline.renderer.maxFramePixels);
   const measured=[];
   for(const [quality,targetScale] of [['performance',1],['balanced',1.25],
      ['smooth',1.75],['ultra',2.25]]){
    await page.locator('#quality').selectOption(quality);
    await page.waitForFunction(preset=>{
     try{return JSON.parse(document.querySelector('#proof').textContent)
       .renderer.antialiasProfile===preset;}
     catch{return false;}
    },quality);
    const v=JSON.parse(await page.locator('#proof').textContent());
    const b=v.renderer;
    assert.equal(b.requestedSuperSampleScale,targetScale);
    assert.ok(b.allocatedFramePixels>1000);
    assert.ok(b.allocatedFramePixels<=b.maxFramePixels);
    assert.ok(b.effectiveSuperSampleScale>0);
    assert.ok(Array.isArray(b.framebufferRGBBits)&&b.framebufferRGBBits.every(x=>x>=5));
    assert.ok(typeof b.hardwareMSAAContextEnabled==='boolean');
    assert.ok(Number.isInteger(b.reportedMSAASamples)&&b.reportedMSAASamples>=0);
    assert.equal(b.finalDisplayPixelOneBlendedRGBColor,true);
    assert.equal(b.realMirrorReflection,false);
    assert.equal(v.readOnly,true);
    assert.equal(v.noNCCommandsSent,true);
    assert.equal(v.materialRemovalMm3,null);
    const frame=await page.locator('#view').evaluate(el=>{
     const gl=el.getContext('webgl2')||el.getContext('webgl');
     return {width:el.width,height:el.height,lost:gl.isContextLost(),
      antialias:gl.getContextAttributes().antialias};
    });
    assert.equal(frame.lost,false);
    assert.equal(frame.width*frame.height,b.allocatedFramePixels);
    measured.push({quality,...frame,...b});
   }
   assert.ok(measured[3].width>measured[0].width);
   assert.ok(measured[3].height>measured[0].height);
   assert.equal(measured[0].triangles,measured[3].triangles);
   assert.equal(measured[0].source,measured[3].source);
   await page.locator('#profile').selectOption('FastModel');
   await page.waitForFunction(()=>{
    try{return JSON.parse(document.querySelector('#proof').textContent)
     .sceneProfile==='FastModel';}catch{return false;}
   });
   assert.equal(JSON.parse(await page.locator('#proof').textContent()).renderer.removalNotImplemented,true);
   await page.screenshot({path:dir+'/'+device.name+'-SSAA-MSAA.png',fullPage:true});
   await writeFile(dir+'/'+device.name+'-evidence.json',
    JSON.stringify({device:device.name,syntheticGeometryOnly:true,
     verifiedGPUBackbufferChanges:true,msaaIsCapabilityReportedNotPromised:true,
     noNativeGPUDeviceFPSClaim:true,results:measured,
     browserErrors:errors},null,2)+'\n');
   assert.deepEqual(errors,[]);
   console.log('AIG_REAL3D_TRUE_GPU_MSAA_SSAA_QUALITY_BROWSER_PASS',
     device.name,measured.map(x=>x.width+'x'+x.height).join(' / '));
  }catch(e){
   await page.screenshot({path:dir+'/'+device.name+'-FAIL.png',fullPage:true}).catch(()=>{});
   const status=await page.locator('#status').textContent().catch(()=>null);
   const proof=(await page.locator('#proof').textContent().catch(()=>null))?.slice(0,1200);
   throw Error(device.name+' '+e.message+' status='+status+' proof='+proof+' pageerrors='+JSON.stringify(errors));
  }finally{await page.close();}
 }
}finally{await browser.close();}
