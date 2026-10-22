import test from 'node:test';
import assert from 'node:assert/strict';
import {AIG12_NC_SCHEMA,parseAIG12NCWorkingCopy,simulateAIG12NCWorkingCopy}
 from '../../../../shared-3d/aig-real3d-nc-preview-1-2.mjs';

const sample=[
 '(AIG Real3D 1.2 read-only preview, not machine-ready)',
 '%','G21 G90 G54','S2300 M3',
 'N10 G0 X-6 Y0 Z10',
 'N20 G1 Z1 F150',
 'N30 G1 X6 Y0 Z1',
 'N40 G0 Z10',
 'M5','M30','%'
].join('\n');
test('1.2 parses actual limited G21 G90 G54 G0 G1 working-copy block modal XYZ',()=>{
 const p=parseAIG12NCWorkingCopy(sample);
 assert.equal(p.schema,AIG12_NC_SCHEMA);
 assert.equal(p.machineCommandAuthority,false);
 assert.equal(p.verifiedForMachineUse,false);
 assert.equal(p.segments.length,3);
 assert.equal(p.feedSegments,2);
 assert.equal(p.rapidSegments,1);
 assert.deepEqual(p.segments[0].from,[-6,0,10]);
 assert.deepEqual(p.segments[0].to,[-6,0,1]);
 assert.equal(p.segments[0].motion,'G1');
 assert.deepEqual(p.segments[1].to,[6,0,1]);
 assert.equal(p.segments[2].motion,'G0');
 assert.equal(p.segments[0].feedMmPerMin,150);
});
test('1.2 uses real numerical 3D occupancy and G0 stays non-cutting',()=>{
 const parsed=parseAIG12NCWorkingCopy(sample);
 const sim=simulateAIG12NCWorkingCopy(parsed,{
  stockOriginMm:[-8,-5,-2],stockSizeMm:[16,10,5],
  voxelMm:.5,cutterDiameterMm:2,fluteLengthMm:6
 });
 assert.ok(sim.actualRemovedVolumeMm3>0);
 assert.ok(sim.actualRemovedVolumeMm3<sim.audit.originalMm3);
 assert.equal(sim.actualRemovedVolumeMm3,sim.audit.removedCells*.125);
 assert.equal(sim.steps.length,3);
 assert.equal(sim.steps[2].motion,'G0');
 assert.equal(sim.steps[2].removedMm3,0);
 assert.equal(sim.rapidNeverCuts,true);
 assert.equal(sim.realMachineInstructionsSent,0);
 assert.equal(sim.precision0001NotVerified,true);
 assert.ok(sim.boundaryMesh?.actualXYZTriangles);
 assert.ok(sim.boundaryTriangleCount>100);
 assert.equal(sim.audit.remainingMm3+sim.audit.removedMm3,sim.audit.originalMm3);
});
test('1.2 rejects macro, arcs, canned cycles, coordinates G91 and imperial G20 rather than guessing',()=>{
 for(const unsupported of ['G2 X0 Y1 I2','G3 X0 Y1 J2','G83 Z-5 Q1','G91 X3',
  'G20','G43 H1','G92 X0','M98 P4','T9 M6','A30 B10 C50',
  '#100=1','G41 D1','M42']){
  const nc=sample.replace('N30 G1 X6 Y0 Z1','N30 '+unsupported);
  assert.throws(()=>parseAIG12NCWorkingCopy(nc),/AIG12_NC_/,
   'unsupported code must fail closed: '+unsupported);
 }
});
test('1.2 refuses unsafe partial source, missing feed, missing spindle, wrong first G0 XYZ',()=>{
 assert.throws(()=>parseAIG12NCWorkingCopy(sample.replace('M30','')),/EXPLICIT_M30_REQUIRED/);
 assert.throws(()=>parseAIG12NCWorkingCopy(sample.replace('Z10','Z300000')),/OUTSIDE_SAFETY_RANGE/);
 assert.throws(()=>parseAIG12NCWorkingCopy(sample.replace('G21 G90 G54','G21 G90')),/G21_G90_G54_REQUIRED|SPINDLE_REQUIRES/);
 assert.throws(()=>parseAIG12NCWorkingCopy(sample.replace('G1 Z1 F150','G1 Z1')),/FEED_REQUIRES/);
 assert.throws(()=>parseAIG12NCWorkingCopy(sample.replace('S2300 M3','S2300')),/FEED_REQUIRES/);
 assert.throws(()=>parseAIG12NCWorkingCopy(sample.replace('G0 X-6 Y0 Z10','G1 X-6 Y0 Z10')),
  /FIRST_POSITION_MUST_BE_G0_XYZ/);
 assert.throws(()=>parseAIG12NCWorkingCopy(sample+'\nG1 X1'),/AFTER_M30/);
 assert.throws(()=>parseAIG12NCWorkingCopy(sample.replace('N20 G1 Z1 F150','N20 G1 Z1 X2 X4 F150')),/DUPLICATE_WORD/);
});
test('1.2 invalid parser output cannot be used to start simulated cut',()=>{
 const p=parseAIG12NCWorkingCopy(sample);
 assert.throws(()=>simulateAIG12NCWorkingCopy({...p,verifiedForMachineUse:true}),
  /VERIFIED_PARSER_OUTPUT_REQUIRED/);
 assert.throws(()=>simulateAIG12NCWorkingCopy({...p,
  segments:[{motion:'G2',from:[0,0,0],to:[1,2,3]}]}),
  /VERIFIED_PARSER_OUTPUT_REQUIRED/);
 assert.throws(()=>simulateAIG12NCWorkingCopy(p,{stockSizeMm:[1600,6,4]}),
  /AIG_STOCK_/);
});
test('1.2 out-of-stock feed is numerically zero, not fake removal',()=>{
 const p=parseAIG12NCWorkingCopy([
  'G21 G90 G54','S1000 M3','G0 X100 Y100 Z20','G1 X110 Y100 Z20 F100','M30'
 ].join('\n'));
 const sim=simulateAIG12NCWorkingCopy(p,{stockSizeMm:[8,8,8],voxelMm:1});
 assert.equal(sim.actualRemovedVolumeMm3,0);
 assert.equal(sim.actualNumericalVoxelCutting,false);
 assert.equal(sim.audit.remainingMm3,sim.audit.originalMm3);
 assert.equal(sim.realMachineInstructionsSent,0);
});
