import test from 'node:test';
import assert from 'node:assert/strict';
import {compareAIGReal3DSilhouetteRGBA,evaluateAIGReal3DFourViewComparisons,
 AIG_SILHOUETTE_COMPARE_SCHEMA} from '../aig-real3d-reference-silhouette.mjs';
const W=120,H=180,sha='a'.repeat(64),refsha='b'.repeat(64);
function frames(dx=0,allOpaque=false){
 const source=new Uint8ClampedArray(W*H*4),
  reference=new Uint8ClampedArray(W*H*4);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const p=(y*W+x)*4;
  const body=x>=30&&x<90&&y>=20&&y<160,
   ref=x>=30+dx&&x<90+dx&&y>=20&&y<160;
  source.set(body?[148,107,76,255]:[196,190,179,255],p);
  reference.set([0,0,0,allOpaque?255:ref?255:0],p);
 }
 return {source,reference};
}
const run=(dx=0,angle='front',opaque=false)=>{
 const {source,reference}=frames(dx,opaque);
 return compareAIGReal3DSilhouetteRGBA({
  sourcePixels:source,referencePixels:reference,width:W,height:H,
  angle,modelSHA:sha,referenceSHA:refsha
 });
};
test('True alpha source exact same mask yields IoU 1 and no false natural-human PASS',()=>{
 const r=run();
 assert.equal(r.schema,AIG_SILHOUETTE_COMPARE_SCHEMA);
 assert.equal(r.intersectionOverUnion,1);
 assert.equal(r.diceCoefficient,1);
 assert.equal(r.transparentReferenceSubjectPixels,r.renderedSubjectPixels);
 assert.equal(r.naturalHumanAppearancePASS,false);
 assert.equal(r.identityLikenessVerified,false);
 assert.equal(r.photoSegmentationPerformed,false);
 assert.equal(r.outputOverlayRGBA.length,W*H*4);
 assert.deepEqual(Array.from(r.outputOverlayRGBA.slice(0,4)),[196,190,179,255]);
 assert.deepEqual(Array.from(r.outputOverlayRGBA.slice((30*W+40)*4,(30*W+40)*4+4)),[148,107,76,255]);
});
test('Shifted source reference produces quantifiably lower IoU with real mismatch pixels',()=>{
 const r=run(15);
 assert.ok(r.intersectionOverUnion>.5&&r.intersectionOverUnion<.7);
 assert.ok(r.foregroundUnionPixels>r.foregroundIntersectionPixels);
 assert.ok(r.absoluteForegroundAreaDifferencePercent===0);
 const gpuOnly=(40*W+32)*4,refOnly=(40*W+100)*4;
 assert.deepEqual(Array.from(r.outputOverlayRGBA.slice(gpuOnly,gpuOnly+4)),[185,132,95,255]);
 assert.deepEqual(Array.from(r.outputOverlayRGBA.slice(refOnly,refOnly+4)),[54,33,25,255]);
});
test('Opaque photo and invalid pixel/channel dimensions must BLOCK',()=>{
 assert.throws(()=>run(0,'front',true),/SILHOUETTE_TRANSPARENT_REFERENCE_REQUIRED/);
 const a=frames();
 assert.throws(()=>compareAIGReal3DSilhouetteRGBA({
  sourcePixels:a.source,referencePixels:a.reference,width:120,height:200,
  angle:'front',modelSHA:sha,referenceSHA:refsha
 }),/SILHOUETTE_PIXEL_DIMENSIONS_MISMATCH/);
 assert.throws(()=>run(0,'wrong'),/SILHOUETTE_CAMERA_ANGLE_INVALID/);
 assert.throws(()=>compareAIGReal3DSilhouetteRGBA({
  sourcePixels:a.source,referencePixels:a.reference,width:W,height:H,
  angle:'front',modelSHA:'unhashed',referenceSHA:refsha
 }),/SILHOUETTE_SOURCE_SHA_REQUIRED/);
});
test('Four views require all unique angles and same immutable model SHA',()=>{
 const all=['front','side','back','threeQuarter'].map(a=>run(0,a));
 const r=evaluateAIGReal3DFourViewComparisons(all);
 assert.equal(r.allFourAnglesCompared,true);
 assert.equal(r.averageIoU,1);
 assert.equal(r.sourceSHAConsistent,true);
 assert.equal(r.releasePASS,false);
 const partial=evaluateAIGReal3DFourViewComparisons(all.slice(0,2));
 assert.deepEqual(partial.missingAngles,['back','threeQuarter']);
 assert.equal(partial.geometricImageOverlayCompleted,false);
 assert.throws(()=>evaluateAIGReal3DFourViewComparisons([...all.slice(0,3),all[0]]),
  /SILHOUETTE_COMPARISON_INVALID/);
 const mismatched=[...all.slice(0,3),{...all[3],modelSHA:'c'.repeat(64)}];
 assert.equal(evaluateAIGReal3DFourViewComparisons(mismatched).sourceSHAConsistent,false);
});
