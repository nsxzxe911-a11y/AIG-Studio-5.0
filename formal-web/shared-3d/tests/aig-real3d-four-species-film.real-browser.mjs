/** Real Chromium V93: indexed original actor + source 3D feathers/fins
 * + V91 ball, real GPU pixels and optionally real WebM encoding.
 */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {readAIGReal3DBrowserBlobBytes} from './aig-real3d-browser-blob-bytes.mjs';
const dir='artifacts/aig-real3d-v93-source-four-species';
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 '--enable-webgl','--use-gl=angle','--use-angle=swiftshader',
 '--no-sandbox','--disable-dev-shm-usage'
]});
const page=await browser.newPage({acceptDownloads:true});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:8772/shared-3d/aig-real3d-rig-sport-film-lab.html',
  {waitUntil:'domcontentloaded',timeout:30000});
 const proof=await page.evaluate(async()=>{
  const QA=await import('./aig-real3d-v93-qa-fixture.mjs');
  const Film=await import('./aig-real3d-four-species-film.mjs');
  const GPU=await import('./aig-real3d-webgl.mjs');
  const qa=QA.buildAIGReal3DV93FourSpeciesQA({species:'BIRD'});
  const film=Film.createAIGReal3DFourSpeciesFilm({
   secondary:qa.engine,sportFilm:qa.prior.film});
  const originalSkin=JSON.stringify(qa.prior.mesh),
   originalFeathers=JSON.stringify(qa.attachmentSource);
  const canvas=document.createElement('canvas');canvas.width=640;canvas.height=640;
  const renderer=GPU.createAIG3DRenderer(canvas,{
   quality:'balanced',pixelRatio:1,maxTriangles:20000,
   background:[.01,.03,.05,1]
  });
  if(renderer.status!=='READY')throw Error('V93_TRUE_GPU_NOT_READY');
  renderer.setInspectionMode('LIT');
  renderer.setCamera({projection:'orthographic',yaw:.30,pitch:.2,
   focus:[0,1.6,0],orthoSpan:2.65,distance:4});
  try{
   const a=film.renderFrame(renderer,0);
   const first=await renderer.captureNativePNG(film.scene,{width:640,height:640});
   const firstStats=renderer.getGPUResourceAccounting();
   const b=film.renderFrame(renderer,film.frameCount-1);
   const second=await renderer.captureNativePNG(film.scene,{width:640,height:640});
   const secondStats=renderer.getGPUResourceAccounting();
   const link=document.createElement('a');link.id='v93-native-source-png';
   link.href=URL.createObjectURL(second.blob);
   link.download='V93-REAL-3D-BIRD-ACTOR-FEATHER-BALL.png';document.body.append(link);
   const all4=['HUMAN','QUADRUPED','BIRD','FISH'].map(species=>{
    const q=QA.buildAIGReal3DV93FourSpeciesQA({species});
    return {species,triangles:q.attachmentSource.triangleCount,
     hasSecondaryDynamics:Math.abs(q.engine.secondaryAt('testAttachment',.5))>1e-8};
   });
   return {schema:Film.AIG_REAL3D_V93_FILM_SCHEMA,
    gpuSourceBefore:first.genuineGpuReadback,
    gpuSourceAfter:second.genuineGpuReadback,
    shaBefore:first.sha256,shaAfter:second.sha256,
    real3DCombinedTriangles:b.triangles,
    attachmentTriangles:b.attachmentsRealSourceTriangles,
    sourceActorAndFeatherAndBallInOneGPU:b.sourceBodyAndAttachmentsAndBallOneFrame,
    sourceSkinImmutable:originalSkin===JSON.stringify(qa.prior.mesh),
    sourceFeathersImmutable:originalFeathers===JSON.stringify(qa.attachmentSource),
    incrementalSubDataUpdates:secondStats.bufferSubDataUpdates-firstStats.bufferSubDataUpdates,
    fullBufferReuploads:secondStats.fullBufferDataUploads-firstStats.fullBufferDataUploads,
    speciesEvidence:all4,anatomyScanIndependentVerified:false,
    releasePASS:false};
  }finally{renderer.destroy();}
 });
 assert.equal(proof.schema,'AIG_REAL3D_V93_FOUR_SPECIES_SKIN_SECONDARY_BALL_FILM_V1');
 assert.equal(proof.gpuSourceBefore,true);
 assert.equal(proof.gpuSourceAfter,true);
 assert.notEqual(proof.shaBefore,proof.shaAfter);
 assert.ok(proof.real3DCombinedTriangles>7000);
 assert.equal(proof.attachmentTriangles,288);
 assert.equal(proof.sourceActorAndFeatherAndBallInOneGPU,true);
 assert.equal(proof.sourceSkinImmutable,true);
 assert.equal(proof.sourceFeathersImmutable,true);
 assert.ok(proof.incrementalSubDataUpdates>0);
 assert.equal(proof.fullBufferReuploads,0);
 assert.ok(proof.speciesEvidence.every(v=>v.hasSecondaryDynamics&&v.triangles===288));
 const png=await readAIGReal3DBrowserBlobBytes(page,'#v93-native-source-png');
 assert.equal(png.readUInt32BE(0),0x89504e47);
 assert.equal(png.readUInt32BE(16),640);
 assert.equal(png.readUInt32BE(20),640);
 assert.equal(createHash('sha256').update(png).digest('hex'),proof.shaAfter);
 await writeFile(dir+'/V93-NONHUMAN-ACTOR-FEATHER-BALL-GPU.png',png);
 await writeFile(dir+'/V93-NATIVE-GPU-SOURCE-GATE.json',JSON.stringify(proof,null,2));
 assert.deepEqual(errors,[]);
 console.log('AIG_REAL3D_V93_FOUR_SPECIES_TRUE_GPU_SKIN_SECONDARY_BALL_PASS',
  JSON.stringify(proof));
}finally{await browser.close();}
