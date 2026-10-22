/**
 * FastModel Real3D 2.2: bounded Chinese scene directions -> VERIFIED
 * original GLB clip cues, authored camera-key cues and text subtitles.
 * This is deterministic offline command mapping, NOT an LLM generating
 * motion, voice, physical 1:1 models or unseen geometry.
 */
import {STORY_ACTIONS,parseStory} from './story-to-animation.mjs';
import {assertAIG20Document} from './aig-world-scene-2-0.mjs';
export const AIG22_SCHEMA='AIG_FASTMODEL_REAL3D_2_2_SOURCE_BOUND_TEXT_STORYBOARD';
const fail=s=>{throw Error('AIG22_'+s)};
const maxLines=24,maxChars=1800,maxSeconds=360;
const clean=s=>String(s).normalize('NFKC').trim().toLowerCase().replace(/[\s_-]+/g,'');
function selectActor(line,actors){
 const found=actors.filter(a=>line.includes(a.nodeId));
 if(found.length>1)return {error:'MULTIPLE_ACTOR_IDENTITIES'};
 if(found.length===1)return {actor:found[0]};
 if(actors.length===1)return {actor:actors[0]};
 return {error:'EXPLICIT_ACTOR_NODE_REQUIRED'};
}
function decodeLine(line){
 const m=line.match(/^(?:(\d{1,3}(?:\.\d{1,2})?)\s*(?:秒|s|sec)\s*[:：,\s]*)?(.*)$/iu);
 return {at:m?.[1]===undefined?null:Number(m[1]),body:m?.[2]?.trim()||''};
}
function resolveSourceClip(actionId,actor){
 const action=STORY_ACTIONS.find(a=>a.id===actionId);
 if(!action)return {error:'UNKNOWN_ACTION'};
 const found=actor.clips.filter(c=>Number.isInteger(c.index)&&c.index>=0&&
  typeof c.name==='string'&&Number.isFinite(c.durationSeconds)&&
  c.durationSeconds>0&&action.clips.some(alias=>
   clean(c.name).includes(clean(alias))));
 if(found.length!==1)return {error:found.length?
  'AMBIGUOUS_ORIGINAL_CLIPS':'ORIGINAL_GLTF_CLIP_MISSING',
  candidates:found.map(x=>x.name)};
 return {clip:found[0]};
}
export function compileAIG22Story(text,{scene,actors=[]}={}){
 assertAIG20Document(scene);
 if(typeof text!=='string'||!text.trim()||text.length>maxChars||
  !Array.isArray(actors)||actors.length>12)
  fail('BOUNDED_SCRIPT_AND_ACTORS_REQUIRED');
 const validSceneActors=new Map(scene.objects.filter(o=>o.category==='character')
  .map(o=>[o.nodeId,o]));
 if(actors.some(a=>!validSceneActors.has(a.nodeId)||
   !Array.isArray(a.clips)||a.clips.length>64))
  fail('ACTOR_SOURCE_AND_SCENE_BINDING_INVALID');
 const lines=text.split(/[\n；;]+/).map(x=>x.trim()).filter(Boolean);
 if(lines.length>maxLines)fail('TOO_MANY_SCRIPT_LINES');
 const events=[],blocked=[];
 let sequential=0;
 for(const [index,line] of lines.entries()){
  const {at,body}=decodeLine(line),time=at??sequential;
  if(!Number.isFinite(time)||time<0||time>maxSeconds||!body){
   blocked.push({line:index+1,reason:'INVALID_SCRIPT_TIME_OR_EMPTY_LINE'});continue;
  }
  if(/^(旁白|字幕|對白|台詞)\s*[:：]/u.test(body)){
   const message=body.replace(/^(旁白|字幕|對白|台詞)\s*[:：]/u,'').trim();
   if(message.length<1||message.length>140){
    blocked.push({line:index+1,reason:'SUBTITLE_LENGTH_INVALID'});continue;
   }
   events.push({type:'SUBTITLE',line:index+1,timeSeconds:time,
    durationSeconds:2,text:message,voiceSynthesized:false});
   sequential=Math.max(sequential,time+2);continue;
  }
  if(/^(鏡頭|攝影機|運鏡|切鏡)\b?/u.test(body)){
   if(!scene.cameraKeys.length){
    blocked.push({line:index+1,reason:'AUTHORED_CAMERA_KEYFRAMES_REQUIRED'});continue;
   }
   if(!scene.cameraKeys.some(k=>Math.abs(k.timeSeconds-time)<.01)){
    blocked.push({line:index+1,reason:'CAMERA_KEYFRAME_AT_SCRIPT_TIME_REQUIRED',
     atSeconds:time});continue;
   }
   events.push({type:'CAMERA',line:index+1,timeSeconds:time,
    sourceKeySeconds:time,cameraPoseAuthoredNotInferred:true});
   sequential=Math.max(sequential,time);continue;
  }
  const result=selectActor(body,actors);
  if(result.error){
   blocked.push({line:index+1,reason:result.error});continue;
  }
  const actor=result.actor;
  const narrative=body.replace(actor.nodeId,'').replace(/^[\s：:]+/u,'').trim();
  let parsed;
  try{parsed=parseStory(narrative,{maxChars:1800,maxBeats:2})}
  catch(e){blocked.push({line:index+1,reason:'UNRECOGNIZED_TEXT_ACTION',
   details:String(e.message||e)});continue}
  if(parsed.beats.length!==1||parsed.unmapped.length){
   blocked.push({line:index+1,reason:'UNSUPPORTED_OR_AMBIGUOUS_ACTION',
    recognised:parsed.beats.map(b=>b.actionId)});continue;
  }
  const source=resolveSourceClip(parsed.beats[0].actionId,actor);
  if(!source.clip){
   blocked.push({line:index+1,nodeId:actor.nodeId,
    actionId:parsed.beats[0].actionId,reason:source.error,
    availableOriginalClipNames:actor.clips.map(x=>x.name)});
   continue;
  }
  const original=validSceneActors.get(actor.nodeId);
  const clip=source.clip;
  const duration=Math.min(clip.durationSeconds,30);
  events.push({type:'ACTOR_SOURCE_CLIP',line:index+1,timeSeconds:time,
   durationSeconds:duration,nodeId:actor.nodeId,
   assetId:original.assetId,sourceSha256:original.sourceSha256,
   actionId:parsed.beats[0].actionId,clipIndex:clip.index,
   clipName:clip.name,clipDurationSeconds:clip.durationSeconds,
   sourceMotionOnly:true});
  sequential=Math.max(sequential,time+duration);
 }
 events.sort((a,b)=>a.timeSeconds-b.timeSeconds||a.line-b.line);
 // Concurrent different actors are supported; overlapped clips on the
 // same actor would restart its mixer unpredictably, so reject.
 const busyUntil=new Map();
 for(const e of events.filter(e=>e.type==='ACTOR_SOURCE_CLIP')){
  if(e.timeSeconds<(busyUntil.get(e.nodeId)??0)-1e-6)
   blocked.push({line:e.line,nodeId:e.nodeId,reason:'OVERLAPPING_SOURCE_CLIPS'});
  busyUntil.set(e.nodeId,e.timeSeconds+e.durationSeconds);
 }
 const duration=Math.max(0,...events.map(e=>
  e.timeSeconds+(e.durationSeconds||0)),
  ...scene.cameraKeys.map(k=>k.timeSeconds));
 if(duration>maxSeconds)blocked.push({reason:'MAX_STORY_DURATION_EXCEEDED'});
 const ready=events.length>0&&blocked.length===0;
 return {
  schema:AIG22_SCHEMA,sceneId:scene.id,sceneRevision:scene.revision,
  sceneCoordinateMode:scene.coordinateMode,
  sourceManifest:scene.objects.map(o=>({nodeId:o.nodeId,assetId:o.assetId,
   sha256:o.sourceSha256,category:o.category})),
  cameraKeyframesReferenced:scene.cameraKeys.map(k=>({keyId:k.keyId,
   timeSeconds:k.timeSeconds})),
  sourceText:text,events,blocked,ready,
  status:ready?'SOURCE_BOUND_STORYBOARD_READY':'BLOCKED_SOURCE_MOTION_OR_SCRIPT',
  durationSeconds:duration,
  originalSceneMeshUnchanged:true,originalAssetBlobsUnchanged:true,
  modelTrainingPerformed:false,imaginedPhysicalDepth:false,
  generatedHumanMotion:false,generatedVoice:false,
  plainTextSubtitleOnly:true,oneSharedRenderer:true
 };
}
export function verifyAIG22Story(plan,scene,actors){
 if(!plan||plan.schema!==AIG22_SCHEMA||!plan.ready||
  plan.status!=='SOURCE_BOUND_STORYBOARD_READY')
  fail('STORYBOARD_NOT_READY');
 assertAIG20Document(scene);
 if(plan.sceneId!==scene.id||plan.sceneRevision!==scene.revision||
  plan.sceneCoordinateMode!==scene.coordinateMode||
  JSON.stringify(plan.sourceManifest)!==JSON.stringify(scene.objects.map(o=>({
   nodeId:o.nodeId,assetId:o.assetId,sha256:o.sourceSha256,category:o.category
  })))||
  JSON.stringify(plan.cameraKeyframesReferenced)!==JSON.stringify(
   scene.cameraKeys.map(k=>({keyId:k.keyId,timeSeconds:k.timeSeconds}))))
  fail('SCENE_REVISION_OR_SHA_CHANGED_RECOMPILE_REQUIRED');
 const available=new Map(actors.map(a=>[a.nodeId,a]));
 for(const event of plan.events.filter(e=>e.type==='ACTOR_SOURCE_CLIP')){
  const clips=available.get(event.nodeId)?.clips;
  const match=clips?.find(c=>c.index===event.clipIndex);
  if(!match||match.name!==event.clipName||
   match.durationSeconds!==event.clipDurationSeconds)
   fail('ORIGINAL_SOURCE_CLIP_CHANGED');
 }
 return true;
}
/** On-frame driver: only cues existing GLB AnimationMixers and authored
 * camera keys. Viewer itself keeps updating the actual mixers per WebGL frame.
 */
export class AIG22StoryPlayer{
 constructor({worldRuntime,onEvent=()=>{},onEnd=()=>{}}={}){
  if(!worldRuntime?.scene||typeof worldRuntime.selectSourceActorClip!=='function')
   fail('ACTIVE_SOURCE_WORLD_REQUIRED');
  this.worldRuntime=worldRuntime;this.onEvent=onEvent;this.onEnd=onEnd;
  this.plan=null;this.running=false;this.elapsed=0;this.cursor=0;
 }
 start(plan){
  if(this.running)fail('ALREADY_PLAYING');
  verifyAIG22Story(plan,this.worldRuntime.scene,
   this.worldRuntime.listSourceActorClips());
  this.plan=plan;this.running=true;this.elapsed=0;this.cursor=0;
  this.advance(0);
  return {status:'PLAYING_REAL_SOURCE_CUES',events:plan.events.length};
 }
 advance(dt){
  if(!this.running)return {status:'STOPPED'};
  if(!Number.isFinite(dt)||dt<0)fail('INVALID_FRAME_DELTA');
  this.elapsed=Math.min(this.plan.durationSeconds,this.elapsed+
   Math.min(dt,.25));
  while(this.cursor<this.plan.events.length&&
   this.plan.events[this.cursor].timeSeconds<=this.elapsed+1e-6){
   const event=this.plan.events[this.cursor++];
   if(event.type==='ACTOR_SOURCE_CLIP'){
    this.worldRuntime.selectSourceActorClip(event.nodeId,event.clipIndex);
   }else if(event.type==='CAMERA'){
    this.worldRuntime.applyCamera(event.sourceKeySeconds);
   }
   this.onEvent(event);
  }
  if(this.plan.cameraKeyframesReferenced.length){
   this.worldRuntime.applyCamera(Math.min(
    this.elapsed,this.plan.cameraKeyframesReferenced.at(-1).timeSeconds));
  }
  if(this.elapsed+1e-6>=this.plan.durationSeconds){
   this.running=false;
   this.onEnd({status:'STORY_COMPLETE_REAL_CUES',seconds:this.elapsed});
  }
  return {status:this.running?'RUNNING_SOURCE_CLIPS':'COMPLETE',
   elapsedSeconds:this.elapsed,appliedEvents:this.cursor};
 }
 stop(){
  this.running=false;this.plan=null;this.elapsed=0;this.cursor=0;
  return {status:'STOPPED_NO_ORIGINAL_ASSET_MUTATION'};
 }
}
