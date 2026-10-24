import test from 'node:test';
import assert from 'node:assert/strict';
import {AIG_REAL3D_V91_SPORTS,AIG_REAL3D_V91_PRESETS,
 simulateAIGReal3DSportBall}
 from '../aig-real3d-sports-ballistics.mjs';
import {createAIGReal3DSport3DReplay}
 from '../aig-real3d-sports-3d-replay.mjs';
const near=(a,b,tol)=>assert.ok(Math.abs(a-b)<tol,`expected ${a} ~= ${b} within ${tol}`);
test('V91 five sports have distinct physical SI parameter presets and actual XYZ frame trajectories',()=>{
 assert.deepEqual(AIG_REAL3D_V91_SPORTS,
  ['BASEBALL','TENNIS','BASKETBALL','SOCCER','TABLE_TENNIS']);
 for(const sport of AIG_REAL3D_V91_SPORTS){
  const p=AIG_REAL3D_V91_PRESETS[sport];
  assert.ok(p.massKg>0&&p.radiusM>0&&p.dragCoefficient>0);
  const t=simulateAIGReal3DSportBall({sport,initialPosition:[0,4,0],
   initialVelocity:[8,6,3],initialAngularVelocity:[0,100,0],
   durationSec:.75,fps:60});
  assert.ok(t.frames.length>=45&&t.diagnostics.actualIntegratedSubsteps>100);
  assert.equal(t.diagnostics.actuallyMoving3DPositions,true);
  assert.equal(t.diagnostics.releasePASS,false);
  assert.notDeepEqual(t.frames[0].position,t.frames.at(-1).position);
  assert.ok(t.frames.every(f=>[...f.position,...f.velocity,
   ...f.angularVelocity,...f.orientationQuaternion].every(Number.isFinite)));
 }
});
test('V91 gravity-only trajectory obeys ballistic parabola, constant lateral speed',()=>{
 const t=simulateAIGReal3DSportBall({sport:'BASEBALL',
  initialPosition:[0,25,0],initialVelocity:[12,12,5],
  initialAngularVelocity:[0,0,0],airDensity:0,
  gravity:9.80665,durationSec:1.5,fps:60,surfaces:[]});
 const last=t.frames.at(-1),duration=1.5;
 near(last.position[0],12*duration,.00001);
 near(last.position[2],5*duration,.00001);
 near(last.position[1],25+12*duration-.5*9.80665*duration**2,.04);
 assert.equal(t.collisions.length,0);
});
test('V91 Magnus lift changes actual 3D Z direction rather than 2D texture',()=>{
 const input={sport:'SOCCER',initialPosition:[0,9,0],
  initialVelocity:[24,2,0],durationSec:.8,fps:60,surfaces:[]};
 const a=simulateAIGReal3DSportBall({...input,initialAngularVelocity:[0,0,0]});
 const b=simulateAIGReal3DSportBall({...input,initialAngularVelocity:[0,130,0]});
 assert.ok(Math.abs(b.frames.at(-1).position[2])>.08);
 near(a.frames.at(-1).position[2],0,.000001);
 assert.notDeepEqual(b.frames.at(-1).orientationQuaternion,
  a.frames.at(-1).orientationQuaternion);
});
test('V91 plane collision changes direction and retains ball above floor',()=>{
 const t=simulateAIGReal3DSportBall({sport:'BASKETBALL',
  initialPosition:[0,1.0,0],initialVelocity:[2,-7,0],
  gravity:0,airDensity:0,durationSec:.3,fps:60});
 assert.ok(t.collisions.length>=1);
 assert.equal(t.collisions[0].surfaceId,'ground');
 assert.ok(t.collisions[0].velocityBefore[1]<0);
 assert.ok(t.collisions[0].velocityAfter[1]>0);
 assert.ok(t.frames.every(f=>f.position[1]>=t.preset.radiusM-.0005));
 assert.ok(t.collisions[0].velocityAfter[0]<t.collisions[0].velocityBefore[0]);
});
test('V91 actor racket/paddle/bat kick are real 3D impulse contacts with geometry gate',()=>{
 for(const [sport,app] of [['BASEBALL','BAT'],['TENNIS','RACKET'],
  ['SOCCER','FOOT'],['BASKETBALL','HAND'],['TABLE_TENNIS','PADDLE']]){
  const radius=AIG_REAL3D_V91_PRESETS[sport].radiusM;
  const actor={type:'IMPACT',timeSec:0,actorId:'actor1',
   apparatus:app,contactPoint:[-radius,2,0],contactNormal:[1,0,0],
   surfaceVelocity:[20,3,0]};
  const t=simulateAIGReal3DSportBall({sport,initialPosition:[0,2,0],
   initialVelocity:[0,0,0],gravity:0,airDensity:0,
   actorEvents:[actor],durationSec:.20,surfaces:[]});
  assert.equal(t.actorContacts[0].type,'ACTOR_IMPACT');
  assert.ok(t.frames[0].velocity[0]>0);
  assert.ok(t.frames.at(-1).position[0]>0);
 }
 const r=AIG_REAL3D_V91_PRESETS.TENNIS.radiusM;
 assert.throws(()=>simulateAIGReal3DSportBall({sport:'TENNIS',
  initialPosition:[0,2,0],actorEvents:[{type:'IMPACT',timeSec:0,
   actorId:'x',apparatus:'RACKET',surfaceVelocity:[20,0,0],
   contactNormal:[1,0,0],contactPoint:[-3*r,2,0]}]}),
  /ACTOR_IMPACT_POSITION_NOT_ON_BALL/);
});
test('V91 release event replaces source-defined hand velocity and projects forward',()=>{
 const t=simulateAIGReal3DSportBall({sport:'BASEBALL',
  initialPosition:[0,2,0],initialVelocity:[0,0,0],
  gravity:0,airDensity:0,durationSec:.25,
  actorEvents:[{type:'RELEASE',timeSec:0,actorId:'pitcher',
   apparatus:'HAND',velocity:[22,3,0],angularVelocity:[0,0,30]}],
  surfaces:[]});
 assert.equal(t.actorContacts.length,1);
 assert.equal(t.actorContacts[0].type,'ACTOR_RELEASE');
 assert.ok(t.frames.at(-1).position[0]>5);
});
test('V91 invalid surfaces, settings and impossible event positions FAIL CLOSED',()=>{
 assert.throws(()=>simulateAIGReal3DSportBall({sport:'INVALID'}),
  /SIMULATION_SETTINGS_INVALID/);
 assert.throws(()=>simulateAIGReal3DSportBall({sport:'SOCCER',fps:13}),
  /SIMULATION_SETTINGS_INVALID/);
 assert.throws(()=>simulateAIGReal3DSportBall({sport:'TENNIS',
  surfaces:[{id:'table',point:[0,0,0],normal:[0,4,0]}]}),
  /SURFACE_0_INVALID/);
 assert.throws(()=>simulateAIGReal3DSportBall({sport:'TENNIS',
  initialPosition:[0,0,0]}),
  /INITIAL_BALL_PENETRATES_SURFACE/);
});
test('V91 one genuine source sphere, visible 3D movement and rotation marker follows quaternion',()=>{
 const t=simulateAIGReal3DSportBall({sport:'TENNIS',
  initialPosition:[0,5,0],initialVelocity:[9,4,0],
  initialAngularVelocity:[0,0,120],durationSec:.25,surfaces:[]});
 const replay=createAIGReal3DSport3DReplay({trajectory:t});
 assert.ok(replay.sphereMesh.triangleCount>2000);
 assert.equal(replay.scene.nodes[1].parentId,'sportsBall');
 const pos=JSON.stringify(replay.sphereMesh.positions);
 const idx=JSON.stringify(replay.sphereMesh.indices);
 const calls=[];
 const renderer={render:scene=>{
  calls.push({position:[...scene.nodes[0].transform.position],
   rotation:[...scene.nodes[0].transform.rotationDeg]});
  return {status:'WEBGL_XYZ_TRIANGLES_RENDERED',
   triangles:scene.nodes.reduce((a,n)=>a+n.mesh.triangleCount,0)};
 }};
 replay.renderFrame(renderer,0);
 replay.renderFrame(renderer,t.frames.length-1);
 assert.notDeepEqual(calls[0].position,calls[1].position);
 assert.notDeepEqual(calls[0].rotation,calls[1].rotation);
 assert.equal(JSON.stringify(replay.sphereMesh.positions),pos);
 assert.equal(JSON.stringify(replay.sphereMesh.indices),idx);
 assert.equal(replay.stats().drawn3DFrames,2);
 assert.equal(replay.stats().rendererBasedOnStatic2DPhoto,false);
});
