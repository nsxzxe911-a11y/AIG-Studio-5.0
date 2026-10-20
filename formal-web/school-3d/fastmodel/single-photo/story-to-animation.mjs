/** FastModel 3.2 — deterministic Chinese/English screenplay → existing GLB
 * animation clip timeline. No text-to-motion model is called: every generated
 * visual step must be backed by a real, loaded, skinned animation clip.
 */
export const STORY_PIPELINE_VERSION='AIG_FASTMODEL_3_2_TEXT_TO_REAL_CLIP_SEQUENCE';
export const STORY_ACTIONS=Object.freeze([
 Object.freeze({id:'walk',label:'行走',text:['走進','走向','走路','走過','走出','行走','步行','散步','前進','walk'],clips:['walk','walking','步行','行走','走路','forward']}),
 Object.freeze({id:'idle',label:'站立／等待',text:['站著','站立','等待','待命','靜止','idle','stand'],clips:['idle','stand','站立','待機']}),
 Object.freeze({id:'turn',label:'轉身',text:['轉身','回頭','轉向','迴轉','turn','rotate'],clips:['turn','轉身','rotation']}),
 Object.freeze({id:'dodge',label:'閃避',text:['閃避','閃開','躲開','側身閃','dodge','evade'],clips:['dodge','evade','閃避','閃躲']}),
 Object.freeze({id:'block',label:'格擋',text:['格擋','防禦','擋住','擋下','block','guard'],clips:['block','guard','defend','格擋']}),
 Object.freeze({id:'punch',label:'出拳',text:['出拳','揮拳','一拳','打拳','拳擊','punch','jab'],clips:['punch','jab','拳擊','出拳','揮拳']}),
 Object.freeze({id:'kick',label:'踢擊',text:['踢腿','踢擊','側踢','踢向','踢出','kick'],clips:['kick','踢腿','踢擊']}),
 Object.freeze({id:'jump',label:'跳躍',text:['跳起','跳躍','躍起','跳開','jump'],clips:['jump','跳躍']}),
 Object.freeze({id:'run',label:'跑步',text:['跑向','跑開','跑步','奔跑','衝向','run','sprint'],clips:['run','running','跑步','奔跑']}),
 Object.freeze({id:'fall',label:'倒下',text:['倒下','跌倒','摔倒','fall','knockdown'],clips:['fall','跌倒','倒下']}),
 Object.freeze({id:'bow',label:'鞠躬',text:['鞠躬','行禮','bow'],clips:['bow','鞠躬']})
]);
const normalize=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[\s_\-｜|()[\].]+/g,'');
const contains=(s,alias)=>normalize(s).includes(normalize(alias));
const NEGATED=/^(?:不|沒有|未|別|勿|停止|不要)(?:再)?$/;
const MULTI_ACTOR=/(?:對手|另一位|同學|敵人|兩人|二人|雙方|第二人|第二位|對方|opponent|enemy|rival)/i;
const CAMERA_ACTION=/(?:鏡頭|攝影機|運鏡|推近|特寫|切鏡|camera|zoom)/i;
function classifyClause(text){
 const clauses=[];
 for(const action of STORY_ACTIONS){
  let earliest=Infinity,matchedAlias=null;
  for(const word of action.text){
   const at=normalize(text).indexOf(normalize(word));
   if(at<0)continue;
   const prefix=normalize(text.slice(Math.max(0,at-4),at));
   if(NEGATED.test(prefix)||/(不要|沒有|不會|不得|禁止)$/.test(prefix))continue;
   if(at<earliest){earliest=at;matchedAlias=word;}
  }
  if(matchedAlias!==null)clauses.push({actionId:action.id,label:action.label,at:earliest,matchedAlias});
 }
 return clauses.sort((a,b)=>a.at-b.at);
}
export function parseStory(text,{maxChars=3000,maxBeats=20}={}){
 if(typeof text!=='string'||!text.trim())throw Error('STORY_TEXT_REQUIRED');
 if(text.length>maxChars||maxChars>10000||maxChars<20||maxBeats>40||maxBeats<1)throw Error('STORY_BUDGET_EXCEEDED');
 const lines=text.split(/[，,。；;！!？?\n]+/).map(s=>s.trim()).filter(Boolean);
 if(lines.length>80)throw Error('STORY_TOO_MANY_CLAUSES');
 const beats=[],unmapped=[];
 for(const line of lines){
  const found=classifyClause(line);
  if(CAMERA_ACTION.test(line))unmapped.push({text:line,reason:'CAMERA_DIRECTION_UNSUPPORTED'});
  if(MULTI_ACTOR.test(line))unmapped.push({text:line,reason:'MULTI_CHARACTER_SCENE_REQUIRES_SECOND_ACTOR'});
  if(!found.length){unmapped.push({text:line,reason:'NO_SUPPORTED_ACTION_KEYWORD'});continue;}
  for(const action of found){
   if(beats.length>=maxBeats)throw Error('STORY_TOO_MANY_ACTION_BEATS');
   beats.push({index:beats.length,text:line,actionId:action.actionId,label:action.label,
    matchedAlias:action.matchedAlias});
  }
 }
 if(!beats.length)throw Error('STORY_NO_RECOGNIZED_ACTIONS');
 return {version:STORY_PIPELINE_VERSION,originalText:text,beats,unmapped,
  requiresAdditionalCharacter:unmapped.some(x=>x.reason==='MULTI_CHARACTER_SCENE_REQUIRES_SECOND_ACTOR'),
  requiresCameraDirector:unmapped.some(x=>x.reason==='CAMERA_DIRECTION_UNSUPPORTED'),
  textToMotionGenerated:false,originalCharacterGLBModified:false};
}
export function resolveStoryClips(story,clips){
 if(!story||!Array.isArray(story.beats)||!Array.isArray(clips))throw Error('STORY_RESOLVE_INPUT_INVALID');
 const timeline=[],missing=[];
 for(const beat of story.beats){
  const action=STORY_ACTIONS.find(x=>x.id===beat.actionId);
  if(!action)throw Error('STORY_UNSUPPORTED_ACTION');
  const hits=[];
  clips.forEach((clip,index)=>{
   if(!clip||!Number.isFinite(clip.duration)||clip.duration<=0||!Array.isArray(clip.tracks)||!clip.tracks.length)return;
   const name=normalize(clip.name);
   if(action.clips.some(alias=>name.includes(normalize(alias))))hits.push({clip,index});
  });
  // Action selection is explicitly deterministic; ambiguous matches MUST NOT
  // silently choose a random "fight" clip and claim realistic choreography.
  if(hits.length!==1){
   missing.push({beat:beat.index,actionId:beat.actionId,text:beat.text,
    reason:hits.length?'AMBIGUOUS_ACTION_CLIPS':'ACTION_CLIP_NOT_INSTALLED',
    candidates:hits.map(h=>({index:h.index,name:h.clip.name}))});
   continue;
  }
  const {clip,index}=hits[0];
  timeline.push({beat:beat.index,actionId:beat.actionId,label:beat.label,
   script:beat.text,index,clipName:clip.name,clipDuration:clip.duration,seconds:clip.duration});
 }
 const blocking=[...missing];
 if(story.requiresAdditionalCharacter)blocking.push({reason:'SECOND_ACTOR_MODEL_MISSING'});
 if(story.requiresCameraDirector)blocking.push({reason:'DIRECTED_CAMERA_NOT_IMPLEMENTED'});
 const available=timeline.length>0&&missing.length===0&&blocking.length===0;
 return {version:STORY_PIPELINE_VERSION,status:available?'READY_REAL_GLTF_CLIP_SEQUENCE':'BLOCKED_ACTION_ASSETS_MISSING',
  timeline,missing,blocking,unmapped:[...story.unmapped],inputBeats:story.beats.length,
  seconds:timeline.reduce((s,part)=>s+part.seconds,0),
  ready:available,realGLBClipPlaybackOnly:true,textGenerated3DGeometry:false,
  trueTwoCharacterCombatVerified:false,exactCollisionValidated:false,sourceCharacterMeshUnchanged:true};
}
/** Does not synthesize frames: drives an existing animation controller through
 * real clipAction keyframes. No clip => no playback. */
export class StoryPlayback{
 constructor(controller,{onStep=()=>{},onFinish=()=>{}}={}){
  this.controller=controller;this.onStep=onStep;this.onFinish=onFinish;
  this.plan=null;this.position=0;this.elapsed=0;this.playing=false;
 }
 start(plan){
  if(!plan?.ready||!plan.timeline?.length)throw Error('STORY_TIMELINE_BLOCKED');
  if(!this.controller?.mixer||typeof this.controller.select!=='function')
   throw Error('STORY_CONTROLLER_REQUIRED');
  for(const beat of plan.timeline){
   const clip=this.controller.clips[beat.index];
   if(!clip||clip.name!==beat.clipName||clip.duration!==beat.clipDuration||!clip.tracks?.length)
    throw Error('STORY_CLIP_CHANGED');
  }
  this.plan=plan;this.position=0;this.elapsed=0;this.playing=true;
  try{this.controller.select(plan.timeline[0].index,{keepStory:true});this.controller.paused=false;
   this.onStep({position:0,beat:plan.timeline[0],total:plan.timeline.length});}
  catch(e){this.playing=false;this.plan=null;throw e;}
 }
 update(dt){
  if(!this.playing)return false;
  if(!Number.isFinite(dt)||dt<0)throw Error('STORY_FRAME_TIME_INVALID');
  let remaining=Math.min(dt,.25),iterations=0;
  while(remaining>0&&this.playing){
   if(++iterations>40)throw Error('STORY_TICK_BUDGET');
   const beat=this.plan.timeline[this.position],clip=this.controller.clips[beat.index];
   if(!clip||clip.name!==beat.clipName||clip.duration!==beat.clipDuration)
    {this.stop();throw Error('STORY_CLIP_CHANGED');}
   const left=Math.max(0,beat.seconds-this.elapsed),advance=Math.min(remaining,left);
   if(advance>0){this.controller.mixer.update(advance);this.elapsed+=advance;remaining-=advance;}
   if(this.elapsed+1e-7>=beat.seconds){
    this.position++;this.elapsed=0;
    if(this.position>=this.plan.timeline.length){
     this.playing=false;this.controller.paused=true;this.onFinish({total:this.plan.timeline.length});
    }else{
     this.controller.select(this.plan.timeline[this.position].index,{keepStory:true});
     this.onStep({position:this.position,beat:this.plan.timeline[this.position],total:this.plan.timeline.length});
    }
   }
  }
  return this.playing;
 }
 stop(){this.playing=false;this.plan=null;this.position=0;this.elapsed=0;}
 get status(){return {playing:this.playing,position:this.position,
  count:this.plan?.timeline.length||0,elapsed:this.elapsed};}
}
