/**
 * AIG Real3D v1.3 — single-block, *numerical* NC-first voxel replay.
 * Every G0/G1 source segment advances the actual local stock occupancy by
 * exactly one block. Rewind recomputes from source, never fakes a 3D snapshot.
 *
 * Source: STRICT V1.2 whitelisted working copy, re-parsed before trust.
 * Unit: millimetres; geometry resolution: bounded voxel pitch (not .001mm).
 * No machine communication, full Fanuc parser, tool holder clearance or
 * safety/collision validation. All state changes are atomic on mesh failure.
 */
import {parseAIG12NCWorkingCopy,AIG12_NC_SCHEMA}
 from './aig-real3d-nc-preview-1-2.mjs';
import {createAIGVoxelStock,createAIGCylindricalCutter,
 applyAIGFeedCut,auditAIGVoxelStock,meshAIGVoxelStock}
 from './aig-real3d-stock-removal-1-1.mjs';
export const AIG13_REPLAY_SCHEMA='AIG_REAL3D_V1_3_G0_G1_SINGLE_BLOCK_VOXEL_REPLAY';
const finite=Number.isFinite;
const vec=v=>Array.isArray(v)&&v.length===3&&v.every(x=>finite(x)&&Math.abs(x)<=100000);
const safeInt=(v,lo,hi)=>Number.isInteger(v)&&v>=lo&&v<=hi;
const clone=v=>JSON.parse(JSON.stringify(v));
function normalize(program,config){
 if(program?.schema!==AIG12_NC_SCHEMA||
  program.verifiedForMachineUse!==false||
  program.machineCommandAuthority!==false||
  typeof program.rawSourcePreserved!=='string')
  throw Error('AIG13_UNVERIFIED_NC_SOURCE_BLOCKED');
 const verified=parseAIG12NCWorkingCopy(program.rawSourcePreserved,{
  maxSegments:1000
 });
 if(JSON.stringify(program.segments)!==JSON.stringify(verified.segments)||
  program.parsedLineCount!==verified.parsedLineCount)
  throw Error('AIG13_REPARSED_SOURCE_MISMATCH_BLOCKED');
 const {
  stockOriginMm=[-8,-5,-2],stockSizeMm=[16,10,5],voxelMm=.5,
  cutterDiameterMm=2,fluteLengthMm=6,maxFaces=42000
 }=config;
 if(!vec(stockOriginMm)||!vec(stockSizeMm)||
 !finite(voxelMm)||voxelMm<.1||voxelMm>2||
 !finite(cutterDiameterMm)||cutterDiameterMm<=0||cutterDiameterMm>100||
 !finite(fluteLengthMm)||fluteLengthMm<=0||fluteLengthMm>100||
 !safeInt(maxFaces,6,150000))
  throw Error('AIG13_REPLAY_CONFIG_OUT_OF_BOUNDS');
 const options={stockOriginMm:[...stockOriginMm],
  stockSizeMm:[...stockSizeMm],voxelMm,cutterDiameterMm,fluteLengthMm,maxFaces};
 return {source:verified,options};
}
function createInitial(options){
 const stock=createAIGVoxelStock({originMm:options.stockOriginMm,
  sizeMm:options.stockSizeMm,voxelMm:options.voxelMm,maxCells:150000});
 const cutter=createAIGCylindricalCutter({
  diameterMm:options.cutterDiameterMm,fluteLengthMm:options.fluteLengthMm});
 const boundary=meshAIGVoxelStock(stock,{maxFaces:options.maxFaces});
 return {stock,cutter,boundary,stepCount:0,events:[]};
}
function copyStock(stock){
 const out=createAIGVoxelStock({originMm:stock.originMm,
  sizeMm:stock.sizeMm,voxelMm:stock.voxelMm,maxCells:150000});
 out.occupancy.set(stock.occupancy);
 out.removedCells=stock.removedCells;
 out.materialRemovedMm3=stock.materialRemovedMm3;
 out.revision=stock.revision;
 out.history=stock.history.map(x=>({...x,from:[...x.from],to:[...x.to]}));
 return out;
}
function applyOne(stock,cutter,s){
 const cut=applyAIGFeedCut(stock,cutter,{from:s.from,to:s.to,motion:s.motion,
  source:'READ_ONLY_NC_WORKING_COPY_LINE_'+s.line});
 return {line:s.line,motion:s.motion,from:[...s.from],to:[...s.to],
  removedCells:cut.removedCells,removedMm3:cut.removedMm3,
  revision:cut.revision,rapidNeverRemoves:cut.motion!=='G0'||cut.removedCells===0};
}
function assertValid(replay){
 if(replay?.schema!==AIG13_REPLAY_SCHEMA||!replay._state||
 !safeInt(replay._state.stepCount,0,replay.source.segments.length))
  throw Error('AIG13_REPLAY_STATE_INVALID');
}
export function createAIG13SingleBlockReplay(program,config={}){
 const parsed=normalize(program,config);
 const state=createInitial(parsed.options);
 return {schema:AIG13_REPLAY_SCHEMA,
  source:parsed.source,options:parsed.options,_state:state,
  sourceBlocks:parsed.source.segments.length,
  readOnly:true,sendCNCCommands:false,
  sourceKind:'REPARSED_G0_G1_WORKING_COPY_NOT_FANUC_APPROVED',
  realCNCControlsAccessible:false};
}
export function auditAIG13SingleBlockReplay(replay){
 assertValid(replay);
 const {stock,stepCount,events,boundary}=replay._state,
  source=replay.source,stockAudit=auditAIGVoxelStock(stock);
 const sum=events.reduce((a,b)=>a+b.removedMm3,0);
 if(events.length!==stepCount||Math.abs(sum-stockAudit.removedMm3)>1e-7||
  events.some(e=>e.motion==='G0'&&e.removedMm3!==0))
  throw Error('AIG13_CUMULATIVE_VOLUME_OR_G0_REPLAY_MISMATCH');
 return {
  schema:replay.schema,blockIndex:stepCount,totalBlocks:source.segments.length,
  finished:stepCount===source.segments.length,
  lastSourceLine:events.at(-1)?.line??null,
  nextSourceLine:source.segments[stepCount]?.line??null,
  lastMotion:events.at(-1)?.motion??null,
  lastRemovedMm3:events.at(-1)?.removedMm3??0,
  cumulativeRemovedMm3:stockAudit.removedMm3,
  remainingMm3:stockAudit.remainingMm3,
  actualVoxelOccupancyVerified:stockAudit.actual3DOccupancyData,
  actualNumericalVolumeVerified:stockAudit.materialRemovalByFeedNumericallyVerified,
  triangleCount:boundary.triangleCount,voxelMm:stock.voxelMm,
  sourceReparsedFromWorkingCopy:true,
  toolpathPositionMm:stepCount?[
   ...source.segments[stepCount-1].to
  ]:[...source.segments[0].from],
  G0NeverRemovesStock:true,
  trueStockMeshUpdatedAfterFeed:stockAudit.removedMm3>0,
  realMachineOutputCommandsSent:0,completeFanucValidation:false,
  realNCPrecision0001mm:false,deviceGPUAndAxisKinematicsNotVerified:true,
  replayHistory:events.map(x=>({...x}))
 };
}
/** Atomic single-block advance: commit cloned stock only after mesh succeeds. */
export function advanceAIG13SingleBlockReplay(replay){
 assertValid(replay);
 const current=replay._state,index=current.stepCount,
  seg=replay.source.segments[index];
 if(!seg)throw Error('AIG13_REPLAY_ALREADY_FINISHED');
 const candidate=copyStock(current.stock);
 const ev=applyOne(candidate,current.cutter,seg);
 const boundary=meshAIGVoxelStock(candidate,{maxFaces:replay.options.maxFaces});
 // No more mutable steps until all physical and topology checks pass.
 const next={stock:candidate,cutter:current.cutter,boundary,
  stepCount:index+1,events:[...current.events,ev]};
 replay._state=next;
 return auditAIG13SingleBlockReplay(replay);
}
/** Rebuild a prior state directly from immutable parsed source, not screenshots.
 * 1000-step bound protects phone RAM; create and commit once on success.
 */
export function seekAIG13SingleBlockReplay(replay,at){
 assertValid(replay);
 if(!safeInt(at,0,replay.source.segments.length))
  throw Error('AIG13_SEEK_POSITION_OUT_OF_RANGE');
 if(at===replay._state.stepCount)return auditAIG13SingleBlockReplay(replay);
 const candidate=createInitial(replay.options);
 for(let i=0;i<at;i++){
  candidate.events.push(applyOne(candidate.stock,candidate.cutter,replay.source.segments[i]));
  candidate.stepCount++;
 }
 candidate.boundary=meshAIGVoxelStock(candidate.stock,{maxFaces:replay.options.maxFaces});
 replay._state=candidate;
 return auditAIG13SingleBlockReplay(replay);
}
export function currentAIG13ReplayBoundary(replay){
 assertValid(replay);
 const {boundary}=replay._state;
 return {mesh:boundary.mesh,triangleCount:boundary.triangleCount,
  empty:boundary.empty,hasActualIndexedXYZ:boundary.mesh?.actualXYZTriangles===true};
}
