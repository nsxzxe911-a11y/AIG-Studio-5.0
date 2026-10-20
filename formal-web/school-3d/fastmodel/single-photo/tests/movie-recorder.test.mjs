import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {RealMovieCapture,chooseMovieFormat,validateMovieSource,MOVIE_SOURCE_VERSION,MOVIE_SIZE} from '../movie-recorder.mjs';
import {MovieWorkspace} from '../movie-ui.mjs';
const sha='b'.repeat(64);
const clip=new THREE.AnimationClip('Punch',.7,[new THREE.VectorKeyframeTrack('Hip.position',[0,.7],[0,0,0,.3,0,0])]);
const plan={ready:true,seconds:.7,timeline:[{index:0,clipName:'Punch',clipDuration:.7,actionId:'punch',beat:0}]};
const source=()=>({plan,sourceSha256:sha,clips:[clip],haveModel:true,dialogueOrigin:'OFFLINE_TEMPLATE'});
class FakeRecorder{
 static isTypeSupported(mime){return mime.includes('webm');}
 constructor(stream,opts){this.stream=stream;this.opts=opts;this.state='inactive';}
 start(){this.state='recording';}
 stop(){
  if(this.state==='inactive')return;
  this.state='inactive';
  this.ondataavailable?.({data:new Blob(['real bytes'],{type:this.opts.mimeType})});
  this.onstop?.();
 }
}
function fakeEnv(){
 const events=[],videoTrack={stop(){events.push('video-track-stopped')}},audioTrack={name:'recorded-sound'};
 const canvas2d={fillRect(){events.push('background')},drawImage(){events.push('REAL_WEBGL_DRAW')},
  fillText(t){events.push(['subtitle',t])},set fillStyle(x){},set textAlign(x){},set font(x){}};
 const outputCanvas={width:0,height:0,
  getContext:()=>canvas2d,
  captureStream(fps){events.push(['captureStream',fps]);return {getVideoTracks:()=>[videoTrack]};}};
 class FakeStream{constructor(tracks){this.tracks=tracks;}getVideoTracks(){return this.tracks.filter(x=>x===videoTrack);}
  getAudioTracks(){return this.tracks.filter(x=>x===audioTrack);}}
 const env={MediaRecorder:FakeRecorder,MediaStream:FakeStream,
  document:{createElement:t=>t==='canvas'?outputCanvas:null}};
 return {env,events,audioTrack,outputCanvas};
}
test('only actual browser-supported codec determines MP4 vs WebM extension',()=>{
 assert.deepEqual(chooseMovieFormat(FakeRecorder),{mime:'video/webm;codecs=vp9,opus',ext:'webm'});
 class Mp4{static isTypeSupported(m){return m.startsWith('video/mp4');}}
 assert.equal(chooseMovieFormat(Mp4).ext,'mp4');
 class None{static isTypeSupported(){return false;}}
 assert.throws(()=>chooseMovieFormat(None),/MOVIE_CODEC_UNAVAILABLE/);
 assert.throws(()=>chooseMovieFormat(null),/MOVIE_MEDIARECORDER_UNSUPPORTED/);
 assert.deepEqual(MOVIE_SIZE,{width:1920,height:1080,fps:30});
});
test('real GLB provenance/action clip required, 180 s and file security enforced',()=>{
 const verified=validateMovieSource(source());
 assert.equal(verified.status,'SOURCE_READY_RECORDING_NOT_STARTED');
 assert.equal(verified.browserSpeechIncluded,false);
 assert.equal(verified.outputFileWritten,false);
 assert.throws(()=>validateMovieSource({...source(),haveModel:false}),/MOVIE_VERIFIED_GLB_SOURCE_REQUIRED/);
 assert.throws(()=>validateMovieSource({...source(),sourceSha256:null}),/MOVIE_VERIFIED_GLB_SOURCE_REQUIRED/);
 assert.throws(()=>validateMovieSource({...source(),plan:{ready:false}}),/MOVIE_REAL_ACTION_TIMELINE_REQUIRED/);
 assert.throws(()=>validateMovieSource({...source(),plan:{...plan,seconds:181}}),/MOVIE_DURATION_BUDGET/);
 assert.throws(()=>validateMovieSource({...source(),clips:[new THREE.AnimationClip('Walk',.7,clip.tracks)]}),/MOVIE_CLIP_SOURCE_CHANGED/);
 assert.throws(()=>validateMovieSource({...source(),voiceFile:{size:24*1024*1024,type:'audio/mpeg'}}),/MOVIE_VOICE_FILE_INVALID/);
});
test('actual 1920x1080 composition uses real WebGL source, captions and MediaRecorder Blob with mixed audio track',async()=>{
 const {env,events,audioTrack,outputCanvas}=fakeEnv();
 const c=new RealMovieCapture({env});
 const fmt=c.begin({...source(),sourceCanvas:{width:1920,height:1080},
  audioDestination:{stream:{getAudioTracks:()=>[audioTrack]}},sourceTimeNow:()=>100});
 assert.equal(fmt.format,'webm');
 assert.equal(fmt.audioTrackIncluded,true);
 assert.deepEqual(events[0],['captureStream',30]);
 assert.equal(outputCanvas.width,1920);
 assert.equal(outputCanvas.height,1080);
 assert.equal(c.draw(1000,'女主角：這拳專打尷尬！'),true);
 assert.equal(c.draw(1009,'same-frame'),false);
 assert.equal(c.draw(1050,'下一幕'),true);
 assert.ok(events.includes('REAL_WEBGL_DRAW'),'must use actual WebGL canvas, not a stock still image');
 assert.ok(events.some(x=>Array.isArray(x)&&x[0]==='subtitle'));
 const finish=await c.stop();
 assert.equal(finish.blob.size>0,true);
 assert.equal(finish.blob.type,'video/webm;codecs=vp9,opus');
 assert.equal(finish.filename.endsWith('.webm'),true);
 assert.equal(finish.evidence.actualFramesDrawn,2);
 assert.equal(finish.evidence.audioTracksInFile,1);
 assert.equal(finish.evidence.browserSpeechCaptured,false);
 assert.equal(finish.evidence.native60fpsVerified,false);
 assert.equal(finish.evidence.schema,MOVIE_SOURCE_VERSION);
 assert.equal(c.state,'COMPLETE');
 assert.ok(events.includes('video-track-stopped'));
});
test('zero visual frames must BLOCK fake movie download rather than emit invented movie Blob',async()=>{
 const {env}=fakeEnv(),capture=new RealMovieCapture({env});
 capture.begin({...source(),sourceCanvas:{width:1920,height:1080}});
 await assert.rejects(()=>capture.stop(),/MOVIE_EMPTY_CAPTURE/);
 assert.equal(capture.state,'FAILED');
 assert.equal(capture.output,null);
});
test('recording error rejects pending output; original model never changes',async()=>{
 const {env}=fakeEnv(),capture=new RealMovieCapture({env});
 capture.begin({...source(),sourceCanvas:{width:1920,height:1080}});
 capture.draw(500,'字幕');
 const result=capture.stop(); // fake onstop is synchronous
 const output=await result;assert.equal(output.evidence.sourceGLBUnmodified,true);
 assert.equal(capture.recorder,null);
});
test('MovieWorkspace only enables movie control for true resolved GLB, and invalidates old files',()=>{
 const elements=new Map();
 const elem=id=>{
  if(!elements.has(id))elements.set(id,{
   id,disabled:false,hidden:false,listeners:{},children:[],
   addEventListener(t,fn){this.listeners[t]=fn;},replaceChildren(){this.children=[];},
   querySelectorAll(){return [];},removeAttribute(){},pause(){},append(c){this.children.push(c);}
  });
  return elements.get(id);
 };
 const doc={getElementById:elem};
 let live={plan:null,sourceSha:null,view:null};
 const workspace=new MovieWorkspace({document:doc,getContext:()=>live,
  showSubtitle(){},clearSubtitle(){}});
 assert.equal(elem('movie-record').disabled,true);
 live={plan,sourceSha:sha,view:{model:{},animation:{clips:[clip]}}};
 assert.equal(workspace.refresh(),true);
 assert.equal(elem('movie-record').disabled,false);
 workspace.invalidate();assert.equal(elem('movie-preview').hidden,true);
 workspace.active=true;
 assert.throws(()=>workspace.invalidate(),/MOVIE_RECORDING_IN_PROGRESS/);
});
test('UI and renderer code own truthful actual recording callback, viewport restoration and original audio sources',()=>{
 const root=new URL('../',import.meta.url),get=name=>fs.readFileSync(new URL(name,root),'utf8');
 const html=get('index.html'),app=get('app.mjs'),movie=get('movie-ui.mjs'),
  viewer=get('viewer.mjs'),sound=get('story-audio.mjs');
 for(const id of ['movie-record','movie-stop','movie-preview','movie-downloads',
  'movie-status','movie-voice-file'])assert.ok(html.includes('id="'+id+'"'),id);
 assert.ok(app.includes('new MovieWorkspace('));
 assert.ok(movie.includes('capture.begin({sourceCanvas:view.canvas,audioDestination:bus'));
 assert.ok(movie.includes('view.animation.startStory(plan,{'));
 assert.ok(movie.includes('sound.playRecordedVoice(buffer)'));
 assert.ok(movie.includes('this.showSubtitle(beat.dialogue)'));
 assert.ok(movie.includes('capture.draw(t,this.el('));
 assert.ok(viewer.includes('this.renderer.setSize(1920,1080,false)'));
 assert.ok(viewer.includes('this.endMovie1080p()'));
 assert.ok(sound.includes('vol.connect(this.captureDestination)'));
 assert.ok(sound.includes('createMediaStreamDestination()'));
 assert.ok(sound.includes('decodeAudioData(buffer.slice(0))'));
 assert.ok(movie.includes('this.lock(true)')&&movie.includes('this.restoreControls()'));
 assert.ok(movie.includes('systemSpeechSynthCaptured:false'));
});
