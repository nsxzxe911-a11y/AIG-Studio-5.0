/** True native WebGL comparisons from exactly one NONHUMAN source GLB. */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,copyFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
function makeGLB(){
 const rows=41,sections=42,vertices=[],inds=[];
 for(let j=0;j<rows;j++)for(let k=0;k<sections;k++){
  const y=j/(rows-1),r=Math.max(.009,Math.sin(Math.PI*y)),
   a=k*2*Math.PI/sections;
  vertices.push(.24*r*Math.cos(a),y,.14*r*Math.sin(a));
 }
 for(let j=0;j<rows-1;j++)for(let k=0;k<sections;k++){
  const a=j*sections+k,b=j*sections+(k+1)%sections,
   c=(j+1)*sections+k,d=(j+1)*sections+(k+1)%sections;
  inds.push(a,b,d,a,d,c);
 }
 let n=vertices.length/3;vertices.push(0,0,0,0,1,0);
 for(let k=0;k<sections;k++)inds.push(n,(k+1)%sections,k,
  n+1,(rows-1)*sections+k,(rows-1)*sections+(k+1)%sections);
 const pos=Buffer.from(new Float32Array(vertices).buffer),
  faces=Buffer.from(new Uint32Array(inds).buffer),bin=Buffer.concat([pos,faces]);
 const gltf={asset:{version:'2.0',generator:'NONHUMAN QA FIXTURE'},
  buffers:[{byteLength:bin.length}],
  bufferViews:[{buffer:0,byteLength:pos.length},
   {buffer:0,byteOffset:pos.length,byteLength:faces.length}],
  accessors:[{bufferView:0,componentType:5126,count:vertices.length/3,type:'VEC3'},
   {bufferView:1,componentType:5125,count:inds.length,type:'SCALAR'}],
  meshes:[{primitives:[{attributes:{POSITION:0},indices:1}]}],
  nodes:[{mesh:0}],scenes:[{nodes:[0]}],scene:0};
 const j=Buffer.from(JSON.stringify(gltf)),pad=(4-j.length%4)%4,
  jb=Buffer.concat([j,Buffer.alloc(pad,32)]);
 const total=12+8+jb.length+8+bin.length;
 const out=Buffer.alloc(total);
 out.writeUInt32LE(0x46546c67,0);out.writeUInt32LE(2,4);
 out.writeUInt32LE(total,8);out.writeUInt32LE(jb.length,12);
 out.writeUInt32LE(0x4e4f534a,16);jb.copy(out,20);
 let start=20+jb.length;
 out.writeUInt32LE(bin.length,start);
 out.writeUInt32LE(0x004e4942,start+4);bin.copy(out,start+8);
 return out;
}
const folder='artifacts/aig-real3d-brown-4pass-real-gpu';
await mkdir(folder,{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 '--enable-webgl','--use-gl=angle','--use-angle=swiftshader',
 '--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1320,height:920},acceptDownloads:true});
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:8772/shared-3d/aig-real3d-human-brown-render-lab.html',
  {waitUntil:'domcontentloaded',timeout:30000});
 await page.locator('#model-file').setInputFiles({name:'SYNTHETIC_NONHUMAN_ELLIPSE.glb',
  mimeType:'model/gltf-binary',buffer:makeGLB()});
 await page.locator('#body-height').fill('1680');
 await page.locator('#inspect').click();
 await page.waitForFunction(()=>{
  const btn=document.querySelector('#inspect'),status=document.querySelector('#status');
  return !btn?.disabled&&(status?.dataset.ready==='true'||status?.textContent?.startsWith('BLOCK'));
 },null,{timeout:210000});
 const stat=await page.locator('#status').textContent();
 assert.equal(await page.locator('#status').getAttribute('data-ready'),'false',stat);
 assert.match(stat,/BLOCK：下半身只有單一 3D 連續截面/);
 assert.match(await page.locator('#shape-envelope-stats').textContent(),/非人體合成橢球/);
 const evidence=JSON.parse(await page.locator('#evidence').textContent());
 assert.equal(evidence.schema,'AIG_REAL3D_FRAME_GEOMETRY_FIRST_V1');
 assert.equal(evidence.originalGLB.renderGeometryPASS,true);
 assert.equal(evidence.sourceShapeEnvelope.fixtureExplicitlySyntheticNonhuman,true);
 assert.equal(evidence.sourceShapeEnvelope.releasePASS,false);
 assert.equal(evidence.source3DSections.sections.length,4);
 assert.equal(evidence.source3DSections.oneClosedLowerMassFlag,true);
 assert.equal(evidence.source3DSections.sections[0].significantClosedLoops,1);
 assert.equal(evidence.source3DSections.releasePASS,false);
 assert.equal(await page.locator('#source-3d-slice-table tbody tr').count(),4);
 assert.equal(evidence.sourceShapeEnvelope.geometryWasModified,false);
 assert.equal(evidence.sharedWebGLBloomPresent,false);
 assert.equal(evidence.baseSourceUnchanged,true);
 assert.equal(evidence.geometry.anatomicalVisualApproval,false);
 assert.equal(evidence.blackOutlineCreatedInGPUFromSubjectMask,true);
 assert.equal(evidence.brownFullBodyColorOverrideApplied,true);
 assert.equal(evidence.stage1ReleasePASS,false);
 assert.equal(evidence.sevenRealBrownGPUPasses.length,7);
 assert.equal(await page.locator('#gallery figure').count(),7);
 const names=[],sums=new Set();
 for(let i=0;i<7;i++){
  const a=evidence.sevenRealBrownGPUPasses[i],el=page.locator('#gallery figure').nth(i);
  const promise=page.waitForEvent('download',{timeout:30000});
  await el.locator('a').click();
  const dl=await promise,bytes=await readFile(await dl.path());
  assert.equal(bytes.readUInt32BE(0),0x89504e47);
  assert.equal(bytes.readUInt32BE(16),1080);
  assert.equal(bytes.readUInt32BE(20),1920);
  const sha=createHash('sha256').update(bytes).digest('hex');
  assert.equal(sha,a.sha256);
  sums.add(sha);
  const name=i+'-'+a.angle+'-'+a.mode+'-REAL_GPU.png';
  await copyFile(await dl.path(),folder+'/'+name);
  names.push({mode:a.mode,angle:a.angle,filename:name,sha256:sha});
 }
 assert.equal(new Set(names.slice(0,4).map(x=>x.sha256)).size,4);
 assert.deepEqual(names.slice(0,4).map(x=>x.mode),['BLACK_CONTOUR','BROWN_FLAT','BROWN_VOLUME','BROWN_FINISH']);
 assert.ok(sums.size>=6,'All views must render actual geometry changes');
 // Keep all 7 source QA captures at exactly 1080p. Independently verify
 // true 2K GPU output, not a CSS enlargement of the 1080p PNG.
 assert.equal(await page.locator('#native-output-render').isDisabled(),false);
 await page.locator('#native-output-preset').selectOption('2K');
 await page.locator('#native-output-orientation').selectOption('portrait');
 await page.locator('#native-output-angle').selectOption('front');
 await page.locator('#native-output-render').click();
 await page.waitForFunction(()=>{
  const btn=document.getElementById('native-output-render'),
   status=document.getElementById('native-output-status')?.textContent||'';
  return !btn?.disabled&&(status.startsWith('真正 GPU')||status.startsWith('BLOCK'));
 },null,{timeout:210000});
 const highStatus=await page.locator('#native-output-status').textContent();
 assert.match(highStatus,/真正 GPU 2K 1440×2560/,highStatus);
 const hReport=JSON.parse(await page.locator('#evidence').textContent());
 const h=hReport.nativeGpuExports?.at(-1);
 assert.equal(h.selectedPreset,'2K');
 assert.equal(h.nativePNGWidth,1440);
 assert.equal(h.nativePNGHeight,2560);
 assert.equal(h.pixels,3686400);
 assert.equal(h.actualGPUReadback,true);
 assert.equal(h.noUpscale,true);
 assert.equal(h.releasePASS,false);
 const promisedHigh=page.waitForEvent('download',{timeout:30000});
 await page.locator('#native-output-download').click();
 const highFile=await promisedHigh,highBytes=await readFile(await highFile.path());
 assert.equal(highBytes.readUInt32BE(0),0x89504e47);
 assert.equal(highBytes.readUInt32BE(16),1440);
 assert.equal(highBytes.readUInt32BE(20),2560);
 assert.equal(createHash('sha256').update(highBytes).digest('hex'),h.pngSha256);
 await copyFile(await highFile.path(),folder+'/REAL-2K-1440x2560-GPU.png');
 // A single real 4K capture is opt-in and BLOCKs visibly if actual
 // GPU resource limits prevent a native 8,294,400 pixel PNG.
 await page.locator('#native-output-preset').selectOption('4K');
 await page.locator('#native-output-render').click();
 await page.waitForFunction(()=>{
  const btn=document.getElementById('native-output-render'),
   status=document.getElementById('native-output-status')?.textContent||'';
  return !btn?.disabled&&(status.startsWith('真正 GPU')||status.startsWith('BLOCK'));
 },null,{timeout:240000});
 const fourKStatus=await page.locator('#native-output-status').textContent();
 let real4KProven=false;
 if(fourKStatus.startsWith('真正 GPU')){
  assert.match(fourKStatus,/4K 2160×3840/);
  const snapshot=JSON.parse(await page.locator('#evidence').textContent());
  const output=snapshot.nativeGpuExports.at(-1);
  assert.equal(output.nativePNGWidth,2160);
  assert.equal(output.nativePNGHeight,3840);
  assert.equal(output.pixels,8294400);
  assert.equal(output.actualGPUReadback,true);
  assert.equal(output.noUpscale,true);
  const download=page.waitForEvent('download',{timeout:30000});
  await page.locator('#native-output-download').click();
  const d=await download,bytes=await readFile(await d.path());
  assert.equal(bytes.readUInt32BE(16),2160);
  assert.equal(bytes.readUInt32BE(20),3840);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),output.pngSha256);
  await copyFile(await d.path(),folder+'/REAL-4K-2160x3840-GPU.png');
  real4KProven=true;
 }else{
  assert.match(fourKStatus,/BLOCK/);
  assert.match(fourKStatus,/(?:GPU_TEXTURE_OR_RENDERBUFFER_LIMIT|4K_REQUIRES_HIGH_MEMORY_DEVICE|AIG3D_|WebGL|記憶體|GPU|原生)/);
  assert.equal(await page.locator('#native-output-download').isHidden(),true);
 }
 assert.deepEqual(errors,[]);
 await page.screenshot({path:folder+'/diagnostic-workbench.png',fullPage:true});
 await writeFile(folder+'/manifest.json',JSON.stringify({
  SOURCE:'SYNTHETIC NONHUMAN GLB - NOT HUMAN BODY',
  sevenActualGPUPngFrames:7,
  true2KGPU1440x2560SHAValidated:true,
  true4K2160x3840GPUValidated:real4KProven,
  true4KHardwareBlockWhenUnproven:!real4KProven,
  sourceMorphologyDoesNotChangeWithLighting:true,
  authenticHumanVisualPASS:false,
  geometryEvidence:evidence.geometry,
  images:names
 },null,2));
 console.log('REAL3D_BROWN_BLACK_OUTLINE_7_REAL_GPU_PASS_NONHUMAN');
}catch(e){
 console.error('REAL3D_BROWN_PASS_BROWSER_GATE_BLOCK',e.stack||String(e));
 process.exitCode=1;
 await page.screenshot({path:folder+'/FAILED.png',fullPage:true}).catch(()=>{});
}finally{await browser.close();}
