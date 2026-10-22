/** Public Render deployed HTTP + real Chromium smoke test, isolated GitHub runner.
 * This checks actually served website content, not just source-tree files.
 * Not a real CNC motion, full Fanuc, APK/EXE or 0.001 mm certification.
 */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
const origin='https://aig-dual-formal-runtime.onrender.com';
const dir='artifacts/aig-public-render-live-20261023';
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 '--no-sandbox','--disable-dev-shm-usage','--enable-webgl',
 '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'
]});
const devices=[
 {name:'phone',viewport:{width:360,height:780},isMobile:true,hasTouch:true},
 {name:'landscape',viewport:{width:915,height:412},isMobile:true,hasTouch:true},
 {name:'desktop',viewport:{width:1440,height:900}}
];
async function navigate(page,path){
 let response;
 for(let attempt=0;attempt<2;attempt++){
  try{
   response=await page.goto(origin+path,{waitUntil:'domcontentloaded',timeout:40000});
   if(response?.status()===200)return response;
  }catch(error){if(attempt===1)throw error;}
  if(attempt===1)break;
  await page.waitForTimeout(1500);
 }
 throw Error('PUBLIC_RENDER_HTTP_NOT_200 '+path+' status='+response?.status());
}
const report=[];
try{
 for(const device of devices){
  const page=await browser.newPage({...device,deviceScaleFactor:1,acceptDownloads:true});
  page.setDefaultTimeout(45000);
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const snapshot=async name=>{
   const layout=await page.evaluate(()=>({width:innerWidth,documentWidth:
     document.documentElement.scrollWidth}));
   assert.ok(layout.documentWidth<=layout.width+3,'LIVE_HORIZONTAL_OVERFLOW '+name+' '+JSON.stringify(layout));
   await page.screenshot({path:dir+'/'+device.name+'-'+name+'.png',fullPage:true});
   return layout;
  };
  try{
   await navigate(page,'/aig-new-home.html');
   assert.match(await page.title(),/AIG.*新工作首頁/);
   assert.equal(await page.locator('#choose .card').count(),3);
   assert.equal(await page.locator('a.link[href="./aig-download-center.html"]').count(),1);
   const homeLayout=await snapshot('homepage-live');
   await page.locator('a.link[href="./aig-download-center.html"]').click();
   await page.waitForURL('**/aig-download-center.html');
   assert.match(await page.title(),/新版下載與版本中心/);
   assert.equal(await page.locator('.quick').count(),3);
   assert.equal(await page.locator('.cards .card').count(),4);
   assert.equal(await page.locator('#export-local').count(),1);
   const downloadLayout=await snapshot('download-center-live');
   // Test backup only using synthetic data in this disposable browser context.
   await page.evaluate(()=>{
    localStorage.setItem('AIG-CAD-WORKING-PUBLIC-SMOKE','TEST_LINE_X0_Y0');
    localStorage.setItem('AIG-NC-DRAFT-PUBLIC-SMOKE','G21 G90 G54\nG0 X0 Y0\nM30');
    localStorage.setItem('AIG-AUTH-TOKEN-WORKING','SECRET_NOT_ALLOWED');
   });
   const [file]=await Promise.all([page.waitForEvent('download'),page.locator('#export-local').click()]);
   const saved=JSON.parse(await readFile(await file.path(),'utf8'));
   assert.equal(saved.schema,'AIG_WEB_LEGACY_LOCAL_DRAFT_BACKUP');
   assert.equal(saved.drafts['AIG-CAD-WORKING-PUBLIC-SMOKE'],'TEST_LINE_X0_Y0');
   assert.ok(!('AIG-AUTH-TOKEN-WORKING' in saved.drafts),'cannot export credentials');
   await navigate(page,'/3ax-nc-workbench.html');
   assert.equal(await page.locator('#view').count(),1);
   assert.equal(await page.locator('#nc').count(),1);
   assert.equal(await page.locator('#next').count(),1);
   await page.waitForFunction(()=>{
    try{let e=JSON.parse(document.getElementById('evidence').textContent);
     return e.rendered.status==='WEBGL_XYZ_TRIANGLES_RENDERED'&&e.replay.blockIndex===0;}
    catch{return false;}
   },null,{timeout:40000});
   const initial=JSON.parse(await page.locator('#evidence').textContent());
   assert.equal(initial.realFanucControllerCommandsSent,0);
   await page.locator('#next').click();
   await page.waitForFunction(()=>{
    try{return JSON.parse(document.getElementById('evidence').textContent).replay.blockIndex===1;}
    catch{return false;}
   });
   const first=JSON.parse(await page.locator('#evidence').textContent());
   assert.ok(first.replay.cumulativeRemovedMm3>0,'must actually remove voxel stock');
   await page.locator('#next').click();
   await page.locator('#next').click();
   const final=JSON.parse(await page.locator('#evidence').textContent());
   assert.equal(final.replay.cumulativeRemovedMm3,54);
   assert.equal(final.replay.lastMotion,'G0');
   assert.equal(final.replay.lastRemovedMm3,0);
   assert.equal(final.realFanucControllerCommandsSent,0);
   const workspaceLayout=await snapshot('3ax-live');
   assert.deepEqual(errors,[],'no uncaught browser script errors');
   report.push({device:device.name,homeLayout,downloadLayout,workspaceLayout,
    downloadLocalBackup:true,credentialExcluded:true,realWebgl:true,
    computedRemovedMm3:54,g0RemovesMm3:0,realCNCCommandsSent:0,
    nativeInstallerCertified:false,fullFanucCertified:false});
   console.log('AIG_PUBLIC_RENDER_NEW_UI_HTTP_BROWSER_PASS',device.name,'54mm3');
  }catch(error){
   await page.screenshot({path:dir+'/'+device.name+'-FAIL.png',fullPage:true}).catch(()=>{});
   throw Error(device.name+' '+String(error?.message||error)+' pageErrors='+JSON.stringify(errors));
  }finally{await page.close();}
 }
 await writeFile(dir+'/live-http-proof.json',JSON.stringify({baseUrl:origin,
  commitVerifiedSeparatelyByRenderService:true, browserProof:report},null,2));
}finally{await browser.close();}
