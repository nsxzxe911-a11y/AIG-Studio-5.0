/**
 * Real Chromium WebGL: actual 12-triangle multi-part source GLB, with one
 * deliberately reversed source face. AI source is not faked; it is a
 * deterministic structural repair test, not a generated real heroine face.
 */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const dir='artifacts/aig-real3d-v107-comparison';
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
  name:'V107-COMPARISON-REFERENCE.png',mimeType:'image/png',buffer:Buffer.from(source)
 });
 await page.locator('#mesh-file').setInputFiles({
  name:'V107-COMPARISON-TRUE-GLB.glb',
  mimeType:'model/gltf-binary',buffer:Buffer.from(binary)
 });
 await page.locator('#v104-units').selectOption('MM');
 await page.locator('#import').click();
 await page.waitForFunction(()=>{
  const s=document.querySelector('#status')?.textContent??'';
  return s.startsWith('BLOCK')||s.includes('已從真正 GLB');
 },null,{timeout:30000});
 const initial=await page.locator('#status').textContent();
 if(initial.startsWith('BLOCK'))throw Error('V101_SOURCE_IMPORT_BLOCK_'+initial);
 const manifest=JSON.parse(await page.locator('#proof').textContent());
 assert.equal(manifest.sourceFaceCount,12);
 assert.equal(manifest.realMeshes,1);




 const modelSha=createHash('sha256').update(binary).digest('hex');
 const measurements=await page.evaluate(async ()=>{
  const originalImage=await document.querySelector('#reference').files[0].arrayBuffer();
  const originalGLB=await document.querySelector('#mesh-file').files[0].arrayBuffer();
  const importer=await import('/shared-3d/aig-real3d-v99-native-model-ingest.mjs');
  const {createAIG3DRenderer}=await import('/shared-3d/aig-real3d-webgl.mjs');
  const {auditAIGReal3DV107Source,planAIGReal3DV107FiveAxis}
   =await import('/shared-3d/aig-real3d-v107-five-axis-foot-head.mjs');
  const imageSha=await importer.sha256AIGReal3DBytes(originalImage);
  const modelSha=await importer.sha256AIGReal3DBytes(originalGLB);
  const imported=await importer.ingestAIGReal3DNativeGeneratedGLB({
   glbBytes:originalGLB,referenceImageBytes:originalImage,
   declaredImageSha256:imageSha,declaredGLBSha256:modelSha,
   domain:'PERSON',assetId:'CompareOriginalSource',
   outputOrigin:'AUTHORIZED_SOURCE_MESH',sourceUnits:'MM'
  });
  const originalScene=imported.scene;
  const before=JSON.stringify(originalScene);
  const audit=auditAIGReal3DV107Source(originalScene,modelSha);
  const element=document.createElement('canvas');
  element.id='comparison-native-renderer';element.width=640;element.height=480;
  element.style.width='640px';element.style.height='480px';
  element.style.maxWidth='none';
  document.body.appendChild(element);
  const renderer=createAIG3DRenderer(element,{quality:'performance',
   pixelRatio:1,maxFramePixels:640*480,maxTriangles:200000,
   preserveDrawingBuffer:true,background:[.004,.012,.024,1]});
  if(renderer.status!=='READY')throw Error('COMPARISON_WEBGL_UNAVAILABLE');
  renderer.setColorPipeline('PBR_SDR');
  renderer.setCamera({projection:'orthographic',yaw:.55,pitch:.24,
   distance:14,focus:[0,0,0],fovDeg:55,orthoSpan:10,near:.01,far:20000});
  const gl=element.getContext('webgl2')||element.getContext('webgl');
  const montage=document.createElement('canvas');
  montage.width=640*3;montage.height=510;
  montage.id='compare-three-views';
  montage.style.maxWidth='100%';montage.style.width='1200px';
  montage.style.height='auto';
  document.body.appendChild(montage);
  const mg=montage.getContext('2d');
  const samples={};
  const read=async(label,slot)=>{
   const width=element.width,height=element.height;
   const pix=new Uint8Array(width*height*4);
   gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,pix);
   const digest=await crypto.subtle.digest('SHA-256',pix);
   const sha=Array.from(new Uint8Array(digest),x=>
    x.toString(16).padStart(2,'0')).join('');
   let content=0;
   for(let k=0;k<pix.length;k+=4){
    if(Math.abs(pix[k]-1)>3||Math.abs(pix[k+1]-3)>3||
     Math.abs(pix[k+2]-6)>4)content++;
   }
   const code=gl.getError();
   if(code!==gl.NO_ERROR)throw Error('COMPARE_GL_ERROR_'+code);
   const img={rgba:pix,sha,contentPixels:content,width,height};
   samples[label]=img;
   if(slot>=0){
    mg.fillStyle='#0a1425';mg.fillRect(slot*640,0,640,510);
    mg.drawImage(element,slot*640,30,640,480);
    mg.font='bold 19px sans-serif';mg.fillStyle='#cbe8ff';
    mg.fillText(label,slot*640+10,22);
   }
   return img;
  };
  const baseline=renderer.render(originalScene);
  if(baseline.status!=='WEBGL_XYZ_TRIANGLES_RENDERED')
   throw Error('STANDARD_3D_NOT_ACTUALLY_RENDERED');
  const originalPixels=await read('BASELINE_3D',0);
  const zero=planAIGReal3DV107FiveAxis({
   scene:originalScene,sourceGLBSha256:modelSha,
   aTiltDeg:0,bTurnDeg:0,footHeadProgress:1,sourceAudit:audit});
  renderer.setVirtualStageV107({matrix:zero.modelStageMatrix,
   sourceScene:originalScene,sourceMaxY:zero.clipSourceYMax,
   sourceGLBSha256:modelSha,clipEnabled:false});
  const zeroDraw=renderer.render(originalScene);
  const zeroPixels=await read('FIVE_AXIS_A0_B0_FULL',1);
  const tilted=planAIGReal3DV107FiveAxis({
   scene:originalScene,sourceGLBSha256:modelSha,aTiltDeg:90,bTurnDeg:90,
   footHeadProgress:1,sourceAudit:audit});
  renderer.setVirtualStageV107({matrix:tilted.modelStageMatrix,
   sourceScene:originalScene,sourceMaxY:tilted.clipSourceYMax,
   sourceGLBSha256:modelSha,clipEnabled:false});
  const angledDraw=renderer.render(originalScene);
  const rotatedPixels=await read('FIVE_AXIS_A90_B90_FULL',2);
  const quarter=planAIGReal3DV107FiveAxis({
   scene:originalScene,sourceGLBSha256:modelSha,
   aTiltDeg:90,bTurnDeg:90,footHeadProgress:.25,sourceAudit:audit});
  renderer.setVirtualStageV107({matrix:quarter.modelStageMatrix,
   sourceScene:originalScene,sourceMaxY:quarter.clipSourceYMax,
   sourceGLBSha256:modelSha,clipEnabled:true});
  const clippedDraw=renderer.render(originalScene);
  const quarterPixels=await read('FIVE_AXIS_A90_B90_25',-1);
  const pixelDiff=(a,b)=>{
   let changed=0,absoluteDiff=0;
   for(let k=0;k<a.rgba.length;k+=4){
    let diff=0;
    for(let j=0;j<3;j++){
     const d=Math.abs(a.rgba[k+j]-b.rgba[k+j]);
     diff+=d;absoluteDiff+=d;
    }
    if(diff)changed++;
   }
   return {changedPixelCount:changed,
    changedPixelPercent:Math.round(changed/a.width/a.height*10000)/100,
    rgbMeanAbsoluteDifference:
     Math.round(absoluteDiff/(a.width*a.height*3)*1e6)/1e6};
  };
  const med=x=>[...x].sort((a,b)=>a-b)[Math.floor(x.length/2)];
  const timing={standard3D:[],fiveAxisZero:[],fiveAxisTilt:[]};
  function set(mode){
   const p=mode==='standard3D'?null:mode==='fiveAxisZero'?zero:tilted;
   if(!p)renderer.setVirtualStageV107(null);
   else renderer.setVirtualStageV107({matrix:p.modelStageMatrix,
    sourceScene:originalScene,sourceMaxY:p.clipSourceYMax,
    sourceGLBSha256:modelSha,clipEnabled:p.progress<1});
  }
  // Warm both programs and iterate interleaved to avoid direction bias.
  for(const mode of ['standard3D','fiveAxisZero','fiveAxisTilt']){
   set(mode);renderer.measureCompletedFrame(originalScene);
  }
  for(let cycle=0;cycle<9;cycle++){
   for(const mode of (cycle%2?
    ['fiveAxisTilt','fiveAxisZero','standard3D']:
    ['standard3D','fiveAxisZero','fiveAxisTilt'])){
    set(mode);
    const probe=renderer.measureCompletedFrame(originalScene);
    timing[mode].push(probe.completedGPUDrawAndSubmissionWallMs);
   }
  }
  const medians={
   standard3D:med(timing.standard3D),
   fiveAxisZero:med(timing.fiveAxisZero),
   fiveAxisTilt:med(timing.fiveAxisTilt)};
  const overheadPct=medians.standard3D>0?
   Math.round(10000*(medians.fiveAxisZero/medians.standard3D-1))/100:null;
  const result={schema:'AIG_REAL3D_V107_VS_TRADITIONAL_3D_GPU_COMPARISON_V1',
   inputImageSHA:imageSha,sourceGLBSha256:modelSha,
   originalTriangles:audit.trueIndexedSourceTriangles,
   sourceSceneRevision:audit.sourceSceneRevision,
   sourceByteJSONStringIdenticalBeforeAfter:JSON.stringify(originalScene)===before,
   sameSceneAndSourceGLBForBoth:true,
   sameCameraAndPBRShader:true,
   gpuContext:renderer.contextVersion,shaderPipeline:'PBR_SDR',
   frameWidth:originalPixels.width,frameHeight:originalPixels.height,
   traditional3D:{sha:originalPixels.sha,nonBackgroundPixelCount:originalPixels.contentPixels,
    drawStatus:baseline.status,triangles:baseline.triangles},
   fiveAxisZero:{sha:zeroPixels.sha,nonBackgroundPixelCount:zeroPixels.contentPixels,
    drawStatus:zeroDraw.status,triangles:zeroDraw.triangles,
    stageActuallyActive:zeroDraw.V107FiveAxisSourcePoseActive},
   fiveAxisRotated:{sha:rotatedPixels.sha,
    nonBackgroundPixelCount:rotatedPixels.contentPixels,
    drawStatus:angledDraw.status,triangles:angledDraw.triangles,
    stageActuallyActive:angledDraw.V107FiveAxisSourcePoseActive},
   fiveAxisQuarter:{sha:quarterPixels.sha,
    nonBackgroundPixelCount:quarterPixels.contentPixels,
    drawStatus:clippedDraw.status,triangles:clippedDraw.triangles,
    clipActuallyActive:clippedDraw.V107OriginalFootHeadGPUSliceEnabled},
   originalVsZero:pixelDiff(originalPixels,zeroPixels),
   originalVsRotated:pixelDiff(originalPixels,rotatedPixels),
   fullRotatedVsPartial:pixelDiff(rotatedPixels,quarterPixels),
   sourceTriangleCountInvariant:[
    baseline.triangles,zeroDraw.triangles,angledDraw.triangles,clippedDraw.triangles],
   childBRotatedAxis:tilted.childBActualAxis,
   renderingSamplesPerMode:9,renderTimingWallMs:timing,
   medianCompletedGPUDrawSubmissionWallMs:medians,
   fiveAxisZeroOverheadPercent:overheadPct,
   benchmarkDevice:'HEADLESS_CHROMIUM_SOFTWARE_SWIFTSHADER',
   realPhysicalGPUFPSMeasured:false,
   independentSourcePhotoSilhouetteOr3DFidelityCertified:false,
   trainedHumanAnatomyGenerationExecuted:false,
   virtualStageNotCNCRealMachineCertification:true,
   releasePASS:false};
  renderer.setVirtualStageV107(null);
  renderer.destroy();
  return result;
 });
 assert.equal(measurements.sourceGLBSha256,modelSha);
 assert.equal(measurements.originalTriangles,12);
 assert.equal(measurements.sameSceneAndSourceGLBForBoth,true);
 assert.equal(measurements.sameCameraAndPBRShader,true);
 assert.equal(measurements.sourceByteJSONStringIdenticalBeforeAfter,true);
 assert.equal(measurements.traditional3D.drawStatus,'WEBGL_XYZ_TRIANGLES_RENDERED');
 assert.equal(measurements.fiveAxisZero.stageActuallyActive,true);
 assert.equal(measurements.fiveAxisRotated.stageActuallyActive,true);
 assert.equal(measurements.fiveAxisQuarter.clipActuallyActive,true);
 assert.deepEqual(measurements.sourceTriangleCountInvariant,[12,12,12,12]);
 assert.equal(measurements.originalVsZero.changedPixelCount,0,
  'A=B=0 and footHead=100 must NOT change original appearance');
 assert.ok(measurements.originalVsRotated.changedPixelCount>1000,
  'A90 B90 should change actual pixels');
 assert.ok(measurements.fullRotatedVsPartial.changedPixelCount>1000,
  'Foot-to-head 25% must change actual GPU visibility');
 assert.deepEqual(measurements.childBRotatedAxis,[0,0,1]);
 assert.equal(measurements.renderingSamplesPerMode,9);
 assert.equal(measurements.realPhysicalGPUFPSMeasured,false);
 assert.equal(measurements.trainedHumanAnatomyGenerationExecuted,false);
 await writeFile(dir+'/V107-STANDARD-3D-VS-5AX-SOURCE-REAL-GPU.json',
  JSON.stringify(measurements,null,2));
 await writeFile(dir+'/V107-3D-5AX-SIDE-BY-SIDE.png',
  await page.locator('#compare-three-views').screenshot());
 assert.deepEqual(errors,[]);
 console.log('AIG_REAL3D_V107_VS_STANDARD_3D_REAL_GPU_COMPARE_PASS',
  JSON.stringify({sourceGLBSHA:modelSha,triangles:12,
   imageBaselineVsZeroDifference:measurements.originalVsZero.changedPixelCount,
   rotatedDifferentPixels:measurements.originalVsRotated.changedPixelCount,
   stagedDifferentPixels:measurements.fullRotatedVsPartial.changedPixelCount,
   medianMillis:measurements.medianCompletedGPUDrawSubmissionWallMs,
   timingDevice:measurements.benchmarkDevice,
   geometryLikenessNotImprovedByRotation:true}));
}finally{await browser.close();}
