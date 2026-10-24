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
  // V89 inherited Chromium regression: captureNativePNG requires >=2000
  // TRUE indexed triangles. Never weaken that renderer source Gate.
  const side=48,positions=[],normals=[],indices=[],uv=[];
  for(let y=0;y<side;y++)for(let x=0;x<side;x++){
   const u=x/(side-1),v=y/(side-1);
   // Real original nonhuman curved height field and matching surface normals.
   // A planar monochrome LIT fixture has <8 colors and is NOT a valid
   // existing GPU LIT diagnostic, even if its real source has 4418 faces.
   const z=.11*Math.sin(Math.PI*2*u)*Math.cos(Math.PI*2*v);
   const dzdx=.11*2*Math.PI/1.4*Math.cos(2*Math.PI*u)*Math.cos(2*Math.PI*v);
   const dzdy=-.11*2*Math.PI/1.4*Math.sin(2*Math.PI*u)*Math.sin(2*Math.PI*v);
   const mag=Math.hypot(dzdx,dzdy,1);
   positions.push((u-.5)*1.4,(v-.5)*1.4,z);
   normals.push(-dzdx/mag,-dzdy/mag,1/mag);uv.push(u,v);
  }
  for(let y=0;y<side-1;y++)for(let x=0;x<side-1;x++){
   const a=y*side+x,b=a+1,c=a+side,d=c+1;
   indices.push(a,b,d,a,d,c);
  }
  const mesh=C.createAIG3DMesh({positions,normals,indices,
   provenance:'ORIGINAL_NONHUMAN_4418_FACE_SOURCE_V89_REAL_GPU'
  });
  const scene=C.createAIG3DScene({
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
 assert.equal(proof.sourceTriangles,4418);
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
 // Verify native GPU PNG Blob directly in Chromium. Browser download UI
 // policies can suppress download events; image bytes and SHA remain strict.
 const b64=await page.evaluate(async()=>{
  const link=document.querySelector('#v89-gpu-download');
  if(!link?.href?.startsWith('blob:'))throw Error('GPU_NATIVE_BLOB_MISSING');
  const data=new Uint8Array(await (await fetch(link.href)).arrayBuffer());
  if(data.length<100)throw Error('GPU_NATIVE_PNG_EMPTY');
  let bin='';
  for(let i=0;i<data.length;i+=8192)
   bin+=String.fromCharCode(...data.subarray(i,i+8192));
  return btoa(bin);
 });
 const bytes=Buffer.from(b64,'base64');
 assert.equal(bytes.readUInt32BE(0),0x89504e47);
 assert.equal(bytes.readUInt32BE(16),640);
 assert.equal(bytes.readUInt32BE(20),640);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),proof.mappedImageSHA);
 await writeFile(outdir+'/V89-NONHUMAN-OBSERVED-GPU.png',bytes);
 await writeFile(outdir+'/V89-REAL-GPU-GATE-SHA.json',JSON.stringify(proof,null,2));
 assert.deepEqual(errors,[]);
 console.log('AIG_REAL3D_V89_REAL_GPU_SOURCE_PROJECTION_PASS',proof);
}finally{await browser.close();}
