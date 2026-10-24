/* Chromium real WebGL V89: calibrated nonhuman photo -> observed GPU UV. */
import {chromium} from 'playwright';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const outdir='artifacts/aig-real3d-v89-calibrated-multiview';
await mkdir(outdir,{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 '--enable-webgl','--use-gl=angle','--use-angle=swiftshader',
 '--no-sandbox','--disable-dev-shm-usage'
]});
const page=await browser.newPage({acceptDownloads:true});
const errors=[];page.on('pageerror',err=>errors.push(err.message));
try{
 await page.goto('http://127.0.0.1:8772/shared-3d/aig-real3d-human-brown-render-lab.html',
  {waitUntil:'domcontentloaded',timeout:30000});
 assert.equal(await page.locator('#v89-run').isDisabled(),true);
 const proof=await page.evaluate(async()=>{
  const C=await import('./aig-real3d-core.mjs');
  const T=await import('./aig-real3d-material-texture-nodes.mjs');
  const V=await import('./aig-real3d-multiview-projection.mjs');
  const R=await import('./aig-real3d-webgl.mjs');
  const source='a'.repeat(64),uvSHA='b'.repeat(64);
  const mesh=C.createAIG3DMesh({
   positions:[-.7,-.7,0,.7,-.7,0,.7,.7,0,-.7,.7,0],
   normals:Array(4).fill([0,0,1]).flat(),
   indices:[0,1,2,0,2,3],
   provenance:'ORIGINAL_NONHUMAN_FLAT_SOURCE_V89_REAL_GPU'
  });
  const uv=[0,0,1,0,1,1,0,1],scene=C.createAIG3DScene({
   id:'v89_nonhuman_gpu',consumer:'FastModel',units:'METERS',
   source:'ORIGINAL_NONHUMAN_SOURCE_PROJECTION_GATE'
  });
  C.addAIG3DNode(scene,{id:'sample_quad',kind:'character',mesh,
   material:{baseColor:[1,1,1,1],metallic:0,roughness:0.8,
    doubleSided:true}});
  const view={schema:V.AIG_REAL3D_V89_VIEW_SCHEMA,
   id:'observed_front',sourceSha256:source,imageSha256:'c'.repeat(64),
   camera:{position:[0,0,2],right:[1,0,0],up:[0,1,0],
    forward:[0,0,-1],fx:44,fy:44,cx:32,cy:32,near:.01},
   image:{width:64,height:64,pixels:Array.from({length:64*64},(_,i)=>
    [50+Math.floor(i/64)%2*140,40+(i%64)%2*140,160,255]).flat()}
  };
  const atlas=V.buildAIGReal3DMultiViewAtlas({
   mesh,uvCoordinates:uv,sourceSha256:source,
   uvManifestSourceSha256:source,views:[view],atlasSize:64
  });
  const texture=T.compileAIGReal3DTextureNodes({
   mesh,uvCoordinates:uv,sourceSha256:source,
   uvManifestSourceSha256:source,uvSourceSha256:uvSHA,
   albedoImage:atlas.albedoImage,normalStrength:0
  });
  const updated=T.applyAIGReal3DTextureNodes({scene,nodeId:'sample_quad',mapped:texture});
  const canvas=document.createElement('canvas');canvas.width=640;canvas.height=640;
  const renderer=R.createAIG3DRenderer(canvas,{quality:'balanced',pixelRatio:1,
   maxTriangles:200000,background:[.04,.08,.12,1]});
  if(renderer.status!=='READY')throw Error('V89_REAL_WEBGL_REQUIRED');
  renderer.setInspectionMode('LIT');
  renderer.setCamera({projection:'orthographic',yaw:.01,pitch:.01,
   distance:2,orthoSpan:2.5,focus:[0,0,0]});
  try{
   const before=await renderer.captureNativePNG(scene,{width:640,height:640});
   const statsA=renderer.getGPUResourceAccounting();
   const after=await renderer.captureNativePNG(updated,{width:640,height:640});
   const statsB=renderer.getGPUResourceAccounting();
   const anchor=document.createElement('a');
   anchor.id='v89-gpu-download';anchor.href=URL.createObjectURL(after.blob);
   anchor.download='V89-NONHUMAN-OBSERVED-SOURCE-GPU.png';
   document.body.append(anchor);
   return {
    schema:'V89_REAL_GPU_SOURCE_QA_V1',
    sourceTriangles:mesh.triangleCount,
    sourcePositionReferenceImmutable:texture.mappedMesh.positions===mesh.positions,
    sourceIndexReferenceImmutable:texture.mappedMesh.indices===mesh.indices,
    observedTexels:atlas.evidence.observedSurfaceTexels,
    unknownTexels:atlas.evidence.unknownSurfaceTexels,
    photoSHA:view.imageSha256,
    originalImageSHA:before.sha256,mappedImageSHA:after.sha256,
    realGPUSource:before.genuineGpuReadback,realGPUMapped:after.genuineGpuReadback,
    additionalBuffers:statsB.totalOwnedGPUBuffersCreated-statsA.totalOwnedGPUBuffersCreated,
    additionalFullBufferUploads:statsB.fullBufferDataUploads-statsA.fullBufferDataUploads,
    additionalRGBAAtlasTextures:statsB.actualMaterialTexturesCreated-statsA.actualMaterialTexturesCreated,
    cameraIndependentValidation:false,productionReleasePASS:false
   };
  }finally{renderer.destroy();}
 });
 assert.equal(proof.schema,'V89_REAL_GPU_SOURCE_QA_V1');
 assert.equal(proof.sourceTriangles,2);
 assert.ok(proof.observedTexels>100);
 assert.equal(proof.sourcePositionReferenceImmutable,true);
 assert.equal(proof.sourceIndexReferenceImmutable,true);
 assert.equal(proof.realGPUSource,true);
 assert.equal(proof.realGPUMapped,true);
 assert.notEqual(proof.originalImageSHA,proof.mappedImageSHA);
 assert.equal(proof.additionalBuffers,2);
 assert.equal(proof.additionalFullBufferUploads,2);
 assert.equal(proof.additionalRGBAAtlasTextures,1);
 assert.equal(proof.cameraIndependentValidation,false);
 assert.equal(proof.productionReleasePASS,false);
 const pending=page.waitForEvent('download',{timeout:30000});
 await page.locator('#v89-gpu-download').click();
 const downloaded=await pending,bytes=await readFile(await downloaded.path());
 assert.equal(bytes.readUInt32BE(0),0x89504e47);
 assert.equal(bytes.readUInt32BE(16),640);
 assert.equal(bytes.readUInt32BE(20),640);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),proof.mappedImageSHA);
 await copyFile(await downloaded.path(),outdir+'/V89-NONHUMAN-OBSERVED-GPU.png');
 await writeFile(outdir+'/V89-REAL-GPU-GATE-SHA.json',JSON.stringify(proof,null,2));
 assert.deepEqual(errors,[]);
 console.log('AIG_REAL3D_V89_REAL_GPU_SOURCE_PROJECTION_PASS',proof);
}finally{await browser.close();}
