import test from 'node:test';
import assert from 'node:assert/strict';
import {createAIG20WorldScene,addAIG20WorldObject,addAIG20CameraKey}
 from '../aig-world-scene-2-0.mjs';
import {compileAIG22Story,verifyAIG22Story,AIG22StoryPlayer,AIG22_SCHEMA}
 from '../aig-text-world-storyboard-2-2.mjs';
const digest='sha256:'+'d'.repeat(64);
function world(actors=1){
 let scene=createAIG20WorldScene({id:'campus'});
 for(let i=1;i<=actors;i++)scene=addAIG20WorldObject(scene,{
  nodeId:'node-'+i,category:'character',assetId:'actor'+i,sourceSha256:digest
 });
 scene=addAIG20CameraKey(scene,{keyId:'c0',timeSeconds:0,
  position:[0,2,7],target:[0,0,0]});
 scene=addAIG20CameraKey(scene,{keyId:'c1',timeSeconds:1,
  position:[2,2,5],target:[0,0,0]});
 return scene;
}
const clip=(name='walk')=>({index:0,name,durationSeconds:1,
 source:'ORIGINAL_SIGNED_GLB_CLIP_NOT_AI_GENERATED'});
const actors=()=>[{nodeId:'node-1',clips:[clip()]}];
test('2.2 Chinese text compiles real signed original GLB clips + authored camera + subtitles',()=>{
 const scene=world(),timeline=compileAIG22Story(
  '0秒 node-1：走路\n1秒 鏡頭：切到校園\n1秒 旁白：她抵達校園。',{
   scene,actors:actors()
  });
 assert.equal(timeline.schema,AIG22_SCHEMA);
 assert.equal(timeline.ready,true);
 assert.equal(timeline.status,'SOURCE_BOUND_STORYBOARD_READY');
 assert.equal(timeline.events.length,3);
 assert.equal(timeline.events[0].clipName,'walk');
 assert.equal(timeline.events[0].sourceSha256,digest);
 assert.equal(timeline.events[1].sourceKeySeconds,1);
 assert.equal(timeline.events[2].voiceSynthesized,false);
 assert.equal(timeline.generatedHumanMotion,false);
 assert.equal(timeline.originalAssetBlobsUnchanged,true);
 assert.equal(verifyAIG22Story(timeline,scene,actors()),true);
 const changed={...scene,revision:scene.revision+1};
 assert.throws(()=>verifyAIG22Story(timeline,changed,actors()),
  /SCENE_REVISION_OR_SHA_CHANGED/);
 const changedClip=[{nodeId:'node-1',clips:[clip('fakerun')]}];
 assert.throws(()=>verifyAIG22Story(timeline,scene,changedClip),
  /ORIGINAL_SOURCE_CLIP_CHANGED/);
});
test('2.2 rejects missing run/jump/squat from still photo model, never fabricates actions',()=>{
 const scene=world();
 for(const word of ['跑步','跳躍','踢腿','走路']){
  const script=compileAIG22Story('node-1：'+word,{
   scene,actors:[{nodeId:'node-1',clips:[]}]
  });
  assert.equal(script.ready,false);
  assert.ok(script.blocked.some(e=>['ORIGINAL_GLTF_CLIP_MISSING',
   'UNRECOGNIZED_TEXT_ACTION'].includes(e.reason)));
  assert.equal(script.events.length,0);
  assert.equal(script.generatedHumanMotion,false);
 }
});
test('2.2 multi-character actor command must use explicit node ID; no fake opponent',()=>{
 const scene=world(2),list=[
  {nodeId:'node-1',clips:[clip()]},
  {nodeId:'node-2',clips:[clip()]}
 ];
 const vague=compileAIG22Story('走路',{scene,actors:list});
 assert.equal(vague.ready,false);
 assert.equal(vague.blocked[0].reason,'EXPLICIT_ACTOR_NODE_REQUIRED');
 const exact=compileAIG22Story(
  '0秒 node-1：走路\n0秒 node-2：走路',{scene,actors:list});
 assert.equal(exact.ready,true);
 assert.equal(exact.events.filter(x=>x.type==='ACTOR_SOURCE_CLIP').length,2);
});
test('2.2 camera must reference existing source key and does not synthesize spatial position',()=>{
 const scene=world();
 const unknown=compileAIG22Story('5秒 鏡頭：推近',{scene,actors:actors()});
 assert.equal(unknown.ready,false);
 assert.equal(unknown.blocked[0].reason,'CAMERA_KEYFRAME_AT_SCRIPT_TIME_REQUIRED');
 const valid=compileAIG22Story('1秒 鏡頭：轉場',{scene,actors:actors()});
 assert.equal(valid.ready,true);
 assert.equal(valid.events[0].cameraPoseAuthoredNotInferred,true);
});
test('2.2 player schedules real-source actions, text subtitle and camera independently',()=>{
 const scene=world(),plan=compileAIG22Story(
  '0秒 node-1：走路\n1秒 鏡頭：校門口\n1秒 字幕：早安',{
  scene,actors:actors()});
 const cues=[],observed=[];
 const worldRuntime={
  scene,
  listSourceActorClips:actors,
  selectSourceActorClip(node,index){
   assert.equal(node,'node-1');assert.equal(index,0);cues.push('ACTOR');
  },
  applyCamera(t){cues.push('CAMERA:'+t)},
 };
 const player=new AIG22StoryPlayer({worldRuntime,
  onEvent:e=>observed.push(e.type),
  onEnd:r=>observed.push(r.status)});
 const state=player.start(plan);
 assert.equal(state.status,'PLAYING_REAL_SOURCE_CUES');
 assert.equal(observed[0],'ACTOR_SOURCE_CLIP');
 assert.equal(player.advance(.5).status,'RUNNING_SOURCE_CLIPS');
 assert.equal(player.advance(.5).status,'RUNNING_SOURCE_CLIPS');
 assert.ok(observed.includes('CAMERA'));
 assert.ok(observed.includes('SUBTITLE'));
 for(let i=0;i<12;i++)player.advance(.25);
 assert.equal(player.running,false);
 assert.ok(observed.includes('STORY_COMPLETE_REAL_CUES'));
 assert.equal(player.stop().status,'STOPPED_NO_ORIGINAL_ASSET_MUTATION');
});
test('2.2 overlapping clips on same actor and ambiguous source Clip names are blocked',()=>{
 const scene=world();
 const both=compileAIG22Story(
  '0秒 node-1 走路\n0.5秒 node-1 走路',{
  scene,actors:actors()});
 assert.equal(both.ready,false);
 assert.ok(both.blocked.some(x=>x.reason==='OVERLAPPING_SOURCE_CLIPS'));
 const amb=compileAIG22Story('0秒 node-1 走路',{
  scene,actors:[{nodeId:'node-1',clips:[
   clip('walk'),{index:1,name:'walk_fast',durationSeconds:1}
  ]}]});
 assert.equal(amb.ready,false);
 assert.equal(amb.blocked[0].reason,'AMBIGUOUS_ORIGINAL_CLIPS');
});
