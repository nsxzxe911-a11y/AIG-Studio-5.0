import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {generateAIG58FittedTechnical} from '../aig-appearance-fit-5-8.mjs';
import {AIG57_PARTS} from '../aig-native-appearance-5-7.mjs';
import {AIG60_SCHEMA,AIG60_MARKS,calibrateAIG60FaceMarks,
 fitAIG60MeasuredFaceGLB,auditAIG60DenseAnimation} from '../aig-face-alignment-6-0.mjs';
import {auditAIG50FullBody} from '../aig-fullbody-5-0.mjs';
const source='c'.repeat(64),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const scaffold=()=>({sourceSHA256:source,meshType:'CLOSED_ELLIPTICAL_SECTION_VOLUME',
 autoRiggingAvailable:false,unseenSurfacesInferred:true,releaseAllowed:false,
 proportions:{widthHeightRatio:.50,ratiosByImageHeight:Array.from({length:11},(_,i)=>({
  atHeight:i/10,widthRatio:.22,centerRatio:.5,source:'OBSERVED_FRONT_SILHOUETTE'
 }))}});
const marks=()=>({
 forehead:{x:480,y:170},
 leftEye:{x:426,y:259},rightEye:{x:542,y:260},
 nose:{x:485,y:323},mouth:{x:489,y:368},chin:{x:486,y:425}
});
const calibration=()=>calibrateAIG60FaceMarks({imageWidth:960,imageHeight:1280,
 sourceImageSHA256:source,marks:marks()});
const model=()=>{const result=generateAIG58FittedTechnical(scaffold());return {
 baseGLB:result.bytes,baseGLBSHA256:sha(result.bytes),sourceImageSHA256:source,
 calibration:calibration()};};
const parse=x=>new GLTFLoader().parseAsync(x.buffer,'');
const mesh=(g,name)=>{let hit;g.scene.traverse(n=>{if(n.isSkinnedMesh&&n.name===name)hit=n});return hit};
test('6.0 real pixel calibration requires six ordered, plausible anatomical photo landmark taps',()=>{
 const c=calibration();
 assert.equal(c.schema,AIG60_SCHEMA);
 assert.deepEqual(AIG60_MARKS,['forehead','leftEye','rightEye','nose','mouth','chin']);
 assert.equal(c.sourceImageSHA256,source);
 assert.equal(c.sourcePhotoDepthNotMeasured,true);
 assert.equal(c.photoIdentityVerified,false);
 assert.equal(c.releaseAllowed,false);
 assert.ok(c.modelFaceHorizontalScale>=.76&&c.modelFaceHorizontalScale<=1.24);
 assert.ok(c.fitFromRealPixelRatiosY[1]>c.fitFromRealPixelRatiosY[0]);
 assert.ok(c.fitFromRealPixelRatiosY[3]>c.fitFromRealPixelRatiosY[2]);
});
test('6.0 morphs actual 3D face vertices from measured pixel proportions, without modifying body/garment/bone weights/animations',async()=>{
 const base=model(),fitted=fitAIG60MeasuredFaceGLB(base);
 assert.equal(fitted.schema,AIG60_SCHEMA);
 assert.ok(fitted.geometryMovedRealSkinnedFaceVertices>100);
 assert.equal(fitted.originalPhoto3DDepthRecovered,false);
 assert.equal(fitted.releaseAllowed,false);
 const [before,after]=await Promise.all([parse(base.baseGLB),parse(fitted.bytes)]);
 const bFace=mesh(before,AIG57_PARTS[0]),aFace=mesh(after,AIG57_PARTS[0]);
 assert.ok(bFace&&aFace);
 let changed=0;
 const b=bFace.geometry.getAttribute('position'),a=aFace.geometry.getAttribute('position');
 for(let i=0;i<b.count;i++)
  if(Math.hypot(a.getX(i)-b.getX(i),a.getY(i)-b.getY(i))>1e-5)changed++;
 assert.ok(changed>100);
 for(const name of ['AIG56_NATIVE_FULLBODY_TECHNICAL_SKIN',AIG57_PARTS[3],AIG57_PARTS[6]]){
  const lhs=mesh(before,name),rhs=mesh(after,name);
  assert.ok(lhs&&rhs);
  for(const field of ['position','skinWeight','skinIndex'])
   assert.deepEqual(Array.from(lhs.geometry.getAttribute(field).array),
    Array.from(rhs.geometry.getAttribute(field).array),name+':'+field);
  assert.deepEqual(Array.from(lhs.geometry.index.array),Array.from(rhs.geometry.index.array));
 }
 assert.deepEqual(after.animations.map(c=>c.name),before.animations.map(c=>c.name));
 const report=await auditAIG50FullBody(after,{sourceSHA256:sha(fitted.bytes)});
 assert.equal(report.outcome,'STRUCTURAL_QA_PASS_ONLY');
 assert.equal(report.skinnedMeshCount,9);
 assert.equal(report.clipsAvailable,5);
});
test('6.0 cannot use another photo or a user-edited fake model identity token',()=>{
 const orig=model(),c=calibration();
 assert.throws(()=>fitAIG60MeasuredFaceGLB({...orig,sourceImageSHA256:'f'.repeat(64)}),
  /AIG60_SOURCE_IMAGE/);
 assert.throws(()=>fitAIG60MeasuredFaceGLB({...orig,calibration:{...c,releaseAllowed:true}}),
  /AIG60_SOURCE_IMAGE/);
 assert.throws(()=>calibrateAIG60FaceMarks({...c,sourceImageSHA256:'invalid'}),
  /AIG60_REAL_IMAGE/);
 const bad=marks();bad.leftEye.y=bad.mouth.y;
 assert.throws(()=>calibrateAIG60FaceMarks({imageWidth:960,imageHeight:1280,
  sourceImageSHA256:source,marks:bad}),/AIG60_LANDMARK_POSE/);
});
test('6.0 actual denser 10 evaluations across 9 distinct clip times; never declares continuous collision safety',async()=>{
 const fitted=fitAIG60MeasuredFaceGLB(model());
 const gltf=await parse(fitted.bytes),id=sha(fitted.bytes);
 const report=await auditAIG60DenseAnimation(gltf,{sourceSHA256:id,maxClips:1});
 assert.equal(report.schema,AIG60_SCHEMA);
 assert.equal(report.poseTriangleEvaluations,10);
 assert.equal(report.distinctTimeSamples,9);
 assert.equal(report.clipsAudited,1);
 assert.equal(report.clips[0].nineDistinctTimeFractions.length,9);
 assert.ok(Number.isInteger(report.skirtBodyContactsAcrossDistinctSamples));
 assert.ok(Number.isInteger(report.hairBodyContactsAcrossDistinctSamples));
 assert.equal(report.continuousTimeCollisionFreeProven,false);
 assert.equal(report.releaseAllowed,false);
});
test('6.0 RGB true callbacks: source-photo pixel inspection, calibrated GLB, dense pose QA, source-matched 16-view capture',()=>{
 const read=n=>fs.readFileSync(new URL('../'+n,import.meta.url),'utf8');
 const html=read('index.html'),app=read('app.mjs');
 for(const id of ['aig60-photo','aig60-photo-load','aig60-reset','aig60-marks',
  'aig60-build','aig60-report','aig60-capture','aig60-status'])
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 for(const id of ['aig60-photo-load','aig60-reset','aig60-build','aig60-report','aig60-capture'])
  assert.ok(app.includes("$('"+id+"').addEventListener('click'"),id);
 assert.ok(app.includes("aig60Photo.addEventListener('pointerdown'"));
 assert.ok(app.includes('calibrateAIG60FaceMarks('));
 assert.ok(app.includes('fitAIG60MeasuredFaceGLB('));
 assert.ok(app.includes('auditAIG60DenseAnimation('));
 assert.ok(app.includes('view.captureTimelineReview()'));
 assert.ok(app.includes('sourceSha!==aig60Report.generatedGLBSHA256'));
 assert.ok(app.includes('new MovieWorkspace('));
 assert.ok(app.includes('generateVoiceBatch('));
});
