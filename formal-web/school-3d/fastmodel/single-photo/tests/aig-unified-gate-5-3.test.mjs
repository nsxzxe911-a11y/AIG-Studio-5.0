import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {HEROINE_REFERENCE} from '../heroine-authority-3-7.mjs';
import {AIG50_SCHEMA} from '../aig-fullbody-5-0.mjs';
import {AIG51_SCHEMA} from '../aig-seam-contact-5-1.mjs';
import {AIG52_SCHEMA} from '../aig-runtime-evidence-5-2.mjs';
import {AIG53_SCHEMA,AIG53_CHECK_IDS,compileAIG53Evidence} from '../aig-unified-gate-5-3.mjs';
const modelSha='b'.repeat(64),ref=HEROINE_REFERENCE;
function validInputs(){
 return {
  sourceImageEvidence:{referenceId:ref.id,sourceMatched:true,sourceImageSHA256:ref.sha256},
  heroineSourceChain:{schema:'AIG_HEROINE_3_7_MODEL_SOURCE_CHAIN',referenceId:ref.id,
   sourceImageSHA256:ref.sha256,modelSHA256:modelSha,
   originalImageHashMatches:true,artifactHashMatches:true,glbStructuralAuditAvailable:true,
   sourceChainMatched:true,providerJobId:'test-fixture-not-production'},
  rig50:{schema:AIG50_SCHEMA,sourceSHA256:modelSha,outcome:'STRUCTURAL_QA_PASS_ONLY',
   skeletonTopologyGate:true,shoulderNeckHeadActualSharedIndexedComponent:true,
   animationHasRealSkinnedVertexMotion:true},
  seams51:{schema:AIG51_SCHEMA,sourceSHA256:modelSha,upstreamAIG50Outcome:'STRUCTURAL_QA_PASS_ONLY',
   outcome:'POSED_GEOMETRY_QA_PASS_ONLY',sampledShoulderNeckSeamsInRange:true,
   sampledBodyHairIntersectionFree:true,confirmedBodyHairContacts:0,posesChecked:15},
  visual52:{schema:AIG52_SCHEMA,sourceSHA256:modelSha,sourceMatchesCurrentViewer:true,
   visualEvidenceSource:'ACTUAL_BROWSER_WEBGL_CAPTURE_16_VIEWS',
   frameCount:16,frames:Array.from({length:4},()=>({views:Array.from({length:4},()=>({}))})),clipName:'Run'},
  fps52:{schema:AIG52_SCHEMA,sourceSHA256:modelSha,sourceMatchesCurrentViewer:true,
   runtime:'BROWSER_WEBGL_ANIMATION_LOOP',outcome:'BROWSER_FRAME_TIMING_PASS_ONLY',
   observedBrowserFramePacingPassed:true,measurementCompleted:true,measurementInvalidReason:null,
   measuredFrameIntervals:240,framesPerSecond:60,p95FrameMs:16.8,
   environment:{userAgent:'SyntheticTestNotRealBrowser'},clipName:'Run'},
  currentViewerSourceSHA256:modelSha,currentClipName:'Run',storyReady:true
 };
}
test('5.3 normal complete technical fixture is only READY FOR HUMAN REVIEW, not a formal release',()=>{
 const report=compileAIG53Evidence(validInputs());
 assert.equal(report.schema,AIG53_SCHEMA);
 assert.equal(report.technicalEvidenceReadyForReview,true);
 assert.equal(report.outcome,'TECHNICAL_BUNDLE_READY_FOR_HUMAN_REVIEW_ONLY');
 assert.equal(report.passedChecks,7);
 assert.equal(report.totalChecks,11);
 assert.equal(report.blockedChecks,4);
 assert.deepEqual(report.checks.map(c=>c.id),AIG53_CHECK_IDS);
 for(const gate of ['VISUAL_IDENTITY_HUMAN_REVIEW','ANDROID_NATIVE_DEVICE_60FPS',
  'WINDOWS_NATIVE_DEVICE_60FPS','PRODUCTION_VIDEO_AUDIO_REVIEW'])
   assert.equal(report.checks.find(c=>c.id===gate).status,'BLOCKED');
 assert.equal(report.releaseAllowed,false);
 assert.equal(report.canVerifyOriginalImageAndGLBSemanticLikeness,false);
});
test('5.3 missing evidence never receives blanket PASS; all stages remain individually identifiable',()=>{
 const result=compileAIG53Evidence();
 assert.equal(result.passedChecks,0);
 assert.equal(result.blockedChecks,AIG53_CHECK_IDS.length);
 assert.equal(result.outcome,'BLOCKED');
 assert.equal(result.sourceChainAvailable,false);
 assert.equal(result.releaseAllowed,false);
});
test('5.3 independently PASS visual and fps reports with different SHA or clip are BLOCKED',()=>{
 const cases=[
  x=>{x.heroineSourceChain.modelSHA256='c'.repeat(64);},
  x=>{x.sourceImageEvidence.sourceMatched=false;},
  x=>{x.rig50.animationHasRealSkinnedVertexMotion=false;},
  x=>{x.seams51.sourceSHA256='d'.repeat(64);},
  x=>{x.seams51.confirmedBodyHairContacts=1;},
  x=>{x.visual52.sourceSHA256='c'.repeat(64);},
  x=>{x.visual52.frameCount=15;},
  x=>{x.visual52.frames[0].views.pop();},
  x=>{x.currentClipName='OtherClip';},
  x=>{x.fps52.sourceSHA256='c'.repeat(64);},
  x=>{x.fps52.measurementInvalidReason='AIG52_PAGE_NOT_VISIBLE';},
  x=>{x.fps52.measuredFrameIntervals=120;},
  x=>{x.fps52.framesPerSecond=25;},
  x=>{x.currentViewerSourceSHA256='a'.repeat(64);}
 ];
 for(const mutate of cases){
  const x=validInputs();mutate(x);
  const result=compileAIG53Evidence(x);
  assert.equal(result.technicalEvidenceReadyForReview,false,mutate.toString());
  assert.equal(result.outcome,'BLOCKED');
  assert.equal(result.releaseAllowed,false);
 }
});
test('5.3 fake manual and native approval flags cannot grant release',()=>{
 const x=validInputs();
 x.nativeWindowsPass=true;x.nativeAndroidPass=true;x.manualApprove=true;
 x.fps52.actualNativeAndroid60FpsVerified=true;
 x.visual52.realHeroineApproved=true;
 const result=compileAIG53Evidence(x);
 assert.equal(result.releaseAllowed,false);
 assert.equal(result.checks.find(c=>c.id==='ANDROID_NATIVE_DEVICE_60FPS').status,'BLOCKED');
 assert.equal(result.checks.find(c=>c.id==='VISUAL_IDENTITY_HUMAN_REVIEW').status,'BLOCKED');
});
test('5.3 real RGB button, real callback and SHA-aware manifest preserve all previous A/V workflows',()=>{
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const app=fs.readFileSync(new URL('../app.mjs',import.meta.url),'utf8');
 for(const id of ['aig53-review','aig53-download','aig53-status'])
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 assert.ok(app.includes("$('aig53-review').addEventListener('click'"));
 assert.ok(app.includes("$('aig53-download').addEventListener('click'"));
 assert.ok(app.includes('compileAIG53Evidence('));
 assert.ok(app.includes('aig53ImageAdmission='));
 assert.ok(app.includes('aig53HeroineSourceChain='));
 assert.ok(app.includes('rig50:aig50Report'));
 assert.ok(app.includes('seams51:aig51Report'));
 assert.ok(app.includes('visual52:aig52VisualReport'));
 assert.ok(app.includes('fps52:aig52Report'));
 assert.ok(app.includes('currentViewerSourceSHA256:sourceSha'));
 assert.ok(app.includes('new MovieWorkspace('));
 assert.ok(app.includes('generateVoiceBatch('));
 assert.ok(app.includes("auditAIG51PosedSeamsAndHair(source,"));
});
