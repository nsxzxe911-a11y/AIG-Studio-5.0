/**
 * FastModel 7.12 — Scene references as percentage scale.
 *
 * Building/tree/road/etc are IMAGE REFERENCES, not guaranteed physical rulers.
 * The 2D percentage of a target's apparent size vs an observed reference is
 * measurable from the image without assuming a building, tree or road has a
 * fixed real-world size. Absolute target mm is permitted only if:
 * - the reference is actually measured in mm;
 * - same perspective depth and projected direction are explicitly reviewed.
 *
 * Does not estimate 3D depth, semantic detection, or physical dimensions.
 */
export const AIG712_SCENE_PERCENT_SCHEMA='AIG_FASTMODEL_7_12_SCENE_APPARENT_PERCENT_REFERENCE';
export const AIG712_SCENE_REFERENCE_TYPES=Object.freeze([
 'building','tree','road','vehicle','sports_facility','person','object'
]);
const finite=Number.isFinite;
function box(b){
 if(!b||![b.x,b.y,b.width,b.height].every(finite)||
  b.x<0||b.y<0||b.width<=0||b.height<=0||
  b.width>100000||b.height>100000)throw Error('AIG712_SCENE_BOUNDS_INVALID');
 return Object.freeze({x:b.x,y:b.y,width:b.width,height:b.height});
}
export function createAIG712SceneReference({
 id,type,bounds,axis='height',measuredLengthMm=null,
 physicalLengthReviewed=false,perspectiveReviewed=false,
 orientationReviewed=false,sourceFrameId=null
}={}){
 if(typeof id!=='string'||!/^[-_a-zA-Z0-9]{1,64}$/.test(id)||
  !AIG712_SCENE_REFERENCE_TYPES.includes(type)||
  !['width','height'].includes(axis)||
  sourceFrameId!==null&&(typeof sourceFrameId!=='string'||sourceFrameId.length>120)||
  measuredLengthMm!==null&&(!finite(measuredLengthMm)||measuredLengthMm<=0||measuredLengthMm>100000000)||
  physicalLengthReviewed&&measuredLengthMm===null)
  throw Error('AIG712_SCENE_REFERENCE_INVALID');
 return Object.freeze({
  schema:AIG712_SCENE_PERCENT_SCHEMA,id,type,bounds:box(bounds),axis,
  measuredLengthMm,physicalLengthReviewed:physicalLengthReviewed===true,
  perspectiveReviewed:perspectiveReviewed===true,
  orientationReviewed:orientationReviewed===true,sourceFrameId,
  classification:'USER_PROVIDED_NOT_AUTOMATICALLY_DETECTED',
  physicalSizeAutomaticallyAssumed:false
 });
}
export function calculateAIG712ScenePercent({
 targetBounds,targetAxis='height',targetFrameId=null,references=[]
}={}){
 const target=box(targetBounds);
 if(!['width','height'].includes(targetAxis)||!Array.isArray(references)||
 references.length<1||references.length>32)
  throw Error('AIG712_SCENE_TARGET_OR_REFERENCE_COUNT_INVALID');
 const ids=new Set();
 const observations=references.map(ref=>{
  if(ref?.schema!==AIG712_SCENE_PERCENT_SCHEMA||
   ids.has(ref.id))throw Error('AIG712_SCENE_REFERENCE_DUPLICATE_OR_INVALID');
  ids.add(ref.id);
  if(ref.sourceFrameId!==null&&targetFrameId!==ref.sourceFrameId)
   throw Error('AIG712_SCENE_CROSS_FRAME_CALIBRATION_REQUIRED');
  const axisPixels=ref.bounds[ref.axis];
  const targetPixels=target[targetAxis];
  const apparentPercent=targetPixels/axisPixels*100;
  if(!finite(apparentPercent)||apparentPercent<=0||apparentPercent>100000)
   throw Error('AIG712_SCENE_APPARENT_RATIO_OUT_OF_RANGE');
  const canInferMetric=ref.measuredLengthMm!==null&&
   ref.physicalLengthReviewed&&ref.perspectiveReviewed&&
   ref.orientationReviewed;
  return {
   id:ref.id,type:ref.type,referenceAxis:ref.axis,targetAxis,
   referencePixels:axisPixels,targetPixels,
   apparentPercent,apparentScaleFactor:apparentPercent/100,
   physicalScaleVerified:canInferMetric,
   estimatedPhysicalTargetMm:canInferMetric?
    ref.measuredLengthMm*apparentPercent/100:null,
   semanticReferenceOnly:true,absoluteRealWorldSizeUnproven:!canInferMetric,
   referenceSourceId:ref.sourceFrameId
  };
 });
 const validated=observations.filter(o=>o.physicalScaleVerified);
 let consensus=null;
 if(validated.length>=2){
  const nums=validated.map(v=>v.estimatedPhysicalTargetMm).sort((a,b)=>a-b);
  const med=nums[Math.floor(nums.length/2)],
   maxDeviation=nums.reduce((m,x)=>Math.max(m,Math.abs(x/med-1)),0);
  consensus={passed:maxDeviation<=.12,medianMm:maxDeviation<=.12?med:null,
   maxRelativeDisagreement:maxDeviation,measuredReferenceCount:validated.length};
 }
 return {
  schema:AIG712_SCENE_PERCENT_SCHEMA,
  targetPixels:target[targetAxis],targetAxis,
  referenceCount:observations.length,observations,
  metricConsensus:consensus,
  physicalPercentageFromUnknownSizedReferences:'NOT_VERIFIED',
  cameraDepthSolved:false,full3DMeshGenerated:false,
  noDefaultBuildingTreeRoadPhysicalLength:true
 };
}
export function drawingRatioAIG712ToPercent(denominator){
 if(![1,2,4,10].includes(denominator))
  throw Error('AIG712_SCENE_DRAWING_RATIO_NOT_APPROVED');
 return {label:'1:'+denominator,reducedDrawingPercent:100/denominator,
  trueModelDimensionsUnchanged:true};
}
