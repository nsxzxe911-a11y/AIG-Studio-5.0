/* Native local OBJ -> brown GPU 7 views -> real evidence JSON. NONHUMAN fixture. */
import {chromium} from 'playwright';
import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const dir='artifacts/aig-real3d-brown-source-obj-review';
function syntheticOBJ(){
 const rings=42,segments=44,v=[],faces=[];
 for(let j=0;j<rings;j++){
  const t=j/(rings-1),r=Math.max(.008,Math.sin(Math.PI*t));
  for(let k=0;k<segments;k++){
   const a=2*Math.PI*k/segments;
   v.push('v '+(.25*r*Math.cos(a)).toFixed(8)+' '+t.toFixed(8)+' '+(.15*r*Math.sin(a)).toFixed(8));
  }
 }
 for(let j=0;j<rings-1;j++)for(let k=0;k<segments;k++){
  const a=j*segments+k+1,b=j*segments+(k+1)%segments+1;
  const c=(j+1)*segments+k+1,d=(j+1)*segments+(k+1)%segments+1;
  faces.push('f '+a+' '+b+' '+d,'f '+a+' '+d+' '+c);
 }
 v.push('v 0 0 0','v 0 1 0');
 const up=rings*segments+1,down=up+1;
 for(let k=0;k<segments;k++){
  const n=(k+1)%segments;
  faces.push('f '+up+' '+(n+1)+' '+(k+1));
  faces.push('f '+down+' '+((rings-1)*segments+k+1)+' '+((rings-1)*segments+n+1));
 }
 return Buffer.from(v.concat(faces).join('\n'));
}
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 '--enable-webgl','--use-gl=angle','--use-angle=swiftshader',
 '--no-sandbox','--disable-dev-shm-usage'
]});
const page=await browser.newPage({viewport:{width:1290,height:930},acceptDownloads:true});
const errors=[];page.on('pageerror',x=>errors.push(x.message));
try{
 await page.goto('http://127.0.0.1:8772/shared-3d/aig-real3d-human-brown-render-lab.html',
  {waitUntil:'domcontentloaded',timeout:30000});
 await page.locator('#inspect').click();
 assert.match(await page.locator('#status').textContent(),/BLOCK/);
 assert.equal(await page.locator('#report-download').isDisabled(),true);
 const buf=syntheticOBJ(),hash=createHash('sha256').update(buf).digest('hex');
 await page.locator('#model-file').setInputFiles({
  name:'SYNTHETIC_NONHUMAN_CAPSULE.obj',mimeType:'text/plain',buffer:buf
 });
 await page.locator('#body-height').fill('1680');
 await page.locator('#source-origin').fill('Synthetic test mesh: NOT a real human');
 await page.locator('#capture-method').selectOption('MANUAL_MODEL');
 await page.locator('#source-rights').check();
 await page.locator('#inspect').click();
 await page.waitForFunction(()=>{
  const a=document.getElementById('inspect'),s=document.getElementById('status');
  return a&&!a.disabled&&(s?.dataset.ready==='true'||s?.textContent?.startsWith('BLOCK'));
 },null,{timeout:210000});
 const status=await page.locator('#status').textContent();
 assert.equal(await page.locator('#status').getAttribute('data-ready'),'true',status);
 const proof=JSON.parse(await page.locator('#evidence').textContent());
 assert.equal(proof.sourceReview.model.format,'OBJ');
 assert.equal(proof.sourceReview.model.sha256,hash);
 assert.equal(proof.sourceReview.computedEvidence.nativeMeshGeometryGatePASS,true);
 assert.equal(proof.sourceReview.computedEvidence.fourRealGpuOrthographicAnglesCaptured,true);
 assert.equal(proof.sourceReview.computedEvidence.labeledAnatomyValidatedAgainstMesh,false);
 assert.equal(proof.sourceReview.personAuthenticityVerified,false);
 assert.equal(proof.sourceReview.naturalAppearancePASS,false);
 assert.equal(proof.sourceReview.releasePASS,false);
 assert.equal(proof.sevenRealBrownGPUPasses.length,7);
 assert.deepEqual(proof.sevenRealBrownGPUPasses.slice(0,4).map(x=>x.mode),
  ['BLACK_CONTOUR','BROWN_FLAT','BROWN_VOLUME','BROWN_FINISH']);
 const verify=page.waitForEvent('download',{timeout:30000});
 await page.locator('#report-download').click();
 const dl=await verify,record=await readFile(await dl.path());
 assert.equal(JSON.parse(record.toString('utf8')).sourceReview.releasePASS,false);
 await copyFile(await dl.path(),dir+'/AIG-NONHUMAN-Source-Review.json');
 await page.screenshot({path:dir+'/OBJ-BROWN-GPU-SOURCE-LAB.png',fullPage:true});
 assert.deepEqual(errors,[]);
 await writeFile(dir+'/proof.json',JSON.stringify({
  schema:'AIG_REAL3D_BROWN_LOCAL_OBJ_SOURCE_REPORT_BROWSER_GATE_V1',
  fixture:'NONHUMAN SYNTHETIC TEST; NOT AUTHENTIC BODY',
  localRawOBJ_SHA256:hash,sourceOBJ:buf.length,
  oneSourceSevenTrueGPUFrames:true,
  realFourViews:true,
  noSyntheticHumanReconstruction:true,
  naturalHumanVisualPASS:false,releasePASS:false,renderDeployed:false
 },null,2));
 console.log('REAL3D_LOCAL_OBJ_BROWN_GPU_SOURCE_REPORT_PASS_NONHUMAN');
}catch(e){
 console.error('REAL3D_OBJ_SOURCE_REVIEW_BLOCK',e.stack||String(e));
 process.exitCode=1;
 await page.screenshot({path:dir+'/FAILED.png',fullPage:true}).catch(()=>{});
}finally{await browser.close();}
