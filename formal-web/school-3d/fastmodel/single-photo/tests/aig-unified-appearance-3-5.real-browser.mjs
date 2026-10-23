/**
 * Real3D 2.9 — actual curved XYZ mesh in existing WebGL canvas on mobile
 * and desktop. Synthetic silhouette is a structural fixture, not 1:1 human
 * likeness proof. 5-axis A/B path is derived from actual mesh normals.
 */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/aig-real3d-3-5-unified-appearance';
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
   await page.locator('#aig35-width').selectOption('1.1');
   await page.locator('#aig35-height').selectOption('.9');
   await page.locator('#aig35-depth').selectOption('1.2');
   await page.locator('#aig35-colour').selectOption('1.15');
   await page.locator('#scan29-radial').selectOption('48');
   await page.locator('#scan29-build').click();
   await page.waitForFunction(()=>document.getElementById('scan29-status')
    .textContent.includes('3.0 網格連通／封閉驗收 PASS'),null,{timeout:25000});
   const proof=JSON.parse(await page.locator('#scan29-proof').textContent());
   assert.equal(proof.actualWebGLSceneObjectActive,true);
   assert.equal(proof.real39RuntimeStability?.schema,
    'AIG_REAL3D_3_9_SINGLE_KERNEL_STABILITY');
   assert.equal(proof.real39RuntimeStability.activeJob,null,
    'completed scan must not hold the renderer lock');
   assert.equal(proof.real39RuntimeStability.completed,1);
   assert.equal(proof.real39RuntimeStability.blocked,0);
   assert.equal(proof.unifiedReal36OneKernel120LogicalSlots
    .stabilityBudget.rendererContextsAllowed,1);
   assert.ok(proof.unifiedReal36OneKernel120LogicalSlots
    .stabilityBudget.cappedCooperativeLanes<=4);
   assert.equal(proof.unifiedReal36OneKernel120LogicalSlots
    .stabilityBudget.originalImageMeshAndGLBMutationPermitted,false);
   assert.equal(proof.unifiedReal36OneKernel120LogicalSlots?.plan?.schema,
    'AIG_REAL3D_3_7_ONE_KERNEL_SCALABLE_LOGICAL_SHARDS');
   assert.equal(proof.unifiedReal36OneKernel120LogicalSlots.plan.logicalSlotsConfigured,12000);
   assert.equal(proof.unifiedReal36OneKernel120LogicalSlots.plan.kernelImplementationCount,1);
   assert.equal(proof.unifiedReal36OneKernel120LogicalSlots.plan.realWebWorkersSpawned,0);
   assert.equal(proof.unifiedReal36OneKernel120LogicalSlots.plan.sharedWebGLContextCount,1);
   assert.equal(proof.unifiedReal36OneKernel120LogicalSlots.vertexColourWork.completedIdenticalKernelSlots,12000);
   assert.ok(proof.unifiedReal36OneKernel120LogicalSlots.vertexColourWork.actualVerticesColoured>5000);
   assert.equal(proof.unifiedReal36OneKernel120LogicalSlots.cameraFit.cameraFitFromRealMesh,true);
   assert.equal(proof.unifiedReal36OneKernel120LogicalSlots.sourceReferenceVisible,true);
   assert.equal(proof.unifiedReal36OneKernel120LogicalSlots.appearanceGatePassed,false);
   assert.equal(proof.real36Lighting.active,'BALANCED_PBR');
   assert.equal(proof.real38LazyAssetIndex.totalIndexed,8);
   assert.equal(proof.real38LazyAssetIndex.activeCount,1,
    'one installed procedural garment preset may be active, not all clothes');
   assert.ok(proof.real38LazyAssetIndex.activeIds.includes('procedural:uniform'));
   assert.equal(proof.real38LazyAssetIndex.indexedAssetsAreMetadataNotLoadedMeshes,true);
   assert.equal(proof.real37ScalableCoreAndWardrobe.wardrobe.garmentMeshCount,2);
   assert.equal(proof.real37ScalableCoreAndWardrobe.wardrobe.bodyGeometryIdentityPreserved,true);

   assert.ok((await page.locator('#scan36-visible').textContent()).includes('12000 個已配置邏輯工作槽'));
   await page.locator('#scan36-fit').click();
   assert.ok((await page.locator('#scan29-status').textContent()).includes('重新置中'));
   await page.locator('#scan36-light').selectOption('raytrace');
   const rayProof=JSON.parse(await page.locator('#scan29-proof').textContent());
   assert.equal(rayProof.real36Lighting.active,'QUALITY_PBR_FALLBACK');
   assert.equal(rayProof.real36Lighting.rayTracing,false);
   assert.equal(rayProof.unifiedReal36OneKernel120LogicalSlots.plan.parallelHardwareCoresCertified,0);
   await page.locator('#scan36-light').selectOption('balanced');
   await page.locator('#scan38-asset-manager > summary').click();
   await page.locator('#scan38-slot').selectOption('hair');
   assert.ok((await page.locator('#scan38-items').textContent())
    .includes('待製作真 3D 資產'));
   assert.ok((await page.locator('#scan38-status').textContent())
    .includes('目錄索引 8 筆'));
   await page.locator('#scan37-outfit').selectOption('body-proxy');
   await page.waitForFunction(()=>document.getElementById('scan37-status')
    .textContent.includes('body-proxy'));
   let neutral=JSON.parse(await page.locator('#scan29-proof').textContent());
   assert.equal(neutral.real38LazyAssetIndex.activeCount,0);
   assert.equal(neutral.real37ScalableCoreAndWardrobe.wardrobe.garmentMeshCount,0);
   await page.locator('#scan37-outfit').selectOption('uniform');
   await page.waitForFunction(()=>document.getElementById('scan37-status')
    .textContent.includes('uniform'));
   const redressed=JSON.parse(await page.locator('#scan29-proof').textContent());
   assert.deepEqual(redressed.real38LazyAssetIndex.activeIds,['procedural:uniform']);
   assert.equal(redressed.real37ScalableCoreAndWardrobe.wardrobe.sourcePhotoUnmodified,true);
   // Real joint deformation must propagate to REAL independent garment 3D
   // vertex attributes. A static clothing shell over a moving body is a FAIL.
   await page.locator('#rig31-activate').click();
   await page.waitForFunction(()=>JSON.parse(
    document.getElementById('rig31-proof').textContent)
    .actualHeadNeckSeparateDeformation===true);
   const spine=page.locator('#rig31-spineBend');
   assert.equal(await spine.isDisabled(),false);
   await spine.evaluate(el=>{
    el.value='15';el.dispatchEvent(new Event('input',{bubbles:true}));
   });
   await page.waitForFunction(()=>{
    const body=JSON.parse(document.getElementById('rig31-proof').textContent);
    const layer=JSON.parse(document.getElementById('scan29-proof').textContent)
     .real39GarmentActuallyFollowingBodyPose;
    return body.actualSourceVertexMoved>0&&
     layer?.actualGarmentMeshesFollowingRig>=2&&
     layer.realGarmentVerticesMoved>0;
   },null,{timeout:20000});
   const posedClothes=JSON.parse(await page.locator('#scan29-proof').textContent());
   assert.equal(posedClothes.real39GarmentActuallyFollowingBodyPose
    .clothPhysicsAndCollisionStillNotCertified,true);
   assert.equal(posedClothes.real39GarmentActuallyFollowingBodyPose
    .originalBodyRestAndClothesUnchanged,true);
   await page.locator('#rig31-reset').click();
   await page.waitForFunction(()=>{
    const layer=JSON.parse(document.getElementById('scan29-proof').textContent)
     .real39GarmentActuallyFollowingBodyPose;
    return layer?.realGarmentVerticesMoved===0;
   },null,{timeout:20000});



   assert.equal(proof.unifiedReal35AppearancePipeline?.schema,
    'AIG_REAL3D_3_5_UNIFIED_SOURCE_APPEARANCE_GATE');
   assert.deepEqual(proof.unifiedReal35AppearancePipeline.finalControls,
    {widthScale:1.1,heightScale:0.9,depthScale:1.2,colourGain:1.15});
   assert.ok(proof.unifiedReal35AppearancePipeline.matchingRows>=7);
   assert.ok(Number.isFinite(proof.unifiedReal35AppearancePipeline.source2DEdgeErrorAfterPx));
   assert.equal(proof.unifiedReal35AppearancePipeline.automaticallyAchieved100PercentLikeness,false);
   assert.equal(proof.unifiedReal35AppearancePipeline.rearAndOccludedDepthUnknown,true);
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
     unifiedReal35PhotoXY:proof.unifiedReal35AppearancePipeline,
     unifiedReal36OneKernel120Slots:proof.unifiedReal36OneKernel120LogicalSlots,
     real38AssetIndex:proof.real38LazyAssetIndex,
     real36RayTracingFallbackProven:true,
     originalUserReferenceNotAvailableToThisSyntheticTest:true,
     existingWorldAndGLBAndCNCLeftIntact:true
    },null,2));
   await page.locator('#scan29-hide').click();
   await page.waitForFunction(()=>document.getElementById('scan29-status')
    .textContent.includes('已移除 3.0 融合曲面預覽'));
   assert.equal(JSON.parse(await page.locator('#scan29-proof').textContent())
    .actualWebGLSceneObjectActive,false);
   assert.deepEqual(errors,[]);
   console.log('AIG35_SINGLE_PHOTO_SHARED_RENDERER_AND_APPEARANCE_PASS',
    device.name);
  }catch(e){
   await page.screenshot({
    path:out+'/'+device.name+'-FAIL-full-page.png',fullPage:true
   }).catch(()=>{});
   throw Error(device.name+': '+String(e.message||e)+
    ' status='+await page.locator('#scan29-status').textContent().catch(()=>null)+
    ' browserErrors='+JSON.stringify(errors));
  }finally{await context.close()}
 }
}finally{await browser.close()}
