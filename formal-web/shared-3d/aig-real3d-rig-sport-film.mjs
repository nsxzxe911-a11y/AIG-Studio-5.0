/**
 * Real3D V92: synchronized source SKINNED 3D actor + V91 true ball on
 * one shared GPU scene and one source timeline. Does not substitute
 * 2D billboards, CSS animation, or fabricated humanoid scanning.
 */
import {createAIGReal3DSport3DReplay}
 from './aig-real3d-sports-3d-replay.mjs';
import {AIG_REAL3D_V92_RIG_SCHEMA}
 from './aig-real3d-rig-wrap-contact.mjs';
export const AIG_REAL3D_V92_FILM_SCHEMA='AIG_REAL3D_V92_SKINNED_ACTOR_BALL_REAL_3D_FILM_V1';
const fail=x=>{throw Error('REAL3D_V92_FILM_'+x);};
export function createAIGReal3DRigSportFilm({
 rig,contact,visibleRigNodeIds=null
}={}){
 if(rig?.schema!==AIG_REAL3D_V92_RIG_SCHEMA||
  contact?.schema!=='AIG_REAL3D_V92_RIG_TO_SPORTS_CONTACT_V1'||
  contact.sourceSha256!==rig.sourceSha256||
  !contact.physicsImpulseApplied||!contact.trajectory?.frames?.length||
  contact.trajectory.durationSec>rig.lastTimeSec)
  fail('RIG_PHYSICS_SOURCE_TIME_MISMATCH');
 if(visibleRigNodeIds!==null&&(rig.wrapMode!=='HALF_WRAP'||
  !Array.isArray(visibleRigNodeIds)||!visibleRigNodeIds.length))
  fail('HALF_WRAP_SOURCE_VISIBLE_CHUNKS_REQUIRED');
 const ball=createAIGReal3DSport3DReplay({trajectory:contact.trajectory});
 const rigScene=rig.workingScene;
 const actorNodeIds=new Set(rigScene.nodes.map(n=>n.id));
 if(ball.scene.nodes.some(n=>actorNodeIds.has(n.id)))
  fail('ACTOR_BALL_NODE_ID_COLLISION');
 const scene={...rigScene,id:'v92SourceRigSportsFilm',
  source:'SOURCE_AUTHORED_RIG_PLUS_V91_TRUE_3D_SPORTS_BALL',
  nodes:[...rigScene.nodes,...ball.scene.nodes],
  overlays:[],revision:rigScene.revision+1};
 let frames=0,drawnTriangles=0;
 function renderFrame(renderer,index){
  if(!Number.isInteger(index)||index<0||index>=ball.frameCount||
   typeof renderer?.render!=='function')
   fail('ACTUAL_SOURCE_FRAME_INDEX_INVALID');
  const entry=ball.frameAt(index),seconds=entry.timeSec;
  const actor=rig.updateGPU(renderer,seconds,{
   showNodes:visibleRigNodeIds,deferCompositeRender:true});
  ball.applyFrame(index);
  const frame=renderer.render(scene);
  if(frame?.status!=='WEBGL_XYZ_TRIANGLES_RENDERED'||frame.triangles<2000)
   fail('REAL_SOURCE_ACTOR_AND_BALL_GPU_REQUIRED');
  frames++;drawnTriangles=frame.triangles;
  return {frameIndex:index,timeSec:seconds,
   trueActorSkinGPUVertexUpdates:actor.gpuSubdataCalls,
   actorJointsFullySampled:actor.sampledJoints,
   ballXYZ:[...entry.position],
   ballAngularVelocityRadps:[...entry.angularVelocity],
   originalSourceTopologyPreserved:true,
   actorAndBallRenderedInSameGPUFrame:true,
   triangles:frame.triangles};
 }
 return {schema:AIG_REAL3D_V92_FILM_SCHEMA,
  scene,rig,contact,ball,frameCount:ball.frameCount,
  fps:ball.fps,durationSec:ball.durationSec,
  renderFrame,frameAt:ball.frameAt,
  stats:()=>({actualCombinedGPURenders:frames,
   lastRenderedIndexedTriangles:drawnTriangles,
   source3DActorPoseAndBallPositionBothUsed:frames>0,
   fullHumanBodyAnatomicalScanCertified:false,
   calibratedActorBallSportPrecisionCertified:false,
   trueMovieEncodedAndDecodedCertified:false,releasePASS:false})};
}
export async function recordAIGReal3DRigSportFilmWebM({
 film,canvas,renderer,onFrame=null,
 requestFrame=typeof requestAnimationFrame==='function'?requestAnimationFrame:null
}={}){
 if(film?.schema!==AIG_REAL3D_V92_FILM_SCHEMA||
  typeof renderer?.render!=='function'||
  typeof canvas?.captureStream!=='function'||
  typeof requestFrame!=='function'||
  typeof MediaRecorder!=='function'||
  typeof MediaRecorder.isTypeSupported!=='function'||
  (onFrame!==null&&typeof onFrame!=='function'))
  fail('MOVIE_SOURCE_AND_REAL_ENCODER_REQUIRED');
 const mime=['video/webm;codecs=vp8','video/webm'].find(MediaRecorder.isTypeSupported.bind(MediaRecorder));
 if(!mime)fail('WEBM_MIME_UNSUPPORTED');
 const stream=canvas.captureStream(0),track=stream.getVideoTracks()[0];
 if(!track||typeof track.requestFrame!=='function'){
  stream.getTracks().forEach(t=>t.stop());fail('WEBM_MANUAL_CAPTURE_REQUIRED');
 }
 const rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:3500000});
 const chunks=[];let stopped=false,error=null,frames=0,begin=null,last=-1;
 const done=new Promise((resolve,reject)=>{
  rec.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data);};
  rec.onerror=e=>{error=e.error||Error('MOVIE_ENCODER_FAILED');};
  rec.onstop=()=>error?reject(error):resolve();
 });
 try{
  rec.start();
  while(last<film.frameCount-1){
   const stamp=await new Promise(resolve=>requestFrame(resolve));
   if(!Number.isFinite(stamp))fail('VIDEO_CLOCK_INVALID');
   if(begin===null)begin=stamp;
   const seconds=Math.max(0,(stamp-begin)/1000);
   const index=Math.min(film.frameCount-1,Math.floor(seconds*film.fps+1e-8));
   if(index<=last)continue;
   if(onFrame)onFrame(film.frameAt(index));
   film.renderFrame(renderer,index);
   track.requestFrame();last=index;frames++;
   if(seconds>film.durationSec+3)fail('VIDEO_OVERRUN');
  }
  rec.stop();stopped=true;await done;
  const blob=new Blob(chunks,{type:mime});
  if(blob.size<256||frames<2)fail('ENCODED_VIDEO_EMPTY');
  return {schema:'AIG_REAL3D_V92_ACTOR_BALL_REAL_3D_WEBM_V1',
   blob,mimeType:mime,bytes:blob.size,
   realGPU3DFramesSubmitted:frames,
   actorSkinningAndBallMotionBothSubmitted:true,
   actualEncodedFrameCountIndependentlyDecoded:false,
   calibratedFilmFPSVerified:false,
   liveActorVideoOrAnatomyVerified:false,
   productionReleasePASS:false};
 }finally{
  if(!stopped&&rec.state!=='inactive')rec.stop();
  stream.getTracks().forEach(t=>t.stop());
 }
}
