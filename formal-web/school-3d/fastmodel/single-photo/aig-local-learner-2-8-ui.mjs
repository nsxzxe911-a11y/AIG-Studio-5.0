/** Real3D 2.8: first party local supervised training and source-safe inference.
 * Does not silently promote manually seeded 2.7 into automated semantic truth.
 */
import {trainAIG28PixelModel,inferAIG28Pixels,assertAIG28Model,
 fingerprintAIG28Model,evaluateAIG28IndependentSource,AIG28_SCHEMA}
 from './aig-local-learner-2-8.mjs';
const $=id=>document.getElementById(id);
const rgb={0:[130,135,145],1:[55,188,246],2:[243,191,112],
 3:[184,90,242],4:[61,222,118],14:[245,119,144],
 16:[245,176,93],17:[77,217,119],18:[54,188,107],
 19:[230,185,99],20:[148,164,214],21:[238,98,94]};
export function installAIG28LocalLearning({getImage,getSegmentation,getLibrary}={}){
 const canvas=$('vision28-preview'),ctx=canvas?.getContext('2d');
 if(!ctx||typeof getImage!=='function'||
  typeof getSegmentation!=='function'||typeof getLibrary!=='function')
  throw Error('AIG28_UI_SOURCE_CONTRACT_REQUIRED');
 const state={model:null,modelSha256:null,inference:null,evaluation:null,
  inferenceSource:null,lastSave:null};
 const status=(message,bad=false)=>{
  $('vision28-status').textContent=(bad?'BLOCKED：':'')+message;
  $('vision28-status').style.color=bad?'#ffc48e':'#b2efe7';
 };
 const proof=()=>{
  const m=state.model,p=state.inference;
  $('vision28-proof').textContent=JSON.stringify({
   schema:AIG28_SCHEMA,modelSha256:state.modelSha256,
   trainedClassIds:m?.classIds??null,
   trainedClasses:m?.classes??null,
   originalReviewedSourceSHA:m?.trainSourceSha256??null,
   actualLearnedWeights:m?.actualOptimizedWeightCount??0,
   trainingLossInitial:m?.trainingLossInitial??null,
   trainingLossFinal:m?.trainingLossFinal??null,
   newSourcePhotoSHA:state.inferenceSource,
   inferenceExecuted:p?.automaticLearnedPixelInferenceExecuted??false,
   sourceDifferentFromTraining:p?.inferencePhotoDifferentFromTraining??false,
   inferenceAbstentions:p?.unknownPixels??null,
   inferenceUnknownFraction:p?.unknownFraction??null,
   classPixelCounts:p?.pixelCounts??null,
   independentReviewIoU:state.evaluation?.perClassIoU??null,
   independentlyEvaluatedMeanIoU:state.evaluation?.meanIoU??null,
   trainedNeuralSemanticNetwork:false,
   generalSemanticIdentityCertified:false,
   full3DBodyPhysicalScaleCertified:false,
   oldSourcePhotoOrGLBOverwritten:false,
   currentModelSavedInVault:state.lastSave,
   releaseAllowed:false
  },null,2);
 };
 const image=()=>{
  const a=getImage();
  if(!a?.sha||!a?.original||
   a.original.data.length!==a.width*a.height*4)
   throw Error('請先在 2.6 讀取來源照片並通過 SHA 校驗');
  return a;
 };
 const reference=()=>{
  const p=image(),s=getSegmentation();
  if(!s?.segmentation||s.sha!==p.sha||
   s.width!==p.width||s.height!==p.height||
   s.segmentation.unresolvedBoundaryPixels>0||
   !$('vision28-reviewed').checked)
   throw Error('先以 2.7 完成來源相符的遮罩、確認無未知邊界並逐區人工審核後勾選');
  return {width:p.width,height:p.height,sourceSha256:p.sha,
   pixels:p.original.data,labels:s.segmentation.labels,
   humanReviewed:true};
 };
 const display=()=>{
  const p=image(),w=p.width,h=p.height;
  canvas.width=w;canvas.height=h;
  const output=new Uint8ClampedArray(p.original.data);
  if(state.inference&&state.inferenceSource===p.sha){
   const result=state.inference;
   for(let i=0;i<w*h;i++){
    const id=result.labels[i],k=i*4;
    if(id===255){output[k]=95;output[k+1]=95;
     output[k+2]=95;continue}
    if(id===0)continue;
    const col=rgb[id]||[130,190,213];
    for(let ch=0;ch<3;ch++)
     output[k+ch]=Math.round(output[k+ch]*.55+col[ch]*.45);
   }
  }
  ctx.putImageData(new ImageData(output,w,h),0,0);
 };
 $('photo23-source').addEventListener('change',()=>{
  state.inference=null;state.inferenceSource=null;
  state.evaluation=null;$('vision28-reviewed').checked=false;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  proof();status('照片已更換；已保存的訓練模型權重仍保留，舊推論已失效。');
 });
 $('vision28-train').addEventListener('click',async()=>{
  try{
   const e=reference(),s=getSegmentation();
   if(s.segmentation.regions.some(r=>r.pixelCount<20))
    throw Error('人工標記某類別像素不足 20 點，不能訓練');
   const ids=[0,...s.segmentation.regions.map(r=>r.id)].sort((a,b)=>a-b);
   status('正在使用真正來源 RGBA／已人工審核遮罩訓練新權重…');
   await new Promise(resolve=>setTimeout(resolve,0));
   const learned=trainAIG28PixelModel({examples:[e],classIds:ids,
    epochs:Number($('vision28-epochs').value)});
   const digest=await fingerprintAIG28Model(learned);
   state.model=learned;state.modelSha256=digest;
   state.inference=null;state.inferenceSource=null;state.evaluation=null;
   state.lastSave=null;proof();
   status('第一方本機模型已真正訓練 '+learned.actualOptimizedWeightCount+
    ' 個權重；loss '+learned.trainingLossInitial+' → '+
    learned.trainingLossFinal+'；'+digest.slice(0,22)+
    '…。仍未做獨立跨照片準度驗證。');
  }catch(e){status(String(e.message||e),true)}
 });
 $('vision28-infer').addEventListener('click',async()=>{
  try{
   const p=image();if(!state.model||!state.modelSha256)
    throw Error('請先使用已人工審核的遮罩訓練或匯入本機模型');
   const actual=await fingerprintAIG28Model(state.model);
   if(actual!==state.modelSha256)throw Error('模型權重 SHA 已變，不准推論');
   status('正在以來源模型的真正權重執行本機逐像素推論…');
   await new Promise(resolve=>setTimeout(resolve,0));
   const output=inferAIG28Pixels({model:state.model,
    sourceSha256:p.sha,width:p.width,height:p.height,
    pixels:p.original.data,
    confidenceThreshold:Number($('vision28-threshold').value)});
   state.inference=output;state.inferenceSource=p.sha;
   state.evaluation=null;display();proof();
   status('已執行學習後的自動像素分類；未知／拒判 '+
    output.unknownPixels+' 像素 ('+
    (output.unknownFraction*100).toFixed(2)+'%)。'+
    (output.inferencePhotoDifferentFromTraining?
     '新照片與訓練來源不同，仍須獨立人工標籤驗證 IoU。':
     '目前仍是訓練照片，不能視為泛化準度證據。'));
  }catch(e){status(String(e.message||e),true)}
 });
 $('vision28-evaluate').addEventListener('click',()=>{
  try{
   if(!state.model)throw Error('先載入真正訓練權重');
   const e=reference();
   if(state.model.trainSourceSha256.includes(e.sourceSha256))
    throw Error('必須使用不同於訓練來源、人工重新審核的另一張照片');
   const report=evaluateAIG28IndependentSource({
    model:state.model,...e,reviewedLabels:e.labels,
    confidenceThreshold:Number($('vision28-threshold').value)});
   state.evaluation=report;proof();
   status('新來源獨立像素 IoU='+report.meanIoU+
    '，已保存每個類別與未知區域；不等於通用語意模型通過實景驗收。');
  }catch(e){status(String(e.message||e),true)}
 });
 const refreshSaved=async()=>{
  const vault=getLibrary();
  if(!vault?.list)throw Error('本機素材庫尚未就緒');
  const results=await vault.list({category:'scene',limit:100});
  const own=results.filter(x=>Array.isArray(x.tags)&&
   x.tags.includes('Real3D28')&&x.mime==='application/json');
  const dropdown=$('vision28-saved-model'),previous=dropdown.value;
  dropdown.replaceChildren(new Option('請選本機已訓練模型', ''));
  for(const item of own)dropdown.add(
   new Option(item.title+'｜'+item.sha256.slice(0,22)+'…',item.id));
  if(own.some(item=>item.id===previous))dropdown.value=previous;
  return own.length;
 };
 $('vision28-refresh').addEventListener('click',async()=>{
  try{
   const count=await refreshSaved();
   status('本機找到 '+count+' 份 2.8 模型；使用前仍須重新驗證來源與權重 SHA。');
  }catch(e){status(String(e.message||e),true)}
 });
 $('vision28-restore').addEventListener('click',async()=>{
  try{
   const id=$('vision28-saved-model').value,vault=getLibrary();
   if(!id||!vault?.get)throw Error('請選已保存模型，並確認本機素材庫可使用');
   const verified=await vault.get(id,{includePayload:true});
   if(!verified?.blob||verified.asset?.mime!=='application/json')
    throw Error('已保存模型來源 JSON 遺失，沒有假替代權重');
   const json=JSON.parse(await verified.blob.text());
   assertAIG28Model(json.model);
   const actual=await fingerprintAIG28Model(json.model);
   if(json.modelSha256!==actual)throw Error('已保存模型權重 SHA 與來源證據不符');
   state.model=json.model;state.modelSha256=actual;
   state.inference=null;state.inferenceSource=null;
   state.evaluation=null;state.lastSave={id,assetSha256:verified.asset.sha256};
   proof();status('已從本機素材庫驗證重載真正模型權重：'+
    actual.slice(0,22)+'…。可使用目前不同來源照片進行自動像素推論。');
  }catch(e){status(String(e.message||e),true)}
 });
 $('vision28-save').addEventListener('click',async()=>{
  try{
   if(!state.model||!state.modelSha256)throw Error('沒有可保存的已訓練模型');
   const sha=await fingerprintAIG28Model(state.model);
   if(sha!==state.modelSha256)throw Error('權重 SHA 改動，保存遭拒');
   const vault=getLibrary();if(!vault?.importBlob)throw Error('本機素材庫未就緒');
   const blob=new Blob([JSON.stringify({
    model:state.model,modelSha256:sha
   })],{type:'application/json'});
   const saved=await vault.importBlob(blob,{
    category:'scene',title:'Real3D 2.8 第一方已訓練本機辨識模型',
    tags:['Real3D28','本機訓練','真權重SHA','來源審核'],
    source:'GENERATED_DERIVED',modelAccuracy:'NOT_VERIFIED',
    coordinateUnits:'UNKNOWN',
    derivedFrom:state.model.trainSourceSha256[0]
   });
   const back=await vault.get(saved.id,{includePayload:true});
   if(!back?.blob||back.asset?.sha256!==saved.sha256)
    throw Error('模型權重檔保存回讀 SHA 不一致');
   const json=JSON.parse(await back.blob.text());
   if(await fingerprintAIG28Model(json.model)!==state.modelSha256||
    json.modelSha256!==state.modelSha256)
    throw Error('模型回讀權重 SHA 不一致');
   state.lastSave={id:saved.id,assetSha256:saved.sha256};
   await refreshSaved();
   $('vision28-saved-model').value=saved.id;
   proof();status('模型原始權重已另存本機素材庫並通過 SHA 回讀：'+saved.sha256);
  }catch(e){status(String(e.message||e),true)}
 });
 $('vision28-import').addEventListener('click',async()=>{
  try{
   const file=$('vision28-model-file').files?.[0];
   if(!file||file.size<100||file.size>1024*1024||!/\.json$/i.test(file.name))
    throw Error('請提供獨立保存的 1MiB 以下模型 JSON');
   const saved=JSON.parse(await file.text());
   assertAIG28Model(saved.model);
   const actual=await fingerprintAIG28Model(saved.model);
   if(saved.modelSha256!==actual)throw Error('本機模型權重 SHA 不符');
   state.model=saved.model;state.modelSha256=actual;
   state.inference=null;state.inferenceSource=null;
   state.evaluation=null;state.lastSave=null;
   proof();status('第一方已訓練模型來源與權重 SHA 驗證成功；可推論新照片。');
  }catch(e){status(String(e.message||e),true)}
 });
 proof();
 // During boot the vault opens asynchronously; refresh after init without
 // turning a transient closed vault into a permanent page failure.
 const warmup=()=>getLibrary()?.list?refreshSaved().catch(()=>{}):null;
 // 2.8-B is an extension of this exact original model session, not a
 // competing fake model; original infer/save/import callbacks remain intact.
 state.applyReviewedModel=(model,digest)=>{
  assertAIG28Model(model);
  if(!model.reviewedMultiSourceTraining||typeof digest!=='string'||
   !/^sha256:[a-f0-9]{64}$/.test(digest))
   throw Error('AIG28B_REVIEWED_MULTI_SOURCE_MODEL_REQUIRED');
  state.model=model;state.modelSha256=digest;
  state.inference=null;state.inferenceSource=null;
  state.evaluation=null;state.lastSave=null;
  proof();
 };
 warmup();return state;
}
