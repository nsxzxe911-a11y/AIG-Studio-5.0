import test from 'node:test';
import assert from 'node:assert/strict';
import {AIG25_SCHEMA,AIG25WorldMovieRecorder,AIG25_RENDER,
 validateAIG25TrueWorldMovie,inspectAIG25EncodedContainer}
 from '../aig-true-world-movie-2-5.mjs';
const sourceSHA='b'.repeat(64);
const proof={
 schema:AIG25_SCHEMA,status:'VALIDATED_TRUE_3D_SCENE_RECORDING_NOT_STARTED',
 sourceSceneId:'world-test',sourceSceneRevision:1,
 sourceManifest:[{nodeId:'node-1',category:'character',
  sourceSha256:'sha256:'+sourceSHA}],
 actualSourceAnimatedActorCount:1
};
class MockRecorder{
 static isTypeSupported(mime){return mime==='video/webm;codecs=vp9,opus'}
 constructor(stream,config){this.stream=stream;this.config=config;
  this.state='inactive'}
 start(){this.state='recording'}
 stop(){
  this.state='inactive';
  // Genuine WebM EBML magic, not a text blob renamed as .webm.
  this.ondataavailable?.({data:new Blob([
   new Uint8Array([0x1a,0x45,0xdf,0xa3,0x81,0x9f,0x42,0x86,
    0x81,0x01,0x42,0xf7,0x81,0x01,0x42,0xf2,0x81,0x04])
  ])});
  this.onstop?.();
 }
}
class MockMediaStream{
 constructor(tracks){this.tracks=tracks}
 getVideoTracks(){return this.tracks}
 getAudioTracks(){return []}
}
const events=[];
let stopped=0;
const videoTrack={kind:'video',stop:()=>{stopped++}};
const fakeCanvas={
 width:0,height:0,
 captureStream:fps=>{assert.equal(fps,30);return {
  getVideoTracks:()=>[videoTrack]
 }},
 getContext:()=>({
  fillStyle:'',textAlign:'',font:'',
  fillRect:(...v)=>events.push(['fill',...v]),
  drawImage:(...v)=>events.push(['draw',...v.slice(1)]),
  fillText:(...v)=>events.push(['text',...v])
 })
};
const env={
 MediaRecorder:MockRecorder,MediaStream:MockMediaStream,
 document:{createElement:tag=>{
  assert.equal(tag,'canvas');
  return {...fakeCanvas};
 }}
};
test('2.5 proves real encoded WebM/MP4 headers, not just nonempty bytes',()=>{
 const webm=new Uint8Array([0x1a,0x45,0xdf,0xa3,1,2,3,4,5,6,7,8]);
 const mp4=new Uint8Array([0,0,0,24,0x66,0x74,0x79,0x70,0,0,0,0]);
 assert.equal(inspectAIG25EncodedContainer(webm,'webm'),true);
 assert.equal(inspectAIG25EncodedContainer(webm,'mp4'),false);
 assert.equal(inspectAIG25EncodedContainer(mp4,'mp4'),true);
 assert.equal(inspectAIG25EncodedContainer(mp4,'webm'),false);
 assert.equal(inspectAIG25EncodedContainer(new Uint8Array(32),'webm'),false);
 assert.equal(inspectAIG25EncodedContainer(new Uint8Array(32),'mp4'),false);
});
test('2.5 refuses to record non-source story, camera-only movie or flat photo',()=>{
 assert.throws(()=>validateAIG25TrueWorldMovie({
  plan:{ready:false},scene:{},actors:[],viewer:{}
 }),/AIG22_|AIG25_/);
 const r=new AIG25WorldMovieRecorder({env});
 assert.throws(()=>r.begin({sourceCanvas:{
  width:1920,height:1080
 },proof:{...proof,actualSourceAnimatedActorCount:0}}),
 /AIG25_SOURCE_PROVENANCE/);
 assert.equal(r.state,'IDLE');
});
test('2.5 actual canvas frames are composed, subtitles pixel-burnt and real codec is kept',async()=>{
 stopped=0;events.length=0;
 const source={width:1920,height:1080};
 const rec=new AIG25WorldMovieRecorder({env});
 const started=rec.begin({sourceCanvas:source,proof});
 assert.equal(started.extension,'webm');
 assert.equal(rec.captureCanvas.width,AIG25_RENDER.width);
 assert.equal(rec.captureCanvas.height,AIG25_RENDER.height);
 assert.equal(rec.draw(100,'櫻花校園，真 3D 人物說話'),true);
 assert.equal(rec.draw(105,'忽略重複幀'),false);
 assert.equal(rec.draw(140,'第二個來源 3D 幀'),true);
 const done=await rec.stop();
 assert.equal(rec.state,'COMPLETE');
 assert.equal(done.evidence.movieWritten,true);
 assert.equal(done.evidence.actualFramesComposited,2);
 assert.equal(done.evidence.sourceSubtitlePixelsBurnedIntoCanvas,true);
 assert.equal(done.evidence.generatedHumanMovement,false);
 assert.equal(done.evidence.recordedAudioTracks,0);
 assert.equal(done.evidence.constantFramerateVerified,false);
 assert.equal(done.evidence.releaseAllowed,false);
 assert.equal(done.filename,'AIG-Real3D-2-5-World-Movie.webm');
 assert.equal(done.blob.type,'video/webm;codecs=vp9,opus');
 assert.ok(done.blob.size>0);
 assert.ok(events.some(e=>e[0]==='draw'));
 assert.ok(events.some(e=>e[0]==='text'&&
  e[1].includes('櫻花校園')));
 assert.equal(stopped,1);
});
test('2.5 user cancel never claims a finished movie',async()=>{
 const r=new AIG25WorldMovieRecorder({env});
 r.begin({sourceCanvas:{width:1920,height:1080},proof});
 r.draw(100,'');
 r.abort(Error('USER_CANCELLED'));
 assert.equal(r.state,'FAILED');
 assert.equal(r.output,null);
 await assert.rejects(r._finished,/USER_CANCELLED/);
});
