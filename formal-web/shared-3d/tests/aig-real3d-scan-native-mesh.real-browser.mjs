/** Scan-native browser wiring test: the fixture is synthetic and NOT a human. */
import {chromium} from 'playwright';
import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root='artifacts/aig-real3d-scan-native-pipeline-fixture-only';
function makeFixture(){
 const rings=42,segments=44,vs=[],faces=[];
 for(let j=0;j<rings;j++){
  const t=j/(rings-1),r=Math.max(.008,Math.sin(Math.PI*t));
  for(let k=0;k<segments;k++){
   const a=2*Math.PI*k/segments;
   vs.push('v '+(.25*r*Math.cos(a)).toFixed(8)+' '+t.toFixed(8)+
    ' '+(.15*r*Math.sin(a)).toFixed(8));
  }
 }
 for(let j=0;j<rings-1;j++)for(let k=0;k<segments;k++){
  const a=j*segments+k+1,b=j*segments+(k+1)%segments+1,
   c=(j+1)*segments+k+1,d=(j+1)*segments+(k+1)%segments+1;
  faces.push('f '+a+' '+b+' '+d,'f '+a+' '+d+' '+c);
 }
 vs.push('v 0 0 0','v 0 1 0');
 const up=rings*segments+1,down=up+1;
 for(let k=0;k<segments;k++){
  const n=(k+1)%segments;
  faces.push('f '+up+' '+(n+1)+' '+(k+1),
   'f '+down+' '+((rings-1)*segments+k+1)+' '+
   ((rings-1)*segments+n+1));
 }
 return Buffer.from(vs.concat(faces).join('\n'));
}
await mkdir(root,{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 '--enable-webgl','--use-gl=angle','--use-angle=swiftshader',
 '--no-sandbox','--disable-dev-shm-usage'
]});
const page=await browser.newPage({
 viewport:{width:1470,height:930},acceptDownloads:true
});
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:8772/shared-3d/aig-real3d-scan-native-lab.html',{
  waitUntil:'domcontentloaded',timeout:30000});
 await page.locator('#load-source').click();
 assert.match(await page.locator('#status').textContent(),/BLOCK/);
 assert.equal(await page.locator('#gallery figure').count(),0);
 const buffer=makeFixture();
 await page.locator('#source-obj').setInputFiles({
  name:'SYNTHETIC_CAPSULE_NOT_A_HUMAN_SCAN.obj',
  mimeType:'text/plain',buffer
 });
 await page.locator('#source-height').fill('1680');
 await page.locator('#load-source').click();
 await page.waitForFunction(()=>{
  const s=document.getElementById('status');
  return s?.dataset.ready==='true'||s?.textContent?.startsWith('BLOCK');
 },null,{timeout:180000});
 const s=await page.locator('#status').textContent();
 assert.equal(await page.locator('#status').getAttribute('data-ready'),'true',s);
 const proof=JSON.parse(await page.locator('#proof').textContent());
 assert.equal(proof.allFourNativeGPUPhotos,true);
 assert.equal(proof.sourceNotProvenHumanScan,true);
 assert.equal(proof.authenticityVerified,false);
 assert.equal(proof.stage1ReleasePASS,false);
 assert.equal(proof.faceHandsFeetVisuallyApproved,false);
 assert.equal(proof.actualTriangles,proof.captures.length===4?
  proof.actualTriangles:0);
 assert.equal(proof.captures.length,4);
 assert.equal(await page.locator('#gallery figure').count(),4);
 const samples=[];
 for(const id of ['FRONT','SIDE','BACK','THREE_QUARTER']){
  const i=proof.captures.findIndex(f=>f.id===id);
  assert.ok(i>=0);
  assert.equal(proof.captures[i].realGpuReadback,true);
  const pic=page.locator('#gallery figure').nth(i);
  const downloadPromise=page.waitForEvent('download');
  await pic.locator('a').click();
  const download=await downloadPromise;
  const bytes=await readFile(await download.path());
  assert.equal(bytes.readUInt32BE(0),0x89504e47);
  assert.equal(bytes.readUInt32BE(16),1080);
  assert.equal(bytes.readUInt32BE(20),1920);
  const sha=createHash('sha256').update(bytes).digest('hex');
  assert.equal(sha,proof.captures[i].sha256);
  const file='SYNTHETIC-NONHUMAN-'+id+'-TRUE-GPU.png';
  await copyFile(await download.path(),root+'/'+file);
  samples.push({id,file,sha256:sha});
 }
 await page.screenshot({path:root+'/pipeline-ui-SYNTHETIC-not-a-human.png',
  fullPage:true,timeout:60000});
 await writeFile(root+'/manifest.json',JSON.stringify({
  fixtureKind:'synthetic elliptical cylinder, not a human',
  pipelineWiringPASS:true,real4ViewWebGL:true,
  anatomicalShapePASS:false,sourceAuthenticityVerified:false,
  realHumanVisualTestPerformed:false,releasePASS:false,
  files:samples
 },null,2));
 assert.deepEqual(errors,[]);
 console.log('SCAN_NATIVE_PIPELINE_FIXTURE_GPU_PASS_REAL_HUMAN_APPEARANCE_UNTESTED');
}catch(e){
 console.error('SCAN_NATIVE_BROWSER_GATE_BLOCK',e.stack||String(e));
 process.exitCode=1;
 await page.screenshot({path:root+'/FAILED.png',fullPage:true}).catch(()=>{});
}finally{await browser.close();}
