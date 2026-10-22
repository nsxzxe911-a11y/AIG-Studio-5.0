import test from 'node:test';
import assert from 'node:assert/strict';
import {parseAIG12NCWorkingCopy,simulateAIG12NCWorkingCopy}
 from '../../../../shared-3d/aig-real3d-nc-preview-1-2.mjs';
import {AIG13_REPLAY_SCHEMA,createAIG13SingleBlockReplay,
 advanceAIG13SingleBlockReplay,seekAIG13SingleBlockReplay,
 auditAIG13SingleBlockReplay,currentAIG13ReplayBoundary}
 from '../../../../shared-3d/aig-real3d-step-replay-1-3.mjs';

const sample=['(Local source preview only)','G21 G90 G54',
'S2300 M3','G0 X-6 Y0 Z10','G1 Z1 F150','G1 X6 Y0 Z1',
'G0 Z10','M5','M30'].join('\n');
const program=parseAIG12NCWorkingCopy(sample),
 settings={stockOriginMm:[-8,-5,-2],stockSizeMm:[16,10,5],
  voxelMm:.5,cutterDiameterMm:2,fluteLengthMm:6,maxFaces:42000};
test('1.3 source is actually re-parsed and blocks tampered/fabricated G-code',()=>{
 assert.equal(program.motionSegmentCount,3);
 assert.throws(()=>createAIG13SingleBlockReplay({...program,segments:[
  {...program.segments[0],motion:'G0'},...program.segments.slice(1)
 ]},settings),/REPARSED_SOURCE_MISMATCH/);
 assert.throws(()=>createAIG13SingleBlockReplay({...program,rawSourcePreserved:sample+'\nG91'},settings),
  /AFTER_M30|SOURCE_MISMATCH/);
 const bad=sample.replace('G1 Z1 F150','G43 Z1 H1 F150');
 assert.throws(()=>parseAIG12NCWorkingCopy(bad),/G_CODE_UNSUPPORTED/);
});
test('1.3 G0 is safe, G1 changes actual occupancy and indexed triangle geometry',()=>{
 const replay=createAIG13SingleBlockReplay(program,settings);
 const initial=auditAIG13SingleBlockReplay(replay),
  firstBoundary=currentAIG13ReplayBoundary(replay);
 assert.equal(initial.schema,AIG13_REPLAY_SCHEMA);
 assert.equal(initial.blockIndex,0);
 assert.equal(initial.cumulativeRemovedMm3,0);
 assert.ok(firstBoundary.triangleCount>0);
 const first=advanceAIG13SingleBlockReplay(replay);
 assert.equal(first.lastMotion,'G1'); // Initial G0 is positioning only (not a segment)
 assert.ok(first.cumulativeRemovedMm3>0);
 const second=advanceAIG13SingleBlockReplay(replay);
 assert.ok(second.cumulativeRemovedMm3>=first.cumulativeRemovedMm3);
 assert.equal(second.blockIndex,2);
 const after=currentAIG13ReplayBoundary(replay);
 assert.equal(after.hasActualIndexedXYZ,true);
 assert.ok(after.triangleCount>firstBoundary.triangleCount,
  'cut exposes interior voxel boundary faces: topology changes numerically');
 const final=advanceAIG13SingleBlockReplay(replay);
 assert.equal(final.finished,true);
 assert.equal(final.lastMotion,'G0');assert.equal(final.lastRemovedMm3,0);
 assert.equal(final.G0NeverRemovesStock,true);
 assert.equal(final.cumulativeRemovedMm3,second.cumulativeRemovedMm3);
 assert.throws(()=>advanceAIG13SingleBlockReplay(replay),/ALREADY_FINISHED/);
});
test('1.3 full-step replay agrees exactly with existing 1.2 bulk numerical stock simulation',()=>{
 const bulk=simulateAIG12NCWorkingCopy(program,settings),
  replay=createAIG13SingleBlockReplay(program,settings);
 let a;while(!auditAIG13SingleBlockReplay(replay).finished)
  a=advanceAIG13SingleBlockReplay(replay);
 assert.ok(a.cumulativeRemovedMm3>0);
 assert.equal(a.cumulativeRemovedMm3,bulk.actualRemovedVolumeMm3);
 assert.equal(a.triangleCount,bulk.boundaryTriangleCount);
 assert.deepEqual(replay._state.stock.occupancy,bulk.stock.occupancy);
 assert.deepEqual(a.replayHistory.map(x=>x.removedMm3),bulk.steps.map(x=>x.removedMm3));
});
test('1.3 rewinds by source re-execution, no stale/fake canvas snapshot',()=>{
 const replay=createAIG13SingleBlockReplay(program,settings);
 const end=seekAIG13SingleBlockReplay(replay,program.segments.length);
 const down=seekAIG13SingleBlockReplay(replay,1);
 assert.equal(down.blockIndex,1);
 assert.ok(down.cumulativeRemovedMm3<end.cumulativeRemovedMm3);
 const back=seekAIG13SingleBlockReplay(replay,0);
 assert.equal(back.cumulativeRemovedMm3,0);
 assert.equal(back.blockIndex,0);
 const restored=seekAIG13SingleBlockReplay(replay,program.segments.length);
 assert.equal(restored.cumulativeRemovedMm3,end.cumulativeRemovedMm3);
 assert.equal(restored.triangleCount,end.triangleCount);
 assert.throws(()=>seekAIG13SingleBlockReplay(replay,-1),/SEEK_POSITION_OUT_OF_RANGE/);
 assert.equal(auditAIG13SingleBlockReplay(replay).blockIndex,program.segments.length);
});
test('1.3 topology/memory errors are atomic and preserve prior verified stock copy',()=>{
 const replay=createAIG13SingleBlockReplay(program,settings);
 const before=auditAIG13SingleBlockReplay(replay);
 replay.options.maxFaces=6; // intentional runtime invalid topology budget
 assert.throws(()=>advanceAIG13SingleBlockReplay(replay),/SURFACE_TRIANGLE_BUDGET/);
 const after=auditAIG13SingleBlockReplay(replay);
 assert.equal(after.blockIndex,before.blockIndex);
 assert.equal(after.cumulativeRemovedMm3,before.cumulativeRemovedMm3);
 replay.options.maxFaces=42000;
 assert.ok(advanceAIG13SingleBlockReplay(replay).cumulativeRemovedMm3>0);
});
test('1.3 rejects excessive voxel resolution / unsafe source; remains read-only',()=>{
 assert.throws(()=>createAIG13SingleBlockReplay(program,{...settings,voxelMm:.001}),
  /REPLAY_CONFIG_OUT_OF_BOUNDS/);
 assert.throws(()=>createAIG13SingleBlockReplay(program,{...settings,voxelMm:.1}),
  /SIZE_MUST_BE_INTEGER_VOXEL_CELLS|VOXEL_MEMORY_BUDGET/);
 const s=createAIG13SingleBlockReplay(program,settings);
 assert.equal(s.readOnly,true);
 assert.equal(s.sendCNCCommands,false);
 const a=auditAIG13SingleBlockReplay(s);
 assert.equal(a.realMachineOutputCommandsSent,0);
 assert.equal(a.realNCPrecision0001mm,false);
 assert.equal(a.completeFanucValidation,false);
});
