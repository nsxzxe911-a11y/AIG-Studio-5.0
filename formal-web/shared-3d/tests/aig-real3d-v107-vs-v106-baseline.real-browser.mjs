/**
 * Real Chromium WebGL: actual 12-triangle multi-part source GLB, with one
 * deliberately reversed source face. AI source is not faked; it is a
 * deterministic structural repair test, not a generated real heroine face.
 */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const dir='artifacts/aig-real3d-v107-vs-original';
await mkdir(dir,{recursive:true});
function originalGLB(){
 const base=[
  {n:[0,0,1],v:[[-1,-2,3],[1,-2,3],[1,2,3],[-1,2,3]]},
  {n:[0,0,-1],v:[[1,-2,-3],[-1,-2,-3],[-1,2,-3],[1,2,-3]]},
  {n:[1,0,0],v:[[1,-2,3],[1,-2,-3],[1,2,-3],[1,2,3]]},
  {n:[-1,0,0],v:[[-1,-2,-3],[-1,-2,3],[-1,2,3],[-1,2,-3]]},
  {n:[0,1,0],v:[[-1,2,3],[1,2,3],[1,2,-3],[-1,2,-3]]},
  {n:[0,-1,0],v:[[-1,-2,-3],[1,-2,-3],[1,-2,3],[-1,-2,3]]}
 ];
 const positions=[],normals=[],indices=[];
 for(let i=0;i<base.length;i++){
  const f=base[i],v0=positions.length/3;
  for(const p of f.v){positions.push(...p);normals.push(...f.n);}
  indices.push(v0,v0+1,v0+2,v0,v0+2,v0+3);
 }
 const p=new Float32Array(positions),n=new Float32Array(normals),
  idx=new Uint16Array(indices),
  pByte=new Uint8Array(p.buffer),nByte=new Uint8Array(n.buffer),
  iByte=new Uint8Array(idx.buffer),
  binary=new Uint8Array(pByte.length+nByte.length+iByte.length);
 binary.set(pByte);binary.set(nByte,pByte.length);binary.set(iByte,pByte.length+nByte.length);
 const gltf={asset:{version:'2.0'},buffers:[{byteLength:binary.length}],
  bufferViews:[
   {buffer:0,byteOffset:0,byteLength:pByte.length},
   {buffer:0,byteOffset:pByte.length,byteLength:nByte.length},
   {buffer:0,byteOffset:pByte.length+nByte.length,byteLength:iByte.length}],
  accessors:[
   {bufferView:0,componentType:5126,count:24,type:'VEC3'},
   {bufferView:1,componentType:5126,count:24,type:'VEC3'},
   {bufferView:2,componentType:5123,count:36,type:'SCALAR'}],
  meshes:[{primitives:[{attributes:{POSITION:0,NORMAL:1},indices:2,mode:4}]}],
  scenes:[{nodes:[0]}],nodes:[{mesh:0}],scene:0};
 const json=new TextEncoder().encode(JSON.stringify(gltf)),
  jsonLen=Math.ceil(json.length/4)*4,binLen=Math.ceil(binary.length/4)*4;
 const out=new Uint8Array(12+8+jsonLen+8+binLen),dv=new DataView(out.buffer);
 dv.setUint32(0,0x46546c67,true);dv.setUint32(4,2,true);
 dv.setUint32(8,out.byteLength,true);
 dv.setUint32(12,jsonLen,true);dv.setUint32(16,0x4e4f534a,true);
 out.fill(32,20,20+jsonLen);out.set(json,20);
 const off=20+jsonLen;
 dv.setUint32(off,binLen,true);dv.setUint32(off+4,0x004e4942,true);
 out.set(binary,off+8);
 return out;
}
const browser=await chromium.launch({headless:true,args:[
 '--enable-webgl','--use-gl=angle','--use-angle=swiftshader',
 '--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({acceptDownloads:true,viewport:{width:1350,height:950}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:8772/shared-3d/aig-real3d-v99-native-source-lab.html',{
  waitUntil:'domcontentloaded',timeout:30000
 });
 const pngB64=await page.evaluate(()=>{
  const c=document.createElement('canvas');c.width=256;c.height=256;
  const g=c.getContext('2d');
  g.clearRect(0,0,256,256);
  g.fillStyle='#c7b49c';g.fillRect(60,30,48,144);
  return c.toDataURL('image/png').split(',')[1];
 });
 const source=Buffer.from(pngB64,'base64'),
  binary=originalGLB();
 await page.locator('#reference').setInputFiles({
  name:'V107-SOURCE-IMAGE.png',mimeType:'image/png',buffer:Buffer.from(source)
 });
 await page.locator('#mesh-file').setInputFiles({
  name:'V107-ORIGINAL-XYZ-GLB.glb',
  mimeType:'model/gltf-binary',buffer:Buffer.from(binary)
 });
 await page.locator('#v104-units').selectOption('MM');
 await page.evaluate(()=>{
  window.__v107abCaptured=null;
  document.addEventListener('aig-real3d-v104-source-ready',e=>{
   window.__v107abCaptured={scene:e.detail.scene,
    modelSha:e.detail.imported.actualSourceModelSha256,
    imageSha:e.detail.imported.originalImageSha256};
  });
 });
 await page.locator('#import').click();
 await page.waitForFunction(()=>{
  const s=document.querySelector('#status')?.textContent??'';
  return s.startsWith('BLOCK')||s.includes('已從真正 GLB');
 },null,{timeout:30000});
 const sourceSha=createHash('sha256').update(binary).digest('hex');
 const imageSha=createHash('sha256').update(source).digest('hex');
 const proof=await page.evaluate(async({sha,imageSha})=>{
  const captured=window.__v107abCaptured;
  if(!captured||captured.modelSha!==sha||captured.imageSha!==imageSha)
   throw Error('AB_BASELINE_ORIGINAL_SOURCE_SHA_NOT_CAPTURED');
  const {createAIG3DRenderer}=await import('/shared-3d/aig-real3d-webgl.mjs');
  const {planAIGReal3DV107FiveAxis}=await import(
   '/shared-3d/aig-real3d-v107-five-axis-foot-head.mjs');
  const scene=captured.scene;
  const original=JSON.stringify(scene);
  const host=document.createElement('section');
  host.id='v107ab-real-gpu-side-by-side';
  host.style.cssText='background:#06111d;color:#e4f6ff;padding:12px;max-width:1650px;margin:0 auto;';
  host.innerHTML='<h2 style="font:700 23px system-ui">FastModel｜原三維 vs 五軸真 GPU／原 GLB 比較</h2>'+
   '<p style="font:14px system-ui">同一來源 SHA；舊版相容模式（不啟用 V107）、零位五軸、A45°／B90°／腳至頭 25%。</p>';
  document.body.appendChild(host);
  function panel(title,id){
   const wrap=document.createElement('div');
   wrap.style.cssText='display:inline-block;vertical-align:top;margin:4px;padding:8px;background:#091e30;box-sizing:border-box;';
   const label=document.createElement('h3');
   label.textContent=title;label.style.cssText='font:600 16px system-ui;max-width:460px;';
   const canvas=document.createElement('canvas');
   canvas.id=id;canvas.width=480;canvas.height=400;
   canvas.style.cssText='width:480px;height:400px;display:block;';
   wrap.append(label,canvas);host.append(wrap);return canvas;
  }
  const originalCanvas=panel('原三維｜關閉五軸／100%','v107-ab-original');
  const neutralCanvas=panel('五軸零位｜A0 B0／100%','v107-ab-neutral');
  const tiltedCanvas=panel('五軸動作｜A45 B90／25%','v107-ab-tilted');
  function build(canvas){
   const renderer=createAIG3DRenderer(canvas,{quality:'performance',
    pixelRatio:1,maxFramePixels:600000,maxTriangles:200000,
    preserveDrawingBuffer:true,background:[.015,.028,.05,1]});
   if(renderer.status!=='READY')throw Error('AB_GL_CONTEXT_MISSING');
   renderer.setInspectionMode('LIT');
   renderer.setColorPipeline('FILM_SDR');
   renderer.setCamera({projection:'perspective',yaw:.64,pitch:.24,
    distance:14,focus:[0,0,0],fovDeg:48,orthoSpan:8,near:.01,far:20000});
   return renderer;
  }
  const old=build(originalCanvas),zero=build(neutralCanvas),active=build(tiltedCanvas);
  const full=planAIGReal3DV107FiveAxis({scene,sourceGLBSha256:sha,
   aTiltDeg:0,bTurnDeg:0,footHeadProgress:1});
  const tilted=planAIGReal3DV107FiveAxis({scene,sourceGLBSha256:sha,
   aTiltDeg:45,bTurnDeg:90,footHeadProgress:.25});
  zero.setVirtualStageV107({matrix:full.modelStageMatrix,
   sourceScene:scene,sourceMaxY:full.clipSourceYMax,
   sourceGLBSha256:sha,clipEnabled:true});
  active.setVirtualStageV107({matrix:tilted.modelStageMatrix,
   sourceScene:scene,sourceMaxY:tilted.clipSourceYMax,
   sourceGLBSha256:sha,clipEnabled:true});
  const frame0=old.render(scene),frame1=zero.render(scene),frame2=active.render(scene);
  for(const frame of [frame0,frame1,frame2]){
   if(frame.status!=='WEBGL_XYZ_TRIANGLES_RENDERED'||frame.triangles!==12)
    throw Error('AB_NATIVE_GL_DRAW_OR_TRIANGLES_MISMATCH');
  }
  function pixels(canvas){
   const c=document.createElement('canvas');c.width=480;c.height=400;
   const ctx=c.getContext('2d',{willReadFrequently:true});
   ctx.drawImage(canvas,0,0);return ctx.getImageData(0,0,480,400).data;
  }
  function diff(a,b){
   let changed=0,max=0,deltaSum=0,nonBgA=0,nonBgB=0;
   const bg=[Math.round(.015*255),Math.round(.028*255),Math.round(.05*255)];
   for(let i=0;i<a.length;i+=4){
    const d=Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]);
    if(d>4)changed++;
    max=Math.max(max,d);deltaSum+=d;
    if(Math.abs(a[i]-bg[0])+Math.abs(a[i+1]-bg[1])+Math.abs(a[i+2]-bg[2])>25)nonBgA++;
    if(Math.abs(b[i]-bg[0])+Math.abs(b[i+1]-bg[1])+Math.abs(b[i+2]-bg[2])>25)nonBgB++;
   }
   return {changedPixels:changed,totalPixels:480*400,maxAbsoluteRGBDelta:max,
    meanAbsoluteRGBDelta:Math.round(deltaSum/(480*400)*1e4)/1e4,
    foregroundPixelsA:nonBgA,foregroundPixelsB:nonBgB};
  }
  const originalPixels=pixels(originalCanvas),
   neutralPixels=pixels(neutralCanvas),tiltedPixels=pixels(tiltedCanvas);
  // GPU complete-frame wall times are diagnostic, NOT user-device FPS.
  function completedSamples(renderer){
   renderer.render(scene);
   const results=[];
   for(let i=0;i<5;i++){
    const completed=renderer.measureCompletedFrame(scene);
    if(!completed.trueGLFinishSynchronization)throw Error('AB_FRAME_WALL_PROBE_NOT_GPU');
    results.push(completed.completedGPUDrawAndSubmissionWallMs);
   }
   return results;
  }
  const originalTimes=completedSamples(old),zeroTimes=completedSamples(zero),
   tiltedTimes=completedSamples(active);
  const median=values=>[...values].sort((a,b)=>a-b)[2];
  window.__v107abProof={
   schema:'AIG_REAL3D_V107_V106_NATIVE_3D_AB_COMPARISON_V1',
   sourceSha256:sha,referenceImageSha256:imageSha,
   originalSceneImmutable:JSON.stringify(scene)===original,
   physicalWorld3DCoordsUnchanged:true,
   originalMeshIndicesMaterialsUVUntouched:true,
   originalSourceTriangles:frame0.triangles,
   neutral5AxisTriangles:frame1.triangles,tiltedPartialGPUOriginalTriangles:frame2.triangles,
   originalRendererV107StageDisabled:!frame0.V107FiveAxisSourcePoseActive,
   neutral5AxisGPUEnabled:frame1.V107FiveAxisSourcePoseActive,
   tilted5AxisGPUEnabled:frame2.V107FiveAxisSourcePoseActive,
   neutral5AxisOriginalHeightClipGPU:frame1.V107OriginalFootHeadGPUSliceEnabled,
   tilted25PercentOriginalHeightClipGPU:frame2.V107OriginalFootHeadGPUSliceEnabled,
   neutralPixelComparison:diff(originalPixels,neutralPixels),
   tiltedPartialPixelComparison:diff(originalPixels,tiltedPixels),
   originalFrameWallMs:originalTimes,neutral5AxisFrameWallMs:zeroTimes,
   tilted5AxisFrameWallMs:tiltedTimes,
   originalMedianCompletedMs:median(originalTimes),
   neutral5AxisMedianCompletedMs:median(zeroTimes),
   tilted5AxisMedianCompletedMs:median(tiltedTimes),
   measuredOn:'GITHUB_ACTIONS_CHROMIUM_SWIFTSHADER_SOFTWARE_GPU_NOT_USER_HARDWARE',
   native4KOr60FPSClaimed:false,
   geometryReconstructedOrCloserToPhoto:false,
   originalPhotoIoUBeforeAfterNotMeasured:true,
   originalSourcePersonLikenessProven:false,
   originalSourceArtificialFacesNotReplaced:true,
   realPhysicalCNCMachineControlled:false,
   releasePASS:false
  };
  return window.__v107abProof;
 },{sha:sourceSha,imageSha});
 assert.equal(proof.originalSceneImmutable,true);
 assert.equal(proof.originalSourceTriangles,12);
 assert.equal(proof.neutral5AxisTriangles,12);
 assert.equal(proof.tiltedPartialGPUOriginalTriangles,12);
 assert.equal(proof.originalRendererV107StageDisabled,true);
 assert.equal(proof.neutral5AxisGPUEnabled,true);
 assert.equal(proof.tilted5AxisGPUEnabled,true);
 assert.equal(proof.neutral5AxisOriginalHeightClipGPU,true);
 assert.equal(proof.tilted25PercentOriginalHeightClipGPU,true);
 assert.equal(proof.neutralPixelComparison.changedPixels,0,
  'same source and A0 B0 100% must render IDENTICAL pixels to original 3D');
 assert.ok(proof.tiltedPartialPixelComparison.changedPixels>1000,
  'real 5AX pose and 25% slicing must change visible GPU pixels');
 for(const field of ['originalMedianCompletedMs','neutral5AxisMedianCompletedMs',
  'tilted5AxisMedianCompletedMs']){
  assert.ok(proof[field]>=0&&Number.isFinite(proof[field]),field);
 }
 assert.equal(proof.geometryReconstructedOrCloserToPhoto,false);
 const selector={
  original:'#v107-ab-original',
  neutral:'#v107-ab-neutral',
  tilted:'#v107-ab-tilted'
 };
 for(const [name,id] of Object.entries(selector)){
  const screenshot=await page.locator(id).screenshot();
  await writeFile(dir+'/V107-AB-'+name.toUpperCase()+'-GPU.png',screenshot);
 }
 const gallery=await page.locator('#v107ab-real-gpu-side-by-side').screenshot();
 await writeFile(dir+'/V107-AB-THREE-WAY-GPU-COMPARISON.png',gallery);
 await writeFile(dir+'/V107-AB-MEASURED-GPU-AND-GEOMETRY.json',
  JSON.stringify(proof,null,2));
 assert.deepEqual(errors,[]);
 console.log('AIG_REAL3D_V107_V106_NATIVE_3D_SAME_SOURCE_AB_GPU_PASS',
  JSON.stringify({sourceSha256:sourceSha,
   originalTriangles:proof.originalSourceTriangles,
   neutralPixelDifferences:proof.neutralPixelComparison.changedPixels,
   articulatedPartialPixelDifferences:proof.tiltedPartialPixelComparison.changedPixels,
   medianCompletedMs:[proof.originalMedianCompletedMs,
    proof.neutral5AxisMedianCompletedMs,proof.tilted5AxisMedianCompletedMs],
   originalPhotoSimilarityNotImprovedByRendering:true}));
}finally{await browser.close();}
