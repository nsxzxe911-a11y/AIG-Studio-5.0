/** Real3D 3.4 automatic SOURCE-PIXEL five-tip silhouette scanner.
 * Operates entirely locally on the same 2.6 unmodified RGBA and 2.7
 * per-pixel mask: doesn't generate neural landmarks or fake 3D depth.
 * Shows five source-pixel tip points only when independently observed;
 * all other regions explicitly remain unverified.
 */
import {AIG34_SCHEMA,AIG34_GROUP_CLASSES,
 detectAIG34FiveDigitContours} from './aig-photo-digit-silhouette-3-4.mjs';
const $=id=>document.getElementById(id);
export function installAIG34PhotoDigitPanel({
 getPhoto,getSegmentation,onApplied=()=>{}
}={}){
 if(typeof getPhoto!=='function'||typeof getSegmentation!=='function'||
  !$('digits34-detect')||!$('digits34-photo-preview'))
  throw Error('AIG34_REAL_PHOTO_UI_REQUIRED');
 const state={sourceSha256:null,results:[],applied:[],
  sourceDimensions:null,originalPhotoChanged:false};
 const canvas=$('digits34-photo-preview'),ctx=canvas.getContext('2d',{
  willReadFrequently:false
 });
 const status=(v,bad=false)=>{
  $('digits34-status').textContent=(bad?'BLOCKED：':'')+v;
  $('digits34-status').style.color=bad?'#ffd1a3':'#b2f5dd';
 };
 const source=()=>{
  const img=getPhoto(),seg=getSegmentation();
  if(!img?.sha||!img.original||
   !seg?.segmentation?.labels||
   seg.sha!==img.sha||seg.width!==img.width||
   seg.height!==img.height||
   img.original.data.length!==img.width*img.height*4||
   seg.segmentation.labels.length!==img.width*img.height)
   throw Error('來源照片 SHA 和 2.7 已分割手腳遮罩不一致；請先完成真照片分割');
  return {img,seg};
 };
 const proof=()=>{
  $('digits34-proof').textContent=JSON.stringify({
   schema:AIG34_SCHEMA,sourceSha256:state.sourceSha256,
   actualSourceSize:state.sourceDimensions,
   visiblyVerifiedFiveDigitGroups:state.results.filter(r=>
    r.safeForGeometryConstraint).length,
   actualSource2DTipPixels:state.results.reduce((n,r)=>
    n+r.independentVisibleTips,0),
   perGroup:state.results.map(r=>({
    group:r.group,status:r.status,
    sourceBoundingBox:r.sourceBoundingBox,
    distinctActualTips:r.independentVisibleTips,
    observedTips:r.tips,
    physicalDepthMeasured:false,
    trueIndividualFingerIdentityProven:false
   })),
   active3DSilhouetteConstraintGroups:state.applied.length,
   sourcePhotoAndOriginal3DUnchanged:true,
   automaticSemanticMLInference:false,
   sourceColourActuallyReadFromRGBA:true,
   unresolvedGroupsNotAutoFabricated:true,
   realFull3D1to1Verified:false,
   photorealisticHandsFeetCertified:false,
   originalGLBAndCNCPreserved:true,
   releaseAllowed:false
  },null,2);
 };
 const draw=()=>{
  const img=getPhoto(),chosen=$('digits34-view').value;
  if(!img?.original||!img.sha){
   canvas.width=640;canvas.height=420;
   ctx.clearRect(0,0,canvas.width,canvas.height);return;
  }
  if(img.width!==canvas.width||img.height!==canvas.height){
   canvas.width=img.width;canvas.height=img.height;
  }
  ctx.putImageData(img.original,0,0);
  const r=state.results.find(r=>r.group===chosen&&
   r.sourceSha256===img.sha);
  if(!r?.safeForGeometryConstraint)return;
  ctx.save();ctx.lineWidth=Math.max(1.5,img.width/350);
  ctx.strokeStyle='#00ecce';
  const box=r.sourceBoundingBox;
  ctx.strokeRect(box[0],box[1],box[2]-box[0],box[3]-box[1]);
  for(const p of r.tips){
   const [x,y]=p.sourcePixelTip;
   ctx.beginPath();ctx.arc(x,y,Math.max(3,img.width/200),0,Math.PI*2);
   ctx.stroke();
   ctx.fillStyle='#ffcb7b';ctx.fillText(String(p.slot+1),x+6,y-4);
  }
  ctx.restore();
 };
 const clear=()=>{
  state.results=[];state.applied=[];
  state.sourceSha256=null;state.sourceDimensions=null;
  state.originalPhotoChanged=true;
  draw();proof();
 };
 $('digits34-detect').addEventListener('click',()=>{
  try{
   const {img,seg}=source();
   // Source SHA is checked in the function, not inferred from filename.
   state.results=Object.keys(AIG34_GROUP_CLASSES).map(group=>
    detectAIG34FiveDigitContours({
     width:img.width,height:img.height,
     pixels:img.original.data,labels:seg.segmentation.labels,
     sourceSha256:img.sha,group
    }));
   state.sourceSha256=img.sha;
   state.sourceDimensions=[img.width,img.height];
   state.applied=[];state.originalPhotoChanged=false;
   draw();proof();
   const valid=state.results.filter(r=>r.safeForGeometryConstraint);
   status('真實照片自動掃描完成：'+valid.length+
    '/4 組可見五個分離的指尖／趾尖；'+
    (valid.length*5)+' 個實際有 SHA 的 2D 像素尖端。'+
    '其餘組別未證實，不會假造。確認來源後才可按 02 接入 SDF。');
  }catch(e){status(e.message,true)}
 });
 $('digits34-apply').addEventListener('click',()=>{
  try{
   const {img,seg}=source();
   if(!state.results.length||state.sourceSha256!==img.sha)
    throw Error('3.4 沒有目前照片 SHA 的有效自動掃描結果');
   const valid=state.results.filter(r=>r.safeForGeometryConstraint);
   if(!valid.length)
    throw Error('四組來源都沒有可證明的五個分離指趾尖端；原 3D 不更動');
   state.applied=[...valid];proof();
   const applied=onApplied();
   if(applied?.status==='APPLIED_TO_ACTUAL_RENDERER')
    status('已真正接入 '+applied.appliedTips+
     ' 個來源照片 XY 指趾輪廓到執行中的 3.3；深度與物理尺寸仍未量測。');
   else status('來源照片有 '+(valid.length*5)+
    ' 個指趾 XY 尖端，已保存待接入；請先建立 3.0／3.3 3D 曲面再生效。');
  }catch(e){state.applied=[];proof();status(e.message,true)}
 });
 $('digits34-clear').addEventListener('click',()=>{
  clear();
  try{onApplied()}catch(e){status(e.message,true);return}
  status('只清除 3.4 來源輪廓校正，原照片、3.0 人體與 3.1/3.2 關節保留。');
 });
 $('digits34-view').addEventListener('change',draw);
 $('photo23-source').addEventListener('change',()=>{
  clear();
  try{onApplied()}catch(e){status(e.message,true);return}
  status('更換照片已使 3.4 舊 SHA 輪廓失效；無覆蓋原素材。');
 });
 $('vision27-run').addEventListener('click',()=>{
  clear();
  try{onApplied()}catch(e){status(e.message,true);return}
  status('2.7 來源像素遮罩更新，先重新執行 3.4 自動掃描。');
 });
 $('vision27-clear').addEventListener('click',()=>{
  clear();
  try{onApplied()}catch(e){status(e.message,true);return}
  status('2.7 分割已清空，3.4 來源指趾輪廓同步失效。');
 });
 proof();
 return {
  get active(){
   const img=getPhoto();
   return img?.sha&&img.sha===state.sourceSha256?
    [...state.applied]:[];
  },
  get evidence(){return state.results},
  clear
 };
}
