/* Native local OBJ -> brown GPU 7 views -> real evidence JSON. NONHUMAN fixture. */
import {chromium} from 'playwright';
import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const dir='artifacts/aig-real3d-brown-source-obj-review';
function syntheticOBJ({hole=false}={}){
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
  if(!(hole&&j===34&&k===4))faces.push('f '+a+' '+b+' '+d);
  faces.push('f '+a+' '+d+' '+c);
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
function syntheticMeshSurfaceMarkers(){
 // Points sampled exactly from the current NONHUMAN elliptical mesh.
 // Names are synthetic labels for plumbing QA, NOT actual anatomy.
 const rings=42,segments=44;
 const p=(j,k)=>{
  const t=j/(rings-1),r=Math.max(.008,Math.sin(Math.PI*t));
  const a=2*Math.PI*k/segments;
  return [Number((.25*r*Math.cos(a)).toFixed(8)),
   Number(t.toFixed(8)),Number((.15*r*Math.sin(a)).toFixed(8))];
 };
 const left=j=>p(j,22),right=j=>p(j,0);
 return {
  headTop:[0,1,0],chin:p(38,0),noseTip:p(37,11),neckBase:p(34,0),
  leftShoulder:left(30),rightShoulder:right(30),
  leftElbow:left(25),rightElbow:right(25),
  leftWrist:left(20),rightWrist:right(20),
  leftThumbTip:left(16),rightThumbTip:right(16),
  leftIndexTip:left(15),rightIndexTip:right(15),
  pelvis:p(21,0),leftKnee:left(10),rightKnee:right(10),
  leftHeel:left(2),rightHeel:right(2),
  leftToe:left(1),rightToe:right(1)
 };
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
 await page.locator('#landmark-file').setInputFiles({
  name:'SYNTHETIC_NONHUMAN_LABELS.json',
  mimeType:'application/json',
  buffer:Buffer.from(JSON.stringify(syntheticMeshSurfaceMarkers()))
 });
 await page.locator('#source-origin').fill('Synthetic test mesh: NOT a real human');
 await page.locator('#capture-method').selectOption('MANUAL_MODEL');
 await page.locator('#source-rights').check();
 // Four independently attached actual transparent reference PNGs;
 // ellipse is diagnostic synthetic geometry and NOT a source person photo.
 const pngReference=Buffer.from((await page.evaluate(()=>{
  const c=document.createElement('canvas');c.width=1080;c.height=1920;
  const ctx=c.getContext('2d');
  ctx.clearRect(0,0,1080,1920);ctx.fillStyle='#242424';
  ctx.beginPath();ctx.ellipse(540,960,145,600,0,0,Math.PI*2);ctx.fill();
  return c.toDataURL('image/png');
 })).split(',')[1],'base64');
 for(const angle of ['front','side','back','threeQuarter']){
  await page.locator('#reference-'+angle).setInputFiles({
   name:'QA_SYNTHETIC_ALPHA_'+angle+'.png',mimeType:'image/png',
   buffer:pngReference
  });
 }
 await page.locator('#inspect').click();
 await page.waitForFunction(()=>{
  const a=document.getElementById('inspect'),s=document.getElementById('status');
  return a&&!a.disabled&&(s?.dataset.ready==='true'||s?.textContent?.startsWith('BLOCK'));
 },null,{timeout:210000});
 const status=await page.locator('#status').textContent();
 assert.equal(await page.locator('#status').getAttribute('data-ready'),'false',status);
 assert.match(status,/BLOCK：下半身只有單一 3D 連續截面/);
 assert.match(await page.locator('#shape-envelope-stats').textContent(),
  /非人體合成橢球/);
 assert.match(await page.locator('#shape-envelope-metrics').textContent(),/最大寬度 83[89] mm/);
 assert.match(await page.locator('#shape-envelope-metrics').textContent(),/側面最大厚度 50[34] mm/);
 const proof=JSON.parse(await page.locator('#evidence').textContent());
 assert.equal(proof.sourceReview.model.format,'OBJ');
 assert.ok(Math.abs(proof.sourceShapeEnvelope.boundingMillimeters.frontMaxWidthX-840)<2);
 assert.ok(Math.abs(proof.sourceShapeEnvelope.boundingMillimeters.sideMaxDepthZ-504)<2);
 assert.equal(proof.sourceShapeEnvelope.boundingMillimeters.heightY,1680);
 assert.equal(proof.sourceShapeEnvelope.ratios.frontMaxWidthToSideDepth,1.6667);
 assert.equal(proof.sourceShapeEnvelope.wideFrontEnvelopeNeedsPoseAndReferenceReview,true);
 assert.equal(proof.sourceShapeEnvelope.fixtureExplicitlySyntheticNonhuman,true);
 assert.equal(proof.sourceShapeEnvelope.noAutonomousBodyResizing,true);
 assert.equal(proof.sourceShapeEnvelope.releasePASS,false);
 assert.equal(proof.source3DSections.schema,'AIG_REAL3D_NATIVE_3D_TRIANGLE_CROSS_SECTIONS_V1');
 assert.equal(proof.source3DSections.oneClosedLowerMassFlag,true);
 assert.equal(proof.source3DSections.distinctSideBySideLowerLegSectionsObserved,false);
 assert.equal(proof.source3DSections.sections.length,4);
 assert.equal(proof.source3DSections.sections[0].significantClosedLoops,1);
 assert.equal(proof.source3DSections.releasePASS,false);
 assert.equal(await page.locator('#source-3d-slice-table tbody tr').count(),4);
 assert.match(await page.locator('#source-3d-slice-stats').textContent(),/只有一個連續閉合截面/);
 assert.equal(proof.sourceReview.model.sha256,hash);
 assert.equal(proof.sourceReview.computedEvidence.nativeMeshGeometryGatePASS,true);
 assert.equal(proof.sourceReview.computedEvidence.fourRealGpuOrthographicAnglesCaptured,true);
 assert.equal(proof.sourceReview.personAuthenticityVerified,false);
 assert.equal(proof.sourceReview.naturalAppearancePASS,false);
 assert.equal(proof.sourceReview.releasePASS,false);
 assert.equal(proof.sourceReview.computedEvidence.labeledAnatomyValidatedAgainstMesh,true,
  'Synthetic marker labels must be native OBJ attached for this pipeline-only test');
 assert.equal(proof.anatomicalProjection.originalObjMarkerMeshAuditComplete,true);
 assert.equal(proof.anatomicalProjection.fourAngleProjectedPoints.length,4);
 assert.equal(proof.anatomicalProjection.fourSourceGPUAnnotations.length,4);
 assert.equal(proof.anatomicalProjection.regionComparisonCount,4);
 assert.equal(proof.anatomicalProjection.naturalHumanAppearancePASS,false);
 assert.equal(proof.anatomicalProjection.releasePASS,false);
 assert.equal(proof.localSurfaceTopology.schema,'AIG_REAL3D_NATIVE_5_REGION_SURFACE_TOPOLOGY_V1');
 assert.equal(proof.localSurfaceTopology.regionCount,5);
 assert.equal(proof.localSurfaceTopology.sourceSha256,hash);
 assert.equal(proof.localSurfaceTopology.originalSourceVerticesChanged,false);
 assert.equal(proof.localSurfaceTopology.naturalAnatomyAndFingersApproved,false);
 assert.equal(proof.localSurfaceTopology.releasePASS,false);
 assert.equal(proof.sourceDefectOverlay.viewCount,4);
 assert.equal(proof.sourceDefectOverlay.originalVertexMeshNeverModified,true);
 assert.equal(proof.sourceDefectOverlay.images.length,4);
 assert.equal(await page.locator('#defect-gallery figure').count(),4);
 assert.ok(proof.sourceDefectOverlay.images.every(x=>
  x.deduplicatedRawEdgeCount===0&&x.humanVisualApproval===false));
 assert.equal(proof.localSurfaceTopology.globallyOpenEdges,0);
 assert.equal(await page.locator('#surface-table tbody tr').count(),5);
 assert.match(await page.locator('#surface-table').textContent(),/頭頸附近/);
 assert.match(await page.locator('#surface-table').textContent(),/右腳附近/);
 assert.equal(await page.locator('#anatomy-gallery figure').count(),4);
 assert.equal(await page.locator('#anatomy-region-table tbody tr').count(),16);
 for(let i=0;i<4;i++){
  const picture=page.locator('#anatomy-gallery figure').nth(i);
  const promise=page.waitForEvent('download',{timeout:20000});
  await picture.locator('a').click();
  const dl=await promise,bytes=await readFile(await dl.path());
  assert.equal(bytes.readUInt32BE(0),0x89504e47);
  assert.equal(bytes.readUInt32BE(16),1080);
  assert.equal(bytes.readUInt32BE(20),1920);
  const sha=createHash('sha256').update(bytes).digest('hex');
  assert.equal(sha,proof.anatomicalProjection.fourSourceGPUAnnotations[i].sha256);
  await copyFile(await dl.path(),dir+'/SYNTHETIC_ANATOMY_MARKERS_'+i+'.png');
 }
 assert.equal(proof.silhouetteComparison.transparentReferencesUploaded,4);
 assert.equal(proof.silhouetteComparison.fourViewSilhouetteComparePASS,true,
  JSON.stringify(proof.silhouetteComparison.errors));
 assert.equal(proof.silhouetteComparison.allFourAnglesCompared,true);
 assert.equal(proof.silhouetteComparison.images.length,4);
 assert.equal(proof.silhouetteComparison.anatomicalVisualApproval,false);
 assert.equal(proof.silhouetteComparison.personLikenessVerified,false);
 assert.ok(proof.silhouetteComparison.averageIoU>=0&&proof.silhouetteComparison.averageIoU<1,
  'Different synthetic GPU mesh and drawn alpha reference MUST NOT show exact visual identity');
 assert.equal(await page.locator('#reference-gallery figure').count(),4);
 assert.equal(await page.locator('#profile-angle').isDisabled(),false);
 assert.equal(proof.silhouetteComparison.images[0].verticalScanlineProfile.bands.length,12);
 assert.equal(proof.silhouetteComparison.images[0].verticalScanlineProfile.modelGeometryModified,false);
 assert.equal(await page.locator('#profile-table tbody tr').count(),12);
 assert.match(await page.locator('#profile-table').textContent(),/參考平均覆蓋/);
 await page.locator('#profile-angle').selectOption('side');
 assert.match(await page.locator('#profile-table').textContent(),/方向 side/);
 assert.equal(await page.locator('#profile-table tbody tr').count(),12);
 await page.locator('#profile-angle').selectOption('front');
 for(let i=0;i<4;i++){
  const item=page.locator('#reference-gallery figure').nth(i);
  const p=page.waitForEvent('download',{timeout:15000});
  await item.locator('a').click();
  const dl=await p,blob=await readFile(await dl.path());
  assert.equal(blob.readUInt32BE(0),0x89504e47);
  assert.equal(blob.readUInt32BE(16),1080);
  assert.equal(blob.readUInt32BE(20),1920);
  await copyFile(await dl.path(),dir+'/SOURCE_DIFFERENCE_'+i+'.png');
 }
 assert.equal(proof.sevenRealBrownGPUPasses.length,7);
 assert.deepEqual(proof.sevenRealBrownGPUPasses.slice(0,4).map(x=>x.mode),
  ['BLACK_CONTOUR','BROWN_FLAT','BROWN_VOLUME','BROWN_FINISH']);
 const verify=page.waitForEvent('download',{timeout:30000});
 await page.locator('#report-download').click();
 const dl=await verify,record=await readFile(await dl.path());
 assert.equal(JSON.parse(record.toString('utf8')).sourceReview.releasePASS,false);
 await copyFile(await dl.path(),dir+'/AIG-NONHUMAN-Source-Review.json');
 await page.screenshot({path:dir+'/OBJ-BROWN-GPU-SOURCE-LAB.png',fullPage:true});
 // Now remove an actual indexed triangle near one synthetic source marker
 // and re-run real local OBJ -> FOUR new GPU defect maps without repairing it.
 const brokenOBJ=syntheticOBJ({hole:true}),
  brokenSha=createHash('sha256').update(brokenOBJ).digest('hex');
 await page.locator('#model-file').setInputFiles({
  name:'SYNTHETIC_NONHUMAN_TRUE_MISSING_NECK_TRIANGLE.obj',
  mimeType:'text/plain',buffer:brokenOBJ
 });
 await page.locator('#inspect').click();
 await page.waitForFunction(()=>{
  const b=document.getElementById('inspect'),t=document.getElementById('status');
  return !b?.disabled&&(t?.dataset.ready==='true'||t?.textContent?.startsWith('BLOCK'));
 },null,{timeout:210000});
 const blocked=await page.locator('#status').textContent();
 assert.match(blocked,/BLOCK/);
 assert.equal(await page.locator('#status').getAttribute('data-ready'),'false');
 const bad=JSON.parse(await page.locator('#evidence').textContent());
 assert.equal(bad.sourceSha256,brokenSha);
 assert.equal(bad.rawNativeGeometryGatePASS,false);
 assert.equal(bad.diagnosticOnlyWithBadSource,true);
 assert.ok(bad.localSurfaceTopology.globallyOpenEdges>0);
 assert.ok(bad.localSurfaceTopology.regions.some(x=>
  x.anomalyExactWorldEdges.some(e=>e.type==='OPEN_BOUNDARY')));
 assert.equal(bad.sourceDefectOverlay.images.length,4);
 assert.ok(bad.sourceDefectOverlay.images.every(x=>
  x.deduplicatedRawEdgeCount>0&&x.originalSourceTrianglesChanged===false));
 assert.equal(bad.sourceDefectOverlay.releasePASS,false);
 assert.ok(await page.locator('#defect-edge-list button').count()>0);
 await page.locator('#defect-edge-list button').first().click();
 assert.match(await page.locator('#defect-selected').textContent(),/原始 OBJ 頂點/);
 assert.match(await page.locator('#defect-selected').textContent(),/原始 XYZ 起點/);
 assert.match(await page.locator('#defect-selected').textContent(),new RegExp(brokenSha));
 // Real image click at the original source pixel under object-fit containment.
 const selectedEdge=bad.sourceDefectOverlay.images[0].projectedSourceEdges[0];
 const pX=(selectedEdge.start.x+selectedEdge.end.x)/2,
       pY=(selectedEdge.start.y+selectedEdge.end.y)/2;
 const pixel=await page.locator('#defect-gallery figure').first().locator('img')
  .evaluate((img,{x,y})=>{
   const r=img.getBoundingClientRect(),sc=Math.min(r.width/1080,r.height/1920);
   return {x:(r.width-1080*sc)/2+x*sc,
    y:(r.height-1920*sc)/2+y*sc};
  },{x:pX,y:pY});
 await page.locator('#defect-gallery figure').first().locator('img')
  .click({position:pixel});
 assert.match(await page.locator('#defect-selected').textContent(),/原始 OBJ 頂點/);
 assert.equal(await page.locator('#compare-source').isDisabled(),false);
 assert.equal(await page.locator('#defect-gallery figure').count(),4);
 for(let i=0;i<4;i++){
  const fig=page.locator('#defect-gallery figure').nth(i);
  const promised=page.waitForEvent('download',{timeout:20000});
  await fig.locator('a').click();
  const dl=await promised,png=await readFile(await dl.path());
  assert.equal(png.readUInt32BE(0),0x89504e47);
  assert.equal(png.readUInt32BE(16),1080);
  assert.equal(png.readUInt32BE(20),1920);
  const sha=createHash('sha256').update(png).digest('hex');
  assert.equal(sha,bad.sourceDefectOverlay.images[i].sha256);
  await copyFile(await dl.path(),dir+'/BROKEN_OBJ_TRUE_GPU_DEFECT_OVERLAY_'+i+'.png');
 }
 const downloadBad=page.waitForEvent('download',{timeout:20000});
 await page.locator('#report-download').click();
 const badFile=await downloadBad;
 const downloaded=JSON.parse((await readFile(await badFile.path())).toString());
 assert.equal(downloaded.sourceDefectOverlay.releasePASS,false);
 assert.equal(downloaded.localSurfaceTopology.sourceGeometryGatePASS,false);
 await copyFile(await badFile.path(),dir+'/BROKEN_OBJ_SOURCE_DEFECT_REPORT.json');
 await page.screenshot({path:dir+'/BROKEN_OBJ_4_GPU_DEFECT_VIEWS-LAB.png',fullPage:true});
 // Independent intact source submitted as an AFTER candidate. Source mesh
 // is never edited; native SHA and all 4 camera captures must be independent.
 await page.locator('#after-source-file').setInputFiles({
  name:'AFTER_INTACT_SYNTHETIC_NONHUMAN_OBJ.obj',mimeType:'text/plain',buffer:buf
 });
 await page.locator('#compare-source').click();
 await page.waitForFunction(()=>{
  const b=document.getElementById('compare-source'),
   label=document.getElementById('repair-compare-stats')?.textContent||'';
  return !b?.disabled&&
   (label.startsWith('兩份來源 OBJ 已對照')||label.startsWith('BLOCK'));
 },null,{timeout:210000});
 assert.match(await page.locator('#repair-compare-stats').textContent(),/兩份來源 OBJ 已對照/);
 const compared=JSON.parse(await page.locator('#evidence').textContent());
 const diff=compared.beforeAfterComparison;
 assert.equal(diff.beforeSha256,brokenSha);
 assert.ok(Math.abs(diff.sourceShapeBeforeAfter.before.frontMaxWidthX-840)<2);
 assert.equal(diff.sourceShapeBeforeAfter.after.frontMaxWidthX,diff.sourceShapeBeforeAfter.before.frontMaxWidthX);
 assert.ok(Math.abs(diff.sourceShapeBeforeAfter.before.sideMaxDepthZ-504)<2);
 assert.equal(diff.sourceShapeBeforeAfter.after.sideMaxDepthZ,diff.sourceShapeBeforeAfter.before.sideMaxDepthZ);
 assert.equal(diff.sourceShapeBeforeAfter.sameVisibleBoundingEnvelopeAcrossSources,true);
 assert.equal(diff.sourceShapeBeforeAfter.humanNaturalAppearancePASS,false);
 assert.match(await page.locator('#repair-compare-stats').textContent(),
  /寬度 83[89](?:\.\d+)?→83[89](?:\.\d+)? mm/);
 assert.equal(diff.afterSha256,hash);
 assert.ok(diff.globalBefore.openEdges>0);
 assert.equal(diff.globalAfter.openEdges,0);
 assert.equal(diff.beforeSourceGeometryPASS,false);
 assert.equal(diff.afterSourceGeometryPASS,true);
 assert.ok(diff.previousDefectEdgesAbsentInAfter>0);
 assert.equal(diff.newDefectEdgesNotPresentInBefore,0);
 assert.equal(diff.fourPairedRealGPUViews.length,4);
 assert.equal(diff.bothSourceModelsRemainUnmodified,true);
 assert.equal(diff.verifiedAnatomicalRepair,false);
 assert.equal(diff.releasePASS,false);
 assert.equal(await page.locator('#repair-compare-table tbody tr').count(),5);
 assert.equal(await page.locator('#repair-compare-gallery .compare-pair').count(),4);
 const promisedAfter=page.waitForEvent('download',{timeout:30000});
 await page.locator('#repair-compare-gallery a').first().click();
 const dlAfter=await promisedAfter,afterPNG=await readFile(await dlAfter.path());
 assert.equal(afterPNG.readUInt32BE(0),0x89504e47);
 assert.equal(afterPNG.readUInt32BE(16),1080);
 assert.equal(afterPNG.readUInt32BE(20),1920);
 assert.equal(createHash('sha256').update(afterPNG).digest('hex'),
  diff.fourPairedRealGPUViews[0].afterBrownGPUOverlaySHA256);
 await copyFile(await dlAfter.path(),dir+'/PR59-AFTER-SOURCE-TRUE_GPU.png');
 const downloadDiff=page.waitForEvent('download',{timeout:20000});
 await page.locator('#report-download').click();
 const json=await downloadDiff;
 const nativeReport=JSON.parse((await readFile(await json.path())).toString());
 assert.equal(nativeReport.beforeAfterComparison.releasePASS,false);
 await copyFile(await json.path(),dir+'/PR59-IMMUTABLE-BEFORE-AFTER-REPORT.json');
 await page.screenshot({
  path:dir+'/PR59-SELECTABLE-XYZ-AND-BEFORE-AFTER-LAB.png',fullPage:true
 });
 // Re-upload identical SHA: fail closed, never count identical source as repair.
 await page.locator('#after-source-file').setInputFiles({
  name:'STILL_SAME_BROKEN.obj',mimeType:'text/plain',buffer:brokenOBJ
 });
 await page.locator('#compare-source').click();
 await page.waitForFunction(()=>{
  const b=document.getElementById('compare-source'),
   label=document.getElementById('repair-compare-stats')?.textContent||'';
  return !b?.disabled&&label.startsWith('BLOCK');
 },null,{timeout:30000});
 assert.match(await page.locator('#repair-compare-stats').textContent(),/SHA 完全相同/);

 assert.deepEqual(errors,[]);
 await writeFile(dir+'/proof.json',JSON.stringify({
  schema:'AIG_REAL3D_BROWN_LOCAL_OBJ_SOURCE_REPORT_BROWSER_GATE_V1',
  fixture:'NONHUMAN SYNTHETIC TEST; NOT AUTHENTIC BODY',
  localRawOBJ_SHA256:hash,sourceOBJ:buf.length,
  oneSourceSevenTrueGPUFrames:true,
  realFourViews:true,
  alphaReferenceOverlayFourViewCompared:true,
  twelveBandActualPixelWidthProfilesFourView:true,
  meshAudited21SourceLandmarksProjectedOverTrueGpuFourViews:true,
  nativeFiveAreaTopologyChecksSourceTrianglesTrue:true,
  brokenObjSourceHasRealRemovedTriangleAndFourVerifiedGPUEdgeOverlays:true,
  badMeshAllowedReadOnlyButNeverReleasePass:true,
  clickSourceTrueDefectEdgeDisplaysXYZ:true,
  twoIndependentOBJFilesImmutableRepairDiffAndFourTrueGPUPairs:true,
  identicalSourceHashRejected:true,
  syntheticEllipsoid84cmFrontWidthExplicitlyFlaggedAsNonhuman:true,
  oneContinuousSolidLower3DSectionDetectedFromActualSourceTriangles:true,
  topologyRepairDidNotChangeFatFrontWidth:true,
  referencePictureWasSyntheticNotHuman:true,
  automaticHumanAppearanceApproval:false,
  noSyntheticHumanReconstruction:true,
  naturalHumanVisualPASS:false,releasePASS:false,renderDeployed:false
 },null,2));
 console.log('REAL3D_LOCAL_OBJ_BROWN_GPU_SOURCE_REPORT_PASS_NONHUMAN');
}catch(e){
 console.error('REAL3D_OBJ_SOURCE_REVIEW_BLOCK',e.stack||String(e));
 process.exitCode=1;
 await page.screenshot({path:dir+'/FAILED.png',fullPage:true}).catch(()=>{});
}finally{await browser.close();}
