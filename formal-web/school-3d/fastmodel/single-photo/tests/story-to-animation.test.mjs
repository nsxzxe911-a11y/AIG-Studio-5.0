import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {parseStory,resolveStoryClips,StoryPlayback,STORY_PIPELINE_VERSION} from '../story-to-animation.mjs';
import {AnimationController} from '../viewer.mjs';
const clip=(name,duration=1)=>new THREE.AnimationClip(name,duration,[
 new THREE.VectorKeyframeTrack('Hip.position',[0,duration],[0,0,0,.25,0,0])
]);
test('Traditional Chinese story extracts FOUR ordered semantic 3D actions from real text',()=>{
 const script='女主角走進教室，轉身，閃避，出拳。';
 const data=parseStory(script);
 assert.equal(data.version,STORY_PIPELINE_VERSION);
 assert.deepEqual(data.beats.map(x=>x.actionId),['walk','turn','dodge','punch']);
 assert.equal(data.textToMotionGenerated,false);
 assert.equal(data.originalCharacterGLBModified,false);
 const clips=[clip('Walk'),clip('Turn'),clip('Dodge'),clip('Punch')];
 const plan=resolveStoryClips(data,clips);
 assert.equal(plan.ready,true);
 assert.equal(plan.status,'READY_REAL_GLTF_CLIP_SEQUENCE');
 assert.deepEqual(plan.timeline.map(x=>x.clipName),['Walk','Turn','Dodge','Punch']);
 assert.equal(plan.seconds,4);
 assert.equal(plan.realGLBClipPlaybackOnly,true);
 assert.equal(plan.textGenerated3DGeometry,false);
});
test('actual missing fight clip is BLOCKED, not camera shake or generated phantom motion',()=>{
 const data=parseStory('女主角走進房間，出拳，踢腿。');
 const p=resolveStoryClips(data,[clip('Walk')]);
 assert.equal(p.ready,false);
 assert.equal(p.timeline.length,1);
 assert.deepEqual(p.missing.map(x=>x.actionId),['punch','kick']);
 assert.equal(p.status,'BLOCKED_ACTION_ASSETS_MISSING');
 const runner=new StoryPlayback({clips:[clip('Walk')]});
 assert.throws(()=>runner.start(p),/STORY_TIMELINE_BLOCKED/);
});
test('no second character or camera AI exists; unsupported scene/dialogue MUST BLOCK',()=>{
 const enemy=parseStory('女主角閃避對手的攻擊，然後出拳。');
 assert.equal(enemy.requiresAdditionalCharacter,true);
 const result=resolveStoryClips(enemy,[clip('Dodge'),clip('Punch')]);
 assert.equal(result.ready,false);
 assert.ok(result.blocking.some(x=>x.reason==='SECOND_ACTOR_MODEL_MISSING'));
 const scene=parseStory('女主角出拳，鏡頭推近，天花板爆炸。');
 const gate=resolveStoryClips(scene,[clip('Punch')]);
 assert.equal(gate.ready,false);
 assert.ok(gate.blocking.some(x=>x.reason==='DIRECTED_CAMERA_NOT_IMPLEMENTED'));
 assert.ok(gate.blocking.some(x=>x.reason==='UNSUPPORTED_SCENE_OR_DIALOGUE'));
 assert.equal(gate.trueTwoCharacterCombatVerified,false);
});
test('multiple clips for same action must be unambiguously selected, not choose random punch',()=>{
 const p=resolveStoryClips(parseStory('女主角出拳'),[clip('Punch Left'),clip('Punch Right')]);
 assert.equal(p.ready,false);
 assert.equal(p.missing[0].reason,'AMBIGUOUS_ACTION_CLIPS');
 assert.equal(p.missing[0].candidates.length,2);
});
test('clip with no real bone track or invalid duration cannot satisfy screenplay action',()=>{
 const fake=new THREE.AnimationClip('Punch',1,[]);
 const invalid={name:'Dodge',duration:0,tracks:[{}]};
 const plan=resolveStoryClips(parseStory('閃避，出拳'),[fake,invalid]);
 assert.equal(plan.ready,false);
 assert.equal(plan.missing.length,2);
});
test('real THREE.AnimationMixer updates named joint TRS sequentially in proposed storyline',()=>{
 const root=new THREE.Group(),hip=new THREE.Bone();hip.name='Hip';root.add(hip);
 const clips=[clip('Walk',.5),clip('Punch',.5)];
 const ctl=new AnimationController(root,clips);
 const plan=resolveStoryClips(parseStory('女主角走路，出拳'),clips);
 const stages=[],completed=[];
 ctl.startStory(plan,{onStep:x=>stages.push(x.beat.actionId),onFinish:x=>completed.push(x.total)});
 assert.deepEqual(stages,['walk']);
 assert.equal(ctl.story.playing,true);
 ctl.update(.25);
 assert.ok(hip.position.x>.05,'actual GLB bone keyframe affects displayed character');
 ctl.update(.25);
 assert.deepEqual(stages,['walk','punch']);
 ctl.update(.25);ctl.update(.25);
 assert.deepEqual(completed,[2]);
 assert.equal(ctl.story.playing,false);
 assert.equal(ctl.paused,true);
 assert.equal(ctl.story.status.count,2);
 ctl.dispose();
});
test('manual animation selection stops story and prevents stale timeline from continuing',()=>{
 const root=new THREE.Group(),hip=new THREE.Bone();hip.name='Hip';root.add(hip);
 const clips=[clip('Walk'),clip('Punch')],ctl=new AnimationController(root,clips);
 const p=resolveStoryClips(parseStory('走路，出拳'),clips);
 ctl.startStory(p);
 ctl.update(.2);
 ctl.select(1);assert.equal(ctl.story.playing,false);
 ctl.update(.2);assert.equal(ctl.index,1);
 ctl.dispose();
});
test('scene change or mutated clip invalidates plan, never plays a clip with wrong provenance',()=>{
 const clips=[clip('Walk')],ctrl=new AnimationController(new THREE.Group(),clips);
 const p=resolveStoryClips(parseStory('走路'),clips);
 clips[0]=clip('Other');
 assert.throws(()=>ctrl.startStory(p),/STORY_CLIP_CHANGED/);
 assert.equal(ctrl.story,null);
 ctrl.dispose();
});
test('malformed story, oversized scripts, and empty animation inventory fail closed',()=>{
 assert.throws(()=>parseStory(''),/STORY_TEXT_REQUIRED/);
 assert.throws(()=>parseStory('我只講話'),/STORY_NO_RECOGNIZED_ACTIONS/);
 assert.throws(()=>parseStory('出拳。'.repeat(1001)),/STORY_BUDGET_EXCEEDED/);
 assert.throws(()=>parseStory('出拳。'.repeat(100)),/STORY_TOO_MANY_CLAUSES/);
 const data=parseStory('女主角走路');
 const p=resolveStoryClips(data,[]);
 assert.equal(p.ready,false);
 assert.deepEqual(p.missing.map(x=>x.reason),['ACTION_CLIP_NOT_INSTALLED']);
});
test('3.2 actual UI controls, stop callbacks, same GLB clip source and export evidence are wired',()=>{
 const root=new URL('../',import.meta.url),load=x=>fs.readFileSync(new URL(x,root),'utf8');
 const html=load('index.html'),app=load('app.mjs'),viewer=load('viewer.mjs');
 for(const id of ['story-text','story-build','story-status','story-timeline',
  'story-play','story-stop','story-downloads'])assert.ok(html.includes('id="'+id+'"'),id);
 assert.ok(html.includes('輸入繁體中文劇情'));
 assert.ok(app.includes('parseStory($(\'story-text\').value)'));
 assert.ok(app.includes('resolveStoryClips(story,clips)'));
 assert.ok(app.includes('view.animation.startStory(storyPlan,'));
 assert.ok(app.includes('view.animation.stopStory()'));
 assert.ok(app.includes('sourceActionSha256:actionShaByClipIndex.get(part.index)'));
 assert.ok(app.includes('storyOutputUrl=URL.createObjectURL('));
 assert.ok(viewer.includes('this.story=new StoryPlayback')===false);
 assert.ok(viewer.includes('const playback=new StoryPlayback(this,callbacks)'));
 assert.ok(viewer.includes('this.story.update(Math.max(0,seconds))'));
 assert.ok(viewer.includes("if(this.animation.story?.playing)throw Error('STORY_PREVIEW_IN_PROGRESS')"));
});
