import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile,copyFile,mkdir} from 'node:fs/promises';

const folder='artifacts/aig-real3d-human-live';
await mkdir(folder,{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 '--enable-webgl','--use-gl=angle','--use-angle=swiftshader',
 '--no-sandbox','--disable-dev-shm-usage'
]});
const page=await browser.newPage({viewport:{width:1360,height:900},
 deviceScaleFactor:1,acceptDownloads:true});
const errors=[],captures=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:8770/shared-3d/aig-real3d-lab.html?profile=HumanMale',{
  waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>{
  try{
   const p=JSON.parse(document.getElementById('proof').textContent);
   return p.trueHumanGeometry?.actualMeshTriangles>3000&&
    p.renderer?.status==='WEBGL_XYZ_TRIANGLES_RENDERED';
  }catch{return false}
 },null,{timeout:30000});
 const proof=JSON.parse(await page.locator('#proof').textContent());
 assert.equal(proof.sourceKind,'ACTUAL_STAGE1_3D_INDEXED_ANATOMY_TECHNICAL');
 assert.equal(proof.trueHumanGeometry.gender,'male');
 assert.ok(proof.renderer.triangles>10000);
 assert.equal(proof.trueHumanGeometry.footGroundMm,0);
 for(const gender of ['male','female']){
  await page.locator('#profile').selectOption(gender==='male'?'HumanMale':'HumanFemale');
  await page.waitForFunction(g=>{
   try{
    const p=JSON.parse(document.getElementById('proof').textContent);
    return p.trueHumanGeometry?.gender===g&&
     p.renderer?.status==='WEBGL_XYZ_TRIANGLES_RENDERED';
   }catch{return false}
  },gender);
  await page.locator('#human-front').click();
  await page.locator('#human-photo').click();
  await page.waitForFunction(()=>{
   return !!document.querySelector('#human-photo-result a[href^="blob:"]')||
    document.querySelector('#human-source-status')?.textContent.includes('BLOCK');
  },null,{timeout:55000});
  const failure=await page.locator('#human-source-status').textContent();
  assert.ok(!failure.includes('BLOCK：'),failure);
  const dl=page.waitForEvent('download',{timeout:20000});
  await page.locator('#human-photo-result a').first().click();
  const result=await dl;
  const src=await result.path(),bytes=await readFile(src);
  assert.equal(bytes.readUInt32BE(0),0x89504e47);
  assert.equal(bytes.readUInt32BE(16),1080);
  assert.equal(bytes.readUInt32BE(20),1920);
  const filename='REAL3D-'+gender+'-true-front-1080x1920.png';
  await copyFile(src,folder+'/'+filename);
  const sha=createHash('sha256').update(bytes).digest('hex');
  const p=JSON.parse(await page.locator('#proof').textContent());
  assert.equal(p.trueFrontPNG.sha256,sha);
  assert.equal(p.trueFrontPNG.view,'front');
  assert.equal(p.trueFrontPNG.genuineGpuReadback,true);
  assert.equal(p.trueFrontPNG.releasePASS,false);
  captures.push({gender,file:filename,sha256:sha,
   width:1080,height:1920,actualWebGLPixels:true,
   realNaturalProportionsReviewed:false});
  await page.screenshot({path:folder+'/'+gender+'-actual-workspace.png',
   fullPage:true});
 }
 assert.notEqual(captures[0].sha256,captures[1].sha256);
 await page.locator('#human-age').selectOption('child');
 await page.locator('#human-height').fill('1200');
 await page.locator('#human-build').fill('80');
 await page.waitForFunction(()=>{
  try{
   const p=JSON.parse(document.getElementById('proof').textContent);
   return p.trueHumanGeometry?.age==='child'&&
    p.trueHumanGeometry?.heightMm===1200&&
    p.trueHumanGeometry?.build===80;
  }catch{return false}
 },null,{timeout:30000});
 assert.equal(errors.length,0,errors.join('; '));
 await writeFile(folder+'/manifest.json',JSON.stringify({
  source:'LIVE_REAL3D_ENGINE_GENUINE_GPU_INDEXED_XYZ_GEOMETRY',
  appearanceApproval:false,
  developmentStage:'STAGE1_VISUAL_BLOCK',
  realFrontPNGs:captures
 },null,2));
 console.log('REAL3D_TRUE_HUMAN_FRONT_BROWSER_PASS',captures);
}catch(e){
 console.error('REAL3D_TRUE_HUMAN_FRONT_BROWSER_FAIL',e.stack||e);
 await page.screenshot({path:folder+'/FAILED-REAL3D-WORKBENCH.png',
  fullPage:true}).catch(()=>{});
 process.exitCode=1;
}finally{await browser.close()}
