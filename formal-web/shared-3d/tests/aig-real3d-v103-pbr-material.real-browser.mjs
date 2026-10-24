/** V103 actual GLB embedded PNG color+normal textures and GGX GPU render.
 * Synthetic colored cube is only material pipeline QA, not actress likeness.
 */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
const dir='artifacts/aig-real3d-v103-material';
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 '--enable-webgl','--use-gl=angle','--use-angle=swiftshader',
 '--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({acceptDownloads:true,viewport:{width:1420,height:1050}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:8772/shared-3d/aig-real3d-v99-native-source-lab.html',
  {waitUntil:'domcontentloaded',timeout:30000});
 const fixture=await page.evaluate(async()=>{
  const identityBytes=async color=>{
   const canvas=document.createElement('canvas');canvas.width=4;canvas.height=4;
   const ctx=canvas.getContext('2d');
   if(color==='NORMAL'){
    ctx.fillStyle='#8080ff';ctx.fillRect(0,0,4,4);
   }else{
    ctx.fillStyle='#fa190c';ctx.fillRect(0,0,2,4);
    ctx.fillStyle='#10e730';ctx.fillRect(2,0,2,4);
   }
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
   return new Uint8Array(await blob.arrayBuffer());
  };
  const cubeFaces=[
   {n:[0,0,1],v:[[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]],t:[1,0,0]},
   {n:[0,0,-1],v:[[.5,-.5,-.5],[-.5,-.5,-.5],[-.5,.5,-.5],[.5,.5,-.5]],t:[-1,0,0]},
   {n:[1,0,0],v:[[.5,-.5,.5],[.5,-.5,-.5],[.5,.5,-.5],[.5,.5,.5]],t:[0,0,-1]},
   {n:[-1,0,0],v:[[-.5,-.5,-.5],[-.5,-.5,.5],[-.5,.5,.5],[-.5,.5,-.5]],t:[0,0,1]},
   {n:[0,1,0],v:[[-.5,.5,.5],[.5,.5,.5],[.5,.5,-.5],[-.5,.5,-.5]],t:[1,0,0]},
   {n:[0,-1,0],v:[[-.5,-.5,-.5],[.5,-.5,-.5],[.5,-.5,.5],[-.5,-.5,.5]],t:[1,0,0]}
  ];
  const pos=[],norm=[],uv=[],tangent=[],idx=[];
  for(const face of cubeFaces){
   const o=pos.length/3;
   face.v.forEach((v,i)=>{
    pos.push(...v);norm.push(...face.n);
    uv.push(...[[0,0],[1,0],[1,1],[0,1]][i]);
    tangent.push(...face.t,1);
   });
   idx.push(o,o+1,o+2,o,o+2,o+3);
  }
  const rgb=await identityBytes('ALBEDO'),normal=await identityBytes('NORMAL');
  const inputs=[
   new Uint8Array(new Float32Array(pos).buffer),
   new Uint8Array(new Float32Array(norm).buffer),
   new Uint8Array(new Float32Array(uv).buffer),
   new Uint8Array(new Float32Array(tangent).buffer),
   new Uint8Array(new Uint16Array(idx).buffer),rgb,normal
  ];
  const views=[],segments=[],acc=[],buffers=[];
  let total=0;
  for(const part of inputs){
   const padded=Math.ceil(part.byteLength/4)*4,
    segment=new Uint8Array(padded);
   segment.set(part);segments.push(segment);
   views.push({buffer:0,byteOffset:total,byteLength:part.byteLength});
   total+=padded;
  }
  const b=new Uint8Array(total);let off=0;
  for(const part of segments){b.set(part,off);off+=part.length;}
  const gltf={asset:{version:'2.0'},buffers:[{byteLength:b.length}],
   bufferViews:views,accessors:[
    {bufferView:0,componentType:5126,count:24,type:'VEC3'},
    {bufferView:1,componentType:5126,count:24,type:'VEC3'},
    {bufferView:2,componentType:5126,count:24,type:'VEC2'},
    {bufferView:3,componentType:5126,count:24,type:'VEC4'},
    {bufferView:4,componentType:5123,count:36,type:'SCALAR'}],
   images:[{bufferView:5,mimeType:'image/png'},{bufferView:6,mimeType:'image/png'}],
   samplers:[{wrapS:33071,wrapT:33071}],
   textures:[{source:0,sampler:0},{source:1,sampler:0}],
   materials:[{doubleSided:true,normalTexture:{index:1,scale:1},
    pbrMetallicRoughness:{
     baseColorFactor:[.85,.72,.68,1],metallicFactor:.67,
     roughnessFactor:.24,baseColorTexture:{index:0}}}],
   meshes:[{primitives:[{mode:4,
    attributes:{POSITION:0,NORMAL:1,TEXCOORD_0:2,TANGENT:3},
    indices:4,material:0}]}],scenes:[{nodes:[0]}],
   nodes:[{mesh:0}],scene:0};
  const json=new TextEncoder().encode(JSON.stringify(gltf)),
   jsonLen=Math.ceil(json.length/4)*4,
   glb=new Uint8Array(12+8+jsonLen+8+b.byteLength),
   dv=new DataView(glb.buffer);
  dv.setUint32(0,0x46546c67,true);dv.setUint32(4,2,true);
  dv.setUint32(8,glb.length,true);
  dv.setUint32(12,jsonLen,true);dv.setUint32(16,0x4e4f534a,true);
  glb.fill(32,20,20+jsonLen);glb.set(json,20);
  const start=20+jsonLen;
  dv.setUint32(start,b.length,true);dv.setUint32(start+4,0x004e4942,true);
  glb.set(b,start+8);
  const photo=document.createElement('canvas');photo.width=256;photo.height=256;
  const ctx=photo.getContext('2d');ctx.fillStyle='#667b88';ctx.fillRect(0,0,256,256);
  const source=new Uint8Array(await (await new Promise(resolve=>photo.toBlob(resolve))).arrayBuffer());
  const encode=bytes=>{
   let binary='';
   for(let i=0;i<bytes.length;i+=5000)
    binary+=String.fromCharCode(...bytes.subarray(i,i+5000));
   return btoa(binary);
  };
  return {image:encode(source),glb:encode(glb),
   glbSize:glb.byteLength};
 });
 const bytes=Buffer.from(fixture.glb,'base64'),
  source=Buffer.from(fixture.image,'base64');
 await page.locator('#reference').setInputFiles({
  name:'V103-SYNTHETIC-SOURCE.png',mimeType:'image/png',buffer:source});
 await page.locator('#mesh-file').setInputFiles({
  name:'V103-TRUE-UV-PBR-TEXTURE.glb',mimeType:'model/gltf-binary',buffer:bytes});
 await page.locator('#import').click();
 await page.waitForFunction(()=>{
  const s=document.querySelector('#status')?.textContent??'';
  return s.includes('已從真正 GLB')||s.startsWith('BLOCK');
 },null,{timeout:30000});
 const status=await page.locator('#status').textContent();
 if(status.startsWith('BLOCK'))throw Error('V103_REAL_GLB_TEXTURE_BLOCK:'+status);
 const manifest=JSON.parse(await page.locator('#proof').textContent());
 assert.equal(manifest.sourceFaceCount,12);
 assert.equal(manifest.geometrySource[0].sourceEmbeddedBaseColorDecoded,true);
 assert.equal(manifest.geometrySource[0].sourceEmbeddedNormalDecoded,true);
 assert.equal(manifest.geometrySource[0].originalUV0ActuallyImported,true);
 assert.equal(manifest.geometrySource[0].materialSourceFactors.metallic,.67);
 assert.equal(manifest.geometrySource[0].materialSourceFactors.roughness,.24);
 const before=await page.locator('#model').screenshot();
 await page.locator('#v102-colors').selectOption('PBR_SDR');
 const after=await page.locator('#model').screenshot();
 assert.notEqual(createHash('sha256').update(before).digest('hex'),
  createHash('sha256').update(after).digest('hex'));
 const receipt=JSON.parse(await page.locator('#proof').textContent());
 assert.equal(receipt.sourceColorShaderMode,'PBR_SDR');
 assert.equal(receipt.materialTexturesAndTruePBRNotYetCertified,true);
 await writeFile(dir+'/V103-TRUE-EMBEDDED-TEXTURE-GGX-SDR.png',after);
 await writeFile(dir+'/V103-SOURCE-MATERIAL-QA.json',JSON.stringify({
  glbSourceSHA:createHash('sha256').update(bytes).digest('hex'),
  material:manifest.geometrySource[0],shaderMode:receipt.sourceColorShaderMode,
  realWebGLBeforeAndAfterDifferent:true,
  realHDR10Certified:false,completeImageBasedPBR:false,
  actressAppearanceCertified:false,releasePASS:false},null,2));
 assert.deepEqual(errors,[]);
 console.log('AIG_REAL3D_V103_ACTUAL_GLTF_TEXTURE_UV_GGX_GPU_PASS',JSON.stringify({
  triangles:12,sourceGLBSHA:createHash('sha256').update(bytes).digest('hex'),
  embeddedAlbedo:true,embeddedNormal:true,GGXDirectLighting:true,
  HDR10PASS:false}));
}finally{await browser.close();}
