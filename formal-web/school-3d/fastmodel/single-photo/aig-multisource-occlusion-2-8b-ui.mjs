/**
 * Real3D 2.8-B. Genuine multiple SHA-distinct reviewed photo queues.
 * Physically existing visible hair/neck boundaries are 2D observations, not
 * guessed anatomy; the existing 2.8 learner receives true learned weights.
 */
import {addAIG28BReviewedSource,auditAIG28BVisibleBoundary,
 trainAIG28BMultiPhoto,evaluateAIG28BHoldout,AIG28B_SCHEMA}
 from './aig-multisource-occlusion-2-8b.mjs';
import {fingerprintAIG28Model} from './aig-local-learner-2-8.mjs';
const $=id=>document.getElementById(id);
export function installAIG28BMultiSource({
 getImage,getSegmentation,getLearner
}={}){
 if(typeof getImage!=='function'||typeof getSegmentation!=='function'||
  typeof getLearner!=='function'||!$('vision28b-add'))
  throw Error('AIG28B_FORMAL_SOURCE_UI_CONTRACT_REQUIRED');
 const state={reviewed:[],occlusion:null,evaluation:null};
 const status=(msg,bad=false)=>{
  $('vision28b-status').textContent=(bad?'BLOCKED：':'')+msg;
  $('vision28b-status').style.color=bad?'#ffca91':'#aef0df';
 };
 const proof=()=>{
  const model=getLearner()?.model;
  $('vision28b-proof').textContent=JSON.stringify({
   schema:AIG28B_SCHEMA,
   reviewedTrainingSourceCount:state.reviewed.length,
   reviewedSourceSHA:state.reviewed.map(x=>x.sourceSha256),
   classIDs:state.reviewed[0]?.classIds??null,
   visibleSourcePixelCounts:state.reviewed.map(x=>x.reviewedPixelCounts),
   multiSourceModelActuallyTrained:model?.reviewedMultiSourceTraining??false,
   trainedPhotoCount:model?.reviewedPhotoCount??0,
   visibleHairNeckBoundary:state.occlusion,
   newSourceIndependentEvaluation:state.evaluation,
   originalPhotosAndGLBUnmodified:true,
   fullInvisibleNeckDepthMeasured:false,
   naturalPhotoGeneralizationCertified:false
  },null,2);
 };
 const sample=()=>{
  const a=getImage(),s=getSegmentation();
  if(!a?.sha||!a.original||a.original.data.length!==a.width*a.height*4||
   !s?.segmentation||s.sha!==a.sha||s.width!==a.width||
   s.height!==a.height||!$('vision28-reviewed').checked||
   s.segmentation.unresolvedBoundaryPixels>0||
   s.segmentation.uncertainWorkCells>0)
   throw Error('請先從相同來源照片 2.6 SHA／2.7 真像素分割逐區人工審核後勾選；未知邊界不能當真值');
  return {
   entry:{
    sourceSha256:a.sha,width:a.width,height:a.height,
    pixels:a.original.data,labels:s.segmentation.labels,
    humanReviewed:true,
    humanReviewStatement:'VISIBLE_SOURCE_PIXELS_REVIEWED_NOT_HIDDEN_GEOMETRY'
   },
   classes:[0,...s.segmentation.regions.map(x=>x.id)].sort((x,y)=>x-y)
  };
 };
 $('vision28b-add').addEventListener('click',()=>{
  try{
   const {entry,classes}=sample();
   state.reviewed=addAIG28BReviewedSource(state.reviewed,entry,{
    classIds:classes
   });
   state.evaluation=null;proof();
   status('已收集來源 SHA 不重複的人工核對照片 '+state.reviewed.length+
    '/8；請從 2.6 換另一張照片，再由 2.7 標註審核後繼續加入。');
  }catch(e){status(String(e.message||e),true)}
 });
 $('vision28b-clear').addEventListener('click',()=>{
  state.reviewed=[];state.occlusion=null;state.evaluation=null;
  proof();status('本輪多照片暫存已清除；原照片、已保存模型和 3D 世界未刪除。');
 });
 $('vision28b-audit').addEventListener('click',()=>{
  try{
   const a=getImage(),s=getSegmentation();
   if(!a?.sha||!s?.segmentation||s.sha!==a.sha)
    throw Error('先在 2.7 建立與現有原圖 SHA 相同的像素遮罩');
   state.occlusion=auditAIG28BVisibleBoundary({
    labels:s.segmentation.labels,width:a.width,height:a.height,
    sourceSha256:a.sha
   });
   proof();status('真正可見的髮頸接觸像素 '+state.occlusion.observedHairNeckContactPixels+
    '；未知像素 '+state.occlusion.unknownPixels+
    '；看不到的頸部 3D 幾何仍保持 UNKNOWN。');
  }catch(e){status(String(e.message||e),true)}
 });
 $('vision28b-train').addEventListener('click',async()=>{
  try{
   if(state.reviewed.length<2)
    throw Error('至少需要兩張獨立 SHA 且人工審核的照片');
   const learner=getLearner();
   if(typeof learner?.applyReviewedModel!=='function')
    throw Error('既有 2.8 模型保存與推論核心尚未就緒');
   status('正在以多張來源照片的真實審核 RGBA 最佳化權重…');
   await new Promise(resolve=>setTimeout(resolve,0));
   const model=trainAIG28BMultiPhoto(state.reviewed,{
    epochs:Number($('vision28-epochs').value),learningRate:.4
   });
   const digest=await fingerprintAIG28Model(model);
   learner.applyReviewedModel(model,digest);
   state.evaluation=null;proof();
   status('真正多照片訓練完成 '+model.reviewedPhotoCount+
    ' 份來源，loss '+model.trainingLossInitial+' → '+model.trainingLossFinal+
    '；權重 SHA '+digest.slice(0,24)+
    '…。可用原 2.8「自動辨識」及「保存權重」鍵操作。');
  }catch(e){status(String(e.message||e),true)}
 });
 $('vision28b-evaluate').addEventListener('click',()=>{
  try{
   const model=getLearner()?.model;
   if(!model?.reviewedMultiSourceTraining)
    throw Error('先使用至少兩張已審核照片進行真正多來源訓練');
   const {entry}=sample();
   const report=evaluateAIG28BHoldout(model,entry,{
    confidenceThreshold:Number($('vision28-threshold').value),
    minClassIoU:.6,maxAbstention:.25
   });
   state.evaluation=report;proof();
   const detail=report.perClassIoU.map(x=>x.className+':'+x.IoU).join('、');
   status('獨立第三來源 IoU='+report.meanIoU+'（'+detail+
    '）；拒判 '+(report.abstentionFraction*100).toFixed(2)+'%；'+
    (report.thresholdGatePass?'來源樣本 Gate PASS':
     '未達標，不可核准辨識')+
    '。此數據不代表自然照片通用模型。',!report.thresholdGatePass);
  }catch(e){status(String(e.message||e),true)}
 });
 proof();return state;
}
