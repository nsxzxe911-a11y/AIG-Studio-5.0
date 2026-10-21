import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {AIG68_SCHEMA,AIG68FramePacing,analyzeAIG68DecodedVideoSamples,
 probeAIG68EncodedPlayback} from '../aig-video-evidence-6-8.mjs';
test('6.8 distinguishes actual Canvas draw timestamps from encoded frame counts',()=>{
 const audit=new AIG68FramePacing({targetFps:30});
 for(let n=0;n<40;n++)assert.equal(audit.mark(n*1000/30),true);
 const r=audit.report();
 assert.equal(r.schema,AIG68_SCHEMA);
 assert.equal(r.canvasDrawCalls,40);
 assert.ok(r.observedCanvasDrawFps>29.9);
 assert.equal(r.drawPacingWithinTarget,true);
 assert.equal(r.measuredEncodedFrameCount,false);
 assert.equal(r.measuredAudioVideoSync,false);
 assert.equal(r.runtimeDeviceNativeFpsVerified,false);
});
test('6.8 frame drops, duplicate timestamps and missing frames fail quality without deleting movie',()=>{
 const a=new AIG68FramePacing();
 for(let n=0;n<25;n++)a.mark(n*1000/15);
 a.mark(1600);
 assert.equal(a.mark(1600),false);
 const r=a.report();
 assert.equal(r.drawPacingWithinTarget,false);
 assert.ok(r.gapsOver50Ms>0);
 assert.equal(r.invalidSamples,1);
 assert.equal(r.releaseApproved,false);
 assert.throws(()=>new AIG68FramePacing({budget:2}),/AIG68/);
});
test('6.8 only real 1080p decoded video callback samples earn playback proof',()=>{
 const frames=[0,.033333,.066667,.1,.133333].map((t,i)=>({
  mediaTime:t,presentedFrames:i+1}));
 const r=analyzeAIG68DecodedVideoSamples(frames,
  {width:1920,height:1080,duration:8});
 assert.equal(r.realEncodedVideoDimensionsConfirmed,true);
 assert.equal(r.realBrowserPlaybackSampleVerified,true);
 assert.ok(r.observedDecodedPlaybackFps>29);
 assert.equal(r.audioVideoSyncMeasured,false);
 assert.equal(r.actualEntireEncodedFrameCountKnown,false);
 const wrong=analyzeAIG68DecodedVideoSamples(frames,{width:960,height:540,duration:8});
 assert.equal(wrong.realBrowserPlaybackSampleVerified,false);
 assert.deepEqual(wrong.encodedVideoMetadataResolution,[960,540]);
 const synthetic=analyzeAIG68DecodedVideoSamples([{mediaTime:0,presentedFrames:1}]);
 assert.equal(synthetic.realBrowserPlaybackSampleVerified,false);
});
test('6.8 browser probe cannot infer muxed voice or 1080p without actual video metadata',async()=>{
 const fake={src:'blob:test',readyState:2,videoWidth:640,videoHeight:360,
  duration:4};
 const r=await probeAIG68EncodedPlayback(fake);
 assert.equal(r.realEncodedVideoDimensionsConfirmed,false);
 assert.equal(r.actualAudioTracksDemuxedAndListened,false);
 await assert.rejects(()=>probeAIG68EncodedPlayback({src:'https://foo/video.mp4'}),
  /AIG68_REAL_BLOB/);
});
test('6.8 browser probe consumes actual decoded frame callbacks (not requestAnimationFrame)',async()=>{
 let callback=null,index=0,started=false;
 const video={
  src:'blob:real',readyState:2,videoWidth:1920,videoHeight:1080,
  duration:1,currentTime:0,
  requestVideoFrameCallback(cb){callback=cb;return ++index;},
  cancelVideoFrameCallback(){},
  addEventListener(){},removeEventListener(){},pause(){},
  async play(){
   started=true;
   for(let i=0;i<6;i++){
    callback?.(i*33.3,{mediaTime:i/30,presentedFrames:i+1});
   }
  }
 };
 const proof=await probeAIG68EncodedPlayback(video,{maxFrames:5,timeoutMs:1000});
 assert.equal(started,true);
 assert.equal(proof.actualDecodedFramesSampled,5);
 assert.equal(proof.realBrowserPlaybackSampleVerified,true);
 assert.equal(proof.formalReleaseAllowed,false);
 assert.equal(proof.actualAudioTracksDemuxedAndListened,false);
});
test('6.8 CI source asserts live UI callbacks, same-frame audit, recorded proof, retained older engines',()=>{
 const read=s=>fs.readFileSync(new URL('../'+s,import.meta.url),'utf8');
 const html=read('index.html'),app=read('app.mjs'),
  recorder=read('aig-canvas-movie-6-5.mjs');
 for(const id of ['aig68-review','aig68-status'])
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 for(const token of ['new AIG68FramePacing(', 'aig68FramePacing?.mark(now)',
  'probeAIG68EncodedPlayback(', "aig68-review').addEventListener('click'",
  'realEncodedPlaybackProof:aig68PlaybackProof',
  'canvasFramePacing:aig68FramePacing?.report()'])
  assert.ok(app.includes(token),token);
 assert.ok(recorder.includes('measuredEncodedFrameCount:false'));
 assert.ok(recorder.includes('audioTracksAttachedToCaptureStream:'));
 for(const original of ['AIG FastModel 6.7｜','AIG FastModel 6.6｜',
  'AIG FastModel 6.5｜','AIG FastModel 6.4｜'])assert.ok(html.includes(original),original);
 assert.ok(app.includes('movieUI=new MovieWorkspace({'));
 assert.ok(app.includes('generateAIG64SinglePartialFullbody({analysis})'));
 assert.ok(app.includes('new AIG65CanvasRecorder({'));
 assert.ok(app.includes('buildAIG67AudioBuffer('));
 assert.equal(JSON.parse(read('AIG62-SCHOOL-VISUAL-ASSETS.json')).otherCostumesAndSwimwearStillAvailable,true);
});
