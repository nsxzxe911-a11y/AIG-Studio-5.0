/** Real Chromium full local workflow: stereo-mm depth, reviewed hair/face
 * /uniform colors, confidence, and source-preserving GLB for technical input.
 * Generated banded color photos are NOT the user's actual heroine image.
 */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const dir='artifacts/aig-heroine-scan-7-14';
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 '--no-sandbox','--disable-dev-shm-usage','--enable-webgl',
 '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'
]});
try{
 for(const device of [
  {name:'phone',viewport:{width:390,height:844},isMobile:true,hasTouch:true},
  {name:'desktop',viewport:{width:1280,height:850}}
 ]){
  const page=await browser.newPage({...device,acceptDownloads:true});
  page.setDefaultTimeout(45000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   const nav=await page.goto('http://127.0.0.1:8765/metric-stereo-studio.html',
    {waitUntil:'load'});
   assert.equal(nav?.status(),200);
   const images=await page.evaluate(async()=>{
    const w=112,h=80,disp=8;
    function texture(x,y){
     let t=(((x+199)*73856093)^((y+311)*19349663))>>>0;
     t^=t<<13;t^=t>>>17;t^=t<<5;return(t>>>0)%25;
    }
    const rgba=(x,y)=>{
     const base=y<26?[45,31,23]:y<50?[207,152,116]:[42,77,115];
     const diff=texture(x,y)-12;
     return base.map(v=>Math.max(0,Math.min(255,v+diff)));
    };
    async function png(side){
     const c=document.createElement('canvas');c.width=w;c.height=h;
     const ctx=c.getContext('2d'),image=ctx.createImageData(w,h);
     for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const xx=x+(side==='right'?disp:0),i=(y*w+x)*4;
      const pixel=xx<w?rgba(xx,y):[0,0,0];
      image.data.set([...pixel,255],i);
     }
     ctx.putImageData(image,0,0);
     return c.toDataURL('image/png').split(',')[1];
    }
    return {left:await png('left'),right:await png('right')};
   });
   for(const side of ['left','right'])await page.locator('#'+side+'-photo')
    .setInputFiles({name:side+'-CALIBRATED-SYNTHETIC.png',
     mimeType:'image/png',buffer:Buffer.from(images[side],'base64')});
   await page.locator('#baseline').fill('60');
   await page.locator('#focal').fill('120');
   for(const id of ['physical-reviewed','camera-reviewed','rectified-reviewed'])
    await page.locator('#'+id).check();
   await page.locator('#reconstruct').click();
   await page.waitForFunction(()=>document.getElementById('status').dataset.pass==='true',
    null,{timeout:35000});
   assert.match(await page.locator('#heroine-depth-range').textContent(),/mm/);
   const base=await page.locator('#proof').textContent();
   const source=JSON.parse(base);
   assert.equal(source.GLBFroｍStereoRealTriangles,undefined);
   assert.ok(source.vertices>300);
   for(const [label,y] of [['HAIR',15],['FACE',38],['JACKET',64]]){
    await page.locator('#heroine-part').selectOption(label);
    const rect=await page.locator('#heroine-photo').boundingBox();
    await page.mouse.click(rect.x+rect.width*35/112,rect.y+rect.height*y/80);
   }
   await page.locator('#heroine-grow').click();
   assert.match(await page.locator('#heroine-status').textContent(),/RGB 色域延展建議/);
   await page.locator('#heroine-build').click();
   assert.match(await page.locator('#heroine-status').textContent(),/BLOCKED/);
   await page.locator('#heroine-reviewed').check();
   await page.locator('#heroine-build').click();
   await page.waitForFunction(()=>document.getElementById('heroine-export').disabled===false);
   const proof=JSON.parse(await page.locator('#heroine-proof').textContent());
   assert.equal(proof.genuineMetricStereoDepth,true);
   assert.ok(proof.observedVerticesMm>100);
   assert.ok(proof.semanticMeasuredVertices>15);
   assert.ok(proof.semanticPartTriangles.HAIR>0);
   assert.ok(proof.semanticPartTriangles.FACE>0);
   assert.equal(proof.hiddenBodyAndBackUnknown,true);
   assert.equal(proof.noFakeSkeletonOrSkinWeight,true);
   await page.screenshot({path:dir+'/'+device.name+'-REAL_STEREO_RGB_DEPTH_PARTS.png',
    fullPage:true});
   const upcoming=page.waitForEvent('download');
   await page.locator('#heroine-export').click();
   const file=await upcoming,bytes=await readFile(await file.path());
   assert.ok(file.suggestedFilename().includes('Heroine-Metric-Front-RGB-Semantic'));
   assert.equal(bytes.subarray(0,4).toString(),'glTF');
   assert.ok(bytes.length>1000);
   assert.deepEqual(errors,[]);
   await writeFile(dir+'/'+device.name+'-3D-evidence.json',JSON.stringify({
    device:device.name,source,proof,exportedGLBBytes:bytes.length,
    realSourceHeroinePhotoUsed:false,
    physicallyCalibratedSyntheticInputOnly:true,
    backOfHeadAndBodyUnknown:true,notFullHumanOneToOneCertified:true
   },null,2));
   console.log('AIG714_HEROINE_RGB_DEPTH_METRIC_GLB_BROWSER_PASS',
    device.name,proof.observedVerticesMm,proof.observedTriangles,bytes.length);
  }catch(e){
   await page.screenshot({path:dir+'/'+device.name+'-FAIL.png',fullPage:true}).catch(()=>{});
   throw Error(device.name+': '+String(e.message||e)+
    ' metric='+await page.locator('#status').textContent().catch(()=>null)+
    ' heroine='+await page.locator('#heroine-status').textContent().catch(()=>null)+
    ' errors='+JSON.stringify(errors));
  }finally{await page.close();}
 }
}finally{await browser.close();}
