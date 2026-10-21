import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {AIG67_SCHEMA,detectAIG67BrowserFace,decodeAIG67PCM16Wav,
 sampleAIG67AudioMouth,buildAIG67AudioBuffer} from '../aig-portrait-audio-6-7.mjs';
function riff(){
 const n=8000,out=new ArrayBuffer(44+n*2),v=new DataView(out);
 const put=(at,s)=>{for(let i=0;i<s.length;i++)v.setUint8(at+i,s.charCodeAt(i));};
 put(0,'RIFF');v.setUint32(4,out.byteLength-8,true);put(8,'WAVE');
 put(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);
 v.setUint16(22,1,true);v.setUint32(24,8000,true);
 v.setUint32(28,16000,true);v.setUint16(32,2,true);
 v.setUint16(34,16,true);put(36,'data');v.setUint32(40,n*2,true);
 for(let i=0;i<n;i++)v.setInt16(44+i*2,i>=2000&&i<6000?
  Math.round(Math.sin(i*.4)*18000):0,true);
 return out;
}
test('6.7 actually decodes RIFF PCM16 into audio samples and non-fiction RMS jaw envelope',()=>{
 const d=decodeAIG67PCM16Wav(riff());
 assert.equal(d.schema,AIG67_SCHEMA);assert.equal(d.channels.length,1);
 assert.equal(d.durationSeconds,1);assert.equal(d.frames,8000);
 assert.equal(sampleAIG67AudioMouth(d,.05).openness,0);
 assert.ok(sampleAIG67AudioMouth(d,.5).openness>.5);
 assert.equal(sampleAIG67AudioMouth(d,1.1).openness,0);
 assert.equal(sampleAIG67AudioMouth(d,.5).phonemesInferred,false);
 const b=buildAIG67AudioBuffer({createBuffer:(ch,n,s)=>({
  numberOfChannels:ch,length:n,sampleRate:s,copyToChannel:()=>{}
 })},d);
 assert.equal(b.sampleRate,8000);
});
test('6.7 WAV fails closed: not PCM, malformed, truncated and duration',()=>{
 const broken=riff();new DataView(broken).setUint16(20,3,true);
 assert.throws(()=>decodeAIG67PCM16Wav(broken),/AIG67_ONLY_PCM16/);
 assert.throws(()=>decodeAIG67PCM16Wav(new ArrayBuffer(5)),/AIG67_WAV_SIZE/);
 const cut=riff().slice(0,100);
 assert.throws(()=>decodeAIG67PCM16Wav(cut),/AIG67_NOT_RIFF_WAVE|AIG67_TRUNCATED/);
});
test('6.7 accepts only exactly one valid native local face rectangle',async()=>{
 const picture={width:400,height:800};
 class Detector{
  constructor(cfg){assert.equal(cfg.maxDetectedFaces,2);}
  async detect(){return [{boundingBox:{x:110,y:80,width:100,height:150}}];}
 }
 const ok=await detectAIG67BrowserFace(picture,{env:{FaceDetector:Detector}});
 assert.equal(ok.verified,true);assert.equal(ok.method,'BROWSER_NATIVE_FACE_RECTANGLE');
 assert.deepEqual(ok.box,{x:110,y:80,width:100,height:150});
 const no=await detectAIG67BrowserFace(picture,{env:{}});
 assert.equal(no.verified,false);
 class Two{async detect(){return [{},{},{}];}}
 const many=await detectAIG67BrowserFace(picture,{env:{FaceDetector:Two}});
 assert.equal(many.reason,'MULTIPLE_FACES_AMBIGUOUS');
 assert.equal(many.verified,false);
 class Err{async detect(){throw Error('GPU unavailable');}}
 assert.equal((await detectAIG67BrowserFace(picture,{env:{FaceDetector:Err}})).verified,false);
});
test('6.7 true wav, local face, audio playback, preview and mux wiring are present',()=>{
 const read=f=>fs.readFileSync(new URL('../'+f,import.meta.url),'utf8');
 const app=read('app.mjs'),html=read('index.html');
 for(const id of ['aig67-voice','aig67-status'])assert.equal(
  (html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 for(const needle of ['decodeAIG67PCM16Wav(', 'detectAIG67BrowserFace(',
  'sampleAIG67AudioMouth(', 'buildAIG67AudioBuffer(',
  'storySound.playRecordedVoice(', 'aig67Audio?.decoded',
  'localAudioAmplitude:','audioAmplitude:aig67Mouth',
  'voiceFileSHA256:','aig67VoiceSha'])assert.ok(app.includes(needle),needle);
 assert.ok(read('aig-portrait-6-6.mjs').includes('setDetectedFaceBox('));
 assert.ok(read('aig-canvas-movie-6-5.mjs').includes('audioAmplitude='));
 assert.ok(html.includes('AIG FastModel 6.7｜'));
 assert.ok(app.includes('new AIG65CanvasRecorder({'));
 assert.ok(app.includes('movieUI=new MovieWorkspace({'));
 assert.ok(html.includes('AIG FastModel 6.4｜'));
 assert.ok(!read('aig-portrait-audio-6-7.mjs').includes('fetch('));
 assert.equal(JSON.parse(read('AIG62-SCHOOL-VISUAL-ASSETS.json')).otherCostumesAndSwimwearStillAvailable,true);
});

test('optional face detector that never responds cannot hold generation indefinitely',async()=>{
 class StalledDetector{detect(){return new Promise(()=>{});}}
 const result=await Promise.race([
  detectAIG67BrowserFace({width:400,height:800},{env:{FaceDetector:StalledDetector},timeoutMs:15}),
  new Promise(resolve=>setTimeout(()=>resolve({reason:'TEST_DEADLINE_EXCEEDED'}),150))
 ]);
 assert.equal(result.reason,'NATIVE_FACE_DETECTOR_TIMEOUT');
 assert.equal(result.verified,false);
});
