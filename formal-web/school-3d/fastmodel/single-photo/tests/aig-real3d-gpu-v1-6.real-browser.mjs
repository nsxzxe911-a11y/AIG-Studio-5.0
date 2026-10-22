/**
 * FastModel Real3D 1.6 actual browser WebGL allocator stress.
 * Synthetic triangles test GPU resource behavior, NOT human likeness or
 * production CNC / numerical 0.001 mm claims. Checks true rendering and
 * stable WebGL buffers under generated mesh churn.
 */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const dir='artifacts/aig-real3d-gpu-v1-6';
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 '--no-sandbox','--disable-dev-shm-usage','--enable-webgl',
 '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'
]});
try{
 for(const device of [
  {name:'phone',viewport:{width:390,height:844},isMobile:true,hasTouch:true},
  {name:'desktop',viewport:{width:1280,height:800}}
 ]){
  const page=await browser.newPage({...device,deviceScaleFactor:1});
  page.setDefaultTimeout(35000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   const r=await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});
   assert.equal(r?.status(),200);
   const result=await page.evaluate(async()=>{
    const [{createAIG3DRenderer},{createAIG3DScene,createAIG3DMesh,
      addAIG3DNode,addAIG3DToolpathOverlay}]=await Promise.all([
       import('/shared-3d/aig-real3d-webgl.mjs'),import('/shared-3d/aig-real3d-core.mjs')
    ]);
    const canvas=document.createElement('canvas');
    canvas.width=480;canvas.height=300;canvas.style.width='480px';
    canvas.style.height='300px';document.body.appendChild(canvas);
    const renderer=createAIG3DRenderer(canvas,{
      quality:'performance',maxResidentGpuBytes:1024*1024,
      maxTransientPathBytes:1024*1024,maxFramePixels:400000,preserveDrawingBuffer:true
    });
    if(renderer.status!=='READY')throw Error('REAL_WEBGL_NOT_AVAILABLE');
    const createScene=rev=>{
      const positions=[],normals=[],indices=[];
      const n=5000;
      for(let i=0;i<n;i++){
       const p=positions.length/3;
       const x=(i%100)/25-2,z=Math.floor(i/100)/25-1;
       positions.push(x,0,z,x+.025,0,z,x,0,z+.025);
       normals.push(0,1,0,0,1,0,0,1,0);
       indices.push(p,p+1,p+2);
      }
      const mesh=createAIG3DMesh({positions,normals,indices,
       provenance:'SYNTHETIC_5000_TRIANGLES_GPU_RESIDENCY_TEST_NOT_CHARACTER'});
      const scene=createAIG3DScene({id:'fastmodel-v16-'+rev,
       consumer:'FastModel',units:'MM',source:'SYNTHETIC_GPU_BUFFER_STRESS_NOT_HUMAN_OR_CNC'});
      addAIG3DNode(scene,{id:'genuine_xyz_mesh',mesh,source:'BROWSER_GENERATED_TRIANGLES_NOT_APPROVED_MODEL'});
      addAIG3DToolpathOverlay(scene,{id:'unchanged_source_line',
       segments:[
        {motion:'G0',from:[0,1,0],to:[1,1,0]},
        {motion:'G1',from:[1,1,0],to:[1,0,0]}
       ],units:'MM',source:'EXPLICIT_SYNTHETIC_PATH_NOT_MACHINE'});
      return {scene,mesh};
    };
    const stats=[];
    let first=null,firstGpu=null,allReal=true;
    for(let frame=0;frame<14;frame++){
     const sample=frame===1?first:createScene(frame);
     if(frame===0)first=sample;
     const result=renderer.render(sample.scene);
     if(result.status!=='WEBGL_XYZ_TRIANGLES_RENDERED'||
      result.triangles!==5000||result.rapid!==1||result.feed!==1)
      allReal=false;
     const gpu=renderer.getGpuResources();
     if(frame===0)firstGpu=gpu;
     stats.push({frame,triangles:result.triangles,
      rapid:result.rapid,feed:result.feed,
      ...gpu});
    }
    const last=renderer.getGpuResources();
    const screenshotCanvas=canvas.toDataURL('image/png');
    const hasValidImage=screenshotCanvas.startsWith('data:image/png;base64,')&&
      screenshotCanvas.length>1000;
    renderer.destroy();
    const cleaned=renderer.getGpuResources();
    canvas.remove();
    return {allReal,stats,firstGpu,last,cleaned,hasValidImage,
     realGpuExecutionTimingMeasured:false,realNative60FPSClaimed:false};
   });
   assert.equal(result.allReal,true);
   assert.equal(result.hasValidImage,true);
   assert.equal(result.firstGpu.uploads,1);
   assert.equal(result.stats[1].uploads,1,'unchanged scene must not reupload geometry');
   assert.ok(result.last.uploads>=12,'new genuine XYZ meshes must upload');
   assert.ok(result.last.evictions>=5,'mesh VRAM must be evicted on turnover');
   assert.ok(result.last.residentBytes<=1024*1024);
   assert.ok(result.last.activeMeshBuffers<=2);
   assert.equal(result.last.pathBufferCreations,2,'G0 and G1 buffers reusable across frames');
   assert.ok(result.last.pathUploads>=28);
   assert.ok(result.last.pathGpuReallocations<=4);
   assert.equal(result.cleaned.residentBytes,0);
   assert.equal(result.cleaned.activeMeshBuffers,0);
   assert.equal(result.realNative60FPSClaimed,false);
   assert.deepEqual(errors,[]);
   await page.screenshot({path:dir+'/'+device.name+'-GPU-resource-proof.png',fullPage:true});
   await writeFile(dir+'/'+device.name+'-resource-proof.json',JSON.stringify({
    device:device.name,schema:'AIG_REAL3D_V1_6_REAL_WEBGL_GPU_RESIDENCY',
    assertions:{realTrianglesPerFrame:5000,pathBufferCreations:2,
     boundedMeshGPUResidency:true,realG0G1VisualPathStillRendered:true,
     GPUHandlesNoPerFrameChurn:true,allGPUResourcesReleased:true},
    first:result.firstGpu,last:result.last,cleaned:result.cleaned,
    initialSceneCopiedNotFabricatedCharacter:true,
    cpuFrameTimeNotMeasured:true,nativeGPU60FPSNotVerified:true
   },null,2));
   console.log('AIG_REAL3D_1_6_REAL_GPU_RESIDENCY_BROWSER_PASS',device.name,
    'allocations=',result.last.pathBufferCreations,'evictions=',result.last.evictions);
  }catch(e){
   await page.screenshot({path:dir+'/'+device.name+'-FAIL.png',fullPage:true}).catch(()=>{});
   throw Error(device.name+' '+String(e.message||e)+' scriptErrors='+JSON.stringify(errors));
  }finally{await page.close();}
 }
}finally{await browser.close();}
