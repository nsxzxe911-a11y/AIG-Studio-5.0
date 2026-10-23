/**
 * FastModel Cinema | script-to-storyboard planning engine V1.
 * Completely local deterministic heuristics. NOT a remote AI model and
 * NOT a claim that characters, assets or voice were AI-generated.
 */
export const AIG_STORYBOARD_SCHEMA='AIG_STARJOURNEY_LOCAL_SCRIPT_TO_STORYBOARD_V1';
const SCENES=[
 {key:'GATE',regex:/星門|傳送|躍遷|穿越|蟲洞/,label:'星門穿越',camera:'dolly-in',fx:'ring-pulse'},
 {key:'PORT',regex:/太空港|基地|城市|港口|月台|站台/,label:'太空港',camera:'pan-right',fx:'city-lights'},
 {key:'FLEET',regex:/艦|飛船|船隊|戰鬥|追逐|飛行|出發|啟航/,label:'星艦遠航',camera:'tracking',fx:'engine-glow'},
 {key:'PLANET',regex:/星球|行星|大地|家園|地表|草原|山脈|宇宙/,label:'行星探索',camera:'orbit',fx:'planet-glow'},
 {key:'NEBULA',regex:/星雲|星空|銀河|星際|繁星|未知|星系/,label:'銀河星雲',camera:'slow-zoom',fx:'nebula-shimmer'}
];
export const AIG_STARJOURNEY_SAMPLE_SCRIPT=
'旁白：在浩瀚銀河裡，一道沉睡的星門再次亮起。\n'+
'女主角：星際之旅，現在開始！我們穿越星門，前往未知的世界。\n'+
'導航員：前方是太空港，請準備降落。\n'+
'旁白：星艦穿過城市上空，新的家園就在遙遠的行星彼端。';
const DIALOGUE=/^(.{1,16}?)[：:]\s*(.+)$/u;
const allowedText=s=>s.replace(/[\u0000-\u001f\u007f]/g,' ').trim();
export function planAIGStarJourneyStoryboard(script,{maxShots=12}={}){
 if(typeof script!=='string'||script.length>6000)throw Error('STORYBOARD_SCRIPT_SIZE');
 if(!Number.isInteger(maxShots)||maxShots<1||maxShots>24)
  throw Error('STORYBOARD_MAX_SHOTS');
 const lines=script.replace(/\r\n?/g,'\n').split(/\n+/)
  .flatMap(s=>s.split(/(?<=[。！？!?])\s*/u))
  .map(allowedText).filter(Boolean);
 if(!lines.length)throw Error('STORYBOARD_SCRIPT_EMPTY');
 if(lines.length>maxShots)throw Error('STORYBOARD_SHOT_LIMIT_EXCEEDED');
 const shots=[];let current=0;
 for(let i=0;i<lines.length;i++){
  const match=lines[i].match(DIALOGUE);
  const speaker=match?.[1]??null,description=match?.[2]??lines[i];
  if(description.length>280)throw Error('STORYBOARD_SHOT_TOO_LONG');
  const scene=SCENES.find(x=>x.regex.test(description))??
   SCENES[Math.min(i,SCENES.length-1)];
  const durationSec=Math.min(8,Math.max(2,Math.round(description.length/10)+1));
  const shot={
   id:'SJ-'+String(i+1).padStart(3,'0'),
   sequence:i+1,
   startSec:current,durationSec,endSec:current+durationSec,
   title:scene.label,
   visualKey:scene.key,camera:scene.camera,fx:scene.fx,
   subtitle:description.slice(0,110),
   speaker:speaker??'旁白',
   dialogue:speaker!==null?description:null,
   shotText:description,
   source:'LOCAL_DETERMINISTIC_STORY_PLANNER_NOT_AI'
  };
  current+=durationSec;shots.push(shot);
 }
 return {
  schema:AIG_STORYBOARD_SCHEMA,engine:'LOCAL_RULES_NO_GENERATIVE_AI',
  title:'星際之旅',shots,totalDurationSec:current,
  geometryGenerated:false,cinematicVisuals:'PROCEDURAL_2D',
  narrationAudioGenerated:false,realHuman3DGenerated:false,
  sourceAssetsReferenced:false,approvedAsFinishedFilm:false
 };
}
