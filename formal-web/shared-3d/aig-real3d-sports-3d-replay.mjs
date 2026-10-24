/**
 * Real3D V91 visible SOURCE BALL physics. The sphere geometry is a disclosed
 * nonhuman geometric QA fixture, not a scanned/photorealistic sports ball.
 *
 * A real triangle mesh translates and rotates in 3D for each physics sample;
 * a small differently-colored 3D marker is parented to it to prove spin.
 * No frame is a translating 2D photo or motion-path-only visual.
 */
import {createAIG3DMesh,createAIG3DBox,createAIG3DScene,
 addAIG3DNode,updateAIG3DNodeTransform} from './aig-real3d-core.mjs';
import {AIG_REAL3D_V91_PHYSICS_SCHEMA} from './aig-real3d-sports-ballistics.mjs';
export const AIG_REAL3D_V91_REPLAY_SCHEMA='AIG_REAL3D_V91_LIVE_INDEXED_BALL_REPLAY_V1';
const fail=x=>{throw Error('REAL3D_V91_REPLAY_'+x);};
const finite=Number.isFinite;
function makeSphere(radius,{lat=32,lon=48}={}){
 const positions=[],normals=[],indices=[];
 for(let i=0;i<=lat;i++){
  const theta=Math.PI*i/lat,s=Math.sin(theta),y=Math.cos(theta);
  for(let j=0;j<=lon;j++){
   const phi=2*Math.PI*j/lon;
   const n=[s*Math.cos(phi),y,s*Math.sin(phi)];
   positions.push(...n.map(x=>x*radius));normals.push(...n);
  }
 }
 for(let i=0;i<lat;i++)for(let j=0;j<lon;j++){
  const a=i*(lon+1)+j,b=a+1,c=a+lon+1,d=c+1;
  // Exterior-facing winding: latitude down, longitude increasing.
  // Opposite winding culls the visible forward hemisphere on WebGL.
  if(i!==0)indices.push(a,b,c);
  if(i!==lat-1)indices.push(b,d,c);
 }
 return createAIG3DMesh({positions,normals,indices,
  provenance:'V91_SPORT_BALL_SOURCE_DISCLOSED_SPHERE_QA'});
}
function quatToEulerDeg(q){
 const [x,y,z,w]=q;
 const sinr=2*(w*x+y*z),cosr=1-2*(x*x+y*y);
 const sx=Math.atan2(sinr,cosr);
 const sy=Math.asin(Math.min(1,Math.max(-1,2*(w*y-z*x))));
 const sz=Math.atan2(2*(w*z+x*y),1-2*(y*y+z*z));
 return [sx,sy,sz].map(v=>v*180/Math.PI);
}
export function createAIGReal3DSport3DReplay({trajectory,id='sportsBall'}={}){
 if(trajectory?.schema!==AIG_REAL3D_V91_PHYSICS_SCHEMA||
  !Array.isArray(trajectory.frames)||trajectory.frames.length<2||
  !Number.isFinite(trajectory.preset?.radiusM)||
  !/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(id))
  fail('PHYSICS_TRAJECTORY_INVALID');
 const radius=trajectory.preset.radiusM;
 const scene=createAIG3DScene({id:'sports3d'+id,consumer:'FastModel',
  units:'METERS',source:'V91_PROCEDURAL_SPORT_SPHERE_AND_REAL_TRAJECTORY_QA'});
 const sphere=makeSphere(radius);
 addAIG3DNode(scene,{id,mesh:sphere,kind:'object',
  source:'NONHUMAN_SOURCE_SPHERE_WITH_3D_TRANSLATION_AND_SPIN',
  material:{baseColor:[.84,.89,.95,1],metallic:0,roughness:.65}});
 addAIG3DNode(scene,{id:'spinMarker',parentId:id,
  mesh:createAIG3DBox([radius*.26,radius*.11,radius*.20],
   'V91_TRUE_3D_ORIENTATION_MARKER'),
  transform:{position:[0,radius*.98,0]},
  source:'INDEXED_3D_SPIN_MARKER_NOT_A_TEXTURE_ANIMATION',
  material:{baseColor:[.96,.2,.08,1],metallic:0,roughness:.75}});
 const originPositions=JSON.stringify(sphere.positions),
  originIndices=JSON.stringify(sphere.indices);
 let drawn=0,previousFrame=-1;
 function frameAt(index){
  if(!Number.isInteger(index)||index<0||index>=trajectory.frames.length)
   fail('FRAME_INDEX_OUT_OF_RANGE');
  return trajectory.frames[index];
 }
 function applyFrame(index){
  const frame=frameAt(index);
  if(!frame.position.every(finite)||frame.orientationQuaternion.length!==4||
   !frame.orientationQuaternion.every(finite))
   fail('INVALID_REAL_3D_FRAME');
  updateAIG3DNodeTransform(scene,id,{
   position:frame.position,rotationDeg:quatToEulerDeg(frame.orientationQuaternion),
   scale:[1,1,1]
  });
  if(JSON.stringify(sphere.positions)!==originPositions||
   JSON.stringify(sphere.indices)!==originIndices)
   fail('SOURCE_SPHERE_GEOMETRY_MUTATED');
  previousFrame=index;
  return {index,timeSec:frame.timeSec,
   position:[...frame.position],
   angularVelocity:[...frame.angularVelocity],
   orientationQuaternion:[...frame.orientationQuaternion],
   physical3DTransformUsed:true,indexed3DTrianglesPreserved:true};
 }
 function renderFrame(renderer,index){
  if(typeof renderer?.render!=='function')fail('TRUE_WEBGL_RENDERER_REQUIRED');
  const pose=applyFrame(index),rendered=renderer.render(scene);
  if(rendered?.status!=='WEBGL_XYZ_TRIANGLES_RENDERED'||
   rendered.triangles<2000)fail('REAL_GPU_TRIANGLE_FRAME_MISSING');
  drawn++;
  return {...pose,renderedOriginalTriangles:rendered.triangles,
   actualReal3DGPUFrame:true};
 }
 applyFrame(0);
 return {schema:AIG_REAL3D_V91_REPLAY_SCHEMA,
  scene,sphereMesh:sphere,frameCount:trajectory.frames.length,
  fps:trajectory.fps,durationSec:trajectory.durationSec,
  frameAt,applyFrame,renderFrame,
  stats:()=>({drawn3DFrames:drawn,lastFrame:previousFrame,
   originalIndexedSphereTriangles:sphere.triangleCount,
   geometryCoordinatesMutableFromPhysics:false,
   physical3DTransformChangesFromPhysics:true,
   rendererBasedOnStatic2DPhoto:false,
   calibratedSportsMovieCertified:false,releasePASS:false})};
}
export async function recordAIGReal3DSportFilmWebM({
 replay,renderer,canvas,beforeRenderFrame=null,requestFrame=typeof requestAnimationFrame==='function'?
  requestAnimationFrame:null
}={}){
 if(replay?.schema!==AIG_REAL3D_V91_REPLAY_SCHEMA||
  typeof renderer?.render!=='function'||
  (beforeRenderFrame!==null&&typeof beforeRenderFrame!=='function')||!canvas||
  typeof canvas.captureStream!=='function'||
  typeof MediaRecorder!=='function'||typeof MediaRecorder.isTypeSupported!=='function'||
  typeof requestFrame!=='function')
  fail('WEBM_VIDEO_RUNTIME_UNAVAILABLE');
 const mime=['video/webm;codecs=vp8','video/webm'].find(x=>
  MediaRecorder.isTypeSupported(x));
 if(!mime)fail('WEBM_ENCODER_MISSING');
 const stream=canvas.captureStream(0),video=stream.getVideoTracks()[0];
 if(!video||typeof video.requestFrame!=='function'){
  stream.getTracks().forEach(x=>x.stop());
  fail('VIDEO_CAPTURE_FRAME_API_UNAVAILABLE');
 }
 const rec=new MediaRecorder(stream,{mimeType:mime,
  videoBitsPerSecond:3500000});
 const blobs=[];let started=false,stopped=false,error=null;
 const ended=new Promise((resolve,reject)=>{
  rec.ondataavailable=e=>{if(e.data?.size)blobs.push(e.data);};
  rec.onerror=e=>{error=e.error??Error('ENCODING_FAILED');};
  rec.onstop=()=>error?reject(error):resolve();
 });
 let completed=0,firstStamp=null,lastRendered=-1;
 try{
  rec.start();started=true;
  const maxFrames=replay.frameCount,targetRate=replay.fps;
  while(lastRendered<maxFrames-1){
   const timestamp=await new Promise(resolve=>requestFrame(resolve));
   if(!finite(timestamp))fail('MOVIE_CLOCK_INVALID');
   if(firstStamp===null)firstStamp=timestamp;
   const elapsed=Math.max(0,(timestamp-firstStamp)/1000);
   // Skip superseded render frames rather than pretending 60 FPS was achieved.
   const frame=Math.min(maxFrames-1,Math.floor(elapsed*targetRate+1e-8));
   if(frame<=lastRendered)continue;
   if(beforeRenderFrame)beforeRenderFrame(replay.frameAt(frame));
   replay.renderFrame(renderer,frame);
   video.requestFrame();
   completed++;lastRendered=frame;
   if(elapsed>replay.durationSec+3)fail('REALTIME_ENCODING_OVERRUN');
  }
  rec.stop();stopped=true;
  await ended;
  const blob=new Blob(blobs,{type:mime});
  if(blob.size<256||completed<2)fail('ENCODED_MOVIE_EMPTY_OR_STATIC');
  return {schema:'AIG_REAL3D_V91_REAL_SOURCE_SPORT_WEBM_V1',
   blob,mimeType:mime,width:canvas.width,height:canvas.height,
   framesActuallySubmittedToEncoder:completed,
   requestedPlaybackFps:targetRate,
   requestedDurationSec:replay.durationSec,
   bytes:blob.size,
   real3DMeshWasRenderedForEverySubmittedFrame:true,
   actualDecodedVideoFPSIndependentlyVerified:false,
   actualVideoFilePlaybackIndependentlyVerified:false,
   certifiedSportsBallFlight:false,
   realActorBodyAnimationCaptured:false,
   originalSourceModelProvenanceStillRequired:true,
   releasePASS:false};
 }finally{
  if(started&&!stopped&&rec.state!=='inactive')rec.stop();
  stream.getTracks().forEach(x=>x.stop());
 }
}
