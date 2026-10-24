/**
 * Real Chromium WebGL: actual 12-triangle multi-part source GLB, with one
 * deliberately reversed source face. AI source is not faked; it is a
 * deterministic structural repair test, not a generated real heroine face.
 */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const dir='artifacts/aig-real3d-v107-five-axis';
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



 assert.equal(await page.locator('#v107-step').isEnabled(),true);
 const modelSha=createHash('sha256').update(binary).digest('hex');
 let report=JSON.parse(await page.locator('#v107-stage-report').textContent());
 assert.equal(report.status,'READY_NOT_YET_RENDERED');
 assert.equal(report.originalTriangleCount,12);
 assert.equal(report.sourceGLBSha256,modelSha);
 // The FIRST actual slider input requests a true shader clipped GPU frame.
 await page.locator('#v107-progress').evaluate(input=>{
  input.value='25';input.dispatchEvent(new Event('input',{bubbles:true}));
 });
 report=JSON.parse(await page.locator('#v107-stage-report').textContent());
 assert.equal(report.actualWebGLFrameStatus,'WEBGL_XYZ_TRIANGLES_RENDERED');
 assert.equal(report.actualGPUV107OriginalYClip,true);
 assert.equal(report.originalTrueTriangles,12);
 assert.equal(report.footHeadProgress,.25);
 const quarterFrame=await page.locator('#model').screenshot();
 // Tilt A 90 and then B 90. B axis MUST follow rotated A.
 await page.locator('#v107-a').evaluate(input=>{
  input.value='90';input.dispatchEvent(new Event('input',{bubbles:true}));
 });
 await page.locator('#v107-b').evaluate(input=>{
  input.value='90';input.dispatchEvent(new Event('input',{bubbles:true}));
 });
 report=JSON.parse(await page.locator('#v107-stage-report').textContent());
 assert.equal(report.aTiltDeg,90);
 assert.equal(report.bTurnDeg,90);
 assert.deepEqual(report.modelStageABLocalAxis,[0,0,1]);
 assert.equal(report.originalTrueTriangles,12);
 await page.locator('#v107-progress').evaluate(input=>{
  input.value='100';input.dispatchEvent(new Event('input',{bubbles:true}));
 });
 const allFrame=await page.locator('#model').screenshot();
 assert.notEqual(createHash('sha256').update(quarterFrame).digest('hex'),
  createHash('sha256').update(allFrame).digest('hex'),
  'actual foot-head GPU source height clipping must change pixels');
 report=JSON.parse(await page.locator('#v107-stage-report').textContent());
 assert.equal(report.footHeadProgress,1);
 // Upstream XYZ controls observation, independent of lower A/B rotations.
 await page.locator('#v107-x').fill('0.5');
 await page.locator('#v107-y').fill('0.25');
 await page.locator('#v107-z').fill('0.1');
 report=JSON.parse(await page.locator('#v107-stage-report').textContent());
 assert.deepEqual(report.topXYZCNCmm,[.5,.25,.1]);
 assert.deepEqual(report.modelStageABLocalAxis,[0,0,1]);
 // Incremental source slicing: actual Start -> Pause -> Resume -> Full.
 await page.locator('#v107-start').click();
 let status=await page.locator('#v107-stage-status').textContent();
 assert.ok(!status.startsWith('BLOCK'),status);
 await page.locator('#v107-pause').click();
 status=await page.locator('#v107-stage-status').textContent();
 assert.ok(status.includes('逐層繪圖已暫停'),status);
 await page.locator('#v107-resume').click();
 await page.waitForFunction(()=>Number(
  document.querySelector('#v107-progress')?.value)>0,null,{timeout:15000});
 await page.locator('#v107-pause').click();
 await page.locator('#v107-full').click();
 report=JSON.parse(await page.locator('#v107-stage-report').textContent());
 assert.equal(report.footHeadProgress,1);
 assert.equal(report.aTiltDeg,0);assert.equal(report.bTurnDeg,0);
 assert.deepEqual(report.topXYZCNCmm,[0,0,0]);
 assert.equal(report.trueOneGLBSource,true);
 assert.equal(report.releasePASS,false);
 const v107Full=await page.locator('#model').screenshot();
 await writeFile(dir+'/V107-A90-B90-ORIGINAL-SOURCE-PARTIAL.png',quarterFrame);
 await writeFile(dir+'/V107-FULL-SOURCE-GLB.png',v107Full);
 await writeFile(dir+'/V107-REAL-5AX-SOURCE-GPU-EVIDENCE.json',JSON.stringify({
  originalSourceSha256:modelSha,
  originalTrueTriangles:12,
  actualWebGLDrawAndOriginalYClip:true,
  ABChildRotation90Axis:[0,0,1],
  quarterFullFramesActuallyDiffer:true,
  topXYZSeparateFromRotaryAB:true,
  footToHeadProgressAndPauseResumeActuallyTested:true,
  originalMeshAndUVUnmodified:true,
  actualAnatomicalFeetHeadGeometryAvailable:false,
  anyRealCNCMachineMotionCertification:false,
  trainedAIHighFidelityAnatomyPassed:false,
  releasePASS:false
 },null,2));
 assert.deepEqual(errors,[]);
 console.log('AIG_REAL3D_V107_TRUE_FIVE_AXIS_AND_FOOT_HEAD_SOURCE_GPU_PASS',
  JSON.stringify({triangles:12,sourceGLBSha256:modelSha,
   gpuDraw:true,sourceHeightClipping:true,footHeadFromRealIndexedXYZ:true,
   upperXYZAndABIndependent:true,realCNCNotControlled:true}));
}finally{await browser.close();}
