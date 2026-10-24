/* True local >110k OBJ + native 1080 GPU PNG, not a human fixture. */
import {chromium} from 'playwright';
import {mkdir,readFile,copyFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const dir='artifacts/aig-real3d-dense-original-source';
const makeSource=()=>{
 const rings=315,segments=360,rows=[];
 for(let j=0;j<rings;j++){
  const t=j/(rings-1),r=.14+.052*Math.sin(Math.PI*t);
  for(let k=0;k<segments;k++){
   const a=2*Math.PI*k/segments;
   rows.push('v '+(r*Math.cos(a)).toFixed(7)+' '+t.toFixed(7)+' '+
    (r*.75*Math.sin(a)).toFixed(7));
  }
 }
 for(let j=0;j<rings-1;j++)for(let k=0;k<segments;k++){
  const a=j*segments+k+1,b=j*segments+(k+1)%segments+1,
   c=(j+1)*segments+k+1,d=(j+1)*segments+(k+1)%segments+1;
  rows.push('f '+a+' '+b+' '+d,'f '+a+' '+d+' '+c);
 }
 return {bytes:Buffer.from(rows.join('\n')),
  vertices:rings*segments,triangles:(rings-1)*segments*2};
};
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 '--enable-webgl','--use-gl=angle','--use-angle=swiftshader',
 '--no-sandbox','--disable-dev-shm-usage'
]});
const page=await browser.newPage({viewport:{width:1200,height:900},acceptDownloads:true});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:8772/shared-3d/aig-real3d-human-brown-render-lab.html',
  {waitUntil:'domcontentloaded',timeout:30000});
 const {bytes,vertices,triangles}=makeSource();
 const inputSha=createHash('sha256').update(bytes).digest('hex');
 await page.locator('#model-file').setInputFiles({
  name:'HIGH_DENSITY_NONHUMAN_RAW_GEOMETRY.obj',
  mimeType:'text/plain',buffer:bytes
 });
 await page.locator('#body-height').fill('1680');
 await page.locator('#source-origin').fill('QA NONHUMAN procedural cylinder; not authentic 3D human');
 await page.locator('#capture-method').selectOption('MANUAL_MODEL');
 await page.locator('#dense-source-run').click();
 await page.waitForFunction(()=>{
  const btn=document.getElementById('dense-source-run'),
   message=document.getElementById('dense-source-status')?.textContent||'';
  return !btn?.disabled&&(message.startsWith('高密度來源')||message.startsWith('BLOCK'));
 },null,{timeout:210000});
 const message=await page.locator('#dense-source-status').textContent();
 assert.match(message,/高密度來源原生 GPU PASS/,message);
 const packet=JSON.parse(await page.locator('#dense-source-evidence').textContent());
 assert.equal(packet.sourceSha256,inputSha);
 assert.equal(packet.sourceVertexCount,vertices);
 assert.equal(packet.originalTriangleCount,triangles);
 assert.equal(packet.gpuRenderedTriangles,triangles);
 assert.ok(packet.gpuChunkCount>=3);
 assert.equal(packet.noMeshDecimation,true);
 assert.equal(packet.completeFourViewReferenceSet,false);
 assert.equal(packet.missingAngles.length,4);
 assert.equal(packet.sourceHumanScanVerified,false);
 assert.equal(packet.naturalAppearancePASS,false);
 assert.equal(packet.releasePASS,false);
 assert.equal(packet.realGPUFront.trueHardwarePixelsReadBack,true);
 assert.equal(await page.locator('#dense-source-download').isHidden(),false);
 const pngDownload=page.waitForEvent('download',{timeout:30000});
 await page.locator('#dense-source-download').click();
 const png=await pngDownload,file=await readFile(await png.path());
 assert.equal(file.readUInt32BE(0),0x89504e47);
 assert.equal(file.readUInt32BE(16),1080);
 assert.equal(file.readUInt32BE(20),1920);
 assert.equal(createHash('sha256').update(file).digest('hex'),packet.realGPUFront.sha256);
 await copyFile(await png.path(),dir+'/NONHUMAN-DENSE-113400-ORIGINAL-GPU.png');
 const recordDownload=page.waitForEvent('download',{timeout:15000});
 await page.locator('#dense-evidence-download').click();
 const j=await recordDownload,record=JSON.parse(await readFile(await j.path()));
 assert.equal(record.sourceSha256,inputSha);
 assert.equal(record.releasePASS,false);
 await copyFile(await j.path(),dir+'/DENSE-SOURCE-ORIGINAL-SHA-PACKET.json');
 assert.deepEqual(errors,[]);
 await page.screenshot({path:dir+'/DENSE-SOURCE-ORIGINAL-GPU-INTAKE.png',fullPage:true});
 await writeFile(dir+'/proof.json',JSON.stringify({
  source_SHA256:inputSha,originalVertices:vertices,
  originalTriangles:triangles,renderedTriangles:packet.gpuRenderedTriangles,
  chunkCount:packet.gpuChunkCount,
  genuineGpuPNG_SHA256:packet.realGPUFront.sha256,
  sourceIsExplicitlyNONHUMAN:true,humanPASS:false,
  denseNativeGPU:true
 },null,2));
 console.log('REAL3D_DENSE_NATIVE_113400_VERTICES_226080_FACES_GPU_PASS_NONHUMAN');
}catch(e){
 console.error('REAL3D_DENSE_NATIVE_GPU_BLOCK',e.stack||String(e));
 process.exitCode=1;
 await page.screenshot({path:dir+'/FAIL.png',fullPage:true}).catch(()=>{});
}finally{await browser.close();}
