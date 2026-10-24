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
 // Parent-child joint: the distal original-source pivot inherits proximal motion.
 // The existing industrial NONHUMAN cylinder is NOT a human hand.
 assert.equal(await page.locator('#hierarchical-fk-run').isDisabled(),false);
 await page.locator('#hierarchical-fk-run').click();
 assert.match(await page.locator('#hierarchical-fk-status').textContent(),/BLOCK/);
 assert.equal(await page.locator('#hierarchical-fk-download').isDisabled(),true);
 const jointT=64/314, jointR=.14+.052*Math.sin(Math.PI*jointT);
 sourceMarkers.leftIndexBase=[.14,0,0];
 sourceMarkers.leftIndexMiddle=[jointR,jointT,0];
 await page.locator('#landmark-file').setInputFiles({
  name:'NONHUMAN_HIERARCHICAL_3D_SOURCE_MARKERS.json',
  mimeType:'application/json',buffer:Buffer.from(JSON.stringify(sourceMarkers))
 });
 const hierarchy={
  schema:'AIG_REAL3D_EXPLICIT_FINGER_HIERARCHY_WEIGHTS_V1',
  sourceSha256:inputSha,sourceVertexCount:vertices,side:'left',finger:'Index',
  parent:{joint:'Base',pivotSourceXYZ:[.14,0,0],axisWorld:[0,0,1],
   vertexWeights:Array.from({length:8},(_,i)=>[92*360+i,1])},
  child:{joint:'Middle',pivotSourceXYZ:[jointR,jointT,0],axisWorld:[0,1,0],
   vertexWeights:Array.from({length:6},(_,i)=>[92*360+i,.8])}
 };
 await page.locator('#hierarchical-fk-weights').setInputFiles({
  name:'NONHUMAN_EXPLICIT_PARENT_CHILD_WEIGHTS.json',
  mimeType:'application/json',buffer:Buffer.from(JSON.stringify(hierarchy))
 });
 await page.locator('#hierarchical-fk-run').click();
 await page.waitForFunction(()=>{
  const button=document.getElementById('hierarchical-fk-run'),
   msg=document.getElementById('hierarchical-fk-status')?.textContent||'';
  return !button?.disabled&&(msg.startsWith('真父子關節 FK 三幀 GPU')||
   msg.startsWith('BLOCK'));
 },null,{timeout:240000});
 const fkStatus=await page.locator('#hierarchical-fk-status').textContent();
 assert.match(fkStatus,/真父子關節 FK 三幀 GPU/,fkStatus);
 const fk=JSON.parse(await page.locator('#hierarchical-fk-evidence').textContent());
 assert.equal(fk.sourceSha256,inputSha);
 assert.equal(fk.sourceOriginalTriangles,triangles);
 assert.deepEqual(fk.orderedJointHierarchy,['Base','Middle']);
 assert.ok(fk.checkedSubframeCount>=4);
 assert.equal(fk.checkedSamples[0].movedOriginalVertices,0);
 assert.equal(fk.checkedSamples[0].deformation.originalSourceTriangleCount,triangles);
 assert.ok(fk.checkedSamples.at(-1).movedOriginalVertices>0);
 assert.notDeepEqual(fk.checkedSamples[0].transformedChildPivotWorldMeters,
  fk.checkedSamples.at(-1).transformedChildPivotWorldMeters);
 assert.equal(fk.diagnostics.parentPivotCarriesChildPivot,true);
 assert.equal(fk.diagnostics.sampledFramesDoNotProveContinuousCollisionFreedom,true);
 assert.equal(fk.diagnostics.animationRigPASS,false);
 assert.equal(fk.releasePASS,false);
 assert.equal(await page.locator('#hierarchical-fk-gallery img').count(),3);
 assert.equal(fk.gpuFrames.length,3);
 assert.ok(fk.gpuFrames.every(f=>f.originalTriangleCount===triangles&&
  f.width===1080&&f.height===1920));
 const fkDownload=page.waitForEvent('download',{timeout:15000});
 await page.locator('#hierarchical-fk-download').click();
 const fkJson=await fkDownload,fkParsed=JSON.parse(await readFile(await fkJson.path()));
 assert.equal(fkParsed.sourceSha256,inputSha);
 assert.equal(fkParsed.releasePASS,false);
 await copyFile(await fkJson.path(),dir+'/NONHUMAN-DENSE-FK-SUBFRAME-CONTACT.json');
 const fkPNGDownload=page.waitForEvent('download',{timeout:15000});
 await page.locator('#hierarchical-fk-gallery figure').nth(2).locator('a').click();
 const fkPNG=await fkPNGDownload,fkBytes=await readFile(await fkPNG.path());
 assert.equal(fkBytes.readUInt32BE(16),1080);
 assert.equal(fkBytes.readUInt32BE(20),1920);
 assert.equal(createHash('sha256').update(fkBytes).digest('hex'),
  fk.gpuFrames[2].sha256);
 await copyFile(await fkPNG.path(),dir+'/NONHUMAN-DENSE-FK-FINAL-GPU.png');
 // Source-native triple FK on same explicit NONHUMAN high-density source.
 assert.equal(await page.locator('#three-joint-run').isDisabled(),false);
 await page.locator('#three-joint-run').click();
 assert.match(await page.locator('#three-joint-status').textContent(),/BLOCK/);
 assert.equal(await page.locator('#three-joint-download').isDisabled(),true);
 const distalT=100/314,distalR=.14+.052*Math.sin(Math.PI*distalT);
 const tripleWeights={
  schema:'AIG_REAL3D_EXPLICIT_THREE_JOINT_WEIGHTS_V1',
  sourceSha256:inputSha,sourceVertexCount:vertices,side:'left',finger:'Index',
  joints:[
   {joint:'Base',pivotSourceXYZ:[.14,0,0],axisWorld:[0,0,1],
    vertexWeights:Array.from({length:12},(_,i)=>[140*360+i,1])},
   {joint:'Middle',pivotSourceXYZ:[jointR,jointT,0],axisWorld:[0,1,0],
    vertexWeights:Array.from({length:8},(_,i)=>[140*360+i,.8])},
   {joint:'Distal',pivotSourceXYZ:[distalR,distalT,0],axisWorld:[1,0,0],
    vertexWeights:Array.from({length:5},(_,i)=>[140*360+i,.7])}
  ]
 };
 await page.locator('#three-joint-weights').setInputFiles({
  name:'NONHUMAN_ORIGINAL_THREE_JOINT_WEIGHTS.json',
  mimeType:'application/json',buffer:Buffer.from(JSON.stringify(tripleWeights))
 });
 await page.locator('#three-joint-run').click();
 await page.waitForFunction(()=>{
  const btn=document.getElementById('three-joint-run'),
   msg=document.getElementById('three-joint-status')?.textContent||'';
  return !btn?.disabled&&(msg.startsWith('真三關節')||msg.startsWith('BLOCK'));
 },null,{timeout:240000});
 const tripleStatus=await page.locator('#three-joint-status').textContent();
 assert.match(tripleStatus,/真三關節/,tripleStatus);
 const triple=JSON.parse(await page.locator('#three-joint-evidence').textContent());
 assert.equal(triple.sourceSha256,inputSha);
 assert.equal(triple.originalSourceVertices,vertices);
 assert.equal(triple.originalSourceTriangles,triangles);
 assert.deepEqual(triple.jointNames,['Base','Middle','Distal']);
 assert.ok(triple.checkedFrameCount>=5);
 assert.ok(triple.maxAngularStepDeg<=6);
 assert.equal(triple.frames[0].movedOriginalVertices,0);
 assert.equal(triple.frames[0].deformation.originalTriangleCountUnchanged,triangles);
 assert.ok(triple.frames.at(-1).movedOriginalVertices>=3);
 assert.notDeepEqual(triple.frames[0].worldJointPivots[2],
  triple.frames.at(-1).worldJointPivots[2]);
 assert.equal(triple.diagnostics.trueThreeJointParentChildInheritance,true);
 assert.equal(triple.diagnostics.continuousCollisionFreePASS,false);
 assert.equal(triple.diagnostics.naturalSkinDeformationPASS,false);
 assert.equal(triple.releasePASS,false);
 assert.equal(triple.gpuFrames[0].gpuUploadMethod,'INITIAL_GPU_BUFFER_UPLOAD');
 assert.ok(triple.gpuFrames.slice(1).every(f=>
  f.gpuUploadMethod==='GPU_BUFFER_SUBDATA_REUSE'));
 assert.ok(triple.gpuFrames.slice(1).every(f=>
  f.gpuDelta?.reusedOriginalIndexGPUBuffers===true));
 assert.equal(triple.gpuNativeSourceBufferDeltaReusedOnLaterFrames,true);
 assert.equal(triple.incrementalNativeSourceNormalsVerified,true);
 assert.equal(triple.nonDisplayFullXYZScratchBuffersAllocated,2);
 assert.equal(await page.locator('#three-joint-stress-run').isDisabled(),false);
 assert.equal(await page.locator('#three-joint-pool-run').isDisabled(),false);
 assert.equal(await page.locator('#three-joint-vpu-run').isDisabled(),false);
 assert.equal(await page.locator('#three-joint-v82-run').isDisabled(),false);
 assert.equal(triple.adaptiveRealSourceGPUFrameBudget.schema,
  'AIG_REAL3D_SOURCE_POSE_ADAPTIVE_RAF_BUDGET_V1');
 assert.equal(triple.adaptiveRealSourceGPUFrameBudget.requestedMode,'AUTO');
 assert.equal(triple.adaptiveRealSourceGPUFrameBudget.requestedRafCallbacks,36);
 assert.ok(triple.adaptiveRealSourceGPUFrameBudget.actualSourceIndexedDraws>=2);
 assert.ok(triple.adaptiveRealSourceGPUFrameBudget.gpuBufferSubDataCalls>0);
 assert.equal(triple.adaptiveRealSourceGPUFrameBudget.gpuOriginalIndexReusedForEveryDelta,true);
 assert.equal(triple.adaptiveRealSourceGPUFrameBudget.actualDeviceTemperatureCelsius,null);
 assert.equal(triple.adaptiveRealSourceGPUFrameBudget.thermalProtectionCertified,false);
 assert.equal(triple.adaptiveRealSourceGPUFrameBudget.fullAnimation60_90_120FPSGatePASS,false);
 assert.equal(triple.adaptiveRealSourceGPUFrameBudget.sourceOriginalOBJUnmodified,true);

 assert.ok(triple.sparseSourceTopology.offscreenScratchBuffersActuallyReused>=1);
 assert.ok(triple.gpuFrames.every(f=>
  f.sparseNativeGlobalNormals.sourceTrianglesRecomputed>0&&
  f.sparseNativeGlobalNormals.skippedSourceTriangleRecalculation>0&&
  f.realCPUOriginalNormalsAndSceneBuildMs>=0&&
  f.gpuReadbackAndPNGEncodingWallMs>=0));

 assert.equal(triple.sparseSourceTopology.schema,
  'AIG_REAL3D_SPARSE_FK_SOURCE_TOPOLOGY_CACHE_V1');
 assert.equal(triple.sparseSourceTopology.inputSourceVertexCount,vertices);
 assert.equal(triple.sparseSourceTopology.inputOriginalSourceTriangles,triangles);
 assert.equal(triple.sparseSourceTopology.activeWeightedGlobalVertexCount,12);
 assert.ok(triple.sparseSourceTopology.indexedAffectedOriginalTriangles<triangles*.02);
 assert.ok(triple.sparseSourceTopology.skippedUnweightedGlobalVerticesPerFrame>100000);
 assert.equal(triple.sparseSourceTopology.numberOfFullXYZFramesRetained,3);
 assert.equal(triple.sparseSourceTopology.discardedIntermediateFullXYZFrames,
  triple.checkedFrameCount-3);
 assert.ok(triple.frames.every(f=>
  f.deformation.sourceTrianglesActuallyInspected===
   triple.sparseSourceTopology.indexedAffectedOriginalTriangles));
 assert.equal(await page.locator('#three-joint-gallery img').count(),3);
 assert.ok(triple.gpuFrames.every(x=>x.sourceTriangles===triangles&&
  x.width===1080&&x.height===1920));
 const tripleReportDownload=page.waitForEvent('download',{timeout:15000});
 await page.locator('#three-joint-download').click();
 const tripleReport=await tripleReportDownload;
 const tripleJSON=JSON.parse(await readFile(await tripleReport.path()));
 assert.equal(tripleJSON.sourceSha256,inputSha);
 assert.equal(tripleJSON.releasePASS,false);
 await copyFile(await tripleReport.path(),dir+'/NONHUMAN-DENSE-THREE-JOINT-SWEPT-RISK.json');
 const triplePNGDownload=page.waitForEvent('download',{timeout:15000});
 await page.locator('#three-joint-gallery figure').nth(2).locator('a').click();
 const triplePNG=await triplePNGDownload,threeBytes=await readFile(await triplePNG.path());
 assert.equal(threeBytes.readUInt32BE(16),1080);
 assert.equal(threeBytes.readUInt32BE(20),1920);
 assert.equal(createHash('sha256').update(threeBytes).digest('hex'),
  triple.gpuFrames[2].sha256);
 await copyFile(await triplePNG.path(),dir+'/NONHUMAN-DENSE-THREE-JOINT-FINAL-GPU.png');
 // V82 one genuine Worker pool persists over THREE distinct original source
 // deform positions; each batch still does strict full-geometry serial parity.
 const persistentVPU=await page.evaluate(async()=>{
  const V81=await import('./aig-real3d-virtual-processor.mjs');
  const V82=await import('./aig-real3d-persistent-vpu.mjs');
  const n=12288,original=new Float32Array(n*9),
   indices=new Uint32Array(n*3),triangleOffsets=new Uint32Array(n);
  for(let i=0;i<n;i++){
   const j=i*9,z=i*.001;
   original.set([0,0,z,1,0,z,0,1,z],j);
   indices.set([i*3,i*3+1,i*3+2],i*3);triangleOffsets[i]=i*3;
  }
  const sha='a'.repeat(64),poses=[.015,.03,.055].map(theta=>{
   const copy=new Float32Array(original);
   for(let i=0;i<n;i++)copy[i*9+3]+=(i%5)*theta;
   return copy;
  });
  const session=V82.createAIGReal3DPersistentVPU({
   physicalWorkers:4,virtualLanes:16,maxBatches:3
  });
  let first,close,result,seen;
  const warmStart=performance.now();
  try{
   result=[];
   for(const posed of poses)result.push(await session.runBatch({
    original,posed,indices,triangleOffsets,sourceSha256:sha
   }));
   first=session.stats();
  }finally{close=session.close();}
  const reusedTotalMs=performance.now()-warmStart;
  // V81 comparison is informational; order/JIT/GC affect timings.
  // Both paths genuinely process the same three different source poses.
  const coldStart=performance.now(),cold=[];
  for(const posed of poses)cold.push(await V81.runAIGReal3DVirtualProcessor({
   original,posed,indices,triangleOffsets,
   virtualLanes:16,physicalWorkers:4,forceParallel:true
  }));
  const recreatedTotalMs=performance.now()-coldStart;
  const evidence=V82.verifyAIGReal3DStageEvidence({
   sourceSha256:sha,
   geometry:{sourceSha256:sha,sourceTriangleCount:n},
   pose:{sourceSha256:sha,sourceTriangleCount:n},
   contact:{sourceSha256:sha,sampledOriginalTriangleAudit:true},
   gpu:{sourceSha256:sha,frameSha256:[
    'b'.repeat(64),'c'.repeat(64),'d'.repeat(64)]}
  });
  return {session:first,close,batches:result,cold,
   stageEvidence:evidence,reusedTotalMs,recreatedTotalMs,
   resultEquality:result.every((x,i)=>
    JSON.stringify(x.sourceIndexedGeometryResult)===
    JSON.stringify(cold[i].result)),
   coldRealWorkerCreations:cold.reduce((x,r)=>x+r.actualRealWebWorkers,0)
  };
 });
 assert.equal(persistentVPU.session.realWebWorkersCreated,4);
 assert.equal(persistentVPU.session.batchesCompleted,3);
 assert.equal(persistentVPU.session.virtualTasksCompleted,48);
 assert.equal(persistentVPU.session.actualWorkerObjectsCreated,4);
 assert.equal(persistentVPU.session.taskDispatches,48);
 assert.equal(persistentVPU.session.maxConcurrentRealWorkerTasks,4);
 assert.equal(persistentVPU.close.liveWorkerObjects,0);
 assert.equal(persistentVPU.close.isClosed,true);
 assert.equal(persistentVPU.coldRealWorkerCreations,12);
 assert.equal(persistentVPU.resultEquality,true);
 assert.ok(persistentVPU.batches.every(x=>
  x.genuineWebWorkerCount===4&&
  x.virtualTaskCount===16&&x.serialEquivalent===true&&
  x.inspectedOriginalTriangles===12288));
 assert.equal(persistentVPU.stageEvidence.stages.length,4);
 assert.equal(persistentVPU.stageEvidence.sampledCollisionSafetyGuaranteed,false);
 assert.equal(persistentVPU.session.physicalCPUCoresCreated,0);
 assert.ok(persistentVPU.reusedTotalMs>=0);
 assert.ok(persistentVPU.recreatedTotalMs>=0);
 await writeFile(dir+'/NONHUMAN-V82-3-BATCHES-4-PERSISTENT-WORKERS-48-VIRTUAL-TASKS.json',
  JSON.stringify(persistentVPU,null,2));
 // V81 genuine virtual triangle tasks: 16 logical lanes time-share four
 // real Dedicated Web Workers; no fake physical cores, no duplicate GPUs.
 const vpu=await page.evaluate(async()=>{
  const core=await import('./aig-real3d-virtual-processor.mjs');
  const n=12288,original=new Float32Array(n*9),
   posed=new Float32Array(n*9),indices=new Uint32Array(n*3),
   offsets=new Uint32Array(n);
  for(let i=0;i<n;i++){
   const k=i*9,z=i*.001;
   original.set([0,0,z,1,0,z,0,1,z],k);
   posed.set([0,0,z,1+(i%5)*.02,0,z,0,1,z],k);
   indices.set([i*3,i*3+1,i*3+2],i*3);
   offsets[i]=i*3;
  }
  const p4=await core.runAIGReal3DVirtualProcessor({
   original,posed,indices,triangleOffsets:offsets,
   virtualLanes:16,physicalWorkers:4,forceParallel:true
  });
  const p2=await core.runAIGReal3DVirtualProcessor({
   original,posed,indices,triangleOffsets:offsets,
   virtualLanes:8,physicalWorkers:2,forceParallel:true
  });
  const small=await core.runAIGReal3DVirtualProcessor({
   original,posed,indices,triangleOffsets:new Uint32Array([0,3,6]),
   virtualLanes:16,physicalWorkers:4
  });
  return {p4,p2,small};
 });
 assert.equal(vpu.p4.schema,'AIG_REAL3D_VIRTUAL_TRIANGLE_TASK_WORK_STEALING_V1');
 assert.equal(vpu.p4.actualVirtualTaskLanesExecuted,16);
 assert.equal(vpu.p4.actualRealWebWorkers,4);
 assert.equal(vpu.p4.peakSimultaneouslyActiveWorkerTasks,4);
 assert.equal(vpu.p4.workerTaskCounts.reduce((a,b)=>a+b,0),16);
 assert.equal(vpu.p4.result.inspectedOriginalTriangles,12288);
 assert.equal(vpu.p4.serialResultMatchesVPU,true);
 assert.equal(vpu.p4.virtualLanesAreNotPhysicalCPUCoreCount,true);
 assert.equal(vpu.p4.actualPhysicalCPUCoreCountVerified,false);
 assert.equal(vpu.p4.globalTwoTimesFasterCertified,false);
 assert.equal(vpu.p4.originalOBJModified,false);
 assert.equal(vpu.p4.releasePASS,false);
 assert.equal(vpu.p2.actualVirtualTaskLanesExecuted,8);
 assert.equal(vpu.p2.actualRealWebWorkers,2);
 assert.equal(vpu.p2.workerTaskCounts.reduce((a,b)=>a+b,0),8);
 assert.deepEqual(vpu.p2.result,vpu.p4.result);
 assert.equal(vpu.small.actualRealWebWorkers,0);
 assert.equal(vpu.small.selectedMode,'SERIAL_BECAUSE_SMALL_UNSUPPORTED_OR_BUDGETED');
 await writeFile(dir+'/NONHUMAN-V81-REAL-2-4-WORKERS-8-16-VIRTUAL-TASKS.json',
  JSON.stringify(vpu,null,2));
 // True Web Workers: four distinct tasks, compact transferred source triangles,
 // serial parity. Number of OS CPU cores and 2x speed are NOT assumed.
 const quad=await page.evaluate(async()=>{
  const pool=await import('./aig-real3d-quad-strain-pool.mjs');
  const count=8192;
  const original=new Float32Array(count*9),posed=new Float32Array(count*9),
   idx=new Uint32Array(count*3),offsets=new Uint32Array(count);
  for(let i=0;i<count;i++){
   const base=i*9;
   original.set([0,0,i*.003,1,0,i*.003,0,1,i*.003],base);
   posed.set([0,0,i*.003,1.05,0,i*.003,0,1,i*.003],base);
   idx[i*3]=i*3;idx[i*3+1]=i*3+1;idx[i*3+2]=i*3+2;
   offsets[i]=i*3;
  }
  return await pool.runAIGReal3DQuadStrain({
   original,posed,indices:idx,triangleOffsets:offsets,
   requestedWorkers:4,forceFour:true
  });
 });
 assert.equal(quad.actualWorkerLanes,4);
 assert.equal(quad.selectedMode,'FOUR_REAL_WEB_WORKERS');
 assert.equal(quad.parallelEquivalentToSerial,true);
 assert.equal(quad.result.inspectedOriginalTriangles,8192);
 assert.equal(quad.result.changedSourceTriangles,8192);
 assert.ok(quad.result.maxSourceEdgeStretchPercent>0);
 assert.equal(quad.gpuWasNotDuplicated,true);
 assert.equal(quad.twoTimesFasterClaimSupported,false);
 assert.ok(quad.measuredSerialTotalMs>=0);
 assert.ok(quad.measuredFourWorkerMs>=0);
 await writeFile(dir+'/NONHUMAN-FOUR-REAL-WEB-WORKER-TIMING.json',
  JSON.stringify(quad,null,2));
 // True 1/2/4 repeatable workload timings: all 3 modes use actual computation.
 const adaptive=await page.evaluate(async()=>{
  const pool=await import('./aig-real3d-quad-strain-pool.mjs');
  const count=4096,original=new Float32Array(count*9),
   posed=new Float32Array(count*9),indices=new Uint32Array(count*3),
   offsets=new Uint32Array(count);
  for(let i=0;i<count;i++){
   const at=i*9,depth=i*.002;
   original.set([0,0,depth,1,0,depth,0,1,depth],at);
   posed.set([0,0,depth,1.035,0,depth,0,1,depth],at);
   indices[i*3]=i*3;indices[i*3+1]=i*3+1;indices[i*3+2]=i*3+2;
   offsets[i]=i*3;
  }
  return await pool.benchmarkAIGReal3DWorkerModes({
   original,posed,indices,triangleOffsets:offsets,repeats:2
  });
 });
 assert.deepEqual(Object.keys(adaptive.medianTotalMs).sort(),['four','serial','two']);
 assert.equal(adaptive.rawTrialEvidence.length,6);
 assert.ok(adaptive.rawTrialEvidence.some(x=>x.mode==='two'&&x.actualWorkerLanes===2));
 assert.ok(adaptive.rawTrialEvidence.some(x=>x.mode==='four'&&x.actualWorkerLanes===4));
 assert.ok(['serial','two','four'].includes(adaptive.recommendedMode));
 assert.equal(adaptive.includesPackingAndWorkerStartup,true);
 assert.equal(adaptive.globalPerformanceDoubledPASS,false);
 assert.equal(adaptive.releasePASS,false);
 await writeFile(dir+'/NONHUMAN-ADAPTIVE-1-2-4-WORKER-FAIR-BENCHMARK.json',
  JSON.stringify(adaptive,null,2));
 // Actually check WebGL bufferSubData against a clean full GPU buffer upload.
 const deltaProof=await page.evaluate(async()=>{
  const core=await import('./aig-real3d-core.mjs');
  const lib=await import('./aig-real3d-webgl.mjs');
  const delta=await import('./aig-real3d-gpu-delta-source.mjs');
  const canvas=document.createElement('canvas'),freshCanvas=document.createElement('canvas');
  canvas.width=freshCanvas.width=640;canvas.height=freshCanvas.height=480;
  // Real renderer requires >=2000 genuine original indexed triangles.
  // A nonhuman tubular source mesh keeps the unchanged QA acceptance threshold.
  const original=[],moved=[],normals=[],indices=[];
  const rings=50,segments=32;
  for(let row=0;row<rings;row++)for(let col=0;col<segments;col++){
   const angle=col*2*Math.PI/segments,rx=Math.cos(angle),
    rz=Math.sin(angle),y=-1+2*row/(rings-1),x=.65*rx,z=.65*rz;
   original.push(x,y,z);
   moved.push(x+(row>18&&row<27 ? 0.09 : 0),y,z);
   normals.push(rx,0,rz);
  }
  for(let row=0;row<rings-1;row++)for(let col=0;col<segments;col++){
   const a=row*segments+col,b=row*segments+(col+1)%segments,
    c=(row+1)*segments+col,d=(row+1)*segments+(col+1)%segments;
   indices.push(a,b,d,a,d,c);
  }
  const build=(positions)=>{
   const scene=core.createAIG3DScene({
    id:'originalQAPose',consumer:'FastModel',units:'METERS',
    source:'NONHUMAN_SOURCE_TRIANGLE_GPU_QA'
   });
   core.addAIG3DNode(scene,{
    id:'stable_source_node',
    mesh:core.createAIG3DMesh({positions,normals,indices,
     provenance:'NONHUMAN_ORIGINAL_GLOBAL_INDEXED_SOURCE'}),
    kind:'character',source:'NONHUMAN_ORIGINAL_GLOBAL_INDEXED_SOURCE',
    material:{baseColor:[.7,.6,.5,1],roughness:.85,metallic:0,
     doubleSided:true}
   });
   return scene;
  };
  const live=build(original),next=build(moved);
  const one=lib.createAIG3DRenderer(canvas,{
   quality:'balanced',pixelRatio:1,maxTriangles:200000,
   background:[0,0,0,1]
  });
  const two=lib.createAIG3DRenderer(freshCanvas,{
   quality:'balanced',pixelRatio:1,maxTriangles:200000,
   background:[0,0,0,1]
  });
  try{
   if(one.status!=='READY'||two.status!=='READY')
    throw Error('REAL_GPU_CONTEXT_REQUIRED');
   const camera={yaw:0,pitch:.15,distance:4,focus:[0,0,0]};
   one.setCamera(camera);two.setCamera(camera);
   one.setInspectionMode('LIT');two.setInspectionMode('LIT');
   const baseline=await one.captureNativePNG(live,{width:640,height:480});
   const update=delta.applyAIGReal3DSourceMeshDelta({
    renderer:one,liveScene:live,nextScene:next
   });
   const changed=await one.captureNativePNG(live,{width:640,height:480});
   const reference=await two.captureNativePNG(next,{width:640,height:480});
   const normalLib=await import('./aig-real3d-sparse-source-normals.mjs');
   const originalXYZ=new Float32Array(original),
    posedXYZ=new Float32Array(moved),sourceIndices=new Uint32Array(indices);
   const normalCache=normalLib.createAIGReal3DSparseNormalCache({
    original:originalXYZ,indices:sourceIndices
   });
   const normalScratch=new Float64Array(originalXYZ.length);
   const movingIDs=[];
   for(let row=19;row<27;row++)
    for(let col=0;col<segments;col++)movingIDs.push(row*segments+col);
   const incrementalNormals=normalLib.evaluateAIGReal3DSparseNormals({
    cache:normalCache,posed:posedXYZ,changedGlobalVertexIds:movingIDs,
    outputNormals:normalScratch
   });
   const fullNormals=normalLib.calculateAIGReal3DFullSourceNormals({
    positions:posedXYZ,indices:sourceIndices
   });
   let maxNormalDifference=0;
   for(let k=0;k<fullNormals.length;k++)
    maxNormalDifference=Math.max(maxNormalDifference,
     Math.abs(fullNormals[k]-normalScratch[k]));
   const heapBefore=typeof performance.memory?.usedJSHeapSize==='number'?
    performance.memory.usedJSHeapSize:null;
   const completedFrames=[];
   for(let i=0;i<12;i++)completedFrames.push(one.measureCompletedFrame(live));
   const heapAfter=typeof performance.memory?.usedJSHeapSize==='number'?
    performance.memory.usedJSHeapSize:null;

   const persistentLib=await import('./aig-real3d-persistent-gpu-pose-pool.mjs');
   const poolCanvas=document.createElement('canvas');
   poolCanvas.width=640;poolCanvas.height=480;
   const poolRenderer=lib.createAIG3DRenderer(poolCanvas,{
    quality:'balanced',pixelRatio:1,maxTriangles:200000,
    background:[0,0,0,1]
   });
   if(poolRenderer.status!=='READY')throw Error('PERSISTENT_TRUE_GPU_REQUIRED');
   poolRenderer.setInspectionMode('LIT');
   const persistentPool=await persistentLib.inspectAIGReal3DPersistentGPUPosePool({
    renderer:poolRenderer,poseScenes:[build(original),build(moved),build(original)],
    segments:3,rafCallbacksPerSegment:72,mode:'AUTO',
    maxOwnedGPUBuffers:12,maxFullGPUUploadBytes:100000000
   });
   const stressLib=await import('./aig-real3d-gpu-stress-cycles.mjs');
   const multiCycleStress=await stressLib.stressAIGReal3DGPUResourceCycles({
    cycles:3,rafCallbacksPerCycle:36,mode:'AUTO',
    createCycle:()=>{
     const c=document.createElement('canvas');
     c.width=640;c.height=480;
     const renderer=lib.createAIG3DRenderer(c,{
      quality:'balanced',pixelRatio:1,maxTriangles:200000,
      background:[0,0,0,1]
     });
     if(renderer.status!=='READY')throw Error('REAL_STRESS_GPU_CONTEXT_REQUIRED');
     renderer.setInspectionMode('LIT');
     return {renderer,poseScenes:[build(original),build(moved),build(original)]};
    }
   });
   return {
    multiCycleStress,persistentPool,
    baselineSha:baseline.sha256,deltaSha:changed.sha256,
    fullRebuildSha:reference.sha256,stats:update,
    exactGPUFrameMatch:changed.sha256===reference.sha256,
    frameActuallyChanged:baseline.sha256!==changed.sha256,
    normalParityMaxAbsoluteDifference:maxNormalDifference,
    originalSourceTrianglesInNormalCache:normalCache.originalTriangleCount,
    sparseNormalTriangleRecomputations:incrementalNormals.affectedSourceTriangles,
    skippedNormalTriangles:incrementalNormals.skippedOriginalTriangleRecalculation,
    gpuCompletedFrameSamples:completedFrames,
    memoryHeapBytesBefore:heapBefore,memoryHeapBytesAfter:heapAfter,
    completedGPUSampleNotInteractiveAnimationFPS:true
   };
  }finally{one.destroy();two.destroy();}
 });
 assert.equal(deltaProof.persistentPool.schema,
  'AIG_REAL3D_V80_PERSISTENT_INDEXED_GPU_POSE_POOL_V1');
 assert.equal(deltaProof.persistentPool.segmentsCompleted,3);
 assert.equal(deltaProof.persistentPool.requestedRafCallbacksTotal,216);
 assert.ok(deltaProof.persistentPool.genuineSourceIndexedGPUDraws>10);
 assert.equal(deltaProof.persistentPool.gpuPoolInitiallyAllocatedBuffers,3);
 assert.equal(deltaProof.persistentPool.fullGPUBufferReallocationsAfterWarmup,0);
 assert.ok(deltaProof.persistentPool.realGPUBufferSubDataUpdates>0);
 assert.ok(deltaProof.persistentPool.segments.every(x=>
  x.realSourceIndexedGPUFrames>=2&&
  x.indexVBOsAllocatedSinceLastSegment===0&&
  x.fullGPUBufferUploadsSinceLastSegment===0&&
  x.actualIncrementalSubDataCalls>0));
 assert.equal(deltaProof.persistentPool.ownedGPUResourceAccountAfterDestroy.activeTrackedOwnedGPUBufferCount,0);
 assert.equal(deltaProof.persistentPool.ownedGPUResourceAccountAfterDestroy.ownedGPUBufferAllocationBalance,0);
 assert.equal(deltaProof.persistentPool.originalPoseReferencesUnmodified,true);
 assert.equal(deltaProof.persistentPool.realGPUDriverVRAMUsageBytes,null);
 assert.equal(deltaProof.persistentPool.actualDeviceTemperatureCelsius,null);
 assert.equal(deltaProof.persistentPool.realAndroidWindowsFPSAndSustainedThermalGatePASS,false);
 await writeFile(dir+'/NONHUMAN-V80-216RAF-PERSISTENT-WEBGL-ORIGINAL-GPU-POOL.json',
  JSON.stringify(deltaProof.persistentPool,null,2));
 assert.equal(deltaProof.multiCycleStress.cyclesCompleted,3);
 assert.equal(deltaProof.multiCycleStress.callbacksRequested,108);
 assert.ok(deltaProof.multiCycleStress.actualSourceIndexedDraws>5);
 assert.ok(deltaProof.multiCycleStress.realGPUBufferSubDataUpdates>0);
 assert.equal(deltaProof.multiCycleStress.everyRendererOwnedGPUBufferFullyReleased,true);
 assert.ok(deltaProof.multiCycleStress.records.every(x=>
  x.gpuBufferOwnershipAtPeak.activeTrackedOwnedGPUBufferCount===3&&
  x.gpuBufferOwnershipAfterRelease.activeTrackedOwnedGPUBufferCount===0&&
  x.gpuBufferOwnershipAfterDestroy.ownedGPUBufferAllocationBalance===0&&
  x.gpuBufferOwnershipAfterDestroy.rendererDestroyed===true));
 assert.equal(deltaProof.multiCycleStress.realGPUVRAMUsageBytes,null);
 assert.equal(deltaProof.multiCycleStress.deviceTemperatureCelsius,null);
 assert.equal(deltaProof.multiCycleStress.realDeviceStableFPS60_90_120PASS,false);
 await writeFile(dir+'/NONHUMAN-3-CYCLES-REAL-GPU-BUFFER-LIFECYCLE-STRESS.json',
  JSON.stringify(deltaProof.multiCycleStress,null,2));
 assert.equal(deltaProof.exactGPUFrameMatch,true);
 assert.equal(deltaProof.frameActuallyChanged,true);
 assert.equal(deltaProof.stats.reusedOriginalIndexGPUBuffers,true);
 assert.equal(deltaProof.stats.fullGPUVertexBuffersReallocated,false);
 assert.ok(deltaProof.stats.gpuBufferSubDataCalls>=2);
 assert.ok(deltaProof.normalParityMaxAbsoluteDifference<1e-13);
 assert.equal(deltaProof.originalSourceTrianglesInNormalCache,3136);
 assert.ok(deltaProof.sparseNormalTriangleRecomputations>0);
 assert.ok(deltaProof.skippedNormalTriangles>0);
 assert.equal(deltaProof.gpuCompletedFrameSamples.length,12);
 assert.ok(deltaProof.gpuCompletedFrameSamples.every(x=>
  x.trueGLFinishSynchronization===true&&
  x.completedGPUDrawAndSubmissionWallMs>=0&&
  x.originalIndexedTrianglesRendered===3136&&
  x.interactive60FPSProven===false));
 assert.equal(deltaProof.completedGPUSampleNotInteractiveAnimationFPS,true);

 await writeFile(dir+'/NONHUMAN-WEBGL-DELTA-VS-FULL-REBUILD-SHA.json',
  JSON.stringify(deltaProof,null,2));
 // Real working UI: WGS84 -> double ECEF -> floating local mm -> 6DoF.
 await page.locator('#geo-lat').fill('23.7');
 await page.locator('#geo-lon').fill('120.5');
 await page.locator('#geo-height').fill('17');
 await page.locator('#geo-x-mm').fill('.001');
 await page.locator('#geo-y-mm').fill('0');
 await page.locator('#geo-z-mm').fill('0');
 await page.locator('#geo-yaw').fill('90');
 await page.locator('#geo-pitch').fill('20');
 await page.locator('#geo-roll').fill('0');
 await page.locator('#geo-6dof-run').click();
 assert.match(await page.locator('#geo-6dof-status').textContent(),/6DoF \+ WGS84/);
 const globe=JSON.parse(await page.locator('#geo-6dof-evidence').textContent());
 assert.equal(globe.globalAnchor.schema,'AIG_6DOF_WGS84_ECEF_LOCAL_ENU_MM_V1');
 assert.ok(globe.localRoundtripErrorMm<.002);
 assert.equal(globe.isSixSpatialDimensions,false);
 assert.equal(globe.CNCProductionIntegrationPASS,false);
 assert.equal(globe.actualGlobeTerrainStreaming,false);
 await writeFile(dir+'/NONHUMAN-SIXDOF-WGS84-GLOBE-LOCAL-MM.json',
  JSON.stringify(globe,null,2));
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
 console.log('REAL3D_V82_PERSISTENT_WORKER_POOL_SOURCE_SHA_PARITY_GPU_TECHNICAL_PASS_NONHUMAN');
}catch(e){
 console.error('REAL3D_DENSE_NATIVE_GPU_BLOCK',e.stack||String(e));
 process.exitCode=1;
 await page.screenshot({path:dir+'/FAIL.png',fullPage:true}).catch(()=>{});
}finally{await browser.close();}
