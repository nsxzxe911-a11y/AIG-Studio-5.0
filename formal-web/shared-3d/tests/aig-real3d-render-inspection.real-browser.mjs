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
const folder='artifacts/aig-real3d-neutral-geometry-frame';
await mkdir(folder,{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 '--enable-webgl','--use-gl=angle','--use-angle=swiftshader',
 '--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1320,height:920},acceptDownloads:true});
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:8772/shared-3d/aig-real3d-render-inspection-lab.html',
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
 assert.equal(await page.locator('#status').getAttribute('data-ready'),'true',stat);
 const evidence=JSON.parse(await page.locator('#evidence').textContent());
 assert.equal(evidence.schema,'AIG_REAL3D_FRAME_GEOMETRY_FIRST_V1');
 assert.equal(evidence.originalGLB.renderGeometryPASS,true);
 assert.equal(evidence.sharedWebGLBloomPresent,false);
 assert.equal(evidence.baseSourceUnchanged,true);
 assert.equal(evidence.geometry.anatomicalVisualApproval,false);
 assert.equal(evidence.stage1ReleasePASS,false);
 assert.equal(evidence.sevenRealGPUCaptures.length,7);
 assert.equal(await page.locator('#gallery figure').count(),7);
 const names=[],sums=new Set();
 for(let i=0;i<7;i++){
  const a=evidence.sevenRealGPUCaptures[i],el=page.locator('#gallery figure').nth(i);
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
 assert.ok(sums.size>=6,'All views must render actual geometry changes');
 assert.deepEqual(errors,[]);
 await page.screenshot({path:folder+'/diagnostic-workbench.png',fullPage:true});
 await writeFile(folder+'/manifest.json',JSON.stringify({
  SOURCE:'SYNTHETIC NONHUMAN GLB - NOT REAL PERSON',
  sevenActualGPUPngFrames:7,
  sourceMorphologyDoesNotChangeWithLighting:true,
  authenticHumanVisualPASS:false,
  geometryEvidence:evidence.geometry,
  images:names
 },null,2));
 console.log('REAL3D_NEUTRAL_RENDER_INSPECTION_7_TRUE_GPU_PASS_NONHUMAN');
}catch(e){
 console.error('REAL3D_NEUTRAL_RENDER_INSPECTION_BLOCK',e.stack||String(e));
 process.exitCode=1;
 await page.screenshot({path:folder+'/FAILED.png',fullPage:true}).catch(()=>{});
}finally{await browser.close();}
