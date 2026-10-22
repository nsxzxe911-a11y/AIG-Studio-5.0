/**
 * New AIG user-facing entry Gate. Does not imply CNC/native release approval.
 * Browser verifies two verified destinations and mobile overflow; fake photo app retired.
 */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const base='http://127.0.0.1:8765/';
const dir='artifacts/aig-clean-home';
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 for(const d of [
  {name:'phone',viewport:{width:360,height:780},isMobile:true,hasTouch:true},
  {name:'landscape',viewport:{width:915,height:412},isMobile:true,hasTouch:true},
  {name:'desktop',viewport:{width:1440,height:900}}
 ]){
  const page=await browser.newPage({...d,deviceScaleFactor:1});
  page.setDefaultTimeout(15000);
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  try{
   let r=await page.goto(base+'aig-new-home.html',{waitUntil:'load'});
   assert.equal(r?.status(),200);
   assert.match(await page.title(),/AIG.*新工作首頁/);
   const stats=await page.evaluate(()=>{
    const box=(q)=>{const b=document.querySelector(q).getBoundingClientRect();
      return {x:b.x,y:b.y,width:b.width,height:b.height};};
    return {viewport:innerWidth,document:document.documentElement.scrollWidth,
      homeCards:document.querySelectorAll('#choose .card').length,
      retiredFastModelLinks:document.querySelectorAll('a[href="./fastmodel/"]').length,
      cnc:box('.card.cnc'),manage:box('.card.tools')};
   });
   assert.equal(stats.homeCards,2);
   assert.equal(stats.retiredFastModelLinks,0);
   assert.ok(stats.document<=stats.viewport+3,
    'new clean home cannot scroll horizontally: '+JSON.stringify(stats));
   for(const card of ['cnc','manage']){
    assert.ok(stats[card].width>200,'card remains readable: '+card);
    assert.ok(stats[card].x>=-1&&stats[card].x+stats[card].width<=stats.viewport+2,
      'card must stay in viewport: '+card);
   }
   if(d.name==='phone')
    assert.ok(stats.cnc.y<stats.manage.y,
      'on phone cards must stack without squeezing');
   if(d.name==='desktop')
    assert.ok(Math.abs(stats.cnc.y-stats.manage.y)<5,
      'on desktop cards should be aligned in the first row');
   await page.locator('a[href="./3ax-nc-workbench.html"]').first().click();
   await page.waitForURL('**/3ax-nc-workbench.html');
   assert.equal(await page.locator('#view').count(),1);
   assert.equal(await page.locator('#nc').count(),1);
   assert.equal(await page.locator('.quick-guide').count(),1);
   assert.equal(await page.locator('#parse').count(),1);
   assert.equal(await page.locator('#simulate').count(),1);
   await page.goto(base+'aig-new-home.html',{waitUntil:'load'});
   const nativeUrl=await page.locator('a.link[href="./aig-download-center.html"]').getAttribute('href');
   assert.equal((await page.request.get(base+'fastmodel/index.html')).status(),404,
    'retired fake 6.9.5 public homepage must not be re-published');
   assert.equal((await page.request.get(base+nativeUrl)).status(),200);
   await page.locator('a.link[href="./aig-download-center.html"]').click();
   await page.waitForURL('**/aig-download-center.html');
   assert.equal(await page.locator('#export-local').count(),1);
   assert.equal(await page.locator('.cards .card').count(),4);
   await page.goto(base+'aig-new-home.html',{waitUntil:'load'});
   // Retired Web pages must not masquerade as the workbench.
   assert.equal((await page.request.get(base+'mobile-runtime.html')).status(),200);
   assert.ok(await page.locator('details').count()>=1,'advanced maintenance stays collapsed');
   assert.equal(await page.locator('details').evaluate(e=>e.open),false);
   assert.deepEqual(errors,[]);
   await page.screenshot({path:dir+'/'+d.name+'-clean-home.png',fullPage:true});
   await writeFile(dir+'/'+d.name+'-proof.json',JSON.stringify({
    device:d.name,layout:stats,
    destinations:{cnc:'3ax-nc-workbench.html',downloads:'aig-download-center.html'},
    oldFakeFastModelPublicEntryRemoved:true,
    existingProjectStorageDeleted:false,
    authenticMachineVisualApproved:false,
    cncMachineCommandsSent:0,nativeAPKorEXEApproved:false
   },null,2));
   console.log('AIG_CLEAN_NEW_HOME_BROWSER_PASS',d.name);
  }catch(e){
   await page.screenshot({path:dir+'/'+d.name+'-FAIL.png',fullPage:true}).catch(()=>{});
   throw Error(d.name+' '+e.message+' JS_Errors='+JSON.stringify(errors));
  }finally{await page.close();}
 }
}finally{await browser.close();}
