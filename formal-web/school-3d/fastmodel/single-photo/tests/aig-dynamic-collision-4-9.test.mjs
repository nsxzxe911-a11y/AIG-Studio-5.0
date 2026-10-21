import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {AIG45_POSES,recognizePose,auditMarks} from '../aig-calibration-4-5.mjs';
import {normalizePoseSet} from '../aig-head-neck-4-6.mjs';
import {buildAIG47Draft,exportAIG47GLB} from '../aig-welded-4-7.mjs';
import {buildAIG48Draft,exportAIG48GLB} from '../aig-skin-motion-4-8.mjs';
import {triangleSurfaceContact,auditSurfacePair,auditAIG49DynamicContacts,AIG49_SCHEMA} from '../aig-dynamic-collision-4-9.mjs';
import {parseStory,resolveStoryClips} from '../story-to-animation.mjs';
const marks={headTop:{x:.5,y:.07},chin:{x:.5,y:.17},
 leftShoulder:{x:.39,y:.25},rightShoulder:{x:.61,y:.25},
 leftHip:{x:.42,y:.53},rightHip:{x:.58,y:.53},
 leftAnkle:{x:.44,y:.9},rightAnkle:{x:.56,y:.9}};
function source(){
 const p=AIG45_POSES[0],cal=auditMarks(recognizePose({sha256:p.sha256,width:p.width,height:p.height}),marks);
 return buildAIG47Draft(normalizePoseSet([cal]));
}
const rig=()=>buildAIG48Draft(source());
test('4.9 triangle SAT: separated, transverse penetration, coplanar overlap, coplanar outside and touch',()=>{
 const a=[[0,0,0],[1,0,0],[0,1,0]];
 assert.equal(triangleSurfaceContact(a,[[0,0,2],[1,0,2],[0,1,2]]),false);
 assert.equal(triangleSurfaceContact(a,[[.25,.25,-1],[.25,.25,1],[.75,.25,0]]),true);
 assert.equal(triangleSurfaceContact(a,[[.1,.1,0],[.5,.1,0],[.1,.5,0]]),true);
 assert.equal(triangleSurfaceContact(a,[[2,2,0],[3,2,0],[2,3,0]]),false);
 assert.equal(triangleSurfaceContact(a,[[1,0,0],[2,0,0],[1,1,0]]),true);
 assert.throws(()=>triangleSurfaceContact(a,[[0,0,0],[1,0,0],[1,0,0]]),/DEGENERATE_TRIANGLE/);
 assert.throws(()=>triangleSurfaceContact(a,[[0,0,0],[1,0,0],[0,1,0]],{epsilon:-1}),/TRIANGLE_INPUT/);
});
test('4.9 bounded exact pair phase distinguishes crossings from nearby but disjoint triangles',()=>{
 const h=[[[0,0,0],[1,0,0],[0,1,0]]],close=[[[.1,.1,.001],[.8,.1,.001],[.1,.8,.001]]];
 const crossing=[[[.2,.2,-1],[.2,.2,1],[.7,.2,0]]];
 const far=auditSurfacePair(h,close),hit=auditSurfacePair(h,crossing);
 assert.equal(far.confirmedSurfaceContactPairs,0);
 assert.equal(far.sampledSurfaceIntersectionFree,true);
 assert.equal(hit.confirmedSurfaceContactPairs,1);
 assert.deepEqual(hit.examples,[{headFace:0,tailFace:0}]);
 assert.throws(()=>auditSurfacePair(h,Array(2).fill(crossing[0]),{pairBudget:1}),/PAIR_BUDGET/);
});
test('4.9 real exported 4.8 GLB skinned triangles sampled for every clip/time, no hidden partial pass',async()=>{
 const original=source(),before=exportAIG47GLB(original).bytes,working=rig();
 const glb48=exportAIG48GLB(working).bytes;
 const qa=await auditAIG49DynamicContacts(working);
 assert.equal(qa.schema,AIG49_SCHEMA);
 assert.deepEqual(qa.sourceSHA256,original.sourceSHA256);
 assert.equal(qa.posesChecked,15);
 assert.equal(qa.auditedClips.length,3);
 assert.ok(qa.testedFacePairs>1000);
 assert.equal(qa.exactTriangleTriangleAtSampleTimes,true);
 assert.equal(typeof qa.confirmedSurfaceContactPairs,'number');
 assert.equal(qa.sampledSurfaceIntersectionFree,qa.confirmedSurfaceContactPairs===0);
 for(const clip of qa.auditedClips){
  assert.equal(clip.posesChecked,5);
  assert.equal(clip.frames.length,5);
  assert.deepEqual(clip.frames.map(f=>f.seconds),[0,.5,1,1.5,2]);
  assert.ok(clip.frames.every(x=>x.testedFacePairs>0));
 }
 assert.deepEqual([...exportAIG47GLB(original).bytes],[...before]);
 assert.deepEqual([...exportAIG48GLB(working).bytes],[...glb48]);
 assert.equal(qa.continuousTimeCollisionFreeProven,false);
 assert.equal(qa.physicallySimulatedHair,false);
 assert.equal(qa.formalCharacterReleaseAllowed,false);
 await assert.rejects(()=>auditAIG49DynamicContacts(working,{pairBudget:1}),/PAIR_BUDGET_EXCEEDED/);
 await assert.rejects(()=>auditAIG49DynamicContacts(working,{totalBudget:1}),/TOTAL_PAIR_BUDGET/);
 await assert.rejects(()=>auditAIG49DynamicContacts({...working,sourceSHA256:[]}),/VERIFIED_4_8_RIG_REQUIRED/);
});
test('4.9 actual three named GLB clips are now script-addressable without inventing fighting',()=>{
 const clips=exportAIG48GLB(rig()).animationClips;
 assert.equal(clips,3);
 const records=[
  {name:'AIG48_TURN_HEAD',duration:2,tracks:[{name:'head.quaternion'}]},
  {name:'AIG48_NOD_HEAD',duration:2,tracks:[{name:'head.quaternion'}]},
  {name:'AIG48_SWING_PONYTAIL',duration:2,tracks:[{name:'tip.quaternion'}]}
 ];
 const parsed=parseStory('女主角轉頭，接著低頭，最後甩馬尾。');
 const plan=resolveStoryClips(parsed,records);
 assert.equal(plan.ready,true);
 assert.equal(plan.timeline.length,3);
 assert.deepEqual(plan.timeline.map(x=>x.clipName),records.map(x=>x.name));
 assert.equal(plan.textGenerated3DGeometry,false);
 assert.equal(plan.trueTwoCharacterCombatVerified,false);
 const fight=resolveStoryClips(parseStory('女主角揮拳'),records);
 assert.equal(fight.ready,false);
 assert.ok(fight.missing.length>0);
});
test('4.9 RGB controls and technical GLB direct player handoff retain prior video/audio and 4.8 source',()=>{
 const get=f=>fs.readFileSync(new URL(f,import.meta.url),'utf8');
 const html=get('../index.html'),app=get('../app.mjs'),report=get('../aig-dynamic-collision-4-9.mjs');
 for(const id of ['aig49-audit','aig49-load','aig49-evidence','aig49-status'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(app,/auditAIG49DynamicContacts\(rig\)/);
 assert.match(app,/aig49Reset\(/);
 assert.match(app,/await load\(glb\.bytes\.buffer,false\)/);
 assert.ok(app.includes('new MovieWorkspace('));
 assert.ok(app.includes('exportAIG47GLB(aig47Draft)'));
 assert.ok(app.includes('exportAIG48GLB(aig48Draft)'));
 assert.ok(!/MeshyClient|fetch\(|https:\/\//.test(report));
 const v=JSON.parse(get('../package.json')).version.split('.').map(Number);
 assert.ok(v[0]>4||(v[0]===4&&v[1]>=9),'version must be >=4.9, never downgraded');
});
