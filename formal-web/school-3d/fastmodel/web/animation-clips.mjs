/** FastModel 2.6: one explicit source clip for BOTH playback and CPU audit.
 * Existing LINEAR rotation support only; unsupported channels fail visibly.
 * No source mutation, implicit clip blending, retargeting or invented motion.
 */
export function selectAnimationTracks(file,reader,clipIndex=0){
 const clips=file.g.animations||[];
 if(!clips.length){
  if(clipIndex!==0&&clipIndex!==null)throw Error('ANIMATION_CLIP_INDEX');
  return {tracks:[],duration:0,clipIndex:null,name:null};
 }
 if(!Number.isInteger(clipIndex)||clipIndex<0||clipIndex>=clips.length)throw Error('ANIMATION_CLIP_INDEX');
 const clip=clips[clipIndex],seen=new Set(),tracks=[];let duration=0;
 for(const channel of clip.channels||[]){
  if(channel.target?.path!=='rotation')throw Error('UNSUPPORTED_ANIMATION_CHANNEL');
  const node=channel.target.node;
  if(!Number.isInteger(node)||node<0||node>=file.g.nodes.length)throw Error('POSE_TRACK_NODE');
  if(seen.has(node))throw Error('DUPLICATE_NODE_ANIMATION_TRACK');
  seen.add(node);
  const sampler=clip.samplers?.[channel.sampler];
  if(!sampler||sampler.interpolation&&sampler.interpolation!=='LINEAR')throw Error('UNSUPPORTED_ANIMATION_INTERPOLATION');
  const times=reader(file,sampler.input),values=reader(file,sampler.output);
  if(!times||!values||times.length<2||values.length!==times.length*4)throw Error('POSE_TRACK_KEYS');
  for(let k=0;k<times.length;k++){
   if(!Number.isFinite(times[k])||times[k]<0||(k&&times[k]<=times[k-1]))throw Error('POSE_TRACK_TIME');
   let magnitude=0;
   for(let j=0;j<4;j++){
    const q=values[k*4+j];if(!Number.isFinite(q))throw Error('POSE_TRACK_QUAT');
    magnitude+=q*q;
   }
   if(magnitude<1e-12)throw Error('POSE_TRACK_QUAT');
  }
  duration=Math.max(duration,times[times.length-1]);
  tracks.push({node,times,values});
 }
 return {tracks,duration,clipIndex,name:clip.name||`片段 ${clipIndex+1}`};
}
