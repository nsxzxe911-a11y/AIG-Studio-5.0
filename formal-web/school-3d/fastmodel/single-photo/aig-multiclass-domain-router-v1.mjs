/** V1 classification EVIDENCE GATE. No model is bundled by this module;
 * never infer house/car/animal from a foreground RGB colour sample.
 * Unknown/OOD or absent detector = BLOCKED. No GLB is generated here.
 */
export const AIG_MULTICLASS_ROUTER_SCHEMA='AIG_FASTMODEL_MULTICLASS_ROUTER_V1';
export const AIG_OBJECT_CLASSES=Object.freeze([
 'HUMAN','ANIMAL','PLANT','BUILDING','HOUSE','CAR','MOTORCYCLE',
 'SPORTS_FACILITY','MECHANICAL_DRAWING','OTHER','UNKNOWN'
]);
const ids=new Set(AIG_OBJECT_CLASSES);
const group={
 HUMAN:'HUMAN_MODEL_PIPELINE',
 ANIMAL:'ANIMAL_MODEL_PIPELINE_PENDING',
 PLANT:'PLANT_MODEL_PIPELINE_PENDING',
 BUILDING:'BUILDING_MODEL_PIPELINE_PENDING',
 HOUSE:'BUILDING_MODEL_PIPELINE_PENDING',
 CAR:'VEHICLE_MODEL_PIPELINE_PENDING',
 MOTORCYCLE:'VEHICLE_MODEL_PIPELINE_PENDING',
 SPORTS_FACILITY:'SPORTS_FACILITY_PIPELINE_PENDING',
 MECHANICAL_DRAWING:'MECHANICAL_CAD_DRAWING_PIPELINE_PENDING',
 OTHER:'UNSUPPORTED',UNKNOWN:'UNSUPPORTED'
};
const colourNames=new Set([
 'BLUE','RED','GREEN','YELLOW','WHITE','BLACK','GREY','BROWN',
 'ORANGE','PURPLE','PINK','MULTICOLOUR','UNKNOWN'
]);
const digest=/^[a-f\d]{64}$/i;
const id=/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/;
const blocked=(reason,sha,attribute)=>{
 const o={schema:AIG_MULTICLASS_ROUTER_SCHEMA,sourceImageSHA256:sha,
  state:'BLOCKED',reason,classId:'UNKNOWN',category:'UNKNOWN',
  routedEngine:'NONE',attributes:attribute,
  classifierVerified:false,modelGenerated:false,releaseAllowed:false};
 return Object.freeze(o);
};
export function routeAigObjectRecognition({
 sourceImageSHA256,detections=null,modelIdentity=null,
 dominantColor='UNKNOWN',observedRgb=null
}={}){
 if(!digest.test(sourceImageSHA256||''))
  throw Error('AIG_CLASSIFIER_SOURCE_SHA_REQUIRED');
 if(!colourNames.has(dominantColor)||
  (observedRgb!==null&&(!Array.isArray(observedRgb)||observedRgb.length!==3||
   !observedRgb.every(x=>Number.isInteger(x)&&x>=0&&x<=255))))
  throw Error('AIG_CLASSIFIER_COLOR_EVIDENCE_INVALID');
 const attribute=Object.freeze({
  dominantColor,observedRgb,
  classificationIndependentFromColour:true,
  colorTagIsNotObjectClass:true
 });
 const sha=sourceImageSHA256.toLowerCase();
 if(!modelIdentity||!Array.isArray(detections))
  return blocked('CLASSIFIER_UNAVAILABLE',sha,attribute);
 if(!id.test(modelIdentity.id||'')||!id.test(modelIdentity.revision||'')||
  modelIdentity.sourceImageSHA256?.toLowerCase()!==sha)
  throw Error('AIG_CLASSIFIER_MODEL_PROVENANCE_INVALID');
 if(detections.length===0||detections.length>25)
  return blocked('NO_UNAMBIGUOUS_OBJECT_DETECTION',sha,attribute);
 const clean=detections.map(d=>{
  if(!ids.has(d.classId)||!Number.isFinite(d.confidence)||
     d.confidence<0||d.confidence>1||
     !digest.test(d.maskSha256||'')||
     !Array.isArray(d.bbox)||d.bbox.length!==4||
     !d.bbox.every(x=>Number.isFinite(x)&&x>=0&&x<=1)||
     d.bbox[2]<=d.bbox[0]||d.bbox[3]<=d.bbox[1])
   throw Error('AIG_CLASSIFIER_UNTRUSTWORTHY_DETECTION');
  return d;
 }).sort((a,b)=>b.confidence-a.confidence);
 const first=clean[0],next=clean[1];
 if(first.classId==='UNKNOWN'||first.classId==='OTHER')
  return blocked('OPEN_SET_OR_UNSUPPORTED_OBJECT',sha,attribute);
 if(first.confidence<.90)
  return blocked('CLASS_CONFIDENCE_BELOW_090',sha,attribute);
 if(next&&next.confidence>=.65&&first.confidence-next.confidence<.20)
  return blocked('AMBIGUOUS_OR_MULTI_OBJECT_SCENE',sha,attribute);
 const result={
  schema:AIG_MULTICLASS_ROUTER_SCHEMA,sourceImageSHA256:sha,
  state:'CLASSIFIED_EVIDENCE_ONLY',classId:first.classId,
  category:group[first.classId],routedEngine:group[first.classId],
  modelIdentity:Object.freeze({id:modelIdentity.id,revision:modelIdentity.revision}),
  detectionConfidence:first.confidence,
  maskSha256:first.maskSha256,
  bbox:Object.freeze([...first.bbox]),
  attributes:attribute,
  hierarchy: first.classId==='HOUSE'?'BUILDING':(
   ['CAR','MOTORCYCLE'].includes(first.classId)?'VEHICLE':first.classId),
  classifierVerified:false, // model calibration is independently gated
  specializedModelGeneratorCertified:false,
  modelGenerated:false,releaseAllowed:false
 };
 return Object.freeze(result);
}
