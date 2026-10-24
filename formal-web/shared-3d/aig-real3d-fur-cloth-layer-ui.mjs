import {createAIGReal3DCoatMaterial,
 composeAIGReal3DFurClothScene,buildAIGReal3DIndependentGarmentOBJ}
 from './aig-real3d-separate-fur-cloth-material.mjs';
import {createAIG3DRenderer} from './aig-real3d-webgl.mjs';
const hexToRGB=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
const sha256=async bytes=>Array.from(new Uint8Array(
 await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
export function mountAIGReal3DFurClothLayerControls({
 $,isBusy,setBusy,registerURL
}={}){
 if(typeof $!=='function'||typeof isBusy!=='function'||
  typeof setBusy!=='function'||typeof registerURL!=='function')
  throw Error('REAL3D_V86_UI_DEPENDENCIES_REQUIRED');
 const run=$('fur-cloth-run'),save=$('fur-cloth-save'),
  status=$('fur-cloth-status'),reportArea=$('fur-cloth-evidence'),
  gallery=$('fur-cloth-gallery');
 let source=null,result=null;
 const reset=()=>{
  source=null;result=null;run.disabled=true;save.disabled=true;
  gallery.replaceChildren();
  status.textContent='BLOCK：請先匯入真正原始 OBJ，尚無動物、人體或衣物來源證據。';
  reportArea.textContent='來源、皮膚、底絨、外層毛與獨立衣物尚未驗證。';
 };
 const load=v=>{
  reset();
  if(!v?.dense?.scene||!/^[a-f0-9]{64}$/i.test(v.sha256))return;
  source=v;run.disabled=false;
  status.textContent='本機原始 OBJ 已接入。可切換原始表面毛髮材質；衣物必須額外匯入獨立 OBJ，不會由身體生成。';
 };
 run.addEventListener('click',async()=>{
  if(isBusy())return;
  if(!source||source.file!==$('model-file').files?.[0]||
   source.upAxis!==$('up-axis').value||
   source.heightMm!==Number($('body-height').value)){
   reset();status.textContent='BLOCK：來源 OBJ 或身高／朝上軸變更，需重新匯入。';
   return;
  }
  setBusy(true);run.disabled=true;save.disabled=true;gallery.replaceChildren();
  let renderer=null;
  try{
   const fur=createAIGReal3DCoatMaterial({
    kind:$('coat-kind').value,
    skinRGB:hexToRGB($('coat-skin').value),
    undercoatRGB:hexToRGB($('coat-under').value),
    guardRGB:hexToRGB($('coat-guard').value)
   });
   const garments=[];
   const files=Array.from($('coat-garment-files').files??[]);
   if(files.length>4)throw Error('單次最多四件獨立衣物 OBJ');
   for(const file of files){
    if(file.size>12_000_000)throw Error('衣服原始 OBJ 超過 12MB');
    const bytes=await file.arrayBuffer();
    const garmentSourceSha256=await sha256(bytes);
    const g=buildAIGReal3DIndependentGarmentOBJ({
     objText:new TextDecoder('utf-8',{fatal:true}).decode(bytes),
     garmentSourceSha256,bodySourceSha256:source.sha256
    });
    garments.push(g);
   }
   const nakedMaterial=createAIGReal3DCoatMaterial({
    kind:'SKIN',skinRGB:fur.skinRGB,
    undercoatRGB:fur.undercoatRGB,guardRGB:fur.guardRGB
   });
   const baseline=composeAIGReal3DFurClothScene({
    sourceScene:source.dense.scene,
    bodySourceSha256:source.sha256,coatMaterial:nakedMaterial
   });
   const material=composeAIGReal3DFurClothScene({
    sourceScene:source.dense.scene,
    bodySourceSha256:source.sha256,coatMaterial:fur,
    garments,garmentRGB:hexToRGB($('coat-cloth-color').value)
   });
   const c=document.createElement('canvas');
   c.width=640;c.height=640;
   renderer=createAIG3DRenderer(c,{
    quality:'balanced',pixelRatio:1,maxTriangles:700000,
    background:[.04,.07,.10,1]
   });
   if(renderer.status!=='READY')throw Error('真 WebGL 材質比較不可用');
   renderer.setInspectionMode('LIT');
   const bounds=source.dense.sourceGeometry;
   const lo=bounds.rotatedSourceBoundsMin,
    hi=bounds.rotatedSourceBoundsMax;
   const focus=lo.map((x,i)=>(x+hi[i])/2),
    span=Math.max(...lo.map((x,i)=>hi[i]-x));
   renderer.setCamera({
    projection:'orthographic',yaw:.48,pitch:.25,
    orthoSpan:Math.max(.25,span*1.55),
    distance:Math.max(.75,span*3),focus
   });
   const plans=[
    {kind:'ORIGINAL_SKIN_MATERIAL',scene:baseline.scene},
    {kind:'COAT_AND_INDEPENDENT_GARMENTS',scene:material.scene}
   ];
   const gpuCaptures=[];
   for(const plan of plans){
    const png=await renderer.captureNativePNG(plan.scene,{
     width:640,height:640
    });
    if(png.genuineGpuReadback!==true||
     png.resampledFromSmallerImage!==false||
     png.width!==640||png.height!==640)
     throw Error('WebGL 非原始 640×640 GPU 影像');
    const url=URL.createObjectURL(png.blob);registerURL(url);
    const figure=document.createElement('figure'),
     img=document.createElement('img'),cap=document.createElement('figcaption'),
     a=document.createElement('a');
    img.src=url;img.alt=plan.kind+' 真來源 Indexed 3D 材質';
    a.href=url;a.download='Real3D-V86-'+plan.kind+'-NATIVE-GPU.png';
    a.textContent='原生 GPU PNG';
    cap.textContent=plan.kind;
    cap.append(a);figure.append(img,cap);gallery.append(figure);
    gpuCaptures.push({
     kind:plan.kind,sha256:png.sha256,
     width:png.width,height:png.height,
     sourceBodyTriangleCount:material.originalBodyTriangles,
     materialChangedWithoutGeometryEdit:true
    });
   }
   const native=renderer.getGPUResourceAccounting();
   if(native.activeTrackedOwnedGPUBufferCount<3||
    material.originalBodyGeometryReallocations!==0||
    !material.bodyOriginalGeometryUnmodified||
    (fur.strength>0&&gpuCaptures[0].sha256===gpuCaptures[1].sha256))
    throw Error('原始來源或 GPU 材質變化的證據不一致');
   result={
    ...material,scene:undefined,
    previousOriginalSkinGPU:gpuCaptures[0],
    currentMaterialAndSeparateGarmentsGPU:gpuCaptures[1],
    actualOriginalBodyGPUBufferCount:native.activeTrackedOwnedGPUBufferCount,
    independentlyUploadedGarmentSourceFiles:files.map(x=>x.name),
    individualStrandsActuallyGenerated:0,
    separateClothOBJRequiredForWearing:true,
    realGpuMaterialComparisonPASS:true,
    genuineDogFurAndClothPhysicsPASS:false
   };
   reportArea.textContent=JSON.stringify(result,null,2);
   save.disabled=false;
   status.textContent='材質分層真 GPU PASS：皮膚／底絨／護毛色彩在原來源網格切換'+
    '，原身體索引不變。'+
    (garments.length?garments.length+' 件獨立衣物 OBJ 另為獨立網格；':
     '未提供獨立衣物，沒有假裝替模型穿衣；')+
    '毛絲體積、自然搖擺、衣服貼合與碰撞仍 BLOCK。';
  }catch(e){
   status.textContent='BLOCK：'+String(e?.message??e);
   reportArea.textContent=result?JSON.stringify(result,null,2):
    'BLOCK：'+String(e?.message??e);
  }finally{
   renderer?.destroy?.();setBusy(false);run.disabled=!source;
  }
 });
 save.addEventListener('click',()=>{
  if(!result)return;
  const url=URL.createObjectURL(new Blob([JSON.stringify(result,null,2)],{
   type:'application/json'
  }));registerURL(url);
  const a=document.createElement('a');
  a.href=url;a.download='Real3D-V86-FUR-CLOTH-SOURCE-MATERIAL-SHA.json';
  a.click();
 });
 reset();
 return {load,reset};
}
