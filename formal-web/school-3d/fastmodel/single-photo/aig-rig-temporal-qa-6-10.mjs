/** AIG rig temporal QA: real GLB-deformed vertex samples, not a fake
 * full-body model, camera-move or UI transition. Never certifies an actress,
 * collision-free hair, a supported device FPS or physical motion.
 */
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {AnimationMixer,Vector3} from 'three';
export const AIG_RIG_TEMPORAL_SCHEMA='AIG_REAL_GLB_TEMPORAL_QA_6_10';

const regions=Object.freeze({
 pelvis:/pelvis|hips?/i,
 leftArm:/left.*(upperarm|arm|shoulder)|^(l|left)[_.-]?(upperarm|arm)/i,
 rightArm:/right.*(upperarm|arm|shoulder)|^(r|right)[_.-]?(upperarm|arm)/i,
 leftLeg:/left.*(thigh|upperleg|leg|knee)|^(l|left)[_.-]?(leg|thigh)/i,
 rightLeg:/right.*(thigh|upperleg|leg|knee)|^(r|right)[_.-]?(leg|thigh)/i,
 head:/head/i
});
const finite=v=>Number.isFinite(v);
const length3=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);

export async function auditAigRealGlbTemporalMotion(glbBytes,{
 sampleHz=30,maxSeconds=6,maxVerticesPerMesh=64
}={}){
 if(!(glbBytes instanceof Uint8Array)||glbBytes.byteLength<20||
  glbBytes.byteLength>30000000)throw Error('AIG_TEMPORAL_REAL_GLB_REQUIRED');
 if(!Number.isInteger(sampleHz)||sampleHz<12||sampleHz>60||
  !Number.isFinite(maxSeconds)||maxSeconds<=0||maxSeconds>10||
  !Number.isInteger(maxVerticesPerMesh)||maxVerticesPerMesh<8||maxVerticesPerMesh>128)
  throw Error('AIG_TEMPORAL_BOUNDED_SAMPLING_REQUIRED');
 const buffer=glbBytes.buffer.slice(glbBytes.byteOffset,
  glbBytes.byteOffset+glbBytes.byteLength);
 const gltf=await new GLTFLoader().parseAsync(buffer,'');
 const meshes=[];
 gltf.scene.traverse(obj=>{
  if(obj.isSkinnedMesh&&obj.geometry?.getAttribute('position'))meshes.push(obj);
 });
 if(meshes.length===0||gltf.animations.length===0)
  throw Error('AIG_TEMPORAL_ACTUAL_SKINNED_ANIMATED_GLB_REQUIRED');
 const bones=Array.from(new Set(meshes.flatMap(m=>
  m.skeleton.bones.map(b=>b.name||''))));
 const boneCoverage=Object.fromEntries(Object.entries(regions).map(
  ([k,regex])=>[k,bones.some(name=>regex.test(name))]
 ));
 const fullBodyBoneCoverage=Object.values(boneCoverage).every(Boolean);
 const frames=[];
 const mixer=new AnimationMixer(gltf.scene),temp=new Vector3();
 const samples=meshes.map(mesh=>{
  const positions=mesh.geometry.getAttribute('position');
  const count=positions.count;
  if(!Number.isInteger(count)||count<=0||count>1000000)
   throw Error('AIG_TEMPORAL_MESH_BOUNDS');
  const n=Math.min(count,maxVerticesPerMesh);
  const indices=Array.from({length:n},(_,i)=>
   Math.min(count-1,Math.floor((i+.5)*count/n)));
  return {mesh,indices,originalVertexCount:count};
 });
 for(const clip of gltf.animations){
  if(!finite(clip.duration)||clip.duration<=0)
   throw Error('AIG_TEMPORAL_CLIP_DURATION_INVALID');
  mixer.stopAllAction();
  const action=mixer.clipAction(clip);
  action.reset();action.play();
  const duration=Math.min(clip.duration,maxSeconds);
  const frameCount=Math.max(3,Math.ceil(duration*sampleHz)+1);
  let first=null,prior=null,totalMove=0,maxStep=0,observedFrames=0;
  for(let index=0;index<frameCount;index++){
   const time=duration*index/(frameCount-1);
   mixer.setTime(time);
   gltf.scene.updateMatrixWorld(true);
   meshes.forEach(m=>m.skeleton.update());
   const sample=[];
   for(const {mesh,indices} of samples){
    for(const i of indices){
     mesh.getVertexPosition(i,temp);
     const p=[temp.x,temp.y,temp.z];
     if(!p.every(finite)||p.some(v=>Math.abs(v)>1000000))
      throw Error('AIG_TEMPORAL_NAN_OR_EXPLODING_SKINNED_VERTEX');
     sample.push(p);
    }
   }
   if(prior!==null){
    const step=Math.max(...sample.map((p,i)=>length3(p,prior[i])));
    maxStep=Math.max(maxStep,step);
    if(step>1e-6)observedFrames++;
   }else first=sample;
   totalMove=Math.max(totalMove,...sample.map((p,i)=>length3(p,first[i])));
   prior=sample;
  }
  action.stop();
  if(!(totalMove>1e-5))throw Error('AIG_TEMPORAL_FAKE_STATIC_CLIP');
  // This threshold flags *obvious* one-frame explosions, not physics QA.
  const clipResult={clip:clip.name,frameCount,durationSeconds:duration,
   sampledVertices:samples.reduce((n,s)=>n+s.indices.length,0),
   totalDeformationMmOrModelUnits:totalMove,maxPerFrameChange:maxStep,
   changedFrameIntervals:observedFrames,finiteSkinPositions:true,
   fullBodyValidated:false,collisionFreeVerified:false};
  frames.push(Object.freeze(clipResult));
 }
 mixer.stopAllAction();
 return Object.freeze({schema:AIG_RIG_TEMPORAL_SCHEMA,
  actualGlbParsed:true,actualSkinnedMeshes:meshes.length,
  realAnimationClipCount:frames.length,
  sampleHz,rigBoneNames:Object.freeze(bones),
  boneCoverage:Object.freeze(boneCoverage),
  fullBodyBoneCoverage,fullBodyCharacterApproved:false,
  fullBodyMotionVerified:false,
  visualIdentityMatched:false,hairCollisionVerified:false,
  sourceFpsDeviceVerified:false,sceneAnimationVerified:true,
  sampledClips:Object.freeze(frames)});
}
