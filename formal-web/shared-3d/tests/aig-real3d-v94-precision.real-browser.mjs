/* V94 true native Chromium GPU: upload original nonhuman OBJ, inspect
 * raw source multi-angle, no synthesized backside / fake shader geometry.
 */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {readAIGReal3DBrowserBlobBytes}
 from './aig-real3d-browser-blob-bytes.mjs';
const dir='artifacts/aig-real3d-v94-precision';
await mkdir(dir,{recursive:true});
const lines=['# NONHUMAN curved original source QA', 'g OriginalObservedSurface'];
const side=48,positions=[];
for(let y=0;y<side;y++)for(let x=0;x<side;x++){
 const u=x/(side-1),v=y/(side-1);
 const z=.15*Math.sin(Math.PI*u*2)*Math.cos(Math.PI*v*2)+
  .04*Math.cos(Math.PI*3*u);
 positions.push([(u-.5)*1.4,(v-.5)*1.4,z]);
 lines.push('v '+positions.at(-1).join(' '));
}
for(let y=0;y<side-1;y++)for(let x=0;x<side-1;x++){
 const a=y*side+x+1,b=a+1,c=a+side,d=c+1;
 lines.push('f '+[a,b,d].join(' '));
 lines.push('f '+[a,d,c].join(' '));
}
const obj=lines.join('\n');
const originalSHA=createHash('sha256').update(obj).digest('hex');
const browser=await chromium.launch({headless:true,args:[
 '--enable-webgl','--use-gl=angle','--use-angle=swiftshader',
 '--no-sandbox','--disable-dev-shm-usage'
]});
const page=await browser.newPage({acceptDownloads:true,
 viewport:{width:1330,height:920}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:8772/shared-3d/aig-real3d-v94-precision-review.html',
  {waitUntil:'domcontentloaded',timeout:30000});
 await page.locator('#obj').setInputFiles({
  name:'original-observed-nonhuman.obj',mimeType:'text/plain',
  buffer:Buffer.from(obj)
 });
 await page.locator('#run').click();
 await page.waitForFunction(()=>document.querySelector('#evidence')?.textContent
  ?.includes('originalTriangleCount'),null,{timeout:30000});
 const evidence=JSON.parse(await page.locator('#evidence').textContent());
 assert.equal(evidence.originalFileSHA,originalSHA);
 assert.equal(evidence.originalTriangleCount,4418);
 assert.equal(evidence.originalTrianglesAdded,0);
 assert.equal(evidence.independent1to1AccuracyPASS,false);
 assert.equal(evidence.measuredDimensionsAndThicknessPASS,false);
 assert.equal(evidence.partDiagnostics[0].openEdges,188);
 await page.locator('#parts input[type=checkbox]').check();
 const requested=JSON.parse(await page.locator('#evidence').textContent());
 assert.equal(requested.sourceTopologyGatePASS,false);
 for(const key of ['front','side','back','oblique']){
  await page.locator('#'+key).click();
  await page.waitForFunction(key=>document.querySelector('#status')?.textContent
   ?.includes('真 3D '+key),key,{timeout:15000});
 }
 const proof=await page.evaluate(async()=>{
  const I=await import('./aig-real3d-v94-obj-structure-intake.mjs');
  const S=await import('./aig-real3d-v94-source-structure-audit.mjs');
  const GPU=await import('./aig-real3d-webgl.mjs');
  const raw=await document.querySelector('#obj').files[0].text();
  const b=await document.querySelector('#obj').files[0].arrayBuffer();
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),
   x=>x.toString(16).padStart(2,'0')).join('');
  const model=I.loadAIGReal3DOriginalOBJStructure({
   objText:raw,sourceSha256:hash,verifiedFileSha256:hash
  });
  const inspected=S.auditAIGReal3DOriginalStructure({
   scene:model.scene,sourceSha256:hash,parts:model.parts
  });
  const canvas=document.createElement('canvas');canvas.width=640;canvas.height=640;
  const renderer=GPU.createAIG3DRenderer(canvas,{quality:'balanced',
   maxTriangles:10000,pixelRatio:1,background:[.01,.024,.052,1]});
  if(renderer.status!=='READY')throw Error('V94_TRUE_WEBGL_GPU_BLOCK');
  renderer.setInspectionMode('LIT');
  try{
   renderer.setCamera({projection:'orthographic',yaw:0,pitch:.12,
    focus:[0,0,0],orthoSpan:2.2,distance:4});
   const a=await renderer.captureNativePNG(model.scene,{width:640,height:640});
   renderer.setCamera({projection:'orthographic',yaw:.6,pitch:.4,
    focus:[0,0,0],orthoSpan:2.2,distance:4});
   const z=await renderer.captureNativePNG(model.scene,{width:640,height:640});
   const link=document.createElement('a');link.id='v94-real-source-gpu-png';
   link.href=URL.createObjectURL(z.blob);
   link.download='V94-SOURCE-NATIVE-GPU.png';document.body.append(link);
   return {schema:inspected.schema,sourceSHA:hash,triangles:inspected.originalTriangleCount,
    closureOfObservedFrontConfirmed:inspected.parts[0].geometry.indexedTopologyWatertight,
    sourceOpenIndexedEdges:inspected.parts[0].geometry.openSourceIndexedEdges,
    SHAFront:a.sha256,SHAAngle:z.sha256,
    trueRawGPUFront:a.genuineGpuReadback,
    trueRawGPUAngle:z.genuineGpuReadback,
    missingBackSourceNotAutoFilled:true,
    originalFacesAdded:inspected.originalTrianglesAdded,
    finalCinemaReady:false};
  }finally{renderer.destroy();}
 });
 assert.equal(proof.sourceSHA,originalSHA);
 assert.equal(proof.triangles,4418);
 assert.equal(proof.trueRawGPUFront,true);
 assert.equal(proof.trueRawGPUAngle,true);
 assert.notEqual(proof.SHAFront,proof.SHAAngle);
 assert.equal(proof.sourceOpenIndexedEdges,188);
 assert.equal(proof.closureOfObservedFrontConfirmed,false);
 assert.equal(proof.originalFacesAdded,0);
 const png=await readAIGReal3DBrowserBlobBytes(page,'#v94-real-source-gpu-png');
 assert.equal(png.readUInt32BE(0),0x89504e47);
 assert.equal(png.readUInt32BE(16),640);
 assert.equal(png.readUInt32BE(20),640);
 assert.equal(createHash('sha256').update(png).digest('hex'),proof.SHAAngle);
 await writeFile(dir+'/V94-SOURCE-REAL-3D-GPU.png',png);
 await writeFile(dir+'/V94-SOURCE-PRECISION-GPU-PROOF.json',
  JSON.stringify({proof,evidence},null,2));
 assert.deepEqual(errors,[]);
 console.log('AIG_REAL3D_V94_ORIGINAL_XYZ_PRECISION_WEBGL_GPU_PASS',
  JSON.stringify(proof));
}finally{await browser.close();}
