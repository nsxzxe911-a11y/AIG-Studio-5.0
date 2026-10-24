import {createAIGReal3DV119MultiWardrobe} from './aig-real3d-v119-multi-wardrobe.mjs';
import {ingestAIGReal3DNativeGeneratedGLB,sha256AIGReal3DBytes}
 from './aig-real3d-v99-native-model-ingest.mjs';
import {createAIG3DRenderer} from './aig-real3d-webgl.mjs';
import {planAIGReal3DV107FiveAxis}
 from './aig-real3d-v107-five-axis-foot-head.mjs';
const $=id=>document.getElementById(id),status=s=>$('status').textContent=s,
 report=o=>$('receipt').textContent=JSON.stringify(o,null,2);
let count=0,wardrobe=null,selected=null,renderer=null,busy=false;
const outfits=$('outfits');
function addLayer(container,slot='top'){
 const id=String(count++);
 const holder=document.createElement('div');
 holder.className='row garment';
 holder.innerHTML='<label>衣物類別<select class="slot">'+
 ['top','bottom','outerwear','dress','shoes','headwear','accessory']
 .map(x=>'<option value="'+x+'"'+(x===slot?' selected':'')+'>'+x+'</option>').join('')+
 '</select></label><label>衣物來源 PNG<input class="source-image" type="file" accept="image/png"></label>'+
 '<label>衣物 GLB（原始 3D 網格）<input class="source-glb" type="file" accept=".glb,model/gltf-binary"></label>';
 container.appendChild(holder);
}
function addOutfit(label,slot='top'){
 if(outfits.children.length>=12){status('BLOCK：最多 12 套');return;}
 const n=outfits.children.length;
 const block=document.createElement('div');block.className='outfit';
 block.innerHTML='<div class="row"><label>服裝 ID<input class="outfit-id" value="look_'+(n+1)+'"></label>'+
 '<label>服裝名稱<input class="outfit-label" value="'+label+'"></label></div>'+
 '<div class="layers"></div>';
 outfits.appendChild(block);addLayer(block.querySelector('.layers'),slot);
}
addOutfit('制服','top');addOutfit('便服','dress');
$('add-outfit').addEventListener('click',()=>addOutfit('新套裝 '+(outfits.children.length+1)));
$('add-layer').addEventListener('click',()=>{
 const block=outfits.lastElementChild;
 if(!block)return;
 const layers=block.querySelector('.layers');
 if(layers.children.length>=5){status('BLOCK：一套最多五個衣物圖層');return;}
 const used=new Set([...layers.querySelectorAll('.slot')].map(e=>e.value));
 addLayer(layers,['top','bottom','outerwear','dress','shoes','headwear','accessory']
  .find(x=>!used.has(x))||'accessory');
});
async function loadModel(photoFile,glbFile,id){
 if(!photoFile||!glbFile||photoFile.size<64||photoFile.size>12e6||
  glbFile.size<128||glbFile.size>35e6||photoFile.type!=='image/png')
  throw Error('V119_ORIGINAL_PNG_AND_REAL_GLB_FILES_REQUIRED');
 const image=new Uint8Array(await photoFile.arrayBuffer()),
  glb=new Uint8Array(await glbFile.arrayBuffer());
 const [imageHash,glbHash]=await Promise.all([
  sha256AIGReal3DBytes(image),sha256AIGReal3DBytes(glb)]);
 return ingestAIGReal3DNativeGeneratedGLB({
  referenceImageBytes:image,glbBytes:glb,
  declaredImageSha256:imageHash,declaredGLBSha256:glbHash,
  domain:'PERSON',assetId:id,outputOrigin:'AUTHORIZED_SOURCE_MESH',
  sourceUnits:'METERS'
 });
}
function sourceFitBounds(scene){
 const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
 for(const n of scene.nodes)for(let i=0;i<3;i++){
  min[i]=Math.min(min[i],n.mesh.bounds.min[i]);
  max[i]=Math.max(max[i],n.mesh.bounds.max[i]);
 }
 return {min,max,focus:min.map((v,i)=>(v+max[i])/2),
  extent:Math.max(.08,...min.map((v,i)=>max[i]-v))};
}
function draw(){
 if(!selected||!renderer)return;
 const a=Number($('a').value),b=Number($('b').value),
  progress=Number($('progress').value)/100;
 $('a-value').textContent=a+'°';$('b-value').textContent=b+'°';
 $('progress-value').textContent=Math.round(progress*100)+'%';
 const plan=planAIGReal3DV107FiveAxis({
  scene:selected.scene,
  sourceGLBSha256:selected.receipt.compositeManifestSha256,
  aTiltDeg:a,bTurnDeg:b,footHeadProgress:progress
 });
 renderer.setVirtualStageV107({
  matrix:plan.modelStageMatrix,sourceScene:selected.scene,
  sourceMaxY:plan.clipSourceYMax,
  sourceGLBSha256:selected.receipt.compositeManifestSha256,
  clipEnabled:progress<1
 });
 const frame=renderer.render(selected.scene);
 if(frame.status!=='WEBGL_XYZ_TRIANGLES_RENDERED'||
  frame.triangles!==selected.receipt.selectedTotalTriangles||
  !frame.V107FiveAxisSourcePoseActive)
  throw Error('V119_SOURCE_CLOTHING_MESH_NOT_DRAWN_BY_GPU');
 const r={...selected.receipt,actualGPUFrame:{
  status:frame.status,triangles:frame.triangles,
  aTiltDeg:a,bTurnDeg:b,progress,
  clipEnabled:frame.V107OriginalFootHeadGPUSliceEnabled,
  sceneManifestSHA:selected.receipt.compositeManifestSha256,
  visibleOriginalGarmentGLBCount:selected.receipt.outfitLayers.length
 }};
 report(r);
 status('V119 真換裝：'+r.actualOutfitLabel+'；角色原圖 SHA 不變，'+
  r.outfitLayers.length+' 個衣物 GLB 原始網格已送 GPU。');
}
async function selectOutfit(id){
 if(!wardrobe)return;
 selected=await wardrobe.activate(id);
 const b=sourceFitBounds(selected.scene);
 if(!renderer){
  renderer=createAIG3DRenderer($('gl'),{
   quality:'balanced',pixelRatio:1,maxTriangles:200000,
   preserveDrawingBuffer:true,background:[.012,.021,.043,1]});
  if(renderer.status!=='READY')throw Error('V119_REAL_WEBGL_CONTEXT_NOT_READY');
  renderer.setInspectionMode('LIT');
  renderer.setColorPipeline('PBR_SDR');
 }
 renderer.setCamera({projection:'perspective',yaw:.4,pitch:.14,
  distance:b.extent*3.6,focus:b.focus,
  fovDeg:46,orthoSpan:b.extent*1.3,near:.0001,far:2000});
 draw();
}
$('build-wardrobe').addEventListener('click',async()=>{
 if(busy)return;
 busy=true;$('build-wardrobe').disabled=true;
 $('active-outfit').disabled=true;$('reset').disabled=true;$('export').disabled=true;
 try{
  status('核對角色及每套衣物的真 GLB、原始圖片、SHA 與角色座標中…');
  const actor=await loadModel($('actor-photo').files?.[0],
   $('actor-glb').files?.[0],'ActorOriginal');
  const collections=[];
  for(const block of outfits.children){
   const id=block.querySelector('.outfit-id').value.trim(),
    label=block.querySelector('.outfit-label').value.trim(),layers=[];
   for(const source of block.querySelectorAll('.garment')){
    const slot=source.querySelector('.slot').value;
    const imported=await loadModel(
     source.querySelector('.source-image').files?.[0],
     source.querySelector('.source-glb').files?.[0],
     'Garment_'+collections.length+'_'+layers.length);
    layers.push({slot,imported});
   }
   collections.push({id,label,layers});
  }
  wardrobe=await createAIGReal3DV119MultiWardrobe({
   actor,characterId:'original_actor',outfits:collections
  });
  const select=$('active-outfit');
  select.replaceChildren();
  for(const o of wardrobe.outfitCatalog){
   const option=document.createElement('option');
   option.value=o.id;option.textContent=o.label;
   select.appendChild(option);
  }
  await selectOutfit(wardrobe.outfitCatalog[0].id);
  select.disabled=false;$('reset').disabled=false;$('export').disabled=false;
 }catch(e){
  wardrobe=null;selected=null;
  report({status:'BLOCK',reason:String(e?.message??e),
   createdNewGarmentMeshWithoutSource:false,productionReleasePASS:false});
  status('BLOCK：'+String(e?.message??e));
 }finally{busy=false;$('build-wardrobe').disabled=false;}
});
$('active-outfit').addEventListener('change',async()=>{
 try{await selectOutfit($('active-outfit').value);}
 catch(e){status('BLOCK：'+String(e?.message??e));}
});
for(const key of ['a','b','progress'])$(key).addEventListener('input',()=>{
 try{draw();}catch(e){status('BLOCK：'+String(e?.message??e));}
});
$('reset').addEventListener('click',()=>{
 for(const [id,v] of [['a','0'],['b','0'],['progress','100']])$(id).value=v;
 try{draw();}catch(e){status('BLOCK：'+String(e?.message??e));}
});
$('export').addEventListener('click',()=>{
 if(!wardrobe||!selected)return;
 const saved={schema:wardrobe.schema,actorSource:wardrobe.actorSource,
  outfitCatalog:wardrobe.outfitCatalog,activeOutfitId:selected.receipt.activeOutfitId,
  actualSourceGLBFilesMustBeKeptSeparately:true,
  thisManifestIsNotAMergedGLB:true,productionReleasePASS:false};
 const blob=new Blob([JSON.stringify(saved,null,2)],{type:'application/json'}),
  url=URL.createObjectURL(blob);
 const a=document.createElement('a');a.href=url;a.download='FastModel-V119-Source-Wardrobe-Manifest.json';
 a.click();requestAnimationFrame(()=>URL.revokeObjectURL(url));
});
