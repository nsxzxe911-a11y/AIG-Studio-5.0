import {sha256AIGReal3DBytes,ingestAIGReal3DNativeGeneratedGLB}
 from './aig-real3d-v99-native-model-ingest.mjs';
import {connectAIGReal3DImportedGeometryToUnified4K}
 from './aig-real3d-v99-ai-inference-adapter.mjs';
import {planAIGReal3DNative4K,captureAIGReal3DNative4K}
 from './aig-real3d-v96-native-4k-pipeline.mjs';
import {createAIG3DRenderer}
 from './aig-real3d-webgl.mjs';
import {remodelAIGReal3DGeometryBackend}
 from './aig-real3d-v101-backend-orchestrator.mjs';
import {auditAIGReal3D4KSourceProjection}
 from './aig-real3d-v96-native-4k-pipeline.mjs';
const $=id=>document.getElementById(id);
let imported=null,renderer=null,bridge=null,ready=false,busy=false,
 fileURL=null,mode='oblique',cameraSpan=2,
 v101=null,showRepaired=false;
const activeScene=()=>showRepaired&&v101?.workingScene?
 v101.workingScene:imported?.scene;
const views={front:[0,.08],side:[Math.PI/2,.08],
 back:[Math.PI,.08],oblique:[.58,.23]};
function status(x){$('status').textContent=x;}
function enable(v){
 ready=v;for(const k of ['front','side','back','oblique','quality','png4k','repair101'])
  $(k).disabled=!v;
 $('original101').disabled=!v||!v101?.workingScene;
 $('remodel101').disabled=!v||!v101?.workingScene;
}
function focusCamera(){
 const positions=activeScene().nodes.flatMap(n=>n.mesh.positions);
 const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
 for(let i=0;i<positions.length;i+=3)for(let j=0;j<3;j++){
  min[j]=Math.min(min[j],positions[i+j]);
  max[j]=Math.max(max[j],positions[i+j]);
 }
 const focus=min.map((v,i)=>(v+max[i])*.5);
 const extent=Math.max(...max.map((v,i)=>v-min[i]));
 cameraSpan=Math.max(.15,extent*1.6);
 const [yaw,pitch]=views[mode];
 renderer.setCamera({projection:'orthographic',yaw,pitch,
  focus,orthoSpan:cameraSpan,distance:Math.max(3,extent*2)});
}
function inspect(){
 if(!ready||!imported||!renderer)throw Error('真 GLB 尚未讀取');
 const camera=renderer.getCamera();
 bridge=connectAIGReal3DImportedGeometryToUnified4K({
  imported,camera
 });
 const active=activeScene();
 const active4K=auditAIGReal3D4KSourceProjection({
  scene:active,sourceSha256:imported.originalImageSha256,
  camera,width:3840,height:2160});
 const plan=planAIGReal3DNative4K({
  gpuLimit:renderer.getGpuLimit(),sourceTriangles:imported.sourceTriangles
 });
 const proof={
  schema:imported.schema,domain:imported.domain,assetId:imported.assetId,
  originalImageSHA:imported.originalImageSha256,
  actualGLBSourceSHA:imported.actualSourceModelSha256,
  sourceFaceCount:imported.sourceTriangles,realMeshes:imported.nodeCount,
  geometrySource:imported.perMesh,
  V101ShowingRepairedWorkingCopy:showRepaired,
  V101ActiveTriangleCount:active.nodes.reduce((s,n)=>s+n.mesh.triangleCount,0),
  V101ActiveSourceDetail4K:active4K,
  V101OriginalSourceNeverChanged:true,
  missingGeometryNeverAutomaticallyFabricated:true,
  sourceSHAAndModelBytesVerified:true,
  cameraBased4KGeometry:bridge.detail,
  nativeFramebufferBudget:plan,
  actuallyExecutedLocalAIModel:false,
  actualNeuralModelWeightsInstalled:false,
  trueHumanIdentityPhotoSimilarityTested:false,
  sourceTexturePBRMaterialCertified:false,
  animationSkinRigAutomaticallyTransferred:false,
  finalCinemaQualityPASS:false,releasePASS:false
 };
 $('proof').textContent=JSON.stringify(proof,null,2);
 return proof;
}
$('import').addEventListener('click',async()=>{
 const source=$('reference').files?.[0],model=$('mesh-file').files?.[0];
 if(!source||!model){status('BLOCK：請同時提供參考圖片和真 GLB 3D 檔');return;}
 if(source.size<32||source.size>12000000||model.size<128||model.size>35000000){
  status('BLOCK：照片 12 MB、GLB 35 MB 來源預算限制');return;
 }
 if(busy)return;
 busy=true;enable(false);
 try{
  const [image,glb]=await Promise.all([
   source.arrayBuffer(),model.arrayBuffer()
  ]);
  const [imageSha,modelSha]=await Promise.all([
   sha256AIGReal3DBytes(image),sha256AIGReal3DBytes(glb)
  ]);
  v101=null;showRepaired=false;
  $('v101-report').textContent='尚未檢查來源結構。';
  imported=await ingestAIGReal3DNativeGeneratedGLB({
   glbBytes:glb,referenceImageBytes:image,
   declaredImageSha256:imageSha,declaredGLBSha256:modelSha,
   domain:$('domain').value,
   assetId:'LocalNative'+$('domain').value,
   outputOrigin:'AUTHORIZED_SOURCE_MESH',
   sourceUnits:'METERS'
  });
  if(renderer)renderer.destroy();
  renderer=createAIG3DRenderer($('model'),{quality:'balanced',
   pixelRatio:1,maxTriangles:200000,preserveDrawingBuffer:true,
   background:[.015,.028,.05,1]});
  if(renderer.status!=='READY')throw Error('真正 GPU WebGL 不可用');
  renderer.setInspectionMode('LIT');
  renderer.setColorPipeline('FILM_SDR');
  enable(true);focusCamera();
  const result=renderer.render(activeScene());
  if(result.status!=='WEBGL_XYZ_TRIANGLES_RENDERED')
   throw Error('原始 GPU 三角面沒有真正繪製');
  inspect();
  status('V99 已從真正 GLB 解析 '+imported.sourceTriangles+
   ' 個原始三角面；SHA 與 GPU PASS。來源人物身份及電影級外觀仍 BLOCK。');
 }catch(e){enable(false);status('BLOCK：'+String(e?.message??e));}
 finally{busy=false;}
});
for(const k of Object.keys(views))$(k).addEventListener('click',()=>{
 if(!ready||busy)return;
 try{mode=k;focusCamera();renderer.render(activeScene());}
 catch(e){status('BLOCK：'+e.message);}
});
$('quality').addEventListener('click',()=>{
 try{
  const r=inspect();
  status('真來源 4K 幾何：'+(
   r.cameraBased4KGeometry?.sourceDetailCandidatePASS?'畫面密度候選 PASS':'BLOCK')+
   '；女主角臉型、材質與動畫來源仍需實證。');
 }catch(e){status('BLOCK：'+e.message);}
});
$('png4k').addEventListener('click',async()=>{
 if(!ready||busy)return;
 busy=true;$('png4k').disabled=true;
 try{
  const out=await captureAIGReal3DNative4K({
   renderer,scene:activeScene(),
   sourceSha256:imported.originalImageSha256,
   output:'UHD_4K',workingMemoryMB:256,
   camera:renderer.getCamera(),requireSourceDetailPASS:false});
  if(fileURL)URL.revokeObjectURL(fileURL);
  fileURL=URL.createObjectURL(out.pngBlob);
  const a=document.createElement('a');a.href=fileURL;
  a.download='Real3D-V101-'+(showRepaired?'REPAIRED':'ORIGINAL')+'-3840x2160.png';a.click();
  const qa=JSON.parse($('proof').textContent);
  qa.actualNativeGPUFrameWidth=out.width;
  qa.actualNativeGPUFrameHeight=out.height;
  qa.actualNativeGPUReadback=out.trueGPUReadPixels;
  qa.realSource4KPNG_SHA=out.sha256;
  qa.actualSource4KCloseUpGeometryGate=out.sourceGeometryProjectionQA?.sourceDetailCandidatePASS;
  $('proof').textContent=JSON.stringify(qa,null,2);
  status('已生成真正 3840×2160 GPU PNG（非 upscale）；來源外型仍不是正式人物身份認證。');
 }catch(e){status('BLOCK：'+String(e?.message??e));}
 finally{busy=false;$('png4k').disabled=!ready;}
});

$('repair101').addEventListener('click',()=>{
 if(!ready||busy||!imported)return;
 busy=true;$('repair101').disabled=true;
 try{
  const result=remodelAIGReal3DGeometryBackend({
   imported,allowDropDegenerate:false,acceptNormalRebuild:true,
   observedImageViews:[],camera:renderer.getCamera()
  });
  v101=result;
  const details={
   schema:result.schema,status:result.status,
   sourceImageSHA:result.sourceImageSHA,
   sourceModelSHA:result.sourceMeshSHA,
   assetId:result.originalAssetId??imported.assetId,
   nodeReports:result.structural?.reports?.map(r=>({
    nodeId:r.nodeId,status:r.status,
    originalTriangles:r.before?.sourceTriangles,
    revisedTriangles:r.after?.sourceTriangles??null,
    invalidFaces:r.before?.degenerateFaceIDs.length,
    originalWindingConflicts:r.before?.misorientedSharedEdges,
    repairedWindingConflicts:r.after?.misorientedSharedEdges??null,
    invertedOriginalFaceIDs:r.flippedOriginalFaceIDs??[],
    sourceOpenBoundaryEdges:r.before?.openBoundaryEdges,
    workOpenBoundaryEdges:r.after?.openBoundaryEdges??null,
    originalDisconnectedComponents:r.before?.disconnectedFaceIslands,
    workingDisconnectedComponents:r.after?.disconnectedFaceIslands??null
   })),
   sourceSHAUnmodified:true,
   trainedNeuralRepairModelActuallyCalled:false,
   authenticHeroineAppearanceCertified:false,releasePASS:false
  };
  $('v101-report').textContent=JSON.stringify(details,null,2);
  if(!result.workingScene){
   status('V101 安全阻擋：模型有需要來源授權確認的非流形、重複或破損面；沒有製造假模型。');
   return;
  }
  showRepaired=true;
  focusCamera();const draw=renderer.render(activeScene());
  if(draw.status!=='WEBGL_XYZ_TRIANGLES_RENDERED')throw Error('實際修整網格沒有繪製');
  inspect();
  status('V101 結構修整真幾何工作副本已完成，可切換原始／修整視角；' +
   '未見的背面、缺口與身份仍維持 BLOCK');
 }catch(e){status('BLOCK：'+String(e?.message??e));}
 finally{busy=false;enable(ready);}
});
for(const [id,repaired] of [['original101',false],['remodel101',true]]){
 $(id).addEventListener('click',()=>{
  if(!ready||busy||!v101?.workingScene)return;
  try{
   showRepaired=repaired;focusCamera();
   const result=renderer.render(activeScene());
   if(result.status!=='WEBGL_XYZ_TRIANGLES_RENDERED')
    throw Error('切換的真幾何沒有繪製');
   inspect();
   status(repaired?'正在顯示 V101 修整後真 XYZ 工作副本':'正在顯示 V99 原始 SHA 鎖定 GLB');
  }catch(e){status('BLOCK：'+e.message);}
 });
}
