import {sha256AIGReal3DBytes,ingestAIGReal3DNativeGeneratedGLB}
 from './aig-real3d-v99-native-model-ingest.mjs';
import {connectAIGReal3DImportedGeometryToUnified4K}
 from './aig-real3d-v99-ai-inference-adapter.mjs';
import {planAIGReal3DNative4K,captureAIGReal3DNative4K}
 from './aig-real3d-v96-native-4k-pipeline.mjs';
import {createAIG3DRenderer}
 from './aig-real3d-webgl.mjs';
const $=id=>document.getElementById(id);
let imported=null,renderer=null,bridge=null,ready=false,busy=false,
 fileURL=null,mode='oblique',cameraSpan=2;
const views={front:[0,.08],side:[Math.PI/2,.08],
 back:[Math.PI,.08],oblique:[.58,.23]};
function status(x){$('status').textContent=x;}
function enable(v){
 ready=v;for(const k of ['front','side','back','oblique','quality','png4k'])
  $(k).disabled=!v;
}
function focusCamera(){
 const positions=imported.scene.nodes.flatMap(n=>n.mesh.positions);
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
 const plan=planAIGReal3DNative4K({
  gpuLimit:renderer.getGpuLimit(),sourceTriangles:imported.sourceTriangles
 });
 const proof={
  schema:imported.schema,domain:imported.domain,assetId:imported.assetId,
  originalImageSHA:imported.originalImageSha256,
  actualGLBSourceSHA:imported.actualSourceModelSha256,
  sourceFaceCount:imported.sourceTriangles,realMeshes:imported.nodeCount,
  geometrySource:imported.perMesh,
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
  const result=renderer.render(imported.scene);
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
 try{mode=k;focusCamera();renderer.render(imported.scene);}
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
   renderer,scene:imported.scene,
   sourceSha256:imported.originalImageSha256,
   output:'UHD_4K',workingMemoryMB:256,
   camera:renderer.getCamera(),requireSourceDetailPASS:false});
  if(fileURL)URL.revokeObjectURL(fileURL);
  fileURL=URL.createObjectURL(out.pngBlob);
  const a=document.createElement('a');a.href=fileURL;
  a.download='Real3D-V99-SOURCE-LOCKED-TRUE-3840x2160.png';a.click();
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
