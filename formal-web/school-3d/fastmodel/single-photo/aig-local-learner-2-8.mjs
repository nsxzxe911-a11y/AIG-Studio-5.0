/**
 * AIG Real3D 2.8-A — first-party REAL supervised local ML.
 * Deterministic multiclass softmax regression; learned weights originate only
 * in human-REVIEWED source photo/mask pairs. No phantom pretrained weights,
 * no face identity recognition and no 3D depth synthesis.
 *
 * Inference on another image is automatic. Pixel colour/position statistics
 * are not a universal semantic understanding model. Unknown confidence stays
 * UNKNOWN, not fabricated class certainty. Independent accuracy needs a
 * different source photo, never train/test leakage.
 */
import {AIG26_CLASSES} from './aig-vision-metric-color-2-6.mjs';
export const AIG28_SCHEMA='AIG_REAL3D_2_8_LOCAL_SUPERVISED_PIXEL_MODEL';
const F=9,MAX_PIXELS=2_000_000,MAX_EXAMPLES=8,MAX_CLASSES=8;
const fail=x=>{throw Error('AIG28_'+x)};
const sha=x=>typeof x==='string'&&/^sha256:[0-9a-f]{64}$/.test(x);
const int=x=>Number.isSafeInteger(x);
const maskImage=e=>e&&sha(e.sourceSha256)&&int(e.width)&&int(e.height)&&
 e.width>=128&&e.height>=128&&e.width*e.height<=MAX_PIXELS&&
 (e.pixels instanceof Uint8Array||e.pixels instanceof Uint8ClampedArray)&&
 e.pixels.length===e.width*e.height*4&&
 e.labels instanceof Uint8Array&&e.labels.length===e.width*e.height;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const normRGB=(pixels,i)=>{
 const k=i*4,r=pixels[k]/255,g=pixels[k+1]/255,b=pixels[k+2]/255;
 return [1,r,g,b,r*r,g*g,b*b,(r+g+b)/3,
  Math.max(r,g,b)-Math.min(r,g,b)];
};
const probabilities=(weights,ids,features)=>{
 let scores=[],highest=-Infinity;
 for(let c=0;c<ids.length;c++){
  let v=0;for(let j=0;j<F;j++)v+=weights[c*F+j]*features[j];
  scores.push(v);highest=Math.max(highest,v);
 }
 const exps=scores.map(v=>Math.exp(v-highest));
 const den=exps.reduce((a,b)=>a+b,0);
 return exps.map(v=>v/den);
};
function validateClasses(ids){
 if(!Array.isArray(ids)||ids.length<2||ids.length>MAX_CLASSES||
  ids.some(v=>!int(v)||v<0||v>=AIG26_CLASSES.length||
   AIG26_CLASSES[v]==='unknown')||
  new Set(ids).size!==ids.length||!ids.includes(0))
  fail('CLASS_SET_MUST_INCLUDE_BACKGROUND_AND_VISIBLE_LABELS');
}
function samplesFrom(e,ids,{limit=512}={}){
 const byClass=new Map(ids.map(id=>[id,[]]));
 const size=e.width*e.height;
 // Deterministic image-wide selection; bounded training per labelled class.
 const stride=Math.max(1,Math.floor(size/18000));
 for(let i=0;i<size;i+=stride){
  if(e.pixels[i*4+3]<32)continue;
  const bucket=byClass.get(e.labels[i]);
  if(bucket)bucket.push(i);
 }
 const training=[],perClass=Math.min(limit,512);
 for(const id of ids){
  const pool=byClass.get(id);
  if(pool.length<20)fail('INSUFFICIENT_REVIEWED_PIXELS_FOR_CLASS_'+id);
  const step=Math.max(1,pool.length/perClass);
  for(let k=0;k<Math.min(pool.length,perClass);k++){
   const i=pool[Math.floor(k*step)];
   training.push({x:normRGB(e.pixels,i),label:id});
  }
 }
 return training;
}
export function trainAIG28PixelModel({
 examples,classIds,epochs=160,learningRate=.40,
 sourceReviewAuthority='EXPLICIT_HUMAN_REVIEW'
}={}){
 validateClasses(classIds);
 if(!Array.isArray(examples)||examples.length<1||
  examples.length>MAX_EXAMPLES||
  !int(epochs)||epochs<20||epochs>350||
  !Number.isFinite(learningRate)||learningRate<.01||learningRate>.4||
  sourceReviewAuthority!=='EXPLICIT_HUMAN_REVIEW')
  fail('SUPERVISED_TRAINING_PARAMETERS_INVALID');
 const sourceIds=new Set(),examplesStats=[];
 const all=[];
 for(const e of examples){
  if(!maskImage(e)||e.humanReviewed!==true||
   sourceIds.has(e.sourceSha256))fail('REAL_DISTINCT_SOURCE_AND_HUMAN_REVIEW_REQUIRED');
  sourceIds.add(e.sourceSha256);
  const seen=new Set(e.labels);
  if(classIds.some(id=>!seen.has(id)))
   fail('EVERY_REVIEWED_SOURCE_MUST_CONTAIN_EACH_CLASS');
  const samples=samplesFrom(e,classIds,{limit:384});
  all.push(...samples);
  examplesStats.push({sourceSha256:e.sourceSha256,
   totalPixels:e.width*e.height,sampledReviewedPixels:samples.length});
 }
 let weights=new Float64Array(classIds.length*F);
 const index=new Map(classIds.map((id,i)=>[id,i]));
 let firstLoss=null,lastLoss=null;
 // True gradients from source RGBA ground-truth reviewed training pixels.
 // Same-image fit is NOT independent validation, and is reported as such.
 for(let epoch=0;epoch<epochs;epoch++){
  const gradients=new Float64Array(weights.length);let loss=0;
  for(const row of all){
   const p=probabilities(weights,classIds,row.x);
   const real=index.get(row.label);
   loss+=-Math.log(Math.max(1e-12,p[real]));
   for(let c=0;c<classIds.length;c++){
    const error=p[c]-(c===real?1:0);
    for(let j=0;j<F;j++)gradients[c*F+j]+=error*row.x[j];
   }
  }
  const meanLoss=loss/all.length;
  if(epoch===0)firstLoss=meanLoss;
  lastLoss=meanLoss;
  for(let k=0;k<weights.length;k++)
   weights[k]-=learningRate*gradients[k]/all.length;
 }
 if(weights.some(v=>!Number.isFinite(v)))fail('TRAINED_WEIGHTS_INVALID');
 return {
  schema:AIG28_SCHEMA,modelKind:'LOCAL_FIRST_PARTY_TRAINED_SOFTMAX_PIXELS',
  classIds:[...classIds],classes:classIds.map(id=>AIG26_CLASSES[id]),
  featureCount:F,weights:Array.from(weights),
  sourceReviewAuthority,trainSourceSha256:[...sourceIds],
  trainingExamples:examplesStats,epochs,learningRate,
  actualOptimizedWeightCount:weights.length,
  // Explicit training hyperparameters are part of the SHA'd model.
  // A small high-learning-rate source-specific fit cannot substitute for
  // independently reviewed natural-scene IoU; abstain rather than fake it.
  trainingLossInitial:+firstLoss.toFixed(7),
  trainingLossFinal:+lastLoss.toFixed(7),
  trainedWithActualPhotoPixels:true,
  trainedSemanticIdentityCertified:false,
  independentCrossPhotoAccuracyVerified:false,
  pretrainedUniversalVisionWeightsIncluded:false,
  completePerson3DIdentified:false,releaseAllowed:false
 };
}
export async function fingerprintAIG28Model(model,{subtle=globalThis.crypto?.subtle}={}){
 assertAIG28Model(model);
 if(!subtle?.digest)fail('CRYPTO_SHA256_UNAVAILABLE');
 const payload=new TextEncoder().encode(JSON.stringify(model));
 const digest=new Uint8Array(await subtle.digest('SHA-256',payload));
 return 'sha256:'+Array.from(digest,x=>x.toString(16).padStart(2,'0')).join('');
}
export function assertAIG28Model(model){
 if(!model||model.schema!==AIG28_SCHEMA||
  model.modelKind!=='LOCAL_FIRST_PARTY_TRAINED_SOFTMAX_PIXELS')
  fail('REAL_LOCAL_TRAINED_MODEL_REQUIRED');
 validateClasses(model.classIds);
 if(model.featureCount!==F||
  !Array.isArray(model.weights)||model.weights.length!==F*model.classIds.length||
  model.weights.some(v=>!Number.isFinite(v)||Math.abs(v)>1e5)||
  !Array.isArray(model.trainSourceSha256)||
  model.trainSourceSha256.length<1||
  model.trainSourceSha256.length>MAX_EXAMPLES||
  model.trainSourceSha256.some(v=>!sha(v))||
  new Set(model.trainSourceSha256).size!==model.trainSourceSha256.length||
  model.sourceReviewAuthority!=='EXPLICIT_HUMAN_REVIEW'||
  model.trainedWithActualPhotoPixels!==true||
  model.pretrainedUniversalVisionWeightsIncluded!==false)
  fail('WEIGHTS_OR_REVIEWED_TRAINING_PROVENANCE_INVALID');
 return true;
}
export function inferAIG28Pixels({
 model,sourceSha256,pixels,width,height,
 confidenceThreshold=.70,marginThreshold=.12
}={}){
 assertAIG28Model(model);
 if(!sha(sourceSha256)||!int(width)||!int(height)||
  width<128||height<128||width*height>MAX_PIXELS||
  !(pixels instanceof Uint8Array||pixels instanceof Uint8ClampedArray)||
  pixels.length!==width*height*4||
  !Number.isFinite(confidenceThreshold)||confidenceThreshold<.5||
  confidenceThreshold>.99||!Number.isFinite(marginThreshold)||
  marginThreshold<0||marginThreshold>.8)
  fail('SOURCE_BOUND_INFERENCE_PIXELS_INVALID');
 const n=width*height,labels=new Uint8Array(n),confidence=new Uint8Array(n);
 let unknown=0,known=0;const classPixels=new Map(model.classIds.map(id=>[id,0]));
 for(let i=0;i<n;i++){
  if(pixels[i*4+3]<32){unknown++;continue}
  const p=probabilities(model.weights,model.classIds,normRGB(pixels,i));
  let best=-1,second=0,index=0;
  for(let c=0;c<p.length;c++){
   if(p[c]>best){second=best;best=p[c];index=c}
   else if(p[c]>second)second=p[c];
  }
  confidence[i]=Math.round(clamp(best,0,1)*255);
  if(best<confidenceThreshold||best-second<marginThreshold){
   labels[i]=255;unknown++;continue;
  }
  const id=model.classIds[index];labels[i]=id;
  classPixels.set(id,(classPixels.get(id)||0)+1);known++;
 }
 return {
  schema:AIG28_SCHEMA,sourceSha256,image:[width,height],
  labels,confidence,knownPixels:known,unknownPixels:unknown,
  unknownFraction:+(unknown/n).toFixed(6),
  pixelCounts:Object.fromEntries(classPixels),
  confidenceThreshold,marginThreshold,
  automaticLearnedPixelInferenceExecuted:true,
  weightsLearnedFromReviewedSourcePhotos:true,
  inferencePhotoDifferentFromTraining:!model.trainSourceSha256.includes(sourceSha256),
  crossPhotoSemanticAccuracyMeasuredHere:false,
  personIdentityVerified:false,hidden3DGeometryRecovered:false,
  predictedClassMeaningDependsOnReviewedTrainingData:true,
  releaseAllowed:false
 };
}
/** Must use independent different-source labels; no training-photo test passing. */
export function evaluateAIG28IndependentSource({model,sourceSha256,pixels,
 width,height,reviewedLabels,humanReviewed,confidenceThreshold=.70}={}){
 if(!humanReviewed||!maskImage({width,height,pixels,
  labels:reviewedLabels,sourceSha256})||
  model?.trainSourceSha256?.includes(sourceSha256))
  fail('INDEPENDENT_REVIEWED_DIFFERENT_SOURCE_REQUIRED');
 const predict=inferAIG28Pixels({model,sourceSha256,pixels,
  width,height,confidenceThreshold});
 const metrics=[];
 for(const id of model.classIds){
  let intersection=0,union=0;
  for(let i=0;i<reviewedLabels.length;i++){
   if(reviewedLabels[i]!==id&&predict.labels[i]!==id)continue;
   union++;
   if(reviewedLabels[i]===id&&predict.labels[i]===id)intersection++;
  }
  metrics.push({id,className:AIG26_CLASSES[id],
   IoU:union?+(intersection/union).toFixed(6):null,
   intersection,union});
 }
 return {
  schema:AIG28_SCHEMA,sourceSha256,
  independentlyReviewedNewSource:true,trainingPhotoLeakageBlocked:true,
  perClassIoU:metrics,
  meanIoU:+(metrics.filter(m=>m.IoU!==null).reduce((s,m)=>s+m.IoU,0)/
   Math.max(1,metrics.filter(m=>m.IoU!==null).length)).toFixed(6),
  abstentionPixels:predict.unknownPixels,
  generalSemanticUseApproved:false
 };
}
