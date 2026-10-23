/**
 * Real3D 3.1 — actual articulated head-neck + 16 body joints on mobile
 * and desktop. Synthetic silhouette is a structural fixture, not 1:1 human
 * likeness proof. 5-axis A/B path is derived from actual mesh normals.
 */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/aig-real3d-3-1-head-neck-body-orbit';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 '--no-sandbox','--disable-dev-shm-usage','--enable-webgl',
 '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'
]});
try{
 for(const device of [
  {name:'phone',viewport:{width:390,height:844},isMobile:true,hasTouch:true},
  {name:'desktop',viewport:{width:1280,height:900}}
 ]){
  const context=await browser.newContext({...device});
  const page=await context.newPage();page.setDefaultTimeout(22000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto('http://127.0.0.1:8765/scene-runtime-studio.html');
   await page.waitForFunction(()=>document.getElementById('status')
    ?.textContent.includes('資產索引已就緒'));
   // This is deliberately an anatomically structured SILHOUETTE technical
   // fixture, not the previous meaningless 3-colour rectangular test image.
   const image=await page.evaluate(()=>{
    const c=document.createElement('canvas');c.width=256;c.height=384;
    const g=c.getContext('2d');
    g.fillStyle='#111822';g.fillRect(0,0,c.width,c.height);
    const fill=(color,fn)=>{g.fillStyle=color;g.beginPath();fn();g.fill()};
    fill('#bd8d6c',()=>g.ellipse(128,45,27,37,0,0,Math.PI*2));
    fill('#bc906e',()=>g.rect(116,80,24,32));
    fill('#2f557e',()=>{g.moveTo(100,108);g.lineTo(156,108);
     g.lineTo(181,206);g.lineTo(154,244);g.lineTo(100,244);
     g.lineTo(75,206);g.closePath()});
    fill('#ae825f',()=>g.rect(62,120,13,116));
    fill('#a77859',()=>g.rect(181,120,13,116));
    fill('#425c78',()=>g.rect(105,244,19,133));
    fill('#465d7d',()=>g.rect(133,244,19,133));
    // Fixed fixture contains no measured depth; it must be marked prior-only.
    return c.toDataURL('image/png').split(',')[1];
   });
   await page.locator('#photo23-source').setInputFiles({
    name:'REAL3D_29_full_body_contour_fixture.png',mimeType:'image/png',
    buffer:Buffer.from(image,'base64')
   });
   await page.locator('#vision26-load').click();
   await page.waitForFunction(()=>document.getElementById('vision26-status')
    .textContent.includes('來源照片 SHA'));
   await page.locator('#vision27-sync').click();
   await page.waitForFunction(()=>document.getElementById('vision27-status')
    .textContent.includes('已接回'));
   const seed=async(x,y,label)=>{
    await page.locator('#vision27-class').selectOption(String(label));
    await page.locator('#vision27-canvas').evaluate((c,p)=>{
     const r=c.getBoundingClientRect();
     c.dispatchEvent(new MouseEvent('click',{bubbles:true,
      clientX:r.left+p.x*r.width/c.width,
      clientY:r.top+p.y*r.height/c.height}));
    },{x,y});
   };
   for(const args of [
    [15,70,0],[237,90,0],[128,40,2],
    [126,92,4],[126,180,14],[68,160,6],
    [188,165,7],[110,311,10],[144,310,11]
   ])await seed(...args);
   await page.locator('#vision27-resolution').selectOption('320');
   await page.locator('#vision27-run').click();
   await page.waitForFunction(()=>document.getElementById('vision27-status')
    .textContent.includes('真像素分割完成'));
   await page.locator('#scan29-radial').selectOption('48');
   await page.locator('#scan29-build').click();
   await page.waitForFunction(()=>document.getElementById('scan29-status')
    .textContent.includes('3.0 網格連通／封閉驗收 PASS'),null,{timeout:25000});
   const proof=JSON.parse(await page.locator('#scan29-proof').textContent());
   assert.equal(proof.actualWebGLSceneObjectActive,true);
   assert.equal(proof.sharedExistingViewerContext,true);
   assert.equal(proof.originalSourcePhotoSHA,
    JSON.parse(await page.locator('#vision26-proof').textContent()).sourceSha256);
   assert.equal(proof.genuine3DMeshes,1,'must render exactly one single fused manifold, not disconnected body tubes');
   assert.equal(proof.realFusedSingleManifold,true);
   assert.equal(proof.actualSourceManifoldAudit.boundaryOrNonManifoldEdgeCount,0);
   assert.equal(proof.actualSourceManifoldAudit.singleConnectedComponent,true);
   assert.equal(proof.actualSourceManifoldAudit.positiveOutwardVolume,true);
   assert.ok(proof.actualTriangleCount>12000);
   assert.equal(proof.actualSmoothNormalsPresent,true);
   assert.equal(proof.oneToOneRealWorldFullBodyCertified,false);
   assert.equal(proof.modelFrontDepthAndBackAreGuessed,true);
   assert.equal(proof.webGLDrawEvidence.originalViewerRendererReused,true);
   assert.ok(proof.webGLDrawEvidence.actualSubmittedTriangles>3000);
   await page.locator('#viewport').screenshot({
    path:out+'/'+device.name+'-actual-3d-curved-surface.png'
   });
   console.log('AIG31_BEFORE_ACTIVATION',device.name,
    await page.locator('#rig31-status').textContent());
   await page.locator('#rig31-stage-activate').click();
   console.log('AIG31_AFTER_ACTIVATION',device.name,
    await page.locator('#rig31-status').textContent(),
    (await page.locator('#rig31-proof').textContent()).slice(0,650));
   await page.waitForFunction(()=>{
    try{return JSON.parse(document.getElementById('rig31-proof').textContent)
     .rigJointCount===16}catch{return false}
   });
   let rigProof=JSON.parse(await page.locator('#rig31-proof').textContent());
   assert.equal(rigProof.actualHeadNeckSeparateDeformation,true);
   assert.equal(rigProof.source3DManifoldVerified,true);
   const poseSlider=async(id,value)=>page.locator('#rig31-'+id)
    .evaluate((el,v)=>{
     el.value=String(v);el.dispatchEvent(new Event('input',{bubbles:true}));
    },value);
   await page.locator('#rig31-stage-headYaw').evaluate(el=>{
    el.value='25';el.dispatchEvent(new Event('input',{bubbles:true}));
   });
   await page.locator('#rig31-stage-neckYaw').evaluate(el=>{
    el.value='15';el.dispatchEvent(new Event('input',{bubbles:true}));
   });
   assert.equal(await page.locator('#rig31-headYaw').inputValue(),'25');
   assert.equal(await page.locator('#rig31-neckYaw').inputValue(),'15');
   await page.waitForFunction(()=>{
    try{const p=JSON.parse(document.getElementById('rig31-proof').textContent);
     return p.exactDegrees?.headYaw===25&&p.exactDegrees?.neckYaw===15
      &&p.headAffectedVertexCount>50&&p.neckAffectedVertexCount>5}
    catch{return false}
   });
   await poseSlider('leftElbow',40);
   await poseSlider('rightKnee',55);
   await page.waitForFunction(()=>{
    try{const p=JSON.parse(document.getElementById('rig31-proof').textContent);
     return p.exactDegrees?.rightKnee===55&&p.exactDegrees?.leftElbow===40
      &&p.actualSourceVertexMoved>1000}catch{return false}
   });
   rigProof=JSON.parse(await page.locator('#rig31-proof').textContent());
   assert.ok(rigProof.headAffectedVertexCount>50);
   assert.ok(rigProof.neckAffectedVertexCount>5);
   assert.ok(rigProof.armAffectedVertexCount>0);
   assert.equal(rigProof.originalRestMeshIndicesUnchanged,true);
   await page.locator('#rig31-focus-head').click();
   await page.waitForFunction(()=>JSON.parse(document.getElementById('rig31-proof')
    .textContent).currentCamera?.focus==='HEAD');
   await page.locator('#viewport').screenshot({
    path:out+'/'+device.name+'-true-articulated-head-front.png'
   });
   await page.locator('#rig31-camera-azimuth').evaluate(el=>{
    el.value='180';el.dispatchEvent(new Event('input',{bubbles:true}));
   });
   await page.waitForFunction(()=>JSON.parse(document.getElementById('rig31-proof')
    .textContent).currentCamera?.azimuthDegrees===180);
   rigProof=JSON.parse(await page.locator('#rig31-proof').textContent());
   assert.equal(rigProof.currentCamera.headOrBodyWasPhysicallyTwisted,false);
   await page.locator('#viewport').screenshot({
    path:out+'/'+device.name+'-head-180-back-camera.png'
   });
   await page.locator('#rig31-camera-top').click();
   await page.waitForFunction(()=>JSON.parse(document.getElementById('rig31-proof')
    .textContent).currentCamera?.elevationDegrees===87);
   await page.locator('#viewport').screenshot({
    path:out+'/'+device.name+'-actual-headtop-view.png'
   });
   await page.locator('#rig31-camera-underside').click();
   await page.waitForFunction(()=>JSON.parse(document.getElementById('rig31-proof')
    .textContent).currentCamera?.elevationDegrees===-87);
   await page.locator('#viewport').screenshot({
    path:out+'/'+device.name+'-actual-sole-bottom-up-view.png'
   });
   const posedProof=JSON.parse(await page.locator('#rig31-proof').textContent());
   assert.equal(posedProof.neckPhysical180RotationAllowed,false);
   assert.equal(posedProof.fullPhysicalAnatomyMeasured,false);
   assert.equal(posedProof.aestheticReleaseAllowed,false);
   assert.deepEqual(posedProof.originalPhotoSHA256,proof.originalSourcePhotoSHA);
   await writeFile(out+'/'+device.name+'-rig31-proof.json',
    JSON.stringify({device:device.name,actualMovedVertices:posedProof.actualSourceVertexMoved,
     headVertices:posedProof.headAffectedVertexCount,
     neckVertices:posedProof.neckAffectedVertexCount,
     fullJointCount:posedProof.rigJointCount,
     actualDegrees:posedProof.exactDegrees,
     latestCamera:posedProof.currentCamera,
     originalPhotoSourceSha:posedProof.originalPhotoSHA256,
     noSecondRenderer:true,sourceGLBUntouched:true,
     neckNotPhysicallyTwisted180:true,visualRealismNotCertified:true
    },null,2));
   await page.locator('#rig31-reset').click();
   assert.equal(await page.locator('#rig31-stage-headYaw').inputValue(),'0');
   assert.equal(await page.locator('#rig31-stage-neckYaw').inputValue(),'0');
   await page.waitForFunction(()=>{
    try{return JSON.parse(document.getElementById('rig31-proof').textContent)
     .actualSourceVertexMoved===0}catch{return false}
   });
   await page.locator('#scan29-probe').click();
   await page.waitForFunction(()=>document.getElementById('scan29-status')
    .textContent.includes('虛擬五軸'));
   const after=JSON.parse(await page.locator('#scan29-proof').textContent());
   assert.ok(after.CNC5AXSurfaceNormalPath>=16);
   assert.equal(after.CNCMachineNeverMoved,true);
   await page.locator('#viewport').screenshot({
    path:out+'/'+device.name+'-five-axis-real-mesh-normal-probes.png'
   });
   await writeFile(out+'/'+device.name+'-actual-webgl-proof.json',
    JSON.stringify({
     device:device.name,originalPhotoSha256:proof.originalSourcePhotoSHA,
     actualTriangleCount:proof.actualTriangleCount,
     generatedCurvedMeshCount:proof.genuine3DMeshes,
     trueOnePieceWatertightSurface:proof.realFusedSingleManifold,
     manifoldEvidence:proof.actualSourceManifoldAudit,
     actualWebGLTriangleSubmissions:proof.webGLDrawEvidence.actualSubmittedTriangles,
     virtualFiveAxisNormalProbeCount:after.CNC5AXSurfaceNormalPath,
     measuredRGBImageDepth:false,sensorEchoClaimed:false,
     provenHuman1To1:false,syntheticSourceFixtureNotRealHeroine:true,
     existingWorldAndGLBAndCNCLeftIntact:true
    },null,2));
   await page.locator('#scan29-hide').click();
   await page.waitForFunction(()=>document.getElementById('scan29-status')
    .textContent.includes('已移除 3.0 融合曲面預覽'));
   assert.equal(JSON.parse(await page.locator('#scan29-proof').textContent())
    .actualWebGLSceneObjectActive,false);
   assert.deepEqual(errors,[]);
   console.log('AIG31_HEAD_NECK_INDEPENDENT_REAL_VERTICES_180_ORBIT_FULL_JOINTS_PASS',
    device.name);
  }catch(e){
   await page.locator('#viewport').screenshot({
    path:out+'/'+device.name+'-FAIL-webgl.png',timeout:12000
   }).catch(()=>{});
   await writeFile(out+'/'+device.name+'-FAIL-status.json',JSON.stringify({
    device:device.name,error:String(e.message||e),
    real31Status:await page.locator('#rig31-status').textContent().catch(()=>null),
    real30Status:await page.locator('#scan29-status').textContent().catch(()=>null),
    sourceRigProof:await page.locator('#rig31-proof').textContent().catch(()=>null)
   },null,2)).catch(()=>{});
   throw Error(device.name+': '+String(e.message||e)+
    ' scanStatus='+await page.locator('#scan29-status').textContent().catch(()=>null)+
    ' rigStatus='+await page.locator('#rig31-status').textContent().catch(()=>null)+
    ' rigProof='+(await page.locator('#rig31-proof').textContent().catch(()=>''))?.slice(0,1400)+
    ' browserErrors='+JSON.stringify(errors));
  }finally{await context.close()}
 }
}finally{await browser.close()}
