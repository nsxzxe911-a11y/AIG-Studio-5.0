/**
 * Star Journey real Web Audio stems to WebM mux pipeline.
 * This module only mixes caller supplied decoded audio PCM and explicitly
 * doesn't claim generated music, dialogue TTS or original video audio.
 */
export const AIG_CINEMA_MIXER_SCHEMA='AIG_FASTMODEL_REAL_PCM_TO_WEBM_AUDIO_MIX_V1';
const finite=n=>typeof n==='number'&&Number.isFinite(n);
export function checkAIGCinemaAudioStem(file){
 if(!file||typeof file.size!=='number'||file.size<44||file.size>26000000||
 !/^audio\/(mpeg|ogg|wav|webm|x-wav)$/.test(file.type))
 throw Error('CINEMA_AUDIO_MIME_OR_FILE_BUDGET');
 return true;
}
export async function decodeAIGCinemaStem(ctx,file){
 checkAIGCinemaAudioStem(file);
 if(!ctx||typeof ctx.decodeAudioData!=='function')throw Error('CINEMA_AUDIO_CONTEXT_REQUIRED');
 let b;
 try{b=await ctx.decodeAudioData(await file.arrayBuffer());}
 catch{throw Error('CINEMA_AUDIO_DECODE_BLOCK');}
 if(!b||!finite(b.duration)||b.duration<=0||b.duration>600||
 ![1,2].includes(b.numberOfChannels)||b.length>48000*600*2)
 throw Error('CINEMA_AUDIO_DURATION_OR_CHANNEL_BUDGET');
 return b;
}
export function prepareAIGCinemaAudioMix(ctx,{
 music=null,sfx=null,voice=null,musicGain=.65,sfxGain=.75,voiceGain=.95
}={}){
 if(!ctx||typeof ctx.createMediaStreamDestination!=='function')
 throw Error('CINEMA_WEB_AUDIO_MIXER_UNSUPPORTED');
 if(![musicGain,sfxGain,voiceGain].every(n=>finite(n)&&n>=0&&n<=1))
 throw Error('CINEMA_GAIN_RANGE');
 if(!music&&!sfx&&!voice)return null;
 const destination=ctx.createMediaStreamDestination();
 const sources=[],connections=[];
 for(const [kind,buffer,volume]of [
  ['music',music,musicGain],['sfx',sfx,sfxGain],['voice',voice,voiceGain]
 ]){
  if(!buffer)continue;
  const source=ctx.createBufferSource(),gain=ctx.createGain();
  source.buffer=buffer;source.loop=kind==='music';
  gain.gain.value=volume;
  source.connect(gain);gain.connect(destination);
  sources.push({kind,source,gain});
  connections.push(kind);
 }
 const track=destination.stream.getAudioTracks()[0];
 if(!track)throw Error('CINEMA_MIXER_NO_REAL_AUDIO_TRACK');
 let started=false;
 return {
  schema:AIG_CINEMA_MIXER_SCHEMA,track,
  stems:connections,
  start(){
   if(started)throw Error('CINEMA_MIX_ALREADY_STARTED');
   started=true;
   const at=ctx.currentTime+.035;
   for(const v of sources)v.source.start(at);
  },
  stop(){
   if(!started)return;
   for(const v of sources){
    try{v.source.stop();}catch{}
    try{v.source.disconnect();v.gain.disconnect();}catch{}
   }
  },
  verifiedMediaStreamAudioTrackCreated:track.kind==='audio',
  importedVoiceRecordingIncluded:Boolean(voice),
  voiceSynthesisIncluded:false,
  sourceVideoAudioIncluded:false
 };
}
