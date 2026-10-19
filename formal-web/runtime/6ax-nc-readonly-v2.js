/* AIG 6AX NC-to-posture preview V2 — read-only, conservative parser.
 * Never emits NC, never runs a machine. C->H ONLY by explicit preview opt-in.
 * Fanuc H following G43 is TOOL LENGTH OFFSET, NEVER head tilt.
 * G02/G03, G34, cycles, macros, subprograms and unknown ops fail closed. */
(function(root){"use strict";
const K=(typeof module!=="undefined"&&module.exports)?require("./6ax-mechanism-core-v1.js"):root.AIG_6AX_MECHANISM_CORE_V1;
if(!K)throw Error("MISSING_6AX_MECHANISM_CORE");
const AXES=["X","Y","Z","A","B","H"];
const supportedG=new Set([0,1,17,40,49,54,55,56,57,58,59,80,90,94]);
const inertM=new Set([0,1,2,3,4,5,8,9,30]);
const RAD=Math.PI/180,EPS=1e-9;
function resultError(line,code,detail){return Object.freeze({line,code,detail:String(detail||"")})}
function stripComments(raw,line){
 let body="",depth=0;
 for(let i=0;i<raw.length;i++){
  const ch=raw[i];
  if(ch==="("){if(depth)throw resultError(line,"NESTED_COMMENT","");depth++;continue}
  if(ch===")"){if(!depth)throw resultError(line,"UNMATCHED_PAREN","");depth--;continue}
  if(ch===";"&&!depth)break;
  if(!depth)body+=ch;
 }
 if(depth)throw resultError(line,"UNCLOSED_PAREN","");
 return body.trim().toUpperCase();
}
function lex(s,line){
 const items=[];let i=0;
 while(i<s.length){
  if(/\s/.test(s[i])){i++;continue}
  if(!/[A-Z]/.test(s[i]))throw resultError(line,"UNSUPPORTED_CHARACTER",s.slice(i,i+12));
  const word=s[i++],number=s.slice(i).match(/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)/);
  if(!number)throw resultError(line,"MISSING_NUMERIC_VALUE",word);
  i+=number[0].length;const n=Number(number[0]);
  if(!Number.isFinite(n))throw resultError(line,"NON_FINITE",word);
  items.push({word,value:n});
  if(items.length>128)throw resultError(line,"TOO_MANY_WORDS","");
 }
 return items;
}
function parse(text,options={}){
 const warning=[],steps=[],diagnostics=[];
 try{
  if(typeof text!=="string"||text.length>120000)throw resultError(0,"PROGRAM_TOO_LARGE","");
  const lines=text.replace(/\r/g,"").split("\n");
  if(lines.length>3000)throw resultError(0,"TOO_MANY_LINES","");
  if(options.headWord!==undefined&&options.headWord!==null&&options.headWord!=="C")throw resultError(0,"UNSUPPORTED_HEAD_MAPPING","C-only preview opt-in");
  const headC=options.headWord==="C";
  let pos={X:0,Y:0,Z:0,A:0,B:0,H:0},motion=null,hasAbsolute=false,offsetWarned=false,toolWarned=false,mWarned=false;
  for(let i=0;i<lines.length;i++){
   const line=i+1,body=stripComments(lines[i],line);
   if(!body||body==="%")continue;
   if(body.startsWith("/")||/[\[\]#=]/.test(body))throw resultError(line,"MACRO_OR_BLOCK_SKIP_UNSUPPORTED",body);
   const words=lex(body,line),seen=new Set(),target={...pos};let thisMotion=null,hasGeometry=false,hasHead=false;
   for(const w of words){
    if(seen.has(w.word)&&!["G","M"].includes(w.word))throw resultError(line,"DUPLICATE_WORD",w.word);
    seen.add(w.word);
    if(w.word==="G"){
     if(!Number.isInteger(w.value)||!supportedG.has(w.value))throw resultError(line,"UNSUPPORTED_G","G"+w.value);
     if(w.value===90)hasAbsolute=true;
     if(w.value===0||w.value===1){if(thisMotion!==null&&thisMotion!==w.value)throw resultError(line,"CONFLICTING_MOTION_G","");thisMotion=w.value;}
     if(w.value>=54&&w.value<=59&&!offsetWarned){warning.push("工件座標 G5x 未校正；僅用原始數值顯示示範姿態");offsetWarned=true}
    }else if(w.word==="M"){
     if(!Number.isInteger(w.value)||!inertM.has(w.value))throw resultError(line,"UNSUPPORTED_M","M"+w.value);
     if(!mWarned){warning.push("M 指令僅為文字解析，不執行主軸、冷卻或停機動作");mWarned=true;}
    }else if("XYZAB".includes(w.word)){
     target[w.word]=w.value;hasGeometry=true;
    }else if(w.word==="C"){
     if(!headC)throw resultError(line,"C_AXIS_UNMAPPED","C 不會自動等於 45° 主軸頭；勾選預覽映射才可觀看");
     target.H=w.value;hasGeometry=true;hasHead=true;
    }else if(w.word==="H"){
     // H word in Fanuc is length offset, not an independent head-axis command.
     throw resultError(line,"FANUC_H_IS_TOOL_OFFSET","G43 H# 不是主軸頭傾角");
    }else if(w.word==="N"||w.word==="O"||w.word==="F"||w.word==="S"){
     if(w.word==="O"&&steps.length)throw resultError(line,"MULTIPLE_PROGRAMS_UNSUPPORTED","");
    }else if(w.word==="T"){
     if(!toolWarned){warning.push("T 號僅讀取、不換刀；刀長與實際刀具尚未校正");toolWarned=true}
    }else throw resultError(line,"UNSUPPORTED_WORD",w.word);
   }
   if(thisMotion!==null)motion=thisMotion;
   if(hasGeometry){
    if(!hasAbsolute)throw resultError(line,"G90_REQUIRED","僅接受 G90 絕對座標");
    if(motion===null)throw resultError(line,"MOTION_REQUIRED","需 G0/G1");
    // Treat source XYZ as symbolic values. Visual model converts by its illustrative ratio.
    try{K.solve(target)}catch(e){throw resultError(line,"POSE_OUT_OF_PREVIEW_LIMIT",String(e.message))}
    const record={line,motion:motion===0?"G0":"G1",start:Object.freeze({...pos}),target:Object.freeze({...target}),headFromExplicitC:hasHead};
    steps.push(Object.freeze(record));pos=target;
    if(steps.length>1000)throw resultError(line,"TOO_MANY_MOTIONS","");
   }
  }
  if(!steps.length)throw resultError(0,"NO_SUPPORTED_G0_G1_MOTION","");
  if(!headC)warning.push("主軸頭 H 保持手動設定 0°；C 軸未經映射");
  warning.push("預覽座標非校正 mm；G54/刀長/TCP/真機 Post/撞機驗收均未通過");
  return Object.freeze({ok:true,steps:Object.freeze(steps),warnings:Object.freeze(warning),errors:Object.freeze([]),
   headMapping:headC?"C→H (VISUAL ONLY)":"UNMAPPED",machineOutput:"BLOCKED",ncChanged:false});
 }catch(e){
  diagnostics.push(typeof e==="object"&&e&&"code"in e?e:resultError(0,"PARSE_EXCEPTION",String(e)));
  return Object.freeze({ok:false,steps:Object.freeze([]),warnings:Object.freeze(warning),errors:Object.freeze(diagnostics),
   headMapping:"UNVERIFIED",machineOutput:"BLOCKED",ncChanged:false});
 }
}
function dot(a,b){return a.reduce((s,v,i)=>s+v*b[i],0)}
function norm(v){return Math.sqrt(dot(v,v))}
function minus(a,b){return a.map((v,i)=>v-b[i])}
function add(a,b){return a.map((v,i)=>v+b[i])}
function times(a,k){return a.map(v=>v*k)}
function nearestPointToDisk(pose,p){
 const center=pose.platterCenter,m=pose.pivots.platter,n=[m[8],m[9],m[10]];
 const delta=minus(p,center),height=dot(delta,n),planar=minus(delta,times(n,height)),radius=norm(planar);
 return {height,radius};
}
function insideAabb(p,center,half,margin=.06){return p.every((x,i)=>Math.abs(x-center[i])<=half[i]+margin)}
function localPoint(m,p){
 const d=[p[0]-m[12],p[1]-m[13],p[2]-m[14]];
 return [m[0]*d[0]+m[1]*d[1]+m[2]*d[2],
         m[4]*d[0]+m[5]*d[1]+m[6]*d[2],
         m[8]*d[0]+m[9]*d[1]+m[10]*d[2]];
}
function probe(pose){
 // Visual-only proxy: sample spindle TOOL SHAFT against rotating platter,
 // oriented cradle beams, fixed A-support mounts and base. Missing measured geometry
 // implies collisionGate always UNVERIFIED even when no candidate was found.
 const shaft=pose.pivots.spindle,zones=new Set();let minDistance=Infinity;
 for(let i=0;i<=16;i++){
  const p=K.point(shaft,[0,0,-.31-i*.60/16]),q=nearestPointToDisk(pose,p);
  const radial=Math.max(0,q.radius-1.31),vertical=Math.max(0,Math.abs(q.height)-.30);
  minDistance=Math.min(minDistance,Math.hypot(radial,vertical));
  if(q.radius<=1.40&&Math.abs(q.height)<=.39)zones.add("PLATTER");
  for(const x of [-2.08,2.08]){
   if(insideAabb(p,[x,0,.95],[.47,.57,.52],.07))zones.add("A_SUPPORT");
  }
  const l=localPoint(pose.pivots.cradle,p);
  for(const [center,half] of [
   [[0,0,-.45],[1.68,.60,.12]],
   [[0,0,-.31],[1.18,.50,.09]],
   [[-1.65,0,-.24],[.15,.47,.33]],
   [[1.65,0,-.24],[.15,.47,.33]]
  ])if(insideAabb(l,center,half,.075))zones.add("CRADLE");
  if(p[2]<.01&&Math.abs(p[0])<3.0&&Math.abs(p[1])<1.8)zones.add("BASE");
 }
 return {potentialInterference:zones.size>0,zones:Object.freeze([...zones]),clearanceProxy:minDistance,
   collisionGate:"UNVERIFIED",proxyType:"TOOL_SHAFT_APPROX_ONLY"};
}
function interpolate(a,b,t){const r={};for(const k of AXES)r[k]=a[k]+(b[k]-a[k])*t;return r}
function analyze(parsed,options={}){
 if(!parsed?.ok)return Object.freeze({ok:false,status:"BLOCKED_PARSE",samples:0,potential:[],points:[],machineOutput:"BLOCKED"});
 const maxSamples=Math.min(20000,Math.max(50,Number(options.maxSamples)||12000));
 const unitPitch=Math.max(.1,Math.min(10,Number(options.previewLinearStep)||2));
 const anglePitch=Math.max(.5,Math.min(15,Number(options.previewAngleStep)||5));
 const frames=[],potential=[];let samples=0,capped=false,minProxy=Infinity;
 for(const step of parsed.steps){
  const length=Math.hypot(...["X","Y","Z"].map(k=>step.target[k]-step.start[k]));
  const angle=Math.max(...["A","B","H"].map(k=>Math.abs(step.target[k]-step.start[k])));
  const n=Math.max(1,Math.ceil(length/unitPitch),Math.ceil(angle/anglePitch));
  if(samples+n+1>maxSamples){capped=true;break}
  for(let j=0;j<=n;j++){
   const t=j/n,pose=K.solve(interpolate(step.start,step.target,t));
   const pr=probe(pose);
   samples++;minProxy=Math.min(minProxy,pr.clearanceProxy);
   if(pr.potentialInterference)potential.push(Object.freeze({line:step.line,fraction:t,toolTip:pose.toolTip,zones:pr.zones}));
   // Keep lightweight preview sample list capped by maxSamples.
   frames.push(Object.freeze({line:step.line,fraction:t,values:pose.values,toolTip:pose.toolTip,platterCenter:pose.platterCenter}));
  }
 }
 return Object.freeze({ok:!capped,status:capped?"BLOCKED_SAMPLE_BUDGET":potential.length?"POTENTIAL_INTERFERENCE":"GEOMETRY_UNVERIFIED",
   samples,potential:Object.freeze(potential),points:Object.freeze(frames),clearanceProxy:minProxy,
   certifiedClearance:false,machineOutput:"BLOCKED",collisionGate:"UNVERIFIED",precisionGate:"UNCALIBRATED"});
}
const api=Object.freeze({version:"2.0.0",parse,analyze,interpolate,probe,machineOutput:"BLOCKED",machineSpecificPost:null});
if(typeof module!=="undefined"&&module.exports)module.exports=api;
if(root)root.AIG_6AX_NC_READONLY_V2=api;
})(typeof globalThis!=="undefined"?globalThis:null);
