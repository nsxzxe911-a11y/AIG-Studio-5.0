/** Source-bound UV + albedo/normal PNG maps on top of V87 fixed shader.
 * An uploaded UV0 sidecar is mandatory. No guessing missing original UVs.
 */
import {compileAIGReal3DTextureNodes,applyAIGReal3DTextureNodes}
 from './aig-real3d-material-texture-nodes.mjs';
import {createAIG3DRenderer} from './aig-real3d-webgl.mjs';
const hash=async bytes=>Array.from(new Uint8Array(
 await crypto.subtle.digest('SHA-256',bytes)),
 a=>a.toString(16).padStart(2,'0')).join('');
async function readPNG(file){
 if(!file||!['image/png','image/webp'].includes(file.type)||
  file.size>2_000_000)throw Error('只能匯入小於 2MB 的 PNG/WebP 原始貼圖');
 const bitmap=await createImageBitmap(file);
 try{
  if(bitmap.width<2||bitmap.height<2||
   bitmap.width>512||bitmap.height>512)
   throw Error('貼圖尺寸限 2×2 至 512×512；來源 UV 不可憑空生成');
  const c=document.createElement('canvas');
  c.width=bitmap.width;c.height=bitmap.height;
  const ctx=c.getContext('2d',{willReadFrequently:true});
  if(!ctx)throw Error('圖像原始 RGBA 讀取不可用');
  ctx.drawImage(bitmap,0,0);
  const data=ctx.getImageData(0,0,c.width,c.height);
  return {width:c.width,height:c.height,pixels:Array.from(data.data)};
 }finally{bitmap.close();}
}
export function mountAIGReal3DMaterialTextureUI({
 $,isBusy,setBusy,registerURL
}={}){
 const run=$('texture-node-run'),status=$('texture-node-status'),
  save=$('texture-node-download'),gallery=$('texture-node-gallery'),
  evidence=$('texture-node-evidence');
 let source=null,report=null;
 const reset=()=>{
  source=null;report=null;run.disabled=true;save.disabled=true;
  gallery.replaceChildren();
  status.textContent='BLOCK：先匯入原始 OBJ，並提供同來源 SHA 的真 UV sidecar。';
  evidence.textContent='UV 不是由照片猜測；缺少來源 UV 即保持 BLOCK。';
 };
 const load=ctx=>{
  reset();
  if(!ctx?.dense?.scene||!/^[a-f0-9]{64}$/i.test(ctx.sha256))return;
  source=ctx;run.disabled=false;
  status.textContent='原始 OBJ 已驗證。請上傳 per-vertex UV sidecar、Albedo PNG 與 Normal PNG。';
 };
 run.addEventListener('click',async()=>{
  if(isBusy())return;
  if(!source||source.file!==$('model-file').files?.[0]||
   source.upAxis!==$('up-axis').value||
   source.heightMm!==Number($('body-height').value)){
   reset();status.textContent='BLOCK：原始 OBJ 或方向／尺度變更，需重新匯入。';return;
  }
  setBusy(true);run.disabled=true;save.disabled=true;gallery.replaceChildren();
  let renderer=null;
  try{
   const uvFile=$('texture-uv-sidecar').files?.[0],
    colorFile=$('texture-albedo').files?.[0],
    normalFile=$('texture-normal').files?.[0];
   if(!uvFile||uvFile.size>12_000_000||!colorFile)
    throw Error('需真 UV sidecar JSON 與 Albedo PNG；不能自動補造未提供的 UV。');
   const buffer=await uvFile.arrayBuffer(),uvSha=await hash(buffer);
   const uvData=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(buffer)),
    node=source.dense.scene.nodes[0];
   if(uvData?.schema!=='AIG_REAL3D_V88_USER_SOURCE_UV0_V1'||
    uvData.sourceSha256!==source.sha256||
    !Array.isArray(uvData.uvByNode?.[node.id]))
    throw Error('UV sidecar 必須引用相同原始 OBJ SHA，並提供指定節點每個頂點的 UV0');
   const albedo=await readPNG(colorFile),
    normal=normalFile?await readPNG(normalFile):null,
    clearcoat=Number($('texture-clearcoat').value),
    compiled=compileAIGReal3DTextureNodes({
     mesh:node.mesh,uvCoordinates:uvData.uvByNode[node.id],
     sourceSha256:source.sha256,uvSourceSha256:uvSha,
     uvManifestSourceSha256:uvData.sourceSha256,
     albedoImage:albedo,normalImage:normal,
     normalStrength:normal?1:0,clearcoat
    }),
    textured=applyAIGReal3DTextureNodes({
     scene:source.dense.scene,nodeId:node.id,mapped:compiled
    });
   const canvas=document.createElement('canvas');canvas.width=640;canvas.height=640;
   renderer=createAIG3DRenderer(canvas,{
    quality:'balanced',pixelRatio:1,maxTriangles:700000,
    background:[.045,.071,.106,1]
   });
   if(renderer.status!=='READY')throw Error('原生 WebGL 不可用');
   renderer.setInspectionMode('LIT');
   const g=source.dense.sourceGeometry,
    min=g.rotatedSourceBoundsMin,max=g.rotatedSourceBoundsMax,
    focus=min.map((x,i)=>(x+max[i])/2),
    span=Math.max(...min.map((x,i)=>max[i]-x));
   renderer.setCamera({
    projection:'orthographic',yaw:.38,pitch:.27,
    orthoSpan:Math.max(.25,span*1.55),distance:Math.max(1,span*3),
    focus
   });
   const pictures=[];
   let before;
   for(const item of [
    {scene:source.dense.scene,label:'原始材質'},
    {scene:textured,label:'UV Albedo＋真 Tangent Normal＋Clearcoat'}
   ]){
    const image=await renderer.captureNativePNG(item.scene,{
     width:640,height:640
    });
    if(!image.genuineGpuReadback||image.width!==640||image.height!==640)
     throw Error('GPU 原生貼圖 PNG 讀回不足');
    const stats=renderer.getGPUResourceAccounting();
    if(!before)before=stats;
    else if(stats.totalOwnedGPUBuffersCreated-
       before.totalOwnedGPUBuffersCreated!==2||
     stats.fullBufferDataUploads-before.fullBufferDataUploads!==2||
     stats.actualMaterialTexturesCreated-before.actualMaterialTexturesCreated!==
       (normal?2:1))
     throw Error('UV/Normal 不得重新上傳原始 XYZ/法線/面片 GPU buffer');
    const url=URL.createObjectURL(image.blob);registerURL(url);
    const fig=document.createElement('figure'),img=document.createElement('img'),
     a=document.createElement('a'),cap=document.createElement('figcaption');
    img.src=url;img.alt=item.label+' 原始 XYZ 真 GPU';
    a.href=url;a.download='Real3D-V88-'+(pictures.length?'UV-NORMAL':'SOURCE')+'.png';
    a.textContent='原生 GPU PNG';cap.textContent=item.label;cap.append(a);
    fig.append(img,cap);gallery.append(fig);
    pictures.push({sha256:image.sha256,width:640,height:640,label:item.label});
   }
   if(pictures[0].sha256===pictures[1].sha256)
    throw Error('貼圖變更沒有造成真 GPU 畫面差異');
   report={
    schema:'AIG_REAL3D_V88_TEXTURE_WORKSTATION_GPU_GATE_V1',
    sourceObjSha256:source.sha256,uvSidecarSha256:uvSha,
    originalIndexedTriangles:compiled.originalIndexedTriangleCount,
    originalPositionNormalIndexGPUBuffersRebuilt:0,
    additionalSourceUVAndTangentBuffers:2,
    additionalMappedTextures:normal?2:1,
    sourceGeometryObjectReferencePreserved:true,
    trueTangentSpaceNormalMapApplied:!!normal,
    commonClearcoatStrength:clearcoat,
    nativeGPUImages:pictures,
    UVSourceIndependentlyAuthenticated:false,
    physicallyAccurateGlassRefractionOrSSS:false,
    naturalAnimalOrHumanSimulationPASS:false,
    productionReleasePASS:false
   };
   evidence.textContent=JSON.stringify(report,null,2);
   status.textContent='V88 UV+法線貼圖真 GPU 技術 PASS。原始 XYZ/法線/Index 緩衝共用；只新增 UV/Tangent 兩個 GPU 緩衝。材質不是物理毛髮、玻璃折射或真布料。';
   save.disabled=false;
  }catch(e){
   status.textContent='BLOCK：'+String(e?.message??e);
   evidence.textContent='BLOCK：'+String(e?.message??e);
  }finally{renderer?.destroy?.();setBusy(false);run.disabled=!source;}
 });
 save.addEventListener('click',()=>{
  if(!report)return;
  const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{
   type:'application/json'
  }));registerURL(url);
  const a=document.createElement('a');a.href=url;
  a.download='Real3D-V88-UV-NORMAL-CLEARCOAT-SHA.json';a.click();
 });
 reset();return {load,reset};
}
