import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {AIG65_SCHEMA,AIG65_MODES,planAIG65AutoAnimation,
 publicAIG65Plan,analyzeAIG65ForegroundPixels,sampleAIG65FlatMotion}
 from '../aig-auto-animation-6-5.mjs';
import {AIG65_CAPTURE_SCHEMA,drawAIG65CanvasFrame,
 AIG65CanvasRecorder,AIG65_MOVIE_SIZE}
 from '../aig-canvas-movie-6-5.mjs';
const id='a'.repeat(64),glb='b'.repeat(64);
const options=(over={})=>({hasImage:true,imageSHA256:id,
 storyText:'鏡頭沿著櫻花校園照片緩慢推近。',requestedMode:'AUTO',
 durationSeconds:8,...over});
function mockImage(kind='alpha'){
 const width=100,height=100,data=new Uint8ClampedArray(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=(y*width+x)*4;
  data[i]=235;data[i+1]=234;data[i+2]=234;
  data[i+3]=kind==='alpha'&&x<24?0:255;
  if(x>36&&x<64&&y>20&&y<85){
   data[i]=40;data[i+1]=55;data[i+2]=92;
  }
 }
 return {width,height,data};
}
test('AUTO routes explicitly requested camera motion to photo compositing',()=>{
 const p=planAIG65AutoAnimation(options());
 assert.equal(p.schema,AIG65_SCHEMA);
 assert.equal(p.selectedMode,'2.5D');
 assert.equal(p.ready,true);
 assert.equal(p.sourceSHA256,id);
 assert.ok(p.timeline.length>=1);
 assert.ok(p.timeline.every(x=>x.visualTechnique==='REAL_CANVAS_IMAGE_PARALLAX_ESTIMATED_DEPTH'));
 assert.ok(p.timeline.every(x=>!x.armsAndLegsActuallyAnimated));
 assert.equal(p.formalReleaseAllowed,false);
 assert.equal(publicAIG65Plan(p).threeDClipPlanPresent,false);
 const x=sampleAIG65FlatMotion(p,1.23);
 const y=sampleAIG65FlatMotion(p,2.15);
 assert.equal(x.actualPixelFrameRequired,true);
 assert.ok(x.transform.zoom>1);
 assert.ok(y.timeSeconds>x.timeSeconds);
 assert.equal(x.photoHumanLimbsWereNotArticulated,true);
});
test('6.5 2D photos or text-only scene cards work without GLB, picture is optional for story',()=>{
 const p=planAIG65AutoAnimation(options({storyText:'轉頭',requestedMode:'2D'}));
 assert.equal(p.selectedMode,'2D');assert.equal(p.ready,true);
 const card=planAIG65AutoAnimation({storyText:'夜空中的第一場相遇',
  hasImage:false,requestedMode:'AUTO'});
 assert.equal(card.ready,true);
 assert.equal(card.selectedMode,'2D');
 assert.equal(card.sourceSHA256,null);
 assert.equal(card.timeline[0].visualTechnique,'TEXT_TITLE_CARD_ANIMATION');
});
test('6.5 never claims unsupported arm/kick/block fighting as real 2D/2.5D skeleton',()=>{
 for(const story of ['出拳','踢腿','格擋','跌倒']){
  const result=planAIG65AutoAnimation(options({storyText:story}));
  assert.equal(result.ready,false,story);
  assert.ok(result.blockers.includes('ARTICULATED_FIGHTING_NOT_AVAILABLE_IN_FLAT_IMAGE'));
 }
 assert.equal(planAIG65AutoAnimation(options({storyText:'敵人出拳'})).ready,false);
});
test('6.5 3D must have actual GLB and matching verified THREE clip tracks, not action keywords',()=>{
 const noGLB=planAIG65AutoAnimation(options({requestedMode:'3D'}));
 assert.equal(noGLB.ready,false);
 assert.ok(noGLB.blockers.includes('VERIFIED_REAL_GLB_CLIPS_REQUIRED'));
 const fake=planAIG65AutoAnimation(options({requestedMode:'3D',hasGLB:true,
  glbSHA256:glb,clips:[]}));
 assert.equal(fake.ready,false);
 const actual=planAIG65AutoAnimation(options({requestedMode:'AUTO',hasGLB:true,
  glbSHA256:glb,storyText:'轉頭',clips:[{
   name:'AIG48_TURN_HEAD',duration:2,tracks:[{name:'neck.rotation'}]
  }]}));
 assert.equal(actual.ready,true);
 assert.equal(actual.selectedMode,'3D');
 assert.equal(actual.threeDPlan.ready,true);
 assert.equal(actual.sourceSHA256,glb);
 assert.equal(actual.timeline[0].visualTechnique,'REAL_SKELETAL_GLB_CLIP');
});
test('6.5 rejects fake source SHA, unsafe mode, duration, oversize script and missing content',()=>{
 for(const patch of [{imageSHA256:'fake'},{requestedMode:'4D'},
  {durationSeconds:190},{durationSeconds:0},
  {storyText:'x'.repeat(3001)}])
  assert.throws(()=>planAIG65AutoAnimation(options(patch)),/AIG65_/);
 assert.throws(()=>planAIG65AutoAnimation({storyText:'',hasImage:false}),
  /AIG65_PHOTO_OR_STORY/);
 assert.deepEqual(AIG65_MODES,['AUTO','2D','2.5D','3D']);
});
test('6.5 real RGBA alpha is a real foreground; opaque ROI can be heuristic but never claims physical depth',()=>{
 const alpha=analyzeAIG65ForegroundPixels(mockImage('alpha'));
 assert.equal(alpha.hasDistinctForeground,true);
 assert.equal(alpha.method,'EXISTING_REAL_ALPHA');
 assert.equal(alpha.depthWasMeasured,false);
 const rgb=analyzeAIG65ForegroundPixels(mockImage('rgb'));
 assert.equal(rgb.hasDistinctForeground,true);
 assert.equal(rgb.method,'BORDER_RGB_DIFFERENCE_HEURISTIC');
 assert.equal(rgb.depthWasMeasured,false);
 const blank=mockImage('rgb');for(let i=0;i<blank.data.length;i+=4){
  blank.data[i]=235;blank.data[i+1]=234;blank.data[i+2]=234;
 }
 assert.equal(analyzeAIG65ForegroundPixels(blank).hasDistinctForeground,false);
});
function contextMock(){
 const calls=[];
 const ctx={
  save:()=>calls.push('save'),restore:()=>calls.push('restore'),
  fillRect:()=>calls.push('fillRect'),drawImage:()=>calls.push('drawImage'),
  translate:()=>{},scale:()=>{},rotate:()=>{},
  createLinearGradient:()=>({addColorStop:()=>{}}),
  beginPath:()=>{},arc:()=>{},fill:()=>{},fillText:()=>calls.push('text'),
  set fillStyle(x){},set font(x){},set textAlign(x){}
 };
 return {calls,ctx};
}
test('6.5 actually draws 2D transformed bitmap and text story frames, not a timeline-only status',()=>{
 const image={width:320,height:480},canvas={width:960,height:540};
 const p=planAIG65AutoAnimation(options({requestedMode:'2D'}));
 const {ctx,calls}=contextMock();
 const evidence=drawAIG65CanvasFrame({ctx,canvas,plan:p,timeSeconds:1,
  layered:{image,background:image,foreground:null}});
 assert.ok(calls.filter(x=>x==='drawImage').length>=1);
 assert.equal(evidence.actualImagePixelFrameProduced,true);
 assert.equal(evidence.actualHumanJointPositionsComputed,false);
 const card=planAIG65AutoAnimation({storyText:'星空中的約定'});
 const a=contextMock();
 drawAIG65CanvasFrame({ctx:a.ctx,canvas,plan:card,timeSeconds:.5});
 assert.ok(a.calls.includes('text'));
});
test('2.5D does not draw an extracted duplicate person onto the original photo without clean background',()=>{
 const photo={width:320,height:480};
 const p=planAIG65AutoAnimation(options({requestedMode:'2.5D'}));
 const canvas={width:960,height:540};
 const a=contextMock();
 const noPlate=drawAIG65CanvasFrame({ctx:a.ctx,canvas,plan:p,timeSeconds:1,
  layered:{image:photo,background:photo,foreground:photo,backgroundPlateVerified:false}});
 assert.equal(a.calls.filter(x=>x==='drawImage').length,1,
  'one photographed person, no duplicate/ghost foreground');
 assert.equal(noPlate.layeredParallaxActive,false);
 assert.equal(noPlate.duplicatedForegroundOnUnrecoveredBackgroundBlocked,true);
 const b=contextMock();
 const otherBackdrop={width:320,height:480};
 const realPlate=drawAIG65CanvasFrame({ctx:b.ctx,canvas,plan:p,timeSeconds:1,
  layered:{image:photo,background:otherBackdrop,foreground:photo,backgroundPlateVerified:true}});
 assert.equal(b.calls.filter(x=>x==='drawImage').length,2);
 assert.equal(realPlate.layeredParallaxActive,true);
});
test('6.5 recorder only allows actual 1080p source and browser-encoded chunks; fake GLB source rejected',async()=>{
 const plan=planAIG65AutoAnimation(options());
 const fakeStream={
  getVideoTracks:()=>[{stop:()=>{}}],
  getAudioTracks:()=>[]
 };
 let recording=null;
 class MediaRecorderFake{
  static isTypeSupported(type){return type==='video/webm';}
  constructor(stream,args){this.stream=stream;this.args=args;this.state='inactive';recording=this;}
  start(){this.state='recording';}
  stop(){
   this.state='inactive';
   this.ondataavailable?.({data:new Blob(['1234'],{type:'video/webm'})});
   this.onstop?.();
  }
 }
 class MediaStreamFake{
  constructor(tracks){this.tracks=tracks;}
  getAudioTracks(){return [];}
 }
 const env={MediaRecorder:MediaRecorderFake,MediaStream:MediaStreamFake};
 const canvas={width:1920,height:1080,captureStream:()=>fakeStream};
 const rec=new AIG65CanvasRecorder({env});
 assert.throws(()=>rec.begin({canvas:{width:100,height:100},plan,
  sourceSHA256:id}),/AIG65_REAL_1080P/);
 rec.begin({canvas,plan,sourceSHA256:id});
 assert.equal(rec.state,'RECORDING');
 assert.equal(recording.args.mimeType,'video/webm');
 rec.frame();rec.frame();
 const output=await rec.stop();
 assert.ok(output.blob.size>0);
 assert.equal(output.evidence.schema,AIG65_CAPTURE_SCHEMA);
 assert.equal(output.evidence.sourceSHA256,id);
 assert.equal(output.evidence.container,'webm');
 assert.equal(output.evidence.targetResolution[0],1920);
 assert.equal(output.evidence.actualFramesDrawn,2);
 assert.equal(output.evidence.systemSpeechSynthesisCaptured,false);
 assert.equal(output.evidence.trueHumanLimbAnimation,false);
 assert.equal(AIG65_MOVIE_SIZE.fpsTarget,30);
});
test('6.5 releases owned video tracks on stream initialization failure, keeps caller audio intact',()=>{
 const plan=planAIG65AutoAnimation(options());
 let stoppedVideo=0,stoppedAudio=0;
 const videoTrack={stop:()=>{stoppedVideo++;}};
 const audioTrack={stop:()=>{stoppedAudio++;}};
 const canvas={width:1920,height:1080,
  captureStream:()=>({getVideoTracks:()=>[videoTrack]})};
 class BadMediaStream{
  constructor(){throw Error('BROWSER_STREAM_CONSTRUCTION_FAILED');}
 }
 class MediaRecorderFake{
  static isTypeSupported(mime){return mime==='video/webm';}
 }
 const rec=new AIG65CanvasRecorder({env:{
  MediaStream:BadMediaStream,MediaRecorder:MediaRecorderFake
 }});
 assert.throws(()=>rec.begin({canvas,plan,sourceSHA256:id,
  audioDestination:{stream:{getAudioTracks:()=>[audioTrack]}}}),
  /BROWSER_STREAM_CONSTRUCTION_FAILED/);
 assert.equal(stoppedVideo,1);
 assert.equal(stoppedAudio,0,'audio source belongs to caller');
 assert.equal(rec.state,'IDLE','failed initialization must not look like a running capture');
 let captureCount=0;
 const unsupported=new AIG65CanvasRecorder({env:{MediaRecorder:MediaRecorderFake}});
 assert.throws(()=>unsupported.begin({canvas:{...canvas,
  captureStream:()=>{captureCount++;return canvas.captureStream();}},
  plan,sourceSHA256:id}),/AIG65_MEDIA_STREAM_UNAVAILABLE/);
 assert.equal(captureCount,0,'unsupported browser must not acquire tracks');
});

test('6.5 failed encoded Blob creation rejects stop and releases owned video tracks',async()=>{
 const plan=planAIG65AutoAnimation(options());
 let videoStops=0,callerAudioStops=0;
 const videoTrack={stop:()=>{videoStops++;}};
 const callerAudioTrack={stop:()=>{callerAudioStops++;}};
 class MediaStreamFake{
  constructor(tracks){this.tracks=tracks;}
 }
 class MediaRecorderFake{
  static isTypeSupported(mime){return mime==='video/webm';}
  constructor(){this.state='inactive';}
  start(){this.state='recording';}
  stop(){
   this.state='inactive';
   this.ondataavailable?.({data:new Blob(['nonempty encoded bytes'])});
   this.onstop?.();
  }
 }
 class BrokenBlob{
  constructor(){throw Error('BROWSER_BLOB_FINALIZATION_FAILED');}
 }
 const rec=new AIG65CanvasRecorder({env:{
  MediaStream:MediaStreamFake,MediaRecorder:MediaRecorderFake,Blob:BrokenBlob
 }});
 const canvas={width:1920,height:1080,
  captureStream:()=>({getVideoTracks:()=>[videoTrack]})};
 rec.begin({canvas,plan,sourceSHA256:id,audioDestination:{
  stream:{getAudioTracks:()=>[callerAudioTrack]}
 }});
 rec.frame();rec.frame();
 await assert.rejects(rec.stop(),/BROWSER_BLOB_FINALIZATION_FAILED/);
 assert.equal(rec.state,'FAILED');
 assert.equal(videoStops,1,'canvas video track must be released exactly once');
 assert.equal(callerAudioStops,0,'caller-owned voice/music bus must remain alive');
 assert.equal(rec.stream,null);
 assert.equal(rec.recorder,null);
 assert.equal(rec.lastError.message,'BROWSER_BLOB_FINALIZATION_FAILED');
});
test('6.5 RGB top-page true callbacks, WebAudio SFX/music and existing 3D/other wardrobes preserved',()=>{
 const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
 const html=read('index.html'),app=read('app.mjs');
 for(const id of ['aig65-image','aig65-story','aig65-mode','aig65-duration',
  'aig65-build','aig65-canvas','aig65-play','aig65-stop','aig65-record',
  'aig65-report','aig65-video','aig65-downloads','aig65-status'])
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 for(const id of ['aig65-build','aig65-play','aig65-stop','aig65-record','aig65-report'])
  assert.ok(app.includes("$('"+id+"').addEventListener('click'"),id);
 for(const token of [
  'planAIG65AutoAnimation({','prepareAIG65Layers(document,bitmap)',
  'drawAIG65CanvasFrame({','new AIG65CanvasRecorder({',
  'aig65Recorder.begin({','storySound.createRecordingBus()',
  'aig65Recorder?.frame()', "aig65VideoUrls.push(url)",
  'storySound.tick(dt)','movieUI=new MovieWorkspace({',
  'generateVoiceBatch(','generateAIG64SinglePartialFullbody({analysis})'
 ])assert.ok(app.includes(token),token);
 assert.ok(html.indexOf('AIG FastModel 6.5｜')<html.indexOf('AIG FastModel 6.4｜'));
 const m=JSON.parse(read('AIG62-SCHOOL-VISUAL-ASSETS.json'));
 assert.equal(m.otherCostumesAndSwimwearStillAvailable,true);
});

test('camera plan preserves requested duration instead of silently truncating a single scene to 20 seconds',()=>{
 for(const seconds of [1,8,30,60,180]){
  const plan=planAIG65AutoAnimation(options({durationSeconds:seconds}));
  assert.equal(plan.seconds,seconds);
  assert.equal(plan.timeline.at(-1).startSeconds+plan.timeline.at(-1).seconds,seconds);
 }
});
