/** Real3D 2.7: one working source photo, user-class seeds, real pixel masks.
 * Original photo, 2.6 metric/colour, world GLBs and movies never modified.
 */
import {segmentAIG27Pixels,AIG27_SCHEMA} from './aig-seeded-segmentation-2-7.mjs';
import {inspectAIG26SemanticLabels} from './aig-vision-metric-color-2-6.mjs';
const $=id=>document.getElementById(id);
const palette={
 0:[115,125,145],1:[38,190,238],2:[255,180,102],3:[185,90,229],
 4:[64,231,129],14:[244,114,146],16:[255,181,55],
 17:[62,210,112],18:[44,180,90],19:[237,181,64],
 20:[159,183,223],21:[255,110,93],24:[130,175,114]
};
const why=e=>String(e?.message||e);
export function installAIG27SegmentationPanel({getSourceState,getLibrary}={}){
 const canvas=$('vision27-canvas'),ctx=canvas?.getContext('2d');
 if(!ctx||typeof getSourceState!=='function'||
  typeof getLibrary!=='function')throw Error('AIG27_FORMAL_SEGMENTATION_UI_REQUIRED');
 const state={sha:null,source:null,original:null,width:0,height:0,
  seeds:[],segmentation:null,classificationProof:null};
 const status=(s,bad=false)=>{
  $('vision27-status').textContent=(bad?'BLOCKED：':'')+s;
  $('vision27-status').style.color=bad?'#ffca92':'#acf1e6';
 };
 const verifySource=()=>{
  const source=getSourceState();
  if(!source?.sha||!source.original||source.sha!==state.sha||
   source.width!==state.width||source.height!==state.height)
   throw Error('照片已更換或尚未通過 2.6 SHA；請重新按 01');
 };
 const proof=()=>{
  $('vision27-proof').textContent=JSON.stringify({
   schema:AIG27_SCHEMA,sourceImageSHA256:state.sha,
   imageSize:[state.width,state.height],
   operatorSeedCount:state.seeds.length,
   operatorSeedPositions:state.seeds,
   visible2DRegions:state.segmentation?.regions??null,
   workGrid:state.segmentation?.workspaceGrid??null,
   encodedRLEEntries:state.segmentation?.runs.length??null,
   unresolvedBoundaryPixels:state.segmentation?.unresolvedBoundaryPixels??null,
   externallyAuditedClassification:state.classificationProof?.proofStatus??null,
   trainedSemanticNeuralNetworkExecuted:false,
   realSourceRGBUsed:state.segmentation?.actualInputPixelsProcessed??false,
   hiddenBodyOrHairUnderOcclusionRecovered:false,
   pixelMasksHumanReviewed:false,
   originalPhotoMutated:false,
   physicallyMeasured3D1To1:false,
   releaseAllowed:false
  },null,2);
 };
 const draw=()=>{
  if(!state.original)return;
  const base=state.original;
  if(state.segmentation){
   const result=state.segmentation,rgba=new Uint8ClampedArray(base.data);
   for(let i=0;i<result.labels.length;i++){
    const cls=result.labels[i];
    if(!cls)continue;
    const color=palette[cls]||[180,200,214],j=i*4;
    for(let k=0;k<3;k++)rgba[j+k]=Math.round(
     base.data[j+k]*.60+color[k]*.40);
   }
   ctx.putImageData(new ImageData(rgba,state.width,state.height),0,0);
  }else ctx.putImageData(base,0,0);
  ctx.save();ctx.lineWidth=Math.max(2,state.width/400);
  for(const seed of state.seeds){
   const [r,g,b]=palette[seed.labelId]||palette[0];
   ctx.strokeStyle='#030a10';
   ctx.fillStyle='rgb('+r+','+g+','+b+')';
   ctx.beginPath();ctx.arc(seed.x,seed.y,Math.max(4,state.width/180),
    0,Math.PI*2);
   ctx.fill();ctx.stroke();
  }
  ctx.restore();
 };
 const clear=()=>{
  state.sha=null;state.source=null;state.original=null;
  state.seeds=[];state.segmentation=null;state.classificationProof=null;
  state.width=0;state.height=0;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  proof();
 };
 $('photo23-source').addEventListener('change',()=>{
  clear();status('來源照片已變更；2.7 遮罩失效，原模型與其他結果均未刪除。');
 });
 $('vision27-sync').addEventListener('click',()=>{
  try{
   const p=getSourceState();
   if(!p?.sha||!p.original||p.width<128||p.height<128||
    p.width*p.height>2_000_000)
    throw Error('請先在 2.6 點「讀取同一張原照片」');
   state.sha=p.sha;state.source=p;state.original=p.original;
   state.width=p.width;state.height=p.height;
   state.seeds=[];state.segmentation=null;state.classificationProof=null;
   canvas.width=p.width;canvas.height=p.height;
   draw();proof();
   status('已接回與 2.6 相同的來源 SHA '+p.sha.slice(0,22)+
    '…；請先標背景，再標頭髮／頸部／衣物等實際可見區域。');
  }catch(e){status(why(e),true)}
 });
 canvas.addEventListener('click',event=>{
  try{
   verifySource();
   const rect=canvas.getBoundingClientRect();
   if(rect.width<=0||rect.height<=0)throw Error('標註畫布不可用');
   const x=(event.clientX-rect.left)*state.width/rect.width,
    y=(event.clientY-rect.top)*state.height/rect.height,
    id=Number($('vision27-class').value);
   if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||y<0||
    x>=state.width||y>=state.height)throw Error('標記位於來源照片範圍外');
   if(state.seeds.length>=48)throw Error('種子超過 48 個，請清除或先執行');
   state.seeds.push({x,y,labelId:id});
   state.segmentation=null;state.classificationProof=null;
   draw();proof();
   status('真正來源像素種子 '+state.seeds.length+
    ' 個；目前類別 ID '+id+'。未產生假自動辨識結論。');
  }catch(e){status(why(e),true)}
 });
 $('vision27-clear').addEventListener('click',()=>{
  state.seeds=[];state.segmentation=null;state.classificationProof=null;
  draw();proof();status('僅清除 2.7 種子／遮罩；2.6 原圖、骨架與世界保持。');
 });
 $('vision27-run').addEventListener('click',()=>{
  try{
   verifySource();
   const result=segmentAIG27Pixels({
    pixels:state.original.data,width:state.width,height:state.height,
    sourceSha256:state.sha,seeds:state.seeds,
    maxWorkSide:Number($('vision27-resolution').value)
   });
   // Shared 2.6 evidence checker: never forge a neural-model SHA or
   // confidence score. 0 means not a trained semantic probability.
   const audited=inspectAIG26SemanticLabels({
    width:result.width,height:result.height,
    sourceSha256:state.sha,labels:result.labels,
    producer:'UNVERIFIED',modelSha256:null,humanReviewed:false,
    regions:result.regions.map(r=>({
     id:r.id,className:r.className,confidence:0
    }))
   });
   state.segmentation=result;state.classificationProof=audited;
   draw();proof();
   status('2.7 真像素分割完成：'+result.regions.length+
    ' 個已選標籤、'+result.runs.length+' 段 RLE、'+
    result.unresolvedBoundaryPixels+
    ' 像素保持背景／不確定；未使用假 AI 自動分類。');
  }catch(e){
   state.segmentation=null;state.classificationProof=null;
   draw();proof();status(why(e),true)
  }
 });
 $('vision27-save').addEventListener('click',async()=>{
  try{
   verifySource();
   const actual=state.segmentation;
   if(!actual||!state.classificationProof)
    throw Error('先產生並驗證來源像素遮罩');
   const vault=getLibrary();
   if(!vault?.importBlob)throw Error('本機素材庫未就緒');
   const record={
    schema:AIG27_SCHEMA,sourceSha256:state.sha,
    image:[actual.width,actual.height],regions:actual.regions,
    seeds:state.seeds,encodedMaskRLE:actual.runs,
    unresolvedBoundaryPixels:actual.unresolvedBoundaryPixels,
    sourceMaskClassAudit:state.classificationProof,
    producer:'SOURCE_PIXEL_USER_SEEDED_NON_ML',
    trainedSemanticModelInference:false,
    labelsHumanReviewed:false,sourcePhotoAndOriginalGLBUnchanged:true,
    hidden3DTopologyNotReconstructed:true,releaseAllowed:false
   };
   const blob=new Blob([JSON.stringify(record)],{type:'application/json'});
   const saved=await vault.importBlob(blob,{
    category:'scene',title:'Real3D 2.7 真像素頭髮頸部衣物來源分割',
    tags:['Real3D27','真像素','來源遮罩','幾何預備','防假AI'],
    source:'GENERATED_DERIVED',modelAccuracy:'NOT_VERIFIED',
    coordinateUnits:'UNKNOWN',derivedFrom:state.sha
   });
   const readback=await vault.get(saved.id,{includePayload:true});
   if(!readback?.blob||readback.asset?.sha256!==saved.sha256)
    throw Error('AIG27_VAULT_ORIGINAL_SOURCE_MASK_SHA_MISMATCH');
   status('真正 2D 像素遮罩已獨立保存並 SHA 回讀：'+saved.sha256+
    '。不是完整 3D 身體認證。');
  }catch(e){status(why(e),true)}
 });
 proof();return state;
}
