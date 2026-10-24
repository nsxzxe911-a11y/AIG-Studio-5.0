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
 assert.equal(await page.locator('#status').getAttribute('data-ready'),'true',status);
 const proof=JSON.parse(await page.locator('#evidence').textContent());
 assert.equal(proof.sourceReview.model.format,'OBJ');
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
