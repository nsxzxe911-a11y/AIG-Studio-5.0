/** FastModel 3.5: optional ordered, user-supplied per-beat voice recordings.
 * Text-to-speech preview is NOT a capturable audio file. This module never
 * synthesizes speech, claims phoneme accuracy, or edits source GLB bytes.
 */
export const VOICE_CUES_VERSION='AIG_FASTMODEL_3_5_RECORDED_PER_BEAT_VOICE_RMS_MOUTH';
const AUDIO_TYPES=/^(audio\/(wav|wave|x-wav|mpeg|mp3|ogg|webm|mp4)|application\/octet-stream)$/;
export function mapVoiceFiles(plan,files=[],{wholeFilePresent=false}={}){
 if(!plan?.ready||!Array.isArray(plan.timeline)||!plan.timeline.length)throw Error('VOICE_TIMELINE_NOT_READY');
 if(!Array.isArray(files))throw Error('VOICE_FILES_INVALID');
 if(!files.length)return [];
 if(wholeFilePresent)throw Error('VOICE_WHOLE_TRACK_AND_CUES_CONFLICT');
 if(files.length!==plan.timeline.length)throw Error('VOICE_CUE_COUNT_MISMATCH');
 const byPosition=new Map();let total=0;
 for(const file of files){
  const match=/^([0-9]{1,3})(?:[._ -]|$)/.exec(file?.name||'');
  if(!match)throw Error('VOICE_CUE_FILENAME_NEEDS_NUMBER');
  const index=Number(match[1]);
  if(index<1||index>plan.timeline.length||byPosition.has(index))throw Error('VOICE_CUE_DUPLICATE_OR_OUT_OF_RANGE');
  if(!Number.isFinite(file.size)||file.size<100||file.size>20*1024*1024||!AUDIO_TYPES.test(file.type||''))
   throw Error('VOICE_CUE_FILE_INVALID');
  total+=file.size;if(total>20*1024*1024)throw Error('VOICE_CUES_TOTAL_SIZE_EXCEEDED');
  byPosition.set(index,file);
 }
 return plan.timeline.map((beat,position)=>{
  const file=byPosition.get(position+1);
  if(!file)throw Error('VOICE_CUE_FILE_MISSING');
  if(!Number.isFinite(beat.seconds)||beat.seconds<=0)throw Error('VOICE_BEAT_DURATION_INVALID');
  return {position,beat:beat.beat,seconds:beat.seconds,file};
 });
}
export function voiceTimecodes(plan){
 if(!plan?.ready||!Array.isArray(plan.timeline))throw Error('VOICE_TIMELINE_NOT_READY');
 let start=0;
 return plan.timeline.map((beat,position)=>{
  if(!Number.isFinite(beat.seconds)||beat.seconds<=0)throw Error('VOICE_BEAT_DURATION_INVALID');
  const result={position,beat:beat.beat,startSeconds:+start.toFixed(6),
   endSeconds:+(start+beat.seconds).toFixed(6),text:beat.dialogue||''};
  start+=beat.seconds;return result;
 });
}
/** Drives an EXISTING GLB jaw/mouth morph from decoded voice waveform RMS.
 * No mouth morph => unavailable. Morph is restored on stop/record failure.
 * This is amplitude-only motion, NOT real phoneme/viseme synchronization.
 */
export class RmsMouthDriver{
 constructor(root){
  this.targets=[];
  root?.traverse?.(mesh=>{
   const dict=mesh.morphTargetDictionary,values=mesh.morphTargetInfluences;
   if(!dict||!values)return;
   const keys=['jawOpen','mouthOpen','viseme_aa','viseme_AA'];
   const key=keys.find(k=>Number.isInteger(dict[k])&&dict[k]>=0&&dict[k]<values.length);
   if(key)this.targets.push({values,index:dict[key],original:values[dict[key]],key});
  });
 }
 get available(){return this.targets.length>0;}
 applyLevel(rms){
  const level=Number.isFinite(rms)?Math.max(0,Math.min(1,rms)):0;
  for(const t of this.targets)t.values[t.index]=Math.max(0,Math.min(1,t.original+level*(1-t.original)));
  return this.available;
 }
 restore(){
  for(const t of this.targets)t.values[t.index]=t.original;
 }
}
