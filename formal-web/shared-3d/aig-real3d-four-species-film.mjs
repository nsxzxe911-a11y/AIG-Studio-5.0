/**
 * Real3D V93 combined 3D cinema frame: V92 skinned actor,
 * source-authored fur/feather/fins/garment, and V91 physics ball.
 * All meshes remain genuine indexed XYZ in the SAME WebGL scene.
 */
import {AIG_REAL3D_V93_SCHEMA} from './aig-real3d-biomechanical-attachments.mjs';
import {AIG_REAL3D_V92_FILM_SCHEMA}
 from './aig-real3d-rig-sport-film.mjs';
export const AIG_REAL3D_V93_FILM_SCHEMA='AIG_REAL3D_V93_FOUR_SPECIES_SKIN_SECONDARY_BALL_FILM_V1';
const fail=s=>{throw Error('REAL3D_V93_FILM_'+s);};
export function createAIGReal3DFourSpeciesFilm({secondary,sportFilm}={}){
 if(secondary?.schema!==AIG_REAL3D_V93_SCHEMA||
  sportFilm?.schema!==AIG_REAL3D_V92_FILM_SCHEMA||
  secondary.rig!==sportFilm.rig||
  secondary.sourceSha256!==sportFilm.rig.sourceSha256)
  fail('SOURCE_ACTOR_SECONDARY_BALL_MISMATCH');
 const attachedNodes=secondary.scene.nodes,ballNodes=sportFilm.ball.scene.nodes;
 const ids=new Set(attachedNodes.map(n=>n.id));
 if(ballNodes.some(n=>ids.has(n.id)))fail('SHARED_GPU_NODE_COLLISION');
 const scene={...secondary.scene,id:'v93FourSpeciesFilm',
  source:'V93_SOURCE_AUTHORED_ACTOR_SECONDARY_AND_V91_3D_BALL',
  nodes:[...attachedNodes,...ballNodes],
  overlays:[],revision:secondary.scene.revision+1};
 let images=0;
 function renderFrame(renderer,index,{
  visibleAttachments=null,visibleActorChunks=null
 }={}){
  if(!Number.isInteger(index)||index<0||index>=sportFilm.frameCount||
   typeof renderer?.render!=='function')
   fail('REAL_INDEXED_GPU_FRAME_REQUIRED');
  const frame=sportFilm.frameAt(index);
  const surface=secondary.renderFrame(renderer,frame.timeSec,{
   visibleAttachmentIds:visibleAttachments,
   visibleRigNodeIds:visibleActorChunks,
   deferDraw:true
  });
  sportFilm.ball.applyFrame(index);
  const result=renderer.render(scene);
  if(result?.status!=='WEBGL_XYZ_TRIANGLES_RENDERED'||
   result.triangles<2000)
   fail('REAL_ACTOR_ATTACHMENT_BALL_TRIANGLES_REQUIRED');
  images++;
  return {schema:AIG_REAL3D_V93_FILM_SCHEMA,
   index,timeSec:frame.timeSec,sourceSpecies:secondary.species,
   originalActorJoints:surface.originalSkeletonJointsStillAllAnimated,
   attachmentsRealSourceTriangles:surface.originalAttachedTriangles,
   indexedXYZBallPosition:[...frame.position],
   actualCombinedGPURender:true,triangles:result.triangles,
   sourceBodyAndAttachmentsAndBallOneFrame:true,
   originalMeshesUntouched:true};
 }
 return {schema:AIG_REAL3D_V93_FILM_SCHEMA,secondary,sportFilm,scene,
  fps:sportFilm.fps,frameCount:sportFilm.frameCount,
  durationSec:sportFilm.durationSec,frameAt:sportFilm.frameAt,
  renderFrame,
  stats:()=>({actualCompleteGPUMovieFrames:images,
   fourSpeciesMechanicsOneSharedCore:true,
   originalSourceScanIndependentlyValidated:false,
   cinematicPhysicalMotionQualityCertified:false,
   GPUStable60FPSMeasured:false,releasePASS:false})};
}
export async function recordAIGReal3DFourSpeciesWebM({
 film,renderer,canvas,renderOptions=null,requestFrame=typeof requestAnimationFrame==='function'?
  requestAnimationFrame:null,preRender=null
}={}){
 if(film?.schema!==AIG_REAL3D_V93_FILM_SCHEMA||
  typeof renderer?.render!=='function'||
  typeof canvas?.captureStream!=='function'||
  typeof requestFrame!=='function'||
  typeof MediaRecorder!=='function'||
  typeof MediaRecorder.isTypeSupported!=='function'||
  (preRender!==null&&typeof preRender!=='function')||
  (renderOptions!==null&&(typeof renderOptions!=='object'||Array.isArray(renderOptions))))
  fail('MOVIE_NATIVE_ENCODER_UNAVAILABLE');
 const type=['video/webm;codecs=vp8','video/webm'].find(m=>MediaRecorder.isTypeSupported(m));
 if(!type)fail('ACTUAL_WEBM_CODEC_NOT_SUPPORTED');
 const stream=canvas.captureStream(0),track=stream.getVideoTracks()[0];
 if(!track||typeof track.requestFrame!=='function'){
  stream.getTracks().forEach(t=>t.stop());
  fail('REAL_GPU_MANUAL_FRAME_CAPTURE_REQUIRED');
 }
 const rec=new MediaRecorder(stream,{mimeType:type,videoBitsPerSecond:3500000});
 let stopped=false,errors=null,rendered=0,started=null,last=-1;
 const chunks=[],ended=new Promise((resolve,reject)=>{
  rec.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data);};
  rec.onerror=e=>{errors=e.error??Error('WEBM_REAL_ENCODER_ERROR');};
  rec.onstop=()=>errors?reject(errors):resolve();
 });
 try{
  rec.start();
  while(last<film.frameCount-1){
   const stamp=await new Promise(resolve=>requestFrame(resolve));
   if(!Number.isFinite(stamp))fail('MOVIE_TIME_INVALID');
   if(started===null)started=stamp;
   const elapsed=Math.max(0,(stamp-started)/1000),
    idx=Math.min(film.frameCount-1,Math.floor(elapsed*film.fps+1e-8));
   if(idx<=last)continue;
   if(preRender)preRender(film.frameAt(idx));
   film.renderFrame(renderer,idx,renderOptions??{});
   track.requestFrame();rendered++;last=idx;
   if(elapsed>film.durationSec+3)fail('ACTUAL_WEBM_REALTIME_OVERRUN');
  }
  rec.stop();stopped=true;await ended;
  const blob=new Blob(chunks,{type});
  if(blob.size<256||rendered<2)fail('REAL_3D_WEBM_EMPTY_OR_STILL');
  return {schema:'AIG_REAL3D_V93_SOURCE_SECONDARY_REAL_WEBM_V1',
   blob,mimeType:type,bytes:blob.size,
   real3DSourceFramesSubmitted:rendered,
   actorAttachmentAndBallBothActuallyGPUdrawn:true,
   decodedVideoFramesIndependentlyCounted:false,
   independentlyMeasuredDeviceFPS:null,
   photoToFilmOneToOneGeometryVerified:false,releasePASS:false};
 }finally{
  if(!stopped&&rec.state!=='inactive')rec.stop();
  stream.getTracks().forEach(x=>x.stop());
 }
}
