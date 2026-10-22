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
   // 7.14 actually starts from one image: color and source labels are valid;
   // physical Z and full-body GLB MUST remain blocked without calibrated pair.
   await page.locator('#heroine-photo-only').setInputFiles({
    name:'test-left-source-not-real-heroine.png',mimeType:'image/png',
    buffer:Buffer.from(images.left,'base64')
   });
   await page.waitForFunction(()=>document.getElementById('heroine-depth-range')
    .textContent.includes('Z 深度 UNKNOWN'));
   assert.equal(await page.locator('#heroine-export').isDisabled(),true);
   await page.locator('#heroine-part').selectOption('HAIR');
   const initialPhoto=page.locator('#heroine-photo');
   await initialPhoto.scrollIntoViewIfNeeded();
   let photoRect=await initialPhoto.boundingBox();
   await initialPhoto.click({position:{x:photoRect.width*35/112,
    y:photoRect.height*15/80}});
   await page.locator('#heroine-grow').click();
   assert.match(await page.locator('#heroine-status').textContent(),/RGB 色域延展建議/);
   await page.locator('#heroine-reviewed').check();
   const singleDownload=page.waitForEvent('download');
   await page.locator('#heroine-mask-export').click();
   const onlyRGB=await singleDownload;
   const json=JSON.parse((await readFile(await onlyRGB.path())).toString('utf8'));
   assert.equal(json.physicallyMeasuredZ,false);
   assert.equal(json.metricOneToOne,false);
   assert.equal(json.backsideUnknown,true);
   assert.equal(json.candidateHasColorSemanticsOnly,true);
   // Real 7.15 single-photo draft: independent 3D candidate, not true mm.
   await page.locator('#heroine-candidate-build').click();
   await page.waitForFunction(()=>document.getElementById('heroine-depth-save').disabled===false);
   const c1=JSON.parse(await page.locator('#heroine-candidate-proof').textContent());
   assert.equal(c1.depthEstimated.source_type,'SINGLE_IMAGE_ESTIMATE');
   assert.equal(c1.depthEstimated.units,'NORMALIZED_RELATIVE_NOT_MM');
   assert.ok(c1.depthEstimated.validPixels>20);
   assert.equal(c1.depthMeasured.validPixels,0);
   assert.ok(c1.meshParts.HAIR?.triangles>1);
   assert.equal(c1.realHumanOneToOneVerified,false);
   await page.locator('#heroine-joint').selectOption('neck');
   await page.locator('#heroine-joint-x').fill('.43');
   await page.locator('#heroine-joint-y').fill('.29');
   await page.locator('#heroine-joint-save').click();
   const edited=JSON.parse(await page.locator('#heroine-candidate-proof').textContent());
   assert.equal(edited.skeleton.find(j=>j.name==='neck').x,.43);
   assert.equal(edited.skeleton.find(j=>j.name==='neck').confirmed,true);
   const depthDownload=page.waitForEvent('download');
   await page.locator('#heroine-depth-save').click();
   const depthJson=JSON.parse((await readFile(await (await depthDownload).path())).toString('utf8'));
   assert.equal(depthJson.depth_estimated.units,'NORMALIZED_RELATIVE_NOT_MM');
   assert.equal(depthJson.depth_measured.validPixels,0);
   assert.equal(depthJson.measuredDepthNeverReplacedBySinglePhotoGuess,true);
   const draftDownload=page.waitForEvent('download');
   await page.locator('#heroine-candidate-glb').click();
   const draftGLB=await draftDownload, draftData=await readFile(await draftGLB.path());
   assert.ok(draftGLB.suggestedFilename().includes('NOT-1TO1'));
   assert.equal(draftData.subarray(0,4).toString(),'glTF');
   assert.ok(draftData.length>1000);
   await page.locator('#heroine-build').click();
   assert.match(await page.locator('#heroine-status').textContent(),/BLOCKED/);
   assert.equal(await page.locator('#heroine-export').isDisabled(),true);
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
    // Locator.click scrolls the distant heroine editor into view before
    // the exact source-pixel touch. page.mouse.click alone does not scroll.
    const photo=page.locator('#heroine-photo');
    await photo.scrollIntoViewIfNeeded();
    const rect=await photo.boundingBox();
    await photo.click({position:{x:rect.width*35/112,y:rect.height*y/80}});
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
   await page.locator('#heroine-candidate-build').click();
   await page.waitForFunction(()=>document.getElementById('heroine-rig-save').disabled===false);
   const calibratedCandidate=JSON.parse(await page.locator('#heroine-candidate-proof').textContent());
   assert.ok(calibratedCandidate.depthEstimated.validPixels>30);
   assert.ok(calibratedCandidate.depthMeasured.validPixels>20);
   assert.equal(calibratedCandidate.depthMeasured.units,'MM_LEFT_CAMERA_DEPTH');
   assert.equal(calibratedCandidate.depthEstimated.units,'NORMALIZED_RELATIVE_NOT_MM');
   await page.screenshot({path:dir+'/'+device.name+'-REAL_7_15_EDITABLE_GEOMETRY.png',
    fullPage:true});

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
