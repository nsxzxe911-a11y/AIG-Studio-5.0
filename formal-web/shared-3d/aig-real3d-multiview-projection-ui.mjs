/** V89 workstation: local photos + externally calibrated poses -> observed UV atlas.
 * No external upload, automatic camera solve, invented hidden side or true scan claim.
 */
import {buildAIGReal3DMultiViewAtlas,AIG_REAL3D_V89_VIEW_SCHEMA}
 from './aig-real3d-multiview-projection.mjs';
import {compileAIGReal3DTextureNodes,applyAIGReal3DTextureNodes}
 from './aig-real3d-material-texture-nodes.mjs';
import {createAIG3DRenderer} from './aig-real3d-webgl.mjs';
const hash=async b=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),
 x=>x.toString(16).padStart(2,'0')).join('');
async function imageRGBA(file){
 if(!file||!['image/png','image/webp'].includes(file.type)||
  file.size>2_000_000)throw Error('只支援單張小於 2MB 的 PNG/WebP 來源照片');
 const bitmap=await createImageBitmap(file);
 try{
  if(bitmap.width<4||bitmap.height<4||
   bitmap.width>512||bitmap.height>512)
   throw Error('V89 來源照片只接受 4～512px；不得以 4K 假稱通過');
  const canvas=document.createElement('canvas');
  canvas.width=bitmap.width;canvas.height=bitmap.height;
  const c=canvas.getContext('2d',{willReadFrequently:true});
  if(!c)throw Error('無法讀取原始 RGBA');
  c.drawImage(bitmap,0,0);
  return {width:canvas.width,height:canvas.height,
   pixels:Array.from(c.getImageData(0,0,canvas.width,canvas.height).data)};
 }finally{bitmap.close();}
}
async function sourcePNG(asset){
 const canvas=document.createElement('canvas');
 canvas.width=asset.width;canvas.height=asset.height;
 const ctx=canvas.getContext('2d');
 if(!ctx)throw Error('無法輸出 Atlas PNG');
 const data=ctx.createImageData(asset.width,asset.height);
 // GPU typed-array texture has row 0 at v=0; canvas first row is top.
 for(let y=0;y<asset.height;y++){
  const src=y*asset.width*4,dst=(asset.height-1-y)*asset.width*4;
  data.data.set(asset.pixels.slice(src,src+asset.width*4),dst);
 }
 ctx.putImageData(data,0,0);
 const blob=await new Promise((resolve,reject)=>canvas.toBlob(
  b=>b?resolve(b):reject(Error('Atlas PNG 無法編碼')),'image/png'));
 return {blob,sha256:await hash(await blob.arrayBuffer())};
}
export function mountAIGReal3DMultiViewUI({$,isBusy,setBusy,registerURL}={}){
 const run=$('v89-run'),save=$('v89-download'),
  status=$('v89-status'),evidence=$('v89-evidence'),
  gallery=$('v89-gallery');
 let source=null,last=null;
 const reset=()=>{
  source=null;last=null;run.disabled=true;save.disabled=true;
  gallery.replaceChildren();
  status.textContent='BLOCK：先驗證本機原始 OBJ，再提供同 SHA 的 UV、已校正相機與照片。';
  evidence.textContent='未觀測面不得自動補色。';
 };
 const load=ctx=>{
  reset();
  if(!ctx?.dense?.scene||!/^[a-f0-9]{64}$/i.test(ctx.sha256))return;
  source=ctx;run.disabled=false;
  status.textContent='原始來源可供選擇；需 UV sidecar、相機標定 JSON、來源照片。';
 };
 function showPNG(png,name,alt){
  const url=URL.createObjectURL(png.blob);registerURL(url);
  const fig=document.createElement('figure'),img=document.createElement('img'),
   link=document.createElement('a'),caption=document.createElement('figcaption');
  img.src=url;img.alt=alt;link.href=url;link.download=name;
  link.textContent='下載 PNG';caption.textContent=alt;caption.append(link);
  fig.append(img,caption);gallery.append(fig);
 }
 run.addEventListener('click',async()=>{
  if(isBusy())return;
  if(!source||source.file!==$('model-file').files?.[0]||
   source.upAxis!==$('up-axis').value||
   source.heightMm!==Number($('body-height').value)){
   reset();status.textContent='BLOCK：原始 OBJ、朝向或尺度已改變，必須重做來源 Gate。';
   return;
  }
  setBusy(true);run.disabled=true;save.disabled=true;gallery.replaceChildren();
  let renderer=null;
  try{
   const uvFile=$('v89-uv').files?.[0],
    viewFile=$('v89-camera-manifest').files?.[0],
    photoFiles=Array.from($('v89-photos').files??[]);
   if(!uvFile||uvFile.size>12_000_000||
    !viewFile||viewFile.size>300_000||
    photoFiles.length<1||photoFiles.length>6)
    throw Error('請提供來源 UV JSON、相機 JSON 與 1～6 張有真實 SHA 的照片');
   if(source.dense.scene.nodes.length!==1)
    throw Error('V89 目前僅接受單節點來源；多 chunk 全場景深度遮蔽尚未驗證，BLOCK');
   const uvBytes=await uvFile.arrayBuffer(),
    vBytes=await viewFile.arrayBuffer(),
    uvHash=await hash(uvBytes),
    decode=x=>JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(x)),
    uv=decode(uvBytes),manifest=decode(vBytes),
    node=source.dense.scene.nodes[0];
   if(uv?.schema!=='AIG_REAL3D_V88_USER_SOURCE_UV0_V1'||
    uv.sourceSha256!==source.sha256||
    !Array.isArray(uv.uvByNode?.[node.id])||
    manifest?.schema!=='AIG_REAL3D_V89_SOURCE_CALIBRATED_VIEW_SET_V1'||
    manifest.sourceSha256!==source.sha256||
    manifest.uvSidecarSha256!==uvHash||
    manifest.nodeId!==node.id||
    !Array.isArray(manifest.views)||
    manifest.views.length!==photoFiles.length)
    throw Error('來源 OBJ / UV / 相機照片集的 SHA、節點或數量不相符');
   const photoByName=new Map(photoFiles.map(f=>[f.name,f]));
   if(photoByName.size!==photoFiles.length||
    new Set(manifest.views.map(v=>v.fileName)).size!==photoFiles.length)
    throw Error('照片檔名重複或與 manifest 清單不同');
   const views=[];
   for(const view of manifest.views){
    const f=photoByName.get(view.fileName);
    if(!f)throw Error('找不到相機清單指定的照片 '+view.fileName);
    const bytes=await f.arrayBuffer(),sha256=await hash(bytes);
    if(sha256!==view.imageSha256)
     throw Error('PHOTO_SHA_MISMATCH_'+view.id);
    views.push({schema:AIG_REAL3D_V89_VIEW_SCHEMA,
     id:view.id,sourceSha256:source.sha256,
     imageSha256:sha256,camera:view.camera,image:await imageRGBA(f)});
   }
   const atlas=buildAIGReal3DMultiViewAtlas({
    mesh:node.mesh,uvCoordinates:uv.uvByNode[node.id],
    sourceSha256:source.sha256,uvManifestSourceSha256:uv.sourceSha256,
    views,atlasSize:Number($('v89-resolution').value)
   });
   const mapped=compileAIGReal3DTextureNodes({
    mesh:node.mesh,uvCoordinates:uv.uvByNode[node.id],
    sourceSha256:source.sha256,uvSourceSha256:uvHash,
    uvManifestSourceSha256:source.sha256,
    albedoImage:atlas.albedoImage,normalStrength:0,clearcoat:0
   });
   const textured=applyAIGReal3DTextureNodes({
    scene:source.dense.scene,nodeId:node.id,mapped
   });
   const canvas=document.createElement('canvas');canvas.width=640;canvas.height=640;
   renderer=createAIG3DRenderer(canvas,{quality:'balanced',pixelRatio:1,
    maxTriangles:700000,background:[.045,.071,.106,1]});
   if(renderer.status!=='READY')throw Error('原生 WebGL 不可用');
   renderer.setInspectionMode('LIT');
   const g=source.dense.sourceGeometry,
    min=g.rotatedSourceBoundsMin,max=g.rotatedSourceBoundsMax,
    focus=min.map((v,i)=>(v+max[i])/2),
    span=Math.max(...min.map((v,i)=>max[i]-v));
   renderer.setCamera({projection:'orthographic',yaw:.38,pitch:.27,
    orthoSpan:Math.max(.25,span*1.55),distance:Math.max(1,span*3),focus});
   const before=await renderer.captureNativePNG(source.dense.scene,
    {width:640,height:640});
   const baseStats=renderer.getGPUResourceAccounting();
   const after=await renderer.captureNativePNG(textured,
    {width:640,height:640});
   const newStats=renderer.getGPUResourceAccounting();
   if(!before.genuineGpuReadback||!after.genuineGpuReadback||
    before.sha256===after.sha256||
    newStats.totalOwnedGPUBuffersCreated-baseStats.totalOwnedGPUBuffersCreated!==2||
    newStats.fullBufferDataUploads-baseStats.fullBufferDataUploads!==2||
    newStats.actualMaterialTexturesCreated-baseStats.actualMaterialTexturesCreated!==1)
    throw Error('BLOCK：原始 Buffer 不可重傳且 GPU 貼圖必須真實改變畫面');
   const atlasPNG=await sourcePNG(atlas.albedoImage),
    maskPNG=await sourcePNG(atlas.observationMask);
   showPNG(atlasPNG,'Real3D-V89-OBSERVED-ATLAS.png','實際觀測顏色；洋紅色＝未知');
   showPNG(maskPNG,'Real3D-V89-OBSERVATION-MASK.png','白＝可觀測，多相機融合；黑＝未知');
   showPNG({blob:after.blob,sha256:after.sha256},
    'Real3D-V89-REAL-GPU.png','原始 XYZ＋觀測貼圖的真 GPU');
   last={schema:'AIG_REAL3D_V89_WORKSTATION_GATE_V1',
    sourceSha256:source.sha256,uvSidecarSha256:uvHash,
    cameraManifestSha256:await hash(vBytes),
    photoSha256ById:Object.fromEntries(views.map(v=>[v.id,v.imageSha256])),
    ...atlas.evidence,
    pngSha256:{atlas:atlasPNG.sha256,mask:maskPNG.sha256,
     nativeSource:before.sha256,nativeMapped:after.sha256},
    originalGeometryGPUReuploads:0,uvTangentGPUBufferAdds:2,
    realGPUReadback:true,sourcePhotoCameraCalibrationExternal:true,
    releasePASS:false};
   evidence.textContent=JSON.stringify(last,null,2);
   status.textContent='V89 真視角重投影完成，觀測覆蓋率 '+
    last.observedCoveragePercent+'%。洋紅色是未觀測區，不能宣稱照片 1:1 重建。';
   save.disabled=false;
  }catch(e){
   status.textContent='BLOCK：'+String(e?.message??e);
   evidence.textContent=status.textContent;
  }finally{renderer?.destroy?.();setBusy(false);run.disabled=!source;}
 });
 save.addEventListener('click',()=>{
  if(!last)return;
  const url=URL.createObjectURL(new Blob([JSON.stringify(last,null,2)],
   {type:'application/json'}));registerURL(url);
  const a=document.createElement('a');a.href=url;
  a.download='Real3D-V89-MULTIVIEW-SOURCE-GATE.json';a.click();
 });
 reset();return {load,reset};
}
