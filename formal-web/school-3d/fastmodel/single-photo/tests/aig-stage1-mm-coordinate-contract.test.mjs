import test from 'node:test';
import assert from 'node:assert/strict';
import {buildAIGStage1AdultAnatomy} from '../aig-stage1-dual-adult-anatomy.mjs';
import {AIG_STAGE1_MM_SCHEMA,AIG_STAGE1_MM_CONTRACT,
 toAIGStage1MicrometerTicks,aigStage1MmFromTicks,
 aigStage1WebGLMetersFromTicks,aigStage1MMVectorFromMeters,
 aigStage1WebGLGeometryFromCanonicalMM,makeAIGStage1CanonicalMM,
 auditAIGStage1MMConversion} from '../aig-stage1-mm-coordinate-contract.mjs';
import {auditHumanProportion,fitHumanToView,runStage1UnifiedRenderLogicCore}
 from '../aig-stage1-unified-19200-ratio-core.mjs';

test('0.001 mm is integer tick based, while 1 world renderer unit stays 1 meter',()=>{
 assert.equal(AIG_STAGE1_MM_CONTRACT.worldUnit,'mm');
 assert.equal(AIG_STAGE1_MM_CONTRACT.coordinatePrecisionMm,.001);
 assert.equal(toAIGStage1MicrometerTicks(1),1000000);
 assert.equal(aigStage1MmFromTicks(1000000),1000);
 assert.equal(aigStage1WebGLMetersFromTicks(1000000),1);
 assert.deepEqual(aigStage1MMVectorFromMeters([0,1.783214,-.000001]),
  [0,1783.214,-.001]);
 assert.equal(toAIGStage1MicrometerTicks(.0000014),1);
 assert.equal(toAIGStage1MicrometerTicks(.0000016),2);
 assert.throws(()=>toAIGStage1MicrometerTicks(Infinity),/FINITE_SAFE_METERS_REQUIRED/);
 assert.throws(()=>aigStage1WebGLGeometryFromCanonicalMM(new Float32Array(9)),
  /CANONICAL_TICK_ARRAY_REQUIRED/);
});
for(const [gender,expectedHeight] of [['male',1780],['female',1680]]){
 test(gender+' true indexed body and full skeleton are canonical mm; render adapter has no x1000 scaling',()=>{
  const source=buildAIGStage1AdultAnatomy(gender);
  const orig=source.parts.map(p=>p.geometry.positions.slice());
  const canonical=makeAIGStage1CanonicalMM(source);
  const audit=auditAIGStage1MMConversion(source,canonical);
  assert.equal(canonical.schema,AIG_STAGE1_MM_SCHEMA);
  assert.equal(canonical.coordinateContract.precisionMm,undefined);
  assert.equal(canonical.coordinateContract.coordinatePrecisionMm,.001);
  assert.equal(canonical.heightMm,expectedHeight);
  assert.equal(canonical.heightTicks,expectedHeight*1000);
  assert.equal(canonical.partCount,source.partCount);
  assert.equal(canonical.jointCount,21);
  assert.equal(audit.canonicalMillimeterGatePASS,true,
   JSON.stringify(audit.millimeterContractViolations));
  assert.equal(audit.verifiedMillimeterHeight,expectedHeight);
  assert.equal(audit.geometryPartCountChecked,source.parts.length);
  for(const part of source.parts){
   const ticks=canonical.parts[part.id].positionTicks;
   const render=aigStage1WebGLGeometryFromCanonicalMM(ticks);
   assert.ok(render.every(Number.isFinite));
   for(let i=0;i<render.length;i++){
    assert.ok(Math.abs(render[i]-part.geometry.positions[i])<.0000008);
   }
  }
  for(const [id,j] of Object.entries(source.joints)){
   const t=canonical.joints[id].positionTicks;
   for(let k=0;k<3;k++)
    assert.ok(Math.abs(aigStage1MmFromTicks(t[k])-
     j.position[k]*1000)<.000501);
  }
  source.parts.forEach((p,i)=>assert.deepEqual(p.geometry.positions,orig[i]));
  const metrics=auditHumanProportion(source);
  assert.equal(metrics.actualAdultHeightMm,expectedHeight);
  assert.ok(metrics.truePelvicBodyWidthMm>250);
  assert.notEqual(metrics.truePelvicBodyWidthMm,
   metrics.hipJointDistanceMm,'should use pelvis surface not joint spacing');
  assert.equal(metrics.precisionMm,.001);
  const fit=fitHumanToView(source,{view:'quarter45',aspect:390/844});
  assert.ok(fit.cameraDistanceMm>expectedHeight);
  assert.equal(fit.cameraPositionMm.length,3);
  const report=runStage1UnifiedRenderLogicCore({model:source,
   canonicalMM:canonical,aspect:390/700,
   viewport:{cssWidth:390,cssHeight:700,gpuWidth:390,gpuHeight:700,
    cameraAspect:390/700}});
  assert.equal(report.logicalCore.logicalSlotsConfigured,19200);
  assert.equal(report.canonicalMillimeters.canonicalMillimeterGatePASS,true);
  assert.equal(report.dimensionsMm.bodyHeight,expectedHeight);
  assert.equal(report.threeFixes.actualPelvisMeshSurfaceUsed,true);
  assert.equal(report.threeFixes.fullBodyCameraAutofitPassed,true);
  assert.equal(report.threeFixes.freshFourViewActualPngShaVerified,false);
  assert.equal(report.stage1ReleasePASS,false);
 });
}
test('damaged 0.001 mm joint source or wrong gender is blocked before mesh is installed',()=>{
 const source=buildAIGStage1AdultAnatomy('female');
 const canonical=makeAIGStage1CanonicalMM(source);
 canonical.joints.leftKnee.positionTicks[0]+=5;
 const failed=auditAIGStage1MMConversion(source,canonical);
 assert.equal(failed.canonicalMillimeterGatePASS,false);
 assert.ok(failed.millimeterContractViolations.includes(
  'JOINT_PRECISION_MISMATCH_leftKnee'));
 const male=buildAIGStage1AdultAnatomy('male');
 assert.throws(()=>auditAIGStage1MMConversion(male,canonical),
  /SOURCE_CANONICAL_CONTRACT_MISMATCH/);
});
