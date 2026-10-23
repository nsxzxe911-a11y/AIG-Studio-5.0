import test from 'node:test';
import assert from 'node:assert/strict';
import {createAIG39StabilitySession,planAIG39ConservativeBudget,
 AIG39_STABILITY_SCHEMA} from '../aig-runtime-stability-3-9.mjs';
test('single 12k logical kernel blocks overlapping scans and cancels stale photo scan',()=>{
 const session=createAIG39StabilitySession();
 const scan=session.begin('source-reconstruction');
 assert.equal(session.snapshot().schema,AIG39_STABILITY_SCHEMA);
 assert.equal(session.snapshot().activeJob,'source-reconstruction');
 assert.throws(()=>session.begin('source-reconstruction'),
  /AIG39_OPERATION_ALREADY_IN_PROGRESS/);
 assert.equal(session.snapshot().blocked,1);
 assert.equal(session.cancel(),true);
 assert.equal(scan.signal.aborted,true);
 assert.throws(()=>session.assertCurrent(scan),
  /AIG39_STALE_OR_CANCELLED_RENDER_OPERATION/);
 const next=session.begin('source-reconstruction');
 assert.equal(next.generation,scan.generation+1);
 session.assertCurrent(next);
 session.finish(next);
 assert.equal(session.snapshot().activeJob,null);
 assert.equal(session.snapshot().completed,1);
 assert.equal(session.snapshot().cancelled,1);
 assert.equal(session.snapshot().previousGLBAndWorldCleared,false);
});
test('outfit update cancellation leaves session reusable and invalid paths fail closed',()=>{
 const state=createAIG39StabilitySession();
 const started=state.begin('wardrobe-switch');
 assert.throws(()=>state.finish({generation:started.generation+1,
  signal:started.signal}),/AIG39_STALE_OR_CANCELLED_RENDER_OPERATION/);
 assert.equal(state.abandon(started),true);
 assert.equal(state.abandon(started),false);
 const again=state.begin('wardrobe-switch');
 state.finish(again);
 assert.equal(state.snapshot().completed,1);
 assert.throws(()=>state.begin('remove-everything'),/AIG39_UNKNOWN_OPERATION/);
});
test('12k shards are only work partitions, with conservative mobile/low RAM lane budget',()=>{
 const limited=planAIG39ConservativeBudget({
  requestedLogicalSlots:12000,hardwareConcurrency:16,mobile:true,
  deviceMemoryGb:2,vertexCount:8400});
 assert.equal(limited.requestedLogicalSlots,12000);
 assert.equal(limited.effectiveSlots,8400);
 assert.equal(limited.cappedCooperativeLanes,1);
 assert.equal(limited.rendererContextsAllowed,1);
 assert.equal(limited.realWebWorkersSpawned,0);
 assert.equal(limited.hardwareCoreMultiplier,1);
 assert.equal(limited.originalImageMeshAndGLBMutationPermitted,false);
 const desktop=planAIG39ConservativeBudget({
  requestedLogicalSlots:12000,hardwareConcurrency:16,
  deviceMemoryGb:16,vertexCount:16000});
 assert.equal(desktop.effectiveSlots,12000);
 assert.equal(desktop.cappedCooperativeLanes,4);
 assert.equal(desktop.measuredFps,null);
 assert.throws(()=>planAIG39ConservativeBudget({
  requestedLogicalSlots:120001,vertexCount:200000}),/VALID_VERTEX_AND_SLOT_COUNT_REQUIRED/);
});
