/**
 * Real3D 2.8-B: true multi-photo human-reviewed dataset, source-disjoint
 * training / holdout, visible 2D hair-neck boundary and abstention audits.
 * No invented neural weights, no photo identity or hidden body reconstruction.
 */
import {AIG26_CLASSES} from './aig-vision-metric-color-2-6.mjs';
import {trainAIG28PixelModel,evaluateAIG28IndependentSource}
 from './aig-local-learner-2-8.mjs';
export const AIG28B_SCHEMA='AIG_REAL3D_2_8B_REVIEWED_MULTISOURCE_VISIBLE_OCCLUSION';
const fail=reason=>{throw Error('AIG28B_'+reason)};
const goodSHA=s=>typeof s==='string'&&/^sha256:[a-f0-9]{64}$/.test(s);
const MAX_DATASET_IMAGES=8,MAX_TOTAL_PIXELS=3000000;
function inputOK(r){
 return !!r&&goodSHA(r.sourceSha256)&&r.humanReviewed===true&&
  Number.isInteger(r.width)&&Number.isInteger(r.height)&&
  r.width>=128&&r.height>=128&&r.width*r.height<=2000000&&
  (r.pixels instanceof Uint8Array||r.pixels instanceof Uint8ClampedArray)&&
  r.pixels.length===r.width*r.height*4&&
  r.labels instanceof Uint8Array&&r.labels.length===r.width*r.height;
}
function reviewOK(entry,ids){
 if(!inputOK(entry)||!Array.isArray(ids)||ids.length<2||
  !ids.includes(0)||ids.length>8||new Set(ids).size!==ids.length||
  ids.some(id=>!Number.isInteger(id)||id<0||id>=AIG26_CLASSES.length||
  AIG26_CLASSES[id]==='unknown')||
  !entry.humanReviewStatement||entry.humanReviewStatement!==
   'VISIBLE_SOURCE_PIXELS_REVIEWED_NOT_HIDDEN_GEOMETRY')
  fail('EXPLICIT_VISIBLE_SOURCE_REVIEW_AND_CLASSES_REQUIRED');
 let perClass=new Map(ids.map(id=>[id,0]));
 for(let i=0;i<entry.labels.length;i++){
  const id=entry.labels[i];
  if(entry.pixels[i*4+3]<32){
   if(id!==0&&id!==255)fail('TRANSPARENT_PIXELS_CANNOT_BE_SEMANTIC_GROUND_TRUTH');
   continue;
  }
  if(id===255)continue; // genuinely unresolved, never train on it
  if(!perClass.has(id))fail('UNDECLARED_CLASS_IN_REVIEWED_MASK');
  perClass.set(id,perClass.get(id)+1);
 }
 const count=[...perClass.values()].reduce((a,b)=>a+b,0);
 if(count<512)fail('INSUFFICIENT_REVIEWED_VISIBLE_PIXELS');
 return {perClass:Object.fromEntries(perClass),eligible:count,
  skippedUnknown:entry.labels.length-count};
}
export function addAIG28BReviewedSource(dataset,entry,{classIds}={}){
 if(!Array.isArray(dataset)||dataset.length>=MAX_DATASET_IMAGES)
  fail('REVIEWED_IMAGE_DATASET_BUDGET_OR_TYPE_INVALID');
 const checked=reviewOK(entry,classIds);
 if(dataset.some(x=>x.sourceSha256===entry.sourceSha256))
  fail('DUPLICATE_SOURCE_SHA_NO_TRAINING_LEAKAGE');
 if(dataset.length&&dataset.some(x=>
  JSON.stringify(x.classIds)!==JSON.stringify(classIds)))
  fail('INCONSISTENT_CLASS_MANIFEST_NO_MISLABELLED_TRAINING');
 const total=dataset.reduce((a,r)=>a+r.width*r.height,0)+
  entry.width*entry.height;
 if(total>MAX_TOTAL_PIXELS)fail('DATASET_EXCEEDS_PHONE_MEMORY_BUDGET');
 // Snapshot original pixel bytes and reviewed label bytes. Never reference
 // a mutable canvas or source photo from a later selected file.
 const row={
  sourceSha256:entry.sourceSha256,
  width:entry.width,height:entry.height,
  pixels:new Uint8ClampedArray(entry.pixels),
  labels:new Uint8Array(entry.labels),
  classIds:[...classIds],humanReviewed:true,
  humanReviewStatement:entry.humanReviewStatement,
  reviewedPixelCounts:checked.perClass,
  eligibleVisiblePixels:checked.eligible,
  unknownNotTrainedPixels:checked.skippedUnknown
 };
 return [...dataset,row];
}
export function auditAIG28BVisibleBoundary({
 labels,width,height,sourceSha256,classHair=3,classNeck=4
}={}){
 if(!goodSHA(sourceSha256)||!(labels instanceof Uint8Array)||
  !Number.isInteger(width)||!Number.isInteger(height)||
  width<128||height<128||labels.length!==width*height||
  width*height>2000000||classHair===classNeck)
  fail('EXACT_SOURCE_PIXEL_BOUNDARY_REQUIRED');
 let hair=0,neck=0,adjacent=0,unknown=0,neckUncertain=0;
 // Count actual visible hair/neck neighbours. Occluded pixels beneath
 // a 2D foreground layer remain invisible and MUST NOT be inferred.
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=y*width+x,n=labels[i];
  if(n===classHair)hair++;
  if(n===classNeck)neck++;
  if(n===255)unknown++;
  if(n!==classNeck&&n!==255)continue;
  let touchesHair=false;
  for(const j of [x>0?i-1:-1,x+1<width?i+1:-1,
   y>0?i-width:-1,y+1<height?i+width:-1]){
   if(j>=0&&labels[j]===classHair)touchesHair=true;
  }
  if(touchesHair&&n===classNeck)adjacent++;
  if(touchesHair&&n===255)neckUncertain++;
 }
 const hairNeckVisibleContact=hair>0&&neck>0&&adjacent>0;
 return {
  schema:AIG28B_SCHEMA,sourceSha256,
  visibleHairPixels:hair,visibleNeckPixels:neck,
  observedHairNeckContactPixels:adjacent,
  ambiguousHairTouchingUnknownPixels:neckUncertain,
  unknownPixels:unknown,
  photoHairNeckBoundaryObserved:hairNeckVisibleContact,
  hiddenNeckReconstructed:false,
  inferredUnderHair3DVertices:0,
  requiresReview:hair>0&&(!neck||adjacent>0||neckUncertain>0),
  labelPixelsAreObservedNotAnatomicalGroundTruth:true,
  hairNeckTissueCollisionCertified:false,
  status:hairNeckVisibleContact?'VISIBLE_2D_BOUNDARY_REVIEW_REQUIRED':
   'NO_VERIFIED_VISIBLE_HAIR_NECK_CONTACT'
 };
}
export function trainAIG28BMultiPhoto(dataset,{epochs=250,learningRate=.4}={}){
 if(!Array.isArray(dataset)||dataset.length<2||
  dataset.length>MAX_DATASET_IMAGES)
  fail('AT_LEAST_TWO_DISTINCT_REVIEWED_PHOTOS_REQUIRED');
 const ids=dataset[0].classIds;
 let union=new Map(ids.map(id=>[id,0]));
 for(const e of dataset){
  const check=reviewOK(e,ids);
  if(dataset.filter(x=>x.sourceSha256===e.sourceSha256).length!==1)
   fail('DUPLICATE_SOURCE_SHA_NO_TRAINING_LEAKAGE');
  for(const id of ids)union.set(id,union.get(id)+check.perClass[id]);
 }
 if([...union.values()].some(count=>count<40))
  fail('CLASS_HAS_TOO_FEW_REVIEWED_TRAIN_PIXELS');
 // Underlying first-party learner samples per-class per-photo. Every photo
 // must feature every selected class until heterogeneous-class training is
 // separately designed and validated. Never silently relabel missing data.
 const model=trainAIG28PixelModel({
  examples:dataset.map(e=>({
   width:e.width,height:e.height,pixels:e.pixels,labels:e.labels,
   sourceSha256:e.sourceSha256,humanReviewed:true
  })),
  classIds:ids,epochs,learningRate
 });
 return {...model,reviewedMultiSourceTraining:true,
  reviewedPhotoCount:dataset.length,
  datasetPixelCount:dataset.reduce((a,e)=>a+e.width*e.height,0),
  reviewedClassCounts:Object.fromEntries(union),
  firstPartyActualOptimizedWeights:true,
  naturalWorldGeneralizationNotYetCertified:true};
}
export function evaluateAIG28BHoldout(model,holdout,{
 confidenceThreshold=.70,minClassIoU=.60,maxAbstention=.25
}={}){
 if(!model?.reviewedMultiSourceTraining||
  !inputOK(holdout)||!holdout.humanReviewStatement||
  holdout.humanReviewStatement!==
   'VISIBLE_SOURCE_PIXELS_REVIEWED_NOT_HIDDEN_GEOMETRY'||
  model.trainSourceSha256.includes(holdout.sourceSha256))
  fail('HOLDOUT_MUST_BE_NEW_INDEPENDENT_REVIEWED_PHOTO');
 if(!Number.isFinite(minClassIoU)||minClassIoU<0||
  minClassIoU>1||!Number.isFinite(maxAbstention)||
  maxAbstention<0||maxAbstention>1)
  fail('HOLDOUT_THRESHOLDS_INVALID');
 const report=evaluateAIG28IndependentSource({
  model,sourceSha256:holdout.sourceSha256,
  width:holdout.width,height:holdout.height,
  pixels:holdout.pixels,reviewedLabels:holdout.labels,
  humanReviewed:true,confidenceThreshold
 });
 // Every reported class must pass; one unrecognised neck invalidates a
 // superficially high mean IoU. This is a fixture gate, NOT certification.
 const failedClasses=report.perClassIoU.filter(x=>
  x.IoU===null||x.IoU<minClassIoU).map(x=>x.className);
 const abstentionFraction=report.abstentionPixels/
  (holdout.width*holdout.height);
 return {...report,reviewedTrainingPhotos:model.reviewedPhotoCount,
  sourceDisjointHoldout:true,
  failedClasses,abstentionFraction:+abstentionFraction.toFixed(6),
  syntheticOrRealBenchmarkMustBeReportedSeparately:true,
  thresholdGatePass:!failedClasses.length&&
   abstentionFraction<=maxAbstention,
  generalRealPhotoSemanticAccuracyCertified:false,
  hidden3DGeometryRestored:false
 };
}
