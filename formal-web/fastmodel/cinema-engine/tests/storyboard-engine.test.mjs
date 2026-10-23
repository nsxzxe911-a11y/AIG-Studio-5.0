import test from 'node:test';
import assert from 'node:assert/strict';
import {
 planAIGStarJourneyStoryboard,AIG_STARJOURNEY_SAMPLE_SCRIPT,
 AIG_STORYBOARD_SCHEMA
}from '../storyboard-engine.mjs';
test('Star Journey Chinese story becomes deterministic timed real scene shots',()=>{
 const p=planAIGStarJourneyStoryboard(AIG_STARJOURNEY_SAMPLE_SCRIPT);
 assert.equal(p.schema,AIG_STORYBOARD_SCHEMA);
 assert.ok(p.shots.length>=4&&p.shots.length<=12);
 assert.ok(p.totalDurationSec>6);
 assert.equal(p.shots[0].visualKey,'GATE');
 assert.equal(p.shots[0].startSec,0);
 assert.ok(p.shots.some(s=>s.visualKey==='PORT'));
 assert.ok(p.shots.some(s=>s.visualKey==='FLEET'));
 assert.ok(p.shots.some(s=>s.speaker==='女主角'));
 for(let i=0;i<p.shots.length;i++){
  const shot=p.shots[i];
  assert.equal(shot.sequence,i+1);
  assert.equal(shot.id,'SJ-'+String(i+1).padStart(3,'0'));
  assert.equal(shot.endSec,shot.startSec+shot.durationSec);
  assert.equal(shot.source,'LOCAL_DETERMINISTIC_STORY_PLANNER_NOT_AI');
  assert.ok(shot.durationSec>=2&&shot.durationSec<=8);
  if(i)assert.equal(shot.startSec,p.shots[i-1].endSec);
 }
 assert.equal(p.totalDurationSec,p.shots.at(-1).endSec);
 assert.equal(p.narrationAudioGenerated,false);
 assert.equal(p.geometryGenerated,false);
 assert.equal(p.realHuman3DGenerated,false);
 assert.equal(p.approvedAsFinishedFilm,false);
 assert.deepEqual(planAIGStarJourneyStoryboard(AIG_STARJOURNEY_SAMPLE_SCRIPT),p);
});
test('Script parser treats HTML as data, requires actual text and bounded shots',()=>{
 assert.throws(()=>planAIGStarJourneyStoryboard('  '),/STORYBOARD_SCRIPT_EMPTY/);
 assert.throws(()=>planAIGStarJourneyStoryboard('a'.repeat(6001)),/STORYBOARD_SCRIPT_SIZE/);
 assert.throws(()=>planAIGStarJourneyStoryboard('一句話。'.repeat(25)),/STORYBOARD_SHOT_LIMIT_EXCEEDED/);
 assert.throws(()=>planAIGStarJourneyStoryboard('短句',{maxShots:0}),/STORYBOARD_MAX_SHOTS/);
 const p=planAIGStarJourneyStoryboard('旁白：<img src=x onerror=alert(1)>');
 assert.match(p.shots[0].subtitle,/img src/);
 assert.equal(p.shots[0].source,'LOCAL_DETERMINISTIC_STORY_PLANNER_NOT_AI');
 assert.equal(p.realHuman3DGenerated,false);
});
test('User supplied scene keywords map to actual camera+fx plan without pretending 3D',()=>{
 const p=planAIGStarJourneyStoryboard('太空港亮起燈火。\n星艦穿越星門。\n我們降落在新的行星。');
 assert.deepEqual(p.shots.map(s=>s.visualKey),['PORT','GATE','PLANET']);
 assert.equal(p.shots[0].camera,'pan-right');
 assert.equal(p.shots[1].fx,'ring-pulse');
 assert.equal(p.shots[2].camera,'orbit');
 assert.equal(p.cinematicVisuals,'PROCEDURAL_2D');
});
