import test from 'node:test';
import assert from 'node:assert/strict';
import {buildAIGStage1AdultAnatomy}
 from '../aig-stage1-dual-adult-anatomy.mjs';
import {AIG_STAGE1_LOGICAL_SLOTS,AIG_STAGE1_SLOT_BUDGET,
 AIG_STAGE1_RATIO_SCHEMA,planAIGStage1OneCore19200,
 auditHumanProportion,auditSkeletonAlignment,
 auditViewportAspect,fitHumanToView,runStage1UnifiedRenderLogicCore}
 from '../aig-stage1-unified-19200-ratio-core.mjs';

test('19,200 reserved logical validation slots are ONE kernel, zero added renderer, never GPU cores',()=>{
 const plan=planAIGStage1OneCore19200();
 assert.equal(plan.schema,AIG_STAGE1_RATIO_SCHEMA);
 assert.equal(plan.logicalSlotsConfigured,AIG_STAGE1_LOGICAL_SLOTS);
 assert.deepEqual(Object.values(AIG_STAGE1_SLOT_BUDGET),
  [4000,5000,4000,3000,3200]);
 assert.equal(Object.values(AIG_STAGE1_SLOT_BUDGET).reduce((a,b)=>a+b,0),19200);
 assert.equal(plan.rendererImplementationCount,1);
 assert.equal(plan.sharedWebGLRendererCount,1);
 assert.equal(plan.reusedExistingAIG36UnifiedCore,true);
 assert.equal(plan.existingCoreWorkProfile,'REAL3D_19200_LOGICAL_WORK_SLOTS');
 assert.equal(plan.extraWebGLContextsCreated,0);
 assert.equal(plan.actualCpuHardwareCoresCreated,0);
 assert.equal(plan.actualWorkersSpawned,0);
 assert.equal(plan.oneJsExecutionQueue,true);
 assert.throws(()=>planAIGStage1OneCore19200({requestedLogicalSlots:19199}),
  /FIXED_19200_LOGICAL_SLOTS_REQUIRED/);
});
for(const gender of ['male','female']){
 test('real '+gender+' source passes bounded adult geometry and 21 joint alignment, never appearance PASS',()=>{
  const model=buildAIGStage1AdultAnatomy(gender),
   before=model.parts.map(x=>x.geometry.positions.slice());
  const proportions=auditHumanProportion(model);
  const joints=auditSkeletonAlignment(model);
  assert.deepEqual(proportions.proportionIssues,[]);
  assert.equal(proportions.proportionNumericContractPASS,true);
  assert.equal(joints.actualJointCount,21);
  assert.equal(joints.boneAlignmentNumericContractPASS,true);
  assert.deepEqual(joints.alignmentIssues,[]);
  assert.ok(proportions.headToBodyRatio>.12);
  assert.ok(proportions.headToBodyRatio<.15);
  assert.ok(proportions.legSeparationNormalized>.018);
  assert.ok(proportions.shoulderToHeadRatio>1.8);
  assert.ok(proportions.shoulderToHeadRatio<2.8);
  model.parts.forEach((x,i)=>assert.deepEqual(x.geometry.positions,before[i]));
  const audit=runStage1UnifiedRenderLogicCore({
   model,view:'front',aspect:390/844,
   viewport:{cssWidth:390,cssHeight:844,gpuWidth:390,gpuHeight:844,
    cameraAspect:390/844}
  });
  assert.equal(audit.logicalCore.logicalSlotsConfigured,19200);
  assert.ok(audit.allocatedActualWorkUnits.proportion>2000);
  assert.equal(audit.allocatedActualWorkUnits.skeleton,21);
  assert.equal(audit.proportions.proportionNumericContractPASS,true);
  assert.ok(audit.numericAndEvidenceViolations.includes('FOUR_REAL_VIEW_SNAPSHOTS_REQUIRED'));
  assert.equal(audit.stage1ReleasePASS,false);
 });
}
test('real proportional cameras keep 0.78-0.86 human vertical framing on phone and desktop',()=>{
 const model=buildAIGStage1AdultAnatomy('female');
 const results=[];
 for(const aspect of [390/844,1440/900])
  for(const view of ['front','profile','rear','quarter45']){
   const x=fitHumanToView(model,{view,aspect});
   results.push(x);
   assert.equal(x.framingNumericContractPASS,true,
    view+' aspect='+aspect+' '+JSON.stringify(x));
   assert.ok(x.actualProjectedBodyHeightRatio>=.7);
   assert.ok(x.actualProjectedBodyHeightRatio<=.822);
   assert.ok(x.actualProjectedBodyWidthRatio<=.902);
   assert.equal(x.actualPixelSilhouetteStillRequiresWebGLSnapshot,true);
   assert.deepEqual(x.target,results[0].target);
  }
 assert.notDeepEqual(results[0].cameraPosition,results[1].cameraPosition);
 assert.notDeepEqual(results[0].cameraPosition,results[2].cameraPosition);
});
test('viewport uses actual css and gpu canvas aspect and rejects stretched and wrong camera',()=>{
 const good=auditViewportAspect({cssWidth:390,cssHeight:700,
  gpuWidth:780,gpuHeight:1400,cameraAspect:390/700});
 assert.equal(good.viewportNumericContractPASS,true);
 assert.equal(good.actualCanvasUsedNotParentPanel,true);
 assert.equal(auditViewportAspect({cssWidth:390,cssHeight:700,
  gpuWidth:780,gpuHeight:1000,cameraAspect:390/700})
  .viewportNumericContractPASS,false);
 assert.equal(auditViewportAspect({cssWidth:390,cssHeight:700,
  gpuWidth:780,gpuHeight:1400,cameraAspect:1.4})
  .viewportNumericContractPASS,false);
 assert.throws(()=>auditViewportAspect({
  cssWidth:390,cssHeight:0,gpuWidth:780,gpuHeight:1400,cameraAspect:1
 }),/REAL_CANVAS_AND_GPU_MEASUREMENTS_REQUIRED/);
});
test('four distinct real screenshot SHA records are necessary but never enough for visual appearance PASS',()=>{
 const model=buildAIGStage1AdultAnatomy('male');
 const views=['front','profile','rear','quarter45'];
 const snapshots=views.map((view,i)=>({view,sha256:String(i+1).repeat(64),
  realWebGLRendererPixels:true}));
 const opts={model,view:'front',aspect:390/700,
  viewport:{cssWidth:390,cssHeight:700,gpuWidth:390,gpuHeight:700,
   cameraAspect:390/700}};
 const numeric=runStage1UnifiedRenderLogicCore({...opts,snapshots});
 assert.equal(numeric.numericAndEvidenceViolations.length,0,
  JSON.stringify(numeric.numericAndEvidenceViolations));
 assert.equal(numeric.numericAndEvidenceGatePASS,true);
 assert.equal(numeric.stage1ReleasePASS,false);
 assert.equal(numeric.realAppearanceHumanReviewed,false);
 const repeated=runStage1UnifiedRenderLogicCore({
  ...opts,snapshots:snapshots.map(x=>({...x,sha256:'a'.repeat(64)}))
 });
 assert.equal(repeated.numericAndEvidenceGatePASS,false);
 assert.ok(repeated.numericAndEvidenceViolations.includes(
  'SNAPSHOT_SOURCE_OR_UNIQUENESS_FAIL'));
});
