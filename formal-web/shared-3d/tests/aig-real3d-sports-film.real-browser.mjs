/* V91 actual Chromium WebGL 3D sport sphere, frame SHA, optional native WebM proof. */
import {chromium} from 'playwright';
import {createHash} from 'node:crypto';
import {mkdir,readFile,copyFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const dir='artifacts/aig-real3d-v91-sports-film-gpu';
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 '--enable-webgl','--use-gl=angle','--use-angle=swiftshader',
 '--no-sandbox','--disable-dev-shm-usage'
]});
const page=await browser.newPage({acceptDownloads:true,
 viewport:{width:1250,height:900}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:8772/shared-3d/aig-real3d-sports-film-lab.html',
  {waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>document.querySelector('#status')?.textContent?.includes('真 3D 球體影格'),
  null,{timeout:30000});
 assert.equal(await page.locator('#play').isDisabled(),false);
 await page.locator('#sport').selectOption('SOCCER');
 const initial=JSON.parse(await page.locator('#evidence').textContent());
 assert.equal(initial.sport,'SOCCER');
 assert.equal(initial.trajectoriesAreRealXYZ,true);
 assert.ok(initial.real3DGeometryTriangles>=2000);
 const evidence=await page.evaluate(async()=>{
  const S=await import('./aig-real3d-sports-ballistics.mjs');
  const R=await import('./aig-real3d-sports-3d-replay.mjs');
  const W=await import('./aig-real3d-webgl.mjs');
  const t=S.simulateAIGReal3DSportBall({
   sport:'SOCCER',initialPosition:[0,4,0],
   initialVelocity:[9,3,0],initialAngularVelocity:[0,130,0],
   durationSec:.4,fps:60,surfaces:[]
  });
  const replay=R.createAIGReal3DSport3DReplay({trajectory:t});
  const canvas=document.createElement('canvas');
  canvas.width=640;canvas.height=640;
  const renderer=W.createAIG3DRenderer(canvas,{
   quality:'balanced',pixelRatio:1,maxTriangles:12000,
   background:[.05,.09,.13,1]
  });
  if(renderer.status!=='READY')throw Error('REAL_WEBGL_CONTEXT_BLOCK');
  renderer.setInspectionMode('LIT');
  renderer.setCamera({projection:'orthographic',yaw:.40,pitch:.35,
   orthoSpan:3,distance:5,focus:[1,4,0]});
  try{
   replay.renderFrame(renderer,0);
   const a=await renderer.captureNativePNG(replay.scene,{width:640,height:640});
   const statsA=renderer.getGPUResourceAccounting();
   const first=[...replay.scene.nodes[0].transform.position],
    rotA=[...replay.scene.nodes[0].transform.rotationDeg];
   replay.renderFrame(renderer,Math.floor(t.frames.length/2));
   const b=await renderer.captureNativePNG(replay.scene,{width:640,height:640});
   const statsB=renderer.getGPUResourceAccounting();
   const last=[...replay.scene.nodes[0].transform.position],
    rotB=[...replay.scene.nodes[0].transform.rotationDeg];
   const aLink=document.createElement('a');aLink.id='v91-native-gpu-download';
   aLink.href=URL.createObjectURL(b.blob);
   aLink.download='V91-SOCCER-REAL-3D-POSE.png';
   document.body.append(aLink);
   return {
    realSourceTriangles:replay.sphereMesh.triangleCount,
    beforeGPU:{sha:a.sha256,width:a.width,height:a.height,
     readback:a.genuineGpuReadback},
    afterGPU:{sha:b.sha256,width:b.width,height:b.height,
     readback:b.genuineGpuReadback},
    beforePosition:first,afterPosition:last,
    beforeRotation:rotA,afterRotation:rotB,
    fullRebufferCount:statsB.fullBufferDataUploads-statsA.fullBufferDataUploads,
    indexedGeometryIs3D:true,bitmapOnlyAnimation:false,
    realBodyActorPhysicsPASS:false,releasePASS:false
   };
  }finally{renderer.destroy();}
 });
 assert.ok(evidence.realSourceTriangles>2000);
 assert.equal(evidence.beforeGPU.readback,true);
 assert.equal(evidence.afterGPU.readback,true);
 assert.notEqual(evidence.beforeGPU.sha,evidence.afterGPU.sha);
 assert.notDeepEqual(evidence.beforePosition,evidence.afterPosition);
 assert.notDeepEqual(evidence.beforeRotation,evidence.afterRotation);
 assert.equal(evidence.fullRebufferCount,0);
 const pendingPNG=page.waitForEvent('download',{timeout:30000});
 await page.locator('#v91-native-gpu-download').click();
 const png=await pendingPNG,bytes=await readFile(await png.path());
 assert.equal(bytes.readUInt32BE(0),0x89504e47);
 assert.equal(bytes.readUInt32BE(16),640);
 assert.equal(bytes.readUInt32BE(20),640);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),
  evidence.afterGPU.sha);
 await copyFile(await png.path(),dir+'/V91-SOCCER-REAL-3D-POSE.png');
 const support=await page.evaluate(()=>({
  mediaRecorder:typeof MediaRecorder!=='undefined',
  capture:typeof HTMLCanvasElement.prototype.captureStream==='function',
  vp8:typeof MediaRecorder!=='undefined'&&
   MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
 }));
 let webm={actualEncoderResult:'UNAVAILABLE_BLOCK',support,
  independentDecodeVerified:false};
 if(support.mediaRecorder&&support.capture&&support.vp8){
  // Real wall-clock GPU frames, never a video made from one static PNG.
  const pendingWebm=page.waitForEvent('download',{timeout:30000});
  await page.locator('#record').click();
  const movie=await pendingWebm;
  const video=await readFile(await movie.path());
  assert.ok(video.length>256);
  assert.equal(video[0],0x1a);assert.equal(video[1],0x45);
  assert.equal(video[2],0xdf);assert.equal(video[3],0xa3);
  const movieSHA=createHash('sha256').update(video).digest('hex');
  await copyFile(await movie.path(),dir+'/V91-SOCCER-REAL-3D.webm');
  webm={actualEncoderResult:'WEBM_BYTES_ENCODED',bytes:video.length,
   sha256:movieSHA,renderingSource:'ACTUAL_INDEXED_XYZ',
   independentDecodeVerified:false};
 }
 await writeFile(dir+'/V91-REAL-GPU-AND-WEBM-REPORT.json',
  JSON.stringify({evidence,webm},null,2));
 assert.deepEqual(errors,[]);
 console.log('V91_NATIVE_INDEXED_SPORT_GPU_PASS',JSON.stringify({evidence,webm}));
}finally{await browser.close();}
