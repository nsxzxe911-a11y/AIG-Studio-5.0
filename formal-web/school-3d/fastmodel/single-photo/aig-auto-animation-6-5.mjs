/** AIG FastModel 6.5 — offline image/story → real Canvas 2D or 2.5D,
 * or verified existing GLB animation. No third-party image AI, fake skeletons,
 * or silent fallback that pretends parallax can punch/kick.
 */
import {parseStory,resolveStoryClips} from './story-to-animation.mjs';
export const AIG65_SCHEMA='AIG_FASTMODEL_6_5_AUTO_2D_2_5D_3D_VISUAL_WORKFLOW';
export const AIG65_MODES=Object.freeze(['AUTO','2D','2.5D','3D']);
const hash=x=>typeof x==='string'&&/^[0-9a-f]{64}$/i.test(x);
const allowedCanvas=new Set(['idle','headTurn','headNod','ponySwing','walk',
 'run','turn','jump','dodge','bow']);
const fakeFighting=new Set(['punch','kick','block','fall']);
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
/** AUTO selects a genuinely deliverable renderer, not a word-tag.
 * The 2D/2.5D fallback is flat image compositing; not true articulated
 * walking/running or physics. Story-only is a moving title card, not a person.
 */
export function planAIG65AutoAnimation({
 storyText='',imageSHA256=null,hasImage=false,glbSHA256=null,
 hasGLB=false,clips=[],requestedMode='AUTO',durationSeconds=8
}={}){
 if(!AIG65_MODES.includes(requestedMode)||
   !Number.isFinite(durationSeconds)||durationSeconds<1||
   durationSeconds>180||!Array.isArray(clips))
  throw Error('AIG65_MODE_DURATION_OR_CLIPS_INVALID');
 if(hasImage&&!hash(imageSHA256))throw Error('AIG65_ORIGINAL_IMAGE_SHA_REQUIRED');
 if(hasGLB&&!hash(glbSHA256))throw Error('AIG65_VERIFIED_GLB_SHA_REQUIRED');
 if(!hasImage&&!hasGLB&&!String(storyText).trim())
  throw Error('AIG65_PHOTO_OR_STORY_REQUIRED');
 if(typeof storyText!=='string'||storyText.length>3000)throw Error('AIG65_STORY_BUDGET');
 let story=null,unsupportedStory=null,plan3d=null;
 if(storyText.trim()){
  try{story=parseStory(storyText);}catch(e){
   unsupportedStory=String(e.message||e);
  }
  if(story&&hasGLB)plan3d=resolveStoryClips(story,clips);
 }
 const beats=story?.beats||[];
 const complex=beats.filter(b=>fakeFighting.has(b.actionId));
 const extraBlockers=story?.unmapped?.filter(x=>x.reason!=='NO_SUPPORTED_ACTION_KEYWORD')||[];
 const isCamera=/(鏡頭|攝影機|運鏡|推近|拉遠|特寫|camera|zoom|景深|視差)/i.test(storyText);
 const dynamic=beats.some(b=>['walk','run','jump','turn','dodge','ponySwing'].includes(b.actionId));
 const requiresCharacterMotion=beats.some(b=>allowedCanvas.has(b.actionId)&&b.actionId!=='idle');
 let selectedMode=requestedMode;
 if(selectedMode==='AUTO'){
  // Only choose true 3D when verified existing model/entire clip plan can
  // actually play, never merely because the user asked for 3D fighting.
  selectedMode=hasGLB&&plan3d?.ready?'3D':
   hasImage&&(isCamera||dynamic)?'2.5D':'2D';
 }
 const blocking=[];
 if(requestedMode==='AUTO'&&requiresCharacterMotion&&!isCamera&&!plan3d?.ready)
  blocking.push('VERIFIED_REAL_GLB_CLIPS_REQUIRED');
 if(selectedMode==='3D'){
  if((!hasGLB||!plan3d?.ready)&&!blocking.includes('VERIFIED_REAL_GLB_CLIPS_REQUIRED'))blocking.push('VERIFIED_REAL_GLB_CLIPS_REQUIRED');
 }else{
  if(!hasImage&&!storyText.trim())blocking.push('IMAGE_OR_TEXT_REQUIRED');
  if(complex.length)blocking.push('ARTICULATED_FIGHTING_NOT_AVAILABLE_IN_FLAT_IMAGE');
  if(extraBlockers.some(x=>x.reason==='MULTI_CHARACTER_SCENE_REQUIRES_SECOND_ACTOR'))
   blocking.push('SECOND_ACTOR_NOT_AVAILABLE_IN_SINGLE_IMAGE');
  // No pretending a flat image is already rigged for physical limbs.
  if(requestedMode!=='AUTO'&&selectedMode==='2.5D'&&!hasImage)
   blocking.push('PARALLAX_REQUIRES_REAL_IMAGE');
 }
 if(unsupportedStory&&storyText.trim()&&selectedMode==='3D')
  blocking.push('STORY_NO_VERIFIED_3D_ACTION');
 const normalized=beats.map(b=>({
  beat:b.index,actionId:b.actionId,label:b.label,text:b.text
 }));
 if(!normalized.length&&storyText.trim()){
  normalized.push({beat:0,actionId:'idle',label:'字幕／鏡頭',
   text:storyText.trim()});
 }
 if(!normalized.length)normalized.push({beat:0,actionId:'idle',
   label:'靜態照片／鏡頭',text:''});
 const beatSeconds=durationSeconds/normalized.length;
 const timeline=normalized.map((b,i)=>({...b,
  startSeconds:+(i*beatSeconds).toFixed(4),
  seconds:beatSeconds,
  visualTechnique:selectedMode==='3D'?'REAL_SKELETAL_GLB_CLIP':
   selectedMode==='2.5D'?'REAL_CANVAS_IMAGE_PARALLAX_ESTIMATED_DEPTH':
   hasImage?'REAL_2D_IMAGE_TRANSLATE_SCALE_ROTATE':'TEXT_TITLE_CARD_ANIMATION',
  photoHasArticulatedLimbs:false,
  armsAndLegsActuallyAnimated:selectedMode==='3D'&&plan3d?.ready===true
 }));
 const sourceSHA256=selectedMode==='3D'?glbSHA256:imageSHA256;
 return {schema:AIG65_SCHEMA,requestedMode,selectedMode,
  ready:blocking.length===0&&(!selectedMode.startsWith('3')||!!plan3d?.ready),
  sourceSHA256:sourceSHA256||null,
  sourceImageSHA256:hasImage?imageSHA256:null,
  modelGLBSHA256:hasGLB?glbSHA256:null,
  hasImage,hasGLB,seconds:timeline.length*beatSeconds,
  timeline,storyInput:storyText,storyParsed:story!==null,
  storyFallbackReason:unsupportedStory,
  threeDPlan:plan3d,
  blockers:blocking,
  flatImageOnlyHasCameraOrCardMotion:selectedMode!=='3D',
  parallaxDepthIsHeuristicNotMeasured:true,
  fullBodyIdentityFromImageVerified:false,
  existingMovieAndVoicePipelinesPreserved:true,
  formalReleaseAllowed:false};
}
// Strip internal 3dPlan from user facing flat timeline reports.
export function publicAIG65Plan(plan){
 if(plan?.schema!==AIG65_SCHEMA)throw Error('AIG65_INVALID_PLAN');
 const {threeDPlan:internal,...report}=plan;
 return {...report,threeDClipPlanPresent:!!internal,
  native60FPSVerified:false,mediaRecorderOutputVerified:false};
}
/** Foreground matte based only on observed pixels from the user's image;
 * alpha photographs first, approximate background-border RGB second.
 * If insufficient separation, do NOT announce proven 2.5D geometry.
 */
export function analyzeAIG65ForegroundPixels(image,{
 sampleBudget=300000
}={}){
 if(!image||!Number.isInteger(image.width)||!Number.isInteger(image.height)||
  image.width<32||image.height<32||image.width*image.height>4000000||
  image.data?.length!==image.width*image.height*4||
  !Number.isInteger(sampleBudget)||sampleBudget<2000||sampleBudget>4000000)
  throw Error('AIG65_RGBA_FOREGROUND_REQUIRED');
 const {width:w,height:h,data}=image,step=Math.max(1,
  Math.ceil(Math.sqrt(w*h/sampleBudget)));
 let transparent=0,opaque=0;
 const corners=[];
 for(let y=0;y<h;y+=step)for(let x=0;x<w;x+=step){
  const i=(y*w+x)*4;
  if(data[i+3]<160)transparent++;else opaque++;
  if((x<w*.08||x>w*.92)&&(y<h*.08||y>h*.92)&&data[i+3]>245)
   corners.push([data[i],data[i+1],data[i+2]]);
 }
 if(transparent>opaque*.08)return {
  hasDistinctForeground:true,method:'EXISTING_REAL_ALPHA',
  depthWasMeasured:false,pixelsAnalyzed:transparent+opaque,
  userSourceRequiresNoExternalService:true
 };
 if(corners.length<12)return {
  hasDistinctForeground:false,method:'CANNOT_ESTIMATE_FOREGROUND',
  depthWasMeasured:false,pixelsAnalyzed:transparent+opaque,
  userSourceRequiresNoExternalService:true
 };
 const median=k=>{
  const a=corners.map(x=>x[k]).sort((x,y)=>x-y);
  return a[Math.floor(a.length/2)];
 };
 const back=[median(0),median(1),median(2)];
 let distinct=0,examined=0;
 for(let y=Math.floor(h*.08);y<h*.92;y+=step)for(let x=Math.floor(w*.08);x<w*.92;x+=step){
  const i=(y*w+x)*4;
  if(data[i+3]<245)continue;
  const diff=Math.hypot(data[i]-back[0],data[i+1]-back[1],data[i+2]-back[2]);
  if(diff>85)distinct++;examined++;
 }
 const proportion=examined?distinct/examined:0;
 return {hasDistinctForeground:proportion>.10&&proportion<.83,
  method:proportion>.10&&proportion<.83?
   'BORDER_RGB_DIFFERENCE_HEURISTIC':'CANNOT_ESTIMATE_FOREGROUND',
  depthWasMeasured:false,backgroundMedianRGB:back,
  foregroundFraction:+proportion.toFixed(4),
  pixelsAnalyzed:transparent+opaque,
  userSourceRequiresNoExternalService:true};
}
const envelope=(beat,localTime)=>{
 const phase=clamp(localTime/Math.max(.1,beat.seconds),0,1);
 const wave=Math.sin(phase*2*Math.PI);
 const loop=Math.sin(phase*4*Math.PI);
 const a=beat.actionId;
 if(a==='walk')return {x:.035*wave,y:.018*Math.abs(loop),angle:.009*wave,zoom:1};
 if(a==='run')return {x:.07*wave,y:.03*Math.abs(loop),angle:.014*wave,zoom:1.025};
 if(a==='turn'||a==='headTurn')return {x:.012*wave,y:0,angle:.045*wave,zoom:1};
 if(a==='ponySwing')return {x:.024*wave,y:0,angle:.032*wave,zoom:1};
 if(a==='jump')return {x:0,y:-.12*Math.sin(phase*Math.PI),angle:0,zoom:1};
 if(a==='dodge')return {x:.1*wave,y:0,angle:.032*wave,zoom:1};
 if(a==='headNod'||a==='bow')return {x:0,y:.028*Math.sin(phase*Math.PI),angle:.012*wave,zoom:1};
 return {x:.006*wave,y:.008*wave,angle:0,zoom:1};
};
/** Pure, deterministic transform for actual 2D canvas pixels; dynamic
 * camera/pose is a flat image transform and must be labeled as such. */
export function sampleAIG65FlatMotion(plan,seconds){
 if(plan?.schema!==AIG65_SCHEMA||!plan.ready||plan.selectedMode==='3D'||
  !Number.isFinite(seconds)||seconds<0)
  throw Error('AIG65_REAL_FLAT_PLAN_AND_TIME_REQUIRED');
 const t=Math.min(seconds,plan.seconds);
 const beat=plan.timeline.find(x=>t<x.startSeconds+x.seconds)||
  plan.timeline.at(-1);
 const motion=envelope(beat,t-beat.startSeconds);
 const progress=plan.seconds?t/plan.seconds:0;
 const z=plan.selectedMode==='2.5D'?1.04+.045*progress:1+.012*progress;
 return {timeSeconds:t,beat,transform:{
  x:motion.x+.015*Math.sin(progress*Math.PI*2),
  y:motion.y+.01*Math.cos(progress*Math.PI*2),
  angle:motion.angle,zoom:z*motion.zoom
 },depthOffset:plan.selectedMode==='2.5D'?
  .02*Math.sin(progress*2*Math.PI):0,
  actualPixelFrameRequired:true,
  photoHumanLimbsWereNotArticulated:true};
}
