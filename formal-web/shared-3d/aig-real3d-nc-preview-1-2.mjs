/**
 * AIG Real3D 1.2: STRICT, limited Fanuc-like NC WORKING COPY -> numerical
 * read-only XYZ segments. Explicit whitelist ONLY:
 * G21 G90 G54 G0 G1, X Y Z F S, M3 M5 M30, N sequence.
 *
 * Reject arc, cycles, macro, G43, subprograms, rotary axes, G91, G20,
 * machine commands, tool calls and unknown codes: no guessing. Parsing
 * finishes atomically before any stock simulation. Nothing transmits to CNC.
 */
export const AIG12_NC_SCHEMA='AIG_REAL3D_V1_2_LIMITED_NC_WORKING_COPY_PREVIEW';
const finite=Number.isFinite;
const MAX_LINES=2500;
const G=new Set([0,1,21,54,90]),M=new Set([3,5,30]);
const equals=(a,b)=>a.length===b.length&&a.every((v,i)=>Math.abs(v-b[i])<1e-10);
export function parseAIG12NCWorkingCopy(text,{
 maxSegments=1000,coordinateLimitMm=100000
}={}){
 if(typeof text!=='string'||text.length===0||text.length>120000||
 !Number.isInteger(maxSegments)||maxSegments<1||maxSegments>10000||
 !finite(coordinateLimitMm)||coordinateLimitMm<10||coordinateLimitMm>100000)
  throw Error('AIG12_NC_SOURCE_OR_LIMITS_INVALID');
 const lines=text.split(/\r?\n/);
 if(lines.length>MAX_LINES)throw Error('AIG12_NC_TOO_MANY_LINES');
 let metric=false,absolute=false,workOffset=false,spindleOn=false,
  speed=null,feed=null,current=[null,null,null],mode=null,closed=false;
 let spindleStarts=0,sourceMotionBlocks=0;
 const segments=[],log=[];
 for(let i=0;i<lines.length;i++){
  const lineNo=i+1;
  let code=lines[i].toUpperCase();
  if((code.match(/\(/g)||[]).length!==(code.match(/\)/g)||[]).length||
   code.includes('(')&&/\([^()]*\([^()]*\)/.test(code))
   throw Error('AIG12_NC_INVALID_COMMENT_LINE_'+lineNo);
  code=code.replace(/\([^()]*\)/g,'').replace(/;.*$/,'').trim();
  if(!code||code==='%')continue;
  if(closed)throw Error('AIG12_NC_AFTER_M30_LINE_'+lineNo);
  const words=[],pattern=/([A-Z])([+-]?(?:\d+(?:\.\d*)?|\.\d+))/g;
  let pos=0,match;
  while((match=pattern.exec(code))!==null){
   if(code.slice(pos,match.index).trim())
    throw Error('AIG12_NC_UNKNOWN_SYNTAX_LINE_'+lineNo);
   words.push({letter:match[1],value:Number(match[2]),raw:match[2]});
   pos=pattern.lastIndex;
  }
  if(code.slice(pos).trim()||!words.length)
   throw Error('AIG12_NC_UNKNOWN_SYNTAX_LINE_'+lineNo);
  const unique=new Set(),groups={axes:{},g:[],m:[]};
  for(const w of words){
   const {letter,value}=w;
   if(!finite(value))throw Error('AIG12_NC_NONFINITE_LINE_'+lineNo);
   if(['X','Y','Z','F','S','N'].includes(letter)){
    if(unique.has(letter))throw Error('AIG12_NC_DUPLICATE_WORD_LINE_'+lineNo);
    unique.add(letter);
    if(letter==='N'){if(!Number.isInteger(value)||value<0)throw Error('AIG12_NC_BAD_SEQUENCE');}
    else if(['X','Y','Z'].includes(letter)){
     if(Math.abs(value)>coordinateLimitMm)throw Error('AIG12_NC_OUTSIDE_SAFETY_RANGE');
     groups.axes[letter]=value;
    }else if(letter==='F'){
     if(value<=0||value>50000)throw Error('AIG12_NC_FEED_INVALID');
     feed=value;
    }else{
     if(value<=0||value>100000)throw Error('AIG12_NC_SPINDLE_SPEED_INVALID');
     speed=value;
    }
   }else if(letter==='G'){
    if(!Number.isInteger(value)||!G.has(value))throw Error('AIG12_NC_G_CODE_UNSUPPORTED_LINE_'+lineNo);
    if(groups.g.includes(value))throw Error('AIG12_NC_DUPLICATE_G');
    groups.g.push(value);
   }else if(letter==='M'){
    if(!Number.isInteger(value)||!M.has(value))throw Error('AIG12_NC_M_CODE_UNSUPPORTED_LINE_'+lineNo);
    groups.m.push(value);
   }else throw Error('AIG12_NC_WORD_UNSUPPORTED_'+letter+'_LINE_'+lineNo);
  }
  if(groups.m.length>1)throw Error('AIG12_NC_MULTIPLE_M_CODES_LINE_'+lineNo);
  const motionCodes=groups.g.filter(x=>x===0||x===1);
  if(motionCodes.length>1)throw Error('AIG12_NC_MULTIPLE_MOTION_CODES');
  if(groups.g.includes(21))metric=true;
  if(groups.g.includes(90))absolute=true;
  if(groups.g.includes(54))workOffset=true;
  if(groups.m.includes(3)){
   if(speed===null||!metric||!absolute||!workOffset)
    throw Error('AIG12_NC_SPINDLE_REQUIRES_G21_G90_G54_AND_S');
   spindleOn=true;spindleStarts++;
  }
  if(groups.m.includes(5))spindleOn=false;
  if(motionCodes.length)mode=motionCodes[0]===0?'G0':'G1';
  const hasAxis=Object.keys(groups.axes).length>0;
  if(hasAxis){
   if(!metric||!absolute||!workOffset)throw Error('AIG12_NC_G21_G90_G54_REQUIRED');
   if(mode===null)throw Error('AIG12_NC_EXPLICIT_FIRST_G0_REQUIRED');
   const next=['X','Y','Z'].map((name,j)=>groups.axes[name]??current[j]);
   if(next.some(v=>v===null))throw Error('AIG12_NC_INITIAL_XYZ_REQUIRED');
   if(current.some(v=>v===null)){
    if(mode!=='G0'||Object.keys(groups.axes).length!==3)
     throw Error('AIG12_NC_FIRST_POSITION_MUST_BE_G0_XYZ');
   }else if(!equals(current,next)){
    if(mode==='G1'&&(!spindleOn||feed===null))
     throw Error('AIG12_NC_FEED_REQUIRES_SPINDLE_AND_F');
    segments.push({from:[...current],to:next,motion:mode,
     line:lineNo,feedMmPerMin:mode==='G1'?feed:null,
     spindleRpm:spindleOn?speed:null});
    if(segments.length>maxSegments)throw Error('AIG12_NC_SEGMENT_MEMORY_BUDGET');
   }
   current=next;sourceMotionBlocks++;
  }
  if(groups.m.includes(30)){
   if(hasAxis||groups.m.length!==1)throw Error('AIG12_NC_M30_MUST_STAND_ALONE');
   closed=true;spindleOn=false;
  }
  log.push({line:lineNo,mode:hasAxis?mode:'MODAL_OR_CONTROL',hasAxis});
 }
 if(!closed)throw Error('AIG12_NC_EXPLICIT_M30_REQUIRED');
 if(!metric||!absolute||!workOffset||spindleStarts===0||segments.length===0)
  throw Error('AIG12_NC_INCOMPLETE_PREVIEW_CONTRACT');
 return {
  schema:AIG12_NC_SCHEMA,geometryUnits:'MM',
  sourceKind:'USER_NC_WORKING_COPY_UNVERIFIED_FANUC_SUBSET',
  segments,sourceMotionBlocks,parsedLineCount:lines.length,
  motionSegmentCount:segments.length,
  feedSegments:segments.filter(s=>s.motion==='G1').length,
  rapidSegments:segments.filter(s=>s.motion==='G0').length,
  machineCommandAuthority:false,
  verifiedForMachineUse:false,toolCompensationApplied:false,
  workOffsetResolvedFromMachine:false,
  cutterCollisionAndHolderChecked:false,
  supportOnlyG0G1AbsoluteMillimetres:true,
  unsupportedFanucCommandsBlocked:true,
  rawSourcePreserved:text
 };
}


/** Executes only against a fresh local numerical voxel stock.
 * This module has NO code path to an external machine. Any parse or
 * geometry failure aborts and returns no partial simulated artifact.
 */
import {createAIGVoxelStock,createAIGCylindricalCutter,applyAIGFeedCut,
 auditAIGVoxelStock,meshAIGVoxelStock} from './aig-real3d-stock-removal-1-1.mjs';
export function simulateAIG12NCWorkingCopy(program,{
 stockOriginMm=[-8,-5,-2],stockSizeMm=[16,10,5],voxelMm=.5,
 cutterDiameterMm=2,fluteLengthMm=6,maxFaces=42000
}={}){
 if(!program||program.schema!==AIG12_NC_SCHEMA||
 !Array.isArray(program.segments)||program.segments.length===0||
 program.segments.length>1000||program.verifiedForMachineUse!==false||
 program.machineCommandAuthority!==false||
 !program.segments.every(s=>s&&['G0','G1'].includes(s.motion)&&
  Array.isArray(s.from)&&s.from.length===3&&s.from.every(finite)&&
  Array.isArray(s.to)&&s.to.length===3&&s.to.every(finite)))
  throw Error('AIG12_NC_VERIFIED_PARSER_OUTPUT_REQUIRED');
 const stock=createAIGVoxelStock({
  originMm:stockOriginMm,sizeMm:stockSizeMm,voxelMm,maxCells:150000
 });
 const cutter=createAIGCylindricalCutter({
  diameterMm:cutterDiameterMm,fluteLengthMm
 });
 const steps=[];
 for(const segment of program.segments){
  const result=applyAIGFeedCut(stock,cutter,{
   from:segment.from,to:segment.to,motion:segment.motion,
   source:'AIG12_UNVERIFIED_NC_WORKING_COPY_PREVIEW_ONLY'
  });
  steps.push({line:segment.line,motion:segment.motion,
   from:[...segment.from],to:[...segment.to],
   removedCells:result.removedCells,removedMm3:result.removedMm3,
   revision:result.revision});
 }
 const audit=auditAIGVoxelStock(stock);
 const boundary=meshAIGVoxelStock(stock,{maxFaces});
 return {
  schema:AIG12_NC_SCHEMA,stock,cutter,steps,audit,
  boundaryMesh:boundary.mesh,
  boundaryTriangleCount:boundary.triangleCount,
  actualNumericalVoxelCutting:audit.materialRemovalByFeedNumericallyVerified,
  actualRemovedVolumeMm3:audit.removedMm3,
  rapidNeverCuts:steps.filter(x=>x.motion==='G0').every(x=>x.removedMm3===0),
  realMachineInstructionsSent:0,
  sourceNotCertifiedForFanuc:true,realNativeHardwareValidated:false,
  geometricResolutionMm:stock.voxelMm,precision0001NotVerified:true
 };
}
