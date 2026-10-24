/**
 * AIG Real3D V92 | source-authored articulated skeleton / skin wrap / ball contact.
 * FULL_WRAP and HALF_WRAP share the SAME FULL 3D skeleton and skinning.
 * HALF only permits SOURCE CHUNK draw culling at the camera; never drops
 * joints, original faces, skin weights, or actor contact positions.
 * This is source-bound LINEAR BLEND SKINNING, not muscle FEM, automatic rig
 * inference, independently validated anatomy, or film-grade tissue physics.
 */
import {simulateAIGReal3DSportBall,AIG_REAL3D_V91_PRESETS}
 from './aig-real3d-sports-ballistics.mjs';
export const AIG_REAL3D_V92_RIG_SCHEMA='AIG_REAL3D_V92_SOURCE_BOUND_ARTICULATED_WRAP_V1';
export const AIG_REAL3D_V92_WRAP_MODES=Object.freeze(['FULL_WRAP','HALF_WRAP']);
const err=s=>{throw Error('REAL3D_V92_RIG_'+s);};
const finite=Number.isFinite,sha=s=>typeof s==='string'&&/^[a-f0-9]{64}$/i.test(s);
const vec=v=>Array.isArray(v)&&v.length===3&&v.every(Number.isFinite);
const id=v=>typeof v==='string'&&/^[A-Za-z][A-Za-z0-9_-]{0,47}$/.test(v);
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const add=(a,b)=>a.map((v,i)=>v+b[i]);
const mul=(a,s)=>a.map(v=>v*s);
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const len=a=>Math.hypot(...a);
const normalize=a=>{const n=len(a);if(n<1e-9)err('ZERO_LENGTH_AXIS');return a.map(v=>v/n);};
const identity=()=>({basis:[[1,0,0],[0,1,0],[0,0,1]],shift:[0,0,0]});
const applyDir=(t,p)=>t.basis.map(row=>dot(row,p));
const apply=(t,p)=>add(applyDir(t,p),t.shift);
function compose(a,b){
 const basis=a.basis.map(row=>[0,1,2].map(i=>
  row[0]*b.basis[0][i]+row[1]*b.basis[1][i]+row[2]*b.basis[2][i]));
 return {basis,shift:add(applyDir(a,b.shift),a.shift)};
}
function rotationAround(pivot,axis,angleDeg){
 const [x,y,z]=normalize(axis),a=angleDeg*Math.PI/180,c=Math.cos(a),s=Math.sin(a),t=1-c;
 const basis=[
  [t*x*x+c,t*x*y-s*z,t*x*z+s*y],
  [t*y*x+s*z,t*y*y+c,t*y*z-s*x],
  [t*z*x-s*y,t*z*y+s*x,t*z*z+c]
 ];
 const R={basis,shift:[0,0,0]};
 return {basis,shift:sub(pivot,applyDir(R,pivot))};
}
function validateRig({sourceScene,manifest,sourceSha256,keyframes}){
 if(sourceScene?.schema!=='AIG_REAL3D_SCENE_V1'||!sha(sourceSha256)||
  manifest?.schema!==AIG_REAL3D_V92_RIG_SCHEMA||
  manifest.sourceSha256!==sourceSha256||
  !Array.isArray(sourceScene.nodes)||sourceScene.nodes.length<1||
  !Array.isArray(manifest.nodeRigs)||manifest.nodeRigs.length!==sourceScene.nodes.length||
  !Array.isArray(keyframes)||keyframes.length<2||keyframes.length>180)
  err('SOURCE_RIG_OR_FRAMES_MISMATCH');
 const nodeMap=new Map(sourceScene.nodes.map(n=>[n.id,n]));
 if(nodeMap.size!==sourceScene.nodes.length||nodeMap.size>24)err('ORIGINAL_NODES_INVALID');
 const joints=new Map(),anchorMap=new Map(),nodeSpecs=new Map();
 for(const spec of manifest.nodeRigs){
  const node=nodeMap.get(spec?.nodeId);
  if(!node||nodeSpecs.has(spec.nodeId)||!node.mesh?.actualXYZTriangles||
   !Array.isArray(node.mesh.positions)||!Array.isArray(node.mesh.indices)||
   !Array.isArray(node.mesh.normals)||!Number.isInteger(node.mesh.vertexCount)||
   node.mesh.positions.length!==3*node.mesh.vertexCount||
   node.mesh.normals.length!==node.mesh.positions.length||
   !Array.isArray(spec.joints)||!spec.joints.length||spec.joints.length>48||
   !Array.isArray(spec.weights)||spec.weights.length!==node.mesh.vertexCount)
   err('NODE_SOURCE_OR_WEIGHTS_INVALID');
  for(const j of spec.joints){
   if(!id(j?.id)||joints.has(j.id)||j.parentId!==null&&
    (!id(j.parentId)||!joints.has(j.parentId))||
    !vec(j.bindPivot)||!vec(j.axis)||Math.abs(len(j.axis)-1)>.001||
    !finite(j.minDeg)||!finite(j.maxDeg)||j.minDeg>0||j.maxDeg<0||
    j.minDeg>j.maxDeg||j.minDeg< -180||j.maxDeg>180)
    err('JOINT_PARENT_AXIS_OR_LIMIT_INVALID');
   joints.set(j.id,{...j,axis:normalize(j.axis)});
  }
  const weights=spec.weights.map((entries,i)=>{
   if(!Array.isArray(entries)||entries.length<1||entries.length>4)err('VERTEX_INFLUENCES_INVALID');
   const ids=new Set();
   let total=0;
   for(const x of entries){
    if(!id(x?.jointId)||!joints.has(x.jointId)||ids.has(x.jointId)||
     !finite(x.weight)||x.weight<=0||x.weight>1)
     err('WEIGHT_OR_JOINT_INVALID');
    ids.add(x.jointId);total+=x.weight;
   }
   if(Math.abs(total-1)>1e-5)err('VERTEX_WEIGHTS_MUST_SUM_ONE');
   return entries.map(x=>({...x}));
  });
  nodeSpecs.set(spec.nodeId,{node,weights});
 }
 if(nodeSpecs.size!==nodeMap.size)err('MISSING_SOURCE_NODE_RIG');
 if(!Array.isArray(manifest.anchors)||!manifest.anchors.length||manifest.anchors.length>32)
  err('CONTACT_ANCHORS_REQUIRED');
 for(const a of manifest.anchors){
  if(!id(a?.id)||anchorMap.has(a.id)||!joints.has(a.jointId)||
   !vec(a.bindPoint)||!id(a.actorId)||!['HAND','FOOT','BAT','RACKET','PADDLE'].includes(a.apparatus))
   err('CONTACT_ANCHOR_SOURCE_INVALID');
  anchorMap.set(a.id,a);
 }
 let prior=-1;const keyTimes=[];
 for(const k of keyframes){
  if(!finite(k?.timeSec)||k.timeSec<=prior||k.timeSec<0||k.timeSec>30||
   typeof k.anglesDeg!=='object'||k.anglesDeg===null||
   Object.keys(k.anglesDeg).length!==joints.size)
   err('KEYFRAME_TIME_OR_MISSING_JOINT');
  for(const [name,joint] of joints){
   const v=k.anglesDeg[name];
   if(!finite(v)||v<joint.minDeg||v>joint.maxDeg)
    err('JOINT_ANGLE_LIMIT_VIOLATION');
  }
  prior=k.timeSec;keyTimes.push(k.timeSec);
 }
 if(keyTimes[0]!==0)err('KEYFRAMES_START_AT_ZERO');
 return {joints,anchorMap,nodeSpecs,keyTimes};
}
export function createAIGReal3DRigWrap({sourceScene,manifest,sourceSha256,
 keyframes,wrapMode='FULL_WRAP'}={}){
 if(!AIG_REAL3D_V92_WRAP_MODES.includes(wrapMode))err('WRAP_MODE_INVALID');
 const spec=validateRig({sourceScene,manifest,sourceSha256,keyframes});
 // Shared working copies retain 100% of original topology, NEVER source edits.
 const nodes=sourceScene.nodes.map(n=>({...n,mesh:{...n.mesh,
  positions:[...n.mesh.positions],normals:[...n.mesh.normals],
  indices:[...n.mesh.indices]}}));
 const workingScene={...sourceScene,nodes,
  overlays:[...sourceScene.overlays],revision:sourceScene.revision+1};
 const originals=new Map(sourceScene.nodes.map(n=>[n.id,n.mesh]));
 const sourceContactManifest=Object.fromEntries([...spec.anchorMap]);
 function sample(timeSec){
  if(!finite(timeSec)||timeSec<0||timeSec>keyframes.at(-1).timeSec)
   err('RIG_SAMPLE_TIME_INVALID');
  let i=1;while(i<keyframes.length-1&&keyframes[i].timeSec<timeSec)i++;
  const a=keyframes[i-1],b=keyframes[i],
   alpha=Math.max(0,Math.min(1,(timeSec-a.timeSec)/(b.timeSec-a.timeSec)));
  const angles=Object.fromEntries([...spec.joints].map(([name])=>[
   name,a.anglesDeg[name]*(1-alpha)+b.anglesDeg[name]*alpha]));
  // Local source-pivot rotations chained parent -> child. Matrix is rigid.
  const worlds=new Map();
  for(const [name,j] of spec.joints){
   const local=rotationAround(j.bindPivot,j.axis,angles[name]);
   worlds.set(name,j.parentId?
    compose(worlds.get(j.parentId),local):local);
  }
  const anchorPoints=Object.fromEntries([...spec.anchorMap].map(([name,a])=>
   [name,apply(worlds.get(a.jointId),a.bindPoint)]));
  return {timeSec,anglesDeg:angles,worlds,anchorPoints};
 }
 function pose(timeSec){
  const frame=sample(timeSec),meshes={};
  for(const [nodeId,entry] of spec.nodeSpecs){
   const original=originals.get(nodeId),positions=[],normals=[];
   for(let i=0;i<original.vertexCount;i++){
    const p=original.positions.slice(3*i,3*i+3),
     n=original.normals.slice(3*i,3*i+3);
    let q=[0,0,0],vn=[0,0,0];
    for(const w of entry.weights[i]){
     const transform=frame.worlds.get(w.jointId);
     q=add(q,mul(apply(transform,p),w.weight));
     vn=add(vn,mul(applyDir(transform,n),w.weight));
    }
    if(![...q,...vn].every(finite)||len(vn)<1e-9)
     err('SKIN_POSE_DEGENERATE');
    positions.push(...q);normals.push(...normalize(vn));
   }
   meshes[nodeId]={positions,normals,indices:original.indices};
  }
  return {...frame,meshes,
   originalFaceCountsPreserved:true,sourceGeometryUntouched:true};
 }
 let currentPose=null,rendered=0,subdata=0;
 function updateGPU(renderer,timeSec,{showNodes=null,deferCompositeRender=false}={}){
  if(typeof renderer?.render!=='function'||typeof renderer?.updateMeshVertices!=='function')
   err('REAL_GPU_SOURCE_RENDERER_REQUIRED');
  const state=pose(timeSec);
  // Keep ALL skeleton joints sampled, even if HALF_WRAP culls a whole chunk.
  for(const node of workingScene.nodes){
   const target=state.meshes[node.id],changes=[];
   for(let i=0;i<node.mesh.vertexCount;i++){
    const k=3*i;
    if(node.mesh.positions[k]!==target.positions[k]||
     node.mesh.positions[k+1]!==target.positions[k+1]||
     node.mesh.positions[k+2]!==target.positions[k+2]||
     node.mesh.normals[k]!==target.normals[k]||
     node.mesh.normals[k+1]!==target.normals[k+1]||
     node.mesh.normals[k+2]!==target.normals[k+2])changes.push(i);
   }
   // First render allocates one VBO/EBO per source working mesh.
   if(!currentPose){const warmup=renderer.render(workingScene);
    if(warmup?.status!=='WEBGL_XYZ_TRIANGLES_RENDERED')err('GPU_FIRST_GEOMETRY_INVALID');
    currentPose=true;
   }
   if(changes.length){
    const out=renderer.updateMeshVertices(node.mesh,{
     positions:target.positions,normals:target.normals,changedVertexIndices:changes
    });
    if(!out.originalIndexBufferReused||out.fullGPUBufferReallocation)
     err('SOURCE_GPU_INDEX_REUSE_REQUIRED');
    subdata+=out.positionSubDataCalls+out.normalSubDataCalls;
   }
  }
  if(showNodes!==null){
   if(wrapMode!=='HALF_WRAP'||!Array.isArray(showNodes)||
    showNodes.some(s=>!originals.has(s)))err('HALF_WRAP_SOURCE_NODE_VISIBILITY_INVALID');
   const visible=new Set(showNodes);
   for(const node of workingScene.nodes)node.visible=visible.has(node.id);
  }else for(const node of workingScene.nodes)node.visible=true;
  const r=deferCompositeRender?null:renderer.render(workingScene);
  if(r&&r.status!=='WEBGL_XYZ_TRIANGLES_RENDERED')err('REAL_SOURCE_GPU_FRAME_MISSING');
  rendered++;
  return {timeSec,actualOriginalTriangleCount:[...originals.values()].reduce((n,m)=>n+m.triangleCount,0),
   renderedSourceTriangles:r?.triangles??null,gpuSubdataCalls:subdata,
   sampledJoints:spec.joints.size,sourceTopologyPreserved:true,
   halfModeDoesNotFreezeInvisibleBones:true};
 }
 function anchorAt(anchorId,timeSec){
  if(!spec.anchorMap.has(anchorId))err('UNKNOWN_SOURCE_RIG_ANCHOR');
  return sample(timeSec).anchorPoints[anchorId];
 }
 return {schema:AIG_REAL3D_V92_RIG_SCHEMA,sourceSha256,sourceScene,
  workingScene,wrapMode,sample,pose,anchorAt,updateGPU,sourceContactManifest,
  boneCount:spec.joints.size,anchors:[...spec.anchorMap.keys()],
  lastTimeSec:keyframes.at(-1).timeSec,
  stats:()=>({real3DFramesRendered:rendered,gpuSubDataCalls:subdata,
   originalSourceNeverWritten:true,fullSkeletonAlwaysEvaluated:true,
   automaticHumanOrAnimalRigDetectionVerified:false,
   anatomyNaturalAppearancePASS:false,recordedFilmPASS:false,releasePASS:false})};
}
/** A moving, source-authored rig contact drives the V91 impulse.
 * The pre-contact ball position is calculated by V91 at event time,
 * not guessed or authored as a decorative trajectory.
 */
export function simulateAIGReal3DRigSportContact({
 rig,anchorId,sport,impactTimeSec,initialPosition,initialVelocity=[0,0,0],
 initialAngularVelocity=[0,0,0],durationSec=1.5,surfaces=[],
 gravity=0,airDensity=0,contactWindowSec=.004,
 contactToleranceM=.004
}={}){
 if(rig?.schema!==AIG_REAL3D_V92_RIG_SCHEMA||
  !rig.anchors.includes(anchorId)||!AIG_REAL3D_V91_PRESETS[sport]||
  !finite(impactTimeSec)||impactTimeSec<=contactWindowSec||
  impactTimeSec+contactWindowSec>=rig.lastTimeSec||
  !finite(durationSec)||durationSec<impactTimeSec||
  !vec(initialPosition)||!vec(initialVelocity)||!vec(initialAngularVelocity)||
  !finite(contactToleranceM)||contactToleranceM<.0001||contactToleranceM>.015||
  !finite(contactWindowSec)||contactWindowSec<.001||contactWindowSec>.02)
  err('ACTOR_BALL_SOURCE_CONTACT_INVALID');
 const preset=AIG_REAL3D_V91_PRESETS[sport],anchor=rig.sample(impactTimeSec),
  before=rig.anchorAt(anchorId,impactTimeSec-contactWindowSec),
  after=rig.anchorAt(anchorId,impactTimeSec+contactWindowSec),
  velocity=mul(sub(after,before),1/(2*contactWindowSec));
 const baseline=simulateAIGReal3DSportBall({
  sport,initialPosition,initialVelocity,initialAngularVelocity,
  durationSec:impactTimeSec,fps:120,
  gravity,airDensity,surfaces
 });
 const ball=baseline.frames.at(-1),point=anchor.anchorPoints[anchorId],
  diff=sub(ball.position,point),distance=len(diff),
  mismatch=Math.abs(distance-preset.radiusM);
 if(mismatch>contactToleranceM)
  err('RIG_BALL_SURFACE_CONTACT_DISTANCE_BLOCK');
 const normal=normalize(diff),relativeSpeed=dot(sub(velocity,ball.velocity),normal);
 if(relativeSpeed<=.05)err('RIG_CONTACT_NOT_APPROACHING_BALL');
 // Apparatus comes from the protected rig manifest; never infer from sport.
 const sourceAnchor=rig.sourceContactManifest?.[anchorId];
 if(!sourceAnchor)err('RIG_ANCHOR_PROVENANCE_MISSING');
 const event={type:'IMPACT',timeSec:impactTimeSec,
  actorId:sourceAnchor.actorId,apparatus:sourceAnchor.apparatus,
  contactPoint:[...point],contactNormal:normal,
  surfaceVelocity:velocity};
 const trajectory=simulateAIGReal3DSportBall({
  sport,initialPosition,initialVelocity,initialAngularVelocity,
  durationSec,fps:120,gravity,airDensity,surfaces,actorEvents:[event]
 });
 return {schema:'AIG_REAL3D_V92_RIG_TO_SPORTS_CONTACT_V1',
  sourceSha256:rig.sourceSha256,anchorId,
  contactPoint:point,contactNormal:normal,
  sourceDerivedSurfaceVelocity:velocity,ballCenterAtImpact:ball.position,
  contactDistanceErrorM:mismatch,closingSpeedMps:relativeSpeed,
  event,trajectory,
  actualRigJointMotionUsed:true,physicsImpulseApplied:trajectory.actorContacts.some(x=>x.type==='ACTOR_IMPACT'),
  sourceVideoMotionIndependentlyCertified:false,
  filmProductionPASS:false,releasePASS:false};
}
