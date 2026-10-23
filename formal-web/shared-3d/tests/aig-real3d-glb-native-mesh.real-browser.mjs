/** Actual GPU proof of GLB binary mesh source with NONHUMAN synthetic fixture.
 * This is a renderer plumbing test, NOT a complete human appearance claim. */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
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
const folder='artifacts/aig-real3d-glb-native-synthetic-only';
await mkdir(folder,{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 '--enable-webgl','--use-gl=angle','--use-angle=swiftshader',
 '--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({
 viewport:{width:1450,height:920},acceptDownloads:true});
const errors=[],photos=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:8772/shared-3d/aig-real3d-scan-native-lab.html',
  {waitUntil:'domcontentloaded',timeout:30000});
 await page.locator('#source-obj').setInputFiles({
  name:'SYNTHETIC_ELLIPSE_NONHUMAN.glb',
  mimeType:'model/gltf-binary',buffer:makeGLB()});
 await page.locator('#source-height').fill('1680');
 await page.locator('#load-source').click();
 await page.waitForFunction(()=>{
  const el=document.querySelector('#status');
  return !document.querySelector('#load-source')?.disabled &&
   (el.dataset.ready==='true'||el.textContent.startsWith('BLOCK'));
 },null,{timeout:160000});
 const text=await page.locator('#status').textContent();
 assert.equal(await page.locator('#status').getAttribute('data-ready'),'true',text);
 const evidence=JSON.parse(await page.locator('#proof').textContent());
 assert.equal(evidence.schema,'AIG_REAL3D_NATIVE_GLB_STATIC_MESH_V1');
 assert.equal(evidence.sourceFormat,'GLB_2_BINARY_LOCAL');
 assert.equal(evidence.renderGeometryPASS,true);
 assert.equal(evidence.allFourNativeGPUPhotos,true);
 assert.equal(evidence.trueHumanSourceAuthenticityVerified,false);
 assert.equal(evidence.stage1ReleasePASS,false);
 assert.equal(evidence.originalGLBTexturesApplied,false);
 assert.equal(evidence.originalGLBSkinningAnimated,false);
 assert.equal(evidence.captures.length,4);
 for(let i=0;i<4;i++){
  const p=evidence.captures[i],f=page.locator('#gallery figure').nth(i);
  const downloadPromise=page.waitForEvent('download');
  await f.locator('a').click();
  const dl=await downloadPromise,bytes=await readFile(await dl.path());
  assert.equal(bytes.readUInt32BE(0),0x89504e47);
  assert.equal(bytes.readUInt32BE(16),1080);
  assert.equal(bytes.readUInt32BE(20),1920);
  const sha=createHash('sha256').update(bytes).digest('hex');
  assert.equal(sha,p.sha256);
  const filename='SYNTHETIC-GLB-'+p.id+'-TRUE-GPU.png';
  await copyFile(await dl.path(),folder+'/'+filename);
  photos.push({id:p.id,filename,sha256:sha});
 }
 assert.deepEqual(errors,[]);
 await page.screenshot({path:folder+'/source-glb-qa-workbench.png',
  fullPage:true,timeout:60000});
 await writeFile(folder+'/manifest.json',JSON.stringify({
  label:'SYNTHETIC NONHUMAN GLB, DO NOT APPROVE AS HUMAN',
  actualWebGLFrameCount:photos.length,
  sourceMeshStaticGPUProof:true,actualHumanScanPresent:false,
  visualHumanApproval:false,photos
 },null,2));
 console.log('REAL3D_NATIVE_GLB_TRUE_GPU_FOUR_VIEW_PIPELINE_PASS_NONHUMAN');
}catch(e){
 console.error('REAL3D_NATIVE_GLB_GPU_FAIL',e.stack||String(e));
 process.exitCode=1;
 await page.screenshot({path:folder+'/FAILED.png',fullPage:true}).catch(()=>{});
}finally{await browser.close();}
