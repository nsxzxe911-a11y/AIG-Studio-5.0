import test from 'node:test';
import assert from 'node:assert/strict';
import {validateVoiceScript,validateVoiceWav,generateVoiceBatch,TTS_VERSION} from '../voice-generator.mjs';
const plan={ready:true,timeline:[
 {beat:0,seconds:1.5,dialogue:'走吧'},
 {beat:1,seconds:1.5,dialogue:'這招有趣！'}
]};
function wav(){
 const bytes=new Uint8Array(48);
 bytes.set([82,73,70,70],0);new DataView(bytes.buffer).setUint32(4,40,true);
 bytes.set([87,65,86,69,102,109,116,32],8);
 bytes.set([100,97,116,97],40);
 return bytes.buffer;
}
test('true audio bytes required, not arbitrary mock JSON or renamed WebM',()=>{
 assert.equal(validateVoiceWav(wav()).byteLength,48);
 assert.throws(()=>validateVoiceWav(new ArrayBuffer(48)),/TTS_WAV_HEADER_INVALID/);
 assert.throws(()=>validateVoiceWav(new ArrayBuffer(0)),/TTS_WAV_SIZE_INVALID/);
 assert.match(TTS_VERSION,/3_6/);
});
test('per-line real WAVs ordered and bound to action durations, no implicit calls',async()=>{
 const events=[],posts=[],makeFile=(bytes,name)=>({name,size:bytes.byteLength,type:'audio/wav',arrayBuffer:async()=>bytes});
 const result=await generateVoiceBatch(plan,{voice:'coral',
  post:async p=>{posts.push(p);return wav();},decode:async()=>1.2,makeFile,
  onProgress:e=>events.push(e)});
 assert.deepEqual(result.files.map(f=>f.name),['01-AIG-AI-Voice.wav','02-AIG-AI-Voice.wav']);
 assert.equal(posts.length,2);assert.deepEqual(posts.map(x=>x.beat),[0,1]);
 assert.equal(posts[1].text,'這招有趣！');assert.equal(result.phonemeLipSyncVerified,false);
 assert.equal(events.at(-1).status,'READY');
});
test('invalid scene and changed script block; no paid audio requests on preflight failure',async()=>{
 let calls=0;const args={post:async()=>{calls++;return wav();},
 decode:async()=>.1,makeFile:(a,b)=>({name:b})};
 await assert.rejects(()=>generateVoiceBatch({...plan,ready:false},args),/TTS_REAL_ACTION/);
 await assert.rejects(()=>generateVoiceBatch({...plan,timeline:[{...plan.timeline[0],dialogue:''}]},args),/TTS_CUE_INVALID/);
 await assert.rejects(()=>generateVoiceBatch(plan,{...args,voice:'copied-voice'}),/TTS_VOICE_INVALID/);
 await assert.rejects(()=>generateVoiceBatch(plan,{...args,stillCurrent:()=>false}),/TTS_STORY_CHANGED/);
 assert.equal(calls,0);
});
test('first too-long voice stops batch to avoid extra paid requests and fake sync',async()=>{
 let calls=0;await assert.rejects(()=>generateVoiceBatch(plan,{
  post:async()=>{calls++;return wav();},decode:async()=>2.5,
  makeFile:()=>({})}),/TTS_REAL_ACTION_TOO_SHORT_FOR_VOICE_1/);
 assert.equal(calls,1);
});
test('3.6 explicit frontend UI and URL wiring exists',()=>{
 const fs=requireFixture();
 assert.match(fs.html,/id="ai-tts-generate"/);
 assert.match(fs.app,/generateVoiceBatch\(/);
 assert.match(fs.app,/api\/story\/voice/);
 assert.match(fs.movie,/generatedVoiceFiles/);
 assert.match(fs.server,/speech_client\.generate\(payload\)/);
});
function requireFixture(){
 const {readFileSync}=requireFs();
 const base=new URL('../',import.meta.url);
 return {html:readFileSync(new URL('index.html',base),'utf8'),
  app:readFileSync(new URL('app.mjs',base),'utf8'),
  movie:readFileSync(new URL('movie-ui.mjs',base),'utf8'),
  server:readFileSync(new URL('server.py',base),'utf8')};
}
import fs from 'node:fs';
function requireFs(){return fs;}
