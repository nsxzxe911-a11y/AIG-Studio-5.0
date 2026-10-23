import test from 'node:test';
import assert from 'node:assert/strict';
import {AIG26_SCHEMA,AIG26_CLASSES,inspectAIG26SemanticLabels,
 calibrateAIG26PlanarReference,mapAIG26PixelToMeasuredMM,
 aig26SRGBToLinear,aig26LinearToSRGB,
 calibrateAIG26NeutralPatch,applyAIG26ColorToRGBA}
 from '../aig-vision-metric-color-2-6.mjs';

const sha='sha256:'+'e'.repeat(64);
const quad=[[10,20],[210,20],[220,190],[20,190]];
const measured={
 width:640,height:480,sourceSha256:sha,
 referenceId:'CAD-200x100-mm-calibrated-rectangle',
 referenceSource:'CAD_DIMENSION_AUTHORITY',
 cornersPx:quad,widthMm:200,heightMm:100,
 checkPointPx:[115,105],checkPointMm:[100,50]
};
test('2.6 measured planar homography corrects real unit XY, never certifies hidden 3D',()=>{
 const proof=calibrateAIG26PlanarReference(measured);
 assert.equal(proof.schema,AIG26_SCHEMA);
 assert.deepEqual(proof.actualReferenceMm,[200,100]);
 assert.equal(proof.calibratedSourcePlaneOnly,true);
 assert.equal(proof.hiddenPersonDimensionsMeasured,false);
 assert.equal(proof.all3DObjectsPhysicallyMeasured,false);
 assert.equal(proof.measurementAccuracyGuaranteedMm001,false);
 const points=[[10,20],[210,20],[220,190],[20,190],[115,105]];
 for(let i=0;i<points.length;i++){
  const actual=mapAIG26PixelToMeasuredMM(proof.homographyPxToPlaneMm,points[i]);
  const expected=[[0,0],[200,0],[200,100],[0,100],[100,50]][i];
  assert.ok(Math.hypot(...actual.map((n,k)=>n-expected[k]))<1e-6);
 }
 assert.equal(proof.coordinateStoragePrecisionMm,.001);
});
test('2.6 denies empty/unmeasured reference and false independent mm checkpoint',()=>{
 assert.throws(()=>calibrateAIG26PlanarReference({...measured,
  referenceSource:'GUESS_FROM_PHOTO'}),/REAL_PHYSICAL_REFERENCE_REQUIRED/);
 assert.throws(()=>calibrateAIG26PlanarReference({...measured,
  checkPointMm:[150,50]}),/INDEPENDENT_MEASURED_CHECKPOINT_MISMATCH/);
 assert.throws(()=>calibrateAIG26PlanarReference({...measured,
  cornersPx:[quad[0],quad[2],quad[1],quad[3]]}),
 /CORNERS_NOT_CONVEX_OR_WRONGLY_ORDERED/);
 assert.throws(()=>calibrateAIG26PlanarReference({...measured,
  sourceSha256:'sha256:fake'}),/REAL_PHYSICAL_REFERENCE_REQUIRED/);
});
test('2.6 evaluates EXTERNAL semantic class mask source and does not hallucinate labels',()=>{
 const width=128,height=128,labels=new Uint8Array(width*height);
 for(let y=20;y<100;y++)for(let x=35;x<90;x++)
  labels[y*width+x]=y<38?2:1;
 const regions=[
  {id:1,className:'person',confidence:.94},
  {id:2,className:'hair',confidence:.91}
 ];
 const evidence=inspectAIG26SemanticLabels({width,height,sourceSha256:sha,
  labels,regions,producer:'MODEL_INFERENCE',
  modelSha256:'sha256:'+'b'.repeat(64)});
 assert.equal(evidence.proofStatus,'UNREVIEWED_2D_LABELS_ONLY');
 assert.equal(evidence.automaticSemanticModelExecutedHere,false);
 assert.equal(evidence.imageClassificationGroundTruthCertified,false);
 assert.equal(evidence.categoryEvidence.length,2);
 assert.ok(evidence.categoryEvidence[0].pixelCount>1000);
 assert.ok(AIG26_CLASSES.includes('road'));
 assert.ok(AIG26_CLASSES.includes('animal'));
 assert.throws(()=>inspectAIG26SemanticLabels({width,height,sourceSha256:sha,
  labels,regions,producer:'MODEL_INFERENCE'}),/MODEL_DIGEST_REQUIRED/);
 assert.throws(()=>inspectAIG26SemanticLabels({width,height,sourceSha256:sha,
  labels,regions,producer:'HUMAN_ANNOTATION',humanReviewed:false}),
 /ANNOTATION_REVIEW_REQUIRED/);
 const corrupted=labels.slice();corrupted[0]=255;
 assert.throws(()=>inspectAIG26SemanticLabels({width,height,sourceSha256:sha,
  labels:corrupted,regions,producer:'HUMAN_ANNOTATION',humanReviewed:true}),
 /UNDECLARED_LABELS_OR_EMPTY_REGION/);
});
test('2.6 IEC sRGB conversion and linear light neutral patch preserves original bytes',()=>{
 const x=aig26SRGBToLinear(.5);
 assert.ok(Math.abs(x-.21404114048)<1e-8);
 assert.ok(Math.abs(aig26LinearToSRGB(x)-.5)<1e-8);
 for(const illegal of [-1,1.01,Infinity,NaN])
  assert.throws(()=>aig26SRGBToLinear(illegal),/SRGB_INPUT_RANGE/);
 const input=new Uint8ClampedArray([130,114,99,71,24,38,52,255]);
 const original=input.slice();
 const p=calibrateAIG26NeutralPatch({
  sourceSha256:sha,width:640,height:480,samplePx:[15,25],
  sampleRGB:[130,114,99],knownNeutralRGB:[128,128,128]
 });
 const result=applyAIG26ColorToRGBA(input,p);
 assert.deepEqual([...input],[...original]);
 assert.equal(result.sourcePixelsUnmodified,true);
 assert.deepEqual([...result.pixels.slice(0,3)],[128,128,128]);
 assert.equal(result.pixels[3],71);
 assert.equal(result.pixels[7],255);
 assert.equal(p.calibratedDisplayICCVerified,false);
 assert.equal(p.spectralColorAccuracyVerified,false);
 assert.throws(()=>calibrateAIG26NeutralPatch({
  sourceSha256:sha,width:640,height:480,samplePx:[15,25],
  sampleRGB:[0,0,0]}),/MEASURED_NEUTRAL_PATCH_SOURCE_REQUIRED/);
});
