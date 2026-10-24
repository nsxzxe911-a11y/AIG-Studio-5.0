/**
 * V90 native indexed-triangle cinematic pose timeline.
 * REAL per-frame source-authored XYZ+normal motion, interpolated at capture
 * time. Never advertise moving a photograph or mesh rigidly as full-body
 * animation. GPU bufferSubData works on a disposable WORKING SCENE only.
 * WebM capture depends on actual browser MediaRecorder support and measured
 * frames; no promised 1080/60, soundtrack, codec/MP4, or anatomical realism.
 */
export const AIG_REAL3D_V90_FILM_SCHEMA='AIG_REAL3D_V90_SOURCE_INDEXED_DYNAMIC_FILM_V1';
const fail=x=>{throw Error('REAL3D_V90_FILM_'+x);};
const ok=a=>Array.isArray(a)&&a.every(Number.isFinite);
export function createAIGReal3DDynamicFilmTimeline({
 sourceScene,keyframes,fps=24,maxDurationMs=12000
}={}){
 if(sourceScene?.schema!=='AIG_REAL3D_SCENE_V1'||
  !Array.isArray(sourceScene.nodes)||!sourceScene.nodes.length||
  !Array.isArray(keyframes)||keyframes.length<2||keyframes.length>240||
  ![24,30,60].includes(fps)||!Number.isInteger(maxDurationMs)||
  maxDurationMs<100||maxDurationMs>30000)fail('SOURCE_OR_TIMELINE_INVALID');
 const nodes=sourceScene.nodes;
 if(!nodes.every(n=>n.mesh?.actualXYZTriangles&&
  Array.isArray(n.mesh.positions)&&Array.isArray(n.mesh.normals)&&
  Array.isArray(n.mesh.indices)&&n.mesh.positions.length===n.mesh.normals.length))
  fail('ORIGINAL_INDEXED_MESH_REQUIRED');
 let previous=-1,changes=0;
 const stamps=keyframes.map((f,i)=>{
  if(!Number.isFinite(f?.timeMs)||f.timeMs<0||
   f.timeMs<=previous||f.timeMs>maxDurationMs||
   !f.poses||Object.keys(f.poses).length!==nodes.length)
   fail('TIMELINE_MONOTONIC_OR_MISSING_POSE');
  previous=f.timeMs;
  for(const n of nodes){
   const pose=f.poses[n.id],size=n.mesh.positions.length;
   if(!pose||!ok(pose.positions)||!ok(pose.normals)||
    pose.positions.length!==size||pose.normals.length!==size||
    pose.positions.some(x=>Math.abs(x)>1e7)||
    pose.normals.some(x=>Math.abs(x)>1.0001))
    fail('SOURCE_POSE_XYZ_NORMAL_INVALID');
   for(let k=0;k<size;k+=3){
    const normal=Math.hypot(pose.normals[k],pose.normals[k+1],pose.normals[k+2]);
    if(normal<.9||normal>1.1)fail('NONUNIT_POSE_NORMAL');
   }
   if(i>0){
    const prev=keyframes[i-1].poses[n.id].positions;
    for(let k=0;k<size;k++)if(pose.positions[k]!==prev[k]){changes++;break;}
   }
  }
  return f.timeMs;
 });
 if(stamps[0]!==0||changes===0)fail('ZERO_MOTION_OR_TIMELINE_START');
 // CPU source is immutable. Renderer updates ONLY clones.
 const scene={...sourceScene,revision:sourceScene.revision+1,
  nodes:nodes.map(n=>({...n,mesh:{...n.mesh,
   positions:[...n.mesh.positions],
   normals:[...n.mesh.normals],
   indices:[...n.mesh.indices],
   provenance:n.mesh.provenance}}))};
 const sourceIndices=nodes.map(n=>n.mesh.indices);
 function sample(timeMs){
  if(!Number.isFinite(timeMs)||timeMs<0)fail('INVALID_MOVIE_TIME');
  const t=Math.min(timeMs,previous);
  let after=1;
  while(after<keyframes.length-1&&keyframes[after].timeMs<t)after++;
  const a=keyframes[after-1],b=keyframes[after],
   alpha=Math.max(0,Math.min(1,(t-a.timeMs)/(b.timeMs-a.timeMs)));
  return Object.fromEntries(nodes.map(n=>{
   const p=a.poses[n.id],q=b.poses[n.id],
    positions=p.positions.map((x,k)=>x+(q.positions[k]-x)*alpha),
    normals=p.normals.map((x,k)=>x+(q.normals[k]-x)*alpha);
   for(let k=0;k<normals.length;k+=3){
    const size=Math.hypot(normals[k],normals[k+1],normals[k+2]);
    if(size<1e-8)fail('INTERPOLATED_NORMAL_DEGENERATE');
    for(let j=0;j<3;j++)normals[k+j]/=size;
   }
   return [n.id,{positions,normals}];
  }));
 }
 let initialized=false,drawn=0,subdata=0,poseCount=0;
 function draw(renderer,timeMs){
  if(typeof renderer?.render!=='function'||
   typeof renderer?.updateMeshVertices!=='function')
   fail('REAL_GPU_RENDERER_REQUIRED');
  if(!initialized){
   const r=renderer.render(scene);
   if(r?.status!=='WEBGL_XYZ_TRIANGLES_RENDERED')
    fail('SOURCE_WORKING_GPU_INITIAL_RENDER_FAILED');
   initialized=true;
  }
  const poses=sample(timeMs);
  for(const node of scene.nodes){
   const mesh=node.mesh,p=poses[node.id],changed=[];
   for(let k=0;k<mesh.vertexCount;k++){
    const j=k*3;
    if(mesh.positions[j]!==p.positions[j]||
     mesh.positions[j+1]!==p.positions[j+1]||
     mesh.positions[j+2]!==p.positions[j+2]||
     mesh.normals[j]!==p.normals[j]||
     mesh.normals[j+1]!==p.normals[j+1]||
     mesh.normals[j+2]!==p.normals[j+2])changed.push(k);
   }
   if(changed.length){
    const r=renderer.updateMeshVertices(mesh,{
     positions:p.positions,normals:p.normals,changedVertexIndices:changed
    });
    if(!r.originalIndexBufferReused||r.fullGPUBufferReallocation)
     fail('GPU_BUFFER_SUBDATA_NOT_REUSED');
    subdata+=r.positionSubDataCalls+r.normalSubDataCalls;
    poseCount++;
   }
  }
  const image=renderer.render(scene);
  if(image?.status!=='WEBGL_XYZ_TRIANGLES_RENDERED')
   fail('ACTUAL_GPU_MOVIE_FRAME_MISSING');
  drawn++;
  return {timeMs,drawCount:drawn,positionNormalGPUBufferSubDataCalls:subdata,
   originalSourceNotModified:nodes.every((n,i)=>
    n.mesh.indices===sourceIndices[i])};
 }
 return {schema:AIG_REAL3D_V90_FILM_SCHEMA,scene,sourceScene,fps,
  keyframeCount:keyframes.length,durationMs:previous,
  sample,draw,snapshot:()=>({
   real3DFramesRendered:drawn,poseNodeUpdates:poseCount,
   gpuSubDataCalls:subdata,indexBufferReuploads:0,
   originalSourceUntouched:true,
   animatedMovieEncoded:false,actualOutputFPSMeasured:false,
   naturalMotionCertified:false,releasePASS:false
  })};
}
export async function recordAIGReal3DDynamicWebM({
 canvas,renderer,timeline,requestFrame=typeof requestAnimationFrame==='function'?
  requestAnimationFrame:null,now=()=>performance.now()
}={}){
 if(timeline?.schema!==AIG_REAL3D_V90_FILM_SCHEMA||
  typeof canvas?.captureStream!=='function'||!renderer||
  typeof MediaRecorder!=='function'||typeof requestFrame!=='function'||
  typeof MediaRecorder.isTypeSupported!=='function')
  fail('REAL_VIDEO_CAPTURE_API_UNAVAILABLE');
 const mime=['video/webm;codecs=vp8','video/webm'].find(m=>
  MediaRecorder.isTypeSupported(m));
 if(!mime)fail('WEBM_ENCODER_UNAVAILABLE');
 const stream=canvas.captureStream(0),track=stream.getVideoTracks()[0];
 if(!track||typeof track.requestFrame!=='function'){
  stream.getTracks().forEach(t=>t.stop());
  fail('MANUAL_FRAME_CAPTURE_REQUIRED');
 }
 const rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:3500000});
 const chunks=[];let error=null,started=null,frames=0;
 const finished=new Promise((resolve,reject)=>{
  rec.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data);};
  rec.onerror=e=>{error=e?.error??Error('ENCODER_ERROR');};
  rec.onstop=()=>error?reject(error):resolve();
 });
 try{
  rec.start();
  const frameDuration=1000/timeline.fps;
  while(true){
   const stamp=await new Promise(resolve=>requestFrame(resolve));
   if(!Number.isFinite(stamp))fail('RAF_CLOCK_INVALID');
   if(started===null)started=stamp;
   const elapsed=Math.max(0,stamp-started);
   if(frames===0||elapsed>=frames*frameDuration-2){
    timeline.draw(renderer,Math.min(elapsed,timeline.durationMs));
    track.requestFrame();frames++;
   }
   if(elapsed>=timeline.durationMs)break;
   if(elapsed>timeline.durationMs+4000)fail('MOVIE_DURATION_OVERRUN');
  }
  rec.stop();await finished;
  const blob=new Blob(chunks,{type:mime});
  if(blob.size<256||frames<2||timeline.snapshot().poseNodeUpdates<1)
   fail('ENCODED_MOVIE_EMPTY_OR_NO_GEOMETRY_MOTION');
  return {schema:'AIG_REAL3D_V90_NATIVE_WEBM_DYNAMIC_GEOMETRY_V1',
   blob,mimeType:mime,width:canvas.width,height:canvas.height,
   actualRenderedFrames:frames,actualCaptureDurationMs:timeline.durationMs,
   approxDrawnFps:Math.round(frames*1000/timeline.durationMs*100)/100,
   bytes:blob.size,realVertexBufferSubDataCalls:timeline.snapshot().gpuSubDataCalls,
   encodedFilePlayableOnOtherDevicesCertified:false,
   actualEncodedFrameCountIndependentlyDecoded:false,
   filmQuality1080p60Certified:false,musicVoiceIncluded:false,
   realFullBodyAnatomyVerified:false,releasePASS:false};
 }finally{
  if(rec.state!=='inactive')rec.stop();
  stream.getTracks().forEach(t=>t.stop());
 }
}
