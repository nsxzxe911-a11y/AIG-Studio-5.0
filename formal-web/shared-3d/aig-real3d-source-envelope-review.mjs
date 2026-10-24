/**
 * SOURCE XYZ envelope review. Does not infer weight, BMI, gender, natural
 * anatomy, pose or actual body composition.
 * Rendering/OBJ vertex arrays are left unchanged.
 */
export const AIG_REAL3D_ENVELOPE_REVIEW_SCHEMA='AIG_REAL3D_NATIVE_SOURCE_ENVELOPE_REVIEW_V1';
const finite=x=>typeof x==='number'&&Number.isFinite(x)&&x>0;
const mm=x=>Math.round(x*1000*100)/100;
const rnd=x=>Math.round(x*10000)/10000;
export function reviewAIGReal3DSourceEnvelope({
 geometry,sourceName='',sourceSha256=''
}={}){
 const b=geometry?.boundingMeters;
 if(!b||![b.widthX,b.heightY,b.depthZ].every(finite))
  throw Error('SOURCE_ENVELOPE_ORIGINAL_XYZ_REQUIRED');
 if(typeof sourceSha256!=='string'||!/^[a-f0-9]{64}$/i.test(sourceSha256))
  throw Error('SOURCE_ENVELOPE_SOURCE_SHA_REQUIRED');
 if(typeof sourceName!=='string'||sourceName.length>180)
  throw Error('SOURCE_ENVELOPE_NAME_INVALID');
 const front=b.widthX/b.heightY,side=b.depthZ/b.heightY,
   breadth=b.widthX/b.depthZ;
 // Only a screening flag for neutral standing models, not a diagnosis of
 // "fatness". An outstretched human arm or costume can legitimately exceed.
 const wideFrontReview=front>=0.40;
 const nominallyThinSideRelativeToFront=breadth>=1.55;
 const syntheticFixture=/SYNTHETIC[_ -]?NONHUMAN|NONHUMAN|QA[_ -]?CAPSULE/i.test(sourceName);
 const cautions=[];
 if(syntheticFixture)cautions.push('SYNTHETIC_NONHUMAN_QA_FIXTURE_NOT_HUMAN');
 if(wideFrontReview)cautions.push('WIDE_FRONT_BOUNDING_ENVELOPE_REVIEW_POSE_FIRST');
 if(nominallyThinSideRelativeToFront)
  cautions.push('FRONT_TO_SIDE_BOUNDING_WIDTH_RATIO_REVIEW');
 return {
  schema:AIG_REAL3D_ENVELOPE_REVIEW_SCHEMA,
  sourceSha256,sourceName,
  boundingMillimeters:{
   frontMaxWidthX:mm(b.widthX),heightY:mm(b.heightY),
   sideMaxDepthZ:mm(b.depthZ)
  },
  ratios:{
   frontMaxWidthToHeight:rnd(front),
   sideMaxDepthToHeight:rnd(side),
   frontMaxWidthToSideDepth:rnd(breadth)
  },
  wideFrontEnvelopeNeedsPoseAndReferenceReview:wideFrontReview,
  frontSideImbalanceNeedsReferenceReview:nominallyThinSideRelativeToFront,
  fixtureExplicitlySyntheticNonhuman:syntheticFixture,
  cautions,
  // Numeric provenance is actual transformed native mesh XYZ; no editing.
  geometryWasModified:false,
  envelopeIsBoundingBoxNotAnatomicalShoulderOrWaist:true,
  noInferenceOfBMIOrFatness:true,
  noAutonomousBodyResizing:true,
  humanAppearancePASS:false,releasePASS:false
 };
}
export function compareAIGReal3DSourceEnvelopes(before,after){
 if(before?.schema!==AIG_REAL3D_ENVELOPE_REVIEW_SCHEMA||
 after?.schema!==AIG_REAL3D_ENVELOPE_REVIEW_SCHEMA||
 before.sourceSha256===after.sourceSha256)
  throw Error('ENVELOPE_COMPARE_TWO_INDEPENDENT_SOURCES_REQUIRED');
 const b=before.boundingMillimeters,a=after.boundingMillimeters;
 const delta={frontMaxWidthX:mm((a.frontMaxWidthX-b.frontMaxWidthX)/1000),
  heightY:mm((a.heightY-b.heightY)/1000),
  sideMaxDepthZ:mm((a.sideMaxDepthZ-b.sideMaxDepthZ)/1000)};
 return {
  schema:'AIG_REAL3D_SOURCE_ENVELOPE_IMMUTABLE_DIFF_V1',
  beforeSourceSha256:before.sourceSha256,
  afterSourceSha256:after.sourceSha256,
  before:b,after:a,deltaMillimeters:delta,
  sameVisibleBoundingEnvelopeAcrossSources:Object.values(delta).every(x=>Math.abs(x)<0.01),
  sourceTopologyRepairDoesNotImplyBodyProportionsChanged:true,
  stillNeedsReferencePhotosAndPoseValidation:true,
  humanNaturalAppearancePASS:false,releasePASS:false
 };
}
