/** AIG 6.7: browser-native opt-in face rectangle plus imported local
 * PCM WAV amplitude-to-mouth. No third-party inference or fake phonemes.
 * All face detection is explicitly capability-dependent, never asserted
 * from 6.6 silhouette geometry.
 */
export const AIG67_SCHEMA='AIG_FASTMODEL_6_7_LOCAL_FACE_AUDIO_EVIDENCE';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export async function detectAIG67BrowserFace(image,{env=globalThis}={}){
 const unavailable=reason=>({verified:false,reason,box:null,
  method:'NO_VERIFIED_FACE_DETECTION',faceCount:0});
 if(!image||!Number.isFinite(image.width)||!Number.isFinite(image.height)||
  image.width<48||image.height<48)return unavailable('INVALID_IMAGE');
 if(typeof env.FaceDetector!=='function')return unavailable('NATIVE_FACE_DETECTOR_UNAVAILABLE');
 try{
  const detector=new env.FaceDetector({fastMode:true,maxDetectedFaces:2});
  const faces=await detector.detect(image);
  if(!Array.isArray(faces)||faces.length!==1)
   return unavailable(faces?.length>1?'MULTIPLE_FACES_AMBIGUOUS':'NO_DETECTED_FACE');
  const r=faces[0]?.boundingBox,{width:w,height:h}=image;
  if(!r||![r.x,r.y,r.width,r.height].every(Number.isFinite)||
   r.width<w*.055||r.height<h*.055||r.width>w*.9||r.height>h*.9||
   r.x<0||r.y<0||r.x+r.width>w+1||r.y+r.height>h+1)
   return unavailable('INVALID_FACE_RECTANGLE');
  return {verified:true,reason:null,faceCount:1,
   method:'BROWSER_NATIVE_FACE_RECTANGLE',
   box:{x:r.x,y:r.y,width:r.width,height:r.height},
   landmarksDetected:false,identityConfirmed:false};
 }catch(e){return unavailable('NATIVE_FACE_DETECTOR_REJECTED');}
}
/** Strict RIFF PCM16 LE decoder, suitable for real local recordings.
 * Rejects mislabeled compressed audio/oversize/truncated WAV rather than
 * inventing an audio envelope. The PCM samples are also used for playback.
 */
export function decodeAIG67PCM16Wav(arrayBuffer){
 if(!(arrayBuffer instanceof ArrayBuffer)||arrayBuffer.byteLength<44||
  arrayBuffer.byteLength>16*1024*1024)throw Error('AIG67_WAV_SIZE_LIMIT');
 const v=new DataView(arrayBuffer),n=v.byteLength;
 const four=(i)=>String.fromCharCode(v.getUint8(i),v.getUint8(i+1),v.getUint8(i+2),v.getUint8(i+3));
 if(four(0)!=='RIFF'||four(8)!=='WAVE'||v.getUint32(4,true)+8>n)
  throw Error('AIG67_NOT_RIFF_WAVE');
 let format=null,payload=null;
 for(let at=12;at+8<=n;){
  const kind=four(at),size=v.getUint32(at+4,true),start=at+8;
  if(size>n-start)throw Error('AIG67_TRUNCATED_CHUNK');
  if(kind==='fmt '){
   if(size<16)throw Error('AIG67_BAD_FORMAT_CHUNK');
   format={codec:v.getUint16(start,true),channels:v.getUint16(start+2,true),
    sampleRate:v.getUint32(start+4,true),byteRate:v.getUint32(start+8,true),
    blockAlign:v.getUint16(start+12,true),bits:v.getUint16(start+14,true)};
  }
  if(kind==='data'&&!payload)payload={start,size};
  at=start+size+(size%2);
 }
 if(!format||!payload||format.codec!==1||format.bits!==16||
  ![1,2].includes(format.channels)||format.sampleRate<8000||
  format.sampleRate>96000||format.blockAlign!==format.channels*2||
  format.byteRate!==format.sampleRate*format.blockAlign||
  payload.size%format.blockAlign!==0)throw Error('AIG67_ONLY_PCM16_MONO_STEREO');
 const frames=payload.size/format.blockAlign,duration=frames/format.sampleRate;
 if(!frames||duration>60)throw Error('AIG67_WAV_DURATION_LIMIT');
 const channels=Array.from({length:format.channels},()=>new Float32Array(frames));
 for(let i=0;i<frames;i++)for(let c=0;c<channels.length;c++){
  const pcm=v.getInt16(payload.start+(i*format.channels+c)*2,true);
  channels[c][i]=pcm/32768;
 }
 const step=Math.max(1,Math.round(format.sampleRate*.025));
 const envelope=new Float32Array(Math.ceil(frames/step));
 for(let k=0;k<envelope.length;k++){
  const lo=k*step,hi=Math.min(frames,lo+step);
  let sum=0;
  for(let i=lo;i<hi;i++){
   let mix=0;for(const channel of channels)mix+=channel[i];
   mix/=channels.length;sum+=mix*mix;
  }
  envelope[k]=Math.sqrt(sum/(hi-lo));
 }
 return {schema:AIG67_SCHEMA,channels,frames,sampleRate:format.sampleRate,
  durationSeconds:duration,envelope,envelopeSeconds:step/format.sampleRate,
  actualAudioSamplesDecoded:true,codec:'PCM16_LE',
  amplitudeIsNotPhonemeViseme:true};
}
export function sampleAIG67AudioMouth(decoded,t){
 if(!decoded||decoded.schema!==AIG67_SCHEMA||!Number.isFinite(t)||t<0)
  throw Error('AIG67_PCM_AND_TIME_REQUIRED');
 const index=Math.floor(t/decoded.envelopeSeconds);
 const rms=index>=decoded.envelope.length?0:decoded.envelope[index];
 return {rms,openness:clamp((rms-.012)*3.6,0,.92),
  source:'REAL_IMPORTED_PCM_RMS',realVoiceTiming:true,
  phonemesInferred:false};
}
export function buildAIG67AudioBuffer(context,decoded){
 if(!context?.createBuffer||decoded?.schema!==AIG67_SCHEMA)
  throw Error('AIG67_AUDIO_CONTEXT_REQUIRED');
 const b=context.createBuffer(decoded.channels.length,decoded.frames,decoded.sampleRate);
 decoded.channels.forEach((samples,i)=>{
  if(typeof b.copyToChannel==='function')b.copyToChannel(samples,i);
  else b.getChannelData(i).set(samples);
 });
 return b;
}
