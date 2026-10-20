import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {StoryAudio} from '../story-audio.mjs';
import {mapVoiceFiles,voiceTimecodes,RmsMouthDriver,VOICE_CUES_VERSION} from '../voice-cues.mjs';
const plan={ready:true,timeline:[{beat:0,seconds:1.2,dialogue:'你好'},{beat:1,seconds:1.4,dialogue:'出拳！'}]};
const file=(name,size=1000,type='audio/wav')=>({name,size,type,arrayBuffer:async()=>new ArrayBuffer(size)});
test('per-beat files use explicit ordinal filenames; deterministic no guessed scene timings',()=>{
 const items=mapVoiceFiles(plan,[file('02-punch.wav'),file('01-walk.wav')]);
 assert.deepEqual(items.map(x=>x.file.name),['01-walk.wav','02-punch.wav']);
 assert.deepEqual(voiceTimecodes(plan),[
  {position:0,beat:0,startSeconds:0,endSeconds:1.2,text:'你好'},
  {position:1,beat:1,startSeconds:1.2,endSeconds:2.6,text:'出拳！'}]);
 assert.match(VOICE_CUES_VERSION,/3_5/);
 assert.deepEqual(mapVoiceFiles(plan,[]),[]);
});
test('reject partial, duplicate, missing, oversized, invalid MIME and whole-track overlap',()=>{
 const pair=[file('01-a.wav'),file('02-b.wav')];
 assert.throws(()=>mapVoiceFiles(plan,[pair[0]]),/VOICE_CUE_COUNT_MISMATCH/);
 assert.throws(()=>mapVoiceFiles(plan,[pair[0],file('01-b.wav')]),/VOICE_CUE_DUPLICATE/);
 assert.throws(()=>mapVoiceFiles(plan,[file('abc.wav'),pair[1]]),/VOICE_CUE_FILENAME/);
 assert.throws(()=>mapVoiceFiles(plan,[pair[0],file('03-b.wav')]),/VOICE_CUE_DUPLICATE/);
 assert.throws(()=>mapVoiceFiles(plan,pair,{wholeFilePresent:true}),/VOICE_WHOLE_TRACK/);
 assert.throws(()=>mapVoiceFiles(plan,[pair[0],file('02-b.exe',1000,'application/x-executable')]),/VOICE_CUE_FILE_INVALID/);
 assert.throws(()=>mapVoiceFiles(plan,[pair[0],file('02-b.wav',21*1024*1024)]),/VOICE_CUE_FILE_INVALID/);
 assert.throws(()=>mapVoiceFiles({...plan,ready:false},pair),/VOICE_TIMELINE_NOT_READY/);
});
test('actual loaded mesh mouth morph follows RMS and restores original without inventing face geometry',()=>{
 const withMouth={morphTargetDictionary:{jawOpen:0,eyeBlink:1},morphTargetInfluences:[.12,.3]};
 const withoutMouth={morphTargetDictionary:{smile:0},morphTargetInfluences:[.2]};
 const root={traverse:fn=>{fn(withMouth);fn(withoutMouth);}};
 const driver=new RmsMouthDriver(root);
 assert.equal(driver.available,true);
 assert.equal(driver.applyLevel(.5),true);
 assert.ok(Math.abs(withMouth.morphTargetInfluences[0]-.56)<1e-6);
 assert.equal(withMouth.morphTargetInfluences[1],.3);
 assert.equal(withoutMouth.morphTargetInfluences[0],.2);
 driver.applyLevel(NaN);assert.equal(withMouth.morphTargetInfluences[0],.12);
 driver.restore();assert.equal(withMouth.morphTargetInfluences[0],.12);
 assert.equal(new RmsMouthDriver({traverse:fn=>fn(withoutMouth)}).available,false);
});
test('UI explicitly binds timed recordings and evidence avoids phoneme or heroine claims',()=>{
 const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
 const html=read('../index.html'),movie=read('../movie-ui.mjs'),audio=read('../story-audio.mjs');
 assert.match(html,/id="movie-voice-lines"/);
 assert.match(movie,/mapVoiceFiles\(/);assert.match(movie,/sound\.getVoiceLevel\(\)/);
 assert.match(movie,/sound\.playRecordedVoice\(cueBuffers\[position\]\)/);
 assert.match(movie,/this\.mouth\?\.restore\(\)/);
 assert.match(movie,/phonemeLipSyncVerified:false/);
 assert.match(audio,/getByteTimeDomainData/);
});

test('actual decoded voice waveform supplies RMS; adjacent cue replaces source and cleanup stops it',()=>{
 const sources=[];
 class Source{
  connect(){}disconnect(){}start(){this.running=true;}
  stop(){this.running=false;this.onended?.();}
 }
 class Gain{constructor(){this.gain={value:1};}connect(){}disconnect(){}}
 class Analyser{constructor(){this.fftSize=512;}connect(){}disconnect(){}
  getByteTimeDomainData(data){data.fill(160);}
 }
 class Ctx{
  constructor(){this.currentTime=0;this.state='running';this.destination={};}
  createBufferSource(){const s=new Source();sources.push(s);return s;}
  createGain(){return new Gain();}
  createAnalyser(){return new Analyser();}
  createMediaStreamDestination(){return {stream:{getAudioTracks:()=>[{}]}};}
  resume(){return Promise.resolve();}
  suspend(){return Promise.resolve();}
 }
 const sound=new StoryAudio({env:{AudioContext:Ctx},options:{voice:false,sfx:true,music:false}});
 sound.start();sound.createRecordingBus();
 sound.playRecordedVoice({duration:.3});
 assert.ok(sound.getVoiceLevel()>.5,'sample-derived voice energy is not hardcoded zero');
 sound.playRecordedVoice({duration:.2});
 assert.equal(sources[0].running,false,'previous line cannot overlap new line');
 sound.releaseRecordingBus();
 assert.equal(sources[1].running,false);
 assert.equal(sound.getVoiceLevel(),0);
 sound.stop();
});
