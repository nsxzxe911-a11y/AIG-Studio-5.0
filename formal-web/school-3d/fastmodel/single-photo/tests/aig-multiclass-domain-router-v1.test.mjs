import test from 'node:test';
import assert from 'node:assert/strict';
import {AIG_OBJECT_CLASSES,AIG_MULTICLASS_ROUTER_SCHEMA,
 routeAigObjectRecognition} from '../aig-multiclass-domain-router-v1.mjs';
const SHA='a'.repeat(64),MASK='b'.repeat(64);
const identity={id:'AIG-TEST-DETECTOR',revision:'CI-SYNTHETIC-01',sourceImageSHA256:SHA};
const input=(name,confidence=0.97)=>({
 sourceImageSHA256:SHA,modelIdentity:identity,dominantColor:'BLUE',
 observedRgb:[27,70,215],detections:[{classId:name,confidence,
  bbox:[.1,.1,.8,.9],maskSha256:MASK}]
});
test('V1 taxonomy includes mechanical drawings, buildings, houses, vehicles and sports; blue is an attribute',()=>{
 for(const kind of ['HUMAN','ANIMAL','PLANT','BUILDING','HOUSE','CAR',
  'MOTORCYCLE','SPORTS_FACILITY','MECHANICAL_DRAWING'])
  assert.ok(AIG_OBJECT_CLASSES.includes(kind));
 assert.ok(!AIG_OBJECT_CLASSES.includes('BLUE'));
 const car=routeAigObjectRecognition(input('CAR'));
 const house=routeAigObjectRecognition(input('HOUSE'));
 assert.equal(car.schema,AIG_MULTICLASS_ROUTER_SCHEMA);
 assert.equal(car.state,'CLASSIFIED_EVIDENCE_ONLY');
 assert.equal(car.category,'VEHICLE_MODEL_PIPELINE_PENDING');
 assert.equal(house.category,'BUILDING_MODEL_PIPELINE_PENDING');
 assert.equal(car.hierarchy,'VEHICLE');assert.equal(house.hierarchy,'BUILDING');
 assert.equal(car.attributes.dominantColor,'BLUE');
 assert.equal(house.attributes.dominantColor,'BLUE');
 assert.equal(car.attributes.classificationIndependentFromColour,true);
 assert.equal(house.modelGenerated,false);
 assert.equal(car.classifierVerified,false);
 assert.equal(car.releaseAllowed,false);
});
test('mechanical drawing is a CAD document, NEVER a human or vehicle skeleton',()=>{
 const r=routeAigObjectRecognition(input('MECHANICAL_DRAWING'));
 assert.equal(r.category,'MECHANICAL_CAD_DRAWING_PIPELINE_PENDING');
 assert.equal(r.modelGenerated,false);
 assert.equal(r.specializedModelGeneratorCertified,false);
});
test('absence of semantic detector cannot be replaced by pixel colour guess',()=>{
 const r=routeAigObjectRecognition({
  sourceImageSHA256:SHA,dominantColor:'BLUE',observedRgb:[12,80,230]});
 assert.equal(r.state,'BLOCKED');
 assert.equal(r.reason,'CLASSIFIER_UNAVAILABLE');
 assert.equal(r.classId,'UNKNOWN');
 assert.equal(r.routedEngine,'NONE');
});
test('weak/ambiguous/OOD model responses reject instead of making a fake GLB',()=>{
 const weak=routeAigObjectRecognition(input('MOTORCYCLE',.76));
 assert.equal(weak.reason,'CLASS_CONFIDENCE_BELOW_090');
 const multi=routeAigObjectRecognition({...input('HUMAN'),detections:[
  {classId:'HUMAN',confidence:.96,bbox:[.1,.1,.4,.8],maskSha256:MASK},
  {classId:'PLANT',confidence:.86,bbox:[.6,.1,.9,.9],maskSha256:MASK}
 ]});
 assert.equal(multi.reason,'AMBIGUOUS_OR_MULTI_OBJECT_SCENE');
 assert.equal(routeAigObjectRecognition(input('UNKNOWN')).state,'BLOCKED');
});
test('rejects stale SHA, fake confidence, zero bounding regions and colour as class',()=>{
 assert.throws(()=>routeAigObjectRecognition({...input('HOUSE'),
  modelIdentity:{...identity,sourceImageSHA256:'b'.repeat(64)}}),
  /MODEL_PROVENANCE_INVALID/);
 assert.throws(()=>routeAigObjectRecognition({...input('HOUSE'),
  detections:[{classId:'BLUE',confidence:1,
   bbox:[0,0,1,1],maskSha256:MASK}]}),
  /UNTRUSTWORTHY_DETECTION/);
 assert.throws(()=>routeAigObjectRecognition({...input('CAR'),
  detections:[{classId:'CAR',confidence:1.2,
   bbox:[0,0,1,1],maskSha256:MASK}]}),
  /UNTRUSTWORTHY_DETECTION/);
 assert.throws(()=>routeAigObjectRecognition({...input('CAR'),
  detections:[{classId:'CAR',confidence:1,
   bbox:[0,0,0,1],maskSha256:MASK}]}),
  /UNTRUSTWORTHY_DETECTION/);
 assert.throws(()=>routeAigObjectRecognition({...input('CAR'),
  dominantColor:'CAR'}),/COLOR_EVIDENCE_INVALID/);
});
