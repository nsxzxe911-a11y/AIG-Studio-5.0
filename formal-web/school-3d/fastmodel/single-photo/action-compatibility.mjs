/** FastModel 3.1 — safely apply external REAL GLB animation clips to the
 * currently loaded skinned model. NO synthetic motion or automated retargeting.
 * Matching bone names alone are insufficient: actual skeleton bind matrices,
 * parent hierarchy, bone-name uniqueness and all track targets must match.
 */
export const ACTION_BRIDGE_VERSION='AIG_3_1_EXACT_RIG_ACTION_BRIDGE_SOURCE_ONLY';
const MAX_CLIPS=32,MAX_TRACKS=4096;
function collectRig(root){
 if(!root?.isObject3D)throw Error('ACTION_RIG_SCENE_REQUIRED');
 const nodes=new Map(),bones=new Map(),binds=new Map(),seen=new Set();
 root.traverse(n=>{
  if(!n.name||!n.name.trim())return;
  if(seen.has(n.name)){seen.add(n.name+'#DUPLICATED');return;}
  seen.add(n.name);nodes.set(n.name,n);
  if(n.isBone)bones.set(n.name,n);
 });
 if([...seen].some(x=>x.endsWith('#DUPLICATED')))throw Error('ACTION_RIG_DUPLICATE_NODE_NAME');
 root.traverse(mesh=>{
  if(!mesh.isSkinnedMesh)return;
  const skeleton=mesh.skeleton;
  if(!skeleton?.bones?.length||skeleton.bones.length!==skeleton.boneInverses.length)
   throw Error('ACTION_RIG_INVERSE_BIND_MISSING');
  skeleton.bones.forEach((bone,i)=>{
   if(!bone?.name||!bones.has(bone.name))throw Error('ACTION_RIG_BONE_UNNAMED');
   const arr=Array.from(skeleton.boneInverses[i].elements);
   if(arr.length!==16||arr.some(v=>!Number.isFinite(v)))throw Error('ACTION_RIG_BIND_NONFINITE');
   const prior=binds.get(bone.name);
   if(prior&&prior.some((v,j)=>Math.abs(v-arr[j])>1e-5))
    throw Error('ACTION_RIG_MULTI_MESH_BIND_MISMATCH');
   binds.set(bone.name,arr);
  });
 });
 if(bones.size<2||binds.size!==bones.size)throw Error('ACTION_RIG_SKINNED_BONES_REQUIRED');
 return {nodes,bones,binds};
}
function boneParent(bone){let p=bone.parent;while(p&&!p.isBone)p=p.parent;return p?.name||null;}
function inspectTrack(track,source,target){
 if(typeof track?.name!=='string'||!track.times||!track.values||track.times.length===0)
  throw Error('ACTION_TRACK_INVALID');
 // Only direct named skeleton-bone tracks can be transferred safely.
 // Armature.bones[...], UUID paths, generic root motion or morph targets require
 // a separate verified retargeting procedure and are blocked here.
 const dot=track.name.lastIndexOf('.');
 if(dot<=0)throw Error('ACTION_TRACK_TARGET_UNSUPPORTED');
 const name=track.name.slice(0,dot),property=track.name.slice(dot+1);
 if(!['position','quaternion','scale'].includes(property)||
    /[\[\]\/]/.test(name))throw Error('ACTION_TRACK_TARGET_UNSUPPORTED');
 if(!source.bones.has(name)||!target.bones.has(name))
  throw Error('ACTION_TRACK_BONE_NOT_BOUND');
 if(!Number.isFinite(track.times.at(-1))||track.times[0]<0||track.times.at(-1)>600||
    [...track.times].some((t,i,a)=>!Number.isFinite(t)||(i>0&&t<a[i-1])))
  throw Error('ACTION_TRACK_TIME_INVALID');
 if(!track.values?.length||[...track.values].some(v=>!Number.isFinite(v)))
  throw Error('ACTION_TRACK_VALUES_INVALID');
 const size=property==='quaternion'?4:3;
 if(track.values.length!==track.times.length*size)
  throw Error('ACTION_TRACK_CHANNEL_SIZE_INVALID');
 return {bone:name,property,keyframes:track.times.length};
}
export function inspectExternalAction(targetScene,sourceScene,clips,{bindTolerance=1e-4}={}){
 if(!Number.isFinite(bindTolerance)||bindTolerance<0||bindTolerance>.01)
  throw Error('ACTION_BIND_TOLERANCE_INVALID');
 const target=collectRig(targetScene),source=collectRig(sourceScene);
 if(source.bones.size!==target.bones.size)throw Error('ACTION_RIG_BONE_COUNT_MISMATCH');
 const rigBones=[...target.bones.keys()].sort();
 for(const name of rigBones){
  if(!source.bones.has(name))throw Error('ACTION_RIG_BONE_NAME_MISMATCH');
  if(boneParent(target.bones.get(name))!==boneParent(source.bones.get(name)))
   throw Error('ACTION_RIG_HIERARCHY_MISMATCH');
  const targetBind=target.binds.get(name),sourceBind=source.binds.get(name);
  if(!targetBind||!sourceBind||
     targetBind.some((v,i)=>Math.abs(v-sourceBind[i])>bindTolerance))
   throw Error('ACTION_RIG_BIND_POSE_MISMATCH');
 }
 if(!Array.isArray(clips)||clips.length===0)throw Error('ACTION_SOURCE_NO_CLIPS');
 if(clips.length>MAX_CLIPS)throw Error('ACTION_TOO_MANY_CLIPS');
 const reports=[];
 let allTracks=0;
 for(const clip of clips){
  if(!clip||typeof clip.clone!=='function'||!Array.isArray(clip.tracks)||!Number.isFinite(clip.duration)||clip.duration<=0||clip.duration>600)
   throw Error('ACTION_CLIP_INVALID');
  if(!clip.tracks?.length)throw Error('ACTION_EMPTY_CLIP');
  allTracks+=clip.tracks.length;
  if(allTracks>MAX_TRACKS)throw Error('ACTION_TRACK_BUDGET_EXCEEDED');
  const tracks=clip.tracks.map(t=>inspectTrack(t,source,target));
  reports.push({name:clip.name||'untitled',duration:clip.duration,trackCount:tracks.length,
   animatedBoneCount:new Set(tracks.map(t=>t.bone)).size});
 }
 return {
  status:'MATCHED_EXACT_BIND_RIG_SOURCE_REVIEW_ONLY',version:ACTION_BRIDGE_VERSION,
  boneCount:rigBones.length,clipCount:clips.length,totalTracks:allTracks,clips:reports,
  exactRigPoseMatch:true,actionClipImported:false,
  userHeroineIdentityApproved:false,realCombatChoreographyVerified:false,
  animatedCollisionProven:false,originalCharacterMeshModified:false,
  notes:'Checked exact bone-name hierarchy and bind inverse matrices within tolerance. Matching rig enables track binding, not proof of correct foot contact, believable combat, neck weld or safe hair.'
 };
}
export function copyCompatibleClips(clips,{prefix='外部動作'}={}){
 if(!Array.isArray(clips)||clips.length===0||clips.length>MAX_CLIPS)
  throw Error('ACTION_CLIPS_INVALID');
 return clips.map((clip,index)=>{
  const fresh=clip.clone();
  fresh.name=prefix+' '+(index+1)+'｜'+(clip.name||'未命名動作');
  return fresh;
 });
}
