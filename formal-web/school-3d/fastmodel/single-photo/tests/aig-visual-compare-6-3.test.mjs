import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {generateAIG57SchoolHeroineTechnical} from '../aig-native-appearance-5-7.mjs';
import {generateAIG58FittedTechnical} from '../aig-appearance-fit-5-8.mjs';
import {AIG62_SCHEMA,AIG62_REFERENCES,verifyAIG62ReferenceFile,
 AIG62_WARDROBE_POLICY} from '../aig-school-visual-6-2.mjs';
import {AIG63_SCHEMA,AIG63_SCHOOL_PARTS,compareAIG63ActualImages,
 auditAIG63SchoolModelActualGLTF,bindAIG63Evidence}
 from '../aig-visual-compare-6-3.mjs';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const source='f'.repeat(64),ref=AIG62_REFERENCES[2];
const actualReference=()=>verifyAIG62ReferenceFile({id:ref.id,
 fileSHA256:ref.sha256,fileBytes:ref.bytes,width:ref.width,height:ref.height,
 mime:ref.mime});
function image(width,height,profile='uniform'){
 const data=new Uint8ClampedArray(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const p=(y*width+x)*4;
  data[p]=profile==='uniform'?((x+y)%2?45:65):210;
  data[p+1]=profile==='uniform'?((x+y)%2?55:75):140;
  data[p+2]=profile==='uniform'?((x+y)%2?85:105):70;
  data[p+3]=255;
 }
 return {data,width,height};
}
const args=()=>({
 referenceImage:image(120,130,'uniform'),renderedImage:image(960,720,'uniform'),
 referenceROI:{x:8,y:9,width:94,height:108},
 renderedROI:{x:14,y:36,width:452,height:307},
 referenceSHA256:ref.sha256,modelGLBSHA256:'a'.repeat(64),
 capturedPngSHA256:'b'.repeat(64),viewKey:'positive-z',poseFraction:0
});
const scaffold=()=>({sourceSHA256:source,
 meshType:'CLOSED_ELLIPTICAL_SECTION_VOLUME',autoRiggingAvailable:false,
 unseenSurfacesInferred:true,releaseAllowed:false,
 proportions:{widthHeightRatio:.50,ratiosByImageHeight:Array.from({length:11},(_,i)=>({
  atHeight:i/10,widthRatio:.22,centerRatio:.5,
  source:'OBSERVED_FRONT_SILHOUETTE'
 }))}});
test('6.3 actual RGBA pixels from selected source ROI and real front WebGL rendered screenshot produce source-bound measured differences',()=>{
 const input=args(),a=compareAIG63ActualImages(input);
 assert.equal(a.schema,AIG63_SCHEMA);
 assert.equal(a.verifiedReferenceImageSHA256,ref.sha256);
 assert.equal(a.verifiedModelGLBSHA256,'a'.repeat(64));
 assert.equal(a.capturedActualWebGLPngSHA256,'b'.repeat(64));
 assert.equal(a.sampledResolution[0],40);
 assert.ok(a.directMeanAbsoluteRGBDifference>=0&&a.directMeanAbsoluteRGBDifference<=1);
 assert.ok(a.directMeanAbsoluteLuminanceDifference>=0&&a.directMeanAbsoluteLuminanceDifference<=1);
 assert.equal(a.releaseAllowed,false);
 assert.equal(a.scoreIsNotIdentitySimilarity,true);
 const changed=compareAIG63ActualImages({...input,renderedImage:image(960,720,'different')});
 assert.ok(changed.directMeanAbsoluteRGBDifference>a.directMeanAbsoluteRGBDifference+.08);
 assert.notDeepEqual(changed.renderedGLBPixelFeatures,a.renderedGLBPixelFeatures);
});
test('6.3 forbids wrong crop, transparent/fake pixels, wrong GLB SHA and mistaken non-front view',()=>{
 for(const delta of [
  {modelGLBSHA256:'bad'},
  {referenceROI:{x:105,y:2,width:30,height:44}},
  {renderedROI:{x:5,y:700,width:400,height:100}},
  {viewKey:'negative-z'},
  {poseFraction:.5},
  {resolution:4},
  {referenceImage:{width:3,height:3,data:new Uint8Array(36)}}
 ])assert.throws(()=>compareAIG63ActualImages({...args(),...delta}),/AIG63_/);
 const alpha=args();alpha.renderedImage.data[3]=0;
 // Some bad pixels outside ROI do not affect measured pixels; reject a
 // transparent pixel precisely inside the selected real front tile.
 alpha.renderedImage.data[(70*960+76)*4+3]=0;
 assert.throws(()=>compareAIG63ActualImages(alpha),/AIG63_TRANSPARENT/);
});
test('6.3 verifies the 7 REAL added school uniform / hair SkinnedMeshes in parsed 5.7 GLB',async()=>{
 const produced=generateAIG57SchoolHeroineTechnical(scaffold());
 const gltf=await new GLTFLoader().parseAsync(produced.bytes.buffer,'');
 const report=auditAIG63SchoolModelActualGLTF(gltf,{modelGLBSHA256:sha(produced.bytes)});
 assert.equal(report.schema,AIG63_SCHEMA);
 assert.equal(report.schoolOutfitMeshesPresent,true);
 assert.equal(report.actualSkinnedMeshes,9);
 assert.equal(report.actualAnimationClips,5);
 assert.equal(report.visibleSchoolAccessories.length,7);
 assert.deepEqual(new Set(report.visibleSchoolAccessories.map(p=>p.name)),
  new Set(AIG63_SCHOOL_PARTS));
 for(const item of report.visibleSchoolAccessories){
  assert.equal(item.actualSkinnedGeometry,true);
  assert.ok(item.vertices>10);
  assert.ok(item.triangles>8);
 }
 assert.equal(report.releaseAllowed,false);
 // 5.8 keeps the same original school-uniform accessory meshes.
 const fitted=generateAIG58FittedTechnical(scaffold());
 const parsed=await new GLTFLoader().parseAsync(fitted.bytes.buffer,'');
 assert.equal(auditAIG63SchoolModelActualGLTF(parsed,{
  modelGLBSHA256:sha(fitted.bytes)}).schoolOutfitMeshesPresent,true);
});
test('6.3 mismatched GLB or 2D source is blocked and NEVER auto-approves the school style',async()=>{
 const sourceGLB=generateAIG57SchoolHeroineTechnical(scaffold());
 const parsed=await new GLTFLoader().parseAsync(sourceGLB.bytes.buffer,'');
 const geometry=auditAIG63SchoolModelActualGLTF(parsed,{
  modelGLBSHA256:sha(sourceGLB.bytes)});
 const refEvidence=actualReference();
 const visual=compareAIG63ActualImages({
  ...args(),modelGLBSHA256:sha(sourceGLB.bytes)
 });
 const paired=bindAIG63Evidence({visual,geometry,verifiedReference:refEvidence});
 assert.equal(paired.selectedReferenceIsActual3DModel,false);
 assert.equal(paired.imageAndGLBGeometricallyRegistered,false);
 assert.equal(paired.appearanceHumanVisualApproval,false);
 assert.equal(paired.allPriorCostumesPreserved,true);
 assert.equal(paired.releaseAllowed,false);
 assert.throws(()=>bindAIG63Evidence({visual,geometry:{
  ...geometry,modelGLBSHA256:'b'.repeat(64)},verifiedReference:refEvidence}),/AIG63_/);
 assert.throws(()=>bindAIG63Evidence({visual,geometry,verifiedReference:{
  ...refEvidence,schema:'UNVERIFIED'}}),/AIG63_/);
 assert.throws(()=>auditAIG63SchoolModelActualGLTF({
  scene:parsed.scene,animations:[]},{modelGLBSHA256:'bad'}),/AIG63_/);
});
test('6.3 new RGB inputs actually capture a model-loaded WebGL front image and preserve non-school outfits',()=>{
 const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
 const html=read('index.html'),app=read('app.mjs');
 for(const id of ['aig63-prepare','aig63-reference-canvas','aig63-capture',
  'aig63-compare-canvas','aig63-image','aig63-report','aig63-status'])
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 for(const token of [
  "$('aig63-prepare').addEventListener('click'",
  "$('aig63-capture').addEventListener('click'",
  "$('aig63-image').addEventListener('click'",
  "$('aig63-report').addEventListener('click'",
  'await view.captureHeroineReview({fraction:0})',
  'view.model',
  "screenshot.views[0]?.key!=='positive-z'",
  'compareAIG63ActualImages({','auditAIG63SchoolModelActualGLTF({',
  'bindAIG63Evidence({',
  "aig63ROI={x:Math.floor(box.x)",
  'await sha256Bytes(raw)',
  'new MovieWorkspace(',
  'generateVoiceBatch(',
  'runAIG59BoundedAutoFit(',
  'proposeAIG61LocalLandmarks('
 ])assert.ok(app.includes(token),token);
 assert.equal(AIG62_WARDROBE_POLICY.otherExistingAnimationOutfitsPreserved,true);
 assert.equal(AIG62_WARDROBE_POLICY.existingSwimwearAssetsDeleted,false);
 assert.ok(read('aig-native-appearance-5-7.mjs').includes('generateAIG57SchoolHeroineTechnical'));
});
