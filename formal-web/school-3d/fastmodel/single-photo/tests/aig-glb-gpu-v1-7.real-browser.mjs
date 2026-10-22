import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const dir='artifacts/aig-real3d-gpu-v1-7';
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 '--no-sandbox','--disable-dev-shm-usage','--enable-webgl',
 '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'
]});
try{
 for(const device of [
  {name:'phone',viewport:{width:390,height:844},isMobile:true,hasTouch:true},
  {name:'desktop',viewport:{width:1440,height:900}}
 ]){
  const page=await browser.newPage({...device,deviceScaleFactor:1});
  page.setDefaultTimeout(45000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   const response=await page.goto('http://127.0.0.1:8765/aig17-gpu-browser-lab.html',
    {waitUntil:'domcontentloaded'});
   assert.equal(response?.status(),200);
   await page.waitForFunction(()=>['FAIL','REAL_GLTF2_GLB_ANIMATED_BROWSER_PASS']
    .includes(window.__aig17lab?.status),null,{timeout:35000});
   const r=await page.evaluate(()=>window.__aig17lab);
   if(r.status==='FAIL')throw Error(r.exception);
   assert.equal(r.refusedGpuWithoutLoadedGLB,true);
   assert.ok(r.glbBytes>100);
   assert.equal(r.loadedClipCount,1);
   assert.equal(r.actualThreeWebGLTrianglesRendered,true);
   assert.equal(r.animationQuaternionChanged,true);
   assert.ok(r.samples>4);
   assert.equal(r.cpuSubmissionNotClaimedAsGpuTime,true);
   assert.equal(r.noTimerKeepsFullOriginalQuality,true);
   assert.equal(r.pixelRatioRestoredAfterToggle,true);
   assert.equal(r.originalTrianglePositionsUnchanged,true);
   // Real draw-call reduction, not theoretical-only cost estimates.
   assert.equal(r.gpu18StaticInstances,8);
   assert.equal(r.gpu18SavedDrawCallsExpected,7);
   assert.equal(r.gpu18RealInstancedMeshDrawGroup,true);
   assert.equal(r.gpu18CharacterAnimationSourceNeverBatched,true);
   assert.equal(r.gpu18OriginalGLBMeshesRestored,true);
   assert.ok(r.gpu18DrawCallsBefore-r.gpu18DrawCallsDuring>=6,
    'Real GPU draw calls must decrease using InstancedMesh');
   assert.equal(r.gpu18DrawCallsBefore,r.gpu18DrawCallsRestored,
    'Original GLB draw-calls must be restored without deleting meshes');
   assert.equal(r.modelObjectRetained,true);
   assert.equal(r.noAndroidOrWindowsNativeFpsClaim,true);
   assert.deepEqual(errors,[]);
   const actualFrame=await page.locator('#viewer').screenshot({
    path:dir+'/'+device.name+'-ACTUAL-WEBGL-GLB-CANVAS.png'
   });
   // Black/cleared canvas compresses to a tiny PNG. Preserve a genuine
   // submitted model frame before releasing WebGL resources.
   assert.ok(actualFrame.byteLength>3000,
    'AIG17_GPU_EVIDENCE_CANVAS_BLANK_OR_DISPOSED_'+actualFrame.byteLength);
   await page.screenshot({path:dir+'/'+device.name+'-animated-real-GLB-gpu-evidence.png',
    fullPage:true});
   await page.evaluate(()=>window.__aig17Cleanup?.());
   await writeFile(dir+'/'+device.name+'-realGLB-gpu-proof.json',JSON.stringify({
    device:device.name,actualRealGLTF2Binary:true,verifiedOnlySyntheticTestAsset:true,
    realGPUFramesSubmitted:r.samples,
    gpuTimerSupported:r.timerSupport,actualGpuTimerP95Ms:r.gpuExecutionMs,
    adaptivePresentationNeverModifiesGeometry:r.originalTrianglePositionsUnchanged,
    drawCallsTrue:r.actualThreeWebGLTrianglesRendered,
    quaternionClipAnimated:r.animationQuaternionChanged,
    fallbackNoTimerSafe:r.noTimerKeepsFullOriginalQuality,
    sourceSHAApproval:false,realHeroineLikenessApproved:false,
    nativePhoneWindows60FPSVerified:false,
    raw:r
   },null,2));
   console.log('AIG_REAL_GLTF2_1_7_GLTF_ANIMATION_GPU_BROWSER_PASS',device.name,
    'gpuTimerSupported='+r.timerSupport,'samples='+r.samples);
  }catch(error){
   await page.screenshot({path:dir+'/'+device.name+'-FAIL.png',fullPage:true}).catch(()=>{});
   throw Error(device.name+' '+String(error.message||error)+
    ' lab='+JSON.stringify(await page.evaluate(()=>window.__aig17lab).catch(()=>null))+
    ' pageErrors='+JSON.stringify(errors));
  }finally{await page.close();}
 }
}finally{await browser.close();}
