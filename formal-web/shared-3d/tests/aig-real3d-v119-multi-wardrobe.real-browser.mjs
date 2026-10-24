import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/aig-real3d-v119';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 '--enable-webgl','--use-gl=angle','--use-angle=swiftshader',
 '--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1470,height:1200}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:8772/shared-3d/aig-real3d-v119-wardrobe-lab.html',
  {waitUntil:'domcontentloaded',timeout:30000});
 const generated=await page.evaluate(async()=>{
  const {buildAIGReal3DV109PhotoSurfaceGLB}=await import(
   '/shared-3d/aig-real3d-v109-photo-surface.mjs');
  const {sha256AIGReal3DBytes}=await import(
   '/shared-3d/aig-real3d-v99-native-model-ingest.mjs');
  async function fixture(kind){
   const c=document.createElement('canvas');c.width=96;c.height=128;
   const g=c.getContext('2d');
   g.clearRect(0,0,96,128);
   const boxes={
    actor:{x:25,y:8,w:46,h:110,fill:'#dca781'},
    uniform:{x:31,y:32,w:34,h:39,fill:'#3956ae'},
    casual:{x:23,y:40,w:50,h:67,fill:'#ad4c7c'}
   };
   const b=boxes[kind];g.fillStyle=b.fill;g.fillRect(b.x,b.y,b.w,b.h);
   const rgba=g.getImageData(0,0,96,128).data,
    url=c.toDataURL('image/png'),
    png=Uint8Array.from(atob(url.split(',')[1]),s=>s.charCodeAt(0)),
    sha=await sha256AIGReal3DBytes(png),
    isCloth=kind!=='actor';
   const depth=isCloth?new Float32Array(96*128).fill(8):null;
   const result=buildAIGReal3DV109PhotoSurfaceGLB({
    rgba,width:96,height:128,originalPNGBytes:png,imageSha256:sha,
    sourceWidthMM:500,widthPhysicallyMeasured:false,
    depthValuesMM:depth,
    depthSourceSha256:isCloth?'b'.repeat(64):null,
    depthMeasurementDeclared:isCloth
   });
   function b64(raw){
    let text='';for(let i=0;i<raw.length;i+=6000)
     text+=String.fromCharCode(...raw.subarray(i,i+6000));
    return btoa(text);
   }
   return {png:b64(png),glb:b64(result.glbBytes),
    triangles:result.receipt.surfaceTriangles};
  }
  return {actor:await fixture('actor'),uniform:await fixture('uniform'),
   casual:await fixture('casual')};
 });
 const b64=s=>Buffer.from(s,'base64');
 async function setModel(pic,model,data,name){
  await page.locator(pic).setInputFiles({
   name:name+'.png',mimeType:'image/png',buffer:b64(data.png)});
  await page.locator(model).setInputFiles({
   name:name+'.glb',mimeType:'model/gltf-binary',buffer:b64(data.glb)});
 }
 await setModel('#actor-photo','#actor-glb',generated.actor,'OriginalActorSource');
 const outfits=page.locator('.outfit');assert.equal(await outfits.count(),2);
 await setModel('.outfit:nth-child(1) .source-image',
  '.outfit:nth-child(1) .source-glb',generated.uniform,'UniformOutfit');
 await setModel('.outfit:nth-child(2) .source-image',
  '.outfit:nth-child(2) .source-glb',generated.casual,'CasualOutfit');
 await page.locator('#build-wardrobe').click();
 await page.waitForFunction(()=>{
  const t=document.querySelector('#status')?.textContent||'';
  return t.includes('V119 真換裝：')||t.startsWith('BLOCK');
 },null,{timeout:45000});
 const uniform=JSON.parse(await page.locator('#receipt').textContent());
 assert.equal(uniform.activeOutfitId,'look_1',JSON.stringify(uniform));
 assert.equal(uniform.actualGPUFrame.status,'WEBGL_XYZ_TRIANGLES_RENDERED');
 assert.equal(uniform.actorSourceGLBSha256.length,64);
 assert.equal(uniform.wardrobeOptions,2);
 assert.equal(uniform.outfitLayers.length,1);
 assert.equal(uniform.sourceGLBFileNotRewritten,true);
 assert.equal(uniform.multipleDistinctGarmentCutsAvailable,true);
 assert.equal(uniform.clothCollisionAndDrapeSimulated,false);
 assert.equal(uniform.productionReleasePASS,false);
 assert.equal(uniform.selectedTotalTriangles,
  generated.actor.triangles+generated.uniform.triangles);
 const previewA=await page.locator('#gl').screenshot();
 await writeFile(out+'/V119-ACTOR-UNIFORM-SOURCE-GLB-GPU.png',previewA);
 await page.locator('#active-outfit').selectOption('look_2');
 await page.waitForFunction(()=>document.querySelector('#receipt')
  ?.textContent.includes('"activeOutfitId": "look_2"'));
 const casual=JSON.parse(await page.locator('#receipt').textContent());
 assert.equal(casual.actualGPUFrame.status,'WEBGL_XYZ_TRIANGLES_RENDERED');
 assert.equal(casual.actorSourceGLBSha256,uniform.actorSourceGLBSha256);
 assert.equal(casual.actorTrianglesUnchanged,uniform.actorTrianglesUnchanged);
 assert.notEqual(casual.compositeManifestSha256,uniform.compositeManifestSha256);
 assert.equal(casual.selectedTotalTriangles,
  generated.actor.triangles+generated.casual.triangles);
 const previewB=await page.locator('#gl').screenshot();
 assert.notDeepEqual(previewA,previewB);
 await writeFile(out+'/V119-ACTOR-CASUAL-DIFFERENT-GARMENT-GLB-GPU.png',previewB);
 await page.evaluate(()=>{
  for(const [id,value] of [['a','90'],['b','120'],['progress','75']]){
   const el=document.getElementById(id);
   el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));
  }
 });
 const pose=JSON.parse(await page.locator('#receipt').textContent());
 assert.equal(pose.actualGPUFrame.aTiltDeg,90);
 assert.equal(pose.actualGPUFrame.bTurnDeg,120);
 assert.equal(pose.actualGPUFrame.progress,.75);
 assert.equal(pose.actualGPUFrame.sceneManifestSHA,casual.compositeManifestSha256);
 await writeFile(out+'/V119-A90-B120-CASUAL-75PCT-GPU.png',
  await page.locator('#gl').screenshot());
 await page.locator('#reset').click();
 const reset=JSON.parse(await page.locator('#receipt').textContent());
 assert.equal(reset.actualGPUFrame.aTiltDeg,0);
 assert.equal(reset.actualGPUFrame.bTurnDeg,0);
 assert.equal(reset.actualGPUFrame.progress,1);
 await page.locator('#active-outfit').selectOption('look_1');
 await page.waitForFunction(()=>document.querySelector('#receipt')
  ?.textContent.includes('"activeOutfitId": "look_1"'));
 const restored=JSON.parse(await page.locator('#receipt').textContent());
 assert.equal(restored.compositeManifestSha256,uniform.compositeManifestSha256);
 assert.equal(restored.actorSourceGLBSha256,uniform.actorSourceGLBSha256);
 assert.equal(await page.locator('#export').isEnabled(),true);
 assert.deepEqual(errors,[]);
 await writeFile(out+'/V119-MULTI-OUTFIT-REAL-GLB-SHA-GPU.json',
  JSON.stringify({uniform,casual,pose,reset,restored,fixtures:
   Object.fromEntries(Object.entries(generated).map(([k,v])=>[k,{triangles:v.triangles}]))},null,2));
 console.log('AIG_REAL3D_V119_GENUINE_DIFFERENT_CLOTHES_SAME_ACTOR_GLBS_5AX_GPU_PASS',
  JSON.stringify({outfits:2,actorSourceStable:true,
   distinctGarmentSources:true,trianglesFirst:uniform.selectedTotalTriangles,
   trianglesSecond:casual.selectedTotalTriangles,
   nonIdenticalGPUShots:true,returnOriginalSource:true,
   clothRiggingAndHumanLikenessNotCertified:true}));
}finally{await browser.close();}
