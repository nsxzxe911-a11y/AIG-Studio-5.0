/* 7.13 Studio end-to-end sanity: genuine pixels -> actual triangulated WebGL
 * -> metres GLB. Test images are synthetic and do NOT certify a real human.
 */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/aig-metric-stereo-7-13';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 '--no-sandbox','--disable-dev-shm-usage','--enable-webgl',
 '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'
]});
try{
 for(const device of [
  {name:'phone',viewport:{width:390,height:844},isMobile:true,hasTouch:true},
  {name:'desktop',viewport:{width:1280,height:800}}
 ]){
  const page=await browser.newPage({...device,acceptDownloads:true});
  page.setDefaultTimeout(45000);
  try{
   const response=await page.goto('http://127.0.0.1:8765/metric-stereo-studio.html',
    {waitUntil:'load'});
   assert.equal(response?.status(),200);
   const images=await page.evaluate(async()=>{
    const w=112,h=80,disp=8;
    function noise(x,y){
     let t=(((x+200)*73856093)^((y+300)*19349663))>>>0;
     t^=t<<13;t^=t>>>17;t^=t<<5;
     return (t>>>0)%256;
    }
    const toPNG=async side=>{
     const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
     const ctx=canvas.getContext('2d');
     const img=ctx.createImageData(w,h);
     for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const i=(y*w+x)*4;
      const sourceX=x+(side==='right'?disp:0);
      const v=sourceX<w?noise(sourceX,y):0;
      img.data.set([v,v,v,255],i);
     }
     ctx.putImageData(img,0,0);
     return canvas.toDataURL('image/png').split(',')[1];
    };
    return {left:await toPNG('left'),right:await toPNG('right')};
   });
   await page.locator('#left-photo').setInputFiles({
    name:'A_left.png',mimeType:'image/png',buffer:Buffer.from(images.left,'base64')});
   await page.locator('#right-photo').setInputFiles({
    name:'B_right.png',mimeType:'image/png',buffer:Buffer.from(images.right,'base64')});
   await page.locator('#baseline').fill('60');
   await page.locator('#focal').fill('120');
   for(const id of ['physical-reviewed','camera-reviewed','rectified-reviewed'])
    await page.locator('#'+id).check();
   await page.locator('#reconstruct').click();
   await page.waitForFunction(()=>document.getElementById('status').dataset.pass==='true',
    null,{timeout:35000});
   const report=JSON.parse(await page.locator('#proof').textContent());
   assert.equal(report.schema,'AIG_FASTMODEL_7_13_METRIC_RECTIFIED_STEREO_MESH_MM');
   assert.ok(report.vertices>300,report.vertices);
   assert.ok(report.triangles>300,report.triangles);
   assert.ok(Math.abs(report.observedDepthRangeMm[0]-900)<1,
    'synthetic known baseline should produce ~900mm true depth');
   assert.equal(report.missingBacksideIsNotGenerated,true);
   assert.equal(await page.locator('#export').isEnabled(),true);
   await page.screenshot({path:out+'/'+device.name+'-realXYZ-mesh.png',fullPage:true});
   const downloadPromise=page.waitForEvent('download');
   await page.locator('#export').click();
   const download=await downloadPromise;
   assert.ok(download.suggestedFilename().endsWith('.glb'));
   const bytes=await readFile(await download.path());
   assert.ok(bytes.length>100);
   assert.equal(bytes.subarray(0,4).toString('utf8'),'glTF');
   await writeFile(out+'/'+device.name+'-metric-reconstruction.json',
    JSON.stringify({...report,exportGLBBytes:bytes.length,
     syntheticStereoFixtureNotPhysicalHuman:true,
     cameraDepthActuallyTriangulated:true},null,2));
   console.log('AIG713_REAL_METRIC_STEREO_TO_GLB_PASS',device.name,
    report.vertices,report.triangles,bytes.length);
  }catch(e){
   await page.screenshot({path:out+'/'+device.name+'-FAIL.png',fullPage:true}).catch(()=>{});
   throw Error(device.name+': '+String(e.message||e)+
    '; status='+await page.locator('#status').textContent().catch(()=>null));
  }finally{await page.close();}
 }
}finally{await browser.close();}
