/**
 * FastModel 7.14 protagonist workbench, mounted inside the validated 7.13
 * two-photo metric studio. Regions are explicitly user reviewed, and no
 * invisible back of skull, hair strands or invented skeleton is exported.
 */
import * as THREE from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {AIG714_LABELS,growAIG714ReviewedColorRegions,assembleAIG714HeroineSurface}
 from './aig-heroine-scan-7-14.mjs';
const $=id=>document.getElementById(id);
const colors={
 HAIR:'#d3a066',FACE:'#fc9c8b',NECK:'#e4bdb1',JACKET:'#899dc4',
 SHIRT:'#eceff7',SKIRT:'#d16f85',SKIN:'#ffc7a2',BAG:'#b78a56',
 ACCESSORY:'#e2e0a2'
};
const labels=Object.keys(colors);
const HEROINE_SOURCE_SHA256='83b5728f34f6d3cc266d33e17fe259c44314b265fbf24d6d7a8eb971c316e910';
let seeds=[],regions=null,product=null,source=null;
const src=$('heroine-photo'),overlay=$('heroine-mask'),evidence=$('heroine-proof'),
 stage=$('heroine-status'),seedControls=$('heroine-seeds'),exportButton=$('heroine-export');
const info=(s,ok=false)=>{stage.textContent=s;stage.dataset.ok=String(ok);};
function clear(){
 seeds=[];regions=null;product=null;source=null;
 exportButton.disabled=true;$('heroine-mask-export').disabled=true;
 $('heroine-reviewed').checked=false;
 seedControls.textContent='尚無已確認部位種子點';
 evidence.textContent='等待已校正的雙照 3D 網格與人物色彩分區';
 const c=overlay.getContext('2d');c.clearRect(0,0,overlay.width,overlay.height);
}
function paintMetricDepth(){
 const canvas=$('heroine-depth'),caption=$('heroine-depth-range');
 if(!source?.surface){
  const ctx=canvas.getContext('2d');
  canvas.width=source?.imageWidth||320;canvas.height=source?.imageHeight||240;
  ctx.fillStyle='#04111d';ctx.fillRect(0,0,canvas.width,canvas.height);
  caption.textContent='單張照片：Z 深度 UNKNOWN；型體與 RGB 不是經校準的實測立體深度';
  return;
 }
 const w=source.imageWidth,h=source.imageHeight;
 canvas.width=w;canvas.height=h;
 const ctx=canvas.getContext('2d',{willReadFrequently:true}),
  image=ctx.createImageData(w,h),zs=new Float32Array(w*h),
  counts=new Uint8Array(w*h),s=source.surface;
 let near=Infinity,far=-Infinity;
 for(let i=0;i<s.vertexCount;i++){
  const u=s.uvs[2*i],v=s.uvs[2*i+1],
   x=Math.min(w-1,Math.max(0,Math.round(u*(w-1)))),
   y=Math.min(h-1,Math.max(0,Math.round((1-v)*(h-1)))),
   z=s.positions[i*3+2],at=y*w+x;
  if(!Number.isFinite(z)||z<=0||s.confidence[i]<.1)continue;
  zs[at]=z;counts[at]=1;near=Math.min(near,z);far=Math.max(far,z);
 }
 if(!Number.isFinite(near)){
  caption.textContent='這組照片沒有可靠的已量測 Z 值，深度圖維持空白';
  return;
 }
 const span=Math.max(far-near,.001);
 for(let i=0;i<zs.length;i++){
  const p=4*i;
  if(!counts[i]){
   image.data[p]=4;image.data[p+1]=11;image.data[p+2]=20;image.data[p+3]=255;
   continue;
  }
  const t=Math.max(0,Math.min(1,(zs[i]-near)/span));
  image.data[p]=Math.round(235*(1-t)+25*t);
  image.data[p+1]=Math.round(100+90*(1-Math.abs(2*t-1)));
  image.data[p+2]=Math.round(35*(1-t)+245*t);
  image.data[p+3]=255;
 }
 ctx.putImageData(image,0,0);
 caption.textContent='實測 Z '+near.toFixed(2)+'～'+far.toFixed(2)+
  ' mm；橘紅=近，藍=遠，暗色=未可靠重建。這是左相機光心距離，不是皮膚厚度。';
}
function preview(){
 if(!source)return;
 src.width=overlay.width=source.leftCanvas.width;
 src.height=overlay.height=source.leftCanvas.height;
 src.getContext('2d').drawImage(source.leftCanvas,0,0);
 const ctx=overlay.getContext('2d');ctx.clearRect(0,0,overlay.width,overlay.height);
 if(regions){
  const data=ctx.createImageData(overlay.width,overlay.height);
  for(let i=0;i<regions.labels.length;i++){
   const key=labels.find(k=>AIG714_LABELS[k]===regions.labels[i]);
   if(!key)continue;
   const hex=colors[key];const rgb=[1,3,5].map(j=>parseInt(hex.slice(j,j+2),16));
   for(let ch=0;ch<3;ch++)data.data[4*i+ch]=rgb[ch];
   data.data[4*i+3]=Math.min(170,Math.round(regions.confidence[i]*.53));
  }
  const off=document.createElement('canvas');off.width=overlay.width;off.height=overlay.height;
  off.getContext('2d').putImageData(data,0,0);ctx.drawImage(off,0,0);
 }
 for(const s of seeds){
  ctx.beginPath();ctx.arc(s.x,s.y,4,0,Math.PI*2);
  ctx.fillStyle=colors[s.label];ctx.fill();ctx.lineWidth=2;
  ctx.strokeStyle='#ffffff';ctx.stroke();
 }
 seedControls.textContent='已確認 '+seeds.length+' 個像素部位錨點：'+
  seeds.map(s=>s.label+'('+s.x+','+s.y+')').join('、');
}
function attachSource(readCurrent){
 source=readCurrent();clear();
 source=readCurrent();
 if(!source?.surface||!source?.leftCanvas||!source?.sourceInfo){
  info('尚無經校正的 7.13 雙圖網格；可先看女主角照片的顏色，但不能冒稱已量測 1:1。');
  return;
 }
 if(source.leftCanvas.width!==source.imageWidth||source.leftCanvas.height!==source.imageHeight)
  throw Error('AIG714_SOURCE_IMAGE_DIMENSIONS_MISMATCH');
 preview();paintMetricDepth();info('已接回經校正的雙照毫米 XYZ。選擇女主角部位並在原照片點選真實顏色；每種色域需經你確認。');
}
async function loadSingleHeroineSource(file){
 if(!file||!['image/png','image/jpeg','image/webp'].includes(file.type)||
  file.size<100||file.size>15000000)
  throw Error('AIG714_LOCAL_RGB_SOURCE_INVALID_OR_TOO_LARGE');
 const bytes=await file.arrayBuffer();
 const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))]
  .map(v=>v.toString(16).padStart(2,'0')).join('');
 const bitmap=await createImageBitmap(new Blob([bytes],{type:file.type}),
  {imageOrientation:'from-image'});
 try{
  const originalWidth=bitmap.width,originalHeight=bitmap.height,
   approved=digest===HEROINE_SOURCE_SHA256&&
    bitmap.width===1672&&bitmap.height===941;
  if(originalWidth<32||originalHeight<32||
   originalWidth>8192||originalHeight>8192)
   throw Error('AIG714_SOURCE_IMAGE_PIXELS_OUT_OF_RANGE');
  // The user's already-approved montage is multi-scene. Crop only its
  // source-bound main heroine ROI. Other source images are never guessed
  // to have the same composition.
  const roi=approved?{x:340,y:25,width:662,height:916}:
   {x:0,y:0,width:originalWidth,height:originalHeight};
  const scale=Math.min(1,640/roi.width,480/roi.height);
  const w=Math.max(32,Math.floor(roi.width*scale)),
   h=Math.max(32,Math.floor(roi.height*scale));
  if(w*h>640*480)throw Error('AIG714_IMAGE_BUDGET_EXCEEDED');
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(bitmap,roi.x,roi.y,roi.width,roi.height,0,0,w,h);
  return {leftCanvas:canvas,imageWidth:w,imageHeight:h,surface:null,
   sourceInfo:{singleImageSha256:'sha256:'+digest,
    sourceIsApprovedHeroineCollage:approved,originalWidth,originalHeight,
    observedCropSourcePixels:roi,sampledWidth:w,sampledHeight:h,
    actualPhysicalBaselineMm:null,metricStereoDataProvided:false,
    estimatedBacksideNotGenerated:true}};
 }finally{bitmap.close();}
}
export function mountAIG714HeroineScan(readCurrent){
 if(typeof readCurrent!=='function'||!src||!overlay||!stage)
  throw Error('AIG714_HEROINE_STUDIO_ENTRY_INVALID');
 $('heroine-photo-only').addEventListener('change',async()=>{
  try{
   const input=$('heroine-photo-only');
   const candidate=await loadSingleHeroineSource(input.files?.[0]);
   source=candidate;seeds=[];regions=null;product=null;
   $('heroine-reviewed').checked=false;
   exportButton.disabled=true;$('heroine-mask-export').disabled=true;
   preview();paintMetricDepth();
   info('單張照片 RGB／型體掃描已載入'+
    (candidate.sourceInfo.sourceIsApprovedHeroineCollage?
     '：已核對原櫻花校園女主角 SHA，裁出主角來源區。':
     '：這不是已核准的女主角來源，僅作本機候選。')+
    '請選擇頭髮、臉、脖子和衣服代表色並審查遮罩；此時 Z=UNKNOWN，不會生成假 1:1。',true);
  }catch(e){info('BLOCKED：單張女主角來源讀取失敗：'+String(e.message||e));}
 });
 $('heroine-mask-export').addEventListener('click',()=>{
  if(!source||!regions||!$('heroine-reviewed').checked){
   info('BLOCKED：必須先確認本人檢查過原始 RGB 分割區域；未確認不能匯出。');
   return;
  }
  const runLength=[];
  let last=regions.labels[0],count=0;
  for(const label of regions.labels){
   if(label===last){count++;continue;}
   runLength.push([last,count]);last=label;count=1;
  }
  runLength.push([last,count]);
  const result={schema:'AIG_FASTMODEL_7_14_HEROINE_PHOTO_RGB_ONLY',
   sourceInfo:source.sourceInfo,partLabels:AIG714_LABELS,
   colorRegionCounts:regions.counts,seedPositions:regions.seeds,
   labelsRunLength:runLength,originalPixelsNotUploaded:true,
   physicallyMeasuredZ:false,metricOneToOne:false,
   actualSkinnedCharacterGLB:false,backsideUnknown:true,
   candidateHasColorSemanticsOnly:true};
  const blob=new Blob([JSON.stringify(result,null,2)],{type:'application/json'}),
   url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='AIG-FastModel-7-14-Heroine-RGB-Only-Reviewed.json';
  a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  info('已匯出女主角原圖 RGB 分區與來源證據 JSON；Z 仍未知，沒有虛構背面。',true);
 });
 const photo=$('heroine-canvas-wrap');
 photo.addEventListener('click',e=>{
  if(!source)return;
  const label=$('heroine-part').value;
  if(!labels.includes(label))return;
  const r=src.getBoundingClientRect();
  if(!r.width||!r.height)return;
  const x=Math.min(src.width-1,Math.max(0,Math.floor((e.clientX-r.left)/r.width*src.width))),
   y=Math.min(src.height-1,Math.max(0,Math.floor((e.clientY-r.top)/r.height*src.height)));
  seeds.push({label,x,y,reviewed:true});
  $('heroine-reviewed').checked=false;
  regions=null;product=null;exportButton.disabled=true;
  preview();
  info('已選取 '+label+' 的實際來源像素 ('+x+','+y+
   ')。請選取不同顏色的部位；分割結果需再檢查。');
 });
 $('heroine-clear').addEventListener('click',()=>{
  seeds=[];regions=null;product=null;exportButton.disabled=true;
  $('heroine-reviewed').checked=false;
  preview();info('已清除本輪分區錨點，原始圖片與 3D 核心保持不變。');
 });
 $('heroine-grow').addEventListener('click',()=>{
  try{
   if(!source||!seeds.length)throw Error('REVIEWED_COLOR_SEEDS_REQUIRED');
   const ctx=source.leftCanvas.getContext('2d',{willReadFrequently:true});
   const image=ctx.getImageData(0,0,src.width,src.height);
   regions=growAIG714ReviewedColorRegions(image,seeds);
   $('heroine-reviewed').checked=false;
   product=null;exportButton.disabled=true;
   $('heroine-mask-export').disabled=false;preview();
   info('已完成來源 RGB 色域延展建議；尚需審查分割邊緣，不能直接推算深度或宣稱自動語意正確。',true);
  }catch(e){info('BLOCKED：'+String(e.message||e));}
 });
 $('heroine-build').addEventListener('click',()=>{
  try{
   if(!source||!regions)throw Error('REGION_PROPOSAL_AND_STEREO_REQUIRED');
   if(!$('heroine-reviewed').checked)
    throw Error('MANUAL_SEMANTIC_REGION_APPROVAL_REQUIRED');
   const rgba=source.leftCanvas.getContext('2d',{willReadFrequently:true})
    .getImageData(0,0,source.imageWidth,source.imageHeight);
   const mesh=assembleAIG714HeroineSurface(source.surface,rgba,regions);
   product=mesh;exportButton.disabled=false;
   const proof={schema:mesh.schema,
    originalSourcePair:source.sourceInfo,
    observedVerticesMm:mesh.physicallyMeasuredVertexCount,
    observedTriangles:mesh.triangleCount,
    userReviewedSemanticPoints:seeds.length,
    semanticMeasuredVertices:mesh.semanticLabeledMeasuredVertices,
    semanticPartTriangles:mesh.partTriangles,
    regionBoundaryTriangles:mesh.boundaryTriangleCount,
    genuineMetricStereoDepth:true,
    observedSurfaceNormals:true,photoRGBNotAlbedo:true,
    hiddenBodyAndBackUnknown:true,noInventedHairRootOrBackOfHead:true,
    noFakeSkeletonOrSkinWeight:true,actualPersonIdentityUnverified:true};
   evidence.textContent=JSON.stringify(proof,null,2);
   info('已建立 '+mesh.physicallyMeasuredVertexCount+' 個帶毫米深度、RGB、部位標籤、法線與信心值的 3D 頂點。背面仍未知，已可輸出有來源標記的 GLB。',true);
  }catch(e){product=null;exportButton.disabled=true;info('BLOCKED：'+String(e.message||e));}
 });
 exportButton.addEventListener('click',async()=>{
  if(!product||!source)return;
  exportButton.disabled=true;
  let geometry=null,materials=null,tex=null;
  try{
   const p=product,n=p.positions.length/3;
   // GLTF 2.0 uses metres; one reconstructed millimetre is 0.001 GLTF units.
   const positions=new Float32Array(p.positions.length);
   for(let i=0;i<positions.length;i++)positions[i]=p.positions[i]/1000;
   geometry=new THREE.BufferGeometry();
   geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
   geometry.setAttribute('normal',new THREE.BufferAttribute(p.normals,3));
   geometry.setAttribute('uv',new THREE.BufferAttribute(p.uvs,2));
   const grouped=new Map();
   for(let i=0;i<p.indices.length;i+=3){
    const a=p.indices[i],b=p.indices[i+1],c=p.indices[i+2],
     label=p.vertexPartLabels[a]===p.vertexPartLabels[b]&&
      p.vertexPartLabels[b]===p.vertexPartLabels[c]?p.vertexPartLabels[a]:0;
    if(!grouped.has(label))grouped.set(label,[]);
    grouped.get(label).push(a,b,c);
   }
   const all=[],keys=[...grouped.keys()].sort((a,b)=>a-b);
   tex=new THREE.CanvasTexture(source.leftCanvas);
   tex.colorSpace=THREE.SRGBColorSpace;
   materials=keys.map(code=>{
    const mat=new THREE.MeshStandardMaterial({
     map:tex,roughness:1,metalness:0,side:THREE.DoubleSide
    });
    mat.name='AIG714_ObservedRGB_ReviewedRegion_'+
     (Object.keys(AIG714_LABELS).find(k=>AIG714_LABELS[k]===code)||'UNKNOWN');
    return mat;
   });
   for(let i=0;i<keys.length;i++){
    const faces=grouped.get(keys[i]);
    geometry.addGroup(all.length,faces.length,i);all.push(...faces);
   }
   geometry.setIndex(all);
   const model=new THREE.Mesh(geometry,materials);
   model.name='AIG714_Heroine_Observed_Metric_Front_Not_Full_Anatomy';
   model.userData={
    sourceLeftSHA256:p.sourceLeftSHA256,sourceRightSHA256:p.sourceRightSHA256,
    semanticRegionVertexCounts:regions.counts,
    physicalUnits:'metres_from_measured_mm',
    originalRGBNotMeasuredAlbedo:true,
    normalDerivedFromStereoTriangles:true,
    missingBacksideNotReconstructed:true,
    noRigNoSkinnedMesh:true,
    fullOneToOneFemaleBodyNotCertified:true,
    vertices:p.physicallyMeasuredVertexCount,
    triangles:p.triangleCount
   };
   const binary=await new GLTFExporter().parseAsync(model,{
    binary:true,trs:true,onlyVisible:true,maxTextureSize:1024
   });
   if(!(binary instanceof ArrayBuffer)||binary.byteLength<100)
    throw Error('INVALID_GLTF2_BINARY');
   const url=URL.createObjectURL(new Blob([binary],{type:'model/gltf-binary'}));
   const a=document.createElement('a');a.href=url;
   a.download='AIG-FastModel-7-14-Heroine-Metric-Front-RGB-Semantic.glb';
   a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
   info('已輸出真實 XYZ／RGB／部位分組的 GLB 前表面，保留實際公尺比例；未掃描到的背面沒有被生成。',true);
  }catch(e){info('BLOCKED：GLB 匯出失敗：'+String(e.message||e));}
  finally{
   geometry?.dispose();materials?.forEach(m=>m.dispose());tex?.dispose();
   exportButton.disabled=false;
  }
 });
 document.addEventListener('aig713:surface-ready',()=>attachSource(readCurrent));
 return Object.freeze({refresh:()=>attachSource(readCurrent),
  getEvidence:()=>product?{
   schema:product.schema,vertices:product.physicallyMeasuredVertexCount,
   triangles:product.triangleCount,colorsAndSemanticsReviewed:true,
   noBacksideGenerated:true
  }:null});
}
