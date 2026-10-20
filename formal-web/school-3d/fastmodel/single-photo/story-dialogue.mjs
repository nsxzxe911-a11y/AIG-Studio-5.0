/** FastModel 3.3 — offline creative dialogue templates for a screenplay beat.
 * Not an LLM: wording comes from locally authored comedic/epic/dramatic sets.
 * Single-character monologue; second speaking roles require real characters.
 * Editors may change captions manually before preview.
 */
export const DIALOGUE_STYLES=Object.freeze(['witty','heroic','dramatic']);
export const DIALOGUE_VERSION='AIG_FASTMODEL_3_3_LOCAL_DIALOGUE_TEMPLATES_NOT_LLM';
const BANK=Object.freeze({
 walk:{witty:['本小姐的出場費，走廊記得報帳。','今天的主角光環，記得幫我充電喔。'],
       heroic:['每走一步，都離答案更近。','就算前面有風，我也要向前。'],
       dramatic:['這條走廊，好像藏著什麼秘密。','腳步越近，心跳就越清楚。']},
 idle:{witty:['先等一下，我的帥氣還沒載入完畢。','休息不是偷懶，是給鏡頭時間欣賞。'],
       heroic:['守住位置，就是守住信念。','即使不動，也絕不退讓。'],
       dramatic:['時間突然安靜了。','我在等待那個改變一切的瞬間。']},
 turn:{witty:['等等，這反轉比我的考卷還突然！','轉個身，連命運都要重新排隊。'],
       heroic:['回頭不是退縮，是看清前路。','真正的勇氣，敢面對背後。'],
       dramatic:['那一瞬間，我知道有人來了。','我轉過身，故事也跟著轉向。']},
 dodge:{witty:['你的準星是不是還在放寒假？','不好意思，這招我開了自動閃避。'],
       heroic:['看清破綻，閃出自己的路。','速度，就是我的回答。'],
       dramatic:['差一點，命運就改寫了。','我聽見風，從肩邊掠過。']},
 block:{witty:['抱歉，我的防守今天有保險。','這招我先幫你退貨，免運費。'],
       heroic:['這一步，我絕不讓。','只要還能站著，就能守住。'],
       dramatic:['撞擊傳來，手臂微微發麻。','我擋下這一擊，也擋住了恐懼。']},
 punch:{witty:['這拳不打臉，打的是你的自信！','拳頭先出發，吐槽等一下補票。'],
       heroic:['這一擊，是為了守護重要的人。','相信自己，現在就是機會！'],
       dramatic:['空氣被拳風撕開了一道線。','我不想傷害誰，但也不能再退。']},
 kick:{witty:['腳比嘴快，今天它先搶台詞。','這一腳的存在感，比期末報告還高。'],
       heroic:['跨出界線，擊破阻礙。','一記踢擊，扭轉局勢。'],
       dramatic:['腳跟掠過風，時間像停住。','我抓住那一秒，踢出答案。']},
 jump:{witty:['地板先保管一下，我要飛了。','我這不是跳高，是跟重力談判。'],
       heroic:['向上一躍，超越自己。','沒有路，就自己跳出一條。'],
       dramatic:['腳離地的瞬間，世界靜止。','高處的風，提醒我還活著。']},
 run:{witty:['遲到可以，帥氣絕對不能缺席！','我的速度，連導航都叫我等等。'],
       heroic:['快一點，還來得及。','向前奔跑，絕不回頭。'],
       dramatic:['身後的腳步聲越來越近。','心跳和腳步，正在同一個節拍。']},
 fall:{witty:['這不是跌倒，是跟地球打個招呼。','地板你好，我只是假裝路過。'],
       heroic:['倒下不代表結束。','從地上站起來，才是真正的開始。'],
       dramatic:['世界傾斜了，呼吸也慢了一拍。','倒下那一刻，我還在想著答案。']},
 bow:{witty:['謝幕請排隊，簽名一人一張。','有禮貌的人，連退場都很有戲。'],
       heroic:['尊重對手，也是尊重自己。','這份敬意，比勝負更重要。'],
       dramatic:['我低下頭，藏住眼裡的情緒。','這一禮，是故事的另一個起點。']}
});
export function composeDialogue(story,{style='witty',maxLength=120}={}){
 if(!DIALOGUE_STYLES.includes(style))throw Error('DIALOGUE_STYLE_INVALID');
 if(!story?.beats?.length||story.beats.length>40)throw Error('DIALOGUE_STORY_REQUIRED');
 if(maxLength<20||maxLength>240)throw Error('DIALOGUE_TEXT_LIMIT_INVALID');
 const cues=story.beats.map(beat=>{
  const options=BANK[beat.actionId]?.[style];
  if(!options?.length)throw Error('DIALOGUE_ACTION_NOT_SUPPORTED');
  // Deterministic variation: independent of platform, identity, or model data.
  let seed=2166136261;
  for(const char of (story.originalText+'|'+beat.index+'|'+style))seed=Math.imul(seed^char.charCodeAt(0),16777619)>>>0;
  const text=options[seed%options.length].slice(0,maxLength);
  return {beat:beat.index,actionId:beat.actionId,speaker:'女主角',
   text,origin:'OFFLINE_HANDWRITTEN_TEMPLATE',edited:false};
 });
 return {version:DIALOGUE_VERSION,style,cues,generatedByCloudLLM:false,
  dialogueAvailableWithoutGLB:true,multiActorVoicesCreated:false};
}
export function updateDialogueCue(bundle,index,newText){
 if(!bundle?.cues?.length||!Number.isInteger(index)||index<0||index>=bundle.cues.length)
  throw Error('DIALOGUE_EDIT_INDEX_INVALID');
 if(typeof newText!=='string'||!newText.trim()||newText.length>240)
  throw Error('DIALOGUE_EDIT_TEXT_INVALID');
 return {...bundle,cues:bundle.cues.map((c,i)=>i===index?{...c,text:newText.trim(),edited:true,
  origin:'USER_EDITED_DIALOGUE'}:{...c})};
}
export function annotateDialoguePlan(plan,bundle){
 if(!plan?.ready||!Array.isArray(plan.timeline)||!bundle?.cues)
  throw Error('DIALOGUE_PLAN_NOT_READY');
 const cues=new Map(bundle.cues.map(c=>[c.beat,c]));
 const steps=plan.timeline.map(step=>{
  const dialogue=cues.get(step.beat);
  if(!dialogue||dialogue.actionId!==step.actionId)throw Error('DIALOGUE_BEAT_NOT_FOUND');
  return {...step,dialogue:dialogue.text,voiceSpeaker:dialogue.speaker,
   dialogueOrigin:dialogue.origin,audioSfxId:step.actionId};
 });
 return {...plan,timeline:steps,dialogueSource:bundle.version,
  speechSynthMayBeUnavailable:true,musicFromOriginalWebAudioOnly:true};
}
