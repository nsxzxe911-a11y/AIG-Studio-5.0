/**
 * Real3D Stage1: authoritative millimeter coordinates at 0.001 mm.
 *
 * Stored as signed integer micrometer ticks (1 tick=0.001 mm), NOT float32
 * meters. One existing WebGL renderer receives an explicit ticks->meters
 * adapter, so models do NOT grow 1000x or lose stable camera framing.
 * The original source and all unrelated GLB/CAD/CNC assets stay immutable.
 */
import {AIG_STAGE1_SCHEMA} from './aig-stage1-dual-adult-anatomy.mjs';
export const AIG_STAGE1_MM_SCHEMA='AIG_STAGE1_CANONICAL_MM_0_001_V1';
export const AIG_STAGE1_MM_CONTRACT=Object.freeze({
 worldUnit:'mm',coordinatePrecisionMm:.001,
 ticksPerMillimeter:1000,ticksPerWebGLUnit:1000000,
 actualWebGLWorldUnits:'meters',rendererScaleFromMillimeters:.001,
 origin:'GROUND_MID_FEET',up:'+Y',front:'-Z',right:'+X',
 noAdditionalRendererContexts:true
});
const fail=s=>{throw Error('AIG_STAGE1_MM_'+s)};
const valid=n=>typeof n==='number'&&Number.isFinite(n);
export function toAIGStage1MicrometerTicks(meters){
 if(!valid(meters)||Math.abs(meters)>2100)
  fail('FINITE_SAFE_METERS_REQUIRED');
 const ticks=Math.round(meters*1000000);
 if(!Number.isSafeInteger(ticks)||ticks>2147483647||ticks< -2147483648)
  fail('MICROMETER_TICKS_EXCEED_I32');
 return ticks;
}
export function aigStage1MmFromTicks(ticks){
 if(!Number.isInteger(ticks))fail('INTEGER_MICROMETER_TICKS_REQUIRED');
 return ticks/1000;
}
export function aigStage1WebGLMetersFromTicks(ticks){
 if(!Number.isInteger(ticks))fail('INTEGER_MICROMETER_TICKS_REQUIRED');
 return ticks/1000000;
}
export function aigStage1MMVectorFromMeters(vec){
 if(!Array.isArray(vec)||vec.length!==3||!vec.every(valid))
  fail('VALID_XYZ_COORDINATES_REQUIRED');
 return Object.freeze(vec.map(v=>aigStage1MmFromTicks(
  toAIGStage1MicrometerTicks(v))));
}
function xyzTicksFromMeters(positions){
 if(!(positions instanceof Float32Array)||positions.length<9||
  positions.length%3||!positions.every(valid))
  fail('ACTUAL_SOURCE_FLOAT32_XYZ_REQUIRED');
 return Int32Array.from(positions,v=>toAIGStage1MicrometerTicks(v));
}
export function aigStage1WebGLGeometryFromCanonicalMM(ticks){
 if(!(ticks instanceof Int32Array)||ticks.length<9||
  ticks.length%3)fail('CANONICAL_TICK_ARRAY_REQUIRED');
 const world=new Float32Array(ticks.length);
 for(let i=0;i<ticks.length;i++)world[i]=ticks[i]/1000000;
 return world;
}
export function makeAIGStage1CanonicalMM(source){
 if(source?.schema!==AIG_STAGE1_SCHEMA||!Array.isArray(source.parts)||
  !source.parts.length||!valid(source.heightMeters)||source.heightMeters<=1)
  fail('UNVERIFIED_ADULT_BASE_MODEL');
 const parts={};
 for(const p of source.parts){
  if(parts[p.id])fail('DUPLICATE_PART_ID');
  const tickPositions=xyzTicksFromMeters(p.geometry?.positions);
  if(!(p.geometry?.indices instanceof Uint32Array)||
   p.geometry.indices.length%3||
   p.geometry.indices.some(i=>i>=tickPositions.length/3))
   fail('SOURCE_TRIANGLE_INDEX_INVALID');
  parts[p.id]=Object.freeze({
   id:p.id,parent:p.parent,role:p.role,material:p.material,
   positionTicks:tickPositions,
   realIndexedTriangles:p.geometry.indices.length/3
  });
 }
 const joints={};
 for(const [id,meta] of Object.entries(source.joints||{})){
  if(!Array.isArray(meta.position)||meta.position.length!==3||
   !meta.position.every(valid))fail('JOINT_XYZ_INVALID');
  joints[id]=Object.freeze({id,parent:meta.parent,
   positionTicks:Int32Array.from(meta.position,
    v=>toAIGStage1MicrometerTicks(v))});
 }
 const heightTicks=toAIGStage1MicrometerTicks(source.heightMeters);
 return Object.freeze({
  schema:AIG_STAGE1_MM_SCHEMA,gender:source.gender,
  coordinateContract:AIG_STAGE1_MM_CONTRACT,
  heightTicks,heightMm:aigStage1MmFromTicks(heightTicks),
  parts:Object.freeze(parts),joints:Object.freeze(joints),
  partCount:Object.keys(parts).length,jointCount:Object.keys(joints).length,
  originalSourceGeometryNotMutated:true,
  canonicalFloatFreePrecisionAt001Mm:true,
  rendererAdapterConvertsExplicitlyToMeters:true
 });
}
export function auditAIGStage1MMConversion(source,mm){
 if(source?.schema!==AIG_STAGE1_SCHEMA||mm?.schema!==AIG_STAGE1_MM_SCHEMA||
  source.gender!==mm.gender)fail('SOURCE_CANONICAL_CONTRACT_MISMATCH');
 const violations=[],limitMm=.000501;
 for(const p of source.parts){
  const mmPart=mm.parts[p.id];
  if(!mmPart||mmPart.positionTicks.length!==p.geometry.positions.length){
   violations.push('PART_MISMATCH_'+p.id);continue;
  }
  for(let i=0;i<p.geometry.positions.length;i++){
   const sourceMm=p.geometry.positions[i]*1000;
   const actual=aigStage1MmFromTicks(mmPart.positionTicks[i]);
   if(Math.abs(sourceMm-actual)>limitMm){
    violations.push('GEOMETRY_PRECISION_MISMATCH_'+p.id);break;
   }
  }
 }
 for(const [id,meta] of Object.entries(source.joints)){
  const j=mm.joints[id];
  if(!j||j.positionTicks.length!==3){
   violations.push('JOINT_MISSING_'+id);continue;
  }
  for(let k=0;k<3;k++)
   if(Math.abs(meta.position[k]*1000-
    aigStage1MmFromTicks(j.positionTicks[k]))>limitMm){
    violations.push('JOINT_PRECISION_MISMATCH_'+id);break;
   }
 }
 if(mm.heightMm!==Math.round(source.heightMeters*1000000)/1000)
  violations.push('HEIGHT_MM_INCONSISTENT');
 return Object.freeze({schema:AIG_STAGE1_MM_SCHEMA,
  sourceGender:source.gender,
  verifiedMillimeterHeight:mm.heightMm,
  geometryPartCountChecked:source.parts.length,
  jointCountChecked:Object.keys(source.joints).length,
  originalSourceGeometryNotMutated:true,
  sourceXYZConsistentWithin001Mm:violations.length===0,
  millimeterContractViolations:Object.freeze(violations),
  canonicalMillimeterGatePASS:violations.length===0,
  physicallyMeasuredRealHuman:false,
  stage1AppearancePass:false});
}
