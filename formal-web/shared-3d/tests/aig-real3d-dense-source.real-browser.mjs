/* True local >110k OBJ + native 1080 GPU PNG, not a human fixture. */
import {chromium} from 'playwright';
import {mkdir,readFile,copyFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const dir='artifacts/aig-real3d-dense-original-source';
const makeSource=()=>{
 const rings=315,segments=360,rows=[];
 for(let j=0;j<rings;j++){
  const t=j/(rings-1),r=.14+.052*Math.sin(Math.PI*t);
  for(let k=0;k<segments;k++){
   const a=2*Math.PI*k/segments;
   rows.push('v '+(r*Math.cos(a)).toFixed(7)+' '+t.toFixed(7)+' '+
    (r*.75*Math.sin(a)).toFixed(7));
  }
 }
 for(let j=0;j<rings-1;j++)for(let k=0;k<segments;k++){
  const a=j*segments+k+1,b=j*segments+(k+1)%segments+1,
   c=(j+1)*segments+k+1,d=(j+1)*segments+(k+1)%segments+1;
  rows.push('f '+a+' '+b+' '+d,'f '+a+' '+d+' '+c);
 }
 return {bytes:Buffer.from(rows.join('\n')),
  vertices:rings*segments,triangles:(rings-1)*segments*2};
};
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 '--enable-webgl','--use-gl=angle','--use-angle=swiftshader',
 '--no-sandbox','--disable-dev-shm-usage'
]});
const page=await browser.newPage({viewport:{width:1200,height:900},acceptDownloads:true});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:8772/shared-3d/aig-real3d-human-brown-render-lab.html',
  {waitUntil:'domcontentloaded',timeout:30000});
 const {bytes,vertices,triangles}=makeSource();
 const inputSha=createHash('sha256').update(bytes).digest('hex');
 await page.locator('#model-file').setInputFiles({
  name:'HIGH_DENSITY_NONHUMAN_RAW_GEOMETRY.obj',
  mimeType:'text/plain',buffer:bytes
 });
 await page.locator('#body-height').fill('1680');
 await page.locator('#source-origin').fill('QA NONHUMAN procedural cylinder; not authentic 3D human');
 await page.locator('#capture-method').selectOption('MANUAL_MODEL');
 await page.locator('#dense-source-run').click();
 await page.waitForFunction(()=>{
  const btn=document.getElementById('dense-source-run'),
   message=document.getElementById('dense-source-status')?.textContent||'';
  return !btn?.disabled&&(message.startsWith('高密度來源')||message.startsWith('BLOCK'));
 },null,{timeout:210000});
 const message=await page.locator('#dense-source-status').textContent();
 assert.match(message,/高密度來源原生 GPU PASS/,message);
 const packet=JSON.parse(await page.locator('#dense-source-evidence').textContent());
 assert.equal(packet.sourceSha256,inputSha);
 assert.equal(packet.sourceVertexCount,vertices);
 assert.equal(packet.originalTriangleCount,triangles);
 assert.equal(packet.gpuRenderedTriangles,triangles);
 assert.ok(packet.gpuChunkCount>=3);
 assert.equal(packet.noMeshDecimation,true);
 assert.equal(packet.completeFourViewReferenceSet,false);
 assert.equal(packet.missingAngles.length,4);
 assert.equal(packet.sourceHumanScanVerified,false);
 assert.equal(packet.naturalAppearancePASS,false);
 assert.equal(packet.releasePASS,false);
 assert.equal(packet.realGPUFront.trueHardwarePixelsReadBack,true);
 assert.equal(await page.locator('#dense-source-download').isHidden(),false);
 const pngDownload=page.waitForEvent('download',{timeout:30000});
 await page.locator('#dense-source-download').click();
 const png=await pngDownload,file=await readFile(await png.path());
 assert.equal(file.readUInt32BE(0),0x89504e47);
 assert.equal(file.readUInt32BE(16),1080);
 assert.equal(file.readUInt32BE(20),1920);
 assert.equal(createHash('sha256').update(file).digest('hex'),packet.realGPUFront.sha256);
 await copyFile(await png.path(),dir+'/NONHUMAN-DENSE-113400-ORIGINAL-GPU.png');
 const recordDownload=page.waitForEvent('download',{timeout:15000});
 await page.locator('#dense-evidence-download').click();
 const j=await recordDownload,record=JSON.parse(await readFile(await j.path()));
 assert.equal(record.sourceSha256,inputSha);
 assert.equal(record.releasePASS,false);
 await copyFile(await j.path(),dir+'/DENSE-SOURCE-ORIGINAL-SHA-PACKET.json');
 // New high-density ORIGINAL source-index anatomy and FOUR actual GPU angles.
 assert.equal(await page.locator('#dense-anatomy-run').isDisabled(),false);
 await page.locator('#dense-anatomy-run').click();
 await page.waitForFunction(()=>{
  const button=document.getElementById('dense-anatomy-run');
  const message=document.getElementById('dense-anatomy-status')?.textContent||'';
  return !button?.disabled&&(message.includes('GPU 已分析')||message.startsWith('BLOCK'));
 },null,{timeout:240000});
 const anatomyStatus=await page.locator('#dense-anatomy-status').textContent();
 assert.match(anatomyStatus,/GPU 已分析/,anatomyStatus);
 const anatomy=JSON.parse(await page.locator('#dense-anatomy-evidence').textContent());
 assert.equal(anatomy.sourceSha256,inputSha);
 assert.equal(anatomy.anatomy.originalVertices,vertices);
 assert.equal(anatomy.anatomy.originalTriangles,triangles);
 assert.equal(anatomy.anatomy.requiredBase21LandmarksPresent,false);
 assert.equal(anatomy.anatomy.missingRequiredMarkers.length,27);
 assert.equal(anatomy.anatomy.regionsRequiringReview,5);
 assert.equal(anatomy.anatomy.gpuChunksExcludedFromTopologyAnalysis,true);
 assert.equal(anatomy.digitBranching.originalVertexCount,vertices);
 assert.equal(anatomy.digitBranching.originalTriangleCount,triangles);
 assert.equal(anatomy.digitBranching.gpuChunkBoundariesExcluded,true);
 assert.equal(anatomy.fingerJunction.originalVertexCount,vertices);
 assert.equal(anatomy.fingerJunction.originalTriangleCount,triangles);
 assert.equal(anatomy.fingerJunction.fingersReported,10);
 assert.equal(anatomy.fingerJunction.requiredAdditionalSourceMarkers,20);
 assert.equal(anatomy.fingerJunction.missingAdditionalSourceMarkers.length,20);
 assert.equal(anatomy.fingerJunction.highDensityGPUChunkBoundariesExcludedFromSurfaceTopology,true);
 assert.equal(anatomy.fingerJunction.animationRigPASS,false);
 assert.equal(anatomy.fingerJunction.naturalFingerAndPalmAnatomyPASS,false);
 assert.equal(anatomy.fingerJunction.releasePASS,false);
 assert.equal(anatomy.digitBranching.handReports.length,2);
 assert.equal(anatomy.digitBranching.bothFiveDistalBranchTechnicalObservations,false);
 assert.equal(anatomy.digitBranching.sourceActuallyContainsFiveHumanFingersProven,false);
 assert.equal(anatomy.digitBranching.naturalAppearancePASS,false);
 assert.equal(anatomy.digitBranching.releasePASS,false);
 assert.equal(anatomy.fourView.fourRealGPUViewsCaptured,true);
 assert.equal(anatomy.fourView.fourReferenceContoursCompared,false);
 assert.equal(anatomy.fourView.views.length,4);
 assert.equal(anatomy.fourView.missingValidatedReferenceComparisons.length,4);
 assert.equal(anatomy.naturalHumanAppearancePASS,false);
 assert.equal(anatomy.releasePASS,false);
 assert.equal(await page.locator('#dense-anatomy-gallery img').count(),4);
 const anatomyDownload=page.waitForEvent('download',{timeout:15000});
 await page.locator('#dense-anatomy-download').click();
 const d=await anatomyDownload,archive=JSON.parse(await readFile(await d.path()));
 assert.equal(archive.sourceSha256,inputSha);
 assert.equal(archive.releasePASS,false);
 await copyFile(await d.path(),dir+'/DENSE-ORIGINAL-ANATOMY-FOURVIEW-BLOCK.json');
 // Genuine posed high-density source: explicit local labels + source-SHA weights.
 assert.equal(await page.locator('#weighted-motion-run').isDisabled(),false);
 await page.locator('#weighted-motion-run').click();
 assert.match(await page.locator('#weighted-motion-status').textContent(),/BLOCK/);
 assert.equal(await page.locator('#weighted-motion-download').isDisabled(),true);
 const sourceMarkers={};
 for(const key of ['headTop','chin','noseTip','neckBase','leftShoulder',
  'rightShoulder','leftElbow','rightElbow','leftWrist','rightWrist','pelvis',
  'leftKnee','rightKnee','leftHeel','rightHeel','leftToe','rightToe'])
  sourceMarkers[key]=[.14,0,0];
 for(const side of ['left','right'])for(const finger of [
  'Thumb','Index','Middle','Ring','Pinky']){
  sourceMarkers[side+finger+'Base']=[.14,0,0];
  sourceMarkers[side+finger+'Middle']=[.14,0,0];
  sourceMarkers[side+finger+'Tip']=[.14,0,0];
 }
 await page.locator('#landmark-file').setInputFiles({
  name:'NONHUMAN_47_SOURCE_MARKERS.json',mimeType:'application/json',
  buffer:Buffer.from(JSON.stringify(sourceMarkers))
 });
 const weights={
  schema:'AIG_REAL3D_EXPLICIT_VERTEX_WEIGHTS_V1',
  sourceSha256:inputSha,sourceVertexCount:vertices,
  side:'left',finger:'Index',joint:'Middle',
  pivotSourceXYZ:[.14,0,0],axisWorld:[0,1,0],
  vertexWeights:Array.from({length:12},(_,i)=>[i+1,.35])
 };
 await page.locator('#weighted-motion-weights').setInputFiles({
  name:'NONHUMAN_EXPLICIT_WEIGHTS.json',mimeType:'application/json',
  buffer:Buffer.from(JSON.stringify(weights))
 });
 await page.locator('#weighted-motion-run').click();
 await page.waitForFunction(()=>{
  const button=document.getElementById('weighted-motion-run'),
   msg=document.getElementById('weighted-motion-status')?.textContent||'';
  return !button?.disabled&&(msg.includes('原始網格權重姿勢已計算')||msg.startsWith('BLOCK'));
 },null,{timeout:240000});
 const motionStatus=await page.locator('#weighted-motion-status').textContent();
 assert.match(motionStatus,/原始網格權重姿勢已計算/,motionStatus);
 const motion=JSON.parse(await page.locator('#weighted-motion-evidence').textContent());
 assert.equal(motion.sourceSha256,inputSha);
 assert.equal(motion.sourceTrianglesUnchanged,triangles);
 assert.equal(motion.baseline.movedOriginalVertices,0);
 assert.ok(motion.posed.movedOriginalVertices>=3);
 assert.equal(motion.posed.sourceTrianglesAdded,0);
 assert.equal(motion.posed.sourceTrianglesRemoved,0);
 assert.equal(motion.gpuEvidence.originalTriangles,triangles);
 assert.equal(motion.gpuEvidence.nativeGpuReadback,true);
 assert.equal(motion.animationRigPASS,false);
 assert.equal(motion.releasePASS,false);
 const motionPNGDownload=page.waitForEvent('download',{timeout:15000});
 await page.locator('#weighted-motion-png-download').click();
 const motionPNG=await motionPNGDownload;
 const motionBytes=await readFile(await motionPNG.path());
 assert.equal(motionBytes.readUInt32BE(16),1080);
 assert.equal(motionBytes.readUInt32BE(20),1920);
 assert.equal(createHash('sha256').update(motionBytes).digest('hex'),
  motion.gpuEvidence.sha256);
 await copyFile(await motionPNG.path(),dir+'/NONHUMAN-DENSE-WEIGHTED-POSE-GPU.png');
 const motionJsonDownload=page.waitForEvent('download',{timeout:15000});
 await page.locator('#weighted-motion-download').click();
 const motionFile=await motionJsonDownload;
 const motionJSON=JSON.parse(await readFile(await motionFile.path()));
 assert.equal(motionJSON.sourceSha256,inputSha);
 assert.equal(motionJSON.releasePASS,false);
 await copyFile(await motionFile.path(),dir+'/NONHUMAN-DENSE-WEIGHTED-POSE-EVIDENCE.json');
 // Two independent source-authenticated finger channels, actual 3D XYZ frames.
 const secondWeights={
  schema:'AIG_REAL3D_EXPLICIT_VERTEX_WEIGHTS_V1',
  sourceSha256:inputSha,sourceVertexCount:vertices,
  side:'right',finger:'Index',joint:'Middle',
  pivotSourceXYZ:[.14,0,0],axisWorld:[1,0,0],
  vertexWeights:Array.from({length:12},(_,i)=>[i+14,.4])
 };
 await page.locator('#dual-motion-second-weights').setInputFiles({
  name:'NONHUMAN_SECOND_SOURCE_WEIGHTS.json',
  mimeType:'application/json',buffer:Buffer.from(JSON.stringify(secondWeights))
 });
 assert.equal(await page.locator('#dual-motion-run').isDisabled(),false);
 await page.locator('#dual-motion-run').click();
 await page.waitForFunction(()=>{
  const btn=document.getElementById('dual-motion-run'),
   msg=document.getElementById('dual-motion-status')?.textContent||'';
  return !btn?.disabled&&(msg.includes('真雙通道三維樣本 3 幀已完成')||
   msg.startsWith('BLOCK'));
 },null,{timeout:240000});
 const dualStatus=await page.locator('#dual-motion-status').textContent();
 assert.match(dualStatus,/真雙通道三維樣本 3 幀已完成/,dualStatus);
 const dual=JSON.parse(await page.locator('#dual-motion-evidence').textContent());
 assert.equal(dual.sourceSha256,inputSha);
 assert.equal(dual.sampledFrameCount,3);
 assert.equal(dual.frames.length,3);
 assert.deepEqual(dual.frames[0].angles,[0,0]);
 assert.equal(dual.frames[0].deformation.changedOriginalTriangles,0);
 assert.ok(dual.frames[1].deformation.changedOriginalTriangles>0);
 assert.ok(dual.frames[2].deformation.changedOriginalTriangles>0);
 assert.notDeepEqual(dual.frames[1].angles,dual.frames[2].angles);
 assert.equal(dual.frames[2].deformation.sourceTriangleCountUnchanged,triangles);
 assert.equal(dual.gpuFrames.length,3);
 assert.ok(dual.gpuFrames.every(f=>f.originalSourceTriangles===triangles));
 assert.equal(dual.diagnostics.animationRigPASS,false);
 assert.equal(dual.diagnostics.releasePASS,false);
 assert.equal(dual.originalOBJUnmodified,true);
 assert.equal(dual.releasePASS,false);
 assert.equal(await page.locator('#dual-motion-gallery img').count(),3);
 const dualDownload=page.waitForEvent('download',{timeout:15000});
 await page.locator('#dual-motion-download').click();
 const dualFile=await dualDownload;
 const dualJSON=JSON.parse(await readFile(await dualFile.path()));
 assert.equal(dualJSON.sourceSha256,inputSha);
 assert.equal(dualJSON.releasePASS,false);
 await copyFile(await dualFile.path(),dir+'/NONHUMAN-DENSE-DUAL-TIMELINE-SOURCE-CONTACT.json');
 const dualPNGDownload=page.waitForEvent('download',{timeout:15000});
 await page.locator('#dual-motion-gallery figure').nth(2).locator('a').click();
 const dualPNG=await dualPNGDownload,dualPNGBytes=await readFile(await dualPNG.path());
 assert.equal(dualPNGBytes.readUInt32BE(16),1080);
 assert.equal(dualPNGBytes.readUInt32BE(20),1920);
 assert.equal(createHash('sha256').update(dualPNGBytes).digest('hex'),
  dual.gpuFrames[2].sha256);
 await copyFile(await dualPNG.path(),dir+'/NONHUMAN-DENSE-DUAL-TIMELINE-FINAL-GPU.png');
 assert.deepEqual(errors,[]);
 await page.screenshot({path:dir+'/DENSE-SOURCE-ORIGINAL-GPU-INTAKE.png',fullPage:true});
 await writeFile(dir+'/proof.json',JSON.stringify({
  source_SHA256:inputSha,originalVertices:vertices,
  originalTriangles:triangles,renderedTriangles:packet.gpuRenderedTriangles,
  chunkCount:packet.gpuChunkCount,
  genuineGpuPNG_SHA256:packet.realGPUFront.sha256,
  sourceIsExplicitlyNONHUMAN:true,humanPASS:false,
  denseNativeGPU:true
 },null,2));
 console.log('REAL3D_DUAL_NATIVE_TIMELINE_CONTACT_THREE_GPU_FRAMES_TECHNICAL_PASS_NONHUMAN');
}catch(e){
 console.error('REAL3D_DENSE_NATIVE_GPU_BLOCK',e.stack||String(e));
 process.exitCode=1;
 await page.screenshot({path:dir+'/FAIL.png',fullPage:true}).catch(()=>{});
}finally{await browser.close();}
