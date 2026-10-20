/** FastModel 3.6 — serial, click-only AI speech WAVs for real animation beats.
 * Performs no billable operation without caller's explicit handler invocation.
 * No retry after timeout/failure: acceptance may be unknown.
 */
export const TTS_VERSION='AIG_FASTMODEL_3_6_EXPLICIT_SERVER_WAV_PER_BEAT';
export const TTS_VOICES=Object.freeze(['coral','shimmer','nova','sage','marin','cedar']);
const MAX_FILE=4*1024*1024,MAX_ALL=20*1024*1024;
export function validateVoiceScript(plan,voice){
 if(!TTS_VOICES.includes(voice))throw Error('TTS_VOICE_INVALID');
 if(!plan?.ready||!Array.isArray(plan.timeline)||!plan.timeline.length||plan.timeline.length>20)
  throw Error('TTS_REAL_ACTION_TIMELINE_REQUIRED');
 return plan.timeline.map((step,position)=>{
  const text=step.dialogue;
  if(!Number.isInteger(step.beat)||step.beat!==position||!Number.isFinite(step.seconds)||step.seconds<=0||
    typeof text!=='string'||!text.trim()||text.length>240)throw Error('TTS_CUE_INVALID');
  return {beat:step.beat,text:text.trim(),maxSeconds:step.seconds};
 });
}
export function validateVoiceWav(bytes){
 if(!(bytes instanceof ArrayBuffer)||bytes.byteLength<44||bytes.byteLength>MAX_FILE)throw Error('TTS_WAV_SIZE_INVALID');
 const v=new DataView(bytes);
 const ascii=(offset)=>String.fromCharCode(...new Uint8Array(bytes,offset,4));
 if(ascii(0)!=='RIFF'||ascii(8)!=='WAVE'||v.getUint32(4,true)+8!==bytes.byteLength)
  throw Error('TTS_WAV_HEADER_INVALID');
 // Read RIFF chunk headers only: expanding an entire multi-MB WAV via
 // String.fromCharCode(...bytes) overflows the JS argument stack on phones.
 let offset=12,format=false,audio=false;
 while(offset+8<=bytes.byteLength){
  const tag=ascii(offset),length=v.getUint32(offset+4,true);
  if(length>bytes.byteLength-offset-8)throw Error('TTS_WAV_STRUCTURE_INVALID');
  if(tag==='fmt '&&length>=16)format=true;
  if(tag==='data'&&length>0)audio=true;
  offset+=8+length+(length&1);
 }
 if(!format||!audio||offset!==bytes.byteLength)throw Error('TTS_WAV_STRUCTURE_INVALID');
 return bytes;
}
export async function generateVoiceBatch(plan,{
 voice='coral',post,decode,makeFile,onProgress=()=>{},stillCurrent=()=>true
}={}){
 const cues=validateVoiceScript(plan,voice);
 if(typeof post!=='function'||typeof decode!=='function'||typeof makeFile!=='function')
  throw Error('TTS_RUNTIME_REQUIRED');
 const collected=[];let size=0;
 for(const [position,cue] of cues.entries()){
  if(!stillCurrent())throw Error('TTS_STORY_CHANGED_DISCARDED');
  onProgress({position,total:cues.length,status:'REQUESTING'});
  // One POST for one beat. No automatic retry if connection drops.
  const bytes=validateVoiceWav(await post({beat:cue.beat,text:cue.text,voice}));
  if(!stillCurrent())throw Error('TTS_STORY_CHANGED_DISCARDED');
  size+=bytes.byteLength;
  if(size>MAX_ALL)throw Error('TTS_VOICE_TOTAL_LIMIT');
  const duration=await decode(bytes.slice(0));
  if(!Number.isFinite(duration)||duration<=0)throw Error('TTS_WAV_DECODE_INVALID');
  if(duration>cue.maxSeconds+.05)
   throw Error('TTS_REAL_ACTION_TOO_SHORT_FOR_VOICE_'+(position+1)+
    '_AUDIO_'+duration.toFixed(2)+'s_ACTION_'+cue.maxSeconds.toFixed(2)+'s');
  const name=String(position+1).padStart(2,'0')+'-AIG-AI-Voice.wav';
  collected.push(makeFile(bytes,name));
  onProgress({position,total:cues.length,status:'READY'});
 }
 return {schema:TTS_VERSION,files:collected,voice,fromCloudProvider:true,
  verifiedVoiceFileCount:collected.length,modelGeneratedFromPhoto:false,
  phonemeLipSyncVerified:false,heroineGLBApproved:false};
}
