import {chromium} from 'playwright';
import {build} from 'esbuild';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
await build({entryPoints:['tests/aig-heroine-skin-2-3.browser-entry.mjs'],
 bundle:true,format:'iife',platform:'browser',target:['chrome100'],
 outfile:'dist/aig-heroine-skin-2-3-test-harness.js'});
const out='artifacts/aig-real3d-skin-2-3';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 '--no-sandbox','--disable-dev-shm-usage','--enable-webgl',
 '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'
]});
try{
 for(const cfg of [
  {name:'phone',viewport:{width:390,height:844},isMobile:true,hasTouch:true},
  {name:'desktop',viewport:{width:1280,height:900}}
 ]){
  const ctx=await browser.newContext(cfg),page=await ctx.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   const response=await page.goto(
    'http://127.0.0.1:8765/metric-stereo-studio.html',{waitUntil:'load'});
   assert.equal(response.status(),200);
   assert.equal(await page.locator('#heroine-23-build').count(),1);
   assert.equal(await page.locator('#heroine-23-export').count(),1);
   await page.evaluate(()=>{
    const root=document.createElement('section');
    root.id='aig23-gpu-evidence';
    root.style.cssText='max-width:680px;margin:12px auto;padding:14px;'+
     'border:1px solid #51a7d3;background:#09192b;color:#fff';
    root.textContent='Real3D 2.3｜合法合成測試素材蒙皮變形證據（非女主角實際原圖）';
    document.body.append(root);
   });
   await page.addScriptTag({url:'/aig-heroine-skin-2-3-test-harness.js'});
   const proof=await page.evaluate(()=>window.__AIG23_TEST());
   assert.equal(proof.actualSkinnedMeshCount,4);
   assert.equal(proof.trueGlbReimportSkinnedMeshCount,4);
   assert.equal(proof.reimportedActualBoneAnimationClips,2);
   assert.ok(proof.expectedDeformedHairVertexDistance>.00005);
   assert.ok(proof.actualGPUCalls>0);
   assert.equal(proof.depthMMUnknown,true);
   assert.deepEqual(errors,[]);
   await page.screenshot({path:out+'/'+cfg.name+'-real-skin-gpu-and-source-controls.png',
    fullPage:true});
   await writeFile(out+'/'+cfg.name+'-deform-evidence.json',JSON.stringify({
    ...proof,device:cfg.name,usesActualPhoneHardware:false,
    syntheticRigTestsDoNotProveHeroineAnatomy:true
   },null,2));
   console.log('AIG23_REAL_GPU_SKINNED_MESH_RGB_GLTF_REIMPORT_PASS',
    cfg.name,proof.actualSkinnedMeshCount,proof.expectedDeformedHairVertexDistance);
  }catch(e){
   await page.screenshot({path:out+'/'+cfg.name+'-FAIL.png',
    fullPage:true}).catch(()=>{});
   throw Error(cfg.name+' '+String(e.message||e)+
    ' errors='+JSON.stringify(errors));
  }finally{await ctx.close()}
 }
}finally{await browser.close()}
