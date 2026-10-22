/**
 * AIG Real3D 2.5 | genuine multi-actor GPU WORLD -> actual encoded movie.
 *
 * The camera, actors and materials are the already active Three.js world,
 * not animated image plates. Captures 1920x1080 real WebGL canvas pixels
 * AFTER each draw, compositing sourced subtitles as pixels. MediaRecorder
 * produces a real browser-supported WebM/MP4 blob, never an MP4 renamed WebM.
 * Reuses the 2.2 verified Chinese storyboard and 2.4 independently moving
 * SkinnedMesh body-vertex evidence. Does NOT synthesize speech/audio,
 * textures, new walk/run/jump clips or invisible geometry.
 */
import {chooseMovieFormat} from './movie-recorder.mjs';
import {verifyAIG22Story} from './aig-text-world-storyboard-2-2.mjs';
import {auditAIG24ArticulatedAnimation} from './aig-motion-integrity-2-4.mjs';
export const AIG25_SCHEMA='AIG_FASTMODEL_REAL3D_2_5_ACTUAL_WEBGL_WORLD_MOVIE';
export const AIG25_RENDER=Object.freeze({width:1920,height:1080,targetFPS:30,maxSeconds:120});
const fail=s=>{throw Error('AIG25_'+s)};
const isHex=s=>typeof s==='string'&&/^[0-9a-f]{64}$/i.test(s);
export function validateAIG25TrueWorldMovie({plan,scene,actors,viewer}={}){
 verifyAIG22Story(plan,scene,actors);
 if(!Number.isFinite(plan.durationSeconds)||plan.durationSeconds<.5||
  plan.durationSeconds>AIG25_RENDER.maxSeconds)
  fail('BOUNDED_ACTUAL_STORY_DURATION_REQUIRED');
 if(!viewer?.model?.isObject3D||viewer.model.children.length<1||
  !viewer.renderer||!(viewer.worldActorMixers instanceof Map))
  fail('ACTUAL_MULTI_GLB_WEBGL_WORLD_REQUIRED');
 const actorEvents=plan.events.filter(e=>e.type==='ACTOR_SOURCE_CLIP');
 if(!actorEvents.length)fail('REAL_JOINT_ANIMATED_ACTOR_CUE_REQUIRED');
 const actorNames=[...new Set(actorEvents.map(e=>e.nodeId))];
 const inspected=[];
 for(const nodeId of actorNames){
  const actor=viewer.worldActorMixers.get(nodeId);
  const source=scene.objects.find(x=>x.nodeId===nodeId);
  if(!actor?.root?.isObject3D||!actor.clips?.length||!source||
   !isHex(source.sourceSha256?.replace(/^sha256:/,'')))
   fail('ACTUAL_SOURCE_LOCKED_SKELETON_ACTOR_REQUIRED');
  // 2.4 audits the *actual bone-weighted body*, not a camera/card transform.
  // It leaves the original GLB bytes intact and restores sampled bone poses.
  const motion=auditAIG24ArticulatedAnimation({
   scene:actor.root,animations:actor.clips
  },{maxClips:Math.min(12,actor.clips.length)});
  if(!motion.bodyMovementIsNotGlobalPhotoSway||
   motion.nonPlanarVolume<.015||
   motion.distinctWeightedBodyJoints<6)
   fail('FLAT_OR_ONLY_WHOLE_PHOTO_MOTION_REJECTED');
  const used=actorEvents.filter(e=>e.nodeId===nodeId);
  const reviewed=used.map(e=>{
   const c=motion.clips[e.clipIndex];
   if(!c||c.clipName!==e.clipName||
    !c.realLocalBodyDeformation||c.movingNonRootBones<1)
    fail('SPOKEN_OR_STORY_CUE_HAS_NO_REAL_LOCAL_BONE_DEFORMATION');
   return {clipName:c.clipName,movingNonRootBones:c.movingNonRootBones,
    relativeMeshPairChanges:c.maxChangedInternalPairs};
  });
  inspected.push({nodeId,sourceGLBSHA256:source.sourceSha256,
   bodyMeshes:motion.trueSkinnedBodyMeshCount,
   weightedJoints:motion.distinctWeightedBodyJoints,
   nonPlanarVolumeRatio:motion.nonPlanarVolume,
   trulyArticulatedSourceClips:reviewed});
 }
 const manifest=scene.objects.map(o=>({
  nodeId:o.nodeId,category:o.category,
  assetId:o.assetId,sourceSha256:o.sourceSha256
 }));
 return {schema:AIG25_SCHEMA,
  sourceSceneId:scene.id,sourceSceneRevision:scene.revision,
  sourceManifest:manifest,
  durationSeconds:plan.durationSeconds,
  validatedRealActors:inspected,
  actualSourceAnimatedActorCount:inspected.length,
  generatedHumanMovement:false,unverifiedCueBlocked:true,
  realSource3DMeshRequired:true,flatPhotoCameraOnlyRejected:true,
  render:[AIG25_RENDER.width,AIG25_RENDER.height],
  targetFPS:AIG25_RENDER.targetFPS,
  audioTracksRequested:0,voiceSynthesized:false,
  movieWritten:false,heroineIdentityApproved:false,
  constantFramerateVerified:false,nativeAndroidWindowsFPSVerified:false,
  releaseAllowed:false,status:'VALIDATED_TRUE_3D_SCENE_RECORDING_NOT_STARTED'};
}
export class AIG25WorldMovieRecorder{
 constructor({env=globalThis,onState=()=>{}}={}){
  this.env=env;this.onState=onState;this.state='IDLE';
  this.records=[];this.recorder=null;this.captureCanvas=null;
  this.output=null;this.frameCount=0;this.videoTracks=[];
  this._finished=null;this._resolve=null;this._reject=null;
  this.evidence=null;this.format=null;this.lastTime=-Infinity;
  this.videoStream=null;this.sourceCanvas=null;
 }
 begin({sourceCanvas,proof}={}){
  if(this.state!=='IDLE')fail('SINGLE_ACTIVE_RECORDING_REQUIRED');
  if(proof?.schema!==AIG25_SCHEMA||
   proof.status!=='VALIDATED_TRUE_3D_SCENE_RECORDING_NOT_STARTED'||
   !proof.actualSourceAnimatedActorCount||!Array.isArray(proof.sourceManifest)||
   !sourceCanvas||sourceCanvas.width!==AIG25_RENDER.width||
   sourceCanvas.height!==AIG25_RENDER.height)
   fail('SOURCE_PROVENANCE_AND_1080P_WEBGL_CANVAS_REQUIRED');
  const MR=this.env.MediaRecorder,format=chooseMovieFormat(MR,{preferMp4:false});
  if(typeof this.env.MediaStream!=='function')fail('MEDIA_STREAM_UNSUPPORTED');
  const canvas=this.env.document?.createElement?.('canvas');
  if(!canvas?.getContext||!canvas.captureStream)fail('CANVAS_CAPTURE_UNAVAILABLE');
  canvas.width=AIG25_RENDER.width;canvas.height=AIG25_RENDER.height;
  const ctx=canvas.getContext('2d',{alpha:false});
  if(!ctx)fail('PIXEL_COMPOSITOR_UNAVAILABLE');
  const stream=canvas.captureStream(AIG25_RENDER.targetFPS);
  const video=stream?.getVideoTracks?.()||[];
  if(video.length!==1)fail('EXACT_ONE_ACTUAL_VIDEO_TRACK_REQUIRED');
  const mixed=new this.env.MediaStream(video);
  let recorder;
  try{
   recorder=new MR(mixed,{mimeType:format.mime,
    videoBitsPerSecond:7500000});
   this.recorder=recorder;this.records=[];this.frameCount=0;
   this.captureCanvas=canvas;this.ctx=ctx;this.sourceCanvas=sourceCanvas;
   this.format=format;this.videoTracks=video;this.videoStream=mixed;
   this.evidence={...proof,status:'LIVE_REAL_WEBGL_CAPTURE',movieWritten:false};
   this.state='RECORDING';this.lastTime=-Infinity;
   this._finished=new Promise((resolve,reject)=>{
    this._resolve=resolve;this._reject=reject;
   });
   this._finished.catch(()=>{});
   recorder.ondataavailable=e=>{if(e?.data?.size>0)this.records.push(e.data)};
   recorder.onerror=e=>this.abort(e?.error||Error('ENCODER_ERROR'));
   recorder.onstop=()=>{if(this.state!=='FAILED')this._finish()};
   recorder.start(200);
   this.onState({state:'RECORDING',real3D:true,
    targetFPS:AIG25_RENDER.targetFPS,actualAudioTracks:0});
   return {mime:format.mime,extension:format.ext,
    exactSourceProtected:true,oneSharedRenderer:true};
  }catch(err){
   if(this.state==='RECORDING')this.abort(err);
   else for(const track of video)try{track.stop()}catch{}
   throw err;
  }
 }
 draw(timeMs,subtitle=''){
  if(this.state!=='RECORDING'||!Number.isFinite(timeMs))return false;
  if(timeMs-this.lastTime<1000/AIG25_RENDER.targetFPS-1e-4)return false;
  const ctx=this.ctx;
  try{
   ctx.fillStyle='#020407';
   ctx.fillRect(0,0,AIG25_RENDER.width,AIG25_RENDER.height);
   ctx.drawImage(this.sourceCanvas,0,0,
    AIG25_RENDER.width,AIG25_RENDER.height);
   const content=String(subtitle||'').trim().slice(0,140);
   if(content){
    ctx.fillStyle='rgba(1,6,12,.88)';
    ctx.fillRect(126,918,1668,108);
    ctx.fillStyle='#fff';ctx.textAlign='center';
    ctx.font='bold 41px sans-serif';
    const lines=content.match(/.{1,34}/gu)?.slice(0,2)||[];
    lines.forEach((x,i)=>ctx.fillText(x,960,969+i*43,1580));
   }
   this.lastTime=timeMs;this.frameCount++;
   return true;
  }catch(error){this.abort(error);return false}
 }
 stop(){
  if(this.state==='FINALIZING')return this._finished;
  if(this.state!=='RECORDING')return this._finished||
   Promise.reject(Error('AIG25_NOT_RECORDING'));
  this.state='FINALIZING';
  try{
   if(this.recorder?.state!=='inactive')this.recorder.stop();
   else this._finish();
  }catch(err){this.abort(err)}
  return this._finished;
 }
 _finish(){
  if(this.state==='COMPLETE'||this.state==='FAILED')return;
  const n=this.records.reduce((s,b)=>s+b.size,0);
  if(!n||this.frameCount<2){
   this.abort(Error('NO_NONEMPTY_ACTUAL_3D_VIDEO_FRAMES'));return;
  }
  const blob=new Blob(this.records,{type:this.format.mime});
  const evidence={...this.evidence,
   status:'ENCODED_ACTUAL_WEBGL_MOVIE',
   movieWritten:true,outputMimeType:this.format.mime,
   containerExtension:this.format.ext,actualFramesComposited:this.frameCount,
   bytesEncoded:blob.size,sourceGLBsUnmodified:true,
   sourceSubtitlePixelsBurnedIntoCanvas:true,
   generatedHumanMovement:false,generatedVoice:false,
   recordedAudioTracks:0,browserTTSIncluded:false,
   targetFPS:AIG25_RENDER.targetFPS,constantFramerateVerified:false,
   exactOneToOnePhysicalScaleUnverified:true,identityApproved:false,
   releaseAllowed:false};
  this.output={blob,filename:'AIG-Real3D-2-5-World-Movie.'+
   this.format.ext,evidence};
  this.state='COMPLETE';this._cleanup();
  this._resolve?.(this.output);
  this.onState({state:'COMPLETE',bytes:blob.size,frames:this.frameCount});
 }
 abort(error=Error('USER_CANCELLED')){
  if(this.state==='COMPLETE'||this.state==='FAILED')return;
  this.state='FAILED';
  try{if(this.recorder?.state==='recording')this.recorder.stop()}catch{}
  this._cleanup();
  this._reject?.(error instanceof Error?error:Error(String(error)));
  this.onState({state:'FAILED',message:String(error?.message||error),
   movieWritten:false});
 }
 _cleanup(){
  for(const x of this.videoTracks)try{x.stop()}catch{}
  this.videoTracks=[];this.videoStream=null;this.recorder=null;
  this.captureCanvas=null;this.ctx=null;this.sourceCanvas=null;
 }
}
