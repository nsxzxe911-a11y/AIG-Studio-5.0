/** User uploads a JSON material catalog; selecting any recipe uses the
 * SAME existing WebGL program. No material type gets its own code path.
 */
import {loadAIGReal3DMaterialLibrary,
 compileAIGReal3DMaterialRecipe,applyAIGReal3DMaterialRecipe,
 AIG_REAL3D_V87_SAMPLE_LIBRARY}
 from './aig-real3d-material-recipe-engine.mjs';
import {createAIG3DRenderer} from './aig-real3d-webgl.mjs';
const fileDigest=async bytes=>Array.from(new Uint8Array(
 await crypto.subtle.digest('SHA-256',bytes)),
 x=>x.toString(16).padStart(2,'0')).join('');
export function mountAIGReal3DMaterialRecipeUI({
 $,isBusy,setBusy,registerURL
}={}){
 if(typeof $!=='function'||typeof isBusy!=='function'||
  typeof setBusy!=='function'||typeof registerURL!=='function')
  throw Error('REAL3D_V87_MATERIAL_UI_DEPENDENCIES');
 const file=$('recipe-catalog-file'),select=$('recipe-material-select'),
  importButton=$('recipe-catalog-import'),run=$('recipe-run'),
  download=$('recipe-download'),status=$('recipe-status'),
  gallery=$('recipe-gallery'),evidence=$('recipe-evidence');
 let source=null,report=null,catalog=AIG_REAL3D_V87_SAMPLE_LIBRARY,
  catalogFileSha256=null,loadedFile=null;
 function showRecipes(){
  select.replaceChildren();
  for(const recipe of catalog.recipes){
   const opt=document.createElement('option');
   opt.value=recipe.id;opt.textContent=recipe.name+'｜'+recipe.family;
   select.append(opt);
  }
 }
 function reset(){
  source=null;report=null;run.disabled=true;download.disabled=true;
  gallery.replaceChildren();
  evidence.textContent='尚未匯入可驗證 original OBJ。';
  status.textContent='BLOCK：先完成真原始 Indexed OBJ 匯入。材質只改表面，不會生成缺失形體。';
 }
 function load(obj){
  reset();
  if(obj?.dense?.scene&&/^[a-f0-9]{64}$/i.test(obj.sha256)){
   source=obj;run.disabled=false;
   status.textContent='原始 OBJ 已驗證。可選材質配方或匯入整份 JSON 材質庫，一次增加多種類型。';
  }
 }
 importButton.addEventListener('click',async()=>{
  if(isBusy())return;
  const candidate=file.files?.[0];
  if(!candidate){
   catalog=AIG_REAL3D_V87_SAMPLE_LIBRARY;catalogFileSha256=null;loadedFile=null;
   showRecipes();
   status.textContent='已選內建示範配方；可用 JSON 一次載入最多 64 組自訂材質。';
   return;
  }
  try{
   if(candidate.size>512000)throw Error('材質庫 JSON 超過 512KB');
   const bytes=await candidate.arrayBuffer();
   const decoded=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
   const parsed=loadAIGReal3DMaterialLibrary(decoded);
   catalog=parsed;catalogFileSha256=await fileDigest(bytes);
   loadedFile=candidate;
   report=null;download.disabled=true;showRecipes();
   status.textContent='材質庫驗證成功：'+parsed.recipes.length+
    ' 組配方；全數使用同一個 GPU 程式，不需為每種材料更新核心。';
  }catch(error){
   status.textContent='BLOCK：'+String(error?.message??error);
  }
 });
 run.addEventListener('click',async()=>{
  if(isBusy())return;
  if(!source||source.file!==$('model-file').files?.[0]||
   source.upAxis!==$('up-axis').value||
   source.heightMm!==Number($('body-height').value)||
   loadedFile&&file.files?.[0]!==loadedFile){
   reset();status.textContent='BLOCK：原始 OBJ 或材質庫已改動，請重新驗證。';
   return;
  }
  setBusy(true);run.disabled=true;download.disabled=true;
  gallery.replaceChildren();
  let renderer=null;
  try{
   const choice=catalog.recipes.find(x=>x.id===select.value);
   if(!choice)throw Error('材質配方不存在或已變更');
   const compiled=compileAIGReal3DMaterialRecipe(choice),
    working=applyAIGReal3DMaterialRecipe({
     scene:source.dense.scene,compiled
    });
   const canvas=document.createElement('canvas');
   canvas.width=640;canvas.height=640;
   renderer=createAIG3DRenderer(canvas,{
    quality:'balanced',pixelRatio:1,maxTriangles:700000,
    background:[.045,.075,.11,1]
   });
   if(renderer.status!=='READY')throw Error('真 GPU 不可用');
   renderer.setInspectionMode('LIT');
   const bb=source.dense.sourceGeometry,
    lo=bb.rotatedSourceBoundsMin,hi=bb.rotatedSourceBoundsMax,
    focus=lo.map((x,i)=>(x+hi[i])/2),
    span=Math.max(...lo.map((x,i)=>hi[i]-x));
   renderer.setCamera({
    projection:'orthographic',yaw:.4,pitch:.25,
    orthoSpan:Math.max(.25,span*1.55),
    distance:Math.max(.75,span*3),focus
   });
   const frames=[];
   let firstBuffers;
   for(const info of [
    {label:'原始來源材質',scene:source.dense.scene},
    {label:'資料驅動配方材質',scene:working.scene}
   ]){
    const image=await renderer.captureNativePNG(info.scene,{
     width:640,height:640
    });
    if(!image.genuineGpuReadback||
     image.width!==640||image.height!==640||
     image.resampledFromSmallerImage!==false)
     throw Error('不是原生 GPU PNG 讀回');
    const resources=renderer.getGPUResourceAccounting();
    if(!firstBuffers)firstBuffers=resources;
    else if(resources.totalOwnedGPUBuffersCreated!==
      firstBuffers.totalOwnedGPUBuffersCreated||
      resources.fullBufferDataUploads!==firstBuffers.fullBufferDataUploads||
      resources.fullBufferBytesUploaded!==firstBuffers.fullBufferBytesUploaded)
      throw Error('切換材質配方造成原始幾何 GPU 緩衝重新配置');
    const url=URL.createObjectURL(image.blob);registerURL(url);
    const figure=document.createElement('figure'),
     img=document.createElement('img'),caption=document.createElement('figcaption'),
     a=document.createElement('a');
    img.src=url;img.alt=info.label+' 原始網格真 GPU';
    a.href=url;a.download='Real3D-V87-'+(frames.length?'RECIPE':'ORIGINAL')+'.png';
    a.textContent='下載原生 GPU PNG';
    caption.textContent=info.label;caption.append(a);
    figure.append(img,caption);gallery.append(figure);
    frames.push({label:info.label,sha256:image.sha256,
     width:image.width,height:image.height,
     originalMeshSourceSha256:source.sha256});
   }
   if(frames[0].sha256===frames[1].sha256)
    throw Error('配方未造成可量測 GPU 材質差異；不得標記 PASS');
   report={
    schema:'AIG_REAL3D_V87_MATERIAL_RECIPE_WORKSTATION_GATE_V1',
    catalogSchema:catalog.schema,catalogMaterialCount:catalog.recipes.length,
    catalogFileSha256,
    sourceObjSha256:source.sha256,selectedRecipeId:choice.id,
    selectedRecipeFamily:choice.family,
    compiledUniformLayerCount:compiled.layerCount,
    originalSourceTriangleCount:working.scene.nodes.reduce(
     (a,n)=>a+n.mesh.triangleCount,0),
    materialSourceCopyIdentityPreserved:
     working.originalSourceMeshAndIndexReferencesIdentical,
    originalGPUBufferReallocationsBetweenMaterialChanges:0,
    fullGPUShadersRecompiledPerRecipe:0,
    actualSourceGPUReadbackFrames:frames,
    originalShaderSupportsArbitrarySafeRecipeIdentifiers:true,
    UVTexturesRefractionDisplacementSSSValidated:false,
    independentPhysicalMaterialMeasurementsVerified:false,
    filmQualityPhotorealismPASS:false,
    humanDogAnatomyOrFurMovementPASS:false,
    releasePASS:false
   };
   evidence.textContent=JSON.stringify(report,null,2);
   download.disabled=false;
   status.textContent='V87 同引擎多材質 PASS：'+choice.name+
    '。原始身體 GPU 緩衝未重建；整批材質只需 JSON 配方。'+
    '特殊光學、真布料、毛絲／物理仍需獨立驗證。';
  }catch(e){
   status.textContent='BLOCK：'+String(e?.message??e);
   evidence.textContent='BLOCK：'+String(e?.message??e);
  }finally{
   renderer?.destroy?.();setBusy(false);run.disabled=!source;
  }
 });
 download.addEventListener('click',()=>{
  if(!report)return;
  const u=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{
   type:'application/json'
  }));registerURL(u);
  const a=document.createElement('a');
  a.href=u;a.download='Real3D-V87-MATERIAL-CATALOG-GPU-SHA.json';a.click();
 });
 showRecipes();reset();
 return {load,reset};
}
