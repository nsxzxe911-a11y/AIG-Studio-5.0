import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {parseStory,resolveStoryClips} from '../story-to-animation.mjs';
import {composeDialogue,updateDialogueCue,annotateDialoguePlan,DIALOGUE_STYLES,DIALOGUE_VERSION} from '../story-dialogue.mjs';
import {StoryAudio,audioCueForAction,soundtrackNote,AUDIO_CUE_VERSION} from '../story-audio.mjs';
const clips=['Walk','Turn','Dodge','Punch'].map(name=>new THREE.AnimationClip(name,.5,[
 new THREE.VectorKeyframeTrack('Hip.position',[0,.5],[0,0,0,.2,0,0])
]));
function story(){return parseStory('女主角走進教室，轉身，閃避，出拳。');}
test('all existing real-action beats produce locally authored funny Chinese dialogue, not fabricated cloud LLM',()=>{
 const input=story(),a=composeDialogue(input,{style:'witty'});
 assert.equal(a.version,DIALOGUE_VERSION);
 assert.equal(a.cues.length,4);
 assert.deepEqual(a.cues.map(x=>x.actionId),['walk','turn','dodge','punch']);
 assert.ok(a.cues.every(x=>x.text.length>8&&/[\u4e00-\u9fff]/.test(x.text)));
 assert.ok(a.cues.every(x=>x.speaker==='女主角'&&x.origin==='OFFLINE_HANDWRITTEN_TEMPLATE'));
 assert.equal(a.generatedByCloudLLM,false);
 assert.deepEqual(composeDialogue(input).cues,a.cues,'deterministic variations');
 assert.deepEqual([...DIALOGUE_STYLES],['witty','heroic','dramatic']);
 assert.notEqual(composeDialogue(input,{style:'heroic'}).cues[3].text,a.cues[3].text);
 assert.notEqual(composeDialogue(input,{style:'dramatic'}).cues[3].text,a.cues[3].text);
});
test('editable dialogue on real GLB storyboard syncs cue text without touching source GLB or animated bone tracks',()=>{
 const input=story(),plan=resolveStoryClips(input,clips),dialogues=composeDialogue(input);
 assert.equal(plan.ready,true);
 const edited=updateDialogueCue(dialogues,3,'這一拳，專打還沒起床的尷尬！');
 assert.equal(edited.cues[3].text,'這一拳，專打還沒起床的尷尬！');
 assert.equal(edited.cues[3].origin,'USER_EDITED_DIALOGUE');
 assert.notEqual(edited.cues[3].text,dialogues.cues[3].text);
 const enriched=annotateDialoguePlan(plan,edited);
 assert.equal(enriched.timeline[3].dialogue,edited.cues[3].text);
 assert.equal(enriched.timeline[3].audioSfxId,'punch');
 assert.equal(enriched.timeline[3].voiceSpeaker,'女主角');
 assert.equal(enriched.sourceCharacterMeshUnchanged,true);
 assert.ok(Math.abs(clips[3].tracks[0].values[3]-.2)<1e-6,'Float32 bone keyframe preserved');
 assert.throws(()=>updateDialogueCue(dialogues,0,''),/DIALOGUE_EDIT_TEXT_INVALID/);
 assert.throws(()=>updateDialogueCue(dialogues,20,'台詞'),/DIALOGUE_EDIT_INDEX_INVALID/);
 assert.throws(()=>composeDialogue(input,{style:'imaginary-llm'}),/DIALOGUE_STYLE_INVALID/);
});
test('local web audio SFX/music is procedural and browser Chinese TTS can speak sequential beat cues',()=>{
 const events=[],status=[];
 class Oscillator{
  constructor(){this.frequency={setValueAtTime:(...a)=>events.push(['hz',...a]),exponentialRampToValueAtTime:(...a)=>events.push(['slide',...a])};}
  connect(){return this;}disconnect(){events.push(['disconnect']);}
  start(t){events.push(['start',t]);}stop(t){events.push(['stop',t]);}
 }
 class Gain{constructor(){this.gain={setValueAtTime:()=>{},exponentialRampToValueAtTime:()=>{}};}
  connect(){return this;}disconnect(){}
 }
 class Context{
  constructor(){this.currentTime=1;this.state='running';this.destination={};}
  createOscillator(){return new Oscillator();}
  createGain(){return new Gain();}
  resume(){this.state='running';return Promise.resolve();}
  suspend(){this.state='suspended';return Promise.resolve();}
  close(){this.state='closed';return Promise.resolve();}
 }
 class Utterance{constructor(text){this.text=text;}}
 const speech={spoken:[],cancels:0,getVoices(){return [{lang:'zh-TW',name:'mock-zh-TW'}];},
  speak(u){this.spoken.push(u);},cancel(){this.cancels++;},pause(){},resume(){}};
 const sound=new StoryAudio({env:{AudioContext:Context,speechSynthesis:speech,SpeechSynthesisUtterance:Utterance},
  onStatus:x=>status.push(x)});
 const capability=sound.start();
 assert.equal(capability.actualCloudVoiceGenerated,false);
 assert.equal(capability.licensedSongUsed,false);
 sound.step({beat:0,actionId:'punch',dialogue:'這一拳比期末報告還快！'});
 assert.equal(speech.spoken.length,1);
 assert.equal(speech.spoken[0].lang,'zh-TW');
 assert.equal(speech.spoken[0].voice.name,'mock-zh-TW');
 assert.equal(speech.spoken[0].text,'這一拳比期末報告還快！');
 assert.ok(events.some(x=>x[0]==='start'),'actual oscillator SFX started');
 const before=events.filter(x=>x[0]==='start').length;
 sound.tick(.35);sound.tick(.35);
 assert.ok(events.filter(x=>x[0]==='start').length>before,'actual procedural music starts in the timeline tick');
 assert.equal(sound.status.origin,AUDIO_CUE_VERSION);
 assert.equal(sound.status.movieAudioMixdownExported,false);
 sound.pause();assert.equal(sound.paused,true);
 const paused=events.filter(x=>x[0]==='start').length;sound.tick(.35);
 assert.equal(events.filter(x=>x[0]==='start').length,paused,'no background music when paused');
 sound.resume();assert.equal(sound.paused,false);
 sound.stop();assert.equal(sound.enabled,false);
 assert.ok(speech.cancels>=1);
 sound.dispose();
 assert.equal(sound.audio,null);
});
test('no browser WebAudio or speech = captions still available with truthful status, no fake voice',()=>{
 const status=[];
 const sound=new StoryAudio({env:{},onStatus:m=>status.push(m)});
 const flags=sound.start();
 assert.deepEqual(flags,{voice:false,sfx:false,music:false,actualCloudVoiceGenerated:false,licensedSongUsed:false});
 sound.step({beat:0,dialogue:'你好',actionId:'punch'});
 sound.tick(.8);
 assert.equal(sound.status.lastCue.text,'你好');
 assert.equal(sound.status.realHumanRecordedVoice,false);
 assert.equal(sound.status.cloudAiDialogueGenerated,false);
 assert.ok(status[0].includes('語音不可用'));
 sound.stop();
 assert.throws(()=>sound.previewDialogue('測試'),/STORY_AUDIO_NOT_STARTED/);
});
test('audio mood, action tone and strict volume guards; no external MP3 or copyrighted audio',()=>{
 assert.equal(audioCueForAction('punch').wave,'triangle');
 assert.ok(soundtrackNote('playful',0)>200);
 assert.equal(soundtrackNote('action',8),soundtrackNote('action',0));
 assert.throws(()=>soundtrackNote('invalid',2),/STORY_AUDIO_NOTE_INVALID/);
 assert.equal(audioCueForAction('unsupported'),null);
 const sound=new StoryAudio({env:{}});
 assert.throws(()=>sound.configure({volume:1.2}),/STORY_AUDIO_VOLUME_INVALID/);
 assert.throws(()=>sound.configure({mood:'popular copyrighted song'}),/STORY_AUDIO_MOOD_INVALID/);
 assert.throws(()=>sound.configure({voice:'yes'}),/STORY_AUDIO_OPTION_INVALID/);
 sound.configure({volume:.35,mood:'cinematic',voice:false,sfx:true,music:true});
 assert.equal(sound.options.volume,.35);
});
test('UI has real dialogue edit, song mood, volume, SFX, speech, subtitle and GLB frame tick controls',()=>{
 const root=new URL('../',import.meta.url),get=f=>fs.readFileSync(new URL(f,root),'utf8');
 const html=get('index.html'),app=get('app.mjs'),viewer=get('viewer.mjs');
 for(const id of ['story-subtitle','dialogue-style','story-dialogues',
   'voice-enabled','sfx-enabled','music-enabled','music-mood',
   'audio-volume','audio-volume-value','story-audio-status','dialogue-preview','cloud-dialogue','cloud-dialogue-status']){
  assert.ok(html.includes('id="'+id+'"'),id);
 }
 assert.ok(app.includes('composeDialogue(story,'));
 assert.ok(app.includes('updateDialogueCue(storyDialogue,'));
 assert.ok(app.includes('annotateDialoguePlan('));
 assert.ok(app.includes('storySound.start()'));
 assert.ok(app.includes('storySound.step(beat)'));
 assert.ok(app.includes('storySound.tick(dt)'));
 assert.ok(app.includes('storySound.stop()'));
 assert.ok(app.includes('storySound.pause()'));
 assert.ok(app.includes('storySound.resume()'));
 assert.ok(app.includes('showSubtitle(beat.dialogue)'));
 assert.ok(app.includes('cloudLLMDialogueGenerated:storyDialogue?.generatedByCloudLLM===true'));
 assert.ok(app.includes('originalWebAudioMusic:true'));
 assert.ok(app.includes("api('/api/story/dialogue'"));
 assert.ok(app.includes("dialogueCloudConfigured=!!c.dialogueAIConfigured"));
 assert.ok(app.includes("result.source!=='CLOUD_LLM_PROVIDER_OUTPUT'"));
 assert.ok(app.includes("rev!==storyRevision"));
 assert.ok(html.includes('可能產生 API 費用'));

 assert.ok(viewer.includes('try{this.onFrame?.(dt,t);}catch(audioError)'));
 assert.ok(!html.includes('<script src="https://'), 'no remote third party audio scripts');
});
